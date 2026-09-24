// The Statue of Taweret: all that remains is the four-toed foot on a stone plinth,
// standing on the rocks off the west coast ("Live Together, Die Alone", season 2).
import * as THREE from 'three/webgpu';
import { SITES, ISLAND } from '../../core/layout.js';
import { R, shadowy } from '../../core/utils.js';
import { stoneMaterial } from './materials.js';

// The calf: an oval column that swells a little, broken off on a slant with a ragged edge.
function calfGeometry() {
  const g = new THREE.CylinderGeometry(1, 1, 1, 32, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), t = p.getY(i) + 0.5;         // t: 0 at the ankle, 1 at the break
    const a = Math.atan2(z, x);
    const r = 1 + 0.12 * Math.sin(t * Math.PI) + (t < 0.15 ? (0.15 - t) * 1.6 : 0);   // calf swell, ankle flare
    let y = t * 15;
    if (t > 0.99) y -= 3.2 + 2.6 * Math.cos(a) + 0.7 * Math.abs(Math.sin(a * 5.3)) + 0.4 * Math.abs(Math.sin(a * 11)); // slanted break
    p.setXYZ(i, x * 3.2 * r, y, z * 3.9 * r);
  }
  g.computeVertexNormals();
  return g;
}

export function createStatue(scene) {
  const s = SITES.statue;
  const g = new THREE.Group();
  const stone = stoneMaterial('#bba98c', { moss: 0.1, scale: 0.25 });
  const rockM = new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.9, flatShading: true });

  // the rock outcrop it stands on, half in the sea
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2 + R(-0.2, 0.2), rad = R(8, 17);
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rockM);
    r.position.set(Math.cos(a) * rad, R(-2.5, 0.3), Math.sin(a) * rad);
    r.scale.set(R(3.5, 7), R(2, 4), R(3.5, 7));
    r.rotation.set(R(0, 6), R(0, 6), R(0, 6));
    g.add(r);
  }
  // stepped plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(22, 3.2, 26), stone);
  plinth.position.set(0, 1.1, 1.5); g.add(plinth);
  const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(18, 1.4, 22), stone);
  plinth2.position.set(0, 3.4, 1.5); g.add(plinth2);
  const top = 4.1;

  // the foot: a long rounded sole from heel to the base of the toes
  const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), stone);
  foot.scale.set(6.2, 5.2, 9.5); foot.position.set(0, top, 0.5); g.add(foot);
  // the calf, rising from the heel end of the foot
  const calf = new THREE.Mesh(calfGeometry(), stone);
  calf.position.set(0, top + 2.5, -2.6); g.add(calf);

  // four big toes, the outer ones smaller, each with a flat nail
  const toes = [[-3.6, 1.9, 3.2, 0.2], [-1.2, 1.75, 3.4, 0.9], [1.2, 1.6, 3.0, 0.6], [3.5, 1.4, 2.4, -0.2]];
  for (const [x, r, len, dz] of toes) {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 18), stone);
    t.rotation.x = Math.PI / 2;
    t.position.set(x, top + r * 0.92, 8.2 + dz);
    g.add(t);
    const nail = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 14, 8), stone);
    nail.scale.set(1, 0.32, 0.85);
    nail.position.set(x, top + r * 1.72, 8.2 + dz + len * 0.42);
    g.add(nail);
  }

  g.position.set(s.x, -0.8, s.z);
  // toes face out to sea
  g.rotation.y = Math.atan2(s.x - ISLAND.cx, s.z - ISLAND.cz);
  scene.add(shadowy(g));
  return g;
}
