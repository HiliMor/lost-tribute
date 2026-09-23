// The Oceanic 815 wreck: fuselage, wing, jet engine, luggage, seats, debris and the survivors' tarps.
import * as THREE from 'three/webgpu';
import { vec3, mix, smoothstep, select, texture, uv, frontFacing, positionLocal } from 'three/tsl';
import { shoreZ } from '../core/terrain-math.js';
import { rnd, R, placeOn, shadowy, canvasTex } from '../core/utils.js';

const FUSE_R = 3.1, FUSE_L = 21;

// Oceanic livery painted on a canvas: windows, doors, stripes, OCEANIC titles, soot at the torn ends.
function paintFuselage() {
  return canvasTex(2048, 1024, (g, W, H) => {
    g.fillStyle = '#e9e9e3'; g.fillRect(0, 0, W, H);
    const band = (u0, u1, c) => { g.fillStyle = c; g.fillRect(u0 * W, 0, (u1 - u0) * W, H); };
    band(0.585, 0.915, '#a7aeb6');
    band(0.972, 0.994, '#1d3160'); band(0.962, 0.968, '#b3202e');
    band(0.506, 0.528, '#1d3160'); band(0.532, 0.538, '#b3202e');
    // panel seams (rings)
    g.strokeStyle = 'rgba(40,40,40,.13)'; g.lineWidth = 2;
    for (let y = 0; y < H; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // windows, both sides
    const doors = [0.18, 0.62];
    for (const cx of [62, 962]) {
      for (let y = 30; y < H - 20; y += 25) {
        if (doors.some((d) => Math.abs(y / H - d) < 0.05)) continue;
        g.fillStyle = '#1b222c'; g.beginPath(); g.roundRect(cx - 18, y, 36, 13, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(cx - 14, y + 2, 10, 3);
      }
      for (const d of doors) {
        g.strokeStyle = 'rgba(30,30,30,.55)'; g.lineWidth = 3;
        g.beginPath(); g.roundRect(cx - 105, d * H - 26, 200, 52, 10); g.stroke();
      }
    }
    // OCEANIC titles
    const title = (x, rot) => {
      g.save(); g.translate(x, H * 0.42); g.rotate(rot); g.scale(0.44, 1);
      g.fillStyle = '#1d3160'; g.font = '600 150px Jost, Futura, "Avenir Next", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OCEANIC', 0, 0);
      g.restore();
    };
    title(210, Math.PI / 2);
    title(815, -Math.PI / 2);
    // scorch, soot and grime toward the torn ends
    for (const yEnd of [0, H]) {
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * W, y = yEnd + (yEnd ? -1 : 1) * Math.random() * 220;
        const r = 40 + Math.random() * 180;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(20,16,12,${0.35 + Math.random() * 0.4})`); gr.addColorStop(1, 'rgba(20,16,12,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    g.globalAlpha = 0.08;
    for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < .5 ? '#3a2f22' : '#ffffff'; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 30, 1 + Math.random() * 3); }
    g.globalAlpha = 1;
  });
}

function buildFuselage(fuseTex) {
  const geo = new THREE.CylinderGeometry(FUSE_R, FUSE_R, FUSE_L, 64, 14, true);
  const p = geo.attributes.position;
  const ph = [R(0, 6), R(0, 6), R(0, 6), R(0, 6)];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.atan2(x, z);
    let r = 1 + 0.025 * Math.sin(th * 5 + y * 0.7) + 0.02 * Math.sin(th * 11 - y);   // dents
    let ny = y;
    if (Math.abs(y) > FUSE_L / 2 - 0.01) {   // jagged torn ends
      const s = Math.sign(y), k = s > 0 ? 0 : 2;
      const jag = 0.45 * Math.abs(Math.sin(th * 3 + ph[k])) + 0.3 * Math.abs(Math.sin(th * 7 + ph[k + 1])) + 0.35 * Math.random();
      ny = y - s * jag;
      r *= 1 + (Math.random() - 0.5) * 0.08;
    }
    p.setXYZ(i, x * r, ny, z * r);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide });
  mat.colorNode = select(frontFacing, texture(fuseTex, uv()).rgb, vec3(0.13, 0.12, 0.11));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.z = Math.PI / 2;
  const grp = new THREE.Group();
  grp.add(mesh);
  // a floor inside the cabin + seat backs glimpsed through the tear
  const floorM = new THREE.Mesh(new THREE.BoxGeometry(FUSE_L - 1.5, 0.12, 4.4), new THREE.MeshStandardMaterial({ color: 0x2f3440, roughness: 0.9 }));
  floorM.position.y = -1.3; grp.add(floorM);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2b4f86, roughness: 0.85 });
  for (let i = 0; i < 16; i++) for (const zz of [-1.5, -0.9, 0.9, 1.5]) {
    if (rnd() < 0.2) continue;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.5), seatMat);
    s.position.set(-FUSE_L / 2 + 1.6 + i * 1.1, -0.8, zz); s.rotation.z = R(-0.15, 0.3);
    grp.add(s);
  }
  return grp;
}

function createWing(scene) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(12, 3.4); s.lineTo(12.4, 5.6); s.lineTo(0, 7.2); s.lineTo(0.6, 3.5); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.38, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 });
  const wingTex = canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#c9cdd1'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
    for (let i = 0; i < W; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); }
    g.fillStyle = 'rgba(30,25,20,.25)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 40, 1 + Math.random() * 2);
  });
  wingTex.wrapS = wingTex.wrapT = THREE.RepeatWrapping; wingTex.repeat.set(0.08, 0.12);
  const wing = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: wingTex, roughness: 0.45, metalness: 0.35 }));
  wing.rotation.set(-Math.PI / 2 + 0.28, 0, 0.1);
  const wingG = new THREE.Group(); wingG.add(wing); wingG.rotation.y = 2.5;
  placeOn(wingG, -13, 7.5, 0.35);
  scene.add(shadowy(wingG));
}

function createEngine(scene) {
  const engine = new THREE.Group();
  const pts = [[1.62, -0.2], [1.78, 0.2], [1.82, 1.2], [1.72, 2.6], [1.35, 3.8], [0.95, 4.4], [0.85, 4.5]].map(([x, y]) => new THREE.Vector2(x, y));
  const nac = new THREE.LatheGeometry(pts, 48);
  const nm = new THREE.MeshStandardNodeMaterial({ roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
  const soot = smoothstep(2.4, 4.4, positionLocal.y).mul(0.75);
  nm.colorNode = select(frontFacing, mix(vec3(0.82, 0.83, 0.84), vec3(0.05, 0.045, 0.04), soot), vec3(0.08, 0.085, 0.09));
  engine.add(new THREE.Mesh(nac, nm));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.1, 10, 48), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.8, roughness: 0.3 }));
  lip.rotation.x = Math.PI / 2; lip.position.y = -0.18; engine.add(lip);
  const fan = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x5a5f66, metalness: 0.75, roughness: 0.35 });
  for (let i = 0; i < 22; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.42), bladeMat);
    const a = i / 22 * Math.PI * 2;
    b.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95); b.rotation.set(0.5, -a, 0);
    fan.add(b);
  }
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 24), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.5, roughness: 0.4 }));
  hub.position.y = -0.2; hub.rotation.x = Math.PI; fan.add(hub);
  fan.position.y = 0.55; engine.add(fan);
  engine.rotation.set(0.12, 0.6, Math.PI / 2 - 0.08);
  placeOn(engine, 21, 6.5, 0.55).position.y += 1.2;
  scene.add(shadowy(engine));
  return fan;
}

// Loose items; returned so a Swan discharge can lift them off the sand.
function createDebrisAndCamp(scene) {
  const metalBits = [];
  const bagCols = [0x7a1e1e, 0x1f3b5a, 0x3b3b3b, 0x6b4a2b, 0xa07a3a, 0x2f5a3f, 0x5a2a55, 0xc9b28a, 0x243b32];
  for (let i = 0; i < 34; i++) {
    const w = R(0.45, 0.8), h = R(0.22, 0.32), d = R(0.3, 0.55);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: bagCols[i % bagCols.length], roughness: R(0.5, 0.9) }));
    const a = R(0, Math.PI * 2), rr = R(6, 24);
    const x = 2 + Math.cos(a) * rr * 1.3, z = 12 + Math.sin(a) * rr * 0.55;
    if (z - shoreZ(x) < 1.5) continue;
    placeOn(m, x, z, h * 0.25).position.y += h / 2;
    m.rotation.set(R(-0.3, 0.3), R(0, 6.28), R(-0.5, 0.5));
    scene.add(shadowy(m)); metalBits.push(m);
  }
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.5, metalness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.6, metalness: 0.5 });
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(R(0.6, 3.2), 0.06, R(0.4, 1.6)), rnd() < 0.7 ? panelMat : darkMat);
    const x = R(-30, 34), z = R(4, 24);
    if (z - shoreZ(x) < 1) continue;
    placeOn(m, x, z, 0.05); m.rotation.set(R(-0.6, 0.6), R(0, 6.28), R(-0.9, 0.9));
    scene.add(shadowy(m)); metalBits.push(m);
  }
  // seat rows
  const fab = new THREE.MeshStandardMaterial({ color: 0x2b4f86, roughness: 0.9 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.6, roughness: 0.4 });
  const seatRow = () => {
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), fab); c.position.set(k * 0.55, 0.45, 0);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.12), fab); b.position.set(k * 0.55, 0.85, -0.24); b.rotation.x = -0.15;
      g.add(c, b);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.06), frame); rail.position.set(0.55, 0.3, 0); g.add(rail);
    for (const lx of [0, 1.1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.4), frame); l.position.set(lx, 0.15, 0); g.add(l); }
    return shadowy(g);
  };
  [[-9, 13, 0.4, 0], [-11, 16, 2.1, 0.3], [12, 16, -0.6, -1.4], [15, 13, 2.8, 0], [-3, 7.5, 1.2, 0.2]].forEach(([x, z, ry, rz]) => {
    const s = seatRow(); placeOn(s, x, z, 0.08); s.rotation.set(0, ry, rz); scene.add(s); metalBits.push(s);
  });
  // tarp shelters of the survivors' camp
  const tarp = (x, z, ry, color, w = 3.2, len = 3.6, hgt = 1.9) => {
    const g = new THREE.Group();
    const shape = new THREE.BufferGeometry();
    const v = new Float32Array([-w / 2, 0, 0, 0, hgt, 0, w / 2, 0, 0, -w / 2, 0, len, 0, hgt, len, w / 2, 0, len]);
    shape.setAttribute('position', new THREE.BufferAttribute(v, 3));
    shape.setIndex([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4]);
    shape.computeVertexNormals();
    g.add(new THREE.Mesh(shape, new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide })));
    const pole = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 1 });
    for (const zz of [0, len]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, hgt + 0.3, 6), pole); p.position.set(0, (hgt + 0.3) / 2, zz); g.add(p); }
    placeOn(g, x, z, 0.05); g.rotation.y = ry; scene.add(shadowy(g));
  };
  tarp(-20, 21, 0.3, 0x2e5fa3); tarp(-13, 23.5, -0.2, 0xc8642a); tarp(-27, 19.5, 0.7, 0xe8e2d0, 3.6, 4.2, 2.2); tarp(9, 22, -0.5, 0x3d6e4f);
  return metalBits;
}

export function createWreck(scene) {
  const fuselage = shadowy(buildFuselage(paintFuselage()));
  placeOn(fuselage, 4, 11, 1.25).position.y += FUSE_R - 0.3;
  fuselage.rotation.set(0.14, -0.42, 0.05);
  scene.add(fuselage);
  createWing(scene);
  const engineFan = createEngine(scene);
  const metalBits = createDebrisAndCamp(scene);
  const basePositions = metalBits.map((o) => o.position.clone());

  return {
    update(dt, elapsed, discharge, windy) {
      engineFan.rotation.y += dt * (0.25 + windy * 0.4);   // the engine fan windmills in the breeze
      // electromagnetic pull on loose metal during a discharge
      metalBits.forEach((o, i) => {
        const b = basePositions[i];
        o.position.set(
          b.x + (Math.random() - 0.5) * 0.06 * discharge,
          b.y + discharge * discharge * (0.4 + (i % 5) * 0.12) + Math.sin(elapsed * 9 + i) * 0.04 * discharge,
          b.z + (Math.random() - 0.5) * 0.06 * discharge);
      });
    },
  };
}
