/* Junkyard Joyride - renderer: camera, parallax scenery, terrain, contraptions, particles */
(function (JJ) {
  'use strict';
  const U = JJ.U, Art = JJ.Art;
  const INK = Art.INK;

  const THEMES = {
    hills: {
      sky: ['#56aeea', '#9fd8fa', '#e2f5ff'], sun: '#fff4c4', sunGlow: 'rgba(255,240,180,0.45)',
      far: '#a3c6df', farDark: '#8db3cf', mid: '#82c65c', midTop: '#9bd872', cloud: '#ffffff', cloudShade: '#d8ebf7',
      ground: '#8f5d2e', groundSpeck: ['#7a4c22', '#a36d3a', '#6b411d'], top: '#5cb83a', topLight: '#8ade5f', topDark: '#2f6d1f', tuft: '#3f8f2a'
    },
    canyon: {
      sky: ['#ff8f57', '#ffb978', '#ffe4b0'], sun: '#fff1c7', sunGlow: 'rgba(255,236,190,0.55)',
      far: '#eaa47a', farDark: '#df9467', mid: '#cf7a48', midTop: '#e08f5a', cloud: '#fff1df', cloudShade: '#ffd9b8',
      ground: '#c4683a', groundSpeck: ['#b05a30', '#d8804c', '#a14f29'], top: '#f0bf76', topLight: '#ffd99c', topDark: '#a5612f', tuft: '#9a7a35', stripes: true
    },
    sky: {
      sky: ['#26205e', '#6a4aa6', '#f292b2'], sun: '#fff9e8', sunGlow: 'rgba(255,240,255,0.35)', moon: true, stars: true,
      far: '#9d86d6', farDark: '#8c74c7', mid: '#c4b2ee', midTop: '#d8cbf6', cloud: '#efe6ff', cloudShade: '#cdbdf0',
      ground: '#6c5a96', groundSpeck: ['#5d4c86', '#7d6aa6', '#544377'], top: '#5fd394', topLight: '#94f0bd', topDark: '#2b7a59', tuft: '#3ca775', islands: true
    },
    snow: {
      sky: ['#7cc2ee', '#bfe3f9', '#f0faff'], sun: '#ffffff', sunGlow: 'rgba(255,255,255,0.5)',
      far: '#c9dff0', farDark: '#b3cfe6', mid: '#e4f0f9', midTop: '#ffffff', cloud: '#ffffff', cloudShade: '#dbe9f4',
      ground: '#8fa4ba', groundSpeck: ['#7f94aa', '#a2b6ca', '#71869c'], top: '#ffffff', topLight: '#ffffff', topDark: '#9fb6cc', tuft: '#d5e5f2'
    }
  };

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cam = { x: 0, y: 0, zoom: 50 };
      this.shake = 0;
      this.shakeX = 0; this.shakeY = 0;
      this.particles = [];
      this.patterns = {};
      this.scenes = {};
      this.levelCache = null;
      this.quality = 1;
      this.trail = [];
      this.resize();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5) * (this.quality < 1 ? 0.75 : 1);
      const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
      this.dpr = dpr;
      this.W = w; this.H = h;
      const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
    }

    // ------------------------------------------------------- transforms
    worldToScreen(x, y) {
      const c = this.cam;
      return { x: (x - c.x) * c.zoom + this.W / 2, y: (c.y - y) * c.zoom + this.H / 2 };
    }
    screenToWorld(sx, sy) {
      const c = this.cam;
      return { x: (sx - this.W / 2) / c.zoom + c.x, y: c.y - (sy - this.H / 2) / c.zoom };
    }
    setWorld() {
      const c = this.cam, d = this.dpr, s = c.zoom * d;
      this.ctx.setTransform(s, 0, 0, -s, (this.W / 2 - c.x * c.zoom + this.shakeX) * d, (this.H / 2 + c.y * c.zoom + this.shakeY) * d);
    }
    setScreen() { this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); }

    addShake(a) { this.shake = Math.min(1.4, this.shake + a); }

    // ------------------------------------------------------- scenery
    scene(theme, seed) {
      const key = theme + ':' + seed;
      if (this.scenes[key]) return this.scenes[key];
      const r = U.rng(seed || 1);
      const S = { clouds: [], far: [], mid: [], stars: [], junk: [], decor: [] };
      for (let i = 0; i < 9; i++) S.clouds.push({ x: r() * 200, y: 0.12 + r() * 0.3, s: 0.6 + r() * 0.9, sp: 0.4 + r() * 0.8, blobs: 3 + ((r() * 3) | 0) });
      for (let i = 0; i < 14; i++) S.far.push({ x: i * 18 + r() * 8, w: 14 + r() * 14, h: 6 + r() * 10, kind: (r() * 4) | 0 });
      for (let i = 0; i < 16; i++) S.mid.push({ x: i * 14 + r() * 6, w: 12 + r() * 12, h: 3 + r() * 6, deco: r() });
      for (let i = 0; i < 90; i++) S.stars.push({ x: r(), y: r() * 0.55, s: 0.6 + r() * 1.6, p: r() * 6 });
      for (let i = 0; i < 12; i++) S.junk.push({ x: i * 21 + r() * 10, kind: (r() * 5) | 0, s: 0.8 + r() * 0.6, a: (r() - 0.5) * 0.5 });
      this.scenes[key] = S;
      return S;
    }

    drawBackground(themeName, seed, t) {
      const ctx = this.ctx, W = this.W, H = this.H;
      const T = THEMES[themeName] || THEMES.hills;
      const S = this.scene(themeName, seed);
      const cam = this.cam;
      this.setScreen();
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, T.sky[0]); g.addColorStop(0.55, T.sky[1]); g.addColorStop(1, T.sky[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const unit = Math.max(9, Math.min(W, H) / 55);
      if (T.stars) {
        for (const s of S.stars) {
          const a = 0.4 + Math.sin(t * 1.5 + s.p) * 0.35;
          ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
          const x = ((s.x * W * 1.3 - cam.x * 0.5) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
          ctx.fillRect(x, s.y * H, s.s, s.s);
        }
      }
      // sun / moon
      const sx = W * 0.8 - cam.x * 0.6 % 1, sy = H * 0.2;
      const sr = unit * 4.2;
      const sg = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 3);
      sg.addColorStop(0, T.sunGlow); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fillStyle = T.sun; ctx.fill();
      if (T.moon) {
        ctx.beginPath(); ctx.arc(sx + sr * 0.45, sy - sr * 0.2, sr * 0.85, 0, Math.PI * 2); ctx.fillStyle = T.sky[0]; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
      }
      const horizon = H * 0.62 + U.clamp(cam.y * cam.zoom * 0.08, -H * 0.25, H * 0.25);
      // clouds
      for (const c of S.clouds) {
        const span = W + 400;
        let x = (c.x * 12 + t * c.sp * 6 - cam.x * cam.zoom * 0.05) % span;
        if (x < 0) x += span;
        x -= 200;
        const y = c.y * H + U.clamp(cam.y * cam.zoom * 0.03, -60, 60);
        this.cloud(ctx, x, y, unit * 2.2 * c.s, c.blobs, T);
      }
      // far layer
      ctx.save();
      const farOff = -cam.x * cam.zoom * 0.12;
      const period = 18 * 14 * unit * 0.5;
      ctx.fillStyle = T.far;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let k = -1; k <= Math.ceil(W / period) + 1; k++) {
        for (const f of S.far) {
          const x = ((farOff % period) + period) % period + k * period - period + f.x * unit * 0.5;
          if (x > W + f.w * unit || x + f.w * unit < -f.w * unit) continue;
          this.farShape(ctx, themeName, x, horizon, f, unit * 0.5);
        }
      }
      ctx.fill();
      // junk silhouettes on the far layer (hills only)
      if (themeName === 'hills') {
        ctx.fillStyle = T.farDark;
        const per2 = 12 * 21 * unit * 0.55;
        for (let k = -1; k <= Math.ceil(W / per2) + 1; k++) {
          for (const j of S.junk) {
            const x = ((farOff * 1.1 % per2) + per2) % per2 + k * per2 - per2 + j.x * unit * 0.55;
            if (x < -80 || x > W + 80) continue;
            this.junkShape(ctx, x, horizon - unit * 1.2, j, unit * 0.55);
          }
        }
      }
      ctx.restore();
      // mid layer
      const midOff = -cam.x * cam.zoom * 0.28;
      const mper = 16 * 14 * unit * 0.6;
      const midY = horizon + unit * 3 + U.clamp(cam.y * cam.zoom * 0.05, -H * 0.15, H * 0.2);
      ctx.fillStyle = T.mid;
      ctx.beginPath();
      ctx.moveTo(-10, H);
      for (let x = -10; x <= W + 10; x += 8) {
        const wx = (x - midOff) / (unit * 0.6);
        let y = 0;
        for (const m of S.mid) {
          const mx = ((wx - m.x) % 224 + 224) % 224;
          const d = (mx - m.w / 2) / (m.w / 2);
          if (Math.abs(d) < 1) y = Math.max(y, m.h * (themeName === 'canyon' ? (Math.abs(d) < 0.7 ? 1 : (1 - Math.abs(d)) / 0.3) : Math.cos(d * Math.PI / 2)));
        }
        ctx.lineTo(x, midY - y * unit * 0.6);
      }
      ctx.lineTo(W + 10, H);
      ctx.closePath();
      ctx.fill();
      if (themeName === 'canyon') {
        // cacti
        ctx.fillStyle = T.farDark;
        for (const m of S.mid) {
          if (m.deco < 0.5) continue;
          const x = (((m.x + m.w * 0.3) * unit * 0.6 + midOff) % (224 * unit * 0.6) + 224 * unit * 0.6) % (224 * unit * 0.6);
          this.cactus(ctx, x, midY - 2, unit * 0.9 * (0.6 + m.deco * 0.5));
        }
      }
      if (T.islands) {
        // floating cloud bank at the bottom
        ctx.fillStyle = 'rgba(255,235,250,0.35)';
        for (let i = 0; i < 6; i++) this.cloud(ctx, ((i * 260 - cam.x * cam.zoom * 0.35) % (W + 300) + W + 300) % (W + 300) - 150, H * 0.92, unit * 5, 4, T, true);
      }
    }

    cloud(ctx, x, y, r, blobs, T, flat) {
      ctx.save();
      if (!flat) {
        ctx.fillStyle = T.cloudShade;
        ctx.beginPath();
        for (let i = 0; i < blobs; i++) { const bx = x + (i - blobs / 2) * r * 0.9; ctx.moveTo(bx + r, y + r * 0.2); ctx.arc(bx, y + r * 0.2, r * (i % 2 ? 0.9 : 1.1), 0, Math.PI * 2); }
        ctx.fill();
        ctx.fillStyle = T.cloud;
      }
      ctx.beginPath();
      for (let i = 0; i < blobs; i++) { const bx = x + (i - blobs / 2) * r * 0.9; ctx.moveTo(bx + r, y); ctx.arc(bx, y, r * (i % 2 ? 0.9 : 1.1), 0, Math.PI * 2); }
      ctx.fill();
      ctx.restore();
    }

    farShape(ctx, theme, x, base, f, u) {
      const w = f.w * u, h = f.h * u;
      if (theme === 'canyon') {
        ctx.moveTo(x, base);
        ctx.lineTo(x + w * 0.12, base - h); ctx.lineTo(x + w * 0.88, base - h); ctx.lineTo(x + w, base);
      } else if (theme === 'sky') {
        ctx.moveTo(x, base);
        ctx.ellipse(x + w / 2, base, w / 2, h * 0.7, 0, Math.PI, 0);
      } else {
        ctx.moveTo(x, base + 2);
        ctx.quadraticCurveTo(x + w * 0.25, base - h * 1.1, x + w * 0.5, base - h);
        ctx.quadraticCurveTo(x + w * 0.75, base - h * 0.9, x + w, base + 2);
      }
      ctx.lineTo(x, base + 2);
      ctx.rect(x - 1, base, w + 2, 2000);
    }

    junkShape(ctx, x, y, j, u) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(j.a * 0.4);
      ctx.scale(j.s * u, j.s * u);
      ctx.beginPath();
      switch (j.kind) {
        case 0: // tire
          ctx.arc(0, -1.2, 1.4, 0, Math.PI * 2); ctx.arc(0, -1.2, 0.6, 0, Math.PI * 2, true); break;
        case 1: // car body
          ctx.moveTo(-3, 0); ctx.lineTo(-3, -1.2); ctx.lineTo(-1.6, -1.3); ctx.lineTo(-0.8, -2.3); ctx.lineTo(1.2, -2.3); ctx.lineTo(2, -1.3); ctx.lineTo(3, -1.2); ctx.lineTo(3, 0); ctx.closePath(); break;
        case 2: // fridge
          ctx.rect(-0.9, -3.2, 1.8, 3.2); break;
        case 3: // crane
          ctx.rect(-0.25, -7, 0.5, 7); ctx.moveTo(-0.3, -7); ctx.lineTo(4.5, -6.6); ctx.lineTo(4.5, -6.2); ctx.lineTo(-0.3, -6.4); ctx.closePath();
          ctx.rect(4.1, -6.2, 0.1, 2); ctx.rect(3.5, -4.3, 1.3, 0.5); break;
        default: // barrel stack
          ctx.rect(-1.5, -1.6, 1.3, 1.6); ctx.rect(0.2, -1.6, 1.3, 1.6); ctx.rect(-0.65, -3.2, 1.3, 1.6);
      }
      ctx.fill('evenodd');
      ctx.restore();
    }

    cactus(ctx, x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-0.35, -4, 0.7, 4, 0.35) : ctx.rect(-0.35, -4, 0.7, 4);
      ctx.roundRect ? ctx.roundRect(-1.3, -3, 0.55, 1.7, 0.27) : ctx.rect(-1.3, -3, 0.55, 1.7);
      ctx.rect(-1.3, -1.6, 1.2, 0.5);
      ctx.roundRect ? ctx.roundRect(0.75, -3.4, 0.55, 1.9, 0.27) : ctx.rect(0.75, -3.4, 0.55, 1.9);
      ctx.rect(0.1, -2, 1.2, 0.5);
      ctx.fill();
      ctx.restore();
    }

    // ------------------------------------------------------- terrain
    groundPattern(themeName) {
      if (this.patterns[themeName]) return this.patterns[themeName];
      const T = THEMES[themeName] || THEMES.hills;
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = T.ground; x.fillRect(0, 0, 256, 256);
      const r = U.rng(42);
      if (T.stripes) {
        for (let i = 0; i < 8; i++) {
          x.fillStyle = i % 2 ? 'rgba(255,200,150,0.12)' : 'rgba(90,30,10,0.12)';
          x.fillRect(0, i * 32 + r() * 6, 256, 14 + r() * 10);
        }
      }
      for (let i = 0; i < 140; i++) {
        x.fillStyle = T.groundSpeck[i % T.groundSpeck.length];
        const px = r() * 256, py = r() * 256, s = 2 + r() * 7;
        x.beginPath(); x.ellipse(px, py, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); x.fill();
      }
      for (let i = 0; i < 10; i++) {
        const px = r() * 256, py = r() * 256, s = 6 + r() * 10;
        x.fillStyle = 'rgba(0,0,0,0.12)';
        x.beginPath(); x.ellipse(px + 2, py + 2, s, s * 0.7, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = T.groundSpeck[1];
        x.beginPath(); x.ellipse(px, py, s, s * 0.7, 0, 0, Math.PI * 2); x.fill();
      }
      const p = this.ctx.createPattern(c, 'repeat');
      if (p && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scaleSelf(6 / 256, -6 / 256));
      this.patterns[themeName] = p;
      return p;
    }

    prepareLevel(L) {
      if (this.levelCache && this.levelCache.L === L) return this.levelCache;
      const paths = L.polys.map((poly) => {
        const p = new Path2D();
        poly.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
        p.closePath();
        return p;
      });
      const tops = L.tops.map((strips) => strips.map((s) => {
        const p = new Path2D();
        s.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
        return p;
      }));
      // grass tufts
      const r = U.rng(L.seed + 7);
      const tufts = [];
      for (const strips of L.tops) {
        for (const s of strips) {
          for (let i = 0; i < s.length - 1; i++) {
            const a = s[i], b = s[i + 1];
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const n = Math.floor(len / 1.3);
            for (let k = 0; k < n; k++) {
              if (r() < 0.45) continue;
              const t = (k + r()) / Math.max(1, n);
              tufts.push({ x: U.lerp(a[0], b[0], t), y: U.lerp(a[1], b[1], t), s: 0.12 + r() * 0.14, f: r() < 0.08 });
            }
          }
        }
      }
      let maxY = -Infinity;
      for (const poly of L.polys) for (const q of poly) maxY = Math.max(maxY, q[1]);
      // ground under goal
      let goalGround = null;
      if (L.goal) goalGround = groundBelow(L, L.goal.x, L.goal.y);
      this.levelCache = { L, paths, tops, tufts, maxY, goalGround };
      return this.levelCache;
    }

    drawTerrain(L, t) {
      const ctx = this.ctx;
      const T = THEMES[L.theme] || THEMES.hills;
      const C = this.prepareLevel(L);
      this.setWorld();
      const pat = this.groundPattern(L.theme);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      C.paths.forEach((path, idx) => {
        ctx.fillStyle = pat || T.ground;
        ctx.fill(path);
        // depth shade
        ctx.save();
        ctx.clip(path);
        const poly = L.polys[idx];
        let top = -Infinity, bot = Infinity;
        for (const q of poly) { top = Math.max(top, q[1]); bot = Math.min(bot, q[1]); }
        const g = ctx.createLinearGradient(0, top, 0, Math.max(bot, top - 14));
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,5,30,0.38)');
        ctx.fillStyle = g; ctx.fill(path);
        for (const tp of C.tops[idx]) {
          ctx.strokeStyle = T.topDark; ctx.lineWidth = 1.0; ctx.stroke(tp);
          ctx.strokeStyle = T.top; ctx.lineWidth = 0.76; ctx.stroke(tp);
          ctx.strokeStyle = T.topLight; ctx.lineWidth = 0.2; ctx.stroke(tp);
        }
        ctx.restore();
        ctx.lineWidth = 0.08; ctx.strokeStyle = INK; ctx.stroke(path);
      });
      // tufts
      ctx.fillStyle = T.tuft;
      for (const tf of C.tufts) {
        if (tf.f) {
          ctx.beginPath(); ctx.arc(tf.x, tf.y + 0.16, 0.09, 0, Math.PI * 2);
          ctx.fillStyle = L.theme === 'canyon' ? '#ffcf5a' : L.theme === 'snow' ? '#bfe3f9' : '#fff27a'; ctx.fill(); ctx.fillStyle = T.tuft;
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(tf.x - tf.s, tf.y - 0.02);
        ctx.lineTo(tf.x - tf.s * 0.5, tf.y + tf.s * 1.4);
        ctx.lineTo(tf.x, tf.y + 0.02);
        ctx.lineTo(tf.x + tf.s * 0.4, tf.y + tf.s * 1.7);
        ctx.lineTo(tf.x + tf.s, tf.y - 0.02);
        ctx.closePath(); ctx.fill();
      }
    }

    // ------------------------------------------------------- objects
    drawWind(L, t) {
      const ctx = this.ctx;
      this.setWorld();
      for (const o of L.objects) {
        if (o.type !== 'wind') continue;
        const a = ((o.angle == null ? 90 : o.angle) * Math.PI) / 180;
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(a - Math.PI / 2);
        const w = a === Math.PI / 2 ? o.w : o.w, h = o.h;
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, 'rgba(190,240,255,0.32)'); g.addColorStop(1, 'rgba(190,240,255,0.02)');
        ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
        const n = Math.max(3, Math.round(w * 1.3));
        for (let i = 0; i < n; i++) {
          const x = -w / 2 + ((i + 0.5) / n) * w;
          const ph = ((t * (0.55 + ((i * 7) % 5) * 0.08) + i * 0.37) % 1);
          const y = -h / 2 + ph * h;
          ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
          ctx.beginPath();
          ctx.moveTo(x + Math.sin(t * 3 + i) * 0.1, y);
          ctx.lineTo(x + Math.sin(t * 3 + i + 1) * 0.1, y + Math.min(1.2, h * 0.15));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // fan housing at the base
        ctx.save();
        ctx.translate(0, -h / 2);
        ctx.scale(1, -1);
        Art.rr(ctx, -w / 2, -0.15, w, 0.5, 0.12);
        Art.fillStroke(ctx, '#55606c');
        ctx.fillStyle = '#2d343b';
        for (let x = -w / 2 + 0.3; x < w / 2 - 0.2; x += 0.45) ctx.fillRect(x, -0.05, 0.25, 0.3);
        ctx.restore();
        ctx.restore();
      }
    }

    drawProps(L, sim, t) {
      const ctx = this.ctx;
      this.setWorld();
      if (sim) {
        for (const pr of sim.props) {
          if (!pr.alive || !pr.body || pr.type === 'wind') continue;
          const fn = Art.prop[pr.type];
          if (!fn) continue;
          const p = pr.body.getPosition();
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(pr.body.getAngle());
          ctx.scale(1, -1);
          fn(ctx, pr.o, pr);
          ctx.restore();
        }
      } else {
        for (const o of L.objects) {
          if (o.type === 'wind') continue;
          if (o.type === 'seesaw') {
            this.drawStaticProp('seesawBase', o, o.x, o.y, 0);
            this.drawStaticProp('plank', Object.assign({}, o, { h: 0.3 }), o.x, o.y + 1.15, o.angle || 0);
            continue;
          }
          this.drawStaticProp(o.type, o, o.x, o.y, o.angle || 0);
        }
      }
    }

    drawStaticProp(type, o, x, y, angleDeg) {
      const fn = Art.prop[type];
      if (!fn) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((angleDeg * Math.PI) / 180);
      ctx.scale(1, -1);
      fn(ctx, o, {});
      ctx.restore();
    }

    drawGoalAndCap(L, t, status) {
      const ctx = this.ctx;
      this.setWorld();
      const C = this.prepareLevel(L);
      if (L.goal) Art.drawGoal(ctx, L.goal, t, C.goalGround, status && status.won);
      if (L.cap) Art.drawCap(ctx, L.cap.x, L.cap.y, t, status && status.collected);
    }

    // ------------------------------------------------------- build mode
    drawBuildGrid(L, hover, opts) {
      const ctx = this.ctx;
      const b = L.build;
      this.setWorld();
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.lineWidth = 0.04;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.setLineDash([0.14, 0.1]);
      for (let i = 0; i <= b.w; i++) { ctx.beginPath(); ctx.moveTo(b.x + i, b.y); ctx.lineTo(b.x + i, b.y + b.h); ctx.stroke(); }
      for (let j = 0; j <= b.h; j++) { ctx.beginPath(); ctx.moveTo(b.x, b.y + j); ctx.lineTo(b.x + b.w, b.y + j); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.lineWidth = 0.09; ctx.strokeStyle = '#ffd34a';
      ctx.strokeRect(b.x - 0.04, b.y - 0.04, b.w + 0.08, b.h + 0.08);
      if (hover && hover.i >= 0) {
        ctx.fillStyle = hover.erase ? 'rgba(255,80,80,0.35)' : 'rgba(255,211,74,0.35)';
        ctx.fillRect(b.x + hover.i, b.y + hover.j, 1, 1);
      }
      ctx.restore();
      void opts;
    }

    drawDesign(L, design, t, opts) {
      opts = opts || {};
      const ctx = this.ctx;
      const b = L.build;
      this.setWorld();
      const cells = design.cells.slice();
      const order = { balloon: 0, chute: 1, wheel: 3, caster: 3, seat: 5 };
      cells.sort((a, c) => (order[a.t] == null ? 2 : order[a.t]) - (order[c.t] == null ? 2 : order[c.t]));
      const map = new Map(design.cells.map((c) => [c.i + ',' + c.j, c]));
      // balloon strings in build mode
      for (const c of cells) {
        if (c.t !== 'balloon') continue;
        const below = map.get(c.i + ',' + (c.j - 1));
        if (below) {
          ctx.strokeStyle = 'rgba(42,29,20,0.7)'; ctx.lineWidth = 0.03;
          Art.line(ctx, b.x + c.i + 0.5, b.y + c.j + 0.08, b.x + c.i + 0.5, b.y + c.j);
        }
      }
      for (const c of cells) {
        const x = b.x + c.i + 0.5, y = b.y + c.j + 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, -1);
        let st = { rot: c.r || 0, t, id: c.i * 7 + c.j * 3, expr: 'happy', bigHead: opts.bigHead };
        if (c.t === 'caster') {
          // hug the frame above (or the nearest holder)
          for (const [di, dj] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
            const q = map.get((c.i + di) + ',' + (c.j + dj));
            if (q && JJ.Parts.isWeldable(q.t)) { ctx.translate(di * 0.22, -dj * 0.22); break; }
          }
        }
        if (c.t === 'seat') st.look = Math.sin(t * 0.7) * 0.6;
        Art.drawPartLocal(ctx, c.t, st, c.r || 0);
        ctx.restore();
      }
      // issues (loose wheels)
      if (opts.issues) {
        for (const is of opts.issues) {
          const x = b.x + is.i + 0.5, y = b.y + is.j + 0.5;
          ctx.save();
          ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.3;
          ctx.strokeStyle = '#ff4f4f'; ctx.lineWidth = 0.08;
          Art.circle(ctx, x, y, 0.52); ctx.stroke();
          ctx.restore();
        }
      }
    }

    drawGhost(L, cell, type, rot, ok, t) {
      if (!cell || !type) return;
      const ctx = this.ctx;
      const b = L.build;
      this.setWorld();
      ctx.save();
      ctx.globalAlpha = ok ? 0.55 : 0.25;
      ctx.translate(b.x + cell.i + 0.5, b.y + cell.j + 0.5);
      ctx.scale(1, -1);
      Art.drawPartLocal(ctx, type, { rot, t, id: 0, expr: 'happy' }, rot);
      ctx.restore();
    }

    // ------------------------------------------------------- play mode
    drawSim(sim, t, opts) {
      opts = opts || {};
      const ctx = this.ctx;
      this.setWorld();
      const parts = sim.parts;
      // strings
      for (const p of parts) {
        if (!p.alive || p.type !== 'balloon' || !p.rope || !p.rope.alive) continue;
        const a = p.rope.joint.getAnchorB();
        const c = p.body.getPosition();
        const dx = a.x - c.x, dy = a.y - c.y, d = Math.hypot(dx, dy) || 1;
        const bx = c.x + (dx / d) * 0.42, by = c.y + (dy / d) * 0.42;
        ctx.strokeStyle = 'rgba(42,29,20,0.85)'; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.quadraticCurveTo((bx + a.x) / 2 + Math.sin(t * 3 + p.id) * 0.12, (by + a.y) / 2, a.x, a.y);
        ctx.stroke();
      }
      // canopies
      for (const p of parts) {
        if (!p.alive || p.type !== 'chute') continue;
        const c = p.body.getPosition();
        Art.drawCanopy(ctx, c.x, c.y, p.chuteDir, p.chuteOpen, t);
      }
      const layer = (p) => (p.type === 'balloon' ? 0 : p.def.kind === 'wheel' ? 2 : p.type === 'seat' ? 3 : 1);
      const sorted = parts.filter((p) => p.alive).sort((a, b) => layer(a) - layer(b));
      for (const p of sorted) {
        const pos = p.body.getPosition();
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(p.body.getAngle());
        ctx.scale(1, -1);
        const st = { rot: p.rot, t, id: p.id, active: p.active, flame: p.flame, spin: p.spin, chuteOpen: p.chuteOpen, bigHead: opts.bigHead };
        if (p.type === 'fan') { p.spinAngle = (p.spinAngle || 0) + p.spin * 0.6; st.spinAngle = p.spinAngle; }
        if (p.type === 'rocket') st.fuelFrac = sim.cheats.infiniteFuel ? 1 : p.fuel / JJ.PARTS.rocket.fuel;
        if (p.type === 'tnt') st.armed = p.queued;
        if (p.type === 'seat') { st.expr = opts.expr || 'happy'; st.look = opts.look || 0; }
        if (p.type === 'spring') {
          ctx.translate(0, -0.25);
          if (p.springTop && p.springTop.alive && p.joints.some((j) => j.kind === 'spring' && j.alive)) {
            const w = p.springTop.body.getWorldPoint(planck.Vec2(0, -0.5));
            const l = p.body.getLocalPoint(w);
            st.coilTop = U.clamp(0.25 - l.y, -0.8, -0.05);
          } else st.coilTop = -0.32;
        }
        Art.drawPartLocal(ctx, p.type, st, p.rot);
        ctx.restore();
      }
      if (opts.debug) this.drawDebug(sim);
    }

    drawDebug(sim) {
      const ctx = this.ctx;
      this.setWorld();
      ctx.lineWidth = 0.03;
      for (let b = sim.world.getBodyList(); b; b = b.getNext()) {
        const pos = b.getPosition(), a = b.getAngle();
        ctx.strokeStyle = b.isStatic() ? 'rgba(0,255,120,0.8)' : b.isAwake() ? 'rgba(255,60,200,0.9)' : 'rgba(150,150,150,0.9)';
        for (let f = b.getFixtureList(); f; f = f.getNext()) {
          const s = f.getShape();
          const type = s.getType();
          ctx.save();
          ctx.translate(pos.x, pos.y); ctx.rotate(a);
          ctx.beginPath();
          if (type === 'circle') {
            const c = s.getCenter ? s.getCenter() : s.m_p;
            ctx.arc(c.x, c.y, s.getRadius(), 0, Math.PI * 2);
            ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + s.getRadius(), c.y);
          } else if (type === 'polygon') {
            const v = s.m_vertices;
            v.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.closePath();
          } else if (type === 'chain') {
            const v = s.m_vertices;
            v.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          }
          ctx.stroke();
          ctx.restore();
        }
      }
      for (const jr of sim.joints) {
        if (!jr.alive) continue;
        const a = jr.joint.getAnchorA();
        ctx.fillStyle = jr.kind === 'weld' ? '#ffd34a' : jr.kind === 'axle' ? '#4fd1ff' : '#ff8a4f';
        ctx.fillRect(a.x - 0.06, a.y - 0.06, 0.12, 0.12);
      }
      const L = sim.level;
      if (L.goal) { ctx.strokeStyle = '#0f0'; Art.circle(ctx, L.goal.x, L.goal.y, JJ.PHYS.GOAL_R); ctx.stroke(); }
    }

    drawTrail(sim, rainbow) {
      if (!rainbow || !sim.seat || !sim.seat.alive) { this.trail.length = 0; return; }
      const p = sim.seat.body.getPosition();
      this.trail.push({ x: p.x, y: p.y });
      if (this.trail.length > 90) this.trail.shift();
      const ctx = this.ctx;
      this.setWorld();
      const cols = ['#ff4d4d', '#ff9f2e', '#ffe14a', '#5ee05e', '#4fb6ff', '#9b6bff'];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      cols.forEach((c, k) => {
        ctx.beginPath();
        this.trail.forEach((q, i) => {
          const y = q.y + 0.35 - k * 0.14;
          if (i) ctx.lineTo(q.x, y); else ctx.moveTo(q.x, y);
        });
        ctx.strokeStyle = c; ctx.lineWidth = 0.15; ctx.globalAlpha = 0.85; ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------- particles
    spawn(type, x, y, o) {
      o = o || {};
      if (this.particles.length > 700) return;
      const p = {
        type, x, y, vx: o.vx || 0, vy: o.vy || 0, life: o.life || 1, max: o.life || 1,
        size: o.size || 0.3, color: o.color || '#fff', rot: o.rot || Math.random() * 6, vr: o.vr || 0,
        g: o.g == null ? 0 : o.g, drag: o.drag == null ? 0.98 : o.drag, grow: o.grow || 0, text: o.text
      };
      this.particles.push(p);
      return p;
    }

    burst(kind, x, y, power) {
      power = power || 1;
      const R = Math.random;
      if (kind === 'explode') {
        this.spawn('ring', x, y, { life: 0.35, size: 0.3, grow: 18 * power, color: 'rgba(255,255,220,0.9)' });
        this.spawn('flash', x, y, { life: 0.18, size: 3.5 * power });
        for (let i = 0; i < 26; i++) {
          const a = R() * Math.PI * 2, s = (2 + R() * 7) * power;
          this.spawn('fire', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + R() * 0.5, size: 0.4 + R() * 0.7, drag: 0.9, g: 2, color: R() < 0.5 ? '#ffb02e' : '#ff5a1f' });
        }
        for (let i = 0; i < 18; i++) {
          const a = R() * Math.PI * 2, s = (1 + R() * 3) * power;
          this.spawn('smoke', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s + 1, life: 1.2 + R() * 1.2, size: 0.5 + R() * 0.6, grow: 0.9, drag: 0.93, g: -1.2, color: R() < 0.5 ? '#6b6470' : '#8a8390' });
        }
        for (let i = 0; i < 16; i++) {
          const a = R() * Math.PI * 2, s = 6 + R() * 10;
          this.spawn('spark', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + R() * 0.4, size: 0.08, g: 12, drag: 0.97, color: '#ffe680' });
        }
        for (let i = 0; i < 10; i++) {
          const a = R() * Math.PI * 2, s = 4 + R() * 7;
          this.spawn('debris', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s + 3, life: 1 + R(), size: 0.12 + R() * 0.15, g: 14, vr: (R() - 0.5) * 20, color: R() < 0.5 ? '#3a2a1e' : '#c98a45' });
        }
      } else if (kind === 'break') {
        for (let i = 0; i < 9; i++) {
          const a = R() * Math.PI * 2, s = 1.5 + R() * 4;
          this.spawn('debris', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s + 2, life: 0.6 + R() * 0.6, size: 0.08 + R() * 0.12, g: 14, vr: (R() - 0.5) * 20, color: power ? '#c98a45' : '#8aa0b5' });
        }
        for (let i = 0; i < 4; i++) this.spawn('dust', x, y, { vx: (R() - 0.5) * 2, vy: R() * 1.5, life: 0.6, size: 0.3, grow: 0.8, color: 'rgba(230,220,200,0.8)' });
      } else if (kind === 'pop') {
        this.spawn('ring', x, y, { life: 0.25, size: 0.3, grow: 6, color: 'rgba(255,255,255,0.9)' });
        for (let i = 0; i < 12; i++) {
          const a = R() * Math.PI * 2, s = 2 + R() * 4;
          this.spawn('debris', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7 + R() * 0.5, size: 0.08 + R() * 0.1, g: 6, vr: (R() - 0.5) * 25, color: power || '#ff5d8f' });
        }
      } else if (kind === 'dust') {
        for (let i = 0; i < 6 * power; i++) this.spawn('dust', x + (R() - 0.5) * 0.6, y, { vx: (R() - 0.5) * 3, vy: R() * 1.5, life: 0.5 + R() * 0.5, size: 0.2 + R() * 0.2, grow: 0.9, color: 'rgba(210,190,160,0.75)' });
      } else if (kind === 'collect') {
        this.spawn('ring', x, y, { life: 0.4, size: 0.4, grow: 7, color: 'rgba(255,230,120,0.95)' });
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2, s = 3 + R() * 3;
          this.spawn('star', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8, size: 0.16, drag: 0.92, color: '#fff4b0' });
        }
      } else if (kind === 'confetti') {
        const cols = ['#ff4d6d', '#ffd34a', '#4fd1ff', '#7be07b', '#c38bff', '#ff9f2e'];
        for (let i = 0; i < 70; i++) {
          const a = Math.PI / 2 + (R() - 0.5) * 1.6, s = 6 + R() * 9;
          this.spawn('confetti', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 2 + R() * 1.5, size: 0.12 + R() * 0.08, g: 6, drag: 0.96, vr: (R() - 0.5) * 16, color: cols[i % cols.length] });
        }
      } else if (kind === 'bounce') {
        this.spawn('ring', x, y, { life: 0.3, size: 0.4, grow: 8, color: 'rgba(255,120,150,0.8)' });
      }
    }

    updateParticles(dt) {
      const ps = this.particles;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life -= dt;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        p.vy -= p.g * dt;
        const d = Math.pow(p.drag, dt * 60);
        p.vx *= d; p.vy *= d;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.size += p.grow * dt;
      }
      // shake
      if (this.shake > 0) {
        const s = this.shake * 14;
        this.shakeX = (Math.random() - 0.5) * s; this.shakeY = (Math.random() - 0.5) * s;
        this.shake = Math.max(0, this.shake - dt * 2.2);
      } else { this.shakeX = 0; this.shakeY = 0; }
    }

    drawParticles() {
      const ctx = this.ctx;
      this.setWorld();
      for (const p of this.particles) {
        const k = p.life / p.max;
        switch (p.type) {
          case 'smoke':
          case 'dust':
            ctx.globalAlpha = Math.min(1, k * 1.4) * 0.7;
            ctx.fillStyle = p.color;
            Art.circle(ctx, p.x, p.y, p.size); ctx.fill();
            break;
          case 'fire':
            ctx.globalAlpha = Math.min(1, k * 2);
            ctx.fillStyle = k > 0.6 ? '#fff3b0' : p.color;
            Art.circle(ctx, p.x, p.y, p.size * (0.4 + k * 0.6)); ctx.fill();
            break;
          case 'flash': {
            ctx.globalAlpha = k;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(1, 'rgba(255,200,80,0)');
            ctx.fillStyle = g; Art.circle(ctx, p.x, p.y, p.size); ctx.fill();
            break;
          }
          case 'ring':
            ctx.globalAlpha = k;
            ctx.strokeStyle = p.color; ctx.lineWidth = 0.18 * k + 0.03;
            Art.circle(ctx, p.x, p.y, p.size); ctx.stroke();
            break;
          case 'spark':
            ctx.globalAlpha = k;
            ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
            Art.line(ctx, p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03);
            break;
          case 'debris':
          case 'confetti':
            ctx.globalAlpha = Math.min(1, k * 3);
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            if (p.type === 'confetti') ctx.fillRect(-p.size, -p.size * 0.5 * Math.abs(Math.cos(p.rot * 2)), p.size * 2, p.size * Math.abs(Math.cos(p.rot * 2)) + 0.02);
            else ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
            ctx.restore();
            break;
          case 'star':
            ctx.globalAlpha = k;
            Art.drawTwinkle(ctx, p.x, p.y, p.size);
            break;
          default: break;
        }
      }
      ctx.globalAlpha = 1;
    }

    // exhaust & engine effects from a running sim
    emitSimEffects(sim, dt) {
      const R = Math.random;
      for (const p of sim.parts) {
        if (!p.alive) continue;
        if (p.type === 'rocket' && p.flame > 0.3) {
          const d = JJ.DIR[p.rot];
          const b = p.body;
          const back = b.getWorldPoint(planck.Vec2(-d[0] * 0.75, -d[1] * 0.75));
          const dir = b.getWorldVector(planck.Vec2(-d[0], -d[1]));
          if (R() < 0.8) this.spawn('fire', back.x, back.y, { vx: dir.x * 6 + (R() - 0.5), vy: dir.y * 6 + (R() - 0.5), life: 0.25, size: 0.25 + R() * 0.15, drag: 0.9, color: '#ff8a1f' });
          if (R() < 0.5) this.spawn('smoke', back.x, back.y, { vx: dir.x * 3 + (R() - 0.5), vy: dir.y * 3 + R(), life: 0.9, size: 0.25, grow: 0.9, drag: 0.94, g: -1, color: '#9a95a0' });
        } else if (p.type === 'engine' && p.active) {
          if (R() < dt * 9) {
            const side = p.rot === 2 ? 1 : -1;
            const w = p.body.getWorldPoint(planck.Vec2(side * 0.35, 0.65));
            this.spawn('smoke', w.x, w.y, { vx: (R() - 0.5) * 0.6, vy: 1 + R(), life: 0.8, size: 0.13, grow: 0.5, drag: 0.95, g: -0.5, color: '#55505c' });
          }
        }
      }
    }

    // screen-space arrow pointing at an off-screen goal
    drawGoalPointer(L, label) {
      if (!L.goal) return;
      const s = this.worldToScreen(L.goal.x, L.goal.y);
      const m = 46;
      if (s.x > m && s.x < this.W - m && s.y > m && s.y < this.H - m) return;
      const ctx = this.ctx;
      this.setScreen();
      const cx = this.W / 2, cy = this.H / 2;
      const a = Math.atan2(s.y - cy, s.x - cx);
      const x = U.clamp(s.x, m, this.W - m), y = U.clamp(s.y, m + 40, this.H - m - 70);
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(42,29,20,0.75)'; ctx.fill();
      ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -9); ctx.lineTo(-6, 9); ctx.closePath();
      ctx.fillStyle = '#ffd34a'; ctx.fill();
      ctx.restore();
      if (label) {
        ctx.font = '800 12px Nunito, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(42,29,20,0.9)'; ctx.lineWidth = 3;
        ctx.strokeText(label, x, y + 36); ctx.fillText(label, x, y + 36);
      }
    }
  }

  // highest terrain surface below (x, y) within the level, or null
  function groundBelow(L, x, y) {
    let best = null;
    for (const poly of L.polys) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) continue;
        const t = (x - a[0]) / (b[0] - a[0]);
        const gy = a[1] + t * (b[1] - a[1]);
        if (gy <= y + 0.01 && (best == null || gy > best)) best = gy;
      }
    }
    for (const o of L.objects) {
      if (o.type !== 'platform' || (o.angle || 0) !== 0) continue;
      if (Math.abs(x - o.x) <= o.w / 2) {
        const top = o.y + o.h / 2;
        if (top <= y + 0.01 && (best == null || top > best)) best = top;
      }
    }
    return best;
  }

  JJ.THEMES = THEMES;
  JJ.Renderer = Renderer;
  JJ.groundBelow = groundBelow;
})((globalThis.JJ = globalThis.JJ || {}));
