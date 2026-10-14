const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./testHelper');
const { Question, Topic, Company } = require('../src/models');

describe('Excel/CSV Import Workflow (T&P Coordinator)', () => {
  setupTestDB();

  let tokens;

  beforeAll(async () => {
    tokens = await createTestUsers();
  });

  it('should download CSV template with required headers', async () => {
    const res = await request(app)
      .get('/api/v1/coordinator/import/template?format=csv')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('questionId');
    expect(res.text).toContain('questionText');
    expect(res.text).toContain('optionA');
    expect(res.text).toContain('correctOption');
    expect(res.text).toContain('explanation');
  });

  it('should download Excel (.xlsx) template', async () => {
    const res = await request(app)
      .get('/api/v1/coordinator/import/template?format=xlsx')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
  });

  it('should parse uploaded CSV, report valid/invalid rows, and stage preview', async () => {
    // Construct CSV with 2 valid rows and 1 invalid row (missing correctOption)
    const csvContent = [
      'questionId,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,category,topic,subtopic,difficulty,companies,source,year',
      'IMP-001,"What is 2+2?",3,4,5,6,B,"2+2 is 4",Quantitative Aptitude,Time and Work,Basics,easy,TCS,Campus Drive,2025',
      'IMP-002,"Capital of France?",Berlin,Madrid,Paris,Rome,C,"Paris is capital",Verbal Ability,General,Basics,easy,Infosys,Campus Drive,2025',
      'IMP-003,"Invalid question row without answer",A,B,C,D,,"Missing correct option",Quantitative Aptitude,Time and Work,Basics,easy,TCS,Campus Drive,2025'
    ].join('\n');

    const res = await request(app)
      .post('/api/v1/coordinator/import/preview')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`)
      .attach('file', Buffer.from(csvContent), 'test_questions.csv');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.importBatchId).toBeDefined();
    expect(res.body.data.totalRows).toBe(3);
    expect(res.body.data.validRowsCount).toBe(2);
    expect(res.body.data.invalidRowsCount).toBeGreaterThanOrEqual(1);

    // Verify error detail
    const error = res.body.data.errors[0];
    expect(error.rowNumber).toBe(4); // 4th row in spreadsheet (header is 1)
  });

  it('should confirm and publish staged batch, and immediately make questions live', async () => {
    // 1. Upload CSV to stage
    const csvContent = [
      'questionId,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,category,topic,subtopic,difficulty,companies,source,year',
      'LIVE-001,"Live Question 1",10,20,30,40,B,"Step by step 20",Quantitative Aptitude,Percentages,Basics,easy,"Amazon, TCS",Campus 2026,2026',
      'LIVE-002,"Live Question 2",A,B,C,D,C,"Step by step C",Logical Reasoning,Blood Relations,Basics,medium,Amazon,Campus 2026,2026'
    ].join('\n');

    const previewRes = await request(app)
      .post('/api/v1/coordinator/import/preview')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`)
      .attach('file', Buffer.from(csvContent), 'live_questions.csv');

    const batchId = previewRes.body.data.importBatchId;
    expect(batchId).toBeDefined();

    // 2. Confirm and publish
    const confirmRes = await request(app)
      .post('/api/v1/coordinator/import/confirm')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`)
      .send({ importBatchId: batchId });

    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.data.insertedCount).toBe(2);

    // 3. Verify immediately searchable by student without restart
    const studentSearchRes = await request(app)
      .get('/api/v1/questions?search=LIVE-001')
      .set('Authorization', `Bearer ${tokens.studentToken}`);

    expect(studentSearchRes.statusCode).toBe(200);
    expect(studentSearchRes.body.data.length).toBe(1);
    expect(studentSearchRes.body.data[0].questionId).toBe('LIVE-001');

    // 4. Verify company was auto-created and mapped
    const company = await Company.findOne({ slug: 'amazon' });
    expect(company).toBeDefined();
    expect(company.name).toBe('Amazon');

    // 5. Verify import history log
    const historyRes = await request(app)
      .get('/api/v1/coordinator/import/history')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`);

    expect(historyRes.statusCode).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(historyRes.body.data[0].status).toBe('published');
  });

  it('should update existing question if questionId already exists in database (idempotent upsert)', async () => {
    // Upload same ID LIVE-001 with updated text
    const updatedCsv = [
      'questionId,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,category,topic,subtopic,difficulty,companies,source,year',
      'LIVE-001,"Live Question 1 Updated Content",10,20,30,40,B,"Updated explanation",Quantitative Aptitude,Percentages,Advanced,hard,Amazon,Updated Drive,2026'
    ].join('\n');

    const previewRes = await request(app)
      .post('/api/v1/coordinator/import/preview')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`)
      .attach('file', Buffer.from(updatedCsv), 'update.csv');

    const batchId = previewRes.body.data.importBatchId;

    const confirmRes = await request(app)
      .post('/api/v1/coordinator/import/confirm')
      .set('Authorization', `Bearer ${tokens.coordinatorToken}`)
      .send({ importBatchId: batchId });

    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.body.data.updatedCount).toBe(1);
    expect(confirmRes.body.data.insertedCount).toBe(0);

    // Verify in database
    const updatedQuestion = await Question.findOne({ questionId: 'LIVE-001' });
    expect(updatedQuestion.questionText).toBe('Live Question 1 Updated Content');
    expect(updatedQuestion.difficulty).toBe('hard');
  });
});
