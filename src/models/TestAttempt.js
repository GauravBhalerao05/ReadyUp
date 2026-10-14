const mongoose = require('mongoose');

const answerItemSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    questionId: {
      type: String,
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    options: [
      {
        optionId: String,
        text: String
      }
    ],
    selectedOption: {
      type: String,
      enum: ['A', 'B', 'C', 'D', null],
      default: null
    },
    correctOption: {
      type: String,
      required: true
    },
    explanation: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: ''
    },
    topic: {
      type: String,
      default: ''
    },
    difficulty: {
      type: String,
      default: 'medium'
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    isAttempted: {
      type: Boolean,
      default: false
    },
    timeSpentSeconds: {
      type: Number,
      default: 0
    },
    markedForReview: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const topicBreakdownSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    category: { type: String, default: '' },
    total: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    category: { type: String, default: '' },
    accuracy: { type: Number, required: true },
    status: { type: String, default: 'needs_practice' },
    message: { type: String, required: true }
  },
  { _id: false }
);

const testAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    mockTest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockTest'
    },
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['mock_test', 'practice'],
      default: 'mock_test'
    },
    company: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date
    },
    submittedAt: {
      type: Date
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    attemptedCount: {
      type: Number,
      default: 0
    },
    correctCount: {
      type: Number,
      default: 0
    },
    incorrectCount: {
      type: Number,
      default: 0
    },
    unansweredCount: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    passed: {
      type: Boolean,
      default: false
    },
    passingMarks: {
      type: Number,
      default: 0
    },
    answers: [answerItemSchema],
    topicBreakdown: [topicBreakdownSchema],
    recommendations: [recommendationSchema]
  },
  {
    timestamps: true
  }
);

testAttemptSchema.index({ user: 1, createdAt: -1 });

const TestAttempt = mongoose.model('TestAttempt', testAttemptSchema);
module.exports = TestAttempt;
