jest.mock('uuid', () => ({ v4: () => '12345678-1234-1234-1234-1234567890ab' }));
const { buildSchedule } = require('../src/services/schedule');

describe('buildSchedule', () => {
  it('should return exactly the requested number of days', () => {
    const requirements = [{ id: 'r1', text: 'Req 1', priority: 'must' }];
    const questions = [
      { id: 'q1', requirement_ids: ['r1'], difficulty: 2, category: 'technical' }
    ];
    
    const result = buildSchedule(requirements, questions, 5);
    expect(result.scheduleDays.length).toBe(5);
    expect(result.scheduleDays[0].day).toBe(1);
    expect(result.scheduleDays[4].day).toBe(5);
  });

  it('should inject fallback questions for missing must-have requirements', () => {
    const requirements = [
      { id: 'r1', text: 'Req 1', priority: 'must' },
      { id: 'r2', text: 'Req 2', priority: 'must' }
    ];
    const questions = [
      { id: 'q1', requirement_ids: ['r1'], difficulty: 2, category: 'technical' }
    ];
    
    const result = buildSchedule(requirements, questions, 2);
    
    // It should have injected a fallback for r2
    const injected = result.updatedQuestions.find(q => q.requirement_ids.includes('r2'));
    expect(injected).toBeDefined();
    expect(injected.difficulty).toBe(3);
    
    // Check it's in the schedule
    const allScheduledIds = new Set(result.scheduleDays.flatMap(d => d.question_ids));
    expect(allScheduledIds.has(injected.id)).toBe(true);
  });

  it('should allocate all minutes as integers', () => {
    const requirements = [{ id: 'r1', text: 'Req 1', priority: 'must' }];
    const questions = [
      { id: 'q1', requirement_ids: ['r1'], difficulty: 1, category: 'technical' },
      { id: 'q2', requirement_ids: ['r1'], difficulty: 2, category: 'technical' },
      { id: 'q3', requirement_ids: ['r1'], difficulty: 3, category: 'technical' }
    ];
    
    const result = buildSchedule(requirements, questions, 3);
    for (const day of result.scheduleDays) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it('should handle 0 questions gracefully', () => {
    const requirements = [{ id: 'r1', text: 'Req 1', priority: 'nice' }];
    const questions = [];
    
    const result = buildSchedule(requirements, questions, 3);
    expect(result.scheduleDays.length).toBe(3);
    expect(result.scheduleDays[0].minutes).toBe(0);
    expect(result.scheduleDays[0].question_ids).toEqual([]);
    expect(result.updatedQuestions).toEqual([]);
  });
});
