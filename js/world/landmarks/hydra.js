// Hydra Island, off the east coast: the DHARMA station where Jack, Kate and Sawyer
// were held in cages by the Others (season 3).
import * as THREE from 'three/webgpu';
import { SITES, ISLAND } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { surfaceH } from '../terrain.js';
import { stoneMaterial, strut } from './materials.js';

function cage(bars) {
  const g = new THREE.Group();
  const w = 5, h = 3.4, d = 4.4;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // frame
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) g.add(strut(V(x, 0, z), V(x, h, z), 0.08, bars, 6));
  for (const y of [0.05, h]) {
    g.add(strut(V(-w / 2, y, -d / 2), V(w / 2, y, -d / 2), 0.06, bars)); g.add(strut(V(-w / 2, y, d / 2), V(w / 2, y, d / 2), 0.06, bars));
    g.add(strut(V(-w / 2, y, -d / 2), V(-w / 2, y, d / 2), 0.06, bars)); g.add(strut(V(w / 2, y, -d / 2), V(w / 2, y, d / 2), 0.06, bars));
  }
  // vertical bars
  for (let x = -w / 2 + 0.4; x < w / 2; x += 0.4) for (const z of [-d / 2, d / 2]) g.add(strut(V(x, 0, z), V(x, h, z), 0.03, bars, 4));
  for (let z = -d / 2 + 0.4; z < d / 2; z += 0.4) for (const x of [-w / 2, w / 2]) g.add(strut(V(x, 0, z), V(x, h, z), 0.03, bars, 4));
  return g;
}

export function createHydra(scene) {
  const site = SITES.hydra;
  const g = new THREE.Group();
  const concrete = stoneMaterial('#8f8b82', { moss: 0.3, scale: 0.6, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x191b1c, roughness: 0.6 });
  const bars = new THREE.MeshStandardMaterial({ color: 0x3f3c38, roughness: 0.5, metalness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a8f93, roughness: 0.4, metalness: 0.7 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // the station: a low concrete block with a band of dark windows
  const block = new THREE.Mesh(new THREE.BoxGeometry(26, 5, 14), concrete);
  block.position.y = 2.4; g.add(block);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(27, 0.6, 15), concrete);
  roof.position.y = 5.1; g.add(roof);
  const band = new THREE.Mesh(new THREE.BoxGeometry(22, 1.1, 14.1), dark);
  band.position.y = 3.3; g.add(band);
  const door = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.3), dark);
  door.position.set(0, 1.5, -7.05); g.add(door);
  // entrance canopy on posts, the Hydra logo, roof vents and a water tank
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 3.5), concrete); canopy.position.set(0, 3.5, -8.6); g.add(canopy);
  for (const x of [-2.7, 2.7]) g.add(strut(V(x, 0, -10.1), V(x, 3.4, -10.1), 0.12, steel, 8));
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.9, 8), new THREE.MeshStandardMaterial({ color: 0xe9e2c9, roughness: 0.7 }));
  logo.position.set(0, 4.3, -7.08); logo.rotation.y = Math.PI; g.add(logo);
  for (const x of [-8, -3, 5, 9]) { const v = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), steel); v.position.set(x, 5.8, R(-3, 3)); g.add(v); }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3.5, 20), steel); tank.position.set(16, 4.5, 3); g.add(tank);
  for (const [x, z] of [[14.6, 1.6], [17.4, 1.6], [14.6, 4.4], [17.4, 4.4]]) g.add(strut(V(x, 0, z), V(x, 2.8, z), 0.1, steel, 6));
  // a chain-link fence round the compound, with lamp posts
  const fence = new THREE.MeshStandardMaterial({ color: 0x9a9fa3, metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const posts = [[-20, -26], [20, -26], [20, 14], [-20, 14]];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = posts[i], [bx, bz] = posts[(i + 1) % 4];
    const len = Math.hypot(bx - ax, bz - az);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4), fence);
    panel.position.set((ax + bx) / 2, 1.2, (az + bz) / 2); panel.rotation.y = -Math.atan2(bz - az, bx - ax); g.add(panel);
    for (let k = 0; k <= Math.round(len / 4); k++) { const t = k / Math.round(len / 4); g.add(strut(V(ax + (bx - ax) * t, 0, az + (bz - az) * t), V(ax + (bx - ax) * t, 2.5, az + (bz - az) * t), 0.05, steel, 5)); }
  }
  for (const [x, z] of [[-20, -26], [20, -26], [20, 14], [-20, 14]]) {
    g.add(strut(V(x, 0, z), V(x, 6, z), 0.08, steel, 6));
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.4), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xfff0c8, emissiveIntensity: 0.4 })); lamp.position.set(x, 6.1, z); g.add(lamp);
  }

  // the two bear cages, with the fish-biscuit lever and chute Sawyer figured out
  const c1 = cage(bars); c1.position.set(-8, 0, -16); g.add(c1);
  const c2 = cage(bars); c2.position.set(2, 0, -17); c2.rotation.y = 0.1; g.add(c2);
  for (const c of [c1, c2]) {
    const roofBars = new THREE.Group();
    for (let x = -2.3; x <= 2.3; x += 0.5) roofBars.add(strut(V(x, 3.4, -2.2), V(x, 3.4, 2.2), 0.03, bars, 4));
    c.add(roofBars);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.2), new THREE.MeshStandardMaterial({ color: 0xb8b09a, roughness: 0.7 }));
    panel.position.set(1.4, 1.3, -2.3); c.add(panel);
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0xc8231f })); lever.position.set(1.4, 1.5, -2.1); lever.rotation.x = 0.6; c.add(lever);
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), steel); chute.position.set(1.4, 0.7, -2.15); c.add(chute);
  }

  g.position.set(site.x, terrainH(site.x, site.z) - 0.1, site.z);
  // face the main island
  g.rotation.y = Math.atan2(ISLAND.x - site.x, ISLAND.z - site.z);
  scene.add(shadowy(g));
  g.traverse((o) => { if (o.material === fence) o.castShadow = false; });

  createRoom23(scene, concrete, dark);
  createRunway(scene);
  return g;
}

// Room 23, where the Others "re-educated" Karl ("Not in Portland", season 3).
function createRoom23(scene, concrete, dark) {
  const s = SITES.room23, g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), concrete); box.position.y = 2; g.add(box);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x5b6166, metalness: 0.7, roughness: 0.45 })); door.position.set(0, 1.2, 4.05); g.add(door);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshStandardMaterial({ map: canvasTex(128, 48, (c, W, H) => { c.fillStyle = '#e9e2c9'; c.fillRect(0, 0, W, H); c.fillStyle = '#1d1d1d'; c.font = '600 28px Jost, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('23', W / 2, H / 2 + 2); }) }));
  sign.position.set(0, 2.9, 4.06); g.add(sign);
  g.position.set(s.x, terrainH(s.x, s.z), s.z);
  g.rotation.y = Math.atan2(SITES.hydra.x - s.x, SITES.hydra.z - s.z);
  scene.add(shadowy(g));
}

// The runway Kate and Sawyer broke rocks for (season 3), and Ajira Flight 316, which landed on it
// three years later and overran its end into the trees (season 5, "Namaste").
function createRunway(scene) {
  const A = SITES.runwayA, B = SITES.runwayB;
  const dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
  const mid = { x: (A.x + B.x) / 2, z: (A.z + B.z) / 2 };
  const g = new THREE.Group();
  const gravel = new THREE.MeshStandardMaterial({ color: 0xb4ab96, roughness: 1 });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(26, len + 20), gravel); strip.rotation.x = -Math.PI / 2; strip.position.y = 0.15; g.add(strip);
  // piles of broken rock along the edges, with a pickaxe and a sledgehammer
  const rock = new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1, z = R(-len / 2, len / 2);
    for (let k = 0; k < 5; k++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.3, 0.7)), rock); r.position.set(side * R(14, 17), 0.2, z + R(-1.5, 1.5)); r.rotation.set(R(0, 6), R(0, 6), R(0, 6)); g.add(r); }
  }
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 1 }), iron = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.6 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  g.add(strut(V(-15, 0.1, -10), V(-14, 0.1, -8.8), 0.04, wood, 5));
  const pick = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), iron); pick.position.set(-15, 0.12, -10); pick.rotation.y = 0.8; g.add(pick);
  g.position.set(mid.x, surfaceH(mid.x, mid.z), mid.z); g.rotation.y = yaw;
  scene.add(shadowy(g));
  strip.castShadow = false;

  // Ajira Flight 316: an Airbus in Ajira's white, red and orange, nose-first into the jungle past the runway's end
  const plane = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xebe8e0, roughness: 0.5, metalness: 0.2 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc23a1c, roughness: 0.5 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xe8862a, roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a1f24, roughness: 0.2, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 30, 24), white); body.rotation.x = Math.PI / 2; plane.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), white); nose.rotation.x = Math.PI / 2; nose.scale.set(1, 1.8, 1); nose.position.z = 15; plane.add(nose);
  const tailcone = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 24), white); tailcone.rotation.x = -Math.PI / 2; tailcone.position.z = -18; plane.add(tailcone);
  const cheat = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.02, 30, 24, 1, true), red); cheat.rotation.x = Math.PI / 2; cheat.scale.set(1, 1, 0.1); cheat.position.y = -0.4; plane.add(cheat);
  for (let z = -12; z <= 11; z += 1.1) for (const x of [-2.01, 2.01]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.3), glass); w.position.set(x, 0.5, z); plane.add(w); }
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.9), glass); cockpit.position.set(0, 0.9, 15.4); cockpit.rotation.x = 0.5; plane.add(cockpit);
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(15, -5); wingShape.lineTo(15, -7); wingShape.lineTo(0, -6); wingShape.closePath();
  for (const sd of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.3, bevelEnabled: false }), white);
    wing.rotation.x = -Math.PI / 2; wing.scale.x = sd; wing.position.set(sd * 1.5, -1.2, 5); plane.add(wing);
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.8, 3.2, 16), white); eng.rotation.x = Math.PI / 2; eng.position.set(sd * 5.5, -2, 5); plane.add(eng);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 4.5), orange); fin.position.set(0, 4.2, -17); fin.rotation.x = -0.4; plane.add(fin);
  const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2, 3), red); finTip.position.set(0, 6.4, -18.3); finTip.rotation.x = -0.4; plane.add(finTip);
  for (const sd of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2.4), white); st.position.set(sd * 3.5, 1, -17); plane.add(st); }
  const end = { x: B.x + Math.sin(yaw) * 12, z: B.z + Math.cos(yaw) * 12 };
  plane.position.set(end.x, surfaceH(end.x, end.z) + 1.4, end.z);
  plane.rotation.set(0.1, yaw + 0.15, 0.08, 'YXZ');   // nose down a little, slewed off the centreline
  scene.add(shadowy(plane));
}
