const { z } = require('zod');

const optionSchema = z.object({
  optionId: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1, 'Option text cannot be empty')
});

const createQuestionSchema = z.object({
  questionId: z.string().min(2, 'Question ID is required').toUpperCase(),
  questionText: z.string().min(5, 'Question text must be at least 5 characters long'),
  options: z.array(optionSchema).min(2, 'At least two options are required'),
  correctOption: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(5, 'Step-by-step explanation must be at least 5 characters long'),
  category: z.string().min(2, 'Category is required'),
  topic: z.string().min(2, 'Topic is required'),
  subtopic: z.string().optional().default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  companies: z.array(z.string()).optional().default([]),
  source: z.string().optional().default('Campus Placement'),
  year: z.number().int().min(1990).max(2100).optional().default(new Date().getFullYear()),
  isActive: z.boolean().optional().default(true)
});

const updateQuestionSchema = createQuestionSchema.partial().omit({ questionId: true });

// Spreadsheet Row Validation Schema
const spreadsheetRowSchema = z.object({
  questionId: z.string().min(2, 'Question ID is required').trim().toUpperCase(),
  questionText: z.string().min(5, 'Question text must be at least 5 characters long').trim(),
  optionA: z.string().min(1, 'Option A is required').trim(),
  optionB: z.string().min(1, 'Option B is required').trim(),
  optionC: z.string().min(1, 'Option C is required').trim(),
  optionD: z.string().min(1, 'Option D is required').trim(),
  correctOption: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Correct option must be one of A, B, C, or D' })
  }),
  explanation: z.string().min(5, 'Explanation must be at least 5 characters long').trim(),
  category: z.string().min(2, 'Category is required').trim(),
  topic: z.string().min(2, 'Topic is required').trim(),
  subtopic: z.string().optional().default(''),
  difficulty: z
    .string()
    .toLowerCase()
    .refine((v) => ['easy', 'medium', 'hard'].includes(v), {
      message: 'Difficulty must be easy, medium, or hard'
    })
    .default('medium'),
  companies: z.string().optional().default(''),
  source: z.string().optional().default('Spreadsheet Import'),
  year: z.union([z.number(), z.string()]).optional().default(new Date().getFullYear())
});

module.exports = {
  createQuestionSchema,
  updateQuestionSchema,
  spreadsheetRowSchema
};
