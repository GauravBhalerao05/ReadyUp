const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./testHelper');
const { User, AuditLog } = require('../src/models');

describe('Admin Management, Audit Logs, and Dashboards', () => {
  setupTestDB();

  let tokens;

  beforeAll(async () => {
    tokens = await createTestUsers();
  });

  it('should retrieve student dashboard analytics with Next Best Action & Weekly Progress', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.nextBestAction).toBeDefined();
    expect(res.body.data.weeklyProgress).toBeDefined();
    expect(res.body.data.weeklyProgress.percentage).toBeDefined();
  });

  it('should retrieve admin dashboard platform statistics and audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${tokens.adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalUsers).toBeGreaterThanOrEqual(3);
    expect(res.body.data.metrics.length).toBe(4);
    expect(Array.isArray(res.body.data.recentAuditLogs)).toBe(true);
  });

  it('should allow Admin to list and filter users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?role=student')
      .set('Authorization', `Bearer ${tokens.adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].role).toBe('student');
  });

  it('should allow Admin to create a user account', async () => {
    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({
        name: 'New Placement Coordinator',
        email: `new_coord_${Date.now()}@readyup.edu`,
        password: 'Password123!',
        role: 'coordinator',
        department: 'Career Development Cell'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.role).toBe('coordinator');
  });

  it('should allow Admin to update user role and status', async () => {
    // Create target user
    const target = await User.create({
      name: 'Promote Me',
      email: `promote_${Date.now()}@readyup.edu`,
      password: 'Password123!',
      role: 'student'
    });

    // Update role
    const roleRes = await request(app)
      .patch(`/api/v1/admin/users/${target._id}/role`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({ role: 'coordinator' });

    expect(roleRes.statusCode).toBe(200);
    expect(roleRes.body.data.role).toBe('coordinator');

    // Deactivate user
    const deactRes = await request(app)
      .patch(`/api/v1/admin/users/${target._id}/status`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({ isActive: false });

    expect(deactRes.statusCode).toBe(200);
    expect(deactRes.body.data.isActive).toBe(false);
  });

  it('should prevent Admin from deactivating own account', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${tokens.admin._id}/status`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({ isActive: false });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('cannot deactivate their own account');
  });

  it('should retrieve audit logs recorded for sensitive operations', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${tokens.adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
