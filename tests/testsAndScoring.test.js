const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./testHelper');
const { Question, MockTest } = require('../src/models');

describe('Practice Sessions, Mock Tests, Scoring and Bookmarks', () => {
  setupTestDB();

  let tokens;
  let q1, q2, q3;
  let createdMockTest;

  beforeAll(async () => {
    tokens = await createTestUsers();

    // Create 3 active questions
    q1 = await Question.create({
      questionId: 'TEST-Q-01',
      questionText: 'What is 15% of 200?',
      options: [
        { optionId: 'A', text: '25' },
        { optionId: 'B', text: '30' },
        { optionId: 'C', text: '35' },
        { optionId: 'D', text: '40' }
      ],
      correctOption: 'B',
      explanation: '15% of 200 = (15/100) * 200 = 30.',
      category: 'Quantitative Aptitude',
      topic: 'Percentages',
      difficulty: 'easy',
      companies: ['TCS']
    });

    q2 = await Question.create({
      questionId: 'TEST-Q-02',
      questionText: 'A car travels 120 km in 2 hours. What is its speed?',
      options: [
        { optionId: 'A', text: '50 km/h' },
        { optionId: 'B', text: '60 km/h' },
        { optionId: 'C', text: '70 km/h' },
        { optionId: 'D', text: '80 km/h' }
      ],
      correctOption: 'B',
      explanation: 'Speed = Distance / Time = 120 / 2 = 60 km/h.',
      category: 'Quantitative Aptitude',
      topic: 'Speed, Time and Distance',
      difficulty: 'easy',
      companies: ['TCS', 'Infosys']
    });

    q3 = await Question.create({
      questionId: 'TEST-Q-03',
      questionText: 'If all cats are animals and all animals have four legs, do all cats have four legs?',
      options: [
        { optionId: 'A', text: 'Yes' },
        { optionId: 'B', text: 'No' },
        { optionId: 'C', text: 'Cannot be determined' },
        { optionId: 'D', text: 'None of the above' }
      ],
      correctOption: 'A',
      explanation: 'By transitive syllogism: Cats -> Animals -> Four legs.',
      category: 'Logical Reasoning',
      topic: 'Syllogisms',
      difficulty: 'easy',
      companies: ['Infosys']
    });

    // Create a mock test
    createdMockTest = await MockTest.create({
      title: 'TCS Aptitude Sprint',
      slug: 'tcs-aptitude-sprint',
      durationMinutes: 15,
      totalMarks: 3,
      passingMarks: 2,
      company: 'TCS',
      questions: [q1._id, q2._id, q3._id]
    });
  });

  it('should start a practice session with answers stripped from response', async () => {
    const res = await request(app)
      .post('/api/v1/tests/practice/start')
      .set('Authorization', `Bearer ${tokens.studentToken}`)
      .send({
        topic: 'Percentages',
        count: 5
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attemptId).toBeDefined();
    expect(res.body.data.questions.length).toBeGreaterThanOrEqual(1);

    // Verify correctOption and explanation are hidden
    const firstQ = res.body.data.questions[0];
    expect(firstQ.correctOption).toBeUndefined();
    expect(firstQ.explanation).toBeUndefined();
    expect(firstQ.options).toBeDefined();
  });

  it('should start a timed mock test with server-authoritative timer', async () => {
    const res = await request(app)
      .post(`/api/v1/tests/mock-tests/${createdMockTest._id}/start`)
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attemptId).toBeDefined();
    expect(res.body.data.expiresAt).toBeDefined();
    expect(res.body.data.questions.length).toBe(3);
    expect(res.body.data.questions[0].correctOption).toBeUndefined();
  });

  it('should submit test attempt, calculate score server-side, and return results', async () => {
    // Start attempt
    const startRes = await request(app)
      .post(`/api/v1/tests/mock-tests/${createdMockTest._id}/start`)
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    const attemptId = startRes.body.data.attemptId;

    // Submit: Q1 correct ('B'), Q2 incorrect ('A', correct is 'B'), Q3 correct ('A')
    const submitRes = await request(app)
      .post(`/api/v1/tests/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${tokens.studentToken}`)
      .send({
        answers: [
          { questionId: 'TEST-Q-01', selectedOption: 'B', timeSpentSeconds: 45 },
          { questionId: 'TEST-Q-02', selectedOption: 'A', timeSpentSeconds: 60 },
          { questionId: 'TEST-Q-03', selectedOption: 'A', timeSpentSeconds: 30 }
        ]
      });

    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.score).toBe(2);
    expect(submitRes.body.data.correctCount).toBe(2);
    expect(submitRes.body.data.incorrectCount).toBe(1);
    expect(submitRes.body.data.unansweredCount).toBe(0);
    expect(submitRes.body.data.passed).toBe(true);
    expect(submitRes.body.data.topicBreakdown).toBeDefined();
    expect(submitRes.body.data.recommendations).toBeDefined();
  });

  it('should get detailed review containing explanations after submission', async () => {
    const startRes = await request(app)
      .post(`/api/v1/tests/mock-tests/${createdMockTest._id}/start`)
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    const attemptId = startRes.body.data.attemptId;

    await request(app)
      .post(`/api/v1/tests/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${tokens.studentToken}`)
      .send({
        answers: [{ questionId: 'TEST-Q-01', selectedOption: 'B' }]
      });

    const reviewRes = await request(app)
      .get(`/api/v1/tests/attempts/${attemptId}/review`)
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.data.answers[0].explanation).toBeDefined();
    expect(reviewRes.body.data.answers[0].correctOption).toBe('B');
  });

  it('should retrieve incorrect questions for targeted practice drill', async () => {
    const res = await request(app)
      .get('/api/v1/tests/incorrect')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should manage bookmarks: add, retrieve, and remove', async () => {
    // Add bookmark
    const addRes = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${tokens.studentToken}`)
      .send({
        questionId: 'TEST-Q-01',
        note: 'Review percentage formula'
      });

    expect(addRes.statusCode).toBe(201);
    expect(addRes.body.success).toBe(true);

    // List bookmarks
    const listRes = await request(app)
      .get('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data[0].questionId).toBe('TEST-Q-01');

    // Remove bookmark
    const delRes = await request(app)
      .delete('/api/v1/bookmarks/TEST-Q-01')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.success).toBe(true);
  });
});
