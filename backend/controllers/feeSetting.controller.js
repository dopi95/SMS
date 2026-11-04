const FeeSetting = require('../models/FeeSetting.model');
const logActivity = require('../utils/logActivity');

const VALID_MONTHS = [
  'September', 'October', 'November', 'December', 'January', 
  'February', 'March', 'April', 'May', 'June'
];

const getFeeSettings = async (req, res) => {
  try {
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

    const { year, month, monthlyFee, penaltyFee, penaltyDay } = req.body;

    const numYear = Number(year);
    if (!numYear || numYear < 1900 || numYear > 2200) {
      return res.status(400).json({ message: 'Invalid academic year' });
    }

    if (!VALID_MONTHS.includes(month)) {
      return res.status(400).json({ message: `Invalid month. Must be one of: ${VALID_MONTHS.join(', ')}` });
    }

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

    const updated = await FeeSetting.findOneAndUpdate(
      { year: numYear, month },
      {
        year: numYear,
        month,
        monthlyFee: numMonthlyFee,
        penaltyFee: numPenaltyFee,
        penaltyDay: numPenaltyDay,
        createdBy: req.user._id
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await logActivity(
      req.user,
      'Saved Fee Setting',
      'Settings',
      `Configured fee for ${month} ${numYear}: Base Fee ${numMonthlyFee} ETB, Penalty ${numPenaltyFee} ETB/day after day ${numPenaltyDay}`
    );

    res.json(updated);
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
