const ActivityLog = require('../models/ActivityLog.model');

async function logActivity(user, action, module, description) {
  try {
    await ActivityLog.create({
      performedBy: user._id,
      performedByName: user.name,
      performedByRole: user.role,
      action,
      module,
      description,
    });
  } catch (e) {
    // never block main flow
  }
}

module.exports = logActivity;
