// Shared shader inputs. The time-of-day system writes these; the sky, water, foliage,
// smoke and post-processing all read the same values, so every change stays in sync.
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

export const uT = uniform(0);                                                   // seconds since start
export const uSunDir = uniform(new THREE.Vector3(0.5, 0.05, -0.85).normalize());
export const uMoonDir = uniform(new THREE.Vector3(-0.4, 0.55, -0.7).normalize());
export const uZenith = uniform(new THREE.Color());
export const uHorizon = uniform(new THREE.Color());
export const uSunCol = uniform(new THREE.Color());
export const uCloudDark = uniform(new THREE.Color());
export const uDeep = uniform(new THREE.Color());
export const uShallow = uniform(new THREE.Color());
export const uSmoke = uniform(new THREE.Color());
export const uSunUp = uniform(1);       // sun visibility
export const uNight = uniform(0);
export const uFoamLight = uniform(1);
export const uDis = uniform(0);         // Swan discharge 0..1
export const uBeam = uniform(0);        // hatch light at night 0..1
export const uWind = uniform(0.32);     // palm sway / smoke drift, metres
