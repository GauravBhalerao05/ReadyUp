const { errorResponse } = require('../utils/response');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      const issues = err.issues || err.errors;
      if (issues) {
        const formattedErrors = issues.map((e) => ({
          field: (e.path || []).join('.'),
          message: e.message
        }));
        return errorResponse(res, 'Validation failed', 400, formattedErrors);
      }
      return errorResponse(res, err.message || 'Invalid input data', 400);
    }
  };
};

module.exports = validate;
