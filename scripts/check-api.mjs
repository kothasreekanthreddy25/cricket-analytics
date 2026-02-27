const res = await fetch('http://localhost:3000/api/predictions/performance');
const d = await res.json();
const r = d.records[0];
console.log('Sample record:');
console.log('  matchDate:', r.matchDate);
console.log('  stage:', r.stage);
console.log('  group:', r.group);
console.log('  venue:', r.venue);
const stages = [...new Set(d.records.map(x => x.stage))];
console.log('\nStages breakdown:');
stages.forEach(s => {
  const matches = d.records.filter(x => x.stage === s);
  const won = matches.filter(x => x.status === 'won').length;
  const lost = matches.filter(x => x.status === 'lost').length;
  const pending = matches.filter(x => x.status === 'pending').length;
  console.log(`  [${s}]: ${matches.length} matches  W:${won} L:${lost} Pending:${pending}`);
});
