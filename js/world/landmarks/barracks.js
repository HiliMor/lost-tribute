// The Barracks: the DHARMA Initiative's village of small houses around a lawn in the north,
// later home of the Others, ringed by the sonic fence (season 3).
import * as THREE from 'three/webgpu';
import { SITES } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { gableRoof, strut } from './materials.js';

function sidingTexture(hex) {
  return canvasTex(256, 128, (g, W, H) => {
    g.fillStyle = hex; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(60,45,25,.28)'; g.lineWidth = 2;
    for (let y = 6; y < H; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const win = (x) => {
      g.fillStyle = '#f1ead8'; g.fillRect(x - 3, 34, 42, 40);
      g.fillStyle = '#2d3640'; g.fillRect(x, 37, 36, 34);
      g.fillStyle = '#f1ead8'; g.fillRect(x + 16, 37, 3, 34); g.fillRect(x, 52, 36, 3);
    };
    win(26); win(190);
    g.fillStyle = '#6b4a2e'; g.fillRect(112, 44, 32, 84);        // door
    g.fillStyle = '#c9a640'; g.fillRect(137, 86, 4, 4);          // handle
  });
}

export function createBarracks(scene) {
  const site = SITES.barracks;
  const village = new THREE.Group();
  const roofM = new THREE.MeshStandardMaterial({ color: 0x5a3c2a, roughness: 0.85, side: THREE.DoubleSide });
  const trimM = new THREE.MeshStandardMaterial({ color: 0xe9e1cc, roughness: 0.7 });
  const sidings = ['#cdb98a', '#d8c79b', '#bfa979', '#c9b48c', '#d2bf92'].map((h) => new THREE.MeshStandardMaterial({ map: sidingTexture(h), roughness: 0.8 }));

  const brickM = new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.9 });
  const flowerM = [0xc84a5a, 0xe8c040, 0xe0e0e0, 0x8a4ab0].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));

  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2 + R(-0.08, 0.08);
    const x = site.x + Math.cos(a) * 54 * R(0.92, 1.08), z = site.z + Math.sin(a) * 42 * R(0.92, 1.08);
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 7), sidings[i % sidings.length]);
    body.position.y = 2.0; house.add(body);
    const base = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.5, 7.4), trimM);
    base.position.y = 0.25; house.add(base);
    const roof = new THREE.Mesh(gableRoof(10.4, 8.4, 2.3), roofM);
    roof.position.y = 3.6; house.add(roof);
    const porch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 2.2), trimM);
    porch.position.set(0, 0.55, 4.6); house.add(porch);
    for (const px of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 0.15), trimM);
      post.position.set(px, 2.0, 5.5); house.add(post);
    }
    // porch roof, steps, railing, chimney and a flower bed
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 2.5), roofM); porchRoof.position.set(0, 3.5, 4.7); porchRoof.rotation.x = 0.12; house.add(porchRoof);
    for (let k = 0; k < 2; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.4), trimM); st.position.set(0, 0.12 + k * 0.18, 6.05 - k * 0.3); house.add(st); }
    for (const px of [-1.5, 1.5]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2), trimM); rail.position.set(px, 1.5, 4.6); house.add(rail); }
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), brickM); chimney.position.set(2.6, 5.2, -1.2); house.add(chimney);
    for (const px of [-3.2, 3.2]) { const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.6), flowerM[(i + (px > 0 ? 1 : 0)) % flowerM.length]); bed.position.set(px, 0.2, 3.9); house.add(bed); }
    house.position.set(x, terrainH(x, z) + 0.05, z);
    house.rotation.y = Math.atan2(site.x - x, site.z - z);   // front porch faces the lawn
    village.add(house);
  }

  // a gravel path round the lawn, and one out through the gap in the fence
  const gravel = new THREE.MeshStandardMaterial({ color: 0xa89a7e, roughness: 1 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(40, 43, 64), gravel); ring.rotation.x = -Math.PI / 2; ring.scale.set(1.18, 0.9, 1);
  ring.position.set(site.x, terrainH(site.x, site.z) + 0.1, site.z); village.add(ring);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(3, 62), gravel); lane.rotation.x = -Math.PI / 2;
  lane.position.set(site.x, terrainH(site.x, site.z - 70) + 0.12, site.z - 70); village.add(lane);
  // picnic tables and a swing set on the lawn
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.95 });
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const [dx, dz] of [[-8, 4], [6, -6], [10, 8]]) {
    const t = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.9), wood); top.position.y = 0.8; t.add(top);
    for (const z of [-0.75, 0.75]) { const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.3), wood); bench.position.set(0, 0.48, z); t.add(bench); }
    for (const x of [-0.9, 0.9]) { t.add(strut(V3(x, 0, -0.8), V3(x, 0.8, 0.3), 0.05, wood, 4)); t.add(strut(V3(x, 0, 0.8), V3(x, 0.8, -0.3), 0.05, wood, 4)); }
    const x = site.x + dx, z = site.z + dz;
    t.position.set(x, terrainH(x, z), z); t.rotation.y = R(0, 3); village.add(t);
  }
  const swing = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0xc4432f, metalness: 0.5, roughness: 0.5 });
  for (const x of [-2, 2]) { swing.add(strut(V3(x, 0, -1), V3(x, 2.6, 0), 0.06, steel, 6)); swing.add(strut(V3(x, 0, 1), V3(x, 2.6, 0), 0.06, steel, 6)); }
  swing.add(strut(V3(-2, 2.6, 0), V3(2, 2.6, 0), 0.06, steel, 6));
  for (const x of [-1, 1]) { swing.add(strut(V3(x - 0.25, 2.6, 0), V3(x - 0.25, 0.6, 0), 0.01, steel, 3)); swing.add(strut(V3(x + 0.25, 2.6, 0), V3(x + 0.25, 0.6, 0), 0.01, steel, 3)); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.25), wood); seat.position.set(x, 0.6, 0); swing.add(seat); }
  swing.position.set(site.x - 14, terrainH(site.x - 14, site.z - 10), site.z - 10); village.add(swing);
  // two DHARMA vans: blue VW buses with white roofs
  for (const [dx, dz, ry] of [[18, -20, 0.6], [-22, -16, -0.4]]) village.add(dharmaVan(site.x + dx, site.z + dz, ry));

  // the sonic fence: a ring of tall grey pylons
  const pylonM = new THREE.MeshStandardMaterial({ color: 0x7c7f82, roughness: 0.5, metalness: 0.6 });
  const capM = new THREE.MeshStandardMaterial({ color: 0x4c4f53, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < 34; i++) {
    const a = i / 34 * Math.PI * 2;
    if (Math.abs(a - Math.PI * 1.5) < 0.12) continue;          // the gap where the path leaves to the south
    const x = site.x + Math.cos(a) * 112, z = site.z + Math.sin(a) * 100;
    const p = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 5.4, 8), pylonM);
    pole.position.y = 2.7; p.add(pole);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), capM);
    cap.position.y = 5.5; p.add(cap);
    for (const hy of [1.5, 2.6, 3.7, 4.8]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), capM);
      ins.position.y = hy; p.add(ins);
    }
    p.position.set(x, terrainH(x, z), z);
    village.add(p);
  }
  scene.add(shadowy(village));
  return village;
}

// A DHARMA van: a VW bus in blue and white with the octagon on its side.
function dharmaVan(x, z, ry) {
  const van = new THREE.Group();
  const blue = new THREE.MeshStandardMaterial({ color: 0x3f6f9e, roughness: 0.5, metalness: 0.2 });
  const white = new THREE.MeshStandardMaterial({ color: 0xece8dc, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1c2328, roughness: 0.2, metalness: 0.5 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  const lower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 1.8), blue); lower.position.y = 0.85; van.add(lower);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 1.8), white); upper.position.y = 1.75; van.add(upper);
  const win = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 1.82), glass); win.position.set(-0.2, 1.8, 0); van.add(win);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.5), glass); screen.position.set(2.11, 1.8, 0); van.add(screen);
  const vee = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.8), white); vee.position.set(2.12, 1.1, 0); vee.rotation.x = Math.PI / 4; van.add(vee);
  for (const [wx, wz] of [[1.4, 0.9], [1.4, -0.9], [-1.4, 0.9], [-1.4, -0.9]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 14), tyre); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.36, wz); van.add(w);
  }
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.35, 8), white); logo.position.set(0.3, 0.85, 0.91); van.add(logo);
  van.position.set(x, terrainH(x, z), z); van.rotation.y = ry;
  return van;
}
