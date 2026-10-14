const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const validate = require('../middleware/validate');
const {
  adminCreateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema
} = require('../validators/userValidator');

// Enforce authentication and admin authorization on all admin routes
router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getPlatformStats);
router.get('/users', adminController.listUsers);
router.post('/users', validate(adminCreateUserSchema), adminController.createUser);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/role', validate(updateUserRoleSchema), adminController.updateUserRole);
router.patch('/users/:id/status', validate(updateUserStatusSchema), adminController.updateUserStatus);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
