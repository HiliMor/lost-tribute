// The island map: a hand-drawn-style chart of the Island with numbered places.
// Click a pin (or a name in the list) to fly there.
import { $ } from '../core/utils.js';
import { terrainH } from '../core/terrain-math.js';
import { SITES, toWorld, toMap } from '../core/layout.js';
import { PLACES, OVERVIEW } from './places.js';

export const SEASON_COLOURS = { 1: '#8b2b1f', 2: '#2f5d7c', 3: '#4a6b2a', 4: '#7a4f8a', 5: '#2f7a78', 6: '#a9761d' };

// The part of Choekaas's map shown, in map pixels (north is up, as on his map).
const BOUNDS = { x0: 30, x1: 1200, y0: 20, y1: 1000 };

function drawMap(canvas) {
  const W = canvas.width, H = canvas.height, g = canvas.getContext('2d');
  const { x0, x1, y0, y1 } = BOUNDS;
  // canvas pixel <-> map pixel <-> world
  const toX = (mx) => (mx - x0) / (x1 - x0) * W, toY = (my) => (my - y0) / (y1 - y0) * H;

  // sample heights on a coarse grid, then paint pixels
  const gw = Math.round(W / 2), gh = Math.round(H / 2);
  const hs = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const p = toWorld(x0 + (i + 0.5) / gw * (x1 - x0), y0 + (j + 0.5) / gh * (y1 - y0));
    hs[j * gw + i] = terrainH(p.x, p.z);
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

  // numbered pins, coloured by season (names show on hover and in the list)
  const pins = [];
  const rr = W * 0.0125;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  PLACES.forEach((p, n) => {
    const s = p.site ? SITES[p.site] : SITES.crash, m = toMap(s.x, s.z);
    const x = toX(m.x), y = toY(m.y);
    g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(x, y, rr + 1.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = SEASON_COLOURS[p.season]; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4ecd8'; g.font = `600 ${Math.round(rr * 1.1)}px Jost, sans-serif`;
    g.fillText(String(n + 1), x, y + 1);
    pins.push({ x, y, r: rr * 1.8, place: p, n });
  });
  g.textBaseline = 'alphabetic';
  return { pins, base: g.getImageData(0, 0, W, H) };
}

// Highlight one pin with its name in a label.
function highlight(canvas, drawn, pin) {
  const g = canvas.getContext('2d');
  g.putImageData(drawn.base, 0, 0);
  if (!pin) return;
  const W = canvas.width, label = pin.place.name.replace(', south shore', '');
  g.font = `italic 600 ${Math.round(W * 0.024)}px "Cormorant Garamond", serif`;
  const tw = g.measureText(label).width, pad = 8, h = W * 0.036;
  let lx = pin.x + pin.r + 4, ly = pin.y - h / 2;
  if (lx + tw + pad * 2 > W) lx = pin.x - pin.r - 4 - tw - pad * 2;
  g.fillStyle = 'rgba(61,47,32,.92)'; g.beginPath(); g.roundRect(lx, ly, tw + pad * 2, h, 6); g.fill();
  g.fillStyle = '#f4ecd8'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, lx + pad, pin.y + 1);
  g.strokeStyle = '#3d2f20'; g.lineWidth = 2.5; g.beginPath(); g.arc(pin.x, pin.y, pin.r * 0.85, 0, Math.PI * 2); g.stroke();
  g.textBaseline = 'alphabetic';
}

export function setupIslandMap({ onPick }) {
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
    b.addEventListener('mouseenter', () => drawn && highlight(canvas, drawn, drawn.pins[n]));
    b.addEventListener('mouseleave', () => drawn && highlight(canvas, drawn, null));
    li.appendChild(b); list.appendChild(li);
  });
  const overview = document.createElement('li');
  overview.innerHTML = '<button type="button"><span class="n">↗</span><span><b>Fly over the whole island</b><small>Aerial view</small></span></button>';
  overview.querySelector('button').addEventListener('click', () => { close(); onPick(OVERVIEW); });
  list.appendChild(overview);

  function open() {
    overlay.hidden = false;
    if (!drawn) drawn = drawMap(canvas);   // drawn the first time the map opens
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
    for (const p of drawn.pins) { const d = Math.hypot(p.x - x, p.y - y); if (d < p.r * 1.3 && d < bd) { best = p; bd = d; } }
    return best;
  };
  let hovered = null;
  canvas.addEventListener('mousemove', (e) => {
    const p = pinAt(e);
    if (p !== hovered) { hovered = p; highlight(canvas, drawn, p); canvas.style.cursor = p ? 'pointer' : 'default'; }
  });
  canvas.addEventListener('mouseleave', () => { hovered = null; drawn && highlight(canvas, drawn, null); });
  canvas.addEventListener('click', (e) => {
    const hit = pinAt(e);
    if (hit) { close(); onPick(hit.place); }
  });
}
