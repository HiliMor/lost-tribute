// Oceanic 815 Crash Beach: a fan-made tribute to LOST.
// Entry point: sets up the renderer, builds the island, and runs the frame loop.
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { $, isPhone, reduceMotion } from './core/utils.js';
import { terrainH } from './core/terrain-math.js';
import { uT, uDis, uWind } from './core/uniforms.js';

import { createSky, createEnvironment } from './environment/sky.js';
import { createLights } from './environment/lights.js';
import { createTimeOfDay } from './environment/time-of-day.js';
import { createPostProcessing } from './environment/post.js';

import { createTerrain } from './world/terrain.js';
import { createOcean } from './world/ocean.js';
import { createWreck } from './world/wreck.js';
import { createFire, FIRE } from './world/fire.js';
import { createVegetation } from './world/vegetation.js';
import { createWildlife } from './world/wildlife.js';
import { createHatch } from './world/hatch.js';

import { audio, setupSoundButton } from './ui/audio.js';
import { setupSwan, updateSwan } from './ui/swan.js';
import { setupIntro, updateAnniversary, showStartupError } from './ui/intro.js';

updateAnniversary();

/* ---------- Renderer (WebGPU, falls back to WebGL 2) ---------- */
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
} catch (e) {
  showStartupError('This browser could not start WebGPU or WebGL 2.');
  throw e;
}
$('backend').innerHTML = renderer.backend.isWebGPUBackend ? '<b>WebGPU</b>' : '<b>WebGL 2</b> fallback';
renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone ? 1.3 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.3, 6000);
// keep a wide horizontal view on tall (portrait) screens
function fitCamera() {
  camera.aspect = innerWidth / innerHeight;
  const hFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30)));
  camera.fov = Math.min(88, Math.max(52, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hFov / 2) / camera.aspect))));
  camera.updateProjectionMatrix();
}
fitCamera();
camera.position.set(32, 4.5, -7);
if (innerHeight > innerWidth) camera.position.set(44, 7, -12);

/* ---------- Build the island ----------
   The order matters: props are placed with a seeded random sequence,
   so building in a different order would move every palm and suitcase. */
const sky = createSky(scene);
const environment = createEnvironment(renderer, scene);
createTerrain(scene);
createOcean(scene);
const { hemi, sun } = createLights(scene);
const wreck = createWreck(scene);
const fire = createFire(scene);
createVegetation(scene);
const wildlife = createWildlife(scene, camera);
const hatch = createHatch(scene);
createTimeOfDay({ scene, renderer, hemi, sun, environment });
const pipeline = createPostProcessing(renderer, scene, camera);

/* ---------- Camera controls ---------- */
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.2, 13);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 6;
controls.maxDistance = 120;
controls.maxPolarAngle = 1.47;
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 0.22;
// slow drift resumes 14 s after the viewer lets go
let idleTimer;
controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idleTimer); });
controls.addEventListener('end', () => { clearTimeout(idleTimer); if (!reduceMotion) idleTimer = setTimeout(() => (controls.autoRotate = true), 14000); });

addEventListener('resize', () => {
  fitCamera();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- HUD ---------- */
setupSoundButton();
setupSwan();

/* ---------- Frame loop ---------- */
let lastNow = performance.now();
let elapsed = 0, firstFrame = true;
const shake = new THREE.Vector3();

function frame() {
  const now = performance.now();
  const dt = Math.min((now - lastNow) / 1000, 0.1);
  lastNow = now;
  elapsed += dt;
  uT.value = elapsed;

  updateSwan(dt);
  audio.tick(elapsed, camera.position.distanceTo(FIRE));
  wreck.update(dt, elapsed, uDis.value, uWind.value);
  wildlife.update(dt, elapsed);
  fire.update(elapsed);
  hatch.update();
  sky.position.copy(camera.position);

  camera.position.sub(shake);
  controls.update(dt);
  // keep the camera above ground and water
  const floorY = Math.max(terrainH(camera.position.x, camera.position.z), 0) + 1.4;
  if (camera.position.y < floorY) camera.position.y = floorY;
  // camera shake during a Swan discharge
  const dis = uDis.value;
  shake.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(0.12 * dis * dis);
  camera.position.add(shake);

  environment.update(elapsed);
  pipeline.render();
  if (firstFrame) { firstFrame = false; sceneIsReady(); }
}

const sceneIsReady = setupIntro();
renderer.setAnimationLoop(frame);
