import * as THREE from 'three';
import { SEA } from '../../config/palette.js';
import { mulberry32 } from '../../util/random.js';

// The sea: one large disc with a tiling ripple normal map. The ripples catch the sun and reflect the sky, which
// is what makes it read as water. The ripples drift slowly (see addDriftingRipples); the surface itself stays flat.
const SIZE = 256;

/** Tileable ripple heights: a sum of sine waves with whole-number frequencies (so the edges match). */
function rippleHeights(seed) {
  const rand = mulberry32(seed);
  const waves = Array.from({ length: 14 }, () => ({
    fx: Math.floor(rand() * 7) - 3 || 1,
    fy: Math.floor(rand() * 7) - 3 || 2,
    phase: rand() * Math.PI * 2,
    amp: 0.4 + rand() * 0.6,
    sharp: rand() < 0.5,
  }));
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let h = 0;
      for (const wave of waves) {
        const s = Math.sin(((wave.fx * x + wave.fy * y) / SIZE) * Math.PI * 2 * 2 + wave.phase);
        // Sharp waves have pointed crests and wide troughs, like wind ripples.
        h += wave.amp * (wave.sharp ? 1 - Math.abs(s) * 2 : s);
      }
      heights[y * SIZE + x] = h;
    }
  }
  return heights;
}

function createTextures() {
  const heights = rippleHeights(5);
  const at = (x, y) => heights[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
  const normalCanvas = document.createElement('canvas');
  const tintCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = tintCanvas.width = tintCanvas.height = SIZE;
  const normalData = normalCanvas.getContext('2d').createImageData(SIZE, SIZE);
  const tintData = tintCanvas.getContext('2d').createImageData(SIZE, SIZE);
  const strength = 0.35;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const i = (y * SIZE + x) * 4;
      normalData.data[i] = ((-dx / length) * 0.5 + 0.5) * 255;
      normalData.data[i + 1] = ((dy / length) * 0.5 + 0.5) * 255;
      normalData.data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      normalData.data[i + 3] = 255;
      // Crests a touch lighter than troughs.
      const shade = 220 + Math.max(-1, Math.min(1, at(x, y) / 6)) * 30;
      tintData.data[i] = tintData.data[i + 1] = tintData.data[i + 2] = shade;
      tintData.data[i + 3] = 255;
    }
  }
  normalCanvas.getContext('2d').putImageData(normalData, 0, 0);
  tintCanvas.getContext('2d').putImageData(tintData, 0, 0);

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  const tintMap = new THREE.CanvasTexture(tintCanvas);
  tintMap.colorSpace = THREE.SRGBColorSpace;
  return { normalMap, tintMap };
}

// Gentle motion: the ripple map is read twice, at two scales drifting in different directions, and the two
// are blended, so the ripples shimmer and slowly change shape instead of just sliding. Speeds in tiles/second.
const DRIFT_A = new THREE.Vector2(0.018, 0.011);
const DRIFT_B = new THREE.Vector2(-0.012, 0.016);
const SECOND_SCALE = 0.63;
/** 1 = solid water; lower lets more of the mirrored sky and clouds (the reflection) show through. */
const SEA_OPACITY = 0.8;

/** Swaps the normal-map read for the two drifting layers. Returns the offset uniforms to animate. */
function addDriftingRipples(material) {
  const uniforms = { uWaveA: { value: new THREE.Vector2() }, uWaveB: { value: new THREE.Vector2() } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const read = 'texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0';
    const layered =
      `normalize( texture2D( normalMap, vNormalMapUv + uWaveA ).xyz * 2.0 - 1.0 + ` +
      `texture2D( normalMap, vNormalMapUv * ${SECOND_SCALE} + uWaveB ).xyz * 2.0 - 1.0 )`;
    // If a future three.js changes this chunk the replace finds nothing and the sea simply stays still.
    const chunk = THREE.ShaderChunk.normal_fragment_maps.replace(`vec3 mapN = ${read};`, `vec3 mapN = ${layered};`);
    shader.fragmentShader = `uniform vec2 uWaveA;\nuniform vec2 uWaveB;\n${shader.fragmentShader.replace('#include <normal_fragment_maps>', chunk)}`;
  };
  return uniforms;
}

/** The sea mesh; `sea.userData.update(seconds)` moves the ripples (cheap: two uniforms). */
export function createSea({ radius = 5200, tile = 34 } = {}) {
  const { normalMap, tintMap } = createTextures();
  for (const texture of [normalMap, tintMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set((radius * 2) / tile, (radius * 2) / tile);
    texture.anisotropy = 8;
  }
  const material = new THREE.MeshStandardMaterial({
    color: SEA.base,
    map: tintMap,
    normalMap,
    normalScale: new THREE.Vector2(0.38, 0.38),
    // Smooth enough to mirror the sky, so the clouds show in the water, broken up by the drifting ripples.
    // Water reflects mostly at low angles (Fresnel), so looking down from above the water colour and the
    // shadows of the deck and the blobs still read clearly; toward the horizon the clouds take over.
    roughness: 0.1,
    metalness: 0.0,
    envMapIntensity: 1.0,
    // Slightly see-through: the mirrored sky and clouds under the surface show through as their reflection.
    transparent: true,
    opacity: SEA_OPACITY,
  });
  const waves = addDriftingRipples(material);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), material);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  // Drawn after the mirrored clouds below it, before the see-through deck glass above it.
  sea.renderOrder = -1;
  sea.name = 'sea';
  // Offsets wrap at 1 tile so they never grow large enough to lose float precision.
  sea.userData.update = (seconds) => {
    waves.uWaveA.value.set((DRIFT_A.x * seconds) % 1, (DRIFT_A.y * seconds) % 1);
    waves.uWaveB.value.set((DRIFT_B.x * seconds) % 1, (DRIFT_B.y * seconds) % 1);
  };
  return sea;
}
