// Terrain math, shared by the terrain mesh, the ocean depth map and everything placed on the island.
// The coastline and mountains come from a grid traced from Choekaas's map (js/data/island.bin);
// around the camp, the hand-built crash beach takes over.
import META from '../data/island-meta.js';
import { SITES, CLEARINGS } from './layout.js';

export function h2(i, j) { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }

function vnoise(x, y) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1);
  const ab = a + (b - a) * u, cd = c + (d - c) * u;
  return ab + (cd - ab) * v;
}

export function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s; }

export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The crash beach: z position of the waterline along the south coast, near the camp.
export const shoreZ = (x) => 4 * Math.sin(x * 0.021) + 2.5 * Math.sin(x * 0.057 + 1.3);

// Beach slope near the waterline (metres of height per metre inland).
export const SLOPE = 0.08;

/* ---------- the traced map grid ---------- */
const G = META.grid;
const cells = G.nx * G.nz;
const raw = new Int16Array(await (await fetch(new URL('../data/island.bin', import.meta.url))).arrayBuffer());
export const WORLD_BOUNDS = { x0: G.x0, z0: G.z0, x1: G.x0 + (G.nx - 1) * G.cell, z1: G.z0 + (G.nz - 1) * G.cell };

function sampleGrid(offset, scale, outside, x, z) {
  const fx = (x - G.x0) / G.cell, fz = (z - G.z0) / G.cell;
  if (fx < 0 || fz < 0 || fx >= G.nx - 1 || fz >= G.nz - 1) return outside;
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = offset + j * G.nx + i;
  const a = raw[k], b = raw[k + 1], c = raw[k + G.nx], d = raw[k + G.nx + 1];
  return ((a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v) * scale;
}
const mapDist = (x, z) => sampleGrid(0, G.sdfScale, -400, x, z);
const mapHeight = (x, z) => sampleGrid(cells, G.heightScale, 0, x, z);

// Signed distance to the coast in metres: positive on land, negative at sea.
export function landDist(x, z) {
  const dm = mapDist(x, z);
  const dc = Math.hypot(x - 4, z - 5);
  if (dc > 160) return dm;
  const ds = z - shoreZ(x);                       // the hand-built beach near the camp
  return ds + (dm - ds) * sstep(70, 160, dc);
}

// Direction towards the sea (unit x/z) from a point, following the coastline distance.
export function seaDir(x, z) {
  const e = 8;
  const gx = landDist(x + e, z) - landDist(x - e, z), gz = landDist(x, z + e) - landDist(x, z - e);
  const len = Math.hypot(gx, gz) || 1;
  return { x: -gx / len, z: -gz / len };
}
// Walk from a point towards the sea until the coast distance reaches `target` (e.g. -10 = 10 m offshore).
export function toCoastDistance(p, target) {
  let x = p.x, z = p.z;
  for (let i = 0; i < 300; i++) {
    const d = landDist(x, z);
    if (Math.abs(d - target) < 1) break;
    const s = seaDir(x, z), step = Math.max(-4, Math.min(4, d - target));
    x += s.x * step; z += s.z * step;
  }
  return { x, z };
}

function terrainRaw(x, z, d) {
  if (d < -45) return -14 * (1 - Math.exp(d * SLOPE / 14));      // open sea: skip the land features
  let h = d * SLOPE;
  if (d < 0) h = -14 * (1 - Math.exp(d * SLOPE / 14));
  h += sstep(7, 20, d) * (fbm(x * .05, z * .05, 3) - .5) * 1.0;                 // dunes
  const jd = Math.max(0, d - 24);
  h += Math.pow(Math.min(jd, 120), 1.2) * 0.1;                                  // jungle rise
  h += sstep(22, 48, d) * (fbm(x * .018, z * .018) - .38) * 14;                 // hills
  h += mapHeight(x, z) * sstep(18, 110, d);                                     // mountains from the map
  h += sstep(40, 160, d) * (fbm(x * .06 + 5, z * .06, 4) - .5) * 10;            // rough ground inland
  // the lighthouse stands on a cliff
  const L = SITES.lighthouse, lh = Math.hypot(x - L.x, z - L.z);
  if (lh < 300) h += 26 * Math.exp(-((lh / 90) ** 2)) * sstep(-4, 16, d);
  return h;
}

// Level the ground in clearings around landmarks (centre heights are measured once).
let clearingData = null;
function clearings() {
  if (!clearingData) {
    clearingData = CLEARINGS.filter((c) => c.flat > 0).map((c) => {
      // level to the average height across the clearing, so it sits in the land rather than on a peak
      const s = SITES[c.site];
      let sum = 0, n = 0;
      for (let k = 0; k < 25; k++) {
        const a = k * 2.4, rr = c.r * 0.7 * Math.sqrt(k / 24), x = s.x + Math.cos(a) * rr, z = s.z + Math.sin(a) * rr;
        sum += terrainRaw(x, z, landDist(x, z)); n++;
      }
      return { x: s.x, z: s.z, r: c.r, flat: c.flat, h: Math.max(1.5, sum / n) };
    });
  }
  return clearingData;
}

export function terrainH(x, z) {
  const d = landDist(x, z);
  let h = terrainRaw(x, z, d);
  if (d > 0) {
    for (const c of clearings()) {
      const dist = Math.hypot(x - c.x, z - c.z);
      if (dist < c.r) h += (c.h - h) * c.flat * (1 - sstep(c.r * 0.55, c.r, dist));
    }
  }
  return h;
}
