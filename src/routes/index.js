const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const questionRoutes = require('./questionRoutes');
const companyRoutes = require('./companyRoutes');
const testRoutes = require('./testRoutes');
const bookmarkRoutes = require('./bookmarkRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const coordinatorRoutes = require('./coordinatorRoutes');
const adminRoutes = require('./adminRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ReadyUp Aptitude Backend API',
    version: '1.0.0'
  });
});

router.use('/auth', authRoutes);
router.use('/questions', questionRoutes);
router.use('/companies', companyRoutes);
router.use('/tests', testRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/coordinator', coordinatorRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
