const ExcelJS = require('exceljs');

const TEMPLATE_HEADERS = [
  { header: 'questionId', key: 'questionId', width: 16 },
  { header: 'questionText', key: 'questionText', width: 45 },
  { header: 'optionA', key: 'optionA', width: 22 },
  { header: 'optionB', key: 'optionB', width: 22 },
  { header: 'optionC', key: 'optionC', width: 22 },
  { header: 'optionD', key: 'optionD', width: 22 },
  { header: 'correctOption', key: 'correctOption', width: 15 },
  { header: 'explanation', key: 'explanation', width: 50 },
  { header: 'category', key: 'category', width: 24 },
  { header: 'topic', key: 'topic', width: 24 },
  { header: 'subtopic', key: 'subtopic', width: 20 },
  { header: 'difficulty', key: 'difficulty', width: 14 },
  { header: 'companies', key: 'companies', width: 24 },
  { header: 'source', key: 'source', width: 20 },
  { header: 'year', key: 'year', width: 10 }
];

const SAMPLE_ROWS = [
  {
    questionId: 'QA-TW-001',
    questionText: 'A can do a piece of work in 12 days and B can do it in 18 days. If they work together, in how many days will they finish the work?',
    optionA: '7.2 days',
    optionB: '6.5 days',
    optionC: '8.0 days',
    optionD: '5.4 days',
    correctOption: 'A',
    explanation: "A's 1-day work = 1/12. B's 1-day work = 1/18. Together 1 day = 1/12 + 1/18 = 5/36. Total time = 36/5 = 7.2 days.",
    category: 'Quantitative Aptitude',
    topic: 'Time and Work',
    subtopic: 'Combined Work',
    difficulty: 'easy',
    companies: 'TCS, Infosys, Cognizant',
    source: 'TCS NQT 2024',
    year: 2024
  },
  {
    questionId: 'LR-BL-001',
    questionText: 'Pointing to a photograph, Rohit said, "She is the daughter of my grandfather\'s only son." How is the girl related to Rohit?',
    optionA: 'Mother',
    optionB: 'Sister',
    optionC: 'Cousin',
    optionD: 'Aunt',
    correctOption: 'B',
    explanation: "My grandfather's only son means Rohit's father. The daughter of Rohit's father is Rohit's sister.",
    category: 'Logical Reasoning',
    topic: 'Blood Relations',
    subtopic: 'Pointing Type',
    difficulty: 'easy',
    companies: 'Wipro, Accenture',
    source: 'Campus Drive 2024',
    year: 2024
  },
  {
    questionId: 'VA-SC-001',
    questionText: 'Choose the correct form of the verb: "Neither the teacher nor the students ____ present at the seminar yesterday."',
    optionA: 'was',
    optionB: 'were',
    optionC: 'are',
    optionD: 'is',
    correctOption: 'B',
    explanation: 'When subjects are connected by "neither... nor", the verb agrees with the subject closest to it. "Students" is plural, so "were" is correct.',
    category: 'Verbal Ability',
    topic: 'Sentence Correction',
    subtopic: 'Subject-Verb Agreement',
    difficulty: 'medium',
    companies: 'Cognizant, TCS',
    source: 'National Aptitude Pool',
    year: 2025
  }
];

const generateExcelTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Aptitude Questions');
  sheet.columns = TEMPLATE_HEADERS;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' } // Teal brand color
  };

  SAMPLE_ROWS.forEach((row) => sheet.addRow(row));

  return workbook.xlsx.writeBuffer();
};

const generateCsvTemplate = async () => {
  const headers = TEMPLATE_HEADERS.map((h) => h.key).join(',');
  const lines = SAMPLE_ROWS.map((r) => {
    return [
      `"${r.questionId}"`,
      `"${r.questionText.replace(/"/g, '""')}"`,
      `"${r.optionA.replace(/"/g, '""')}"`,
      `"${r.optionB.replace(/"/g, '""')}"`,
      `"${r.optionC.replace(/"/g, '""')}"`,
      `"${r.optionD.replace(/"/g, '""')}"`,
      `"${r.correctOption}"`,
      `"${r.explanation.replace(/"/g, '""')}"`,
      `"${r.category.replace(/"/g, '""')}"`,
      `"${r.topic.replace(/"/g, '""')}"`,
      `"${r.subtopic.replace(/"/g, '""')}"`,
      `"${r.difficulty}"`,
      `"${r.companies}"`,
      `"${r.source}"`,
      r.year
    ].join(',');
  });

  return `${headers}\n${lines.join('\n')}`;
};

module.exports = {
  TEMPLATE_HEADERS,
  SAMPLE_ROWS,
  generateExcelTemplate,
  generateCsvTemplate
};
