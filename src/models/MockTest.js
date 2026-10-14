const mongoose = require('mongoose');

const mockTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Mock test title is required'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      default: 60
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 50
    },
    passingMarks: {
      type: Number,
      required: true,
      default: 30
    },
    negativeMarking: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      enum: ['company_mock', 'topic_test', 'diagnostic'],
      default: 'company_mock'
    },
    company: {
      type: String,
      trim: true,
      default: ''
    },
    categories: [
      {
        type: String,
        trim: true
      }
    ],
    topics: [
      {
        type: String,
        trim: true
      }
    ],
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      }
    ],
    instructions: [
      {
        type: String
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const MockTest = mongoose.model('MockTest', mockTestSchema);
module.exports = MockTest;
