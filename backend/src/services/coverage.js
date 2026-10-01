function checkCoverage(requirements, questions) {
  const covered = new Set(questions.flatMap(q => q.requirement_ids || []));
  return requirements.filter(r => r.priority === 'must' && !covered.has(r.id)).map(r => r.id);
}

module.exports = { checkCoverage };
