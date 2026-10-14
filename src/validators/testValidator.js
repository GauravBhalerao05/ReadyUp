const { z } = require('zod');

const startPracticeSchema = z.object({
  category: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  company: z.string().optional(),
  count: z.number().int().min(3).max(50).optional().default(10)
});

const submitAnswerItemSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  selectedOption: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
  timeSpentSeconds: z.number().min(0).optional().default(0),
  markedForReview: z.boolean().optional().default(false)
});

const submitTestAttemptSchema = z.object({
  answers: z.array(submitAnswerItemSchema).min(1, 'At least one question submission required')
});

const createMockTestSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional().default(''),
  durationMinutes: z.number().int().min(5).max(300).default(60),
  totalMarks: z.number().int().min(1).default(50),
  passingMarks: z.number().int().min(1).default(25),
  negativeMarking: z.number().min(0).max(2).default(0),
  type: z.enum(['company_mock', 'topic_test', 'diagnostic']).default('company_mock'),
  company: z.string().optional().default(''),
  categories: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  questions: z.array(z.string()).optional().default([]),
  instructions: z.array(z.string()).optional().default([])
});

module.exports = {
  startPracticeSchema,
  submitTestAttemptSchema,
  createMockTestSchema
};
