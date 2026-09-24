// Where things are on the Island. Traced from Choekaas's fan map of the Island (updated fall 2024),
// the map r/lost recommends as the most accurate. See tools/build-island.py for how the coastline,
// mountains and landmark positions are extracted from it.
//
// The world is that map rotated so the crash site's beach runs along world +x with the sea to the
// south (-z). Units are metres. toWorld() / toMap() convert between map pixels and the world.
import META from '../data/island-meta.js';

const { anchor, tangent: t, normal: n, shore, metresPerPx: M } = META.map;

// map pixel (quarter resolution, y pointing down) -> world metres
export function toWorld(mx, my) {
  const dx = (mx - anchor[0]) * M, dy = (my - anchor[1]) * M;
  return { x: dx * t[0] + dy * t[1] + shore[0], z: dx * n[0] + dy * n[1] + shore[1] };
}
// world metres -> map pixel
export function toMap(x, z) {
  const dx = x - shore[0], dz = z - shore[1];
  return { x: anchor[0] + (dx * t[0] + dz * n[0]) / M, y: anchor[1] + (dx * t[1] + dz * n[1]) / M };
}
export const MAP_SIZE = { width: META.map.width, height: META.map.height };

// The middle of the main island.
export const ISLAND = META.centre;

// Landmark positions, read off the map (ground height is taken from the terrain at runtime).
// The wreck itself keeps its place on the hand-built crash beach.
export const SITES = { ...META.sites, crash: { x: 4, z: 11 } };
// the middle of the Hydra runway, so the whole strip is levelled
SITES.runwayM = { x: (SITES.runwayA.x + SITES.runwayB.x) / 2, z: (SITES.runwayA.z + SITES.runwayB.z) / 2 };

// Open ground around landmarks: the terrain is levelled there and no jungle is planted.
// `r` = radius in metres, `flat` = how strongly the ground is levelled (0..1).
export const CLEARINGS = [
  { site: 'barracks',   r: 125, flat: 0.9 },
  { site: 'temple',     r: 125, flat: 0.97 },
  { site: 'blackRock',  r: 70,  flat: 0.85 },
  { site: 'radio',      r: 45,  flat: 0.6 },
  { site: 'lighthouse', r: 28,  flat: 0.8 },
  { site: 'hydra',      r: 45,  flat: 0.8 },
  { site: 'statue',     r: 30,  flat: 0 },
  { site: 'beechcraft', r: 7,   flat: 0 },
  { site: 'hatch',      r: 32,  flat: 0.4 },
  { site: 'golf',       r: 62,  flat: 0.9 },
  { site: 'flame',      r: 45,  flat: 0.85 },
  { site: 'orchid',     r: 30,  flat: 0.8 },
  { site: 'jacobsCabin', r: 26, flat: 0.95 },
  { site: 'pearl',      r: 22,  flat: 0.7 },
  { site: 'arrow',      r: 20,  flat: 0.6 },
  { site: 'rousseau',   r: 20,  flat: 0.6 },
  { site: 'staff',      r: 20,  flat: 0 },
  { site: 'caves',      r: 30,  flat: 0.8 },
  { site: 'cockpit',    r: 14,  flat: 0 },
  { site: 'balloon',    r: 10,  flat: 0 },
  { site: 'tail',       r: 30,  flat: 0 },
  { site: 'subDock',    r: 30,  flat: 0 },
  { site: 'jacobsCave', r: 25,  flat: 0 },
  { site: 'runwayA',    r: 45,  flat: 0.8 },
  { site: 'runwayB',    r: 45,  flat: 0.8 },
  { site: 'runwayM',    r: 45,  flat: 0.8 },
  { site: 'room23',     r: 18,  flat: 0.7 },
  { site: 'dharmaVan',  r: 14,  flat: 0.5 },
];
