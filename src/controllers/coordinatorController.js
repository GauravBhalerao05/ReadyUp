const path = require('path');
const importService = require('../services/importService');
const { generateExcelTemplate, generateCsvTemplate } = require('../utils/sampleTemplate');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const Company = require('../models/Company');
const ImportHistory = require('../models/ImportHistory');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const downloadTemplate = async (req, res, next) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();

    if (format === 'csv') {
      const csvContent = await generateCsvTemplate();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="readyup_questions_template.csv"');
      return res.status(200).send(csvContent);
    } else {
      const buffer = await generateExcelTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="readyup_questions_template.xlsx"');
      return res.status(200).send(buffer);
    }
  } catch (error) {
    next(error);
  }
};

const uploadPreview = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded. Please upload an Excel (.xlsx) or CSV (.csv) file.', 400);
    }

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    const fileType = ext === 'csv' ? 'csv' : 'xlsx';

    const previewResult = await importService.previewImport(req.file.buffer, originalName, fileType, req.user);

    return successResponse(
      res,
      `Spreadsheet parsed successfully. ${previewResult.validRowsCount} valid rows ready for review, ${previewResult.invalidRowsCount} invalid rows flagged.`,
      previewResult,
      200
    );
  } catch (error) {
    next(error);
  }
};

const confirmImport = async (req, res, next) => {
  try {
    const { importBatchId } = req.body;
    if (!importBatchId) {
      return errorResponse(res, 'importBatchId is required to confirm and publish content', 400);
    }

    const summary = await importService.confirmImport(importBatchId, req.user, req);

    return successResponse(res, 'Import confirmed and published successfully into question bank', summary, 200);
  } catch (error) {
    next(error);
  }
};

const getImportHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await importService.getImportHistory(page, limit);

    return paginatedResponse(res, 'Import history retrieved successfully', result.history, {
      total: result.total,
      page: result.page,
      limit: result.limit
    });
  } catch (error) {
    next(error);
  }
};

const getCoordinatorDashboard = async (req, res, next) => {
  try {
    const totalQuestions = await Question.countDocuments();
    const verifiedQuestions = await Question.countDocuments({ isVerified: true, isActive: true });
    const totalTopics = await Topic.countDocuments({ isActive: true });
    const totalCompanies = await Company.countDocuments({ isActive: true });
    const pendingImports = await ImportHistory.countDocuments({ status: 'previewed' });

    const recentImports = await ImportHistory.find()
      .select('-stagedData')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Matching screenshot's metric cards
    const metrics = [
      {
        id: 'total_questions',
        label: 'Aptitude Question Bank',
        value: totalQuestions,
        subtext: `${verifiedQuestions} active & verified`,
        icon: 'BookOpen'
      },
      {
        id: 'pending_imports',
        label: 'Pending Imports',
        value: pendingImports,
        subtext: 'Awaiting publish decision',
        icon: 'UploadCloud'
      },
      {
        id: 'active_topics',
        label: 'Active Topics',
        value: totalTopics,
        subtext: 'Across 3 categories',
        icon: 'Layers'
      },
      {
        id: 'companies_mapped',
        label: 'Companies Mapped',
        value: totalCompanies,
        subtext: 'Hiring patterns active',
        icon: 'Briefcase'
      }
    ];

    // Next Best Action for Coordinator
    let nextBestAction = null;
    if (pendingImports > 0) {
      nextBestAction = {
        label: 'NEXT BEST ACTION',
        title: 'Review Staged Spreadsheet Import',
        description: `${pendingImports} import batch is waiting for confirmation before being published to students.`,
        ctaText: 'Review Import →',
        actionType: 'REVIEW_IMPORT'
      };
    } else {
      nextBestAction = {
        label: 'CONTENT UPDATE',
        title: 'Upload Company-Specific Aptitude Set',
        description: 'Upload latest 2025/2026 placement season test questions via Excel or CSV template.',
        ctaText: 'Upload Questions →',
        actionType: 'UPLOAD'
      };
    }

    return successResponse(res, 'Coordinator dashboard retrieved successfully', {
      coordinator: {
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      metrics,
      nextBestAction,
      recentImports
    }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  downloadTemplate,
  uploadPreview,
  confirmImport,
  getImportHistory,
  getCoordinatorDashboard
};
