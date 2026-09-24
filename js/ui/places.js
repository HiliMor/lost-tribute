// The places you can visit, with where the camera goes and a line of story for each.
import * as THREE from 'three/webgpu';
import { SITES, ISLAND } from '../core/layout.js';
import { terrainH, seaDir, toCoastDistance } from '../core/terrain-math.js';
import { uSunDir } from '../core/uniforms.js';

export const PLACES = [
  {
    id: 'crash', name: 'Crash site, south shore', ref: 'Oceanic 815 · Season 1 · "Pilot"',
    text: 'The middle of Oceanic 815 came down on the south shore. The survivors camped beside the wreck and kept a signal fire burning.',
    view: { to: [0, 2.2, 13], from: [32, 4.5, -7] },
  },
  {
    id: 'hatch', name: 'The Hatch', ref: 'Season 1 · "Deus Ex Machina"',
    text: 'Locke and Boone found a steel hatch buried in the jungle. Inside was the Swan station. Slide to night to see its light.',
    site: 'hatch', lift: 1, dist: 20, rise: 8,
  },
  {
    id: 'beechcraft', name: 'The Beechcraft', ref: 'Season 1 · "Deus Ex Machina"',
    text: 'A drug-smuggling plane wedged in the canopy. Boone climbed inside and reached someone on its radio, just before it fell.',
    site: 'beechcraft', lift: 8, dist: 26, rise: 4,
  },
  {
    id: 'blackRock', name: 'The Black Rock', ref: 'Season 1 · "Exodus"',
    text: 'A 19th-century slaving ship, stranded far inland. Its crates of old dynamite were used to blow open the hatch.',
    site: 'blackRock', lift: 4, dist: 55, rise: 14,
  },
  {
    id: 'statue', name: 'The Statue of Taweret', ref: 'Season 2 · "Live Together, Die Alone"',
    text: 'Sailing along the coast, Sayid, Jin and Sun saw a giant stone foot with four toes: all that was left of an ancient statue.',
    site: 'statue', lift: 11, offshore: -12, sea: 90, side: 18, height: 8,
  },
  {
    id: 'temple', name: 'The Temple', ref: 'Season 6 · "LA X"',
    text: 'An ancient temple behind high stone walls, where the Others took refuge under the protection of the Monster.',
    site: 'temple', lift: 10, dist: 130, rise: 45,
  },
  {
    id: 'radio', name: 'The Radio Tower', ref: 'Season 3 · "Through the Looking Glass"',
    text: "Danielle Rousseau's distress call looped from this tower for sixteen years.",
    site: 'radio', lift: 22, dist: 60, rise: 8,
  },
  {
    id: 'barracks', name: 'The Barracks', ref: 'Season 3 · "A Tale of Two Cities"',
    text: "The DHARMA Initiative's village of small houses, later home to the Others. The sonic fence kept the jungle out.",
    site: 'barracks', lift: 3, dist: 190, rise: 80,
  },
  {
    id: 'lighthouse', name: 'The Lighthouse', ref: 'Season 6 · "Lighthouse"',
    text: "Jacob's lighthouse. Turn its mirror to a candidate's number and you see their home. Its lantern burns at night.",
    site: 'lighthouse', lift: 14, sea: 85, side: 30, height: 14,
  },
  {
    id: 'hydra', name: 'Hydra Island', ref: 'Season 3 · "A Tale of Two Cities"',
    text: 'The small island off the coast where Jack, Kate and Sawyer were held. Kate and Sawyer spent days in the bear cages.',
    site: 'hydra', lift: 3, dist: 90, rise: 28,
  },
];

export const OVERVIEW = {
  id: 'overview', name: 'The Island', ref: 'Somewhere in the South Pacific',
  text: 'Pick a place on the map to fly there.',
  view: 'overview',
};

// How much of the line from the camera to the target is blocked by hills or treetops
// (metres, 0 = clear view). Near the landmark itself the ground is a clearing.
function blocked(from, to, clearR) {
  let worst = 0;
  const len = Math.hypot(to.x - from.x, to.z - from.z);
  for (let i = 1; i < 32; i++) {
    const u = i / 32, x = from.x + (to.x - from.x) * u, z = from.z + (to.z - from.z) * u;
    const trees = (1 - u) * len > clearR ? 11 : 1;
    worst = Math.max(worst, terrainH(x, z) + trees - (from.y + (to.y - from.y) * u));
  }
  return worst;
}

// Camera position and look-at point for a place.
export function viewFor(place) {
  if (place.view === 'overview') {
    // high above the sea to the south-west of the island, looking across all of it
    const to = new THREE.Vector3(ISLAND.x, 40, ISLAND.z);
    return { from: to.clone().add(new THREE.Vector3(1500, 1350, -1650)), to };
  }
  if (place.view) return { from: new THREE.Vector3(...place.view.from), to: new THREE.Vector3(...place.view.to) };
  const s = place.offshore ? toCoastDistance(SITES[place.site], place.offshore) : SITES[place.site];
  const to = new THREE.Vector3(s.x, Math.max(0, terrainH(s.x, s.z)) + place.lift, s.z);
  if (place.sea) {
    // coastal landmarks are seen from the water
    const sea = seaDir(s.x, s.z);
    const out = new THREE.Vector3(sea.x, 0, sea.z), side = new THREE.Vector3(-out.z, 0, out.x);
    const from = to.clone().addScaledVector(out, place.sea).addScaledVector(side, place.side);
    from.y = place.height;
    return { from, to };
  }
  // inland: try every direction and keep the clearest one, preferring the side the sun lights
  const sun = new THREE.Vector2(uSunDir.value.x, uSunDir.value.z).normalize();
  let best = null;
  for (let k = 0; k < 32; k++) {
    const a = k / 32 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    const from = new THREE.Vector3(s.x + dx * place.dist, 0, s.z + dz * place.dist);
    from.y = Math.max(to.y + place.rise, terrainH(from.x, from.z) + 15);   // stay above the treetops
    const score = blocked(from, to, place.clear ?? 30) * 10 + (from.y - to.y - place.rise) - (dx * sun.x + dz * sun.y) * 4;
    if (!best || score < best.score) best = { score, from };
  }
  return { from: best.from, to };
}
