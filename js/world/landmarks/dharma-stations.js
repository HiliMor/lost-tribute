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

// The Pearl: a small concrete entrance in a field, with a hatch in its floor ("?", season 2).
function createPearl(scene, concrete, dark) {
  const g = new THREE.Group();
  const hut = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 4), concrete); hut.position.y = 1.2; g.add(hut);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 4.6), concrete); roof.position.y = 2.6; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2, 0.1), dark); door.position.set(0, 1, 2.02); g.add(door);
  const logo = logoPlate('◯', 0.9); logo.position.set(0, 2.15, 2.03); g.add(logo);
  place(g, SITES.pearl, -0.1, 0.8);
  scene.add(shadowy(g));
}

// The Staff: a medical station behind a metal door set into a hillside ("Maternity Leave", season 2).
function createStaff(scene, concrete, dark) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(7, 1), new THREE.MeshStandardMaterial({ color: 0x3a4a26, roughness: 0.95, flatShading: true }));
  rock.scale.set(1.3, 0.8, 1); rock.position.set(0, 1.5, -4); g.add(rock);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3, 1), concrete); frame.position.set(0, 1.5, 2.4); g.add(frame);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2, 2.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x5b6166, metalness: 0.7, roughness: 0.45 }));
  door.position.set(0, 1.2, 2.92); g.add(door);
  const logo = logoPlate('✚', 0.8); logo.position.set(0, 2.65, 2.93); g.add(logo);
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

// The Orchid: a glass greenhouse on top of the station where Ben moved the Island
// ("There's No Place Like Home", season 4).
function createOrchid(scene, concrete) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 7), concrete); base.position.y = 0.5; g.add(base);
  const glass = new THREE.MeshStandardMaterial({ color: 0xd5ead8, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35 });
  const house = new THREE.Mesh(new THREE.BoxGeometry(11, 3, 6), glass); house.position.y = 2.5; g.add(house);
  const roof = new THREE.Mesh(gableRoof(11.2, 6.2, 1.8), glass); roof.rotation.y = Math.PI / 2; roof.scale.set(6.2 / 11.2, 1, 11.2 / 6.2); roof.position.y = 4; g.add(roof);
  const frame = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 });
  for (let x = -5.5; x <= 5.51; x += 1.1) for (const z of [-3, 3]) g.add(strut(V(x, 1, z), V(x, 4, z), 0.05, frame, 4));
  const plants = new THREE.MeshStandardMaterial({ color: 0x3f7a2c, roughness: 0.9 });
  for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(R(0.3, 0.6), 1), plants); p.position.set(R(-5, 5), 1.3, R(-2.5, 2.5)); g.add(p); }
  place(g, SITES.orchid, 0, -0.4);
  scene.add(shadowy(g));
  house.castShadow = false;
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
