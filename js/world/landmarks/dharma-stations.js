// DHARMA Initiative stations: the Pearl, the Staff, the Arrow, the Flame, the Orchid,
// the submarine dock and the Looking Glass buoy. Positions from Choekaas's map.
import * as THREE from 'three/webgpu';
import { vec3, fract, step } from 'three/tsl';
import { SITES } from '../../core/layout.js';
import { terrainH, seaDir, toCoastDistance } from '../../core/terrain-math.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { uT } from '../../core/uniforms.js';
import { stoneMaterial, gableRoof, strut } from './materials.js';

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
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 16), steel);
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
  place(g, SITES.staff, -0.3, 2.2);
  scene.add(shadowy(g));
}

// The Arrow: a half-buried concrete bunker where the tail section survivors hid ("The Other 48 Days"):
// a sloping concrete front with a heavy door at the bottom of a short flight of steps.
function createArrow(scene, concrete, dark) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 2.2, 6), concrete); body.position.set(0, 0.4, -1); g.add(body);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3f4e27, roughness: 1 }));
  mound.scale.set(1.3, 0.5, 1.1); mound.position.set(0, 0.8, -2.5); g.add(mound);
  // stairwell down to the door
  for (let i = 0; i < 5; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.5), concrete); st.position.set(0, -0.15 - i * 0.25, 3.2 - i * 0.45); g.add(st); }
  for (const x of [-1.15, 1.15]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 2.8), concrete); w.position.set(x, 0, 2.2); g.add(w); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.12), new THREE.MeshStandardMaterial({ color: 0x4d5357, metalness: 0.7, roughness: 0.5 }));
  door.position.set(0, -0.4, 2.04); g.add(door);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 16), dark); wheel.position.set(0, -0.3, 2.12); g.add(wheel);
  const logo = logoPlate('↑', 0.8); logo.position.set(0, 0.95, 2.02); g.add(logo);
  place(g, SITES.arrow, -0.2, -0.6);
  scene.add(shadowy(g));
}

// The Flame: the communications station, a farmhouse with a big satellite dish ("Enter 77", season 3).
function createFlame(scene, concrete) {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 3.6, 8), new THREE.MeshStandardMaterial({ color: 0xd8cfb4, roughness: 0.8 }));
  walls.position.y = 1.8; g.add(walls);
  const roof = new THREE.Mesh(gableRoof(11, 9, 3), new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.8, side: THREE.DoubleSide }));
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
}

// The submarine dock: the pier where Locke blew up the Others' submarine ("The Man from Tallahassee").
function createSubDock(scene) {
  const g = new THREE.Group();
  const start = toCoastDistance(SITES.subDock, 3), sea = seaDir(start.x, start.z);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d5a45, roughness: 0.95 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 42), wood); deck.position.set(0, 1.6, 21); g.add(deck);
  for (let z = 2; z < 42; z += 5) for (const x of [-1.8, 1.8]) g.add(strut(V(x, -4, z), V(x, 1.6, z), 0.18, wood, 6));
  // the scuttled submarine, half sunk beside the pier
  const hullM = new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.6, metalness: 0.4 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 22, 6, 16), hullM);
  hull.rotation.set(Math.PI / 2, 0, 0.12); hull.position.set(7, -0.9, 30); g.add(hull);
  const sail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3, 4), hullM); sail.position.set(7.2, 1.6, 28); sail.rotation.z = 0.12; g.add(sail);
  g.position.set(start.x, 0, start.z);
  g.rotation.y = Math.atan2(sea.x, sea.z);
  scene.add(shadowy(g));
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
