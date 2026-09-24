// Places from the survivors' story: the cockpit, the caves, Hurley's golf course, Rousseau's shelter,
// the tail section, Henry Gale's balloon, Jacob's cabin and Jacob's cave. Positions from Choekaas's map.
import * as THREE from 'three/webgpu';
import { SITES } from '../../core/layout.js';
import { terrainH, landDist, seaDir, toCoastDistance } from '../../core/terrain-math.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { stoneMaterial, gableRoof, strut } from './materials.js';

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
  nose.rotation.y = -Math.PI / 2; nose.scale.set(1, 1, 1.45); nose.position.x = 3; g.add(nose);
  const radome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 12), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5 }));
  radome.scale.set(0.8, 1, 1); radome.position.set(6.8, -0.6, 0); g.add(radome);
  // six cockpit window panes across the top of the nose
  for (let i = 0; i < 6; i++) {
    const a = (i - 2.5) * 0.28;
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.62), dark);
    w.position.set(5.1, 1.55, Math.sin(a) * 2.2); w.rotation.set(a * 0.9, -a, -0.55); g.add(w);
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
  g.rotation.set(0.25, 0.6, -0.35);
  // snapped tree trunks it crashed through
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 1 });
  const trees = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = R(0, Math.PI * 2), r = R(5, 11), h = R(2, 6);
    const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r, y = terrainH(x, z);
    trees.add(strut(V(x, y - 0.3, z), V(x + R(-0.4, 0.4), y + h, z + R(-0.4, 0.4)), R(0.25, 0.45), bark, 7));
    if (i % 2 === 0) trees.add(strut(V(x, y + h, z), V(x + R(-5, 5), y + 0.3, z + R(-5, 5)), R(0.2, 0.35), bark, 7));
  }
  scene.add(shadowy(g), shadowy(trees));
}

// The caves, with fresh water, where half the survivors moved ("White Rabbit", season 1):
// a cliff face with a dark cave mouth, a stream running out into a pool, a fire ring and water bottles.
function createCaves(scene) {
  const g = new THREE.Group();
  const rock = stoneMaterial('#6a6255', { moss: 0.55, scale: 0.35 });
  // the cliff: a row of big boulders stacked into a wall
  for (let i = 0; i < 16; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rock);
    const x = R(-14, 14), top = R(0, 1) < 0.5;
    r.position.set(x, top ? R(6, 10) : R(1, 5), R(-7, -2) - Math.abs(x) * 0.15);
    r.scale.set(R(2.5, 4.5), R(2, 3.8), R(2.5, 4));
    r.rotation.set(R(0, 6), R(0, 6), R(0, 6));
    g.add(r);
  }
  // the cave mouth: a dark arch going back into the rock
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 10, 20, 1, true, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x060504, side: THREE.DoubleSide }));
  tunnel.rotation.set(Math.PI / 2, 0, Math.PI / 2); tunnel.position.set(0, 0.1, -3); g.add(tunnel);
  const back = new THREE.Mesh(new THREE.CircleGeometry(2.8, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x030202 }));
  back.position.set(0, 0.1, -7.9); g.add(back);
  // a stream out of the cave into a pool
  const water = new THREE.MeshStandardMaterial({ color: 0x1f4448, roughness: 0.04, metalness: 0.3 });
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 9), water); stream.rotation.x = -Math.PI / 2; stream.position.set(0.6, 0.12, 3); g.add(stream);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.6, 28), water); pool.rotation.x = -Math.PI / 2; pool.position.set(1.5, 0.1, 8.5); g.add(pool);
  const pebbles = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, p = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.2, 0.45)), pebbles); p.position.set(1.5 + Math.cos(a) * 3.8, 0.1, 8.5 + Math.sin(a) * 3.8); g.add(p); }
  // a fire ring and the survivors' water bottles
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1 }));
  ash.rotation.x = -Math.PI / 2; ash.position.set(-5, 0.08, 4); g.add(ash);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), pebbles); st.position.set(-5 + Math.cos(a) * 0.8, 0.1, 4 + Math.sin(a) * 0.8); g.add(st); }
  const bottle = new THREE.MeshStandardMaterial({ color: 0xa8c8d8, roughness: 0.1, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 8), bottle); b.position.set(-2.5 + i * 0.18, 0.25, 5.2 + R(-0.1, 0.1)); g.add(b); }
  const s = SITES.caves, sea = seaDir(s.x, s.z);
  g.position.set(s.x, ground(s) - 0.2, s.z);
  g.rotation.y = Math.atan2(sea.x, sea.z);   // the cave mouth looks downhill, towards the sea
  scene.add(shadowy(g));
}

// Hurley's golf course, built from luggage and found clubs ("Solitary", season 1).
function createGolf(scene) {
  const g = new THREE.Group();
  const green = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshStandardMaterial({ color: 0x5f8f38, roughness: 0.85 }));
  green.rotation.x = -Math.PI / 2; green.position.y = 0.06; g.add(green);
  const bunker = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshStandardMaterial({ color: 0xd9c89c, roughness: 1 }));
  bunker.rotation.x = -Math.PI / 2; bunker.scale.x = 1.6; bunker.position.set(11, 0.05, 4); g.add(bunker);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));
  hole.rotation.x = -Math.PI / 2; hole.position.set(1, 0.08, -1); g.add(hole);
  g.add(strut(V(1, 0, -1), V(1, 2.4, -1), 0.03, new THREE.MeshStandardMaterial({ color: 0xeeeeee }), 5));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: 0xc8231f, side: THREE.DoubleSide }));
  flag.position.set(1.45, 2.1, -1); g.add(flag);
  // a golf bag made from a suitcase
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.35), new THREE.MeshStandardMaterial({ color: 0x1f3b5a })); bag.position.set(-6, 0.5, 5); bag.rotation.z = 0.2; g.add(bag);
  const s = SITES.golf;
  g.position.set(s.x, ground(s), s.z);
  scene.add(shadowy(g));
}

// Rousseau's shelter, where she held Sayid ("Solitary", season 1).
function createRousseau(scene) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
  const tarp = new THREE.MeshStandardMaterial({ color: 0x5e6440, roughness: 0.9, side: THREE.DoubleSide });
  for (const [x, z] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) g.add(strut(V(x, 0, z), V(x, 2.4, z), 0.08, wood, 5));
  const roof = new THREE.Mesh(gableRoof(5, 5, 1.2), tarp); roof.position.y = 2.4; g.add(roof);
  const cot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 2), wood); cot.position.set(-1, 0.25, 0); g.add(cot);
  // her traps: sharpened stakes around the camp
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; g.add(strut(V(Math.cos(a) * 7, 0, Math.sin(a) * 7), V(Math.cos(a) * 7.6, 1.2, Math.sin(a) * 7.6), 0.05, wood, 4)); }
  const s = SITES.rousseau;
  g.position.set(s.x, ground(s), s.z);
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

// Henry Gale's balloon, caught in the trees where the real Henry Gale was buried ("The Whole Truth", season 2).
function createBalloon(scene) {
  const g = new THREE.Group();
  const stripes = canvasTex(256, 256, (c, W) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#d8b23a' : '#b4312a'; c.fillRect(i * W / 8, 0, W / 8, W); } });
  const env = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 14), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8, side: THREE.DoubleSide }));
  const ep = env.geometry.attributes.position;
  for (let i = 0; i < ep.count; i++) { const y = ep.getY(i); ep.setY(i, y * 0.35 + Math.sin(ep.getX(i) * 0.7) * 0.8); }
  env.geometry.computeVertexNormals();
  env.position.y = 9; env.rotation.z = 0.4; g.add(env);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.4), new THREE.MeshStandardMaterial({ color: 0x8a6a3e, roughness: 1 }));
  basket.position.set(3, 0.5, 2); basket.rotation.z = 0.3; g.add(basket);
  const rope = new THREE.MeshStandardMaterial({ color: 0x3a3325 });
  for (const dx of [-0.6, 0.6]) g.add(strut(V(3 + dx, 1, 2), V(1 + dx, 7.5, 0), 0.03, rope, 4));
  const s = SITES.balloon;
  g.position.set(s.x, ground(s), s.z);
  scene.add(shadowy(g));
}

// Jacob's cabin, ringed by a line of ash ("The Man Behind the Curtain", season 3): a log cabin with a
// porch, a stovepipe chimney and a dim lamp in the window.
function createJacobsCabin(scene) {
  const g = new THREE.Group();
  const logM = new THREE.MeshStandardMaterial({ color: 0x5a4533, roughness: 1 });
  // log walls: stacked logs that overlap at the corners
  for (let row = 0; row < 8; row++) {
    const y = 0.2 + row * 0.34;
    for (const z of [-2, 2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 5.6, 8), logM); l.rotation.z = Math.PI / 2; l.position.set(0, y, z); g.add(l); }
    for (const x of [-2.6, 2.6]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 4.6, 8), logM); l.rotation.x = Math.PI / 2; l.position.set(x, y + 0.17, 0); g.add(l); }
  }
  const infill = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.7, 3.9), new THREE.MeshStandardMaterial({ color: 0x3e3024, roughness: 1 }));
  infill.position.y = 1.4; g.add(infill);
  const roof = new THREE.Mesh(gableRoof(6.4, 5.2, 1.7), new THREE.MeshStandardMaterial({ color: 0x33291f, roughness: 1, side: THREE.DoubleSide }));
  roof.position.y = 2.95; g.add(roof);
  // porch, steps and door
  const plank = new THREE.MeshStandardMaterial({ color: 0x6b553e, roughness: 1 });
  const porch = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.15, 1.6), plank); porch.position.set(0, 0.35, 2.9); g.add(porch);
  for (const x of [-2.4, 2.4]) g.add(strut(V(x, 0.35, 3.6), V(x, 2.95, 3.6), 0.08, logM, 6));
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 1.9), plank); porchRoof.position.set(0, 2.95, 2.95); porchRoof.rotation.x = -0.15; g.add(porchRoof);
  for (let i = 0; i < 2; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.4), plank); st.position.set(0, 0.12 + i * 0.12, 3.9 + (1 - i) * 0.35); g.add(st); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 1.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 }));
  door.position.set(-0.8, 1.3, 2.02); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.05), new THREE.MeshBasicMaterial({ color: 0xffb860 }));
  win.position.set(1.2, 1.6, 2.02); g.add(win);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0x2e2e2e, metalness: 0.6, roughness: 0.6 }));
  pipe.position.set(1.8, 3.9, -0.8); g.add(pipe);
  // the ring of ash
  const ash = new THREE.Mesh(new THREE.RingGeometry(8, 8.6, 96), new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 1 }));
  ash.rotation.x = -Math.PI / 2; ash.position.y = 0.08; g.add(ash);
  const s = SITES.jacobsCabin;
  g.position.set(s.x, ground(s), s.z); g.rotation.y = 0.5;
  scene.add(shadowy(g));
}

// Jacob's cave on the south coast, with the candidates' names on its ceiling ("The Substitute", season 6).
function createJacobsCave(scene) {
  const g = new THREE.Group();
  const rock = stoneMaterial('#4c4640', { moss: 0.2, scale: 0.35 });
  rockPile(g, rock, 16, 13, 7, -1);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(3.5, 20), new THREE.MeshBasicMaterial({ color: 0x040302 }));
  mouth.scale.y = 0.75; mouth.position.set(0, 2.2, 7.2); g.add(mouth);
  const p = toCoastDistance(SITES.jacobsCave, 10), sea = seaDir(p.x, p.z);
  g.position.set(p.x, terrainH(p.x, p.z) - 0.5, p.z);
  g.rotation.y = Math.atan2(sea.x, sea.z);
  scene.add(shadowy(g));
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
}
