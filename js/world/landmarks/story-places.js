// Places from the survivors' story: the cockpit, the caves, Hurley's golf course, Rousseau's shelter,
// the tail section, Henry Gale's balloon, Jacob's cabin and Jacob's cave. Positions from Choekaas's map.
import * as THREE from 'three/webgpu';
import { SITES } from '../../core/layout.js';
import { terrainH, seaDir, toCoastDistance } from '../../core/terrain-math.js';
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

// The cockpit, torn off the plane and lodged in the trees ("Pilot", season 1).
function createCockpit(scene) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.6, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151a1e, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 7, 32, 1, true), white);
  body.material.side = THREE.DoubleSide; body.rotation.z = Math.PI / 2; g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.9, 32, 16, 0, Math.PI), white);
  nose.rotation.y = -Math.PI / 2; nose.scale.set(1, 1, 1.5); nose.position.x = 3.5; g.add(nose);
  for (const z of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 1.1), dark); w.position.set(5.4, 1.1, z * 0.8); w.rotation.z = -0.5; g.add(w); }
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.93, 2.93, 7, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d3160, side: THREE.DoubleSide }));
  stripe.rotation.z = Math.PI / 2; stripe.scale.set(1, 1, 0.08); stripe.position.y = -0.3; g.add(stripe);
  const s = SITES.cockpit;
  g.position.set(s.x, ground(s) + 3.5, s.z);
  g.rotation.set(0.25, 0.6, -0.35);
  scene.add(shadowy(g));
}

// The caves, with fresh water, where half the survivors moved ("White Rabbit", season 1).
function createCaves(scene) {
  const g = new THREE.Group();
  const rock = stoneMaterial('#5d564c', { moss: 0.5, scale: 0.3 });
  rockPile(g, rock, 14, 12, 6);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), new THREE.MeshBasicMaterial({ color: 0x050403 }));
  mouth.position.set(0, 2.6, 5.8); mouth.scale.y = 0.8; g.add(mouth);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshStandardMaterial({ color: 0x1b3a3a, roughness: 0.05, metalness: 0.3 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(-3, 0.15, 10); g.add(pool);
  const s = SITES.caves;
  g.position.set(s.x, ground(s) - 0.5, s.z);
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

// The tail section, which crashed on the far side of the island ("The Other 48 Days", season 2).
function createTail(scene) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xe4e2da, roughness: 0.55, metalness: 0.2 });
  const logo = canvasTex(512, 512, (c, W) => {
    c.fillStyle = '#e4e2da'; c.fillRect(0, 0, W, W);
    c.translate(W / 2, W / 2);
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillStyle = i % 2 ? '#b3202e' : '#1d3160'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 120, 0, Math.PI / 3.6); c.closePath(); c.fill(); }
    c.fillStyle = '#e4e2da'; c.beginPath(); c.arc(0, 0, 45, 0, Math.PI * 2); c.fill();
  });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(3, 0.9, 12, 24, 1, true), white);
  cone.material.side = THREE.DoubleSide; cone.rotation.z = Math.PI / 2; g.add(cone);
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(7, 0); shape.lineTo(9.5, 8); shape.lineTo(6.5, 8); shape.closePath();
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }), [new THREE.MeshStandardMaterial({ map: logo, roughness: 0.55 }), white]);
  fin.geometry.computeBoundingBox();
  const uvs = fin.geometry.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) / 10, uvs.getY(i) / 8);
  fin.position.set(-6, 1.5, -0.15); g.add(fin);
  const p = toCoastDistance(SITES.tail, 8), sea = seaDir(p.x, p.z);
  g.position.set(p.x, terrainH(p.x, p.z) + 1.4, p.z);
  g.rotation.set(0.15, Math.atan2(sea.z, -sea.x), 0.1);
  scene.add(shadowy(g));
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

// Jacob's cabin, ringed by a line of ash ("The Man Behind the Curtain", season 3).
function createJacobsCabin(scene) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4d3b2b, roughness: 1 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 4), wood); walls.position.y = 1.4; g.add(walls);
  const roof = new THREE.Mesh(gableRoof(5.8, 4.8, 1.6), new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 1, side: THREE.DoubleSide }));
  roof.position.y = 2.8; g.add(roof);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.05), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
  win.position.set(1.3, 1.7, 2.03); g.add(win);
  const ash = new THREE.Mesh(new THREE.RingGeometry(8, 8.6, 64), new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 1 }));
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
