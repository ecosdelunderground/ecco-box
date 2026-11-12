// Planificador: lógica pura (sin DOM ni almacenamiento) para poder probarla con Node.
// Genera sesiones con rotación de temas y evita repetir ejercicios de las sesiones anteriores.
(function (root) {
  'use strict';
  // En el navegador, data.js declara constantes globales (no son propiedades de window).
  const D = typeof module !== 'undefined' ? require('./data.js') : { EXERCISES, THEMES, SESSION_PRESETS, LEVELS, STRENGTH, STRENGTH_PLANS, STRENGTH_DAYS, STRENGTH_PRESETS, MODES };

  const pad = n => String(n).padStart(2, '0');
  const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  function shuffle(a, rng = Math.random) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // recent: Map id -> penalización (2 = última sesión, 1 = penúltima). Primero los no usados.
  // Con lumbar = true se evitan los ejercicios marcados lb (si no quedan bastantes, se completan con el resto).
  function pickExercises(cat, n, recent, rng, lumbar = false) {
    const pen = id => (recent.get(id) || 0) + (lumbar && lbOf(id) ? 10 : 0);
    return shuffle(D.EXERCISES[cat], rng).sort((a, b) => pen(a.id) - pen(b.id)).slice(0, n);
  }
  const LB_IDS = new Set(Object.values(D.EXERCISES).flat().filter(e => e.lb).map(e => e.id));
  const lbOf = id => LB_IDS.has(id);

  // Asaltos necesarios para que el bloque (asaltos + descansos entre ellos) dure al menos `minSecs`.
  const roundsFor = (minSecs, round, rest) => Math.max(2, Math.ceil((minSecs + rest) / (round + rest)));

  // Tres bloques: Calentamiento (circuito que se repite, core y sombra), Saco y Vuelta a la calma.
  function buildSession(theme, recent, s, rng = Math.random) {
    const p = D.SESSION_PRESETS[s.duration] || D.SESSION_PRESETS[45];
    const lv = D.LEVELS[s.level] || D.LEVELS.intermedio;
    const steps = [];
    const work = (block, ex, dur, extra = {}) => steps.push({ block, kind: 'work', id: ex.id, name: ex.n, cue: ex.c, dur, ...(ex.sides ? { sides: true } : {}), ...extra });
    const rest = (block, dur) => steps.push({ block, kind: 'rest', name: 'Descanso', cue: 'Respira hondo, bebe agua y relaja los hombros.', dur });
    const roundRest = Math.max(s.rest, lv.minRest);
    const W = 'Calentamiento';

    // 1a. Circuito corto (elevar, movilizar, activar, potenciar) que se repite 2 o 3 veces.
    const lumbar = Boolean(s.lumbar);
    const circuit = ['raise', 'mobilize', 'activate', 'potentiate'].flatMap(cat => pickExercises(cat, p.warm[cat] || 0, recent, rng, lumbar));
    for (let v = 1; v <= p.sets; v++) circuit.forEach(e => work(W, e, 40, { part: 'circuito', set: `${v}/${p.sets}` }));

    // 1b. Core, también en series, antes de golpear.
    const core = pickExercises('core', p.core, recent, rng, lumbar);
    const coreSteps = [];
    for (let v = 1; v <= p.sets; v++) core.forEach(e => coreSteps.push([e, `${v}/${p.sets}`]));
    coreSteps.forEach(([e, set], i) => {
      work(W, e, lv.core[0], { part: 'core', set });
      if (i < coreSteps.length - 1) rest(W, lv.core[1]);
    });

    const roundCombos = () => shuffle(theme.combos, rng).slice(0, 3);

    // 1c. Sombra técnica para entrar en el tema del día.
    for (let i = 1; i <= p.shadow; i++) {
      work(W, { id: 'sombra', n: `Sombra · asalto ${i}/${p.shadow}`, c: theme.tip }, s.round, { part: 'sombra', combos: roundCombos() });
      if (i < p.shadow) rest(W, Math.min(roundRest, 45));
    }

    // 2. Saco (o sombra intensa si no hay saco): al menos `bagMin` minutos.
    const label = s.bag ? 'Saco' : 'Sombra intensa';
    const bagRounds = roundsFor(p.bagMin * 60, s.round, roundRest) + lv.bag;
    for (let i = 1; i <= bagRounds; i++) {
      const cue = s.bag
        ? `${theme.tip} Repite cada combinación hasta que suene el cambio.`
        : `Sin saco: lanza cada combinación con intención, como si tuvieras delante al rival. ${theme.tip}`;
      work(label, { id: 'saco', n: `${label} · asalto ${i}/${bagRounds}`, c: cue }, s.round, { combos: roundCombos() });
      if (i < bagRounds) rest(label, roundRest);
    }

    // 3. Vuelta a la calma: estiramientos cortos.
    pickExercises('cool', p.cool, recent, rng, lumbar).forEach(e => work('Vuelta a la calma', e, 40));

    return steps;
  }

  /* ---------- Fuerza ---------- */
  const byId = id => D.STRENGTH.find(e => e.id === id);
  const kgList = v => (Array.isArray(v) ? v : []).map(Number).filter(n => n > 0).sort((a, b) => a - b);

  // Peso sugerido con el material del perfil, o null si no hay con qué hacerlo.
  function strengthLoad(ex, s) {
    if (!ex.eq.length) return { text: ex.id === 'flexlastre' ? 'Mochila con peso' : 'Peso corporal' };
    const opts = [];
    if (ex.eq.includes('m')) kgList(s.dumbbells).forEach(kg => opts.push({ kg, text: `Mancuernas de ${kg} kg` }));
    if (ex.eq.includes('r')) kgList(s.kettlebells).forEach(kg => opts.push({ kg, text: `Rusas de ${kg} kg` }));
    if (!opts.length) return null;
    opts.sort((a, b) => a.kg - b.kg);
    return ex.w === 'bajo' ? opts[0] : opts[opts.length - 1];
  }
  const fitsStrength = (ex, s) => Boolean(ex) && !(s.lumbar && ex.lb) && (!ex.bench || s.bench) && strengthLoad(ex, s) !== null;

  // Elige un ejercicio por hueco del día: el primero de la lista que encaje, o otro del mismo grupo.
  function pickStrength(day, n, s) {
    const used = new Set(), out = [];
    for (const slot of day.slots) {
      if (out.length >= n) break;
      const group = byId(slot[0]).g;
      const ex = slot.map(byId).find(e => fitsStrength(e, s) && !used.has(e.id))
        || D.STRENGTH.find(e => e.g === group && fitsStrength(e, s) && !used.has(e.id));
      if (ex) { used.add(ex.id); out.push(ex); }
    }
    return out;
  }

  // Cada serie es un paso sin cuenta atrás: se pasa al siguiente al pulsar "Serie hecha".
  // dur es solo una estimación (serie + descanso) para calcular los minutos de la clase.
  function strengthSteps(exs, sets, s) {
    const lv = D.LEVELS[s.level] || D.LEVELS.intermedio;
    const extraRest = s.level === 'principiante' ? 15 : 0;
    const steps = [];
    exs.forEach(ex => {
      const load = strengthLoad(ex, s);
      for (let v = 1; v <= sets; v++) {
        const rest = ex.rest + extraRest;
        steps.push({ block: 'Fuerza', kind: 'reps', id: ex.id, name: ex.n, cue: ex.c, rx: ex.rx, load: load.text, set: `${v}/${sets}`, rest, dur: 45 + rest });
      }
    });
    return steps;
  }

  const strengthPlan = s => D.STRENGTH_PLANS[s.plan] || D.STRENGTH_PLANS.torso4;

  function buildStrength(day, recent, s, rng = Math.random) {
    const sp = D.STRENGTH_PRESETS[s.duration] || D.STRENGTH_PRESETS[45];
    const steps = [];
    const work = (block, ex, dur) => steps.push({ block, kind: 'work', id: ex.id, name: ex.n, cue: ex.c, dur, part: 'circuito', ...(ex.sides ? { sides: true } : {}) });
    // Calentamiento corto de movilidad (siempre sin carga lumbar).
    pickExercises('raise', 1, recent, rng, true).forEach(e => work('Calentamiento', e, 60));
    pickExercises('mobilize', 3, recent, rng, true).forEach(e => work('Calentamiento', e, 40));
    pickExercises('activate', 1, recent, rng, true).forEach(e => work('Calentamiento', e, 40));
    steps.push(...strengthSteps(pickStrength(day, sp.ex, s), sp.sets, s));
    pickExercises('cool', 3, recent, rng, true).forEach(e => steps.push({ block: 'Vuelta a la calma', kind: 'work', id: e.id, name: e.n, cue: e.c, dur: 40, ...(e.sides ? { sides: true } : {}) }));
    return steps;
  }

  // Mixta: calentamiento corto con sombra, media clase de fuerza y media de saco.
  function buildMixed(theme, day, recent, s, rng = Math.random) {
    const sp = D.STRENGTH_PRESETS[s.duration] || D.STRENGTH_PRESETS[45];
    const lv = D.LEVELS[s.level] || D.LEVELS.intermedio;
    const lumbar = Boolean(s.lumbar);
    const steps = [];
    const work = (block, ex, dur, extra = {}) => steps.push({ block, kind: 'work', id: ex.id, name: ex.n, cue: ex.c, dur, ...(ex.sides ? { sides: true } : {}), ...extra });
    const roundCombos = () => shuffle(theme.combos, rng).slice(0, 3);
    const roundRest = Math.max(s.rest, lv.minRest);
    ['raise', 'mobilize', 'activate', 'potentiate'].flatMap(cat => pickExercises(cat, 1, recent, rng, lumbar)).forEach(e => work('Calentamiento', e, 40, { part: 'circuito' }));
    work('Calentamiento', { id: 'sombra', n: 'Sombra · asalto 1/1', c: theme.tip }, s.round, { part: 'sombra', combos: roundCombos() });
    steps.push(...strengthSteps(pickStrength(day, sp.mix.ex, s), 3, s));
    const label = s.bag ? 'Saco' : 'Sombra intensa';
    const minSecs = sp.mix.bagMin * 60;
    const n = roundsFor(minSecs, s.round, roundRest);
    for (let i = 1; i <= n; i++) {
      const cue = s.bag ? `${theme.tip} Repite cada combinación hasta que suene el cambio.` : `Sin saco: lanza cada combinación con intención. ${theme.tip}`;
      work(label, { id: 'saco', n: `${label} · asalto ${i}/${n}`, c: cue }, s.round, { combos: roundCombos(), minSecs });
      if (i < n) steps.push({ block: label, kind: 'rest', name: 'Descanso', cue: 'Respira hondo, bebe agua y relaja los hombros.', dur: roundRest });
    }
    pickExercises('cool', 3, recent, rng, lumbar).forEach(e => work('Vuelta a la calma', e, 40));
    return steps;
  }

  // Orden fijo de los bloques. Sirve también para reordenar clases creadas con el orden anterior
  // (core al final) sin cambiar sus ejercicios.
  const BLOCK_ORDER = ['Calentamiento', 'Core', 'Sombra', 'Fuerza', 'Saco', 'Sombra intensa', 'Acondicionamiento', 'Vuelta a la calma'];
  // Versión de la estructura de la clase: al cambiarla, los días pendientes se rehacen (los hechos no se tocan).
  const STRUCTURE = 'b3';
  function orderBlocks(steps) {
    const blocks = [];
    steps.forEach(st => {
      let b = blocks[blocks.length - 1];
      if (!b || b.name !== st.block) { b = { name: st.block, steps: [], i: blocks.length }; blocks.push(b); }
      b.steps.push(st);
    });
    const rank = b => { const r = BLOCK_ORDER.indexOf(b.name); return r < 0 ? 100 + b.i : r; };
    return blocks.slice().sort((a, b) => rank(a) - rank(b) || a.i - b.i).flatMap(b => b.steps);
  }
  const sameOrder = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  const isTrainingDay = (key, settings) => settings.days.includes(fromKey(key).getDay());
  const modeOf = s => (D.MODES[s.mode] ? s.mode : 'boxeo');
  // La firma solo crece con lo nuevo si se usa (así los perfiles de boxeo no rehacen su plan).
  const settingsSig = s => {
    const base = [STRUCTURE, s.duration, s.round, s.rest, s.bag, s.level];
    if (s.lumbar) base.push('lumbar');
    if (modeOf(s) !== 'boxeo') base.push(modeOf(s), strengthPlan(s) === D.STRENGTH_PLANS.full3 ? 'full3' : 'torso4', s.bench ? 'banco' : '', kgList(s.dumbbells).join('+'), kgList(s.kettlebells).join('+'));
    return base.join('|');
  };
  const totalSecs = steps => steps.reduce((a, st) => a + st.dur, 0);

  function previousSessions(plan, key, n) {
    return Object.keys(plan).filter(k => k < key && plan[k].steps).sort().slice(-n).map(k => plan[k]);
  }

  // Ajustes con la elección del día. Perfiles de fuerza: con saco = clase mixta, sin saco = solo fuerza.
  // Perfiles de boxeo: sin saco = los asaltos de saco pasan a sombra intensa.
  function withBagChoice(s, choice) {
    if (choice === null || choice === undefined) return s;
    if (modeOf(s) === 'boxeo') return { ...s, bag: choice };
    return { ...s, mode: choice ? 'mixto' : 'fuerza', bag: true };
  }
  // ¿Lleva saco hoy, según el perfil y la elección del día?
  const bagToday = (day, s) => {
    const eff = withBagChoice(s, day && typeof day.bagChoice === 'boolean' ? day.bagChoice : null);
    return modeOf(eff) === 'boxeo' ? Boolean(eff.bag) : modeOf(eff) === 'mixto';
  };

  // Crea (o rehace) la sesión de un día. keepTheme conserva el tema al pedir "cambiar ejercicios".
  function generateDay(plan, key, settings, { keepTheme = false, rng = Math.random } = {}) {
    const prev = previousSessions(plan, key, 2);
    const recent = new Map();
    prev.forEach((p, i) => p.steps.forEach(st => {
      if (st.id) recent.set(st.id, Math.max(recent.get(st.id) || 0, prev.length === 1 ? 2 : i + 1));
    }));
    const old = plan[key] || {};
    // Elección del día "con saco / sin saco" (se pregunta antes de cada clase y se respeta al rehacerla).
    const choice = typeof old.bagChoice === 'boolean' ? old.bagChoice : null;
    const eff = withBagChoice(settings, choice);
    const mode = modeOf(eff);
    // Tema de boxeo: el siguiente al de la última clase que tuvo uno.
    const lastBox = prev.slice().reverse().find(p => D.THEMES.some(t => t.id === p.theme));
    let themeIdx = lastBox ? (D.THEMES.findIndex(t => t.id === lastBox.theme) + 1) % D.THEMES.length : 0;
    if (keepTheme && D.THEMES.some(t => t.id === old.theme)) themeIdx = D.THEMES.findIndex(t => t.id === old.theme);
    const theme = D.THEMES[themeIdx];
    // Día de fuerza: el siguiente de la rutina, alternando los grupos.
    const days = strengthPlan(settings).days;
    const lastSplit = prev.slice().reverse().find(p => p.split && days.some(d => d.id === p.split));
    let splitIdx = lastSplit ? (days.findIndex(d => d.id === lastSplit.split) + 1) % days.length : 0;
    if (keepTheme && days.some(d => d.id === old.split)) splitIdx = days.findIndex(d => d.id === old.split);
    const day = days[splitIdx];
    let made;
    if (mode === 'fuerza') made = { theme: day.id, split: day.id, steps: buildStrength(day, recent, eff, rng) };
    else if (mode === 'mixto') made = { theme: theme.id, split: day.id, steps: buildMixed(theme, day, recent, eff, rng) };
    else made = { theme: theme.id, steps: buildSession(theme, recent, eff, rng) };
    plan[key] = {
      ...made, done: false, sig: settingsSig(settings), ...(choice !== null ? { bagChoice: choice } : {}),
      ...(old.extra ? { extra: true } : {}), ...(old.movedFrom ? { movedFrom: old.movedFrom } : {}),
    };
    return plan[key];
  }

  // Planifica `days` días desde `today`. Los días hechos no se tocan; los pendientes se rehacen
  // si cambian los ajustes o si se pide rebuild.
  function ensurePlan(plan, settings, today = new Date(), { days = 14, rebuild = false, rng } = {}) {
    for (let i = 0; i < days; i++) {
      const key = toKey(addDays(today, i));
      const day = plan[key];
      if (day && (day.done || day.moved)) continue; // hecha, o su clase se movió a otro día
      if (!isTrainingDay(key, settings) && !(day && day.extra)) { delete plan[key]; continue; }
      if (!day || rebuild || day.sig !== settingsSig(settings)) generateDay(plan, key, settings, { rng });
    }
    // Clases pendientes creadas con el orden anterior: se reordenan conservando los ejercicios.
    for (const key of Object.keys(plan)) {
      const day = plan[key];
      if (!day || day.done || !Array.isArray(day.steps)) continue;
      const ordered = orderBlocks(day.steps);
      if (!sameOrder(ordered, day.steps)) day.steps = ordered;
    }
    return plan;
  }

  // Un día está libre si no tiene clase (descanso, o su clase se movió a otro día).
  const isFree = (plan, key) => !plan[key] || !plan[key].steps || !plan[key].steps.length;

  // Días libres a los que se puede mover la clase de `from`: de hoy a `days` días vista.
  function freeDays(plan, from, today = new Date(), days = 14) {
    const out = [];
    for (let i = 0; i < days; i++) {
      const k = toKey(addDays(today, i));
      if (k !== from && isFree(plan, k)) out.push(k);
    }
    return out;
  }

  // Mueve una clase no hecha a un día libre. El día original queda marcado como "movida".
  function moveSession(plan, from, to) {
    const day = plan[from];
    if (!day || !day.steps || !day.steps.length) throw new Error('No hay clase que mover');
    if (day.done) throw new Error('La clase ya está hecha');
    if (from === to || !isFree(plan, to)) throw new Error('Ese día ya tiene clase');
    // Si ya venía movida, el día original pasa a apuntar al nuevo día (sin cadenas de avisos).
    const o = day.movedFrom && plan[day.movedFrom];
    const origin = o && o.moved === from ? day.movedFrom : from;
    plan[to] = { ...day, extra: true, movedFrom: origin };
    plan[origin] = { moved: to };
    if (origin !== from) delete plan[from];
    return plan[to];
  }

  // Ritmo elegido antes de cada clase. No cambia los ejercicios del día; solo los asaltos de saco y sus descansos.
  // El bloque de saco nunca baja de 30 minutos.
  const BAG_MIN_SECS = 30 * 60;
  const RHYTHMS = {
    light: { n: 'Light', desc: 'Más descanso entre asaltos y el saco al mínimo', restDelta: 30, bagDelta: 0, minOnly: true },
    normal: { n: 'Normal', desc: 'La clase tal como está planificada', restDelta: 0, bagDelta: 0 },
    impacto: { n: 'Impacto', desc: 'Un asalto más, menos descanso y ráfaga final', restDelta: -15, bagDelta: 1, burst: true },
  };

  function withRhythm(steps, rhythm = 'normal') {
    const r = RHYTHMS[rhythm] || RHYTHMS.normal;
    if (r === RHYTHMS.normal) return steps.map(st => ({ ...st }));
    const blocks = [];
    steps.forEach(st => {
      let b = blocks[blocks.length - 1];
      if (!b || b.name !== st.block) { b = { name: st.block, steps: [] }; blocks.push(b); }
      b.steps.push({ ...st });
    });
    for (const b of blocks) {
      if (b.name !== 'Saco' && b.name !== 'Sombra intensa') continue;
      const w = b.steps.filter(st => st.kind === 'work');
      if (!w.length) continue;
      const round = w[0].dur;
      const baseRest = (b.steps.find(st => st.kind === 'rest') || {}).dur || 60;
      const restDur = Math.min(120, Math.max(30, baseRest + r.restDelta));
      // Light: lo justo para llegar a 30 min con más descanso. Impacto: un asalto más y nunca más corto que Normal.
      const blockSecs = b.steps.reduce((a, st) => a + st.dur, 0);
      const minSecs = w[0].minSecs || BAG_MIN_SECS; // en la clase mixta el saco es más corto
      const n = r.minOnly ? roundsFor(minSecs, round, restDur)
        : Math.max(w.length + r.bagDelta, roundsFor(Math.max(minSecs, blockSecs), round, restDur));
      const list = [];
      for (let i = 0; i < n; i++) {
        const src = w[i % w.length];
        list.push({ ...src, ...(i >= w.length ? { combos: src.combos.slice().reverse() } : {}) });
      }
      b.steps = [];
      list.forEach((st, i) => {
        b.steps.push({ ...st, name: `${b.name} · asalto ${i + 1}/${n}`, ...(r.burst ? { burst: true } : {}) });
        if (i < n - 1) b.steps.push({ block: b.name, kind: 'rest', name: 'Descanso', cue: 'Respira hondo, bebe agua y relaja los hombros.', dur: restDur });
      });
    }
    return blocks.flatMap(b => b.steps);
  }

  const api = { withBagChoice, bagToday, BLOCK_ORDER, STRUCTURE, BAG_MIN_SECS, roundsFor, modeOf, strengthLoad, fitsStrength, pickStrength, buildStrength, buildMixed, strengthPlan, orderBlocks, toKey, fromKey, addDays, shuffle, buildSession, generateDay, ensurePlan, isTrainingDay, settingsSig, totalSecs, previousSessions, isFree, freeDays, moveSession, RHYTHMS, withRhythm };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Planner = api;
})(typeof self !== 'undefined' ? self : this);
