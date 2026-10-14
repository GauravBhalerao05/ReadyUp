const MockTest = require('../models/MockTest');
const testService = require('../services/testService');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../middleware/audit');

const listMockTests = async (req, res, next) => {
  try {
    const { company, type, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (company) filter.company = new RegExp(`^${company}$`, 'i');
    if (type) filter.type = type;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));

    const total = await MockTest.countDocuments(filter);
    const tests = await MockTest.find(filter)
      .select('-questions')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    return paginatedResponse(res, 'Mock tests retrieved successfully', tests, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit
    });
  } catch (error) {
    next(error);
  }
};

const getMockTestById = async (req, res, next) => {
  try {
    const test = await MockTest.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slug: req.params.id }],
      isActive: true
    }).select('-questions');

    if (!test) {
      return errorResponse(res, 'Mock test not found', 404);
    }

    return successResponse(res, 'Mock test details retrieved', test, 200);
  } catch (error) {
    next(error);
  }
};

const startPractice = async (req, res, next) => {
  try {
    const result = await testService.startPracticeSession(req.user, req.body);
    return successResponse(res, 'Practice session initialized successfully', result, 201);
  } catch (error) {
    next(error);
  }
};

const startMockTest = async (req, res, next) => {
  try {
    const result = await testService.startMockTest(req.user, req.params.id);
    return successResponse(res, 'Mock test started. Timer is now running.', result, 201);
  } catch (error) {
    next(error);
  }
};

const submitTest = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const result = await testService.submitAttempt(req.user, req.params.attemptId, answers);

    await logAudit({
      action: 'TEST_SUBMITTED',
      user: req.user,
      targetType: 'test',
      targetId: String(result.attemptId),
      details: {
        score: result.score,
        totalMarks: result.totalMarks,
        passed: result.passed,
        percentage: result.percentage
      },
      req
    });

    return successResponse(res, 'Test submitted and scored successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

const getReview = async (req, res, next) => {
  try {
    const result = await testService.getAttemptReview(req.user, req.params.attemptId);
    return successResponse(res, 'Test review retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const { page, limit, type } = req.query;
    const result = await testService.getStudentHistory(req.user, { page, limit, type });
    return paginatedResponse(res, 'Test history retrieved successfully', result.attempts, {
      total: result.total,
      page: result.page,
      limit: result.limit
    });
  } catch (error) {
    next(error);
  }
};

const getIncorrectQuestions = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const questions = await testService.getIncorrectQuestions(req.user, { limit });
    return successResponse(res, 'Incorrect questions retrieved for retry practice', questions, 200);
  } catch (error) {
    next(error);
  }
};

const createMockTest = async (req, res, next) => {
  try {
    const slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newTest = await MockTest.create({
      ...req.body,
      slug,
      createdBy: req.user._id
    });

    await logAudit({
      action: 'MOCK_TEST_CREATED',
      user: req.user,
      targetType: 'test',
      targetId: String(newTest._id),
      details: { title: newTest.title, company: newTest.company },
      req
    });

    return successResponse(res, 'Mock test created successfully', newTest, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMockTests,
  getMockTestById,
  startPractice,
  startMockTest,
  submitTest,
  getReview,
  getHistory,
  getIncorrectQuestions,
  createMockTest
};
