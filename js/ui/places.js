// The places you can visit, with where the camera goes and a line of story for each.
import * as THREE from 'three/webgpu';
import { SITES, ISLAND, CLEARINGS } from '../core/layout.js';
import { terrainH, seaDir, toCoastDistance } from '../core/terrain-math.js';
import { uSunDir } from '../core/uniforms.js';

// In story order. `season` groups the list in the island map.
export const PLACES = [
  {
    id: 'crash', season: 1, name: 'Crash site, south shore', ref: 'Oceanic 815 · Season 1 · "Pilot"',
    text: 'The middle of Oceanic 815 came down on the south shore. The survivors camped beside the wreck and kept a signal fire burning.',
    view: { to: [0, 2.2, 13], from: [32, 4.5, -7] },
  },
  {
    id: 'cockpit', season: 1, name: 'The Cockpit', ref: 'Season 1 · "Pilot"',
    text: 'Jack, Kate and Charlie trekked into the jungle to find the transceiver. The pilot was still alive, until the Monster took him.',
    site: 'cockpit', lift: 3, dist: 30, rise: 20, clear: 14,
  },
  {
    id: 'caves', season: 1, name: 'The Caves', ref: 'Season 1 · "White Rabbit"',
    text: 'Jack found fresh water in the caves, and half the survivors moved there. Inside lay "Adam and Eve", two old skeletons.',
    site: 'caves', lift: 3, dist: 30, rise: 5, front: true,
  },
  {
    id: 'golf', season: 1, name: 'The Golf Course', ref: 'Season 1 · "Solitary"',
    text: "Hurley built a golf course from clubs found in the luggage, to give everyone a break from being stranded.",
    site: 'golf', lift: 1, dist: 45, rise: 14, clear: 48,
  },
  {
    id: 'rousseau', season: 1, name: "Rousseau's shelter", ref: 'Season 1 · "Solitary"',
    text: 'Danielle Rousseau, shipwrecked sixteen years earlier, caught Sayid in one of her traps and held him here.',
    site: 'rousseau', lift: 1.2, dist: 14, rise: 3,
  },
  {
    id: 'beechcraft', season: 1, name: 'The Beechcraft', ref: 'Season 1 · "Deus Ex Machina"',
    text: 'A drug-smuggling plane wedged in the canopy. Boone climbed inside and reached someone on its radio, just before it fell.',
    site: 'beechcraft', lift: 8, dist: 26, rise: 4,
  },
  {
    id: 'hatch', season: 1, name: 'The Hatch', ref: 'Season 1 · "Deus Ex Machina"',
    text: 'Locke and Boone found a steel hatch buried in the jungle. Inside was the Swan station. Slide to night to see its light.',
    site: 'hatch', lift: 0, dist: 13, rise: 4,
  },
  {
    id: 'blackRock', season: 1, name: 'The Black Rock', ref: 'Season 1 · "Exodus"',
    text: 'A 19th-century slaving ship, stranded far inland. Its crates of old dynamite were used to blow open the hatch.',
    site: 'blackRock', lift: 2, dist: 34, rise: 13, face: 2.12,
  },
  {
    id: 'radio', season: 1, name: 'The Radio Tower', ref: 'Season 1 · "Pilot" · Season 3',
    text: "Danielle Rousseau's distress call looped from this tower for sixteen years.",
    site: 'radio', lift: 22, dist: 60, rise: 8,
  },
  {
    id: 'tail', season: 2, name: 'The Tail Section', ref: 'Season 2 · "The Other 48 Days"',
    text: 'The tail of Oceanic 815 came down on the far side of the island. Its survivors were hunted by the Others from the first night.',
    site: 'tail', lift: 4, offshore: 8, sea: 70, side: 25, height: 9,
  },
  {
    id: 'arrow', season: 2, name: 'The Arrow', ref: 'Season 2 · "The Other 48 Days"',
    text: 'The tail section survivors took shelter in this DHARMA station, and found a glass eye and a Bible.',
    site: 'arrow', lift: 1, dist: 25, rise: 8,
  },
  {
    id: 'staff', season: 2, name: 'The Staff', ref: 'Season 2 · "Maternity Leave"',
    text: "The DHARMA medical station where the Others held Claire and took her baby's vaccines.",
    site: 'staff', lift: 1.5, dist: 24, rise: 6,
  },
  {
    id: 'pearl', season: 2, name: 'The Pearl', ref: 'Season 2 · "?"',
    text: 'Locke and Eko found this observation station, whose monitors watched the Swan. Pressing the button was a psychological experiment.',
    site: 'pearl', lift: 0.5, dist: 14, rise: 4, front: true,
  },
  {
    id: 'balloon', season: 2, name: "Henry Gale's balloon", ref: 'Season 2 · "The Whole Truth"',
    text: "The real Henry Gale's balloon, and his grave. The man in the Swan's armoury had lied: he was Ben, leader of the Others.",
    site: 'balloon', lift: 6, dist: 28, rise: 6, clear: 12,
  },
  {
    id: 'statue', season: 2, name: 'The Statue of Taweret', ref: 'Season 2 · "Live Together, Die Alone"',
    text: 'Sailing along the coast, Sayid, Jin and Sun saw a giant stone foot with four toes: all that was left of an ancient statue.',
    site: 'statue', lift: 11, offshore: -12, sea: 90, side: 18, height: 8,
  },
  {
    id: 'barracks', season: 3, name: 'The Barracks', ref: 'Season 3 · "A Tale of Two Cities"',
    text: "The DHARMA Initiative's village of small houses, later home to the Others. The sonic fence kept the jungle out.",
    site: 'barracks', lift: 3, dist: 110, rise: 38,
  },
  {
    id: 'hydra', season: 3, name: 'Hydra Island', ref: 'Season 3 · "A Tale of Two Cities"',
    text: 'The small island off the coast where Jack, Kate and Sawyer were held. Kate and Sawyer spent days in the bear cages.',
    site: 'hydra', lift: 3, dist: 90, rise: 28,
  },
  {
    id: 'flame', season: 3, name: 'The Flame', ref: 'Season 3 · "Enter 77"',
    text: "DHARMA's communication station, a farmhouse with a satellite dish. Locke typed 77 into its computer and blew it up.",
    site: 'flame', lift: 3, dist: 60, rise: 18, clear: 45,
  },
  {
    id: 'subDock', season: 3, name: 'The Submarine dock', ref: 'Season 3 · "The Man from Tallahassee"',
    text: "The Others' only way off the island, until Locke blew up the submarine to keep everyone there.",
    site: 'subDock', lift: 1, offshore: -18, sea: 55, side: 30, height: 14,
  },
  {
    id: 'jacobsCabin', season: 3, name: "Jacob's cabin", ref: 'Season 3 · "The Man Behind the Curtain"',
    text: "Ben brought Locke to meet Jacob in this cabin, ringed by a line of ash. Someone inside whispered \"Help me.\"",
    site: 'jacobsCabin', lift: 2, dist: 28, rise: 8, clear: 24,
  },
  {
    id: 'lookingGlass', season: 3, name: 'The Looking Glass', ref: 'Season 3 · "Through the Looking Glass"',
    text: 'An underwater station blocking the island\'s signals. Charlie swam down to switch the jammer off, and drowned. "Not Penny\'s boat."',
    site: 'lookingGlass', lift: 1.5, sea: 45, side: 20, height: 7, water: true,
  },
  {
    id: 'orchid', season: 4, name: 'The Orchid', ref: 'Season 4 · "There\'s No Place Like Home"',
    text: 'Under this greenhouse, Ben turned the frozen wheel and moved the whole island.',
    site: 'orchid', lift: 2, dist: 32, rise: 10, clear: 30,
  },
  {
    id: 'temple', season: 6, name: 'The Temple', ref: 'Season 6 · "LA X"',
    text: 'An ancient temple behind high stone walls, where the Others took refuge under the protection of the Monster.',
    site: 'temple', lift: 10, dist: 130, rise: 45,
  },
  {
    id: 'lighthouse', season: 6, name: 'The Lighthouse', ref: 'Season 6 · "Lighthouse"',
    text: "Jacob's lighthouse. Turn its mirror to a candidate's number and you see their home. Its lantern burns at night.",
    site: 'lighthouse', lift: 14, sea: 85, side: 30, height: 14,
  },
  {
    id: 'jacobsCave', season: 6, name: "Jacob's cave", ref: 'Season 6 · "The Substitute"',
    text: "The Man in Black showed Sawyer the candidates' names written on this cave's ceiling, each with a number: 4, 8, 15, 16, 23, 42.",
    site: 'jacobsCave', lift: 2.5, offshore: 10, sea: 26, side: 5, height: 4,
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
    const trees = (1 - u) * len > clearR ? 24 : 1;   // the tallest jungle crowns reach about 24 m
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
  if (place.water) to.y = place.lift;
  if (place.sea) {
    // coastal landmarks are seen from the water
    const sea = place.water ? { x: s.x - ISLAND.x, z: s.z - ISLAND.z } : seaDir(s.x, s.z);
    const sl = Math.hypot(sea.x, sea.z); sea.x /= sl; sea.z /= sl;
    const out = new THREE.Vector3(sea.x, 0, sea.z), side = new THREE.Vector3(-out.z, 0, out.x);
    const from = to.clone().addScaledVector(out, place.sea).addScaledVector(side, place.side);
    from.y = place.height;
    return { from, to };
  }
  if (place.face !== undefined) {
    // look from a set direction (e.g. the side of a landmark with the most to see)
    const from = new THREE.Vector3(s.x + Math.sin(place.face) * place.dist, 0, s.z + Math.cos(place.face) * place.dist);
    from.y = Math.max(to.y + place.rise, terrainH(from.x, from.z) + 6);
    return { from, to };
  }
  if (place.front) {
    // look at the landmark's front, which faces downhill towards the sea
    const f = seaDir(s.x, s.z), from = new THREE.Vector3(s.x + f.x * place.dist, 0, s.z + f.z * place.dist);
    from.y = Math.max(to.y + place.rise, terrainH(from.x, from.z) + 6);
    return { from, to };
  }
  // inland: try every direction and keep the clearest one, preferring the side the sun lights
  const sun = new THREE.Vector2(uSunDir.value.x, uSunDir.value.z).normalize();
  let best = null;
  for (let k = 0; k < 32; k++) {
    const a = k / 32 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    const from = new THREE.Vector3(s.x + dx * place.dist, 0, s.z + dz * place.dist);
    // stay above the treetops, unless the camera stands inside the landmark's own clearing
    const clearing = CLEARINGS.find((c) => c.site === place.site);
    const inClearing = clearing && place.dist < clearing.r * 0.8;
    from.y = Math.max(to.y + place.rise, terrainH(from.x, from.z) + (inClearing ? 2.5 : 32));
    const score = blocked(from, to, inClearing ? place.dist + 1 : place.clear ?? 30) * 10 + (from.y - to.y - place.rise) - (dx * sun.x + dz * sun.y) * 4;
    if (!best || score < best.score) best = { score, from };
  }
  return { from: best.from, to };
}
