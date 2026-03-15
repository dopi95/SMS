const express = require('express');
const auth = require('../middleware/auth.middleware');
const { getAdmins, createAdmin, updateAdmin, deleteAdmin } = require('../controllers/admin.controller');

const router = express.Router();

router.get('/', auth, getAdmins);
router.post('/', auth, createAdmin);
router.put('/:id', auth, updateAdmin);
router.delete('/:id', auth, deleteAdmin);

module.exports = router;
