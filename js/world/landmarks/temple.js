// The Temple: a stepped stone temple inside a high outer wall, with a pond before its entrance
// (seasons 5 and 6). Carved bands of hieroglyphs run round each tier; braziers burn by the stairs;
// the Others camp in the courtyard, as in season 6.
import * as THREE from 'three/webgpu';
import { vec3, sin, mix, uv, smoothstep } from 'three/tsl';
import { SITES } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { uT } from '../../core/uniforms.js';
import { stoneMaterial, gableRoof, strut } from './materials.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// A frieze of carved glyphs, repeated round each tier.
function friezeTexture() {
  const t = canvasTex(512, 64, (g, W, H) => {
    g.fillStyle = '#6f6958'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#3b372d'; g.lineWidth = 3; g.fillStyle = '#3b372d';
    for (let i = 0; i < 16; i++) {
      const x = 16 + i * 32, k = i % 5;
      g.save(); g.translate(x, H / 2);
      if (k === 0) { g.beginPath(); g.arc(0, -4, 7, 0, Math.PI * 2); g.stroke(); g.fillRect(-1.5, 3, 3, 14); g.fillRect(-7, 8, 14, 3); }   // ankh
      if (k === 1) { g.beginPath(); g.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill(); }   // eye
      if (k === 2) { g.beginPath(); g.moveTo(-10, 12); g.lineTo(0, -14); g.lineTo(10, 12); g.stroke(); }
      if (k === 3) { g.beginPath(); for (let a = 0; a < 3; a++) { g.moveTo(-10, -8 + a * 8); g.quadraticCurveTo(0, -14 + a * 8, 10, -8 + a * 8); } g.stroke(); }   // water
      if (k === 4) { g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke(); }
      g.restore();
    }
    g.fillRect(0, 2, W, 3); g.fillRect(0, H - 5, W, 3);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// A brazier: a stone bowl on a pedestal with a flickering flame.
function brazier(stone) {
  const b = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 8), stone); post.position.y = 0.8; b.add(post);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.4, 0.5, 12), stone); bowl.position.y = 1.85; b.add(bowl);
  const flameM = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const y = uv().y;
  flameM.colorNode = mix(vec3(1.0, 0.75, 0.3), vec3(1.0, 0.25, 0.05), y).mul(smoothstep(1.0, 0.2, y)).mul(sin(uT.mul(11.0)).mul(0.15).add(1.2));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 10, 1, true), flameM); flame.position.y = 2.7; b.add(flame);
  return b;
}

export function createTemple(scene) {
  const site = SITES.temple;
  const g = new THREE.Group();
  const stone = stoneMaterial('#7b7564', { moss: 0.55, scale: 0.25, blocks: 0.9 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x080705 });
  const frieze = friezeTexture();

  // stepped tiers, each with an overhanging ledge and a carved band
  const tiers = [[46, 6, 36], [36, 5, 28], [27, 5, 20], [18, 4.5, 13], [10, 4, 7]];
  let y = 0;
  for (const [w, h, d] of tiers) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone);
    t.position.y = y + h / 2; g.add(t);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.7, d + 2), stone);
    ledge.position.y = y + h; g.add(ledge);
    const tex = frieze.clone(); tex.needsUpdate = true; tex.repeat.set(Math.round((w + d) / 8), 1);
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 1, d + 0.1), [
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
      stone, stone,
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
    ]);
    band.position.y = y + h - 1.2; g.add(band);
    y += h;
  }
  // shrine on top, with columns
  const shrine = new THREE.Mesh(new THREE.ConeGeometry(4.2, 6, 4), stone);
  shrine.rotation.y = Math.PI / 4; shrine.position.y = y + 4.2; g.add(shrine);
  for (const [x, z] of [[-2.6, -2.6], [2.6, -2.6], [2.6, 2.6], [-2.6, 2.6]]) g.add(strut(V(x, y, z), V(x, y + 1.3, z), 0.35, stone, 8));

  // front stairs up the south face, the dark doorways beside them, and braziers
  for (let i = 0; i < 12; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 2), stone);
    step.position.set(0, 0.55 + i * 1.1, -18 - 10 + i * 1.1 + 1);
    g.add(step);
  }
  for (const x of [-12, 12]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.4), dark);
    door.position.set(x, 2.5, -18.05); g.add(door);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.8, 1), stone); lintel.position.set(x, 5.3, -18.3); g.add(lintel);
  }
  for (const [x, z] of [[-5.5, -28], [5.5, -28], [-5.5, -20], [5.5, -20], [-6, -64], [6, -64]]) { const b = brazier(stone); b.position.set(x, 0, z); g.add(b); }

  // the pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshStandardMaterial({ color: 0x1f2e1d, roughness: 0.06, metalness: 0.2 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(0, 0.25, -46);
  g.add(pond);
  const lily = new THREE.MeshStandardMaterial({ color: 0x3f6a2a, roughness: 0.8 });
  for (let i = 0; i < 26; i++) { const l = new THREE.Mesh(new THREE.CircleGeometry(R(0.4, 0.8), 10), lily); l.rotation.x = -Math.PI / 2; const a = R(0, 6.28), r = R(4, 14); l.position.set(Math.cos(a) * r, 0.3, -46 + Math.sin(a) * r); g.add(l); }

  // the Others' camp in the courtyard: tents, cooking fires and drying lines
  const canvasColours = [0xb9ae8e, 0x8e8a6a, 0x9c7a5a, 0x6f7a5a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide }));
  const pole = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, x = side * R(28, 58), z = R(-58, 56);
    const tent = new THREE.Mesh(gableRoof(3.2, 4, 2.2), canvasColours[i % 4]);
    tent.position.set(x, 0, z); tent.rotation.y = R(-0.4, 0.4) + (side > 0 ? Math.PI / 2 : -Math.PI / 2); g.add(tent);
  }
  const ash = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1 });
  for (const [x, z] of [[-40, -30], [42, 10], [-36, 36]]) {
    const pit = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14), ash); pit.rotation.x = -Math.PI / 2; pit.position.set(x, 0.1, z); g.add(pit);
    const b = brazier(stone); b.scale.setScalar(0.5); b.position.set(x, -0.5, z); g.add(b);
    for (let k = 0; k < 3; k++) g.add(strut(V(x + Math.cos(k * 2.1) * 1.3, 0, z + Math.sin(k * 2.1) * 1.3), V(x, 1.8, z), 0.05, pole, 4));
  }

  // the outer wall, with a gate facing the pond
  const half = 66, wallH = 8, gate = 12;
  const wall = (x, z, len, alongX) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 2.4, wallH, alongX ? 2.4 : len), stone);
    m.position.set(x, wallH / 2 - 0.5, z); g.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len + 0.6 : 3, 0.5, alongX ? 3 : len + 0.6), stone);
    cap.position.set(x, wallH - 0.3, z); g.add(cap);
  };
  wall(0, half, half * 2, true);
  wall(-half, 0, half * 2, false);
  wall(half, 0, half * 2, false);
  wall(-(half + gate / 2) / 2, -half, half - gate / 2, true);
  wall((half + gate / 2) / 2, -half, half - gate / 2, true);
  // gate towers
  for (const x of [-gate / 2 - 1.5, gate / 2 + 1.5]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(4, 11, 4), stone); tw.position.set(x, 5, -half); g.add(tw); }

  // overgrowth: vines down every tier, bushes and trees rooted in the ledges, red ginger round the pond
  const vineM = new THREE.MeshStandardMaterial({ color: 0x2f4a1c, roughness: 0.9 });
  const bushM = new THREE.MeshStandardMaterial({ color: 0x3f6a26, roughness: 0.9, flatShading: true });
  let ty = 0;
  for (const [w, h, d] of tiers) {
    ty += h;
    for (let i = 0; i < Math.round(w * 0.9); i++) {
      const side = i % 4, u = R(-0.48, 0.48), len = R(1, h * 1.3);
      const x = side < 2 ? u * w : (side === 2 ? -1 : 1) * (w / 2 + 1), z = side < 2 ? (side === 0 ? -1 : 1) * (d / 2 + 1) : u * d;
      if (side === 0 && Math.abs(x) < 5) continue;                       // keep the stairs clear
      g.add(strut(V(x, ty, z), V(x + R(-0.3, 0.3), ty - len, z), 0.05, vineM, 4));
    }
    for (let i = 0; i < Math.round(w / 5); i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(R(0.8, 1.6), 0), bushM);
      const edge = R(0, 1) < 0.5;
      b.position.set(edge ? R(-w / 2, w / 2) : (R(0, 1) < 0.5 ? -1 : 1) * R(w * 0.3, w / 2), ty + 0.6, edge ? (R(0, 1) < 0.5 ? -1 : 1) * R(d * 0.3, d / 2) : R(-d / 2, d / 2));
      if (Math.abs(b.position.x) < 5 && b.position.z < 0) continue;
      b.scale.y = 0.7; g.add(b);
    }
  }
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x4d4234, roughness: 1 });
  const crownM = new THREE.MeshStandardMaterial({ color: 0x3a6424, roughness: 0.9, flatShading: true });
  for (const [x, y, z, h] of [[-19, 6, 10, 9], [17, 11, 8, 8], [-12, 16, 6, 7], [21, 6, -12, 10], [-20, 6, -13, 8]]) {
    g.add(strut(V(x, y, z), V(x + R(-0.8, 0.8), y + h, z + R(-0.8, 0.8)), 0.3, trunkM, 7));
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(R(2, 3.2), 1), crownM); c.position.set(x + R(-2, 2), y + h + R(-0.5, 1.5), z + R(-2, 2)); c.scale.y = 0.65; g.add(c); }
  }
  const ginger = new THREE.MeshStandardMaterial({ color: 0xc8202c, roughness: 0.6 });
  const gingerLeaf = new THREE.MeshStandardMaterial({ color: 0x3f7a2c, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 40; i++) {
    const a = R(0, Math.PI * 2), r = R(16.5, 20);
    const x = Math.cos(a) * r, z = -46 + Math.sin(a) * r;
    if (z > -30 && Math.abs(x) < 6) continue;                          // the path to the stairs
    const st = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), ginger); st.position.set(x, R(1.1, 1.6), z); g.add(st);
    for (let k = 0; k < 3; k++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.4), gingerLeaf); lf.position.set(x + R(-0.3, 0.3), 0.7, z + R(-0.3, 0.3)); lf.rotation.set(R(-0.4, 0.4), R(0, 6), R(-0.3, 0.3)); g.add(lf); }
  }
  g.position.set(site.x, terrainH(site.x, site.z) - 0.3, site.z);
  scene.add(shadowy(g));
  g.traverse((o) => { if (o.material?.blending === THREE.AdditiveBlending) o.castShadow = false; });
  return g;
}
