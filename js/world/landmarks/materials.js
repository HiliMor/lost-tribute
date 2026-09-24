// Shared materials and helpers for the landmarks.
import * as THREE from 'three/webgpu';
import { vec3, mix, smoothstep, step, fract, floor, hash, positionWorld, normalWorld, mx_noise_float } from 'three/tsl';

const UP = new THREE.Vector3(0, 1, 0);

// Weathered stone: blotchy colour, moss on upward faces, optional masonry courses (`blocks` = course height in m).
export function stoneMaterial(hex, { moss = 0.3, scale = 0.5, blocks = 0, roughness = 0.92 } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness });
  const c = new THREE.Color(hex);
  const pw = positionWorld;
  const blotch = mx_noise_float(pw.mul(scale)).mul(0.5).add(0.5);
  const fine = mx_noise_float(pw.mul(4.0)).mul(0.07);
  let col = vec3(c.r, c.g, c.b).mul(blotch.mul(0.28).add(0.84)).add(fine);
  if (blocks > 0) {
    const course = pw.y.div(blocks);
    const row = floor(course);
    const bed = step(0.9, fract(course));
    const joint = step(0.94, fract(pw.x.add(pw.z).div(blocks * 1.7).add(hash(row.add(50.0)).mul(0.5))));
    col = col.mul(bed.add(joint).clamp(0, 1).mul(-0.38).add(1.0)).mul(hash(row.add(7.0)).mul(0.12).add(0.94));
  }
  const up = normalWorld.y.clamp(0, 1);
  const mossMask = smoothstep(0.35, 0.75, up.mul(blotch.add(0.25))).mul(moss);
  m.colorNode = mix(col, vec3(0.17, 0.23, 0.1), mossMask);
  return m;
}

// Old ship timber: dark planks, grain, moss creeping over the upper faces; darker inside.
export function woodMaterial(hex = '#3a2716', { planks = 0.38, moss = 0.6 } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, side: THREE.DoubleSide });
  const c = new THREE.Color(hex);
  const pw = positionWorld;
  const plank = smoothstep(0.86, 0.96, fract(pw.y.div(planks))).mul(0.4);
  const grain = mx_noise_float(pw.mul(vec3(0.4, 6.0, 0.4))).mul(0.08);
  const base = vec3(c.r, c.g, c.b).mul(plank.oneMinus()).add(grain);
  const mossMask = smoothstep(0.1, 0.6, mx_noise_float(pw.mul(0.3))).mul(smoothstep(0.2, 0.8, normalWorld.y)).mul(moss);
  m.colorNode = mix(base, vec3(0.16, 0.22, 0.09), mossMask);
  return m;
}

// A cylinder running from p0 to p1 (struts, legs, rigging, bars).
export function strut(p0, p1, r, mat, sides = 5) {
  const d = new THREE.Vector3().subVectors(p1, p0);
  const len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, sides), mat);
  m.position.copy(p0).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// A triangular gable roof (open prism), `w` wide, `d` deep, `h` tall, base at y = 0.
export function gableRoof(w, d, h) {
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([-w / 2, 0, -d / 2, 0, h, -d / 2, w / 2, 0, -d / 2, -w / 2, 0, d / 2, 0, h, d / 2, w / 2, 0, d / 2]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 0, 2, 1, 3, 4, 5]);
  g.computeVertexNormals();
  return g;
}
