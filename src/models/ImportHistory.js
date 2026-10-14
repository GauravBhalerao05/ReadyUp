const mongoose = require('mongoose');

const importErrorSchema = new mongoose.Schema(
  {
    rowNumber: {
      type: Number,
      required: true
    },
    questionId: {
      type: String,
      default: ''
    },
    field: {
      type: String,
      default: ''
    },
    error: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const importHistorySchema = new mongoose.Schema(
  {
    importBatchId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['xlsx', 'csv'],
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    totalRows: {
      type: Number,
      default: 0
    },
    validRowsCount: {
      type: Number,
      default: 0
    },
    invalidRowsCount: {
      type: Number,
      default: 0
    },
    insertedCount: {
      type: Number,
      default: 0
    },
    updatedCount: {
      type: Number,
      default: 0
    },
    skippedCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['previewed', 'published', 'failed'],
      default: 'previewed',
      index: true
    },
    errors: [importErrorSchema],
    stagedData: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true
  }
);

importHistorySchema.index({ uploadedBy: 1, createdAt: -1 });

const ImportHistory = mongoose.model('ImportHistory', importHistorySchema);
module.exports = ImportHistory;
