import * as THREE from 'three';
import { BALLS } from '../../shared/balls.js';
import { START, createFight } from '../../shared/duelSim.js';
import { createFightFx } from '../../effects/duelFx.js';
import { createBallModel, createTailSegment } from './ballModels.js';

const MAX_CATCH_UP = 900; // ticks per frame at most, when a fight is joined late or the tab was hidden

/** The dashed white arrow showing which way the player's ball will start. */
function createAimArrow() {
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
  group.add(...parts);
  group.renderOrder = 11;
  return { group, material };
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
  const tails = new Map(); // snake body id -> tail segments
  const flown = new Set(); // bodies whose model has left the box (the striker)
  const arrow = createAimArrow();
  arrow.group.visible = false;
  layer.add(arrow.group);
  let fight = null;
  let fightKey = null;
  let mySide = null;
  const at = new THREE.Vector3();

  const place = (model, x, y, r) => {
    arena.simToLocal(x, y, r, at);
    model.group.position.copy(at);
  };

  const dropModel = (id) => {
    models.get(id)?.dispose();
    models.delete(id);
    for (const segment of tails.get(id) ?? []) segment.dispose();
    tails.delete(id);
  };

  const clear = () => {
    for (const id of [...models.keys()]) dropModel(id);
    fx.clear();
    flown.clear();
    fight = null;
    fightKey = null;
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
    if (mine) arrow.group.position.copy(mine.group.position);
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
      if (!body.alive) {
        if (model) dropModel(body.id);
        continue;
      }
      if (!model) {
        model = createBallModel(body.kind, body.r);
        layer.add(model.group);
        models.set(body.id, model);
        if (body.tail) tails.set(body.id, []);
      }
      if (body.kind === 'cell') model.setRadius(body.r);
      place(model, body.x, body.y, body.r);
      model.setHp(body.hp);
      if (body.axe) model.setAxe(body.axe[0], body.axe[1]);
      model.setState({ frozen: body.frozen > 0, burning: body.burn > 0, charge: body.charge / 13 });
      model.userData = { vx: body.frozen > 0 ? 0 : body.vx, vy: body.frozen > 0 ? 0 : body.vy };
      if (body.tail) {
        const segments = tails.get(body.id);
        while (segments.length < body.tail.length) {
          const segment = createTailSegment();
          layer.add(segment.mesh);
          segments.push(segment);
        }
        body.tail.forEach(([x, y], i) => {
          const r = body.r * (0.75 - i * 0.04);
          segments[i].mesh.scale.setScalar(r);
          arena.simToLocal(x, y, r, segments[i].mesh.position);
          segments[i].mesh.position.z = model.group.position.z - 0.5;
        });
      }
    }
  };

  const byId = (id) => fight.bodies.find((body) => body.id === id);
  const z = (body) => (body ? body.r + 1 : 8);

  const show = (event) => {
    const body = event.id ? byId(event.id) : null;
    switch (event.type) {
      case 'hit':
        fx.spawnSparks(event.x, event.y, 10, '#ffffff', 12, 55);
        models.get(event.a)?.flash();
        models.get(event.b)?.flash();
        break;
      case 'damage':
        fx.spawnNumber(`-${event.amount}`, event.burn ? fx.burnColor : fx.damageColor, event.x, event.y + (body?.r ?? 7) + 3, z(body));
        break;
      case 'shock':
        fx.spawnBolt(event.x, event.y, z(body));
        fx.spawnSparks(event.x, event.y, z(body), '#7fdcff', 14, 60);
        break;
      case 'ignite':
        fx.spawnSparks(event.x, event.y, z(body), '#ff8a2a', 14, 45);
        break;
      case 'charged':
        fx.spawnRing(event.x, event.y, 10, '#7ff8ff', 34);
        fx.spawnSparks(event.x, event.y, 10, '#c4fbff', 18, 70);
        break;
      case 'axe':
        fx.spawnSparks(event.x, event.y, 10, '#ffe2b0', 10, 50);
        break;
      case 'bite':
        fx.spawnSparks(event.x, event.y, 8, '#ffffff', 6, 35);
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
    const events = fight.drain();
    // Catching up after a long gap: only the last moments' effects are worth showing.
    for (const event of events) if (fight.tick - event.tick < 30) show(event);
    sync();
  };

  const takeStriker = () => {
    if (!fight?.winner) return null;
    let best = null;
    for (const body of fight.bodies) if (body.alive && body.side === fight.winner && (!best || body.hp > best.hp)) best = body;
    const model = best && models.get(best.id);
    if (!model) return null;
    models.delete(best.id);
    flown.add(best.id);
    for (const segment of tails.get(best.id) ?? []) segment.dispose();
    tails.delete(best.id);
    model.showLabel(false);
    return model;
  };

  const update = (dt, time) => {
    for (const model of models.values()) model.update(dt, time, model.userData?.vx ?? 0, model.userData?.vy ?? 0);
    if (arrow.group.visible) {
      const pulse = 0.85 + Math.sin(time * 6) * 0.15;
      arrow.material.opacity = pulse;
    }
    fx.update(dt);
  };

  return { lineup, setAim, showArrow, start, advanceTo, takeStriker, clear, update, get running() { return Boolean(fight) && !fight.over; } };
}
