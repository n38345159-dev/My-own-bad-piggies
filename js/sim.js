/* Junkyard Joyride - physics simulation (planck.js). No DOM in here so it also runs in Node for tests. */
(function (JJ) {
  'use strict';
  const U = JJ.U;
  const PARTS = JJ.PARTS;

  const PHYS = {
    GRAVITY: 10,
    DT: 1 / 120,
    VEL_ITERS: 10,
    POS_ITERS: 6,
    BREAK_FORCE: 2300,     // N per unit of strength (single physics step)
    BREAK_TORQUE: 1400,    // N*m per unit of strength
    GRACE: 0.3,            // seconds after launch before anything can break
    ENGINE_FORCE: 32,      // N of push per engine (spread over its wheels)
    ENGINE_SPEED: 8.5,     // m/s with one engine
    ROCKET_FORCE: 30,
    FAN_FORCE: 10,
    BALLOON_LIFT: 15,
    BALLOON_DRAG_X: 1.6,
    BALLOON_DRAG_Y: 2.2,
    AIR_DRAG: 0.015,
    THRUST_LOCAL: 0.3,
    BLOCK_ANG_DAMP: 0.3,
    CHUTE_DRAG: 2.2,
    CHUTE_MAX: 140,
    WING_DRAG: 1.1,
    WING_LIFT: 0.06,
    WING_LEVEL: 18,
    WING_MAX: 110,
    TNT_IMPULSE: 18,
    TNT_BREAK_R: 1.3,
    TNT_RADIUS: 4.2,
    TNT_TRIGGER: 6.5,
    BOUNCE_SPEED: 15,
    GOAL_R: 1.5,
    CAP_R: 1.0
  };

  const DEFAULT_CHEATS = {
    godMode: false, infiniteFuel: false, gravity: 1, enginePower: 1, thrustPower: 1,
    balloonLift: 1, bouncy: false, superGrip: false
  };

  let planck = null;
  const V = (x, y) => planck.Vec2(x, y);

  class Sim {
    constructor(level, design, cheats) {
      planck = globalThis.planck;
      this.level = level; // compiled level (JJ.Level.compile)
      this.cheats = Object.assign({}, DEFAULT_CHEATS, cheats || {});
      this.g = PHYS.GRAVITY * this.cheats.gravity * (level.gravity || 1);
      this.world = new planck.World({ gravity: V(0, -this.g) });
      this.time = 0;
      this.events = [];
      this.parts = [];
      this.props = [];
      this.joints = [];
      this.groups = [];
      this.groupMap = {};
      this.windZones = [];
      this.pendingExplosions = [];
      this.pendingPops = [];
      this.pendingSpikes = [];
      this.pendingBounces = [];
      this.pendingCrashes = [];
      this.status = { won: false, winTime: null, collected: false, broken: 0, fell: false, maxX: 0, distance: 0, topSpeed: 0 };
      this.seatImpact = 0;
      this.seatImpactT = -10;
      this.lastImpactT = -1;
      this.compDirty = true;
      this.stats = { explosions: 0, pops: 0, breaks: 0, rocketTime: 0 };
      this.buildTerrain();
      this.buildObjects();
      this.buildContraption(design || { cells: [] });
      this.buildGroups();
      this.installContacts();
      this.updateComponents();
      this.seat = this.parts.find((p) => p.type === 'seat') || null;
      if (this.seat) {
        const p = this.seat.body.getPosition();
        this.status.maxX = p.x; this.startX = p.x; this.lastSeatX = p.x;
      }
    }

    // ------------------------------------------------------------ world
    buildTerrain() {
      const L = this.level;
      this.ground = this.world.createBody({ type: 'static' });
      for (const poly of L.polys) {
        if (poly.length < 3) continue;
        try {
          this.ground.createFixture(new planck.Chain(poly.map((p) => V(p[0], p[1])), true), {
            friction: 0.9, restitution: this.cheats.bouncy ? 0.5 : 0.02, userData: { terrain: true }
          });
        } catch (e) { /* skip broken terrain piece */ }
      }
    }

    buildObjects() { this.buildObjectsFrom(this.level.objects); }

    buildObjectsFrom(list) {
      for (const o of list) {
        const fn = OBJ[o.type];
        if (fn) {
          try { fn.call(this, o); } catch (e) { /* ignore bad object */ }
        }
      }
    }

    addProp(type, o, body, extra) {
      const prop = Object.assign({ type, o, body, alive: true, id: this.props.length }, extra || {});
      this.props.push(prop);
      if (body) {
        for (let f = body.getFixtureList(); f; f = f.getNext()) {
          const ud = f.getUserData() || {};
          ud.prop = prop;
          f.setUserData(ud);
        }
      }
      return prop;
    }

    // ------------------------------------------------------- contraption
    buildContraption(design) {
      const b = this.level.build;
      const map = new Map();
      const get = (i, j) => map.get(i + ',' + j);
      for (const c of design.cells) {
        const def = PARTS[c.t];
        if (!def) continue;
        if (c.i < 0 || c.j < 0 || c.i >= b.w || c.j >= b.h) continue;
        if (get(c.i, c.j)) continue;
        const part = {
          id: this.parts.length, type: c.t, def, i: c.i, j: c.j, rot: c.r || 0,
          alive: true, active: false, popped: false, fuel: def.fuel || 0,
          body: null, joints: [], comp: 0,
          cx: b.x + c.i + 0.5, cy: b.y + c.j + 0.5,
          holder: null, holderDir: null, flame: 0, spin: 0, chuteOpen: 0, chuteDir: Math.PI / 2
        };
        map.set(c.i + ',' + c.j, part);
        this.parts.push(part);
      }
      const W = JJ.Parts.isWeldable;
      // holders for wheels and balloons
      const DIRS = { up: [0, 1], left: [-1, 0], right: [1, 0], down: [0, -1] };
      for (const p of this.parts) {
        if (p.def.kind === 'wheel') {
          for (const d of ['up', 'left', 'right', 'down']) {
            const q = get(p.i + DIRS[d][0], p.j + DIRS[d][1]);
            if (q && W(q.type)) { p.holder = q; p.holderDir = DIRS[d]; break; }
          }
        } else if (p.def.kind === 'balloon') {
          for (const d of ['down', 'left', 'right', 'up']) {
            const q = get(p.i + DIRS[d][0], p.j + DIRS[d][1]);
            if (q && q.def.kind !== 'balloon') { p.holder = q; p.holderDir = DIRS[d]; break; }
          }
          if (!p.holder) {
            // tie onto a neighbouring balloon (a bunch of balloons)
            for (const d of ['down', 'left', 'right', 'up']) {
              const q = get(p.i + DIRS[d][0], p.j + DIRS[d][1]);
              if (q && q.def.kind === 'balloon') { p.holder = q; p.holderDir = DIRS[d]; break; }
            }
          }
        }
      }
      for (const p of this.parts) this.createPartBody(p);

      // welds between neighbouring frame-like parts
      for (const p of this.parts) {
        if (!W(p.type)) continue;
        for (const [di, dj] of [[1, 0], [0, 1]]) {
          const q = get(p.i + di, p.j + dj);
          if (!q || !W(q.type)) continue;
          const anchor = V(p.cx + di * 0.5, p.cy + dj * 0.5);
          if (dj === 0 && (p.type === 'spring' || q.type === 'spring')) continue; // springs only join up/down
          if (dj === 1 && p.type === 'spring') { this.springLink(p, q); continue; } // spring below -> soft link
          this.weld(p, q, anchor);
        }
      }
      // wheels
      for (const p of this.parts) {
        if (p.def.kind !== 'wheel' || !p.holder) continue;
        const c = p.body.getPosition();
        const j = this.world.createJoint(new planck.RevoluteJoint({ enableMotor: false, maxMotorTorque: 0, motorSpeed: 0 }, p.holder.body, p.body, V(c.x, c.y)));
        const jr = this.addJoint('axle', j, p.holder, p, c.x, c.y, Math.min(p.def.strength, p.holder.def.strength) * 1.15);
        p.axle = jr;
      }
      // balloons
      for (const p of this.parts) {
        if (p.def.kind !== 'balloon' || !p.holder) continue;
        const h = p.holder;
        const ax = h.cx - p.holderDir[0] * 0.5 * (h.def.kind === 'wheel' ? 0 : 1);
        const ay = h.cy - p.holderDir[1] * 0.5 * (h.def.kind === 'wheel' ? 0 : 1);
        const hb = h.def.kind === 'spring' ? h.body : h.body;
        const j = this.world.createJoint(new planck.RopeJoint({
          bodyA: p.body, bodyB: hb, localAnchorA: V(0, 0), localAnchorB: hb.getLocalPoint(V(ax, ay)),
          maxLength: 1.35, collideConnected: false
        }));
        const jr = this.addJoint('rope', j, p, h, ax, ay, 99);
        p.rope = jr;
      }
    }

    createPartBody(p) {
      const def = p.def;
      const bouncy = this.cheats.bouncy;
      const fix = {
        density: def.density, friction: def.friction * (this.cheats.superGrip && def.kind === 'wheel' ? 2.2 : 1),
        restitution: bouncy ? 0.65 : (def.kind === 'wheel' ? 0.08 : 0.04),
        filterGroupIndex: -1, filterCategoryBits: 0x0002, userData: { part: p }
      };
      let body;
      if (def.kind === 'wheel') {
        let x = p.cx, y = p.cy;
        if (p.holderDir) { x += p.holderDir[0] * (0.5 - def.radius); y += p.holderDir[1] * (0.5 - def.radius); }
        body = this.world.createBody({ type: 'dynamic', position: V(x, y), angularDamping: 0.08 });
        body.createFixture(new planck.Circle(def.radius), fix);
      } else if (def.kind === 'balloon') {
        body = this.world.createBody({ type: 'dynamic', position: V(p.cx, p.cy), linearDamping: 0.7, angularDamping: 2.5 });
        body.createFixture(new planck.Circle(def.radius), fix);
      } else if (def.kind === 'spring') {
        body = this.world.createBody({ type: 'dynamic', position: V(p.cx, p.cy - 0.25) });
        body.createFixture(new planck.Box(0.44, 0.22), fix);
      } else {
        body = this.world.createBody({ type: 'dynamic', position: V(p.cx, p.cy), angularDamping: PHYS.BLOCK_ANG_DAMP });
        let hw = def.hw || 0.5, hh = def.hh || 0.5;
        if (p.type === 'rocket' && (p.rot === 1 || p.rot === 3)) { const t = hw; hw = hh; hh = t; }
        body.createFixture(new planck.Box(hw, hh), fix);
      }
      body.setUserData({ part: p });
      p.body = body;
    }

    addJoint(kind, joint, a, b, x, y, strength) {
      const jr = {
        kind, joint, a, b, alive: true, x, y, extra: null, over: 0,
        limitF: PHYS.BREAK_FORCE * strength, limitT: PHYS.BREAK_TORQUE * strength
      };
      this.joints.push(jr);
      a.joints.push(jr);
      b.joints.push(jr);
      return jr;
    }

    weld(p, q, anchor) {
      const j = this.world.createJoint(new planck.WeldJoint({ frequencyHz: 0, dampingRatio: 0 }, p.body, q.body, anchor));
      return this.addJoint('weld', j, p, q, anchor.x, anchor.y, Math.min(p.def.strength, q.def.strength));
    }

    // spring part p sits below q: soft prismatic link
    springLink(p, q) {
      const anchor = V(p.cx, p.cy);
      const pj = this.world.createJoint(new planck.PrismaticJoint({
        enableLimit: true, lowerTranslation: -0.12, upperTranslation: 0.3, enableMotor: false
      }, q.body, p.body, anchor, V(0, 1)));
      const qa = q.body.getPosition(), pa = p.body.getPosition();
      const dj = this.world.createJoint(new planck.DistanceJoint({
        frequencyHz: 4.2, dampingRatio: 0.45, length: Math.hypot(qa.x - pa.x, qa.y - pa.y)
      }, q.body, p.body, qa, pa));
      const jr = this.addJoint('spring', pj, p, q, anchor.x, anchor.y, 2.6);
      jr.extra = dj;
      p.springTop = q;
      return jr;
    }

    buildGroups() {
      for (const p of this.parts) {
        const d = p.def;
        if (!d.activate) continue;
        const key = JJ.Parts.groupKey(p.type, p.rot);
        let g = this.groupMap[key];
        if (!g) {
          g = { key, type: p.type, rot: p.rot, active: false, parts: [], label: JJ.Parts.groupLabel(p.type, p.rot), mode: d.activate };
          this.groupMap[key] = g;
          this.groups.push(g);
        }
        g.parts.push(p);
        p.group = g;
      }
      const ord = JJ.GROUP_ORDER;
      this.groups.sort((a, b) => (ord.indexOf(a.type) - ord.indexOf(b.type)) || (a.rot - b.rot));
    }

    // -------------------------------------------------------- contacts
    installContacts() {
      this.world.on('begin-contact', (c) => {
        const fa = c.getFixtureA(), fb = c.getFixtureB();
        const ua = fa.getUserData() || {}, ub = fb.getUserData() || {};
        // hard crashes into the world knock parts loose
        if ((ua.part && !ub.part) || (ub.part && !ua.part)) {
          const part = ua.part || ub.part;
          if (part.alive && part.def.crashV && !this.cheats.godMode && this.time > PHYS.GRACE) {
            const wm = c.getWorldManifold(null);
            if (wm && wm.points && wm.points.length) {
              const pt = wm.points[0], n = wm.normal;
              const va = fa.getBody().getLinearVelocityFromWorldPoint(pt), vb = fb.getBody().getLinearVelocityFromWorldPoint(pt);
              const approach = Math.abs((va.x - vb.x) * n.x + (va.y - vb.y) * n.y);
              if (approach > part.def.crashV) this.pendingCrashes.push({ part, x: pt.x, y: pt.y, v: approach });
            }
          }
        }
        if (ua.spikes || ub.spikes) {
          const other = ua.spikes ? ub : ua;
          if (other.part) this.pendingSpikes.push(other.part);
          else if (other.prop && other.prop.type === 'ball') { /* balls are tough */ }
        }
        if (ua.bounce || ub.bounce) {
          const pad = ua.bounce ? ua : ub, other = ua.bounce ? ub : ua;
          if (other.part || (other.prop && other.prop.body && other.prop.body.isDynamic())) this.pendingBounces.push({ pad: pad.prop, other });
        }
      });
      this.world.on('post-solve', (c, imp) => {
        const ni = imp.normalImpulses;
        let m = 0;
        for (let i = 0; i < ni.length; i++) if (ni[i] > m) m = ni[i];
        if (m < 1.2) return;
        const ua = c.getFixtureA().getUserData() || {}, ub = c.getFixtureB().getUserData() || {};
        if (m > PHYS.TNT_TRIGGER) {
          for (const u of [ua, ub]) {
            if (u.part && u.part.type === 'tnt' && u.part.alive) this.queueExplosion(u.part, null, 0.02);
            if (u.prop && u.prop.type === 'tnt' && u.prop.alive) this.queueExplosion(null, u.prop, 0.02);
          }
        }
        if (ua.part || ub.part) {
          const part = ua.part || ub.part;
          if (part === this.seat && m > this.seatImpact * 0.5) { this.seatImpact = m; this.seatImpactT = this.time; }
          if (m > 3 && this.time - this.lastImpactT > 0.07) {
            this.lastImpactT = this.time;
            const p = part.body.getPosition();
            this.events.push({ t: 'impact', x: p.x, y: p.y, s: m, wood: part.type === 'wood' });
          }
        }
      });
    }

    // ------------------------------------------------------- components
    updateComponents() {
      const parent = this.parts.map((p, i) => i);
      const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      for (const jr of this.joints) {
        if (!jr.alive || !jr.a.alive || !jr.b.alive) continue;
        const a = find(jr.a.id), b = find(jr.b.id);
        if (a !== b) parent[a] = b;
      }
      this.comps = {};
      for (const p of this.parts) {
        p.comp = find(p.id);
        if (!this.comps[p.comp]) this.comps[p.comp] = { engines: [], wheels: [], parts: [] };
        const C = this.comps[p.comp];
        C.parts.push(p);
        if (!p.alive) continue;
        if (p.type === 'engine') C.engines.push(p);
        if (p.def.kind === 'wheel' && p.axle && p.axle.alive) C.wheels.push(p);
      }
      this.compDirty = false;
      this.updateMotors();
    }

    updateMotors() {
      const mult = this.cheats.enginePower;
      for (const key in this.comps) {
        const C = this.comps[key];
        let n = 0, dir = 0;
        for (const e of C.engines) if (e.alive && e.active) { n++; dir += e.rot === 2 ? -1 : 1; }
        const nw = C.wheels.length;
        for (const w of C.wheels) {
          const j = w.axle.joint;
          if (n === 0 || nw === 0) { j.enableMotor(false); continue; }
          const r = w.def.radius;
          const v = PHYS.ENGINE_SPEED * Math.min(2.2, 1 + 0.3 * (n - 1)) * Math.sqrt(mult);
          j.enableMotor(true);
          j.setMotorSpeed(dir === 0 ? 0 : -U.sign(dir) * v / r);
          const perWheelForce = (PHYS.ENGINE_FORCE * n * mult) / nw;
          j.setMaxMotorTorque(perWheelForce * r * (dir === 0 ? 2.5 : 1));
        }
      }
    }

    // ------------------------------------------------------- controls
    toggleGroup(key) {
      const g = this.groupMap[key];
      if (!g) return null;
      const alive = g.parts.filter((p) => p.alive && !p.popped);
      if (!alive.length) return g;
      if (g.mode === 'pop') {
        alive.sort((a, b) => b.body.getPosition().y - a.body.getPosition().y);
        this.popBalloon(alive[0], true);
      } else if (g.mode === 'trigger') {
        for (const p of alive) this.queueExplosion(p, null, 0);
        g.active = true;
      } else {
        g.active = !g.active;
        for (const p of g.parts) p.active = g.active;
        if (g.type === 'engine') this.updateMotors();
        this.events.push({ t: 'toggle', key, on: g.active, type: g.type });
      }
      return g;
    }

    groupInfo() {
      return this.groups.map((g) => {
        const alive = g.parts.filter((p) => p.alive && !p.popped);
        let fuel = null;
        if (g.type === 'rocket') {
          const tot = g.parts.reduce((s, p) => s + (p.alive ? p.fuel : 0), 0);
          fuel = this.cheats.infiniteFuel ? 1 : U.clamp(tot / (Math.max(1, alive.length) * PARTS.rocket.fuel), 0, 1);
        }
        return { key: g.key, type: g.type, rot: g.rot, label: g.label, active: g.active, count: alive.length, fuel, mode: g.mode };
      });
    }

    // ---------------------------------------------------- destruction
    breakJoint(jr, counted) {
      if (!jr.alive) return;
      jr.alive = false;
      try { this.world.destroyJoint(jr.joint); } catch (e) { /* already gone */ }
      if (jr.extra) { try { this.world.destroyJoint(jr.extra); } catch (e) { /* */ } }
      this.compDirty = true;
      if (counted) {
        this.status.broken++;
        this.stats.breaks++;
        const pa = jr.a.body.getPosition(), pb = jr.b.body.getPosition();
        const x = (pa.x + pb.x) / 2, y = (pa.y + pb.y) / 2;
        this.events.push({ t: 'break', x, y, wood: jr.a.type === 'wood' || jr.b.type === 'wood', kind: jr.kind });
      }
    }

    removePart(p) {
      if (!p.alive) return;
      for (const jr of p.joints) this.breakJoint(jr, false);
      p.alive = false;
      try { this.world.destroyBody(p.body); } catch (e) { /* */ }
      this.compDirty = true;
    }

    popBalloon(p, manual) {
      if (!p.alive || p.popped) return;
      const pos = p.body.getPosition();
      this.events.push({ t: 'pop', x: pos.x, y: pos.y, manual: !!manual, id: p.id });
      this.stats.pops++;
      p.popped = true;
      this.removePart(p);
    }

    queueExplosion(part, prop, delay) {
      const src = part || prop;
      if (!src || src.queued || !src.alive) return;
      src.queued = true;
      this.pendingExplosions.push({ part, prop, delay: delay || 0 });
    }

    explode(x, y, power) {
      power = power || 1;
      this.stats.explosions++;
      this.events.push({ t: 'explode', x, y, power });
      const R = PHYS.TNT_RADIUS * power;
      const blast = (b) => {
        const c = b.getWorldCenter();
        const dx = c.x - x, dy = c.y - y;
        const d = Math.hypot(dx, dy);
        if (d > R) return null;
        const f = 1 - d / R;
        const nx = d > 0.01 ? dx / d : 0, ny = d > 0.01 ? dy / d : 1;
        const imp = PHYS.TNT_IMPULSE * power * f * Math.sqrt(U.clamp(b.getMass(), 0.2, 4));
        return { x: nx * imp, y: (ny + 0.35) * imp, c, imp };
      };
      // contraption parts: a share of the push goes to the whole connected piece so it flies as one
      if (this.compDirty) this.updateComponents();
      const share = {};
      for (const p of this.parts) {
        if (!p.alive) continue;
        const k = blast(p.body);
        if (!k) continue;
        p.body.applyLinearImpulse(V(k.x * 0.35, k.y * 0.35), k.c, true);
        p.body.applyAngularImpulse((Math.random() - 0.5) * k.imp * 0.05, true);
        const sh = share[p.comp] || (share[p.comp] = { x: 0, y: 0 });
        sh.x += k.x * 0.65; sh.y += k.y * 0.65;
      }
      for (const id in share) {
        const C = this.comps[id];
        if (!C) continue;
        const alive = C.parts.filter((q) => q.alive);
        const M = alive.reduce((sum, q) => sum + q.body.getMass(), 0) || 1;
        for (const q of alive) {
          const w = q.body.getMass() / M;
          q.body.applyLinearImpulse(V(share[id].x * w, share[id].y * w), q.body.getWorldCenter(), true);
        }
      }
      for (const pr of this.props) {
        if (!pr.alive || !pr.body || !pr.body.isDynamic()) continue;
        const k = blast(pr.body);
        if (!k) continue;
        pr.body.applyLinearImpulse(V(k.x, k.y), k.c, true);
        pr.body.applyAngularImpulse((Math.random() - 0.5) * k.imp * 0.08, true);
      }
      // wooden barricades shatter
      for (const pr of this.props) {
        if (!pr.alive || pr.type !== 'barricade') continue;
        const o = pr.o;
        const nx = U.clamp(x, o.x - o.w / 2, o.x + o.w / 2), ny = U.clamp(y, o.y - o.h / 2, o.y + o.h / 2);
        if (Math.hypot(nx - x, ny - y) < R * 0.75) this.shatter(pr, x, y);
      }
      if (!this.cheats.godMode) {
        const rb = PHYS.TNT_BREAK_R * power;
        for (const jr of this.joints) {
          if (!jr.alive || jr.kind === 'rope') continue;
          const pa = jr.a.body.getPosition(), pb = jr.b.body.getPosition();
          const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
          if (Math.hypot(mx - x, my - y) < rb) this.breakJoint(jr, true);
        }
      }
      // balloons nearby pop
      for (const p of this.parts) {
        if (p.alive && p.type === 'balloon') {
          const c = p.body.getPosition();
          if (Math.hypot(c.x - x, c.y - y) < R * 0.6) this.pendingPops.push(p);
        }
      }
      // chain reaction
      for (const p of this.parts) {
        if (p.alive && p.type === 'tnt' && !p.queued) {
          const c = p.body.getPosition();
          if (Math.hypot(c.x - x, c.y - y) < R * 0.75) this.queueExplosion(p, null, 0.1 + Math.random() * 0.12);
        }
      }
      for (const pr of this.props) {
        if (pr.alive && pr.type === 'tnt' && !pr.queued) {
          const c = pr.body.getPosition();
          if (Math.hypot(c.x - x, c.y - y) < R * 0.75) this.queueExplosion(null, pr, 0.1 + Math.random() * 0.12);
        }
      }
    }

    shatter(pr, x, y) {
      pr.alive = false;
      try { this.world.destroyBody(pr.body); } catch (e) { /* */ }
      const o = pr.o;
      const n = Math.max(2, Math.round(o.h / 0.55));
      const cols = Math.max(1, Math.round(o.w / 0.5));
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < cols; k++) {
          const px = o.x - o.w / 2 + (k + 0.5) * (o.w / cols), py = o.y - o.h / 2 + (i + 0.5) * (o.h / n);
          const piece = { type: 'plank', x: px, y: py, w: Math.min(0.9, o.w / cols + 0.25), h: 0.22, angle: 90 + (Math.random() - 0.5) * 30, debris: true };
          OBJ.plank.call(this, piece);
          const b = this.props[this.props.length - 1].body;
          const dx = px - x, dy = py - y, d = Math.hypot(dx, dy) || 1;
          b.applyLinearImpulse(V(dx / d * 2.2 + 0.5, dy / d * 2.2 + 1.2), b.getWorldCenter(), true);
          b.applyAngularImpulse((Math.random() - 0.5) * 0.4, true);
        }
      }
      this.events.push({ t: 'shatter', x: o.x, y: o.y });
    }

    // ---------------------------------------------------------- forces
    applyForces(dt) {
      const ch = this.cheats;
      const AIR = PHYS.AIR_DRAG;
      for (const p of this.parts) {
        if (!p.alive) continue;
        const b = p.body;
        if (p.type !== 'balloon') {
          const v = b.getLinearVelocity();
          const sp = Math.hypot(v.x, v.y);
          if (sp > 4) b.applyForceToCenter(V(-v.x * sp * AIR, -v.y * sp * AIR), true);
        }
        switch (p.type) {
          case 'rocket': {
            const burning = p.active && (p.fuel > 0 || ch.infiniteFuel);
            p.flame = U.lerp(p.flame, burning ? 1 : 0, 0.25);
            if (burning) {
              const d = JJ.DIR[p.rot];
              const f = b.getWorldVector(V(d[0], d[1]));
              const F = PHYS.ROCKET_FORCE * ch.thrustPower;
              this.push(p, f.x * F, f.y * F, PHYS.THRUST_LOCAL);
              if (!ch.infiniteFuel) {
                p.fuel -= dt;
                if (p.fuel <= 0) { p.fuel = 0; this.events.push({ t: 'fuelout' }); }
              }
              this.stats.rocketTime += dt;
            }
            break;
          }
          case 'fan': {
            p.spin = U.lerp(p.spin, p.active ? 1 : 0, 0.05);
            if (p.active) {
              const d = JJ.DIR[p.rot];
              const f = b.getWorldVector(V(d[0], d[1]));
              const F = PHYS.FAN_FORCE * ch.thrustPower;
              this.push(p, f.x * F, f.y * F, PHYS.THRUST_LOCAL);
            }
            break;
          }
          case 'balloon': {
            const v = b.getLinearVelocity();
            b.applyForceToCenter(V(-v.x * PHYS.BALLOON_DRAG_X, b.getMass() * this.g + PHYS.BALLOON_LIFT * ch.balloonLift - v.y * PHYS.BALLOON_DRAG_Y), true);
            break;
          }
          case 'chute': {
            p.chuteOpen = U.lerp(p.chuteOpen, p.active ? 1 : 0, p.active ? 0.12 : 0.2);
            const v = b.getLinearVelocity();
            const sp = Math.hypot(v.x, v.y);
            // canopy trails opposite to motion, biased upwards
            const tx = -v.x, ty = -v.y + 3;
            const ta = Math.atan2(ty, tx);
            let da = ta - p.chuteDir;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            p.chuteDir += da * 0.08;
            if (p.chuteOpen > 0.3 && sp > 0.05) {
              let F = PHYS.CHUTE_DRAG * sp * sp * p.chuteOpen;
              F = Math.min(F, PHYS.CHUTE_MAX);
              const c = b.getWorldCenter();
              const pt = V(c.x + Math.cos(p.chuteDir) * 0.8, c.y + Math.sin(p.chuteDir) * 0.8);
              b.applyForce(V(-v.x / sp * F, -v.y / sp * F), pt, true);
            }
            break;
          }
          case 'wing': {
            const v = b.getLinearVelocity();
            const n = b.getWorldVector(V(0, 1));
            const vn = v.x * n.x + v.y * n.y;
            const vt = v.x * -n.y + v.y * n.x;
            let F = -PHYS.WING_DRAG * vn * Math.abs(vn) + PHYS.WING_LIFT * vt * vt;
            F = U.clamp(F, -PHYS.WING_MAX, PHYS.WING_MAX);
            b.applyForceToCenter(V(n.x * F, n.y * F), true);
            // like a tail fin: keep the plane level while flying
            if (!this.grounded(p.comp)) {
              const sp = Math.hypot(v.x, v.y);
              const k = U.clamp(sp / 8, 0, 1.4);
              let a = b.getAngle() % (Math.PI * 2);
              if (a > Math.PI) a -= Math.PI * 2;
              if (a < -Math.PI) a += Math.PI * 2;
              b.applyTorque((-PHYS.WING_LEVEL * Math.sin(a) - 2.5 * b.getAngularVelocity()) * k, true);
            }
            break;
          }
          default: break;
        }
      }
      // wind zones
      if (this.windZones.length) {
        const apply = (b, factor) => {
          const c = b.getWorldCenter();
          for (const z of this.windZones) {
            if (Math.abs(c.x - z.x) <= z.w / 2 && Math.abs(c.y - z.y) <= z.h / 2) {
              const F = z.force * factor;
              b.applyForceToCenter(V(z.dx * F, z.dy * F), true);
            }
          }
        };
        for (const p of this.parts) {
          if (!p.alive) continue;
          let f = 0.32;
          if (p.type === 'chute') f = 0.32 + 4.2 * p.chuteOpen;
          else if (p.type === 'wing') f = 2.2;
          else if (p.type === 'balloon') f = 1.2;
          else if (p.type === 'metal') f = 0.2;
          apply(p.body, f);
        }
        for (const pr of this.props) if (pr.alive && pr.body && pr.body.isDynamic()) apply(pr.body, 0.5);
      }
    }

    // is any part of this connected piece touching the ground / props?
    grounded(compId) {
      const C = this.comps && this.comps[compId];
      if (!C) return false;
      if (C._gT === this.time) return C._g;
      let g = false;
      for (const q of C.parts) {
        if (!q.alive || g) continue;
        for (let ce = q.body.getContactList(); ce; ce = ce.next) {
          if (!ce.contact.isTouching()) continue;
          const ud = ce.other.getUserData();
          if (!ud || !ud.part) { g = true; break; }
        }
      }
      C._g = g; C._gT = this.time;
      return g;
    }

    // Force from a thruster: part of it acts where the thruster is (so placement matters),
    // the rest is shared by the whole connected contraption (so rockets don't just make you spin).
    push(p, fx, fy, localShare) {
      const C = this.comps && this.comps[p.comp];
      if (!C || C.parts.length < 2) { p.body.applyForceToCenter(V(fx, fy), true); return; }
      p.body.applyForceToCenter(V(fx * localShare, fy * localShare), true);
      let M = C._mass;
      if (C._massT !== this.time) {
        M = 0;
        for (const q of C.parts) if (q.alive) M += q.body.getMass();
        C._mass = M; C._massT = this.time;
      }
      if (M <= 0) return;
      const k = 1 - localShare;
      for (const q of C.parts) {
        if (!q.alive) continue;
        const w = q.body.getMass() / M * k;
        q.body.applyForceToCenter(V(fx * w, fy * w), true);
      }
    }

    // ------------------------------------------------------------ step
    step(dt) {
      dt = dt || PHYS.DT;
      this.applyForces(dt);
      this.world.step(dt, PHYS.VEL_ITERS, PHYS.POS_ITERS);
      this.time += dt;
      this.postStep(dt);
    }

    postStep(dt) {
      const ch = this.cheats;
      if (!ch.godMode && this.time > PHYS.GRACE) {
        const inv = 1 / dt;
        for (const jr of this.joints) {
          if (!jr.alive || jr.kind === 'rope') continue;
          const f = jr.joint.getReactionForce(inv);
          const F = Math.hypot(f.x, f.y);
          const T = Math.abs(jr.joint.getReactionTorque(inv));
          if (F > jr.limitF || T > jr.limitT) this.breakJoint(jr, true);
        }
      }
      // spikes
      if (this.pendingSpikes.length) {
        const list = this.pendingSpikes; this.pendingSpikes = [];
        for (const p of list) {
          if (!p.alive) continue;
          if (p.type === 'balloon') { this.popBalloon(p, false); continue; }
          if (ch.godMode) continue;
          const pos = p.body.getPosition();
          let any = false;
          for (const jr of p.joints) if (jr.alive && jr.kind !== 'rope') { this.breakJoint(jr, true); any = true; }
          if (any) this.events.push({ t: 'spike', x: pos.x, y: pos.y });
        }
      }
      if (this.pendingCrashes.length) {
        const list = this.pendingCrashes; this.pendingCrashes = [];
        for (const cr of list) {
          const p = cr.part;
          if (!p.alive) continue;
          if (p.type === 'balloon') { this.popBalloon(p, false); continue; }
          if (p.type === 'tnt') { this.queueExplosion(p, null, 0); continue; }
          let any = false;
          for (const jr of p.joints) if (jr.alive && jr.kind !== 'rope') { this.breakJoint(jr, true); any = true; }
          if (any) this.events.push({ t: 'crash', x: cr.x, y: cr.y, v: cr.v });
        }
      }
      if (this.pendingPops.length) {
        const list = this.pendingPops; this.pendingPops = [];
        for (const p of list) this.popBalloon(p, false);
      }
      // bounce pads
      if (this.pendingBounces.length) {
        const list = this.pendingBounces; this.pendingBounces = [];
        for (const bnc of list) this.doBounce(bnc);
      }
      // explosions
      if (this.pendingExplosions.length) {
        const keep = [];
        const now = [];
        for (const e of this.pendingExplosions) {
          e.delay -= dt;
          if (e.delay <= 0) now.push(e); else keep.push(e);
        }
        this.pendingExplosions = keep;
        for (const e of now) {
          if (e.part && e.part.alive) {
            const c = e.part.body.getPosition();
            this.removePart(e.part);
            this.explode(c.x, c.y, 1);
          } else if (e.prop && e.prop.alive) {
            const c = e.prop.body.getPosition();
            e.prop.alive = false;
            try { this.world.destroyBody(e.prop.body); } catch (er) { /* */ }
            this.explode(c.x, c.y, 1);
          }
        }
      }
      if (this.compDirty) this.updateComponents();
      // keep a freshly bounced contraption from tumbling
      if (this.steady && this.time < this.steady.until) {
        const C = this.comps[this.steady.comp];
        if (C) for (const q of C.parts) if (q.alive && q.def.kind !== 'wheel') q.body.setAngularVelocity(q.body.getAngularVelocity() * 0.6);
      }

      // goal / collectible / falling
      const L = this.level;
      const seat = this.seat;
      if (seat && seat.alive) {
        const sp = seat.body.getPosition();
        const v = seat.body.getLinearVelocity();
        const spd = Math.hypot(v.x, v.y);
        if (spd > this.status.topSpeed) this.status.topSpeed = spd;
        if (sp.x > this.status.maxX) this.status.maxX = sp.x;
        this.status.distance += Math.abs(sp.x - this.lastSeatX);
        this.lastSeatX = sp.x;
        if (!this.status.won && L.goal && Math.hypot(sp.x - L.goal.x, sp.y - L.goal.y) < PHYS.GOAL_R) {
          this.status.won = true;
          this.status.winTime = this.time;
          this.events.push({ t: 'win', x: sp.x, y: sp.y });
        }
        if (!this.status.fell && sp.y < L.killY) {
          this.status.fell = true;
          this.events.push({ t: 'fell' });
        }
      }
      if (L.cap && !this.status.collected) {
        for (const p of this.parts) {
          if (!p.alive) continue;
          const c = p.body.getPosition();
          if (Math.hypot(c.x - L.cap.x, c.y - L.cap.y) < PHYS.CAP_R + (p.def.radius || 0.3)) {
            this.status.collected = true;
            this.events.push({ t: 'collect', x: L.cap.x, y: L.cap.y });
            break;
          }
        }
      }
      // clean up stuff that fell out of the world
      if (((this.time * 120) | 0) % 30 === 0) {
        const lim = L.killY - 25;
        for (const p of this.parts) if (p.alive && p !== this.seat && p.body.getPosition().y < lim) this.removePart(p);
        for (const pr of this.props) {
          if (pr.alive && pr.body && pr.body.isDynamic() && pr.body.getPosition().y < lim) {
            pr.alive = false;
            try { this.world.destroyBody(pr.body); } catch (e) { /* */ }
          }
        }
      }
    }

    doBounce(bnc) {
      const pad = bnc.pad;
      if (!pad || !pad.body) return;
      const n = pad.body.getWorldVector(V(0, 1));
      let bodies;
      const now = this.time;
      if (bnc.other.part) {
        const comp = this.comps[bnc.other.part.comp];
        if (comp.lastBounce && now - comp.lastBounce < 0.35) return;
        comp.lastBounce = now;
        this.steady = { comp: bnc.other.part.comp, until: now + 0.3 };
        bodies = comp.parts.filter((p) => p.alive).map((p) => p.body);
      } else {
        const pr = bnc.other.prop;
        if (pr.lastBounce && now - pr.lastBounce < 0.35) return;
        pr.lastBounce = now;
        bodies = [pr.body];
      }
      const S = PHYS.BOUNCE_SPEED * (pad.o.power || 1);
      // launch the whole piece as one solid lump: shared velocity, no spin
      let M = 0, px = 0, py = 0;
      for (const b of bodies) { const m = b.getMass(); const v = b.getLinearVelocity(); M += m; px += v.x * m; py += v.y * m; }
      const vx = M ? px / M : 0, vy = M ? py / M : 0;
      const vn = vx * n.x + vy * n.y;
      const add = Math.max(0, S - vn);
      // pads also give a little shove along their arrow (dir: 1 = right, -1 = left, 0 = straight up)
      const dir = pad.o.dir == null ? 1 : pad.o.dir;
      const tx = n.y * dir, ty = -n.x * dir;
      const shove = (pad.o.push == null ? 2.5 : pad.o.push);
      for (const b of bodies) {
        b.setLinearVelocity(V(vx + n.x * add + tx * shove, vy + n.y * add + ty * shove));
        const ud = b.getUserData();
        const wheel = ud && ud.part && ud.part.def.kind === 'wheel';
        if (!wheel) b.setAngularVelocity(0);
      }
      const c = pad.body.getPosition();
      this.events.push({ t: 'bounce', x: c.x, y: c.y });
    }

    // --------------------------------------------------------- queries
    seatPos() {
      if (!this.seat) return null;
      const p = this.seat.body.getPosition();
      return { x: p.x, y: p.y };
    }

    seatVel() {
      if (!this.seat) return { x: 0, y: 0 };
      const v = this.seat.body.getLinearVelocity();
      return { x: v.x, y: v.y };
    }

    // centre of the seat's component (for the camera)
    focus() {
      if (!this.seat) {
        const alive = this.parts.filter((p) => p.alive);
        if (!alive.length) return { x: this.level.build.x, y: this.level.build.y };
        let x = 0, y = 0;
        for (const p of alive) { const c = p.body.getPosition(); x += c.x; y += c.y; }
        return { x: x / alive.length, y: y / alive.length };
      }
      return this.seatPos();
    }

    destroy() {
      this.world = null;
      this.parts = [];
      this.props = [];
    }
  }

  // ---------------------------------------------------- object builders
  const deg = (d) => ((d || 0) * Math.PI) / 180;
  const OBJ = {
    platform(o) {
      const b = this.world.createBody({ type: 'static', position: V(o.x, o.y), angle: deg(o.angle) });
      b.createFixture(new planck.Box(o.w / 2, o.h / 2), { friction: 0.8, restitution: this.cheats.bouncy ? 0.5 : 0.02 });
      this.addProp('platform', o, b);
    },
    ramp(o) {
      const w = o.w / 2, h = o.h / 2;
      const verts = o.dir === -1 ? [V(-w, -h), V(w, -h), V(-w, h)] : [V(-w, -h), V(w, -h), V(w, h)];
      const b = this.world.createBody({ type: 'static', position: V(o.x, o.y) });
      b.createFixture(new planck.Polygon(verts), { friction: 0.8 });
      this.addProp('ramp', o, b);
    },
    barricade(o) {
      const b = this.world.createBody({ type: 'static', position: V(o.x, o.y) });
      b.createFixture(new planck.Box(o.w / 2, o.h / 2), { friction: 0.7 });
      this.addProp('barricade', o, b);
    },
    rock(o) {
      const b = this.world.createBody({ type: 'static', position: V(o.x, o.y) });
      b.createFixture(new planck.Circle(o.r), { friction: 0.9 });
      this.addProp('rock', o, b);
    },
    crate(o) {
      const b = this.world.createBody({ type: 'dynamic', position: V(o.x, o.y), angle: deg(o.angle) });
      b.createFixture(new planck.Box(o.w / 2, o.h / 2), { density: 0.4, friction: 0.35 });
      this.addProp('crate', o, b);
    },
    tnt(o) {
      const b = this.world.createBody({ type: 'dynamic', position: V(o.x, o.y), angle: deg(o.angle) });
      b.createFixture(new planck.Box(0.4, 0.5), { density: 0.6, friction: 0.6 });
      this.addProp('tnt', o, b);
    },
    ball(o) {
      const b = this.world.createBody({ type: 'dynamic', position: V(o.x, o.y) });
      b.createFixture(new planck.Circle(o.r), { density: 0.35, friction: 0.6, restitution: 0.55 });
      this.addProp('ball', o, b);
    },
    plank(o) {
      const b = this.world.createBody({ type: 'dynamic', position: V(o.x, o.y), angle: deg(o.angle) });
      const fx = { density: 0.5, friction: 0.5 };
      if (o.debris) { fx.filterCategoryBits = 0x0004; fx.filterMaskBits = 0xffff & ~0x0002; }
      b.createFixture(new planck.Box(o.w / 2, o.h / 2), fx);
      this.addProp('plank', o, b);
    },
    seesaw(o) {
      const base = this.world.createBody({ type: 'static', position: V(o.x, o.y) });
      base.createFixture(new planck.Polygon([V(-0.7, 0), V(0.7, 0), V(0, 1)]), { friction: 0.6 });
      const plank = this.world.createBody({ type: 'dynamic', position: V(o.x, o.y + 1.15), angle: deg(o.angle) });
      plank.createFixture(new planck.Box(o.w / 2, 0.15), { density: 0.6, friction: 0.9 });
      this.world.createJoint(new planck.RevoluteJoint({}, base, plank, V(o.x, o.y + 1)));
      this.addProp('seesawBase', o, base);
      this.addProp('plank', Object.assign({}, o, { h: 0.3 }), plank);
    },
    spikes(o) {
      const b = this.world.createBody({ type: 'static', position: V(o.x, o.y), angle: deg(o.angle) });
      b.createFixture(new planck.Box(o.w / 2, 0.25), { friction: 0.5, userData: { spikes: true } });
      this.addProp('spikes', o, b);
    },
    bounce(o) {
      const b = this.world.createBody({ type: 'static', position: V(o.x, o.y), angle: deg(o.angle) });
      b.createFixture(new planck.Box(o.w / 2, 0.2), { friction: 0.6, userData: { bounce: true } });
      this.addProp('bounce', o, b);
    },
    wind(o) {
      const a = deg(o.angle == null ? 90 : o.angle);
      this.windZones.push({ x: o.x, y: o.y, w: o.w, h: o.h, force: o.force, dx: Math.cos(a), dy: Math.sin(a) });
      this.addProp('wind', o, null);
    }
  };

  JJ.PHYS = PHYS;
  JJ.DEFAULT_CHEATS = DEFAULT_CHEATS;
  JJ.Sim = Sim;
})((globalThis.JJ = globalThis.JJ || {}));
