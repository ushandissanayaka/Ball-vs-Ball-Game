import { BALLS } from './balls.js';

// The ball fight inside the duel box, worked out the same way on the server (to know who won, and when) and on
// both players' screens (to show it). It must give the same result everywhere, so it is deterministic: a fixed
// 60 Hz step, a seeded integer random generator, and only + - * / and sqrt (exactly rounded in every engine;
// sin, cos and hypot are not, so the axe turns by a fixed rotation written out as numbers).
// The client and the server each keep a copy of this file: change both together.

/** The box is `size` x `size` units, y up. A fight that runs `maxTicks` is decided on health left. */
export const SIM = { size: 100, tickRate: 60, maxTicks: 60 * 45 };
export const START = { pink: [25, 50], blue: [75, 50] };

const DT = 1 / SIM.tickRate;
const SEEK = 0.9; // how hard a ball steers toward its nearest enemy (fraction of its speed per second)
const WALL_JITTER = 0.18; // wall bounces wobble a little, so no two balls can bounce past each other forever

// Every hit takes at least 1 and at most `MAX_HIT` off the 100 a ball starts on.
const MAX_HIT = 5;
const FREEZE_TICKS = 50;
const BURN = { ticks: 180, every: 30, damage: 1 };
const CHARGE = { rate: 1.5 / SIM.tickRate, max: 4 };
// A Cell Ball swells as the fight goes on; when it dies it splits in two, and those in two again.
const CELL = { grow: 0.5 / SIM.tickRate, maxRadius: 11 };
const CELL_SPLITS = [null, { hp: 10, radius: 7.5, speed: 1.1 }, { hp: 5, radius: 5.5, speed: 1.2 }];
// The axe swings 4 degrees a tick: cos and sin of 4 degrees, written out.
const AXE = { cos: 0.9975640502598242, sin: 0.0697564737441253, reach: 7.5, blade: 4.6, damage: 5, cooldown: 18 };
const TAIL = { every: 5, length: 10, damage: 2, cooldown: 24 };
// Hits are not fixed: a ball bounced off a wall flies faster for a moment (`KICK`), and a bump does more the
// harder the two balls meet (`IMPACT`: from a graze to a full-speed head-on crash). So where a player aims (off
// a wall, straight at the other ball) changes how much every hit takes.
const KICK = { boost: 0.45, keep: 0.965 };
const IMPACT = { min: 0.45, gain: 1.1, max: 2 };
// A Verity Ball that is hit may transform: its face turns grim and it fires a ring of orbs.
const VERITY = { chance: 0.32, ticks: 150, orbs: 8, orbSpeed: 62, orbRadius: 2.8, orbDamage: 2 };

/** Seeded random numbers in [0, 1): integer arithmetic only, the same in every engine. */
export function mulberry32(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sq = (v) => v * v;

function unit(x, y, fallbackX = 1, fallbackY = 0) {
  const length = Math.sqrt(x * x + y * y);
  return length > 1e-9 ? [x / length, y / length] : [fallbackX, fallbackY];
}

/**
 * A fight between `pink` and `blue`, each { ball, aim: { x, y } }. Call `step()` once per tick until `over`;
 * then `winner` is 'pink' or 'blue'. `bodies` are the balls (cells add more as they split): { id, side, kind,
 * gen, x, y, vx, vy, r, hp, maxHp, alive, frozen, burn, charge, kick, transform, axe: [x, y], tail: [[x, y]...] }.
 * `orbs` are the Verity Ball's shots: { id, side, x, y, vx, vy, r, alive }.
 * With `record`, what happens is kept for the screen (`drain()` hands it over): hit (with its `power`), wall,
 * damage, shock, ignite, charged, axe, bite, transform, orb, split and death events, each with the tick and
 * where it happened.
 */
export function createFight({ seed, pink, blue }, { record = true } = {}) {
  const rand = mulberry32(seed ^ 0x5bd1e995);
  const bodies = [];
  const orbs = [];
  let events = [];
  let nextId = 1;
  const fight = { tick: 0, bodies, orbs, over: false, winner: null, step, drain: () => { const out = events; events = []; return out; } };
  const emit = (event) => { if (record) events.push({ tick: fight.tick, ...event }); };

  function spawn(side, kind, x, y, dx, dy, { gen = 0, hp, radius, speed = 1 } = {}) {
    const stats = BALLS[kind];
    const [ux, uy] = unit(dx, dy, side === 'pink' ? 1 : -1, 0);
    const body = {
      id: nextId++, side, kind, gen, x, y,
      base: stats.speed * speed, speed: stats.speed * speed, vx: 0, vy: 0,
      r: radius ?? stats.radius, hp: hp ?? stats.hp, maxHp: hp ?? stats.hp,
      alive: true, frozen: 0, burn: 0, charge: 0, kick: 0, transform: 0,
      axe: kind === 'axe' ? [0, 1] : null, tail: kind === 'snake' ? [] : null, cooldowns: {}, // the axe starts straight up
    };
    body.vx = ux * body.speed;
    body.vy = uy * body.speed;
    bodies.push(body);
    return body;
  }

  for (const [side, entry] of [['pink', pink], ['blue', blue]]) {
    const [x, y] = START[side];
    spawn(side, BALLS[entry.ball] ? entry.ball : 'electric', x, y, entry.aim?.x ?? 0, entry.aim?.y ?? 0);
  }

  const enemiesOf = (body) => bodies.filter((other) => other.alive && other.side !== body.side);

  function hurt(target, raw, extra = {}) {
    if (!target.alive || raw <= 0) return;
    const amount = Math.min(MAX_HIT, Math.max(1, Math.round(raw)));
    target.hp -= amount;
    emit({ type: 'damage', id: target.id, amount, x: target.x, y: target.y, ...extra });
    if (target.kind === 'verity' && !extra.burn && target.hp > 0 && target.transform === 0 && rand() < VERITY.chance) transform(target);
  }

  /** A Verity Ball transforms: grim for a while, and a ring of orbs bursts out of it. */
  function transform(body) {
    body.transform = VERITY.ticks;
    // The ring starts along the way it was going, so every transform looks a little different.
    let [dx, dy] = unit(body.vx, body.vy);
    // Turning by 45 degrees: cos and sin written out (see the axe).
    const c = 0.7071067811865476;
    for (let i = 0; i < VERITY.orbs; i += 1) {
      orbs.push({
        id: nextId++, side: body.side, alive: true, r: VERITY.orbRadius,
        x: body.x + dx * body.r, y: body.y + dy * body.r, vx: dx * VERITY.orbSpeed, vy: dy * VERITY.orbSpeed,
      });
      [dx, dy] = unit(dx * c - dy * c, dx * c + dy * c);
    }
    emit({ type: 'transform', id: body.id, x: body.x, y: body.y });
  }

  function moveOrbs() {
    for (const orb of orbs) {
      if (!orb.alive) continue;
      orb.x += orb.vx * DT;
      orb.y += orb.vy * DT;
      let gone = orb.x < orb.r || orb.y < orb.r || orb.x > SIM.size - orb.r || orb.y > SIM.size - orb.r;
      if (!gone) {
        for (const enemy of bodies) {
          if (!enemy.alive || enemy.side === orb.side) continue;
          const reach = enemy.r + orb.r;
          if (sq(enemy.x - orb.x) + sq(enemy.y - orb.y) >= reach * reach) continue;
          hurt(enemy, VERITY.orbDamage);
          gone = true;
          break;
        }
      }
      if (gone) {
        orb.alive = false;
        emit({ type: 'orb', id: orb.id, x: orb.x, y: orb.y });
      }
    }
  }

  function keepSpeed(body) {
    body.speed = body.base * (1 + body.kick);
    const [ux, uy] = unit(body.vx, body.vy, body.side === 'pink' ? 1 : -1, 0);
    body.vx = ux * body.speed;
    body.vy = uy * body.speed;
  }

  /** `attacker` bumped into `defender` with `power` (see IMPACT): what its kind does on contact. */
  function contact(attacker, defender, power) {
    const base = BALLS[attacker.kind].damage * power;
    switch (attacker.kind) {
      case 'electric':
        hurt(defender, base);
        defender.frozen = FREEZE_TICKS;
        emit({ type: 'shock', id: defender.id, by: attacker.id, x: defender.x, y: defender.y });
        break;
      case 'charge': {
        const damage = base + attacker.charge * power;
        attacker.charge = 0;
        hurt(defender, damage);
        if (damage >= 4) emit({ type: 'charged', id: attacker.id, x: defender.x, y: defender.y });
        break;
      }
      case 'cell':
        hurt(defender, attacker.gen === 0 ? base : base * 0.7);
        break;
      case 'fire':
        hurt(defender, base);
        defender.burn = BURN.ticks;
        emit({ type: 'ignite', id: defender.id, x: defender.x, y: defender.y });
        break;
      default:
        hurt(defender, base);
    }
  }

  function bounceOffWalls(body) {
    const max = SIM.size;
    let bounced = false;
    if (body.x < body.r) { body.x = body.r; body.vx = Math.abs(body.vx); bounced = true; }
    if (body.x > max - body.r) { body.x = max - body.r; body.vx = -Math.abs(body.vx); bounced = true; }
    if (body.y < body.r) { body.y = body.r; body.vy = Math.abs(body.vy); bounced = true; }
    if (body.y > max - body.r) { body.y = max - body.r; body.vy = -Math.abs(body.vy); bounced = true; }
    if (bounced) {
      body.kick = KICK.boost;
      emit({ type: 'wall', id: body.id, x: body.x, y: body.y });
      const wobble = (rand() - 0.5) * WALL_JITTER;
      const vx = body.vx;
      body.vx += -body.vy * wobble;
      body.vy += vx * wobble;
      keepSpeed(body);
    }
  }

  function collide(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const reach = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= reach * reach) return;
    const d = Math.sqrt(d2);
    const [nx, ny] = d > 1e-9 ? [dx / d, dy / d] : [1, 0];
    const ma = a.r * a.r;
    const mb = b.r * b.r;
    const total = ma + mb;
    const overlap = reach - d;
    a.x -= nx * overlap * (mb / total);
    a.y -= ny * overlap * (mb / total);
    b.x += nx * overlap * (ma / total);
    b.y += ny * overlap * (ma / total);
    const va = a.vx * nx + a.vy * ny;
    const vb = b.vx * nx + b.vy * ny;
    if (va - vb <= 0) return; // already moving apart: no new hit
    // 1 when both meet head-on at their normal speeds; more after a wall kick, less for a graze.
    const closing = (va - vb) / (a.base + b.base);
    const power = Math.min(IMPACT.max, IMPACT.min + IMPACT.gain * closing);
    const na = (va * (ma - mb) + 2 * mb * vb) / total;
    const nb = (vb * (mb - ma) + 2 * ma * va) / total;
    a.vx += (na - va) * nx;
    a.vy += (na - va) * ny;
    b.vx += (nb - vb) * nx;
    b.vy += (nb - vb) * ny;
    keepSpeed(a);
    keepSpeed(b);
    if (a.side === b.side) return;
    emit({ type: 'hit', a: a.id, b: b.id, power, x: a.x + nx * a.r, y: a.y + ny * a.r });
    contact(a, b, power);
    contact(b, a, power);
  }

  function steer(body) {
    let target = null;
    let best = Infinity;
    for (const enemy of enemiesOf(body)) {
      const d2 = sq(enemy.x - body.x) + sq(enemy.y - body.y);
      if (d2 < best) { best = d2; target = enemy; }
    }
    if (!target) return;
    const [ux, uy] = unit(target.x - body.x, target.y - body.y);
    body.vx += ux * body.speed * SEEK * DT;
    body.vy += uy * body.speed * SEEK * DT;
    keepSpeed(body);
  }

  function swingAxe(body) {
    const [x, y] = body.axe;
    const [ux, uy] = unit(x * AXE.cos - y * AXE.sin, x * AXE.sin + y * AXE.cos);
    body.axe = [ux, uy];
    const bladeX = body.x + ux * (body.r + AXE.reach);
    const bladeY = body.y + uy * (body.r + AXE.reach);
    for (const enemy of enemiesOf(body)) {
      const reach = enemy.r + AXE.blade;
      if (sq(enemy.x - bladeX) + sq(enemy.y - bladeY) >= reach * reach) continue;
      if ((body.cooldowns[enemy.id] ?? 0) > fight.tick) continue;
      body.cooldowns[enemy.id] = fight.tick + AXE.cooldown;
      emit({ type: 'axe', id: body.id, x: bladeX, y: bladeY });
      hurt(enemy, AXE.damage);
    }
  }

  function bite(body) {
    if (fight.tick % TAIL.every === 0) {
      body.tail.unshift([body.x, body.y]);
      if (body.tail.length > TAIL.length) body.tail.pop();
    }
    for (const enemy of enemiesOf(body)) {
      if ((body.cooldowns[enemy.id] ?? 0) > fight.tick) continue;
      // The first segments sit under the head itself.
      for (let i = 2; i < body.tail.length; i += 1) {
        const [x, y] = body.tail[i];
        const reach = enemy.r + body.r * (0.75 - i * 0.04);
        if (sq(enemy.x - x) + sq(enemy.y - y) >= reach * reach) continue;
        body.cooldowns[enemy.id] = fight.tick + TAIL.cooldown;
        emit({ type: 'bite', id: body.id, x, y });
        hurt(enemy, TAIL.damage);
        break;
      }
    }
  }

  function tickTimers(body) {
    if (body.kind === 'cell' && body.gen === 0 && body.r < CELL.maxRadius) body.r = Math.min(CELL.maxRadius, body.r + CELL.grow);
    if (body.kind === 'charge') body.charge = Math.min(CHARGE.max, body.charge + CHARGE.rate);
    if (body.transform > 0) body.transform -= 1;
    if (body.kick > 0) {
      body.kick = body.kick < 0.01 ? 0 : body.kick * KICK.keep;
      keepSpeed(body);
    }
    if (body.burn > 0) {
      body.burn -= 1;
      if (body.burn % BURN.every === 0) hurt(body, BURN.damage, { burn: true });
    }
  }

  function settleDeaths() {
    const born = [];
    for (const body of bodies) {
      if (!body.alive || body.hp > 0) continue;
      body.alive = false;
      body.hp = 0;
      emit({ type: 'death', id: body.id, x: body.x, y: body.y });
      const split = body.kind === 'cell' ? CELL_SPLITS[body.gen + 1] : null;
      if (!split) continue;
      // Two smaller cells fly apart, square to the way the old one was going.
      const [px, py] = unit(-body.vy, body.vx, 0, 1);
      const ids = [];
      for (const sign of [1, -1]) {
        const child = spawn(body.side, 'cell', body.x + px * split.radius * sign, body.y + py * split.radius * sign, px * sign, py * sign, {
          gen: body.gen + 1, hp: split.hp, radius: split.radius, speed: split.speed,
        });
        born.push(child);
        ids.push(child.id);
      }
      emit({ type: 'split', id: body.id, children: ids, x: body.x, y: body.y });
    }
    for (const child of born) bounceOffWalls(child);
  }

  function decide() {
    const alive = { pink: 0, blue: 0 };
    for (const body of bodies) if (body.alive) alive[body.side] += 1;
    if (alive.pink && alive.blue && fight.tick < SIM.maxTicks) return;
    fight.over = true;
    if (!alive.pink && !alive.blue) fight.winner = rand() < 0.5 ? 'pink' : 'blue';
    else if (!alive.pink) fight.winner = 'blue';
    else if (!alive.blue) fight.winner = 'pink';
    else {
      // Out of time: the side with more of its health left wins.
      const share = (side) => {
        let hp = 0;
        let max = 0;
        for (const body of bodies) if (body.alive && body.side === side) { hp += body.hp; max += body.maxHp; }
        return hp / max;
      };
      const pinkShare = share('pink');
      const blueShare = share('blue');
      fight.winner = pinkShare === blueShare ? (rand() < 0.5 ? 'pink' : 'blue') : pinkShare > blueShare ? 'pink' : 'blue';
    }
    emit({ type: 'over', winner: fight.winner });
  }

  function step() {
    if (fight.over) return;
    fight.tick += 1;
    const live = bodies.filter((body) => body.alive);
    for (const body of live) tickTimers(body);
    for (const body of live) {
      if (body.frozen > 0) {
        body.frozen -= 1;
        continue;
      }
      steer(body);
      body.x += body.vx * DT;
      body.y += body.vy * DT;
      bounceOffWalls(body);
    }
    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) collide(live[i], live[j]);
    }
    moveOrbs();
    for (const body of live) {
      if (!body.alive) continue;
      if (body.axe) swingAxe(body);
      if (body.tail) bite(body);
      bounceOffWalls(body);
    }
    settleDeaths();
    decide();
  }

  return fight;
}

/** Runs a fight to its end without keeping events: { winner, ticks }. */
export function resolveFight(setup) {
  const fight = createFight(setup, { record: false });
  while (!fight.over) fight.step();
  return { winner: fight.winner, ticks: fight.tick };
}
