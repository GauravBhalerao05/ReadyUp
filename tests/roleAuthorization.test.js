const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./testHelper');

describe('Role-Based Authorization & Boundary Security', () => {
  setupTestDB();

  let tokens;

  beforeAll(async () => {
    tokens = await createTestUsers();
  });

  it('should block Student from accessing Coordinator import routes (403)', async () => {
    const res = await request(app)
      .get('/api/v1/coordinator/dashboard')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access denied');
  });

  it('should block Student from accessing Admin routes (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should block Coordinator from accessing Admin user management (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should prevent Admin from creating aptitude questions directly (403)', async () => {
    const res = await request(app)
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({
        questionId: 'QA-ADMIN-01',
        questionText: 'Admin test question',
        options: [
          { optionId: 'A', text: '1' },
          { optionId: 'B', text: '2' }
        ],
        correctOption: 'A',
        explanation: 'Test explanation',
        category: 'Quantitative Aptitude',
        topic: 'Time and Work',
        difficulty: 'easy'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('coordinator');
  });

  it('should allow Coordinator to access Coordinator dashboard (200)', async () => {
    const res = await request(app)
      .get('/api/v1/coordinator/dashboard')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
  });

  it('should allow Admin to access Admin dashboard and stats (200)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${tokens.adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
  });
});
