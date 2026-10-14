const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Topic name is required'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    subtopics: [
      {
        type: String,
        trim: true
      }
    ],
    questionCount: {
      type: Number,
      default: 0
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

topicSchema.index({ name: 1, category: 1 }, { unique: true });

const Topic = mongoose.model('Topic', topicSchema);
module.exports = Topic;
