// Terrain math, shared by the terrain mesh, the ocean depth map and everything placed on the island.
import { islandR, islandPolar, HYDRA, SITES, CLEARINGS } from './layout.js';

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

// The crash beach: z position of the waterline along the south coast.
export const shoreZ = (x) => 4 * Math.sin(x * 0.021) + 2.5 * Math.sin(x * 0.057 + 1.3);

// Beach slope near the waterline (metres of height per metre inland).
export const SLOPE = 0.08;

// Signed distance to the coast in metres: positive on land, negative at sea.
export function landDist(x, z) {
  const dSouth = z - shoreZ(x);
  const { theta, r } = islandPolar(x, z);
  const dIsland = islandR(theta) - r;
  const main = Math.min(dSouth, dIsland);
  const hx = x - HYDRA.x, hz = z - HYDRA.z, ht = Math.atan2(hz, hx);
  const dHydra = HYDRA.r + 25 * Math.sin(3 * ht + 1) + 15 * Math.sin(5 * ht) - Math.hypot(hx, hz);
  return Math.max(main, dHydra);
}

function terrainRaw(x, z, d) {
  if (d < -45) return -14 * (1 - Math.exp(d * SLOPE / 14));      // open sea: skip the land features
  let h = d * SLOPE;
  if (d < 0) h = -14 * (1 - Math.exp(d * SLOPE / 14));
  h += sstep(7, 20, d) * (fbm(x * .05, z * .05, 3) - .5) * 1.0;                 // dunes
  const jd = Math.max(0, d - 24);
  h += Math.pow(Math.min(jd, 150), 1.25) * 0.13 + Math.max(0, jd - 150) * 0.05; // jungle rise
  h += sstep(22, 48, d) * (fbm(x * .018, z * .018) - .38) * 16;                 // hills
  // the two peaks behind the crash beach
  h += 118 * Math.exp(-((x - 70) ** 2 + (z - 330) ** 2) / (2 * 78 ** 2)) * (.7 + .6 * fbm(x * .03, z * .03, 4));
  h += 64 * Math.exp(-((x + 230) ** 2 + (z - 300) ** 2) / (2 * 62 ** 2)) * (.7 + .6 * fbm(x * .03 + 9, z * .03, 4));
  const hd = sstep(118, 185, x) * (1 - sstep(300, 420, z));                     // rocky headland east of the beach
  h += hd * (6 + 16 * fbm(x * .04, z * .04, 4)) * sstep(-40, 6, d);
  const inland = sstep(10, 140, d);
  if (inland > 0) {
    // the eastern plateau: a long mountain ridge running north-south
    const xe = 380 + 70 * Math.sin(z * 0.004);
    h += inland * 230 * Math.exp(-(((x - xe) / 160) ** 2)) * sstep(200, 480, z) * (1 - sstep(1450, 1750, z)) * (0.6 + 0.8 * fbm(x * .01 + 3, z * .01, 4));
    // the western plateau
    const xw = -430 + 60 * Math.sin(z * 0.005 + 1);
    h += inland * 180 * Math.exp(-(((x - xw) / 150) ** 2)) * sstep(350, 600, z) * (1 - sstep(1250, 1500, z)) * (0.6 + 0.8 * fbm(x * .01 + 7, z * .01, 4));
    // rolling ground in the central valley
    h += inland * 30 * sstep(100, 400, z) * fbm(x * .006, z * .006, 3);
  }
  // Hydra Island is low and flat compared with the main island
  if (x > 1000) h = h > 0 ? h * (1 - 0.72 * sstep(1000, 1090, x)) : h;
  // the lighthouse cliff on the east coast
  const lh = Math.hypot(x - SITES.lighthouse.x, z - SITES.lighthouse.z);
  if (lh < 400) h += 30 * Math.exp(-((lh / 110) ** 2)) * sstep(-4, 18, d);
  return h;
}

// Level the ground in clearings around landmarks (centre heights are measured once).
let clearingData = null;
function clearings() {
  if (!clearingData) {
    clearingData = CLEARINGS.filter((c) => c.flat > 0).map((c) => {
      const s = SITES[c.site];
      return { x: s.x, z: s.z, r: c.r, flat: c.flat, h: terrainRaw(s.x, s.z, landDist(s.x, s.z)) };
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
