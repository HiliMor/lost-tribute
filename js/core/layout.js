// Where things are on the Island. Laid out after Jonah Adkins' 2010 fan map (the only detailed map
// made after the finale, and the one most shared by fans), cross-checked with Choekaas's satellite-style
// map: the crash beach on the south coast, the Hatch and caves just inland, the Beechcraft and the
// Black Rock in the middle, Taweret halfway up the west coast, the Temple in the north-west,
// the Barracks in the north, the Lighthouse on the south-east peninsula and Hydra Island to the east.
// Compressed so the whole island can be explored. Units are metres; +x is east, +z is north.

// The main island: an oval, taller north-south than wide, whose south edge is cut by the crash beach.
export const ISLAND = { cx: 0, cz: 820, stretch: 1.18 };
const angleTo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function islandR(theta) {
  return 860 + 50 * Math.sin(3 * theta + 0.5) + 36 * Math.sin(5 * theta + 1.7) + 24 * Math.sin(9 * theta + 0.3)
    + 22 * Math.sin(13 * theta + 2.1) + 12 * Math.sin(21 * theta + 0.7)
    - 150 * Math.exp(-((angleTo(theta, 2.75) / 0.15) ** 2))     // the bay on the west coast (French camp)
    + 90 * Math.exp(-((angleTo(theta, 1.75) / 0.12) ** 2))      // the north shore point
    + 190 * Math.exp(-((angleTo(theta, -0.62) / 0.2) ** 2));    // the south-east peninsula (Lighthouse)
}
// Polar coordinates around the island centre, with north-south squashed so the outline is a circle.
export function islandPolar(x, z) {
  const dx = x - ISLAND.cx, dz = (z - ISLAND.cz) / ISLAND.stretch;
  return { theta: Math.atan2(dz, dx), r: Math.hypot(dx, dz) };
}
// A point on the main coastline at a compass angle (radians, 0 = east, PI/2 = north), `inset` metres inland.
export function coastPoint(theta, inset = 0) {
  const r = islandR(theta) - inset;
  return { x: ISLAND.cx + Math.cos(theta) * r, z: ISLAND.cz + Math.sin(theta) * r * ISLAND.stretch };
}

// Hydra Island, a small island off the east coast.
export const HYDRA = { x: 1330, z: 1050, r: 170 };

const deg = (d) => d * Math.PI / 180;
const statue = coastPoint(deg(192), -18);        // just offshore, halfway up the west coast
const lighthouse = coastPoint(deg(-36), 26);     // on the cliffs of the south-east peninsula

// Landmark positions (ground height is taken from the terrain at runtime).
export const SITES = {
  crash:      { x: 4, z: 11 },
  hatch:      { x: -58, z: 64 },
  beechcraft: { x: 30, z: 470 },
  blackRock:  { x: 150, z: 620 },
  statue,
  temple:     { x: -250, z: 1330 },
  radio:      { x: -470, z: 800 },
  barracks:   { x: 60, z: 1560 },
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
