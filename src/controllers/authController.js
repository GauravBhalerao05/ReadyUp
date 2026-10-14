const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../middleware/audit');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    await logAudit({
      action: 'USER_REGISTERED',
      user: result.user,
      targetType: 'user',
      targetId: result.user._id,
      details: { role: result.user.role, email: result.user.email },
      req
    });
    return successResponse(res, 'User registered successfully', result, 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    await logAudit({
      action: 'USER_LOGIN',
      user: result.user,
      targetType: 'auth',
      targetId: result.user._id,
      details: { email: result.user.email },
      req
    });
    return successResponse(res, 'Logged in successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res) => {
  return successResponse(res, 'Logged out successfully', null, 200);
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user._id);
    return successResponse(res, 'Profile retrieved successfully', user, 200);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const updated = await authService.updateProfile(req.user._id, req.body);
    await logAudit({
      action: 'USER_PROFILE_UPDATED',
      user: req.user,
      targetType: 'user',
      targetId: req.user._id,
      details: req.body,
      req
    });
    return successResponse(res, 'Profile updated successfully', updated, 200);
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user._id, currentPassword, newPassword);
    await logAudit({
      action: 'USER_PASSWORD_CHANGED',
      user: req.user,
      targetType: 'user',
      targetId: req.user._id,
      details: {},
      req
    });
    return successResponse(res, 'Password changed successfully', null, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
