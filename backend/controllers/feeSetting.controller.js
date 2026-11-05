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

    const { id, year, month, months, penaltyAssignTo, applyFor, monthlyFee, penaltyFee, penaltyDay, siblingDiscount } = req.body;

    const numYear = Number(year);
    if (!numYear || numYear < 1900 || numYear > 2200) {
      return res.status(400).json({ message: 'Invalid academic year' });
    }

    // Determine target months list - support both array of months or single month
    let targetMonths = [];
    if (Array.isArray(months) && months.length > 0) {
      targetMonths = months.filter(m => VALID_MONTHS.includes(m));
    } else if (typeof months === 'string' && months.trim()) {
      targetMonths = months.split(',').map(m => m.trim()).filter(m => VALID_MONTHS.includes(m));
    } else if (month && VALID_MONTHS.includes(month)) {
      targetMonths = [month];
    }

    if (targetMonths.length === 0) {
      return res.status(400).json({ message: `Please select at least one valid month from: ${VALID_MONTHS.join(', ')}` });
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

    const results = [];

    // If an existing document ID was passed and targetMonths has exactly 1 month, update that document
    if (id && targetMonths.length === 1) {
      const updated = await FeeSetting.findByIdAndUpdate(
        id,
        {
          year: numYear,
          month: targetMonths[0],
          monthlyFee: numMonthlyFee,
          penaltyAssignTo: targetPenaltyAssign,
          penaltyFee: numPenaltyFee,
          penaltyDay: numPenaltyDay,
          siblingDiscount: numSiblingDiscount,
          createdBy: req.user._id
        },
        { new: true, runValidators: true }
      );
      if (updated) {
        results.push(updated);
      }
    }

    // For all selected months (or when id is omitted / multiple months selected):
    for (const m of targetMonths) {
      if (results.some(r => r.month === m)) continue;

      const doc = await FeeSetting.findOneAndUpdate(
        { year: numYear, month: m },
        {
          year: numYear,
          month: m,
          monthlyFee: numMonthlyFee,
          penaltyAssignTo: targetPenaltyAssign,
          penaltyFee: numPenaltyFee,
          penaltyDay: numPenaltyDay,
          siblingDiscount: numSiblingDiscount,
          createdBy: req.user._id
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
      results.push(doc);
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
      `Configured fee for ${targetMonths.join(', ')} ${numYear}: Base Fee ${numMonthlyFee} ETB (All students), Penalty ${numPenaltyFee} ETB/day after day ${numPenaltyDay} assigned to ${targetLabel}, Sibling Discount ${numSiblingDiscount}%`
    );

    res.json(results.length === 1 ? results[0] : results);
  } catch (error) {
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
