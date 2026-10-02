import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NEON } from '../config/palette.js';
import { additive, fadeTexture, haloTexture } from './glowTextures.js';
import { glow } from '../util/materials.js';

/**
 * Builds the glowing neon edges of the platforms. Each segment is a bright core bar, a soft halo lying on the
 * floor either side of it, and (on outer edges) glow spilling down the platform's side. All segments of one
 * colour are merged, so the whole map's neon costs three draw calls per colour.
 */
export class NeonBuilder {
  constructor() {
    this.parts = new Map(); // `${kind}|${color}` → geometries
  }

  push(kind, color, geometry) {
    const key = `${kind}|${color}`;
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(geometry);
  }

  /**
   * A neon strip from [ax, az] to [bx, bz] on the floor at height y.
   * outward: [x, z] direction off the platform edge, to add the glow down its side.
   */
  segment([ax, az], [bx, bz], { y, color = NEON.cyan, core = 1.2, height = 0.45, halo = 7, side = 2.6, outward = null } = {}) {
    const length = Math.hypot(bx - ax, bz - az);
    const angle = Math.atan2(-(bz - az), bx - ax);
    const matrix = new THREE.Matrix4().makeRotationY(angle).setPosition((ax + bx) / 2, y, (az + bz) / 2);

    const bar = new THREE.BoxGeometry(length + core, height, core);
    bar.translate(0, height / 2, 0);
    this.push('core', color, bar.applyMatrix4(matrix));

    if (halo) {
      const plane = new THREE.PlaneGeometry(length + core, halo);
      plane.rotateX(-Math.PI / 2);
      plane.translate(0, 0.06, 0);
      this.push('halo', color, plane.applyMatrix4(matrix));
    }
    if (side && outward) {
      // Which local side (±z) faces `outward`: local +z points along (sin angle, cos angle).
      const sign = Math.sign(outward[0] * Math.sin(angle) + outward[1] * Math.cos(angle)) || 1;
      const wall = new THREE.PlaneGeometry(length + core, side);
      wall.translate(0, -side / 2, 0);
      if (sign < 0) wall.rotateY(Math.PI);
      wall.translate(0, 0, sign * (core / 2 + 0.03));
      this.push('side', color, wall.applyMatrix4(matrix));
    }
  }

  /** Neon around a rectangle's edges, inset by half the core so it sits flush with the platform edge. */
  rect(minX, minZ, maxX, maxZ, options = {}, { skip = [] } = {}) {
    const inset = (options.core ?? 1.2) / 2;
    const [x0, x1, z0, z1] = [minX + inset, maxX - inset, minZ + inset, maxZ - inset];
    const edges = {
      n: [[x0, z0], [x1, z0], [0, -1]],
      s: [[x0, z1], [x1, z1], [0, 1]],
      w: [[x0, z0], [x0, z1], [-1, 0]],
      e: [[x1, z0], [x1, z1], [1, 0]],
    };
    for (const [name, [a, b, outward]] of Object.entries(edges)) {
      if (!skip.includes(name)) this.segment(a, b, { ...options, outward });
    }
  }

  build() {
    const group = new THREE.Group();
    group.name = 'neon';
    for (const [key, geometries] of this.parts) {
      const [kind, color] = key.split('|');
      const material =
        kind === 'core' ? glow(color, 1.7)
          : kind === 'halo' ? additive(haloTexture(), color, 0.75)
            : additive(fadeTexture(), color, 0.5);
      const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
      geometries.forEach((geometry) => geometry.dispose());
      if (kind !== 'core') mesh.renderOrder = 2;
      group.add(mesh);
    }
    return group;
  }
}
