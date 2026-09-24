// Smooth camera flights between places, arcing up over the island on longer trips.
import * as THREE from 'three/webgpu';

const ease = (u) => u * u * u * (u * (u * 6 - 15) + 10);

export function createFlight(camera, controls, { reduceMotion = false } = {}) {
  let f = null;
  return {
    get flying() { return !!f; },
    flyTo(to, lookAt, onArrive) {
      const dist = camera.position.distanceTo(to);
      f = {
        t: 0,
        dur: reduceMotion ? 0.01 : THREE.MathUtils.clamp(1.6 + dist / 500, 2.2, 5.5),
        p0: camera.position.clone(), p1: to.clone(),
        t0: controls.target.clone(), t1: lookAt.clone(),
        lift: Math.min(450, dist * 0.22),
        onArrive,
      };
      controls.enabled = false;
      controls.autoRotate = false;
    },
    // returns true while a flight is in progress
    update(dt) {
      if (!f) return false;
      f.t += dt;
      const u = Math.min(1, f.t / f.dur), e = ease(u);
      camera.position.lerpVectors(f.p0, f.p1, e);
      camera.position.y += Math.sin(Math.PI * e) * f.lift;
      controls.target.lerpVectors(f.t0, f.t1, e);
      if (u >= 1) {
        const done = f.onArrive; f = null;
        controls.enabled = true;
        controls.autoRotate = !reduceMotion;
        done?.();
      }
      return true;
    },
  };
}
