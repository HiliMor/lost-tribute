// The Swan countdown: 108 minutes, enter 4 8 15 16 23 42 and press Execute.
// If it reaches zero: hieroglyphs, a violet discharge, and the fail-safe key.
import { $ } from '../core/utils.js';
import { uDis } from '../core/uniforms.js';
import { audio } from './audio.js';

const FULL = 108 * 60;                       // seconds on the counter
const NUMBERS = '4 8 15 16 23 42';
const GLYPHS = ['𓂀', '𓆣', '𓋹', '𓁹', '𓃭'];
const SPEEDS = [1, 60, 600];

const swan = { remaining: FULL, speed: 60, state: 'counting', failT: 0, beepAcc: 0, shown: '' };
let tiles = [];

function logLine(text, cls = '') {
  const log = $('log'); const d = document.createElement('div');
  d.textContent = text; if (cls) d.className = cls; log.appendChild(d);
  while (log.children.length > 5) log.removeChild(log.firstChild);
}

function renderCounter() {
  let chars;
  if (swan.state === 'failing') chars = GLYPHS;
  else {
    const r = Math.max(0, Math.ceil(swan.remaining));
    const m = String(Math.floor(r / 60)).padStart(3, '0'), s = String(r % 60).padStart(2, '0');
    chars = (m + s).split('');
  }
  const key = chars.join('');
  if (key === swan.shown) return;
  tiles.forEach((el, i) => {
    if (el.textContent !== chars[i]) {
      el.textContent = chars[i];
      // flip animation on the minute tiles (all tiles in real time)
      if (i < 3 || swan.speed === 1) { el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); }
    }
    el.classList.toggle('glyph', swan.state === 'failing');
  });
  swan.shown = key;
}

function execute() {
  const input = $('code');
  if (swan.state === 'failing') {
    logLine('> fail-safe key turned', 'hot');
    endFailure(); input.value = ''; return;
  }
  const raw = input.value.trim();
  if (!raw) { input.focus(); return; }
  const norm = raw.split(/[^0-9]+/).filter(Boolean).join(' ');
  logLine('>: ' + raw);
  if (norm === NUMBERS || raw.replace(/\D/g, '') === '4815162342') {
    swan.remaining = FULL; swan.beepAcc = 0;
    logLine('Counter reset · 108:00', 'hot');
    audio.beep(660, 0.25, 0.1);
  } else {
    logLine('Not the numbers. Try again.', 'bad');
    audio.beep(220, 0.2, 0.1);
  }
  input.value = '';
  renderCounter();
}

function startFailure() {
  swan.state = 'failing'; swan.failT = 0;
  $('swan').classList.add('fail', 'warn');
  $('exec').textContent = 'Turn the fail-safe key';
  logLine('SYSTEM FAILURE', 'bad');
  renderCounter();
}

function endFailure() {
  $('flash').animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: 2600, easing: 'ease-out' });
  swan.state = 'counting'; swan.remaining = FULL; swan.failT = 0;
  $('swan').classList.remove('fail', 'warn');
  $('exec').textContent = 'Execute';
  logLine('Discharge contained · 108:00', 'hot');
  setTimeout(() => { uDis.value = 0; }, 350);
  renderCounter();
}

export function setupSwan() {
  tiles = [...document.querySelectorAll('#counter .tile')];
  $('codeForm').addEventListener('submit', (e) => { e.preventDefault(); execute(); });
  $('exec').addEventListener('click', execute);
  $('speed').addEventListener('click', (e) => {
    swan.speed = SPEEDS[(SPEEDS.indexOf(swan.speed) + 1) % SPEEDS.length];
    e.currentTarget.textContent = '×' + swan.speed;
  });
  $('swanToggle').addEventListener('click', (e) => {
    const s = $('swan'); s.classList.toggle('closed');
    e.currentTarget.setAttribute('aria-expanded', String(!s.classList.contains('closed')));
  });
  // start collapsed on phones
  if (matchMedia('(max-width: 640px)').matches) { $('swan').classList.add('closed'); $('swanToggle').setAttribute('aria-expanded', 'false'); }
}

// called every frame
export function updateSwan(dt) {
  if (swan.state === 'counting') {
    swan.remaining -= dt * swan.speed;
    const warn = swan.remaining < 240;           // the alarm starts at 4 minutes, like in the show
    $('swan').classList.toggle('warn', warn);
    if (warn) {
      swan.beepAcc += dt;
      const every = swan.remaining < 60 ? 0.3 : 0.8;
      if (swan.beepAcc > every) { swan.beepAcc = 0; audio.beep(); }
    }
    if (swan.remaining <= 0) startFailure();
    uDis.value = Math.max(0, uDis.value - dt * 0.8);
  } else {
    swan.failT += dt;
    uDis.value = Math.min(1, swan.failT / 5);
    swan.beepAcc += dt;
    if (swan.beepAcc > 0.22) { swan.beepAcc = 0; audio.beep(880 + Math.random() * 600, 0.08, 0.08); }
    if (swan.failT > 11) { logLine('> fail-safe key turned', 'hot'); endFailure(); }
  }
  renderCounter();
}
