// The Beechcraft: a drug-smuggling plane wedged nose-down in the jungle canopy.
// Boone climbed in and radioed for help ("Deus Ex Machina", season 1).
import * as THREE from 'three/webgpu';
import { vec3, mix, smoothstep, positionWorld, normalWorld, mx_noise_float } from 'three/tsl';
import { SITES } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { R, shadowy } from '../../core/utils.js';
import { strut } from './materials.js';

// Faded white paint with jungle grime streaking down it.
function grimyPaint(hex) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.7, metalness: 0.2 });
  const c = new THREE.Color(hex);
  const pw = positionWorld;
  const streak = smoothstep(0.1, 0.8, mx_noise_float(pw.mul(vec3(1.4, 0.35, 1.4)))).mul(0.45);
  const moss = smoothstep(0.3, 0.9, mx_noise_float(pw.mul(0.9))).mul(smoothstep(0.3, 0.9, normalWorld.y)).mul(0.7);
  m.colorNode = mix(mix(vec3(c.r, c.g, c.b), vec3(0.28, 0.25, 0.18), streak), vec3(0.17, 0.23, 0.1), moss);
  return m;
}

export function createBeechcraft(scene) {
  const site = SITES.beechcraft;
  const plane = new THREE.Group();
  const white = grimyPaint('#d9d4c4');
  const stripe = new THREE.MeshStandardMaterial({ color: 0x6d2a22, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151a1e, roughness: 0.35 });

  // fuselage along +z (nose forward), tapering to the tail
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.5, 11, 18), white);
  body.rotation.x = Math.PI / 2; plane.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 12), white);
  nose.scale.set(1, 0.95, 1.7); nose.position.z = 5.5; plane.add(nose);
  const cheat = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.62, 8.5, 18, 1, true), stripe);
  cheat.rotation.x = Math.PI / 2; cheat.scale.set(1, 1, 0.1); cheat.position.set(0, -0.05, -0.3); plane.add(cheat);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.4), dark);
  glass.position.set(0, 0.6, 4.1); glass.rotation.x = 0.25; plane.add(glass);
  for (const z of [2.2, 1.0, -0.2, -1.4]) for (const x of [-0.93, 0.93]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.6), dark); w.position.set(x, 0.25, z); plane.add(w);
  }
  // left wing intact with its engine; right wing snapped, hanging down
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.22, 2.1), white);
  wingL.position.set(-4.4, -0.35, 1.3); wingL.rotation.z = 0.05; plane.add(wingL);
  const stubR = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 2.1), white);
  stubR.position.set(2.0, -0.35, 1.3); plane.add(stubR);
  const brokenR = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 2.0), white);
  brokenR.position.set(4.7, -1.9, 1.3); brokenR.rotation.z = -0.95; plane.add(brokenR);
  for (const x of [-2.8, 2.8]) {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.4, 2.8, 14), white);
    eng.rotation.x = Math.PI / 2; eng.position.set(x, -0.3, 2.2); plane.add(eng);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.06), dark);
    prop.position.set(x, -0.3, 3.65); prop.rotation.z = x > 0 ? 0.6 : 1.9; plane.add(prop);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 2.0), white);
  fin.position.set(0, 1.3, -4.9); fin.rotation.x = -0.3; plane.add(fin);
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 1.3), white);
  tailplane.position.set(0, 0.25, -5.0); plane.add(tailplane);

  // wedged nose-down in the canopy
  const ground = terrainH(site.x, site.z);
  plane.rotation.set(-0.62, 1.1, 0.4, 'YXZ');
  plane.position.set(site.x, ground + 8.5, site.z);

  // the trees holding it: trunks, snapped branches and clumps of foliage around it
  const group = new THREE.Group();
  group.add(plane);
  const bark = new THREE.MeshStandardMaterial({ color: 0x3a2c1f, roughness: 1 });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x2c4a1c, roughness: 0.9 });
  const V = (x, y, z) => new THREE.Vector3(site.x + x, ground + y, site.z + z);
  for (const [x, z, h, lean] of [[-3, 2, 13, 0.1], [3.5, -2, 12, -0.15], [0.5, 4.5, 11, 0.05], [-4.5, -3.5, 12, 0.12]]) {
    group.add(strut(V(x, -0.5, z), V(x + lean * h, h, z), 0.35, bark, 8));
  }
  group.add(strut(V(-3, 7, 2), V(0.2, 8.2, 0.4), 0.16, bark, 6));
  group.add(strut(V(3.5, 6.5, -2), V(0.8, 9.4, 0.2), 0.14, bark, 6));
  // foliage behind and below the plane (the camera looks from the south-east)
  for (let i = 0; i < 18; i++) {
    const a = R(1.2, 4.3), r = R(3.5, 8);
    const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(R(1.0, 2.2), 2), leaves);
    clump.position.copy(V(-Math.cos(a) * r * 0.8 - 1, R(4, 10), Math.sin(a) * r + 1));
    clump.scale.set(R(1, 1.5), R(0.6, 0.9), R(1, 1.5));
    group.add(clump);
  }
  scene.add(shadowy(group));
  return group;
}
