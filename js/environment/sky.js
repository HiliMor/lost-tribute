// Sky dome (gradient, clouds, sun, moon, stars) and the sky light / reflections used by every material.
import * as THREE from 'three/webgpu';
import {
  Fn, float, vec2, vec3, sin, dot, normalize, mix, smoothstep, clamp, max, pow, floor, hash, step,
  positionLocal, mx_noise_float
} from 'three/tsl';
import { uT, uSunDir, uMoonDir, uZenith, uHorizon, uSunCol, uCloudDark, uNight, uDis } from '../core/uniforms.js';

// Sky colour for a direction. Reused by the water reflections and the environment light.
export function skyGradient(dir) {
  const y = dir.y;
  const sd = max(dot(dir, uSunDir), 0.0);
  const hz = pow(clamp(y.add(0.015), 0.0, 1.0), 0.42);
  const haze = hz.oneMinus();
  let c = mix(uHorizon, uZenith, hz);
  c = c.add(uSunCol.mul(pow(sd, 5.0).mul(0.55).mul(haze.mul(0.8).add(0.2))));
  c = c.add(uSunCol.mul(pow(sd, 48.0).mul(1.1)));
  const md = max(dot(dir, uMoonDir), 0.0);
  c = c.add(vec3(0.5, 0.62, 1.0).mul(pow(md, 30.0).mul(0.22).mul(uNight)));
  c = mix(c, uHorizon.mul(0.5), smoothstep(-0.1, 0.0, y).oneMinus());
  const violet = vec3(0.62, 0.28, 1.0).mul(1.5).add(c.mul(0.25));
  return mix(c, violet, uDis.mul(0.85));
}

export function createSky(scene) {
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  mat.colorNode = Fn(() => {
    const dir = normalize(positionLocal);
    const y = dir.y;
    let c = skyGradient(dir);
    const sd = max(dot(dir, uSunDir), 0.0);
    // clouds: flat layer projected onto the dome
    const cp = dir.xz.div(y.add(0.09)).mul(vec2(0.5, 1.15));
    const q = vec3(cp.mul(1.5).add(vec2(uT.mul(0.004), 0.0)), 3.1);
    let n = float(0);
    let amp = 0.5, fr = 1.0;
    for (let k = 0; k < 5; k++) { n = n.add(mx_noise_float(q.mul(fr)).mul(amp)); amp *= 0.5; fr *= 2.07; }
    const cov = smoothstep(0.02, 0.42, n).mul(smoothstep(0.0, 0.1, y)).mul(smoothstep(0.35, 0.9, y).oneMinus());
    const hz = pow(clamp(y, 0.0, 1.0), 0.42).oneMinus();
    const lit = pow(sd, 2.5).mul(0.9).add(hz.mul(0.3));
    const cc = mix(uCloudDark, uSunCol.mul(1.25).add(uHorizon.mul(0.35)), clamp(lit, 0.0, 1.0));
    c = mix(c, cc, cov.mul(0.92));
    c = c.add(uSunCol.mul(pow(sd, 18.0)).mul(cov.mul(cov.oneMinus()).mul(5.0)));
    // sun and moon discs
    c = c.add(uSunCol.mul(smoothstep(0.99955, 0.99978, dot(dir, uSunDir)).mul(30.0).mul(cov.oneMinus())));
    c = c.add(vec3(0.92, 0.94, 1.0).mul(smoothstep(0.99962, 0.99982, dot(dir, uMoonDir)).mul(4.0).mul(uNight)));
    // stars
    const cell = floor(dir.mul(380.0)).add(400.0);
    const r = hash(cell.x.add(cell.y.mul(811.0)).add(cell.z.mul(7919.0)));
    const twinkle = sin(uT.mul(2.3).add(r.mul(300.0))).mul(0.35).add(0.65);
    const star = step(0.9978, r).mul(twinkle).mul(uNight).mul(smoothstep(0.02, 0.25, y)).mul(cov.oneMinus());
    c = c.add(vec3(star.mul(2.2)));
    return c;
  })();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);
  return sky;   // the main loop keeps it centred on the camera
}

// Sky light and reflections for every material, re-baked whenever the light changes.
export function createEnvironment(renderer, scene) {
  const envScene = new THREE.Scene();
  const em = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  em.colorNode = Fn(() => {
    const dir = normalize(positionLocal);
    const c = skyGradient(dir);
    // the sand and jungle below the horizon bounce a little warm light back up
    return mix(c, uHorizon.mul(0.35).add(vec3(0.05, 0.04, 0.03)), smoothstep(0.02, 0.25, dir.y.negate()));
  })();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), em));

  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, dirty = true, bakedAt = -1;
  scene.environmentIntensity = 0.6;

  function bake() {
    envRT = pmrem.fromScene(envScene, 0.02, 0.1, 100, { size: 128, renderTarget: envRT });
    scene.environment = envRT.texture;
    dirty = false;
  }
  return {
    markDirty() { dirty = true; },
    // throttled: at most every 0.12 s while the light changes, every 0.25 s during a discharge
    update(elapsed) {
      if ((dirty && elapsed - bakedAt > 0.12) || (uDis.value > 0.01 && elapsed - bakedAt > 0.25)) { bakedAt = elapsed; bake(); }
    },
  };
}
