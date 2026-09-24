// The ocean: rolling swell, shoreline foam, clear shallows and sky reflections.
import * as THREE from 'three/webgpu';
import {
  Fn, float, vec2, vec3, vec4, sin, cos, exp, dot, normalize, mix, smoothstep, clamp, max, pow, abs,
  fract, length, reflect, step, texture, positionLocal, positionWorld, cameraPosition, mx_noise_float
} from 'three/tsl';
import { ISLAND } from '../core/layout.js';
import { uT, uSunDir, uMoonDir, uHorizon, uSunCol, uDeep, uShallow, uSunUp, uNight, uFoamLight } from '../core/uniforms.js';
import { skyGradient } from '../environment/sky.js';
import { gridGeometry, HEIGHTMAP } from './terrain.js';

// Big swells move the surface; the detail waves only change the lighting.
const WAVES = [
  { d: [0.12, 1], L: 42, A: 0.55, p: 0.0 },
  { d: [-0.35, 1], L: 27, A: 0.32, p: 1.7 },
  { d: [0.5, 1], L: 17, A: 0.18, p: 4.1 },
  { d: [-0.1, 1], L: 11, A: 0.10, p: 2.3 },
  { d: [0.8, 1], L: 7.5, A: 0.06, p: 5.2 },
  { d: [0.9, 1], L: 23, A: 0.13, p: 3.0 },
  { d: [-0.8, 1], L: 13, A: 0.07, p: 0.7 },
];
const DETAIL = [
  { d: [0.3, 1], L: 4.1, A: 0.035, p: 0.4 },
  { d: [-0.7, 1], L: 2.7, A: 0.022, p: 2.2 },
  { d: [1, 0.4], L: 1.9, A: 0.016, p: 3.3 },
  { d: [-1, 0.6], L: 1.3, A: 0.010, p: 1.1 },
  { d: [0.2, -1], L: 0.9, A: 0.007, p: 4.4 },
];

// Sum of sharp-crested waves: height plus its x/z slopes (for normals).
function waveSum(p, list) {
  let h = float(0), dx = float(0), dz = float(0);
  for (const w of list) {
    const len = Math.hypot(w.d[0], w.d[1]);
    const ddx = w.d[0] / len, ddz = w.d[1] / len;
    const k = Math.PI * 2 / w.L, om = Math.sqrt(9.8 * k);
    const ph = p.x.mul(ddx).add(p.y.mul(ddz)).mul(k).sub(uT.mul(om)).add(w.p);
    const e = exp(sin(ph).sub(1.0)).mul(w.A);
    h = h.add(e);
    const dd = e.mul(cos(ph)).mul(k);
    dx = dx.add(dd.mul(ddx)); dz = dz.add(dd.mul(ddz));
  }
  return { h, dx, dz };
}

// heightTex: the island's ground height (see createHeightTexture in terrain.js)
export function createOcean(scene, heightTex) {
  // one sheet of water around the whole island: dense near the crash beach, coarse far out
  const xs = [], zs = [];
  for (let i = 0; i <= 360; i++) { const s = i / 360 * 2 - 1; xs.push(s * 320 + s * s * s * 4300); }
  for (let j = 0; j <= 380; j++) { const t = j / 380 * 2 - 1; zs.push(t * 380 + t * t * t * 4900); }
  const g = gridGeometry(xs, zs);
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true });

  // water depth from the height map, and how much the waves are damped there
  const { x0, x1, z0, z1 } = HEIGHTMAP;
  const ampAt = (p) => {
    const hUV = vec2(p.x.sub(x0).div(x1 - x0), p.y.sub(z0).div(z1 - z0));
    const depth = texture(heightTex, hUV).r.negate();
    const far = smoothstep(1300.0, 4000.0, length(p.sub(vec2(ISLAND.x, ISLAND.z))));
    return { depth, a: smoothstep(-0.6, 4.5, depth).mul(far.oneMinus().mul(0.8).add(0.2)) };
  };
  // water running up the beach
  const swashAt = (p, depth) => pow(sin(uT.mul(0.55).add(p.x.mul(0.035))).mul(0.5).add(0.5), 2.0).mul(0.24).mul(smoothstep(0.0, 5.0, depth).oneMinus());

  mat.positionNode = Fn(() => {
    const p = positionLocal.xz;
    const { depth, a } = ampAt(p);
    const w = waveSum(p, WAVES);
    return vec3(p.x, w.h.mul(a).add(swashAt(p, depth)).sub(0.12), p.y);
  })();

  const shade = Fn(() => {
    const pw = positionWorld;
    const P = pw.xz;
    const { depth, a } = ampAt(P);
    const dist = length(cameraPosition.sub(pw));
    const big = waveSum(P, WAVES);
    const fine = waveSum(P, DETAIL);
    const df = smoothstep(30.0, 700.0, dist).oneMinus().mul(0.9).add(0.1);
    const nearF = smoothstep(500.0, 2500.0, dist).oneMinus();   // fade glitter far away (it only sparkles)
    const N = normalize(vec3(big.dx.mul(a).add(fine.dx.mul(df)).negate(), 1.0, big.dz.mul(a).add(fine.dz.mul(df)).negate()));
    const V = normalize(cameraPosition.sub(pw));
    const ndv = max(dot(N, V), 0.0);
    const fres = pow(ndv.oneMinus(), 5.0).mul(0.98).add(0.02);
    const R0 = reflect(V.negate(), N);
    const R = normalize(vec3(R0.x, abs(R0.y), R0.z));
    const refl = skyGradient(R);
    // water colour: sandy shallows -> turquoise -> deep blue
    const shallowF = smoothstep(0.1, 3.4, depth).oneMinus();
    let water = mix(uDeep, uShallow, shallowF);
    water = mix(water, vec3(0.78, 0.7, 0.5).mul(uFoamLight).mul(0.75), smoothstep(0.0, 0.7, depth).oneMinus().mul(0.4));
    const crest = clamp(big.h.mul(a).mul(1.6), 0.0, 1.0);
    const sss = uShallow.mul(uSunCol).mul(pow(max(dot(V.negate(), uSunDir), 0.0), 3.0)).mul(crest).mul(2.2).mul(uSunUp);
    water = water.add(sss);
    let col = mix(water, refl, fres);
    // sun glitter and moonlight path
    const rs = max(dot(R, uSunDir), 0.0);
    col = col.add(uSunCol.mul(pow(rs, 900.0).mul(70.0).mul(nearF).add(pow(rs, 90.0).mul(1.1))).mul(uSunUp));
    col = col.add(vec3(0.7, 0.8, 1.0).mul(pow(max(dot(R, uMoonDir), 0.0), 500.0).mul(10.0).mul(uNight)));
    // foam
    const thickness = pw.y.add(depth);
    const n1 = mx_noise_float(vec3(P.mul(vec2(0.55, 1.1)), uT.mul(0.35))).mul(0.5).add(0.5);
    const streak = mx_noise_float(vec3(P.mul(vec2(0.18, 1.6)), uT.mul(0.25)));
    const vein = mx_noise_float(vec3(P.mul(vec2(0.8, 2.2)).add(vec2(uT.mul(0.12), 0.0)), uT.mul(0.3)));
    const edge = smoothstep(0.0, 0.15, thickness).oneMinus().mul(smoothstep(-0.4, 0.15, streak));
    const phase = fract(uT.mul(0.085).add(P.x.mul(0.0023)).add(n1.mul(0.08)));
    const breakD = mix(float(2.4), float(0.1), phase);
    const band = smoothstep(0.0, 0.2, abs(depth.sub(breakD))).oneMinus().mul(smoothstep(-0.25, 0.3, streak)).mul(phase.mul(0.6).oneMinus());
    const shoreSide = step(depth, breakD).mul(smoothstep(0.0, 0.9, depth).oneMinus()).mul(smoothstep(0.05, 0.55, n1));
    const lace = smoothstep(0.0, 0.05, abs(vein)).oneMinus().mul(shoreSide).mul(0.35);
    const whitecap = smoothstep(0.9, 1.15, big.h.mul(a)).mul(smoothstep(0.3, 0.7, n1)).mul(0.25);
    // soft light ripples on the sand under the shallows
    const ca = mx_noise_float(vec3(P.mul(0.9), uT.mul(0.45)));
    col = col.add(uSunCol.mul(pow(abs(ca).oneMinus(), 16.0)).mul(smoothstep(0.0, 1.1, depth).oneMinus()).mul(smoothstep(6.0, 40.0, dist).oneMinus()).mul(uSunUp.mul(0.8).add(0.2)).mul(0.1));
    const foam = clamp(edge.add(band).add(lace).add(whitecap), 0.0, 1.0);
    const foamCol = mix(uHorizon, vec3(1.0), 0.55).mul(uFoamLight);
    col = mix(col, foamCol, foam);
    const alpha = smoothstep(0.0, 0.07, thickness).mul(mix(float(0.5), float(1.0), smoothstep(0.1, 1.8, thickness)));
    return vec4(col, max(alpha, foam.mul(smoothstep(-0.02, 0.03, thickness))));
  })();
  mat.colorNode = shade.rgb;
  mat.opacityNode = shade.a;

  const ocean = new THREE.Mesh(g, mat);
  ocean.frustumCulled = false;
  ocean.renderOrder = 2;
  scene.add(ocean);
  return ocean;
}
