// Jacob's lighthouse: a square stone tower on the cliffs of the east coast.
// At night its lantern burns and two beams sweep the sea ("Lighthouse", season 6).
import * as THREE from 'three/webgpu';
import { vec3, sin, dot, normalize, pow, abs, uv, positionWorld, cameraPosition, normalWorld } from 'three/tsl';
import { SITES, ISLAND } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { shadowy } from '../../core/utils.js';
import { uT, uNight } from '../../core/uniforms.js';
import { stoneMaterial } from './materials.js';

export function createLighthouse(scene) {
  const site = SITES.lighthouse;
  const g = new THREE.Group();
  const stone = stoneMaterial('#8a8070', { moss: 0.2, scale: 0.4, blocks: 0.75 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 0.8 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c2a27, roughness: 0.5, metalness: 0.6 });

  // tapering square tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.5, 24, 4, 1), stone);
  tower.rotation.y = Math.PI / 4; tower.position.y = 12; g.add(tower);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.2, 6.2), stone);
  plinth.position.y = 0.4; g.add(plinth);
  // door and slit windows
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 }));
  door.position.set(0, 1.9, 2.52); g.add(door);
  for (const [y, side] of [[8, 1], [13.5, -1], [18.5, 1]]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.2), dark);
    const r = 3.5 - (y / 24) * 1.1;
    w.position.set(side > 0 ? 0 : r * 0.7, y, side > 0 ? r * 0.72 : 0); w.rotation.y = side > 0 ? 0 : Math.PI / 2;
    g.add(w);
  }
  // gallery, lantern room and roof
  const gallery = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.4, 5.6), stone);
  gallery.position.y = 24.2; g.add(gallery);
  const lanternM = new THREE.MeshBasicNodeMaterial();
  lanternM.colorNode = vec3(1.0, 0.72, 0.38).mul(uNight.mul(3.5).add(0.25)).mul(sin(uT.mul(7.0)).mul(0.06).add(0.94));
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.6, 8), lanternM);
  lantern.position.y = 25.7; g.add(lantern);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), metal);
    bar.position.set(Math.cos(a) * 1.75, 25.7, Math.sin(a) * 1.75); g.add(bar);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.9, 8), metal);
  roof.position.y = 27.95; g.add(roof);

  // two beams sweeping round at night
  const beamM = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const V = normalize(cameraPosition.sub(positionWorld));
  beamM.colorNode = vec3(1.0, 0.85, 0.6).mul(pow(abs(dot(normalWorld, V)), 2.0)).mul(pow(uv().y, 2.2)).mul(uNight).mul(0.45);
  const beams = new THREE.Group();
  for (const dir of [1, -1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 8, 90, 20, 1, true), beamM);
    b.rotation.z = dir * Math.PI / 2; b.position.x = -dir * 45;
    beams.add(b);
  }
  beams.position.y = 25.7; g.add(beams);
  const light = new THREE.PointLight(0xffc27a, 0, 90, 1.4);
  light.position.y = 25.7; g.add(light);

  g.position.set(site.x, terrainH(site.x, site.z) - 0.2, site.z);
  g.rotation.y = Math.atan2(ISLAND.cx - site.x, ISLAND.cz - site.z);   // door faces inland
  scene.add(shadowy(g));
  beams.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });

  return {
    update(dt) {
      beams.rotation.y += dt * 0.35;
      light.intensity = uNight.value * 60;
    },
  };
}
