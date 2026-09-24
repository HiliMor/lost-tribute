// Palms (merged into two meshes, swaying in the vertex shader), fallen coconuts, driftwood,
// the jungle canopy, bushes and the lava rocks of the headland.
import * as THREE from 'three/webgpu';
import {
  float, vec2, vec3, sin, dot, normalize, mix, smoothstep, max, pow, abs, fract, floor, hash, step, select,
  uv, attribute, positionLocal, positionWorld, cameraPosition, vertexColor, mx_noise_float
} from 'three/tsl';
import { h2, shoreZ, terrainH, landDist, seaDir, WORLD_BOUNDS } from '../core/terrain-math.js';
import { SITES, CLEARINGS } from '../core/layout.js';
import { isPhone, rnd, R, placeOn, shadowy } from '../core/utils.js';
import { uT, uSunDir, uSunCol, uSunUp, uWind } from '../core/uniforms.js';

function createPalms(scene) {
  const palmBases = [];
  // trunk mesh buffers (tl = metres up the trunk, -1 for crown parts)
  const tp = [], tn = [], tc = [], ts = [], tph = [], ti = [], tl = [];
  // frond mesh buffers
  const fp = [], fu = [], fc = [], fs = [], fph = [], fi = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tan = new THREE.Vector3(), side = new THREE.Vector3(), nrm = new THREE.Vector3(), b1 = new THREE.Vector3(), b2 = new THREE.Vector3();
  const shaftGeo = new THREE.CylinderGeometry(0.19, 0.3, 0.8, 9);
  const nutGeoC = new THREE.SphereGeometry(0.15, 9, 7); nutGeoC.scale(1, 0.95, 1.1);
  const partCol = new THREE.Color(), pm = new THREE.Matrix4();

  // bake an extra piece (crown shaft, coconuts) into the trunk mesh so it sways with the crown
  function addPart(geo, mtx, hex, swayV, phase) {
    const g = geo.clone().applyMatrix4(mtx), p = g.attributes.position, n = g.attributes.normal, st = tp.length / 3;
    partCol.set(hex);
    const v = 0.85 + 0.3 * rnd();
    for (let i = 0; i < p.count; i++) {
      tp.push(p.getX(i), p.getY(i), p.getZ(i)); tn.push(n.getX(i), n.getY(i), n.getZ(i));
      tc.push(partCol.r * v, partCol.g * v, partCol.b * v); ts.push(swayV); tph.push(phase); tl.push(-1);
    }
    for (const k of g.index.array) ti.push(st + k);
  }

  function palm(x, z, H, leanDir, lean) {
    const base = new THREE.Vector3(x, terrainH(x, z) - 0.4, z);
    palmBases.push(base);
    const phase = R(0, 6.28);
    const at = (s) => new THREE.Vector3(base.x + leanDir.x * lean * H * Math.pow(s, 1.6), base.y + s * H, base.z + leanDir.z * lean * H * Math.pow(s, 1.6));
    // trunk: rings of vertices along a leaning curve, flared at the base
    const rings = 18, rad = 9, start = tp.length / 3;
    for (let i = 0; i <= rings; i++) {
      const s = Math.pow(i / rings, 1.25), c = at(s);
      tan.copy(at(Math.min(1, s + 0.01))).sub(at(Math.max(0, s - 0.01))).normalize();
      b1.crossVectors(tan, new THREE.Vector3(1, 0, 0)).normalize(); b2.crossVectors(tan, b1).normalize();
      const r = 0.28 * (1 - 0.4 * s) * (1 + 0.55 * Math.pow(Math.max(0, 1 - s / 0.07), 2)) * (1 + 0.04 * Math.sin(s * 9 + phase));
      for (let k = 0; k <= rad; k++) {
        const a = k / rad * Math.PI * 2;
        nrm.copy(b1).multiplyScalar(Math.cos(a)).addScaledVector(b2, Math.sin(a));
        tp.push(c.x + nrm.x * r, c.y + nrm.y * r, c.z + nrm.z * r);
        tn.push(nrm.x, nrm.y, nrm.z);
        tc.push(0.32, 0.3, 0.27);
        ts.push(s * s); tph.push(phase); tl.push(s * H);
      }
    }
    for (let i = 0; i < rings; i++) for (let k = 0; k < rad; k++) {
      const a = start + i * (rad + 1) + k, b = a + rad + 1;
      ti.push(a, b, a + 1, a + 1, b, b + 1);
    }
    // crown shaft and a cluster of coconuts under the fronds
    const C = at(1);
    addPart(shaftGeo, pm.makeTranslation(C.x, C.y - 0.15, C.z), '#5d4a33', 1, phase);
    if (rnd() < 0.65) {
      const k = 3 + Math.floor(rnd() * 4), green = rnd() < 0.6;
      for (let i = 0; i < k; i++) {
        const a = R(0, 6.28), r = R(0.22, 0.32);
        addPart(nutGeoC, pm.makeTranslation(C.x + Math.cos(a) * r, C.y - R(0.3, 0.55), C.z + Math.sin(a) * r), green ? '#56611f' : '#6a4424', 1, phase);
      }
    }
    // fronds: V-folded strips that arch out and droop; leaflets are cut out in the shader
    const nf = 15;
    for (let f = 0; f < nf; f++) {
      const dead = rnd() < 0.14;
      const ang = f / nf * Math.PI * 2 + R(-0.25, 0.25);
      const el = dead ? R(-0.9, -0.4) : R(0.1, 0.85);
      const len = R(3.4, 5.2) * (H / 10 * 0.4 + 0.6);
      const droop = dead ? 0.2 : R(0.7, 1.3);
      const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      const segs = 12, s0 = fp.length / 3;
      const colA = dead ? [0.36, 0.27, 0.13] : [R(0.12, 0.2), R(0.24, 0.33), R(0.05, 0.09)];
      const P = (t) => new THREE.Vector3().copy(C).addScaledVector(dir, t * len * Math.cos(el) * 0.95).addScaledVector(up, t * len * Math.sin(el) - droop * t * t * len * 0.75);
      for (let i = 0; i <= segs; i++) {
        const t = i / segs, p = P(t);
        tan.copy(P(Math.min(1, t + 0.02))).sub(P(Math.max(0, t - 0.02))).normalize();
        side.crossVectors(tan, up).normalize();
        nrm.crossVectors(side, tan).normalize();
        const w = 0.08 + 0.78 * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)) * (1 - 0.3 * t);
        const L = p.clone().addScaledVector(side, -w * 0.92).addScaledVector(nrm, -w * 0.45);
        const M = p.clone().addScaledVector(nrm, w * 0.06);
        const Rr = p.clone().addScaledVector(side, w * 0.92).addScaledVector(nrm, -w * 0.45);
        for (const [q, u] of [[L, 0], [M, 0.5], [Rr, 1]]) {
          fp.push(q.x, q.y, q.z); fu.push(u, t);
          const tip = t * 0.35;
          fc.push(colA[0] + tip * 0.12, colA[1] + tip * 0.08, colA[2] + tip * 0.02);
          fs.push(1 + t * 0.8); fph.push(phase + f * 0.37);
        }
      }
      for (let i = 0; i < segs; i++) {
        const a = s0 + i * 3;
        fi.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
      }
    }
  }

  // leaning palms right at the edge of the sand, then the tree line
  const spots = [];
  for (let i = 0; i < 26; i++) { const x = R(-160, 120); spots.push([x, shoreZ(x) + R(13, 20), true]); }
  for (let i = 0; i < 110; i++) { const x = R(-230, 170); spots.push([x, shoreZ(x) + R(18, 46), false]); }
  for (const [x, z, edge] of spots) {
    if (landDist(x, z) < 8) continue;               // the cove is narrower than the old straight beach
    if (Math.hypot(x - 4, z - 12) < 13) continue;   // keep the wreck clear
    if (Math.hypot(x + 6, z - 18.5) < 5) continue;  // and the fire
    const toSea = new THREE.Vector3(R(-0.4, 0.4), 0, -1).normalize();
    palm(x, z, R(7, 13), edge ? toSea : new THREE.Vector3(R(-1, 1), 0, R(-1, 0.3)).normalize(), edge ? R(0.25, 0.5) : R(0.04, 0.2));
  }
  // palms along every other stretch of coast (Hydra Island too), leaning out to sea
  const B = WORLD_BOUNDS, keepClear = [SITES.lighthouse, SITES.statue, SITES.hydra, SITES.temple];
  for (let n = 0, tries = 0; n < 150 && tries < 40000; tries++) {
    const x = R(B.x0, B.x1), z = R(B.z0, B.z1), d = landDist(x, z);
    if (d < 12 || d > 40 || Math.hypot(x - 4, z - 5) < 200) continue;
    if (keepClear.some((s) => Math.hypot(x - s.x, z - s.z) < 60)) continue;
    const sea = seaDir(x, z);
    palm(x, z, R(7, 13), new THREE.Vector3(sea.x, 0, sea.z), R(0.15, 0.45));
    n++;
  }

  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  tg.setAttribute('normal', new THREE.Float32BufferAttribute(tn, 3));
  tg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
  tg.setAttribute('sway', new THREE.Float32BufferAttribute(ts, 1));
  tg.setAttribute('phase', new THREE.Float32BufferAttribute(tph, 1));
  tg.setAttribute('tl', new THREE.Float32BufferAttribute(tl, 1));
  tg.setIndex(ti);
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  fg.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2));
  fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
  fg.setAttribute('sway', new THREE.Float32BufferAttribute(fs, 1));
  fg.setAttribute('phase', new THREE.Float32BufferAttribute(fph, 1));
  fg.setIndex(fi);
  fg.computeVertexNormals();

  // wind: gusts push the crowns leeward; each palm has its own phase
  const sway = attribute('sway', 'float'), ph = attribute('phase', 'float');
  const gust = sin(uT.mul(0.9).add(ph)).mul(0.55).add(sin(uT.mul(2.3).add(ph.mul(2.1))).mul(0.2)).add(0.45);
  const windOff = vec3(gust.mul(uWind), 0.0, sin(uT.mul(0.7).add(ph.mul(1.7))).mul(uWind).mul(0.35)).mul(sway);

  const tm = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
  // leaf-scar rings and bark along the trunk
  const tlA = attribute('tl', 'float');
  const isTrunk = step(0.0, tlA);
  const ringLine = smoothstep(0.7, 0.93, fract(tlA.mul(3.4).add(mx_noise_float(positionLocal.mul(2.0)).mul(0.18))));
  const bark = mx_noise_float(positionLocal.mul(vec3(10.0, 2.2, 10.0))).mul(0.14);
  const trunkTone = mix(float(1.0), float(0.6), ringLine).add(bark).mul(smoothstep(0.0, 1.4, tlA).mul(0.3).add(0.7));
  tm.colorNode = vertexColor().mul(mix(float(1.0), trunkTone, isTrunk));
  tm.positionNode = positionLocal.add(windOff.mul(0.55));
  const trunks = new THREE.Mesh(tg, tm); trunks.castShadow = true; trunks.receiveShadow = true; trunks.frustumCulled = false;
  scene.add(trunks);

  const fm = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, side: THREE.DoubleSide, alphaTest: 0.5 });
  const U = uv();
  const across = abs(U.x.sub(0.5)).mul(2.0);
  const env = smoothstep(0.0, 0.1, U.y).mul(pow(U.y, 3.0).oneMinus());
  // narrow leaflets swept back from the midrib, tapering to points at their tips
  const leaflet = fract(U.y.mul(42.0).sub(across.mul(2.6)).add(mx_noise_float(vec3(U.mul(vec2(3.0, 40.0)), ph)).mul(0.12)));
  const leafWidth = pow(across.oneMinus(), 0.8).mul(0.62).add(0.08);
  const keep = step(across, env).mul(step(abs(leaflet.sub(0.5)).mul(2.0), leafWidth));
  fm.opacityNode = max(keep, step(across, 0.07));
  const leafId = floor(U.y.mul(42.0).sub(across.mul(2.6))).add(10.0).add(step(0.5, U.x).mul(97.0));
  const leafVar = hash(leafId.add(ph.mul(53.0))).mul(0.32).add(0.84);
  const dryTip = smoothstep(0.78, 1.0, U.y).mul(step(0.55, hash(ph.mul(71.0)))).mul(0.7);
  const leafCol = vertexColor().mul(mix(float(1.35), float(0.8), across)).mul(leafVar).mul(select(step(across, 0.07).greaterThan(0.5), vec3(1.3, 1.25, 0.8), vec3(1.0)));
  fm.colorNode = mix(leafCol, vec3(0.36, 0.26, 0.12), dryTip);
  // sunlight shining through the leaves when you look towards the sun
  const toCam = normalize(cameraPosition.sub(positionWorld));
  fm.emissiveNode = leafCol.mul(uSunCol).mul(pow(max(dot(toCam.negate(), uSunDir), 0.0), 4.0)).mul(uSunUp).mul(1.2);
  const flutter = vec3(0.0, sin(uT.mul(5.0).add(ph.mul(3.0)).add(U.y.mul(6.0))).mul(0.07).mul(U.y), 0.0);
  fm.positionNode = positionLocal.add(windOff.mul(0.55)).add(flutter.mul(uWind.mul(3.0)));
  const fronds = new THREE.Mesh(fg, fm); fronds.castShadow = true; fronds.receiveShadow = true; fronds.frustumCulled = false;
  scene.add(fronds);

  return palmBases;
}

function createBeachLitter(scene, palmBases) {
  // fallen coconuts under the palms
  const nutGeo = new THREE.SphereGeometry(0.14, 12, 9); nutGeo.scale(1, 0.92, 1.12);
  const nuts = new THREE.InstancedMesh(nutGeo, new THREE.MeshStandardMaterial({ roughness: 0.75 }), 260);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  let n = 0;
  for (const b of palmBases) {
    if (rnd() < 0.45) continue;
    const k = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < k && n < 260; i++) {
      const a = R(0, 6.28), r = R(0.6, 2.2), x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
      ps.set(x, terrainH(x, z) + 0.08, z); q.setFromEuler(new THREE.Euler(R(0, 3), R(0, 6), R(0, 3)));
      nuts.setMatrixAt(n, m.compose(ps, q, sc.setScalar(R(0.85, 1.15))));
      nuts.setColorAt(n, c.set(rnd() < 0.3 ? '#5f6b22' : rnd() < 0.5 ? '#6b4526' : '#3f2a18'));
      n++;
    }
  }
  nuts.count = n; nuts.castShadow = true; nuts.receiveShadow = true;
  scene.add(nuts);

  // bleached driftwood along the high-tide line
  const woodM = new THREE.MeshStandardMaterial({ color: 0xa39682, roughness: 1 });
  for (let i = 0; i < 11; i++) {
    const x = R(-150, 110);
    if (Math.abs(x - 4) < 16) continue;
    const z = shoreZ(x) + R(3, 6.5), len = R(1.4, 4.2);
    if (landDist(x, z) < 2 || landDist(x, z) > 9) continue;       // only where the high-tide line really is
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(R(0.08, 0.14), R(0.12, 0.22), len, 8), woodM);
    trunk.rotation.z = Math.PI / 2; g.add(trunk);
    for (let k = 0; k < 2; k++) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, R(0.5, 1.1), 6), woodM);
      br.position.set(R(-len / 3, len / 3), 0.15, 0); br.rotation.set(R(-0.8, 0.8), 0, R(0.5, 1.2)); g.add(br);
    }
    placeOn(g, x, z, 0.05); g.position.y += 0.1; g.rotation.y = R(0, 6.28);
    scene.add(shadowy(g));
  }
}

function createJungle(scene) {
  // one rounded, lumpy blob shape reused for canopy and bushes
  const blobGeo = new THREE.IcosahedronGeometry(1, 3);
  const bp = blobGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const s = 1 + 0.14 * Math.sin(x * 5.1 + z * 2.3) * Math.cos(y * 4.7 - x * 1.3) + 0.08 * Math.sin(z * 9.7 + y * 6.1);
    bp.setXYZ(i, x * s, Math.max(y, -0.35) * s * 0.8, z * s);
  }
  blobGeo.computeVertexNormals();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();

  // canopy covering the island, leaving clearings around the landmarks
  const N = isPhone ? 5500 : 11000;
  const open = CLEARINGS.map((c) => ({ x: SITES[c.site].x, z: SITES[c.site].z, r: c.r }));
  const inClearing = (x, z) => open.some((c) => Math.hypot(x - c.x, z - c.z) < c.r);
  const canopy = new THREE.InstancedMesh(blobGeo, new THREE.MeshStandardMaterial({ roughness: 0.92 }), N);
  const greens = ['#24361a', '#2d4420', '#1d2e16', '#3a4d22', '#2a3d27', '#33471c'].map((c) => new THREE.Color(c));
  let n = 0, tries = 0;
  while (n < N && tries < 160000) {
    tries++;
    const onHydra = tries % 40 === 0;
    const x = onHydra ? SITES.hydra.x + R(-160, 160) : R(WORLD_BOUNDS.x0, WORLD_BOUNDS.x1), z = onHydra ? SITES.hydra.z + R(-160, 160) : R(WORLD_BOUNDS.z0, WORLD_BOUNDS.z1);
    const d = landDist(x, z);
    if (d < 30 || inClearing(x, z)) continue;
    const h = terrainH(x, z);
    if (h > 330) continue;
    const s = R(3.5, 8.5) * (d < 45 ? 0.7 : 1);
    ps.set(x, h + s * 0.45, z);
    q.setFromEuler(new THREE.Euler(R(-0.2, 0.2), R(0, 6.28), R(-0.2, 0.2)));
    sc.set(s * R(0.9, 1.3), s * R(0.7, 1.1), s * R(0.9, 1.3));
    canopy.setMatrixAt(n, m.compose(ps, q, sc));
    col.copy(greens[n % greens.length]).multiplyScalar(R(0.85, 1.15));
    canopy.setColorAt(n, col);
    n++;
  }
  canopy.count = n;
  canopy.receiveShadow = true;
  scene.add(canopy);

  // bushes along the edge of the sand
  const bushes = new THREE.InstancedMesh(blobGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), 900);
  n = 0;
  for (let i = 0; i < 2000 && n < 900; i++) {
    const x = R(-260, 150), z = shoreZ(x) + R(19, 34);
    if (Math.hypot(x - 4, z - 12) < 12 || landDist(x, z) < 15) continue;
    const s = R(0.6, 1.8);
    ps.set(x, terrainH(x, z) + s * 0.25, z);
    q.setFromEuler(new THREE.Euler(0, R(0, 6.28), 0));
    sc.set(s * 1.3, s * 0.8, s * 1.3);
    bushes.setMatrixAt(n, m.compose(ps, q, sc));
    col.set(rnd() < 0.5 ? '#3c5a22' : '#56692a').multiplyScalar(R(0.8, 1.1));
    bushes.setColorAt(n, col);
    n++;
  }
  bushes.count = n; bushes.castShadow = true; bushes.receiveShadow = true;
  scene.add(bushes);

  // lava rocks where the cove meets the rocky headlands either side of the beach
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) { const s = 1 + (h2(i, 9) - 0.5) * 0.5; rp.setXYZ(i, rp.getX(i) * s, rp.getY(i) * s, rp.getZ(i) * s); }
  rockGeo.computeVertexNormals();
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x2c2926, roughness: 0.85, flatShading: true }), 160);
  n = 0;
  for (let i = 0; i < 4000 && n < 160; i++) {
    const a = R(0, Math.PI * 2), dist = R(70, 420), x = 4 + Math.cos(a) * dist, z = 5 + Math.sin(a) * dist;
    const d = landDist(x, z);
    if (d < -10 || d > 3) continue;
    const s = R(0.5, 2.8) * (dist > 140 ? 1.8 : 1);
    ps.set(x, terrainH(x, z) + s * 0.1, z);
    q.setFromEuler(new THREE.Euler(R(0, 6), R(0, 6), R(0, 6)));
    sc.set(s * R(1, 1.6), s * R(0.6, 1), s * R(1, 1.5));
    rocks.setMatrixAt(n++, m.compose(ps, q, sc));
  }
  rocks.count = n; rocks.castShadow = true; rocks.receiveShadow = true;
  scene.add(rocks);
}

export function createVegetation(scene) {
  const palmBases = createPalms(scene);
  createBeachLitter(scene, palmBases);
  createJungle(scene);
}
