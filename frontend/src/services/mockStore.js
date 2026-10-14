// Stateful in-memory mock store with localStorage persistence
// Powers offline functionality and full interactivity matching the API contract 1:1

import {
  initialCategories,
  initialQuestions,
  initialCompanies,
  initialMockTests,
  initialStudentData,
  initialBookmarks,
  initialCoordinatorData,
  initialAdminData
} from './mockData';

const STORAGE_KEYS = {
  CATEGORIES: 'readyup_mock_categories',
  QUESTIONS: 'readyup_mock_questions',
  COMPANIES: 'readyup_mock_companies',
  MOCK_TESTS: 'readyup_mock_tests',
  STUDENT_DASHBOARD: 'readyup_mock_student_dashboard',
  BOOKMARKS: 'readyup_mock_bookmarks',
  ATTEMPTS: 'readyup_mock_attempts',
  COORDINATOR: 'readyup_mock_coordinator',
  ADMIN_USERS: 'readyup_mock_admin_users',
  ADMIN_LOGS: 'readyup_mock_admin_logs',
  CURRENT_USER: 'readyup_mock_auth_user'
};

function getStored(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.warn('Error reading from localStorage:', err);
    return defaultValue;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Error saving to localStorage:', err);
  }
}

class MockStore {
  constructor() {
    this.categories = getStored(STORAGE_KEYS.CATEGORIES, initialCategories);
    this.questions = getStored(STORAGE_KEYS.QUESTIONS, initialQuestions);
    this.companies = getStored(STORAGE_KEYS.COMPANIES, initialCompanies);
    this.mockTests = getStored(STORAGE_KEYS.MOCK_TESTS, initialMockTests);
    this.studentDashboard = getStored(STORAGE_KEYS.STUDENT_DASHBOARD, initialStudentData);
    this.bookmarks = getStored(STORAGE_KEYS.BOOKMARKS, initialBookmarks);
    this.attempts = getStored(STORAGE_KEYS.ATTEMPTS, initialStudentData.recentAttempts);
    this.coordinator = getStored(STORAGE_KEYS.COORDINATOR, initialCoordinatorData);
    this.users = getStored(STORAGE_KEYS.ADMIN_USERS, initialAdminData.users);
    this.auditLogs = getStored(STORAGE_KEYS.ADMIN_LOGS, initialAdminData.auditLogs);
    this.pendingBatches = {};
  }

  saveState() {
    setStored(STORAGE_KEYS.CATEGORIES, this.categories);
    setStored(STORAGE_KEYS.QUESTIONS, this.questions);
    setStored(STORAGE_KEYS.COMPANIES, this.companies);
    setStored(STORAGE_KEYS.MOCK_TESTS, this.mockTests);
    setStored(STORAGE_KEYS.STUDENT_DASHBOARD, this.studentDashboard);
    setStored(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
    setStored(STORAGE_KEYS.ATTEMPTS, this.attempts);
    setStored(STORAGE_KEYS.COORDINATOR, this.coordinator);
    setStored(STORAGE_KEYS.ADMIN_USERS, this.users);
    setStored(STORAGE_KEYS.ADMIN_LOGS, this.auditLogs);
  }

  // --- Auth & Users ---
  login(email, password) {
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw { status: 401, message: 'Invalid email or password' };
    }
    if (user.isActive === false) {
      throw { status: 403, message: 'This account has been deactivated. Please contact an administrator.' };
    }
    const token = 'mock_jwt_token_' + user.role + '_' + Date.now();
    user.lastLoginAt = new Date().toISOString();
    this.saveState();

    this.addAuditLog({
      action: 'USER_LOGIN',
      performedBy: `${user.name} (${user.email})`,
      targetType: 'AUTH',
      details: `Successful ${user.role} sign-in`
    });

    return { user, token };
  }

  register(userData) {
    const exists = this.users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase());
    if (exists) {
      throw { status: 409, message: 'An account with this email address already exists' };
    }

    const newUser = {
      _id: 'usr_' + Date.now(),
      name: userData.name,
      email: userData.email,
      role: userData.role || 'student',
      department: userData.department || 'Computer Science & Engineering',
      college: userData.college || 'National Institute of Technology',
      graduationYear: userData.graduationYear ? Number(userData.graduationYear) : 2026,
      studentId: userData.studentId || `STU-${Date.now().toString().slice(-4)}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    this.users.unshift(newUser);
    this.saveState();

    const token = 'mock_jwt_token_' + newUser.role + '_' + Date.now();
    return { user: newUser, token };
  }

  updateProfile(userId, updateData) {
    const user = this.users.find((u) => u._id === userId);
    if (!user) throw { status: 404, message: 'User not found' };

    Object.assign(user, {
      name: updateData.name || user.name,
      department: updateData.department !== undefined ? updateData.department : user.department,
      college: updateData.college !== undefined ? updateData.college : user.college,
      graduationYear: updateData.graduationYear ? Number(updateData.graduationYear) : user.graduationYear,
      studentId: updateData.studentId !== undefined ? updateData.studentId : user.studentId
    });

    this.saveState();
    return user;
  }

  // --- Categories & Questions ---
  getCategories() {
    return this.categories;
  }

  getQuestions({ category, topic, subtopic, difficulty, company, search, page = 1, limit = 20 } = {}) {
    let filtered = [...this.questions];

    if (category) {
      filtered = filtered.filter((q) => q.category.toLowerCase() === category.toLowerCase());
    }
    if (topic) {
      filtered = filtered.filter((q) => q.topic.toLowerCase() === topic.toLowerCase());
    }
    if (subtopic) {
      filtered = filtered.filter((q) => q.subtopic && q.subtopic.toLowerCase() === subtopic.toLowerCase());
    }
    if (difficulty) {
      filtered = filtered.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (company) {
      filtered = filtered.filter((q) => q.companies && q.companies.some((c) => c.toLowerCase() === company.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.questionId.toLowerCase().includes(q) ||
          item.questionText.toLowerCase().includes(q) ||
          item.topic.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(startIndex, startIndex + Number(limit));

    return {
      data: paginated,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
        hasNextPage: startIndex + Number(limit) < total,
        hasPrevPage: Number(page) > 1
      }
    };
  }

  getQuestionById(id) {
    const q = this.questions.find((item) => item._id === id || item.questionId === id);
    if (!q) throw { status: 404, message: 'Question not found' };
    return q;
  }

  addQuestion(payload) {
    const exists = this.questions.some((q) => q.questionId === payload.questionId);
    if (exists) throw { status: 409, message: `Question ID '${payload.questionId}' already exists.` };

    const newQ = {
      _id: 'q_' + Date.now(),
      ...payload,
      isVerified: true,
      isActive: payload.isActive !== undefined ? payload.isActive : true
    };
    this.questions.unshift(newQ);
    this.saveState();
    return newQ;
  }

  updateQuestion(id, payload) {
    const q = this.questions.find((item) => item._id === id || item.questionId === id);
    if (!q) throw { status: 404, message: 'Question not found' };

    Object.assign(q, payload);
    this.saveState();
    return q;
  }

  toggleQuestionStatus(id, isActive) {
    const q = this.questions.find((item) => item._id === id || item.questionId === id);
    if (!q) throw { status: 404, message: 'Question not found' };
    q.isActive = isActive;
    this.saveState();
    return q;
  }

  // --- Companies ---
  getCompanies() {
    return this.companies;
  }

  getCompanyBySlug(slug) {
    const comp = this.companies.find((c) => c.slug.toLowerCase() === slug.toLowerCase() || c.name.toLowerCase() === slug.toLowerCase());
    if (!comp) throw { status: 404, message: 'Company not found' };
    return comp;
  }

  // --- Mock Tests & Practice Sessions ---
  getMockTests({ company, type } = {}) {
    let filtered = [...this.mockTests];
    if (company) filtered = filtered.filter((t) => t.company.toLowerCase() === company.toLowerCase());
    if (type) filtered = filtered.filter((t) => t.type === type);
    return filtered;
  }

  getMockTestById(id) {
    const test = this.mockTests.find((t) => t._id === id || t.slug === id);
    if (!test) throw { status: 404, message: 'Mock test not found' };
    return test;
  }

  startPracticeSession({ category, topic, difficulty, company, count = 10 } = {}) {
    let available = [...this.questions];
    if (category) available = available.filter((q) => q.category.toLowerCase() === category.toLowerCase());
    if (topic) available = available.filter((q) => q.topic.toLowerCase() === topic.toLowerCase());
    if (difficulty) available = available.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    if (company) available = available.filter((q) => q.companies && q.companies.some((c) => c.toLowerCase() === company.toLowerCase()));

    if (available.length === 0) {
      available = [...this.questions]; // fallback to all available
    }

    const selected = available.slice(0, count);
    const attemptId = 'att_' + Date.now();

    // Strip answers from questions payload per API spec
    const strippedQuestions = selected.map((q) => ({
      _id: q._id,
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty
    }));

    const session = {
      attemptId,
      title: `Practice: ${topic || category || 'Comprehensive Drill'}`,
      type: 'practice',
      totalQuestions: strippedQuestions.length,
      startedAt: new Date().toISOString(),
      questions: strippedQuestions,
      originalQuestionIds: selected.map((q) => q.questionId)
    };

    this.pendingBatches[attemptId] = session;
    return session;
  }

  startMockTest(testId) {
    const test = this.getMockTestById(testId);
    const attemptId = 'att_' + Date.now();
    const durationMinutes = test.durationMinutes || 30;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const questions = this.questions.filter((q) => test.questionIds.includes(q.questionId));
    const fallbackQuestions = questions.length > 0 ? questions : this.questions.slice(0, test.totalQuestions || 8);

    const strippedQuestions = fallbackQuestions.map((q) => ({
      _id: q._id,
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty
    }));

    const session = {
      attemptId,
      mockTestId: test._id,
      title: test.title,
      company: test.company,
      type: 'mock_test',
      durationMinutes,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      instructions: test.instructions,
      startedAt: new Date().toISOString(),
      expiresAt,
      questions: strippedQuestions,
      originalQuestionIds: fallbackQuestions.map((q) => q.questionId)
    };

    this.pendingBatches[attemptId] = session;
    return session;
  }

  submitAttempt(attemptId, { answers = [] }) {
    const session = this.pendingBatches[attemptId];
    const questionList = this.questions;

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    const answerMap = new Map();
    answers.forEach((ans) => answerMap.set(ans.questionId, ans));

    const totalQuestions = session?.questions?.length || answers.length || 1;
    const detailedAnswers = [];
    const topicStats = {};

    (session?.questions || questionList.slice(0, totalQuestions)).forEach((qItem) => {
      const original = questionList.find((q) => q.questionId === qItem.questionId) || qItem;
      const studentAns = answerMap.get(qItem.questionId);
      const isAttempted = studentAns && studentAns.selectedOption;
      const isCorrect = isAttempted && studentAns.selectedOption === original.correctOption;

      if (!topicStats[original.topic]) {
        topicStats[original.topic] = {
          topic: original.topic,
          category: original.category,
          total: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0
        };
      }
      topicStats[original.topic].total += 1;

      if (isAttempted) {
        topicStats[original.topic].attempted += 1;
        if (isCorrect) {
          correctCount += 1;
          topicStats[original.topic].correct += 1;
        } else {
          incorrectCount += 1;
          topicStats[original.topic].incorrect += 1;
        }
      } else {
        unansweredCount += 1;
      }

      detailedAnswers.push({
        questionId: original.questionId,
        questionText: original.questionText,
        options: original.options,
        selectedOption: studentAns?.selectedOption || null,
        correctOption: original.correctOption,
        isCorrect: Boolean(isCorrect),
        explanation: original.explanation,
        topic: original.topic,
        category: original.category,
        difficulty: original.difficulty,
        timeSpentSeconds: studentAns?.timeSpentSeconds || 0
      });
    });

    const score = correctCount;
    const percentage = Number(((score / totalQuestions) * 100).toFixed(1));
    const passed = percentage >= 60.0;

    const topicBreakdown = Object.values(topicStats).map((stat) => ({
      ...stat,
      unanswered: stat.total - stat.attempted,
      accuracy: stat.attempted > 0 ? Number(((stat.correct / stat.attempted) * 100).toFixed(1)) : 0
    }));

    const recommendations = topicBreakdown.map((stat) => {
      if (stat.accuracy >= 75) {
        return {
          topic: stat.topic,
          category: stat.category,
          accuracy: stat.accuracy,
          status: 'strong',
          message: `Strong performance in ${stat.topic} (${stat.accuracy}%). Ready for placement test level questions.`
        };
      }
      return {
        topic: stat.topic,
        category: stat.category,
        accuracy: stat.accuracy,
        status: 'weak',
        message: `Practice recommended for ${stat.topic} (${stat.accuracy}% accuracy). Review foundational concepts and formulas.`
      };
    });

    const result = {
      attemptId,
      title: session?.title || 'Practice Assessment',
      type: session?.type || 'practice',
      company: session?.company || 'General',
      status: 'completed',
      submittedAt: new Date().toISOString(),
      durationSeconds: 900,
      totalQuestions,
      attemptedCount: correctCount + incorrectCount,
      correctCount,
      incorrectCount,
      unansweredCount,
      score,
      totalMarks: totalQuestions,
      percentage,
      passed,
      topicBreakdown,
      recommendations,
      detailedAnswers
    };

    // Record in attempts history
    this.attempts.unshift({
      id: attemptId,
      title: result.title,
      type: result.type,
      submittedAt: result.submittedAt,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      passed: result.passed,
      statusBadge: result.passed ? 'Passed' : 'Needs Review',
      reviewData: result
    });

    // Update student metrics
    this.studentDashboard.recentAttempts = this.attempts.slice(0, 5);
    this.saveState();

    return result;
  }

  getAttemptReview(attemptId) {
    const attempt = this.attempts.find((a) => a.id === attemptId);
    if (attempt && attempt.reviewData) {
      return attempt.reviewData;
    }
    // Return sample review if direct attempt not stored
    return this.attempts[0]?.reviewData || null;
  }

  getTestHistory() {
    return this.attempts;
  }

  getIncorrectQuestions() {
    // Unique questions marked incorrect across attempts
    const incorrectIds = new Set();
    this.attempts.forEach((att) => {
      if (att.reviewData?.detailedAnswers) {
        att.reviewData.detailedAnswers.forEach((ans) => {
          if (ans.selectedOption && !ans.isCorrect) {
            incorrectIds.add(ans.questionId);
          }
        });
      }
    });

    // Provide default incorrects if none yet
    if (incorrectIds.size === 0) {
      return [this.questions[1], this.questions[2]];
    }

    return this.questions.filter((q) => incorrectIds.has(q.questionId));
  }

  // --- Bookmarks ---
  getBookmarks() {
    return this.bookmarks;
  }

  addBookmark({ questionId, note = '' }) {
    const existingIndex = this.bookmarks.findIndex((b) => b.questionId === questionId);
    const question = this.questions.find((q) => q.questionId === questionId || q._id === questionId);

    const bookmark = {
      _id: 'bmk_' + Date.now(),
      questionId: question ? question.questionId : questionId,
      note,
      createdAt: new Date().toISOString(),
      question: question || null
    };

    if (existingIndex >= 0) {
      this.bookmarks[existingIndex] = bookmark;
    } else {
      this.bookmarks.unshift(bookmark);
    }

    this.studentDashboard.bookmarkCount = this.bookmarks.length;
    this.saveState();
    return bookmark;
  }

  removeBookmark(questionId) {
    this.bookmarks = this.bookmarks.filter(
      (b) => b.questionId !== questionId && b._id !== questionId && b.question?._id !== questionId
    );
    this.studentDashboard.bookmarkCount = this.bookmarks.length;
    this.saveState();
    return { success: true };
  }

  // --- Analytics Dashboard ---
  getStudentDashboard() {
    return this.studentDashboard;
  }

  // --- Coordinator Features ---
  getCoordinatorDashboard() {
    return {
      metrics: [
        { label: "Total Question Bank", value: this.questions.length, subtext: "Active verified questions", icon: "BookOpen", color: "teal" },
        { label: "Active Aptitude Topics", value: 15, subtext: "Across 4 categories", icon: "FolderGit2", color: "blue" },
        { label: "Target Companies", value: this.companies.length, subtext: "Placement test patterns", icon: "Building2", color: "amber" },
        { label: "Spreadsheet Imports", value: this.coordinator.importHistory.length, subtext: "Processed batches", icon: "FileSpreadsheet", color: "emerald" }
      ],
      importHistory: this.coordinator.importHistory
    };
  }

  previewSpreadsheetImport({ file, parsedRows = [] }) {
    const importBatchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const validRows = [];
    const errors = [];

    // If pre-parsed rows were passed, use them, otherwise generate sample preview rows based on filename
    const sampleRows = parsedRows.length > 0 ? parsedRows : [
      {
        questionId: 'QA-TW-110',
        questionText: 'A and B working together can complete a project in 10 days. If A alone takes 15 days, how many days will B take alone?',
        optionA: '25 days',
        optionB: '30 days',
        optionC: '20 days',
        optionD: '35 days',
        correctOption: 'B',
        explanation: "1/B = 1/10 - 1/15 = 1/30. B takes 30 days.",
        category: 'Quantitative Aptitude',
        topic: 'Time and Work',
        difficulty: 'easy',
        companies: 'TCS, Infosys'
      },
      {
        questionId: 'LR-SY-102',
        questionText: 'Statements: All networks are secure. Some connections are networks. Conclusions: I. Some connections are secure.',
        optionA: 'Only I follows',
        optionB: 'Only II follows',
        optionC: 'Both follow',
        optionD: 'Neither follows',
        correctOption: 'A',
        explanation: 'Connection is part of network which is secure, so some connections are definitely secure.',
        category: 'Logical Reasoning',
        topic: 'Syllogisms',
        difficulty: 'medium',
        companies: 'Cognizant'
      },
      {
        questionId: 'QA-PL-ERR',
        questionText: 'Too short',
        optionA: '10',
        optionB: '20',
        optionC: '30',
        optionD: '40',
        correctOption: 'E', // invalid
        explanation: 'Short',
        category: 'Quantitative Aptitude',
        topic: 'Profit and Loss',
        difficulty: 'easy'
      }
    ];

    sampleRows.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      const rowErrors = [];

      if (!row.questionId) rowErrors.push('Missing questionId');
      if (!row.questionText || row.questionText.length < 5) rowErrors.push('Question text must be at least 5 characters');
      if (!['A', 'B', 'C', 'D'].includes((row.correctOption || '').toUpperCase())) {
        rowErrors.push('Correct option must be one of A, B, C, or D');
      }
      if (!row.category) rowErrors.push('Category is required');
      if (!row.topic) rowErrors.push('Topic is required');

      if (rowErrors.length > 0) {
        errors.push({
          rowNumber: rowNum,
          questionId: row.questionId || `Row ${rowNum}`,
          field: rowErrors[0].includes('option') ? 'correctOption' : 'questionText',
          error: rowErrors.join(', ')
        });
      } else {
        validRows.push({
          ...row,
          correctOption: row.correctOption.toUpperCase(),
          difficulty: (row.difficulty || 'medium').toLowerCase(),
          companies: typeof row.companies === 'string' ? row.companies.split(',').map((c) => c.trim()) : (row.companies || [])
        });
      }
    });

    const stagedBatch = {
      importBatchId,
      filename: file?.name || 'aptitude_questions_upload.xlsx',
      totalRows: sampleRows.length,
      validRowsCount: validRows.length,
      invalidRowsCount: errors.length,
      errors,
      validRows,
      previewSample: validRows.slice(0, 5)
    };

    this.pendingBatches[importBatchId] = stagedBatch;
    return stagedBatch;
  }

  confirmSpreadsheetImport(importBatchId) {
    const batch = this.pendingBatches[importBatchId];
    if (!batch) {
      throw { status: 404, message: 'Import batch not found or already processed' };
    }

    let insertedCount = 0;
    let updatedCount = 0;

    batch.validRows.forEach((row) => {
      const existing = this.questions.find((q) => q.questionId === row.questionId);
      const formattedQ = {
        _id: existing ? existing._id : 'q_' + Date.now() + Math.random().toString(36).substring(2, 6),
        questionId: row.questionId,
        questionText: row.questionText,
        options: [
          { optionId: 'A', text: row.optionA },
          { optionId: 'B', text: row.optionB },
          { optionId: 'C', text: row.optionC },
          { optionId: 'D', text: row.optionD }
        ],
        correctOption: row.correctOption,
        explanation: row.explanation,
        category: row.category,
        topic: row.topic,
        subtopic: row.subtopic || 'General',
        difficulty: row.difficulty,
        companies: row.companies,
        source: row.source || 'Spreadsheet Import',
        year: Number(row.year) || 2026,
        isVerified: true,
        isActive: true
      };

      if (existing) {
        Object.assign(existing, formattedQ);
        updatedCount += 1;
      } else {
        this.questions.unshift(formattedQ);
        insertedCount += 1;
      }
    });

    const historyEntry = {
      importBatchId,
      filename: batch.filename,
      uploadedAt: new Date().toISOString(),
      uploaderName: 'Prof. Sunita Patil',
      status: 'published',
      totalRows: batch.validRows.length,
      insertedCount,
      updatedCount,
      failedCount: batch.invalidRowsCount
    };

    this.coordinator.importHistory.unshift(historyEntry);
    delete this.pendingBatches[importBatchId];

    this.addAuditLog({
      action: 'SPREADSHEET_IMPORT_CONFIRMED',
      performedBy: 'Prof. Sunita Patil (coordinator@readyup.edu)',
      targetType: 'QUESTION_BANK',
      details: `Published ${batch.validRows.length} questions from ${batch.filename}`
    });

    this.saveState();

    return {
      importBatchId,
      filename: batch.filename,
      status: 'published',
      insertedCount,
      updatedCount,
      skippedCount: 0,
      totalProcessed: batch.validRows.length
    };
  }

  // --- Admin Features ---
  getAdminDashboard() {
    return {
      metrics: [
        { label: "Registered Students", value: this.users.filter((u) => u.role === 'student').length + 1200, subtext: "+68 this month", icon: "GraduationCap", color: "teal" },
        { label: "T&P Coordinators", value: this.users.filter((u) => u.role === 'coordinator').length, subtext: "Active staff members", icon: "ShieldCheck", color: "amber" },
        { label: "Total Question Bank", value: this.questions.length, subtext: "Verified questions", icon: "BookOpen", color: "blue" },
        { label: "Platform Pass Rate", value: "81.2%", subtext: "Across all drives", icon: "TrendingUp", color: "emerald" }
      ],
      recentAuditLogs: this.auditLogs.slice(0, 5)
    };
  }

  getAdminUsers({ role, isActive, search } = {}) {
    let filtered = [...this.users];
    if (role) filtered = filtered.filter((u) => u.role === role);
    if (isActive !== undefined) {
      const activeBool = String(isActive) === 'true';
      filtered = filtered.filter((u) => u.isActive === activeBool);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return filtered;
  }

  createUser(userData) {
    const exists = this.users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase());
    if (exists) throw { status: 409, message: 'User with this email already exists' };

    const newUser = {
      _id: 'usr_' + Date.now(),
      name: userData.name,
      email: userData.email,
      role: userData.role || 'student',
      department: userData.department || 'Training & Placement Cell',
      college: userData.college || 'National Institute of Technology',
      studentId: userData.studentId || `EMP-${Date.now().toString().slice(-4)}`,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.users.unshift(newUser);
    this.addAuditLog({
      action: 'USER_CREATED',
      performedBy: 'Dr. Vikram Malhotra (admin@readyup.edu)',
      targetType: 'USER',
      details: `Provisioned account for ${newUser.name} with role ${newUser.role}`
    });
    this.saveState();
    return newUser;
  }

  updateUserRole(userId, newRole) {
    const user = this.users.find((u) => u._id === userId);
    if (!user) throw { status: 404, message: 'User not found' };

    const oldRole = user.role;
    user.role = newRole;
    this.addAuditLog({
      action: 'ROLE_ASSIGNED',
      performedBy: 'Dr. Vikram Malhotra (admin@readyup.edu)',
      targetType: 'USER',
      details: `Changed role for ${user.name} from ${oldRole} to ${newRole}`
    });
    this.saveState();
    return user;
  }

  updateUserStatus(userId, isActive) {
    const user = this.users.find((u) => u._id === userId);
    if (!user) throw { status: 404, message: 'User not found' };

    user.isActive = isActive;
    this.addAuditLog({
      action: 'USER_STATUS_CHANGE',
      performedBy: 'Dr. Vikram Malhotra (admin@readyup.edu)',
      targetType: 'USER',
      details: `${isActive ? 'Activated' : 'Deactivated'} account for ${user.name} (${user.email})`
    });
    this.saveState();
    return user;
  }

  getAuditLogs({ action, targetType } = {}) {
    let filtered = [...this.auditLogs];
    if (action) filtered = filtered.filter((l) => l.action === action);
    if (targetType) filtered = filtered.filter((l) => l.targetType === targetType);
    return filtered;
  }

  addAuditLog({ action, performedBy, targetType, details }) {
    const log = {
      _id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 6),
      action,
      performedBy: performedBy || 'System Admin',
      targetType,
      details,
      ipAddress: '192.168.1.10',
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    this.saveState();
    return log;
  }
}

export const mockStore = new MockStore();
