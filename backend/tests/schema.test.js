const { KitSchema } = require('../src/schemas/kit');

describe('KitSchema Validation', () => {
  it('should validate a correct kit object', () => {
    const validKit = {
      source: {
        company: "Acme Corp",
        company_url: "https://acme.com",
        role: "Software Engineer",
        location: "Remote",
        jd_chars: 1000,
        researched_at: new Date().toISOString(),
        pages_used: ["https://acme.com/about"]
      },
      company_brief: {
        summary: "A great company",
        what_they_do: "They make things",
        sources: ["https://acme.com/about"]
      },
      role: {
        title: "Software Engineer",
        seniority: "Mid",
        responsibilities: ["Coding"],
        requirements: [
          { id: "r1", text: "React experience", kind: "technical", priority: "must" }
        ]
      },
      questions: [
        { id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "What is React?", answer_outline: "A library", difficulty: 2 }
      ],
      flashcards: [
        { id: "f1", front: "What is React?", back: "A library", requirement_ids: ["r1"] }
      ],
      schedule: {
        days_available: 1,
        days: [
          { day: 1, focus: "Technical Focus", question_ids: ["q1"], minutes: 20 }
        ]
      },
      coverage: {
        uncovered_requirement_ids: [],
        passes: 1
      }
    };
    
    const result = KitSchema.safeParse(validKit);
    expect(result.success).toBe(true);
  });

  it('should reject float minutes in schedule', () => {
    const invalidKit = {
      source: { company: "", company_url: "", role: "", location: "", jd_chars: 0, researched_at: "", pages_used: [] },
      company_brief: { summary: "", what_they_do: "", sources: [] },
      role: { title: "", seniority: "", responsibilities: [], requirements: [] },
      questions: [],
      flashcards: [],
      schedule: {
        days_available: 1,
        days: [
          { day: 1, focus: "Focus", question_ids: [], minutes: 20.5 } // Float!
        ]
      },
      coverage: { uncovered_requirement_ids: [], passes: 1 }
    };
    
    const result = KitSchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
  });
});
