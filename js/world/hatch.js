// The hatch in the jungle, and the beam of light that shoots up from it at night.
import * as THREE from 'three/webgpu';
import { vec3, sin, dot, normalize, pow, abs, mix, smoothstep, uv, positionWorld, cameraPosition, normalWorld, mx_noise_float } from 'three/tsl';
import { terrainH } from '../core/terrain-math.js';
import { SITES } from '../core/layout.js';
import { R, shadowy } from '../core/utils.js';
import { strut } from './landmarks/materials.js';
import { uT, uBeam } from '../core/uniforms.js';

export function createHatch(scene) {
  const HATCH = new THREE.Vector3(SITES.hatch.x, 0, SITES.hatch.z); HATCH.y = terrainH(HATCH.x, HATCH.z);

  // Locke and Boone's dig: a square pit of churned earth with spoil heaps, and the rusted steel door
  // set in a concrete frame, with its small round window ("All the Best Cowboys Have Daddy Issues").
  const g = new THREE.Group();
  const earth = new THREE.MeshStandardMaterial({ color: 0x3b2c1d, roughness: 1 });
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.8, 0.6, 4, 1, true), earth);
  pit.material.side = THREE.DoubleSide; pit.rotation.y = Math.PI / 4; pit.position.y = -0.2; g.add(pit);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), earth); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.48; g.add(floor);
  // low spoil heaps of dug earth around the pit
  const spoil = new THREE.MeshStandardMaterial({ color: 0x6a5638, roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + R(-0.2, 0.2), r = R(3.6, 5);
    const heap = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), spoil);
    heap.scale.set(R(0.9, 1.4), R(0.18, 0.3), R(0.7, 1.1)); heap.rotation.y = a;
    heap.position.set(Math.cos(a) * r, -0.05, Math.sin(a) * r); g.add(heap);
  }
  const concrete = new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 0.95 });
  for (const [x, z, w, d] of [[0, 1.25, 3, 0.4], [0, -1.25, 3, 0.4], [1.25, 0, 0.4, 2.1], [-1.25, 0, 0.4, 2.1]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), concrete); b.position.set(x, -0.35, z); g.add(b);
  }
  // the door: rust over grey paint, with rivets round the edge
  const doorM = new THREE.MeshStandardNodeMaterial({ metalness: 0.6, roughness: 0.6 });
  const rust = smoothstep(-0.2, 0.5, mx_noise_float(positionWorld.mul(2.2))).mul(0.8);
  doorM.colorNode = mix(vec3(0.33, 0.35, 0.33), vec3(0.3, 0.14, 0.05), rust);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 2.1), doorM); door.position.y = -0.4; g.add(door);
  const rivetM = new THREE.MeshStandardMaterial({ color: 0x3b3a37, metalness: 0.7, roughness: 0.5 });
  for (let i = 0; i < 24; i++) {
    const t = i / 24 * 4, side = Math.floor(t), f = t - side, e = 0.92;
    const x = [f * 2 - 1, 1, 1 - f * 2, -1][side] * e, z = [-1, f * 2 - 1, 1, 1 - f * 2][side] * e;
    const rv = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), rivetM); rv.position.set(x, -0.33, z); g.add(rv);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 20), rivetM); rim.rotation.x = Math.PI / 2; rim.position.set(0.35, -0.33, 0.35); g.add(rim);
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
  port.position.set(0.35, -0.33, 0.35); g.add(port);
  // a shovel and a lantern left by the dig
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 1 });
  g.add(strut(new THREE.Vector3(3.2, -0.1, 1.5), new THREE.Vector3(4.4, 1.3, 1.9), 0.035, wood));
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.36), rivetM); blade.position.set(3.1, -0.05, 1.45); blade.rotation.z = 0.9; g.add(blade);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x5a3f22, metalness: 0.5, emissive: 0xffa040, emissiveIntensity: 0.6 }));
  lantern.position.set(-3.4, 0.05, -1.2); g.add(lantern);
  g.position.copy(HATCH); g.position.y += 0.05;
  scene.add(shadowy(g));

  // additive cone of light, soft at its edges and fading towards the ground
  const beamMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const V = normalize(cameraPosition.sub(positionWorld));
  const edgeFade = pow(abs(dot(normalWorld, V)), 1.6);
  const along = uv().y;
  const flick = sin(uT.mul(17.0)).mul(0.05).add(0.95);
  beamMat.colorNode = vec3(1.0, 0.93, 0.78).mul(edgeFade).mul(pow(along, 2.2)).mul(uBeam).mul(flick).mul(1.6);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 0.9, 150, 32, 1, true), beamMat);
  beam.position.copy(HATCH); beam.position.y += 75;
  beam.renderOrder = 5;
  scene.add(beam);

  const hatchLight = new THREE.PointLight(0xfff0d0, 0, 60, 1.4);
  hatchLight.position.copy(HATCH).add(new THREE.Vector3(0, 6, 0));
  scene.add(hatchLight);

  return { update() { hatchLight.intensity = uBeam.value * 90; } };
}
