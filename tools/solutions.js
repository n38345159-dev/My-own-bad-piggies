// Known solutions for the built-in levels (used by tools/test-levels.js and tools/film.js).
(function () {
const CH = {
  S: ['seat', 0], W: ['wood', 0], M: ['metal', 0], O: ['wheel', 0], o: ['caster', 0], E: ['engine', 0], e: ['engine', 2],
  P: ['spring', 0], R: ['rocket', 0], U: ['rocket', 1], L: ['rocket', 2], F: ['fan', 0], H: ['fan', 1], J: ['fan', 2],
  B: ['balloon', 0], C: ['chute', 0], T: ['tnt', 0], N: ['wing', 0], K: ['fan', 3], D: ['rocket', 3]
};
function design(rows) {
  const cells = []; const h = rows.length;
  rows.forEach((row, k) => { for (let i = 0; i < row.length; i++) { const c = CH[row[i]]; if (c) cells.push({ i, j: h - 1 - k, t: c[0], r: c[1] }); } });
  return { cells };
}
const on = (...keys) => (sim, t, m) => { if (!m.started) { m.started = true; keys.forEach((k) => sim.toggleGroup(k)); } };
const SOL = {
  'w1-1': { rows: ['SWE', 'O.O'], ctl: on('engine:0') },
  'w1-2': { rows: ['SW', 'OO'], ctl: () => {} },
  'w1-3': { rows: ['WSEE', 'OOOO'], ctl: on('engine:0') },
  'w1-4': { rows: ['BBBB', 'FSWW', 'O..O'], ctl: (sim, t, m) => {
      const p = sim.focus();
      const n = sim.parts.filter((q) => q.alive && q.type === 'balloon').length;
      if (!m.f && p.y > 11) { m.f = 1; sim.toggleGroup('fan:0'); }
      if (m.f && n === 4 && p.y > 12.5) sim.toggleGroup('balloon');
      if (n === 3 && p.x > 12.5) sim.toggleGroup('balloon');
      if (m.f === 1 && p.x > 15.5) { m.f = 2; sim.toggleGroup('fan:0'); }
      if (n > 0 && n < 3 && p.x > 16 && t > (m.lp || 0) + 0.5) { m.lp = t; sim.toggleGroup('balloon'); }
    } },
  'w1-5': { rows: ['RSWE', 'O.RO'], alt: [['RSWRE', 'O...O'], ['.SWE.', 'ORRO.'], ['SWE', 'O.O']], ctl: (sim, t, m) => {
      if (!m.s) { m.s = 1; sim.toggleGroup('engine:0'); }
      const p = sim.focus();
      if (p.x > 10 && !m.r) { m.r = 1; sim.toggleGroup('rocket:0'); }
    } },
  'w1-6': { rows: ['WSWE', 'P..P', 'O..O'], alt: [['WSWE', 'O..O'], ['MSME', 'O..O'], ['WSWEW', 'PP.PP', 'OO.OO']], ctl: on('engine:0') },
  'w2-1': { rows: ['WSEE', 'O..O', ], ctl: on('engine:0') },
  'w2-2': { rows: ['SEMWT', 'O.O..'], alt: [['WSEMT', 'O..O.']], ctl: (sim, t, m) => {
      if (!m.s) { m.s = 1; sim.toggleGroup('engine:0'); }
      const p = sim.focus();
      const tnt = sim.parts.find((q) => q.type === 'tnt');
      if (tnt && tnt.alive && tnt.body.getPosition().x > 22.9 && !m.b) { m.b = 1; sim.toggleGroup('tnt'); }
    } },
  'w2-3': { rows: ['WSE', 'P.P', 'O.O'], alt: [['WSE', 'O.O'], ['WSWE', 'O..O']], ctl: on('engine:0') },
  'w2-4': { rows: ['.C..', 'WSWE', 'O..O'], alt: [['WSWE', 'O..O']], ctl: (sim, t, m) => {
      if (!m.s) { m.s = 1; sim.toggleGroup('engine:0'); }
      const p = sim.focus();
      if (p.x > 16 && !m.c) { m.c = 1; if (sim.groupMap.chute) sim.toggleGroup('chute'); }
      if (m.c === 1 && p.y < 2.2) { m.c = 2; if (sim.groupMap.chute) sim.toggleGroup('chute'); }
    } },
  'w2-5': { rows: ['UUUU', 'WSEW', 'O..O'], alt: [['BBB', 'FSW', 'O.O'], ['UUU', 'SEW', 'O.O']], ctl: (sim, t, m) => {
      if (!m.s) { m.s = 1; sim.toggleGroup('engine:0'); if (sim.groupMap['fan:0']) sim.toggleGroup('fan:0'); }
      const p = sim.focus();
      const g = sim.groupMap['rocket:1'];
      if (g) {
        if (!m.r && p.x > 10) { m.r = 1; sim.toggleGroup('rocket:1'); }
        if (m.r === 1 && p.y > 12) { m.r = 2; sim.toggleGroup('rocket:1'); }
        if (m.r === 2 && p.x < 24.5 && p.y < 10.5) { m.r = 3; sim.toggleGroup('rocket:1'); }
        if (m.r === 3 && p.y > 12) { m.r = 4; sim.toggleGroup('rocket:1'); }
      }
      const n = sim.parts.filter((q) => q.alive && q.type === 'balloon').length;
      if (n && p.x > 40.5 && t > (m.lp || 0) + 0.5) { m.lp = t; sim.toggleGroup('balloon'); }
    } },
  'w3-1': { rows: ['BBBB.', 'FSEK.', 'O..O.'], ctl: (sim, t, m) => {
      const p = sim.focus();
      const n = sim.parts.filter((q) => q.alive && q.type === 'balloon').length;
      if (!m.s) { m.s = 1; sim.toggleGroup('fan:0'); }
      const target = 8.2;
      const down = sim.groupMap['fan:3'];
      if (!m.land && down && ((p.y > target && !down.active) || (p.y < target - 0.6 && down.active))) sim.toggleGroup('fan:3');
      if (p.x > 34 && !m.land) { m.land = 1; sim.toggleGroup('fan:0'); if (down.active) sim.toggleGroup('fan:3'); sim.toggleGroup('engine:0'); }
      if (m.land && n > 0 && t > (m.lp || 0) + 0.5) { m.lp = t; sim.toggleGroup('balloon'); }
    } },
  'w3-2': { rows: ['NNNN', 'WSWE', 'O..O'], ctl: on('engine:0') },
  'w3-3': { rows: ['.C..', 'FSWE', 'O..O'], ctl: (sim, t, m) => {
      if (!m.s) { m.s = 1; sim.toggleGroup('engine:0'); }
      const p = sim.focus();
      if (p.x > 9 && !m.c) { m.c = 1; sim.toggleGroup('chute'); }
      if (p.y > 18 && !m.f) { m.f = 1; sim.toggleGroup('fan:0'); }
      if (m.c === 1 && p.x > 21 && p.y < 17.5) { m.c = 2; sim.toggleGroup('chute'); }
    } },
  'w3-4': { rows: ['WSWE', 'P..P', 'O..O'], ctl: on('engine:0') },
  'w3-5': { rows: ['NNN', 'WSEE', 'P..P', 'O..O'], alt: [['NNN.', 'WSWE', 'O..O'], ['....', 'WSEE', 'O..O']], ctl: on('engine:0') }
};

  globalThis.JJ_SOLUTIONS = { CH, design, SOL };
})();
