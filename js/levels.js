/* Junkyard Joyride - built-in levels.
   Coordinates are in metres (1 grid cell = 1 m), y points up.
   terrain: list of pieces. An open piece is a ground line (left to right) filled down to the bottom.
            A piece with closed:true is a floating polygon (islands, ceilings...).
   build:   bottom-left corner + size of the build grid.
   star3:   {type:'time', value} | {type:'intact'} | {type:'noPart', part} | {type:'maxParts', value} */
(function (JJ) {
  'use strict';

  function island(x0, x1, top, depth, seed) {
    const d = depth || 5;
    const mid = (x0 + x1) / 2;
    const w = x1 - x0;
    const s = seed || 1;
    return {
      closed: true,
      pts: [
        [x0, top], [x1, top],
        [x1 - w * 0.06, top - d * 0.35],
        [x1 - w * 0.2, top - d * 0.6],
        [mid + w * 0.12 * s, top - d],
        [mid - w * 0.1, top - d * 0.8],
        [x0 + w * 0.18, top - d * 0.55],
        [x0 + w * 0.05, top - d * 0.3]
      ]
    };
  }

  function bumpy(x0, x1, base, seed) {
    const r = JJ.U.rng(seed);
    const pts = [];
    let x = x0;
    while (x < x1) {
      pts.push([+x.toFixed(2), +(base + (r() < 0.35 ? 0.35 + r() * 0.75 : r() * 0.25)).toFixed(2)]);
      x += 1.6 + r() * 1.8;
    }
    pts.push([x1, base]);
    return pts;
  }

  const WORLDS = [
    { id: 'w1', name: 'Scrapyard Hills', theme: 'hills', blurb: 'Learn the ropes in Rocco\'s backyard.' },
    { id: 'w2', name: 'Dusty Canyon', theme: 'canyon', blurb: 'Big gaps, bouncy pads and lots of TNT.' },
    { id: 'w3', name: 'Sky Scraps', theme: 'sky', blurb: 'Floating junk islands way up in the clouds.' }
  ];

  const LEVELS = [
    // ------------------------------------------------------------ WORLD 1
    {
      id: 'w1-1', world: 0, name: 'First Ride', theme: 'hills',
      hint: 'Build a car! Put Rocco, a crate and the engine on top, with two wheels underneath. Press PLAY, then tap the Engine button.',
      build: { x: -1, y: 0.02, w: 4, h: 2 },
      parts: { seat: 1, wood: 2, engine: 1, wheel: 2 },
      terrain: [{ pts: [[-14, 10], [-12, 3], [-9, 0], [12, 0], [16, 0.8], [20, 0.3], [27, 0.3], [32, 1.4], [36, 1.2], [52, 1.2], [60, 4], [64, 12]] }],
      objects: [],
      goal: { x: 46, y: 2.6 },
      cap: { x: 21, y: 2.1 },
      star3: { type: 'time', value: 8 }
    },
    {
      id: 'w1-2', world: 0, name: 'Downhill Dash', theme: 'hills',
      hint: 'No engine needed! Gravity does the work. Build a sturdy cart and jump the spike pit.',
      build: { x: -4, y: 18.05, w: 3, h: 2 },
      parts: { seat: 1, wood: 2, wheel: 2 },
      terrain: [
        { pts: [[-11, 26], [-8, 19.0], [4, 16.0], [8, 14.5], [24, 4], [34, 0.5], [39, 0.2], [41.5, 1.3]] },
        { pts: [[46.5, -0.4], [57, -2.2], [64, -2.2], [70, 2], [72, 10]] },
        { closed: true, pts: [[41, -9], [47, -9], [47, -11], [41, -11]] }
      ],
      objects: [{ type: 'spikes', x: 44, y: -8.75, w: 5.6 }],
      killY: -7,
      goal: { x: 59, y: -0.8 },
      cap: { x: 44, y: 3.6 },
      star3: { type: 'intact' }
    },
    {
      id: 'w1-3', world: 0, name: 'Hill Climber', theme: 'hills',
      hint: 'That last hill is steep! More engines = more power. More wheels = more grip.',
      build: { x: -1, y: 0.02, w: 4, h: 3 },
      parts: { seat: 1, wood: 4, engine: 2, wheel: 4 },
      terrain: [{ pts: [[-12, 10], [-10, 0], [8, 0], [18, 4], [20, 3.2], [22, 4], [26, 4], [36, 11.5], [50, 11.5], [60, 12], [62, 20]] }],
      objects: [],
      goal: { x: 46, y: 12.9 },
      cap: { x: 20, y: 4.6 },
      star3: { type: 'maxParts', value: 8 }
    },
    {
      id: 'w1-4', world: 0, name: 'Up and Away', theme: 'hills',
      hint: 'Balloons lift you up. A fan pushes you along. Tap Pop to let balloons go one at a time and float back down.',
      build: { x: -3, y: 0.02, w: 4, h: 3 },
      parts: { seat: 1, wood: 2, balloon: 4, fan: 1, wheel: 2 },
      terrain: [{ pts: [[-14, 16], [-12, 0], [5.6, 0], [6, 10], [30, 10], [34, 16]] }],
      objects: [{ type: 'crate', x: 24, y: 10.5, w: 1, h: 1 }],
      goal: { x: 17, y: 11.4 },
      cap: { x: 6, y: 17.6 },
      star3: { type: 'time', value: 20 }
    },
    {
      id: 'w1-5', world: 0, name: 'Rocket Leap', theme: 'hills',
      hint: 'Rockets give a huge push but run out fast. Fire them just before the ramp! Tip: rockets mounted high make you nose-dive.',
      build: { x: -2, y: 6.02, w: 5, h: 2 },
      parts: { seat: 1, wood: 3, engine: 1, wheel: 2, rocket: 2 },
      terrain: [
        { pts: [[-12, 14], [-10, 6], [13, 6], [17.5, 6.9], [19.5, 7.3]] },
        { pts: [[30.5, 4.6], [37, 3.6], [60, 3.6], [64, 12]] },
        { closed: true, pts: [[19, -8], [31, -8], [31, -10], [19, -10]] }
      ],
      objects: [{ type: 'spikes', x: 25, y: -7.75, w: 11.5 }],
      killY: -6,
      goal: { x: 48, y: 5.0 },
      cap: { x: 25, y: 10.2 },
      star3: { type: 'time', value: 8 }
    },
    {
      id: 'w1-6', world: 0, name: 'Junk Pile Jump', theme: 'hills',
      hint: 'Big drop ahead! Springs between the frame and the wheels soak up hard landings.',
      build: { x: -2, y: 0.02, w: 5, h: 3 },
      parts: { seat: 1, wood: 4, metal: 2, engine: 2, wheel: 4, spring: 4 },
      terrain: [{ pts: [[-14, 10], [-12, 0], [6, 0], [16, 4.5], [32, 4.8], [35, 6.0], [35.4, 0.6], [39, 0]].concat(bumpy(41, 64, 0, 77)).concat([[72, 0], [76, 4], [78, 12]]) }],
      objects: [{ type: 'tnt', x: 55, y: 0.6 }],
      goal: { x: 66, y: 1.4 },
      cap: { x: 41, y: 7.6 },
      star3: { type: 'intact' }
    },
    // ------------------------------------------------------------ WORLD 2
    {
      id: 'w2-1', world: 1, name: 'Canyon Hopper', theme: 'canyon',
      hint: 'Three gaps in a row. You will need some speed!',
      build: { x: -2, y: 4.02, w: 5, h: 3 },
      parts: { seat: 1, wood: 3, engine: 2, wheel: 4, spring: 2 },
      terrain: [
        { pts: [[-12, 14], [-10, 4], [10, 4], [14, 4.8], [15.5, 5.2]] },
        { pts: [[20.5, 4], [30, 4], [34, 4.8], [35.5, 5.2]] },
        { pts: [[41, 4], [51, 4], [55, 4.8], [56.5, 5.2]] },
        { pts: [[63, 4], [90, 4], [94, 12]] }
      ],
      objects: [],
      goal: { x: 80, y: 5.4 },
      cap: { x: 59.5, y: 8.1 },
      star3: { type: 'time', value: 11 }
    },
    {
      id: 'w2-2', world: 1, name: 'Boom Town', theme: 'canyon',
      hint: 'A barricade blocks the old mine. Bring TNT, drive up to the barricade and set it off! Keep the TNT at arm\'s length from your wheels.',
      build: { x: -2, y: 0.02, w: 5, h: 2 },
      parts: { seat: 1, wood: 3, metal: 2, engine: 1, wheel: 2, tnt: 1 },
      terrain: [
        { pts: [[-14, 14], [-12, 0], [58, 0], [62, 6], [64, 14]] },
        { closed: true, pts: [[18, 3.4], [38, 3.4], [40, 6], [40, 18], [16, 18], [16, 6]] }
      ],
      objects: [
        { type: 'barricade', x: 24.5, y: 1.7, w: 1, h: 3.4 },
        { type: 'tnt', x: 52, y: 0.5 }
      ],
      goal: { x: 48, y: 1.4 },
      cap: { x: 33.5, y: 1.2 },
      star3: { type: 'time', value: 14 }
    },
    {
      id: 'w2-3', world: 1, name: 'Bounce Ranch', theme: 'canyon',
      hint: 'Bounce pads launch you sky high. Drive onto them to reach the top of the mesas.',
      build: { x: -2, y: 0.02, w: 4, h: 3 },
      parts: { seat: 1, wood: 3, engine: 1, wheel: 2, spring: 2 },
      terrain: [{ pts: [[-14, 14], [-12, 0], [14, 0], [14.3, 8], [29, 8], [29.3, 16], [48, 16], [52, 24]] }],
      objects: [
        { type: 'bounce', x: 9.5, y: 0.2, w: 3 },
        { type: 'bounce', x: 24, y: 8.2, w: 3 }
      ],
      goal: { x: 39, y: 17.4 },
      cap: { x: 27, y: 20.5 },
      star3: { type: 'intact' }
    },
    {
      id: 'w2-4', world: 1, name: 'Cliff Drop', theme: 'canyon',
      hint: 'It is a long way down! Open a parachute for a soft landing, then close it again so you can drive away.',
      build: { x: -1, y: 30.02, w: 4, h: 3 },
      parts: { seat: 1, wood: 3, engine: 1, wheel: 2, chute: 2, spring: 2 },
      terrain: [
        { pts: [[-14, 40], [-12, 30], [10, 30], [12, 29.8]] },
        { pts: [[12, 0], [56, 0], [60, 6], [62, 14]] }
      ],
      objects: [{ type: 'crate', x: 32, y: 0.5, w: 1, h: 1 }, { type: 'tnt', x: 36, y: 0.5 }],
      goal: { x: 46, y: 1.4 },
      cap: { x: 21, y: 16 },
      star3: { type: 'intact' }
    },
    {
      id: 'w2-5', world: 1, name: 'Mesa Mayhem', theme: 'canyon',
      hint: 'The snack stash is on top of the mesa. Balloons work, but real pros use rockets pointing UP (tap a rocket on the grid to turn it).',
      build: { x: -2, y: 0.02, w: 5, h: 3 },
      parts: { seat: 1, wood: 3, engine: 1, wheel: 2, rocket: 4, balloon: 3, fan: 1 },
      terrain: [{ pts: [[-14, 14], [-12, 0], [24, 0], [24.3, 9.5], [52, 9.5], [56, 18]] }],
      objects: [{ type: 'crate', x: 28, y: 10, w: 1, h: 1 }],
      goal: { x: 42, y: 10.9 },
      cap: { x: 19, y: 11 },
      star3: { type: 'noPart', part: 'balloon' }
    },

    // ------------------------------------------------------------ WORLD 3
    {
      id: 'w3-1', world: 2, name: 'Island Hopping', theme: 'sky',
      hint: 'Do not fall off! Float across with balloons and a fan, or find your own way.',
      build: { x: -5, y: 0.02, w: 5, h: 3 },
      parts: { seat: 1, wood: 2, balloon: 4, fan: 2, wheel: 2, engine: 1 },
      terrain: [island(-8, 4, 0, 6, 1), island(14, 22, 2, 5, -1), island(32, 44, 3, 6, 1)],
      objects: [],
      goal: { x: 37, y: 4.4 },
      cap: { x: 18, y: 8 },
      killY: -12,
      star3: { type: 'time', value: 35 }
    },
    {
      id: 'w3-2', world: 2, name: 'Wing It', theme: 'sky',
      hint: 'Wings let you glide a long way. Get up some speed down the ramp, then fly!',
      build: { x: -6, y: 30.02, w: 5, h: 3 },
      parts: { seat: 1, wood: 3, engine: 1, wheel: 2, wing: 5, fan: 1 },
      terrain: [
        { closed: true, pts: [[-12, 30], [4, 30], [12, 26], [14, 26.4], [14, 23], [6, 20], [-4, 17], [-10, 22]] },
        island(38, 62, 4, 7, 1)
      ],
      objects: [],
      goal: { x: 52, y: 5.4 },
      cap: { x: 27, y: 18 },
      killY: -10,
      star3: { type: 'time', value: 9 }
    },
    {
      id: 'w3-3', world: 2, name: 'Updraft Alley', theme: 'sky',
      hint: 'Drive into the updraft and open your parachute: the wind carries you up! A fan helps you drift over.',
      build: { x: -5, y: 0.02, w: 5, h: 3 },
      parts: { seat: 1, wood: 2, chute: 1, fan: 1, wheel: 2, engine: 1 },
      terrain: [island(-8, 5, 0, 6, 1), island(19.8, 34, 15, 6, -1)],
      objects: [{ type: 'wind', x: 14.5, y: 9, w: 8, h: 34, force: 26, angle: 82 }],
      goal: { x: 28, y: 16.4 },
      cap: { x: 17.6, y: 21.5 },
      killY: -14,
      star3: { type: 'time', value: 20 }
    },
    {
      id: 'w3-4', world: 2, name: 'Moon Hop', theme: 'sky', gravity: 0.35,
      hint: 'Low gravity! Your wheels have less grip, but every jump goes a looong way.',
      build: { x: -2, y: 0.02, w: 5, h: 3 },
      parts: { seat: 1, wood: 3, metal: 2, engine: 2, wheel: 4, spring: 2 },
      terrain: [
        { pts: [[-14, 12], [-12, 0], [9, 0], [12, 1.0], [13, 1.25]] },
        { pts: [[22, -0.5], [33, -0.5], [36, 0.7], [37, 0.95]] },
        { pts: [[46.5, -1], [70, -1], [74, 6], [76, 14]] },
        { closed: true, pts: [[12.5, -7], [22.5, -7], [22.5, -9], [12.5, -9]] },
        { closed: true, pts: [[36.5, -7], [47, -7], [47, -9], [36.5, -9]] }
      ],
      objects: [{ type: 'spikes', x: 17.5, y: -6.75, w: 9.5 }, { type: 'spikes', x: 41.75, y: -6.75, w: 10 }],
      killY: -5,
      goal: { x: 60, y: 0.4 },
      cap: { x: 41.5, y: 5.3 },
      star3: { type: 'intact' }
    },
    {
      id: 'w3-5', world: 2, name: 'The Big Finish', theme: 'sky',
      hint: 'Glide to the middle island, hit the bounce pad, and fly to the snack stash. Missed? A parachute rides the updraft back up!',
      build: { x: -7, y: 20.02, w: 6, h: 4 },
      parts: { seat: 1, wood: 4, metal: 2, engine: 2, wheel: 4, spring: 2, rocket: 2, chute: 1, wing: 3, balloon: 2 },
      terrain: [
        { closed: true, pts: [[-12, 20], [2, 20], [11, 14.6], [13.5, 13.7], [15.5, 13.6], [17, 13.9], [17.2, 11], [8, 8.5], [-4, 8], [-12, 13]] },
        island(22.5, 38, 10, 5, 1),
        island(45, 62, 14, 6, -1)
      ],
      objects: [
        { type: 'bounce', x: 34.5, y: 10.2, w: 3, push: 4 },
        { type: 'wind', x: 41.5, y: 4, w: 6, h: 28, force: 25 }
      ],
      killY: -8,
      goal: { x: 55, y: 15.4 },
      cap: { x: 40, y: 22 },
      star3: { type: 'time', value: 14 }
    }
  ];

  const SANDBOX = {
    id: 'sandbox', world: -1, name: 'Sandbox', theme: 'hills', sandbox: true,
    hint: 'Build anything! Every part is unlimited. There is a ramp, a bounce pad, an updraft and some things to smash.',
    build: { x: -4, y: 0.02, w: 10, h: 7 },
    parts: {},
    terrain: [{ pts: [[-30, 14], [-28, 0], [16, 0], [26, 3], [28, 3.2], [29, 3.2], [29.2, 0], [60, 0], [70, -2], [100, -2], [112, 4], [124, 4], [132, 0], [170, 0], [176, 10], [178, 20]] }],
    objects: [
      { type: 'crate', x: 40, y: 0.5, w: 1, h: 1 }, { type: 'crate', x: 40, y: 1.5, w: 1, h: 1 }, { type: 'crate', x: 41, y: 0.5, w: 1, h: 1 },
      { type: 'tnt', x: 44, y: 0.5 }, { type: 'ball', x: 50, y: 1, r: 0.8 },
      { type: 'bounce', x: 66, y: -0.85, w: 3, angle: -11.3 },
      { type: 'wind', x: 86, y: 6, w: 6, h: 16, force: 26 },
      { type: 'seesaw', x: 145, y: 0, w: 7 },
      { type: 'spikes', x: 158, y: 0.25, w: 4 }
    ],
    goal: { x: 166, y: 1.4 },
    cap: { x: 86, y: 14 },
    star3: null
  };

  JJ.WORLDS = WORLDS;
  JJ.LEVELS = LEVELS;
  JJ.SANDBOX = SANDBOX;
  JJ.findLevel = function (id) {
    if (id === 'sandbox') return SANDBOX;
    const all = LEVELS.concat((JJ.Store && JJ.Store.custom) || [], (globalThis.JJ_SITE_LEVELS || []));
    return all.find((l) => l.id === id) || null;
  };
})((globalThis.JJ = globalThis.JJ || {}));
