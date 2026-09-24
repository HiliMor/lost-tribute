// Hydra Island, off the east coast: the DHARMA station where Jack, Kate and Sawyer
// were held in cages by the Others (season 3).
import * as THREE from 'three/webgpu';
import { SITES, ISLAND } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { shadowy } from '../../core/utils.js';
import { stoneMaterial, strut } from './materials.js';

function cage(bars) {
  const g = new THREE.Group();
  const w = 5, h = 3.4, d = 4.4;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // frame
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) g.add(strut(V(x, 0, z), V(x, h, z), 0.08, bars, 6));
  for (const y of [0.05, h]) {
    g.add(strut(V(-w / 2, y, -d / 2), V(w / 2, y, -d / 2), 0.06, bars)); g.add(strut(V(-w / 2, y, d / 2), V(w / 2, y, d / 2), 0.06, bars));
    g.add(strut(V(-w / 2, y, -d / 2), V(-w / 2, y, d / 2), 0.06, bars)); g.add(strut(V(w / 2, y, -d / 2), V(w / 2, y, d / 2), 0.06, bars));
  }
  // vertical bars
  for (let x = -w / 2 + 0.4; x < w / 2; x += 0.4) for (const z of [-d / 2, d / 2]) g.add(strut(V(x, 0, z), V(x, h, z), 0.03, bars, 4));
  for (let z = -d / 2 + 0.4; z < d / 2; z += 0.4) for (const x of [-w / 2, w / 2]) g.add(strut(V(x, 0, z), V(x, h, z), 0.03, bars, 4));
  return g;
}

export function createHydra(scene) {
  const site = SITES.hydra;
  const g = new THREE.Group();
  const concrete = stoneMaterial('#8f8b82', { moss: 0.3, scale: 0.6, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x191b1c, roughness: 0.6 });
  const bars = new THREE.MeshStandardMaterial({ color: 0x3f3c38, roughness: 0.5, metalness: 0.6 });

  // the station: a low concrete block with a band of dark windows
  const block = new THREE.Mesh(new THREE.BoxGeometry(26, 5, 14), concrete);
  block.position.y = 2.4; g.add(block);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(27, 0.6, 15), concrete);
  roof.position.y = 5.1; g.add(roof);
  const band = new THREE.Mesh(new THREE.BoxGeometry(22, 1.1, 14.1), dark);
  band.position.y = 3.3; g.add(band);
  const door = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.3), dark);
  door.position.set(0, 1.5, -7.05); g.add(door);

  // the two bear cages
  const c1 = cage(bars); c1.position.set(-8, 0, -16); g.add(c1);
  const c2 = cage(bars); c2.position.set(2, 0, -17); c2.rotation.y = 0.1; g.add(c2);

  g.position.set(site.x, terrainH(site.x, site.z) - 0.1, site.z);
  // face the main island
  g.rotation.y = Math.atan2(ISLAND.x - site.x, ISLAND.z - site.z);
  scene.add(shadowy(g));
  return g;
}
