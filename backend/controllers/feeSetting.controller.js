const FeeSetting = require('../models/FeeSetting.model');
const logActivity = require('../utils/logActivity');

const VALID_MONTHS = [
  'September', 'October', 'November', 'December', 'January', 
  'February', 'March', 'April', 'May', 'June'
];

const VALID_PENALTY_TARGETS = ['all', 'regular', 'special', 'none'];

let indexCleaned = false;
const ensureCleanIndexes = async () => {
  if (indexCleaned) return;
  try {
    const indexes = await FeeSetting.collection.indexes();
    for (const idx of indexes) {
      if (idx.name === 'year_1_month_1_applyFor_1') {
        await FeeSetting.collection.dropIndex(idx.name).catch(() => {});
        console.log('[FeeSetting] Dropped obsolete index:', idx.name);
      }
    }
    indexCleaned = true;
  } catch (e) {
    indexCleaned = true;
  }
};

const getFeeSettings = async (req, res) => {
  try {
    await ensureCleanIndexes();
    const filter = {};
    if (req.query.year) {
      filter.year = Number(req.query.year);
    }
    const settings = await FeeSetting.find(filter).sort({ year: -1, createdAt: -1 });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch fee settings' });
  }
};

const upsertFeeSetting = async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only superadmin can manage fee settings.' });
    }

    await ensureCleanIndexes();

    const { id, year, month, penaltyAssignTo, applyFor, monthlyFee, penaltyFee, penaltyDay, siblingDiscount } = req.body;

    const numYear = Number(year);
    if (!numYear || numYear < 1900 || numYear > 2200) {
      return res.status(400).json({ message: 'Invalid academic year' });
    }

    if (!VALID_MONTHS.includes(month)) {
      return res.status(400).json({ message: `Invalid month. Must be one of: ${VALID_MONTHS.join(', ')}` });
    }

    // Support both penaltyAssignTo and applyFor for seamless compatibility
    const targetPenaltyAssign = VALID_PENALTY_TARGETS.includes(penaltyAssignTo)
      ? penaltyAssignTo
      : VALID_PENALTY_TARGETS.includes(applyFor)
      ? applyFor
      : 'all';

    const numMonthlyFee = Number(monthlyFee);
    if (isNaN(numMonthlyFee) || numMonthlyFee < 0) {
      return res.status(400).json({ message: 'Monthly fee must be a non-negative number' });
    }

    const numPenaltyFee = Number(penaltyFee);
    if (isNaN(numPenaltyFee) || numPenaltyFee < 0) {
      return res.status(400).json({ message: 'Penalty fee must be a non-negative number' });
    }

    const numPenaltyDay = Number(penaltyDay);
    if (isNaN(numPenaltyDay) || numPenaltyDay < 1 || numPenaltyDay > 30) {
      return res.status(400).json({ message: 'Penalty day must be between 1 and 30' });
    }

    const numSiblingDiscount = Math.max(0, Math.min(100, Number(siblingDiscount) || 0));

    let updated = null;

    if (id) {
      // 1. Direct update by document _id
      updated = await FeeSetting.findByIdAndUpdate(
        id,
        {
          year: numYear,
          month,
          monthlyFee: numMonthlyFee,
          penaltyAssignTo: targetPenaltyAssign,
          penaltyFee: numPenaltyFee,
          penaltyDay: numPenaltyDay,
          siblingDiscount: numSiblingDiscount,
          createdBy: req.user._id
        },
        { new: true, runValidators: true }
      );
    }

    if (!updated) {
      // 2. Find or create by year & month
      updated = await FeeSetting.findOneAndUpdate(
        { year: numYear, month },
        {
          year: numYear,
          month,
          monthlyFee: numMonthlyFee,
          penaltyAssignTo: targetPenaltyAssign,
          penaltyFee: numPenaltyFee,
          penaltyDay: numPenaltyDay,
          siblingDiscount: numSiblingDiscount,
          createdBy: req.user._id
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    }

    const targetLabel = targetPenaltyAssign === 'regular'
      ? 'Regular Students Only'
      : targetPenaltyAssign === 'special'
      ? 'Special Students Only'
      : targetPenaltyAssign === 'none'
      ? 'Unassigned / No Penalty'
      : 'All Students';

    await logActivity(
      req.user,
      'Saved Fee Setting',
      'Settings',
      `Configured fee for ${month} ${numYear}: Base Fee ${numMonthlyFee} ETB (All students), Penalty ${numPenaltyFee} ETB/day assigned to ${targetLabel}, Sibling Discount ${numSiblingDiscount}%`
    );

    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      // Drop any conflicting compound index and retry once safely
      try {
        await FeeSetting.collection.dropIndex('year_1_month_1_applyFor_1').catch(() => {});
        const { id, year, month, penaltyAssignTo, applyFor, monthlyFee, penaltyFee, penaltyDay, siblingDiscount } = req.body;
        const numYear = Number(year);
        const targetPenaltyAssign = VALID_PENALTY_TARGETS.includes(penaltyAssignTo)
          ? penaltyAssignTo
          : VALID_PENALTY_TARGETS.includes(applyFor)
          ? applyFor
          : 'all';
        const numMonthlyFee = Number(monthlyFee) || 0;
        const numPenaltyFee = Number(penaltyFee) || 0;
        const numPenaltyDay = Number(penaltyDay) || 10;
        const numSiblingDiscount = Number(siblingDiscount) || 0;

        let retryDoc = null;
        if (id) {
          retryDoc = await FeeSetting.findByIdAndUpdate(
            id,
            {
              year: numYear,
              month,
              monthlyFee: numMonthlyFee,
              penaltyAssignTo: targetPenaltyAssign,
              penaltyFee: numPenaltyFee,
              penaltyDay: numPenaltyDay,
              siblingDiscount: numSiblingDiscount,
              createdBy: req.user._id
            },
            { new: true, runValidators: true }
          );
        }
        if (!retryDoc) {
          retryDoc = await FeeSetting.findOneAndUpdate(
            { year: numYear, month },
            {
              year: numYear,
              month,
              monthlyFee: numMonthlyFee,
              penaltyAssignTo: targetPenaltyAssign,
              penaltyFee: numPenaltyFee,
              penaltyDay: numPenaltyDay,
              siblingDiscount: numSiblingDiscount,
              createdBy: req.user._id
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
          );
        }
        return res.json(retryDoc);
      } catch (retryErr) {
        return res.status(500).json({ message: retryErr.message });
      }
    }
    res.status(500).json({ message: error.message || 'Failed to save fee setting' });
  }
};

const deleteFeeSetting = async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only superadmin can delete fee settings.' });
    }

    const { id } = req.params;
    const deleted = await FeeSetting.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Fee setting not found' });
    }

    await logActivity(
      req.user,
      'Deleted Fee Setting',
      'Settings',
      `Deleted fee configuration for ${deleted.month} ${deleted.year}`
    );

    res.json({ message: 'Fee setting deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete fee setting' });
  }
};

module.exports = {
  getFeeSettings,
  upsertFeeSetting,
  deleteFeeSetting
};
