// Time of day: one value (0 = golden hour, 1 = night) blends four keyframes and drives
// every light, colour and fog setting in the scene through the shared uniforms.
import * as THREE from 'three/webgpu';
import { $ } from '../core/utils.js';
import { sstep } from '../core/terrain-math.js';
import {
  uSunDir, uMoonDir, uZenith, uHorizon, uSunCol, uCloudDark, uDeep, uShallow, uSmoke,
  uSunUp, uNight, uFoamLight, uBeam
} from '../core/uniforms.js';
import { lightState } from './lights.js';

const KEYS = [
  { t: 0.00, el: 13, zen: '#2e5d9e', hor: '#f2b87c', sun: '#ffd9a2', cloud: '#7a7390', deep: '#0b3b4b', shal: '#35b3a8', fog: '#d7ad85', light: 3.3, lcol: '#ffd6a8', hs: '#9fb8d8', hg: '#7a6444', hi: 0.8, exp: 0.66, smoke: '#b9a08a', foam: 1.0 },
  { t: 0.40, el: 2.2, zen: '#1c3a78', hor: '#ff8a4c', sun: '#ffb070', cloud: '#453a5e', deep: '#0a2c3d', shal: '#22898a', fog: '#c67a5c', light: 2.2, lcol: '#ffa862', hs: '#7282b8', hg: '#4d3b30', hi: 0.6, exp: 0.95, smoke: '#9a6d5c', foam: 0.85 },
  { t: 0.60, el: -3.5, zen: '#0f1d48', hor: '#b2536a', sun: '#ff6a4a', cloud: '#2b2442', deep: '#061c2a', shal: '#0f4a55', fog: '#58395a', light: 0.25, lcol: '#ff7a50', hs: '#3a4474', hg: '#2a2020', hi: 0.4, exp: 1.15, smoke: '#4a3a4a', foam: 0.45 },
  { t: 1.00, el: -22, zen: '#02050f', hor: '#0c1a33', sun: '#8098ff', cloud: '#0c1222', deep: '#020a12', shal: '#052330', fog: '#0a1426', light: 0.0, lcol: '#ff7a50', hs: '#24346a', hg: '#0c0c14', hi: 0.45, exp: 1.9, smoke: '#1a2030', foam: 0.22 },
];

const cA = new THREE.Color(), cB = new THREE.Color();
function lerpKey(t, prop) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1], f = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  if (typeof a[prop] === 'number') return a[prop] + (b[prop] - a[prop]) * f;
  return cA.set(a[prop]).lerp(cB.set(b[prop]), f).clone();
}

const moonV = new THREE.Vector3(-0.35, 0.6, -0.72).normalize();

export function createTimeOfDay({ scene, renderer, hemi, sun, environment }) {
  function applyTime(t) {
    const el = THREE.MathUtils.degToRad(lerpKey(t, 'el'));
    const az = THREE.MathUtils.degToRad(-58);
    uSunDir.value.set(Math.sin(az) * -Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    uZenith.value.copy(lerpKey(t, 'zen'));
    uHorizon.value.copy(lerpKey(t, 'hor'));
    uSunCol.value.copy(lerpKey(t, 'sun'));
    uCloudDark.value.copy(lerpKey(t, 'cloud'));
    uDeep.value.copy(lerpKey(t, 'deep'));
    uShallow.value.copy(lerpKey(t, 'shal'));
    uSmoke.value.copy(lerpKey(t, 'smoke'));
    uFoamLight.value = lerpKey(t, 'foam');
    uSunUp.value = sstep(-0.06, 0.03, Math.sin(el));
    uNight.value = sstep(0.55, 0.9, t);
    uMoonDir.value.copy(moonV);
    uBeam.value = sstep(0.72, 0.95, t);
    scene.fog.color.copy(lerpKey(t, 'fog'));
    lightState.fogDensity = 0.0012 + uNight.value * 0.0008;
    hemi.color.copy(lerpKey(t, 'hs')); hemi.groundColor.copy(lerpKey(t, 'hg')); hemi.intensity = lerpKey(t, 'hi') * 0.6;
    environment.markDirty();
    renderer.toneMappingExposure = lerpKey(t, 'exp');
    // one directional light: the sun, handing over to the moon at dusk while both are dim
    const sunI = lerpKey(t, 'light'), moonI = sstep(0.62, 1, t) * 0.55;
    if (sunI >= moonI) { sun.color.copy(lerpKey(t, 'lcol')); sun.intensity = sunI; lightState.dir.copy(uSunDir.value); }
    else { sun.color.set('#8ea6ff'); sun.intensity = moonI; lightState.dir.copy(moonV); }
    // HUD clock and label
    const mins = Math.round(17 * 60 + 48 + t * 112);
    const hh = Math.floor(mins / 60), mm = String(mins % 60).padStart(2, '0');
    $('clock').textContent = `22 Sep 2004 · ${hh}:${mm}`;
    $('todOut').textContent = t < 0.2 ? 'Golden hour' : t < 0.5 ? 'Sunset' : t < 0.72 ? 'Dusk' : 'Night';
  }
  applyTime(0.4);
  $('tod').addEventListener('input', (e) => applyTime(e.target.value / 1000));
  return applyTime;
}
