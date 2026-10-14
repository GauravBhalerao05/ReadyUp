const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    optionId: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
      trim: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: [true, 'Question ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    options: {
      type: [optionSchema],
      validate: {
        validator: function (opts) {
          return Array.isArray(opts) && opts.length >= 2;
        },
        message: 'A question must provide at least two options'
      },
      required: true
    },
    correctOption: {
      type: String,
      required: [true, 'Correct option is required'],
      enum: ['A', 'B', 'C', 'D'],
      uppercase: true
    },
    explanation: {
      type: String,
      required: [true, 'Step-by-step explanation is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      index: true
    },
    subtopic: {
      type: String,
      trim: true,
      default: ''
    },
    difficulty: {
      type: String,
      required: [true, 'Difficulty is required'],
      enum: ['easy', 'medium', 'hard'],
      lowercase: true,
      default: 'medium',
      index: true
    },
    companies: {
      type: [String],
      default: [],
      index: true
    },
    source: {
      type: String,
      trim: true,
      default: 'Campus Placement'
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear()
    },
    isVerified: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Method to sanitize question for student practice/test (hides correctOption & explanation)
questionSchema.methods.toStudentView = function () {
  const obj = this.toObject();
  delete obj.correctOption;
  delete obj.explanation;
  delete obj.__v;
  return obj;
};

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;
