const mongoose = require('mongoose');
const Question = require('../models/Question');
const MockTest = require('../models/MockTest');
const TestAttempt = require('../models/TestAttempt');

/**
 * Start a flexible practice session
 */
const startPracticeSession = async (user, { category, topic, difficulty, company, count = 10 }) => {
  const filter = { isActive: true };

  if (category) filter.category = new RegExp(`^${category}$`, 'i');
  if (topic) filter.topic = new RegExp(`^${topic}$`, 'i');
  if (difficulty) filter.difficulty = difficulty.toLowerCase();
  if (company) filter.companies = { $in: [new RegExp(`^${company}$`, 'i')] };

  // Pull random sample of questions matching criteria
  const matchQuestions = await Question.aggregate([
    { $match: filter },
    { $sample: { size: Math.min(count, 50) } }
  ]);

  if (matchQuestions.length === 0) {
    const err = new Error('No questions found matching the selected criteria');
    err.statusCode = 404;
    throw err;
  }

  const attemptTitle = topic
    ? `Practice: ${topic} (${difficulty || 'All Levels'})`
    : company
    ? `Practice: ${company} Aptitude Questions`
    : `Aptitude Practice Session`;

  // Create in-progress attempt
  const attempt = await TestAttempt.create({
    user: user._id,
    title: attemptTitle,
    type: 'practice',
    company: company || '',
    status: 'in_progress',
    startedAt: new Date(),
    totalQuestions: matchQuestions.length,
    totalMarks: matchQuestions.length,
    passingMarks: Math.ceil(matchQuestions.length * 0.5),
    answers: matchQuestions.map((q) => ({
      question: q._id,
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctOption,
      explanation: q.explanation,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty,
      selectedOption: null,
      isCorrect: false,
      isAttempted: false
    }))
  });

  // Return questions without correct answers/explanations to student
  const sanitizedQuestions = matchQuestions.map((q) => ({
    _id: q._id,
    questionId: q.questionId,
    questionText: q.questionText,
    options: q.options,
    category: q.category,
    topic: q.topic,
    difficulty: q.difficulty
  }));

  return {
    attemptId: attempt._id,
    title: attempt.title,
    type: 'practice',
    totalQuestions: sanitizedQuestions.length,
    startedAt: attempt.startedAt,
    questions: sanitizedQuestions
  };
};

/**
 * Start a structured Mock Test
 */
const startMockTest = async (user, mockTestId) => {
  const mockTest = await MockTest.findOne({
    $or: [{ _id: mockTestId.match(/^[0-9a-fA-F]{24}$/) ? mockTestId : null }, { slug: mockTestId }],
    isActive: true
  }).populate('questions');

  if (!mockTest) {
    const err = new Error('Mock test not found or is currently unavailable');
    err.statusCode = 404;
    throw err;
  }

  let testQuestions = mockTest.questions;

  // If questions are not statically attached, pull matching pool
  if (!testQuestions || testQuestions.length === 0) {
    const filter = { isActive: true };
    if (mockTest.company) filter.companies = { $in: [new RegExp(`^${mockTest.company}$`, 'i')] };
    if (mockTest.topics && mockTest.topics.length > 0) filter.topic = { $in: mockTest.topics };

    testQuestions = await Question.find(filter).limit(mockTest.totalMarks || 25);
  }

  if (testQuestions.length === 0) {
    const err = new Error('No questions available in the question bank for this mock test');
    err.statusCode = 400;
    throw err;
  }

  const durationMs = (mockTest.durationMinutes || 60) * 60 * 1000;
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + durationMs);

  const attempt = await TestAttempt.create({
    user: user._id,
    mockTest: mockTest._id,
    title: mockTest.title,
    type: 'mock_test',
    company: mockTest.company || '',
    status: 'in_progress',
    startedAt,
    expiresAt,
    totalQuestions: testQuestions.length,
    totalMarks: mockTest.totalMarks || testQuestions.length,
    passingMarks: mockTest.passingMarks || Math.ceil(testQuestions.length * 0.5),
    answers: testQuestions.map((q) => ({
      question: q._id,
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctOption,
      explanation: q.explanation,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty,
      selectedOption: null,
      isCorrect: false,
      isAttempted: false
    }))
  });

  const sanitizedQuestions = testQuestions.map((q) => ({
    _id: q._id,
    questionId: q.questionId,
    questionText: q.questionText,
    options: q.options,
    category: q.category,
    topic: q.topic,
    difficulty: q.difficulty
  }));

  return {
    attemptId: attempt._id,
    mockTestId: mockTest._id,
    title: mockTest.title,
    company: mockTest.company,
    durationMinutes: mockTest.durationMinutes,
    totalMarks: mockTest.totalMarks,
    passingMarks: mockTest.passingMarks,
    instructions: mockTest.instructions,
    startedAt,
    expiresAt,
    questions: sanitizedQuestions
  };
};

/**
 * Submit answers for a test attempt and calculate server-verified score
 */
const submitAttempt = async (user, attemptId, submittedAnswers) => {
  const attempt = await TestAttempt.findOne({ _id: attemptId, user: user._id });

  if (!attempt) {
    const err = new Error('Test attempt not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  if (attempt.status === 'completed') {
    const err = new Error('This test attempt has already been submitted and scored');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const startedAtTime = new Date(attempt.startedAt).getTime();
  const durationSeconds = Math.max(1, Math.round((now.getTime() - startedAtTime) / 1000));

  // Map of submitted answers: questionId -> answerObj
  const answerMap = new Map();
  if (Array.isArray(submittedAnswers)) {
    submittedAnswers.forEach((ans) => {
      if (ans.questionId) {
        answerMap.set(ans.questionId.toUpperCase(), ans);
      }
    });
  }

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let rawScore = 0;

  const topicStats = {};

  // Score each answer based on ground-truth questions stored in attempt
  const updatedAnswers = attempt.answers.map((item) => {
    const submitted = answerMap.get(item.questionId.toUpperCase());
    const selected = submitted && submitted.selectedOption ? submitted.selectedOption.toUpperCase() : null;
    const timeSpent = submitted && submitted.timeSpentSeconds ? Number(submitted.timeSpentSeconds) : 0;
    const isMarked = submitted ? Boolean(submitted.markedForReview) : false;

    const topicKey = item.topic || 'General Aptitude';
    if (!topicStats[topicKey]) {
      topicStats[topicKey] = {
        topic: topicKey,
        category: item.category || 'General',
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0
      };
    }
    topicStats[topicKey].total += 1;

    let isCorrect = false;
    let isAttempted = false;

    if (selected && ['A', 'B', 'C', 'D'].includes(selected)) {
      isAttempted = true;
      topicStats[topicKey].attempted += 1;
      if (selected === item.correctOption) {
        isCorrect = true;
        correctCount += 1;
        rawScore += 1;
        topicStats[topicKey].correct += 1;
      } else {
        isCorrect = false;
        incorrectCount += 1;
        topicStats[topicKey].incorrect += 1;
      }
    } else {
      unansweredCount += 1;
      topicStats[topicKey].unanswered += 1;
    }

    item.selectedOption = selected;
    item.isCorrect = isCorrect;
    item.isAttempted = isAttempted;
    item.timeSpentSeconds = timeSpent;
    item.markedForReview = isMarked;

    return item;
  });

  const totalQuestions = updatedAnswers.length;
  const attemptedCount = correctCount + incorrectCount;
  const percentage = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(1)) : 0;
  const passed = rawScore >= (attempt.passingMarks || Math.ceil(totalQuestions * 0.5));

  // Compute topic breakdown and recommendations
  const topicBreakdown = Object.values(topicStats).map((st) => {
    const accuracy = st.total > 0 ? Number(((st.correct / st.total) * 100).toFixed(1)) : 0;
    return {
      ...st,
      accuracy
    };
  });

  // Rule-based practice recommendations
  const recommendations = [];
  topicBreakdown.forEach((tb) => {
    if (tb.accuracy < 60) {
      recommendations.push({
        topic: tb.topic,
        category: tb.category,
        accuracy: tb.accuracy,
        status: 'needs_practice',
        message: `Accuracy in ${tb.topic} is ${tb.accuracy}%. Focus on step-by-step methods and solve 15+ practice questions.`
      });
    } else if (tb.accuracy >= 80) {
      recommendations.push({
        topic: tb.topic,
        category: tb.category,
        accuracy: tb.accuracy,
        status: 'strong',
        message: `Strong mastery in ${tb.topic} (${tb.accuracy}% accuracy). Maintain consistency with timed drills.`
      });
    }
  });

  // Persist attempt results
  attempt.status = 'completed';
  attempt.submittedAt = now;
  attempt.durationSeconds = durationSeconds;
  attempt.attemptedCount = attemptedCount;
  attempt.correctCount = correctCount;
  attempt.incorrectCount = incorrectCount;
  attempt.unansweredCount = unansweredCount;
  attempt.score = rawScore;
  attempt.percentage = percentage;
  attempt.passed = passed;
  attempt.answers = updatedAnswers;
  attempt.topicBreakdown = topicBreakdown;
  attempt.recommendations = recommendations;

  await attempt.save();

  return {
    attemptId: attempt._id,
    title: attempt.title,
    type: attempt.type,
    company: attempt.company,
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    durationSeconds,
    totalQuestions,
    attemptedCount,
    correctCount,
    incorrectCount,
    unansweredCount,
    score: rawScore,
    totalMarks: attempt.totalMarks,
    percentage,
    passed,
    topicBreakdown,
    recommendations
  };
};

/**
 * Retrieve detailed review of a completed test attempt (with explanations)
 */
const getAttemptReview = async (user, attemptId) => {
  const attempt = await TestAttempt.findOne({ _id: attemptId, user: user._id });

  if (!attempt) {
    const err = new Error('Test attempt not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  return attempt;
};

/**
 * Retrieve test attempt history for the logged-in student
 */
const getStudentHistory = async (user, { page = 1, limit = 10, type }) => {
  const filter = { user: user._id, status: 'completed' };
  if (type) filter.type = type;

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const total = await TestAttempt.countDocuments(filter);
  const attempts = await TestAttempt.find(filter)
    .select('-answers.explanation -answers.questionText')
    .sort({ submittedAt: -1 })
    .skip(skip)
    .limit(parsedLimit);

  return {
    attempts,
    total,
    page: parseInt(page, 10),
    limit: parsedLimit
  };
};

/**
 * Retrieve questions the student answered incorrectly in previous attempts
 */
const getIncorrectQuestions = async (user, { limit = 20 }) => {
  const attempts = await TestAttempt.find({ user: user._id, status: 'completed' })
    .sort({ submittedAt: -1 })
    .limit(10);

  const incorrectMap = new Map();

  for (const attempt of attempts) {
    for (const ans of attempt.answers) {
      if (ans.isAttempted && !ans.isCorrect && ans.question) {
        const qId = String(ans.question);
        if (!incorrectMap.has(qId)) {
          incorrectMap.set(qId, {
            questionId: ans.questionId,
            questionText: ans.questionText,
            options: ans.options,
            correctOption: ans.correctOption,
            explanation: ans.explanation,
            category: ans.category,
            topic: ans.topic,
            difficulty: ans.difficulty,
            selectedOption: ans.selectedOption,
            lastAttemptedAt: attempt.submittedAt
          });
        }
      }
    }
  }

  const items = Array.from(incorrectMap.values()).slice(0, parseInt(limit, 10) || 20);
  return items;
};

module.exports = {
  startPracticeSession,
  startMockTest,
  submitAttempt,
  getAttemptReview,
  getStudentHistory,
  getIncorrectQuestions
};
