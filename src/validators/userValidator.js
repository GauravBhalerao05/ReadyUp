const { z } = require('zod');

const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['student', 'coordinator', 'admin']),
  department: z.string().optional().default('Computer Science'),
  college: z.string().optional().default('Engineering Institute'),
  graduationYear: z.number().int().optional().default(new Date().getFullYear() + 1),
  studentId: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true)
});

const updateUserRoleSchema = z.object({
  role: z.enum(['student', 'coordinator', 'admin'], {
    errorMap: () => ({ message: 'Role must be student, coordinator, or admin' })
  })
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive status is required'
  })
});

module.exports = {
  adminCreateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema
};
