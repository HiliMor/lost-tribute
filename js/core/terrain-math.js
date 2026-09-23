// Terrain math, shared by the terrain mesh and by everything placed on the island.

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

// The shoreline: z position of the waterline for a given x.
export const shoreZ = (x) => 4 * Math.sin(x * 0.021) + 2.5 * Math.sin(x * 0.057 + 1.3);

// Beach slope near the waterline (metres of height per metre inland).
export const SLOPE = 0.08;

export function terrainH(x, z) {
  const d = z - shoreZ(x);
  let h = d * SLOPE;
  if (d < 0) h = -14 * (1 - Math.exp(d * SLOPE / 14));
  h += sstep(7, 20, d) * (fbm(x * .05, z * .05, 3) - .5) * 1.0;                 // dunes
  const jd = Math.max(0, d - 24);
  h += Math.pow(jd, 1.25) * 0.13;                                                // jungle rise
  h += sstep(22, 48, d) * (fbm(x * .018, z * .018) - .38) * 16;                 // hills
  h += 118 * Math.exp(-((x - 70) ** 2 + (z - 330) ** 2) / (2 * 78 ** 2)) * (.7 + .6 * fbm(x * .03, z * .03, 4));
  h += 64 * Math.exp(-((x + 230) ** 2 + (z - 300) ** 2) / (2 * 62 ** 2)) * (.7 + .6 * fbm(x * .03 + 9, z * .03, 4));
  const hd = sstep(118, 185, x);                                                 // rocky headland (east)
  h += hd * (6 + 16 * fbm(x * .04, z * .04, 4)) * sstep(-40, 6, d);
  return h;
}
