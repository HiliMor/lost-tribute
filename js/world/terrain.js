// The island ground: beach, dunes, jungle floor, hills and the two mountains.
import * as THREE from 'three/webgpu';
import { float, vec2, vec3, sin, mix, smoothstep, abs, length, positionWorld, vertexColor, attribute, mx_noise_float } from 'three/tsl';
import { fbm, sstep, landDist, terrainH, WORLD_BOUNDS } from '../core/terrain-math.js';
import { SITES, CLEARINGS } from '../core/layout.js';

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

// The height of the terrain mesh as drawn (its triangles interpolate between grid points, which can
// differ from terrainH() where the grid is coarse). Use it to set props down on the visible ground.
let grid = null;
const cellOf = (arr, v) => { let lo = 0, hi = arr.length - 2; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m] <= v) lo = m; else hi = m - 1; } return lo; };
export function surfaceH(x, z) {
  if (!grid) return terrainH(x, z);
  const i = cellOf(grid.xs, x), j = cellOf(grid.zs, z);
  const x0 = grid.xs[i], x1 = grid.xs[i + 1], z0 = grid.zs[j], z1 = grid.zs[j + 1];
  const u = Math.min(1, Math.max(0, (x - x0) / (x1 - x0))), v = Math.min(1, Math.max(0, (z - z0) / (z1 - z0)));
  const a = terrainH(x0, z0), b = terrainH(x1, z0), c = terrainH(x0, z1), d = terrainH(x1, z1);
  // the grid's two triangles per cell (a, c, b) and (b, c, d)
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

export function createTerrain(scene) {
  const xs = [], zs = [];
  // dense near the crash beach, coarser towards the far side of the island
  const { x0, x1, z0, z1 } = WORLD_BOUNDS;
  const spread = (n, lo, hi, core) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n * 2 - 1, side = u < 0 ? -lo : hi, a = Math.abs(u);
      out.push(Math.sign(u) * (core * a + (side - core) * a * a * a));
    }
    return out;
  };
  xs.push(...spread(460, x0, x1, 380));
  zs.push(...spread(420, z0, z1, 300));
  const g = gridGeometry(xs, zs, terrainH);
  g.computeVertexNormals();
  grid = { xs, zs };

  // vertex colours: wet sand, dry sand, beach grass, jungle floor, rock
  const p = g.attributes.position, nrm = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const C = (h) => new THREE.Color(h);
  const wet = C('#8f7a58'), sand = C('#e2cfa2'), sand2 = C('#cdb487'), grass = C('#6f7536'), floor = C('#44552a'), rock = C('#4a433c'), seabed = C('#5f7a6a');
  const lawn = C('#6f8a3c'), dirt = C('#5c4f3a');
  const clearing = C('#56602e'), meadow = C('#6b8a36'), meadow2 = C('#859a44');
  // open grass in every clearing (the Temple courtyard and the runway are bare earth instead)
  const bare = { temple: 1, runwayA: 1, runwayB: 1, runwayM: 1, hatch: 1 };
  const glades = CLEARINGS.filter((c) => !bare[c.site]).map((c) => ({ ...SITES[c.site], r: Math.max(12, c.r) }));
  const litterW = new Float32Array(p.count);
  const B = SITES.barracks, T = SITES.temple, K = SITES.blackRock, SH = SITES.hatch;
  const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = landDist(x, z);
    tmp.copy(sand).lerp(sand2, fbm(x * .08, z * .08, 3));
    if (d < 1) tmp.lerp(wet, sstep(1, -1, d) * .9);
    if (d < -4) tmp.lerp(seabed, sstep(-4, -40, d));
    tmp.lerp(grass, sstep(17, 27, d + (fbm(x * .1, z * .1, 2) - .5) * 8));
    tmp.lerp(floor, sstep(26, 40, d));
    let glade = 0;
    for (const c of glades) glade = Math.max(glade, 1 - sstep(c.r * 0.75, c.r * 1.2, Math.hypot(x - c.x, z - c.z)));
    glade *= sstep(6, 16, d);
    tmp.lerp(meadow2.clone().lerp(meadow, fbm(x * .05, z * .05, 3)), glade * 0.9);
    litterW[i] = sstep(26, 40, d) * (1 - glade);
    const steep = 1 - nrm.getY(i);
    tmp.lerp(rock, sstep(0.22, 0.45, steep) * (d > 10 ? 1 : 0) * (1 - glade * 0.85));
    if (y > 120) tmp.lerp(rock, sstep(160, 260, y) * .35);   // the high peaks are green too, as on Oahu's ridges
    // the Barracks lawn and the trampled ground around the Temple
    tmp.lerp(lawn, 1 - sstep(70, 105, Math.hypot(x - B.x, z - B.z)));
    tmp.lerp(dirt, (1 - sstep(40, 70, Math.hypot(x - T.x, z - T.z))) * 0.7);
    tmp.lerp(clearing, (1 - sstep(25, 55, Math.hypot(x - K.x, z - K.z))) * 0.8);
    tmp.lerp(clearing, (1 - sstep(10, 30, Math.hypot(x - SH.x, z - SH.z))) * 0.7);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('litter', new THREE.BufferAttribute(litterW, 1));

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
    .mul(smoothstep(-0.1, 0.35, mx_noise_float(vec3(pw.xz.mul(vec2(0.6, 2.5)), 4.2)))).mul(0.75)
    .mul(smoothstep(90.0, 160.0, length(pw.xz.sub(vec2(4.0, 5.0)))).oneMinus());   // only on the crash beach
  // jungle floor: fallen leaves and moss, mottled at two scales
  const vc = vertexColor();
  const jungleF = attribute('litter', 'float').mul(0.8);
  const mossN = mx_noise_float(pw.mul(0.22).add(3.0));
  const leafN = mx_noise_float(pw.mul(1.7)).mul(0.5).add(0.5);
  const litter = mix(vec3(0.13, 0.09, 0.045), vec3(0.075, 0.13, 0.035), smoothstep(-0.4, 0.2, mossN)).mul(leafN.mul(0.6).add(0.75));
  const ground = mix(vc.mul(grain.add(ripple).add(1.0)).mul(mix(1.0, 0.62, wetF)), litter, jungleF);
  mat.colorNode = mix(ground, vec3(0.11, 0.095, 0.05), wrack);
  mat.roughnessNode = mix(float(0.95), float(0.32), wetF);

  const terrain = new THREE.Mesh(g, mat);
  terrain.receiveShadow = true;
  scene.add(terrain);
  return terrain;
}

// The ground height baked into a texture, so the ocean shader knows the water depth on every coast.
export const HEIGHTMAP = { ...WORLD_BOUNDS, w: 560, h: 520 };
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
