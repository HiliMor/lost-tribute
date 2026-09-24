// Close-up jungle around every place on the map: broadleaf trees with buttress roots, leafy crowns
// and hanging vines, tree ferns, ferns and big-leafed undergrowth. The far hills keep the cheaper
// canopy from vegetation.js.
import * as THREE from 'three/webgpu';
import { vec3, mix, smoothstep, texture, uv, positionLocal, positionWorld, mx_noise_float } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { landDist } from '../core/terrain-math.js';
import { surfaceH } from './terrain.js';
import { SITES, CLEARINGS } from '../core/layout.js';
import { isPhone, R, canvasTex } from '../core/utils.js';

/* ---------- textures drawn on canvases ---------- */

// A cluster of broad tropical leaves on a transparent background.
function leafTexture() {
  const t = canvasTex(512, 512, (g, W) => {
    g.clearRect(0, 0, W, W);
    for (let i = 0; i < 260; i++) {
      const x = W / 2 + (Math.random() - 0.5) * W * 0.8, y = W / 2 + (Math.random() - 0.5) * W * 0.8;
      if (Math.hypot(x - W / 2, y - W / 2) > W * 0.44) continue;
      const len = 40 + Math.random() * 50, wid = len * (0.32 + Math.random() * 0.15), a = Math.random() * Math.PI * 2;
      const l = 30 + Math.random() * 24;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = `hsl(${88 + Math.random() * 30}, ${35 + Math.random() * 25}%, ${l}%)`;
      g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, -wid, len / 2, 0); g.quadraticCurveTo(0, wid, -len / 2, 0); g.fill();
      g.strokeStyle = `hsla(70, 40%, ${l + 18}%, .6)`; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke();
      g.restore();
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// One fern frond: a stem with pairs of leaflets, on a transparent background.
function frondTexture() {
  return canvasTex(128, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = '#3d5a1c'; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2, H); g.lineTo(W / 2, 10); g.stroke();
    for (let y = H - 30; y > 20; y -= 14) {
      const t = 1 - y / H, len = (W / 2 - 6) * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08));
      for (const s of [-1, 1]) {
        g.fillStyle = `hsl(${92 + Math.random() * 16}, 45%, ${24 + Math.random() * 12}%)`;
        g.beginPath(); g.moveTo(W / 2, y); g.quadraticCurveTo(W / 2 + s * len * 0.6, y - 12, W / 2 + s * len, y - 16);
        g.quadraticCurveTo(W / 2 + s * len * 0.5, y + 2, W / 2, y + 4); g.fill();
      }
    }
  });
}

// A tuft of grass blades on a transparent background.
function grassTexture() {
  const t = canvasTex(256, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = W * (0.08 + Math.random() * 0.84), h = H * (0.45 + Math.random() * 0.52), bend = (Math.random() - 0.5) * W * 0.3, w = 3 + Math.random() * 4;
      g.fillStyle = `hsl(${70 + Math.random() * 32}, ${38 + Math.random() * 22}%, ${26 + Math.random() * 22}%)`;
      g.beginPath(); g.moveTo(x - w, H); g.quadraticCurveTo(x - w * 0.5 + bend * 0.4, H - h * 0.6, x + bend, H - h); g.quadraticCurveTo(x + w * 0.5 + bend * 0.4, H - h * 0.6, x + w, H); g.fill();
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// An elephant-ear leaf (taro), heart-shaped with pale veins: the big leaves all over the show's jungle.
function earTexture() {
  const t = canvasTex(256, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const cx = W / 2;
    g.fillStyle = '#4f7a2a';
    g.beginPath(); g.moveTo(cx, H * 0.97);
    g.bezierCurveTo(W * 0.02, H * 0.72, W * 0.02, H * 0.08, cx - W * 0.1, H * 0.06);
    g.lineTo(cx, H * 0.2); g.lineTo(cx + W * 0.1, H * 0.06);
    g.bezierCurveTo(W * 0.98, H * 0.08, W * 0.98, H * 0.72, cx, H * 0.97); g.fill();
    const gr = g.createRadialGradient(cx, H * 0.3, 10, cx, H * 0.5, W * 0.6);
    gr.addColorStop(0, 'rgba(150,190,80,.35)'); gr.addColorStop(1, 'rgba(20,50,10,.3)');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(190,215,130,.55)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx, H * 0.22); g.lineTo(cx, H * 0.95); g.stroke();
    g.lineWidth = 1.5;
    for (let k = 0; k < 7; k++) for (const sd of [-1, 1]) {
      const y = H * (0.3 + k * 0.09);
      g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(cx + sd * W * 0.2, y - H * 0.02, cx + sd * W * (0.42 - k * 0.035), y + H * 0.1); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- geometry ---------- */

// A crown is clusters of leaf cards whose normals point outward from the crown centre,
// so it shades like a soft round mass instead of flat cards.
function crownGeometry(radius, height, clusters) {
  const parts = [];
  const c = new THREE.Vector3(0, height, 0);
  for (let i = 0; i < clusters; i++) {
    const a = R(0, Math.PI * 2), e = R(-0.35, 1.2), r = radius * R(0.2, 0.75);
    const p = new THREE.Vector3(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.55, Math.sin(a) * Math.cos(e) * r).add(c);
    const size = radius * R(0.8, 1.15);
    for (let k = 0; k < 3; k++) {
      const q = new THREE.PlaneGeometry(size, size);
      q.rotateX(k === 2 ? -Math.PI / 2 + R(-0.4, 0.4) : R(-0.3, 0.3));
      q.rotateY(k * Math.PI / 3 + a);
      q.translate(p.x, p.y, p.z);
      const n = q.attributes.normal, pos = q.attributes.position;
      for (let v = 0; v < n.count; v++) {
        const d = new THREE.Vector3(pos.getX(v) - c.x, (pos.getY(v) - c.y) * 1.6 + radius * 0.4, pos.getZ(v) - c.z).normalize();
        n.setXYZ(v, d.x, d.y, d.z);
      }
      parts.push(q);
    }
  }
  return mergeGeometries(parts);
}

// Trunk with a slight lean, flared buttress roots, and a few lianas hanging from the crown.
function trunkGeometry(height, radius, vines) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(radius * 0.6, radius, height, 9, 8);
  trunk.translate(0, height / 2, 0);
  const p = trunk.attributes.position, lean = R(-0.04, 0.04), lean2 = R(-0.04, 0.04);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + lean * y * y / height); p.setZ(i, p.getZ(i) + lean2 * y * y / height); }
  trunk.computeVertexNormals();
  parts.push(trunk);
  // buttress roots: thin triangular fins around the base
  const nb = 4 + Math.floor(R(0, 3));
  for (let i = 0; i < nb; i++) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(radius * R(3, 4.5), 0); shape.quadraticCurveTo(radius * 1.2, radius * 1.2, 0, radius * R(4, 6));
    const fin = new THREE.ExtrudeGeometry(shape, { depth: radius * 0.25, bevelEnabled: false, curveSegments: 4 });
    fin.translate(0, 0, -radius * 0.12); fin.rotateY(i / nb * Math.PI * 2 + R(-0.3, 0.3));
    parts.push(fin);
  }
  // branches up into the crown
  for (let i = 0; i < 4; i++) {
    const a = R(0, Math.PI * 2), y0 = height * R(0.6, 0.8), len = R(3, 5);
    const b = new THREE.CylinderGeometry(radius * 0.18, radius * 0.3, len, 6);
    b.translate(0, len / 2, 0); b.rotateZ(R(0.6, 1.0)); b.rotateY(a); b.translate(0, y0, 0);
    parts.push(b);
  }
  // lianas
  for (let i = 0; i < vines; i++) {
    const a = R(0, Math.PI * 2), r = R(1.5, 4), len = R(5, height * 0.8);
    const v = new THREE.CylinderGeometry(0.035, 0.05, len, 4);
    v.translate(Math.cos(a) * r, height + 1 - len / 2, Math.sin(a) * r);
    parts.push(v);
  }
  return mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; }));
}

// Ferns: bent fronds arranged in a rosette.
function fernGeometry(fronds, length) {
  const parts = [];
  for (let i = 0; i < fronds; i++) {
    const g = new THREE.PlaneGeometry(length * 0.28, length, 1, 4);
    g.translate(0, length / 2, 0);
    const p = g.attributes.position;
    for (let v = 0; v < p.count; v++) { const y = p.getY(v); p.setZ(v, y * y * 0.35 / length); }   // arch outwards
    g.rotateX(-R(0.5, 1.0));
    g.rotateY(i / fronds * Math.PI * 2 + R(-0.2, 0.2));
    g.computeVertexNormals();
    const n = g.attributes.normal;
    for (let v = 0; v < n.count; v++) n.setXYZ(v, n.getX(v) * 0.4, 1, n.getZ(v) * 0.4);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

// A grass tuft: three crossed cards.
function tuftGeometry(w, h) {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.rotateY(i * Math.PI / 3);
    const n = g.attributes.normal; for (let v = 0; v < n.count; v++) n.setXYZ(v, 0, 1, 0);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

// An elephant-ear plant: leaves held out on long stalks.
function earPlantGeometry(leaves) {
  const leafParts = [], stemParts = [];
  for (let i = 0; i < leaves; i++) {
    const a = i / leaves * Math.PI * 2 + R(-0.3, 0.3), len = R(0.8, 1.5), tilt = R(0.35, 0.7);
    const tip = new THREE.Vector3(Math.cos(a) * len * tilt, len, Math.sin(a) * len * tilt);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().normalize());
    stemParts.push(new THREE.CylinderGeometry(0.02, 0.035, tip.length(), 4).translate(0, tip.length() / 2, 0).applyQuaternion(q));
    const size = R(0.7, 1.1);
    const lf = new THREE.PlaneGeometry(size * 0.8, size);
    lf.translate(0, -size * 0.45, 0);                 // leaf hangs from its stalk tip
    lf.rotateX(-Math.PI / 2 + R(0.5, 0.9));          // mostly flat, drooping outwards
    lf.rotateY(-a + Math.PI / 2);
    lf.translate(tip.x, tip.y, tip.z);
    const n = lf.attributes.normal; for (let v = 0; v < n.count; v++) n.setXYZ(v, n.getX(v) * 0.3, 1, n.getZ(v) * 0.3);
    leafParts.push(lf);
  }
  return { leaves: mergeGeometries(leafParts), stems: mergeGeometries(stemParts) };
}

/* ---------- placement ---------- */

// A patch of tall grass round a point (the Pearl's meadow), leaving a clear circle in the middle.
let grassMat = null;
export function grassField(scene, cx, cz, { radius = 20, clear = 3, count = 1600, height = 1.3 } = {}) {
  if (!grassMat) {
    const tex = grassTexture();
    grassMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.4 });
    grassMat.colorNode = texture(tex, uv()).rgb.mul(1.5).mul(uv().y.mul(0.55).add(0.6));
    grassMat.opacityNode = texture(tex, uv()).a.mul(1.7).clamp(0, 1);
  }
  const im = new THREE.InstancedMesh(tuftGeometry(1.2, height), grassMat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = R(0, Math.PI * 2), r = clear + (radius - clear) * Math.sqrt(R(0, 1));
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, s = R(0.7, 1.3);
    ps.set(x, surfaceH(x, z) - 0.05, z); q.setFromEuler(new THREE.Euler(0, R(0, 6.28), 0));
    im.setMatrixAt(i, m.compose(ps, q, sc.set(s, s * R(0.8, 1.2), s)));
    im.setColorAt(i, col.set(['#a9bf64', '#9ab85a', '#c2c070', '#8fae52'][i % 4]).multiplyScalar(R(0.85, 1.1)));
  }
  im.receiveShadow = true;
  scene.add(im);
  return im;
}

const PLACE_SITES = Object.keys(SITES).filter((k) => !['lookingGlass'].includes(k));
const CLEAR = Object.fromEntries(CLEARINGS.map((c) => [c.site, c]));
const clearOf = (k) => (CLEAR[k] ? CLEAR[k].r : 12);
const blocked = CLEARINGS.map((c) => ({ x: SITES[c.site].x, z: SITES[c.site].z, r: c.flat > 0 ? c.r * 0.85 : c.r * 0.6 }));
const inside = (x, z) => blocked.some((b) => Math.hypot(x - b.x, z - b.z) < b.r);

// `near` scales the clearing radius: 1 = start at the clearing's edge, 0.6 = reach into it.
function scatter(count, rMin, rMax, minLand, near = 1) {
  const out = [];
  const perSite = Math.ceil(count / (PLACE_SITES.length + 3));
  for (const k of [...PLACE_SITES, 'crash', 'crash', 'crash']) {
    const s = SITES[k], r0 = Math.max(3, clearOf(k) * near + rMin);
    for (let i = 0, tries = 0; i < perSite && tries < perSite * 8; tries++) {
      const a = R(0, Math.PI * 2), r = r0 + (rMax - r0) * Math.sqrt(R(0, 1));
      const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
      if (landDist(x, z) < minLand || (near >= 1 && inside(x, z))) continue;
      if (Math.hypot(x - 4, z - 12) < 30) continue;    // keep the camp itself open
      out.push([x, z]); i++;
    }
  }
  return out;
}

export function createJungle(scene) {
  const k = isPhone ? 0.5 : 1;
  const leafTex = leafTexture(), frondTex = frondTexture();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();

  // materials
  const bark = new THREE.MeshStandardNodeMaterial({ roughness: 1 });
  const streak = mx_noise_float(positionWorld.mul(vec3(1.8, 0.25, 1.8))).mul(0.5).add(0.5);
  const moss = smoothstep(0.35, 0.8, mx_noise_float(positionWorld.mul(0.6)).mul(0.5).add(0.5)).mul(smoothstep(4.0, 0.0, positionLocal.y).mul(0.6).add(0.25));
  bark.colorNode = mix(vec3(0.24, 0.2, 0.15).mul(streak.mul(0.5).add(0.7)), vec3(0.2, 0.27, 0.1), moss);
  const leaves = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.45 });
  leaves.colorNode = texture(leafTex, uv()).rgb.mul(1.6);
  // boost alpha so leaves don't thin out in the distance (mipmaps average the gaps in)
  leaves.opacityNode = texture(leafTex, uv()).a.mul(1.9).clamp(0, 1);
  const fernM = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.4 });
  fernM.colorNode = texture(frondTex, uv()).rgb.mul(1.6);
  fernM.opacityNode = texture(frondTex, uv()).a.mul(1.8).clamp(0, 1);

  // three tree shapes, each drawn as instanced trunks + instanced crowns
  const variants = [
    { h: 15, r: 0.5, crown: 6.5, clusters: 16, vines: 5 },
    { h: 11, r: 0.38, crown: 5, clusters: 13, vines: 3 },
    { h: 19, r: 0.6, crown: 7.5, clusters: 20, vines: 7 },
  ].map((v) => ({ trunk: trunkGeometry(v.h, v.r, v.vines), crown: crownGeometry(v.crown, v.h, v.clusters) }));

  const spots = scatter(Math.round(2600 * k), 4, 130, 22);
  const perVariant = variants.map(() => []);
  spots.forEach((p, i) => perVariant[i % 3].push(p));
  const greens = ['#8fb257', '#7ea34a', '#9cba5e', '#739a45', '#a8c46a'].map((c) => new THREE.Color(c));
  variants.forEach((v, vi) => {
    const list = perVariant[vi];
    const trunks = new THREE.InstancedMesh(v.trunk, bark, list.length);
    const crowns = new THREE.InstancedMesh(v.crown, leaves, list.length);
    list.forEach(([x, z], i) => {
      const s = R(0.75, 1.2);
      ps.set(x, surfaceH(x, z) - 0.3, z);
      q.setFromEuler(new THREE.Euler(0, R(0, Math.PI * 2), 0));
      m.compose(ps, q, sc.set(s, s * R(0.9, 1.15), s));
      trunks.setMatrixAt(i, m); crowns.setMatrixAt(i, m);
      crowns.setColorAt(i, col.copy(greens[(i + vi) % greens.length]).multiplyScalar(R(0.85, 1.1)));
    });
    for (const im of [trunks, crowns]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
  });

  // tree ferns (a trunk with a fern crown) and ground ferns
  const fernGeo = fernGeometry(9, 1.6);
  const treeFernGeo = { crown: fernGeometry(11, 2.4).translate(0, 3.2, 0), trunk: new THREE.CylinderGeometry(0.12, 0.16, 3.3, 6).translate(0, 1.65, 0) };
  const fernSpots = scatter(Math.round(14000 * k), 0, 80, 24, 0.6);   // 24 m from the sea: never on the sand
  const ferns = new THREE.InstancedMesh(fernGeo, fernM, fernSpots.length);
  const fernGreens = ['#7aa04a', '#5e8a36', '#8fb055', '#6b8f3e'].map((c) => new THREE.Color(c));
  fernSpots.forEach(([x, z], i) => {
    const s = R(0.6, 1.5);
    ps.set(x, surfaceH(x, z) - 0.05, z);
    q.setFromEuler(new THREE.Euler(R(-0.1, 0.1), R(0, 6.28), R(-0.1, 0.1)));
    ferns.setMatrixAt(i, m.compose(ps, q, sc.setScalar(s)));
    ferns.setColorAt(i, col.copy(fernGreens[i % 4]).multiplyScalar(R(0.8, 1.15)));
  });
  ferns.receiveShadow = true;
  scene.add(ferns);

  const tfSpots = scatter(Math.round(1100 * k), 0, 90, 26, 0.85);
  const tfTrunks = new THREE.InstancedMesh(treeFernGeo.trunk, bark, tfSpots.length);
  const tfCrowns = new THREE.InstancedMesh(treeFernGeo.crown, fernM, tfSpots.length);
  tfSpots.forEach(([x, z], i) => {
    const s = R(0.8, 1.4);
    ps.set(x, surfaceH(x, z) - 0.1, z);
    q.setFromEuler(new THREE.Euler(R(-0.08, 0.08), R(0, 6.28), R(-0.08, 0.08)));
    m.compose(ps, q, sc.setScalar(s));
    tfTrunks.setMatrixAt(i, m); tfCrowns.setMatrixAt(i, m);
    tfCrowns.setColorAt(i, col.copy(fernGreens[i % 4]).multiplyScalar(R(0.85, 1.1)));
  });
  for (const im of [tfTrunks, tfCrowns]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }

  // grass tufts round the edges of every clearing and under the trees
  const grassTex = grassTexture();
  const grassM = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.4 });
  grassM.colorNode = texture(grassTex, uv()).rgb.mul(1.5).mul(uv().y.mul(0.55).add(0.6));   // darker at the roots
  grassM.opacityNode = texture(grassTex, uv()).a.mul(1.7).clamp(0, 1);
  const tuftSpots = scatter(Math.round(46000 * k), 0, 75, 12, 0.8);
  const tufts = new THREE.InstancedMesh(tuftGeometry(1.3, 0.8), grassM, tuftSpots.length);
  const grassGreens = ['#9ab85a', '#86a64c', '#a9bf64', '#7f9a46', '#b3b865'].map((c) => new THREE.Color(c));
  tuftSpots.forEach(([x, z], i) => {
    const s = R(0.6, 1.4);
    ps.set(x, surfaceH(x, z) - 0.05, z);
    q.setFromEuler(new THREE.Euler(0, R(0, 6.28), 0));
    tufts.setMatrixAt(i, m.compose(ps, q, sc.set(s, s * R(0.7, 1.3), s)));
    tufts.setColorAt(i, col.copy(grassGreens[i % 5]).multiplyScalar(R(0.85, 1.1)));
  });
  tufts.receiveShadow = true;
  scene.add(tufts);

  // elephant ears
  const earTex = earTexture();
  const earM = new THREE.MeshStandardNodeMaterial({ roughness: 0.6, side: THREE.DoubleSide, alphaTest: 0.5 });
  earM.colorNode = texture(earTex, uv()).rgb.mul(1.5);
  earM.opacityNode = texture(earTex, uv()).a;
  const stemM = new THREE.MeshStandardMaterial({ color: 0x6f8f3a, roughness: 0.8 });
  const ear = earPlantGeometry(7);
  const earSpots = scatter(Math.round(7000 * k), 0, 70, 20, 0.85);
  const earLeaves = new THREE.InstancedMesh(ear.leaves, earM, earSpots.length);
  const earStems = new THREE.InstancedMesh(ear.stems, stemM, earSpots.length);
  earSpots.forEach(([x, z], i) => {
    const s = R(0.7, 1.6);
    ps.set(x, surfaceH(x, z) - 0.05, z);
    q.setFromEuler(new THREE.Euler(0, R(0, 6.28), 0));
    m.compose(ps, q, sc.setScalar(s));
    earLeaves.setMatrixAt(i, m); earStems.setMatrixAt(i, m);
    earLeaves.setColorAt(i, col.set('#ffffff').multiplyScalar(R(0.8, 1.1)));
  });
  earLeaves.castShadow = true;
  for (const im of [earLeaves, earStems]) { im.receiveShadow = true; scene.add(im); }
}
