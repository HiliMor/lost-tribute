// The radio tower on the western plateau, where Rousseau's distress call looped
// for sixteen years (seasons 1 and 3). A red light blinks at the top.
import * as THREE from 'three/webgpu';
import { vec3, fract, step } from 'three/tsl';
import { SITES } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { shadowy } from '../../core/utils.js';
import { uT, uNight } from '../../core/uniforms.js';
import { strut } from './materials.js';

export function createRadioTower(scene) {
  const site = SITES.radio;
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x5d5a55, roughness: 0.6, metalness: 0.55 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const H = 44, b = 3.4, t = 0.55;
  const half = (y) => b + (t - b) * (y / H);          // half-width of the tower at height y

  // four legs
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (const [cx, cz] of corners) g.add(strut(V(cx * b, 0, cz * b), V(cx * t, H, cz * t), 0.14, steel, 6));
  // zig-zag bracing on every face
  const step_ = 3.6;
  for (let y = 0; y < H - 1; y += step_) {
    const y2 = Math.min(H, y + step_), w1 = half(y), w2 = half(y2);
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k], [bx, bz] = corners[(k + 1) % 4];
      g.add(strut(V(ax * w1, y, az * w1), V(bx * w2, y2, bz * w2), 0.05, steel, 4));
      g.add(strut(V(ax * w2, y2, az * w2), V(bx * w2, y2, bz * w2), 0.05, steel, 4));
    }
  }
  // platform and antenna mast
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.4), steel);
  deck.position.y = H; g.add(deck);
  g.add(strut(V(0, H, 0), V(0, H + 7, 0), 0.08, steel, 6));
  // blinking red light
  const redM = new THREE.MeshBasicNodeMaterial();
  redM.colorNode = vec3(1.0, 0.08, 0.05).mul(step(0.55, fract(uT.mul(0.8))).mul(uNight.mul(5.0).add(1.5)).add(0.15));
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), redM);
  red.position.y = H + 7.3; g.add(red);

  g.position.set(site.x, terrainH(site.x, site.z) - 0.2, site.z);
  g.rotation.y = 0.4;
  scene.add(shadowy(g));
  return g;
}
