// The island ground: beach, dunes, jungle floor, hills and the two mountains.
import * as THREE from 'three/webgpu';
import { float, vec2, vec3, sin, mix, smoothstep, abs, positionWorld, vertexColor, mx_noise_float } from 'three/tsl';
import { fbm, sstep, landDist, terrainH } from '../core/terrain-math.js';
import { SITES } from '../core/layout.js';

// A grid of vertices at the given x and z positions (uneven spacing = more detail where it matters).
export function gridGeometry(xs, zs, yFn) {
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 3, x = xs[i], z = zs[j];
    pos[k] = x; pos[k + 1] = yFn ? yFn(x, z) : 0; pos[k + 2] = z;
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function createTerrain(scene) {
  const xs = [], zs = [];
  // dense near the crash beach, coarser towards the far side of the island
  for (let i = 0; i <= 420; i++) { const s = i / 420 * 2 - 1; xs.push(s * 420 + s * s * s * 1350); }
  for (let j = 0; j <= 340; j++) { const t = j / 340; zs.push(-160 + t * 300 + t * t * t * 2000); }
  const g = gridGeometry(xs, zs, terrainH);
  g.computeVertexNormals();

  // vertex colours: wet sand, dry sand, beach grass, jungle floor, rock
  const p = g.attributes.position, nrm = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const C = (h) => new THREE.Color(h);
  const wet = C('#8f7a58'), sand = C('#e2cfa2'), sand2 = C('#cdb487'), grass = C('#6f7536'), floor = C('#35451f'), rock = C('#4a433c'), seabed = C('#5f7a6a');
  const lawn = C('#6f8a3c'), dirt = C('#5c4f3a');
  const clearing = C('#56602e');
  const B = SITES.barracks, T = SITES.temple, K = SITES.blackRock;
  const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = landDist(x, z);
    tmp.copy(sand).lerp(sand2, fbm(x * .08, z * .08, 3));
    if (d < 1) tmp.lerp(wet, sstep(1, -1, d) * .9);
    if (d < -4) tmp.lerp(seabed, sstep(-4, -40, d));
    tmp.lerp(grass, sstep(17, 27, d + (fbm(x * .1, z * .1, 2) - .5) * 8));
    tmp.lerp(floor, sstep(26, 40, d));
    const steep = 1 - nrm.getY(i);
    tmp.lerp(rock, sstep(0.22, 0.45, steep) * (d > 10 || x > 110 ? 1 : 0));
    if (y > 60) tmp.lerp(rock, sstep(80, 150, y) * .5);
    // the Barracks lawn and the trampled ground around the Temple
    tmp.lerp(lawn, 1 - sstep(70, 105, Math.hypot(x - B.x, z - B.z)));
    tmp.lerp(dirt, (1 - sstep(40, 70, Math.hypot(x - T.x, z - T.z))) * 0.7);
    tmp.lerp(clearing, (1 - sstep(25, 55, Math.hypot(x - K.x, z - K.z))) * 0.8);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  const pw = positionWorld;
  const grain = mx_noise_float(pw.mul(3.1)).mul(0.07).add(mx_noise_float(pw.mul(0.35)).mul(0.08));
  const wetF = smoothstep(0.1, 0.55, pw.y).oneMinus();
  // tiny sand ripples near the tide line
  const ripple = sin(pw.z.mul(5.0).add(mx_noise_float(pw.mul(0.8)).mul(3.0))).mul(0.03).mul(wetF);
  // wrack line: washed-up seaweed along the high-tide mark
  const dShore = pw.z.sub(sin(pw.x.mul(0.021)).mul(4.0).add(sin(pw.x.mul(0.057).add(1.3)).mul(2.5)));
  const wn = mx_noise_float(vec3(pw.xz.mul(vec2(0.35, 0.9)), 1.7));
  const wrack = smoothstep(0.0, 0.55, abs(dShore.sub(3.9).sub(wn.mul(0.9)))).oneMinus()
    .mul(smoothstep(-0.1, 0.35, mx_noise_float(vec3(pw.xz.mul(vec2(0.6, 2.5)), 4.2)))).mul(0.75);
  mat.colorNode = mix(vertexColor().mul(grain.add(ripple).add(1.0)).mul(mix(1.0, 0.62, wetF)), vec3(0.11, 0.095, 0.05), wrack);
  mat.roughnessNode = mix(float(0.95), float(0.32), wetF);

  const terrain = new THREE.Mesh(g, mat);
  terrain.receiveShadow = true;
  scene.add(terrain);
  return terrain;
}

// The ground height baked into a texture, so the ocean shader knows the water depth on every coast.
export const HEIGHTMAP = { x0: -1800, x1: 1800, z0: -700, z1: 2400, w: 512, h: 440 };
export function createHeightTexture() {
  const { x0, x1, z0, z1, w, h } = HEIGHTMAP;
  const data = new Uint16Array(w * h);
  for (let j = 0; j < h; j++) {
    const z = z0 + (j + 0.5) / h * (z1 - z0);
    for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) / w * (x1 - x0);
      data[j * w + i] = THREE.DataUtils.toHalfFloat(terrainH(x, z));
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}
