// Sky/ground fill light, the sun (which becomes the moon at night) and the fog.
import * as THREE from 'three/webgpu';
import { isPhone } from '../core/utils.js';

// Where the sun's shadow camera is centred: the wreck and the camp.
export const FOCUS = new THREE.Vector3(2, 1.6, 10);

export function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0x9ab4d6, 0x6d5a3c, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a0, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 500 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.06;
  sun.target.position.copy(FOCUS);
  scene.add(sun, sun.target);
  scene.fog = new THREE.FogExp2(0xd9a878, 0.0021);
  return { hemi, sun };
}
