const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
  getFeeSettings,
  upsertFeeSetting,
  deleteFeeSetting
} = require('../controllers/feeSetting.controller');

router.use(auth);

router.get('/', getFeeSettings);
router.post('/', upsertFeeSetting);
router.delete('/:id', deleteFeeSetting);

module.exports = router;
