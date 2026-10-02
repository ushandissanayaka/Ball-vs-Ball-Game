import * as THREE from 'three';

// Materials are shared by every mesh that looks the same, so the static batcher can merge those meshes into
// one draw call (it groups by material).
const cache = new Map();

function cached(key, create) {
  if (!cache.has(key)) cache.set(key, create());
  return cache.get(key);
}

/** Lit surface. Options: roughness, metalness, emissive, emissiveIntensity, envMapIntensity, transparent, opacity. */
export function standard(color, options = {}) {
  const { roughness = 0.6, metalness = 0, emissive, emissiveIntensity = 1, envMapIntensity = 1, transparent = false, opacity = 1 } = options;
  return cached(JSON.stringify(['std', color, options]), () => {
    const params = { color, roughness, metalness, envMapIntensity };
    if (emissive) Object.assign(params, { emissive, emissiveIntensity });
    if (transparent) Object.assign(params, { transparent, opacity, depthWrite: false });
    return new THREE.MeshStandardMaterial(params);
  });
}

/** Unlit glowing colour. `intensity` above 1 pushes it past the bloom threshold. */
export function glow(color, intensity = 1.6) {
  return cached(JSON.stringify(['glow', color, intensity]), () =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false }),
  );
}

/** Unlit flat colour (screens, stickers). */
export function flat(color) {
  return cached(JSON.stringify(['flat', color]), () => new THREE.MeshBasicMaterial({ color }));
}
