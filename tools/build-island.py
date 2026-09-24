"""Build the island's terrain data from Choekaas's fan map of the Island.

Map: "The Island" by Choekaas (updated fall 2024), https://i.imgur.com/NrhXLUu.jpeg, the map r/lost
recommends as the most accurate (https://www.reddit.com/r/lost/comments/1h8lpkr/). The map image is
not included in this repo: download it and pass its path.

    python3 tools/build-island.py NrhXLUu.jpeg

Needs numpy, pillow and scipy. Writes js/data/island.bin (coast distance + height grids)
and js/data/island-meta.js (grid bounds, map<->world transform, landmark positions).

The coastline is traced from the map's colours; mountains come from its shading (ridges and
shadowed valleys give strong local contrast, flat ground is smooth). The world is the map rotated
so the crash site's beach runs along world +x with the sea to the south (-z), as the beach
scene was built that way.
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

K = 4                      # work at 1/4 of the map's resolution
M_PER_PX = 2.2             # metres per quarter-resolution map pixel
CELL = 8.0                 # world grid cell, metres

# Landmark positions on the full-resolution map (pixels): read off the map's labels and icons.
SITES_FULL = {
    'crash': (2045, 3505), 'hatch': (1632, 3028), 'beechcraft': (1857, 2630), 'blackRock': (1495, 2530),
    'statue': (1115, 1815), 'temple': (2770, 1220), 'radio': (2675, 2800), 'barracks': (2075, 1385),
    'lighthouse': (3238, 3618), 'hydra': (4415, 1890),
}

im = Image.open(sys.argv[1]).convert('RGB')
W, H = im.size
a = np.asarray(im.resize((W // K, H // K), Image.LANCZOS)).astype(np.float32)
h, w = a.shape[:2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# --- coastline: blue-dominant pixels are sea (deep navy and turquoise shallows)
water = ((b > r + 8) & (b > g - 25)) | ((b > 60) & (b > r + 25))
land = ndi.binary_fill_holes(ndi.binary_opening(~water, iterations=2))
lab, n = ndi.label(land)
sizes = ndi.sum(land, lab, range(1, n + 1))
land = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 400])
sdf = (ndi.distance_transform_edt(land) - ndi.distance_transform_edt(~land)) * M_PER_PX   # metres, + on land

# --- heights from shading (clouds and text labels masked out and filled from around them)
lum = a.mean(2); sat = a.max(2) - a.min(2)
bad = ndi.binary_dilation(((lum > 150) & (sat < 45)) | (lum > 200), iterations=3)
good = (~bad) & land
mean = ndi.uniform_filter(lum, 9); sq = ndi.uniform_filter(lum * lum, 9)
std = np.sqrt(np.maximum(sq - mean * mean, 0))
wgt = ndi.gaussian_filter(good.astype(np.float32), 13)
rug = ndi.gaussian_filter(np.where(good, std, 0), 13) / np.maximum(wgt, 1e-3)
lo, hi = np.percentile(rug[land], [30, 97])
rr = np.clip((rug - lo) / (hi - lo), 0, 1)
din = ndi.distance_transform_edt(land)
height = ndi.gaussian_filter(rr ** 1.2 * 210 * np.clip(din / 50, 0, 1) ** 0.8, 7)   # broad ridges, not spikes
height[~land] = 0

# --- map -> world transform, aligned on the crash site's coastline
cx, cy = SITES_FULL['crash'][0] / K, SITES_FULL['crash'][1] / K
edge = land ^ ndi.binary_erosion(land)
ys, xs = np.nonzero(edge)
near = (xs - cx) ** 2 + (ys - cy) ** 2 < 55 ** 2
px, py = xs[near].astype(float), ys[near].astype(float)
i0 = np.argmin((px - cx) ** 2 + (py - cy) ** 2)
anchor = np.array([px[i0], py[i0]])
pts = np.stack([px - px.mean(), py - py.mean()], 1)
t = np.linalg.svd(pts, full_matrices=False)[2][0]        # coast tangent (map px, y down)
nrm = np.array([-t[1], t[0]])
probe = (anchor + nrm * 12).round().astype(int)
if not land[probe[1], probe[0]]: nrm = -nrm              # point the normal inland
# keep the map's handedness (no mirror image): the world is right-handed with y up, so seen from
# above x -> z turns the same way as the map's x -> y. Flip the tangent if the pair is mirrored.
if t[0] * nrm[1] - t[1] * nrm[0] < 0: t = -t
# world: +x along the tangent, +z = inland. Map coords are (x right, y down).
shore_x, shore_z = 4.0, 4 * np.sin(4 * 0.021) + 2.5 * np.sin(4 * 0.057 + 1.3)
def to_world(mx, my):
    dx = (np.asarray(mx, float) - anchor[0]) * M_PER_PX; dy = (np.asarray(my, float) - anchor[1]) * M_PER_PX
    return dx * t[0] + dy * t[1] + shore_x, dx * nrm[0] + dy * nrm[1] + shore_z
# inverse: map = anchor + (x - shore_x) * t / M + (z - shore_z) * nrm / M
def to_map(x, z):
    x = np.asarray(x, float) - shore_x; z = np.asarray(z, float) - shore_z
    return anchor[0] + (x * t[0] + z * nrm[0]) / M_PER_PX, anchor[1] + (x * t[1] + z * nrm[1]) / M_PER_PX

# --- resample into a world-aligned grid
yl, xl = np.nonzero(land)
lx, lz = to_world(xl, yl)
pad = 260
x0, x1 = float(np.floor((lx.min() - pad) / CELL) * CELL), float(np.ceil((lx.max() + pad) / CELL) * CELL)
z0, z1 = float(np.floor((lz.min() - pad) / CELL) * CELL), float(np.ceil((lz.max() + pad) / CELL) * CELL)
nx, nz = int((x1 - x0) / CELL) + 1, int((z1 - z0) / CELL) + 1
gx, gz = np.meshgrid(x0 + np.arange(nx) * CELL, z0 + np.arange(nz) * CELL)
mx, my = to_map(gx, gz)
sdf_w = ndi.map_coordinates(sdf, [my, mx], order=1, mode='nearest')
far = (mx < 0) | (my < 0) | (mx > w - 1) | (my > h - 1)
sdf_w[far] = np.minimum(sdf_w[far], -300)
h_w = ndi.map_coordinates(height, [my, mx], order=1, mode='constant', cval=0)
grid = np.stack([np.clip(sdf_w * 10, -32000, 32000), np.clip(h_w * 20, 0, 32000)]).astype('<i2')
grid.tofile('js/data/island.bin')

# Some landmarks need flat ground a little further from the shore than their map label.
INLAND = {'temple': 175}          # metres from the coast
gyy, gxx = np.gradient(sdf)
sites = {}
for k, (fx, fy) in SITES_FULL.items():
    mx, my = fx / K, fy / K
    for _ in range(200):
        if k not in INLAND: break
        d = ndi.map_coordinates(sdf, [[my], [mx]], order=1)[0]
        if d >= INLAND[k]: break
        gx_ = ndi.map_coordinates(gxx, [[my], [mx]], order=1)[0]; gy_ = ndi.map_coordinates(gyy, [[my], [mx]], order=1)[0]
        ln = np.hypot(gx_, gy_) or 1
        mx += gx_ / ln; my += gy_ / ln
    wx, wz = to_world(mx, my)
    sites[k] = {'x': round(float(wx), 1), 'z': round(float(wz), 1)}
cen = to_world(*[float(v.mean()) for v in (xl, yl)])
meta = {
    'grid': {'x0': x0, 'z0': z0, 'cell': CELL, 'nx': nx, 'nz': nz, 'sdfScale': 0.1, 'heightScale': 0.05},
    'map': {'width': w, 'height': h, 'metresPerPx': M_PER_PX, 'anchor': [float(anchor[0]), float(anchor[1])],
            'tangent': [float(t[0]), float(t[1])], 'normal': [float(nrm[0]), float(nrm[1])], 'shore': [shore_x, float(shore_z)]},
    'centre': {'x': round(float(cen[0]), 1), 'z': round(float(cen[1]), 1)},
    'sites': sites,
}
with open('js/data/island-meta.js', 'w') as f:
    f.write('// Generated by tools/build-island.py from Choekaas\'s map of the Island. Do not edit by hand.\n')
    f.write('export default ' + json.dumps(meta, indent=2) + ';\n')
print('grid', nx, 'x', nz, 'cells;', 'x', x0, '..', x1, ' z', z0, '..', z1)
print('tangent', t.round(3), 'normal', nrm.round(3))
for k, v in sites.items(): print(f'  {k:11s} {v}')
