const mongoose = require('mongoose');
const { getBackupConn } = require('../config/db.config');

// Helper to resolve the correct MongoDB collection name
const getCollectionName = (modelName, schema) => {
  if (mongoose.models[modelName]?.collection?.name) {
    return mongoose.models[modelName].collection.name;
  }
  if (schema?.options?.collection) {
    return schema.options.collection;
  }
  return mongoose.pluralize() ? mongoose.pluralize()(modelName).toLowerCase() : `${modelName.toLowerCase()}s`;
};

// Check if an operation or connection target is the backup database
const isBackupTarget = (target, conn) => {
  if (!conn) return false;
  const targetDb = target?.db || target?.constructor?.db || target?.model?.db || target?.mongooseCollection?.conn;
  return targetDb === conn;
};

// Mirror a single document change to backup DB using raw native MongoDB collection
// Bypasses Mongoose models to completely prevent hooks recursion, duplicate key errors, or schema validation conflicts
const mirrorDocument = async (colName, doc, op) => {
  const conn = getBackupConn();
  if (!conn || conn.readyState !== 1) return;

  try {
    const col = conn.collection(colName);
    if (op === 'delete') {
      await col.deleteOne({ _id: doc._id });
    } else {
      const docObj = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
      if (!docObj || !docObj._id) return;
      await col.replaceOne({ _id: docObj._id }, docObj, { upsert: true });
    }
  } catch (err) {
    console.warn(`[Mirror] Failed to mirror ${op} on ${colName}:`, err.message);
  }
};

// Register hooks on primary schema
const registerMirrorHooks = (schema, modelName) => {
  // Save hook
  schema.post('save', function (doc) {
    const conn = getBackupConn();
    if (!conn || conn.readyState !== 1) return;
    if (isBackupTarget(this, conn)) return;

    const colName = getCollectionName(modelName, schema);
    const targetDoc = doc || this;
    setImmediate(() => {
      mirrorDocument(colName, targetDoc, 'save').catch(() => {});
    });
  });

  // findOneAndUpdate hook — fetch fresh doc from primary so updated state is mirrored
  schema.post('findOneAndUpdate', function (doc) {
    const conn = getBackupConn();
    if (!conn || conn.readyState !== 1) return;
    if (isBackupTarget(this, conn)) return;

    const colName = getCollectionName(modelName, schema);
    const filter = this.getFilter ? this.getFilter() : {};
    const id = doc?._id || filter?._id;
    if (!id) return;

    setImmediate(async () => {
      try {
        const PrimaryModel = mongoose.models[modelName];
        if (!PrimaryModel) return;
        const latestDoc = await PrimaryModel.findById(id).lean();
        if (latestDoc) {
          const col = conn.collection(colName);
          await col.replaceOne({ _id: latestDoc._id }, latestDoc, { upsert: true });
        }
      } catch (err) {
        console.warn(`[Mirror] Failed to mirror findOneAndUpdate on ${modelName}:`, err.message);
      }
    });
  });

  // findOneAndDelete hook
  schema.post('findOneAndDelete', function (doc) {
    const conn = getBackupConn();
    if (!conn || conn.readyState !== 1) return;
    if (isBackupTarget(this, conn)) return;

    const colName = getCollectionName(modelName, schema);
    const filter = this.getFilter ? this.getFilter() : {};
    const id = doc?._id || filter?._id;
    if (!id) return;

    setImmediate(async () => {
      try {
        const col = conn.collection(colName);
        await col.deleteOne({ _id: id });
      } catch (err) {
        console.warn(`[Mirror] Failed to mirror findOneAndDelete on ${modelName}:`, err.message);
      }
    });
  });

  // updateMany hook — mirror the exact filter and update directly to the backup collection
  schema.post('updateMany', function () {
    const conn = getBackupConn();
    if (!conn || conn.readyState !== 1) return;
    if (isBackupTarget(this, conn)) return;

    const colName = getCollectionName(modelName, schema);
    const filter = this.getFilter ? this.getFilter() : {};
    const update = this.getUpdate ? this.getUpdate() : {};

    setImmediate(async () => {
      try {
        const col = conn.collection(colName);
        await col.updateMany(filter, update);
      } catch (err) {
        console.warn(`[Mirror] Failed to mirror updateMany on ${modelName}:`, err.message);
      }
    });
  });

  // deleteMany hook — mirror the exact delete filter directly to the backup collection
  schema.post('deleteMany', function () {
    const conn = getBackupConn();
    if (!conn || conn.readyState !== 1) return;
    if (isBackupTarget(this, conn)) return;

    const colName = getCollectionName(modelName, schema);
    const filter = this.getFilter ? this.getFilter() : {};

    setImmediate(async () => {
      try {
        const col = conn.collection(colName);
        await col.deleteMany(filter);
      } catch (err) {
        console.warn(`[Mirror] Failed to mirror deleteMany on ${modelName}:`, err.message);
      }
    });
  });

  // insertMany hook — upsert each document using bulkWrite so duplicates never fail
  schema.post('insertMany', function (docs) {
    const conn = getBackupConn();
    if (!conn || conn.readyState !== 1) return;
    if (isBackupTarget(this, conn)) return;

    const colName = getCollectionName(modelName, schema);
    const list = Array.isArray(docs) ? docs : [docs];
    if (!list.length) return;

    setImmediate(async () => {
      try {
        const ops = list.map(d => {
          const docObj = d && typeof d.toObject === 'function' ? d.toObject() : d;
          return {
            replaceOne: {
              filter: { _id: docObj._id },
              replacement: docObj,
              upsert: true,
            }
          };
        });
        const col = conn.collection(colName);
        await col.bulkWrite(ops, { ordered: false });
      } catch (err) {
        console.warn(`[Mirror] Failed to mirror insertMany on ${modelName}:`, err.message);
      }
    });
  });
};

// Safe, idempotent resync helper if ever needed manually or via maintenance endpoint
const resyncModelToBackup = async (modelName) => {
  const conn = getBackupConn();
  if (!conn || conn.readyState !== 1) return { synced: 0, message: 'Backup DB not connected' };

  const PrimaryModel = mongoose.models[modelName];
  if (!PrimaryModel) return { synced: 0, message: `Model ${modelName} not found` };

  const colName = getCollectionName(modelName, PrimaryModel.schema);
  const col = conn.collection(colName);

  const allDocs = await PrimaryModel.find().lean();
  if (!allDocs.length) {
    await col.deleteMany({});
    return { synced: 0 };
  }

  const ops = allDocs.map(doc => ({
    replaceOne: {
      filter: { _id: doc._id },
      replacement: doc,
      upsert: true,
    }
  }));

  const primaryIds = allDocs.map(d => d._id);
  await col.deleteMany({ _id: { $nin: primaryIds } });
  await col.bulkWrite(ops, { ordered: false });

  return { synced: allDocs.length };
};

module.exports = { registerMirrorHooks, resyncModelToBackup };
