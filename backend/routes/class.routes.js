const express = require('express');
const { getClasses, getClass, createClass, updateClass, deleteClass } = require('../controllers/class.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', auth, getClasses);
router.get('/:id', auth, getClass);
router.post('/', auth, createClass);
router.put('/:id', auth, updateClass);
router.delete('/:id', auth, deleteClass);

module.exports = router;