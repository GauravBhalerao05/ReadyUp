const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const validate = require('../middleware/validate');
const {
  startPracticeSchema,
  submitTestAttemptSchema,
  createMockTestSchema
} = require('../validators/testValidator');

// Mock test listing
router.get('/mock-tests', authenticate, testController.listMockTests);
router.get('/mock-tests/:id', authenticate, testController.getMockTestById);

// Student practice & mock test execution
router.post(
  '/practice/start',
  authenticate,
  authorize('student'),
  validate(startPracticeSchema),
  testController.startPractice
);

router.post(
  '/mock-tests/:id/start',
  authenticate,
  authorize('student'),
  testController.startMockTest
);

router.post(
  '/attempts/:attemptId/submit',
  authenticate,
  authorize('student'),
  validate(submitTestAttemptSchema),
  testController.submitTest
);

router.get(
  '/attempts/:attemptId/review',
  authenticate,
  authorize('student'),
  testController.getReview
);

router.get(
  '/history',
  authenticate,
  authorize('student'),
  testController.getHistory
);

router.get(
  '/incorrect',
  authenticate,
  authorize('student'),
  testController.getIncorrectQuestions
);

// Coordinator creation of mock tests
router.post(
  '/mock-tests',
  authenticate,
  authorize('coordinator'),
  validate(createMockTestSchema),
  testController.createMockTest
);

module.exports = router;
