import * as THREE from 'three';
import { BALLS } from '../../shared/balls.js';
import { START, createFight } from '../../shared/duelSim.js';
import { createFightFx } from '../../effects/duelFx.js';
import { dotTexture } from '../../effects/glowTextures.js';
import { createBallModel } from './ballModels.js';

const MAX_CATCH_UP = 900; // ticks per frame at most, when a fight is joined late or the tab was hidden

/** The dashed white arrow showing which way the player's ball will start. */
export function createAimArrow() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false });
  const parts = [];
  for (const x of [0.55, 1.75, 2.95]) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.4, 1.2), material);
    dash.position.x = x * 8;
    parts.push(dash);
  }
  const head = new THREE.Shape();
  head.moveTo(0, -6.5);
  head.lineTo(11, 0);
  head.lineTo(0, 6.5);
  head.lineTo(0, -6.5);
  const tip = new THREE.Mesh(new THREE.ExtrudeGeometry(head, { depth: 1.2, bevelEnabled: false }), material);
  tip.geometry.translate(0, 0, -0.6);
  tip.position.x = 28.4;
  parts.push(tip);
  // The dashes and head sit on `inner`, slid out to start at the edge of the ball (see `startAt`).
  const inner = new THREE.Group();
  inner.add(...parts);
  group.add(inner);
  group.renderOrder = 11;
  return { group, material, startAt: (radius) => { inner.position.x = radius - 3.5; } };
}

/** A Verity Ball's orb: a hot white core in an orange glow. */
export function createOrb() {
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(), color: '#ff8a1a', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
  }));
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(), color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
  }));
  glowSprite.renderOrder = 13;
  core.renderOrder = 13;
  const group = new THREE.Group();
  group.add(glowSprite, core);
  return {
    group,
    pulse(time, r) {
      glowSprite.scale.setScalar(r * (5.2 + Math.sin(time * 20) * 0.5));
      core.scale.setScalar(r * 3.2);
    },
    dispose() {
      group.removeFromParent();
      glowSprite.material.dispose();
      core.material.dispose();
    },
  };
}

/**
 * Everything inside the duel box: the two balls lined up while players aim, the fight itself (the shared
 * simulation run in step with the server's clock), the hit effects, and the winning ball handed over for its
 * flight out of the box.
 *   lineup({ pink, blue }, mySide)  both balls at their starting spots, my arrow on mine
 *   setAim({ x, y })                points my arrow
 *   start(fight)                    begins showing `fight` ({ setup, ticks, winner }); same fight: no-op
 *   advanceTo(tick)                 runs the simulation up to `tick`, showing what happens
 *   takeStriker()                   the winner's healthiest ball's model, removed from the box (the caller
 *                                   flies it), or null
 *   clear(), update(dt, time)
 */
export function createFightView(arena) {
  const layer = arena.fightLayer;
  const fx = createFightFx(layer);
  const models = new Map(); // body id (or 'pink' / 'blue' while lined up) -> model
  const flown = new Set(); // bodies whose model has left the box (the striker)
  const orbs = new Map(); // Verity orb id -> orb
  const spareOrbs = []; // orbs that have hit something, kept to be used again (no new materials mid-fight)
  const arrow = createAimArrow();
  arrow.group.visible = false;
  layer.add(arrow.group);
  let fight = null;
  let fightKey = null;
  // A fight always leaves one ball in the box: when the winner's last ball went down with the loser's, that
  // ball stays on show anyway (it is the one that flies out at the loser).
  let survivor = null;
  let mySide = null;
  const at = new THREE.Vector3();

  const place = (model, x, y, r) => {
    arena.simToLocal(x, y, r, at);
    model.group.position.copy(at);
  };

  const dropModel = (id) => {
    models.get(id)?.dispose();
    models.delete(id);
  };

  const dropOrb = (id) => {
    const orb = orbs.get(id);
    if (!orb) return;
    orb.group.visible = false;
    spareOrbs.push(orb);
    orbs.delete(id);
  };

  const clear = () => {
    for (const id of [...models.keys()]) dropModel(id);
    for (const id of [...orbs.keys()]) dropOrb(id);
    fx.clear();
    flown.clear();
    fight = null;
    fightKey = null;
    survivor = null;
    arrow.group.visible = false;
  };

  const lineup = (balls, side) => {
    mySide = side;
    if (fight) clear();
    for (const s of ['pink', 'blue']) {
      const kind = balls[s];
      const existing = models.get(s);
      if (existing && existing.kind === kind) continue;
      dropModel(s);
      if (!kind) continue;
      const model = createBallModel(kind, BALLS[kind].radius);
      model.setHp(BALLS[kind].hp);
      model.showLabel(false);
      if (kind === 'axe') model.setAxe(0, 1); // straight up, as the fight starts it
      layer.add(model.group);
      models.set(s, model);
      place(model, START[s][0], START[s][1], BALLS[kind].radius);
    }
    const mine = models.get(side);
    arrow.group.visible = Boolean(mine);
    if (mine) {
      arrow.group.position.copy(mine.group.position);
      arrow.startAt(BALLS[balls[side]].radius);
    }
  };

  const setAim = ({ x, y }) => { arrow.group.rotation.z = Math.atan2(y, x); };
  const showArrow = (shown) => { arrow.group.visible = shown && models.has(mySide); };

  const start = (data) => {
    const key = JSON.stringify(data.setup);
    if (key === fightKey) return;
    clear();
    fightKey = key;
    fight = createFight(data.setup);
  };

  const sync = () => {
    for (const body of fight.bodies) {
      if (flown.has(body.id)) continue;
      let model = models.get(body.id);
      if (!body.alive && body.id !== survivor) {
        if (model) dropModel(body.id);
        continue;
      }
      if (!model) {
        model = createBallModel(body.kind, body.r);
        layer.add(model.group);
        models.set(body.id, model);
      }
      if (body.kind === 'cell') model.setRadius(body.r);
      place(model, body.x, body.y, body.r);
      model.setHp(body.id === survivor ? Math.max(1, body.hp) : body.hp);
      if (body.axe) model.setAxe(body.axe[0], body.axe[1]);
      model.setState({ frozen: body.frozen > 0, webbed: body.webbed > 0, burst: body.burst > 0, charge: body.charge / 4, transformed: body.transform > 0 });
      model.userData = { vx: body.frozen > 0 ? 0 : body.vx, vy: body.frozen > 0 ? 0 : body.vy };
    }
    for (const orb of fight.orbs) {
      if (!orb.alive) {
        if (orbs.has(orb.id)) dropOrb(orb.id);
        continue;
      }
      let shown = orbs.get(orb.id);
      if (!shown) {
        shown = spareOrbs.pop() ?? createOrb();
        shown.group.visible = true;
        if (!shown.group.parent) layer.add(shown.group);
        orbs.set(orb.id, shown);
      }
      arena.simToLocal(orb.x, orb.y, orb.r, shown.group.position);
      shown.r = orb.r;
    }
  };

  const byId = (id) => fight.bodies.find((body) => body.id === id);
  const z = (body) => (body ? body.r + 1 : 8);

  const show = (event) => {
    const body = event.id ? byId(event.id) : null;
    switch (event.type) {
      case 'hit':
        // Harder crashes throw more sparks, further; the hardest add a shock ring.
        fx.spawnSparks(event.x, event.y, 10, '#ffffff', Math.round(8 + event.power * 8), 40 + event.power * 30);
        if (event.power > 1.25) fx.spawnRing(event.x, event.y, 10, '#ffffff', 18 + event.power * 10);
        models.get(event.a)?.flash();
        models.get(event.b)?.flash();
        break;
      case 'damage':
        fx.spawnNumber(`-${event.amount}`, fx.damageColor, event.x, event.y + (body?.r ?? 7) + 3, z(body));
        break;
      case 'shock':
        fx.spawnBolt(event.x, event.y, z(body));
        fx.spawnSparks(event.x, event.y, z(body), '#7fdcff', 14, 60);
        break;
      case 'steal':
        // The stolen health rises off the thief in green.
        fx.spawnNumber(`+${event.amount}`, fx.healColor, event.x, event.y + (body?.r ?? 7) + 3, z(body));
        fx.spawnSparks(event.x, event.y, z(body), '#b9c0ff', 10, 40);
        break;
      case 'burst':
        fx.spawnRing(event.x, event.y, 10, '#ffb020', 30);
        fx.spawnSparks(event.x, event.y, 10, '#ffd23a', 16, 65);
        break;
      case 'web':
        fx.spawnRing(event.x, event.y, z(body), '#ffffff', 22);
        fx.spawnSparks(event.x, event.y, z(body), '#f4f4f4', 10, 30);
        break;
      case 'charged':
        fx.spawnRing(event.x, event.y, 10, '#7ff8ff', 34);
        fx.spawnSparks(event.x, event.y, 10, '#c4fbff', 18, 70);
        break;
      case 'axe':
        fx.spawnSparks(event.x, event.y, 10, '#ffe2b0', 10, 50);
        break;
      case 'wall':
        if (body && body.speed > body.base * 1.3) fx.spawnSparks(event.x, event.y, z(body), '#dbe8ff', 5, 30);
        break;
      case 'transform':
        fx.spawnRing(event.x, event.y, 10, '#ffb020', 40);
        fx.spawnSparks(event.x, event.y, 10, '#ffd36a', 22, 70);
        break;
      case 'orb':
        fx.spawnSparks(event.x, event.y, 9, '#ff9a2a', 8, 40);
        break;
      case 'split':
        fx.spawnRing(event.x, event.y, 8, '#8cf07a', 28);
        fx.spawnSparks(event.x, event.y, 8, '#8cf07a', 16, 50);
        break;
      case 'death':
        fx.spawnRing(event.x, event.y, 8, body ? BALLS[body.kind].color : '#ffffff', 36);
        fx.spawnSparks(event.x, event.y, 8, body ? BALLS[body.kind].color : '#ffffff', 26, 70);
        break;
      default:
    }
  };

  const advanceTo = (tick) => {
    if (!fight) return;
    let steps = 0;
    while (!fight.over && fight.tick < tick && steps < MAX_CATCH_UP) {
      fight.step();
      steps += 1;
    }
    if (fight.over && survivor === null) {
      const winners = fight.bodies.filter((body) => body.side === fight.winner);
      // The one still on screen went down last (the others' models were dropped as they died).
      if (!winners.some((body) => body.alive)) survivor = (winners.find((body) => models.has(body.id)) ?? winners.at(-1))?.id ?? null;
    }
    // The survivor's own death (it went down with the loser) isn't shown: it is still standing.
    const events = fight.drain().filter((event) => !(event.type === 'death' && event.id === survivor));
    // Catching up after a long gap: only the last moments' effects are worth showing.
    for (const event of events) if (fight.tick - event.tick < 30) show(event);
    sync();
  };

  const takeStriker = () => {
    if (!fight?.winner) return null;
    let best = null;
    for (const body of fight.bodies) {
      const standing = body.alive || body.id === survivor;
      if (standing && body.side === fight.winner && (!best || body.hp > best.hp)) best = body;
    }
    const model = best && models.get(best.id);
    if (!model) return null;
    models.delete(best.id);
    flown.add(best.id);
    model.showLabel(false);
    return model;
  };

  const update = (dt, time) => {
    for (const model of models.values()) model.update(dt, time, model.userData?.vx ?? 0, model.userData?.vy ?? 0);
    for (const orb of orbs.values()) orb.pulse(time, orb.r ?? 2);
    if (arrow.group.visible) {
      const pulse = 0.85 + Math.sin(time * 6) * 0.15;
      arrow.material.opacity = pulse;
    }
    fx.update(dt);
  };

  return { lineup, setAim, showArrow, start, advanceTo, takeStriker, clear, update, get running() { return Boolean(fight) && !fight.over; } };
}
