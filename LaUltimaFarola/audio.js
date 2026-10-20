/* La última farola — sonido sintetizado (sin archivos) */
(function () {
  const LF = window.LF;
  const A = (LF.audio = {});
  let ctx = null, master, musicBus, sfxBus, ambBus;
  A.musicVol = 0.6; A.sfxVol = 0.8;

  A.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.connect(master);
    A.setVolumes(A.musicVol, A.sfxVol);
    noiseBuf = makeNoise();
    if (pendingMusic) { const m = pendingMusic; pendingMusic = null; A.playMusic(m); }
    if (pendingAmb) { const m = pendingAmb; pendingAmb = null; A.playAmb(m); }
  };
  A.ready = () => !!ctx;
  A.setVolumes = function (m, s) {
    A.musicVol = m; A.sfxVol = s;
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(m * 0.55, ctx.currentTime, 0.1);
    ambBus.gain.setTargetAtTime(s * 0.35, ctx.currentTime, 0.1);
    sfxBus.gain.setTargetAtTime(s * 0.7, ctx.currentTime, 0.05);
  };
  A.suspend = function (on) { if (!ctx) return; if (on) ctx.suspend(); else ctx.resume(); };

  let noiseBuf = null;
  function makeNoise() {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b;
  }
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(n) { if (typeof n === 'number') return n; const m = n.match(/^([A-G]#?)(\d)$/); const midi = 12 * (+m[2] + 1) + NOTE[m[1]]; return 440 * Math.pow(2, (midi - 69) / 12); }
  A.freq = freq;

  function env(g, t, a, d, s, r, peak, len) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.linearRampToValueAtTime(peak * s, t + a + d);
    g.gain.setValueAtTime(peak * s, t + Math.max(a + d, len));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, len) + r);
  }

  /* ---------- instrumentos ---------- */
  function voice(bus, type, f, t, len, o) {
    o = o || {};
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + (o.slideT || len));
    const g = ctx.createGain(); env(g, t, o.a || 0.005, o.d || 0.1, o.s == null ? 0.6 : o.s, o.r || 0.1, o.v || 0.3, len);
    let node = osc;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; f2.Q.value = o.q || 0.7; node.connect(f2); node = f2; }
    node.connect(g); g.connect(bus);
    if (o.vib) { const l = ctx.createOscillator(); l.frequency.value = o.vib; const lg = ctx.createGain(); lg.gain.value = f * 0.006; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + len + (o.r || 0.1) + 0.05); }
    osc.start(t); osc.stop(t + len + (o.r || 0.1) + 0.05);
  }
  // bandoneón: dos lengüetas levemente desafinadas + filtro
  function bandoneon(f, t, len, v) {
    for (const det of [1, 1.004]) voice(musicBus, 'sawtooth', f * det, t, len, { a: 0.05, d: 0.1, s: 0.75, r: 0.18, v: (v || 0.12) * 0.55, lp: 1500, vib: 5.2 });
    voice(musicBus, 'square', f / 2, t, len, { a: 0.06, d: 0.1, s: 0.6, r: 0.18, v: (v || 0.12) * 0.25, lp: 900 });
  }
  function piano(f, t, len, v) {
    voice(musicBus, 'triangle', f, t, len, { a: 0.004, d: 0.4, s: 0.15, r: 0.5, v: v || 0.16 });
    voice(musicBus, 'sine', f * 2, t, len * 0.5, { a: 0.002, d: 0.2, s: 0.05, r: 0.3, v: (v || 0.16) * 0.3 });
  }
  function musicBox(f, t, len, v) { voice(musicBus, 'sine', f * 2, t, 0.05, { a: 0.002, d: 0.6, s: 0.001, r: 0.6, v: v || 0.12 }); voice(musicBus, 'triangle', f * 4, t, 0.02, { a: 0.001, d: 0.2, s: 0.001, r: 0.2, v: (v || 0.12) * 0.25 }); }
  function pad(f, t, len, v, lp) { for (const det of [0.997, 1.003]) voice(musicBus, 'sawtooth', f * det, t, len, { a: len * 0.35, d: 0.2, s: 0.8, r: len * 0.4, v: (v || 0.05) * 0.5, lp: lp || 700 }); }
  function bass(f, t, len, v) { voice(musicBus, 'triangle', f, t, len, { a: 0.01, d: 0.2, s: 0.5, r: 0.15, v: v || 0.22 }); }
  function tick(t, v, hi) {
    if (!noiseBuf) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hi ? 5200 : 2600; f.Q.value = 8;
    const g = ctx.createGain(); g.gain.setValueAtTime(v || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.06);
  }

  /* ---------- La canción de Alba (original, vals en La menor) ---------- */
  const SONG = [
    ['E5', 1], ['A4', 1], ['B4', 1], ['C5', 2], ['B4', 1], ['A4', 1], ['G4', 1], ['A4', 1], ['E4', 3],
    ['F4', 1], ['A4', 1], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1], ['B4', 1], ['G#4', 1], ['A4', 3],
    ['C5', 1], ['D5', 1], ['E5', 1], ['F5', 2], ['E5', 1], ['D5', 1], ['C5', 1], ['B4', 1], ['C5', 3],
    ['A4', 1], ['C5', 1], ['E5', 1], ['D5', 2], ['C5', 1], ['B4', 1], ['A4', 1], ['G#4', 1], ['A4', 3]
  ];
  const CHORDS = [ // por compás: [bajo, acorde]
    ['A2', ['A3', 'C4', 'E4']], ['A2', ['A3', 'C4', 'E4']], ['G2', ['G3', 'C4', 'E4']], ['E2', ['G#3', 'B3', 'E4']],
    ['D2', ['A3', 'D4', 'F4']], ['A2', ['A3', 'C4', 'E4']], ['E2', ['G#3', 'B3', 'D4']], ['A2', ['A3', 'C4', 'E4']],
    ['F2', ['A3', 'C4', 'F4']], ['D2', ['A3', 'D4', 'F4']], ['G2', ['G3', 'B3', 'D4']], ['C3', ['G3', 'C4', 'E4']],
    ['A2', ['A3', 'C4', 'E4']], ['D2', ['A3', 'D4', 'F4']], ['E2', ['G#3', 'B3', 'D4']], ['A2', ['A3', 'C4', 'E4']]
  ];
  const ARR = {
    titulo: { bpm: 76, lead: 'piano', comp: 'piano', bass: true, leadV: 0.15 },
    puerto: { bpm: 92, lead: 'band', comp: 'piano', bass: true, leadV: 0.11 },
    tejados: { bpm: 84, lead: 'box', comp: 'pad', bass: true, leadV: 0.12, rest: [2, 3] },
    mercado: { bpm: 70, lead: 'piano', comp: 'pad', bass: false, leadV: 0.1, lp: 500, rest: [1, 3] },
    torre: { bpm: 108, lead: 'none', comp: 'pad', bass: true, leadV: 0.1, ticks: true, frag: true },
    faro: { bpm: 88, lead: 'band', comp: 'pad', bass: true, leadV: 0.1, rest: [1] },
    final: { bpm: 84, lead: 'band', comp: 'piano', bass: true, leadV: 0.13 },
    cancion: { bpm: 80, lead: 'band', comp: 'none', bass: false, leadV: 0.14, once: true }
  };

  let seq = null, pendingMusic = null, pendingAmb = null, intensity = 0;
  A.setIntensity = (v) => { intensity = v; };
  A.playMusic = function (name) {
    if (!ctx) { pendingMusic = name; return; }
    if (seq && seq.name === name) return;
    A.stopMusic();
    const arr = ARR[name]; if (!arr) return;
    seq = { name, arr, bar: 0, next: ctx.currentTime + 0.15, noteIdx: 0, beatInSong: 0, loops: 0 };
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(A.musicVol * 0.55, ctx.currentTime, 0.3);
  };
  A.stopMusic = function (fade) {
    if (!ctx) { pendingMusic = null; return; }
    if (fade && seq) { musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6); const s = seq; setTimeout(() => { if (seq === s) seq = null; musicBus.gain.setTargetAtTime(A.musicVol * 0.55, ctx.currentTime, 0.05); }, 1800); return; }
    seq = null;
  };
  // precomputar tiempos de inicio de cada nota en pulsos
  const songStarts = []; { let b = 0; for (const n of SONG) { songStarts.push(b); b += n[1]; } }
  const SONG_BEATS = 48;

  A.update = function () {
    if (!ctx || !seq) return;
    const now = ctx.currentTime;
    const arr = seq.arr; const spb = 60 / (arr.bpm * (1 + intensity * 0.25));
    while (seq && seq.next < now + 0.25) {
      const t = seq.next; const bar = seq.bar % 16;
      const [b, ch] = CHORDS[bar];
      // acompañamiento de vals: bajo en 1, acorde en 2 y 3
      if (arr.bass) bass(freq(b), t, spb * 0.9, 0.2);
      if (arr.comp === 'piano') for (const k of [1, 2]) for (const n of ch) piano(freq(n), t + spb * k, spb * 0.6, 0.05);
      if (arr.comp === 'pad') { for (const n of ch) pad(freq(n), t, spb * 3, 0.05, arr.lp || 800); }
      if (arr.ticks) { for (let k = 0; k < 3; k++) tick(t + spb * k, k === 0 ? 0.22 : 0.12, k === 0); if (intensity > 0.3) for (let k = 0; k < 3; k++) tick(t + spb * (k + 0.5), 0.08, false); }
      // melodía del compás
      const barStart = bar * 3;
      const restBars = arr.rest || [];
      const restThis = restBars.indexOf(seq.loops % 4) >= 0 && bar >= 8;
      for (let i = 0; i < SONG.length; i++) {
        const st = songStarts[i];
        if (st >= barStart && st < barStart + 3) {
          const [n, d] = SONG[i]; const tt = t + (st - barStart) * spb; const len = d * spb * 0.92; const f = freq(n);
          if (arr.frag && (bar % 4 !== 0 && bar % 4 !== 3)) continue;
          if (restThis) continue;
          if (arr.lead === 'band') bandoneon(f, tt, len, arr.leadV);
          else if (arr.lead === 'piano') piano(f, tt, len, arr.leadV);
          else if (arr.lead === 'box') musicBox(f, tt, len, arr.leadV);
          else if (arr.frag) musicBox(f / 2, tt, len, 0.08);
        }
      }
      seq.next += spb * 3; seq.bar++;
      if (seq.bar % 16 === 0) { seq.loops++; if (arr.once) { seq = null; if (A.onSongEnd) A.onSongEnd(); } }
    }
  };

  /* ---------- ambiente ---------- */
  let amb = null;
  A.playAmb = function (name) {
    if (!ctx) { pendingAmb = name; return; }
    if (amb && amb.name === name) return;
    A.stopAmb();
    if (!name) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); const g = ctx.createGain(); g.gain.value = 0;
    const lfo = ctx.createOscillator(); const lg = ctx.createGain();
    if (name === 'olas') { f.type = 'lowpass'; f.frequency.value = 600; lfo.frequency.value = 0.12; lg.gain.value = 0.35; g.gain.value = 0.4; }
    else if (name === 'viento') { f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6; lfo.frequency.value = 0.07; lg.gain.value = 0.3; g.gain.value = 0.35; }
    else if (name === 'agua') { f.type = 'lowpass'; f.frequency.value = 350; lfo.frequency.value = 0.2; lg.gain.value = 0.25; g.gain.value = 0.35; }
    else { f.type = 'lowpass'; f.frequency.value = 250; lfo.frequency.value = 0.05; lg.gain.value = 0.1; g.gain.value = 0.2; }
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(ambBus); src.start(); lfo.start();
    amb = { name, src, lfo };
  };
  A.stopAmb = function () { if (amb) { try { amb.src.stop(); amb.lfo.stop(); } catch (e) {} amb = null; } };

  /* ---------- efectos ---------- */
  function noiseHit(t, len, f0, f1, v, type) {
    if (!noiseBuf) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + len + 0.02);
  }
  A.sfx = function (name, p) {
    if (!ctx) return; const t = ctx.currentTime;
    switch (name) {
      case 'jump': voice(sfxBus, 'square', 330, t, 0.06, { slide: 520, v: 0.05, a: 0.002, d: 0.05, s: 0.3, r: 0.04, lp: 2400 }); break;
      case 'land': noiseHit(t, 0.08, 900, 200, 0.18); break;
      case 'step': noiseHit(t, 0.03, 1400, 600, 0.04); break;
      case 'lamp': ['A4', 'C5', 'E5', 'A5'].forEach((n, i) => voice(sfxBus, 'triangle', freq(n), t + i * 0.07, 0.25, { v: 0.12, a: 0.003, d: 0.2, s: 0.3, r: 0.4 })); noiseHit(t, 0.4, 3000, 800, 0.06, 'bandpass'); break;
      case 'check': voice(sfxBus, 'triangle', freq('E5'), t, 0.12, { v: 0.07, r: 0.2 }); break;
      case 'oil': voice(sfxBus, 'sine', 600, t, 0.1, { slide: 1100, v: 0.12, r: 0.1 }); break;
      case 'card': ['E5', 'G#5', 'B5', 'E6'].forEach((n, i) => voice(sfxBus, 'sine', freq(n), t + i * 0.09, 0.3, { v: 0.1, r: 0.5 })); break;
      case 'spark': noiseHit(t, 0.25, 6000, 1200, 0.12, 'bandpass'); voice(sfxBus, 'triangle', 900, t, 0.15, { slide: 1600, v: 0.05 }); break;
      case 'fizz': noiseHit(t, 0.15, 1500, 300, 0.08); break;
      case 'poof': noiseHit(t, 0.35, 2500, 200, 0.18); voice(sfxBus, 'sine', 300, t, 0.2, { slide: 120, v: 0.08 }); break;
      case 'dash': noiseHit(t, 0.2, 400, 3000, 0.16, 'bandpass'); voice(sfxBus, 'sawtooth', 120, t, 0.15, { slide: 260, v: 0.05, lp: 800 }); break;
      case 'splash': noiseHit(t, 0.35, 2000, 300, 0.2); break;
      case 'swim': noiseHit(t, 0.12, 800, 300, 0.05); break;
      case 'die': ['E4', 'C4', 'A3'].forEach((n, i) => voice(sfxBus, 'triangle', freq(n), t + i * 0.12, 0.2, { v: 0.12, r: 0.3 })); noiseHit(t, 0.6, 1200, 100, 0.12); break;
      case 'memory': ['A3', 'E4', 'A4', 'C5', 'E5'].forEach((n, i) => voice(sfxBus, 'sine', freq(n), t + i * 0.15, 0.8, { v: 0.08, a: 0.05, r: 1.2 })); break;
      case 'blip': voice(sfxBus, 'square', 880, t, 0.03, { v: 0.03, r: 0.03, lp: 3000 }); break;
      case 'select': voice(sfxBus, 'triangle', 660, t, 0.05, { slide: 990, v: 0.07, r: 0.06 }); break;
      case 'blackout': for (let i = 0; i < 6; i++) noiseHit(t + i * 0.35, 0.3, 800, 100, 0.12); voice(sfxBus, 'sawtooth', 110, t, 3, { slide: 55, v: 0.06, a: 1, lp: 400 }); break;
      case 'bigLight': ['A3', 'E4', 'A4', 'C#5', 'E5', 'A5'].forEach((n, i) => voice(sfxBus, 'triangle', freq(n), t + i * 0.12, 2.5, { v: 0.09, a: 0.05, r: 2 })); noiseHit(t, 2, 200, 6000, 0.08, 'bandpass'); break;
      case 'type': voice(sfxBus, 'square', p || 520, t, 0.012, { v: 0.015, r: 0.01, lp: 2000 }); break;
    }
  };
})();
