const questionService = require('../services/questionService');
const { successResponse, paginatedResponse } = require('../utils/response');
const { logAudit } = require('../middleware/audit');

const getCategoriesAndTopics = async (req, res, next) => {
  try {
    const data = await questionService.getCategoriesAndTopics();
    return successResponse(res, 'Categories and topics retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

const getQuestions = async (req, res, next) => {
  try {
    const { category, topic, subtopic, difficulty, company, search, page, limit, isActive } = req.query;
    const role = req.user ? req.user.role : 'student';

    const result = await questionService.getQuestions({
      category,
      topic,
      subtopic,
      difficulty,
      company,
      search,
      page,
      limit,
      isActive,
      role
    });

    return paginatedResponse(res, 'Questions retrieved successfully', result.questions, {
      total: result.total,
      page: result.page,
      limit: result.limit
    });
  } catch (error) {
    next(error);
  }
};

const getQuestionById = async (req, res, next) => {
  try {
    const role = req.user ? req.user.role : 'student';
    const question = await questionService.getQuestionById(req.params.id, role);
    return successResponse(res, 'Question details retrieved successfully', question, 200);
  } catch (error) {
    next(error);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const question = await questionService.createQuestion(req.body, req.user);
    await logAudit({
      action: 'QUESTION_CREATED',
      user: req.user,
      targetType: 'question',
      targetId: question.questionId,
      details: { topic: question.topic, category: question.category, difficulty: question.difficulty },
      req
    });
    return successResponse(res, 'Question created successfully', question, 201);
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await questionService.updateQuestion(req.params.id, req.body, req.user);
    await logAudit({
      action: 'QUESTION_UPDATED',
      user: req.user,
      targetType: 'question',
      targetId: question.questionId,
      details: req.body,
      req
    });
    return successResponse(res, 'Question updated successfully', question, 200);
  } catch (error) {
    next(error);
  }
};

const toggleQuestionStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const question = await questionService.toggleQuestionStatus(req.params.id, isActive, req.user);
    await logAudit({
      action: 'QUESTION_STATUS_TOGGLED',
      user: req.user,
      targetType: 'question',
      targetId: question.questionId,
      details: { isActive },
      req
    });
    return successResponse(res, `Question ${isActive ? 'activated' : 'deactivated'} successfully`, question, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategoriesAndTopics,
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  toggleQuestionStatus
};
