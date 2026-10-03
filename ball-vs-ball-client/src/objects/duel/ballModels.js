import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALLS } from '../../shared/balls.js';
import { dotTexture } from '../../effects/glowTextures.js';
import { canvasTexture, DISPLAY_FONT } from '../../util/canvasText.js';
import { mulberry32 } from '../../util/random.js';

/*
 * The 3D balls that fight in the duel box. Each is a lit sphere wearing a painted skin (an equirectangular
 * canvas: the ball's front, which faces the camera, is at a quarter of the way across), with a glow map for
 * the parts that shine, plus what makes its kind: the axe it swings, its spikes, a jelly membrane, flames.
 * They live in the box's fight layer, so sizes and positions are in duel-simulation units (radius ~7).
 */

const SKIN_W = 512;
const SKIN_H = 256;
const CX = SKIN_W / 4; // the front of the ball
const CY = SKIN_H / 2;

const skins = {};
const sphereGeometry = new THREE.SphereGeometry(1, 40, 28);
let rockGeometry = null;
let spikeGeometry = null;

function paintSkin(kind) {
  const color = document.createElement('canvas');
  const glowCanvas = document.createElement('canvas');
  color.width = glowCanvas.width = SKIN_W;
  color.height = glowCanvas.height = SKIN_H;
  const c = color.getContext('2d');
  const g = glowCanvas.getContext('2d');
  c.fillStyle = BALLS[kind].color;
  c.fillRect(0, 0, SKIN_W, SKIN_H);
  g.fillStyle = '#000';
  g.fillRect(0, 0, SKIN_W, SKIN_H);
  const rand = mulberry32(kind.length * 977);
  const circle = (ctx, x, y, r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (kind) {
    case 'electric': {
      const bolt = [[12, -52], [-24, 6], [-3, 6], [-14, 52], [28, -10], [6, -10], [18, -52]];
      const path = (ctx) => {
        ctx.beginPath();
        bolt.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](CX + x, CY + y));
        ctx.closePath();
      };
      path(c);
      c.lineJoin = 'round';
      c.lineWidth = 7;
      c.strokeStyle = '#0b2a66';
      c.stroke();
      const fill = c.createLinearGradient(0, CY - 52, 0, CY + 52);
      fill.addColorStop(0, '#ffffff');
      fill.addColorStop(1, '#a8ecff');
      c.fillStyle = fill;
      c.fill();
      path(g);
      g.fillStyle = '#8fe4ff';
      g.fill();
      break;
    }
    case 'charge':
      circle(c, CX, CY, 54, '#262b52');
      circle(c, CX, CY, 33, '#e9fdff');
      circle(g, CX, CY, 33, '#c4fbff');
      break;
    case 'cell':
      for (let i = 0; i < 40; i += 1) circle(c, rand() * SKIN_W, rand() * SKIN_H, 6 + rand() * 16, 'rgba(140, 230, 120, 0.35)');
      circle(c, CX - 16, CY - 14, 36, '#b9ef7f');
      circle(c, CX - 22, CY - 22, 11, '#ecffc8');
      circle(c, CX + 28, CY + 20, 10, '#8fe07a');
      circle(g, CX - 16, CY - 14, 36, '#2c5f18');
      break;
    case 'axe':
      // The glowing seam: a crescent down the right side of the face.
      for (const [ctx, width, stroke] of [[g, 26, '#ff4a00'], [c, 12, '#ff9a3a'], [g, 10, '#ffc070']]) {
        ctx.lineCap = 'round';
        ctx.lineWidth = width;
        ctx.strokeStyle = stroke;
        ctx.beginPath();
        ctx.moveTo(CX + 30, 14);
        ctx.quadraticCurveTo(CX + 52, CY, CX + 30, SKIN_H - 14);
        ctx.stroke();
      }
      break;
    case 'snake':
      for (const side of [-1, 1]) {
        c.fillStyle = '#121212';
        c.beginPath();
        c.ellipse(CX + side * 21, CY - 14, 11, 15, 0, 0, Math.PI * 2);
        c.fill();
        circle(c, CX + side * 21 + 3, CY - 19, 4.5, '#ffffff');
      }
      c.fillStyle = '#121212';
      c.beginPath();
      c.moveTo(CX - 40, CY + 8);
      c.quadraticCurveTo(CX, CY + 64, CX + 40, CY + 8);
      c.quadraticCurveTo(CX, CY + 30, CX - 40, CY + 8);
      c.fill();
      break;
    case 'spike':
      c.fillStyle = 'rgba(255, 255, 255, 0.12)';
      c.fillRect(0, CY - 10, SKIN_W, 20);
      break;
    case 'fire':
      g.fillStyle = '#5a1600';
      g.fillRect(0, 0, SKIN_W, SKIN_H);
      for (let i = 0; i < 14; i += 1) {
        const x = rand() * SKIN_W;
        const h = 40 + rand() * 90;
        for (const [ctx, fill] of [[c, '#ffd23a'], [g, '#ffb020']]) {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.moveTo(x - 14, SKIN_H);
          ctx.quadraticCurveTo(x - 10, SKIN_H - h * 0.6, x + (rand() - 0.5) * 20, SKIN_H - h);
          ctx.quadraticCurveTo(x + 14, SKIN_H - h * 0.5, x + 14, SKIN_H);
          ctx.fill();
        }
      }
      circle(c, CX, CY + 10, 30, '#ffe680');
      circle(g, CX, CY + 10, 30, '#ffd040');
      break;
    case 'rock':
      for (let i = 0; i < 260; i += 1) {
        circle(c, rand() * SKIN_W, rand() * SKIN_H, 1 + rand() * 4, rand() < 0.5 ? 'rgba(40, 36, 32, 0.35)' : 'rgba(220, 214, 204, 0.3)');
      }
      break;
    default:
  }
  return { map: canvasTexture(color), glow: canvasTexture(glowCanvas) };
}

const skinOf = (kind) => (skins[kind] ??= paintSkin(kind));

/** A lumpy low-poly boulder (the same lumps every time). */
function rock() {
  if (rockGeometry) return rockGeometry;
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const rand = mulberry32(5);
  const position = geometry.getAttribute('position');
  const lumps = new Map();
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!lumps.has(key)) lumps.set(key, 0.88 + rand() * 0.2);
    v.multiplyScalar(lumps.get(key));
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  rockGeometry = geometry;
  return geometry;
}

/** Twelve white spikes, one along each icosahedron corner, in one geometry. */
function spikes() {
  if (spikeGeometry) return spikeGeometry;
  const corners = new THREE.IcosahedronGeometry(1, 0).getAttribute('position');
  const seen = new Set();
  const parts = [];
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  for (let i = 0; i < corners.count; i += 1) {
    dir.fromBufferAttribute(corners, i).normalize();
    const key = dir.toArray().map((n) => n.toFixed(2)).join();
    if (seen.has(key)) continue;
    seen.add(key);
    const cone = new THREE.ConeGeometry(0.26, 0.8, 10);
    cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    cone.translate(dir.x * 1.2, dir.y * 1.2, dir.z * 1.2);
    parts.push(cone);
  }
  spikeGeometry = mergeGeometries(parts);
  return spikeGeometry;
}

/** The axe an Axe Ball swings: a wooden handle out from the ball and a steel head, edge leading the swing. */
function axeModel(radius) {
  const group = new THREE.Group();
  const reach = radius + 6.5; // the blade's middle, as in the simulation
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, reach + 1.5 - radius * 0.4, 10),
    new THREE.MeshStandardMaterial({ color: '#5e3a1f', roughness: 0.7 }),
  );
  handle.rotation.z = -Math.PI / 2;
  handle.position.x = (reach + 1.5 + radius * 0.4) / 2;
  group.add(handle);
  const shape = new THREE.Shape();
  shape.moveTo(-2, 0);
  shape.lineTo(2, 0);
  shape.lineTo(3.9, 5.4);
  shape.quadraticCurveTo(0, 7.8, -3.9, 5.4);
  shape.lineTo(-2, 0);
  const head = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.2, bevelSegments: 2, curveSegments: 12 }),
    new THREE.MeshStandardMaterial({ color: '#cfd8e3', roughness: 0.28, metalness: 0.85 }),
  );
  head.geometry.translate(0, 0.3, -0.45);
  head.position.x = reach;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 8), handle.material);
  cap.position.x = reach + 1.5;
  group.add(cap);
  return group;
}

// ---- HP numbers on the balls --------------------------------------------------------------------------
const numberTextures = new Map();
/** White outlined number texture, shared by every ball showing that number. */
export function numberTexture(text, fill = '#ffffff', stroke = '#14161c') {
  const key = `${text}|${fill}|${stroke}`;
  if (numberTextures.has(key)) return numberTextures.get(key);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `900 88px ${DISPLAY_FONT}`;
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width + 40);
  canvas.height = 120;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 16;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, canvas.width / 2, 62);
  ctx.fillStyle = fill;
  ctx.fillText(text, canvas.width / 2, 62);
  const entry = { texture: canvasTexture(canvas), aspect: canvas.width / canvas.height };
  numberTextures.set(key, entry);
  if (numberTextures.size > 400) {
    const [oldest] = numberTextures.keys();
    numberTextures.get(oldest).texture.dispose();
    numberTextures.delete(oldest);
  }
  return entry;
}

const LOOKS = {
  electric: { roughness: 0.3, metalness: 0.1, glow: 1.2 },
  charge: { roughness: 0.3, metalness: 0.1, glow: 0.6 },
  cell: { roughness: 0.25, metalness: 0, glow: 0.5 },
  axe: { roughness: 0.32, metalness: 0.45, glow: 2.2 },
  snake: { roughness: 0.55, metalness: 0, glow: 0 },
  spike: { roughness: 0.35, metalness: 0.05, glow: 0 },
  fire: { roughness: 0.4, metalness: 0, glow: 1.4 },
  rock: { roughness: 0.95, metalness: 0, glow: 0 },
};

/**
 * A ball of `kind`, `radius` sim units. Returns { group, setRadius(r), setHp(hp), setAxe(dx, dy),
 * setState({ frozen, burning, charge 0..1 }), flash(), update(dt, time, vx, vy), showLabel(shown), dispose() }.
 * `group` sits at the ball's centre; the body inside it rolls as it moves.
 */
export function createBallModel(kind, radius) {
  const look = LOOKS[kind] ?? LOOKS.electric;
  const skin = skinOf(kind);
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const material = new THREE.MeshStandardMaterial({
    map: skin.map, emissiveMap: skin.glow, emissive: '#ffffff', emissiveIntensity: look.glow,
    roughness: look.roughness, metalness: look.metalness, flatShading: kind === 'rock',
  });
  const ball = new THREE.Mesh(kind === 'rock' ? rock() : sphereGeometry, material);
  if (kind === 'snake') ball.scale.set(1, 1.06, 0.96);
  body.add(ball);
  const extras = [material];

  if (kind === 'spike') {
    const spikeMaterial = new THREE.MeshStandardMaterial({ color: '#f4f6fb', roughness: 0.35 });
    body.add(new THREE.Mesh(spikes(), spikeMaterial));
    extras.push(spikeMaterial);
  }
  if (kind === 'cell') {
    const membrane = new THREE.MeshStandardMaterial({ color: '#a6f59a', transparent: true, opacity: 0.28, roughness: 0.15, depthWrite: false });
    const shell = new THREE.Mesh(sphereGeometry, membrane);
    shell.scale.setScalar(1.12);
    body.add(shell);
    extras.push(membrane);
  }
  let axe = null;
  if (kind === 'axe') {
    axe = axeModel(radius);
    group.add(axe);
    axe.traverse((child) => { if (child.material) extras.push(child.material); });
  }

  // Soft shadow on the box's back wall, down and to the right of the ball: it sells the depth.
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: dotTexture(), color: '#000000', transparent: true, opacity: 0.5, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
  group.add(shadow);
  extras.push(shadowMaterial);

  // State shells: a white flash on hits, ice while frozen, a halo for charge and flames for fire.
  const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  group.add(flashSprite);
  extras.push(flashSprite.material);
  const iceMaterial = new THREE.MeshStandardMaterial({ color: '#c8f4ff', emissive: '#4fc8ff', emissiveIntensity: 0.35, transparent: true, opacity: 0.55, roughness: 0.08, depthWrite: false });
  const ice = new THREE.Mesh(sphereGeometry, iceMaterial);
  ice.visible = false;
  group.add(ice);
  extras.push(iceMaterial);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: kind === 'fire' ? '#ff7a1a' : '#7ff8ff', blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  group.add(halo);
  extras.push(halo.material);
  const flames = [0, 1, 2].map((i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: i ? '#ffb020' : '#ff5a10', blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
    group.add(sprite);
    extras.push(sprite.material);
    return sprite;
  });

  const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
  label.renderOrder = 12;
  group.add(label);
  extras.push(label.material);

  let r = radius;
  let shownHp = null;
  let flashLeft = 0;
  let state = { frozen: false, burning: false, charge: 0 };

  const setRadius = (next) => {
    r = next;
    body.scale.setScalar(r);
    ice.scale.setScalar(r * 1.2);
    shadow.position.set(r * 0.3, -r * 0.45, -(r + 0.9) + 0.15);
    shadow.scale.setScalar(r * 2.6);
    label.position.set(0, 0, r + 1.5);
    const height = Math.max(6.5, r * 1.05);
    if (shownHp !== null) label.scale.set(height * numberTexture(shownHp).aspect, height, 1);
  };
  const setHp = (hp) => {
    const text = String(Math.max(0, Math.ceil(hp)));
    if (text === shownHp) return;
    shownHp = text;
    const entry = numberTexture(text);
    label.material.map = entry.texture;
    label.material.needsUpdate = true;
    const height = Math.max(6.5, r * 1.05);
    label.scale.set(height * entry.aspect, height, 1);
  };
  const setAxe = (dx, dy) => { if (axe) axe.rotation.z = Math.atan2(dy, dx); };
  const setState = (next) => { state = next; };
  const flash = () => { flashLeft = 0.18; };

  let roll = 0;
  const update = (dt, time, vx = 0, vy = 0) => {
    // Roll along the way it moves (the snake keeps its face upright; the axe ball's seam stays put).
    if (kind !== 'snake' && kind !== 'axe' && !state.frozen) {
      roll -= (vx * dt) / Math.max(1, r);
      body.rotation.z = roll * 0.5;
      body.rotation.y = Math.sin(time * 0.8 + radius) * 0.25;
    }
    if (kind === 'snake') body.rotation.z = Math.sin(time * 6) * 0.08;
    if (kind === 'cell') body.scale.set(r * (1 + Math.sin(time * 5) * 0.03), r * (1 - Math.sin(time * 5) * 0.03), r);
    if (kind === 'fire') material.emissiveIntensity = look.glow * (0.85 + Math.sin(time * 23) * 0.1 + Math.sin(time * 37) * 0.08);
    if (kind === 'charge') material.emissiveIntensity = 0.4 + state.charge * 2.6;

    flashLeft = Math.max(0, flashLeft - dt);
    flashSprite.material.opacity = (flashLeft / 0.18) * 0.9;
    flashSprite.scale.setScalar(r * 3.2);
    ice.visible = state.frozen;
    if (state.frozen) iceMaterial.emissiveIntensity = 0.3 + Math.sin(time * 18) * 0.15;

    const haloAmount = kind === 'charge' ? state.charge : kind === 'fire' ? 0.45 : 0;
    halo.material.opacity = haloAmount * (0.75 + Math.sin(time * 9) * 0.15);
    halo.scale.setScalar(r * (2.6 + haloAmount * 1.6));

    const burning = state.burning || kind === 'fire';
    flames.forEach((sprite, i) => {
      const phase = time * (3 + i) + i * 2.1;
      const t = phase % 1;
      sprite.material.opacity = burning ? (state.burning ? 0.85 : 0.55) * Math.sin(t * Math.PI) : 0;
      sprite.position.set(Math.sin(phase * 1.7) * r * 0.5, r * (0.2 + t * 1.2), r * 0.6);
      sprite.scale.setScalar(r * (1.3 - t * 0.7));
    });
  };

  const showLabel = (shown) => { label.visible = shown; };
  const dispose = () => {
    group.removeFromParent();
    for (const m of extras) m.dispose();
    shadow.geometry.dispose();
  };

  setRadius(radius);
  return { group, kind, setRadius, setHp, setAxe, setState, flash, update, showLabel, dispose };
}

/** One segment of a Snake Ball's tail (white, shrinking toward the tip). */
export function createTailSegment() {
  const material = new THREE.MeshStandardMaterial({ color: BALLS.snake.color, roughness: 0.55 });
  const mesh = new THREE.Mesh(sphereGeometry, material);
  return { mesh, dispose: () => { mesh.removeFromParent(); material.dispose(); } };
}
