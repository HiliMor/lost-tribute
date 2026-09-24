// The Barracks: the DHARMA Initiative's village of small houses around a lawn in the north,
// later home of the Others, ringed by the sonic fence (season 3).
import * as THREE from 'three/webgpu';
import { SITES } from '../../core/layout.js';
import { terrainH } from '../../core/terrain-math.js';
import { R, shadowy, canvasTex } from '../../core/utils.js';
import { gableRoof } from './materials.js';

function sidingTexture(hex) {
  return canvasTex(256, 128, (g, W, H) => {
    g.fillStyle = hex; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(60,45,25,.28)'; g.lineWidth = 2;
    for (let y = 6; y < H; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const win = (x) => {
      g.fillStyle = '#f1ead8'; g.fillRect(x - 3, 34, 42, 40);
      g.fillStyle = '#2d3640'; g.fillRect(x, 37, 36, 34);
      g.fillStyle = '#f1ead8'; g.fillRect(x + 16, 37, 3, 34); g.fillRect(x, 52, 36, 3);
    };
    win(26); win(190);
    g.fillStyle = '#6b4a2e'; g.fillRect(112, 44, 32, 84);        // door
    g.fillStyle = '#c9a640'; g.fillRect(137, 86, 4, 4);          // handle
  });
}

export function createBarracks(scene) {
  const site = SITES.barracks;
  const village = new THREE.Group();
  const roofM = new THREE.MeshStandardMaterial({ color: 0x5a3c2a, roughness: 0.85, side: THREE.DoubleSide });
  const trimM = new THREE.MeshStandardMaterial({ color: 0xe9e1cc, roughness: 0.7 });
  const sidings = ['#cdb98a', '#d8c79b', '#bfa979', '#c9b48c', '#d2bf92'].map((h) => new THREE.MeshStandardMaterial({ map: sidingTexture(h), roughness: 0.8 }));

  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2 + R(-0.08, 0.08);
    const x = site.x + Math.cos(a) * 54 * R(0.92, 1.08), z = site.z + Math.sin(a) * 42 * R(0.92, 1.08);
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 7), sidings[i % sidings.length]);
    body.position.y = 2.0; house.add(body);
    const base = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.5, 7.4), trimM);
    base.position.y = 0.25; house.add(base);
    const roof = new THREE.Mesh(gableRoof(10.4, 8.4, 2.3), roofM);
    roof.position.y = 3.6; house.add(roof);
    const porch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 2.2), trimM);
    porch.position.set(0, 0.55, 4.6); house.add(porch);
    for (const px of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 0.15), trimM);
      post.position.set(px, 2.0, 5.5); house.add(post);
    }
    house.position.set(x, terrainH(x, z) + 0.05, z);
    house.rotation.y = Math.atan2(site.x - x, site.z - z);   // front porch faces the lawn
    village.add(house);
  }

  // the sonic fence: a ring of tall grey pylons
  const pylonM = new THREE.MeshStandardMaterial({ color: 0x7c7f82, roughness: 0.5, metalness: 0.6 });
  const capM = new THREE.MeshStandardMaterial({ color: 0x4c4f53, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < 34; i++) {
    const a = i / 34 * Math.PI * 2;
    if (Math.abs(a - Math.PI * 1.5) < 0.12) continue;          // the gap where the path leaves to the south
    const x = site.x + Math.cos(a) * 112, z = site.z + Math.sin(a) * 100;
    const p = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 5.4, 8), pylonM);
    pole.position.y = 2.7; p.add(pole);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), capM);
    cap.position.y = 5.5; p.add(cap);
    for (const hy of [1.5, 2.6, 3.7, 4.8]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), capM);
      ins.position.y = hy; p.add(ins);
    }
    p.position.set(x, terrainH(x, z), z);
    village.add(p);
  }
  scene.add(shadowy(village));
  return village;
}
