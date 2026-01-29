const express = require('express');
const { updateProfile, changePassword, getProfile } = require('../controllers/profile.controller');
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/', auth, getProfile);
router.put('/update', auth, upload.single('profilePhoto'), updateProfile);
router.put('/change-password', auth, changePassword);

module.exports = router;