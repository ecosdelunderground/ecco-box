'use strict';
/* Avisos de la clase: sonidos sintetizados con Web Audio (sin archivos ni red), voz y vibración.
   Cada momento de la clase tiene su propio sonido, para entender qué pasa sin mirar el móvil:
   cuenta atrás de marimba, salida con acorde brillante, campana de boxeo al final del asalto,
   doble nota en el cambio de combinación, aviso de cambio de lado, subida en la ráfaga final,
   cierre de bloque y fanfarria al terminar. La voz es opcional y usa la más natural del móvil. */

// En la app de Android (APK) el sistema aporta voz y vibración a través de window.EccoNative.
const NATIVE = typeof window !== 'undefined' && window.EccoNative ? window.EccoNative : null;

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // número MIDI a hercios

const Alerts = {
  ctx: null, master: null, echo: null,
  settings: () => ({}),

  unlock() {
    // iPhone: que los avisos suenen aunque el interruptor de silencio esté puesto (Safari 16.4+).
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* no soportado */ }
    // iPhone: la voz solo funciona si la primera frase sale de un toque; se "despierta" con una frase vacía.
    if (!this.voiceWarm && 'speechSynthesis' in window && !NATIVE) {
      this.voiceWarm = true;
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* sin voz */ }
    }
    if (!this.ctx) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Cadena: fuentes → (eco suave) → compresor → salida. El compresor evita picos molestos.
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
        const master = ctx.createGain(); master.gain.value = 0.9;
        master.connect(comp).connect(ctx.destination);
        const delay = ctx.createDelay(1); delay.delayTime.value = 0.19;
        const fb = ctx.createGain(); fb.gain.value = 0.28;
        const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3200;
        const wet = ctx.createGain(); wet.gain.value = 0.22;
        delay.connect(tone).connect(fb).connect(delay);
        tone.connect(wet).connect(master);
        Object.assign(this, { ctx, master, echo: delay });
      } catch (e) { /* sin audio */ }
    }
    // En iPhone el audio queda "interrupted" tras una llamada o al volver de segundo plano.
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  },

  get on() { return Boolean(this.settings().sound && this.ctx); },

  // Una nota con varios parciales (relación de frecuencia, volumen) y envolvente percusiva.
  tone({ f, at = 0, dur = 0.35, type = 'sine', vol = 0.25, attack = 0.004, partials = [[1, 1]], echo = 0, glide = 0 }) {
    if (!this.on) return;
    const ctx = this.ctx, t = ctx.currentTime + at;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master);
    if (echo) { const s = ctx.createGain(); s.gain.value = echo; g.connect(s).connect(this.echo); }
    partials.forEach(([ratio, amp]) => {
      const o = ctx.createOscillator(), pg = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f * ratio, t);
      if (glide) o.frequency.exponentialRampToValueAtTime(f * ratio * glide, t + dur * 0.6);
      pg.gain.value = amp;
      // Los parciales agudos se apagan antes, como en un instrumento real.
      if (ratio > 1.5) { pg.gain.setValueAtTime(amp, t); pg.gain.exponentialRampToValueAtTime(0.0001, t + dur / Math.min(ratio, 4)); }
      o.connect(pg).connect(g);
      o.start(t); o.stop(t + dur + 0.05);
    });
  },

  // Ruido filtrado que barre de una frecuencia a otra (soplido de subida o bajada).
  whoosh({ at = 0, dur = 0.35, from = 400, to = 3000, vol = 0.12 } = {}) {
    if (!this.on) return;
    const ctx = this.ctx, t = ctx.currentTime + at;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur);
  },

  marimba(n, at = 0, vol = 0.3) { this.tone({ f: NOTE(n), at, dur: 0.32, vol, partials: [[1, 1], [4, 0.18], [10, 0.05]] }); },
  pluck(n, at = 0, vol = 0.2, echo = 0.5) { this.tone({ f: NOTE(n), at, dur: 0.5, type: 'triangle', vol, partials: [[1, 1], [2, 0.3]], echo }); },

  /* ---- Sonidos de la clase ---- */
  // Cuenta atrás 3, 2, 1: marimba que sube.
  tick(sec) { this.marimba({ 3: 76, 2: 79, 1: 81 }[sec] || 76); },
  // Salida: acorde brillante arpegiado y un soplido de subida.
  go() { [72, 76, 79, 84].forEach((n, i) => this.pluck(n, i * 0.045, 0.16)); this.whoosh({ dur: 0.3, from: 600, to: 4000, vol: 0.06 }); },
  // Campana de boxeo: parciales inarmónicos con cola larga, tres toques.
  bell() {
    [0, 0.3, 0.6].forEach(at => this.tone({ f: 980, at, dur: 1.6, vol: 0.26, partials: [[1, 1], [2.32, 0.5], [4.25, 0.28], [6.63, 0.14]], echo: 0.25 }));
  },
  // Cambio de combinación: dos notas rápidas con eco.
  change() { this.pluck(81, 0, 0.18); this.pluck(88, 0.08, 0.18); },
  // Últimos 10 segundos: dos golpes secos de caja china.
  warn10() { [0, 0.16].forEach(at => this.tone({ f: 1500, at, dur: 0.07, type: 'triangle', vol: 0.22, partials: [[1, 1], [2.7, 0.3]] })); },
  // Cambio de lado: nota que sube y otra que baja.
  side() { this.tone({ f: NOTE(74), dur: 0.28, type: 'triangle', vol: 0.2, glide: 1.5, echo: 0.3 }); this.tone({ f: NOTE(81), at: 0.18, dur: 0.32, type: 'triangle', vol: 0.18, glide: 0.67, echo: 0.3 }); },
  // Ráfaga final: arpegio rápido hacia arriba con subida de ruido.
  burst() { [69, 72, 76, 79, 81, 84, 88].forEach((n, i) => this.pluck(n, i * 0.055, 0.14, 0.3)); this.whoosh({ dur: 0.45, from: 300, to: 6000, vol: 0.09 }); },
  // Fin de bloque: tres notas que resuelven.
  block() { [[88, 0], [84, 0.12], [79, 0.24]].forEach(([n, at]) => this.marimba(n, at, 0.24)); this.tone({ f: NOTE(67), at: 0.24, dur: 1.2, vol: 0.12, partials: [[1, 1], [2, 0.2]], echo: 0.4 }); },
  // Clase terminada: fanfarria corta.
  fanfare() {
    [60, 64, 67, 72].forEach((n, i) => this.pluck(n, i * 0.09, 0.2, 0.4));
    [72, 76, 79, 84].forEach(n => this.tone({ f: NOTE(n), at: 0.4, dur: 1.8, type: 'triangle', vol: 0.09, partials: [[1, 1], [2, 0.25]], echo: 0.5 }));
    [96, 100, 103].forEach((n, i) => this.tone({ f: NOTE(n), at: 0.5 + i * 0.07, dur: 0.4, vol: 0.05, echo: 0.6 }));
  },
  // Racha: brillo que sube y un golpe grave.
  streak() {
    this.tone({ f: NOTE(43), dur: 0.5, vol: 0.3, glide: 0.7 });
    [79, 83, 86, 91, 95].forEach((n, i) => this.tone({ f: NOTE(n), at: 0.1 + i * 0.07, dur: 0.6, vol: 0.08, partials: [[1, 1], [3, 0.1]], echo: 0.6 }));
  },
  // Compatibilidad: un pitido suave.
  beep(freq = 880, ms = 150, vol = 0.2) { this.tone({ f: freq, dur: ms / 1000 + 0.1, vol, partials: [[1, 1], [2, 0.2]] }); },

  /* ---- Voz ---- */
  spanishVoices() {
    if (!('speechSynthesis' in window)) return [];
    return speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('es'));
  },
  // Elige la voz configurada o, si no, la más natural disponible (las "neural/natural/online" suenan mucho menos robóticas).
  bestVoice() {
    const list = this.spanishVoices();
    const want = this.settings().voiceName;
    if (want) { const v = list.find(x => x.name === want); if (v) return v; }
    const score = v => (v.lang.replace('_', '-').toLowerCase() === 'es-es' ? 4 : 0)
      + (/natural|neural|online|premium|enhanced|mejorad/i.test(v.name) ? 6 : 0)
      + (/google/i.test(v.name) ? 3 : 0) + (v.localService ? 0 : 1) - (/compact|espeak/i.test(v.name) ? 5 : 0);
    return list.slice().sort((a, b) => score(b) - score(a))[0] || null;
  },
  nativeVoice() { try { return Boolean(NATIVE && NATIVE.ttsAvailable()); } catch (e) { return false; } },
  hush() {
    if (NATIVE) { try { NATIVE.stopSpeaking(); } catch (e) { /* sin voz */ } }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  },
  say(text, { interrupt = true } = {}) {
    if (!this.settings().voice) return;
    if (this.nativeVoice()) { NATIVE.speak(String(text), interrupt); return; }
    if (!('speechSynthesis' in window)) return;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = this.bestVoice();
    u.lang = v ? v.lang : 'es-ES'; if (v) u.voice = v;
    u.rate = 1; u.pitch = 1;
    speechSynthesis.speak(u);
  },
  vibrate(p) {
    if (!this.settings().vibrate) return;
    if (NATIVE) { try { NATIVE.vibrate([].concat(p).join(',')); } catch (e) { /* sin vibración */ } return; }
    if (navigator.vibrate) navigator.vibrate(p);
  },
};
