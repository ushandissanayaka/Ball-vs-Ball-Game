import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BALLS } from '../../shared/balls.js';
import { dotTexture } from '../../effects/glowTextures.js';
import { canvasTexture, DISPLAY_FONT } from '../../util/canvasText.js';
import { mulberry32 } from '../../util/random.js';

/*
 * The 3D balls that fight in the duel box. Each is a lit sphere wearing a painted skin (an equirectangular
 * canvas: the ball's front, which faces the camera, is at a quarter of the way across), with a glow map for
 * the parts that shine, plus what makes its kind: the axe it swings, its spear, fangs, virus knobs, the thief's
 * knives, a jelly membrane, a burst's glow.
 * They live in the box's fight layer, so sizes and positions are in duel-simulation units (radius ~7).
 */

const SKIN_W = 512;
const SKIN_H = 256;
const CX = SKIN_W / 4; // the front of the ball
const CY = SKIN_H / 2;

const skins = {};
const sphereGeometry = new THREE.SphereGeometry(1, 40, 28);

/** The Verity Ball's face: a wide smile, or (transformed) heavy-lidded eyes under flat brows and a flat mouth. */
function paintVerityFace(c, grim) {
  c.fillStyle = '#16140a';
  c.strokeStyle = '#16140a';
  c.lineCap = 'round';
  if (!grim) {
    for (const side of [-1, 1]) {
      c.beginPath();
      c.ellipse(CX + side * 20, CY - 20, 8, 15, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(CX - 46, CY + 2);
    c.quadraticCurveTo(CX, CY + 58, CX + 46, CY + 2);
    c.stroke();
    // Little cheek ends on the smile.
    c.lineWidth = 6;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(CX + side * 52, CY - 6);
      c.lineTo(CX + side * 40, CY + 8);
      c.stroke();
    }
    return;
  }
  for (const side of [-1, 1]) {
    // Half-shut eyes: a white sliver under a dark lid, and a thick flat brow over it.
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(CX + side * 24, CY - 16, 16, 9, 0, 0, Math.PI);
    c.fill();
    c.fillStyle = '#16140a';
    c.beginPath();
    c.ellipse(CX + side * 24 + side * 3, CY - 13, 6, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(CX + side * 8, CY - 18);
    c.lineTo(CX + side * 42, CY - 20);
    c.stroke();
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(CX + side * 6, CY - 32);
    c.quadraticCurveTo(CX + side * 26, CY - 40, CX + side * 44, CY - 30);
    c.stroke();
  }
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(CX - 18, CY + 30);
  c.quadraticCurveTo(CX, CY + 24, CX + 18, CY + 30);
  c.stroke();
}

function paintSkin(kind) {
  const ballKind = kind === 'verity-grim' ? 'verity' : kind;
  const color = document.createElement('canvas');
  const glowCanvas = document.createElement('canvas');
  color.width = glowCanvas.width = SKIN_W;
  color.height = glowCanvas.height = SKIN_H;
  const c = color.getContext('2d');
  const g = glowCanvas.getContext('2d');
  c.fillStyle = BALLS[ballKind].color;
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
    case 'verity':
    case 'verity-grim': {
      // A soft lime shade toward the back, as on the reference ball.
      const shade = c.createRadialGradient(CX, CY, 30, CX, CY, 260);
      shade.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shade.addColorStop(1, 'rgba(150, 190, 20, 0.45)');
      c.fillStyle = shade;
      c.fillRect(0, 0, SKIN_W, SKIN_H);
      paintVerityFace(c, kind === 'verity-grim');
      break;
    }
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
    case 'spear':
    case 'hook': {
      // The glowing seam: a crescent down the right side of the face (orange on the axe, green on the spear,
      // yellow on the hook).
      const seam = { axe: ['#ff4a00', '#ff9a3a', '#ffc070'], spear: ['#2aff2a', '#7dff5a', '#c6ff9a'], hook: ['#ffb000', '#ffd23a', '#fff09a'] }[kind];
      for (const [ctx, width, stroke] of [[g, 26, seam[0]], [c, 12, seam[1]], [g, 10, seam[2]]]) {
        ctx.lineCap = 'round';
        ctx.lineWidth = width;
        ctx.strokeStyle = stroke;
        ctx.beginPath();
        ctx.moveTo(CX + 30, 14);
        ctx.quadraticCurveTo(CX + 52, CY, CX + 30, SKIN_H - 14);
        ctx.stroke();
      }
      break;
    }
    case 'laser': {
      // Deep violet, glowing all over and brightest in the middle of the face.
      const core = g.createRadialGradient(CX, CY, 4, CX, CY, 120);
      core.addColorStop(0, '#d9a8ff');
      core.addColorStop(0.5, '#5a1aa0');
      core.addColorStop(1, '#3a0d70');
      g.fillStyle = core;
      g.fillRect(0, 0, SKIN_W, SKIN_H);
      break;
    }
    case 'virus':
      // Darker green blotches.
      for (let i = 0; i < 26; i += 1) circle(c, rand() * SKIN_W, rand() * SKIN_H, 5 + rand() * 12, 'rgba(20, 90, 25, 0.35)');
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
    case 'thief': {
      // A dark mask across the face, its knot at the left, and one bright slanted eye in it on the right.
      c.fillStyle = '#23263f';
      c.beginPath();
      c.moveTo(CX - 120, CY + 6);
      c.lineTo(CX + 90, CY - 70);
      c.lineTo(CX + 112, CY - 22);
      c.lineTo(CX - 104, CY + 50);
      c.closePath();
      c.fill();
      c.fillRect(CX - 128, CY + 6, 26, 30);
      const eye = (ctx, fill) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(CX + 18, CY - 14);
        ctx.lineTo(CX + 70, CY - 46);
        ctx.lineTo(CX + 58, CY - 20);
        ctx.closePath();
        ctx.fill();
      };
      eye(c, '#ffffff');
      eye(g, '#c9d4ff');
      break;
    }
    case 'burst': {
      // A fat yellow plus on the face.
      const plus = (ctx, fill, grow = 0) => {
        ctx.fillStyle = fill;
        ctx.fillRect(CX - 17 - grow, CY - 52 - grow, 34 + grow * 2, 104 + grow * 2);
        ctx.fillRect(CX - 52 - grow, CY - 17 - grow, 104 + grow * 2, 34 + grow * 2);
      };
      plus(c, '#e2a414', 3);
      plus(c, '#ffd84a');
      plus(g, '#ffcc40');
      break;
    }
    case 'spider':
      // A white web over the face.
      paintWeb(c, CX, CY, 92, 8, 5);
      break;
    default:
  }
  return { map: canvasTexture(color), glow: canvasTexture(glowCanvas) };
}

const skinOf = (kind) => (skins[kind] ??= paintSkin(kind));

/** A cobweb round (x, y): `spokes` threads out to `radius`, and four rings that sag between them. */
function paintWeb(c, x, y, radius, spokes, width) {
  c.strokeStyle = '#ffffff';
  c.lineJoin = 'round';
  c.lineWidth = width;
  for (let i = 0; i < spokes; i += 1) {
    const a = (i / spokes) * Math.PI * 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    c.stroke();
  }
  c.lineWidth = width * 0.8;
  for (const ring of [0.22, 0.46, 0.7, 0.94]) {
    const d = ring * radius;
    c.beginPath();
    for (let i = 0; i <= spokes; i += 1) {
      const a = (i / spokes) * Math.PI * 2;
      const mid = a - Math.PI / spokes;
      if (i === 0) c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      else c.quadraticCurveTo(x + Math.cos(mid) * d * 0.8, y + Math.sin(mid) * d * 0.8, x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    c.stroke();
  }
}

let webCanvasTexture = null;
/** A white cobweb on a clear background, laid over a ball a Spider Ball has webbed. */
function webTexture() {
  if (webCanvasTexture) return webCanvasTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  paintWeb(canvas.getContext('2d'), 128, 128, 124, 10, 3);
  webCanvasTexture = canvasTexture(canvas);
  return webCanvasTexture;
}

/** The Spear Ball's spear: a long wooden shaft along +x with a steel head, its tip at `x = 0` (moved out to reach). */
function spearModel() {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 22, 8), new THREE.MeshStandardMaterial({ color: '#6b4325', roughness: 0.7 }));
  shaft.rotation.z = -Math.PI / 2;
  shaft.position.x = -11 - 3.4;
  group.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(1.9, 5.5, 4), new THREE.MeshStandardMaterial({ color: '#d8e0ea', roughness: 0.25, metalness: 0.85 }));
  head.rotation.z = -Math.PI / 2;
  head.position.x = -2.75;
  group.add(head);
  return group;
}

/** Two white fangs under a Vampire Ball (unit size: scaled with the ball). */
function fangsModel() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.3 });
  for (const side of [-1, 1]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 8), material);
    fang.rotation.z = Math.PI; // pointing down
    fang.position.set(side * 0.3, -1.05, 0.45);
    group.add(fang);
  }
  return group;
}

let knobsGeometry = null;
/** The Virus Ball's knobs: short stalks with round tips all over a unit sphere, in one geometry. */
function virusKnobs() {
  if (knobsGeometry) return knobsGeometry;
  const corners = new THREE.IcosahedronGeometry(1, 0).getAttribute('position');
  const seen = new Set();
  const parts = [];
  const dir = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < corners.count; i += 1) {
    dir.fromBufferAttribute(corners, i).normalize();
    const key = dir.toArray().map((n) => n.toFixed(2)).join();
    if (seen.has(key)) continue;
    seen.add(key);
    const turn = new THREE.Quaternion().setFromUnitVectors(upAxis, dir);
    parts.push(
      new THREE.CylinderGeometry(0.07, 0.07, 0.32, 6).applyQuaternion(turn).translate(dir.x * 1.12, dir.y * 1.12, dir.z * 1.12),
      new THREE.SphereGeometry(0.13, 8, 6).translate(dir.x * 1.3, dir.y * 1.3, dir.z * 1.3),
    );
  }
  knobsGeometry = mergeGeometries(parts);
  return knobsGeometry;
}

/** A small knife (blade up), for the ones a Thief Ball carries over its head. */
function knifeModel(material) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 3.4);
  shape.lineTo(0.75, 0.4);
  shape.lineTo(0, 0);
  shape.lineTo(-0.75, 0.4);
  shape.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), material);
  blade.position.z = -0.15;
  group.add(blade);
  return group;
}

/** The Hook Ball's hook on a short chain, hanging ready over the ball while it isn't thrown. */
function readyHookModel() {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa3b2', roughness: 0.3, metalness: 0.8 });
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), new THREE.MeshStandardMaterial({ color: '#2b2f38', roughness: 0.5, metalness: 0.6 }));
  chain.position.y = 1.6;
  group.add(chain);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.38, 6, 12, Math.PI * 1.3), steel);
  hook.position.y = 4.2;
  hook.rotation.z = Math.PI * 0.85;
  group.add(hook);
  return group;
}

/** The axe an Axe Ball swings: a wooden handle out from the ball and a steel head, edge leading the swing. */
function axeModel(radius) {
  const group = new THREE.Group();
  const reach = radius + 7.5; // the blade's middle, as in the simulation
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

// `coat`: a glossy clear coat over the paint (it catches the sky's reflection, so the balls read as round and
// shiny, like the reference).
const LOOKS = {
  verity: { roughness: 0.32, metalness: 0, glow: 0, coat: 1 },
  electric: { roughness: 0.28, metalness: 0.1, glow: 1.2, coat: 1 },
  charge: { roughness: 0.28, metalness: 0.1, glow: 0.6, coat: 1 },
  cell: { roughness: 0.22, metalness: 0, glow: 0.5, coat: 1 },
  axe: { roughness: 0.3, metalness: 0.45, glow: 2.2, coat: 0.8 },
  thief: { roughness: 0.3, metalness: 0.05, glow: 1.6, coat: 1 },
  burst: { roughness: 0.3, metalness: 0, glow: 0.35, coat: 1 },
  spider: { roughness: 0.34, metalness: 0.05, glow: 0, coat: 1 },
  laser: { roughness: 0.25, metalness: 0.1, glow: 1.4, coat: 1 },
  spear: { roughness: 0.3, metalness: 0.45, glow: 2.2, coat: 0.8 },
  hook: { roughness: 0.3, metalness: 0.45, glow: 2.2, coat: 0.8 },
  vampire: { roughness: 0.3, metalness: 0, glow: 0, coat: 1 },
  poison: { roughness: 0.3, metalness: 0, glow: 0, coat: 1 },
  virus: { roughness: 0.35, metalness: 0, glow: 0, coat: 0.8 },
  snake: { roughness: 0.45, metalness: 0, glow: 0, coat: 0.7 },
};

/**
 * A ball of `kind`, `radius` sim units. Returns { group, setRadius(r), setHp(hp), setAxe(dx, dy),
 * setSpear(dx, dy, ext 0..1), setKnives(n), setHookReady(ready), setState({ frozen, webbed, burst, sick,
 * charge 0..1, transformed }), flash(), update(dt, time, vx, vy), showLabel(shown), dispose() }.
 * `group` sits at the ball's centre; the body inside it rolls as it moves.
 */
export function createBallModel(kind, radius) {
  const look = LOOKS[kind] ?? LOOKS.electric;
  const skin = skinOf(kind);
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const material = new THREE.MeshPhysicalMaterial({
    map: skin.map, emissiveMap: skin.glow, emissive: '#ffffff', emissiveIntensity: look.glow,
    roughness: look.roughness, metalness: look.metalness,
    clearcoat: look.coat, clearcoatRoughness: 0.12, envMapIntensity: 1.25,
  });
  const ball = new THREE.Mesh(sphereGeometry, material);
  body.add(ball);
  const extras = [material];

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
  // Parts that don't roll with the ball hang off `fixed` (scaled with the ball); the rest roll with `body`.
  const fixed = new THREE.Group();
  group.add(fixed);
  const own = (object) => object.traverse((child) => { if (child.material && !extras.includes(child.material)) extras.push(child.material); });
  let spear = null;
  if (kind === 'spear') {
    spear = new THREE.Group();
    const model = spearModel();
    spear.add(model);
    group.add(spear);
    own(spear);
    spear.userData.model = model;
  }
  if (kind === 'vampire') {
    const fangs = fangsModel();
    fixed.add(fangs);
    own(fangs);
  }
  if (kind === 'virus') {
    const knobMaterial = new THREE.MeshStandardMaterial({ color: '#2f8f2a', roughness: 0.45 });
    body.add(new THREE.Mesh(virusKnobs(), knobMaterial));
    extras.push(knobMaterial);
  }
  const knives = [];
  if (kind === 'thief') {
    const steel = new THREE.MeshStandardMaterial({ color: '#d7dee8', roughness: 0.25, metalness: 0.8 });
    extras.push(steel);
    for (let i = 0; i < 3; i += 1) {
      const knife = knifeModel(steel);
      knife.rotation.z = 0.5 - i * 0.18; // fanned, leaning back
      knife.scale.setScalar(1.7);
      group.add(knife);
      knives.push(knife);
    }
  }
  let readyHook = null;
  if (kind === 'hook') {
    readyHook = readyHookModel();
    group.add(readyHook);
    own(readyHook);
  }

  // Soft shadow on the box's back wall, down and to the right of the ball: it sells the depth.
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: dotTexture(), color: '#000000', transparent: true, opacity: 0.5, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
  group.add(shadow);
  extras.push(shadowMaterial);

  // A soft white glint up and to the left of the ball's face (it stays put while the ball rolls): the round,
  // glossy look of the reference balls.
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(), color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  group.add(glint);
  extras.push(glint.material);

  // State shells: a white flash on hits, ice while frozen, a web while webbed, a halo for charge and bursts.
  const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  group.add(flashSprite);
  extras.push(flashSprite.material);
  const iceMaterial = new THREE.MeshStandardMaterial({ color: '#c8f4ff', emissive: '#4fc8ff', emissiveIntensity: 0.35, transparent: true, opacity: 0.55, roughness: 0.08, depthWrite: false });
  const ice = new THREE.Mesh(sphereGeometry, iceMaterial);
  ice.visible = false;
  group.add(ice);
  extras.push(iceMaterial);
  const web = new THREE.Sprite(new THREE.SpriteMaterial({ map: webTexture(), transparent: true, opacity: 0.9, depthWrite: false }));
  web.visible = false;
  group.add(web);
  extras.push(web.material);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: kind === 'burst' ? '#ff9a1a' : kind === 'laser' ? '#c04dff' : '#7ff8ff', blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  group.add(halo);
  extras.push(halo.material);
  // Poisoned or infected: a green glow round the ball.
  const sick = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#4dff3a', blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  sick.visible = false;
  group.add(sick);
  extras.push(sick.material);

  const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
  label.renderOrder = 12;
  group.add(label);
  extras.push(label.material);

  let r = radius;
  let shownHp = null;
  let flashLeft = 0;
  let state = { frozen: false, webbed: false, burst: false, sick: false, charge: 0, transformed: false };
  let grim = false;

  const setRadius = (next) => {
    r = next;
    body.scale.setScalar(r);
    ice.scale.setScalar(r * 1.2);
    fixed.scale.setScalar(r);
    knives.forEach((knife, i) => knife.position.set(-r * 0.35 + i * r * 0.32, r * 0.95, r * 0.2));
    if (readyHook) readyHook.position.set(0, r * 0.9, 0);
    web.scale.setScalar(r * 2.7);
    web.position.z = r * 0.3;
    shadow.position.set(r * 0.3, -r * 0.45, -(r + 0.9) + 0.15);
    shadow.scale.setScalar(r * 2.6);
    label.position.set(0, 0, r + 1.5);
    glint.position.set(-r * 0.38, r * 0.42, r * 0.95);
    glint.scale.setScalar(r * 0.7);
    const height = Math.max(6.5, r * 1.05);
    if (shownHp !== null) label.scale.set(height * numberTexture(shownHp).aspect, height, 1);
  };
  const setHp = (hp) => {
    const text = String(Math.max(0, Math.ceil(hp)));
    if (text === shownHp) return;
    shownHp = text;
    const entry = numberTexture(text);
    if (!label.material.map) label.material.needsUpdate = true; // the first map changes the shader; swaps don't
    label.material.map = entry.texture;
    const height = Math.max(6.5, r * 1.05);
    label.scale.set(height * entry.aspect, height, 1);
  };
  const setAxe = (dx, dy) => { if (axe) axe.rotation.z = Math.atan2(dy, dx); };
  /** Points the spear along (dx, dy), its tip `rest` + `ext` (0..1) of the thrust's reach past the ball's edge. */
  const setSpear = (dx, dy, ext) => {
    if (!spear) return;
    spear.rotation.z = Math.atan2(dy, dx);
    spear.userData.model.position.x = r + 9 + ext * 10; // as in the simulation (SPEAR.rest, SPEAR.reach)
  };
  const setKnives = (count) => knives.forEach((knife, i) => { knife.visible = i < count; });
  const setHookReady = (ready) => { if (readyHook) readyHook.visible = ready; };
  const setState = (next) => {
    state = next;
    if (kind === 'verity' && Boolean(next.transformed) !== grim) {
      grim = Boolean(next.transformed);
      material.map = skinOf(grim ? 'verity-grim' : 'verity').map;
      material.needsUpdate = true;
      flashLeft = 0.18;
    }
  };
  const flash = () => { flashLeft = 0.18; };

  let roll = 0;
  const update = (dt, time, vx = 0, vy = 0) => {
    // Roll along the way it moves (faces stay upright; the axe ball's seam stays put).
    const faced = kind === 'verity' || kind === 'thief' || kind === 'snake';
    const seamed = kind === 'axe' || kind === 'spear' || kind === 'hook'; // the seam stays put
    if (!faced && !seamed && !state.frozen) {
      roll -= (vx * dt) / Math.max(1, r);
      body.rotation.z = roll * 0.5;
      body.rotation.y = Math.sin(time * 0.8 + radius) * 0.25;
    }
    if (faced) body.rotation.z = Math.sin(time * 6) * 0.08;
    if (kind === 'verity') body.rotation.y = Math.max(-0.35, Math.min(0.35, vx * 0.004));
    if (kind === 'cell') body.scale.set(r * (1 + Math.sin(time * 5) * 0.03), r * (1 - Math.sin(time * 5) * 0.03), r);
    if (kind === 'burst') material.emissiveIntensity = state.burst ? 1.6 + Math.sin(time * 30) * 0.4 : look.glow;
    if (kind === 'charge') material.emissiveIntensity = 0.4 + state.charge * 2.6;

    flashLeft = Math.max(0, flashLeft - dt);
    flashSprite.material.opacity = (flashLeft / 0.18) * 0.9;
    flashSprite.visible = flashLeft > 0; // a see-through sprite still costs its whole quad to draw
    flashSprite.scale.setScalar(r * 3.2);
    ice.visible = state.frozen;
    if (state.frozen) iceMaterial.emissiveIntensity = 0.3 + Math.sin(time * 18) * 0.15;

    web.visible = state.webbed;
    if (state.webbed) web.material.rotation = Math.sin(time * 2) * 0.15;

    sick.visible = state.sick;
    if (state.sick) {
      sick.material.opacity = 0.55 + Math.sin(time * 7) * 0.2;
      sick.scale.setScalar(r * 3);
    }

    const haloAmount = kind === 'charge' ? state.charge : kind === 'burst' && state.burst ? 0.9 : kind === 'laser' ? 0.45 : 0;
    halo.visible = haloAmount > 0;
    halo.material.opacity = haloAmount * (0.75 + Math.sin(time * 9) * 0.15);
    halo.scale.setScalar(r * (2.6 + haloAmount * 1.6));
  };

  const showLabel = (shown) => { label.visible = shown; };
  const dispose = () => {
    group.removeFromParent();
    for (const m of extras) m.dispose();
    shadow.geometry.dispose();
  };

  setRadius(radius);
  return { group, kind, setRadius, setHp, setAxe, setSpear, setKnives, setHookReady, setState, flash, update, showLabel, dispose };
}
