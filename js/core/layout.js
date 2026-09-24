// Where things are on the Island. Laid out after the fan-reconstructed maps of the show
// (the crash beach on the south coast, the Barracks in the far north, Taweret on the west coast,
// Hydra Island offshore to the east), compressed so the whole island can be explored.
// Units are metres; +x is east, +z is north.

// The main island: a lumpy disc whose southern edge is cut by the crash beach.
export const ISLAND = { cx: 0, cz: 760 };
const angleTo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function islandR(theta) {
  return 860 + 55 * Math.sin(3 * theta + 0.5) + 40 * Math.sin(5 * theta + 1.7) + 25 * Math.sin(9 * theta + 0.3)
    + 22 * Math.sin(13 * theta + 2.1) + 12 * Math.sin(21 * theta + 0.7)
    - 150 * Math.exp(-((angleTo(theta, 2.88) / 0.16) ** 2))     // the bay on the west coast
    + 95 * Math.exp(-((angleTo(theta, 2.2) / 0.11) ** 2));      // the north-west headland
}
// A point on the main coastline at a compass angle (radians, 0 = east, PI/2 = north), `inset` metres inland.
export function coastPoint(theta, inset = 0) {
  const r = islandR(theta) - inset;
  return { x: ISLAND.cx + Math.cos(theta) * r, z: ISLAND.cz + Math.sin(theta) * r };
}

// Hydra Island, a small island to the east.
export const HYDRA = { x: 1250, z: 950, r: 170 };

const deg = (d) => d * Math.PI / 180;
const statue = coastPoint(deg(215), -18);        // just offshore, on the rocks of the west coast
const lighthouse = coastPoint(deg(18), 26);      // on the cliff above the east coast

// Landmark positions (ground height is taken from the terrain at runtime).
export const SITES = {
  crash:      { x: 4, z: 11 },
  hatch:      { x: -58, z: 64 },
  beechcraft: { x: -122, z: 152 },
  blackRock:  { x: 90, z: 660 },
  statue,
  temple:     { x: -160, z: 1040 },
  radio:      { x: -420, z: 760 },
  barracks:   { x: 90, z: 1390 },
  lighthouse,
  hydra:      { x: HYDRA.x - 40, z: HYDRA.z - 20 },
};

// Open ground around landmarks: the terrain is levelled there and no jungle is planted.
// `r` = radius in metres, `flat` = how strongly the ground is levelled (0..1).
export const CLEARINGS = [
  { site: 'barracks',   r: 125, flat: 0.9 },
  { site: 'temple',     r: 105, flat: 0.95 },
  { site: 'blackRock',  r: 55,  flat: 0.85 },
  { site: 'radio',      r: 18,  flat: 0.7 },
  { site: 'lighthouse', r: 28,  flat: 0.8 },
  { site: 'hydra',      r: 45,  flat: 0.8 },
  { site: 'statue',     r: 30,  flat: 0 },
  { site: 'beechcraft', r: 7,   flat: 0 },
  { site: 'hatch',      r: 10,  flat: 0 },
];
