// Sound, generated in the browser: surf, fire crackle, Swan alarm beeps and the discharge hum.
// Built on demand, because browsers only allow audio after a click.
import { $ } from '../core/utils.js';
import { uDis } from '../core/uniforms.js';

export const audio = {
  ctx: null, master: null, sea: null, wash: null, humGain: null, noiseBuf: null, on: false,

  start() {
    const ctx = this.ctx = new AudioContext();
    this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(ctx.destination);
    // 4 s of brown noise, reused for the surf and the crackles
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    const src = (f, type, gain) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = Math.random() * 0.2 + 0.9;
      const bf = ctx.createBiquadFilter(); bf.type = type; bf.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = gain;
      s.connect(bf).connect(g).connect(this.master); s.start(); return g;
    };
    this.sea = src(380, 'lowpass', 0.5);
    this.wash = src(1600, 'bandpass', 0.2);
    this.noiseBuf = buf;
    const hg = this.humGain = ctx.createGain(); hg.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    for (const f of [55, 110.4, 164.2]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    lp.connect(hg).connect(this.master);
  },

  // called every frame; fireDistance (metres) makes the crackle louder near the camp
  tick(t, fireDistance) {
    if (!this.on) return;
    const now = this.ctx.currentTime;
    const swell = Math.pow(0.5 + 0.5 * Math.sin(t * 0.55), 2);
    this.sea.gain.setTargetAtTime(0.25 + 0.45 * swell, now, 0.2);
    this.wash.gain.setTargetAtTime(0.04 + 0.22 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.55 - 1.2), 6), now, 0.15);
    this.humGain.gain.setTargetAtTime(uDis.value * 0.35, now, 0.2);
    const near = Math.max(0, 1 - fireDistance / 45);
    if (Math.random() < 0.12 * (0.3 + near)) this.crackle(0.05 + 0.25 * near);
  },

  crackle(v) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bf = ctx.createBiquadFilter(); bf.type = 'highpass'; bf.frequency.value = 1800 + Math.random() * 3000;
    const g = ctx.createGain(); const now = ctx.currentTime;
    g.gain.setValueAtTime(v * Math.random(), now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03 + Math.random() * 0.05);
    s.connect(bf).connect(g).connect(this.master); s.start(now, Math.random() * 3); s.stop(now + 0.1);
  },

  beep(freq = 1180, dur = 0.12, vol = 0.12) {
    if (!this.on) return;
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(), now = ctx.currentTime;
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(this.master); o.start(now); o.stop(now + dur + 0.02);
  },
};

export function setupSoundButton() {
  $('sound').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!audio.ctx) audio.start();
    audio.on = !audio.on;
    if (audio.on) { await audio.ctx.resume(); } else { await audio.ctx.suspend(); }
    btn.setAttribute('aria-pressed', String(audio.on));
    btn.textContent = audio.on ? 'Sound on' : 'Sound off';
  });
}
