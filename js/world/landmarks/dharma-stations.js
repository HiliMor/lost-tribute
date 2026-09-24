// DHARMA Initiative stations: the Pearl, the Staff, the Arrow, the Flame, the Orchid,
// the submarine dock and the Looking Glass buoy. Positions from Choekaas's map.
import * as THREE from 'three/webgpu';
import { vec3, fract, step } from 'three/tsl';
import { SITES } from '../../core/layout.js';
import { terrainH, seaDir, toCoastDistance } from '../../core/terrain-math.js';
import { surfaceH } from '../terrain.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { uT } from '../../core/uniforms.js';
import { stoneMaterial, cliffWall, gableRoof, strut } from './materials.js';
import { grassField } from '../jungle.js';
import { dharmaVan } from './barracks.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// The DHARMA octagon with a station symbol in the middle, for signs and doors.
function dharmaLogo(symbol) {
  return canvasTex(256, 256, (g, W) => {
    g.fillStyle = '#e9e2c9'; g.fillRect(0, 0, W, W);
    g.translate(W / 2, W / 2); g.strokeStyle = '#1d1d1d'; g.fillStyle = '#1d1d1d';
    const oct = (r) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
    g.lineWidth = 10; oct(110); g.stroke(); g.lineWidth = 4; oct(78); g.stroke();
    for (let i = 0; i < 8; i++) {           // the eight trigram bars
      g.save(); g.rotate(i * Math.PI / 4); g.fillRect(-26, -104, 52, 7); g.fillRect(-26, -93, i % 2 ? 22 : 52, 7); if (i % 2) g.fillRect(4, -93, 22, 7); g.restore();
    }
    g.font = '600 64px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(symbol, 0, 4);
  });
}
function logoPlate(symbol, size = 1.2) {
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: dharmaLogo(symbol), roughness: 0.7 }));
}
function place(g, site, yOff = 0, face) {
  g.position.set(site.x, terrainH(site.x, site.z) + yOff, site.z);
  if (face !== undefined) g.rotation.y = face;
}

// The Pearl ("?", season 2): the station's entrance is a hatch in an open meadow, a round concrete
// collar with its steel lid thrown open and a lit ladder shaft below. Around it lie the Virgin Mary
// statues full of heroin that spilled from the Beechcraft.
function createPearl(scene, concrete, dark) {
  const g = new THREE.Group();
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 8), concrete); collar.position.y = 0.1; g.add(collar);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 4, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2c2d, side: THREE.BackSide }));
  shaft.position.y = -1.7; g.add(shaft);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 16), new THREE.MeshBasicMaterial({ color: 0xd8ecff }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -3.6; g.add(glow);
  const steel = new THREE.MeshStandardMaterial({ color: 0x6d7275, metalness: 0.75, roughness: 0.4 });
  for (let i = 0; i < 7; i++) { const rung = strut(V(-0.5, -0.4 - i * 0.45, 0.85), V(0.5, -0.4 - i * 0.45, 0.85), 0.03, steel, 4); g.add(rung); }
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 8), steel);   // octagonal, like the collar
  lid.position.set(0, 1.25, -1.35); lid.rotation.x = -1.2; g.add(lid);
  const logo = logoPlate('◯', 0.9); logo.position.set(0, 1.32, -1.28); logo.rotation.x = -1.2 + Math.PI / 2; g.add(logo);
  // Virgin Mary statues (white robes, blue mantles), some broken open
  const white = new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.5 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x4b6fa8, roughness: 0.5 });
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 10), blue); body.position.y = 0.28; m.add(body);
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.4, 10), white); robe.position.y = 0.25; m.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), white); head.position.y = 0.6; m.add(head);
    m.position.set(R(-6, 6), 0.05, R(-6, 6));
    if (Math.hypot(m.position.x, m.position.z) < 2.2) m.position.x += 3;
    if (i % 3 === 0) m.rotation.set(Math.PI / 2, R(0, 6), 0); else m.rotation.y = R(0, 6);
    g.add(m);
  }
  place(g, SITES.pearl, -0.05, 0.8);
  scene.add(shadowy(g));
  glow.castShadow = false;
  grassField(scene, SITES.pearl.x, SITES.pearl.z, { radius: 22, clear: 3.4, count: 1300, height: 0.95 });   // the hatch lay hidden in tall grass
}

// The Staff ("Maternity Leave", season 2): the DHARMA medical station, reached through a steel door
// in a vine-covered hillside, down a short concrete ramp between retaining walls.
function createStaff(scene, concrete, dark) {
  const g = new THREE.Group();
  const hill = stoneMaterial('#495a2c', { moss: 0.7, scale: 0.4 });
  for (let i = 0; i < 7; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), hill);
    r.position.set(R(-7, 7), R(0.5, 3), R(-8, -4)); r.scale.set(R(3, 5), R(2.5, 4), R(3, 4.5)); r.rotation.set(R(0, 6), R(0, 6), R(0, 6));
    g.add(r);
  }
  // concrete portal, ramp and retaining walls
  const portal = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 1.2), concrete); portal.position.set(0, 1.6, -1.2); g.add(portal);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 6), concrete); ramp.position.set(0, -0.15, 2.3); ramp.rotation.x = -0.08; g.add(ramp);
  for (const x of [-1.6, 1.6]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 5.5), concrete); w.position.set(x, 0.4, 2.2); g.add(w); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.12), new THREE.MeshStandardMaterial({ color: 0x5b6166, metalness: 0.7, roughness: 0.45 }));
  door.position.set(0, 1.2, -0.56); g.add(door);
  const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.06), dark); keypad.position.set(1.5, 1.3, -0.58); g.add(keypad);
  const logo = logoPlate('✚', 0.9); logo.position.set(0, 2.8, -0.58); g.add(logo);
  // vines hanging over the portal
  const vine = new THREE.MeshStandardMaterial({ color: 0x2f4a1c, roughness: 0.9 });
  for (let i = 0; i < 14; i++) { const x = R(-2, 2), len = R(0.6, 2.2); g.add(strut(V(x, 3.3, -0.55), V(x + R(-0.2, 0.2), 3.3 - len, -0.5), 0.04, vine, 4)); }
  // the escape hatch: a steel plate in the jungle floor with the Staff's logo (how Kate and Claire got out)
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x8c877a, metalness: 0.5, roughness: 0.7 }));
  hatch.position.set(7, 0.35, 9); hatch.rotation.y = 0.3; g.add(hatch);
  const hl = logoPlate('✚', 0.7); hl.rotation.x = -Math.PI / 2; hl.rotation.z = -0.3; hl.position.set(7, 0.41, 9); g.add(hl);
  place(g, SITES.staff, -0.3, 2.2);
  scene.add(shadowy(g));
}

// The Arrow ("The Other 48 Days", season 2): the tail section survivors' refuge, a concrete bunker dug into
// a hillside. All that shows is a weathered wooden door in a concrete frame, half hidden by vines.
function createArrow(scene, concrete, dark) {
  const g = new THREE.Group();
  const earth = stoneMaterial('#4d5a30', { moss: 0.85, scale: 0.35 });
  earth.side = THREE.DoubleSide;
  const bank = cliffWall(22, 6, earth, { bend: 4, rough: 1.1, seed: 5.3, lean: 0.45, segs: 32 }); bank.position.z = -2.2; g.add(bank);
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a7a32, roughness: 1 }));
  hill.scale.set(12, 5.5, 8); hill.position.set(0, -0.3, -8); g.add(hill);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.9, 0.8), concrete); frame.position.set(0, 1.3, -0.6); g.add(frame);
  const planks = canvasTex(128, 256, (c, W, H) => { for (let x = 0; x < W; x += 16) { c.fillStyle = `hsl(30, 8%, ${34 + Math.random() * 14}%)`; c.fillRect(x, 0, 16, H); c.fillStyle = 'rgba(15,12,10,.6)'; c.fillRect(x, 0, 2, H); } c.fillStyle = 'rgba(15,12,10,.5)'; c.fillRect(0, 40, W, 10); c.fillRect(0, 200, W, 10); });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.1), new THREE.MeshStandardMaterial({ map: planks, roughness: 1 }));
  door.position.set(0, 1.1, -0.15); g.add(door);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), dark); handle.position.set(0.6, 1.1, -0.07); g.add(handle);
  const logo = logoPlate('↑', 0.6); logo.position.set(0, 2.45, -0.19); g.add(logo);
  // vines hanging over the door and creeping up the frame
  const vine = new THREE.MeshStandardMaterial({ color: 0x33501f, roughness: 0.9 });
  for (let i = 0; i < 22; i++) { const x = R(-1.5, 1.5), len = R(0.5, 2.4); g.add(strut(V(x, 2.8, R(-0.3, -0.1)), V(x + R(-0.3, 0.3), 2.8 - len, R(-0.1, 0.05)), 0.035, vine, 4)); }
  const leafM = new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 40; i++) { const l = new THREE.Mesh(new THREE.CircleGeometry(R(0.08, 0.16), 5), leafM); l.position.set(R(-1.6, 1.6), R(0.8, 2.9), R(-0.1, 0.05)); l.rotation.set(R(-0.5, 0.5), R(-0.5, 0.5), R(0, 6)); g.add(l); }
  place(g, SITES.arrow, -0.1, -0.6);
  scene.add(shadowy(g));
  grassField(scene, SITES.arrow.x, SITES.arrow.z - 3, { radius: 14, clear: 4, count: 500, height: 0.9 });
}

// The Flame: the communications station, a farmhouse with a big satellite dish ("Enter 77", season 3).
function createFlame(scene, concrete) {
  const g = new THREE.Group();
  const clap = canvasTex(128, 128, (c, W, H) => { c.fillStyle = '#6b7f8e'; c.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 8) { c.fillStyle = 'rgba(25,32,40,.4)'; c.fillRect(0, y, W, 1.5); c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(0, y + 2, W, 2); } });
  clap.wrapS = clap.wrapT = THREE.RepeatWrapping; clap.repeat.set(4, 2);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 3.6, 8), new THREE.MeshStandardMaterial({ map: clap, roughness: 0.85 }));
  walls.position.y = 1.8; g.add(walls);
  const roof = new THREE.Mesh(gableRoof(11, 9, 3), new THREE.MeshStandardMaterial({ color: 0x4a4c50, roughness: 0.75, side: THREE.DoubleSide }));
  roof.position.y = 3.6; g.add(roof);
  const porch = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 2.5), concrete); porch.position.set(0, 0.2, 5.2); g.add(porch);
  const logo = logoPlate('▲', 1.1); logo.position.set(0, 2.6, 4.02); g.add(logo);
  // satellite dish on a pylon beside the house
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd2d4, roughness: 0.4, metalness: 0.5 });
  g.add(strut(V(9, 0, -2), V(9, 5, -2), 0.25, steel, 8));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 8, 0, Math.PI * 2, 0, Math.PI / 6), steel);
  dish.geometry.translate(0, -4 * Math.cos(Math.PI / 6), 0);   // shallow bowl centred on its rim
  dish.material.side = THREE.DoubleSide;
  dish.position.set(9, 6.2, -2); dish.rotation.set(-0.9, 0, 0.2); g.add(dish);
  // windows, door, porch posts, chimney
  const glassM = new THREE.MeshStandardMaterial({ color: 0x20282e, roughness: 0.2, metalness: 0.4 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 0.6 });
  for (const x of [-3.2, 3.2]) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.08), glassM); w.position.set(x, 2, 4.02); g.add(w); const f = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.05), trim); f.position.set(x, 2, 4.0); g.add(f); }
  for (const z of [-2, 2]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 1.4), glassM); w.position.set(5.02, 2, z); g.add(w); }
  const doorF = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x6d4a2e })); doorF.position.set(-0.9, 1.1, 4.03); g.add(doorF);
  for (const x of [-2.8, 2.8]) g.add(strut(V(x, 0.3, 6.3), V(x, 3.2, 6.3), 0.08, trim, 6));
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.12, 2.6), new THREE.MeshStandardMaterial({ color: 0x4a4c50 })); porchRoof.position.set(0, 3.3, 5.3); porchRoof.rotation.x = 0.12; g.add(porchRoof);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), new THREE.MeshStandardMaterial({ color: 0x7e5a44 })); chimney.position.set(-3, 5.6, -1.5); g.add(chimney);
  // Mikhail's vegetable garden
  const soilM = new THREE.MeshStandardMaterial({ color: 0x4a3827, roughness: 1 }), vegM = new THREE.MeshStandardMaterial({ color: 0x4f8a34, roughness: 0.8 });
  for (let r = 0; r < 5; r++) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 0.8), soilM); bed.position.set(-12, 0.1, -6 + r * 1.4); g.add(bed);
    for (let k = 0; k < 9; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), vegM); p.position.set(-15.2 + k * 0.8, 0.35, -6 + r * 1.4); g.add(p); }
  }
  // cows in the pasture ("Enter 77")
  const hide = [0x1d1b19, 0xece6dc, 0x7a4a2c].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  for (let i = 0; i < 4; i++) {
    const cow = new THREE.Group(), m = hide[i % 3], m2 = hide[(i + 1) % 3];
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 0.8), m); body.position.y = 1.1; cow.add(body);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.82), m2); patch.position.set(0.3, 1.2, 0); cow.add(patch);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.4), m); head.position.set(1.2, 1.25, 0); head.rotation.z = -0.3; cow.add(head);
    for (const [lx, lz] of [[0.7, 0.3], [0.7, -0.3], [-0.7, 0.3], [-0.7, -0.3]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), m); leg.position.set(lx, 0.35, lz); cow.add(leg); }
    cow.position.set(R(-20, 20), 0, R(10, 22)); cow.rotation.y = R(0, 6.28); g.add(cow);
  }
  // a fence around the pasture
  const post = new THREE.MeshStandardMaterial({ color: 0x6e5a42, roughness: 1 });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; g.add(strut(V(Math.cos(a) * 30, 0, Math.sin(a) * 30), V(Math.cos(a) * 30, 1.3, Math.sin(a) * 30), 0.07, post, 5)); }
  place(g, SITES.flame, 0, 1.2);
  scene.add(shadowy(g));
}

// The Orchid ("There's No Place Like Home", season 4): a white-framed glass greenhouse, the station's
// cover story, on a concrete base. Inside are potting benches with orchids; below it, Ben turned the wheel.
function createOrchid(scene, concrete) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.8, 7.4), concrete); base.position.y = 0.4; g.add(base);
  const glass = new THREE.MeshStandardMaterial({ color: 0xdbeee0, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(11.6, 3, 6.6), glass); walls.position.y = 2.3; g.add(walls);
  const roofGeo = gableRoof(6.6, 11.6, 2); roofGeo.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, glass); roof.position.y = 3.8; g.add(roof);
  const frame = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 });
  // posts, sills, eaves and rafters
  for (let x = -5.8; x <= 5.81; x += 1.16) {
    for (const z of [-3.3, 3.3]) g.add(strut(V(x, 0.8, z), V(x, 3.8, z), 0.05, frame, 4));
    g.add(strut(V(x, 3.8, -3.3), V(x, 5.8, 0), 0.05, frame, 4)); g.add(strut(V(x, 3.8, 3.3), V(x, 5.8, 0), 0.05, frame, 4));
  }
  for (const [y, z] of [[0.8, -3.3], [0.8, 3.3], [3.8, -3.3], [3.8, 3.3], [5.8, 0], [2.3, -3.3], [2.3, 3.3]]) g.add(strut(V(-5.8, y, z), V(5.8, y, z), 0.05, frame, 4));
  for (const x of [-5.8, 5.8]) for (let z = -3.3; z <= 3.31; z += 1.1) g.add(strut(V(x, 0.8, z), V(x, 3.8, z), 0.05, frame, 4));
  // door at one end
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, transparent: true, opacity: 0.6 }));
  door.position.set(5.82, 1.9, 0); g.add(door);
  // benches of orchids
  const bench = new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f7a2c, roughness: 0.8 });
  const blooms = [0xf3e9f7, 0xd65a9a, 0xf0c64a, 0xffffff].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
  for (const z of [-2.2, 0, 2.2]) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.12, 1.1), bench); top.position.set(0, 1.7, z); g.add(top);
    for (let x = -4.3; x <= 4.31; x += 0.55) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xa35a3a }));
      pot.position.set(x, 1.86, z + R(-0.3, 0.3)); g.add(pot);
      const pl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 5), leaf); pl.position.set(pot.position.x, 2.1, pot.position.z); g.add(pl);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), blooms[Math.floor(R(0, 4))]); b.position.set(pot.position.x + 0.05, 2.35, pot.position.z); g.add(b);
    }
  }
  place(g, SITES.orchid, 0, -0.4);
  scene.add(shadowy(g));
  walls.castShadow = false; roof.castShadow = false;
  // a DHARMA van parked outside, as when Ben arrived ("There's No Place Like Home")
  const O = SITES.orchid, vx = O.x + 11, vz = O.z + 7;
  const van = dharmaVan(vx, vz, 2.2); van.position.y = surfaceH(vx, vz); scene.add(shadowy(van));
  // the ancient well where the Orchid was later dug, ringed by broken stone pillars (season 5)
  const well = new THREE.Group(), wellStone = stoneMaterial('#7d7666', { moss: 0.6, scale: 0.5, blocks: 0.35 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 1, 20, 1, true), wellStone); ring.material.side = THREE.DoubleSide; ring.position.y = 0.5; well.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.18, 6, 24), wellStone); rim.rotation.x = Math.PI / 2; rim.position.y = 1; well.add(rim);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshBasicMaterial({ color: 0x050403 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.3; well.add(hole);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + R(-0.2, 0.2), h = R(1.2, 3.4); const pl = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.7), wellStone); pl.position.set(Math.cos(a) * 6, h / 2, Math.sin(a) * 6); pl.rotation.set(R(-0.08, 0.08), R(0, 1), R(-0.08, 0.08)); well.add(pl); }
  const wx = O.x - 16, wz = O.z - 10; well.position.set(wx, surfaceH(wx, wz), wz); scene.add(shadowy(well));
}

// The submarine dock ("The Man from Tallahassee", season 3): a DHARMA-era concrete pier on the shore of
// a dredged inner basin, with bollards, a boathouse and the Others' submarine alongside, sinking by the
// stern after Locke blew it up. A dirt road climbs from the dock to the Barracks, the route the
// DHARMA vans drove.
function createSubDock(scene) {
  const g = new THREE.Group();
  const base = toCoastDistance(SITES.subDock, 1.5), sea = seaDir(base.x, base.z);
  const pierM = stoneMaterial('#8a867c', { moss: 0.15, scale: 0.5, roughness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2f2c29, metalness: 0.6, roughness: 0.6 });
  const L = 34;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, L), pierM); deck.position.set(0, 1.2, L / 2); g.add(deck);
  for (let z = 4; z < L; z += 6) for (const x of [-2.1, 2.1]) g.add(strut(V(x, -9, z), V(x, 1, z), 0.35, pierM, 8));
  for (let z = 3; z < L; z += 5) for (const x of [-2.2, 2.2]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 10), iron); b.position.set(x, 1.75, z); g.add(b);
  }
  // tyre fenders along the berth
  const rubber = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  for (let z = 8; z < L; z += 4) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.15, 8, 14), rubber); t.position.set(2.65, 0.6, z); t.rotation.y = Math.PI / 2; g.add(t); }
  // boathouse at the landward end
  const shed = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 5), new THREE.MeshStandardMaterial({ color: 0x9a9384, roughness: 0.9 })); shed.position.set(-5, 1.6, -3); g.add(shed);
  const shedRoof = new THREE.Mesh(gableRoof(6.6, 5.6, 1.4), new THREE.MeshStandardMaterial({ color: 0x5a5a55, metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide })); shedRoof.position.set(-5, 3.2, -3); g.add(shedRoof);
  const logo = logoPlate('⌂', 1); logo.position.set(-5, 2.3, -0.48); g.add(logo);
  // a white pergola with the "PALA FERRY" sign, where the Others waited for the sub (season 3)
  const whiteM = new THREE.MeshStandardMaterial({ color: 0xece8de, roughness: 0.6 });
  for (const [x, z] of [[-2, 1.5], [2, 1.5], [-2, 7.5], [2, 7.5]]) g.add(strut(V(x, 1.5, z), V(x, 4.3, z), 0.1, whiteM, 6));
  const pRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.4, 4, 1, true), whiteM); pRoof.rotation.y = Math.PI / 4; pRoof.scale.set(1, 1, 1.5); pRoof.position.set(0, 5, 4.5); pRoof.material.side = THREE.DoubleSide; g.add(pRoof);
  const pala = canvasTex(256, 64, (c, W, H) => { c.fillStyle = '#ece8de'; c.fillRect(0, 0, W, H); c.fillStyle = '#3b3b3b'; c.font = '700 34px Georgia, serif'; c.textAlign = 'center'; c.fillText('PALA FERRY', W / 2, 45); });
  const palaSign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshStandardMaterial({ map: pala, roughness: 0.7, side: THREE.DoubleSide })); palaSign.position.set(0, 4.5, 1.4); palaSign.rotation.y = Math.PI; g.add(palaSign);
  // the submarine: alongside the pier's outer end, stern down, bow and sail still above water
  const hullM = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.55, metalness: 0.4 });
  const sub = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(2.3, 24, 8, 20), hullM); hull.rotation.x = Math.PI / 2; sub.add(hull);
  const sail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.2, 4.5), hullM); sail.position.set(0, 3.2, 3); sub.add(sail);
  for (const x of [-1.8, 1.8]) { const plane = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.2), hullM); plane.position.set(x, 3.6, 3.6); sub.add(plane); }
  const scorch = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), new THREE.MeshStandardMaterial({ color: 0x0e0d0c, roughness: 1 }));
  scorch.scale.set(1, 0.6, 1.6); scorch.position.set(1.6, 0.8, -8); sub.add(scorch);   // the blast hole aft
  sub.position.set(6.2, -0.9, L - 14); sub.rotation.set(-0.12, 0.03, 0.2);           // stern sinking, rolled away from the pier
  g.add(sub);
  // an oil slick spreading from the wreck
  const slick = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55, depthWrite: false }));
  slick.rotation.x = -Math.PI / 2; slick.scale.set(1, 1.6, 1); slick.position.set(7, 0.08, L - 18); g.add(slick);
  g.position.set(base.x, 0, base.z);
  g.rotation.y = Math.atan2(sea.x, sea.z);
  scene.add(shadowy(g));
  slick.castShadow = false;

  // the dirt road up to the Barracks
  const road = [], B = SITES.barracks, steps = 70;
  const start = new THREE.Vector3(base.x, 0, base.z).addScaledVector(new THREE.Vector3(sea.x, 0, sea.z), -6);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, bend = Math.sin(t * Math.PI) * 45;
    const dx = B.x - start.x, dz = B.z - start.z, len = Math.hypot(dx, dz);
    road.push(new THREE.Vector3(start.x + dx * t + (-dz / len) * bend, 0, start.z + dz * t + (dx / len) * bend));
  }
  const pos = [], idx = [];
  road.forEach((p, i) => {
    const q = road[Math.min(road.length - 1, i + 1)], r = road[Math.max(0, i - 1)];
    const dx = q.x - r.x, dz = q.z - r.z, len = Math.hypot(dx, dz) || 1, nx = -dz / len * 1.8, nz = dx / len * 1.8;
    for (const sgn of [-1, 1]) { const x = p.x + nx * sgn, z = p.z + nz * sgn; pos.push(x, surfaceH(x, z) + 0.12, z); }
    if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  const roadMesh = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x6f5e44, roughness: 1, side: THREE.DoubleSide }));
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);
}

// The Looking Glass: the underwater station. On the surface, only a buoy marks where the cable
// goes down ("Through the Looking Glass", season 3). Its light blinks.
function createLookingGlass(scene) {
  const g = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: 0xd8591f, roughness: 0.6 });
  const buoy = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 10), orange); buoy.scale.y = 0.8; g.add(buoy);
  g.add(strut(V(0, 0.5, 0), V(0, 2.8, 0), 0.08, new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 }), 6));
  const lampM = new THREE.MeshBasicNodeMaterial();
  lampM.colorNode = vec3(1.0, 0.9, 0.5).mul(step(0.7, fract(uT.mul(0.5))).mul(6.0).add(0.3));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampM); lamp.position.y = 2.95; g.add(lamp);
  // the outrigger canoe Charlie and Desmond paddled out in
  const woodM = new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 0.8 });
  const canoe = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 5, 4, 10), woodM); hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, 0.8); canoe.add(hull);
  const inside = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x5a4632 })); inside.position.y = 0.36; canoe.add(inside);
  const float = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 3, 4, 8), woodM); float.rotation.z = Math.PI / 2; float.position.set(0, -0.05, 2); canoe.add(float);
  for (const x of [-1, 1]) canoe.add(strut(V(x, 0.3, 0), V(x, 0.1, 2), 0.05, woodM, 4));
  canoe.position.set(4, 0, 3); canoe.rotation.y = 0.5; g.add(canoe);
  const s = SITES.lookingGlass;
  g.position.set(s.x, 0.1, s.z);
  scene.add(g);
  return { update(t) { g.position.y = 0.1 + Math.sin(t * 1.3) * 0.25; g.rotation.z = Math.sin(t * 0.9) * 0.08; } };
}

export function createDharmaStations(scene) {
  const concrete = stoneMaterial('#8e8a80', { moss: 0.35, scale: 0.6, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1b1c, roughness: 0.6 });
  createPearl(scene, concrete, dark);
  createStaff(scene, concrete, dark);
  createArrow(scene, concrete, dark);
  createFlame(scene, concrete);
  createOrchid(scene, concrete);
  createSubDock(scene);
  return createLookingGlass(scene);
}
