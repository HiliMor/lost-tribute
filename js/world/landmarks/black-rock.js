// The Black Rock: the 19th-century slave ship stranded deep in the jungle, tilted over,
// holed in its side, masts broken and hung with vines (season 1, "Exodus").
import * as THREE from 'three/webgpu';
import { SITES } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { surfaceH } from '../terrain.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { woodMaterial, strut } from './materials.js';

const L = 38, B = 10, D = 7;
// the ship's yaw, and the compass direction its holed starboard side faces
const YAW = -1.02 + Math.PI;
export const HOLE_SIDE = YAW;

// hull cross-section at station s (0 = stern, 1 = bow)
const halfWidth = (s) => B / 2 * Math.pow(Math.max(0.03, 1 - Math.pow(Math.abs(s * 2 - 1.1) / 1.1, 2.2)), 0.45);
const deckY = (s) => 0.9 * Math.pow(Math.abs(s * 2 - 1), 2) + (s < 0.18 ? (0.18 - s) * 9 : 0);
const depth = (s) => D * (0.7 + 0.3 * Math.sin(Math.PI * s));

function hullGeometry() {
  const NS = 32, NA = 18, pos = [], idx = [];
  for (let i = 0; i <= NS; i++) {
    const s = i / NS, w = halfWidth(s), dy = deckY(s), d = depth(s);
    for (let j = 0; j <= NA; j++) {
      const a = j / NA * 2 - 1, phi = a * Math.PI / 2;
      pos.push((s - 0.5) * L, dy - d * Math.pow(Math.cos(phi), 1.3), w * Math.sin(phi));
    }
  }
  // the hole torn in the starboard side
  const hole = (s, a) => s > 0.4 + 0.035 * Math.sin(a * 17) && s < 0.6 + 0.03 * Math.sin(a * 23 + 1) && a > 0.22 + 0.06 * Math.sin(s * 40) && a < 0.9;
  for (let i = 0; i < NS; i++) for (let j = 0; j < NA; j++) {
    const s = (i + 0.5) / NS, a = (j + 0.5) / NA * 2 - 1;
    if (hole(s, a)) continue;
    const p = i * (NA + 1) + j, q = p + NA + 1;
    idx.push(p, q, p + 1, p + 1, q, q + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function deckGeometry() {
  const pos = [], idx = [];
  const NS = 30;
  for (let i = 0; i <= NS; i++) {
    const s = 0.05 + i / NS * 0.88, w = halfWidth(s) * 0.96, y = deckY(s) - 0.12;
    pos.push((s - 0.5) * L, y, -w, (s - 0.5) * L, y, w);
  }
  for (let i = 0; i < NS; i++) {
    const s = 0.05 + (i + 0.5) / NS * 0.88;
    if (s > 0.44 && s < 0.58) continue;           // collapsed middle of the deck
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createBlackRock(scene) {
  const site = SITES.blackRock;
  const ship = new THREE.Group();
  const hullWood = woodMaterial('#33220f', { planks: 0.42, moss: 0.7 });
  const deckWood = woodMaterial('#4a341d', { planks: 1e3, moss: 0.8 });
  const spar = new THREE.MeshStandardMaterial({ color: 0x2e2114, roughness: 0.95 });
  const rope = new THREE.MeshStandardMaterial({ color: 0x3b3325, roughness: 1 });
  const vineM = new THREE.MeshStandardMaterial({ color: 0x2c4219, roughness: 0.9 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x31501d, roughness: 0.9, flatShading: true });

  ship.add(new THREE.Mesh(hullGeometry(), hullWood));
  ship.add(new THREE.Mesh(deckGeometry(), deckWood));
  // her name carved across the stern, as the survivors first saw it ("Exodus")
  const nameTex = canvasTex(512, 96, (c, W, H) => {
    c.fillStyle = '#2a1c0e'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#8a7650'; c.font = '700 60px Georgia, serif'; c.textAlign = 'center'; c.fillText('BLACK ROCK', W / 2, 68);
    c.fillStyle = 'rgba(30,50,20,.45)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * W, Math.random() * H, 4 + Math.random() * 30, 2 + Math.random() * 8);
  });
  const nameBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.42), new THREE.MeshStandardMaterial({ map: nameTex, roughness: 1 }));
  nameBoard.position.set(-L / 2 - 0.15, deckY(0) - 1.1, 0); nameBoard.rotation.y = -Math.PI / 2; ship.add(nameBoard);
  // ribs visible through the hole
  for (let i = 0; i < 6; i++) {
    const s = 0.42 + i * 0.035, x = (s - 0.5) * L, w = halfWidth(s);
    ship.add(strut(new THREE.Vector3(x, deckY(s) - 0.2, w * 0.98), new THREE.Vector3(x, deckY(s) - depth(s) * 0.8, w * 0.55), 0.14, spar));
  }

  // masts: fore and mizzen standing, main mast snapped
  const masts = [[0.74, 17, 0.05], [0.5, 8.5, -0.12], [0.26, 13, 0.1]];
  const tops = [];
  for (const [s, h, lean] of masts) {
    const x = (s - 0.5) * L, base = new THREE.Vector3(x, deckY(s) - 1, 0);
    const top = new THREE.Vector3(x + lean * h, deckY(s) + h, lean * 2);
    ship.add(strut(base, top, 0.32, spar, 8));
    tops.push(top);
    if (h > 10) {
      // yards (cross spars), one hanging askew
      for (const [yy, span, tilt] of [[h * 0.55, 7, 0.08], [h * 0.85, 5, -0.35]]) {
        const c = new THREE.Vector3(x + lean * yy, deckY(s) + yy, lean * 2);
        ship.add(strut(c.clone().add(new THREE.Vector3(0, -span * Math.sin(tilt), -span)), c.clone().add(new THREE.Vector3(0, span * Math.sin(tilt), span)), 0.13, spar, 6));
      }
    }
  }
  // rigging from the mast tops down to the rails
  for (const top of tops) {
    for (const side of [-1, 1]) for (const dx of [-3, 2]) {
      const s = (top.x + dx) / L + 0.5;
      ship.add(strut(top, new THREE.Vector3(top.x + dx, deckY(s), side * halfWidth(s) * 0.95), 0.03, rope, 4));
    }
  }
  // vines hanging from the rails and yards, and leaves taking over the deck
  for (let i = 0; i < 46; i++) {
    const s = R(0.08, 0.92), side = R(0, 1) < 0.5 ? -1 : 1, len = R(1.5, 5.5);
    const p0 = new THREE.Vector3((s - 0.5) * L, deckY(s), side * halfWidth(s));
    ship.add(strut(p0, p0.clone().add(new THREE.Vector3(R(-0.3, 0.3), -len, side * R(0, 0.4))), 0.05, vineM, 4));
  }
  for (let i = 0; i < 26; i++) {
    const s = R(0.06, 0.94);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(R(0.6, 1.4), 0), leafM);
    leaf.position.set((s - 0.5) * L, deckY(s) + 0.2, R(-0.8, 0.8) * halfWidth(s));
    ship.add(leaf);
  }

  // the hold's cargo spilled onto the ground: crates of old dynamite packed in straw ("Exodus"),
  // barrels and the rusted chains and shackles of the slaves
  const crateM = new THREE.MeshStandardMaterial({ color: 0xa58658, roughness: 1 });
  const straw = new THREE.MeshStandardMaterial({ color: 0xb59a5a, roughness: 1 });
  const stick = new THREE.MeshStandardMaterial({ color: 0xc8402c, roughness: 0.7 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a2a22, metalness: 0.6, roughness: 0.7 });
  const cargo = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 1), crateM); box.position.y = 0.37; c.add(box);
    if (i % 2 === 0) {
      const fill = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.85), straw); fill.position.y = 0.72; c.add(fill);
      for (let k = 0; k < 5; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), stick); d.rotation.z = Math.PI / 2; d.position.set(R(-0.4, 0.4), 0.8, R(-0.3, 0.3)); c.add(d); }
    }
    c.position.set(R(-8, 8), 0, R(9, 16)); c.rotation.set(R(-0.1, 0.1), R(0, 6.28), R(-0.15, 0.15)); cargo.add(c);
  }
  for (let i = 0; i < 5; i++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1, 12), crateM);
    barrel.position.set(R(-10, 10), 0.5, R(8, 18)); if (i % 2) { barrel.rotation.z = Math.PI / 2; barrel.position.y = 0.45; } cargo.add(barrel);
  }
  for (let i = 0; i < 4; i++) {
    const x0 = R(-6, 6), z0 = R(10, 15);
    for (let k = 0; k < 10; k++) { const link = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 5, 10), iron); link.position.set(x0 + k * 0.13, 0.05, z0 + Math.sin(k) * 0.1); link.rotation.set(Math.PI / 2, k % 2 ? Math.PI / 2 : 0, 0); cargo.add(link); }
  }
  cargo.position.set(site.x, 0, site.z); cargo.rotation.y = HOLE_SIDE;   // spilled out of the hole
  // set each piece down on the ground as drawn
  const up = new THREE.Vector3(0, 1, 0);
  for (const c of cargo.children) {
    const w = c.position.clone().applyAxisAngle(up, HOLE_SIDE);
    c.position.y += surfaceH(site.x + w.x, site.z + w.z);
  }
  scene.add(shadowy(cargo));

  // tilted over on its side, keel buried in the jungle floor
  // broadside (and the hole) turned towards the low afternoon sun
  ship.rotation.set(0.05, YAW, 0.22, 'YXZ');
  ship.position.set(site.x, terrainH(site.x, site.z) + 4.6, site.z);
  scene.add(shadowy(ship));
  return ship;
}
