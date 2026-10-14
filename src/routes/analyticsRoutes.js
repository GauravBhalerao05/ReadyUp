const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.get('/dashboard', authenticate, authorize('student'), analyticsController.getStudentDashboard);

module.exports = router;
