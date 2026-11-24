/* Junkyard Joyride - drawing of parts, Rocco, props, goal and collectible.
   Every draw function works in a local, y-down frame where 1 unit = 1 metre (one grid cell). */
(function (JJ) {
  'use strict';
  const U = JJ.U;
  const INK = '#2a1d14';
  const LW = 0.06;

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillStroke(ctx, fill, lw) {
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = lw || LW; ctx.strokeStyle = INK; ctx.stroke();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function text(ctx, str, x, y, size, color, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.01, 0.01);
    ctx.font = '900 ' + (size * 100) + 'px "Lilita One", "Arial Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineWidth = size * 22; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, 0, 0); }
    ctx.fillStyle = color; ctx.fillText(str, 0, 0);
    ctx.restore();
  }
  function nail(ctx, x, y, r) { circle(ctx, x, y, r || 0.04); ctx.fillStyle = '#5e4128'; ctx.fill(); }
  function rivet(ctx, x, y) {
    circle(ctx, x, y, 0.055); ctx.fillStyle = '#dfe7ee'; ctx.fill();
    ctx.lineWidth = 0.025; ctx.strokeStyle = '#3a4652'; ctx.stroke();
  }

  // ------------------------------------------------------------ parts
  const draw = {};

  draw.wood = function (ctx) {
    rr(ctx, -0.48, -0.48, 0.96, 0.96, 0.07);
    fillStroke(ctx, '#cf9150');
    rr(ctx, -0.36, -0.36, 0.72, 0.72, 0.03);
    ctx.fillStyle = '#b0712f'; ctx.fill();
    ctx.strokeStyle = 'rgba(80,45,15,0.45)'; ctx.lineWidth = 0.025;
    line(ctx, -0.36, -0.12, 0.36, -0.12);
    line(ctx, -0.36, 0.12, 0.36, 0.12);
    // diagonal brace
    ctx.save();
    ctx.beginPath(); ctx.rect(-0.36, -0.36, 0.72, 0.72); ctx.clip();
    ctx.rotate(-Math.PI / 4);
    rr(ctx, -0.6, -0.085, 1.2, 0.17, 0.02);
    fillStroke(ctx, '#e0a865', 0.035);
    ctx.restore();
    nail(ctx, -0.42, -0.42); nail(ctx, 0.42, -0.42); nail(ctx, -0.42, 0.42); nail(ctx, 0.42, 0.42);
  };

  draw.metal = function (ctx) {
    rr(ctx, -0.48, -0.48, 0.96, 0.96, 0.06);
    const g = ctx.createLinearGradient(0, -0.5, 0, 0.5);
    g.addColorStop(0, '#b4c5d4'); g.addColorStop(1, '#71859a');
    fillStroke(ctx, g);
    rr(ctx, -0.32, -0.32, 0.64, 0.64, 0.03);
    ctx.fillStyle = '#44525f'; ctx.fill();
    ctx.lineWidth = 0.03; ctx.strokeStyle = INK; ctx.stroke();
    // X brace
    ctx.save();
    ctx.beginPath(); ctx.rect(-0.32, -0.32, 0.64, 0.64); ctx.clip();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = INK; ctx.lineWidth = 0.17;
    line(ctx, -0.34, -0.34, 0.34, 0.34); line(ctx, 0.34, -0.34, -0.34, 0.34);
    ctx.strokeStyle = '#93a7b9'; ctx.lineWidth = 0.11;
    line(ctx, -0.34, -0.34, 0.34, 0.34); line(ctx, 0.34, -0.34, -0.34, 0.34);
    ctx.restore();
    rivet(ctx, -0.4, -0.4); rivet(ctx, 0.4, -0.4); rivet(ctx, -0.4, 0.4); rivet(ctx, 0.4, 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-0.42, -0.45, 0.84, 0.04);
  };

  draw.wheel = function (ctx, st, r) {
    r = r || 0.45;
    circle(ctx, 0, 0, r);
    fillStroke(ctx, '#34333c');
    // tread
    ctx.fillStyle = '#4a4955';
    const n = r > 0.35 ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.save(); ctx.rotate(a);
      ctx.fillRect(r - 0.07, -0.03, 0.06, 0.06);
      ctx.restore();
    }
    circle(ctx, 0, 0, r * 0.6);
    fillStroke(ctx, '#f2c23a', 0.04);
    ctx.strokeStyle = '#c28d14'; ctx.lineWidth = r * 0.1;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      line(ctx, 0, 0, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
    }
    circle(ctx, 0, 0, r * 0.2);
    fillStroke(ctx, '#fff1c4', 0.035);
    circle(ctx, -r * 0.3, -r * 0.3, r * 0.08);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
  };
  draw.caster = function (ctx, st) { draw.wheel(ctx, st, 0.28); };

  draw.engine = function (ctx, st) {
    const on = st && st.active;
    const t = (st && st.t) || 0;
    const back = st && st.rot === 2 ? 1 : -1; // exhaust side
    const shake = on ? Math.sin(t * 70) * 0.012 : 0;
    ctx.save();
    ctx.translate(0, shake);
    // exhaust pipe
    ctx.save();
    ctx.scale(back, 1);
    rr(ctx, 0.28, -0.62, 0.14, 0.34, 0.03);
    fillStroke(ctx, '#7d8791', 0.04);
    rr(ctx, 0.25, -0.66, 0.2, 0.07, 0.02);
    fillStroke(ctx, '#5d6670', 0.03);
    ctx.restore();
    // pistons
    for (let k = 0; k < 2; k++) {
      const off = on ? Math.sin(t * 38 + k * Math.PI) * 0.06 : 0;
      rr(ctx, -0.3 + k * 0.32, -0.56 + off, 0.24, 0.2, 0.04);
      fillStroke(ctx, '#d6dde3', 0.04);
    }
    // block
    rr(ctx, -0.48, -0.4, 0.96, 0.88, 0.08);
    const g = ctx.createLinearGradient(0, -0.4, 0, 0.48);
    g.addColorStop(0, '#f05a3f'); g.addColorStop(1, '#b8301f');
    fillStroke(ctx, g);
    // grille
    rr(ctx, -0.34, -0.22, 0.68, 0.36, 0.04);
    ctx.fillStyle = '#2f2f36'; ctx.fill();
    ctx.strokeStyle = '#8b8f99'; ctx.lineWidth = 0.035;
    for (let i = 0; i < 4; i++) line(ctx, -0.3, -0.15 + i * 0.075, 0.3, -0.15 + i * 0.075);
    // direction arrow plate
    rr(ctx, -0.2, 0.2, 0.4, 0.2, 0.05);
    ctx.fillStyle = '#ffd34a'; ctx.fill();
    ctx.save();
    ctx.translate(0, 0.3);
    ctx.scale(st && st.rot === 2 ? -1 : 1, 1);
    ctx.beginPath();
    ctx.moveTo(-0.12, -0.035); ctx.lineTo(0.03, -0.035); ctx.lineTo(0.03, -0.075); ctx.lineTo(0.13, 0);
    ctx.lineTo(0.03, 0.075); ctx.lineTo(0.03, 0.035); ctx.lineTo(-0.12, 0.035); ctx.closePath();
    ctx.fillStyle = INK; ctx.fill();
    ctx.restore();
    ctx.restore();
  };

  // spring: drawn in two halves. In build mode coil fills the cell.
  draw.spring = function (ctx, st) {
    const top = st && st.coilTop != null ? st.coilTop : -0.5;
    const bot = 0;
    // plate (bottom half)
    rr(ctx, -0.44, 0.02, 0.88, 0.44, 0.06);
    fillStroke(ctx, '#7fb83a');
    rr(ctx, -0.3, 0.14, 0.6, 0.2, 0.04);
    ctx.fillStyle = '#5f9126'; ctx.fill();
    drawCoil(ctx, 0, top, 0, bot, 0.3);
  };
  function drawCoil(ctx, x1, y1, x2, y2, w) {
    const n = 6;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = [];
    for (let i = 0; i <= n * 2; i++) {
      const t = i / (n * 2);
      const x = U.lerp(x1, x2, t) + (i === 0 || i === n * 2 ? 0 : (i % 2 ? -w : w));
      pts.push([x, U.lerp(y1, y2, t)]);
    }
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = INK; ctx.lineWidth = 0.13; ctx.stroke();
    ctx.strokeStyle = '#c8d3dc'; ctx.lineWidth = 0.07; ctx.stroke();
    ctx.restore();
  }

  draw.rocket = function (ctx, st) {
    // points to +x
    const flame = st ? st.flame || 0 : 0;
    const t = (st && st.t) || 0;
    if (flame > 0.05) {
      const len = (0.55 + Math.sin(t * 50) * 0.08 + Math.random() * 0.1) * flame;
      ctx.save();
      ctx.translate(-0.5, 0);
      const g = ctx.createLinearGradient(0, 0, -len - 0.3, 0);
      g.addColorStop(0, '#fff6c2'); g.addColorStop(0.35, '#ffc433'); g.addColorStop(0.8, '#ff5a1f'); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.beginPath();
      ctx.moveTo(0, -0.16); ctx.quadraticCurveTo(-len * 0.6, -0.22, -len - 0.3, 0); ctx.quadraticCurveTo(-len * 0.6, 0.22, 0, 0.16);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    }
    // fins
    ctx.beginPath(); ctx.moveTo(-0.2, -0.2); ctx.lineTo(-0.44, -0.38); ctx.lineTo(-0.46, -0.18); ctx.closePath();
    fillStroke(ctx, '#d8312a', 0.045);
    ctx.beginPath(); ctx.moveTo(-0.2, 0.2); ctx.lineTo(-0.44, 0.38); ctx.lineTo(-0.46, 0.18); ctx.closePath();
    fillStroke(ctx, '#d8312a', 0.045);
    // nozzle
    rr(ctx, -0.52, -0.13, 0.12, 0.26, 0.03);
    fillStroke(ctx, '#55555e', 0.04);
    // body
    rr(ctx, -0.42, -0.22, 0.66, 0.44, 0.08);
    fillStroke(ctx, '#f6f3ea');
    ctx.save(); rr(ctx, -0.42, -0.22, 0.66, 0.44, 0.08); ctx.clip();
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(-0.3, -0.25, 0.1, 0.5); ctx.fillRect(-0.06, -0.25, 0.1, 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-0.42, 0.08, 0.7, 0.16);
    ctx.restore();
    rr(ctx, -0.42, -0.22, 0.66, 0.44, 0.08);
    ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    // nose
    ctx.beginPath();
    ctx.moveTo(0.22, -0.22); ctx.quadraticCurveTo(0.52, -0.12, 0.5, 0); ctx.quadraticCurveTo(0.52, 0.12, 0.22, 0.22); ctx.closePath();
    fillStroke(ctx, '#ff5a4a');
    // fuel gauge dot
    if (st && st.fuelFrac != null) {
      ctx.fillStyle = st.fuelFrac > 0 ? '#5be36b' : '#555';
      circle(ctx, 0.1, -0.08, 0.05); ctx.fill();
    }
  };

  draw.fan = function (ctx, st) {
    const t = (st && st.t) || 0;
    const spin = st ? st.spinAngle || 0 : 0;
    const on = st && st.spin > 0.2;
    // housing
    rr(ctx, -0.45, -0.45, 0.9, 0.9, 0.14);
    fillStroke(ctx, '#3fb7c9');
    circle(ctx, 0, 0, 0.36);
    fillStroke(ctx, '#1d3b44', 0.045);
    // blades
    ctx.save();
    ctx.rotate(spin);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0.16, 0, 0.15, 0.07, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = on ? 'rgba(230,246,250,0.55)' : '#e6f6fa'; ctx.fill();
    }
    ctx.restore();
    circle(ctx, 0, 0, 0.08);
    fillStroke(ctx, '#ffd34a', 0.035);
    // grille bars
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.02;
    line(ctx, -0.34, 0, 0.34, 0); line(ctx, 0, -0.34, 0, 0.34);
    // push direction chevron (towards +x)
    ctx.beginPath();
    ctx.moveTo(0.36, -0.14); ctx.lineTo(0.5, 0); ctx.lineTo(0.36, 0.14); ctx.closePath();
    fillStroke(ctx, '#ffd34a', 0.035);
    // airflow
    if (on) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.04; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const o = ((t * 3 + i / 3) % 1);
        const x = -0.55 - o * 0.7;
        ctx.globalAlpha = 1 - o;
        line(ctx, x, -0.25 + i * 0.25, x - 0.25, -0.25 + i * 0.25);
      }
      ctx.globalAlpha = 1;
    }
  };

  const BALLOON_COLORS = ['#ff5d8f', '#5db5ff', '#ffd23f', '#7be07b', '#c38bff'];
  draw.balloon = function (ctx, st) {
    const col = BALLOON_COLORS[((st && st.id) || 0) % BALLOON_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(-0.05, 0.43); ctx.lineTo(0.05, 0.43); ctx.lineTo(0, 0.36); ctx.closePath();
    fillStroke(ctx, col, 0.03);
    ctx.beginPath();
    ctx.ellipse(0, -0.02, 0.4, 0.43, 0, 0, Math.PI * 2);
    fillStroke(ctx, col);
    ctx.beginPath();
    ctx.ellipse(-0.14, -0.18, 0.08, 0.14, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
  };

  draw.chute = function (ctx, st) {
    rr(ctx, -0.42, -0.36, 0.84, 0.72, 0.12);
    fillStroke(ctx, '#c9a15a');
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 0.06;
    line(ctx, -0.42, -0.08, 0.42, -0.08);
    line(ctx, 0.12, -0.36, 0.12, 0.36);
    circle(ctx, -0.18, 0.15, 0.09);
    ctx.lineWidth = 0.04; ctx.strokeStyle = '#ffb31f'; ctx.stroke();
    if (!(st && st.chuteOpen > 0.05)) {
      // folded canopy peeking out
      ctx.beginPath(); ctx.moveTo(-0.3, -0.36); ctx.quadraticCurveTo(0, -0.6, 0.3, -0.36); ctx.closePath();
      fillStroke(ctx, '#ffb31f', 0.04);
    }
  };

  // world-space canopy (drawn in y-up world coords)
  function drawCanopy(ctx, x, y, dir, open, t) {
    if (open < 0.05) return;
    const d = 1.7 * open;
    const cx = x + Math.cos(dir) * d, cy = y + Math.sin(dir) * d;
    const w = 1.25 * open + 0.2, h = 0.85 * open + 0.1;
    // lines
    ctx.save();
    ctx.strokeStyle = 'rgba(42,29,20,0.8)'; ctx.lineWidth = 0.035;
    const px = -Math.sin(dir), py = Math.cos(dir);
    for (const k of [-1, -0.35, 0.35, 1]) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx + px * w * k, cy + py * w * k); ctx.stroke();
    }
    ctx.translate(cx, cy);
    ctx.rotate(dir - Math.PI / 2);
    const wob = Math.sin(t * 6) * 0.04;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.bezierCurveTo(-w, h * 1.3 + wob, w, h * 1.3 - wob, w, 0);
    for (let i = 0; i < 4; i++) {
      const x1 = w - (i + 0.5) * (2 * w / 4), x2 = w - (i + 1) * (2 * w / 4);
      ctx.quadraticCurveTo(x1, -0.15, x2, 0);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffb31f'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#fff4dc';
    for (let i = 0; i < 4; i += 2) ctx.fillRect(-w + i * (2 * w / 4) + w / 4, -0.2, w / 2, h * 1.6);
    ctx.restore();
    ctx.lineWidth = 0.06; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }

  draw.wing = function (ctx) {
    ctx.beginPath();
    ctx.moveTo(-0.52, 0.02);
    ctx.quadraticCurveTo(-0.1, -0.12, 0.3, -0.12);
    ctx.quadraticCurveTo(0.54, -0.1, 0.54, 0.0);
    ctx.quadraticCurveTo(0.52, 0.1, 0.3, 0.1);
    ctx.quadraticCurveTo(-0.1, 0.1, -0.52, 0.02);
    ctx.closePath();
    fillStroke(ctx, '#eef3f8');
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#3f8fd9'; ctx.fillRect(-0.1, -0.2, 0.14, 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(-0.6, 0.03, 1.2, 0.1);
    ctx.restore();
  };

  draw.tnt = function (ctx, st) {
    const t = (st && st.t) || 0;
    // fuse
    ctx.beginPath(); ctx.moveTo(0.12, -0.44); ctx.quadraticCurveTo(0.2, -0.62, 0.32, -0.58);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.05; ctx.stroke();
    if (st && st.armed) {
      circle(ctx, 0.33, -0.6, 0.06 + Math.random() * 0.04);
      ctx.fillStyle = '#ffe14a'; ctx.fill();
    }
    rr(ctx, -0.46, -0.46, 0.92, 0.92, 0.06);
    fillStroke(ctx, '#d8312a');
    ctx.fillStyle = '#a81f1a';
    ctx.fillRect(-0.44, -0.3, 0.88, 0.08); ctx.fillRect(-0.44, 0.22, 0.88, 0.08);
    rr(ctx, -0.34, -0.16, 0.68, 0.32, 0.04);
    ctx.fillStyle = '#fff4dc'; ctx.fill();
    text(ctx, 'TNT', 0, 0.01, 0.26, '#d8312a');
    void t;
  };

  // ---------------------------------------------------------------- Rocco
  // expression: 'happy' | 'excited' | 'scared' | 'dizzy' | 'cheer' | 'sleepy'
  draw.seat = function (ctx, st) {
    st = st || {};
    const t = st.t || 0;
    const expr = st.expr || 'happy';
    const big = st.bigHead ? 1.45 : 1;
    const look = st.look || 0; // -1..1
    // tail behind seat
    ctx.save();
    const wag = Math.sin(t * (expr === 'cheer' ? 14 : 3)) * 0.12;
    ctx.translate(-0.32, 0.12);
    ctx.rotate(-0.5 + wag);
    ctx.beginPath();
    ctx.ellipse(-0.3, 0, 0.36, 0.15, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#8d8f99', 0.05);
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#3a3a44';
    for (let i = 0; i < 3; i++) ctx.fillRect(-0.62 + i * 0.2, -0.2, 0.09, 0.4);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(-0.3, 0, 0.36, 0.15, 0, 0, Math.PI * 2);
    ctx.lineWidth = 0.05; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    // seat back + base
    rr(ctx, -0.48, -0.3, 0.2, 0.78, 0.08);
    fillStroke(ctx, '#e0533d');
    // body
    ctx.beginPath();
    ctx.ellipse(0.04, 0.08, 0.27, 0.26, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#8d8f99');
    ctx.beginPath();
    ctx.ellipse(0.08, 0.12, 0.15, 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d9d5cc'; ctx.fill();
    rr(ctx, -0.42, 0.18, 0.9, 0.3, 0.08);
    fillStroke(ctx, '#e0533d');
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-0.38, 0.36, 0.82, 0.07);
    // paws on the dash
    const pawY = expr === 'cheer' ? -0.25 + Math.sin(t * 14) * 0.05 : 0.15;
    for (const px of [0.18, 0.36]) {
      ctx.beginPath(); ctx.ellipse(px, pawY, 0.075, 0.06, 0, 0, Math.PI * 2);
      fillStroke(ctx, '#6c6e78', 0.035);
    }
    // ---- head
    ctx.save();
    ctx.translate(0.06, -0.3);
    ctx.scale(big, big);
    ctx.translate(0, -0.05 * (big - 1));
    const bob = expr === 'cheer' ? Math.abs(Math.sin(t * 9)) * -0.05 : Math.sin(t * 2) * 0.01;
    ctx.translate(0, bob);
    // ears
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.12, -0.2); ctx.lineTo(s * 0.26, -0.36); ctx.lineTo(s * 0.3, -0.14); ctx.closePath();
      fillStroke(ctx, '#8d8f99', 0.045);
      ctx.beginPath();
      ctx.moveTo(s * 0.16, -0.2); ctx.lineTo(s * 0.25, -0.3); ctx.lineTo(s * 0.27, -0.17); ctx.closePath();
      ctx.fillStyle = '#3a3a44'; ctx.fill();
    }
    // head shape
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.32, 0.27, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#9b9da7');
    // cheek fluff
    ctx.beginPath();
    ctx.moveTo(-0.3, 0.02); ctx.lineTo(-0.38, 0.1); ctx.lineTo(-0.27, 0.12); ctx.closePath();
    ctx.moveTo(0.3, 0.02); ctx.lineTo(0.38, 0.1); ctx.lineTo(0.27, 0.12); ctx.closePath();
    ctx.fillStyle = '#9b9da7'; ctx.fill();
    // white face patch
    ctx.beginPath();
    ctx.ellipse(0, 0.06, 0.25, 0.17, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ecebe6'; ctx.fill();
    // mask
    ctx.beginPath();
    ctx.moveTo(-0.31, -0.02);
    ctx.quadraticCurveTo(-0.2, -0.13, -0.04, -0.05);
    ctx.quadraticCurveTo(0, -0.03, 0.04, -0.05);
    ctx.quadraticCurveTo(0.2, -0.13, 0.31, -0.02);
    ctx.quadraticCurveTo(0.24, 0.08, 0.1, 0.05);
    ctx.quadraticCurveTo(0, 0.03, -0.1, 0.05);
    ctx.quadraticCurveTo(-0.24, 0.08, -0.31, -0.02);
    ctx.closePath();
    ctx.fillStyle = '#2b2b33'; ctx.fill();
    // eyes
    const lx = U.clamp(look, -1, 1) * 0.025;
    for (const s of [-1, 1]) {
      const ex = s * 0.13, ey = -0.02;
      if (expr === 'dizzy') {
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(t * 8 * s);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.025;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.4) { const r = a * 0.008; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.stroke(); ctx.restore();
      } else if (expr === 'cheer') {
        ctx.beginPath(); ctx.arc(ex, ey + 0.02, 0.05, Math.PI * 1.1, Math.PI * 1.9);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.035; ctx.lineCap = 'round'; ctx.stroke();
      } else {
        const er = expr === 'scared' ? 0.075 : 0.062;
        circle(ctx, ex, ey, er); ctx.fillStyle = '#fff'; ctx.fill();
        const pr = expr === 'scared' ? 0.025 : 0.034;
        circle(ctx, ex + lx, ey + 0.004, pr); ctx.fillStyle = '#1b1b22'; ctx.fill();
        circle(ctx, ex + lx - 0.012, ey - 0.012, 0.011); ctx.fillStyle = '#fff'; ctx.fill();
        if (expr === 'sleepy') {
          ctx.fillStyle = '#2b2b33';
          ctx.fillRect(ex - 0.08, ey - 0.08, 0.16, 0.075);
        }
      }
    }
    // nose
    ctx.beginPath(); ctx.ellipse(0, 0.08, 0.045, 0.032, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1b1b22'; ctx.fill();
    // mouth
    ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 0.025; ctx.lineCap = 'round';
    ctx.beginPath();
    if (expr === 'scared') {
      ctx.ellipse(0, 0.17, 0.035, 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = '#5a1f1f'; ctx.fill();
    } else if (expr === 'excited' || expr === 'cheer') {
      ctx.moveTo(-0.08, 0.13); ctx.quadraticCurveTo(0, 0.25, 0.08, 0.13); ctx.closePath();
      ctx.fillStyle = '#7a2626'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(-0.02, 0.13, 0.04, 0.03); ctx.fillStyle = '#fff'; ctx.fill();
    } else if (expr === 'dizzy') {
      ctx.moveTo(-0.07, 0.16); ctx.quadraticCurveTo(-0.035, 0.12, 0, 0.16); ctx.quadraticCurveTo(0.035, 0.2, 0.07, 0.16); ctx.stroke();
    } else {
      ctx.moveTo(-0.06, 0.13); ctx.quadraticCurveTo(0, 0.18, 0.06, 0.13); ctx.stroke();
    }
    // goggles on forehead
    ctx.fillStyle = '#7a4b25';
    ctx.beginPath(); ctx.rect(-0.31, -0.2, 0.62, 0.06); ctx.fill();
    for (const s of [-1, 1]) {
      circle(ctx, s * 0.11, -0.18, 0.085);
      fillStroke(ctx, '#d9a63a', 0.04);
      circle(ctx, s * 0.11, -0.18, 0.055);
      ctx.fillStyle = '#7fd3ff'; ctx.fill();
      circle(ctx, s * 0.11 - 0.02, -0.2, 0.017);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- props
  const prop = {};
  prop.crate = function (ctx, o) {
    const w = o.w, h = o.h;
    rr(ctx, -w / 2, -h / 2, w, h, 0.06);
    fillStroke(ctx, '#b8793b');
    ctx.save(); rr(ctx, -w / 2, -h / 2, w, h, 0.06); ctx.clip();
    ctx.strokeStyle = '#8d5a28'; ctx.lineWidth = 0.13;
    line(ctx, -w / 2, -h / 2, w / 2, h / 2); line(ctx, w / 2, -h / 2, -w / 2, h / 2);
    ctx.restore();
    rr(ctx, -w / 2 + 0.1, -h / 2 + 0.1, w - 0.2, h - 0.2, 0.03);
    ctx.lineWidth = 0.04; ctx.strokeStyle = 'rgba(60,35,10,0.6)'; ctx.stroke();
    rr(ctx, -w / 2, -h / 2, w, h, 0.06);
    ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
  };
  prop.tnt = function (ctx) {
    rr(ctx, -0.4, -0.5, 0.8, 1.0, 0.18);
    fillStroke(ctx, '#d8312a');
    ctx.fillStyle = '#8f1d18';
    ctx.fillRect(-0.4, -0.32, 0.8, 0.07); ctx.fillRect(-0.4, 0.25, 0.8, 0.07);
    ctx.beginPath(); ctx.moveTo(0, -0.17); ctx.lineTo(0.2, 0.15); ctx.lineTo(-0.2, 0.15); ctx.closePath();
    ctx.fillStyle = '#ffd34a'; ctx.fill(); ctx.lineWidth = 0.03; ctx.strokeStyle = INK; ctx.stroke();
    text(ctx, '!', 0, 0.04, 0.22, INK);
  };
  prop.ball = function (ctx, o) {
    const r = o.r;
    const cols = ['#ff5d5d', '#fff4dc', '#5db5ff', '#fff4dc', '#ffd23f', '#fff4dc'];
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2);
      ctx.closePath(); ctx.fillStyle = cols[i]; ctx.fill();
    }
    circle(ctx, 0, 0, r); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    circle(ctx, 0, 0, r * 0.18); fillStroke(ctx, '#fff', 0.03);
  };
  prop.plank = function (ctx, o) {
    const w = o.w, h = o.h || 0.3;
    rr(ctx, -w / 2, -h / 2, w, h, Math.min(0.08, h / 2));
    fillStroke(ctx, '#d39a5a');
    ctx.strokeStyle = 'rgba(110,60,20,0.45)'; ctx.lineWidth = 0.025;
    line(ctx, -w / 2 + 0.2, -h * 0.1, w / 2 - 0.4, -h * 0.1);
    line(ctx, -w / 2 + 0.6, h * 0.2, w / 2 - 0.2, h * 0.2);
    nail(ctx, -w / 2 + 0.15, 0, 0.035); nail(ctx, w / 2 - 0.15, 0, 0.035);
  };
  prop.seesawBase = function (ctx) {
    ctx.beginPath(); ctx.moveTo(-0.7, 0); ctx.lineTo(0.7, 0); ctx.lineTo(0, -1); ctx.closePath();
    fillStroke(ctx, '#7d8a97');
    circle(ctx, 0, -1, 0.12); fillStroke(ctx, '#ffd34a', 0.04);
  };
  prop.platform = function (ctx, o) {
    const w = o.w, h = o.h;
    if (o.mat === 'metal') {
      rr(ctx, -w / 2, -h / 2, w, h, 0.05);
      fillStroke(ctx, '#8d9cab');
      ctx.save(); rr(ctx, -w / 2, -h / 2, w, h, 0.05); ctx.clip();
      ctx.strokeStyle = '#5c6b79'; ctx.lineWidth = 0.08;
      const n = Math.max(1, Math.round(w / Math.max(0.6, h)));
      for (let i = 0; i < n; i++) {
        const x0 = -w / 2 + (i * w) / n, x1 = x0 + w / n;
        line(ctx, x0, h / 2, (x0 + x1) / 2, -h / 2); line(ctx, (x0 + x1) / 2, -h / 2, x1, h / 2);
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-w / 2 + 0.05, -h / 2 + 0.03, w - 0.1, 0.05);
    } else if (o.mat === 'stone') {
      rr(ctx, -w / 2, -h / 2, w, h, 0.12);
      fillStroke(ctx, '#a39b92');
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(-w / 2 + 0.1, h / 2 - 0.2, w - 0.2, 0.12);
    } else {
      rr(ctx, -w / 2, -h / 2, w, h, 0.06);
      fillStroke(ctx, '#c98a45');
      ctx.strokeStyle = 'rgba(90,50,15,0.5)'; ctx.lineWidth = 0.03;
      const n = Math.max(1, Math.floor(w));
      for (let i = 1; i < n; i++) line(ctx, -w / 2 + (i * w) / n, -h / 2, -w / 2 + (i * w) / n, h / 2);
      if (h > 0.6) for (let y = -h / 2 + 0.5; y < h / 2; y += 0.5) line(ctx, -w / 2, y, w / 2, y);
      for (let i = 0; i <= n; i++) { const x = -w / 2 + (i * w) / n; nail(ctx, U.clamp(x, -w / 2 + 0.12, w / 2 - 0.12), -h / 2 + 0.12, 0.035); }
    }
  };
  prop.ramp = function (ctx, o) {
    const w = o.w / 2, h = o.h / 2, s = o.dir === -1 ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(-w, h); ctx.lineTo(w, h); ctx.lineTo(s * w, -h); ctx.closePath();
    fillStroke(ctx, '#c98a45');
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(90,50,15,0.45)'; ctx.lineWidth = 0.03;
    for (let x = -w + 0.5; x < w; x += 0.5) line(ctx, x, -h, x, h);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-s * w, h); ctx.lineTo(s * w, -h);
    ctx.lineWidth = 0.14; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 0.08; ctx.strokeStyle = '#e8b06d'; ctx.stroke();
  };
  prop.barricade = function (ctx, o) {
    const w = o.w, h = o.h;
    const n = Math.max(2, Math.round(w / 0.36));
    for (let i = 0; i < n; i++) {
      const x0 = -w / 2 + (i * w) / n;
      rr(ctx, x0 + 0.02, -h / 2 + (i % 2 ? 0.06 : 0), w / n - 0.04, h - (i % 2 ? 0.06 : 0), 0.05);
      fillStroke(ctx, i % 2 ? '#c98a45' : '#b87a3a', 0.045);
    }
    // cross boards
    for (const yy of [-h * 0.28, h * 0.22]) {
      ctx.save(); ctx.translate(0, yy); ctx.rotate(yy < 0 ? -0.18 : 0.18);
      rr(ctx, -w / 2 - 0.08, -0.11, w + 0.16, 0.22, 0.04);
      fillStroke(ctx, '#d9a05e', 0.045);
      ctx.restore();
    }
    // hazard sign
    ctx.save(); ctx.translate(0, -h * 0.02);
    ctx.beginPath(); ctx.moveTo(0, -0.26); ctx.lineTo(0.26, 0.2); ctx.lineTo(-0.26, 0.2); ctx.closePath();
    fillStroke(ctx, '#ffd34a', 0.04);
    text(ctx, '!', 0, 0.04, 0.24, INK);
    ctx.restore();
  };
  prop.rock = function (ctx, o) {
    const r = o.r;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr2 = r * (0.88 + ((i * 37) % 10) / 60);
      ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
    }
    ctx.closePath();
    fillStroke(ctx, '#9a948c');
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.04;
    line(ctx, -r * 0.3, -r * 0.2, r * 0.1, r * 0.1);
  };
  prop.spikes = function (ctx, o) {
    const w = o.w;
    rr(ctx, -w / 2, 0.05, w, 0.2, 0.04);
    fillStroke(ctx, '#4a4f58');
    const n = Math.max(1, Math.round(w / 0.4));
    for (let i = 0; i < n; i++) {
      const x0 = -w / 2 + (i * w) / n, x1 = x0 + w / n;
      ctx.beginPath(); ctx.moveTo(x0, 0.06); ctx.lineTo((x0 + x1) / 2, -0.28); ctx.lineTo(x1, 0.06); ctx.closePath();
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#f1f4f7'); g.addColorStop(1, '#9aa5b1');
      fillStroke(ctx, g, 0.035);
    }
  };
  prop.bounce = function (ctx, o, st) {
    const w = o.w;
    const sq = st && st.squash ? st.squash : 0;
    rr(ctx, -w / 2, 0.05, w, 0.15, 0.04);
    fillStroke(ctx, '#4a4f58', 0.04);
    for (let x = -w / 2 + 0.3; x <= w / 2 - 0.29; x += Math.max(0.5, (w - 0.6) / 3)) drawCoil(ctx, x, -0.12 + sq, x, 0.05, 0.06);
    rr(ctx, -w / 2, -0.24 + sq, w, 0.14, 0.07);
    fillStroke(ctx, '#ff4f6d', 0.05);
    ctx.fillStyle = '#fff4dc';
    for (let x = -w / 2 + 0.15; x < w / 2 - 0.1; x += 0.5) ctx.fillRect(x, -0.22 + sq, 0.2, 0.1);
  };

  // ------------------------------------------------------------- goal & cap
  // world space (y-up). gy0 = ground below goal or null
  function drawGoal(ctx, g, t, groundY, won) {
    const R = JJ.PHYS.GOAL_R;
    ctx.save();
    // glow
    const pulse = 0.5 + Math.sin(t * 3) * 0.5;
    const grd = ctx.createRadialGradient(g.x, g.y, 0.2, g.x, g.y, R + 0.6);
    grd.addColorStop(0, 'rgba(255,230,120,' + (0.35 + pulse * 0.15) + ')');
    grd.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = grd;
    circle(ctx, g.x, g.y, R + 0.6); ctx.fill();
    if (groundY != null && g.y - groundY < 4) {
      // flag pole
      const px = g.x + R + 0.3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 0.18; line(ctx, px, groundY, px, g.y + R + 1.2);
      ctx.strokeStyle = '#e8edf2'; ctx.lineWidth = 0.1; line(ctx, px, groundY, px, g.y + R + 1.2);
      // waving checkered flag
      const fw = 1.4, fh = 0.9, top = g.y + R + 1.15;
      const cols = 6, rows = 4;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x0 = px + (i / cols) * fw, x1 = px + ((i + 1) / cols) * fw;
          const w0 = Math.sin(t * 5 - i * 0.8) * 0.08 * (i / cols), w1 = Math.sin(t * 5 - (i + 1) * 0.8) * 0.08 * ((i + 1) / cols);
          const y0 = top - (j / rows) * fh, y1 = top - ((j + 1) / rows) * fh;
          ctx.beginPath();
          ctx.moveTo(x0, y0 + w0); ctx.lineTo(x1, y0 + w1); ctx.lineTo(x1, y1 + w1); ctx.lineTo(x0, y1 + w0); ctx.closePath();
          ctx.fillStyle = (i + j) % 2 ? '#1f1f26' : '#fffdf5'; ctx.fill();
        }
      }
      ctx.beginPath();
      ctx.moveTo(px, top); ctx.lineTo(px + fw, top + Math.sin(t * 5 - cols * 0.8) * 0.08);
      ctx.lineTo(px + fw, top - fh + Math.sin(t * 5 - cols * 0.8) * 0.08); ctx.lineTo(px, top - fh);
      ctx.closePath(); ctx.lineWidth = 0.05; ctx.strokeStyle = INK; ctx.stroke();
      // trash can full of snacks
      ctx.save();
      ctx.translate(g.x - 0.1, groundY);
      ctx.scale(1, -1);
      drawSnackCan(ctx, t);
      ctx.restore();
    }
    // ring
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(t * 0.8);
    ctx.setLineDash([0.35, 0.22]);
    ctx.lineWidth = 0.12; ctx.strokeStyle = won ? '#7dff8a' : '#ffd34a';
    circle(ctx, 0, 0, R); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.restore();
  }

  function drawSnackCan(ctx, t) {
    // y-down local, ground at 0
    // goodies
    ctx.save();
    ctx.translate(0, -1.25);
    // pizza slice
    ctx.save(); ctx.rotate(-0.4 + Math.sin(t * 2) * 0.03);
    ctx.beginPath(); ctx.moveTo(-0.35, -0.05); ctx.lineTo(0.1, -0.5); ctx.lineTo(0.2, 0.0); ctx.closePath();
    fillStroke(ctx, '#ffcf5a', 0.04);
    circle(ctx, -0.02, -0.17, 0.05); ctx.fillStyle = '#d8312a'; ctx.fill();
    circle(ctx, 0.08, -0.3, 0.04); ctx.fill();
    ctx.restore();
    // fish bone
    ctx.save(); ctx.translate(0.35, -0.12); ctx.rotate(0.5);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.05;
    line(ctx, -0.25, 0, 0.2, 0);
    for (let i = -2; i <= 1; i++) { line(ctx, i * 0.08, -0.08, i * 0.08, 0.08); }
    ctx.beginPath(); ctx.moveTo(0.2, 0); ctx.lineTo(0.32, -0.08); ctx.lineTo(0.32, 0.08); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
    // apple core
    ctx.save(); ctx.translate(-0.05, -0.15);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.1, 0.16, 0, 0, Math.PI * 2); fillStroke(ctx, '#fff4dc', 0.035);
    ctx.beginPath(); ctx.ellipse(0, -0.17, 0.1, 0.05, 0, 0, Math.PI * 2); fillStroke(ctx, '#ff5d5d', 0.035);
    ctx.restore();
    ctx.restore();
    // can body
    ctx.beginPath();
    ctx.moveTo(-0.55, -1.25); ctx.lineTo(0.55, -1.25); ctx.lineTo(0.45, 0); ctx.lineTo(-0.45, 0); ctx.closePath();
    const g = ctx.createLinearGradient(-0.5, 0, 0.5, 0);
    g.addColorStop(0, '#7f8d99'); g.addColorStop(0.5, '#b7c4cf'); g.addColorStop(1, '#6f7d89');
    fillStroke(ctx, g);
    ctx.strokeStyle = 'rgba(40,50,60,0.5)'; ctx.lineWidth = 0.04;
    for (let i = -1; i <= 1; i++) line(ctx, i * 0.25, -1.1, i * 0.22, -0.12);
    rr(ctx, -0.62, -1.38, 1.24, 0.16, 0.06);
    fillStroke(ctx, '#95a3af');
  }

  function drawCap(ctx, x, y, t, collected) {
    if (collected) return;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2.5) * 0.12);
    // sparkle glow
    const grd = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1.0);
    grd.addColorStop(0, 'rgba(255,240,150,0.55)'); grd.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = grd; circle(ctx, 0, 0, 1.0); ctx.fill();
    ctx.scale(Math.max(0.15, Math.abs(Math.cos(t * 2))), 1);
    ctx.beginPath();
    const n = 21;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const r = i % 2 ? 0.46 : 0.52;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(-0.5, 0.5, 0.5, -0.5);
    g.addColorStop(0, '#c98b0e'); g.addColorStop(0.5, '#ffe27a'); g.addColorStop(1, '#e0a419');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 0.05; ctx.strokeStyle = INK; ctx.stroke();
    circle(ctx, 0, 0, 0.33);
    ctx.fillStyle = '#ffd34a'; ctx.fill();
    ctx.lineWidth = 0.03; ctx.strokeStyle = '#a66d08'; ctx.stroke();
    // star emblem (y-up so draw directly)
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 ? 0.1 : 0.22;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fillStyle = '#fff6cf'; ctx.fill();
    ctx.restore();
    // twinkles
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + i * 2.1;
      const s = (Math.sin(t * 4 + i * 1.7) + 1) * 0.06;
      drawTwinkle(ctx, x + Math.cos(a) * 0.75, y + Math.sin(a) * 0.75, s);
    }
  }

  function drawTwinkle(ctx, x, y, s) {
    if (s <= 0.005) return;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 2); ctx.lineTo(x + s * 0.5, y + s * 0.5); ctx.lineTo(x + s * 2, y);
    ctx.lineTo(x + s * 0.5, y - s * 0.5); ctx.lineTo(x, y - s * 2); ctx.lineTo(x - s * 0.5, y - s * 0.5);
    ctx.lineTo(x - s * 2, y); ctx.lineTo(x - s * 0.5, y + s * 0.5); ctx.closePath();
    ctx.fillStyle = '#fffbe0'; ctx.fill();
  }

  // ------------------------------------------------------------ icons
  const iconCache = {};
  function partIcon(type, rot, size) {
    size = size || 64;
    const key = type + ':' + (rot || 0) + ':' + size;
    if (iconCache[key]) return iconCache[key];
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const s = size / (type === 'seat' ? 1.55 : 1.25);
    ctx.translate(size / 2, size / 2 + (type === 'seat' ? size * 0.1 : 0));
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    drawPartLocal(ctx, type, { rot: rot || 0, t: 0, id: 0, expr: 'happy' }, rot || 0);
    iconCache[key] = c;
    return c;
  }

  // draw a part in the local y-down frame, applying its rotation for directional parts
  function drawPartLocal(ctx, type, st, rot) {
    const fn = draw[type];
    if (!fn) return;
    if ((type === 'rocket' || type === 'fan') && rot) {
      ctx.save();
      ctx.rotate(-rot * Math.PI / 2);
      fn(ctx, st);
      ctx.restore();
    } else fn(ctx, st);
  }

  JJ.Art = {
    INK, draw, prop, rr, circle, line, text, fillStroke, drawCoil, drawCanopy, drawGoal, drawCap,
    drawTwinkle, partIcon, drawPartLocal, BALLOON_COLORS
  };
})((globalThis.JJ = globalThis.JJ || {}));
