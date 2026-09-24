// The island map: a hand-drawn-style chart of the Island with numbered places.
// Click a pin (or a name in the list) to fly there.
import { $ } from '../core/utils.js';
import { terrainH } from '../core/terrain-math.js';
import { SITES } from '../core/layout.js';
import { PLACES, OVERVIEW } from './places.js';

// where each label sits relative to its pin: [x, y] in pin radii, and text alignment
const LABELS = {
  crash: [1.5, 0.9, 'left'], hatch: [1.5, -0.1, 'left'], beechcraft: [1.5, -0.9, 'left'],
  lighthouse: [-1.5, 0, 'right'], hydra: [0, 2.2, 'center'],
};

// the part of the world the map shows (metres)
const BOUNDS = { x0: -1080, x1: 1480, z0: -230, z1: 1760 };

function drawMap(canvas) {
  const W = canvas.width, H = canvas.height, g = canvas.getContext('2d');
  const { x0, x1, z0, z1 } = BOUNDS;
  const toX = (x) => (x - x0) / (x1 - x0) * W, toY = (z) => (1 - (z - z0) / (z1 - z0)) * H;

  // sample heights on a coarse grid, then paint pixels
  const gw = Math.round(W / 2), gh = Math.round(H / 2);
  const hs = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = x0 + (i + 0.5) / gw * (x1 - x0), z = z1 - (j + 0.5) / gh * (z1 - z0);
    hs[j * gw + i] = terrainH(x, z);
  }
  const at = (i, j) => hs[Math.min(gh - 1, Math.max(0, j)) * gw + Math.min(gw - 1, Math.max(0, i))];
  const img = g.createImageData(W, H), px = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x >> 1, j = y >> 1, h = at(i, j), k = (y * W + x) * 4;
    let r, gg, b;
    if (h < 0) {
      // sea: parchment with faint hatching, a little darker near the shore
      const hatch = (x + y * 3) % 9 === 0 ? 0.92 : 1;
      const shallow = Math.max(0, 1 + h / 6);
      r = (228 - 14 * shallow) * hatch; gg = (216 - 10 * shallow) * hatch; b = (186 - 4 * shallow) * hatch;
    } else {
      // land: tinted by height, with hill shading from the north-west
      const shade = Math.max(-1, Math.min(1, ((at(i - 1, j - 1) - at(i + 1, j + 1)) / 14)));
      const t = Math.min(1, h / 260);
      r = 206 - 70 * t + 26 * shade; gg = 190 - 64 * t + 22 * shade; b = 150 - 62 * t + 16 * shade;
      if (Math.floor(h / 40) !== Math.floor(at(i + 1, j) / 40) || Math.floor(h / 40) !== Math.floor(at(i, j + 1) / 40)) { r *= 0.86; gg *= 0.86; b *= 0.86; }   // contours
    }
    // coastline in ink
    if ((h < 0) !== (at(i + 1, j) < 0) || (h < 0) !== (at(i, j + 1) < 0)) { r = 74; gg = 58; b = 40; }
    px[k] = r; px[k + 1] = gg; px[k + 2] = b; px[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);

  // title and compass
  g.fillStyle = '#4a3a28';
  g.font = `italic 600 ${Math.round(W * 0.045)}px "Cormorant Garamond", serif`;
  g.fillText('The Island', W * 0.04, H * 0.09);
  const cx = W * 0.9, cy = H * 0.12, r = W * 0.035;
  g.strokeStyle = '#4a3a28'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.3, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * 0.3, cy); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.3, cy); g.lineTo(cx - r * 0.3, cy); g.closePath(); g.fill();
  g.font = `600 ${Math.round(W * 0.022)}px Jost, sans-serif`; g.textAlign = 'center';
  g.fillText('N', cx, cy - r - 6);

  // numbered pins
  const pins = [];
  g.textAlign = 'left';
  PLACES.forEach((p, n) => {
    const s = p.site ? SITES[p.site] : SITES.crash;
    const x = toX(s.x), y = toY(s.z), rr = W * 0.017;
    g.fillStyle = '#8b2b1f'; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4ecd8'; g.font = `600 ${Math.round(rr * 1.15)}px Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n + 1), x, y + 1);
    g.fillStyle = '#3d2f20'; g.font = `italic 600 ${Math.round(W * 0.021)}px "Cormorant Garamond", serif`; g.textAlign = 'left';
    const label = p.name.replace(', south shore', '');
    // label placement: right of the pin unless the place says otherwise
    const [lx, ly, align] = LABELS[p.id] || [1.5, 0, 'left'];
    g.textAlign = align;
    g.fillText(label, x + lx * rr, y + ly * rr);
    pins.push({ x, y, r: rr * 1.6, place: p });
  });
  g.textBaseline = 'alphabetic';
  return pins;
}

export function setupIslandMap({ onPick }) {
  const overlay = $('islandMap'), canvas = $('mapCanvas'), list = $('mapList');
  let pins = null;

  PLACES.forEach((p, n) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="n">${n + 1}</span><span><b>${p.name}</b><small>${p.ref}</small></span>`;
    b.addEventListener('click', () => { close(); onPick(p); });
    li.appendChild(b); list.appendChild(li);
  });
  const overview = document.createElement('li');
  overview.innerHTML = '<button type="button"><span class="n">↗</span><span><b>Fly over the whole island</b><small>Aerial view</small></span></button>';
  overview.querySelector('button').addEventListener('click', () => { close(); onPick(OVERVIEW); });
  list.appendChild(overview);

  function open() {
    overlay.hidden = false;
    if (!pins) pins = drawMap(canvas);   // drawn the first time the map opens
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
  canvas.addEventListener('click', (e) => {
    if (!pins) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * canvas.width, y = (e.clientY - r.top) / r.height * canvas.height;
    const hit = pins.find((p) => Math.hypot(p.x - x, p.y - y) < p.r * 1.4);
    if (hit) { close(); onPick(hit.place); }
  });
}
