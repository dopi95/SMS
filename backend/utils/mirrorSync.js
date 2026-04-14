const { getBackupConn } = require('../config/db.config');

// Mirror a document to backup DB after save/update/delete
const mirrorToBackup = async (modelName, schema, doc, op) => {
  const conn = getBackupConn();
  if (!conn) return; // no backup configured, skip silently

  try {
    const BackupModel = conn.models[modelName] || conn.model(modelName, schema);

    if (op === 'delete') {
      await BackupModel.findByIdAndDelete(doc._id);
    } else {
      await BackupModel.findByIdAndUpdate(doc._id, doc.toObject(), { upsert: true });
    }
  } catch (err) {
    console.warn(`[Mirror] Failed to mirror ${op} on ${modelName}:`, err.message);
  }
};

// Call this once per model to register hooks
const registerMirrorHooks = (schema, modelName) => {
  // after save (create / update via .save())
  schema.post('save', function () {
    mirrorToBackup(modelName, this.schema, this, 'save');
  });

  // after findOneAndUpdate / findByIdAndUpdate
  schema.post('findOneAndUpdate', function (doc) {
    if (doc) mirrorToBackup(modelName, doc.schema, doc, 'save');
  });

  // after findOneAndDelete / findByIdAndDelete
  schema.post('findOneAndDelete', function (doc) {
    if (doc) mirrorToBackup(modelName, doc.schema, doc, 'delete');
  });

  // after updateMany / deleteMany — do a full resync of that collection
  schema.post(['updateMany', 'deleteMany'], async function () {
    const conn = getBackupConn();
    if (!conn) return;
    try {
      const PrimaryModel = require('mongoose').model(modelName);
      const BackupModel = conn.models[modelName] || conn.model(modelName, schema);
      const all = await PrimaryModel.find().lean();
      await BackupModel.deleteMany({});
      if (all.length) await BackupModel.insertMany(all, { ordered: false });
    } catch (err) {
      console.warn(`[Mirror] Bulk resync failed for ${modelName}:`, err.message);
    }
  });
};

module.exports = { registerMirrorHooks };
