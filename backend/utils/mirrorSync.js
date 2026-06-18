const { getBackupConn } = require('../config/db.config');

// Fire-and-forget mirror — never blocks the main request
const mirrorToBackup = (modelName, schema, doc, op) => {
  const conn = getBackupConn();
  if (!conn) return;

  (async () => {
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
  })();
};

// Call this once per model to register hooks
const registerMirrorHooks = (schema, modelName) => {
  schema.post('save', function () {
    mirrorToBackup(modelName, this.schema, this, 'save');
  });

  schema.post('findOneAndUpdate', function (doc) {
    if (doc) mirrorToBackup(modelName, doc.schema, doc, 'save');
  });

  schema.post('findOneAndDelete', function (doc) {
    if (doc) mirrorToBackup(modelName, doc.schema, doc, 'delete');
  });

  // deleteMany — resync in background, never blocks
  schema.post(['updateMany', 'deleteMany'], function () {
    const conn = getBackupConn();
    if (!conn) return;
    (async () => {
      try {
        const PrimaryModel = require('mongoose').model(modelName);
        const BackupModel = conn.models[modelName] || conn.model(modelName, schema);
        const all = await PrimaryModel.find().lean();
        await BackupModel.deleteMany({});
        if (all.length) await BackupModel.insertMany(all, { ordered: false });
      } catch (err) {
        console.warn(`[Mirror] Bulk resync failed for ${modelName}:`, err.message);
      }
    })();
  });
};

module.exports = { registerMirrorHooks };
