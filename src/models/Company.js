const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
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
    logoUrl: {
      type: String,
      default: ''
    },
    hiringPattern: {
      type: String,
      default: ''
    },
    eligibilityNotes: {
      type: String,
      default: ''
    },
    questionCount: {
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

const Company = mongoose.model('Company', companySchema);
module.exports = Company;
