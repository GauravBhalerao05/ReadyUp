const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { createQuestionSchema, updateQuestionSchema } = require('../validators/questionValidator');

// Public/student-accessible question browsing
router.get('/categories', authenticate, questionController.getCategoriesAndTopics);
router.get('/', authenticate, questionController.getQuestions);
router.get('/:id', authenticate, questionController.getQuestionById);

// Coordinator-only question modification (Admin cannot edit questions per requirements!)
router.post(
  '/',
  authenticate,
  authorize('coordinator'),
  validate(createQuestionSchema),
  questionController.createQuestion
);

router.put(
  '/:id',
  authenticate,
  authorize('coordinator'),
  validate(updateQuestionSchema),
  questionController.updateQuestion
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('coordinator'),
  questionController.toggleQuestionStatus
);

module.exports = router;
