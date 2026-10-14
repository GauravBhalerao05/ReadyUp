const User = require('../models/User');
const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { logAudit } = require('../middleware/audit');

const listUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { department: new RegExp(search, 'i') }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    return paginatedResponse(res, 'Users retrieved successfully', users, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    return successResponse(res, 'User retrieved successfully', user, 200);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const existing = await User.findOne({ email: req.body.email.toLowerCase() });
    if (existing) {
      return errorResponse(res, 'A user with this email already exists', 409);
    }

    const newUser = await User.create(req.body);

    await logAudit({
      action: 'ADMIN_CREATED_USER',
      user: req.user,
      targetType: 'user',
      targetId: String(newUser._id),
      details: { email: newUser.email, role: newUser.role },
      req
    });

    return successResponse(res, 'User created successfully by administrator', newUser.toJSON(), 201);
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetUserId = req.params.id;

    if (String(req.user._id) === String(targetUserId) && role !== 'admin') {
      return errorResponse(res, 'Administrators cannot demote their own account role', 400);
    }

    const updated = await User.findByIdAndUpdate(
      targetUserId,
      { $set: { role } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return errorResponse(res, 'User not found', 404);
    }

    await logAudit({
      action: 'USER_ROLE_ASSIGNED',
      user: req.user,
      targetType: 'user',
      targetId: String(updated._id),
      details: { newRole: role, userEmail: updated.email },
      req
    });

    return successResponse(res, `User role successfully updated to ${role}`, updated.toJSON(), 200);
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const targetUserId = req.params.id;

    if (String(req.user._id) === String(targetUserId) && !isActive) {
      return errorResponse(res, 'Administrators cannot deactivate their own account', 400);
    }

    const updated = await User.findByIdAndUpdate(
      targetUserId,
      { $set: { isActive } },
      { new: true }
    );

    if (!updated) {
      return errorResponse(res, 'User not found', 404);
    }

    await logAudit({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      user: req.user,
      targetType: 'user',
      targetId: String(updated._id),
      details: { isActive, userEmail: updated.email },
      req
    });

    return successResponse(res, `User account ${isActive ? 'activated' : 'deactivated'} successfully`, updated.toJSON(), 200);
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { action, targetType, role, page = 1, limit = 25 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (role) filter.performerRole = role;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    return paginatedResponse(res, 'Audit logs retrieved successfully', logs, {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit
    });
  } catch (error) {
    next(error);
  }
};

const getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const studentsCount = await User.countDocuments({ role: 'student' });
    const coordinatorsCount = await User.countDocuments({ role: 'coordinator' });
    const adminsCount = await User.countDocuments({ role: 'admin' });
    const activeUsersCount = await User.countDocuments({ isActive: true });

    const totalQuestions = await Question.countDocuments();
    const totalTestsTaken = await TestAttempt.countDocuments({ status: 'completed' });
    const totalPassed = await TestAttempt.countDocuments({ status: 'completed', passed: true });
    const overallPassRate = totalTestsTaken > 0 ? Math.round((totalPassed / totalTestsTaken) * 100) : 0;

    const metrics = [
      {
        id: 'total_students',
        label: 'Registered Students',
        value: studentsCount,
        subtext: `${activeUsersCount} active on platform`,
        icon: 'Users'
      },
      {
        id: 'coordinators',
        label: 'T&P Coordinators',
        value: coordinatorsCount,
        subtext: 'Authorized content managers',
        icon: 'Briefcase'
      },
      {
        id: 'questions_bank',
        label: 'Aptitude Question Bank',
        value: totalQuestions,
        subtext: 'Topic & company mapped',
        icon: 'BookOpen'
      },
      {
        id: 'tests_conducted',
        label: 'Tests Completed',
        value: totalTestsTaken,
        subtext: `${overallPassRate}% platform pass rate`,
        icon: 'Award'
      }
    ];

    const recentAuditLogs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(6);

    return successResponse(res, 'Platform statistics retrieved successfully', {
      summary: {
        totalUsers,
        studentsCount,
        coordinatorsCount,
        adminsCount,
        activeUsersCount,
        totalQuestions,
        totalTestsTaken,
        overallPassRate
      },
      metrics,
      recentAuditLogs
    }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUserRole,
  updateUserStatus,
  getAuditLogs,
  getPlatformStats
};
