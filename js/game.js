/* Junkyard Joyride - game controller: screens, build mode, play mode, camera, input */
(function (JJ) {
  'use strict';
  const U = JJ.U, Store = JJ.Store, A = JJ.Audio, UI = JJ.UI, PARTS = JJ.PARTS;
  const $ = (s) => document.querySelector(s);
  const DT = 1 / 120;

  const G = {
    state: 'boot', t: 0, paused: false,
    R: null, def: null, L: null,
    design: { cells: [] }, allowed: {}, tool: null, rot: {}, history: [],
    hover: null, stroke: null, viewAll: false, cam: { x: 0, y: 0, zoom: 40 }, userZoom: 1,
    sim: null, acc: 0, test: null, pointers: new Map(),
    worldTab: 0
  };

  // ------------------------------------------------------------------ demo
  const DEMO = {
    id: 'demo', theme: 'hills',
    build: { x: 0, y: 0.6, w: 5, h: 4 },
    terrain: [{ pts: (function () {
      const p = [[-30, 14], [-28, 0]];
      for (let x = -20; x <= 420; x += 4) p.push([x, +(Math.sin(x * 0.09) * 1.2 + Math.sin(x * 0.031) * 2.2 + 2.2).toFixed(2)]);
      p.push([428, 14]);
      return p;
    })() }],
    objects: [], goal: null, cap: null
  };
  const DEMO_ROWS = ['WSWEE', 'P...P', 'O...O'];
  const ROWMAP = { S: 'seat', W: 'wood', E: 'engine', P: 'spring', O: 'wheel', B: 'balloon', N: 'wing' };

  function rowsDesign(rows) {
    const cells = [];
    rows.forEach((row, k) => { for (let i = 0; i < row.length; i++) if (ROWMAP[row[i]]) cells.push({ i, j: rows.length - 1 - k, t: ROWMAP[row[i]], r: 0 }); });
    return { cells };
  }

  function startDemo() {
    const def = U.clone(DEMO);
    const x0 = 0, y0 = 1.2 * Math.sin(0) + 2.2 * Math.sin(0) + 2.2 + 0.05;
    def.build.x = x0; def.build.y = y0;
    G.demoL = JJ.Level.compile(def);
    G.demo = new JJ.Sim(G.demoL, rowsDesign(DEMO_ROWS), {});
    G.demo.toggleGroup('engine:0');
    G.demoBest = 0; G.demoStuck = 0;
    const f = G.demo.focus();
    G.R.cam.x = f.x; G.R.cam.y = f.y;
  }

  // ---------------------------------------------------------------- screens
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== 'scr-' + name; });
    $('#quick').hidden = true;
    const admin = Store.isAdmin();
    document.querySelectorAll('.admin-only').forEach((b) => { b.hidden = !admin; });
    const ch = Store.cheatsActive();
    $('#bd-cheats').hidden = !ch;
    $('#pl-cheats').hidden = !ch;
  }

  G.showTitle = function () {
    stopSim();
    G.state = 'title';
    G.test = null;
    show('title');
    const motd = (Store.admin.motd || (window.JJ_CONFIG && window.JJ_CONFIG.motd) || '').trim();
    const m = $('#motd');
    m.hidden = !motd; m.textContent = motd;
    startDemo();
    A.setIntensity(0); A.stopLoops();
  };

  // ---------------------------------------------------------------- levels
  function worldList() {
    const tabs = JJ.WORLDS.map((w, i) => ({ key: 'w' + i, name: w.name, blurb: w.blurb, theme: w.theme, levels: JJ.LEVELS.filter((l) => l.world === i) }));
    const site = globalThis.JJ_SITE_LEVELS || [];
    if (site.length) tabs.push({ key: 'bonus', name: 'Bonus', blurb: 'Extra levels made by the owner of this site.', theme: 'snow', levels: site, free: true });
    if (Store.custom.length) tabs.push({ key: 'custom', name: 'My Levels', blurb: 'Levels you made in the Admin level editor.', theme: 'hills', levels: Store.custom, free: true });
    return tabs;
  }

  G.isUnlocked = function (def) {
    if (Store.cheats.unlockAll) return true;
    const idx = JJ.LEVELS.indexOf(def);
    if (idx <= 0) return true;
    return !!(Store.progress[JJ.LEVELS[idx - 1].id] || {}).done;
  };

  G.levelNumber = function (def) {
    if (def.sandbox) return 'SB';
    const idx = JJ.LEVELS.indexOf(def);
    if (idx < 0) return '★';
    const w = def.world;
    const inWorld = JJ.LEVELS.filter((l) => l.world === w).indexOf(def);
    return (w + 1) + '-' + (inWorld + 1);
  };

  G.showLevels = function (tabKey) {
    stopSim();
    G.state = 'levels';
    G.test = null;
    show('levels');
    const tabs = worldList();
    if (tabKey == null) {
      // first world with unbeaten levels
      let k = 0;
      for (let i = 0; i < JJ.WORLDS.length; i++) {
        const lv = tabs[i].levels;
        if (lv.some((l) => G.isUnlocked(l))) k = i;
        if (lv.some((l) => !(Store.progress[l.id] || {}).done && G.isUnlocked(l))) { k = i; break; }
      }
      tabKey = G.lastTab != null && tabs.some((t) => t.key === G.lastTab) ? G.lastTab : tabs[k].key;
    }
    G.lastTab = tabKey;
    const tab = tabs.find((t) => t.key === tabKey) || tabs[0];
    const bar = $('#world-tabs');
    bar.innerHTML = '';
    for (const t of tabs) {
      const b = document.createElement('button');
      b.className = 'tab'; b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', t.key === tab.key ? 'true' : 'false');
      const got = t.levels.reduce((s, l) => s + ((Store.progress[l.id] || {}).stars || []).filter(Boolean).length, 0);
      b.innerHTML = UI.esc(t.name) + '<span class="tab-stars">★ ' + got + '/' + t.levels.length * 3 + '</span>';
      b.onclick = () => { A.play('click'); G.showLevels(t.key); };
      bar.appendChild(b);
    }
    $('#world-name').textContent = tab.name;
    $('#world-blurb').textContent = tab.blurb;
    $('#star-total').textContent = Store.totalStars();
    const grid = $('#level-grid');
    grid.innerHTML = '';
    tab.levels.forEach((def, i) => {
      const unlocked = tab.free || G.isUnlocked(def);
      const pr = Store.progress[def.id] || {};
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile' + (unlocked ? '' : ' locked') + (pr.done ? ' done' : '');
      const stars = (pr.stars || [false, false, false]).map((s) => '<span class="s' + (s ? ' on' : '') + '">★</span>').join('');
      b.innerHTML = unlocked
        ? '<span class="t-num">' + (tab.free ? i + 1 : G.levelNumber(def)) + '</span><span class="t-name">' + UI.esc(def.name || 'Untitled') + '</span><span class="t-stars">' + stars + '</span>'
        : '<span class="t-lock"><span data-icon="lock"></span></span><span class="t-num">' + G.levelNumber(def) + '</span>';
      b.title = unlocked ? def.name : 'Beat the level before this one to unlock it';
      b.onclick = () => {
        if (!unlocked) { A.play('error'); UI.toast('Locked! Beat the level before it first.', 'bad'); return; }
        A.play('click');
        G.openLevel(def);
      };
      grid.appendChild(b);
    });
    if (tab.key.startsWith('w') && tab.key === 'w0') {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile special';
      b.innerHTML = '<span class="t-num"><span data-icon="wrench"></span></span><span class="t-name">Sandbox<br>Build anything</span>';
      b.onclick = () => { A.play('click'); G.openLevel(JJ.SANDBOX); };
      grid.appendChild(b);
    }
    if (!tab.levels.length) grid.innerHTML = '<p class="empty-note">No levels here yet.</p>';
    UI.hydrate(document.getElementById('scr-levels'));
    // background scene
    const bgDef = tab.levels[0] || JJ.LEVELS[0];
    G.bgL = JJ.Level.compile(U.clone(bgDef));
    G.R.cam.zoom = Math.max(18, Math.min(G.R.W / 34, G.R.H / 20));
    G.R.cam.x = G.bgL.build.x + 8; G.R.cam.y = G.bgL.build.y + 3;
  };

  // ----------------------------------------------------------------- build
  function computeAllowed(def) {
    const out = {};
    if (def.sandbox || Store.cheats.unlimitedParts) {
      for (const k of JJ.PART_ORDER) out[k] = k === 'seat' ? 1 : Infinity;
      return out;
    }
    for (const k of JJ.PART_ORDER) if (def.parts && def.parts[k] > 0) out[k] = def.parts[k];
    if (!out.seat) out.seat = 1;
    return out;
  }
  function used(t) { let n = 0; for (const c of G.design.cells) if (c.t === t) n++; return n; }
  function left(t) { return (G.allowed[t] || 0) - used(t); }

  G.openLevel = function (def, opts) {
    stopSim();
    G.def = def;
    G.L = JJ.Level.compile(U.clone(def));
    G.test = opts && opts.test ? opts : null;
    G.allowed = computeAllowed(def);
    const b = G.L.build;
    const saved = Store.designs[def.id];
    G.design = { cells: [] };
    if (saved && saved.cells) {
      for (const c of saved.cells) {
        if (!PARTS[c.t] || c.i < 0 || c.j < 0 || c.i >= b.w || c.j >= b.h) continue;
        if (left(c.t) <= 0) continue;
        if (JJ.Parts.cellAt(G.design, c.i, c.j)) continue;
        G.design.cells.push({ i: c.i, j: c.j, t: c.t, r: c.r || 0 });
      }
    }
    G.history = [];
    G.tool = used('seat') ? (G.allowed.wood ? 'wood' : JJ.PART_ORDER.find((k) => G.allowed[k] && k !== 'seat')) : 'seat';
    G.hintHidden = !Store.settings.hints;
    G.enterBuild(true);
  };

  G.enterBuild = function (fresh) {
    stopSim();
    G.state = 'build';
    G.paused = false;
    show('build');
    G.viewAll = false;
    G.userZoom = 1;
    G.R.particles.length = 0;
    $('#bd-num').textContent = G.test ? 'TEST' : G.levelNumber(G.def);
    $('#bd-name').textContent = G.def.name || 'Untitled';
    $('#bd-view').classList.remove('on');
    renderObjectives();
    renderHint();
    renderToolbar();
    fitBuildCamera(!!fresh);
    A.setIntensity(0);
    A.stopLoops();
  };

  function renderObjectives() {
    const pr = Store.progress[G.def.id] || { stars: [] };
    const st = pr.stars || [];
    const items = G.def.sandbox
      ? ['Build anything you like', 'Reach the flag at the far end', 'Have fun!']
      : ['Get Rocco to the snack stash', G.def.cap ? 'Grab the shiny bottle cap' : 'Bonus star (no cap here)', JJ.Level.star3Text(G.def.star3)];
    $('#bd-objectives').innerHTML = items.map((txt, i) => '<div class="obj"><span class="s' + (st[i] ? ' on' : '') + '">★</span><span>' + UI.esc(txt) + '</span></div>').join('');
  }

  function renderHint() {
    const h = $('#bd-hint');
    const text = G.def.hint || '';
    h.hidden = !text || G.hintHidden;
    $('#bd-hint-text').textContent = text;
    UI.drawFace(h.querySelector('canvas'), 'happy');
  }

  function renderToolbar() {
    const bar = $('#toolbar');
    bar.innerHTML = '';
    let k = 0;
    const keys = '1234567890';
    for (const t of JJ.PART_ORDER) {
      if (!G.allowed[t]) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.dataset.tool = t;
      b.title = PARTS[t].name + ' - ' + PARTS[t].desc;
      const c = document.createElement('canvas');
      c.width = c.height = 104;
      const ic = JJ.Art.partIcon(t, G.rot[t] != null ? G.rot[t] : JJ.Parts.defaultRot(t), 104);
      c.getContext('2d').drawImage(ic, 0, 0);
      b.appendChild(c);
      const cnt = document.createElement('span');
      cnt.className = 'count';
      b.appendChild(cnt);
      if (k < 10) { const ks = document.createElement('span'); ks.className = 'key'; ks.textContent = keys[k]; b.appendChild(ks); b.dataset.key = keys[k]; }
      k++;
      b.onclick = () => selectTool(t);
      bar.appendChild(b);
    }
    const e = document.createElement('button');
    e.type = 'button'; e.className = 'slot eraser'; e.dataset.tool = 'erase'; e.title = 'Eraser - remove parts (or right-click)';
    e.innerHTML = '<span data-icon="eraser"></span>';
    e.onclick = () => selectTool('erase');
    bar.appendChild(e);
    UI.hydrate(bar);
    updateToolbar();
  }

  function updateToolbar() {
    document.querySelectorAll('#toolbar .slot').forEach((s) => {
      const t = s.dataset.tool;
      s.classList.toggle('sel', t === G.tool);
      if (t === 'erase') return;
      const n = left(t);
      const cnt = s.querySelector('.count');
      if (G.allowed[t] === Infinity) { cnt.textContent = '∞'; cnt.classList.add('inf'); }
      else { cnt.textContent = n; cnt.classList.remove('inf'); }
      s.classList.toggle('empty', n <= 0 && t !== 'seat');
    });
    const info = $('#part-info');
    if (G.tool && G.tool !== 'erase') info.innerHTML = '<b>' + UI.esc(PARTS[G.tool].name) + '</b>' + UI.esc(PARTS[G.tool].desc);
    else if (G.tool === 'erase') info.innerHTML = '<b>Eraser</b>Tap parts to remove them. Right-click also works.';
    else info.innerHTML = '';
    const go = $('#bd-go');
    go.classList.toggle('pulse', used('seat') > 0 && G.design.cells.length >= 3 && !Store.progress[G.def.id]);
  }

  function refreshToolIcon(t) {
    const s = document.querySelector('#toolbar .slot[data-tool="' + t + '"] canvas');
    if (!s) return;
    const ctx = s.getContext('2d');
    ctx.clearRect(0, 0, s.width, s.height);
    ctx.drawImage(JJ.Art.partIcon(t, G.rot[t] || 0, 104), 0, 0);
  }

  function selectTool(t) {
    A.play('click');
    if (G.tool === t && JJ.PARTS[t] && PARTS[t].rotations) {
      G.rot[t] = JJ.Parts.nextRot(t, G.rot[t] != null ? G.rot[t] : JJ.Parts.defaultRot(t));
      refreshToolIcon(t);
      A.play('rotate');
    }
    G.tool = t;
    updateToolbar();
  }

  function snapshot() { return G.design.cells.map((c) => ({ i: c.i, j: c.j, t: c.t, r: c.r })); }
  function pushHistory() { G.history.push(snapshot()); if (G.history.length > 60) G.history.shift(); }
  function sameDesign(a, b) {
    if (a.length !== b.length) return false;
    const key = (c) => c.i + ',' + c.j + ',' + c.t + ',' + c.r;
    const s = new Set(a.map(key));
    return b.every((c) => s.has(key(c)));
  }

  G.undo = function () {
    if (!G.history.length) { A.play('error'); return; }
    G.design.cells = G.history.pop();
    A.play('remove');
    updateToolbar();
  };

  G.clearDesign = function () {
    if (!G.design.cells.length) return;
    UI.confirm('Clear everything?', 'This removes every part from the grid. You can undo it.', 'Clear', () => {
      pushHistory();
      G.design.cells = [];
      A.play('remove');
      updateToolbar();
    }, true);
  };

  function cellFromWorld(w) {
    const b = G.L.build;
    const i = Math.floor(w.x - b.x), j = Math.floor(w.y - b.y);
    if (i < 0 || j < 0 || i >= b.w || j >= b.h) return null;
    return { i, j };
  }

  // returns what happened: 'place' | 'rot' | 'replace' | 'move' | null
  function placeAt(cell, paintOnly) {
    const t = G.tool;
    if (!t || t === 'erase') return null;
    const ex = JJ.Parts.cellAt(G.design, cell.i, cell.j);
    if (ex) {
      if (paintOnly) return null;
      if (ex.t === t) {
        if (PARTS[t].rotations) {
          ex.r = JJ.Parts.nextRot(t, ex.r);
          G.rot[t] = ex.r;
          refreshToolIcon(t);
          A.play('rotate');
          return 'rot';
        }
        return null;
      }
      if (t === 'seat') {
        const seat = G.design.cells.find((c) => c.t === 'seat');
        if (seat) { // swap places
          const old = { t: ex.t, r: ex.r };
          ex.t = 'seat'; ex.r = 0; seat.t = old.t; seat.r = old.r;
          A.play('place');
          return 'move';
        }
      }
      if (left(t) <= 0) { A.play('error'); UI.toast('No ' + PARTS[t].name + ' parts left!', 'bad', 1500); return null; }
      ex.t = t; ex.r = G.rot[t] != null ? G.rot[t] : JJ.Parts.defaultRot(t);
      A.play(t === 'metal' ? 'placeMetal' : 'place');
      Store.bumpStat('partsPlaced');
      return 'replace';
    }
    if (t === 'seat' && used('seat') >= 1) {
      if (paintOnly) return null;
      const seat = G.design.cells.find((c) => c.t === 'seat');
      seat.i = cell.i; seat.j = cell.j;
      A.play('place');
      return 'move';
    }
    if (left(t) <= 0) {
      if (!paintOnly) { A.play('error'); UI.toast('No ' + PARTS[t].name + ' parts left!', 'bad', 1500); }
      return null;
    }
    G.design.cells.push({ i: cell.i, j: cell.j, t, r: G.rot[t] != null ? G.rot[t] : JJ.Parts.defaultRot(t) });
    A.play(t === 'metal' ? 'placeMetal' : 'place');
    Store.bumpStat('partsPlaced');
    if (left(t) <= 0 && t !== 'seat') {
      // auto-advance to a part that is still available
      const next = JJ.PART_ORDER.find((k) => G.allowed[k] && k !== 'seat' && left(k) > 0);
      if (next && G.allowed[t] !== Infinity) { G.tool = next; }
    }
    return 'place';
  }

  function eraseAt(cell) {
    const idx = G.design.cells.findIndex((c) => c.i === cell.i && c.j === cell.j);
    if (idx < 0) return false;
    G.design.cells.splice(idx, 1);
    A.play('remove');
    return true;
  }

  function fitBuildCamera(snap) {
    const R = G.R, b = G.L.build;
    const dockH = window.innerWidth <= 520 ? 190 : 140;
    const topH = 80;
    const availW = R.W - 40, availH = R.H - dockH - topH;
    const zoom = U.clamp(Math.min(availW / (b.w + 5), availH / (b.h + 3.5)), 14, 96);
    const cx = b.x + b.w / 2 + (R.W > 900 ? 2.2 : 0.5);
    const cy = b.y + b.h / 2 - (dockH - topH) / 2 / zoom + 0.6;
    G.cam = { x: cx, y: cy, zoom };
    if (snap) { R.cam.x = cx; R.cam.y = cy; R.cam.zoom = zoom; }
  }

  function fitWholeLevel() {
    const R = G.R, L = G.L;
    const bb = L.bounds;
    const minX = bb.minX + 4, maxX = bb.maxX - 4;
    let minY = Infinity, maxY = -Infinity;
    for (const poly of L.polys) for (const q of poly) { if (q[1] > L.bottom + 1) { minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); } }
    for (const pt of [L.goal, L.cap, { x: L.build.x, y: L.build.y + L.build.h }]) if (pt) { minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y); }
    if (!isFinite(minY)) { minY = -2; maxY = 10; }
    minY -= 3; maxY += 4;
    const zoom = U.clamp(Math.min((R.W - 40) / (maxX - minX), (R.H - 220) / (maxY - minY)), 4, 60);
    G.cam = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 - 30 / zoom, zoom };
  }

  G.toggleView = function () {
    G.viewAll = !G.viewAll;
    $('#bd-view').classList.toggle('on', G.viewAll);
    A.play('click');
    if (G.viewAll) fitWholeLevel(); else fitBuildCamera(false);
  };

  G.go = function () {
    if (G.state !== 'build') return;
    const a = JJ.Parts.analyze(G.design);
    if (!a.seat) {
      A.play('error');
      UI.toast('Rocco needs his seat! Put him on the grid first.', 'bad', 2600);
      G.tool = 'seat'; updateToolbar();
      return;
    }
    if (a.loose) UI.toast('Heads up: ' + a.issues[0].msg.toLowerCase().replace(/^this/, 'a') + '.', null, 2400);
    Store.designs[G.def.id] = { cells: snapshot() };
    Store.save('designs');
    G.startRun();
  };

  // ------------------------------------------------------------------ play
  function simCheats() {
    const c = Store.cheats;
    return {
      godMode: c.godMode, infiniteFuel: c.infiniteFuel, gravity: c.gravity, enginePower: c.enginePower,
      thrustPower: c.thrustPower, balloonLift: c.balloonLift, bouncy: c.bouncy, superGrip: c.superGrip
    };
  }

  function stopSim() {
    if (G.sim) { G.sim.destroy(); G.sim = null; }
    A.stopLoops();
    $('#pl-msg').hidden = true;
    clearTimeout(G.resultTimer);
  }

  G.startRun = function () {
    stopSim();
    let sim;
    try { sim = new JJ.Sim(G.L, G.design, simCheats()); } catch (e) {
      console.error(e);
      UI.toast('Oops! That contraption confused the physics. Try changing it a bit.', 'bad', 3000);
      return;
    }
    G.sim = sim;
    G.state = 'play';
    G.paused = false;
    show('play');
    G.acc = 0; G.won = false; G.fell = false; G.ouchT = -10;
    G.stuck = { x: 0, t: 0 };
    G.R.particles.length = 0; G.R.trail.length = 0;
    G.userZoom = 1;
    $('#pl-cap').className = 'cap-ind';
    $('#pl-cap').hidden = !G.L.cap;
    $('#pl-msg').hidden = true;
    buildControls();
    Store.bumpStat('runs');
    A.play('go');
    A.setIntensity(1);
  };

  function buildControls() {
    const box = $('#controls');
    box.innerHTML = '';
    const sim = G.sim;
    sim.groups.forEach((g, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ctrl';
      b.dataset.key = g.key;
      const c = document.createElement('canvas');
      c.width = c.height = 108;
      c.getContext('2d').drawImage(JJ.Art.partIcon(g.type, g.rot, 108), 0, 0);
      b.appendChild(c);
      b.insertAdjacentHTML('beforeend', '<span class="lbl">' + UI.esc(g.label) + '</span>' + (k < 9 ? '<span class="key">' + (k + 1) + '</span>' : '') +
        (g.type === 'rocket' ? '<span class="fuel"><i></i></span>' : '') + (g.mode === 'pop' ? '<span class="num"></span>' : ''));
      b.title = g.label + (k < 9 ? ' (key ' + (k + 1) + ')' : '');
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); G.toggleGroup(g.key); });
      b.addEventListener('click', (e) => { if (e.detail === 0) G.toggleGroup(g.key); });
      box.appendChild(b);
    });
    // first-level helper: pulse the engine button
    const first = box.querySelector('.ctrl');
    if (first && !Store.progress[G.def.id]) first.classList.add('hintme');
    G.ctrlState = '';
  }

  G.toggleGroup = function (key) {
    if (G.state !== 'play' || !G.sim || G.paused) return;
    A.unlock();
    const g = G.sim.toggleGroup(key);
    if (!g) return;
    if (g.mode === 'toggle') A.play('toggle', g.active);
    document.querySelectorAll('.ctrl.hintme').forEach((b) => b.classList.remove('hintme'));
  };

  function updateControls() {
    const info = G.sim.groupInfo();
    const sig = info.map((g) => g.key + (g.active ? 1 : 0) + g.count + (g.fuel != null ? Math.round(g.fuel * 20) : '')).join('|');
    if (sig === G.ctrlState) return;
    G.ctrlState = sig;
    for (const g of info) {
      const b = document.querySelector('.ctrl[data-key="' + g.key + '"]');
      if (!b) continue;
      b.classList.toggle('on', !!g.active && g.mode === 'toggle');
      b.classList.toggle('dead', g.count === 0 || (g.fuel != null && g.fuel <= 0));
      const f = b.querySelector('.fuel i');
      if (f) f.style.width = Math.round((g.fuel || 0) * 100) + '%';
      const n = b.querySelector('.num');
      if (n) n.textContent = g.count;
    }
  }

  function handleEvents() {
    const R = G.R, sim = G.sim;
    for (const e of sim.events) {
      switch (e.t) {
        case 'explode':
          R.burst('explode', e.x, e.y, e.power);
          if (Store.settings.shake) R.addShake(0.9);
          A.play('boom'); Store.bumpStat('explosions');
          G.ouchT = G.t;
          break;
        case 'break':
          R.burst('break', e.x, e.y, e.wood);
          A.play('crack', e.wood); Store.bumpStat('breaks');
          G.ouchT = G.t;
          break;
        case 'crash':
          R.burst('dust', e.x, e.y, 2);
          if (Store.settings.shake) R.addShake(0.35);
          A.play('thud', 10); Store.bumpStat('crashes');
          G.ouchT = G.t;
          break;
        case 'impact':
          if (e.s > 5) R.burst('dust', e.x, e.y - 0.4, 1);
          A.play('thud', e.s);
          break;
        case 'pop':
          R.burst('pop', e.x, e.y, JJ.Art.BALLOON_COLORS[(e.id || 0) % JJ.Art.BALLOON_COLORS.length]);
          A.play('pop'); Store.bumpStat('pops');
          break;
        case 'collect':
          R.burst('collect', e.x, e.y);
          A.play('collect');
          $('#pl-cap').classList.add('got');
          UI.toast('Shiny! Bottle cap grabbed.', 'good', 1600);
          break;
        case 'bounce': R.burst('bounce', e.x, e.y); A.play('bounce'); break;
        case 'shatter': R.burst('break', e.x, e.y, true); R.burst('dust', e.x, e.y, 3); A.play('crack', true); break;
        case 'spike': A.play('crack', false); break;
        case 'fuelout': A.play('fuelout'); break;
        case 'win': onWin(); break;
        case 'fell': onFell(); break;
        default: break;
      }
    }
    sim.events.length = 0;
  }

  function onWin() {
    if (G.won) return;
    G.won = true;
    const sim = G.sim;
    const p = sim.seatPos();
    G.R.burst('confetti', p.x, p.y + 0.5);
    A.play('win');
    Store.bumpStat('wins');
    const time = sim.status.winTime;
    const stars = [true, !!sim.status.collected || !G.def.cap, JJ.Level.evalStar3(G.def.star3, { time, broken: sim.status.broken }, G.design)];
    if (!G.def.cap) stars[1] = true;
    const before = Store.levelProgress(G.def.id);
    const wasDone = before.done;
    Store.recordWin(G.def.id, stars, time);
    const idx = JJ.LEVELS.indexOf(G.def);
    const unlockedNext = !wasDone && idx >= 0 && idx < JJ.LEVELS.length - 1;
    G.resultTimer = setTimeout(() => showResults(stars, time, before.best, unlockedNext), 1500);
  }

  function onFell() {
    if (G.won || G.fell) return;
    G.fell = true;
    A.play('fall');
    const m = $('#pl-msg');
    m.textContent = 'Rocco fell off the map! Press ↻ to try again.';
    m.hidden = false;
  }

  function showResults(stars, time, prevBest, unlockedNext) {
    if (G.state !== 'play') return;
    const starSvg = UI.icon('star');
    const labels = [
      'Reached the snack stash',
      G.def.cap ? 'Grabbed the bottle cap' : 'No bottle cap on this level',
      JJ.Level.star3Text(G.def.star3)
    ];
    const best = prevBest == null ? time : Math.min(prevBest, time);
    const idx = JJ.LEVELS.indexOf(G.def);
    const next = idx >= 0 && idx < JJ.LEVELS.length - 1 ? JJ.LEVELS[idx + 1] : null;
    const titles = ['Snack time!', 'Nailed it!', 'Rocco is stuffed!', 'Junk-tastic!'];
    const m = UI.modal(
      '<h2>' + titles[Math.floor(Math.random() * titles.length)] + '</h2>' +
      '<div class="body"><div class="result-stars">' + stars.map(() => '<span class="big-star">' + starSvg + '</span>').join('') + '</div>' +
      '<ul class="res-list">' + labels.map((l, i) => '<li><span class="ck' + (stars[i] ? ' on' : '') + '">✓</span>' + UI.esc(l) + '</li>').join('') + '</ul>' +
      '<div class="res-time"><span>Time <b>' + U.fmtTime(time) + '</b></span><span>Best <b>' + U.fmtTime(best) + '</b></span></div>' +
      (unlockedNext && next ? '<p style="margin:10px 0 0;text-align:center;color:#ffcf3f">New level unlocked: ' + UI.esc(next.name) + '!</p>' : '') +
      '</div><div class="actions">' +
      '<button class="btn btn-steel btn-sm" data-a="retry" type="button"><span data-icon="restart"></span>Retry</button>' +
      '<button class="btn btn-sm" data-a="build" type="button"><span data-icon="wrench"></span>Rebuild</button>' +
      (G.test ? '<button class="btn btn-green btn-sm" data-a="editor" type="button"><span data-icon="edit"></span>Editor</button>'
        : next && G.isUnlocked(next) ? '<button class="btn btn-green btn-sm" data-a="next" type="button">Next<span data-icon="next"></span></button>'
          : '<button class="btn btn-green btn-sm" data-a="levels" type="button"><span data-icon="grid"></span>Levels</button>') +
      '</div>', { dismiss: false }
    );
    const els = m.querySelectorAll('.big-star');
    stars.forEach((s, i) => {
      if (!s) return;
      setTimeout(() => { els[i].classList.add('on'); A.play('star', i); }, 250 + i * 330);
    });
    m.querySelector('[data-a=retry]').onclick = () => { A.play('click'); UI.closeModal(); G.startRun(); };
    m.querySelector('[data-a=build]').onclick = () => { A.play('click'); UI.closeModal(); G.enterBuild(false); };
    const nx = m.querySelector('[data-a=next]');
    if (nx) nx.onclick = () => { A.play('click'); UI.closeModal(); G.openLevel(next); };
    const lv = m.querySelector('[data-a=levels]');
    if (lv) lv.onclick = () => { A.play('click'); UI.closeModal(); G.showLevels(); };
    const ed = m.querySelector('[data-a=editor]');
    if (ed) ed.onclick = () => { A.play('click'); UI.closeModal(); G.exitTest(); };
  }

  G.exitTest = function () {
    const t = G.test;
    stopSim();
    G.test = null;
    if (t && t.onExit) t.onExit(); else G.showLevels();
  };

  G.backFromBuild = function () {
    A.play('click');
    if (G.test) { G.exitTest(); return; }
    G.showLevels();
  };

  // ----------------------------------------------------------------- pause
  G.pause = function () {
    if (UI.modalOpen()) return;
    A.play('click');
    G.paused = true;
    const inPlay = G.state === 'play';
    const m = UI.modal('<h2>Paused</h2><div class="stack">' +
      '<button class="btn btn-green" data-a="resume" type="button"><span data-icon="play"></span>Resume</button>' +
      (inPlay ? '<button class="btn" data-a="restart" type="button"><span data-icon="restart"></span>Try again</button>' +
        '<button class="btn" data-a="build" type="button"><span data-icon="wrench"></span>Rebuild</button>' : '') +
      '<button class="btn btn-steel" data-a="settings" type="button"><span data-icon="gear"></span>Settings</button>' +
      (G.test ? '<button class="btn btn-steel" data-a="editor" type="button"><span data-icon="edit"></span>Back to editor</button>'
        : '<button class="btn btn-steel" data-a="levels" type="button"><span data-icon="grid"></span>Level select</button>') +
      '<button class="btn btn-steel" data-a="home" type="button"><span data-icon="home"></span>Main menu</button>' +
      '</div>', { onClose: () => { G.paused = false; } });
    const on = (a, fn) => { const b = m.querySelector('[data-a=' + a + ']'); if (b) b.onclick = () => { A.play('click'); fn(); }; };
    on('resume', () => UI.closeModal());
    on('restart', () => { UI.closeModal(); G.startRun(); });
    on('build', () => { UI.closeModal(); G.enterBuild(false); });
    on('settings', () => { UI.closeModal(); G.settings(true); });
    on('levels', () => { UI.closeModal(); G.showLevels(); });
    on('editor', () => { UI.closeModal(); G.exitTest(); });
    on('home', () => { UI.closeModal(); G.showTitle(); });
  };

  G.settings = function (fromPause) {
    const s = Store.settings;
    G.paused = G.state === 'play';
    const m = UI.modal('<h2>Settings</h2><div class="body">' +
      '<div class="field"><label for="set-sfx">Sound effects</label><input id="set-sfx" type="range" min="0" max="1" step="0.05" value="' + s.sfx + '"></div>' +
      '<div class="field"><label for="set-music">Music</label><input id="set-music" type="range" min="0" max="1" step="0.05" value="' + s.music + '"></div>' +
      '<div class="field"><label for="set-shake">Screen shake</label><span class="switch"><input id="set-shake" type="checkbox"' + (s.shake ? ' checked' : '') + '><span></span></span></div>' +
      '<div class="field"><label for="set-hints">Show tips</label><span class="switch"><input id="set-hints" type="checkbox"' + (s.hints ? ' checked' : '') + '><span></span></span></div>' +
      '</div><div class="actions"><button class="btn btn-green" data-a="done" type="button">Done</button></div>', { onClose: () => { G.paused = false; } });
    const apply = () => {
      s.sfx = +m.querySelector('#set-sfx').value;
      s.music = +m.querySelector('#set-music').value;
      s.shake = m.querySelector('#set-shake').checked;
      s.hints = m.querySelector('#set-hints').checked;
      Store.save('settings');
      A.setVolumes(s.sfx, s.music);
      if (s.music > 0) A.startMusic(); else A.stopMusic();
    };
    m.querySelectorAll('input').forEach((i) => { i.oninput = apply; i.onchange = apply; });
    m.querySelector('[data-a=done]').onclick = () => { A.play('click'); UI.closeModal(); if (fromPause) G.pause(); };
  };

  // ---------------------------------------------------------------- update
  function updatePlay(dt) {
    const sim = G.sim;
    if (!G.paused) {
      G.acc += dt * U.clamp(Store.cheats.timeScale || 1, 0.1, 3);
      let n = 0;
      while (G.acc >= DT && n < 16) {
        if (G.debugCtl) G.debugCtl(sim, sim.time, G.debugMem);
        sim.step(DT); G.acc -= DT; n++;
      }
      if (n >= 16) G.acc = 0;
      handleEvents();
      G.R.emitSimEffects(sim, dt);
      Store.bumpStat('playTime', dt);
    }
    const f = sim.focus();
    const v = sim.seatVel();
    const sp = Math.hypot(v.x, v.y);
    // camera
    const R = G.R;
    const base = U.clamp(Math.min(R.W / 26, R.H / 15), 16, 64) * G.userZoom;
    const tz = base / (1 + Math.max(0, sp - 4) * 0.03);
    const tx = f.x + U.clamp(v.x * 0.35, -7, 7);
    const ty = f.y + U.clamp(v.y * 0.2, -4, 3) + 1.2;
    const k = Math.min(1, dt * 3.2);
    R.cam.x += (tx - R.cam.x) * k;
    R.cam.y += (ty - R.cam.y) * k;
    R.cam.zoom += (tz - R.cam.zoom) * Math.min(1, dt * 1.5);
    // timer
    const time = sim.status.won ? sim.status.winTime : sim.time;
    $('#pl-timer').textContent = U.fmtTime(time);
    updateControls();
    // audio loops
    if (!G.paused) {
      const engOn = sim.groups.some((g) => g.type === 'engine' && g.active && g.parts.some((p) => p.alive));
      A.loop('engine', engOn ? 1 : 0, sp);
      A.loop('rocket', sim.parts.some((p) => p.alive && p.type === 'rocket' && p.flame > 0.3) ? 1 : 0);
      A.loop('fan', sim.parts.some((p) => p.alive && p.type === 'fan' && p.spin > 0.3) ? 1 : 0);
      A.loop('wind', U.clamp((sp - 7) / 16, 0, 1), sp);
    } else A.stopLoops();
    // stuck helper
    if (!G.won && !G.fell && sim.seat) {
      const p = sim.seatPos();
      if (Math.abs(p.x - G.stuck.x) > 0.6 || Math.abs(v.y) > 0.5) { G.stuck.x = p.x; G.stuck.t = sim.time; }
      const msg = $('#pl-msg');
      const idle = sim.time - G.stuck.t > 6 && !sim.groups.some((g) => g.active && g.mode === 'toggle' && g.type !== 'chute');
      if (idle && msg.hidden) { msg.textContent = 'Stuck? Tap ↻ to retry or the wrench to rebuild.'; msg.hidden = false; G.stuckMsg = true; }
      else if (!idle && G.stuckMsg) { msg.hidden = true; G.stuckMsg = false; }
    }
    Store.flushStats();
  }

  function roccoFace() {
    const sim = G.sim;
    if (!sim || !sim.seat) return { expr: 'happy', look: 0 };
    const v = sim.seatVel();
    const sp = Math.hypot(v.x, v.y);
    let expr = 'happy';
    if (G.won) expr = 'cheer';
    else if (G.t - G.ouchT < 1.3 || (sim.time - sim.seatImpactT < 1.0 && sim.seatImpact > 9)) expr = 'dizzy';
    else if (v.y < -7.5) expr = 'scared';
    else if (sp > 9) expr = 'excited';
    else if (sp < 0.2 && sim.time > 8) expr = 'sleepy';
    return { expr, look: U.clamp(v.x / 6, -1, 1) };
  }

  function updateDemo(dt) {
    const sim = G.demo;
    if (!sim) return;
    G.acc += dt;
    let n = 0;
    while (G.acc >= DT && n < 8) { sim.step(DT); G.acc -= DT; n++; }
    if (n >= 8) G.acc = 0;
    sim.events.length = 0;
    const f = sim.focus();
    if (f.x > G.demoBest + 0.5) { G.demoBest = f.x; G.demoStuck = 0; } else G.demoStuck += dt;
    if (f.x > 380 || G.demoStuck > 4 || sim.status.fell) { startDemo(); return; }
    const R = G.R;
    const zoom = U.clamp(Math.min(R.W / 30, R.H / 17), 16, 50);
    R.cam.zoom += (zoom - R.cam.zoom) * 0.1;
    const tx = f.x + 3, ty = f.y + R.H * 0.33 / R.cam.zoom;
    R.cam.x += (tx - R.cam.x) * Math.min(1, dt * 3);
    R.cam.y += (ty - R.cam.y) * Math.min(1, dt * 3);
  }

  function update(dt) {
    const R = G.R;
    if (G.state === 'title') updateDemo(dt);
    else if (G.state === 'levels' && G.bgL) {
      const b = G.bgL.bounds;
      const span = Math.max(4, b.maxX - b.minX - 30);
      R.cam.x = b.minX + 15 + (Math.sin(G.t * 0.05) * 0.5 + 0.5) * span;
    }
    else if (G.state === 'build') {
      const k = Math.min(1, dt * 6);
      R.cam.x += (G.cam.x - R.cam.x) * k;
      R.cam.y += (G.cam.y - R.cam.y) * k;
      R.cam.zoom += (G.cam.zoom - R.cam.zoom) * k;
    } else if (G.state === 'play' && G.sim) updatePlay(dt);
    R.updateParticles(dt);
  }

  // ---------------------------------------------------------------- render
  function drawScene(L, sim, extra) {
    const R = G.R, t = G.t;
    R.drawBackground(L.theme, L.seed, t);
    R.drawWind(L, t);
    R.drawTerrain(L, t);
    R.drawGoalAndCap(L, t, sim ? sim.status : null);
    R.drawProps(L, sim, t);
    if (extra) extra();
    if (sim) {
      R.drawTrail(sim, Store.cheats.rainbow);
      const face = sim === G.sim ? roccoFace() : { expr: 'excited', look: 1 };
      R.drawSim(sim, t, { expr: face.expr, look: face.look, bigHead: Store.cheats.bigHead, debug: Store.cheats.debug && sim === G.sim });
    }
    R.drawParticles();
  }

  function render() {
    const R = G.R;
    if (G.state === 'title' && G.demoL) drawScene(G.demoL, G.demo);
    else if (G.state === 'levels' && G.bgL) drawScene(G.bgL, null);
    else if (G.state === 'build' && G.L) {
      drawScene(G.L, null, () => {
        const issues = JJ.Parts.analyze(G.design).issues;
        R.drawBuildGrid(G.L, G.hover ? { i: G.hover.i, j: G.hover.j, erase: G.tool === 'erase' } : null);
        R.drawDesign(G.L, G.design, G.t, { issues, bigHead: Store.cheats.bigHead });
        if (G.hover && G.tool && G.tool !== 'erase' && !JJ.Parts.cellAt(G.design, G.hover.i, G.hover.j)) {
          R.drawGhost(G.L, G.hover, G.tool, G.rot[G.tool] != null ? G.rot[G.tool] : JJ.Parts.defaultRot(G.tool), left(G.tool) > 0 || G.tool === 'seat', G.t);
        }
      });
      if (!G.viewAll) R.drawGoalPointer(G.L, 'Goal');
    } else if (G.state === 'play' && G.sim) {
      drawScene(G.L, G.sim);
      const p = G.sim.seatPos();
      if (p && G.L.goal) R.drawGoalPointer(G.L, Math.max(0, Math.round(Math.hypot(G.L.goal.x - p.x, G.L.goal.y - p.y))) + ' m');
    } else {
      R.setScreen();
      R.ctx.fillStyle = '#2b2f38'; R.ctx.fillRect(0, 0, R.W, R.H);
    }
  }

  function frame(ts) {
    const now = ts / 1000;
    const dt = Math.min(0.05, Math.max(0, now - (G.last || now)));
    G.last = now;
    if (JJ.Admin && JJ.Admin.isOpen && JJ.Admin.isOpen()) { requestAnimationFrame(frame); return; }
    G.t += dt;
    try {
      update(dt);
      render();
    } catch (e) {
      console.error(e);
      if (!G.errShown) { G.errShown = true; UI.toast('Something went wrong: ' + e.message, 'bad', 4000); }
    }
    requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------------- input
  function canvasPoint(e) {
    const r = G.R.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    A.unlock();
    const p = canvasPoint(e);
    G.pointers.set(e.pointerId, p);
    try { G.R.canvas.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    if (G.pointers.size === 2) {
      // pinch start
      const [a, b] = Array.from(G.pointers.values());
      G.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: G.state === 'build' ? G.cam.zoom : G.userZoom };
      if (G.stroke && G.stroke.snap && sameDesign(G.stroke.snap, G.design.cells)) G.history.pop();
      G.stroke = null; G.pan = null;
      return;
    }
    if (G.state === 'build') {
      const w = G.R.screenToWorld(p.x, p.y);
      const cell = cellFromWorld(w);
      if (cell && e.button !== 1) {
        const snap = snapshot();
        const erase = e.button === 2 || G.tool === 'erase';
        let did = null;
        if (erase) did = eraseAt(cell) ? 'erase' : null;
        else did = placeAt(cell, false);
        G.stroke = { mode: erase ? 'erase' : did === 'place' ? 'place' : 'none', last: cell.i + ',' + cell.j, snap };
        if (did) { G.history.push(snap); if (G.history.length > 60) G.history.shift(); updateToolbar(); }
        else G.stroke.snap = null;
        G.hover = cell;
      } else {
        G.pan = { x: p.x, y: p.y, cx: G.cam.x, cy: G.cam.y };
      }
    } else if (G.state === 'play' && G.sim) {
      // tap a part to activate its group
      const w = G.R.screenToWorld(p.x, p.y);
      let best = null, bd = 0.85;
      for (const part of G.sim.parts) {
        if (!part.alive || !part.def.activate) continue;
        const c = part.body.getPosition();
        const d = Math.hypot(c.x - w.x, c.y - w.y);
        if (d < bd) { bd = d; best = part; }
      }
      if (best) G.toggleGroup(best.group.key);
    }
  }

  function onMove(e) {
    const p = canvasPoint(e);
    if (G.pointers.has(e.pointerId)) G.pointers.set(e.pointerId, p);
    if (G.pointers.size === 2 && G.pinch) {
      const [a, b] = Array.from(G.pointers.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const f = d / Math.max(10, G.pinch.d);
      if (G.state === 'build') G.cam.zoom = U.clamp(G.pinch.zoom * f, 6, 120);
      else if (G.state === 'play') G.userZoom = U.clamp(G.pinch.zoom * f, 0.4, 2.2);
      return;
    }
    if (G.state !== 'build') return;
    const w = G.R.screenToWorld(p.x, p.y);
    const cell = cellFromWorld(w);
    if (e.pointerType === 'mouse' || G.stroke) G.hover = cell;
    if (G.pan) {
      const z = G.R.cam.zoom;
      G.cam.x = G.pan.cx - (p.x - G.pan.x) / z;
      G.cam.y = G.pan.cy + (p.y - G.pan.y) / z;
      return;
    }
    if (G.stroke && cell) {
      const key = cell.i + ',' + cell.j;
      if (key === G.stroke.last) return;
      G.stroke.last = key;
      if (G.stroke.mode === 'erase') {
        if (eraseAt(cell)) { if (!G.stroke.snap) { G.stroke.snap = snapshot(); } updateToolbar(); }
      } else if (G.stroke.mode === 'place') {
        if (placeAt(cell, true)) updateToolbar();
      }
    }
  }

  function onUp(e) {
    G.pointers.delete(e.pointerId);
    if (G.pointers.size < 2) G.pinch = null;
    if (G.pointers.size === 0) {
      if (G.stroke && G.stroke.snap && sameDesign(G.stroke.snap, G.design.cells)) {
        const last = G.history[G.history.length - 1];
        if (last === G.stroke.snap) G.history.pop();
      }
      G.stroke = null; G.pan = null;
      if (e.pointerType !== 'mouse') G.hover = null;
    }
  }

  function onWheel(e) {
    e.preventDefault();
    const f = Math.exp(-e.deltaY * 0.0015);
    if (G.state === 'build') {
      const p = canvasPoint(e);
      const before = G.R.screenToWorld(p.x, p.y);
      const nz = U.clamp(G.cam.zoom * f, 6, 120);
      // keep the point under the cursor fixed
      G.cam.x = before.x - (p.x - G.R.W / 2) / nz;
      G.cam.y = before.y + (p.y - G.R.H / 2) / nz;
      G.cam.zoom = nz;
    } else if (G.state === 'play') {
      G.userZoom = U.clamp(G.userZoom * f, 0.4, 2.2);
    }
  }

  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if (JJ.Admin && JJ.Admin.isOpen && JJ.Admin.isOpen()) return;
    A.unlock();
    const k = e.key;
    if (k === 'Escape') {
      if (UI.modalOpen()) { UI.closeModal(); return; }
      if (!$('#quick').hidden) { $('#quick').hidden = true; return; }
      if (G.state === 'build' || G.state === 'play') G.pause();
      return;
    }
    if (UI.modalOpen()) return;
    if ((k === '`' || k === '~') && Store.isAdmin() && JJ.Admin) { JJ.Admin.toggleQuick(); return; }
    if (G.state === 'build') {
      if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); G.undo(); return; }
      if (k === ' ' || k === 'Enter') { e.preventDefault(); G.go(); return; }
      if (k === 'v' || k === 'V') { G.toggleView(); return; }
      if ((k === 'r' || k === 'R') && G.hover) {
        const c = JJ.Parts.cellAt(G.design, G.hover.i, G.hover.j);
        if (c && PARTS[c.t].rotations) { pushHistory(); c.r = JJ.Parts.nextRot(c.t, c.r); G.rot[c.t] = c.r; refreshToolIcon(c.t); A.play('rotate'); }
        else if (G.tool && PARTS[G.tool] && PARTS[G.tool].rotations) selectTool(G.tool);
        return;
      }
      if ((k === 'Delete' || k === 'Backspace') && G.hover) { pushHistory(); if (!eraseAt(G.hover)) G.history.pop(); updateToolbar(); return; }
      if (k === 'e' || k === 'E') { selectTool('erase'); return; }
      const slot = document.querySelector('#toolbar .slot[data-key="' + k + '"]');
      if (slot) { selectTool(slot.dataset.tool); return; }
    } else if (G.state === 'play') {
      if (k === 'r' || k === 'R') { G.startRun(); return; }
      if (k === 'b' || k === 'B') { G.enterBuild(false); return; }
      if (k === 'p' || k === 'P') { G.pause(); return; }
      const n = parseInt(k, 10);
      if (n >= 1 && n <= 9 && G.sim && G.sim.groups[n - 1]) { G.toggleGroup(G.sim.groups[n - 1].key); return; }
      if (k === ' ' && G.sim && G.sim.groups[0]) { e.preventDefault(); G.toggleGroup(G.sim.groups[0].key); }
    }
  }

  // ------------------------------------------------------------------ boot
  G.boot = function () {
    G.canvas = $('#cv');
    G.R = new JJ.Renderer(G.canvas);
    UI.hydrate(document);
    const c = G.canvas;
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onUp);
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !G.stroke) G.hover = null; });
    c.addEventListener('wheel', onWheel, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => {
      G.R.resize();
      if (G.state === 'build') { if (G.viewAll) fitWholeLevel(); else fitBuildCamera(false); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { A.stopLoops(); if (G.state === 'play' && !UI.modalOpen()) G.pause(); }
    });
    const unlock = () => {
      A.unlock();
      A.setVolumes(Store.settings.sfx, Store.settings.music);
      if (Store.settings.music > 0) A.startMusic();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);

    // buttons
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('#btn-play', () => { A.play('click'); G.showLevels(); });
    on('#btn-sandbox', () => { A.play('click'); G.openLevel(JJ.SANDBOX); });
    on('#btn-settings', () => { A.play('click'); G.settings(false); });
    on('#btn-admin', () => { A.play('click'); if (JJ.Admin) JJ.Admin.open(); });
    on('#lv-back', () => { A.play('click'); G.showTitle(); });
    on('#bd-back', () => G.backFromBuild());
    on('#bd-view', () => G.toggleView());
    on('#bd-pause', () => G.pause());
    on('#bd-undo', () => G.undo());
    on('#bd-clear', () => G.clearDesign());
    on('#bd-go', () => G.go());
    on('#bd-hint-close', () => { A.play('click'); G.hintHidden = true; $('#bd-hint').hidden = true; });
    on('#bd-admin', () => { A.play('click'); JJ.Admin && JJ.Admin.toggleQuick(); });
    on('#pl-admin', () => { A.play('click'); JJ.Admin && JJ.Admin.toggleQuick(); });
    on('#pl-build', () => { A.play('click'); G.enterBuild(false); });
    on('#pl-restart', () => { A.play('click'); G.startRun(); });
    on('#pl-pause', () => G.pause());

    G.showTitle();
    requestAnimationFrame(frame);
  };

  // for admin tools
  G.refreshHud = function () {
    show(G.state === 'build' ? 'build' : G.state === 'play' ? 'play' : G.state === 'levels' ? 'levels' : 'title');
    if (G.state === 'build') { G.allowed = computeAllowed(G.def); renderToolbar(); }
  };
  G.spawnProp = function (type) {
    if (!G.sim) return false;
    const R = G.R;
    const x = R.cam.x + (Math.random() - 0.5) * 4, y = R.cam.y + R.H / R.cam.zoom * 0.35;
    const o = JJ.Level.withDefaults({ type, x, y });
    const before = G.sim.props.length;
    const fns = { crate: 1, tnt: 1, ball: 1, plank: 1 };
    if (!fns[type]) return false;
    // reuse sim object builders through a tiny level patch
    G.sim.level.objects.push(o);
    G.sim.buildObjectsFrom([o]);
    return G.sim.props.length > before;
  };
  G.instantWin = function () {
    if (!G.sim || !G.sim.seat || !G.L.goal) return;
    G.sim.status.collected = G.sim.status.collected || !!G.L.cap;
    G.sim.status.won = true; G.sim.status.winTime = G.sim.time;
    G.sim.events.push({ t: 'win' });
  };
  G.explodeAll = function () {
    if (!G.sim) return;
    for (const p of G.sim.parts) if (p.alive && p.type === 'tnt') G.sim.queueExplosion(p, null, 0);
    for (const pr of G.sim.props) if (pr.alive && pr.type === 'tnt') G.sim.queueExplosion(null, pr, 0.1);
    const f = G.sim.focus();
    G.sim.explode(f.x + 2.5, f.y - 1, 1);
  };

  JJ.Game = G;
})((globalThis.JJ = globalThis.JJ || {}));
