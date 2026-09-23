// Seabirds circling over the shore and crabs scuttling on the wet sand.
import * as THREE from 'three/webgpu';
import { shoreZ, terrainH } from '../core/terrain-math.js';
import { rnd, R } from '../core/utils.js';
import { uNight, uDis } from '../core/uniforms.js';

function createBirds(scene) {
  const birds = [];
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.22, 1, 0.02, -0.05], 3));
  wingGeo.computeVertexNormals();
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x16120f, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, birdMat), r = new THREE.Mesh(wingGeo, birdMat);
    r.scale.x = -1; b.add(l, r); b.scale.setScalar(R(0.7, 1.1));
    b.userData = { l, r, rad: R(14, 34), h: R(16, 30), speed: R(0.08, 0.16) * (rnd() < 0.5 ? -1 : 1), ph: R(0, 6.28), cx: R(-20, 30), cz: R(-10, 20), flap: R(5, 7) };
    scene.add(b); birds.push(b);
  }
  return function updateBirds(elapsed) {
    for (const b of birds) {
      const u = b.userData, a = u.ph + elapsed * u.speed;
      b.position.set(u.cx + Math.cos(a) * u.rad, u.h + Math.sin(elapsed * 0.3 + u.ph) * 1.5, u.cz + Math.sin(a) * u.rad);
      b.rotation.y = -a + (u.speed > 0 ? 0 : Math.PI);
      const glide = Math.sin(elapsed * 0.7 + u.ph) > 0.2;
      const f = glide ? 0.12 : Math.sin(elapsed * u.flap + u.ph) * 0.6;
      u.l.rotation.z = f; u.r.rotation.z = -f;
      b.visible = uNight.value < 0.8;
    }
  };
}

function createCrabs(scene, camera) {
  const crabs = [];
  const shell = new THREE.MeshStandardMaterial({ color: 0xc2562e, roughness: 0.55 });
  const legM = new THREE.MeshStandardMaterial({ color: 0xa8482a, roughness: 0.7 });
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
  const bodyGeo = new THREE.SphereGeometry(0.1, 16, 8); bodyGeo.scale(1.25, 0.36, 1);
  const legGeo = new THREE.CylinderGeometry(0.016, 0.012, 0.11, 6); legGeo.translate(0, -0.055, 0);
  const shinGeo = new THREE.CylinderGeometry(0.012, 0.004, 0.1, 6); shinGeo.translate(0, -0.05, 0);
  const clawGeo = new THREE.SphereGeometry(0.05, 10, 7); clawGeo.scale(1.35, 0.7, 1.15);
  const eyeGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.05, 4);
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, shell); body.position.y = 0.06; c.add(body);
    const legs = [];
    for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) {
      const pivot = new THREE.Group();
      // thigh spreads out almost level, shin bends down to the sand; legs fan front to back
      pivot.position.set(sd * 0.105, 0.06, -0.055 + k * 0.035);
      pivot.rotation.y = -sd * (k - 1.5) * 0.38;
      const leg = new THREE.Mesh(legGeo, legM); leg.rotation.z = sd * 1.75; pivot.add(leg);
      const shin = new THREE.Mesh(shinGeo, legM); shin.position.y = -0.11; shin.rotation.z = -sd * 1.25; leg.add(shin);
      pivot.userData.sd = sd; pivot.userData.k = k; c.add(pivot); legs.push(pivot);
    }
    for (const sd of [-1, 1]) {
      const claw = new THREE.Mesh(clawGeo, shell); claw.position.set(sd * 0.075, 0.05, 0.13); claw.rotation.y = sd * 0.5; c.add(claw);
      const eye = new THREE.Mesh(eyeGeo, eyeM); eye.position.set(sd * 0.035, 0.1, 0.08); c.add(eye);
    }
    c.scale.setScalar(R(1.1, 1.5));
    const x = R(-24, 34), z = shoreZ(x) + R(1.5, 5);
    c.position.set(x, terrainH(x, z) + 0.01, z);
    c.rotation.y = R(0, 6.28);
    c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    c.userData = { legs, mode: 'rest', timer: R(0, 3), dir: 1, speed: 0 };
    scene.add(c); crabs.push(c);
  }

  const crabSide = new THREE.Vector3();
  function updateCrabs(dt, t) {
    for (const c of crabs) {
      const u = c.userData;
      u.timer -= dt;
      const dxz = Math.hypot(camera.position.x - c.position.x, camera.position.z - c.position.z);
      if (u.mode !== 'flee' && (dxz < 5 || uDis.value > 0.3)) {
        // scuttle away from the camera
        u.mode = 'flee'; u.timer = R(1.2, 2.2); u.speed = R(1.6, 2.2);
        c.rotation.y = Math.atan2(camera.position.x - c.position.x, camera.position.z - c.position.z) + Math.PI / 2;
        u.dir = rnd() < 0.5 ? -1 : 1;
      }
      if (u.timer <= 0) {
        if (u.mode === 'rest') { u.mode = 'walk'; u.timer = R(0.4, 1.4); u.speed = R(0.5, 1.1); u.dir = rnd() < 0.5 ? -1 : 1; c.rotation.y += R(-0.8, 0.8); }
        else { u.mode = 'rest'; u.timer = R(0.8, 3.5); u.speed = 0; }
      }
      if (u.speed > 0) {
        // crabs walk sideways, and stay on the wet sand
        crabSide.set(Math.cos(c.rotation.y), 0, -Math.sin(c.rotation.y)).multiplyScalar(u.dir * u.speed * dt);
        const nx = c.position.x + crabSide.x, nz = c.position.z + crabSide.z, d = nz - shoreZ(nx);
        if (d < 0.8 || d > 7) { u.dir *= -1; } else { c.position.x = nx; c.position.z = nz; }
        c.position.y = terrainH(c.position.x, c.position.z) + 0.01;
      }
      const gait = u.speed > 0 ? t * 38 : 0;
      for (const p of u.legs) {
        const ph = p.userData.k * 1.6 + (p.userData.sd > 0 ? Math.PI : 0);
        p.rotation.z = u.speed > 0 ? Math.max(0, Math.sin(gait + ph)) * 0.35 * p.userData.sd : 0;
        p.rotation.x = u.speed > 0 ? Math.cos(gait + ph) * 0.2 : 0;
      }
    }
  }
  return { crabs, updateCrabs };
}

export function createWildlife(scene, camera) {
  const updateBirds = createBirds(scene);
  const { crabs, updateCrabs } = createCrabs(scene, camera);
  return {
    crabs,
    update(dt, elapsed) { updateCrabs(dt, elapsed); updateBirds(elapsed); },
  };
}
