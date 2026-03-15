const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
  createFile,
  getFiles,
  getFile,
  deleteFile,
  updateFile,
  addEntry,
  updateEntry,
  deleteEntry,
  exportFile
} = require('../controllers/customPayment.controller');

router.use(auth);

// File routes
router.post('/files', createFile);
router.get('/files', getFiles);
router.get('/files/:id', getFile);
router.put('/files/:id', updateFile);
router.delete('/files/:id', deleteFile);
router.get('/files/:id/export', exportFile);

// Entry routes
router.post('/entries', addEntry);
router.put('/entries/:id', updateEntry);
router.delete('/entries/:id', deleteEntry);

module.exports = router;
