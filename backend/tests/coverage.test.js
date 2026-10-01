const { checkCoverage } = require('../src/services/coverage');

describe('checkCoverage', () => {
  it('should return empty array if all must-have requirements are covered', () => {
    const requirements = [
      { id: 'r1', priority: 'must' },
      { id: 'r2', priority: 'must' }
    ];
    const questions = [
      { requirement_ids: ['r1'] },
      { requirement_ids: ['r2'] }
    ];
    expect(checkCoverage(requirements, questions)).toEqual([]);
  });

  it('should return uncovered must-have requirement IDs', () => {
    const requirements = [
      { id: 'r1', priority: 'must' },
      { id: 'r2', priority: 'must' }
    ];
    const questions = [
      { requirement_ids: ['r1'] }
    ];
    expect(checkCoverage(requirements, questions)).toEqual(['r2']);
  });

  it('should ignore nice-to-have requirements', () => {
    const requirements = [
      { id: 'r1', priority: 'must' },
      { id: 'r2', priority: 'nice' }
    ];
    const questions = [
      { requirement_ids: ['r1'] }
    ];
    expect(checkCoverage(requirements, questions)).toEqual([]);
  });
});
