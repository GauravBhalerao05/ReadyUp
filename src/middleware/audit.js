const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  action,
  user,
  targetType = 'system',
  targetId = '',
  details = {},
  req = null
}) => {
  try {
    const ipAddress = req ? req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress : '';
    const userAgent = req ? req.headers['user-agent'] : '';

    await AuditLog.create({
      action,
      performedBy: user._id || user.id,
      performerRole: user.role,
      targetType,
      targetId: String(targetId),
      details,
      ipAddress,
      userAgent
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
};

module.exports = { logAudit };
