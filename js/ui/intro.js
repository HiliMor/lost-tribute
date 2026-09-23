// The LOST title that flies in while the island loads, and the anniversary year count.
import { $, reduceMotion } from '../core/utils.js';

// "22 years ago" stays correct in later years
export function updateAnniversary() {
  const n = new Date();
  const y = n.getFullYear() - 2004 - (n < new Date(n.getFullYear(), 8, 22) ? 1 : 0);
  document.querySelectorAll('.yrs').forEach((e) => (e.textContent = y));
}

// Hide the intro once the title animation has played AND the first frame has rendered.
export function setupIntro() {
  const intro = $('intro');
  let introDone = false, minTimeDone = false, sceneReady = false;
  const hideIntro = () => { if (introDone) return; introDone = true; intro.classList.add('gone'); setTimeout(() => intro.remove(), 1700); };
  setTimeout(() => { minTimeDone = true; if (sceneReady) hideIntro(); }, reduceMotion ? 300 : 4700);
  intro.addEventListener('click', () => { if (sceneReady) hideIntro(); });
  return function sceneIsReady() {
    sceneReady = true;
    if ($('status')) $('status').textContent = 'Click to skip';
    if (minTimeDone) hideIntro();
  };
}

export function showStartupError(message) {
  if ($('status')) $('status').textContent = message;
}
