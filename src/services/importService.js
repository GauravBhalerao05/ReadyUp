const ExcelJS = require('exceljs');
const { Readable } = require('stream');
const { spreadsheetRowSchema } = require('../validators/questionValidator');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const Category = require('../models/Category');
const Company = require('../models/Company');
const ImportHistory = require('../models/ImportHistory');
const { logAudit } = require('../middleware/audit');

/**
 * Parse an Excel or CSV buffer into row objects
 */
const parseBufferToRows = async (buffer, originalName) => {
  const isCsv = originalName.toLowerCase().endsWith('.csv');
  const workbook = new ExcelJS.Workbook();

  if (isCsv) {
    const stream = Readable.from(buffer);
    await workbook.csv.read(stream);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Spreadsheet contains no worksheets');
  }

  const rows = [];
  let headers = [];

  worksheet.eachRow((row, rowNumber) => {
    // Normalizing values (ExcelJS row.values has 1-based index)
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];

    if (rowNumber === 1) {
      // Clean header names (strip spaces, lowercase or normalize)
      headers = values.map((val) => {
        if (!val) return '';
        // In case rich text or formula object
        const str = typeof val === 'object' && val.text ? val.text : String(val);
        return str.trim();
      });
    } else {
      const rowObj = { _rowNumber: rowNumber };
      let hasAnyValue = false;

      headers.forEach((header, idx) => {
        if (header) {
          let cellValue = values[idx];
          if (cellValue !== undefined && cellValue !== null) {
            if (typeof cellValue === 'object') {
              cellValue = cellValue.text || cellValue.result || '';
            }
            rowObj[header] = String(cellValue).trim();
            if (rowObj[header]) hasAnyValue = true;
          } else {
            rowObj[header] = '';
          }
        }
      });

      if (hasAnyValue) {
        rows.push(rowObj);
      }
    }
  });

  return rows;
};

/**
 * Parse and validate uploaded spreadsheet, returning a preview with errors
 */
const previewImport = async (buffer, originalName, fileType, user) => {
  const rawRows = await parseBufferToRows(buffer, originalName);

  if (rawRows.length === 0) {
    const err = new Error('Spreadsheet has no data rows to import');
    err.statusCode = 400;
    throw err;
  }

  const validRows = [];
  const invalidRows = [];
  const seenQuestionIds = new Set();

  for (const rawRow of rawRows) {
    const rowNumber = rawRow._rowNumber;

    // Check for duplicate questionId inside the same spreadsheet
    const qId = (rawRow.questionId || '').trim().toUpperCase();
    if (qId && seenQuestionIds.has(qId)) {
      invalidRows.push({
        rowNumber,
        questionId: qId,
        field: 'questionId',
        error: `Duplicate questionId '${qId}' found within this spreadsheet`
      });
      continue;
    }
    if (qId) {
      seenQuestionIds.add(qId);
    }

    // Validate fields using Zod schema
    const parseResult = spreadsheetRowSchema.safeParse(rawRow);

    if (!parseResult.success) {
      const issues = parseResult.error.issues || parseResult.error.errors || [];
      issues.forEach((err) => {
        invalidRows.push({
          rowNumber,
          questionId: rawRow.questionId || `Row ${rowNumber}`,
          field: (err.path || []).join('.'),
          error: err.message
        });
      });
    } else {
      const data = parseResult.data;
      const companiesList = data.companies
        ? data.companies
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

      const formattedQuestion = {
        questionId: data.questionId,
        questionText: data.questionText,
        options: [
          { optionId: 'A', text: data.optionA },
          { optionId: 'B', text: data.optionB },
          { optionId: 'C', text: data.optionC },
          { optionId: 'D', text: data.optionD }
        ],
        correctOption: data.correctOption,
        explanation: data.explanation,
        category: data.category,
        topic: data.topic,
        subtopic: data.subtopic || '',
        difficulty: data.difficulty,
        companies: companiesList,
        source: data.source,
        year: parseInt(data.year, 10) || new Date().getFullYear(),
        isVerified: true,
        isActive: true
      };

      validRows.push({
        rowNumber,
        question: formattedQuestion
      });
    }
  }

  const importBatchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Stage in ImportHistory
  const history = await ImportHistory.create({
    importBatchId,
    filename: `${importBatchId}_${originalName}`,
    originalName,
    fileType,
    uploadedBy: user._id,
    totalRows: rawRows.length,
    validRowsCount: validRows.length,
    invalidRowsCount: invalidRows.length,
    status: 'previewed',
    errors: invalidRows,
    stagedData: validRows.map((v) => v.question),
    summary: {
      totalRows: rawRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length
    }
  });

  return {
    importBatchId,
    totalRows: rawRows.length,
    validRowsCount: validRows.length,
    invalidRowsCount: invalidRows.length,
    errors: invalidRows,
    previewSample: validRows.slice(0, 5).map((v) => ({
      rowNumber: v.rowNumber,
      questionId: v.question.questionId,
      questionText: v.question.questionText,
      topic: v.question.topic,
      difficulty: v.question.difficulty
    }))
  };
};

/**
 * Confirm and publish staged spreadsheet rows
 */
const confirmImport = async (importBatchId, user, req = null) => {
  const history = await ImportHistory.findOne({ importBatchId });

  if (!history) {
    const err = new Error('Import batch not found or already processed');
    err.statusCode = 404;
    throw err;
  }

  if (history.status === 'published') {
    const err = new Error('This import batch has already been confirmed and published');
    err.statusCode = 400;
    throw err;
  }

  const stagedQuestions = history.stagedData || [];
  if (stagedQuestions.length === 0) {
    const err = new Error('No valid rows available in this batch to publish');
    err.statusCode = 400;
    throw err;
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const topicsToUpdate = new Set();
  const companiesToUpdate = new Set();

  for (const qData of stagedQuestions) {
    try {
      const existing = await Question.findOne({ questionId: qData.questionId });

      if (existing) {
        // Update existing question
        Object.assign(existing, qData);
        existing.updatedBy = user._id;
        await existing.save();
        updatedCount++;
      } else {
        // Insert new question
        await Question.create({
          ...qData,
          createdBy: user._id,
          updatedBy: user._id
        });
        insertedCount++;
      }

      if (qData.topic) topicsToUpdate.add(qData.topic);
      if (Array.isArray(qData.companies)) {
        qData.companies.forEach((c) => companiesToUpdate.add(c));
      }
    } catch (saveErr) {
      console.error(`Failed to upsert question ${qData.questionId}:`, saveErr.message);
      skippedCount++;
    }
  }

  // Auto-sync Topic and Company records
  for (const topicName of topicsToUpdate) {
    const count = await Question.countDocuments({ topic: new RegExp(`^${topicName}$`, 'i'), isActive: true });
    await Topic.findOneAndUpdate(
      { name: new RegExp(`^${topicName}$`, 'i') },
      { $set: { questionCount: count } },
      { upsert: false }
    );
  }

  for (const companyName of companiesToUpdate) {
    const count = await Question.countDocuments({ companies: new RegExp(`^${companyName}$`, 'i'), isActive: true });
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await Company.findOneAndUpdate(
      { slug },
      {
        $setOnInsert: { name: companyName, slug, isActive: true },
        $set: { questionCount: count }
      },
      { upsert: true }
    );
  }

  history.status = 'published';
  history.insertedCount = insertedCount;
  history.updatedCount = updatedCount;
  history.skippedCount = skippedCount;
  history.summary = {
    totalStaged: stagedQuestions.length,
    insertedCount,
    updatedCount,
    skippedCount
  };
  await history.save();

  // Audit log
  await logAudit({
    action: 'QUESTIONS_IMPORT_PUBLISHED',
    user,
    targetType: 'import',
    targetId: history.importBatchId,
    details: {
      originalName: history.originalName,
      insertedCount,
      updatedCount,
      skippedCount
    },
    req
  });

  return {
    importBatchId: history.importBatchId,
    filename: history.originalName,
    status: 'published',
    insertedCount,
    updatedCount,
    skippedCount,
    totalProcessed: insertedCount + updatedCount
  };
};

/**
 * Get import history
 */
const getImportHistory = async (page = 1, limit = 10) => {
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const total = await ImportHistory.countDocuments();
  const history = await ImportHistory.find()
    .select('-stagedData')
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit);

  return {
    history,
    total,
    page: parseInt(page, 10),
    limit: parsedLimit
  };
};

module.exports = {
  previewImport,
  confirmImport,
  getImportHistory
};
