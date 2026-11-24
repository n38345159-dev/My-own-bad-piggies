/* Junkyard Joyride - save data (progress, designs, settings, cheats, custom levels, stats) */
(function (JJ) {
  'use strict';
  const PREFIX = 'jj_';

  function read(key, def) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? def : JSON.parse(v);
    } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }

  const CHEAT_DEFAULTS = {
    godMode: false, unlimitedParts: false, infiniteFuel: false, unlockAll: false,
    gravity: 1, timeScale: 1, enginePower: 1, thrustPower: 1, balloonLift: 1,
    bouncy: false, superGrip: false, bigHead: false, rainbow: false, debug: false
  };
  const SETTING_DEFAULTS = { sfx: 0.8, music: 0.45, shake: true, hints: true };
  const STAT_DEFAULTS = {
    runs: 0, wins: 0, partsPlaced: 0, explosions: 0, pops: 0, breaks: 0,
    playTime: 0, distance: 0, rocketTime: 0, crashes: 0, firstPlayed: 0
  };

  const Store = {
    CHEAT_DEFAULTS,
    progress: read('progress', {}),
    designs: read('designs', {}),
    settings: Object.assign({}, SETTING_DEFAULTS, read('settings', {})),
    cheats: Object.assign({}, CHEAT_DEFAULTS, read('cheats', {})),
    custom: read('custom', []),
    stats: Object.assign({}, STAT_DEFAULTS, read('stats', {})),
    admin: Object.assign({ passHash: null, sessionUntil: 0, motd: '' }, read('admin', {})),

    save(key) { return write(key, this[key]); },

    levelProgress(id) { return this.progress[id] || { done: false, stars: [false, false, false], best: null }; },
    recordWin(id, stars, time) {
      const p = this.levelProgress(id);
      const newStars = p.stars.map((s, i) => s || !!stars[i]);
      const gained = newStars.filter(Boolean).length - p.stars.filter(Boolean).length;
      this.progress[id] = { done: true, stars: newStars, best: p.best == null ? time : Math.min(p.best, time) };
      this.save('progress');
      return gained;
    },
    totalStars() {
      let n = 0;
      for (const k in this.progress) n += (this.progress[k].stars || []).filter(Boolean).length;
      return n;
    },

    cheatsActive() {
      const c = this.cheats;
      for (const k in CHEAT_DEFAULTS) if (k !== 'debug' && c[k] !== CHEAT_DEFAULTS[k]) return true;
      return false;
    },
    resetCheats() { this.cheats = Object.assign({}, CHEAT_DEFAULTS); this.save('cheats'); },

    isAdmin() { return this.admin.sessionUntil > Date.now(); },
    adminHash() { return this.admin.passHash || (window.JJ_CONFIG && window.JJ_CONFIG.adminPassHash) || JJ.U.hash('junkyard'); },
    usingDefaultPass() { return this.adminHash() === JJ.U.hash('junkyard'); },
    login(code) {
      if (JJ.U.hash(String(code).trim()) !== this.adminHash()) return false;
      this.admin.sessionUntil = Date.now() + 12 * 3600 * 1000;
      this.save('admin');
      return true;
    },
    logout() { this.admin.sessionUntil = 0; this.save('admin'); },

    bumpStat(k, v) {
      this.stats[k] = (this.stats[k] || 0) + (v == null ? 1 : v);
      this._statsDirty = true;
    },
    flushStats() { if (this._statsDirty) { this.save('stats'); this._statsDirty = false; } },

    wipeAll() {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) keys.push(k); }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* storage blocked */ }
      this.progress = {}; this.designs = {}; this.custom = [];
      this.settings = Object.assign({}, SETTING_DEFAULTS);
      this.cheats = Object.assign({}, CHEAT_DEFAULTS);
      this.stats = Object.assign({}, STAT_DEFAULTS);
      this.admin = { passHash: null, sessionUntil: 0, motd: '' };
    }
  };
  if (!Store.stats.firstPlayed) { Store.stats.firstPlayed = Date.now(); Store.save('stats'); }

  JJ.Store = Store;
})((globalThis.JJ = globalThis.JJ || {}));
