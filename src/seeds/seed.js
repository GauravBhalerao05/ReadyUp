const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const {
  User,
  Category,
  Topic,
  Company,
  Question,
  MockTest,
  TestAttempt,
  Bookmark
} = require('../models');

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Starting ReadyUp sample database seeding...');
    await connectDB();

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Topic.deleteMany({}),
      Company.deleteMany({}),
      Question.deleteMany({}),
      MockTest.deleteMany({}),
      TestAttempt.deleteMany({}),
      Bookmark.deleteMany({})
    ]);

    console.log('[Seeder] Cleared existing records.');

    // 1. Create Default Users for each role
    const users = await User.create([
      {
        name: 'Aarav Sharma',
        email: 'student@readyup.edu',
        password: 'Password123!',
        role: 'student',
        department: 'Computer Science & Engineering',
        college: 'National Institute of Technology',
        graduationYear: 2026,
        studentId: 'CS2026-042',
        isActive: true
      },
      {
        name: 'Prof. Ramesh Kulkarni',
        email: 'coordinator@readyup.edu',
        password: 'Password123!',
        role: 'coordinator',
        department: 'Training & Placement Cell',
        college: 'National Institute of Technology',
        studentId: 'EMP-TP-01',
        isActive: true
      },
      {
        name: 'System Administrator',
        email: 'admin@readyup.edu',
        password: 'Password123!',
        role: 'admin',
        department: 'Information Technology',
        college: 'National Institute of Technology',
        studentId: 'ADMIN-001',
        isActive: true
      }
    ]);

    const studentUser = users[0];
    const coordinatorUser = users[1];
    const adminUser = users[2];

    console.log('[Seeder] Users seeded: student@readyup.edu, coordinator@readyup.edu, admin@readyup.edu');

    // 2. Create Categories
    const categories = await Category.create([
      {
        name: 'Quantitative Aptitude',
        slug: 'quantitative-aptitude',
        description: 'Mathematical, arithmetic, and numerical reasoning topics',
        icon: 'Calculator',
        order: 1
      },
      {
        name: 'Logical Reasoning',
        slug: 'logical-reasoning',
        description: 'Analytical, deductive, and critical thinking puzzles',
        icon: 'Compass',
        order: 2
      },
      {
        name: 'Verbal Ability',
        slug: 'verbal-ability',
        description: 'Grammar, vocabulary, and reading comprehension drills',
        icon: 'BookOpen',
        order: 3
      },
      {
        name: 'Data Interpretation',
        slug: 'data-interpretation',
        description: 'Charts, tables, graphs, and structured data analysis',
        icon: 'BarChart2',
        order: 4
      }
    ]);

    // 3. Create Topics
    const topics = await Topic.create([
      {
        name: 'Time and Work',
        slug: 'time-and-work',
        category: 'Quantitative Aptitude',
        description: 'Problems on work rates, efficiency, and pipes/cisterns',
        subtopics: ['Combined Work', 'Alternate Days', 'Pipes and Cisterns', 'Work and Wages'],
        order: 1
      },
      {
        name: 'Percentages',
        slug: 'percentages',
        category: 'Quantitative Aptitude',
        description: 'Fraction-to-percentage conversions, price/consumption changes',
        subtopics: ['Basic Percentages', 'Successive Change', 'Population Change'],
        order: 2
      },
      {
        name: 'Profit and Loss',
        slug: 'profit-and-loss',
        category: 'Quantitative Aptitude',
        description: 'Cost price, selling price, marked price, discounts, and dishonest dealer',
        subtopics: ['Discounts', 'Markup Percentage', 'Dishonest Shopkeeper'],
        order: 3
      },
      {
        name: 'Speed, Time and Distance',
        slug: 'speed-time-and-distance',
        category: 'Quantitative Aptitude',
        description: 'Relative speed, trains, boats and streams, circular tracks',
        subtopics: ['Trains', 'Boats and Streams', 'Races and Circular Motion'],
        order: 4
      },
      {
        name: 'Blood Relations',
        slug: 'blood-relations',
        category: 'Logical Reasoning',
        description: 'Family tree puzzles, coded relationships, and pointing puzzles',
        subtopics: ['Family Tree', 'Coded Relations', 'Pointing Problems'],
        order: 1
      },
      {
        name: 'Syllogisms',
        slug: 'syllogisms',
        category: 'Logical Reasoning',
        description: 'Venn-diagram deductions, statements and conclusions, possibility cases',
        subtopics: ['Standard Venn', 'Only Few/Only Cases', 'Possibility Conclusions'],
        order: 2
      },
      {
        name: 'Coding-Decoding',
        slug: 'coding-decoding',
        category: 'Logical Reasoning',
        description: 'Letter shifting, number substitution, matrix and fictitious language',
        subtopics: ['Letter Coding', 'Number Coding', 'Deciphering Messages'],
        order: 3
      },
      {
        name: 'Sentence Correction',
        slug: 'sentence-correction',
        category: 'Verbal Ability',
        description: 'Subject-verb agreement, modifier errors, tenses, parallelism',
        subtopics: ['Subject-Verb Agreement', 'Modifiers', 'Parallelism'],
        order: 1
      },
      {
        name: 'Reading Comprehension',
        slug: 'reading-comprehension',
        category: 'Verbal Ability',
        description: 'Passage inferences, tone, central idea, and vocabulary in context',
        subtopics: ['Direct Fact Questions', 'Inference Questions', 'Tone of Passage'],
        order: 2
      }
    ]);

    // 4. Create Companies
    const companies = await Company.create([
      {
        name: 'TCS',
        slug: 'tcs',
        description: 'Tata Consultancy Services - National Qualifier Test (NQT) Pattern',
        hiringPattern: 'Numerical Ability (26 Qs), Reasoning Ability (30 Qs), Verbal Ability (24 Qs). Total 80 Qs in 65 mins.',
        eligibilityNotes: '60% or 6.0 CGPA throughout 10th, 12th, and UG with no active backlogs.',
        questionCount: 0
      },
      {
        name: 'Infosys',
        slug: 'infosys',
        description: 'Infosys Specialist Programmer & Digital Specialist Engineer Assessment',
        hiringPattern: 'Mathematical Ability (10 Qs, 35 mins), Logical Reasoning (15 Qs, 25 mins), Verbal Ability (20 Qs, 20 mins).',
        eligibilityNotes: '65% minimum throughout academics.',
        questionCount: 0
      },
      {
        name: 'Cognizant',
        slug: 'cognizant',
        description: 'Cognizant GenC and GenC Next Technical Assessment',
        hiringPattern: 'Quantitative (25 Qs), Analytical Reasoning (20 Qs), Verbal (20 Qs).',
        eligibilityNotes: '60% or 6.0 CGPA with max 1 active backlog at time of test.',
        questionCount: 0
      },
      {
        name: 'Wipro',
        slug: 'wipro',
        description: 'Wipro Elite National Talent Hunt (NLTH)',
        hiringPattern: 'Aptitude Test: Quantitative, Logical, Verbal + Essay Writing.',
        eligibilityNotes: '60% throughout 10th, 12th, and Engineering.',
        questionCount: 0
      },
      {
        name: 'Accenture',
        slug: 'accenture',
        description: 'Accenture Cognitive and Technical Assessment',
        hiringPattern: 'Cognitive: English Ability (17 Qs), Critical Thinking (18 Qs), Abstract Reasoning (15 Qs).',
        eligibilityNotes: 'Full-time B.Tech/B.E, minimum 6.5 CGPA, no standing backlogs.',
        questionCount: 0
      }
    ]);

    // 5. Seed Questions
    const sampleQuestions = [
      {
        questionId: 'QA-TW-001',
        questionText: 'A can complete a piece of work in 12 days, while B can complete it in 18 days. If they work together, in how many days will the work be completed?',
        options: [
          { optionId: 'A', text: '7.2 days' },
          { optionId: 'B', text: '6.5 days' },
          { optionId: 'C', text: '8.0 days' },
          { optionId: 'D', text: '5.4 days' }
        ],
        correctOption: 'A',
        explanation: "A's 1-day work = 1/12. B's 1-day work = 1/18. Working together: 1/12 + 1/18 = (3+2)/36 = 5/36 per day. Time needed = 36/5 = 7.2 days.",
        category: 'Quantitative Aptitude',
        topic: 'Time and Work',
        subtopic: 'Combined Work',
        difficulty: 'easy',
        companies: ['TCS', 'Infosys', 'Cognizant'],
        source: 'TCS NQT 2024',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'QA-TW-002',
        questionText: 'Pipe A can fill a tank in 20 minutes, while Pipe B can empty it in 30 minutes. If both pipes are opened simultaneously, how long will it take to fill the tank?',
        options: [
          { optionId: 'A', text: '40 minutes' },
          { optionId: 'B', text: '50 minutes' },
          { optionId: 'C', text: '60 minutes' },
          { optionId: 'D', text: '75 minutes' }
        ],
        correctOption: 'C',
        explanation: 'Net rate of filling in 1 minute = 1/20 - 1/30 = (3-2)/60 = 1/60. Hence, it will take 60 minutes to fill the tank completely.',
        category: 'Quantitative Aptitude',
        topic: 'Time and Work',
        subtopic: 'Pipes and Cisterns',
        difficulty: 'medium',
        companies: ['Wipro', 'Accenture'],
        source: 'Wipro NLTH 2024',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'QA-PC-001',
        questionText: 'If the price of sugar increases by 25%, by what percentage must a household reduce its consumption so that the total expenditure remains unchanged?',
        options: [
          { optionId: 'A', text: '20%' },
          { optionId: 'B', text: '25%' },
          { optionId: 'C', text: '16.67%' },
          { optionId: 'D', text: '22.5%' }
        ],
        correctOption: 'A',
        explanation: 'Reduction in consumption = [r / (100 + r)] * 100% = [25 / 125] * 100% = (1/5) * 100% = 20%.',
        category: 'Quantitative Aptitude',
        topic: 'Percentages',
        subtopic: 'Price and Consumption',
        difficulty: 'easy',
        companies: ['TCS', 'Infosys'],
        source: 'Infosys Placement 2024',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'QA-PL-001',
        questionText: 'A trader marks his goods 30% above the cost price and allows a discount of 15% on the marked price. What is his net gain percentage?',
        options: [
          { optionId: 'A', text: '10.5%' },
          { optionId: 'B', text: '12.0%' },
          { optionId: 'C', text: '15.0%' },
          { optionId: 'D', text: '14.5%' }
        ],
        correctOption: 'A',
        explanation: 'Let CP = 100. MP = 130. Discount = 15% of 130 = 19.5. SP = 130 - 19.5 = 110.5. Net Gain = 110.5 - 100 = 10.5%.',
        category: 'Quantitative Aptitude',
        topic: 'Profit and Loss',
        subtopic: 'Discounts',
        difficulty: 'medium',
        companies: ['Cognizant', 'TCS'],
        source: 'Cognizant Assessment 2024',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'QA-ST-001',
        questionText: 'A train 150 metres long is running at a speed of 54 km/hr. How many seconds will it take to pass a stationary telegraph post?',
        options: [
          { optionId: 'A', text: '8 seconds' },
          { optionId: 'B', text: '10 seconds' },
          { optionId: 'C', text: '12 seconds' },
          { optionId: 'D', text: '15 seconds' }
        ],
        correctOption: 'B',
        explanation: 'Speed in m/s = 54 * (5/18) = 15 m/s. Time = Distance / Speed = 150 / 15 = 10 seconds.',
        category: 'Quantitative Aptitude',
        topic: 'Speed, Time and Distance',
        subtopic: 'Trains',
        difficulty: 'easy',
        companies: ['TCS', 'Wipro', 'Accenture'],
        source: 'TCS NQT 2024',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'LR-BL-001',
        questionText: 'Pointing to a photograph, Rohit said, "She is the daughter of my grandfather\'s only son." How is the girl in the photograph related to Rohit?',
        options: [
          { optionId: 'A', text: 'Mother' },
          { optionId: 'B', text: 'Sister' },
          { optionId: 'C', text: 'Cousin' },
          { optionId: 'D', text: 'Aunt' }
        ],
        correctOption: 'B',
        explanation: "Grandfather's only son is Rohit's father. The daughter of Rohit's father is Rohit's sister.",
        category: 'Logical Reasoning',
        topic: 'Blood Relations',
        subtopic: 'Pointing Problems',
        difficulty: 'easy',
        companies: ['Infosys', 'TCS'],
        source: 'Infosys Assessment 2024',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'LR-SY-001',
        questionText: 'Statements: All pens are books. Some books are pencils. Conclusions: I. Some pens are pencils. II. Some pencils are books.',
        options: [
          { optionId: 'A', text: 'Only conclusion I follows' },
          { optionId: 'B', text: 'Only conclusion II follows' },
          { optionId: 'C', text: 'Either I or II follows' },
          { optionId: 'D', text: 'Neither I nor II follows' }
        ],
        correctOption: 'B',
        explanation: 'From "Some books are pencils", by conversion "Some pencils are books" definitely follows. There is no definite intersection guaranteed between pens and pencils.',
        category: 'Logical Reasoning',
        topic: 'Syllogisms',
        subtopic: 'Standard Venn',
        difficulty: 'medium',
        companies: ['Cognizant', 'Accenture'],
        source: 'Cognizant GenC 2024',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'LR-CD-001',
        questionText: 'In a certain code language, "ROSE" is written as "TQWI". How is "LEAF" written in that same code?',
        options: [
          { optionId: 'A', text: 'NGCH' },
          { optionId: 'B', text: 'NHEI' },
          { optionId: 'C', text: 'NGCJ' },
          { optionId: 'D', text: 'MGCH' }
        ],
        correctOption: 'C',
        explanation: 'R (+2) = T, O (+2) = Q, S (+4) = W, E (+4) = I. Applying +2, +2, +2, +4 pattern: L(+2)=N, E(+2)=G, A(+2)=C, F(+4)=J. Result is NGCJ.',
        category: 'Logical Reasoning',
        topic: 'Coding-Decoding',
        subtopic: 'Letter Coding',
        difficulty: 'medium',
        companies: ['TCS', 'Wipro'],
        source: 'TCS Placement Pool',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'VA-SC-001',
        questionText: 'Select the correct sentence from the choices below regarding subject-verb agreement:',
        options: [
          { optionId: 'A', text: 'Neither the manager nor the employees was available for comment.' },
          { optionId: 'B', text: 'Neither the manager nor the employees were available for comment.' },
          { optionId: 'C', text: 'Neither the manager or the employees was available for comment.' },
          { optionId: 'D', text: 'Neither the manager nor the employees are available yesterday.' }
        ],
        correctOption: 'B',
        explanation: 'When compound subjects are joined by "neither... nor", the verb agrees in number with the closer subject ("employees", which is plural), hence "were" is correct for past tense.',
        category: 'Verbal Ability',
        topic: 'Sentence Correction',
        subtopic: 'Subject-Verb Agreement',
        difficulty: 'easy',
        companies: ['TCS', 'Cognizant', 'Infosys'],
        source: 'Campus Verbal Pool',
        year: 2025,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        questionId: 'VA-RC-001',
        questionText: 'Passage: "Renewable energy adoption has grown exponentially over the last decade, primarily spurred by plunging solar photovoltaic manufacturing costs and heightened international regulatory pressures on carbon emissions." Question: What are the two primary drivers cited in the passage?',
        options: [
          { optionId: 'A', text: 'Subsidies and consumer demand' },
          { optionId: 'B', text: 'Cheaper solar PV costs and regulatory emission pressures' },
          { optionId: 'C', text: 'Depletion of fossil fuels and tax credits' },
          { optionId: 'D', text: 'Nuclear decommissioning and grid modernization' }
        ],
        correctOption: 'B',
        explanation: 'The passage explicitly names "plunging solar photovoltaic manufacturing costs" and "heightened international regulatory pressures on carbon emissions".',
        category: 'Verbal Ability',
        topic: 'Reading Comprehension',
        subtopic: 'Direct Fact Questions',
        difficulty: 'easy',
        companies: ['Infosys', 'Accenture'],
        source: 'Infosys Verbal 2024',
        year: 2024,
        isVerified: true,
        isActive: true,
        createdBy: coordinatorUser._id
      }
    ];

    const insertedQuestions = await Question.insertMany(sampleQuestions);
    console.log(`[Seeder] Seeded ${insertedQuestions.length} aptitude questions.`);

    // Update question counts on topics
    for (const t of topics) {
      const count = await Question.countDocuments({ topic: t.name, isActive: true });
      t.questionCount = count;
      await t.save();
    }

    // Update question counts on companies
    for (const c of companies) {
      const count = await Question.countDocuments({ companies: c.name, isActive: true });
      c.questionCount = count;
      await c.save();
    }

    // 6. Create Mock Tests
    const mockTests = await MockTest.create([
      {
        title: 'TCS NQT Full-Length National Aptitude Mock 1',
        slug: 'tcs-nqt-full-length-mock-1',
        description: 'Realistic exam simulation matching the latest TCS NQT section timers, scoring pattern, and syllabus.',
        durationMinutes: 45,
        totalMarks: 10,
        passingMarks: 6,
        negativeMarking: 0,
        type: 'company_mock',
        company: 'TCS',
        categories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
        topics: ['Time and Work', 'Percentages', 'Blood Relations', 'Coding-Decoding', 'Sentence Correction'],
        questions: insertedQuestions.map((q) => q._id),
        instructions: [
          'The test contains 10 objective questions.',
          'Duration is 45 minutes.',
          'Each question carries 1 mark. There is no negative marking.',
          'Do not refresh or close the browser window during the test.'
        ],
        isActive: true,
        createdBy: coordinatorUser._id
      },
      {
        title: 'General Aptitude Diagnostic Test',
        slug: 'general-aptitude-diagnostic',
        description: 'Comprehensive diagnostic test to evaluate strengths and weaknesses across all core aptitude pillars.',
        durationMinutes: 30,
        totalMarks: 10,
        passingMarks: 5,
        negativeMarking: 0,
        type: 'diagnostic',
        company: '',
        categories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
        topics: ['Time and Work', 'Profit and Loss', 'Syllogisms', 'Sentence Correction', 'Reading Comprehension'],
        questions: insertedQuestions.map((q) => q._id),
        instructions: [
          'Diagnostic test designed to evaluate your baseline placement readiness.',
          'Answer all questions to the best of your ability.',
          'Detailed step-by-step explanations will be provided immediately upon submission.'
        ],
        isActive: true,
        createdBy: coordinatorUser._id
      }
    ]);

    console.log(`[Seeder] Seeded ${mockTests.length} mock tests.`);

    // 7. Seed a completed test attempt for the sample student to demonstrate metrics
    const pastAttempt = await TestAttempt.create({
      user: studentUser._id,
      mockTest: mockTests[0]._id,
      title: mockTests[0].title,
      type: 'mock_test',
      company: 'TCS',
      status: 'completed',
      startedAt: new Date(Date.now() - 3600 * 1000 * 2),
      submittedAt: new Date(Date.now() - 3600 * 1000 * 1.5),
      durationSeconds: 1680,
      totalQuestions: 10,
      attemptedCount: 10,
      correctCount: 7,
      incorrectCount: 3,
      unansweredCount: 0,
      score: 7,
      totalMarks: 10,
      percentage: 70.0,
      passed: true,
      passingMarks: 6,
      answers: insertedQuestions.map((q, idx) => ({
        question: q._id,
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        selectedOption: idx === 1 || idx === 6 || idx === 7 ? 'D' : q.correctOption,
        correctOption: q.correctOption,
        explanation: q.explanation,
        category: q.category,
        topic: q.topic,
        difficulty: q.difficulty,
        isCorrect: !(idx === 1 || idx === 6 || idx === 7),
        isAttempted: true,
        timeSpentSeconds: 120
      })),
      topicBreakdown: [
        { topic: 'Time and Work', category: 'Quantitative Aptitude', total: 2, attempted: 2, correct: 1, incorrect: 1, unanswered: 0, accuracy: 50 },
        { topic: 'Percentages', category: 'Quantitative Aptitude', total: 1, attempted: 1, correct: 1, incorrect: 0, unanswered: 0, accuracy: 100 },
        { topic: 'Blood Relations', category: 'Logical Reasoning', total: 1, attempted: 1, correct: 1, incorrect: 0, unanswered: 0, accuracy: 100 },
        { topic: 'Syllogisms', category: 'Logical Reasoning', total: 1, attempted: 1, correct: 0, incorrect: 1, unanswered: 0, accuracy: 0 },
        { topic: 'Coding-Decoding', category: 'Logical Reasoning', total: 1, attempted: 1, correct: 0, incorrect: 1, unanswered: 0, accuracy: 0 },
        { topic: 'Sentence Correction', category: 'Verbal Ability', total: 1, attempted: 1, correct: 1, incorrect: 0, unanswered: 0, accuracy: 100 },
        { topic: 'Reading Comprehension', category: 'Verbal Ability', total: 1, attempted: 1, correct: 1, incorrect: 0, unanswered: 0, accuracy: 100 }
      ],
      recommendations: [
        {
          topic: 'Time and Work',
          category: 'Quantitative Aptitude',
          accuracy: 50,
          status: 'needs_practice',
          message: 'Accuracy in Time and Work is 50%. Focus on pipes/cisterns and combined rate calculations.'
        },
        {
          topic: 'Syllogisms',
          category: 'Logical Reasoning',
          accuracy: 0,
          status: 'needs_practice',
          message: 'Accuracy in Syllogisms is 0%. Review Venn diagram methods for "some" and "all" deductions.'
        }
      ]
    });

    // 8. Seed a sample bookmark for the student
    await Bookmark.create({
      user: studentUser._id,
      question: insertedQuestions[0]._id,
      questionId: insertedQuestions[0].questionId,
      note: 'Revise 1-day work formula before TCS exam'
    });

    console.log('[Seeder] Completed sample database seeding successfully!');
    console.log('-----------------------------------------------------------');
    console.log('SAMPLE CREDENTIALS FOR TESTING:');
    console.log('Student:     student@readyup.edu     / Password123!');
    console.log('Coordinator: coordinator@readyup.edu / Password123!');
    console.log('Admin:       admin@readyup.edu       / Password123!');
    console.log('-----------------------------------------------------------');
  } catch (error) {
    console.error('[Seeder] Error during seeding:', error);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
