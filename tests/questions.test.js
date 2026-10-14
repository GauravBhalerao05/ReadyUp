const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./testHelper');
const { Category, Topic, Company } = require('../src/models');

describe('Questions and Categories APIs', () => {
  setupTestDB();

  let tokens;

  beforeAll(async () => {
    tokens = await createTestUsers();

    await Category.create({
      name: 'Quantitative Aptitude',
      slug: 'quantitative-aptitude',
      icon: 'Calculator',
      order: 1
    });

    await Topic.create({
      name: 'Time and Work',
      slug: 'time-and-work',
      category: 'Quantitative Aptitude',
      subtopics: ['Combined Work']
    });

    await Company.create({
      name: 'TCS',
      slug: 'tcs',
      description: 'Tata Consultancy Services'
    });
  });

  it('should list categories and topics', async () => {
    const res = await request(app)
      .get('/api/v1/questions/categories')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].name).toBe('Quantitative Aptitude');
    expect(res.body.data[0].topics[0].name).toBe('Time and Work');
  });

  it('should allow Coordinator to create a question', async () => {
    const res = await request(app)
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`)
      .send({
        questionId: 'QA-TW-101',
        questionText: 'If 6 men complete a work in 10 days, in how many days will 10 men complete the same work?',
        options: [
          { optionId: 'A', text: '6 days' },
          { optionId: 'B', text: '8 days' },
          { optionId: 'C', text: '5 days' },
          { optionId: 'D', text: '4 days' }
        ],
        correctOption: 'A',
        explanation: 'M1 * D1 = M2 * D2. 6 * 10 = 10 * D2 => D2 = 6 days.',
        category: 'Quantitative Aptitude',
        topic: 'Time and Work',
        subtopic: 'Combined Work',
        difficulty: 'easy',
        companies: ['TCS'],
        source: 'TCS NQT 2024'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.questionId).toBe('QA-TW-101');
    expect(res.body.data.correctOption).toBe('A');
  });

  it('should reject duplicate questionId', async () => {
    const res = await request(app)
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`)
      .send({
        questionId: 'QA-TW-101',
        questionText: 'Duplicate question text',
        options: [
          { optionId: 'A', text: '1' },
          { optionId: 'B', text: '2' }
        ],
        correctOption: 'A',
        explanation: 'Explanation',
        category: 'Quantitative Aptitude',
        topic: 'Time and Work'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should filter questions by topic and difficulty', async () => {
    const res = await request(app)
      .get('/api/v1/questions?topic=Time and Work&difficulty=easy')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].topic).toBe('Time and Work');
  });

  it('should allow Coordinator to update a question', async () => {
    const res = await request(app)
      .put('/api/v1/questions/QA-TW-101')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`)
      .send({
        difficulty: 'medium',
        source: 'TCS NQT 2025 Revised'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.difficulty).toBe('medium');
    expect(res.body.data.source).toBe('TCS NQT 2025 Revised');
  });
});
