/* Junkyard Joyride - synthesized sound effects and music (Web Audio, no files needed) */
(function (JJ) {
  'use strict';

  const A = {
    ctx: null, master: null, sfx: null, music: null, noise: null,
    sfxVol: 0.8, musicVol: 0.4, unlocked: false,
    loops: {}, musicOn: false, intensity: 0, step: 0, nextTime: 0, timer: null
  };

  function ensure() {
    if (A.ctx) return A.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { A.ctx = new AC(); } catch (e) { return null; }
    const c = A.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
    A.master = c.createGain(); A.master.gain.value = 0.9;
    A.master.connect(comp); comp.connect(c.destination);
    A.sfx = c.createGain(); A.sfx.gain.value = A.sfxVol; A.sfx.connect(A.master);
    A.music = c.createGain(); A.music.gain.value = A.musicVol * 0.55; A.music.connect(A.master);
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = buf;
    return c;
  }

  A.unlock = function () {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    A.unlocked = true;
  };

  A.setVolumes = function (sfx, music) {
    A.sfxVol = sfx; A.musicVol = music;
    if (!A.ctx) return;
    A.sfx.gain.setTargetAtTime(sfx, A.ctx.currentTime, 0.05);
    A.music.gain.setTargetAtTime(music * 0.55, A.ctx.currentTime, 0.05);
  };

  function env(g, t, a, peak, dcy, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
    void end;
  }

  function tone(type, f0, f1, dur, vol, dest, when) {
    const c = A.ctx; if (!c) return;
    const t = when || c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(dest || A.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, filterType, f0, f1, q, dest, when) {
    const c = A.ctx; if (!c) return;
    const t = when || c.currentTime;
    const s = c.createBufferSource(); s.buffer = A.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = filterType || 'lowpass';
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    f.Q.value = q || 0.7;
    const g = c.createGain();
    env(g, t, 0.004, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest || A.sfx);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  const SFX = {
    click() { tone('square', 700, 900, 0.05, 0.12); },
    hover() { tone('sine', 900, 1000, 0.03, 0.04); },
    place() { tone('triangle', 260, 110, 0.09, 0.4); noise(0.06, 0.25, 'bandpass', 1400, 600, 1.5); },
    placeMetal() { tone('sine', 620, 600, 0.25, 0.18); tone('sine', 1480, 1450, 0.18, 0.1); noise(0.04, 0.2, 'highpass', 3000); },
    remove() { tone('sine', 520, 180, 0.1, 0.25); },
    rotate() { tone('square', 500, 500, 0.03, 0.08); tone('square', 750, 750, 0.04, 0.08, null, A.ctx.currentTime + 0.05); },
    error() { tone('square', 150, 140, 0.16, 0.15); },
    go() {
      const t = A.ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.09, 0.1, null, t + i * 0.06));
    },
    boom() {
      noise(1.1, 0.9, 'lowpass', 2600, 120, 0.8);
      tone('sine', 110, 35, 0.6, 0.9);
      noise(0.25, 0.4, 'highpass', 1800, 600, 0.5);
    },
    crack(wood) {
      noise(0.08, 0.5, wood ? 'bandpass' : 'highpass', wood ? 1800 : 3200, wood ? 700 : 1500, 2);
      tone(wood ? 'triangle' : 'sine', wood ? 180 : 700, wood ? 80 : 500, 0.12, 0.25);
    },
    thud(s) { const v = Math.min(0.5, 0.08 + s * 0.02); tone('sine', 120, 55, 0.14, v); noise(0.08, v * 0.6, 'lowpass', 700, 200); },
    pop() { noise(0.05, 0.6, 'bandpass', 3200, 1500, 1.2); tone('sine', 900, 300, 0.06, 0.2); },
    collect() {
      const t = A.ctx.currentTime;
      [1047, 1319, 1568, 2093].forEach((f, i) => tone('triangle', f, f, 0.18, 0.18, null, t + i * 0.06));
    },
    star(i) { const f = [784, 988, 1175][i || 0]; tone('triangle', f, f, 0.35, 0.25); tone('sine', f * 2, f * 2, 0.25, 0.08); },
    win() {
      const t = A.ctx.currentTime;
      const notes = [523, 659, 784, 1047, 784, 1047];
      const times = [0, 0.1, 0.2, 0.3, 0.45, 0.55];
      notes.forEach((f, i) => { tone('square', f, f, 0.16, 0.12, null, t + times[i]); tone('triangle', f / 2, f / 2, 0.2, 0.15, null, t + times[i]); });
      [523, 659, 784].forEach((f) => tone('triangle', f, f, 0.9, 0.12, null, t + 0.7));
    },
    bounce() { tone('sine', 180, 620, 0.18, 0.3); tone('sine', 620, 320, 0.2, 0.15, null, A.ctx.currentTime + 0.18); },
    fall() { tone('sine', 1200, 200, 0.9, 0.18); },
    toggle(on) { tone('square', on ? 440 : 330, on ? 660 : 220, 0.07, 0.1); },
    fuelout() { tone('sawtooth', 300, 90, 0.3, 0.1); },
    unlock() {
      const t = A.ctx.currentTime;
      [659, 784, 988, 1319].forEach((f, i) => tone('triangle', f, f, 0.2, 0.15, null, t + i * 0.08));
    }
  };

  A.play = function (name, arg) {
    if (!A.ctx || !A.unlocked || A.sfxVol <= 0) return;
    const fn = SFX[name];
    if (fn) { try { fn(arg); } catch (e) { /* audio hiccup */ } }
  };

  // ------------------------------------------------------------ loops
  function makeLoop(kind) {
    const c = A.ctx;
    const out = c.createGain(); out.gain.value = 0; out.connect(A.sfx);
    const L = { out, kind };
    if (kind === 'engine') {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 3;
      const am = c.createGain(); am.gain.value = 0.6;
      const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 16;
      const lfoG = c.createGain(); lfoG.gain.value = 0.4;
      lfo.connect(lfoG); lfoG.connect(am.gain);
      o.connect(f); f.connect(am); am.connect(out);
      o.start(); lfo.start();
      L.osc = o; L.lfo = lfo;
    } else {
      const s = c.createBufferSource(); s.buffer = A.noise; s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = kind === 'rocket' ? 700 : kind === 'wind' ? 500 : 380;
      f.Q.value = kind === 'rocket' ? 0.6 : 1.2;
      s.connect(f);
      if (kind === 'fan') {
        const am = c.createGain(); am.gain.value = 0.6;
        const lfo = c.createOscillator(); lfo.frequency.value = 22;
        const lg = c.createGain(); lg.gain.value = 0.35;
        lfo.connect(lg); lg.connect(am.gain); lfo.start();
        f.connect(am); am.connect(out);
      } else f.connect(out);
      s.start();
      L.src = s; L.filter = f;
    }
    return L;
  }

  // level: 0..1, param: kind-specific (engine speed etc.)
  A.loop = function (kind, level, param) {
    if (!A.ctx || !A.unlocked) return;
    let L = A.loops[kind];
    if (!L) {
      if (level <= 0.001) return;
      L = A.loops[kind] = makeLoop(kind);
    }
    const t = A.ctx.currentTime;
    const vol = { engine: 0.22, rocket: 0.5, fan: 0.16, wind: 0.22 }[kind] || 0.2;
    L.out.gain.setTargetAtTime(level * vol, t, 0.06);
    if (kind === 'engine' && L.osc) {
      const p = param || 0;
      L.osc.frequency.setTargetAtTime(45 + p * 5, t, 0.1);
      L.lfo.frequency.setTargetAtTime(12 + p * 2.2, t, 0.1);
    }
    if (kind === 'wind' && L.filter) L.filter.frequency.setTargetAtTime(300 + (param || 0) * 60, t, 0.2);
  };

  A.stopLoops = function () {
    for (const k in A.loops) A.loop(k, 0);
  };

  // ------------------------------------------------------------ music
  const BPM = 112;
  const E8 = 60 / BPM / 2;
  const n = (s) => 440 * Math.pow(2, (s - 69) / 12);
  // chords per bar (root midi, type)
  const CH = [
    [48, 'M'], [45, 'm'], [41, 'M'], [43, 'M'], [48, 'M'], [45, 'm'], [50, 'm'], [48, 'M'],
    [41, 'M'], [43, 'M'], [40, 'm'], [45, 'm'], [41, 'M'], [43, 'M'], [48, 'M'], [43, 'M']
  ];
  // melody: per bar list of [step, midi, len]
  const MEL = [
    [[0, 76, 1], [2, 79, 1], [4, 81, 1], [5, 79, 1], [6, 76, 2]],
    [[0, 72, 1], [2, 74, 1], [3, 76, 2], [6, 72, 2]],
    [[0, 77, 1], [2, 81, 1], [4, 84, 1], [6, 81, 2]],
    [[0, 79, 3], [4, 71, 1], [6, 74, 2]],
    [[0, 76, 1], [2, 79, 1], [4, 84, 1], [6, 83, 2]],
    [[0, 81, 1], [2, 79, 1], [4, 76, 1], [6, 72, 2]],
    [[0, 74, 1], [2, 77, 1], [4, 71, 1], [6, 74, 2]],
    [[0, 72, 4]],
    [[0, 81, 1], [2, 81, 1], [3, 84, 1], [5, 81, 1], [6, 77, 2]],
    [[0, 79, 1], [2, 79, 1], [3, 83, 1], [5, 79, 1], [6, 74, 2]],
    [[0, 76, 1], [2, 79, 1], [4, 83, 1], [6, 79, 2]],
    [[0, 81, 3], [4, 76, 3]],
    [[0, 77, 1], [2, 81, 1], [4, 84, 1], [6, 86, 2]],
    [[0, 83, 2], [3, 79, 2], [6, 74, 2]],
    [[0, 76, 1], [2, 72, 1], [4, 79, 1], [6, 76, 2]],
    [[0, 74, 3], [4, 67, 3]]
  ];

  function chordNotes(root, type) {
    return type === 'm' ? [root + 12, root + 15, root + 19] : [root + 12, root + 16, root + 19];
  }

  function mTone(type, f, t, dur, vol, cutoff) {
    const c = A.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    let node = o;
    if (cutoff) {
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff;
      o.connect(fl); node = fl;
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g); g.connect(A.music);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function scheduleStep(step, t) {
    const bar = Math.floor(step / 8) % 16, s = step % 8;
    const [root, type] = CH[bar];
    // bass: oom-pah
    if (s % 2 === 0) {
      const bn = s === 0 || s === 4 ? root - 12 : root - 5;
      mTone('triangle', n(bn), t, E8 * 1.6, 0.32);
    }
    // chord stabs on the off beats
    if (s % 2 === 1) for (const cn of chordNotes(root, type)) mTone('square', n(cn), t, E8 * 0.6, 0.028, 1600);
    // melody
    for (const m of MEL[bar]) {
      if (m[0] === s) {
        mTone('square', n(m[1]), t, E8 * m[2] * 0.95, 0.05, 2600);
        mTone('triangle', n(m[1]), t, E8 * m[2], 0.06);
      }
    }
    // drums
    if (A.intensity > 0) {
      const c = A.ctx;
      if (s === 0 || s === 4) {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g); g.connect(A.music); o.start(t); o.stop(t + 0.2);
      }
      if (s === 2 || s === 6) noise(0.12, 0.18, 'bandpass', 1800, 900, 0.8, A.music, t);
      noise(0.03, s % 2 ? 0.05 : 0.08, 'highpass', 7000, null, 0.7, A.music, t);
    }
  }

  function tick() {
    if (!A.ctx || !A.musicOn) return;
    while (A.nextTime < A.ctx.currentTime + 0.15) {
      scheduleStep(A.step, A.nextTime);
      A.step = (A.step + 1) % (16 * 8);
      A.nextTime += E8;
    }
  }

  A.startMusic = function () {
    if (!A.ctx || !A.unlocked) return;
    if (A.musicOn) return;
    A.musicOn = true;
    A.nextTime = A.ctx.currentTime + 0.1;
    A.timer = setInterval(tick, 40);
  };
  A.stopMusic = function () {
    A.musicOn = false;
    if (A.timer) clearInterval(A.timer);
    A.timer = null;
  };
  A.setIntensity = function (v) { A.intensity = v; };

  JJ.Audio = A;
})((globalThis.JJ = globalThis.JJ || {}));
