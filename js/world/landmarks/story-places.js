// Places from the survivors' story: the cockpit, the caves, Hurley's golf course, Rousseau's shelter,
// the tail section, Henry Gale's balloon, Jacob's cabin and Jacob's cave. Positions from Choekaas's map.
import * as THREE from 'three/webgpu';
import { vec3, step, fract, smoothstep, length, uv, positionWorld, mx_noise_float } from 'three/tsl';
import { SITES } from '../../core/layout.js';
import { terrainH, landDist, seaDir, toCoastDistance } from '../../core/terrain-math.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { stoneMaterial, strataMaterial, cliffWall, gableRoof, strut } from './materials.js';
import { dharmaVan } from './barracks.js';
import { surfaceH } from '../terrain.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ground = (s) => terrainH(s.x, s.z);

function rockPile(g, mat, n, spread, size, y = 0) {
  for (let i = 0; i < n; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), mat);
    r.position.set(R(-spread, spread), y + R(0, size * 0.6), R(-spread, spread) * 0.6);
    r.scale.set(R(size * 0.6, size * 1.2), R(size * 0.5, size), R(size * 0.6, size * 1.2));
    r.rotation.set(R(0, 6), R(0, 6), R(0, 6));
    g.add(r);
  }
}

// The cockpit, torn off the plane and lodged in the trees ("Pilot", season 1): the nose with its
// window frames, a ragged torn edge trailing cables, the two pilot seats inside, and snapped trees.
function createCockpit(scene) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.25, metalness: 0.4 });
  const inner = new THREE.MeshStandardMaterial({ color: 0x2d3036, roughness: 0.9, side: THREE.BackSide });
  // fuselage stub with a jagged torn end (along +x towards the nose)
  const body = new THREE.CylinderGeometry(2.9, 2.9, 6, 36, 6, true);
  const bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i);
    if (y < -2.99) { const a = Math.atan2(bp.getZ(i), bp.getX(i)); bp.setY(i, y + 0.8 * Math.abs(Math.sin(a * 3.1)) + 0.5 * Math.abs(Math.sin(a * 7.3)) + R(0, 0.4)); }
  }
  body.computeVertexNormals();
  const shell = new THREE.Mesh(body, paint); shell.rotation.z = -Math.PI / 2; g.add(shell);
  const lining = new THREE.Mesh(body.clone().scale(0.95, 1, 0.95), inner); lining.rotation.z = -Math.PI / 2; g.add(lining);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.9, 36, 18, 0, Math.PI), paint);
  nose.rotation.y = Math.PI / 2; nose.scale.set(1, 1, 1.45); nose.position.x = 3; g.add(nose);
  const radome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 12), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5 }));
  radome.scale.set(0.8, 1, 1); radome.position.set(6.8, -0.6, 0); g.add(radome);
  // six cockpit window panes across the top of the nose
  for (let i = 0; i < 6; i++) {
    // on the nose (an ellipsoid centred at x = 3, 4.2 m long, 2.9 m round), looking out and a little up
    const az = (i - 2.5) * 0.24, el = 0.42;
    const f = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.08), dark);
    w.position.set(3 + 4.2 * f.x, 2.9 * f.y, 2.9 * f.z);
    w.lookAt(w.position.clone().add(new THREE.Vector3(f.x / 4.2, f.y / 2.9, f.z / 2.9)));
    g.add(w);
  }
  // the navy cheat line
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.93, 2.93, 6, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d3160, side: THREE.DoubleSide }));
  stripe.rotation.z = Math.PI / 2; stripe.scale.set(1, 1, 0.08); stripe.position.y = -0.4; g.add(stripe);
  // pilot seats seen through the tear
  const seatM = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 });
  for (const z of [-0.8, 0.8]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.6), seatM); seat.position.set(2.2, -0.8, z); g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1, 0.6), seatM); back.position.set(1.9, -0.3, z); g.add(back);
  }
  // cables hanging from the torn end
  const cable = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
  for (let i = 0; i < 9; i++) { const a = R(0, Math.PI * 2); g.add(strut(V(-3, Math.sin(a) * 2.6, Math.cos(a) * 2.6), V(-3.6 - R(0, 1), Math.sin(a) * 2.6 - R(1, 3), Math.cos(a) * 2.6 + R(-0.5, 0.5)), 0.03, cable, 4)); }
  const s = SITES.cockpit, y0 = ground(s);
  g.position.set(s.x, y0 + 3.5, s.z);
  const down = seaDir(s.x, s.z);
  g.rotation.set(0.2, Math.atan2(-down.z, down.x) + 1.25, -0.3);   // lying across the slope, side on to the valley
  // snapped tree trunks it crashed through
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 1 });
  const trees = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = R(0, Math.PI * 2), r = R(5, 11), h = R(2, 6);
    const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r, y = terrainH(x, z);
    trees.add(strut(V(x, y - 0.3, z), V(x + R(-0.4, 0.4), y + h, z + R(-0.4, 0.4)), R(0.25, 0.45), bark, 7));
    if (i % 2 === 0) trees.add(strut(V(x, y + h, z), V(x + R(-5, 5), y + 0.3, z + R(-5, 5)), R(0.2, 0.35), bark, 7));
  }
  // a trail of debris where it came down: panels, a seat row, luggage and papers
  const debris = new THREE.Group();
  const panelM = new THREE.MeshStandardMaterial({ color: 0xcfccc2, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
  const fab = new THREE.MeshStandardMaterial({ color: 0x2b4f86, roughness: 0.9 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xf2efe4, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 22; i++) {
    const a = R(-0.9, 0.9) + 2.6, r = R(4, 22);
    const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r, y = surfaceH(x, z);
    let m;
    if (i % 4 === 0) { const pg = new THREE.PlaneGeometry(R(1, 2.4), R(0.8, 1.6), 3, 2); const pp = pg.attributes.position; for (let k = 0; k < pp.count; k++) pp.setZ(k, R(-0.15, 0.15)); m = new THREE.Mesh(pg, panelM); m.rotation.set(-Math.PI / 2 + R(-0.4, 0.4), 0, R(0, 6)); m.position.set(x, y + 0.15, z); }
    else if (i % 4 === 1) { m = new THREE.Group(); for (let k = 0; k < 2; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), fab); c.position.set(k * 0.55, 0.4, 0); const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.12), fab); b.position.set(k * 0.55, 0.8, -0.24); m.add(c, b); } m.position.set(x, y, z); m.rotation.set(R(-0.4, 0.4), R(0, 6), R(-0.8, 0.8)); }
    else if (i % 4 === 2) { m = new THREE.Mesh(new THREE.BoxGeometry(R(0.45, 0.8), R(0.22, 0.32), R(0.3, 0.55)), new THREE.MeshStandardMaterial({ color: [0x7a1e1e, 0x1f3b5a, 0x3b3b3b, 0x6b4a2b][i % 4], roughness: 0.8 })); m.position.set(x, y + 0.12, z); m.rotation.set(R(-0.3, 0.3), R(0, 6), R(-0.5, 0.5)); }
    else { m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), paper); m.rotation.set(-Math.PI / 2, 0, R(0, 6)); m.position.set(x, y + 0.06, z); }
    debris.add(m);
  }
  scene.add(shadowy(g), shadowy(trees), shadowy(debris));
}

export const CAVES_FACE = 2.13;

// The caves, with fresh water, where half the survivors moved ("White Rabbit", season 1): a mossy cliff
// at the head of a jungle valley with two dark cave mouths, a spring trickling down the rock into a pool,
// and the survivors' camp: tarp shelters, a clothesline, a fire ring and rows of water bottles.
function createCaves(scene) {
  const g = new THREE.Group();
  const rock = stoneMaterial('#6f675a', { moss: 0.75, scale: 0.3 });
  rock.side = THREE.DoubleSide;
  const wall = cliffWall(44, 20, rock, { bend: 7, rough: 1.8, seed: 3.1, ribs: 2, ragged: 3, ends: 0.7 }); wall.position.set(0, -6, -6); g.add(wall);   // footed 6 m below ground on the slope
  // the hill above and behind the cliff
  const hillM = new THREE.MeshStandardMaterial({ color: 0x3c5424, roughness: 1 });
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillM);
  hill.scale.set(24, 14, 14); hill.position.set(0, -0.5, -18); g.add(hill);
  // two cave mouths: dark arches going back into the rock
  const black = new THREE.MeshBasicMaterial({ color: 0x050403, side: THREE.DoubleSide });
  for (const [x, r] of [[-5, 2.6], [7, 1.9]]) {
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(r, 24, 0, Math.PI), black); mouth.scale.y = 1.25;
    mouth.position.set(x, 0, -6 + 7 * (x / 20) ** 2 + 1.2 + 1.9); g.add(mouth);   // just proud of the rock face
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r + 0.2, 0.45, 6, 18, Math.PI), rock); lip.scale.y = 1.25; lip.position.copy(mouth.position); lip.position.z += 0.1; g.add(lip);
  }
  // the spring: a thin fall of water down the rock into the pool
  const fallM = new THREE.MeshStandardMaterial({ color: 0xcfe6ea, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55, depthWrite: false });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 9), fallM); fall.position.set(2, 4.5, -4.3); fall.rotation.x = -0.12; g.add(fall);
  const water = new THREE.MeshStandardMaterial({ color: 0x1d4a4c, roughness: 0.03, metalness: 0.35 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), water); pool.rotation.x = -Math.PI / 2; pool.scale.set(1.3, 1, 1); pool.position.set(2, 0.12, -1); g.add(pool);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 12), water); stream.rotation.x = -Math.PI / 2; stream.rotation.z = 0.2; stream.position.set(3.2, 0.11, 8); g.add(stream);
  const pebbles = new THREE.MeshStandardMaterial({ color: 0x5c574f, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2, p = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.2, 0.5)), pebbles); p.position.set(2 + Math.cos(a) * 5.6, 0.1, -1 + Math.sin(a) * 4.3); g.add(p); }
  // tarp shelters on bamboo poles
  const bamboo = new THREE.MeshStandardMaterial({ color: 0x9c8a4a, roughness: 0.8 });
  const tarps = [0x2f5e9e, 0x8a8f94, 0x2f5e9e, 0xd8d2c0].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, side: THREE.DoubleSide }));
  [[-13, 3, 0.4], [-8, 8, -0.3], [11, 6, 0.6], [15, 1, -0.5]].forEach(([x, z, ry], i) => {
    const sh = new THREE.Group();
    for (const [px, pz, h] of [[-1.6, -1.2, 2.2], [1.6, -1.2, 2.2], [-1.6, 1.2, 1.5], [1.6, 1.2, 1.5]]) sh.add(strut(V(px, 0, pz), V(px, h, pz), 0.05, bamboo, 5));
    const t = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3), tarps[i]); t.rotation.x = -Math.PI / 2 + 0.25; t.position.y = 1.9; sh.add(t);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 1.9), tarps[(i + 1) % 4]); bed.position.set(-0.6, 0.08, 0); sh.add(bed);
    sh.position.set(x, 0, z); sh.rotation.y = ry; g.add(sh);
  });
  // a clothesline between two poles
  g.add(strut(V(-4, 0, 6), V(-4, 2, 6), 0.05, bamboo, 5)); g.add(strut(V(4, 0, 7), V(4, 2, 7), 0.05, bamboo, 5));
  g.add(strut(V(-4, 1.95, 6), V(4, 1.95, 7), 0.01, bamboo, 3));
  const cloth = [0xb8322a, 0xe8e2d0, 0x3a5f8a, 0xd9b64a, 0x5a7a3a];
  for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, c = new THREE.Mesh(new THREE.PlaneGeometry(R(0.4, 0.7), R(0.5, 0.8)), new THREE.MeshStandardMaterial({ color: cloth[i % 5], side: THREE.DoubleSide, roughness: 0.9 })); c.position.set(-4 + 8 * u, 1.6, 6 + u); c.rotation.y = -0.12; g.add(c); }
  // a fire ring and the survivors' water bottles
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1 }));
  ash.rotation.x = -Math.PI / 2; ash.position.set(-3, 0.08, 11); g.add(ash);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), pebbles); st.position.set(-3 + Math.cos(a) * 0.8, 0.1, 11 + Math.sin(a) * 0.8); g.add(st); }
  const bottle = new THREE.MeshStandardMaterial({ color: 0xa8c8d8, roughness: 0.1, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 8), bottle); b.position.set(-2 + (i % 6) * 0.18, 0.25, 4.4 + Math.floor(i / 6) * 0.2); g.add(b); }
  // suitcases stacked by the shelters
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(R(0.5, 0.8), R(0.22, 0.3), R(0.35, 0.5)), new THREE.MeshStandardMaterial({ color: [0x7a1e1e, 0x1f3b5a, 0x3b3b3b, 0x6b4a2b][i % 4], roughness: 0.8 })); b.position.set(-10 + R(-1, 1), 0.15 + (i % 3) * 0.28, 5 + R(-0.3, 0.3)); b.rotation.y = R(-0.3, 0.3); g.add(b); }
  const s = SITES.caves;
  g.position.set(s.x, ground(s) - 0.2, s.z);
  g.rotation.y = CAVES_FACE;   // the cliff faces the afternoon sun, so its caves are lit
  scene.add(shadowy(g));
  fall.castShadow = false;
}

// Hurley's golf course ("Solitary", season 1): a fairway mown out of the meadow with three holes,
// flags cut from luggage, a sand trap, a tee box of suitcases, and a golf bag with clubs.
// Mown grass: stripes in two shades, fading softly into the rough at its edge.
function mownGrass(hex, stripe = 2.2) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, transparent: true, depthWrite: false });
  const c = new THREE.Color(hex);
  const st = step(0.5, fract(positionWorld.x.add(positionWorld.z.mul(0.35)).div(stripe)));
  const n = mx_noise_float(positionWorld.mul(0.6)).mul(0.06);
  m.colorNode = vec3(c.r, c.g, c.b).mul(st.mul(0.12).add(0.94)).add(n);
  m.opacityNode = smoothstep(1.0, 0.8, length(uv().sub(0.5)).mul(2.0));
  return m;
}
function createGolf(scene) {
  const g = new THREE.Group();
  const fairwayM = mownGrass('#7ea447', 2.4), greenM = mownGrass('#8fbd52', 0.7);
  const fairway = new THREE.Mesh(new THREE.CircleGeometry(1, 48), fairwayM);
  fairway.rotation.x = -Math.PI / 2; fairway.scale.set(32, 14, 1); fairway.position.y = 0.06; fairway.renderOrder = 1; g.add(fairway);
  const white = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
  const flags = [0xc8231f, 0xf0c64a, 0x2f5d9c].map((c) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide }));
  [[-20, -3], [3, 6], [21, -2]].forEach(([x, z], i) => {
    const green = new THREE.Mesh(new THREE.CircleGeometry(6, 36), greenM); green.rotation.x = -Math.PI / 2; green.position.set(x, 0.09, z); green.renderOrder = 2; g.add(green);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), new THREE.MeshBasicMaterial({ color: 0x080808 }));
    hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.11, z); hole.renderOrder = 3; g.add(hole);
    g.add(strut(V(x, 0, z), V(x, 2.4, z), 0.03, white, 5));
    // flags cut from clothes, with a wavy edge
    const fg = new THREE.PlaneGeometry(0.9, 0.6, 6, 1); const fp = fg.attributes.position;
    for (let k = 0; k < fp.count; k++) fp.setZ(k, Math.sin(fp.getX(k) * 5) * 0.06);
    const flag = new THREE.Mesh(fg, flags[i]); flag.position.set(x + 0.45, 2.1, z); g.add(flag);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), white); ball.position.set(x + R(-2, 2), 0.14, z + R(-2, 2)); g.add(ball);
  });
  const bunker = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0xdcc99a, roughness: 1 }));
  bunker.rotation.x = -Math.PI / 2; bunker.scale.set(6, 3.6, 1); bunker.position.set(12, 0.1, 5); bunker.renderOrder = 2; g.add(bunker);
  // tee box: suitcases for markers, and the golf bag with clubs leaning out
  const leather = [0x6b4a2b, 0x7a1e1e, 0x1f3b5a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  for (let i = 0; i < 3; i++) { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.3), leather[i]); sc.position.set(-28 + i * 0.1, 0.25, -6 + i * 2.2); sc.rotation.y = R(-0.3, 0.3); g.add(sc); }
  const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 1, 12), new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.7 }));
  bag.position.set(-26, 0.5, -1.5); bag.rotation.z = 0.28; g.add(bag);
  const bagBand = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0x1f3b5a })); bagBand.position.set(-26.03, 0.72, -1.5); bagBand.rotation.z = 0.28; g.add(bagBand);
  const steel = new THREE.MeshStandardMaterial({ color: 0xbfc3c6, metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 6; i++) { const top = V(-26.3 + i * 0.06, 1.35, -1.6 + (i % 3) * 0.1); g.add(strut(V(-26.1, 0.9, -1.5), top, 0.015, steel, 4)); const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), steel); head.position.copy(top); head.position.y += 0.05; g.add(head); }
  // a hand-painted sign
  const sign = canvasTex(256, 128, (c, W, H) => { c.fillStyle = '#c9b48c'; c.fillRect(0, 0, W, H); c.fillStyle = '#3a2a18'; c.font = 'italic 700 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('Hurley\'s', W / 2, 52); c.fillText('Golf Course', W / 2, 96); });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.9, side: THREE.DoubleSide }));
  board.position.set(-24, 1.4, -8); board.rotation.y = 0.9; g.add(board);
  const post = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
  g.add(strut(V(-24.3, 0, -8.4), V(-24.3, 1.8, -8.4), 0.05, post, 5)); g.add(strut(V(-23.7, 0, -7.6), V(-23.7, 1.8, -7.6), 0.05, post, 5));
  const s = SITES.golf;
  g.position.set(s.x, ground(s), s.z); g.rotation.y = 0.4;
  scene.add(shadowy(g));
  g.traverse((o) => { if (o.geometry?.type === 'CircleGeometry') o.castShadow = false; });   // ground decals
}

// Rousseau's shelter ("Solitary", season 1): a lean-to of salvaged tarps and bamboo, her cot, a cooking
// fire, maps and notes pinned to a board, and the traps around her camp: a sharpened-stake fence and a
// net snare hanging from a tree.
function createRousseau(scene) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
  const bamboo = new THREE.MeshStandardMaterial({ color: 0x9c8a4a, roughness: 0.8 });
  const tarp = new THREE.MeshStandardMaterial({ color: 0x5e6440, roughness: 0.9, side: THREE.DoubleSide });
  for (const [x, z] of [[-2.5, -2], [2.5, -2], [2.5, 2], [-2.5, 2]]) g.add(strut(V(x, 0, z), V(x, z < 0 ? 3 : 2, z), 0.08, bamboo, 6));
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.6), tarp); roof.rotation.x = -Math.PI / 2 + 0.22; roof.position.y = 2.55; g.add(roof);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshStandardMaterial({ color: 0x6f6a4a, roughness: 1, side: THREE.DoubleSide }));
  backWall.position.set(0, 1.5, -2); g.add(backWall);
  for (let i = 0; i < 12; i++) g.add(strut(V(-2.5 + i * 0.45, 0, -2.05), V(-2.5 + i * 0.45, 2.9, -2.05), 0.05, bamboo, 5));   // woven bamboo
  const cot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 2), wood); cot.position.set(-1.4, 0.23, 0); g.add(cot);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 1.6), new THREE.MeshStandardMaterial({ color: 0x7a3b2a })); blanket.position.set(-1.4, 0.48, 0.1); g.add(blanket);
  // her maps and notes
  const notes = canvasTex(256, 128, (c, W, H) => {
    c.fillStyle = '#5a4a36'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { c.fillStyle = ['#e6dcc2', '#d8cba6', '#efe6cf'][i % 3]; c.save(); c.translate(20 + i * 33, 20 + (i % 2) * 40); c.rotate(R(-0.2, 0.2)); c.fillRect(0, 0, 40, 50); c.strokeStyle = '#3a3028'; c.lineWidth = 1; for (let l = 0; l < 6; l++) { c.beginPath(); c.moveTo(4, 8 + l * 7); c.lineTo(34, 8 + l * 7); c.stroke(); } c.restore(); }
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshStandardMaterial({ map: notes, roughness: 0.9 })); board.position.set(0.9, 1.6, -1.95); g.add(board);
  // fire and pot
  const fire = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshStandardMaterial({ color: 0x1c1a18 })); fire.rotation.x = -Math.PI / 2; fire.position.set(1.5, 0.06, 3.2); g.add(fire);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.5 })); pot.position.set(1.5, 0.3, 3.2); g.add(pot);
  // stake fence traps
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; g.add(strut(V(Math.cos(a) * 8, 0, Math.sin(a) * 8), V(Math.cos(a) * 8.7, 1.3, Math.sin(a) * 8.7), 0.05, wood, 4)); }
  // a net snare slung between two posts
  g.add(strut(V(5, 0, -5), V(5, 4.5, -5), 0.12, wood, 6)); g.add(strut(V(8, 0, -3), V(8, 4.5, -3), 0.12, wood, 6));
  g.add(strut(V(5, 4.4, -5), V(8, 4.4, -3), 0.03, wood, 4));
  const net = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6b5a3a, wireframe: true }));
  net.scale.y = 1.3; net.position.set(6.5, 2.8, -4); g.add(net);
  g.add(strut(V(6.5, 4.4, -4), V(6.5, 3.9, -4), 0.02, wood, 4));
  const s = SITES.rousseau;
  g.position.set(s.x, ground(s), s.z); g.rotation.y = 0.7;
  scene.add(shadowy(g));
}

// The tail section, which crashed on the far side of the island ("The Other 48 Days", season 2):
// the tail cone and fin with the Oceanic logo, and the rows of seats and luggage strewn up the beach.
function createTail(scene) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xe4e2da, roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide });
  const logo = canvasTex(512, 512, (c, W) => {
    c.fillStyle = '#e4e2da'; c.fillRect(0, 0, W, W);
    c.translate(W / 2, W / 2);
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillStyle = i % 2 ? '#b3202e' : '#1d3160'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 120, 0, Math.PI / 3.6); c.closePath(); c.fill(); }
    c.fillStyle = '#e4e2da'; c.beginPath(); c.arc(0, 0, 45, 0, Math.PI * 2); c.fill();
  });
  const coneGeo = new THREE.CylinderGeometry(3, 0.9, 12, 28, 4, true);
  const cp = coneGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) if (cp.getY(i) > 5.99) { const a = Math.atan2(cp.getZ(i), cp.getX(i)); cp.setY(i, cp.getY(i) - 0.7 * Math.abs(Math.sin(a * 2.7)) - R(0, 0.4)); }
  coneGeo.computeVertexNormals();
  const cone = new THREE.Mesh(coneGeo, white); cone.rotation.z = Math.PI / 2; g.add(cone);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(3.03, 0.93, 12, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d3160, side: THREE.DoubleSide }));
  stripe.rotation.z = Math.PI / 2; stripe.scale.set(1, 1, 0.07); stripe.position.y = -0.3; g.add(stripe);
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(7, 0); shape.lineTo(9.5, 8); shape.lineTo(6.5, 8); shape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
  const uvs = finGeo.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) / 10, uvs.getY(i) / 8);
  const fin = new THREE.Mesh(finGeo, [new THREE.MeshStandardMaterial({ map: logo, roughness: 0.55 }), white]);
  fin.position.set(-6, 1.5, -0.15); g.add(fin);
  // horizontal stabilisers
  for (const sd of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 4.5), white); st.position.set(-4.5, 0.4, sd * 3); st.rotation.set(sd * 0.1, sd * 0.35, 0); g.add(st); }
  const p = toCoastDistance(SITES.tail, 8), sea = seaDir(p.x, p.z);
  g.position.set(p.x, terrainH(p.x, p.z) + 1.4, p.z);
  g.rotation.set(0.15, Math.atan2(sea.z, -sea.x), 0.1);
  scene.add(shadowy(g));
  // wreckage strewn along the beach
  const debris = new THREE.Group();
  const fab = new THREE.MeshStandardMaterial({ color: 0x2b4f86, roughness: 0.9 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.6, roughness: 0.4 });
  const along = { x: -sea.z, z: sea.x };
  for (let i = 0; i < 26; i++) {
    const u = R(-28, 28), w = R(2, 14);
    const x = p.x + along.x * u - sea.x * (w - 6), z = p.z + along.z * u - sea.z * (w - 6);
    if (landDist(x, z) < 1) continue;
    let m;
    if (i % 3 === 0) {
      m = new THREE.Group();
      for (let k2 = 0; k2 < 3; k2++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), fab); c.position.set(k2 * 0.55, 0.45, 0);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.12), fab); b.position.set(k2 * 0.55, 0.85, -0.24);
        m.add(c, b);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.06), frame); rail.position.set(0.55, 0.3, 0); m.add(rail);
    } else {
      m = new THREE.Mesh(new THREE.BoxGeometry(R(0.45, 0.8), R(0.22, 0.32), R(0.3, 0.55)), new THREE.MeshStandardMaterial({ color: [0x7a1e1e, 0x1f3b5a, 0x3b3b3b, 0x6b4a2b, 0xa07a3a][i % 5], roughness: 0.8 }));
    }
    m.position.set(x, terrainH(x, z) + 0.1, z); m.rotation.set(R(-0.3, 0.3), R(0, 6.28), R(-0.6, 0.6));
    debris.add(m);
  }
  scene.add(shadowy(debris));
}

// Henry Gale's balloon ("The Whole Truth", season 2): the orange and yellow envelope caught in the trees,
// its yellow capsule gondola ("Minnesota Metallurgy") hanging from the rigging with its gas bottles,
// and the real Henry Gale's grave with a wooden marker.
function createBalloon(scene) {
  const g = new THREE.Group();
  const stripes = canvasTex(256, 256, (c, W) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#e2561d', '#f2b62f', '#e2561d', '#c83a22'][i % 4]; c.fillRect(i * W / 8, 0, W / 8, W); } c.fillStyle = 'rgba(40,30,20,.3)'; for (let i = 0; i < 60; i++) c.fillRect(Math.random() * W, Math.random() * W, 2 + Math.random() * 20, 1 + Math.random() * 3); });
  const envGeo = new THREE.SphereGeometry(5, 32, 18);
  const ep = envGeo.attributes.position;
  for (let i = 0; i < ep.count; i++) { const x = ep.getX(i), y = ep.getY(i), z = ep.getZ(i); ep.setXYZ(i, x * (1 + 0.1 * Math.sin(y * 2)), y * 0.35 + Math.sin(x * 0.7) * 0.8 + Math.sin(z * 1.3) * 0.4, z); }
  envGeo.computeVertexNormals();
  const env = new THREE.Mesh(envGeo, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8, side: THREE.DoubleSide }));
  env.position.y = 9; env.rotation.z = 0.4; g.add(env);
  // the fabric hanging down where it snagged
  const drape = new THREE.Mesh(new THREE.PlaneGeometry(3, 5, 4, 6), env.material);
  const dp = drape.geometry.attributes.position; for (let i = 0; i < dp.count; i++) dp.setZ(i, Math.sin(dp.getY(i) * 1.3) * 0.4);
  drape.position.set(-3.5, 6.5, 1); drape.rotation.y = 0.8; g.add(drape);
  // the gondola: a yellow capsule with a sponsor's panel and a rack of gas bottles on top
  const label = canvasTex(256, 128, (c, W, H) => {
    c.fillStyle = '#e8c93a'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#f4f1e6'; c.fillRect(40, 18, 176, 64); c.strokeStyle = '#2b4a8a'; c.lineWidth = 3; c.strokeRect(40, 18, 176, 64);
    c.fillStyle = '#2b4a8a'; c.font = '700 20px Jost, sans-serif'; c.textAlign = 'center'; c.fillText('MINNESOTA', W / 2, 44); c.fillText('METALLURGY', W / 2, 70);
    c.fillStyle = '#3a3020'; c.font = '600 12px Jost, sans-serif'; c.fillText('PROUDLY SPONSORED BY', W / 2, 104);
  });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe8c93a, roughness: 0.55, metalness: 0.1 });
  const pod = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 0.7, 6, 14), yellow); shell.scale.set(1.1, 1, 0.9); pod.add(shell);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshStandardMaterial({ map: label, roughness: 0.6 })); panel.position.set(0, 0.05, 0.69); pod.add(panel);
  const bottleM = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.7, roughness: 0.35 });
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 10), bottleM); b.position.set(-0.4 + i * 0.2, 1.35, 0); pod.add(b); }
  const rope = new THREE.MeshStandardMaterial({ color: 0x3a3325 });
  for (const [dx, dz] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]]) pod.add(strut(V(dx, 1.1, dz), V(dx * 0.3 - 1, 5.5, dz * 0.3), 0.02, rope, 4));
  pod.position.set(2.5, 2.2, 1.5); pod.rotation.set(0.1, 0.4, 0.35); g.add(pod);
  // the grave: a mound, a cross of branches and a stone
  const soil = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 1 });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), soil); mound.scale.set(0.8, 0.25, 1.4); mound.position.set(-4, 0, -4); g.add(mound);
  const wood = new THREE.MeshStandardMaterial({ color: 0x5e4a36, roughness: 1 });
  g.add(strut(V(-4, 0, -5.6), V(-4, 1.3, -5.6), 0.05, wood, 5)); g.add(strut(V(-4.4, 1, -5.6), V(-3.6, 1, -5.6), 0.04, wood, 5));
  const s = SITES.balloon;
  g.position.set(s.x, ground(s), s.z);
  scene.add(shadowy(g));
}

// Jacob's cabin, ringed by a line of ash ("The Man Behind the Curtain", season 3): a weathered plank shack
// with a porch, a stovepipe chimney and a dim lamp in the window, deep in the jungle.
function createJacobsCabin(scene) {
  const g = new THREE.Group();
  const boards = canvasTex(256, 128, (c, W, H) => {
    c.fillStyle = '#6d665b'; c.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 16) {
      c.fillStyle = `hsl(35, ${6 + Math.random() * 8}%, ${30 + Math.random() * 12}%)`; c.fillRect(x + 1, 0, 14, H);
      c.fillStyle = 'rgba(20,16,12,.55)'; c.fillRect(x, 0, 2, H);
      for (let k = 0; k < 6; k++) { c.fillStyle = 'rgba(30,24,18,.25)'; c.fillRect(x + 3 + Math.random() * 10, Math.random() * H, 1, 10 + Math.random() * 30); }
    }
    c.fillStyle = 'rgba(60,70,40,.35)'; c.fillRect(0, H * 0.82, W, H * 0.18);   // green stain near the ground
  });
  boards.wrapS = boards.wrapT = THREE.RepeatWrapping; boards.repeat.set(2, 1);
  const logM = new THREE.MeshStandardMaterial({ color: 0x5a4533, roughness: 1 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 4.1), new THREE.MeshStandardMaterial({ map: boards, roughness: 1 }));
  walls.position.y = 1.4 + 0.3; g.add(walls);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.35, 4.4), logM); sill.position.y = 0.17; g.add(sill);
  const roof = new THREE.Mesh(gableRoof(6.4, 5.2, 1.7), new THREE.MeshStandardMaterial({ color: 0x3b362f, roughness: 1, side: THREE.DoubleSide }));
  roof.position.y = 3.1; g.add(roof);
  // porch, steps and door
  const plank = new THREE.MeshStandardMaterial({ color: 0x6b553e, roughness: 1 });
  const porch = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.15, 1.6), plank); porch.position.set(0, 0.35, 2.9); g.add(porch);
  for (const x of [-2.4, 2.4]) g.add(strut(V(x, 0.35, 3.6), V(x, 2.95, 3.6), 0.08, logM, 6));
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 1.9), plank); porchRoof.position.set(0, 2.95, 2.95); porchRoof.rotation.x = -0.15; g.add(porchRoof);
  for (let i = 0; i < 2; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.4), plank); st.position.set(0, 0.12 + i * 0.12, 3.9 + (1 - i) * 0.35); g.add(st); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 1.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 }));
  door.position.set(-0.8, 1.35, 2.08); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.05), new THREE.MeshBasicMaterial({ color: 0xffb860 }));
  win.position.set(1.2, 1.7, 2.08); g.add(win);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0x2e2e2e, metalness: 0.6, roughness: 0.6 }));
  pipe.position.set(1.8, 3.9, -0.8); g.add(pipe);
  // the ring of ash
  const ashM = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 1 });
  const ashGeo = new THREE.RingGeometry(8, 8.5, 160, 2); const ap = ashGeo.attributes.position;
  for (let i = 0; i < ap.count; i++) { const x = ap.getX(i), y = ap.getY(i), r = Math.hypot(x, y), k = 1 + (Math.sin(Math.atan2(y, x) * 23) * 0.02 + R(-0.015, 0.015)) * (r > 8.25 ? 1 : -1); ap.setXY(i, x * k, y * k); }
  const ash = new THREE.Mesh(ashGeo, ashM); ash.rotation.x = -Math.PI / 2; ash.position.y = 0.08; g.add(ash);
  const s = SITES.jacobsCabin;
  g.position.set(s.x, ground(s), s.z); g.rotation.y = 0.5;
  scene.add(shadowy(g));
}

// Jacob's cave ("The Substitute", season 6): a cave at the foot of layered sandstone sea cliffs. On a rock
// at its mouth stand Jacob's scales with a white stone and a black stone; inside, by torchlight, the
// candidates' names and numbers are chalked across the rock.
function createJacobsCave(scene) {
  const g = new THREE.Group();
  const rock = strataMaterial('#b8905e', { moss: 0.35 });
  rock.side = THREE.DoubleSide;
  const cliff = cliffWall(64, 32, rock, { bend: 8, rough: 2.6, seed: 7.7, lean: 0.12, segs: 80, ribs: 4, ragged: 6, ends: 0.85 }); cliff.position.set(0, -5, -7); g.add(cliff);
  const topM = new THREE.MeshStandardMaterial({ color: 0x55682c, roughness: 1 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(54, 1, 34), topM); top.position.set(0, 19.5, -28); g.add(top);
  // fallen blocks on the rock shelf
  for (let i = 0; i < 9; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rock);
    r.position.set(R(-20, 20), R(0, 0.6), R(-4, 4)); if (Math.abs(r.position.x) < 5) r.position.x += 9;
    r.scale.set(R(0.8, 2.2), R(0.6, 1.6), R(0.8, 2)); r.rotation.set(R(0, 6), R(0, 6), R(0, 6)); g.add(r);
  }
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 9, 20, 1, true, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x050403, side: THREE.DoubleSide }));
  tunnel.rotation.set(Math.PI / 2, 0, Math.PI / 2); tunnel.position.set(0, 0, -7.5); g.add(tunnel);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.7, 6, 18, Math.PI), rock); lip.position.set(0, 0, -3.2); g.add(lip);
  // a torch in the mouth
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  g.add(strut(V(-2.2, 0, -3.6), V(-2.2, 1.6, -3.6), 0.04, new THREE.MeshStandardMaterial({ color: 0x3a2a18 }), 5));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 8), flameM); flame.position.set(-2.2, 1.8, -3.6); g.add(flame);
  // the names and numbers, chalked on the arch above the mouth
  const names = canvasTex(512, 128, (c, W, H) => {
    c.fillStyle = '#2b2622'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#d9d2c2'; c.font = '600 15px Georgia, serif';
    const list = ['4 LOCKE', '8 REYES', '15 FORD', '16 JARRAH', '23 SHEPHARD', '42 KWON', 'AUSTEN', 'LITTLETON', 'STRAUME', 'PACE', 'ROUSSEAU', 'LINUS'];
    // everyone but the six remaining candidates is crossed out
    list.forEach((n, i) => { c.save(); c.translate(20 + (i % 6) * 82, 38 + Math.floor(i / 6) * 48); c.rotate(R(-0.15, 0.15)); c.fillText(n, 0, 0); if (i >= 6) { c.strokeStyle = '#d9d2c2'; c.beginPath(); c.moveTo(-2, -5); c.lineTo(c.measureText(n).width + 2, -5); c.stroke(); } c.restore(); });
  });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshStandardMaterial({ map: names, roughness: 1 }));
  plaque.position.set(0, 2.7, -4.6); plaque.rotation.x = 0.9; g.add(plaque);   // on the cave's roof, just inside
  // Jacob's scales
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: 0.85, roughness: 0.35 });
  const stand = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), rock); stand.position.set(2.6, 0.4, 1.5); g.add(stand);
  g.add(strut(V(2.6, 0.9, 1.5), V(2.6, 2.1, 1.5), 0.03, brass, 6));
  g.add(strut(V(2.0, 2.05, 1.5), V(3.2, 2.15, 1.5), 0.025, brass, 6));
  for (const [x, y, c] of [[2.0, 1.75, 0xf2efe6], [3.2, 1.85, 0x111111]]) {
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.05, 14), brass); pan.position.set(x, y, 1.5); g.add(pan);
    g.add(strut(V(x, y, 1.5), V(x, y + 0.3, 1.5), 0.008, brass, 3));
    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 })); stone.position.set(x, y + 0.07, 1.5); g.add(stone);
  }
  const p = toCoastDistance(SITES.jacobsCave, 10), sea = seaDir(p.x, p.z);
  g.position.set(p.x, terrainH(p.x, p.z) - 0.4, p.z);
  g.rotation.y = Math.atan2(sea.x, sea.z);
  scene.add(shadowy(g));
}

// Hurley's DHARMA van: rusted and overgrown in the jungle, where he found Roger Workman's skeleton
// and got it running by rolling it downhill ("Tricia Tanaka Is Dead", season 3).
function createDharmaVan(scene) {
  const s = SITES.dharmaVan;
  const van = dharmaVan(s.x, s.z, 1.1, true);
  van.position.y = surfaceH(s.x, s.z);
  van.rotation.z = 0.05;
  // rust streaks and vines
  const rust = new THREE.MeshStandardMaterial({ color: 0x7a3c1c, roughness: 1 });
  for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(R(0.3, 0.9), R(0.2, 0.6), 0.02), rust); const side = i % 2 ? 1 : -1; p.position.set(R(-1.8, 1.8), R(0.5, 1.6), side * 0.915); van.add(p); }
  const vine = new THREE.MeshStandardMaterial({ color: 0x2f4a1c, roughness: 0.9 });
  for (let i = 0; i < 10; i++) { const x = R(-2, 2); van.add(strut(V(x, 2.2, R(-0.9, 0.9)), V(x + R(-0.3, 0.3), R(0.3, 1.2), 0.95 * (i % 2 ? 1 : -1)), 0.03, vine, 4)); }
  const beer = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.2, metalness: 0.3 });
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), beer); b.position.set(R(-3, 3), 0.1, R(1.5, 3)); b.rotation.z = Math.PI / 2; van.add(b); }
  scene.add(shadowy(van));
}

export function createStoryPlaces(scene) {
  createCockpit(scene);
  createCaves(scene);
  createGolf(scene);
  createRousseau(scene);
  createTail(scene);
  createBalloon(scene);
  createJacobsCabin(scene);
  createJacobsCave(scene);
  createDharmaVan(scene);
}
