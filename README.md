# LOST · Oceanic 815 Crash Beach

A fan-made tribute to *LOST*, which premiered on 22 September 2004. It shows the Flight 815 crash beach at sunset, built with [three.js](https://threejs.org) and WebGPU.

**▶ [Open the live scene](https://hilimor.github.io/lost-tribute/)**

![The Oceanic 815 fuselage on the beach at sunset](preview.jpg)

## What's in it

- The wreck: the fuselage in Oceanic livery, a jet engine, a wing, and luggage and seats scattered across the sand
- A shader-driven ocean with turquoise shallows, breaking surf and water running up the beach
- Swaying palms, jungle hills, a signal fire with embers and smoke
- A light slider from golden hour to night. At night, look inland for the hatch.
- **The Swan:** a working 108-minute countdown. Type `4 8 15 16 23 42` and press Execute before it hits zero.
- Optional sound (surf, fire, alarm), generated in the browser

Everything is procedural: no footage, images, models or audio from the show are used.

## Run it locally

The page uses JavaScript modules, so it needs a local web server; opening `index.html` by double-clicking won't work.

```sh
cd ~/lost-tribute
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a recent Chrome, Edge or Safari. There's nothing to install or build: three.js loads from a CDN. Browsers without WebGPU fall back to WebGL 2.

## How the code is organised

```
index.html                 page structure: HUD, Swan panel, intro title
css/style.css              all styling
js/main.js                 entry point: renderer, camera, builds the island, frame loop
js/core/
  terrain-math.js          island shape: shoreline, beach slope, hills (used to place everything)
  uniforms.js              shared shader values (sun, sky colours, time, discharge...)
  utils.js                 seeded random numbers and small helpers
js/environment/
  sky.js                   sky dome, clouds, stars, and sky light/reflections for all materials
  lights.js                sun/moon light, fill light, fog
  time-of-day.js           the light slider: blends 4 keyframes from golden hour to night
  post.js                  bloom, vignette, film grain
js/world/
  terrain.js               the ground: sand, jungle floor, seaweed tide line
  ocean.js                 waves, foam, shallows, reflections
  wreck.js                 fuselage, wing, engine, luggage, seats, camp
  fire.js                  campfire, embers, smoke
  vegetation.js            palms, coconuts, driftwood, jungle, rocks
  wildlife.js              seabirds and crabs
  hatch.js                 the hatch and its light beam
js/ui/
  swan.js                  the 108-minute countdown
  audio.js                 generated sound
  intro.js                 LOST title card
```

One thing to know before editing: props are placed with a **seeded random sequence**, so the island looks the same on every visit. `main.js` builds the world in a fixed order; changing that order, or adding random calls in the middle, will shuffle where palms and debris end up.

## Credits

- [three.js](https://github.com/mrdoob/three.js) (MIT)
- Fonts from Google Fonts (SIL Open Font License): Cormorant Garamond, Jost, VT323 and Noto Sans Egyptian Hieroglyphs

---

*LOST* and related names are the property of ABC Studios and Disney. This is a non-commercial fan project and is not affiliated with or endorsed by them.
