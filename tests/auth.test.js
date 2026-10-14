const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./testHelper');

describe('Authentication APIs', () => {
  setupTestDB();

  const userEmail = `student_${Date.now()}@test.com`;

  it('should register a new student account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'John Doe',
        email: userEmail,
        password: 'Password123!',
        role: 'student',
        department: 'Information Technology'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(userEmail);
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('should reject registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'John Doe Again',
        email: userEmail,
        password: 'Password123!'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should log in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userEmail,
        password: 'Password123!'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userEmail,
        password: 'WrongPassword!'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should retrieve current user profile with token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userEmail,
        password: 'Password123!'
      });

    const token = loginRes.body.data.token;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(userEmail);
  });

  it('should update user profile', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userEmail,
        password: 'Password123!'
      });

    const token = loginRes.body.data.token;

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        department: 'Electronics & Communication',
        studentId: 'EC2026-101'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.department).toBe('Electronics & Communication');
    expect(res.body.data.studentId).toBe('EC2026-101');
  });
});
