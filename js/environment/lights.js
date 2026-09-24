// Sky/ground fill light, the sun (which becomes the moon at night) and the fog.
import * as THREE from 'three/webgpu';
import { isPhone } from '../core/utils.js';
import { sstep } from '../core/terrain-math.js';

// Set by the time of day: which way the light comes from (sun, or moon at night) and the haze density.
export const lightState = { dir: new THREE.Vector3(0.5, 0.3, -0.8).normalize(), fogDensity: 0.0012 };

export function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0x9ab4d6, 0x6d5a3c, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a0, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(isPhone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 500 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.06;
  scene.add(sun, sun.target);
  scene.fog = new THREE.FogExp2(0xd9a878, lightState.fogDensity);

  const target = new THREE.Vector3();
  return {
    hemi, sun,
    // every frame: keep the sun's shadows centred on what the camera looks at,
    // and thin the haze as the camera climbs (so aerial views stay clear)
    update(camera, lookAt) {
      target.copy(lookAt);
      sun.target.position.copy(target);
      sun.position.copy(target).addScaledVector(lightState.dir, 220);
      scene.fog.density = lightState.fogDensity * (1 - 0.85 * sstep(30, 600, camera.position.y));
    },
  };
}
