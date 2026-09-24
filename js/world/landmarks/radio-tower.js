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

  // guy wires from the upper tower to four anchors
  const wire = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.5 });
  for (const [ax, az] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const anchor = V(ax * 22, 0, az * 22);
    g.add(strut(V(ax * half(32), 32, az * half(32)), anchor, 0.025, wire, 3));
    const block = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x7a766c, roughness: 0.9 })); block.position.copy(anchor); g.add(block);
  }
  // the transmitter shed, its generator and the cable up the tower
  const shed = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 4), new THREE.MeshStandardMaterial({ color: 0x8e8a7e, roughness: 0.9 })); walls.position.y = 1.4; shed.add(walls);
  const roofS = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 4.6), new THREE.MeshStandardMaterial({ color: 0x55534e, metalness: 0.4, roughness: 0.6 })); roofS.position.y = 2.9; roofS.rotation.x = 0.08; shed.add(roofS);
  const doorS = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x4f5a4a, roughness: 0.8 })); doorS.position.set(0, 1, 2.05); shed.add(doorS);
  const gen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1), new THREE.MeshStandardMaterial({ color: 0x6f7d4a, roughness: 0.6, metalness: 0.4 })); gen.position.set(3.4, 0.55, 0.5); shed.add(gen);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 8), steel); exhaust.position.set(3.8, 1.5, 0.5); shed.add(exhaust);
  shed.position.set(8, 0, 6); shed.rotation.y = -0.6; g.add(shed);
  g.add(strut(V(5.5, 0.2, 4), V(half(2) * 0.9, 2, half(2) * 0.9), 0.05, wire, 4));
  // a rusty fence round the tower
  const post = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 });
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; if (i === 5) continue; g.add(strut(V(Math.cos(a) * 14, 0, Math.sin(a) * 14), V(Math.cos(a) * 14, 1.6, Math.sin(a) * 14), 0.06, post, 5)); }
  for (let i = 0; i < 20; i++) { if (i === 4 || i === 5) continue; const a = i / 20 * Math.PI * 2, b = (i + 1) / 20 * Math.PI * 2; for (const y of [0.7, 1.4]) g.add(strut(V(Math.cos(a) * 14, y, Math.sin(a) * 14), V(Math.cos(b) * 14, y, Math.sin(b) * 14), 0.015, wire, 3)); }

  g.position.set(site.x, terrainH(site.x, site.z) - 0.2, site.z);
  g.rotation.y = 0.4;
  scene.add(shadowy(g));
  return g;
}
