// Small shared helpers: DOM lookup, device hints, a seeded random generator and prop helpers.
import * as THREE from 'three/webgpu';
import { terrainH } from './terrain-math.js';

export const $ = (id) => document.getElementById(id);

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isPhone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;

// Seeded random numbers, so the island is laid out the same way on every visit.
// Note: the world is built in a fixed order (see main.js) so every prop gets the same numbers.
export const rnd = (() => { let s = 815; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
export const R = (a, b) => a + (b - a) * rnd();

export function placeOn(obj, x, z, sink = 0) { obj.position.set(x, terrainH(x, z) - sink, z); return obj; }

export function shadowy(o) { o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; }

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
