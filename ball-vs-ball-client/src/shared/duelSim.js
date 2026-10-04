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

// Every hit takes at least 1 and at most `MAX_HIT` off the 100 a ball starts on (a spear thrust up to its own).
const MAX_HIT = 5;
const FREEZE_TICKS = 50;
// A Thief Ball carries up to `max` knives, one more every `regen` ticks, and throws one at the nearest enemy every
// `every` ticks while it has any: a knife hit takes `damage` and heals the thief by as much.
const THIEF = { max: 3, regen: 80, every: 40, speed: 120, radius: 1.8, damage: 2 };
// A Vampire Ball heals by `share` of what its bumps take.
const VAMPIRE = { share: 0.35 };
// A Burst Ball bursts every `every` ticks: much faster for a moment, and its bumps hit `power` times harder
// for `ticks`.
const BURST = { every: 120, ticks: 50, boost: 1.6, power: 2 };
// A Spider Ball shoots a web strand at a wall every `every` ticks (up to `max` at once, each lasting `life`): the
// strand runs from where it stuck to the spider, wherever the spider goes. An enemy touching a strand takes
// `damage` (once per `cooldown`) and is webbed: it moves at `speed` of its pace for `ticks`.
const WEB = { every: 50, max: 6, life: 300, width: 1.2, damage: 1, cooldown: 45, ticks: 40, speed: 0.6 };
// A Poison Spike Ball fires a spike every `every` ticks; it poisons what it hits, or sticks in the wall (up to
// `max`, each for `life`) and poisons whatever touches it there. Poison takes 1 every `tick` for `ticks`.
const POISON = { every: 80, speed: 95, radius: 2, hit: 2, max: 8, life: 600, trap: 4.5, cooldown: 30, ticks: 150, tick: 40 };
// A Laser Ball puts up a beam every `every` ticks: wall to wall through where it is, live after `arm` ticks,
// gone after `life`, up to `max` at once. A live beam takes `damage` from an enemy touching it, once per `cooldown`.
const LASER = { every: 120, first: 40, arm: 40, life: 300, max: 4, width: 0.8, damage: 1, cooldown: 25 };
// A Spear Ball's spear turns toward the nearest enemy and thrusts every `every` ticks: out over `out` ticks, back
// over as many, reaching `reach` past the ball's edge at full stretch. The tip takes `damage` (up to `max`).
const SPEAR = { every: 80, out: 10, rest: 9, reach: 10, turn: 0.15, tip: 1.5, damage: 7, max: 10 };
// A Hook Ball throws its hook at the nearest enemy every `every` ticks: it takes `damage` and hooks it for
// `hold` ticks, dragging it toward the Hook Ball with `pull` times its own pace per second; the Hook Ball's bumps
// on a ball it has hooked take `power` times more.
const HOOK = { every: 120, first: 30, speed: 130, radius: 2.4, damage: 3, hold: 60, pull: 2.2, power: 1.25 };
// A Virus Ball's bumps infect: each adds a stack (up to `stacks`); an infected ball loses its stacks in health
// every `tick` ticks, for `ticks` after the last infection.
const VIRUS = { stacks: 2, ticks: 150, tick: 60 };
// A Snake Ball's tail: a segment every `every` ticks, `length` long; it bites what crosses it.
const TAIL = { every: 5, length: 10, damage: 2, cooldown: 24 };
const CHARGE = { rate: 1.5 / SIM.tickRate, max: 4 };
// A Cell Ball swells as the fight goes on; when it dies it splits in two, and those in two again.
const CELL = { grow: 0.5 / SIM.tickRate, maxRadius: 11 };
const CELL_SPLITS = [null, { hp: 10, radius: 7.5, speed: 1.1 }, { hp: 5, radius: 5.5, speed: 1.2 }];
// The axe swings 4 degrees a tick: cos and sin of 4 degrees, written out.
const AXE = { cos: 0.9975640502598242, sin: 0.0697564737441253, reach: 7.5, blade: 4.6, damage: 5, cooldown: 14 };
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

/** Where a ray from (x, y) along (dx, dy) leaves the box: [x, y, inward normal x, inward normal y]. */
function wallHit(x, y, dx, dy) {
  const max = SIM.size;
  const tx = dx > 1e-9 ? (max - x) / dx : dx < -1e-9 ? -x / dx : Infinity;
  const ty = dy > 1e-9 ? (max - y) / dy : dy < -1e-9 ? -y / dy : Infinity;
  if (tx < ty) return [x + dx * tx, y + dy * tx, dx > 0 ? -1 : 1, 0];
  return [x + dx * ty, y + dy * ty, 0, dy > 0 ? -1 : 1];
}

/** Squared distance from (px, py) to the segment (ax, ay)-(bx, by). */
function segmentDistance2(px, py, ax, ay, bx, by) {
  const ex = bx - ax;
  const ey = by - ay;
  const length2 = ex * ex + ey * ey;
  const t = length2 > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / length2)) : 0;
  return sq(px - (ax + ex * t)) + sq(py - (ay + ey * t));
}

/**
 * A fight between `pink` and `blue`, each { ball, aim: { x, y } }. Call `step()` once per tick until `over`;
 * then `winner` is 'pink' or 'blue'. `bodies` are the balls (cells add more as they split): { id, side, kind,
 * gen, x, y, vx, vy, r, hp, maxHp, alive, frozen, webbed, poison, virus, burst, charge, kick, transform,
 * axe: [x, y], spear: { dx, dy, ext }, knives, hooked: { by, until }, strands: [{ id, x, y, until }],
 * tail: [[x, y]...] }.
 * `orbs` are the Verity Ball's shots: { id, side, x, y, vx, vy, r, alive }. `shots` fly too: { id, side, kind
 * ('spike' | 'knife' | 'hook'), owner, x, y, vx, vy, r, alive }. `traps` stay put: poison spikes stuck in a wall
 * { id, side, kind: 'spike', x, y, nx, ny, until, alive } and laser beams { id, side, kind: 'laser', ax, ay, bx,
 * by, armedAt, until, alive }.
 * With `record`, what happens is kept for the screen (`drain()` hands it over): hit (with its `power`), wall,
 * damage, shock, steal, burst, web, snag, poison, zap, thrust, throw, latch, infect, bite, charged, axe,
 * transform, orb, split and death events, each with the tick and where it happened.
 */
export function createFight({ seed, pink, blue }, { record = true } = {}) {
  const rand = mulberry32(seed ^ 0x5bd1e995);
  const bodies = [];
  const orbs = [];
  const shots = [];
  const traps = [];
  let events = [];
  let nextId = 1;
  const fight = {
    tick: 0, bodies, orbs, shots, traps, over: false, winner: null, step, drain: () => { const out = events; events = []; return out; },
  };
  const emit = (event) => { if (record) events.push({ tick: fight.tick, ...event }); };

  function spawn(side, kind, x, y, dx, dy, { gen = 0, hp, radius, speed = 1 } = {}) {
    const stats = BALLS[kind];
    const [ux, uy] = unit(dx, dy, side === 'pink' ? 1 : -1, 0);
    const body = {
      id: nextId++, side, kind, gen, x, y,
      base: stats.speed * speed, speed: stats.speed * speed, vx: 0, vy: 0,
      r: radius ?? stats.radius, hp: hp ?? stats.hp, maxHp: hp ?? stats.hp,
      alive: true, frozen: 0, webbed: 0, poison: 0, virus: 0, virusTicks: 0, burst: 0, charge: 0, kick: 0, transform: 0,
      axe: kind === 'axe' ? [0, 1] : null, // the axe starts straight up
      spear: kind === 'spear' ? { dx: side === 'pink' ? 1 : -1, dy: 0, ext: 0 } : null,
      knives: kind === 'thief' ? THIEF.max : 0,
      strands: kind === 'spider' ? [] : null,
      tail: kind === 'snake' ? [] : null,
      hooked: null, hookOut: false, cooldowns: {},
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
  function nearestEnemy(body) {
    let target = null;
    let best = Infinity;
    for (const enemy of enemiesOf(body)) {
      const d2 = sq(enemy.x - body.x) + sq(enemy.y - body.y);
      if (d2 < best) { best = d2; target = enemy; }
    }
    return target;
  }
  /** True (and starts the wait) when `owner`'s `key` hasn't fired in the last `ticks`. */
  function ready(owner, key, ticks) {
    if ((owner.cooldowns[key] ?? 0) > fight.tick) return false;
    owner.cooldowns[key] = fight.tick + ticks;
    return true;
  }
  /** A random direction (seeded, so the same everywhere). */
  const randomDirection = () => unit(rand() - 0.5, rand() - 0.5);
  /** `body` heals by up to `amount` (not past its full health). */
  function heal(body, amount, from) {
    const healed = Math.min(body.maxHp - body.hp, amount);
    if (healed <= 0 || body.hp <= 0) return;
    body.hp += healed;
    emit({ type: 'steal', id: body.id, from, amount: healed, x: body.x, y: body.y });
  }

  /** Takes `raw` (rounded, 1..`cap`) off `target`; returns how much it took. */
  function hurt(target, raw, { cap = MAX_HIT, dot = false } = {}) {
    if (!target.alive || raw <= 0) return 0;
    const amount = Math.min(cap, Math.max(1, Math.round(raw)));
    target.hp -= amount;
    emit({ type: 'damage', id: target.id, amount, x: target.x, y: target.y, dot });
    if (target.kind === 'verity' && target.hp > 0 && target.transform === 0 && rand() < VERITY.chance) transform(target);
    return amount;
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

  /** A projectile from `body` along (dx, dy). */
  function shoot(body, kind, dx, dy, speed, r) {
    const shot = { id: nextId++, side: body.side, kind, owner: body.id, alive: true, r, x: body.x + dx * body.r, y: body.y + dy * body.r, vx: dx * speed, vy: dy * speed };
    shots.push(shot);
    emit({ type: 'throw', id: body.id, kind, x: shot.x, y: shot.y });
    return shot;
  }

  function moveShots() {
    for (const shot of shots) {
      if (!shot.alive) continue;
      shot.x += shot.vx * DT;
      shot.y += shot.vy * DT;
      const owner = bodies.find((body) => body.id === shot.owner);
      let hit = null;
      for (const enemy of bodies) {
        if (!enemy.alive || enemy.side === shot.side) continue;
        if (sq(enemy.x - shot.x) + sq(enemy.y - shot.y) < sq(enemy.r + shot.r)) { hit = enemy; break; }
      }
      const out = shot.x < shot.r || shot.y < shot.r || shot.x > SIM.size - shot.r || shot.y > SIM.size - shot.r;
      if (!hit && !out) continue;
      shot.alive = false;
      if (shot.kind === 'hook' && owner) owner.hookOut = false;
      if (hit) {
        if (shot.kind === 'spike') {
          hurt(hit, POISON.hit);
          hit.poison = POISON.ticks;
          emit({ type: 'poison', id: hit.id, x: shot.x, y: shot.y });
        } else if (shot.kind === 'knife') {
          const taken = hurt(hit, THIEF.damage);
          if (owner?.alive) heal(owner, taken, hit.id);
          emit({ type: 'knife', id: hit.id, x: shot.x, y: shot.y });
        } else if (shot.kind === 'hook') {
          hurt(hit, HOOK.damage);
          if (owner?.alive) hit.hooked = { by: owner.id, until: fight.tick + HOOK.hold };
          emit({ type: 'latch', id: hit.id, by: shot.owner, x: shot.x, y: shot.y });
        }
        continue;
      }
      emit({ type: 'orb', id: shot.id, x: shot.x, y: shot.y });
      if (shot.kind === 'spike' && owner?.alive) {
        // Sticks in the wall it hit, pointing into the box.
        const x = Math.max(0, Math.min(SIM.size, shot.x));
        const y = Math.max(0, Math.min(SIM.size, shot.y));
        const [nx, ny] = x <= shot.r ? [1, 0] : x >= SIM.size - shot.r ? [-1, 0] : y <= shot.r ? [0, 1] : [0, -1];
        const mine = traps.filter((trap) => trap.alive && trap.kind === 'spike' && trap.owner === shot.owner);
        if (mine.length >= POISON.max) mine[0].alive = false;
        traps.push({ id: nextId++, side: shot.side, kind: 'spike', owner: shot.owner, x, y, nx, ny, until: fight.tick + POISON.life, alive: true, cooldowns: {} });
      }
    }
  }

  /** Traps (poison spikes in the walls, laser beams): age out, and hurt enemies touching them. */
  function checkTraps() {
    for (const trap of traps) {
      if (!trap.alive) continue;
      if (fight.tick >= trap.until) { trap.alive = false; continue; }
      if (trap.kind === 'laser' && fight.tick < trap.armedAt) continue;
      for (const enemy of bodies) {
        if (!enemy.alive || enemy.side === trap.side) continue;
        if (trap.kind === 'spike') {
          const reach = enemy.r + POISON.trap;
          if (sq(enemy.x - (trap.x + trap.nx * POISON.trap)) + sq(enemy.y - (trap.y + trap.ny * POISON.trap)) >= reach * reach) continue;
          if (!ready(trap, enemy.id, POISON.cooldown)) continue;
          hurt(enemy, 1);
          enemy.poison = POISON.ticks;
          emit({ type: 'poison', id: enemy.id, x: trap.x, y: trap.y });
        } else {
          const reach = enemy.r + LASER.width;
          if (segmentDistance2(enemy.x, enemy.y, trap.ax, trap.ay, trap.bx, trap.by) >= reach * reach) continue;
          if (!ready(trap, enemy.id, LASER.cooldown)) continue;
          hurt(enemy, LASER.damage);
          emit({ type: 'zap', id: enemy.id, x: enemy.x, y: enemy.y });
        }
      }
    }
  }

  function keepSpeed(body) {
    body.speed = body.base * (1 + body.kick) * (body.webbed > 0 ? WEB.speed : 1);
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
      case 'vampire':
        heal(attacker, Math.round(hurt(defender, base) * VAMPIRE.share), defender.id);
        break;
      case 'hook':
        hurt(defender, defender.hooked?.by === attacker.id ? base * HOOK.power : base);
        break;
      case 'burst':
        hurt(defender, attacker.burst > 0 ? base * BURST.power : base);
        break;
      case 'virus':
        hurt(defender, base);
        defender.virus = Math.min(VIRUS.stacks, defender.virus + 1);
        defender.virusTicks = VIRUS.ticks;
        emit({ type: 'infect', id: defender.id, stacks: defender.virus, x: defender.x, y: defender.y });
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
    const target = nearestEnemy(body);
    if (!target) return;
    const [ux, uy] = unit(target.x - body.x, target.y - body.y);
    body.vx += ux * body.speed * SEEK * DT;
    body.vy += uy * body.speed * SEEK * DT;
    // A hooked ball is dragged toward whoever hooked it.
    const by = body.hooked && bodies.find((other) => other.id === body.hooked.by);
    if (by?.alive && fight.tick < body.hooked.until) {
      const [px, py] = unit(by.x - body.x, by.y - body.y);
      body.vx += px * body.speed * HOOK.pull * DT;
      body.vy += py * body.speed * HOOK.pull * DT;
    } else body.hooked = null;
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

  /** The spear: turns toward the nearest enemy and thrusts now and then; the tip hurts during a thrust. */
  function thrustSpear(body) {
    const target = nearestEnemy(body);
    const spear = body.spear;
    if (target) {
      const [tx, ty] = unit(target.x - body.x, target.y - body.y);
      [spear.dx, spear.dy] = unit(spear.dx + (tx - spear.dx) * SPEAR.turn, spear.dy + (ty - spear.dy) * SPEAR.turn, spear.dx, spear.dy);
    }
    const phase = fight.tick % SPEAR.every;
    spear.ext = phase < SPEAR.out ? (phase + 1) / SPEAR.out : phase < SPEAR.out * 2 ? (SPEAR.out * 2 - phase - 1) / SPEAR.out : 0;
    if (phase === 0) emit({ type: 'thrust', id: body.id, x: body.x, y: body.y });
    if (phase >= SPEAR.out * 2) return;
    const reach = body.r + SPEAR.rest + spear.ext * SPEAR.reach;
    const tipX = body.x + spear.dx * reach;
    const tipY = body.y + spear.dy * reach;
    for (const enemy of enemiesOf(body)) {
      if (sq(enemy.x - tipX) + sq(enemy.y - tipY) >= sq(enemy.r + SPEAR.tip)) continue;
      if (!ready(body, `spear${enemy.id}`, SPEAR.every - SPEAR.out)) continue;
      emit({ type: 'axe', id: body.id, x: tipX, y: tipY });
      hurt(enemy, SPEAR.damage * (0.5 + spear.ext * 0.5), { cap: SPEAR.max });
    }
  }

  /** The spider's strands: a new one now and then, old ones let go; enemies touching one are hurt and slowed. */
  function spinWebs(body) {
    body.strands = body.strands.filter((strand) => strand.until > fight.tick);
    if (fight.tick % WEB.every === 0 && body.strands.length < WEB.max) {
      const [dx, dy] = randomDirection();
      const [x, y] = wallHit(body.x, body.y, dx, dy);
      body.strands.push({ id: nextId++, x, y, until: fight.tick + WEB.life });
      emit({ type: 'strand', id: body.id, x, y });
    }
    for (const enemy of enemiesOf(body)) {
      const reach = enemy.r + WEB.width;
      if (!body.strands.some((strand) => segmentDistance2(enemy.x, enemy.y, strand.x, strand.y, body.x, body.y) < reach * reach)) continue;
      if (!ready(body, `web${enemy.id}`, WEB.cooldown)) continue;
      hurt(enemy, WEB.damage);
      enemy.webbed = WEB.ticks;
      keepSpeed(enemy);
      emit({ type: 'snag', id: enemy.id, x: enemy.x, y: enemy.y });
    }
  }

  /** What some balls do on their own timers: lasers, spikes, knives, hooks. */
  function useAbility(body) {
    const target = nearestEnemy(body);
    switch (body.kind) {
      case 'laser':
        if (fight.tick % LASER.every !== LASER.first % LASER.every) break;
        {
          const [dx, dy] = randomDirection();
          const [ax, ay] = wallHit(body.x, body.y, dx, dy);
          const [bx, by] = wallHit(body.x, body.y, -dx, -dy);
          const mine = traps.filter((trap) => trap.alive && trap.kind === 'laser' && trap.owner === body.id);
          if (mine.length >= LASER.max) mine[0].alive = false;
          traps.push({ id: nextId++, side: body.side, kind: 'laser', owner: body.id, ax, ay, bx, by, armedAt: fight.tick + LASER.arm, until: fight.tick + LASER.life, alive: true, cooldowns: {} });
          emit({ type: 'laser', id: body.id, x: body.x, y: body.y });
        }
        break;
      case 'poison':
        if (fight.tick % POISON.every === 0) shoot(body, 'spike', ...randomDirection(), POISON.speed, POISON.radius);
        break;
      case 'thief':
        if (fight.tick % THIEF.regen === 0) body.knives = Math.min(THIEF.max, body.knives + 1);
        if (target && body.knives > 0 && fight.tick % THIEF.every === 0) {
          body.knives -= 1;
          shoot(body, 'knife', ...unit(target.x - body.x, target.y - body.y), THIEF.speed, THIEF.radius);
        }
        break;
      case 'hook':
        if (target && !body.hookOut && fight.tick % HOOK.every === HOOK.first % HOOK.every) {
          body.hookOut = true;
          shoot(body, 'hook', ...unit(target.x - body.x, target.y - body.y), HOOK.speed, HOOK.radius);
        }
        break;
      default:
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
    if (body.burst > 0) body.burst -= 1;
    if (body.kind === 'burst' && fight.tick % BURST.every === 0) {
      body.burst = BURST.ticks;
      body.kick = Math.max(body.kick, BURST.boost);
      keepSpeed(body);
      emit({ type: 'burst', id: body.id, x: body.x, y: body.y });
    }
    if (body.kick > 0) {
      body.kick = body.kick < 0.01 ? 0 : body.kick * KICK.keep;
      keepSpeed(body);
    }
    if (body.webbed > 0) {
      body.webbed -= 1;
      if (body.webbed === 0) keepSpeed(body);
    }
    if (body.poison > 0) {
      body.poison -= 1;
      if (body.poison % POISON.tick === 0) hurt(body, 1, { dot: true });
    }
    if (body.virusTicks > 0) {
      body.virusTicks -= 1;
      if (body.virusTicks % VIRUS.tick === 0) hurt(body, body.virus, { dot: true });
      if (body.virusTicks === 0) body.virus = 0;
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
    moveShots();
    for (const body of live) {
      if (!body.alive) continue;
      if (body.axe) swingAxe(body);
      if (body.spear) thrustSpear(body);
      if (body.strands) spinWebs(body);
      if (body.tail) bite(body);
      useAbility(body);
      bounceOffWalls(body);
    }
    checkTraps();
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
