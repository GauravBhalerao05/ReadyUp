const Bookmark = require('../models/Bookmark');
const Question = require('../models/Question');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const addBookmark = async (req, res, next) => {
  try {
    const { questionId, note } = req.body;

    const question = await Question.findOne({
      $or: [{ _id: questionId.match(/^[0-9a-fA-F]{24}$/) ? questionId : null }, { questionId: questionId.toUpperCase() }]
    });

    if (!question) {
      return errorResponse(res, 'Question not found', 404);
    }

    const bookmark = await Bookmark.findOneAndUpdate(
      { user: req.user._id, question: question._id },
      {
        user: req.user._id,
        question: question._id,
        questionId: question.questionId,
        note: note || ''
      },
      { upsert: true, new: true }
    );

    return successResponse(res, 'Question bookmarked successfully', bookmark, 201);
  } catch (error) {
    next(error);
  }
};

const removeBookmark = async (req, res, next) => {
  try {
    const questionId = req.params.questionId;

    const question = await Question.findOne({
      $or: [{ _id: questionId.match(/^[0-9a-fA-F]{24}$/) ? questionId : null }, { questionId: questionId.toUpperCase() }]
    });

    const filter = { user: req.user._id };
    if (question) {
      filter.question = question._id;
    } else {
      filter.questionId = questionId.toUpperCase();
    }

    const deleted = await Bookmark.findOneAndDelete(filter);
    if (!deleted) {
      return errorResponse(res, 'Bookmark not found', 404);
    }

    return successResponse(res, 'Bookmark removed successfully', null, 200);
  } catch (error) {
    next(error);
  }
};

const getBookmarks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));

    const total = await Bookmark.countDocuments({ user: req.user._id });
    const bookmarks = await Bookmark.find({ user: req.user._id })
      .populate('question')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    return paginatedResponse(res, 'Bookmarks retrieved successfully', bookmarks, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addBookmark,
  removeBookmark,
  getBookmarks
};
