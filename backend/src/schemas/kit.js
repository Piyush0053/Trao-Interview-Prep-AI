const { z } = require('zod');

const FieldMetaSchema = z.object({
  origin: z.enum(["generated", "edited", "manual"]),
  pinned: z.boolean(),
  genVersion: z.number().optional()
});

const SectionMetaSchema = z.object({
  pinned: z.boolean().optional(),
  genVersion: z.number().optional()
});

const RequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
  _meta: FieldMetaSchema.optional()
});

const QuestionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
  _meta: FieldMetaSchema.optional()
});

const FlashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
  _meta: FieldMetaSchema.optional()
});

const ScheduleDaySchema = z.object({
  day: z.number().int(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int()
});

const KitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number(),
    researched_at: z.string(),
    pages_used: z.array(z.string())
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
    _meta: SectionMetaSchema.optional()
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(RequirementSchema)
  }),
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: z.object({
    days_available: z.number().int(),
    days: z.array(ScheduleDaySchema),
    _meta: SectionMetaSchema.optional()
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int()
  })
});

module.exports = {
  KitSchema,
  RequirementSchema,
  QuestionSchema,
  FlashcardSchema,
  ScheduleDaySchema
};
