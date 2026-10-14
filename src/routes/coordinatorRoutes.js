const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinatorController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../middleware/upload');

// Enforce authentication and coordinator authorization on all coordinator routes
router.use(authenticate, authorize('coordinator'));

router.get('/dashboard', coordinatorController.getCoordinatorDashboard);
router.get('/import/template', coordinatorController.downloadTemplate);
router.post('/import/preview', upload.single('file'), coordinatorController.uploadPreview);
router.post('/import/confirm', coordinatorController.confirmImport);
router.get('/import/history', coordinatorController.getImportHistory);

module.exports = router;
