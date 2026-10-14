const analyticsService = require('../services/analyticsService');
const { successResponse } = require('../utils/response');

const getStudentDashboard = async (req, res, next) => {
  try {
    const dashboard = await analyticsService.getStudentDashboard(req.user);
    return successResponse(res, 'Student dashboard metrics retrieved successfully', dashboard, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDashboard
};
