'use strict';
/* Modo clase guiada: cronómetro, avisos y pantalla de la clase.
   Depende de: data.js (THEMES, comboToText, comboToSpeech), planner.js (Planner), sounds.js (Alerts)
   y de las funciones que le pasa app.js en Player.init(). */

const PREP_MS = 5000;
// Consigna corta del saco según el tema del día (la explicación completa está en el detalle de la clase).
const THEME_PILL = { tecnica: 'Vuelve a guardia', potencia: 'Gira la cadera', velocidad: 'Suelta y recoge', defensa: 'Sal del centro', resistencia: 'Respira en cada golpe' };
const RING_R = 92, RING_C = 2 * Math.PI * RING_R;
const niceName = n => String(n).replace(/ · asalto (\d+)\/(\d+)/, ', asalto $1 de $2');
// Nombre con la serie, para los ejercicios que se repiten en el calentamiento ("Plancha, serie 2 de 3").
const stepLabel = st => niceName(st.name) + (st.set ? `, serie ${st.set.replace('/', ' de ')}` : '');
const PART_LABEL = { circuito: 'Circuito', core: 'Core', sombra: 'Sombra' };
// "10-12 por brazo" → ["10-12", "por brazo"]; "30-40 s" → ["30-40", "s"]. Para enseñar las repeticiones en grande.
const splitRx = rx => { const m = String(rx).match(/^([\d\-–× ]*\d)\s*(.*)$/); return m ? [m[1], m[2] || 'reps'] : [String(rx), '']; };
const isReps = st => st && st.kind === 'reps';
const firstSentence = s => { const m = String(s).match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(s)).trim(); };

const Player = {
  // phase: gate (esperando a que pulses), prep (cuenta atrás de 5 s), run, pause, done
  key: null, rhythm: 'normal', steps: [], idx: 0, remaining: 0, endAt: 0, prepEnd: 0, phase: 'gate',
  timer: null, lastSec: null, lastCombo: -1, halfDone: false, wakeLock: null, els: {}, lastTickAt: 0, confirming: false,
  // Fuerza: cuándo acabó la serie anterior (para contar el descanso hacia arriba) y si ya sonó el aviso.
  restFrom: null, restChimed: false,
  hooks: { theme: () => THEMES[0], onProgress: () => {}, onComplete: () => {}, onClose: () => {}, onRate: () => {}, finishExtra: () => '' },

  init(hooks) { Object.assign(this.hooks, hooks); },
  get step() { return this.steps[this.idx]; },
  root() { return document.getElementById('player'); },

  open(key, steps, idx = 0, remaining = null) {
    this.key = key; this.steps = steps;
    this.idx = Math.min(Math.max(0, idx), steps.length - 1);
    this.loadStep(remaining);
    this.phase = 'gate';
    this.root().hidden = false;
    document.body.classList.add('playing');
    this.renderStep();
  },

  close() {
    this.stopTimer();
    this.hideConfirm();
    if (this.phase === 'run') this.remaining = Math.max(0, this.endAt - performance.now());
    if (this.phase !== 'done') this.hooks.onProgress({ key: this.key, idx: this.idx, remaining: this.remaining });
    this.phase = 'gate';
    this.root().hidden = true;
    document.body.classList.remove('playing');
    this.releaseWake();
    Alerts.hush();
    this.hooks.onClose();
  },

  // La X pide confirmación si la clase está corriendo (con guantes es fácil tocarla sin querer).
  requestClose() {
    if (this.phase !== 'run' && this.phase !== 'prep') { this.close(); return; }
    this.wasRunning = this.phase === 'run';
    this.pause();
    this.confirming = true;
    const c = document.createElement('div');
    c.className = 'exit-confirm'; c.setAttribute('role', 'alertdialog'); c.setAttribute('aria-label', '¿Salir de la clase?');
    c.innerHTML = `<p>Clase en pausa. Si sales, tu progreso se guarda y podrás continuar.</p>
      <button class="btn secondary" data-pact="stay">Seguir</button><button class="btn primary" data-pact="exit">Salir</button>`;
    this.root().querySelector('.controls').appendChild(c);
    c.querySelector('[data-pact=stay]').focus();
  },
  hideConfirm() { this.confirming = false; const c = this.root().querySelector('.exit-confirm'); if (c) c.remove(); },
  stay() { this.hideConfirm(); if (this.wasRunning) this.run(false); },

  loadStep(remaining = null) {
    const st = this.step;
    this.remaining = remaining != null && remaining > 0 && remaining <= st.dur * 1000 ? remaining : st.dur * 1000;
    this.lastSec = null; this.lastCombo = -1;
    this.halfDone = this.remaining <= st.dur * 500;
  },

  /* ---- Controles ---- */
  primary() {
    Alerts.unlock();
    this.requestWake();
    // Fuerza: sin cuenta atrás. El botón marca la serie como hecha y pasa a la siguiente.
    if (isReps(this.step) && this.phase === 'gate') this.run(true);
    else if (isReps(this.step) && this.phase === 'run') this.setDone();
    else if (this.phase === 'gate') this.startPrep();
    else if (this.phase === 'prep') this.run(true);
    else if (this.phase === 'run') this.pause();
    else if (this.phase === 'pause') this.run(false);
  },

  startPrep() {
    this.phase = 'prep';
    this.prepEnd = performance.now() + PREP_MS;
    this.lastSec = null;
    Alerts.say(`Prepárate. ${speakName(this.step)}`);
    this.startTimer();
    this.updateControls(); this.updateTime();
  },

  run(announce) {
    this.phase = 'run';
    this.endAt = performance.now() + this.remaining;
    if (announce) { Alerts.go(); this.announce(); }
    this.startTimer();
    this.updateControls(); this.updateTime();
  },

  pause() {
    if (this.phase === 'run') this.remaining = Math.max(0, this.endAt - performance.now());
    this.phase = this.phase === 'prep' ? 'gate' : 'pause';
    this.stopTimer();
    Alerts.hush();
    this.hooks.onProgress({ key: this.key, idx: this.idx, remaining: this.remaining });
    this.updateControls(); this.updateTime();
  },

  skip(dir) {
    const wasRunning = this.phase === 'run';
    this.stopTimer();
    this.hideConfirm();
    this.idx = Math.max(0, Math.min(this.steps.length - 1, this.idx + dir));
    this.restFrom = null;
    this.loadStep();
    this.renderStep();
    this.hooks.onProgress({ key: this.key, idx: this.idx, remaining: this.remaining });
    if (wasRunning) this.run(true); else { this.phase = this.phase === 'pause' ? 'pause' : 'gate'; this.updateControls(); this.updateTime(); }
  },

  startTimer() { clearInterval(this.timer); this.lastTickAt = performance.now(); this.timer = setInterval(() => this.tick(), 200); this.tick(); },
  stopTimer() { clearInterval(this.timer); this.timer = null; },

  // Serie hecha: suena un aviso corto y empieza a contar el descanso (sin pasar solo a la siguiente).
  setDone() {
    const st = this.step;
    const last = this.idx >= this.steps.length - 1;
    if (last) { Alerts.bell(); this.complete(); return; }
    const newBlock = this.steps[this.idx + 1].block !== st.block;
    this.idx++;
    this.loadStep();
    this.hooks.onProgress({ key: this.key, idx: this.idx, remaining: this.remaining });
    if (newBlock) {
      Alerts.block(); Alerts.vibrate([200, 100, 200]);
      this.phase = 'gate'; this.stopTimer(); this.restFrom = null;
      Alerts.say(`Bloque terminado. Siguiente: ${this.step.block}.`);
      this.renderStep();
      return;
    }
    Alerts.change(); Alerts.vibrate(80);
    this.restFrom = performance.now(); this.restChimed = false;
    this.renderStep();
    Alerts.say(`Hecho. Descansa. Luego, ${speakName(this.step)}`);
  },

  tickReps(now) {
    if (this.restFrom != null && !this.restChimed) {
      const prev = this.steps[this.idx - 1];
      const target = (prev && prev.rest) || 60;
      if (now - this.restFrom >= target * 1000) {
        this.restChimed = true;
        Alerts.go(); Alerts.vibrate([120, 80, 120]);
        Alerts.say(`Descanso cumplido. Cuando quieras: ${speakName(this.step)}`);
      }
    }
    this.updateTime();
  },

  announce() {
    const st = this.step;
    if (isReps(st)) { if (this.restFrom == null) Alerts.say(`${speakName(st)}. ${st.rx}.`); return; }
    if (st.kind === 'rest') {
      const nx = this.steps[this.idx + 1];
      Alerts.say(`Descanso. Después, ${nx ? speakName(nx) : 'fin'}`);
    } else if (!st.combos) {
      Alerts.say(speakName(st));
    }
    // Los asaltos con combinaciones se anuncian en tick() junto con la primera combinación.
  },

  /* ---- Reloj ---- */
  tick() {
    const now = performance.now();
    const gap = now - this.lastTickAt;
    this.lastTickAt = now;
    if (this.phase === 'prep') {
      const sec = Math.ceil((this.prepEnd - now) / 1000);
      if (sec !== this.lastSec) { this.lastSec = sec; if (sec > 0 && sec <= 3) Alerts.tick(sec); }
      if (now >= this.prepEnd) { this.lastSec = null; this.run(true); return; }
      this.updateTime();
      return;
    }
    if (this.phase !== 'run') return;
    if (isReps(this.step)) { this.tickReps(now); return; }

    // Si la app estuvo en segundo plano puede haber pasado más de un paso: se encadenan
    // usando el endAt anterior para no acumular desfase, y solo suena el primer aviso.
    let first = true, skipped = 0;
    while (this.phase === 'run' && now >= this.endAt) {
      if (!this.finishStep(first)) { if (gap > 2500) this.showBgNotice(gap, skipped + 1); return; }
      first = false; skipped++;
    }
    if (!first) this.announce();
    if (gap > 2500) this.showBgNotice(gap, skipped);

    const st = this.step;
    this.remaining = Math.max(0, this.endAt - now);
    const sec = Math.ceil(this.remaining / 1000);
    const elapsed = st.dur * 1000 - this.remaining;

    if (st.combos) {
      const seg = Math.min(st.combos.length - 1, Math.floor(elapsed / (st.dur * 1000 / st.combos.length)));
      if (seg !== this.lastCombo) {
        const startOfRound = this.lastCombo === -1 && seg === 0;
        this.lastCombo = seg;
        if (!startOfRound) { Alerts.change(); Alerts.vibrate(80); }
        Alerts.say((startOfRound ? `${speakName(st)}. ` : 'Cambio. ') + comboToSpeech(st.combos[seg]));
        this.renderCombos();
      }
    }
    if (st.burst && st.combos && sec === 20 && this.lastSec !== 20) {
      Alerts.burst();
      Alerts.vibrate([80, 60, 80, 60, 80]);
      Alerts.say('¡Ráfaga final! Todo lo que tengas', { interrupt: true });
    }
    if (st.sides && !this.halfDone && elapsed >= st.dur * 500) {
      this.halfDone = true;
      Alerts.side(); Alerts.vibrate([100, 60, 100]); Alerts.say('Cambia de lado');
      this.flashSide();
    }
    if (sec !== this.lastSec) {
      this.lastSec = sec;
      if (st.kind === 'work' && st.dur >= 30 && sec === 10) Alerts.warn10();
      if (sec <= 3 && sec > 0) Alerts.tick(sec);
    }
    this.updateTime();
  },

  // Devuelve true si la clase sigue corriendo en el mismo bloque.
  finishStep(withAlerts) {
    const st = this.step;
    const prevEnd = this.endAt;
    const last = this.idx >= this.steps.length - 1;
    const newBlock = !last && this.steps[this.idx + 1].block !== st.block;
    if (withAlerts && !last) {
      if (newBlock) { Alerts.block(); Alerts.vibrate([200, 100, 200]); }
      else if (st.kind === 'work') { Alerts.bell(); Alerts.vibrate([300, 100, 300]); }
      else { Alerts.go(); Alerts.vibrate(200); }
    }
    if (last) { this.complete(); return false; }
    this.idx++;
    this.loadStep();
    this.hooks.onProgress({ key: this.key, idx: this.idx, remaining: this.remaining });
    if (newBlock) {
      // Pausa entre bloques: ponerse los guantes, beber agua...
      this.phase = 'gate';
      this.stopTimer();
      Alerts.say(`Bloque terminado. Siguiente: ${this.step.block}.`);
      this.renderStep();
      return false;
    }
    this.endAt = prevEnd + this.remaining;
    this.renderStep();
    return true;
  },

  showBgNotice(gap, skipped) {
    const n = this.root().querySelector('#p-notice');
    if (!n) return;
    const s = Math.round(gap / 1000);
    n.innerHTML = `${ICONS.info}<p>La app estuvo en segundo plano unos ${s} s. El reloj ha seguido${skipped > 0 ? ` y ha avanzado ${skipped} ${skipped === 1 ? 'paso' : 'pasos'}` : ''}, pero los avisos de ese rato pueden no haber sonado.</p><button class="btn text" data-pact="notice-ok">Entendido</button>`;
    n.hidden = false;
  },

  flashSide() {
    const f = this.root().querySelector('#p-side');
    if (!f) return;
    f.hidden = false;
    clearTimeout(this.sideTimer);
    this.sideTimer = setTimeout(() => { f.hidden = true; }, 3500);
  },

  complete() {
    this.stopTimer();
    this.phase = 'done';
    this.releaseWake();
    this.hooks.onComplete(this.key);
    const extra = this.hooks.finishExtra(this.key) || '';
    Alerts.fanfare();
    if (extra) setTimeout(() => Alerts.streak(), 900);
    Alerts.say('¡Clase terminada! Buen trabajo.');
    const mins = Math.round(Planner.totalSecs(this.steps) / 60);
    const rpe = ['Muy fácil', 'Fácil', 'Justa', 'Dura', 'Al límite'];
    this.root().querySelector('.stage').innerHTML = `<div class="finish">
      <p class="eyebrow">Clase completada · ${mins} min</p>
      <h2>Buen trabajo.</h2>
      ${extra}
      <div class="rate-box">
        <p class="eyebrow">¿Cómo de dura ha sido?</p>
        <div class="rpe" role="group" aria-label="Esfuerzo percibido">${rpe.map((r, i) => `<button class="chip-btn" data-rpe="${i + 1}"><b>${i + 1}</b>${r}</button>`).join('')}</div>
        <p class="muted small rpe-msg" aria-live="polite">Tu respuesta sirve para sugerirte cuándo cambiar de nivel.</p>
      </div>
      <button class="btn primary big" data-pact="close">Volver al inicio</button></div>`;
    this.root().querySelector('.controls').hidden = true;
  },

  rate(n) {
    this.hooks.onRate(this.key, n);
    this.root().querySelectorAll('[data-rpe]').forEach(b => { const on = Number(b.dataset.rpe) === n; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    this.root().querySelector('.rpe-msg').textContent = 'Guardado. Lo uso para sugerirte cuándo subir o bajar de nivel.';
  },

  /* ---- Pantalla ---- */
  blocks() {
    const out = [];
    this.steps.forEach((s, i) => {
      let b = out[out.length - 1];
      if (!b || b.name !== s.block) { b = { name: s.block, start: i, secs: 0, rounds: 0 }; out.push(b); }
      b.secs += s.dur; if (s.kind === 'work' || s.kind === 'reps') b.rounds++;
    });
    return out;
  },

  renderStep() {
    const st = this.step;
    const nx = this.steps[this.idx + 1];
    const th = this.hooks.theme(this.key);
    const blocks = this.blocks();
    const cur = Math.max(0, blocks.map(b => b.start <= this.idx).lastIndexOf(true));
    const r = this.root();
    r.querySelector('.controls').hidden = false;
    this.hideConfirm();
    const round = (st.name.match(/asalto (\d+)\/(\d+)/) || []);
    const sub = round.length ? `Asalto ${round[1]} de ${round[2]}` : st.set ? `Serie ${st.set.replace('/', ' de ')}` : st.block;
    const reps = isReps(st);
    const isRest = st.kind === 'rest';
    const after = nx && nx.kind === 'rest' ? this.steps[this.idx + 2] : null;
    const nextRight = nx && isReps(nx) ? esc(nx.rx) : nx ? `${fmtTime(nx.dur)}${after ? ` · luego ${after.combos ? esc(after.combos[0]) : esc(after.name.split(' · ')[0])}` : ''}` : '';
    r.querySelector('.stage').innerHTML = `
      <div class="p-top">
        <div class="p-top-row"><span class="p-theme" style="color:${th.color}">${esc(th.n)}</span>${this.rhythm && this.rhythm !== 'normal' ? `<span class="tag rhythm-tag ${this.rhythm}"><span class="dot"></span>${Planner.RHYTHMS[this.rhythm].n}</span>` : ''}
          <span class="p-count" aria-label="Bloque ${cur + 1} de ${blocks.length}">${pad(cur + 1)} / ${pad(blocks.length)}</span>
          <button class="p-close" data-pact="close" aria-label="Salir de la clase">${ICONS.close}</button></div>
        <div class="segbar" aria-hidden="true">${blocks.map((b, i) => `<i class="${i < cur ? 'past' : ''}" style="flex:${b.secs}">${i === cur ? '<b id="p-seg"></b>' : ''}</i>`).join('')}</div>
      </div>
      <div class="screen ${st.kind}" id="p-screen">
        <div class="ring" id="p-ring">
          <svg viewBox="0 0 200 200" aria-hidden="true"><defs>
            <linearGradient id="rg-work" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fec8e"/><stop offset="1" stop-color="#c9f27a"/></linearGradient>
            <linearGradient id="rg-rest" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#7dd3fc"/></linearGradient></defs>
            <circle class="track" cx="100" cy="100" r="${RING_R}"/>
            <circle class="arc" id="p-arc" cx="100" cy="100" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${RING_C.toFixed(1)}"/>
            <g id="p-head"><circle class="head" cx="${100 + RING_R}" cy="100" r="7"/></g></svg>
          <div class="ring-in">
            <div class="kind" id="p-kind"></div>
            <div class="time${reps ? ' reps' : ''}" id="p-time" role="timer" aria-live="off"></div>${reps ? `<div class="rx-unit">${esc(splitRx(st.rx)[1])}</div>` : ''}
            <div class="block-name">${esc(sub)}</div>
          </div></div>
      </div>
      <div class="info">
        <div id="p-combos"></div>
        <div class="side-flash" id="p-side" hidden role="alert">${ICONS.swap}Cambia de lado</div>
        ${st.combos ? '' : `<div class="ex-card"><div class="ex-picto">${pictoSVG(isRest ? (nx ? nx.id : 'respira') : st.id, { size: 104, title: isRest && nx ? nx.name : st.name })}</div>
          <div class="ex-text"><p class="ex-label">${isRest ? 'Descanso · prepárate para' : reps ? `Fuerza · serie ${st.set.replace('/', ' de ')}` : PART_LABEL[st.part] ? `Ahora · ${PART_LABEL[st.part]}` : 'Ahora'}</p>
          <h2 class="ex">${esc(niceName(isRest && nx ? nx.name : st.name))}</h2>
          ${reps ? `<p class="ex-load">${esc(st.rx)} · ${esc(st.load)}</p>` : ''}
          <p class="cue">${esc(firstSentence(isRest ? 'Respira hondo y bebe agua.' : st.cue))}</p>
          ${st.sides && !isRest ? `<span class="side-note">${ICONS.swap}A mitad de tiempo, cambia de lado</span>` : ''}</div></div>`}
        <div class="gate" id="p-gate" hidden></div>
        <div class="next"><div class="n-body"><span class="eyebrow">A continuación</span><b>${nx ? esc(stepLabel(nx)) : 'Fin de la clase'}</b></div>${nextRight ? `<span class="n-right">${nextRight}</span>` : ''}</div>
      </div>
      <div class="bg-notice" id="p-notice" hidden role="status"></div>`;
    this.els = {
      screen: r.querySelector('#p-screen'), arc: r.querySelector('#p-arc'), head: r.querySelector('#p-head'), time: r.querySelector('#p-time'),
      kind: r.querySelector('#p-kind'), seg: r.querySelector('#p-seg'), combos: r.querySelector('#p-combos'), gate: r.querySelector('#p-gate'),
      blockStart: blocks[cur] ? blocks[cur].start : 0, blockSecs: blocks[cur] ? blocks[cur].secs : 1,
    };
    document.getElementById('live').textContent = `${st.block}: ${stepLabel(st)}, ${fmtTime(st.dur)}`;
    this.renderCombos();
    this.updateControls();
    this.updateTime();
  },

  renderCombos() {
    const st = this.step;
    if (!st.combos) { this.els.combos.innerHTML = ''; return; }
    const seg = Math.max(0, this.lastCombo);
    const c = st.combos[seg];
    const simple = /^\d+(-\d+)*$/.test(c);
    const big = simple ? c.split('-').map(esc).join('<span class="sep" aria-hidden="true"></span>') : esc(c);
    const th = this.hooks.theme(this.key);
    const nextC = st.combos[seg + 1];
    this.els.combos.innerHTML = `<div class="combo-now">
        <div class="combo-head"><span class="eyebrow">Combinación actual</span><span class="combo-dots" aria-label="Combinación ${seg + 1} de ${st.combos.length}">${st.combos.map((_, i) => `<i class="${i === seg ? 'on' : i < seg ? 'past' : ''}"></i>`).join('')}</span></div>
        <div class="combo${simple && c.length <= 9 ? '' : ' long'}" aria-label="${esc(c)}">${big}</div>
        <div class="combo-words">${esc(comboToText(c))}</div>
        <span class="pill cue-pill"><span class="dot"></span>${esc(THEME_PILL[th.id] || 'Vuelve a guardia')}</span>
        ${nextC ? `<p class="small muted">Después: <b class="num">${esc(nextC)}</b></p>` : ''}
      </div>`;
  },

  updateTime() {
    const st = this.step, e = this.els;
    if (!e.time) return;
    if (isReps(st)) { this.updateReps(); return; }
    const prep = this.phase === 'prep';
    const shown = prep ? Math.max(0, this.prepEnd - performance.now()) : this.remaining;
    const pct = Math.min(1, Math.max(0, prep ? 1 - shown / PREP_MS : 1 - this.remaining / (st.dur * 1000)));
    const warn = !prep && this.phase === 'run' && st.kind === 'work' && this.remaining <= 10000;
    const burst = Boolean(!prep && st.burst && st.combos && this.remaining <= 20000 && this.phase === 'run');
    e.time.textContent = fmtTime(Math.ceil(shown / 1000));
    const label = this.phase === 'gate' ? 'Listo' : this.phase === 'pause' ? 'En pausa' : prep ? 'Prepárate'
      : burst ? '¡Ráfaga!' : warn ? 'Últimos 10 s' : st.kind === 'rest' ? 'Descanso' : 'En marcha';
    e.kind.textContent = label;
    e.screen.classList.toggle('prep', prep);
    e.screen.classList.toggle('warn', warn && !burst);
    e.screen.classList.toggle('burst', burst);
    e.screen.classList.toggle('gate', this.phase === 'gate');
    e.screen.classList.toggle('paused', this.phase === 'pause');
    e.arc.setAttribute('stroke-dashoffset', (RING_C * (1 - pct)).toFixed(1));
    e.head.setAttribute('transform', `rotate(${(pct * 360).toFixed(1)} 100 100)`);
    const inBlock = Planner.totalSecs(this.steps.slice(e.blockStart, this.idx)) + (st.dur - this.remaining / 1000);
    if (e.seg) e.seg.style.width = `${Math.min(100, (inBlock / e.blockSecs) * 100)}%`;
  },

  // Fuerza: en grande las repeticiones; el anillo y la etiqueta muestran el descanso que llevas.
  updateReps() {
    const st = this.step, e = this.els;
    const prev = this.steps[this.idx - 1];
    const target = ((prev && prev.rest) || 60) * 1000;
    const resting = this.restFrom != null && this.phase === 'run';
    const elapsed = resting ? performance.now() - this.restFrom : 0;
    const pct = resting ? Math.min(1, elapsed / target) : this.phase === 'run' ? 1 : 0;
    e.time.textContent = splitRx(st.rx)[0];
    e.kind.textContent = this.phase === 'gate' ? 'Listo' : this.phase === 'pause' ? 'En pausa'
      : resting && elapsed < target ? `Descanso ${fmtTime(Math.floor(elapsed / 1000))} de ${fmtTime(target / 1000)}`
        : resting ? `Descanso ${fmtTime(Math.floor(elapsed / 1000))} · cuando quieras` : 'A tu ritmo';
    e.screen.classList.toggle('rest', resting && elapsed < target);
    e.screen.classList.toggle('gate', this.phase === 'gate');
    e.screen.classList.toggle('paused', this.phase === 'pause');
    ['prep', 'warn', 'burst'].forEach(c => e.screen.classList.remove(c));
    e.arc.setAttribute('stroke-dashoffset', (RING_C * (1 - pct)).toFixed(1));
    e.head.setAttribute('transform', `rotate(${(pct * 360).toFixed(1)} 100 100)`);
    if (e.seg) e.seg.style.width = `${Math.min(100, ((this.idx - e.blockStart) / Math.max(1, this.blocks().find(b => b.start === e.blockStart).rounds)) * 100)}%`;
  },

  updateControls() {
    const btn = document.getElementById('pplay');
    const first = this.idx === 0 && this.remaining === this.step.dur * 1000;
    const reps = isReps(this.step);
    const labels = { gate: first ? 'Empezar sesión' : 'Empezar bloque', prep: 'Ya', run: reps ? 'Serie hecha' : 'Pausar sesión', pause: 'Seguir', done: '' };
    btn.innerHTML = `${reps && this.phase === 'run' ? ICONS.check : this.phase === 'run' ? ICONS.pause : ICONS.play}<span>${labels[this.phase]}</span>`;
    btn.setAttribute('aria-label', labels[this.phase]);
    btn.classList.toggle('pausing', this.phase === 'run' && !reps);
    const g = this.els.gate;
    if (!g) return;
    const st = this.step;
    const showGate = this.phase === 'gate';
    g.hidden = !showGate;
    if (showGate) {
      const b = this.blocks().find(x => x.name === st.block && x.start <= this.idx) || { rounds: 0, secs: st.dur };
      const exCount = new Set(this.steps.slice(b.start).filter(x => x.block === st.block && isReps(x)).map(x => x.id)).size;
      const what = st.combos ? `${b.rounds} asaltos` : isReps(st) ? `${exCount} ejercicios · ${b.rounds} series` : `${b.rounds} ejercicios`;
      g.innerHTML = first
        ? `<span class="eyebrow">Todo listo</span><p class="g-title">${esc(st.block)}</p><p>${what} · ${Math.round(b.secs / 60)} min. Pulsa <b>Empezar</b>: tendrás 5 segundos para colocarte.</p>`
        : isReps(st)
          ? `<span class="eyebrow">Siguiente bloque</span><p class="g-title">${esc(st.block)}</p><p>${what}, unos ${Math.round(b.secs / 60)} min. Sin cuenta atrás: haz cada serie y pulsa <b>Serie hecha</b>. Contaré tu descanso.</p>`
          : `<span class="eyebrow">Siguiente bloque</span><p class="g-title">${esc(st.block)}</p><p>${what} · ${Math.round(b.secs / 60)} min.${st.block === 'Saco' ? ' Ponte los guantes.' : ' Bebe agua si lo necesitas.'} Pulsa <b>Empezar</b> cuando estés listo.</p>`;
    }
  },

  async requestWake() {
    if (window.EccoNative) { try { window.EccoNative.keepAwake(true); } catch (e) { /* sin puente */ } }
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => { this.wakeLock = null; });
      }
    } catch (e) { /* no soportado o denegado */ }
  },
  releaseWake() {
    if (window.EccoNative) { try { window.EccoNative.keepAwake(false); } catch (e) { /* sin puente */ } }
    if (this.wakeLock) { this.wakeLock.release().catch(() => {}); this.wakeLock = null; } },
};

// "Sombra · asalto 2/5" se lee mejor como "Sombra, asalto 2 de 5".
function speakName(st) { return st.name.replace(' · ', ', ').replace(/(\d+)\/(\d+)/, '$1 de $2') + (st.set && st.kind === 'reps' ? `, serie ${st.set.replace('/', ' de ')}` : ''); }
