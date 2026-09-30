'use strict';
// ---------- Prozedurale Sounds & Western-Musik (WebAudio, keine Dateien nötig) ----------
const SFX = (() => {
  let ctx = null, master, noiseBuf, windGain, windFilter, musicGain, rainGain;
  let musicOn = true, combat = false, beat = 0, nextTime = 0;
  const chords = [[164.8, 196, 246.9, 329.6], [130.8, 164.8, 196, 261.6], [146.8, 185, 220, 293.7], [164.8, 196, 246.9, 329.6]];
  const bass = [82.4, 65.4, 73.4, 82.4];
  const pattern = [0, 1, 2, 3, 2, 1, 2, 3];

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const ws = ctx.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 420; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0.05;
    ws.connect(windFilter); windFilter.connect(windGain); windGain.connect(master); ws.start();
    const rs = ctx.createBufferSource(); rs.buffer = noiseBuf; rs.loop = true; rs.playbackRate.value = 1.3;
    const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 1800;
    rainGain = ctx.createGain(); rainGain.gain.value = 0; rs.connect(rf); rf.connect(rainGain); rainGain.connect(master); rs.start();
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    nextTime = ctx.currentTime + 0.3;
    setInterval(schedule, 120);
  }
  function noise(dur, fc, type, vol, q, dest) {
    if (!ctx) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = fc; if (q) f.Q.value = q;
    const g = ctx.createGain(); const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t, Math.random() * 1.5, dur + 0.05);
  }
  function tone(freq, dur, type, vol, slideTo, when, dest) {
    if (!ctx) return;
    const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain();
    const t = when || ctx.currentTime;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
  }
  function pluck(freq, when, vol) {
    const o = ctx.createOscillator(); o.type = 'triangle';
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2600, when); f.frequency.exponentialRampToValueAtTime(400, when + 0.9);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, when + 1.4);
    o.frequency.value = freq; o.connect(f); f.connect(g); g.connect(musicGain); o.start(when); o.stop(when + 1.5);
  }
  function schedule() {
    if (!ctx || !musicOn) { if (ctx) nextTime = Math.max(nextTime, ctx.currentTime); return; }
    const spb = combat ? 0.27 : 0.42;
    while (nextTime < ctx.currentTime + 0.4) {
      const bar = Math.floor(beat / 8) % 4, step = beat % 8;
      const ch = chords[bar];
      if (step === 0) pluck(bass[bar], nextTime, 0.5);
      if (step === 4) pluck(bass[bar] * 1.5, nextTime, 0.3);
      if (Math.random() < (combat ? 0.95 : 0.75)) pluck(ch[pattern[step]] * (Math.random() < 0.15 ? 2 : 1), nextTime, 0.22);
      if (!combat && step === 0 && Math.random() < 0.5) pluck(ch[3] * 2, nextTime + spb * 3, 0.18);
      if (combat) {
        if (step % 2 === 0) { tone(90, 0.18, 'sine', 0.5, 40, nextTime, musicGain); }
        if (step % 4 === 2) { noise(0.1, 1800, 'bandpass', 0.15, 1, musicGain); }
      }
      nextTime += spb; beat++;
    }
  }
  return {
    init,
    setMusic(on) { musicOn = on; },
    toggleMusic() { musicOn = !musicOn; return musicOn; },
    setCombat(v) { combat = v; },
    setWind(v) { if (!windGain) return; windGain.gain.value = 0.04 + v * 0.25; windFilter.frequency.value = 350 + v * 900; },
    shot(dist, heavy) {
      if (!ctx) return;
      const vol = clamp(1.3 / (1 + dist * 0.035), 0.04, 1) * (heavy ? 1.15 : 1);
      const lp = clamp(5000 / (1 + dist * 0.02), 500, 5000);
      noise(heavy ? 0.7 : 0.45, lp, 'lowpass', vol * 0.9);
      noise(0.1, 6000, 'highpass', vol * 0.35);
      tone(heavy ? 110 : 150, 0.18, 'sine', vol * 0.9, 38);
      if (dist > 30) noise(1.1, 500, 'lowpass', vol * 0.25); // Echo
    },
    setRain(v) { if (rainGain) rainGain.gain.value = v * 0.16; },
    explosion(dist) {
      if (!ctx) return;
      const vol = clamp(1.6 / (1 + dist * 0.03), 0.06, 1.4);
      noise(1.6, clamp(1400 / (1 + dist * 0.02), 250, 1400), 'lowpass', vol);
      tone(70, 0.9, 'sine', vol, 22); noise(0.25, 5000, 'highpass', vol * 0.3);
    },
    thunder(delay) { setTimeout(() => { if (!ctx) return; noise(3.2, 260, 'lowpass', 0.9); tone(50, 2.5, 'sine', 0.5, 25); }, (delay || 0) * 1000); },
    bell() { tone(1046, 1.4, 'sine', 0.35); tone(2093, 0.9, 'sine', 0.12); },
    hit(flesh) { noise(0.09, flesh ? 900 : 3000, 'bandpass', flesh ? 0.5 : 0.3, 2); if (flesh) tone(180, 0.1, 'sine', 0.3, 60); },
    hoof(v) { noise(0.07, 320, 'lowpass', 0.55 * v); },
    step(v) { noise(0.05, 800, 'bandpass', 0.16 * v, 1); },
    click() { noise(0.03, 3500, 'highpass', 0.25); },
    reload() { this.click(); setTimeout(() => this.click(), 220); setTimeout(() => { tone(400, 0.05, 'square', 0.1); this.click(); }, 700); },
    whistle() { tone(1300, 0.28, 'sine', 0.25, 1900); setTimeout(() => tone(1900, 0.4, 'sine', 0.22, 1300), 260); },
    whinny() { tone(520, 0.5, 'sawtooth', 0.12, 900); setTimeout(() => tone(900, 0.4, 'sawtooth', 0.1, 420), 300); },
    deadEye(on) { tone(on ? 260 : 180, 0.5, 'sine', 0.5, on ? 60 : 500); noise(0.6, on ? 300 : 2500, 'bandpass', 0.3, 1); },
    heartbeat() { tone(70, 0.14, 'sine', 0.6, 40); setTimeout(() => tone(60, 0.16, 'sine', 0.5, 35), 160); },
    coin() { tone(1200, 0.12, 'square', 0.08); setTimeout(() => tone(1700, 0.2, 'square', 0.08), 90); },
    fanfare() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [[261.6, 0], [329.6, 0.18], [392, 0.36], [523.3, 0.6]].forEach(([f, d]) => { tone(f, 0.9, 'triangle', 0.16, null, t + d); tone(f / 2, 0.9, 'sine', 0.12, null, t + d); });
    },
    hurt() { noise(0.25, 300, 'lowpass', 0.5); tone(120, 0.25, 'sawtooth', 0.15, 60); },
    cricket() { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 3; i++) tone(4300, 0.04, 'sine', 0.025, null, t + i * 0.07); },
    coyote() { tone(500, 1.4, 'sine', 0.06, 900); },
  };
})();
