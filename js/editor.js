/* Junkyard Joyride - level editor (lives inside the admin panel) */
(function (JJ) {
  'use strict';
  const U = JJ.U, Store = JJ.Store, UI = JJ.UI, A = JJ.Audio;
  const esc = (s) => UI.esc(s);

  // extra icons for the editor
  const S = (b) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + b + '</svg>';
  Object.assign(UI.ICONS, {
    cursor: S('<path d="M5 3.5 18.5 12l-6 1.4 3.4 6.4-2.6 1.3-3.3-6.4-4.5 4.2z" fill="currentColor"/>'),
    hand: S('<path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5V4a1.5 1.5 0 0 1 3 0v6m0-.5V5.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 7-6.5 7-3 0-4.5-1.6-6-4.2l-1.7-3a1.5 1.5 0 0 1 2.5-1.6L8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    hill: S('<path d="M2 19 8.5 9l4 5 3-4 6.5 9z" fill="currentColor"/>'),
    island: S('<path d="M3 10h18l-3 4-4 6-3-3-3-3z" fill="currentColor"/><path d="M5 10c1-2 3-3 5-2 1-2 4-2 5 0 2-1 4 0 4 2" fill="none" stroke="currentColor" stroke-width="2"/>'),
    flag: S('<path d="M6 21V3.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M7 4h11l-3 4 3 4H7z" fill="currentColor"/>'),
    coin: S('<circle cx="12" cy="12" r="8" fill="currentColor"/><path d="M12 7.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="#2a1d14"/>'),
    start: S('<rect x="3.5" y="6" width="17" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="3 2"/><circle cx="8" cy="18" r="2.4" fill="currentColor"/><circle cx="16" cy="18" r="2.4" fill="currentColor"/>'),
    redo: S('<path d="M15.5 8.5H9a5 5 0 0 0 0 10h4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M12.5 4.5l4 4-4 4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
  });

  const OBJ_TOOLS = [
    ['platform', 'Platform'], ['ramp', 'Ramp'], ['rock', 'Rock'], ['crate', 'Crate'], ['tnt', 'TNT barrel'], ['ball', 'Ball'],
    ['plank', 'Plank'], ['seesaw', 'Seesaw'], ['spikes', 'Spikes'], ['bounce', 'Bounce pad'], ['wind', 'Updraft'], ['barricade', 'Barricade']
  ];
  const BASE_TOOLS = [
    ['select', 'Select and move (drag empty space to pan)', 'cursor'],
    ['pan', 'Pan the view', 'hand'],
    ['ground', 'Ground: click to add points', 'hill'],
    ['island', 'Floating island: click points, click the first one to finish', 'island'],
    ['erase', 'Eraser', 'eraser']
  ];
  const SPECIAL_TOOLS = [['start', 'Build grid (start)', 'start'], ['goal', 'Snack stash (goal)', 'flag'], ['cap', 'Bottle cap', 'coin']];
  const TOOL_HELP = {
    select: 'Click to select. Drag to move. Drag empty space to pan. Scroll to zoom.',
    pan: 'Drag to move the view. Scroll to zoom.',
    ground: 'Click to add a point to the selected ground (or start new ground). Points stay in left-to-right order.',
    island: 'Click to add island corners. Click the first corner (or press Enter) to finish.',
    erase: 'Click an object, a corner or a piece of ground to delete it.',
    start: 'Click where the build grid should sit. It snaps onto the ground below.',
    goal: 'Click where the snack stash should be.',
    cap: 'Click where the bottle cap should float.'
  };

  function blankLevel() {
    return {
      id: null, name: 'My Level', theme: 'hills',
      hint: 'Get Rocco to the snack stash!',
      build: { x: -2, y: 0.02, w: 5, h: 3 },
      parts: { seat: 1, wood: 4, wheel: 4, engine: 1, spring: 2 },
      terrain: [{ pts: [[-14, 10], [-12, 0], [40, 0], [44, 4], [46, 10]] }],
      objects: [],
      goal: { x: 34, y: 1.4 },
      cap: { x: 18, y: 3 },
      star3: { type: 'time', value: 15 }
    };
  }

  const E = { mounted: false, lastDef: null };

  // ------------------------------------------------------------ mount
  E.mount = function (container, opts) {
    E.destroy();
    opts = opts || {};
    let def = null;
    if (opts.id) def = Store.custom.find((d) => d.id === opts.id) || null;
    if (!def && !opts.fresh && E.lastDef) def = E.lastDef;
    E.def = U.clone(def || blankLevel());
    if (!E.def.objects) E.def.objects = [];
    if (!E.def.parts) E.def.parts = {};
    E.sel = null; E.tool = 'select'; E.history = []; E.future = []; E.drawing = null;
    E.snap = true; E.dirty = true; E.pointers = new Map();
    E.mounted = true;
    E.lastDef = E.def;

    container.innerHTML =
      '<div class="ed">' +
      '<div class="ed-top">' +
      '<input type="text" id="ed-name" maxlength="40" aria-label="Level name" value="' + esc(E.def.name || '') + '">' +
      '<select id="ed-theme" aria-label="Theme">' + JJ.Level.THEMES.map((t) => '<option value="' + t + '"' + (E.def.theme === t ? ' selected' : '') + '>' + ({ hills: 'Scrapyard Hills', canyon: 'Dusty Canyon', sky: 'Sky Scraps', snow: 'Snowy Scrapheap' }[t]) + '</option>').join('') + '</select>' +
      '<select id="ed-open" aria-label="Open a level"><option value="">Open level...</option>' +
      (Store.custom.length ? '<optgroup label="My levels">' + Store.custom.map((d) => '<option value="c:' + esc(d.id) + '">' + esc(d.name || 'Untitled') + '</option>').join('') + '</optgroup>' : '') +
      '<optgroup label="Copy a built-in level">' + JJ.LEVELS.map((d) => '<option value="b:' + esc(d.id) + '">' + JJ.Game.levelNumber(d) + ' ' + esc(d.name) + '</option>').join('') + '</optgroup></select>' +
      '<button class="abtn sm" data-a="new" type="button"><span data-icon="plus"></span>New</button>' +
      '<span class="grow"></span>' +
      '<button class="abtn sm" data-a="undo" type="button" title="Undo (Ctrl+Z)"><span data-icon="undo"></span></button>' +
      '<button class="abtn sm" data-a="redo" type="button" title="Redo (Ctrl+Y)"><span data-icon="redo"></span></button>' +
      '<label class="abtn sm" title="Snap to half-metre grid"><input type="checkbox" id="ed-snap" checked style="accent-color:#ffcf3f"> Snap</label>' +
      '<button class="abtn sm" data-a="export" type="button"><span data-icon="download"></span>Export</button>' +
      '<button class="abtn sm y" data-a="save" type="button"><span data-icon="check"></span>Save</button>' +
      '<button class="abtn sm g" data-a="test" type="button"><span data-icon="play"></span>Test</button>' +
      '</div>' +
      '<div class="ed-tools" id="ed-tools"></div>' +
      '<div class="ed-stage"><canvas id="ed-cv" aria-label="Level editor canvas"></canvas><div class="ed-status" id="ed-status"></div></div>' +
      '<div class="ed-props" id="ed-props"></div></div>';
    UI.hydrate(container);
    E.el = container;
    const cv = container.querySelector('#ed-cv');
    E.cv = cv;
    buildTools();
    E.R = new JJ.Renderer(cv);
    E.fit();

    const top = container.querySelector('.ed-top');
    top.querySelector('#ed-name').oninput = (e) => { E.def.name = e.target.value; };
    top.querySelector('#ed-name').onchange = () => E.push(true);
    top.querySelector('#ed-theme').onchange = (e) => { E.push(); E.def.theme = e.target.value; E.dirty = true; };
    top.querySelector('#ed-snap').onchange = (e) => { E.snap = e.target.checked; };
    top.querySelector('#ed-open').onchange = (e) => {
      const v = e.target.value; e.target.value = '';
      if (!v) return;
      if (v.startsWith('c:')) { E.mount(container, { id: v.slice(2) }); return; }
      const b = JJ.findLevel(v.slice(2));
      if (b) {
        const d = U.clone(b); d.id = null; d.name = 'Copy of ' + b.name; delete d.world;
        E.lastDef = d; E.mount(container, {});
      }
    };
    const on = (a, fn) => { const b = top.querySelector('[data-a=' + a + ']'); if (b) b.onclick = () => { A.play('click'); fn(); }; };
    on('new', () => JJ.Admin.confirm('Start a new level?', 'Unsaved changes to this level will be lost.', 'New level', () => { E.lastDef = null; E.mount(container, { fresh: true }); }));
    on('undo', () => E.undo());
    on('redo', () => E.redo());
    on('export', () => JJ.Admin.exportDialog(E.def));
    on('save', () => E.save());
    on('test', () => E.test());

    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    renderProps();
    E.raf = requestAnimationFrame(frame);
  };

  E.destroy = function () {
    if (!E.mounted) return;
    E.mounted = false;
    cancelAnimationFrame(E.raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
  };

  function onResize() { if (E.R) E.R.resize(); }

  function buildTools() {
    const box = E.el.querySelector('#ed-tools');
    let html = '';
    for (const [k, name, icon] of BASE_TOOLS) html += '<button class="ed-tool" type="button" data-tool="' + k + '" aria-label="' + esc(name) + '"><span data-icon="' + icon + '"></span><span class="tl">' + esc(name) + '</span></button>';
    html += '<div class="ed-sep"></div>';
    for (const [k, name] of OBJ_TOOLS) html += '<button class="ed-tool" type="button" data-tool="obj:' + k + '" aria-label="' + esc(name) + '"><canvas width="76" height="76"></canvas><span class="tl">' + esc(name) + '</span></button>';
    html += '<div class="ed-sep"></div>';
    for (const [k, name, icon] of SPECIAL_TOOLS) html += '<button class="ed-tool" type="button" data-tool="' + k + '" aria-label="' + esc(name) + '"><span data-icon="' + icon + '"></span><span class="tl">' + esc(name) + '</span></button>';
    box.innerHTML = html;
    UI.hydrate(box);
    box.querySelectorAll('.ed-tool canvas').forEach((c) => {
      const type = c.parentElement.dataset.tool.slice(4);
      drawObjIcon(c, type);
    });
    box.querySelectorAll('.ed-tool').forEach((b) => { b.onclick = () => { A.play('click'); setTool(b.dataset.tool); }; });
    setTool('select');
  }

  function drawObjIcon(c, type) {
    const ctx = c.getContext('2d');
    const o = JJ.Level.withDefaults({ type, x: 0, y: 0 });
    let size = Math.max(o.w || (o.r || 0.5) * 2, o.h || (o.r || 0.5) * 2, 1);
    if (type === 'wind') size = 4; if (type === 'seesaw') size = 6;
    const s = 64 / size;
    ctx.save();
    ctx.translate(38, 38);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    if (type === 'wind') {
      ctx.fillStyle = 'rgba(190,240,255,0.6)'; ctx.fillRect(-1.2, -1.8, 2.4, 3.6);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.18;
      for (const x of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(x, 1.4); ctx.lineTo(x, -1.4); ctx.stroke(); }
    } else if (type === 'seesaw') {
      ctx.translate(0, 0.6); JJ.Art.prop.seesawBase(ctx);
      ctx.translate(0, -1.15); JJ.Art.prop.plank(ctx, { w: 5.6, h: 0.3 });
    } else {
      const fn = JJ.Art.prop[type];
      if (fn) fn(ctx, o, {});
    }
    ctx.restore();
  }

  function setTool(t) {
    if (E.drawing && t !== 'island') finishIsland();
    E.tool = t;
    E.el.querySelectorAll('.ed-tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    E.cv.style.cursor = t === 'pan' ? 'grab' : t === 'select' ? 'default' : 'crosshair';
  }

  // ---------------------------------------------------------- history
  E.push = function (soft) {
    const snap = JSON.stringify(E.def);
    if (soft && E.history.length && E.history[E.history.length - 1] === snap) return;
    E.history.push(snap);
    if (E.history.length > 80) E.history.shift();
    E.future = [];
  };
  E.undo = function () {
    if (!E.history.length) { A.play('error'); return; }
    E.future.push(JSON.stringify(E.def));
    E.def = JSON.parse(E.history.pop());
    E.lastDef = E.def; E.sel = null; E.dirty = true; syncTop(); renderProps();
  };
  E.redo = function () {
    if (!E.future.length) { A.play('error'); return; }
    E.history.push(JSON.stringify(E.def));
    E.def = JSON.parse(E.future.pop());
    E.lastDef = E.def; E.sel = null; E.dirty = true; syncTop(); renderProps();
  };
  function syncTop() {
    const n = E.el.querySelector('#ed-name'); if (n) n.value = E.def.name || '';
    const t = E.el.querySelector('#ed-theme'); if (t) t.value = E.def.theme || 'hills';
  }

  // ------------------------------------------------------------ save/test
  E.save = function (quiet) {
    const err = JJ.Admin.validLevel(E.def);
    if (err) { A.play('error'); JJ.Admin.toast(err); return false; }
    E.def.name = (E.def.name || 'My Level').slice(0, 40);
    if (!E.def.id || !String(E.def.id).startsWith('c-')) E.def.id = 'c-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    E.def.world = -2;
    const i = Store.custom.findIndex((d) => d.id === E.def.id);
    const copy = U.clone(E.def);
    if (i >= 0) Store.custom[i] = copy; else Store.custom.push(copy);
    Store.save('custom');
    E.lastDef = E.def;
    if (!quiet) { A.play('collect'); JJ.Admin.toast('Saved "' + E.def.name + '"'); }
    return true;
  };

  E.test = function () {
    if (!E.save(true)) return;
    const def = U.clone(E.def);
    JJ.Admin.close();
    JJ.Game.openLevel(def, { test: true, onExit: () => JJ.Admin.open('editor') });
  };

  // ------------------------------------------------------------ geometry
  function snapV(v) { return E.snap ? Math.round(v * 2) / 2 : Math.round(v * 100) / 100; }
  function world(e) {
    const r = E.cv.getBoundingClientRect();
    return E.R.screenToWorld(e.clientX - r.left, e.clientY - r.top);
  }
  function px(n) { return n / E.R.cam.zoom; }

  E.fit = function () {
    const L = JJ.Level.compile(U.clone(E.def));
    const R = E.R;
    R.resize();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const grow = (x, y) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
    for (const p of L.pieces) for (const q of p.pts) grow(q[0], q[1]);
    if (L.goal) grow(L.goal.x, L.goal.y);
    grow(L.build.x, L.build.y); grow(L.build.x + L.build.w, L.build.y + L.build.h);
    if (!isFinite(minX)) { minX = -10; maxX = 40; minY = -2; maxY = 10; }
    minY = Math.max(minY, L.build.y - 12);
    const W = R.W || 600, H = R.H || 400;
    const zoom = U.clamp(Math.min(W / (maxX - minX + 8), H / (maxY - minY + 8)), 4, 60);
    R.cam.zoom = zoom; R.cam.x = (minX + maxX) / 2; R.cam.y = (minY + maxY) / 2;
  };

  function objBox(o) {
    const d = JJ.Level.withDefaults(o);
    if (d.type === 'ball' || d.type === 'rock') return { x: d.x, y: d.y, w: d.r * 2, h: d.r * 2 };
    if (d.type === 'tnt') return { x: d.x, y: d.y, w: 0.8, h: 1 };
    if (d.type === 'spikes') return { x: d.x, y: d.y, w: d.w, h: 0.6 };
    if (d.type === 'bounce') return { x: d.x, y: d.y, w: d.w, h: 0.5 };
    if (d.type === 'seesaw') return { x: d.x, y: d.y + 0.65, w: d.w, h: 1.5 };
    return { x: d.x, y: d.y, w: d.w || 1, h: d.h || 1 };
  }

  function hit(w) {
    const def = E.def;
    const tol = px(12);
    // vertex handles: selected piece first, then any
    const pieceOrder = [];
    if (E.sel && (E.sel.k === 'piece' || E.sel.k === 'vtx')) pieceOrder.push(E.sel.p);
    def.terrain.forEach((p, i) => { if (pieceOrder.indexOf(i) < 0) pieceOrder.push(i); });
    if (def.goal && Math.hypot(w.x - def.goal.x, w.y - def.goal.y) < 1.5) return { k: 'goal' };
    if (def.cap && Math.hypot(w.x - def.cap.x, w.y - def.cap.y) < 0.8) return { k: 'cap' };
    for (let i = def.objects.length - 1; i >= 0; i--) {
      const b = objBox(def.objects[i]);
      if (Math.abs(w.x - b.x) <= b.w / 2 + tol * 0.5 && Math.abs(w.y - b.y) <= b.h / 2 + tol * 0.5) return { k: 'obj', i };
    }
    const b = def.build;
    if (w.x >= b.x && w.x <= b.x + b.w && w.y >= b.y && w.y <= b.y + b.h) return { k: 'build' };
    for (const pi of pieceOrder) {
      const pts = def.terrain[pi].pts;
      for (let i = 0; i < pts.length; i++) if (Math.hypot(w.x - pts[i][0], w.y - pts[i][1]) < tol) return { k: 'vtx', p: pi, i };
    }
    const L = E.L || JJ.Level.compile(U.clone(def));
    for (let i = L.polys.length - 1; i >= 0; i--) if (U.pointInPoly(w.x, w.y, L.polys[i])) return { k: 'piece', p: pieceIndexFromCompiled(L, i) };
    return null;
  }
  function pieceIndexFromCompiled(L, i) {
    // compiled pieces skip pieces with < 2 points; map back to the def index
    const valid = [];
    E.def.terrain.forEach((p, k) => { if (p && p.pts && p.pts.length >= 2) valid.push(k); });
    return valid[i] != null ? valid[i] : i;
  }

  // ------------------------------------------------------------ input
  function onDown(e) {
    const w = world(e);
    const r = E.cv.getBoundingClientRect();
    E.pointers.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    try { E.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    if (E.pointers.size === 2) {
      const [a, b] = Array.from(E.pointers.values());
      E.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: E.R.cam.zoom, cx: E.R.cam.x, cy: E.R.cam.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      E.drag = null; E.pan = null;
      return;
    }
    const t = E.tool;
    if (t === 'pan' || e.button === 1) { startPan(e); return; }
    if (e.button === 2) { // right click deletes
      const h = hit(w); if (h) eraseHit(h); return;
    }
    if (t === 'select') {
      const h = hit(w);
      if (!h) { E.sel = null; renderProps(); startPan(e); return; }
      E.sel = h; renderProps();
      E.drag = { start: w, orig: JSON.stringify(E.def), moved: false, h };
      return;
    }
    if (t === 'erase') { const h = hit(w); if (h) eraseHit(h); return; }
    if (t === 'ground') { addGroundPoint(w); return; }
    if (t === 'island') { addIslandPoint(w); return; }
    if (t === 'start') {
      E.push();
      const b = E.def.build;
      b.x = Math.round(w.x - b.w / 2);
      const g = JJ.groundBelow(JJ.Level.compile(U.clone(E.def)), w.x, w.y + 0.5);
      b.y = g != null && w.y - g < 3 ? +(g + 0.02).toFixed(2) : snapV(w.y);
      E.sel = { k: 'build' }; E.dirty = true; renderProps(); A.play('place'); return;
    }
    if (t === 'goal' || t === 'cap') {
      E.push();
      let y = snapV(w.y);
      if (t === 'goal') {
        const g = JJ.groundBelow(JJ.Level.compile(U.clone(E.def)), w.x, w.y + 0.5);
        if (g != null && w.y - g < 3) y = +(g + 1.4).toFixed(2);
      }
      E.def[t] = { x: snapV(w.x), y };
      E.sel = { k: t }; E.dirty = true; renderProps(); A.play('place'); return;
    }
    if (t.startsWith('obj:')) {
      E.push();
      const type = t.slice(4);
      const o = { type, x: snapV(w.x), y: snapV(w.y) };
      Object.assign(o, U.clone(JJ.Level.OBJECT_DEFAULTS[type] || {}));
      E.def.objects.push(o);
      E.sel = { k: 'obj', i: E.def.objects.length - 1 };
      E.dirty = true; renderProps(); A.play('place');
      setTool('select');
    }
  }

  function startPan(e) {
    const r = E.cv.getBoundingClientRect();
    E.pan = { x: e.clientX - r.left, y: e.clientY - r.top, cx: E.R.cam.x, cy: E.R.cam.y };
    E.cv.style.cursor = 'grabbing';
  }

  function onMove(e) {
    const r = E.cv.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (E.pointers.has(e.pointerId)) E.pointers.set(e.pointerId, { x: sx, y: sy });
    E.mouse = world(e);
    if (E.pinch && E.pointers.size === 2) {
      const [a, b] = Array.from(E.pointers.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      E.R.cam.zoom = U.clamp(E.pinch.zoom * d / Math.max(10, E.pinch.d), 3, 120);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      E.R.cam.x = E.pinch.cx - (mx - E.pinch.mx) / E.R.cam.zoom;
      E.R.cam.y = E.pinch.cy + (my - E.pinch.my) / E.R.cam.zoom;
      return;
    }
    if (E.pan) {
      E.R.cam.x = E.pan.cx - (sx - E.pan.x) / E.R.cam.zoom;
      E.R.cam.y = E.pan.cy + (sy - E.pan.y) / E.R.cam.zoom;
      return;
    }
    if (E.drag) {
      const w = E.mouse;
      let dx = w.x - E.drag.start.x, dy = w.y - E.drag.start.y;
      if (!E.drag.moved && Math.hypot(dx, dy) < px(4)) return;
      if (!E.drag.moved) { E.history.push(E.drag.orig); E.future = []; E.drag.moved = true; }
      const orig = JSON.parse(E.drag.orig);
      const h = E.drag.h;
      const sn = (v) => (E.snap ? Math.round(v * 2) / 2 : Math.round(v * 100) / 100);
      if (h.k === 'obj') {
        const o = E.def.objects[h.i], oo = orig.objects[h.i];
        o.x = sn(oo.x + dx); o.y = sn(oo.y + dy);
      } else if (h.k === 'goal' || h.k === 'cap') {
        E.def[h.k].x = sn(orig[h.k].x + dx); E.def[h.k].y = sn(orig[h.k].y + dy);
      } else if (h.k === 'build') {
        E.def.build.x = Math.round(orig.build.x + dx); E.def.build.y = +(orig.build.y + (E.snap ? Math.round(dy * 2) / 2 : dy)).toFixed(2);
      } else if (h.k === 'vtx') {
        const pt = E.def.terrain[h.p].pts[h.i], op = orig.terrain[h.p].pts[h.i];
        pt[0] = sn(op[0] + dx); pt[1] = sn(op[1] + dy);
      } else if (h.k === 'piece') {
        const ddx = E.snap ? Math.round(dx * 2) / 2 : dx, ddy = E.snap ? Math.round(dy * 2) / 2 : dy;
        E.def.terrain[h.p].pts = orig.terrain[h.p].pts.map((q) => [+(q[0] + ddx).toFixed(2), +(q[1] + ddy).toFixed(2)]);
      }
      E.dirty = true;
      renderPropsLight();
    }
  }

  function onUp(e) {
    E.pointers.delete(e.pointerId);
    if (E.pointers.size < 2) E.pinch = null;
    if (E.pointers.size === 0) {
      if (E.drag && E.drag.moved) renderProps();
      E.drag = null; E.pan = null;
      E.cv.style.cursor = E.tool === 'pan' ? 'grab' : E.tool === 'select' ? 'default' : 'crosshair';
    }
  }

  function onWheel(e) {
    e.preventDefault();
    const r = E.cv.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const before = E.R.screenToWorld(sx, sy);
    const nz = U.clamp(E.R.cam.zoom * Math.exp(-e.deltaY * 0.0015), 3, 120);
    E.R.cam.zoom = nz;
    E.R.cam.x = before.x - (sx - E.R.W / 2) / nz;
    E.R.cam.y = before.y + (sy - E.R.H / 2) / nz;
  }

  function onKey(e) {
    if (!E.mounted) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (document.querySelector('.adm-modal-back')) return;
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) E.redo(); else E.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (k === 'y' || k === 'Y')) { e.preventDefault(); E.redo(); return; }
    if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'S')) { e.preventDefault(); E.save(); return; }
    if (k === 'Escape') { if (E.drawing) finishIsland(); E.sel = null; renderProps(); return; }
    if (k === 'Enter' && E.drawing) { finishIsland(); return; }
    if ((k === 'Delete' || k === 'Backspace') && E.sel) { e.preventDefault(); eraseHit(E.sel); return; }
    if (k.startsWith('Arrow') && E.sel) {
      e.preventDefault();
      const st = e.shiftKey ? 0.1 : 0.5;
      const dx = k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, dy = k === 'ArrowDown' ? -st : k === 'ArrowUp' ? st : 0;
      E.push();
      moveSel(dx, dy);
    }
  }

  function moveSel(dx, dy) {
    const s = E.sel, d = E.def;
    const r2 = (v) => Math.round(v * 100) / 100;
    if (s.k === 'obj') { d.objects[s.i].x = r2(d.objects[s.i].x + dx); d.objects[s.i].y = r2(d.objects[s.i].y + dy); }
    else if (s.k === 'goal' || s.k === 'cap') { d[s.k].x = r2(d[s.k].x + dx); d[s.k].y = r2(d[s.k].y + dy); }
    else if (s.k === 'build') { d.build.x = Math.round(d.build.x + Math.sign(dx)); d.build.y = r2(d.build.y + dy); }
    else if (s.k === 'vtx') { const p = d.terrain[s.p].pts[s.i]; p[0] = r2(p[0] + dx); p[1] = r2(p[1] + dy); }
    else if (s.k === 'piece') d.terrain[s.p].pts.forEach((p) => { p[0] = r2(p[0] + dx); p[1] = r2(p[1] + dy); });
    E.dirty = true; renderProps();
  }

  function eraseHit(h) {
    const d = E.def;
    if (h.k === 'goal') { A.play('error'); JJ.Admin.toast('Every level needs a goal. Drag it somewhere else instead.'); return; }
    if (h.k === 'build') { A.play('error'); JJ.Admin.toast('Every level needs a build grid.'); return; }
    E.push();
    if (h.k === 'cap') d.cap = null;
    else if (h.k === 'obj') d.objects.splice(h.i, 1);
    else if (h.k === 'vtx') {
      const p = d.terrain[h.p];
      const min = p.closed ? 3 : 2;
      if (p.pts.length - 1 < min) d.terrain.splice(h.p, 1); else p.pts.splice(h.i, 1);
    } else if (h.k === 'piece') d.terrain.splice(h.p, 1);
    E.sel = null; E.dirty = true; renderProps(); A.play('remove');
  }

  function addGroundPoint(w) {
    const d = E.def;
    const x = snapV(w.x), y = snapV(w.y);
    let pi = E.sel && (E.sel.k === 'piece' || E.sel.k === 'vtx') && !d.terrain[E.sel.p].closed ? E.sel.p : -1;
    E.push();
    if (pi < 0) {
      d.terrain.push({ pts: [[x - 4, y], [x + 4, y]] });
      pi = d.terrain.length - 1;
      E.sel = { k: 'piece', p: pi };
    } else {
      const pts = d.terrain[pi].pts;
      let at = pts.length;
      for (let i = 0; i < pts.length; i++) if (pts[i][0] > x) { at = i; break; }
      pts.splice(at, 0, [x, y]);
      E.sel = { k: 'vtx', p: pi, i: at };
    }
    E.dirty = true; renderProps(); A.play('place');
  }

  function addIslandPoint(w) {
    const d = E.def;
    const x = snapV(w.x), y = snapV(w.y);
    if (!E.drawing) {
      E.push();
      d.terrain.push({ closed: true, pts: [[x, y]] });
      E.drawing = { p: d.terrain.length - 1 };
      E.dirty = true; A.play('place');
      return;
    }
    const pts = d.terrain[E.drawing.p].pts;
    if (pts.length >= 3 && Math.hypot(x - pts[0][0], y - pts[0][1]) < Math.max(0.6, px(14))) { finishIsland(); return; }
    pts.push([x, y]);
    E.dirty = true; A.play('place');
  }

  function finishIsland() {
    if (!E.drawing) return;
    const p = E.def.terrain[E.drawing.p];
    if (!p || p.pts.length < 3) { if (p) E.def.terrain.splice(E.drawing.p, 1); JJ.Admin.toast('An island needs at least 3 corners.'); }
    else { E.sel = { k: 'piece', p: E.drawing.p }; A.play('collect'); }
    E.drawing = null; E.dirty = true; renderProps();
  }

  // ------------------------------------------------------------ props panel
  function field(label, id, value, attrs) {
    return '<div class="ed-field"><label for="' + id + '">' + esc(label) + '</label><input type="number" id="' + id + '" value="' + value + '" ' + (attrs || 'step="0.5"') + '></div>';
  }

  function renderPropsLight() {
    // update coordinate inputs while dragging without rebuilding the panel
    const s = E.sel;
    if (!s) return;
    const set = (id, v) => { const el = E.el.querySelector('#' + id); if (el && document.activeElement !== el) el.value = v; };
    if (s.k === 'obj') { const o = E.def.objects[s.i]; if (o) { set('p-x', o.x); set('p-y', o.y); } }
    else if (s.k === 'goal' || s.k === 'cap') { const o = E.def[s.k]; if (o) { set('p-x', o.x); set('p-y', o.y); } }
    else if (s.k === 'build') { set('p-x', E.def.build.x); set('p-y', E.def.build.y); }
    else if (s.k === 'vtx') { const p = E.def.terrain[s.p] && E.def.terrain[s.p].pts[s.i]; if (p) { set('p-x', p[0]); set('p-y', p[1]); } }
  }

  function renderProps() {
    const box = E.el && E.el.querySelector('#ed-props');
    if (!box) return;
    const s = E.sel, d = E.def;
    let html = '';
    if (s && s.k === 'obj' && d.objects[s.i]) {
      const o = JJ.Level.withDefaults(d.objects[s.i]);
      const name = (OBJ_TOOLS.find((t) => t[0] === o.type) || [0, o.type])[1];
      html += '<h3>' + esc(name) + '</h3><div class="ed-pair">' + field('X', 'p-x', o.x) + field('Y', 'p-y', o.y) + '</div>';
      if (['platform', 'ramp', 'crate', 'plank', 'wind', 'barricade'].includes(o.type)) html += '<div class="ed-pair">' + field('Width', 'p-w', o.w, 'step="0.5" min="0.3"') + field('Height', 'p-h', o.h, 'step="0.5" min="0.2"') + '</div>';
      if (['spikes', 'bounce', 'seesaw'].includes(o.type)) html += '<div class="ed-pair">' + field('Width', 'p-w', o.w, 'step="0.5" min="0.5"') + '<span></span></div>';
      if (['ball', 'rock'].includes(o.type)) html += field('Radius', 'p-r', o.r, 'step="0.1" min="0.2"');
      if (['platform', 'plank', 'crate', 'spikes', 'bounce', 'seesaw', 'barricade'].includes(o.type)) html += field('Angle (degrees)', 'p-angle', o.angle || 0, 'step="5"');
      if (o.type === 'ramp') html += '<div class="ed-field"><label for="p-dir">Slope goes up to the</label><select id="p-dir"><option value="1"' + (o.dir !== -1 ? ' selected' : '') + '>Right</option><option value="-1"' + (o.dir === -1 ? ' selected' : '') + '>Left</option></select></div>';
      if (o.type === 'platform') html += '<div class="ed-field"><label for="p-mat">Material</label><select id="p-mat">' + ['wood', 'metal', 'stone'].map((m) => '<option' + (o.mat === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div>';
      if (o.type === 'wind') html += '<div class="ed-pair">' + field('Strength', 'p-force', o.force, 'step="1" min="1" max="80"') + field('Blows toward (deg)', 'p-wangle', o.angle == null ? 90 : o.angle, 'step="15"') + '</div><p class="ed-hint">90 blows straight up. Open parachutes ride updrafts best.</p>';
      if (o.type === 'bounce') html += '<div class="ed-pair">' + field('Power', 'p-power', o.power || 1, 'step="0.1" min="0.3" max="3"') + field('Forward shove', 'p-push', o.push == null ? 2.5 : o.push, 'step="0.5" min="0" max="10"') + '</div>';
      html += '<div class="adm-actions"><button class="abtn sm" data-a="dup" type="button"><span data-icon="copy"></span>Duplicate</button><button class="abtn r sm" data-a="del" type="button"><span data-icon="trash"></span>Delete</button></div>';
    } else if (s && s.k === 'vtx' && d.terrain[s.p]) {
      const p = d.terrain[s.p].pts[s.i];
      html += '<h3>Ground corner</h3><div class="ed-pair">' + field('X', 'p-x', p[0]) + field('Y', 'p-y', p[1]) + '</div>' +
        '<p class="ed-hint">Drag corners to reshape the ground. Use the Ground tool to add more.</p>' +
        '<div class="adm-actions"><button class="abtn r sm" data-a="del" type="button"><span data-icon="trash"></span>Delete corner</button></div>';
    } else if (s && s.k === 'piece' && d.terrain[s.p]) {
      const p = d.terrain[s.p];
      html += '<h3>' + (p.closed ? 'Floating island' : 'Ground') + '</h3><p class="ed-hint">' + p.pts.length + ' corners. Drag to move the whole piece. ' + (p.closed ? '' : 'With this selected, the Ground tool adds corners to it.') + '</p>' +
        '<div class="adm-actions"><button class="abtn r sm" data-a="del" type="button"><span data-icon="trash"></span>Delete piece</button></div>';
    } else if (s && (s.k === 'goal' || s.k === 'cap') && d[s.k]) {
      html += '<h3>' + (s.k === 'goal' ? 'Snack stash (goal)' : 'Bottle cap') + '</h3><div class="ed-pair">' + field('X', 'p-x', d[s.k].x) + field('Y', 'p-y', d[s.k].y) + '</div>' +
        (s.k === 'goal' ? '<p class="ed-hint">Rocco wins when his seat gets within 1.5 m of the center. Put it about 1.4 above the ground.</p>' : '<div class="adm-actions"><button class="abtn r sm" data-a="del" type="button"><span data-icon="trash"></span>Remove cap</button></div>');
    } else if (s && s.k === 'build') {
      const b = d.build;
      html += '<h3>Build grid</h3><div class="ed-pair">' + field('X (left)', 'p-x', b.x, 'step="1"') + field('Y (bottom)', 'p-y', b.y, 'step="0.5"') + '</div>' +
        '<div class="ed-pair">' + field('Columns', 'p-bw', b.w, 'step="1" min="1" max="12"') + field('Rows', 'p-bh', b.h, 'step="1" min="1" max="8"') + '</div>' +
        '<p class="ed-hint">Keep the bottom just above the ground so wheels start on it.</p>';
    } else {
      // level settings
      const st = d.star3 || { type: 'time', value: 15 };
      html += '<h3>Level settings</h3>' +
        '<div class="ed-field"><label for="lv-hint">Tip shown to players</label><textarea id="lv-hint" rows="3" maxlength="200" style="font-family:inherit;font-size:0.9rem">' + esc(d.hint || '') + '</textarea></div>' +
        '<div class="ed-field"><label for="lv-grav">Gravity: <b id="lv-grav-v">' + (+(d.gravity || 1)).toFixed(2) + '</b></label><input type="range" id="lv-grav" min="0.2" max="1.5" step="0.05" value="' + (d.gravity || 1) + '"></div>' +
        '<div class="ed-field"><label for="lv-s3">Third star</label><select id="lv-s3">' +
        [['time', 'Finish within a time'], ['intact', 'Don\'t break anything'], ['maxParts', 'Use few parts'], ['noPart', 'Without a certain part'], ['none', 'Free star']].map(([k, n]) => '<option value="' + k + '"' + ((st && st.type === k) || (!d.star3 && k === 'none') ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>' +
        (st && (st.type === 'time' || st.type === 'maxParts') ? field(st.type === 'time' ? 'Seconds' : 'Max parts', 'lv-s3v', st.value || 10, 'step="1" min="1"') : '') +
        (st && st.type === 'noPart' ? '<div class="ed-field"><label for="lv-s3p">Part not allowed</label><select id="lv-s3p">' + JJ.PART_ORDER.filter((k) => k !== 'seat').map((k) => '<option value="' + k + '"' + (st.part === k ? ' selected' : '') + '>' + JJ.PARTS[k].name + '</option>').join('') + '</select></div>' : '') +
        '<div class="ed-field"><span>Parts players get</span><label style="text-transform:none;letter-spacing:0;font-size:0.9rem;color:#f4ecd8;display:flex;gap:8px;align-items:center"><input type="checkbox" id="lv-sandbox"' + (d.sandbox ? ' checked' : '') + ' style="accent-color:#ffcf3f;width:18px;height:18px"> Unlimited (sandbox)</label>' +
        '<div class="ed-parts">' + JJ.PART_ORDER.map((k) => '<div class="ed-part"><canvas width="56" height="56" data-pi="' + k + '"></canvas><input type="number" min="0" max="99" step="1" data-part="' + k + '" value="' + (k === 'seat' ? 1 : (d.parts[k] || 0)) + '" aria-label="' + esc(JJ.PARTS[k].name) + '"' + (k === 'seat' || d.sandbox ? ' disabled' : '') + '></div>').join('') + '</div></div>' +
        '<p class="ed-hint">Tip: select things on the canvas to edit them. Right-click deletes. Ctrl+Z undoes.</p>';
    }
    box.innerHTML = html;
    UI.hydrate(box);
    box.querySelectorAll('canvas[data-pi]').forEach((c) => { const ic = JJ.Art.partIcon(c.dataset.pi, 0, 56); if (ic) c.getContext('2d').drawImage(ic, 0, 0); });
    bindProps(box);
  }

  function bindProps(box) {
    const s = E.sel, d = E.def;
    const num = (id, fn) => {
      const el = box.querySelector('#' + id);
      if (!el) return;
      el.onfocus = () => E.push(true);
      el.oninput = () => { const v = parseFloat(el.value); if (isFinite(v)) { fn(v); E.dirty = true; } };
    };
    const sel = (id, fn) => { const el = box.querySelector('#' + id); if (el) el.onchange = () => { E.push(); fn(el.value); E.dirty = true; renderProps(); }; };
    const btn = (a, fn) => { const el = box.querySelector('[data-a=' + a + ']'); if (el) el.onclick = () => { A.play('click'); fn(); }; };
    if (s && s.k === 'obj') {
      const o = d.objects[s.i];
      num('p-x', (v) => { o.x = v; }); num('p-y', (v) => { o.y = v; });
      num('p-w', (v) => { o.w = Math.max(0.2, v); }); num('p-h', (v) => { o.h = Math.max(0.2, v); });
      num('p-r', (v) => { o.r = Math.max(0.1, v); }); num('p-angle', (v) => { o.angle = v; });
      num('p-force', (v) => { o.force = U.clamp(v, 1, 80); }); num('p-wangle', (v) => { o.angle = v; });
      num('p-power', (v) => { o.power = U.clamp(v, 0.3, 3); }); num('p-push', (v) => { o.push = U.clamp(v, 0, 10); });
      sel('p-dir', (v) => { o.dir = +v; }); sel('p-mat', (v) => { o.mat = v; });
      btn('dup', () => { E.push(); const c = U.clone(o); c.x += 1; c.y += 1; d.objects.push(c); E.sel = { k: 'obj', i: d.objects.length - 1 }; E.dirty = true; renderProps(); });
      btn('del', () => eraseHit(s));
    } else if (s && s.k === 'vtx') {
      const p = d.terrain[s.p].pts[s.i];
      num('p-x', (v) => { p[0] = v; }); num('p-y', (v) => { p[1] = v; });
      btn('del', () => eraseHit(s));
    } else if (s && s.k === 'piece') {
      btn('del', () => eraseHit(s));
    } else if (s && (s.k === 'goal' || s.k === 'cap')) {
      num('p-x', (v) => { d[s.k].x = v; }); num('p-y', (v) => { d[s.k].y = v; });
      btn('del', () => eraseHit(s));
    } else if (s && s.k === 'build') {
      num('p-x', (v) => { d.build.x = Math.round(v); }); num('p-y', (v) => { d.build.y = v; });
      num('p-bw', (v) => { d.build.w = U.clamp(Math.round(v), 1, 12); }); num('p-bh', (v) => { d.build.h = U.clamp(Math.round(v), 1, 8); });
    } else {
      const hint = box.querySelector('#lv-hint');
      hint.onfocus = () => E.push(true);
      hint.oninput = () => { d.hint = hint.value; };
      const gr = box.querySelector('#lv-grav');
      gr.onfocus = () => E.push(true);
      gr.oninput = () => { d.gravity = +gr.value; if (Math.abs(d.gravity - 1) < 0.01) delete d.gravity; box.querySelector('#lv-grav-v').textContent = (+gr.value).toFixed(2); };
      sel('lv-s3', (v) => {
        if (v === 'none') d.star3 = null;
        else if (v === 'time') d.star3 = { type: 'time', value: 15 };
        else if (v === 'maxParts') d.star3 = { type: 'maxParts', value: 6 };
        else if (v === 'noPart') d.star3 = { type: 'noPart', part: 'rocket' };
        else d.star3 = { type: v };
      });
      num('lv-s3v', (v) => { if (d.star3) d.star3.value = Math.max(1, Math.round(v)); });
      sel('lv-s3p', (v) => { if (d.star3) d.star3.part = v; });
      const sb = box.querySelector('#lv-sandbox');
      sb.onchange = () => { E.push(); d.sandbox = sb.checked || undefined; renderProps(); };
      box.querySelectorAll('input[data-part]').forEach((i) => {
        i.onfocus = () => E.push(true);
        i.oninput = () => {
          const k = i.dataset.part, v = Math.max(0, Math.min(99, Math.round(+i.value || 0)));
          if (k === 'seat') return;
          if (v > 0) d.parts[k] = v; else delete d.parts[k];
        };
      });
    }
  }

  // ------------------------------------------------------------ drawing
  function frame(ts) {
    if (!E.mounted) return;
    E.raf = requestAnimationFrame(frame);
    const R = E.R;
    if (!R) return;
    if (R.canvas.clientWidth !== R.W || R.canvas.clientHeight !== R.H) R.resize();
    const t = ts / 1000;
    if (E.dirty || !E.L) {
      try { E.L = JJ.Level.compile(U.clone(E.def)); } catch (err) { /* keep last good */ }
      E.dirty = false;
    }
    const L = E.L;
    if (!L) return;
    try {
      R.drawBackground(L.theme, L.seed, t * 0.3);
      R.drawWind(L, t);
      R.drawTerrain(L, t);
      R.drawGoalAndCap(L, t, null);
      R.drawProps(L, null, t);
      R.drawBuildGrid(L, null);
      drawOverlay(L, t);
    } catch (err) { /* ignore half-edited data */ }
    const st = E.el.querySelector('#ed-status');
    if (st) st.textContent = (E.mouse ? 'x ' + E.mouse.x.toFixed(1) + '  y ' + E.mouse.y.toFixed(1) + '  |  ' : '') + (TOOL_HELP[E.tool] || 'Click to place it.');
  }

  function drawOverlay(L, t) {
    const R = E.R, ctx = R.ctx, d = E.def;
    R.setWorld();
    const z = R.cam.zoom;
    // metre grid
    if (z > 9) {
      const tl = R.screenToWorld(0, 0), br = R.screenToWorld(R.W, R.H);
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 1 / z;
      ctx.beginPath();
      for (let x = Math.floor(tl.x); x <= br.x; x++) { ctx.moveTo(x, br.y); ctx.lineTo(x, tl.y); }
      for (let y = Math.floor(br.y); y <= tl.y; y++) { ctx.moveTo(tl.x, y); ctx.lineTo(br.x, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.moveTo(0, br.y); ctx.lineTo(0, tl.y); ctx.moveTo(tl.x, 0); ctx.lineTo(br.x, 0); ctx.stroke();
    }
    // kill line
    ctx.setLineDash([0.5, 0.4]);
    ctx.strokeStyle = 'rgba(255,80,80,0.5)'; ctx.lineWidth = 2 / z;
    ctx.beginPath(); ctx.moveTo(L.bounds.minX - 20, L.killY); ctx.lineTo(L.bounds.maxX + 20, L.killY); ctx.stroke();
    ctx.setLineDash([]);
    // terrain corner handles
    d.terrain.forEach((p, pi) => {
      const active = E.sel && (E.sel.k === 'piece' || E.sel.k === 'vtx') && E.sel.p === pi;
      const drawing = E.drawing && E.drawing.p === pi;
      if (drawing) {
        ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 3 / z;
        ctx.beginPath(); p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        if (E.mouse) ctx.lineTo(snapV(E.mouse.x), snapV(E.mouse.y));
        ctx.stroke();
      }
      if (active) {
        ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 3 / z;
        ctx.beginPath(); p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        if (p.closed) ctx.closePath();
        ctx.stroke();
      }
      for (let i = 0; i < p.pts.length; i++) {
        const q = p.pts[i];
        const selected = E.sel && E.sel.k === 'vtx' && E.sel.p === pi && E.sel.i === i;
        const r = (selected ? 8 : active || drawing ? 6 : 4) / z;
        ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2);
        ctx.fillStyle = selected ? '#ffcf3f' : active || drawing ? '#fff' : 'rgba(255,255,255,0.55)';
        ctx.fill();
        ctx.lineWidth = 2 / z; ctx.strokeStyle = '#2a1d14'; ctx.stroke();
      }
    });
    // selection box
    const s = E.sel;
    let box = null;
    if (s && s.k === 'obj' && d.objects[s.i]) box = objBox(d.objects[s.i]);
    else if (s && s.k === 'goal' && d.goal) box = { x: d.goal.x, y: d.goal.y, w: 3.2, h: 3.2 };
    else if (s && s.k === 'cap' && d.cap) box = { x: d.cap.x, y: d.cap.y, w: 1.4, h: 1.4 };
    else if (s && s.k === 'build') box = { x: d.build.x + d.build.w / 2, y: d.build.y + d.build.h / 2, w: d.build.w + 0.3, h: d.build.h + 0.3 };
    if (box) {
      ctx.setLineDash([6 / z, 4 / z]);
      ctx.lineDashOffset = -t * 20 / z;
      ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 2.5 / z;
      ctx.strokeRect(box.x - box.w / 2 - 0.1, box.y - box.h / 2 - 0.1, box.w + 0.2, box.h + 0.2);
      ctx.setLineDash([]);
    }
    // labels
    R.setScreen();
    const lab = (txt, x, y) => {
      const sp = R.worldToScreen(x, y);
      ctx.font = '800 12px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(17,19,24,0.85)'; ctx.strokeText(txt, sp.x, sp.y);
      ctx.fillStyle = '#fff'; ctx.fillText(txt, sp.x, sp.y);
    };
    lab('START', d.build.x + d.build.w / 2, d.build.y + d.build.h + 0.6);
    if (d.goal) lab('GOAL', d.goal.x, d.goal.y + 2.6);
    const kl = R.worldToScreen(R.cam.x, L.killY);
    if (kl.y > 0 && kl.y < R.H) { ctx.textAlign = 'left'; ctx.font = '800 11px Nunito, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,120,120,0.9)'; ctx.fillText('fall line', 8, kl.y - 4); }
  }

  JJ.Editor = E;
})((globalThis.JJ = globalThis.JJ || {}));
