// The survivors' signal fire: logs, stones, flame sheets, sparks, coals, embers and smoke
// (plus the smoke rising from the wrecked engine).
import * as THREE from 'three/webgpu';
import {
  float, vec2, vec3, sin, cos, mix, smoothstep, clamp, pow, abs, fract, length, hash, step, uv,
  instanceIndex, positionLocal, positionWorld, mx_noise_float
} from 'three/tsl';
import { terrainH } from '../core/terrain-math.js';
import { R, shadowy } from '../core/utils.js';
import { uT, uSmoke, uWind, uNight } from '../core/uniforms.js';

export const FIRE = new THREE.Vector3(-6, 0, 18.5); FIRE.y = terrainH(FIRE.x, FIRE.z);

// per-particle random numbers for instanced sprites
const seed = instanceIndex.toFloat();
const rh = (k) => hash(seed.add(k * 131.0));
const softDisc = smoothstep(0.05, 0.5, length(uv().sub(0.5))).oneMinus();

function particleSystem(scene, { count, origin, material }) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  m.count = count; m.position.copy(origin); m.frustumCulled = false;
  scene.add(m); return m;
}

function createFirewood(scene) {
  const logM = new THREE.MeshStandardNodeMaterial({ roughness: 1 });
  logM.colorNode = mix(vec3(0.16, 0.1, 0.06), vec3(0.02, 0.015, 0.012), smoothstep(-0.2, 0.5, positionLocal.y));
  logM.emissiveNode = vec3(1.0, 0.28, 0.04).mul(smoothstep(0.3, 0.62, positionLocal.y.negate()).mul(mx_noise_float(positionWorld.mul(9.0).add(uT.mul(0.4))).mul(0.5).add(0.5)).mul(1.6));
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.25, 7), logM);
    const a = i / 7 * Math.PI * 2 + R(-0.2, 0.2);
    l.position.set(FIRE.x + Math.cos(a) * 0.42, FIRE.y + 0.32, FIRE.z + Math.sin(a) * 0.42);
    l.lookAt(FIRE.x + R(-0.1, 0.1), FIRE.y + 1.25, FIRE.z + R(-0.1, 0.1)); l.rotateX(Math.PI / 2);
    scene.add(shadowy(l));
  }
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x4d4843, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.16, 0.26)), stoneM);
    const a = i / 12 * Math.PI * 2;
    s.position.set(FIRE.x + Math.cos(a) * 1.05, FIRE.y + 0.05, FIRE.z + Math.sin(a) * 1.05);
    scene.add(shadowy(s));
  }
}

// noise-distorted tongues of fire, layered for depth
function flameSheet(scene, w, h, seedV, bright, ox, oz, speed) {
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const U = uv(), y = U.y;
  const q = vec3(U.x.mul(2.4).add(seedV), y.mul(1.7).sub(uT.mul(speed)), uT.mul(0.4).add(seedV));
  const n = mx_noise_float(q).mul(0.65).add(mx_noise_float(q.mul(2.3).add(4.1)).mul(0.3));
  const sway = sin(uT.mul(1.7).add(seedV)).mul(0.08).mul(y);
  const x = U.x.sub(0.5).mul(2.0).add(n.mul(0.6).mul(y.add(0.15))).add(sway);
  const width = pow(y.oneMinus(), 0.6).mul(0.9).mul(smoothstep(0.0, 0.14, y).mul(0.55).add(0.45));
  const body = smoothstep(width.mul(0.55), width, abs(x)).oneMinus();
  const top = smoothstep(0.3, 0.75, y.add(n.mul(0.45))).oneMinus();
  const heat = clamp(body.mul(top), 0.0, 1.0);
  const hot = smoothstep(0.5, 0.95, heat).mul(smoothstep(0.1, 0.55, y).oneMinus());
  let col = mix(vec3(0.75, 0.1, 0.02), vec3(1.0, 0.42, 0.06), smoothstep(0.05, 0.45, heat));
  col = mix(col, vec3(1.0, 0.68, 0.28), hot.mul(0.8));
  m.colorNode = col.mul(bright);
  m.opacityNode = pow(heat, 1.6).mul(smoothstep(0.0, 0.05, y));
  m.scaleNode = vec2(w, h);
  m.positionNode = vec3(ox, h * 0.5 - 0.05, oz);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
  s.position.copy(FIRE); s.renderOrder = 3; s.frustumCulled = false;
  scene.add(s);
}

function smokePlume(scene, origin, count, height, spread, dark, rate) {
  const sm = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false });
  const sl = fract(uT.mul(rate).mul(rh(12).mul(0.3).add(0.85)).add(rh(13)));
  sm.positionNode = vec3(pow(sl, 1.4).mul(height * 0.75).mul(uWind.mul(2.2)).add(rh(14).sub(0.5).mul(spread).mul(sl.add(0.2))),
    sl.mul(height).add(1.4), rh(15).sub(0.5).mul(spread).mul(sl.add(0.2)).add(sl.mul(height * 0.12)));
  sm.scaleNode = sl.mul(height * 0.36).add(1.0);
  sm.rotationNode = rh(16).mul(6.28).add(uT.mul(0.1));
  const puff = mx_noise_float(vec3(uv().mul(3.0), rh(17).mul(40.0))).mul(0.35).add(0.75);
  sm.colorNode = mix(vec3(dark), uSmoke, smoothstep(0.0, 0.6, sl).mul(0.8).add(0.2));
  sm.opacityNode = softDisc.mul(puff).mul(pow(sl.oneMinus(), 1.6)).mul(smoothstep(0.0, 0.06, sl)).mul(0.3);
  particleSystem(scene, { count, origin, material: sm });
}

export function createFire(scene) {
  const fireLight = new THREE.PointLight(0xff8a3a, 30, 40, 1.7);
  fireLight.position.copy(FIRE).add(new THREE.Vector3(0, 1.4, 0));
  scene.add(fireLight);
  createFirewood(scene);

  flameSheet(scene, 1.6, 2.6, 0.0, 0.8, 0.0, 0.0, 2.1);
  flameSheet(scene, 1.0, 1.8, 7.3, 0.7, 0.3, 0.1, 2.6);
  flameSheet(scene, 1.1, 2.0, 13.1, 0.7, -0.32, -0.05, 2.35);
  flameSheet(scene, 0.7, 1.2, 21.7, 0.9, 0.05, 0.25, 3.0);

  // loose licks of flame breaking off the top
  const fm = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const life = fract(uT.mul(rh(1).mul(0.6).add(1.1)).add(rh(2)));
  fm.positionNode = vec3(rh(3).sub(0.5).mul(0.7).mul(life.oneMinus()).add(sin(uT.mul(4.0).add(rh(4).mul(6.0))).mul(0.12).mul(life)),
    life.mul(2.6).add(0.4), rh(5).sub(0.5).mul(0.7).mul(life.oneMinus()));
  fm.scaleNode = pow(life.oneMinus(), 0.8).mul(0.45).add(0.06);
  fm.colorNode = mix(vec3(1.0, 0.55, 0.12).mul(1.4), vec3(0.9, 0.18, 0.03).mul(0.9), smoothstep(0.1, 0.6, life));
  fm.opacityNode = softDisc.mul(life.oneMinus()).mul(smoothstep(0.0, 0.1, life)).mul(0.35);
  particleSystem(scene, { count: 40, origin: FIRE, material: fm });

  // bed of glowing coals under the logs
  const cm = new THREE.MeshBasicNodeMaterial();
  const P = positionLocal.xy;
  const r = length(P).div(0.85);
  const cells = mx_noise_float(vec3(P.mul(7.0), uT.mul(0.5))).mul(0.6).add(mx_noise_float(vec3(P.mul(17.0), uT.mul(0.9))).mul(0.4));
  const glow = smoothstep(-0.1, 0.55, cells).mul(r.oneMinus().mul(1.3).clamp(0.0, 1.0)).mul(sin(uT.mul(3.0).add(cells.mul(6.0))).mul(0.15).add(0.85));
  cm.colorNode = mix(vec3(0.03, 0.02, 0.018), vec3(1.0, 0.32, 0.05).mul(2.6), pow(glow, 1.5));
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), cm);
  bed.rotation.x = -Math.PI / 2; bed.position.copy(FIRE); bed.position.y += 0.07;
  scene.add(bed);

  // embers drifting up
  const em = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const el = fract(uT.mul(rh(7).mul(0.12).add(0.12)).add(rh(8)));
  em.positionNode = vec3(sin(uT.mul(1.3).add(rh(9).mul(20.0))).mul(el).mul(2.4).add(el.mul(el).mul(4.0)), el.mul(rh(12).mul(5.0).add(8.0)).add(0.8), cos(uT.mul(1.1).add(rh(10).mul(20.0))).mul(el).mul(2.4));
  em.scaleNode = float(0.07).mul(el.oneMinus().mul(0.7).add(0.3));
  em.colorNode = vec3(1.0, 0.55, 0.15).mul(6.0);
  em.opacityNode = softDisc.mul(el.oneMinus()).mul(step(0.5, sin(uT.mul(rh(11).mul(8.0).add(4.0))).mul(0.5).add(0.5)).mul(0.6).add(0.4));
  particleSystem(scene, { count: 70, origin: FIRE, material: em });

  // smoke plumes: the signal fire and the smouldering engine
  smokePlume(scene, FIRE, 70, 34, 3, 0.05, 0.035);
  smokePlume(scene, new THREE.Vector3(21, terrainH(21, 6.5) + 1.5, 6.5), 36, 16, 2, 0.12, 0.05);

  return {
    // firelight flickers smoothly and moves a little, so shadows shift
    update(elapsed) {
      const flick = Math.sin(elapsed * 9.1) * 0.5 + Math.sin(elapsed * 23.7 + 1.3) * 0.3 + Math.sin(elapsed * 3.3) * 0.6 + Math.sin(elapsed * 41.9) * 0.15;
      fireLight.intensity = (28 + flick * 5) * (1 + uNight.value * 0.4);
      fireLight.position.set(FIRE.x + Math.sin(elapsed * 5.3) * 0.12, FIRE.y + 1.1 + flick * 0.06, FIRE.z + Math.cos(elapsed * 4.1) * 0.12);
    },
  };
}
