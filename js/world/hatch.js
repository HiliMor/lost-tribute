// The hatch in the jungle, and the beam of light that shoots up from it at night.
import * as THREE from 'three/webgpu';
import { vec3, sin, dot, normalize, pow, abs, uv, positionWorld, cameraPosition, normalWorld } from 'three/tsl';
import { terrainH } from '../core/terrain-math.js';
import { SITES } from '../core/layout.js';
import { shadowy } from '../core/utils.js';
import { uT, uBeam } from '../core/uniforms.js';

export function createHatch(scene) {
  const HATCH = new THREE.Vector3(SITES.hatch.x, 0, SITES.hatch.z); HATCH.y = terrainH(HATCH.x, HATCH.z);

  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), new THREE.MeshStandardMaterial({ color: 0x55534d, roughness: 0.9 }));
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.8), new THREE.MeshStandardMaterial({ color: 0x6c6f6a, metalness: 0.7, roughness: 0.5 }));
  door.position.y = 0.18; door.rotation.z = 0.05;
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
  port.position.set(0, 0.25, 0.3);
  g.add(frame, door, port);
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
