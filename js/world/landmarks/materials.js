// Shared materials and helpers for the landmarks.
import * as THREE from 'three/webgpu';
import { vec3, mix, smoothstep, step, fract, floor, sin, hash, positionWorld, normalWorld, mx_noise_float } from 'three/tsl';
import { fbm } from '../../core/terrain-math.js';

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

// Layered sandstone, as in the sea cliffs by Jacob's cave: bands of ochre and rust, eroded into ledges.
export function strataMaterial(hex = '#a0754a', { moss = 0.2 } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  const c = new THREE.Color(hex), pw = positionWorld;
  const wob = mx_noise_float(pw.mul(0.08)).mul(2.2);
  const band = sin(pw.y.add(wob).mul(2.1)).mul(0.5).add(0.5);
  const band2 = sin(pw.y.add(wob.mul(0.5)).mul(7.3)).mul(0.5).add(0.5);
  const fine = mx_noise_float(pw.mul(2.5)).mul(0.06);
  const col = mix(vec3(c.r, c.g, c.b), vec3(c.r * 0.62, c.g * 0.5, c.b * 0.42), band.mul(0.7).add(band2.mul(0.25))).add(fine);
  const mossMask = smoothstep(0.55, 0.9, normalWorld.y).mul(moss);
  m.colorNode = mix(col, vec3(0.2, 0.26, 0.11), mossMask);
  return m;
}

// A rock face `w` wide and `h` tall, facing +z with its foot at y = 0: a bumpy sheet bent into an arc
// (`bend` = how far the ends curl forward, in m), thicker at the bottom so it reads as a hillside.
export function cliffWall(w, h, mat, { bend = 3, rough = 1.6, seed = 0, lean = 0.15, segs = 48, ribs = 0, ragged = 0, ends = 0 } = {}) {
  const g = new THREE.PlaneGeometry(w, h, segs, Math.round(segs * h / w) + 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), u = x / (w / 2);
    let y = p.getY(i) + h / 2;
    const n = (fbm(x * 0.18 + seed, y * 0.18 + seed * 0.7, 4) - 0.5) * 2;
    const ledges = Math.sin(y * 1.3 + fbm(x * 0.1, seed, 2) * 4) * 0.25;
    // `ribs`: vertical buttresses and gullies worn by rain; `ragged`: an uneven skyline
    const rib = ribs * (fbm(x * 0.09 + seed * 1.3, 0.5, 3) - 0.5) * 2;
    if (y > h - 0.01) y -= ragged * fbm(x * 0.06 + seed, 2.5, 3);
    // `ends`: the cliff slopes down to the ground at both ends instead of stopping in a sheer edge
    if (ends) { const e = Math.min(1, Math.max(0, (Math.abs(u) - 0.45) / 0.55)); y *= 1 - ends * e * e * (3 - 2 * e); }
    const z = bend * u * u - n * rough + rib + ledges - y * lean + (1 - Math.min(1, y / 3)) * 1.2;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  return m;
}
