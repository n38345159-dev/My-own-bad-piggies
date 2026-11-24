/* Junkyard Joyride - admin panel: login, dashboard, cheats, progress, my levels, settings, in-game quick tools */
(function (JJ) {
  'use strict';
  const U = JJ.U, Store = JJ.Store, UI = JJ.UI, A = JJ.Audio;
  const esc = (s) => UI.esc(s);

  const ADM = { tab: 'dash', openFlag: false };
  let root = null;

  const TABS = [
    ['dash', 'Dashboard', 'chart'],
    ['cheats', 'Cheats', 'bolt'],
    ['progress', 'Progress', 'star'],
    ['editor', 'Level Editor', 'edit'],
    ['levels', 'My Levels', 'map'],
    ['settings', 'Settings', 'gear']
  ];

  const CHEAT_TOGGLES = [
    ['godMode', 'God mode', 'Nothing ever breaks, not even in explosions.'],
    ['unlimitedParts', 'Unlimited parts', 'Every part type, as many as you want, on every level.'],
    ['infiniteFuel', 'Infinite rocket fuel', 'Rockets never run dry.'],
    ['unlockAll', 'Unlock all levels', 'Play any level without beating the one before it.'],
    ['superGrip', 'Super grip tires', 'Wheels stick to almost anything.'],
    ['bouncy', 'Bouncy castle', 'Everything bounces like rubber.'],
    ['bigHead', 'Big-head Rocco', 'Rocco gets a giant head.'],
    ['rainbow', 'Rainbow trail', 'Leave a rainbow behind Rocco.'],
    ['debug', 'Physics X-ray', 'Show the invisible collision shapes and joints.']
  ];
  const CHEAT_SLIDERS = [
    ['gravity', 'Gravity', 0.1, 2, 0.05],
    ['timeScale', 'Game speed', 0.25, 2, 0.05],
    ['enginePower', 'Engine power', 0.5, 5, 0.1],
    ['thrustPower', 'Rocket and fan power', 0.5, 5, 0.1],
    ['balloonLift', 'Balloon lift', 0.5, 5, 0.1]
  ];
  const PRESETS = {
    moon: { name: 'Moon mode', set: { gravity: 0.3 } },
    turbo: { name: 'Turbo', set: { enginePower: 3, thrustPower: 2 } },
    slowmo: { name: 'Slow-mo', set: { timeScale: 0.4 } },
    chaos: { name: 'Total chaos', set: { bouncy: true, gravity: 0.6, thrustPower: 3, rainbow: true, bigHead: true } }
  };

  // ------------------------------------------------------------- helpers
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'adm-toast';
    t.textContent = msg;
    (root && !root.hidden ? root : document.body).appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }
  ADM.toast = toast;

  function modal(html) {
    const back = document.createElement('div');
    back.className = 'adm-modal-back';
    back.innerHTML = '<div class="adm-modal" role="dialog" aria-modal="true">' + html + '</div>';
    root.appendChild(back);
    UI.hydrate(back);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) back.remove(); });
    const m = back.firstChild;
    m.close = () => back.remove();
    return m;
  }
  ADM.modal = modal;

  function confirmBox(title, text, yes, fn, danger) {
    const m = modal('<h3>' + esc(title) + '</h3><p class="muted">' + esc(text) + '</p><div class="adm-actions"><button class="abtn" data-a="no" type="button">Cancel</button><button class="abtn ' + (danger ? 'r' : 'y') + '" data-a="yes" type="button">' + esc(yes) + '</button></div>');
    m.querySelector('[data-a=no]').onclick = () => m.close();
    m.querySelector('[data-a=yes]').onclick = () => { m.close(); fn(); };
  }
  ADM.confirm = confirmBox;

  async function copyText(text, area) {
    try { await navigator.clipboard.writeText(text); toast('Copied!'); return true; } catch (e) {
      if (area) { area.focus(); area.select(); }
      toast('Press Ctrl+C (or Cmd+C) to copy');
      return false;
    }
  }
  ADM.copyText = copyText;

  function download(name, text) {
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { toast('Download not available here. Use Copy instead.'); }
  }
  ADM.download = download;

  function setHash(on) {
    try {
      if (on) { if (location.hash !== '#admin') history.replaceState(null, '', '#admin'); }
      else if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search);
    } catch (e) { /* sandboxed */ }
  }

  // ---------------------------------------------------------- open/close
  ADM.init = function () {
    root = document.getElementById('admin');
    if (location.hash === '#admin') ADM.open();
    window.addEventListener('hashchange', () => { if (location.hash === '#admin' && !ADM.openFlag) ADM.open(); });
  };
  ADM.isOpen = () => ADM.openFlag;

  ADM.open = function (tab) {
    if (!root) root = document.getElementById('admin');
    ADM.openFlag = true;
    root.hidden = false;
    document.getElementById('quick').hidden = true;
    if (UI.modalOpen()) UI.closeModal();
    if (JJ.Game.state === 'play') JJ.Game.paused = true;
    A.stopLoops();
    setHash(true);
    if (Store.isAdmin()) ADM.showApp(tab || ADM.tab); else ADM.showLogin();
  };

  ADM.close = function () {
    if (JJ.Editor) JJ.Editor.destroy();
    ADM.openFlag = false;
    root.hidden = true;
    root.innerHTML = '';
    setHash(false);
    JJ.Game.paused = false;
    JJ.Game.refreshHud();
  };

  // --------------------------------------------------------------- login
  ADM.showLogin = function () {
    root.innerHTML =
      '<div class="adm-login"><form class="adm-lock" id="adm-lock" autocomplete="off">' +
      '<div class="hazard"></div><div class="body">' +
      '<h1>Admin panel</h1>' +
      '<p class="muted">Type the admin passcode to unlock cheats, the level editor and the dashboard.</p>' +
      '<label class="muted" for="adm-pass">Passcode</label>' +
      '<input type="password" id="adm-pass" autocomplete="current-password" autofocus>' +
      '<button class="abtn y" type="submit"><span data-icon="shield"></span>Unlock</button>' +
      '<p class="adm-err" id="adm-err" role="alert"></p>' +
      '<button class="adm-link" type="button" id="adm-back">Back to the game</button>' +
      '</div></form></div>';
    UI.hydrate(root);
    const form = root.querySelector('#adm-lock');
    const input = root.querySelector('#adm-pass');
    setTimeout(() => input.focus(), 50);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = input.value;
      if (!code) { root.querySelector('#adm-err').textContent = 'Type the passcode first.'; return; }
      if (Store.login(code)) {
        A.play('unlock');
        ADM.showApp('dash');
        toast('Welcome back, boss!');
      } else {
        A.play('error');
        root.querySelector('#adm-err').textContent = 'That passcode is not right. Try again.';
        form.classList.remove('adm-shake'); void form.offsetWidth; form.classList.add('adm-shake');
        input.select();
      }
    });
    root.querySelector('#adm-back').onclick = () => ADM.close();
  };

  // ------------------------------------------------------------ app shell
  ADM.showApp = function (tab) {
    root.innerHTML =
      '<div class="adm-app"><aside class="adm-side">' +
      '<div class="adm-brand"><b>Junkyard HQ</b><span>Admin panel</span></div>' +
      '<nav class="adm-nav" aria-label="Admin sections">' +
      TABS.map((t) => '<button type="button" data-tab="' + t[0] + '"><span data-icon="' + t[2] + '"></span>' + t[1] + '</button>').join('') +
      '</nav>' +
      '<div class="adm-side-foot">' +
      '<button type="button" id="adm-play"><span data-icon="play"></span>Back to game</button>' +
      '<button type="button" id="adm-logout"><span data-icon="logout"></span>Log out</button>' +
      '</div></aside><main class="adm-main" id="adm-main"></main></div>';
    UI.hydrate(root);
    root.querySelectorAll('.adm-nav button').forEach((b) => { b.onclick = () => { A.play('click'); ADM.go(b.dataset.tab); }; });
    root.querySelector('#adm-play').onclick = () => { A.play('click'); ADM.close(); };
    root.querySelector('#adm-logout').onclick = () => { Store.logout(); A.play('click'); toast('Logged out'); ADM.showLogin(); };
    ADM.go(tab || 'dash');
  };

  ADM.go = function (tab, arg) {
    if (!Store.isAdmin()) { ADM.showLogin(); return; }
    ADM.tab = tab;
    root.querySelectorAll('.adm-nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (JJ.Editor) JJ.Editor.destroy();
    const main = root.querySelector('#adm-main');
    main.className = 'adm-main' + (tab === 'editor' ? ' full' : '');
    main.scrollTop = 0;
    (VIEWS[tab] || VIEWS.dash)(main, arg);
    UI.hydrate(main);
  };

  // --------------------------------------------------------------- views
  const VIEWS = {};

  function stat(label, value, extra, hi) {
    return '<div class="adm-stat' + (hi ? ' hi' : '') + '"><b>' + value + '</b><span>' + esc(label) + '</span>' + (extra || '') + '</div>';
  }
  function bar(frac) { return '<div class="adm-bar"><i style="width:' + Math.round(U.clamp(frac, 0, 1) * 100) + '%"></i></div>'; }
  function fmtDur(sec) {
    sec = Math.round(sec || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? h + 'h ' + m + 'm' : m ? m + 'm ' + s + 's' : s + 's';
  }

  VIEWS.dash = function (m) {
    const L = JJ.LEVELS;
    const done = L.filter((l) => (Store.progress[l.id] || {}).done).length;
    const stars = L.reduce((s, l) => s + ((Store.progress[l.id] || {}).stars || []).filter(Boolean).length, 0);
    const st = Store.stats;
    const active = [];
    for (const [k, name] of CHEAT_TOGGLES) if (Store.cheats[k]) active.push(name);
    for (const [k, name] of CHEAT_SLIDERS) if (Store.cheats[k] !== 1) active.push(name + ' x' + (+Store.cheats[k]).toFixed(2));
    m.innerHTML =
      '<div class="adm-head"><div><h2>Dashboard</h2><p>How Junkyard Joyride is going on this device.</p></div>' +
      '<div class="adm-actions"><button class="abtn g" data-a="play" type="button"><span data-icon="play"></span>Play the game</button></div></div>' +
      (Store.usingDefaultPass() ? '<div class="adm-warn"><span data-icon="shield"></span><p><b>You are still using the default passcode.</b> Anyone who knows it can open this panel. Pick your own in Settings.</p></div>' : '') +
      '<div class="adm-grid">' +
      stat('Stars collected', stars + '<small style="font-size:0.5em;color:#a7afbd"> / ' + L.length * 3 + '</small>', bar(stars / (L.length * 3)), true) +
      stat('Levels beaten', done + '<small style="font-size:0.5em;color:#a7afbd"> / ' + L.length + '</small>', bar(done / L.length), true) +
      stat('Runs', st.runs) +
      stat('Wins', st.wins) +
      stat('Win rate', st.runs ? Math.round((st.wins / st.runs) * 100) + '%' : '-') +
      stat('Parts placed', st.partsPlaced) +
      stat('Explosions', st.explosions) +
      stat('Balloons popped', st.pops) +
      stat('Parts broken', st.breaks) +
      stat('Time playing', fmtDur(st.playTime)) +
      stat('Custom levels', Store.custom.length) +
      '</div>' +
      '<div class="adm-cols">' +
      '<div class="adm-card"><h3>Quick actions</h3><p class="sub">Handy buttons for the boss.</p><div class="adm-actions">' +
      '<button class="abtn y" data-a="unlock" type="button"><span data-icon="lock"></span>' + (Store.cheats.unlockAll ? 'Lock levels again' : 'Unlock all levels') + '</button>' +
      '<button class="abtn" data-a="stars" type="button"><span data-icon="star"></span>Give me all stars</button>' +
      '<button class="abtn" data-a="newlevel" type="button"><span data-icon="plus"></span>Make a level</button>' +
      '<button class="abtn" data-a="cheats" type="button"><span data-icon="bolt"></span>Open cheats</button>' +
      '</div></div>' +
      '<div class="adm-card"><h3>Cheats right now</h3>' +
      (active.length ? '<p class="sub">These are switched on for this device:</p><div class="adm-actions">' + active.map((a) => '<span class="adm-chip">' + esc(a) + '</span>').join('') + '</div><div class="adm-actions" style="margin-top:12px"><button class="abtn r sm" data-a="nocheat" type="button">Turn all cheats off</button></div>'
        : '<p class="sub">None. The game is fair and square.</p>') +
      '</div></div>';
    const on = (a, fn) => { const b = m.querySelector('[data-a=' + a + ']'); if (b) b.onclick = () => { A.play('click'); fn(); }; };
    on('play', () => ADM.close());
    on('unlock', () => { Store.cheats.unlockAll = !Store.cheats.unlockAll; Store.save('cheats'); toast(Store.cheats.unlockAll ? 'All levels unlocked' : 'Levels locked again'); ADM.go('dash'); });
    on('stars', () => confirmBox('Give all stars?', 'This marks every level as beaten with 3 stars on this device.', 'Give me the stars', () => { completeAll(); toast('All stars awarded!'); ADM.go('dash'); }));
    on('newlevel', () => ADM.go('editor', { fresh: true }));
    on('cheats', () => ADM.go('cheats'));
    on('nocheat', () => { Store.resetCheats(); toast('Cheats off'); ADM.go('dash'); });
  };

  function completeAll() {
    for (const l of JJ.LEVELS) {
      const p = Store.levelProgress(l.id);
      Store.progress[l.id] = { done: true, stars: [true, true, true], best: p.best };
    }
    Store.save('progress');
  }

  VIEWS.cheats = function (m) {
    const c = Store.cheats;
    m.innerHTML =
      '<div class="adm-head"><div><h2>Cheats</h2><p>Changes apply to this device right away. Players on other devices are not affected.</p></div>' +
      '<div class="adm-actions">' + Object.keys(PRESETS).map((k) => '<button class="abtn sm" data-preset="' + k + '" type="button">' + PRESETS[k].name + '</button>').join('') +
      '<button class="abtn r sm" data-a="reset" type="button">Reset all</button></div></div>' +
      '<div class="adm-cols"><div class="adm-card"><h3>Switches</h3>' +
      CHEAT_TOGGLES.map(([k, name, desc]) =>
        '<div class="adm-row"><div class="lbl"><b>' + esc(name) + '</b><span>' + esc(desc) + '</span></div>' +
        '<div class="ctl"><span class="switch"><input type="checkbox" id="ch-' + k + '" data-k="' + k + '"' + (c[k] ? ' checked' : '') + ' aria-label="' + esc(name) + '"><span></span></span></div></div>').join('') +
      '</div><div class="adm-card"><h3>Sliders</h3>' +
      CHEAT_SLIDERS.map(([k, name, min, max, step]) =>
        '<div class="adm-row"><div class="lbl"><b>' + esc(name) + '</b><span>Normal is 1.00</span></div>' +
        '<div class="ctl"><input type="range" id="cs-' + k + '" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + c[k] + '" aria-label="' + esc(name) + '"><output>' + (+c[k]).toFixed(2) + '</output></div></div>').join('') +
      '</div></div>';
    m.querySelectorAll('input[type=checkbox][data-k]').forEach((i) => {
      i.onchange = () => { Store.cheats[i.dataset.k] = i.checked; Store.save('cheats'); A.play('toggle', i.checked); };
    });
    m.querySelectorAll('input[type=range][data-k]').forEach((i) => {
      i.oninput = () => { Store.cheats[i.dataset.k] = +i.value; i.nextElementSibling.textContent = (+i.value).toFixed(2); Store.save('cheats'); };
    });
    m.querySelectorAll('[data-preset]').forEach((b) => {
      b.onclick = () => { Object.assign(Store.cheats, PRESETS[b.dataset.preset].set); Store.save('cheats'); A.play('unlock'); toast(PRESETS[b.dataset.preset].name + ' on'); ADM.go('cheats'); };
    });
    m.querySelector('[data-a=reset]').onclick = () => { Store.resetCheats(); A.play('click'); toast('All cheats reset'); ADM.go('cheats'); };
  };

  VIEWS.progress = function (m) {
    const rows = JJ.LEVELS.map((l) => {
      const p = Store.levelProgress(l.id);
      return '<tr data-id="' + esc(l.id) + '"><td class="num">' + JJ.Game.levelNumber(l) + '</td><td>' + esc(l.name) + '</td>' +
        '<td><input type="checkbox" data-f="done"' + (p.done ? ' checked' : '') + ' aria-label="Beaten"></td>' +
        [0, 1, 2].map((i) => '<td><input type="checkbox" data-f="s' + i + '"' + (p.stars[i] ? ' checked' : '') + ' aria-label="Star ' + (i + 1) + '"></td>').join('') +
        '<td class="num">' + (p.best != null ? U.fmtTime(p.best) : '-') + '</td>' +
        '<td><button class="abtn sm" data-play="' + esc(l.id) + '" type="button"><span data-icon="play"></span>Play</button></td></tr>';
    }).join('');
    m.innerHTML =
      '<div class="adm-head"><div><h2>Progress</h2><p>Tick boxes to change which levels are beaten and which stars are collected.</p></div>' +
      '<div class="adm-actions"><button class="abtn y" data-a="all" type="button"><span data-icon="star"></span>Complete everything</button>' +
      '<button class="abtn" data-a="designs" type="button">Forget saved builds</button>' +
      '<button class="abtn r" data-a="reset" type="button">Reset all progress</button></div></div>' +
      '<div class="adm-card adm-table-wrap"><table class="adm-table"><thead><tr><th>#</th><th>Level</th><th>Beaten</th><th>Star 1</th><th>Star 2</th><th>Star 3</th><th>Best</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    m.querySelectorAll('tbody input[type=checkbox]').forEach((i) => {
      i.onchange = () => {
        const id = i.closest('tr').dataset.id;
        const p = Store.levelProgress(id);
        const f = i.dataset.f;
        if (f === 'done') p.done = i.checked;
        else { p.stars[+f[1]] = i.checked; if (i.checked) p.done = true; }
        if (!p.done) p.stars = [false, false, false];
        Store.progress[id] = p;
        Store.save('progress');
        ADM.go('progress');
      };
    });
    m.querySelectorAll('[data-play]').forEach((b) => {
      b.onclick = () => { const def = JJ.findLevel(b.dataset.play); ADM.close(); JJ.Game.openLevel(def); };
    });
    m.querySelector('[data-a=all]').onclick = () => { completeAll(); toast('Everything completed'); ADM.go('progress'); };
    m.querySelector('[data-a=designs]').onclick = () => confirmBox('Forget saved builds?', 'Every level will start with an empty build grid again.', 'Forget them', () => { Store.designs = {}; Store.save('designs'); toast('Saved builds cleared'); });
    m.querySelector('[data-a=reset]').onclick = () => confirmBox('Reset all progress?', 'Stars, beaten levels and best times on this device will be wiped. Custom levels stay.', 'Reset progress', () => { Store.progress = {}; Store.save('progress'); toast('Progress reset'); ADM.go('progress'); }, true);
  };

  // tiny level preview (no physics)
  function drawThumb(canvas, def) {
    const W = canvas.width = canvas.clientWidth * 2 || 500, H = canvas.height = canvas.clientHeight * 2 || 240;
    const ctx = canvas.getContext('2d');
    let L;
    try { L = JJ.Level.compile(U.clone(def)); } catch (e) { return; }
    const T = JJ.THEMES[L.theme] || JJ.THEMES.hills;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, T.sky[0]); g.addColorStop(1, T.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const grow = (x, y) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
    for (const p of L.pieces) for (const q of p.pts) grow(q[0], q[1]);
    if (L.goal) grow(L.goal.x, L.goal.y);
    grow(L.build.x, L.build.y); grow(L.build.x + L.build.w, L.build.y + L.build.h);
    if (!isFinite(minX)) return;
    minY -= 3; maxY += 3; minX -= 2; maxX += 2;
    const s = Math.min(W / (maxX - minX), H / (maxY - minY));
    const ox = (W - (maxX - minX) * s) / 2 - minX * s, oy = H - ((H - (maxY - minY) * s) / 2) + minY * s;
    ctx.setTransform(s, 0, 0, -s, ox, oy);
    ctx.lineJoin = 'round';
    L.polys.forEach((poly, i) => {
      ctx.beginPath(); poly.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
      ctx.fillStyle = T.ground; ctx.fill();
      for (const strip of L.tops[i]) {
        ctx.beginPath(); strip.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.strokeStyle = T.top; ctx.lineWidth = 0.6; ctx.stroke();
      }
    });
    for (const o of L.objects) {
      ctx.fillStyle = o.type === 'wind' ? 'rgba(200,240,255,0.35)' : o.type === 'spikes' ? '#cfd6de' : o.type === 'tnt' ? '#d8312a' : o.type === 'bounce' ? '#ff4f6d' : '#c98a45';
      const w = o.w || (o.r ? o.r * 2 : 0.8), h = o.h || (o.r ? o.r * 2 : 0.8);
      ctx.fillRect(o.x - w / 2, o.y - h / 2, w, h);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(L.build.x, L.build.y, L.build.w, L.build.h);
    if (L.goal) { ctx.beginPath(); ctx.arc(L.goal.x, L.goal.y, 1.2, 0, Math.PI * 2); ctx.fillStyle = '#ffcf3f'; ctx.fill(); }
    if (L.cap) { ctx.beginPath(); ctx.arc(L.cap.x, L.cap.y, 0.6, 0, Math.PI * 2); ctx.fillStyle = '#ffe27a'; ctx.fill(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ADM.drawThumb = drawThumb;

  ADM.validLevel = function (d) {
    if (!d || typeof d !== 'object') return 'That is not a level.';
    if (!Array.isArray(d.terrain) || !d.terrain.length) return 'The level needs some ground.';
    if (!d.build || !(d.build.w > 0) || !(d.build.h > 0)) return 'The level needs a build grid.';
    if (!d.goal) return 'The level needs a goal.';
    return null;
  };

  ADM.importLevel = function (obj) {
    const err = ADM.validLevel(obj);
    if (err) return err;
    const d = U.clone(obj);
    d.id = 'c-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    d.world = -2;
    d.name = String(d.name || 'Imported level').slice(0, 40);
    Store.custom.push(d);
    Store.save('custom');
    return null;
  };

  VIEWS.levels = function (m) {
    const list = Store.custom;
    m.innerHTML =
      '<div class="adm-head"><div><h2>My Levels</h2><p>Levels you made in the editor. They show up in the game under "My Levels".</p></div>' +
      '<div class="adm-actions"><button class="abtn y" data-a="new" type="button"><span data-icon="plus"></span>New level</button>' +
      '<button class="abtn" data-a="import" type="button"><span data-icon="upload"></span>Import</button>' +
      '<button class="abtn t" data-a="site" type="button"><span data-icon="download"></span>Publish to your site</button></div></div>' +
      (list.length ? '<div class="adm-levels">' + list.map((d, i) =>
        '<div class="adm-lv"><canvas data-thumb="' + i + '"></canvas><div class="info"><b>' + esc(d.name || 'Untitled') + '</b>' +
        '<span class="meta">' + esc(d.theme || 'hills') + ' &middot; ' + (d.objects || []).length + ' objects &middot; ' + Object.values(d.parts || {}).reduce((s, v) => s + (+v || 0), 0) + ' parts</span></div>' +
        '<div class="adm-actions"><button class="abtn g sm" data-play="' + i + '" type="button"><span data-icon="play"></span>Play</button>' +
        '<button class="abtn sm" data-edit="' + i + '" type="button"><span data-icon="edit"></span>Edit</button>' +
        '<button class="abtn sm" data-dup="' + i + '" type="button"><span data-icon="copy"></span>Copy</button>' +
        '<button class="abtn sm" data-exp="' + i + '" type="button"><span data-icon="download"></span>Export</button>' +
        '<button class="abtn r sm" data-del="' + i + '" type="button" aria-label="Delete"><span data-icon="trash"></span></button></div></div>').join('') + '</div>'
        : '<div class="adm-empty">No custom levels yet. Press <b>New level</b> to make your first one!</div>');
    UI.hydrate(m);
    m.querySelectorAll('[data-thumb]').forEach((c) => drawThumb(c, list[+c.dataset.thumb]));
    const q = (a) => m.querySelector('[data-a=' + a + ']');
    q('new').onclick = () => ADM.go('editor', { fresh: true });
    q('import').onclick = () => importDialog();
    q('site').onclick = () => siteDialog();
    m.querySelectorAll('[data-play]').forEach((b) => { b.onclick = () => { const d = list[+b.dataset.play]; ADM.close(); JJ.Game.openLevel(d); }; });
    m.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => ADM.go('editor', { id: list[+b.dataset.edit].id }); });
    m.querySelectorAll('[data-dup]').forEach((b) => {
      b.onclick = () => { const d = U.clone(list[+b.dataset.dup]); d.name = (d.name || 'Level') + ' copy'; ADM.importLevel(d); toast('Copied'); ADM.go('levels'); };
    });
    m.querySelectorAll('[data-exp]').forEach((b) => { b.onclick = () => exportDialog(list[+b.dataset.exp]); });
    m.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => {
        const d = list[+b.dataset.del];
        confirmBox('Delete "' + (d.name || 'Untitled') + '"?', 'This level will be gone for good (unless you exported it).', 'Delete', () => {
          Store.custom.splice(+b.dataset.del, 1); Store.save('custom'); delete Store.designs[d.id]; Store.save('designs');
          toast('Deleted'); ADM.go('levels');
        }, true);
      };
    });
  };

  function exportDialog(def) {
    const clean = U.clone(def);
    delete clean.world;
    const text = JSON.stringify(clean, null, 1);
    const m = modal('<h3>Export "' + esc(def.name || 'level') + '"</h3><p class="muted">Copy this text and send it to a friend. They can paste it into My Levels &gt; Import.</p>' +
      '<textarea readonly id="exp-text" aria-label="Level data">' + esc(text) + '</textarea>' +
      '<div class="adm-actions"><button class="abtn y" data-a="copy" type="button"><span data-icon="copy"></span>Copy</button>' +
      '<button class="abtn" data-a="dl" type="button"><span data-icon="download"></span>Download file</button>' +
      '<button class="abtn" data-a="close" type="button">Close</button></div>');
    const area = m.querySelector('textarea');
    m.querySelector('[data-a=copy]').onclick = () => copyText(text, area);
    m.querySelector('[data-a=dl]').onclick = () => download((def.name || 'level').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.json', text);
    m.querySelector('[data-a=close]').onclick = () => m.close();
  }
  ADM.exportDialog = exportDialog;

  function importDialog() {
    const m = modal('<h3>Import a level</h3><p class="muted">Paste level text below, or pick a .json file.</p>' +
      '<textarea id="imp-text" placeholder="{ &quot;name&quot;: ... }" aria-label="Level data"></textarea>' +
      '<input type="file" id="imp-file" accept=".json,application/json" aria-label="Level file">' +
      '<p class="adm-err" id="imp-err"></p>' +
      '<div class="adm-actions"><button class="abtn" data-a="close" type="button">Cancel</button><button class="abtn y" data-a="go" type="button">Import</button></div>');
    const area = m.querySelector('textarea');
    m.querySelector('#imp-file').onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { area.value = String(r.result || ''); };
      r.readAsText(f);
    };
    m.querySelector('[data-a=close]').onclick = () => m.close();
    m.querySelector('[data-a=go]').onclick = () => {
      let obj;
      try { obj = JSON.parse(area.value); } catch (e) { m.querySelector('#imp-err').textContent = 'That text is not valid level data.'; return; }
      const items = Array.isArray(obj) ? obj : [obj];
      for (const it of items) {
        const err = ADM.importLevel(it);
        if (err) { m.querySelector('#imp-err').textContent = err; return; }
      }
      m.close();
      toast(items.length > 1 ? items.length + ' levels imported' : 'Level imported');
      ADM.go('levels');
    };
  }

  function siteDialog() {
    const levels = Store.custom.map((d) => { const c = U.clone(d); c.id = 's-' + String(d.id).replace(/^c-/, ''); delete c.world; return c; });
    const text = '/* Junkyard Joyride - extra levels for everyone who visits your site. */\nwindow.JJ_SITE_LEVELS = ' + JSON.stringify(levels, null, 1) + ';\n';
    const m = modal('<h3>Publish levels to your site</h3>' +
      '<p class="muted">Your levels are saved in this browser only. To let <b>everyone</b> who visits your page play them:</p>' +
      '<ol class="muted" style="margin:0;padding-left:20px;line-height:1.6"><li>Press <b>Copy</b> (or Download).</li><li>In your GitHub repo, open <b>js/site-levels.js</b> and replace everything in it with this text.</li><li>Commit. Your levels appear in the <b>Bonus</b> tab for everyone.</li></ol>' +
      '<textarea readonly aria-label="site-levels.js">' + esc(text) + '</textarea>' +
      '<div class="adm-actions"><button class="abtn y" data-a="copy" type="button"><span data-icon="copy"></span>Copy</button>' +
      '<button class="abtn" data-a="dl" type="button"><span data-icon="download"></span>Download site-levels.js</button>' +
      '<button class="abtn" data-a="close" type="button">Close</button></div>');
    const area = m.querySelector('textarea');
    m.querySelector('[data-a=copy]').onclick = () => copyText(text, area);
    m.querySelector('[data-a=dl]').onclick = () => download('site-levels.js', text);
    m.querySelector('[data-a=close]').onclick = () => m.close();
  }

  VIEWS.settings = function (m) {
    m.innerHTML =
      '<div class="adm-head"><div><h2>Settings</h2><p>Passcode, title message and save data.</p></div></div>' +
      '<div class="adm-cols">' +
      '<div class="adm-card"><h3>Admin passcode</h3>' +
      '<p class="sub">' + (Store.usingDefaultPass() ? 'You are using the default passcode (<b>junkyard</b>).' : 'You have a custom passcode.') + '</p>' +
      '<div class="ed-field"><label for="pc-1">New passcode</label><input type="password" id="pc-1" autocomplete="new-password"></div>' +
      '<div class="ed-field" style="margin-top:8px"><label for="pc-2">Type it again</label><input type="password" id="pc-2" autocomplete="new-password"></div>' +
      '<p class="adm-err" id="pc-err"></p>' +
      '<div class="adm-actions"><button class="abtn y" data-a="local" type="button">Use on this device</button><button class="abtn" data-a="site" type="button">Make site code</button></div>' +
      '<p class="sub" style="margin-top:10px">"Use on this device" changes it in this browser. "Make site code" gives you a line to paste into <b>js/config.js</b> so it changes for your whole website. It is a fun lock for a static site, not bank security.</p></div>' +
      '<div class="adm-card"><h3>Title screen message</h3><p class="sub">Shows a note on the title screen of this device.</p>' +
      '<div class="ed-field"><label for="motd">Message</label><input type="text" id="motd" maxlength="120" value="' + esc(Store.admin.motd || '') + '" placeholder="New levels every Friday!"></div>' +
      '<div class="adm-actions" style="margin-top:10px"><button class="abtn y" data-a="motd" type="button">Save message</button></div>' +
      '<p class="sub" style="margin-top:10px">For everyone who visits your site, put the message in <b>motd</b> inside <b>js/config.js</b>.</p></div>' +
      '<div class="adm-card"><h3>Save data</h3><p class="sub">Back up or move progress, builds, custom levels and cheats.</p>' +
      '<div class="adm-actions"><button class="abtn" data-a="backup" type="button"><span data-icon="download"></span>Back up</button><button class="abtn" data-a="restore" type="button"><span data-icon="upload"></span>Restore</button></div>' +
      '<div class="adm-row" style="margin-top:12px"><div class="lbl"><b style="color:#ff6a5c">Reset everything</b><span>Wipes all game data on this device, including custom levels.</span></div><div class="ctl"><button class="abtn r sm" data-a="wipe" type="button">Reset</button></div></div></div>' +
      '<div class="adm-card"><h3>About</h3><p class="sub">Junkyard Joyride. Physics by planck.js (MIT license). Art and sound are made in code, so there are no image or sound files.</p>' +
      '<p class="sub">Shortcut: press the <b>`</b> key in the game to open the admin quick tools.</p></div>' +
      '</div>';
    const err = m.querySelector('#pc-err');
    const read = () => {
      const a = m.querySelector('#pc-1').value, b = m.querySelector('#pc-2').value;
      if (a.length < 4) { err.textContent = 'Use at least 4 characters.'; return null; }
      if (a !== b) { err.textContent = 'The two passcodes do not match.'; return null; }
      err.textContent = '';
      return a.trim();
    };
    m.querySelector('[data-a=local]').onclick = () => {
      const code = read(); if (!code) return;
      Store.admin.passHash = U.hash(code); Store.save('admin');
      toast('Passcode changed on this device'); ADM.go('settings');
    };
    m.querySelector('[data-a=site]').onclick = () => {
      const code = read(); if (!code) return;
      const line = "  adminPassHash: '" + U.hash(code) + "',";
      const md = modal('<h3>Your site code</h3><p class="muted">Open <b>js/config.js</b> in your repo and replace the <b>adminPassHash</b> line with this one, then commit:</p>' +
        '<div class="adm-code">' + esc(line) + '</div><div class="adm-actions"><button class="abtn y" data-a="copy" type="button"><span data-icon="copy"></span>Copy</button><button class="abtn" data-a="close" type="button">Done</button></div>');
      md.querySelector('[data-a=copy]').onclick = () => copyText(line);
      md.querySelector('[data-a=close]').onclick = () => md.close();
    };
    m.querySelector('[data-a=motd]').onclick = () => { Store.admin.motd = m.querySelector('#motd').value.trim(); Store.save('admin'); toast('Message saved'); };
    m.querySelector('[data-a=backup]').onclick = () => {
      const data = { v: 1, progress: Store.progress, designs: Store.designs, settings: Store.settings, cheats: Store.cheats, custom: Store.custom, stats: Store.stats };
      const text = JSON.stringify(data);
      const md = modal('<h3>Back up save data</h3><p class="muted">Keep this text somewhere safe. Paste it into Restore to bring everything back.</p><textarea readonly aria-label="Save data">' + esc(text) + '</textarea>' +
        '<div class="adm-actions"><button class="abtn y" data-a="copy" type="button"><span data-icon="copy"></span>Copy</button><button class="abtn" data-a="dl" type="button"><span data-icon="download"></span>Download</button><button class="abtn" data-a="close" type="button">Close</button></div>');
      md.querySelector('[data-a=copy]').onclick = () => copyText(text, md.querySelector('textarea'));
      md.querySelector('[data-a=dl]').onclick = () => download('junkyard-joyride-save.json', text);
      md.querySelector('[data-a=close]').onclick = () => md.close();
    };
    m.querySelector('[data-a=restore]').onclick = () => {
      const md = modal('<h3>Restore save data</h3><p class="muted">Paste a backup below. This replaces the current save data on this device.</p><textarea aria-label="Save data"></textarea><p class="adm-err"></p>' +
        '<div class="adm-actions"><button class="abtn" data-a="close" type="button">Cancel</button><button class="abtn y" data-a="go" type="button">Restore</button></div>');
      md.querySelector('[data-a=close]').onclick = () => md.close();
      md.querySelector('[data-a=go]').onclick = () => {
        let d;
        try { d = JSON.parse(md.querySelector('textarea').value); } catch (e) { md.querySelector('.adm-err').textContent = 'That is not a valid backup.'; return; }
        if (!d || typeof d !== 'object' || !d.progress) { md.querySelector('.adm-err').textContent = 'That is not a valid backup.'; return; }
        for (const k of ['progress', 'designs', 'custom']) if (d[k]) { Store[k] = d[k]; Store.save(k); }
        for (const k of ['settings', 'cheats', 'stats']) if (d[k]) { Object.assign(Store[k], d[k]); Store.save(k); }
        md.close(); toast('Save data restored'); ADM.go('settings');
      };
    };
    m.querySelector('[data-a=wipe]').onclick = () => confirmBox('Reset EVERYTHING?', 'Progress, builds, custom levels, cheats, stats and the passcode on this device will be erased. This cannot be undone.', 'Erase it all', () => {
      Store.wipeAll(); toast('Everything erased'); ADM.close(); JJ.Game.showTitle();
    }, true);
  };

  VIEWS.editor = function (m, arg) {
    if (!JJ.Editor) { m.innerHTML = '<p>Editor missing.</p>'; return; }
    JJ.Editor.mount(m, arg || {});
  };

  // ------------------------------------------------------ quick tools
  ADM.toggleQuick = function () {
    const q = document.getElementById('quick');
    if (!Store.isAdmin()) { q.hidden = true; return; }
    if (!q.hidden) { q.hidden = true; return; }
    ADM.renderQuick();
    q.hidden = false;
  };

  ADM.renderQuick = function () {
    const q = document.getElementById('quick');
    const c = Store.cheats;
    const G = JJ.Game;
    const sw = (k, name) => '<div class="field"><label for="q-' + k + '">' + name + '</label><span class="switch"><input type="checkbox" id="q-' + k + '" data-k="' + k + '"' + (c[k] ? ' checked' : '') + '><span></span></span></div>';
    q.innerHTML = '<h3>Admin tools <button class="icon-btn" data-a="x" type="button" style="width:36px;height:36px;font-size:1rem" aria-label="Close"><span data-icon="close"></span></button></h3><div class="q-body">' +
      sw('godMode', 'God mode') + sw('unlimitedParts', 'Unlimited parts') + sw('infiniteFuel', 'Infinite fuel') +
      '<div class="field"><label for="q-slow">Slow motion</label><span class="switch"><input type="checkbox" id="q-slow"' + (c.timeScale < 1 ? ' checked' : '') + '><span></span></span></div>' +
      sw('bigHead', 'Big-head Rocco') + sw('rainbow', 'Rainbow trail') + sw('debug', 'Physics X-ray') +
      '<div class="q-sub">Gravity</div><div class="field"><input type="range" id="q-grav" min="0.1" max="2" step="0.05" value="' + c.gravity + '" aria-label="Gravity" style="width:100%"></div>' +
      (G.state === 'play' ? '<div class="q-sub">Drop in stuff</div><div class="q-row">' +
        ['crate', 'tnt', 'ball', 'plank'].map((t) => '<button class="btn btn-sm btn-steel" data-spawn="' + t + '" type="button">' + (t === 'tnt' ? 'TNT' : t[0].toUpperCase() + t.slice(1)) + '</button>').join('') + '</div>' +
        '<div class="q-sub">Actions</div><div class="q-row"><button class="btn btn-sm btn-green" data-a="win" type="button">Instant win</button><button class="btn btn-sm btn-red" data-a="boom" type="button">Boom!</button></div>' : '') +
      '<div class="q-row"><button class="btn btn-sm" data-a="panel" type="button"><span data-icon="shield"></span>Open admin panel</button></div>' +
      '<p style="font-size:0.75rem;color:#b9c0cc;margin:4px 0 0">Gravity and parts changes apply on the next run.</p></div>';
    UI.hydrate(q);
    q.querySelector('[data-a=x]').onclick = () => { q.hidden = true; };
    q.querySelectorAll('input[data-k]').forEach((i) => {
      i.onchange = () => {
        Store.cheats[i.dataset.k] = i.checked; Store.save('cheats'); A.play('toggle', i.checked);
        if (i.dataset.k === 'unlimitedParts' && G.state === 'build') G.refreshHud();
        if (G.sim) G.sim.cheats.godMode = Store.cheats.godMode;
        if (G.sim) G.sim.cheats.infiniteFuel = Store.cheats.infiniteFuel;
        document.getElementById('bd-cheats').hidden = !Store.cheatsActive();
        document.getElementById('pl-cheats').hidden = !Store.cheatsActive();
      };
    });
    q.querySelector('#q-slow').onchange = (e) => { Store.cheats.timeScale = e.target.checked ? 0.4 : 1; Store.save('cheats'); };
    q.querySelector('#q-grav').oninput = (e) => { Store.cheats.gravity = +e.target.value; Store.save('cheats'); };
    q.querySelectorAll('[data-spawn]').forEach((b) => { b.onclick = () => { if (G.spawnProp(b.dataset.spawn)) A.play('place'); }; });
    const on = (a, fn) => { const b = q.querySelector('[data-a=' + a + ']'); if (b) b.onclick = fn; };
    on('win', () => { G.instantWin(); q.hidden = true; });
    on('boom', () => G.explodeAll());
    on('panel', () => { q.hidden = true; ADM.open(); });
  };

  JJ.Admin = ADM;
})((globalThis.JJ = globalThis.JJ || {}));
