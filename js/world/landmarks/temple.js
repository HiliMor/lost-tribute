// The Temple: a stepped stone temple in the central valley, inside a high outer wall,
// with a pond before its entrance (seasons 5 and 6).
import * as THREE from 'three/webgpu';
import { SITES } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { shadowy } from '../../core/utils.js';
import { stoneMaterial } from './materials.js';

export function createTemple(scene) {
  const site = SITES.temple;
  const g = new THREE.Group();
  const stone = stoneMaterial('#7b7564', { moss: 0.55, scale: 0.25, blocks: 0.9 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x080705 });

  // stepped tiers, each with an overhanging ledge
  const tiers = [[46, 6, 36], [36, 5, 28], [27, 5, 20], [18, 4.5, 13], [10, 4, 7]];
  let y = 0;
  for (const [w, h, d] of tiers) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone);
    t.position.y = y + h / 2; g.add(t);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.7, d + 2), stone);
    ledge.position.y = y + h; g.add(ledge);
    y += h;
  }
  // shrine on top
  const shrine = new THREE.Mesh(new THREE.ConeGeometry(4.2, 6, 4), stone);
  shrine.rotation.y = Math.PI / 4; shrine.position.y = y + 3; g.add(shrine);

  // front stairs up the south face, and the dark doorway beside them
  for (let i = 0; i < 12; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 2), stone);
    step.position.set(0, 0.55 + i * 1.1, -18 - 10 + i * 1.1 + 1);
    g.add(step);
  }
  for (const x of [-12, 12]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.4), dark);
    door.position.set(x, 2.5, -18.05); g.add(door);
  }

  // the pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshStandardMaterial({ color: 0x1f2e1d, roughness: 0.06, metalness: 0.2 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(0, 0.25, -46);
  g.add(pond);

  // the outer wall, with a gate facing the pond
  const half = 66, wallH = 8, gate = 12;
  const wall = (x, z, len, alongX) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 2.4, wallH, alongX ? 2.4 : len), stone);
    m.position.set(x, wallH / 2 - 0.5, z); g.add(m);
  };
  wall(0, half, half * 2, true);
  wall(-half, 0, half * 2, false);
  wall(half, 0, half * 2, false);
  wall(-(half + gate / 2) / 2, -half, half - gate / 2, true);
  wall((half + gate / 2) / 2, -half, half - gate / 2, true);

  g.position.set(site.x, terrainH(site.x, site.z) - 0.3, site.z);
  scene.add(shadowy(g));
  return g;
}
