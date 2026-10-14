const Company = require('../models/Company');
const Question = require('../models/Question');
const { successResponse, errorResponse } = require('../utils/response');

const getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find({ isActive: true }).sort({ questionCount: -1, name: 1 });
    return successResponse(res, 'Companies retrieved successfully', companies, 200);
  } catch (error) {
    next(error);
  }
};

const getCompanyBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const company = await Company.findOne({ slug, isActive: true });

    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    // Get topics that have questions for this company
    const topicBreakdown = await Question.aggregate([
      { $match: { companies: new RegExp(`^${company.name}$`, 'i'), isActive: true } },
      { $group: { _id: { category: '$category', topic: '$topic' }, count: { $sum: 1 } } },
      { $project: { _id: 0, category: '$_id.category', topic: '$_id.topic', questionCount: '$count' } },
      { $sort: { questionCount: -1 } }
    ]);

    return successResponse(res, 'Company details retrieved successfully', {
      ...company.toObject(),
      topicBreakdown
    }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompanyBySlug
};
