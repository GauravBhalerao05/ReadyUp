const Question = require('../models/Question');
const Category = require('../models/Category');
const Topic = require('../models/Topic');
const Company = require('../models/Company');

const getCategoriesAndTopics = async () => {
  const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });
  const topics = await Topic.find({ isActive: true }).sort({ category: 1, order: 1, name: 1 });

  // Group topics by category
  const grouped = categories.map((cat) => {
    const catTopics = topics.filter((t) => t.category.toLowerCase() === cat.name.toLowerCase());
    return {
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      topics: catTopics.map((t) => ({
        _id: t._id,
        name: t.name,
        slug: t.slug,
        subtopics: t.subtopics,
        questionCount: t.questionCount
      }))
    };
  });

  return grouped;
};

const getQuestions = async ({
  category,
  topic,
  subtopic,
  difficulty,
  company,
  search,
  page = 1,
  limit = 20,
  isActive = true,
  role = 'student'
}) => {
  const filter = {};

  if (isActive !== undefined && isActive !== null) {
    filter.isActive = isActive === true || isActive === 'true';
  }

  if (category) {
    filter.category = new RegExp(`^${category}$`, 'i');
  }

  if (topic) {
    filter.topic = new RegExp(`^${topic}$`, 'i');
  }

  if (subtopic) {
    filter.subtopic = new RegExp(`^${subtopic}$`, 'i');
  }

  if (difficulty) {
    filter.difficulty = difficulty.toLowerCase();
  }

  if (company) {
    filter.companies = { $in: [new RegExp(`^${company}$`, 'i')] };
  }

  if (search) {
    filter.$or = [
      { questionText: new RegExp(search, 'i') },
      { questionId: new RegExp(search, 'i') },
      { topic: new RegExp(search, 'i') }
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const total = await Question.countDocuments(filter);
  let query = Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit);

  // If a student is browsing questions outside of an active test, we can include the explanation and correct answer
  // (e.g. self-study / question bank mode), but during mock tests they will be stripped.
  const questions = await query.exec();

  return {
    questions,
    total,
    page: parseInt(page, 10),
    limit: parsedLimit
  };
};

const getQuestionById = async (questionId, role = 'student') => {
  const question = await Question.findOne({
    $or: [{ _id: questionId.match(/^[0-9a-fA-F]{24}$/) ? questionId : null }, { questionId: questionId.toUpperCase() }]
  });

  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  return question;
};

const createQuestion = async (questionData, user) => {
  const existing = await Question.findOne({ questionId: questionData.questionId.toUpperCase() });
  if (existing) {
    const error = new Error(`Question with ID '${questionData.questionId}' already exists`);
    error.statusCode = 409;
    throw error;
  }

  const question = await Question.create({
    ...questionData,
    createdBy: user._id,
    updatedBy: user._id
  });

  // Increment topic questionCount
  await Topic.findOneAndUpdate(
    { name: new RegExp(`^${question.topic}$`, 'i') },
    { $inc: { questionCount: 1 } }
  );

  return question;
};

const updateQuestion = async (questionId, updateData, user) => {
  const question = await Question.findOne({
    $or: [{ _id: questionId.match(/^[0-9a-fA-F]{24}$/) ? questionId : null }, { questionId: questionId.toUpperCase() }]
  });

  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  delete updateData.questionId; // Stable question ID cannot be mutated

  Object.assign(question, updateData);
  question.updatedBy = user._id;
  await question.save();

  return question;
};

const toggleQuestionStatus = async (questionId, isActive, user) => {
  const question = await Question.findOne({
    $or: [{ _id: questionId.match(/^[0-9a-fA-F]{24}$/) ? questionId : null }, { questionId: questionId.toUpperCase() }]
  });

  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  question.isActive = isActive;
  question.updatedBy = user._id;
  await question.save();

  return question;
};

module.exports = {
  getCategoriesAndTopics,
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  toggleQuestionStatus
};
