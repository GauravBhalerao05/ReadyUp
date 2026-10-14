const { errorResponse } = require('../utils/response');

/**
 * Authorize only specified roles
 * @param  {...string} allowedRoles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required before authorization check', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Your role '${req.user.role}' is not authorized to access this resource. Required role(s): ${allowedRoles.join(', ')}.`,
        403
      );
    }

    next();
  };
};

module.exports = { authorize };
