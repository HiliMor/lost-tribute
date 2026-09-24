// The places you can visit, with where the camera goes and a line of story for each.
import * as THREE from 'three/webgpu';
import { SITES, ISLAND } from '../core/layout.js';
import { terrainH } from '../core/terrain-math.js';

export const PLACES = [
  {
    id: 'crash', name: 'Crash site, south shore', ref: 'Oceanic 815 · Season 1 · "Pilot"',
    text: 'The middle of Oceanic 815 came down on the south shore. The survivors camped beside the wreck and kept a signal fire burning.',
    view: { to: [0, 2.2, 13], from: [32, 4.5, -7] },
  },
  {
    id: 'hatch', name: 'The Hatch', ref: 'Season 1 · "Deus Ex Machina"',
    text: 'Locke and Boone found a steel hatch buried in the jungle. Inside was the Swan station. Slide to night to see its light.',
    site: 'hatch', lift: 5, offset: [16, -1, -20],
  },
  {
    id: 'beechcraft', name: 'The Beechcraft', ref: 'Season 1 · "Deus Ex Machina"',
    text: 'A drug-smuggling plane wedged in the canopy. Boone climbed inside and reached someone on its radio, just before it fell.',
    site: 'beechcraft', lift: 8, offset: [15, 5, -15],
  },
  {
    id: 'blackRock', name: 'The Black Rock', ref: 'Season 1 · "Exodus"',
    text: 'A 19th-century slaving ship, stranded far inland. Its crates of old dynamite were used to blow open the hatch.',
    site: 'blackRock', lift: 4, offset: [44, 12, -26],
  },
  {
    id: 'statue', name: 'The Statue of Taweret', ref: 'Season 2 · "Live Together, Die Alone"',
    text: 'Sailing along the coast, Sayid, Jin and Sun saw a giant stone foot with four toes: all that was left of an ancient statue.',
    site: 'statue', lift: 11, sea: 90, side: 18, height: 8,
  },
  {
    id: 'temple', name: 'The Temple', ref: 'Season 6 · "LA X"',
    text: 'An ancient temple behind high stone walls, where the Others took refuge under the protection of the Monster.',
    site: 'temple', lift: 10, offset: [10, 42, -125],
  },
  {
    id: 'radio', name: 'The Radio Tower', ref: 'Season 3 · "Through the Looking Glass"',
    text: "Danielle Rousseau's distress call looped from this tower for sixteen years.",
    site: 'radio', lift: 22, offset: [42, 4, -58],
  },
  {
    id: 'barracks', name: 'The Barracks', ref: 'Season 3 · "A Tale of Two Cities"',
    text: "The DHARMA Initiative's village of small houses, later home to the Others. The sonic fence kept the jungle out.",
    site: 'barracks', lift: 3, offset: [0, 75, -175],
  },
  {
    id: 'lighthouse', name: 'The Lighthouse', ref: 'Season 6 · "Lighthouse"',
    text: "Jacob's lighthouse. Turn its mirror to a candidate's number and you see their home. Its lantern burns at night.",
    site: 'lighthouse', lift: 14, sea: 85, side: 30, height: 14,
  },
  {
    id: 'hydra', name: 'Hydra Island', ref: 'Season 3 · "A Tale of Two Cities"',
    text: 'The small island off the coast where Jack, Kate and Sawyer were held. Kate and Sawyer spent days in the bear cages.',
    site: 'hydra', lift: 3, offset: [-70, 26, -55],
  },
];

export const OVERVIEW = {
  id: 'overview', name: 'The Island', ref: 'Somewhere in the South Pacific',
  text: 'Pick a place on the map to fly there.',
  view: { to: [60, 40, 780], from: [1650, 1250, -950] },
};

// Camera position and look-at point for a place.
export function viewFor(place) {
  if (place.view) return { from: new THREE.Vector3(...place.view.from), to: new THREE.Vector3(...place.view.to) };
  const s = SITES[place.site];
  const to = new THREE.Vector3(s.x, Math.max(0, terrainH(s.x, s.z)) + place.lift, s.z);
  if (place.sea) {
    // coastal landmarks are seen from the water
    const out = new THREE.Vector3(s.x - ISLAND.cx, 0, s.z - ISLAND.cz).normalize();
    const side = new THREE.Vector3(-out.z, 0, out.x);
    const from = to.clone().addScaledVector(out, place.sea).addScaledVector(side, place.side);
    from.y = place.height;
    return { from, to };
  }
  return { from: to.clone().add(new THREE.Vector3(...place.offset)), to };
}
