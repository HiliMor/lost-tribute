// The island map: a hand-coloured chart of the Island with numbered places, trails and a
// "you are here" marker. Click a pin (or a name in the list) to fly there.
import { $ } from '../core/utils.js';
import { terrainH, landDist } from '../core/terrain-math.js';
import META from '../data/island-meta.js';
import { SITES, toWorld, toMap } from '../core/layout.js';
import { PLACES, OVERVIEW } from './places.js';

export const SEASON_COLOURS = { 1: '#8b2b1f', 2: '#2f5d7c', 3: '#4a6b2a', 4: '#7a4f8a', 5: '#2f7a78', 6: '#a9761d' };

// The part of Choekaas's map shown, in map pixels (north is up, as on his map).
const BOUNDS = { x0: 30, x1: 1200, y0: 20, y1: 1000 };
const META_M = META.map.metresPerPx;
const CSS_W = 880, CSS_H = 737;

// Trails the survivors walked (and the DHARMA road), drawn as dashed ink lines between places.
const TRAILS = [['crash', 'caves'], ['caves', 'golf'], ['crash', 'hatch'], ['hatch', 'blackRock'], ['crash', 'cockpit'],
  ['hatch', 'pearl'], ['barracks', 'subDock'], ['barracks', 'flame'], ['tail', 'arrow'], ['crash', 'radio']];

// seeded random numbers, so the drawing is the same every time
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function drawMap(canvas) {
  const dpr = Math.min(2.5, Math.max(1.5, devicePixelRatio || 1));
  canvas.width = Math.round(CSS_W * dpr); canvas.height = Math.round(CSS_H * dpr);
  const W = canvas.width, H = canvas.height, g = canvas.getContext('2d');
  const { x0, x1, y0, y1 } = BOUNDS;
  const toX = (mx) => (mx - x0) / (x1 - x0) * W, toY = (my) => (my - y0) / (y1 - y0) * H;
  const mPerPx = (x1 - x0) * META_M / W;                       // metres per canvas pixel

  // sample the coastline distance and the height on a coarse grid; pixels interpolate between samples
  const step = 3, gw = Math.ceil(W / step) + 2, gh = Math.ceil(H / step) + 2;
  const sd = new Float32Array(gw * gh), hs = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const p = toWorld(x0 + (i * step) / W * (x1 - x0), y0 + (j * step) / H * (y1 - y0));
    sd[j * gw + i] = landDist(p.x, p.z); hs[j * gw + i] = terrainH(p.x, p.z);
  }
  const bil = (arr, fx, fy) => {
    const i = Math.min(gw - 2, fx | 0), j = Math.min(gh - 2, fy | 0), u = fx - i, v = fy - j, k = j * gw + i;
    return mix(mix(arr[k], arr[k + 1], u), mix(arr[k + gw], arr[k + gw + 1], u), v);
  };
  const rnd = seeded(4815);
  const img = g.createImageData(W, H), px = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x / step, fy = y / step, d = bil(sd, fx, fy), h = bil(hs, fx, fy);
    const grain = (rnd() - 0.5) * 7;
    // sea: pale blue-green shallows fading to parchment, with wave lines echoing the coast
    let r = 214, gg = 206, b = 178;
    const shallow = sstep(-70, 0, d);
    r = mix(r, 168, shallow * 0.7); gg = mix(gg, 196, shallow * 0.7); b = mix(b, 186, shallow * 0.7);
    for (const k of [-9, -22, -40]) { const w = Math.abs(d - k) / mPerPx; if (w < 1.1 && d < 0) { const a = (1 - w / 1.1) * 0.35 * (1 + k / 60); r = mix(r, 70, a); gg = mix(gg, 96, a); b = mix(b, 98, a); } }
    // land: sand, then jungle greens darkening uphill, bare rock on the peaks, lit from the north-west
    const hx = bil(hs, fx + 1, fy + 1) - bil(hs, fx - 1, fy - 1);
    const shade = Math.max(-1, Math.min(1, -hx / (5.5 * mPerPx)));
    const t = Math.min(1, Math.max(0, h) / 240);
    let lr = mix(158, 104, t), lg = mix(170, 122, t), lb = mix(110, 76, t);
    const peak = sstep(170, 280, h); lr = mix(lr, 150, peak); lg = mix(lg, 136, peak); lb = mix(lb, 104, peak);
    const sand = 1 - sstep(4, 16, d); lr = mix(lr, 232, sand); lg = mix(lg, 214, sand); lb = mix(lb, 164, sand);
    lr += shade * 30; lg += shade * 28; lb += shade * 18;
    if (Math.floor(h / 40) !== Math.floor(bil(hs, fx + 1 / step, fy) / 40) || Math.floor(h / 40) !== Math.floor(bil(hs, fx, fy + 1 / step) / 40)) { lr *= 0.84; lg *= 0.84; lb *= 0.84; }   // contours every 40 m
    // anti-aliased coastline in ink
    const cover = Math.min(1, Math.max(0, 0.5 + d / mPerPx));
    r = mix(r, lr, cover); gg = mix(gg, lg, cover); b = mix(b, lb, cover);
    const ink = Math.max(0, 1 - Math.abs(d) / (mPerPx * 1.3));
    r = mix(r, 62, ink); gg = mix(gg, 48, ink); b = mix(b, 34, ink);
    // aged paper: darker towards the edges
    const vx = x / W - 0.5, vy = y / H - 0.5, vig = 1 - 0.14 * sstep(0.25, 0.55, Math.hypot(vx * 1.1, vy));
    const k = (y * W + x) * 4;
    px[k] = (r + grain) * vig; px[k + 1] = (gg + grain) * vig; px[k + 2] = (b + grain * 0.8) * vig; px[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const at = (mx, my) => { const p = toWorld(mx, my); return { d: landDist(p.x, p.z), h: terrainH(p.x, p.z) }; };

  // little inked trees over the jungle
  g.save();
  for (let i = 0; i < 1400; i++) {
    const mx = mix(x0, x1, rnd()), my = mix(y0, y1, rnd()), s = at(mx, my);
    if (s.d < 26 || s.h > 200) continue;
    const x = toX(mx), y = toY(my), r = (1.6 + rnd() * 1.4) * dpr;
    g.fillStyle = 'rgba(58,82,36,.55)'; g.beginPath(); g.arc(x, y - r * 0.4, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(40,30,20,.5)'; g.fillRect(x - 0.4 * dpr, y + r * 0.3, 0.8 * dpr, r * 0.8);
  }
  g.restore();

  // trails
  g.save(); g.setLineDash([5 * dpr, 4 * dpr]); g.lineWidth = 1.4 * dpr; g.strokeStyle = 'rgba(92,60,30,.75)'; g.lineCap = 'round';
  const rt = seeded(23);
  for (const [a, b] of TRAILS) {
    const A = toMap(SITES[a].x, SITES[a].z), B = toMap(SITES[b].x, SITES[b].z);
    const ax = toX(A.x), ay = toY(A.y), bx = toX(B.x), by = toY(B.y), len = Math.hypot(bx - ax, by - ay);
    const bend = (rt() - 0.5) * 0.35 * len, cx = (ax + bx) / 2 - (by - ay) / len * bend, cy = (ay + by) / 2 + (bx - ax) / len * bend;
    g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(cx, cy, bx, by); g.stroke();
  }
  g.restore();

  // lettering
  const serif = (px, w = 600) => `italic ${w} ${Math.round(px * dpr)}px "Cormorant Garamond", serif`;
  g.fillStyle = '#4a3a28'; g.textAlign = 'left';
  g.font = serif(W / dpr * 0.05); g.fillText('The Island', W * 0.04, H * 0.09);
  g.font = serif(14, 500); g.fillStyle = 'rgba(74,58,40,.85)';
  g.fillText('South Pacific Ocean', W * 0.04, H * 0.13);
  const hy = toMap(SITES.hydra.x, SITES.hydra.z);
  g.textAlign = 'center'; g.font = serif(15); g.fillText('Hydra Island', toX(hy.x) - 6 * dpr, toY(hy.y) - 42 * dpr);
  g.save(); g.translate(W * 0.1, H * 0.62); g.rotate(-Math.PI / 2); g.font = serif(13, 500); g.fillStyle = 'rgba(74,58,40,.55)'; g.letterSpacing = `${4 * dpr}px`; g.fillText('P A C I F I C', 0, 0); g.restore();

  // compass rose
  const cx = W * 0.9, cy = H * 0.13, R = W * 0.04;
  g.save(); g.translate(cx, cy); g.strokeStyle = '#4a3a28'; g.fillStyle = '#4a3a28'; g.lineWidth = 1.2 * dpr;
  g.beginPath(); g.arc(0, 0, R * 0.62, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) {
    const long = i % 2 === 0, r = long ? R : R * 0.6, w = long ? R * 0.16 : R * 0.1;
    g.save(); g.rotate(i * Math.PI / 4);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(w, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, -r); g.lineTo(-w, 0); g.lineTo(0, 0); g.closePath(); g.stroke();
    g.restore();
  }
  g.font = `600 ${Math.round(12 * dpr)}px Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('N', 0, -R - 3 * dpr);
  g.restore(); g.textBaseline = 'alphabetic';

  // scale bar
  const km = 1000 / mPerPx, sx = W * 0.04, sy = H * 0.955;
  g.fillStyle = '#4a3a28'; g.fillRect(sx, sy, km / 2, 3 * dpr); g.strokeStyle = '#4a3a28'; g.lineWidth = dpr; g.strokeRect(sx + km / 2, sy, km / 2, 3 * dpr);
  g.font = `500 ${Math.round(11 * dpr)}px Jost, sans-serif`; g.textAlign = 'left';
  g.fillText('0', sx - 2 * dpr, sy - 4 * dpr); g.textAlign = 'center'; g.fillText('500', sx + km / 2, sy - 4 * dpr); g.fillText('1 km', sx + km, sy - 4 * dpr);

  // season legend
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(11 * dpr)}px Jost, sans-serif`;
  let lx = W * 0.62; const ly = H * 0.962;
  for (const [n, c] of Object.entries(SEASON_COLOURS)) {
    g.fillStyle = c; g.beginPath(); g.arc(lx, ly, 5 * dpr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a3a28'; g.fillText(`S${n}`, lx + 8 * dpr, ly + dpr); lx += 42 * dpr;
  }
  g.textBaseline = 'alphabetic';

  // numbered pins, coloured by season, nudged apart where they would overlap (with a leader line)
  const rr = 10.5 * dpr;
  const pins = PLACES.map((p, n) => {
    const s = p.site ? SITES[p.site] : SITES.crash, m = toMap(s.x, s.z);
    return { x: toX(m.x), y: toY(m.y), ox: toX(m.x), oy: toY(m.y), r: rr * 1.7, place: p, n };
  });
  for (let it = 0; it < 60; it++) for (const a of pins) for (const b of pins) {
    if (a === b) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = rr * 2.25;
    if (d < min) { const push = (min - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const p of pins) {
    if (Math.hypot(p.x - p.ox, p.y - p.oy) > 2) {
      g.strokeStyle = 'rgba(61,47,32,.8)'; g.lineWidth = 1.2 * dpr; g.beginPath(); g.moveTo(p.ox, p.oy); g.lineTo(p.x, p.y); g.stroke();
      g.fillStyle = '#3d2f20'; g.beginPath(); g.arc(p.ox, p.oy, 2.2 * dpr, 0, Math.PI * 2); g.fill();
    }
  }
  for (const p of pins) {
    g.fillStyle = 'rgba(40,30,20,.35)'; g.beginPath(); g.arc(p.x + dpr, p.y + 1.5 * dpr, rr + 1.5 * dpr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(p.x, p.y, rr + 1.5 * dpr, 0, Math.PI * 2); g.fill();
    g.fillStyle = SEASON_COLOURS[p.place.season]; g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4ecd8'; g.font = `600 ${Math.round(rr * 1.05)}px Jost, sans-serif`;
    g.fillText(String(p.n + 1), p.x, p.y + dpr);
  }
  g.textBaseline = 'alphabetic';
  return { pins, dpr, toX, toY, base: g.getImageData(0, 0, W, H) };
}

// "You are here": where the camera stands, with a cone for the way it looks.
function drawHere(canvas, drawn, where) {
  if (!where) return;
  const { pos, target } = where(), g = canvas.getContext('2d'), dpr = drawn.dpr;
  const m = toMap(pos.x, pos.z), t = toMap(target.x, target.z);
  const x = drawn.toX(m.x), y = drawn.toY(m.y), a = Math.atan2(drawn.toY(t.y) - y, drawn.toX(t.x) - x);
  if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) return;
  const cone = g.createRadialGradient(x, y, 0, x, y, 46 * dpr);
  cone.addColorStop(0, 'rgba(200,40,30,.45)'); cone.addColorStop(1, 'rgba(200,40,30,0)');
  g.fillStyle = cone; g.beginPath(); g.moveTo(x, y); g.arc(x, y, 46 * dpr, a - 0.45, a + 0.45); g.closePath(); g.fill();
  g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(x, y, 6 * dpr, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c8281e'; g.beginPath(); g.arc(x, y, 4.2 * dpr, 0, Math.PI * 2); g.fill();
  g.font = `italic 600 ${Math.round(13 * dpr)}px "Cormorant Garamond", serif`; g.fillStyle = '#7a1c14'; g.textAlign = 'left';
  g.fillText('you are here', x + 9 * dpr, y - 8 * dpr);
}

// Highlight one pin with its name in a label.
function highlight(canvas, drawn, pin, where) {
  const g = canvas.getContext('2d'), dpr = drawn.dpr;
  g.putImageData(drawn.base, 0, 0);
  drawHere(canvas, drawn, where);
  if (!pin) return;
  const W = canvas.width, label = pin.place.name.replace(', south shore', '');
  g.font = `italic 600 ${Math.round(20 * dpr)}px "Cormorant Garamond", serif`;
  const tw = g.measureText(label).width, pad = 8 * dpr, h = 30 * dpr;
  let lx = pin.x + pin.r * 0.7 + 4 * dpr;
  const ly = pin.y - h / 2;
  if (lx + tw + pad * 2 > W) lx = pin.x - pin.r * 0.7 - 4 * dpr - tw - pad * 2;
  g.fillStyle = 'rgba(61,47,32,.92)'; g.beginPath(); g.roundRect(lx, ly, tw + pad * 2, h, 6 * dpr); g.fill();
  g.fillStyle = '#f4ecd8'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, lx + pad, pin.y + dpr);
  g.strokeStyle = '#3d2f20'; g.lineWidth = 2.5 * dpr; g.beginPath(); g.arc(pin.x, pin.y, pin.r * 0.72, 0, Math.PI * 2); g.stroke();
  g.textBaseline = 'alphabetic';
}

export function setupIslandMap({ onPick, where }) {
  const overlay = $('islandMap'), canvas = $('mapCanvas'), list = $('mapList');
  let drawn = null;

  // the list, grouped by season
  let season = null;
  PLACES.forEach((p, n) => {
    if (p.season !== season) {
      season = p.season;
      const h = document.createElement('li'); h.className = 'season'; h.textContent = `Season ${season}`;
      h.style.setProperty('--season', SEASON_COLOURS[season]);
      list.appendChild(h);
    }
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="n" style="background:${SEASON_COLOURS[p.season]}">${n + 1}</span><span><b>${p.name}</b><small>${p.ref}</small></span>`;
    b.addEventListener('click', () => { close(); onPick(p); });
    b.addEventListener('mouseenter', () => drawn && highlight(canvas, drawn, drawn.pins[n], where));
    b.addEventListener('mouseleave', () => drawn && highlight(canvas, drawn, null, where));
    li.appendChild(b); list.appendChild(li);
  });
  const overview = document.createElement('li');
  overview.innerHTML = '<button type="button"><span class="n">↗</span><span><b>Fly over the whole island</b><small>Aerial view</small></span></button>';
  overview.querySelector('button').addEventListener('click', () => { close(); onPick(OVERVIEW); });
  list.appendChild(overview);

  function open() {
    overlay.hidden = false;
    if (!drawn) drawn = drawMap(canvas);   // drawn the first time the map opens
    highlight(canvas, drawn, null, where);
    $('mapBtn').setAttribute('aria-expanded', 'true');
    $('mapClose').focus();
  }
  function close() {
    overlay.hidden = true;
    $('mapBtn').setAttribute('aria-expanded', 'false');
  }
  $('mapBtn').addEventListener('click', () => (overlay.hidden ? open() : close()));
  $('mapClose').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
    if ((e.key === 'm' || e.key === 'M') && document.activeElement?.tagName !== 'INPUT') overlay.hidden ? open() : close();
  });
  const pinAt = (e) => {
    if (!drawn) return null;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * canvas.width, y = (e.clientY - r.top) / r.height * canvas.height;
    let best = null, bd = Infinity;
    for (const p of drawn.pins) { const d = Math.hypot(p.x - x, p.y - y); if (d < p.r * 0.8 && d < bd) { best = p; bd = d; } }
    return best;
  };
  let hovered = null;
  canvas.addEventListener('mousemove', (e) => {
    const p = pinAt(e);
    if (p !== hovered) { hovered = p; highlight(canvas, drawn, p, where); canvas.style.cursor = p ? 'pointer' : 'default'; }
  });
  canvas.addEventListener('mouseleave', () => { hovered = null; drawn && highlight(canvas, drawn, null, where); });
  canvas.addEventListener('click', (e) => {
    const hit = pinAt(e);
    if (hit) { close(); onPick(hit.place); }
  });
}
