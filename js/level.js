/* Junkyard Joyride - level helpers: defaults, terrain polygons, bounds */
(function (JJ) {
  'use strict';
  const U = JJ.U;

  const THEMES = ['hills', 'canyon', 'sky', 'snow'];

  const OBJECT_DEFAULTS = {
    platform: { w: 4, h: 0.5, angle: 0, mat: 'wood' },
    ramp: { w: 4, h: 1.5, dir: 1 },
    crate: { w: 1, h: 1 },
    tnt: {},
    ball: { r: 0.5 },
    plank: { w: 4, h: 0.3, angle: 0 },
    seesaw: { w: 6 },
    spikes: { w: 3, angle: 0 },
    bounce: { w: 2, angle: 0 },
    wind: { w: 4, h: 8, force: 25, angle: 90 },
    rock: { r: 1.2 },
    barricade: { w: 1, h: 3 }
  };

  function cleanPts(pts) {
    const out = [];
    for (const p of pts) {
      const x = +p[0], y = +p[1];
      if (!isFinite(x) || !isFinite(y)) continue;
      const last = out[out.length - 1];
      if (last && Math.hypot(last[0] - x, last[1] - y) < 0.05) continue;
      out.push([x, y]);
    }
    if (out.length > 2) {
      const a = out[0], b = out[out.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05) out.pop();
    }
    return out;
  }

  function terrainPoly(piece, bottom) {
    const pts = cleanPts(piece.pts || []);
    if (piece.closed) return pts;
    if (pts.length < 2) return pts;
    const first = pts[0], last = pts[pts.length - 1];
    const b = Math.min(bottom, Math.min.apply(null, pts.map((p) => p[1])) - 2);
    return pts.concat([[last[0], b], [first[0], b]]);
  }

  // Edges that face upward -> get grass / sand on top
  function topEdges(piece, poly) {
    const edges = [];
    if (!piece.closed) {
      const pts = cleanPts(piece.pts || []);
      // one continuous strip
      if (pts.length >= 2) edges.push(pts);
      return edges;
    }
    const cw = U.polyArea(poly) > 0; // clockwise in y-up
    let strip = null;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      // outward normal (right-hand normal is outward for counter-clockwise polygons)
      let nx = dy / len, ny = -dx / len;
      if (cw) { nx = -nx; ny = -ny; }
      if (ny > 0.35) {
        if (!strip) { strip = [a]; edges.push(strip); }
        strip.push(b);
      } else strip = null;
    }
    // merge wrap-around strip
    if (edges.length > 1) {
      const firstS = edges[0], lastS = edges[edges.length - 1];
      const lp = lastS[lastS.length - 1], fp = firstS[0];
      if (lp[0] === fp[0] && lp[1] === fp[1]) {
        edges[0] = lastS.concat(firstS.slice(1));
        edges.pop();
      }
    }
    return edges;
  }

  function withDefaults(o) {
    return Object.assign({}, OBJECT_DEFAULTS[o.type] || {}, o);
  }

  // Compile a level definition into the data the sim + renderer use
  function compile(def) {
    const L = def;
    const pieces = (L.terrain || []).filter((p) => p && p.pts && p.pts.length >= 2);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const grow = (x, y) => {
      if (!isFinite(x) || !isFinite(y)) return;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    };
    for (const p of pieces) for (const q of p.pts) grow(q[0], q[1]);
    const b = L.build || { x: 0, y: 0, w: 3, h: 2 };
    grow(b.x, b.y); grow(b.x + b.w, b.y + b.h);
    if (L.goal) grow(L.goal.x, L.goal.y);
    if (L.cap) grow(L.cap.x, L.cap.y);
    const objects = (L.objects || []).map(withDefaults);
    for (const o of objects) grow(o.x, o.y);
    if (!isFinite(minX)) { minX = -10; maxX = 10; minY = -2; maxY = 6; }
    const bottom = minY - 14;
    const polys = pieces.map((p) => terrainPoly(p, bottom));
    const tops = pieces.map((p, i) => topEdges(p, polys[i]));
    const killY = typeof L.killY === 'number' ? L.killY : minY - 12;
    return {
      def: L,
      id: L.id,
      theme: THEMES.indexOf(L.theme) >= 0 ? L.theme : 'hills',
      build: b,
      goal: L.goal || null,
      cap: L.cap || null,
      objects,
      pieces,
      polys,
      tops,
      bottom,
      killY,
      bounds: { minX: minX - 8, maxX: maxX + 8, minY: killY, maxY: maxY + 12 },
      gravity: typeof L.gravity === 'number' && L.gravity > 0 ? L.gravity : 1,
      sandbox: !!L.sandbox,
      seed: U.seedFrom(String(L.id || L.name || 'level'))
    };
  }

  // Star objectives -------------------------------------------------------
  function star3Text(s) {
    if (!s) return 'Collect nothing... just have fun';
    switch (s.type) {
      case 'time': return 'Finish in ' + s.value + ' seconds';
      case 'intact': return "Don't break anything";
      case 'noPart': return 'No ' + ((JJ.PARTS[s.part] && JJ.PARTS[s.part].name) || s.part) + ' allowed';
      case 'maxParts': return 'Use ' + s.value + ' parts or fewer';
      default: return 'Bonus';
    }
  }

  function evalStar3(s, result, design) {
    if (!s) return true;
    switch (s.type) {
      case 'time': return result.time <= s.value + 1e-6;
      case 'intact': return result.broken === 0;
      case 'noPart': return !design.cells.some((c) => c.t === s.part);
      case 'maxParts': return design.cells.length <= s.value;
      default: return true;
    }
  }

  JJ.Level = { compile, terrainPoly, topEdges, cleanPts, withDefaults, OBJECT_DEFAULTS, THEMES, star3Text, evalStar3 };
})((globalThis.JJ = globalThis.JJ || {}));
