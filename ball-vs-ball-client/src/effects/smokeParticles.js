import * as THREE from 'three';
import { mulberry32 } from '../util/random.js';

/*
 * Looping particle effects worked out entirely on the GPU. Each particle is given once, up front: where it
 * starts and ends, when in the loop it is born, how long it lives, its size and colour. Every frame the CPU only
 * sets the time; the vertex shader places, grows, turns and fades every particle from that. So a few hundred
 * particles cost one draw call per field and no per-frame JavaScript, which keeps the animation free of lag.
 */

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPeriod;
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec4 aTiming; // birth, life, start size, end size
attribute vec4 aLook;   // colour (linear rgb), seed
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;

void main() {
  float age = mod(uTime - aTiming.x, uPeriod);
  float p = age / aTiming.y;
  vUv = uv;
  vColor = aLook.rgb;
  if (p > 1.0) {
    vAlpha = 0.0;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // off screen: not born yet, or already gone
    return;
  }
  float e = 1.0 - (1.0 - p) * (1.0 - p); // fast start, slowing down: how puffs of smoke move
  float seed = aLook.w * 6.2831853;
  vec3 center = mix(aStart, aEnd, e);
  // A little curl, growing with age, so the smoke swirls instead of flying straight.
  center.x += sin(seed + age * 3.1) * 0.7 * p;
  center.z += cos(seed * 1.7 + age * 2.6) * 0.7 * p;
  float size = mix(aTiming.z, aTiming.w, e);
  vAlpha = smoothstep(0.0, 0.12, p) * (1.0 - smoothstep(0.5, 1.0, p));

  // Billboard: the quad is laid out in view space, so it always faces the camera, and slowly turns.
  float spin = seed + age * (fract(aLook.w * 13.0) * 2.0 - 1.0) * 1.6;
  vec2 corner = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * (position.xy * size);
  vec4 mv = modelViewMatrix * vec4(center, 1.0);
  mv.xy += corner;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec4 texel = texture2D(uMap, vUv);
  float alpha = texel.a * vAlpha * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor * texel.rgb, alpha);
  #include <colorspace_fragment>
}
`;

/**
 * One looping particle field. `particles`: { start: [x,y,z], end: [x,y,z], birth (s into the loop),
 * life (s), size: [start, end], color }. `field.userData.update(loopSeconds)` moves them all.
 */
export function createParticleField(particles, { map, period, blending = THREE.NormalBlending, opacity = 1 }) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.getAttribute('position'));
  geometry.setAttribute('uv', quad.getAttribute('uv'));

  const count = particles.length;
  const start = new Float32Array(count * 3);
  const end = new Float32Array(count * 3);
  const timing = new Float32Array(count * 4);
  const look = new Float32Array(count * 4);
  const color = new THREE.Color();
  particles.forEach((particle, i) => {
    start.set(particle.start, i * 3);
    end.set(particle.end, i * 3);
    timing.set([particle.birth, particle.life, particle.size[0], particle.size[1]], i * 4);
    color.set(particle.color); // hex (sRGB) to the linear colour the shader works in
    look.set([color.r, color.g, color.b, particle.seed], i * 4);
  });
  geometry.setAttribute('aStart', new THREE.InstancedBufferAttribute(start, 3));
  geometry.setAttribute('aEnd', new THREE.InstancedBufferAttribute(end, 3));
  geometry.setAttribute('aTiming', new THREE.InstancedBufferAttribute(timing, 4));
  geometry.setAttribute('aLook', new THREE.InstancedBufferAttribute(look, 4));
  geometry.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPeriod: { value: period }, uMap: { value: map }, uOpacity: { value: opacity } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; // the particles are placed by the shader, outside the quad's own bounds
  mesh.renderOrder = 5;
  mesh.userData.update = (loopSeconds) => { material.uniforms.uTime.value = loopSeconds; };
  return mesh;
}

/** A soft, lumpy puff of smoke (white; the particle's colour tints it). */
export function puffTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(31);
  for (let i = 0; i < 9; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = i === 0 ? 0 : 14 + rand() * 18;
    const x = 64 + Math.cos(a) * d;
    const y = 64 + Math.sin(a) * d;
    const r = i === 0 ? 46 : 24 + rand() * 16;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Jagged dark shards, like the burnt flakes flying off the effect in the reference. */
export function shardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  const points = [[32, 2], [40, 22], [60, 18], [44, 34], [54, 60], [32, 44], [12, 58], [20, 34], [4, 22], [24, 22]];
  points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
  ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}
