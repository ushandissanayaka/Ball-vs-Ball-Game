import * as THREE from 'three';

/*
 * A cloud of small glowing billboards (sparks, sparkles) drawn as instanced quads in one draw call. They used to
 * be WebGL points, but Chrome on Windows draws points through ANGLE's slow emulation path: a single point cloud
 * on screen halved the frame rate mid-duel. Quads cost next to nothing.
 */

const vertexShader = /* glsl */ `
uniform float uSize;
attribute vec3 aOffset;
attribute vec3 aColor;
varying vec2 vUv;
varying vec3 vColor;

void main() {
  vUv = uv;
  vColor = aColor;
  // Laid out in view space, so each quad faces the camera and keeps its size whatever the object's scale.
  vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vColor;

void main() {
  vec4 texel = texture2D(uMap, vUv);
  float alpha = texel.a * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor * vColor * texel.rgb, alpha);
  #include <colorspace_fragment>
}
`;

/**
 * `count` billboards, `size` view-space units across (a PointsMaterial's `size` times tan(fov / 2) looks the
 * same), additive. Write each one's place into `offsets` and its tint into `colors` (both x, y, z per
 * billboard; tints start white), then `commit(n)` to draw the first `n` of them. `bounds` (a radius round the
 * object's origin) lets a still cloud be frustum culled; without it the cloud is always drawn.
 */
export function createBillboardCloud(count, { map, size, color = '#ffffff', opacity = 1, bounds = null }) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.getAttribute('position'));
  geometry.setAttribute('uv', quad.getAttribute('uv'));
  const offsets = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3).fill(1);
  const offsetAttribute = new THREE.InstancedBufferAttribute(offsets, 3);
  const colorAttribute = new THREE.InstancedBufferAttribute(colors, 3);
  offsetAttribute.setUsage(THREE.DynamicDrawUsage);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aOffset', offsetAttribute);
  geometry.setAttribute('aColor', colorAttribute);
  geometry.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uSize: { value: size },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  if (bounds) geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), bounds + size);
  else mesh.frustumCulled = false;

  const commit = (n = count) => {
    geometry.instanceCount = n;
    offsetAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  };
  return { mesh, offsets, colors, commit };
}
