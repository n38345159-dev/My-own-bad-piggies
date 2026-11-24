// Headless check that every built-in level can be beaten with a known design.
// Run: node tools/test-levels.js [levelId]
const JJ = require('./load');
require('./solutions');
const { design, SOL } = globalThis.JJ_SOLUTIONS;

function runLevel(L0, sol, maxT, verbose) {
  const L = JJ.Level.compile(JJ.U.clone(L0));
  const d = design(sol.rows);
  // check inventory
  const counts = JJ.Parts.countParts(d);
  const over = Object.keys(counts).filter((k) => (L0.parts[k] || 0) < counts[k]);
  const fits = d.cells.every((c) => c.i < L.build.w && c.j < L.build.h);
  const sim = new JJ.Sim(L, d, {});
  const m = {};
  const trace = [];
  let t = 0;
  for (let s = 0; s < maxT * 120; s++) {
    t = s / 120;
    sol.ctl(sim, t, m);
    sim.step(1 / 120);
    if (s % 60 === 0) { const p = sim.focus(); trace.push(t.toFixed(0) + ':' + p.x.toFixed(0) + ',' + p.y.toFixed(0)); }
    if (sim.status.won && t > sim.status.winTime + 0.2) break;
    if (sim.status.fell) break;
  }
  const st = sim.status;
  const res = { time: st.winTime, broken: st.broken };
  const star3 = st.won ? JJ.Level.evalStar3(L0.star3, res, d) : false;
  const line = [
    L0.id.padEnd(6), (L0.name || '').padEnd(18),
    st.won ? 'WIN ' + st.winTime.toFixed(1) + 's' : (st.fell ? 'FELL' : 'no win'),
    'cap:' + (st.collected ? 'Y' : 'n'), 'broken:' + st.broken, 'star3:' + (star3 ? 'Y' : 'n') + ' (' + JJ.Level.star3Text(L0.star3) + ')',
    over.length ? 'OVER-INVENTORY:' + over.join(',') : '', fits ? '' : 'DOESNT-FIT'
  ].join('  ');
  console.log(line);
  if (verbose || !st.won) console.log('      trace', trace.join(' '));
  return st.won;
}

const only = process.argv[2];
const verbose = process.argv.includes('-v');
let ok = 0, n = 0;
for (const L of JJ.LEVELS) {
  if (only && only !== '-v' && L.id !== only) continue;
  const sol = SOL[L.id];
  if (!sol) { console.log(L.id, 'no solution'); continue; }
  n++;
  if (runLevel(L, sol, 60, verbose)) ok++;
  if (process.argv.includes('--alt') && sol.alt) {
    for (const rows of sol.alt) { process.stdout.write('   alt ' + JSON.stringify(rows) + ' -> '); runLevel(L, Object.assign({}, sol, { rows }), 60, false); }
  }
}
console.log(`\n${ok}/${n} levels beaten`);
process.exitCode = ok === n ? 0 : 1;
