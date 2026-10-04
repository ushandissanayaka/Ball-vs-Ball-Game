import * as THREE from 'three';

/*
 * What the balls leave or throw around the duel box: the Spider Ball's web strands, poison spikes stuck in the
 * walls, laser beams with their wall emitters, flying spikes, knives and hooks, the hook's chain, and the Snake
 * Ball's tail. Each kind is one instanced mesh made up front (a fixed number of instances), so a fight with
 * dozens of them is still a handful of draw calls, and nothing is created mid-fight. Everything is in the
 * fight layer, in duel-simulation units (the box is 100 x 100, its back wall at z = 0).
 */

const STRAND_Z = 1.6; // strands and beams lie just off the back wall, under the balls
const MAX = { strands: 24, spikes: 24, beams: 12, shots: 24, chains: 4, tail: 24 };

const up = new THREE.Vector3(0, 1, 0);
const along = new THREE.Vector3();
const dummy = new THREE.Object3D();
const color = new THREE.Color();

function instanced(geometry, material, count, layer, renderOrder = 0) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.count = 0;
  mesh.frustumCulled = false; // instances move all over the box; the box itself is always in view in a duel
  mesh.renderOrder = renderOrder;
  layer.add(mesh);
  return mesh;
}

/** A unit box stretched from (ax, ay) to (bx, by) at depth z, `width` across. */
function placeSegment(mesh, index, ax, ay, bx, by, z, width) {
  const dx = bx - ax;
  const dy = by - ay;
  dummy.position.set((ax + bx) / 2, (ay + by) / 2, z);
  dummy.rotation.set(0, 0, Math.atan2(dy, dx));
  dummy.scale.set(Math.sqrt(dx * dx + dy * dy), width, width);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

/** A cone (tip along +y) standing at (x, y, z), pointing along (dx, dy). */
function placePointing(mesh, index, x, y, z, dx, dy, scale = 1) {
  dummy.position.set(x, y, z);
  dummy.quaternion.setFromUnitVectors(up, along.set(dx, dy, 0).normalize());
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function knifeGeometry() {
  // A flat blade with a short dark grip, tip along +y.
  const shape = new THREE.Shape();
  shape.moveTo(0, 3.2);
  shape.lineTo(0.9, 0);
  shape.lineTo(-0.9, 0);
  shape.closePath();
  const blade = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
  blade.translate(0, 0, -0.175);
  return blade;
}

/**
 * The props for one fight layer. `sync(fight, models)` places everything from the simulation's state (call
 * after the balls are placed; `models` maps body ids to ball models, for where each ball is drawn).
 * `clear()` hides it all.
 */
export function createFightProps(layer) {
  const strandMaterial = new THREE.MeshBasicMaterial({ color: '#a9c8ee', toneMapped: false });
  const strands = instanced(new THREE.BoxGeometry(1, 1, 1), strandMaterial, MAX.strands, layer, 2);

  const spikeMaterial = new THREE.MeshStandardMaterial({ color: '#2fb83a', roughness: 0.35, emissive: '#0d5a12', emissiveIntensity: 0.4 });
  const spikeGeometry = new THREE.ConeGeometry(2.4, 8, 6);
  spikeGeometry.translate(0, 4, 0); // base at the origin, tip along +y
  const wallSpikes = instanced(spikeGeometry, spikeMaterial, MAX.spikes, layer, 3);

  // Laser beams glow past 1.0 so the bloom catches them; arming beams are drawn thin and dim.
  const beamMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const beams = instanced(new THREE.BoxGeometry(1, 1, 1), beamMaterial, MAX.beams, layer, 2);
  beams.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX.beams * 3), 3);
  const emitters = instanced(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({ color: '#dfe8f5', roughness: 0.3 }), MAX.beams * 2, layer, 3);

  const shotSpikes = instanced(new THREE.ConeGeometry(1.4, 5, 6), spikeMaterial, MAX.shots, layer, 4);
  const knives = instanced(knifeGeometry(), new THREE.MeshStandardMaterial({ color: '#d7dee8', roughness: 0.25, metalness: 0.8 }), MAX.shots, layer, 4);
  const hookGeometry = new THREE.TorusGeometry(1.6, 0.45, 6, 12, Math.PI * 1.3);
  const hooks = instanced(hookGeometry, new THREE.MeshStandardMaterial({ color: '#9aa3b2', roughness: 0.3, metalness: 0.8 }), MAX.chains, layer, 4);
  const chains = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#2b2f38', roughness: 0.5, metalness: 0.6 }), MAX.chains, layer, 3);
  const tail = instanced(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: '#dedbcc', roughness: 0.75 }), MAX.tail, layer, 1);

  const all = [strands, wallSpikes, beams, emitters, shotSpikes, knives, hooks, chains, tail];
  const materials = [strandMaterial, spikeMaterial, beamMaterial, emitters.material, knives.material, hooks.material, chains.material, tail.material];
  const live = new THREE.Color('#ff3df5').multiplyScalar(1.6);
  const arming = new THREE.Color('#6d2a8a');

  const commit = (mesh, count) => {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const sync = (fight, models) => {
    const at = (body) => models.get(body.id)?.group.position;
    let s = 0;
    let t = 0;
    let c = 0;
    let h = 0;
    for (const body of fight.bodies) {
      if (!body.alive) continue;
      const here = at(body);
      if (body.strands && here) {
        for (const strand of body.strands) {
          if (s < MAX.strands) placeSegment(strands, s++, strand.x, strand.y, here.x, here.y, STRAND_Z, 1.6);
        }
      }
      if (body.tail && here) {
        body.tail.forEach(([x, y], i) => {
          if (i < 1 || t >= MAX.tail) return; // the first segment sits under the head
          const r = body.r * (0.75 - i * 0.04);
          dummy.position.set(x, y, here.z - 0.5);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(r);
          dummy.updateMatrix();
          tail.setMatrixAt(t++, dummy.matrix);
        });
      }
      // A hooked ball: the chain runs from the Hook Ball to it.
      const by = body.hooked && fight.bodies.find((other) => other.id === body.hooked.by);
      const from = by?.alive && at(by);
      if (from && here && c < MAX.chains) placeSegment(chains, c++, from.x, from.y, here.x, here.y, 3, 0.7);
    }
    let k = 0;
    let p = 0;
    for (const shot of fight.shots) {
      if (!shot.alive) continue;
      const len = Math.sqrt(shot.vx * shot.vx + shot.vy * shot.vy) || 1;
      const [dx, dy] = [shot.vx / len, shot.vy / len];
      if (shot.kind === 'spike' && p < MAX.shots) placePointing(shotSpikes, p++, shot.x, shot.y, 6, dx, dy);
      else if (shot.kind === 'knife' && k < MAX.shots) placePointing(knives, k++, shot.x, shot.y, 6, dx, dy);
      else if (shot.kind === 'hook' && h < MAX.chains) {
        placePointing(hooks, h++, shot.x, shot.y, 6, dx, dy);
        const owner = fight.bodies.find((body) => body.id === shot.owner);
        const from = owner?.alive && at(owner);
        if (from && c < MAX.chains) placeSegment(chains, c++, from.x, from.y, shot.x, shot.y, 3, 0.7);
      }
    }
    let w = 0;
    let b = 0;
    let e = 0;
    for (const trap of fight.traps) {
      if (!trap.alive) continue;
      if (trap.kind === 'spike' && w < MAX.spikes) placePointing(wallSpikes, w++, trap.x, trap.y, 6, trap.nx, trap.ny, 1.4);
      if (trap.kind === 'laser' && b < MAX.beams) {
        const armed = fight.tick >= trap.armedAt;
        placeSegment(beams, b, trap.ax, trap.ay, trap.bx, trap.by, STRAND_Z + 1, armed ? 1.1 : 0.4);
        beams.setColorAt(b++, armed ? live : arming);
        for (const [x, y] of [[trap.ax, trap.ay], [trap.bx, trap.by]]) {
          dummy.position.set(x, y, STRAND_Z + 1);
          dummy.rotation.set(0.5, 0.5, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          emitters.setMatrixAt(e++, dummy.matrix);
        }
      }
    }
    commit(strands, s);
    commit(tail, t);
    commit(chains, c);
    commit(shotSpikes, p);
    commit(knives, k);
    commit(hooks, h);
    commit(wallSpikes, w);
    commit(beams, b);
    commit(emitters, e);
  };

  const clear = () => { for (const mesh of all) mesh.count = 0; };
  /** One of each shown, so the warm-up compiles their shaders. */
  const showAll = () => { for (const mesh of all) { mesh.count = 1; mesh.setMatrixAt(0, new THREE.Matrix4()); } };
  const dispose = () => {
    for (const mesh of all) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    for (const material of materials) material.dispose();
  };
  return { sync, clear, showAll, dispose };
}
