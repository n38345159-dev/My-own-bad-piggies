/* Junkyard Joyride - part catalogue (physics + UI metadata, no drawing) */
(function (JJ) {
  'use strict';

  // rot: 0 = points right, 1 = up, 2 = left, 3 = down
  const PARTS = {
    seat: {
      name: 'Rocco', crashV: 14, kind: 'block', hw: 0.48, hh: 0.48, density: 0.9, friction: 0.7, strength: 1.5,
      unique: true, color: '#e0533d',
      desc: "Rocco's seat. Get Rocco to the goal!"
    },
    wood: {
      name: 'Wood Crate', crashV: 12, kind: 'block', hw: 0.5, hh: 0.5, density: 0.7, friction: 0.7, strength: 1.0,
      color: '#c98a45', desc: 'Light and cheap. Cracks on hard hits.'
    },
    metal: {
      name: 'Steel Frame', crashV: 20, kind: 'block', hw: 0.5, hh: 0.5, density: 2.0, friction: 0.6, strength: 3.0,
      color: '#8aa0b5', desc: 'Heavy and super tough.'
    },
    wheel: {
      name: 'Wheel', crashV: 15, kind: 'wheel', radius: 0.45, density: 1.0, friction: 1.25, strength: 1.6,
      color: '#3b3a44', desc: 'Rolls! Put it under or beside a frame. Engines spin it.'
    },
    caster: {
      name: 'Small Wheel', crashV: 15, kind: 'wheel', radius: 0.28, density: 1.1, friction: 1.0, strength: 1.4,
      color: '#3b3a44', desc: 'A little wheel that hugs the frame above it.'
    },
    engine: {
      name: 'Engine', crashV: 14, kind: 'block', hw: 0.5, hh: 0.5, density: 1.7, friction: 0.6, strength: 1.8,
      activate: 'toggle', rotations: [0, 2], color: '#e2442f',
      desc: 'Powers every wheel on your ride. Tap it to flip direction.'
    },
    spring: {
      name: 'Spring', crashV: 14, kind: 'spring', density: 0.8, friction: 0.6, strength: 1.6,
      color: '#9bd34a', desc: 'Bouncy suspension. Connects the part above to the part below.'
    },
    rocket: {
      name: 'Rocket', crashV: 12, kind: 'block', hw: 0.5, hh: 0.3, density: 0.6, friction: 0.5, strength: 1.4,
      activate: 'toggle', rotations: [0, 1, 2, 3], fuel: 2.5, color: '#ff6b5a',
      desc: 'Huge push where it points. Limited fuel! Tap it to turn.'
    },
    fan: {
      name: 'Fan', crashV: 12, kind: 'block', hw: 0.45, hh: 0.45, density: 0.8, friction: 0.6, strength: 1.4,
      activate: 'toggle', rotations: [0, 1, 2, 3], color: '#3fb7c9',
      desc: 'Gentle push that never runs out. Tap it to turn.'
    },
    balloon: {
      name: 'Balloon', crashV: 12, kind: 'balloon', radius: 0.42, density: 0.12, friction: 0.3, strength: 1,
      activate: 'pop', color: '#ff5d8f', desc: 'Floats up and lifts your ride. Pops one at a time.'
    },
    chute: {
      name: 'Parachute', crashV: 12, kind: 'block', hw: 0.42, hh: 0.36, density: 0.6, friction: 0.6, strength: 1.4,
      activate: 'toggle', color: '#ffb31f', desc: 'Open it to float down slowly. Catches updrafts too!'
    },
    wing: {
      name: 'Wing', crashV: 11, kind: 'wing', hw: 0.5, hh: 0.1, density: 0.5, friction: 0.5, strength: 1.3,
      color: '#e8eef5', desc: 'Catches air so you can glide.'
    },
    tnt: {
      name: 'TNT', crashV: 10, kind: 'block', hw: 0.46, hh: 0.46, density: 0.9, friction: 0.6, strength: 1.0,
      activate: 'trigger', color: '#d8312a', desc: 'Kaboom! Set it off yourself, or it blows on a hard bump.'
    }
  };

  const ORDER = ['seat', 'wood', 'metal', 'wheel', 'caster', 'engine', 'spring', 'rocket', 'fan', 'balloon', 'chute', 'wing', 'tnt'];
  Object.keys(PARTS).forEach((k) => { PARTS[k].id = k; });

  // Order of activation buttons during play
  const GROUP_ORDER = ['engine', 'rocket', 'fan', 'balloon', 'chute', 'tnt'];

  const DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  function isWeldable(t) {
    const d = PARTS[t];
    return !!d && (d.kind === 'block' || d.kind === 'spring' || d.kind === 'wing');
  }

  function nextRot(t, r) {
    const d = PARTS[t];
    if (!d || !d.rotations || d.rotations.length < 2) return 0;
    const i = d.rotations.indexOf(r);
    return d.rotations[(i + 1) % d.rotations.length];
  }

  function defaultRot(t) {
    const d = PARTS[t];
    return d && d.rotations ? d.rotations[0] : 0;
  }

  function groupKey(t, r) {
    const d = PARTS[t];
    if (d && d.rotations && d.rotations.length > 1) return t + ':' + r;
    return t;
  }

  function groupLabel(t, r) {
    const d = PARTS[t];
    if (!d) return t;
    if (t === 'engine') return r === 2 ? 'Reverse' : 'Engine';
    if (t === 'rocket' || t === 'fan') return d.name + ' ' + ['→', '↑', '←', '↓'][r || 0];
    if (t === 'balloon') return 'Pop';
    if (t === 'chute') return 'Chute';
    if (t === 'tnt') return 'Boom';
    return d.name;
  }

  // Design helpers --------------------------------------------------------
  // design = { cells: [{i, j, t, r}] }
  function countParts(design) {
    const out = {};
    for (const c of (design && design.cells) || []) out[c.t] = (out[c.t] || 0) + 1;
    return out;
  }

  function cellAt(design, i, j) {
    for (const c of design.cells) if (c.i === i && c.j === j) return c;
    return null;
  }

  // Find wheels that end up without anything to hold them, springs etc.
  function analyze(design) {
    const map = new Map();
    for (const c of design.cells) map.set(c.i + ',' + c.j, c);
    const get = (i, j) => map.get(i + ',' + j);
    const issues = [];
    let seat = 0, engines = 0, wheels = 0, loose = 0;
    for (const c of design.cells) {
      if (c.t === 'seat') seat++;
      if (c.t === 'engine') engines++;
      const d = PARTS[c.t];
      if (!d) continue;
      if (d.kind === 'wheel') {
        wheels++;
        let held = false;
        for (const [di, dj] of DIR) { const q = get(c.i + di, c.j + dj); if (q && isWeldable(q.t)) held = true; }
        if (!held) { loose++; issues.push({ i: c.i, j: c.j, msg: 'This wheel is not attached to anything' }); }
      } else if (d.kind === 'balloon') {
        let held = false;
        for (const [di, dj] of DIR) { const q = get(c.i + di, c.j + dj); if (q) held = true; }
        if (!held) { loose++; issues.push({ i: c.i, j: c.j, msg: 'This balloon is not tied to anything' }); }
      }
    }
    return { seat, engines, wheels, loose, issues, count: design.cells.length };
  }

  JJ.PARTS = PARTS;
  JJ.PART_ORDER = ORDER;
  JJ.GROUP_ORDER = GROUP_ORDER;
  JJ.DIR = DIR;
  JJ.Parts = { isWeldable, nextRot, defaultRot, groupKey, groupLabel, countParts, cellAt, analyze };
})((globalThis.JJ = globalThis.JJ || {}));
