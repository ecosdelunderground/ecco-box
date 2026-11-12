'use strict';
/* Interfaz: estado guardado, vistas (Hoy, Calendario, Ajustes) y eventos.
   La lógica de planificación vive en planner.js y el modo clase en player.js. */

/* ---------- Utilidades ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const pad = n => String(n).padStart(2, '0');
const { toKey, fromKey, addDays, totalSecs } = Planner;
const todayKey = () => toKey(new Date());
const fmtTime = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const PLAN_DAYS = 14;

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICONS = {
  home: svg('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
  cal: svg('<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'),
  play: svg('<path d="M8 5l11 7-11 7z" fill="currentColor"/>'),
  pause: svg('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
  prev: svg('<path d="M18 6l-8 6 8 6zM6 6v12"/>'),
  next: svg('<path d="M6 6l8 6-8 6zM18 6v12"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  redo: svg('<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  alert: svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'),
  swap: svg('<path d="M7 7h12l-3-3M17 17H5l3 3"/>'),
  arrow: svg('<path d="M7 17L17 7M9 7h8v8"/>'),
  flame: svg('<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.3-4.8.2 1.6 1 2.6 2 3C10.8 8.6 11 5.6 12 3z" fill="currentColor" stroke="none"/><path d="M12 21a2.5 2.5 0 0 1-2.5-2.5c0-1.6 1.4-2.5 2.5-4 1.1 1.5 2.5 2.4 2.5 4A2.5 2.5 0 0 1 12 21z" fill="#fff" stroke="none" opacity=".35"/>'),
  glove: svg('<path d="M7 11V8a5 5 0 0 1 10 0v6a5 5 0 0 1-5 5H9a2 2 0 0 1-2-2v-1"/><path d="M7 11h4a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4z"/><path d="M9 21h6"/>'),
};

/* ---------- Estado persistente ---------- */
const STORE_KEY = 'ecco-box';
const SCHEMA = 2; // esquema de los datos de cada perfil
const DEFAULT_SETTINGS = {
  duration: 45, round: 120, rest: 60, bag: true, level: 'intermedio',
  days: [1, 2, 4, 5, 6], voice: true, sound: true, vibrate: true, rhythm: 'normal', voiceName: '',
  // Tipo de entreno y material (fuerza y mixto)
  mode: 'boxeo', plan: 'torso4', lumbar: false, bench: false, dumbbells: [], kettlebells: [],
};

function freshState() { return { v: SCHEMA, settings: { ...DEFAULT_SETTINGS }, plan: {}, history: [], session: null }; }

// Pesos en kg: "6, 10", "6 10" o [6, 10] → [6, 10] (sin repetidos, de 0,5 a 100 kg; decimales con punto).
function parseKg(v) {
  const list = Array.isArray(v) ? v : String(v || '').split(/[\s,;/y]+/);
  return [...new Set(list.map(Number).filter(n => n > 0 && n <= 100))].sort((a, b) => a - b);
}

// Valida y completa un estado leído (del almacenamiento o de una copia importada).
function normalize(s) {
  if (!s || typeof s !== 'object' || typeof s.plan !== 'object' || !Array.isArray(s.history)) throw new Error('Formato no válido');
  const st = freshState();
  const set = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  if (![30, 45, 60].includes(Number(set.duration))) set.duration = 45;
  if (![90, 120, 180].includes(Number(set.round))) set.round = 120;
  if (![30, 45, 60].includes(Number(set.rest))) set.rest = 60;
  if (!LEVELS[set.level]) set.level = 'intermedio';
  set.days = Array.isArray(set.days) ? set.days.map(Number).filter(d => d >= 0 && d <= 6) : DEFAULT_SETTINGS.days;
  st.settings = set;
  for (const [k, day] of Object.entries(s.plan)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !day) continue;
    if (typeof day.moved === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.moved)) st.plan[k] = { moved: day.moved };
    else if (Array.isArray(day.steps) && day.steps.every(x => x && typeof x.dur === 'number' && typeof x.name === 'string')) st.plan[k] = day;
  }
  st.history = s.history.filter(h => h && /^\d{4}-\d{2}-\d{2}$/.test(h.date));
  st.session = s.session && st.plan[s.session.key] && st.plan[s.session.key].steps ? s.session : null;
  if (!['light', 'normal', 'impacto'].includes(set.rhythm)) set.rhythm = 'normal';
  set.voiceName = typeof set.voiceName === 'string' ? set.voiceName.slice(0, 120) : '';
  if (!MODES[set.mode]) set.mode = 'boxeo';
  if (!STRENGTH_PLANS[set.plan]) set.plan = 'torso4';
  set.lumbar = Boolean(set.lumbar); set.bench = Boolean(set.bench);
  set.dumbbells = parseKg(set.dumbbells); set.kettlebells = parseKg(set.kettlebells);
  return st;
}

/* ---------- Perfiles ----------
   Cada perfil (Sonno, Lucía...) tiene sus propios ajustes, días, plan e historial.
   Se guardan juntos en STORE_KEY; `state` apunta siempre a los datos del perfil activo. */
const LEGACY_KEY = 'cb-state'; // versión anterior, de un solo perfil (se migra y se deja intacta)
const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const profiles = (Array.isArray(s.profiles) ? s.profiles : []).flatMap(p => {
        try { return [{ id: String(p.id), name: cleanName(p.name) || 'Perfil', data: normalize(p.data) }]; } catch (e) { return []; }
      });
      if (profiles.length) return { v: 3, active: profiles.some(p => p.id === s.active) ? s.active : profiles[0].id, profiles };
    }
  } catch (e) { /* datos dañados o sin almacenamiento */ }
  let data = freshState();
  try { const old = localStorage.getItem(LEGACY_KEY); if (old) data = normalize(JSON.parse(old)); } catch (e) { /* sin datos antiguos */ }
  const id = newId();
  return { v: 3, active: id, profiles: [{ id, name: 'Principal', data }] };
}

const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 24);
const activeProfile = () => store.profiles.find(p => p.id === store.active);

let saveWarned = false;
function save() {
  activeProfile().data = state;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch (e) { if (!saveWarned) { saveWarned = true; toast('No se pudo guardar el progreso en este navegador.'); } }
}

let store = loadStore();
let state = activeProfile().data;
Alerts.settings = () => state.settings;

function switchProfile(id) {
  if (!store.profiles.some(p => p.id === id)) return;
  save();
  store.active = id;
  state = activeProfile().data;
  selectedDay = todayKey(); currentTab = 'hoy'; moveFrom = null;
  ensurePlan(); renderProfileButton(); render();
}

function createProfile({ name, days, level, duration, bag, mode = 'boxeo', lumbar = false }) {
  const data = freshState();
  Object.assign(data.settings, { days, level, duration, bag, mode, lumbar });
  const id = newId();
  store.profiles.push({ id, name, data });
  switchProfile(id);
}

function deleteActiveProfile() {
  if (store.profiles.length < 2) return;
  store.profiles = store.profiles.filter(p => p.id !== store.active);
  store.active = store.profiles[0].id;
  state = activeProfile().data;
  save(); ensurePlan(); renderProfileButton(); currentTab = 'hoy'; render();
}

// Color estable por nombre, de la paleta ECCO.
const profileColor = name => THEMES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % THEMES.length].color;
const daysLabel = days => [1, 2, 3, 4, 5, 6, 0].filter(d => days.includes(d)).map(d => DAY_NAMES[d]).join(' · ');

function ensurePlan(rebuild = false) {
  // Una clase a medias solo sigue siendo válida si los pasos que ya hiciste no cambian.
  const s = state.session, before = s && state.plan[s.key] && state.plan[s.key].steps;
  Planner.ensurePlan(state.plan, state.settings, new Date(), { days: PLAN_DAYS, rebuild });
  const after = before && state.plan[s.key] && state.plan[s.key].steps;
  if (before && after !== before) {
    const same = (a, b) => a && b && a.id === b.id && a.name === b.name && a.dur === b.dur;
    if (!after || !before.slice(0, s.idx + 1).every((x, i) => same(x, after[i]))) state.session = null;
  }
  save();
}

/* ---------- Dominio ---------- */
// Tema del día: de boxeo, de fuerza o, en la clase mixta, el grupo de fuerza con las combinaciones del tema de boxeo.
function themeOf(day) {
  const box = THEMES.find(t => t.id === (day && day.theme));
  const split = day && day.split && STRENGTH_DAYS.find(d => d.id === day.split);
  if (split && box) return { ...box, n: `${split.n} y saco`, color: split.color };
  return box || split || THEMES[0];
}
const isStrengthDay = day => Boolean(day && day.split);

function markDone(key, steps = null, rhythm = null) {
  const day = state.plan[key];
  if (!day || day.done) return;
  day.done = true;
  if (state.session && state.session.key === key) state.session = null;
  state.history.push({ date: key, theme: day.theme, min: Math.round(totalSecs(steps || day.steps) / 60), ...(rhythm ? { rhythm } : {}) });
  save();
}

function unmarkDone(key) {
  const day = state.plan[key];
  if (!day) return;
  day.done = false;
  const i = state.history.map(h => h.date).lastIndexOf(key);
  if (i >= 0) state.history.splice(i, 1);
  save();
}

/* ---------- Racha (como Duolingo) ----------
   Cuenta los días de entrenamiento seguidos que has cumplido. Los días de descanso y los días cuya
   clase pasaste a otro día no la rompen, y hoy no la rompe hasta que se acaba el día. */
function isStreakBreak(k) { return Planner.isTrainingDay(k, state.settings) && !(state.plan[k] && state.plan[k].moved); }

function streak() {
  const done = new Set(state.history.map(h => h.date));
  let n = 0, d = new Date();
  if (!done.has(toKey(d))) d = addDays(d, -1);
  for (let i = 0; i < 1000; i++) {
    const k = toKey(d);
    if (done.has(k)) n++;
    else if (isStreakBreak(k)) break;
    d = addDays(d, -1);
  }
  return n;
}

function bestStreak() {
  const dates = state.history.map(h => h.date).sort();
  if (!dates.length) return 0;
  const done = new Set(dates);
  let best = 0, run = 0;
  for (let d = fromKey(dates[0]), tk = todayKey(); toKey(d) <= tk; d = addDays(d, 1)) {
    const k = toKey(d);
    if (done.has(k)) { run++; best = Math.max(best, run); } else if (k < tk && isStreakBreak(k)) run = 0;
  }
  return best;
}

// Semana actual (de lunes a domingo) con el estado de cada día.
function weekDays() {
  const now = new Date(), tk = todayKey();
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  const done = new Set(state.history.map(h => h.date));
  return Array.from({ length: 7 }, (_, i) => {
    const k = toKey(addDays(monday, i)), day = state.plan[k];
    const st = done.has(k) ? 'done' : day && day.steps && !day.done ? (k < tk ? 'miss' : 'plan') : 'rest';
    return { k, st, today: k === tk, wd: 'LMXJVSD'[i] };
  });
}

function weekHTML() {
  const labels = { done: 'hecha', plan: 'clase pendiente', rest: 'descanso', miss: 'no hecha' };
  return `<div class="week" role="list" aria-label="Esta semana">${weekDays().map(d => `<span class="wday ${d.st}${d.today ? ' today' : ''}" role="listitem" aria-label="${esc(dayTitle(d.k))}: ${labels[d.st]}${d.today ? ', hoy' : ''}"><i>${d.st === 'done' ? ICONS.check : ''}</i>${d.wd}</span>`).join('')}</div>`;
}

const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
function streakMessage(prev, now) {
  if (now <= prev) return 'Hoy ya sumaba. ¡Entrenamiento extra para la saca!';
  if (now === 1) return 'Primer día de racha. Vuelve en tu próximo día de entrenamiento para mantenerla.';
  if (MILESTONES.includes(now)) return `¡${now} días seguidos! Esto ya es un hábito de boxeador.`;
  const next = MILESTONES.find(m => m > now);
  return next ? `Sigue así: te faltan ${next - now} para llegar a ${next}.` : 'Imparable. Sigue sumando.';
}

let lastCelebration = null;
function updateBadge(n = streak()) {
  // Número en el icono de la app instalada (funciona en Windows, macOS y ChromeOS; Android no lo permite a las apps web).
  try { if ('setAppBadge' in navigator) (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {}); } catch (e) { /* sin insignia */ }
}

function renderStreakPill() {
  const n = streak(), tk = todayKey();
  const risk = n > 0 && state.plan[tk] && state.plan[tk].steps && !state.plan[tk].done;
  const b = $('#streak-pill');
  b.className = `streak-pill${n > 0 ? ' on' : ''}${risk ? ' risk' : ''}`;
  b.innerHTML = `${ICONS.flame}<span>${n}</span>`;
  b.setAttribute('aria-label', `Racha: ${n} ${n === 1 ? 'día' : 'días'}${risk ? '. Entrena hoy para mantenerla' : ''}`);
  updateBadge(n);
}

// Sugerencia de nivel a partir del esfuerzo de las 3 últimas clases valoradas. Nunca cambia el nivel sola.
function levelHint() {
  const rated = state.history.filter(h => h.rpe).slice(-3);
  if (rated.length < 3) return null;
  const avg = rated.reduce((a, h) => a + h.rpe, 0) / rated.length;
  const order = ['principiante', 'intermedio', 'avanzado'];
  const i = order.indexOf(state.settings.level);
  if (avg <= 2 && i < 2) return { to: order[i + 1], text: `Tus últimas clases te resultaron fáciles. ¿Pruebas el nivel <b>${LEVELS[order[i + 1]].n}</b>?` };
  if (avg >= 4.7 && i > 0) return { to: order[i - 1], text: `Tus últimas clases fueron al límite. Valora bajar a <b>${LEVELS[order[i - 1]].n}</b> o alargar el descanso.` };
  return null;
}

/* ---------- Vistas ---------- */
let currentTab = 'hoy';
let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let selectedDay = todayKey();
let moveFrom = null; // día cuya clase se está moviendo (muestra el selector de días)

// Lema corto de cada tema para la portada de la clase.
const THEME_COPY = {
  tecnica: ['Precisión en cada golpe', 'Encuentra tu ritmo. Mantén la guardia.'],
  potencia: ['Fuerza desde el suelo', 'Gira pie y cadera en cada golpe.'],
  velocidad: ['Manos rápidas, cabeza fría', 'Suelta y recoge sin bajar la guardia.'],
  defensa: ['Golpea y no estés', 'Mueve cabeza y pies después de cada combinación.'],
  resistencia: ['Un ritmo que no se rompe', 'Esfuerzo constante hasta la campana.'],
};
const BLOCK_GOALS = {
  'Calentamiento': 'Circuito en series, core y sombra para entrar en calor',
  'Sombra': 'Técnica y ritmo, sin impacto',
  'Saco': 'Combinaciones con potencia y ritmo',
  'Sombra intensa': 'Combinaciones con toda la intención',
  'Acondicionamiento': 'Intervalos para corazón y piernas',
  'Core': 'Estabilidad del tronco para golpear mejor',
  'Vuelta a la calma': 'Estiramientos cortos para bajar pulsaciones',
  'Fuerza': 'Series y repeticiones: pasas tú cuando acabes cada serie',
};
const themeLetter = th => th.n[0].toUpperCase();

function blocksSummary(steps) {
  const blocks = [];
  steps.forEach(st => {
    let b = blocks[blocks.length - 1];
    if (!b || b.name !== st.block) { b = { name: st.block, items: [], secs: 0 }; blocks.push(b); }
    b.secs += st.dur;
    if (st.kind !== 'work' && st.kind !== 'reps') return;
    // Las series repetidas del calentamiento se enseñan una vez, con cuántas veces se hacen.
    const same = st.set && b.items.find(it => it.id === st.id && it.set);
    if (same) same.reps++;
    else b.items.push({ ...st, reps: 1 });
  });
  return blocks;
}

function dayTitle(key) { const d = fromKey(key); return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`; }
const curRhythm = () => (Planner.RHYTHMS[state.settings.rhythm] ? state.settings.rhythm : 'normal');
// Minutos reales con el ritmo elegido por defecto (sin contar las pausas entre bloques).
const estMin = steps => Math.round(totalSecs(Planner.withRhythm(steps, curRhythm())) / 60);
const nextClassKey = () => Object.keys(state.plan).filter(k => k > todayKey() && state.plan[k].steps && !state.plan[k].done).sort()[0];

function stats3(steps) {
  const r = Planner.RHYTHMS[curRhythm()];
  const third = hasBag(steps) ? `<b class="serif">${r.n}</b><span>ritmo</span>` : `<b>${pad(steps.filter(st => st.kind === 'reps').length)}</b><span>series</span>`;
  return `<div class="stats3"><div><b>${estMin(steps)}</b><span>min aprox.</span></div><div><b>${pad(blocksSummary(steps).length)}</b><span>bloques</span></div><div>${third}</div></div>`;
}

function movePickerHTML(key) {
  const opts = Planner.freeDays(state.plan, key, new Date(), PLAN_DAYS);
  return `<div class="move-picker">
    <p class="eyebrow">¿A qué día la pasas?</p>
    ${opts.length ? `<div class="day-chips">${opts.map(k => { const d = fromKey(k); return `<button class="chip-btn" data-act="move-to" data-key="${key}" data-to="${k}" aria-label="${esc(dayTitle(k))}"><b>${d.getDate()}</b>${k === todayKey() ? 'Hoy' : DAY_NAMES[d.getDay()]}</button>`; }).join('')}</div>`
      : '<p class="muted small">No hay días libres en las próximas dos semanas.</p>'}
    <button class="btn ghost" data-act="move-cancel">Cancelar</button></div>`;
}

function sessionDetailHTML(key) {
  const day = state.plan[key];
  const tk = todayKey();
  if (day && day.moved) {
    return `<section class="card detail">
      <div class="panel-head"><h3>${dayTitle(key)}</h3><span class="tag muted-tag">${ICONS.swap}Movida</span></div>
      <p class="muted">La clase de este día se pasó al <b>${dayTitle(day.moved)}</b>.</p>
      <div class="actions"><button class="btn secondary" data-act="goto" data-key="${day.moved}">Ver ese día</button></div></section>`;
  }
  if (!day) {
    const past = key < tk;
    return `<section class="card detail">
      <div class="panel-head"><h3>${dayTitle(key)}</h3><span class="tag muted-tag">${past ? 'Sin clase' : 'Descanso'}</span></div>
      <p class="muted">${past ? 'No hubo clase planificada este día.' : 'Día de descanso. Camina, estira o descansa: la recuperación también entrena.'}</p>
      ${!past ? `<div class="actions"><button class="btn secondary" data-act="extra" data-key="${key}">Entrenar este día igualmente</button></div>` : ''}</section>`;
  }
  const th = themeOf(day);
  const missed = !day.done && key < tk;
  const resume = state.session && state.session.key === key && !day.done;
  const blocks = blocksSummary(day.steps);
  const status = day.done ? `<span class="tag ok">${ICONS.check}Hecha</span>` : missed ? '<span class="tag muted-tag">No hecha</span>'
    : resume ? '<span class="tag" style="--c:var(--yellow)">A medias</span>' : day.movedFrom ? `<span class="tag" style="--c:var(--cyan)">${ICONS.swap}Del ${esc(dayTitle(day.movedFrom).split(' de ')[0])}</span>` : '';
  return `<section class="card detail" style="--c:${th.color}">
    <div class="detail-sum">
      <div class="panel-head"><span class="pill" style="--c:${th.color}"><span class="dot"></span>${esc(th.n)}</span>${status}</div>
      <h3 class="hero-title">${dayTitle(key)}</h3>
      <p class="goal">${esc(th.tip)}</p>
      ${stats3(day.steps)}
    </div>
    ${missed ? `<div class="notice">${ICONS.info}<div class="n-body"><p>No pudiste hacerla. Pásala a otro día y no pierdes la sesión.</p></div></div>` : ''}
    ${moveFrom === key ? movePickerHTML(key) : ''}
    <div class="actions">
      ${missed ? `<button class="btn primary big" data-act="move" data-key="${key}">${ICONS.cal}Pasar a otro día</button>` : ''}
      <button class="btn ${missed ? 'secondary' : 'primary big'}" data-act="start" data-key="${key}">${ICONS.play}${resume ? 'Continuar clase' : 'Empezar clase'}</button>
      ${!day.done && !missed ? `<button class="btn secondary" data-act="move" data-key="${key}">${ICONS.cal}Cambiar de día</button>` : ''}
    </div>
    <div class="blocks">${blocks.map(b => `<details class="block"><summary><span class="b-main"><span class="b-name">${esc(b.name)}</span><span class="b-goal">${esc(b.name === 'Calentamiento' && !b.items.some(i => i.combos) ? 'Movilidad y activación antes de cargar' : BLOCK_GOALS[b.name] || '')}</span></span><span class="b-dur">${Math.round(b.secs / 60)} min</span></summary>
      <ul>${b.items.map(it => `<li><span class="li-picto">${pictoSVG(it.id, { size: 52, title: it.name })}</span>
        <span class="li-main"><span class="li-top"><span class="li-name">${esc(it.name)}</span><span class="mono">${it.reps > 1 ? `${it.reps} × ` : ''}${it.rx ? esc(it.rx) : fmtTime(it.dur)}</span></span>
        ${it.load ? `<span class="li-load">${esc(it.load)} · descanso ${fmtTime(it.rest)}</span>` : ''}${it.combos ? `<span class="combos">${it.combos.map(c => `<code>${esc(c)}</code>`).join('')}</span>` : `<button class="li-cue" data-act="cue" aria-expanded="false">${esc(it.cue)}</button>`}</span></li>`).join('')}</ul></details>`).join('')}</div>
    <div class="link-row">
      ${resume ? `<button class="btn text" data-act="restart" data-key="${key}">${ICONS.redo}Empezar de cero</button>` : ''}
      ${!day.done ? `<button class="btn text" data-act="regen" data-key="${key}">${ICONS.redo}Cambiar ejercicios</button>
        <button class="btn text" data-act="done" data-key="${key}">${ICONS.check}Marcar hecha</button>`
        : `<button class="btn text" data-act="undone" data-key="${key}">Desmarcar</button>`}
    </div></section>`;
}

function heroHTML(tk) {
  const day = state.plan[tk];
  const nk = nextClassKey();
  const nextMini = nk ? `<div class="next-mini"><span class="nm-body"><span class="eyebrow">Próxima clase · ${esc(dayTitle(nk))}</span><b>${esc(themeOf(state.plan[nk]).n)}</b><span class="small muted">${estMin(state.plan[nk].steps)} min aprox.</span></span>
      <button class="btn secondary" data-act="goto" data-key="${nk}">Ver</button></div>` : '';
  if (day && day.steps && !day.done) {
    const th = themeOf(day);
    const [motto, sub] = THEME_COPY[th.id] || [th.n, th.tip];
    const resume = state.session && state.session.key === tk;
    return { title: 'Tu sesión de hoy.', html: `<section class="card hero" style="--c:${th.color}">
      <span class="pill" style="--c:${th.color}"><span class="dot"></span>${esc(th.n)}</span>
      <h3 class="hero-title">${esc(motto)}</h3><p class="hero-sub">${esc(sub)}</p>
      ${stats3(day.steps)}
      <button class="btn primary big wide" data-act="start" data-key="${tk}">${resume ? 'Continuar sesión' : 'Empezar sesión'}<span class="arrow">${ICONS.arrow}</span></button>
      <div class="link-row"><button class="btn text" data-act="goto" data-key="${tk}">Ver ejercicios</button><button class="btn text" data-act="recover" data-key="${tk}">${ICONS.cal}Cambiar de día</button></div>
    </section>` };
  }
  if (day && day.done) {
    const h = [...state.history].reverse().find(x => x.date === tk);
    return { title: 'Sesión completada.', html: `<section class="card hero">
      <div class="panel-head"><span class="done-badge">${ICONS.check}</span><span class="tag ok">Hecha</span></div>
      <h3 class="hero-title">Hoy ya has cumplido</h3><p class="hero-sub">${h ? `${h.min} min de ${esc(themeOf(day).n.toLowerCase())}. ` : ''}Descansa y recupera: mañana más.</p>
      ${nextMini}</section>` };
  }
  if (day && day.moved) {
    return { title: 'Hoy, sin clase.', html: `<section class="card hero">
      <h3 class="hero-title">Tu clase de hoy está el ${esc(dayTitle(day.moved))}</h3><p class="hero-sub">La pasaste a otro día. Tu racha no se rompe por esto.</p>
      <button class="btn secondary wide" data-act="goto" data-key="${day.moved}">Ver ese día</button></section>` };
  }
  return { title: 'Hoy toca descanso.', html: `<section class="card hero">
    <h3 class="hero-title">Recuperar también es entrenar</h3><p class="hero-sub">Camina, estira o descansa. Los días de descanso no rompen tu racha.</p>
    ${nextMini}
    <div class="link-row"><button class="btn text" data-act="extra" data-key="${tk}">Entrenar hoy igualmente</button></div></section>` };
}

function renderHoy() {
  const tk = todayKey();
  const now = new Date();
  const weekAgo = toKey(addDays(now, -6));
  const weekMin = state.history.filter(h => h.date >= weekAgo).reduce((a, h) => a + (h.min || 0), 0);
  const hint = levelHint();
  const hero = heroHTML(tk);
  // Clases de los últimos 7 días que no se hicieron ni se movieron.
  const pending = Object.keys(state.plan).filter(k => k < tk && k >= weekAgo && state.plan[k].steps && !state.plan[k].done).sort();
  const pendingHTML = pending.length ? `<section class="notice pending" style="--c:var(--yellow)">${ICONS.info}<div class="n-body">
      <p class="n-title">${pending.length === 1 ? 'Te quedó una clase' : `Te quedaron ${pending.length} clases`}</p>
      ${pending.map(k => `<div class="pending-row"><span>${dayTitle(k)} · ${esc(themeOf(state.plan[k]).n)}</span>
        <button class="btn secondary" data-act="recover" data-key="${k}">Pasar a otro día</button></div>`).join('')}</div></section>` : '';
  // Constancia de la semana y racha.
  const week = weekDays();
  const doneWeek = week.filter(d => d.st === 'done').length;
  const target = state.settings.days.length;
  const n = streak(), best = bestStreak();
  const tday = state.plan[tk];
  const risk = n > 0 && tday && tday.steps && !tday.done;
  const sub = risk ? 'Entrena hoy para mantenerla.' : tday && tday.done ? '¡Hoy ya cuenta!' : n > 0 ? 'Hoy no toca clase: la racha sigue viva.' : 'Haz tu próxima clase para empezarla.';
  const msg = doneWeek === 0 ? 'Una buena semana empieza aquí.' : doneWeek >= target ? 'Semana completada. ¡Enhorabuena!' : `Vas bien: te ${target - doneWeek === 1 ? 'queda 1 sesión' : `quedan ${target - doneWeek} sesiones`}.`;
  return `<header class="hello"><p class="eyebrow">${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][now.getDay()]} / ${pad(now.getDate())} ${MONTHS[now.getMonth()]}</p>
      <h2 class="display">${hero.title}</h2></header>
    ${hero.html}
    ${pendingHTML}
    ${hint ? `<section class="notice" style="--c:var(--cyan)">${ICONS.info}<div class="n-body"><p class="hint">${hint.text}</p>
      <div class="actions"><button class="btn secondary" data-act="apply-level" data-level="${hint.to}">Cambiar a ${LEVELS[hint.to].n}</button></div></div></section>` : ''}
    <div class="sec-head"><h2 class="display-s">Tu semana</h2><button class="link" data-tab-go="cal">Calendario →</button></div>
    <section class="card week-card">
      <p class="eyebrow">Constancia</p>
      <div class="const-row"><p><b>${doneWeek}</b> de ${target} ${target === 1 ? 'sesión' : 'sesiones'}</p><div class="meter" role="img" aria-label="${doneWeek} de ${target}"><i style="width:${Math.min(100, Math.round(doneWeek / target * 100))}%"></i></div></div>
      ${weekHTML()}
      <div class="streak-line${n > 0 ? ' on' : ''}"><span class="flame">${ICONS.flame}</span><span class="sl-body"><span class="streak-num"><b>${n}</b> ${n === 1 ? 'día' : 'días'} de racha</span>
        <span class="streak-sub${risk ? ' risk' : ''}">${sub}${best > n ? ` Mejor: ${best}.` : ''}</span></span></div>
      <p class="small muted">${msg}</p>
    </section>
    <div class="readouts"><span class="readout"><b>${state.history.length}</b> clases en total</span><span class="readout"><b>${weekMin}</b> min en 7 días</span></div>`;
}

// Leyenda: los temas que usa este perfil.
function legendThemes() {
  const mode = state.settings.mode;
  const split = STRENGTH_PLANS[state.settings.plan].days;
  return mode === 'fuerza' ? split : mode === 'mixto' ? split.map(d => ({ ...d, n: `${d.n} y saco` })) : THEMES;
}

function renderCalendar() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // semana desde el lunes
  const daysIn = new Date(y, m + 1, 0).getDate();
  const tk = todayKey();
  const doneSet = new Set(state.history.map(h => h.date));
  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<div class="cell empty" aria-hidden="true"></div>';
  for (let d = 1; d <= daysIn; d++) {
    const key = toKey(new Date(y, m, d));
    const day = state.plan[key];
    const done = doneSet.has(key) || (day && day.done);
    const missed = day && day.steps && !done && key < tk;
    const moved = day && day.moved;
    const th = day && !moved ? themeOf(day) : null;
    const label = `${dayTitle(key)}${key === tk ? ', hoy' : ''}${moved ? `, clase movida al ${dayTitle(day.moved)}` : th ? `, ${th.n}` : ', descanso'}${done ? ', hecha' : missed && !moved ? ', no hecha' : ''}`;
    cells += `<button class="cell${key === tk ? ' today' : ''}${key === selectedDay ? ' sel' : ''}${done ? ' done' : ''}${missed ? ' missed' : ''}${!day && !done ? ' rest' : ''}" data-day="${key}" aria-label="${esc(label)}" aria-pressed="${key === selectedDay}" style="${th ? `--c:${th.color}` : ''}">
      <span class="num">${d}</span>${th ? `<span class="strip" aria-hidden="true">${themeLetter(th)}</span>` : ''}${moved ? '<span class="mv" aria-hidden="true">→</span>' : ''}${done ? `<span class="chk">${ICONS.check}</span>` : ''}</button>`;
  }
  return `<div class="cal-head">
      <button class="btn icon" data-act="month" data-dir="-1" aria-label="Mes anterior">‹</button>
      <h2 class="section-title">${MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)} <span class="mono">${y}</span></h2>
      <button class="btn icon" data-act="month" data-dir="1" aria-label="Mes siguiente">›</button></div>
    <div class="cal">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<div class="wd" aria-hidden="true">${d}</div>`).join('')}${cells}</div>
    ${sessionDetailHTML(selectedDay)}
    <section class="card legend" aria-label="Leyenda">${legendThemes().map(t => `<span style="--c:${t.color}"><i>${themeLetter(t)}</i>${esc(t.n)}</span>`).join('')}
      <span><i class="k-done">${ICONS.check}</i>Hecha</span><span><i class="k-mv">→</i>Movida</span><span><i class="k-today"></i>Hoy</span></section>
    <p class="settings-foot">El plan se prepara con ${PLAN_DAYS} días de antelación y se amplía cada día.</p>`;
}

/* ---------- Perfiles: botón de cabecera y panel ---------- */
function renderProfileButton() {
  const p = activeProfile();
  const b = $('#profile-btn');
  b.style.setProperty('--c', profileColor(p.name));
  b.innerHTML = `<span class="avatar" aria-hidden="true">${esc(p.name[0].toUpperCase())}</span><span class="pname">${esc(p.name)}</span>`;
  b.setAttribute('aria-label', `Perfil: ${p.name}. Cambiar o crear perfil`);
}

function daysPicker(name, selected) {
  return `<div class="days">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" name="${name}" value="${d}"${selected.includes(d) ? ' checked' : ''}><span>${DAY_NAMES[d]}</span></label>`).join('')}</div>`;
}

let sheetReturn = null;
function openSheet(html, labelId) {
  const sheet = $('#sheet');
  if (sheet.hidden) sheetReturn = document.activeElement;
  sheet.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="${labelId}" tabindex="-1">${html}</div>`;
  sheet.hidden = false;
  document.body.classList.add('sheet-open');
  sheet.querySelector('.sheet').focus();
}

function openProfiles() {
  const opt = (v, cur, label) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${label}</option>`;
  openSheet(`<div class="sheet-head"><h2 class="section-title" id="profiles-title">Perfiles</h2>
      <button class="btn icon" data-act="profiles-close" aria-label="Cerrar">${ICONS.close}</button></div>
    <p class="lead">Cada perfil tiene sus días, su nivel, su plan y su racha.</p>
    <ul class="profile-list">${store.profiles.map(p => {
      const on = p.id === store.active;
      const n = p.data.settings.days.length;
      return `<li class="${on ? 'on' : ''}" style="--c:${profileColor(p.name)}">
        <span class="avatar" aria-hidden="true">${esc(p.name[0].toUpperCase())}</span>
        <span class="pinfo"><b>${esc(p.name)}</b><span class="muted small">${n} ${n === 1 ? 'día' : 'días'}/semana · ${esc(daysLabel(p.data.settings.days))} · ${p.data.history.length} clases</span></span>
        ${on ? `<span class="tag ok">${ICONS.check}En uso</span>` : `<button class="btn secondary" data-act="use-profile" data-id="${p.id}">Usar</button>`}</li>`;
    }).join('')}</ul>
    <form class="card form" id="new-profile" onsubmit="return false">
      <p class="card-title">Nuevo perfil</p>
      <label class="field"><span>Nombre</span><input name="name" maxlength="24" placeholder="Lucía" autocomplete="off"></label>
      <fieldset><legend>¿Qué días quiere entrenar? <span class="days-count" id="np-count">3 días/semana</span></legend>${daysPicker('npday', [1, 3, 4])}</fieldset>
      <label class="field"><span>Nivel</span><select name="level">${Object.entries(LEVELS).map(([k, l]) => opt(k, 'principiante', l.n)).join('')}</select></label>
      <label class="field"><span>Duración base<span class="f-help">El ritmo de cada clase la ajusta</span></span><select name="duration">${durOpts(opt, 30, { level: 'principiante', mode: 'boxeo', lumbar: false })}</select></label>
      <label class="switch"><span>Tiene saco de boxeo</span><input type="checkbox" name="bag" checked><i aria-hidden="true"></i></label>
      <label class="field"><span>Tipo de entreno<span class="f-help">El material para fuerza se elige luego en Ajustes</span></span><select name="mode">${Object.entries(MODES).map(([k, m]) => opt(k, 'boxeo', m.n)).join('')}</select></label>
      <label class="switch"><span>Cuidar la zona lumbar<span class="f-help">Sin ejercicios que carguen la espalda baja</span></span><input type="checkbox" name="lumbar"><i aria-hidden="true"></i></label>
      <div class="actions"><button type="button" class="btn primary wide" data-act="create-profile">Crear perfil</button></div>
    </form>`, 'profiles-title');
}

function closeProfiles() {
  $('#sheet').hidden = true; document.body.classList.remove('sheet-open');
  if (sheetReturn && document.contains(sheetReturn)) sheetReturn.focus();
  sheetReturn = null;
}

/* ---------- Antes de la clase: ritmo y nivel ---------- */
let preKey = null;
function openPreClass(key) {
  preKey = key;
  const steps = state.plan[key].steps;
  const cur = curRhythm();
  const opt = (v, c, label) => `<option value="${v}"${v === c ? ' selected' : ''}>${label}</option>`;
  const day = state.plan[key];
  const withBag = Planner.bagToday(day, state.settings);
  const boxing = state.settings.mode === 'boxeo';
  const bagHelp = boxing
    ? (withBag ? 'Asaltos de saco con guantes.' : 'Sin saco: los asaltos se hacen de sombra intensa, con el mismo tiempo.')
    : (withBag ? 'Media clase de fuerza y media de saco.' : 'Solo fuerza, por series.');
  const choice = (v, label) => `<button class="chip-btn bag-opt${v === withBag ? ' on' : ''}" role="radio" aria-checked="${v === withBag}" data-act="pick-bag" data-v="${v ? 1 : 0}">${label}</button>`;
  openSheet(`<div class="sheet-head"><h2 class="section-title" id="pre-title">¿Qué clase te apetece?</h2>
      <button class="btn icon" data-act="profiles-close" aria-label="Cerrar">${ICONS.close}</button></div>
    <p class="lead">${dayTitle(key)} · ${esc(themeOf(day).n)}.</p>
    <div class="bag-choice"><p class="eyebrow">¿Hoy con saco?</p>
      <div class="bag-opts" role="radiogroup" aria-label="¿Hoy con saco?">${choice(true, 'Con saco')}${choice(false, 'Sin saco')}</div>
      <p class="f-help">${bagHelp} ${estMin(steps)} min aprox.</p></div>
    ${hasBag(steps) ? `<p class="f-help">Ritmo: los ejercicios son los mismos; cambia cuánto aprieta y cuánto dura el saco.</p>
    <div class="rhythms" role="radiogroup" aria-label="Ritmo de la clase">${Object.entries(Planner.RHYTHMS).map(([k, r]) => {
      const min = Math.round(totalSecs(Planner.withRhythm(steps, k)) / 60);
      return `<button class="rhythm ${k}${k === cur ? ' on' : ''}" role="radio" aria-checked="${k === cur}" data-act="pick-rhythm" data-r="${k}">
        <span class="rcheck">${ICONS.check}</span><span class="rname"><span class="dot"></span>${r.n}</span><span class="rmin">${min}<small>MIN</small></span><span class="rdesc">${r.desc}</span></button>`;
    }).join('')}</div>` : ''}
    <div class="level-box">
      <label class="field"><span>Dificultad<span class="f-help">Es del perfil: también ajusta las próximas clases</span></span><select id="pre-level">${Object.entries(LEVELS).map(([k, l]) => opt(k, state.settings.level, l.n)).join('')}</select></label>
    </div>
    <p class="f-help">Las pausas entre bloques no cuentan en los minutos: la clase espera a que pulses Empezar.</p>
    <button class="btn primary big" data-act="pre-start">${ICONS.play}Empezar</button>`, 'pre-title');
}

function launchClass(key, rhythm, idx = 0, remaining = null) {
  Player.rhythm = rhythm;
  Player.open(key, Planner.withRhythm(state.plan[key].steps, rhythm), idx, remaining);
}

function submitNewProfile() {
  const f = $('#new-profile');
  const name = cleanName(f.name.value);
  const days = [...f.querySelectorAll('[name=npday]:checked')].map(i => Number(i.value));
  if (!name) { toast('Ponle un nombre al perfil.', { error: true }); f.name.focus(); return; }
  if (store.profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) { toast('Ya hay un perfil con ese nombre.', { error: true }); f.name.focus(); return; }
  if (!days.length) { toast('Elige al menos un día.', { error: true }); return; }
  closeProfiles();
  const mode = MODES[f.mode.value] ? f.mode.value : 'boxeo';
  createProfile({ name, days, level: f.level.value, duration: Number(f.duration.value), bag: f.bag.checked, mode, lumbar: f.lumbar.checked });
  if (mode === 'boxeo') toast(`Perfil «${name}» creado con su plan.`);
  else { goTab('ajustes'); toast(`Perfil «${name}» creado. Indica tu banco y tus pesas para ajustar la rutina.`); }
}

// Campos del tipo de entreno y material, para Ajustes y para el perfil nuevo.
function modeFields(s, opt, sw, prefix = '') {
  const strength = s.mode !== 'boxeo';
  return `<label class="field"><span>Tipo de entreno<span class="f-help">${esc(MODES[s.mode].desc)}</span></span><select name="${prefix}mode">${Object.entries(MODES).map(([k, m]) => opt(k, s.mode, m.n)).join('')}</select></label>
    ${strength ? `<label class="field"><span>Rutina de fuerza<span class="f-help">${esc(STRENGTH_PLANS[s.plan].desc)}</span></span><select name="${prefix}plan">${Object.entries(STRENGTH_PLANS).map(([k, r]) => opt(k, s.plan, r.n)).join('')}</select></label>
    ${sw(`${prefix}bench`, s.bench, 'Tengo banco')}
    <label class="field"><span>Mancuernas<span class="f-help">Pesos en kg, separados por comas. Vacío si no tienes</span></span><input name="${prefix}dumbbells" inputmode="decimal" placeholder="Por ejemplo: 6, 10" value="${esc(s.dumbbells.join(', '))}" autocomplete="off"></label>
    <label class="field"><span>Pesas rusas<span class="f-help">Pesos en kg, separados por comas</span></span><input name="${prefix}kettlebells" inputmode="decimal" placeholder="Por ejemplo: 6" value="${esc(s.kettlebells.join(', '))}" autocomplete="off"></label>` : ''}
    ${sw(`${prefix}lumbar`, s.lumbar, 'Cuidar la zona lumbar', 'Quita los ejercicios que cargan la espalda baja (por ejemplo, tras una hernia) y deja trabajo lumbar suave. Revísalo con tu fisio.')}`;
}

// Opciones de duración con los minutos reales que salen con esos ajustes.
const DUR_NAMES = { 30: 'Corta', 45: 'Media', 60: 'Larga' };
function durOpts(opt, cur, set) {
  const base = { ...DEFAULT_SETTINGS, ...state.settings, ...set };
  return [30, 45, 60].map(d => {
    const sample = Planner.generateDay({}, '2026-01-05', { ...base, duration: d }, { rng: () => 0.5 });
    const min = Math.round(totalSecs(sample.steps) / 60);
    return opt(d, cur, `${DUR_NAMES[d]} · unos ${min} min`);
  }).join('');
}

// iPhone o iPad (los iPad nuevos se presentan como Mac con pantalla táctil).
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function renderSettings() {
  const s = state.settings;
  const opt = (v, cur, label) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${esc(label)}</option>`;
  const sw = (name, on, label, help = '') => `<label class="switch"><span>${label}${help ? `<span class="f-help">${help}</span>` : ''}</span><input type="checkbox" name="${name}"${on ? ' checked' : ''}><i aria-hidden="true"></i></label>`;
  const p = activeProfile();
  const ref = state.plan[todayKey()] && state.plan[todayKey()].steps ? state.plan[todayKey()] : state.plan[nextClassKey()];
  const real = ref ? Object.keys(Planner.RHYTHMS).map(k => `${Planner.RHYTHMS[k].n} ${Math.round(totalSecs(Planner.withRhythm(ref.steps, k)) / 60)}`).join(' · ') : '';
  const voices = Alerts.spanishVoices();
  const nativeVoice = Alerts.nativeVoice();
  return `<header class="hello"><p class="eyebrow">Perfil de ${esc(p.name)}</p><h2 class="display">Ajustes.</h2></header>
  ${IS_IOS && !IS_STANDALONE ? `<div class="notice">${ICONS.info}<div class="n-body"><p><b>Instálala en tu iPhone.</b> En Safari, toca Compartir y luego «Añadir a pantalla de inicio». Así se abre a pantalla completa, funciona sin conexión y tus datos no se borran.</p></div></div>` : ''}
  <section class="card form">
    <p class="card-title">Perfil</p>
    <label class="field"><span>Nombre</span><input id="profile-name" maxlength="24" value="${esc(p.name)}" autocomplete="off"></label>
    <div class="actions"><button class="btn secondary" data-act="profiles">Cambiar o crear perfil</button></div>
  </section>
  <form class="form" id="settings" onsubmit="return false" style="display:grid;gap:var(--sp-4)">
    <section class="card form">
      <p class="card-title">Tipo de entreno</p>
      ${modeFields(s, opt, sw)}
    </section>
    <section class="card form">
      <p class="card-title">Entrenamiento</p>
      <fieldset><legend>Días de entrenamiento <span class="days-count">${s.days.length} ${s.days.length === 1 ? 'día' : 'días'}/semana</span></legend>${daysPicker('day', s.days)}</fieldset>
      <label class="field"><span>Nivel<span class="f-help">Ajusta el core, los descansos y los asaltos de saco</span></span><select name="level">${Object.entries(LEVELS).map(([k, l]) => opt(k, s.level, l.n)).join('')}</select></label>
      <label class="field"><span>Duración base<span class="f-help">${real ? `Minutos reales: ${real}` : 'El ritmo de cada clase la ajusta'}</span></span><select name="duration">${durOpts(opt, s.duration, s)}</select></label>
      <div${s.mode === 'fuerza' ? ' hidden' : ''} style="display:grid;gap:var(--sp-4)">
      <label class="field"><span>Asalto de saco</span><select name="round">${opt(90, s.round, '1:30 min')}${opt(120, s.round, '2:00 min')}${opt(180, s.round, '3:00 min')}</select></label>
      <label class="field"><span>Descanso entre asaltos</span><select name="rest">${opt(30, s.rest, '30 s')}${opt(45, s.rest, '45 s')}${opt(60, s.rest, '60 s')}</select></label>
      ${sw('bag', s.bag, 'Tengo saco de boxeo', 'Sin saco, esos asaltos se hacen de sombra')}
      </div>
    </section>
    <section class="card form">
      <p class="card-title">Avisos durante la clase</p>
      ${sw('sound', s.sound, 'Sonidos', 'Campana, cuenta atrás y cambios de combinación')}
      ${sw('voice', s.voice, 'Voz', 'Dice el ejercicio y las combinaciones')}
      <label class="field"><span>Voz del móvil${nativeVoice ? '<span class="f-help">Usa la voz en español de Android</span>' : voices.length ? '' : '<span class="voice-warn">Este dispositivo no tiene voz en español: sonarán solo los sonidos.</span>'}</span>
        <select name="voiceName"${voices.length && !nativeVoice ? '' : ' disabled'}>${opt('', s.voiceName, 'Automática')}${voices.map(v => opt(v.name, s.voiceName, `${v.name} (${v.lang})`)).join('')}</select></label>
      ${sw('vibrate', s.vibrate, 'Vibración', IS_IOS ? 'El iPhone no deja vibrar a las apps web' : 'Solo en Android')}
      <div class="actions"><button type="button" class="btn secondary" data-act="test-alerts">Probar avisos</button></div>
    </section>
  </form>
  <section class="card form">
    <p class="card-title">Copias de seguridad</p>
    <p class="hint">Todo se guarda solo en este dispositivo. Haz una copia de vez en cuando para no perder el historial si cambias de móvil o borras datos del navegador.</p>
    <div class="actions">
      <button class="btn secondary" data-act="export">Copia de ${esc(p.name)}</button>
      ${store.profiles.length > 1 ? '<button class="btn secondary" data-act="export-all">Copia de todos los perfiles</button>' : ''}
      <label class="btn secondary file-btn">Importar copia<input type="file" accept="application/json,.json" id="import-file"></label>
    </div>
  </section>
  <section class="card form">
    <p class="card-title">Plan y datos de ${esc(p.name)}</p>
    <div class="actions">
      <button class="btn secondary" data-act="rebuild">${ICONS.redo}Rehacer próximos días</button>
      <button class="btn danger" data-act="reset">Borrar datos del perfil</button>
      ${store.profiles.length > 1 ? '<button class="btn danger" data-act="delete-profile">Borrar este perfil</button>' : ''}
    </div>
  </section>
  <p class="settings-foot">Golpes: 1 jab · 2 cross · 3 gancho izq. · 4 gancho der. · 5 uppercut izq. · 6 uppercut der.</p>`;
}

function render() {
  const main = $('#main');
  main.innerHTML = currentTab === 'hoy' ? renderHoy() : currentTab === 'cal' ? renderCalendar() : renderSettings();
  document.querySelectorAll('nav [data-tab]').forEach(b => {
    const on = b.dataset.tab === currentTab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  renderStreakPill();
}

let toastTimer;
function toast(msg, { error = false } = {}) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  t.classList.toggle('error', error);
  t.setAttribute('role', error ? 'alert' : 'status');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, error ? 6500 : 4000);
}

/* ---------- Copias de seguridad ---------- */
function download(name, obj) {
  if (window.EccoNative) { // app de Android: se guarda directamente en Descargas
    const where = window.EccoNative.saveFile(`${name}-${todayKey()}.json`, JSON.stringify(obj, null, 2));
    if (!where) throw new Error('No se pudo guardar');
    return;
  }
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const slug = n => n.toLowerCase().replace(/[^a-z0-9ñáéíóú]+/gi, '-');

function exportData() {
  const p = activeProfile();
  try { download(`ecco-box-copia-${slug(p.name)}`, { app: 'ecco-box', profile: p.name, data: state }); }
  catch (e) { toast('No se pudo guardar la copia.', { error: true }); return; }
  toast(`Copia de «${p.name}» guardada en Descargas.`);
}

function exportAll() {
  save();
  try { download('ecco-box-copia-todos', { app: 'ecco-box', all: true, profiles: store.profiles.map(p => ({ name: p.name, data: p.data })) }); }
  catch (e) { toast('No se pudo guardar la copia.', { error: true }); return; }
  toast(`Copia de ${store.profiles.length} perfiles guardada en Descargas.`);
}

function importData(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('El archivo es demasiado grande.', { error: true }); return; }
  const r = new FileReader();
  r.onload = () => {
    let raw;
    try { raw = JSON.parse(r.result); } catch (e) { toast('Ese archivo no es una copia válida de la app.', { error: true }); return; }
    // Copia de todos los perfiles: se valida todo antes de tocar nada.
    if (raw && raw.app === 'ecco-box' && raw.all) {
      let list;
      try {
        list = raw.profiles.map(p => ({ name: cleanName(p.name), data: normalize(p.data) }));
        if (!list.length || list.some(p => !p.name)) throw new Error('vacía');
      } catch (e) { toast('Ese archivo no es una copia válida de la app.', { error: true }); return; }
      const same = list.filter(p => store.profiles.some(q => q.name.toLowerCase() === p.name.toLowerCase())).map(p => p.name);
      if (!confirm(`La copia tiene ${list.length} perfiles (${list.map(p => p.name).join(', ')}).${same.length ? ` Se sustituirán: ${same.join(', ')}.` : ''} Los demás se añaden. ¿Continuar?`)) return;
      save();
      list.forEach(p => {
        const ex = store.profiles.find(q => q.name.toLowerCase() === p.name.toLowerCase());
        if (ex) ex.data = p.data; else store.profiles.push({ id: newId(), name: p.name, data: p.data });
      });
      state = activeProfile().data;
      ensurePlan(); renderProfileButton(); render(); toast(`${list.length} perfiles importados.`);
      return;
    }
    let next;
    try { next = normalize(raw && raw.app === 'ecco-box' ? raw.data : raw); } catch (e) { toast('Ese archivo no es una copia válida de la app.', { error: true }); return; }
    if (!confirm(`¿Sustituir los datos de «${activeProfile().name}» por la copia${raw.profile ? ` de «${cleanName(raw.profile)}»` : ''}? (${next.history.length} clases hechas)`)) return;
    state = next; ensurePlan(); render(); toast('Copia importada.');
  };
  r.readAsText(file);
}

/* ---------- Eventos ---------- */
function startClass(key, fromStart = false) {
  const s = state.session;
  if (!fromStart && s && s.key === key) launchClass(key, s.rhythm || 'normal', s.idx, s.remaining);
  else openPreClass(key);
}
const hasBag = steps => steps.some(st => st.block === 'Saco' || st.block === 'Sombra intensa');

function goTab(tab) { currentTab = tab; moveFrom = null; render(); window.scrollTo(0, 0); }

document.addEventListener('click', e => {
  if (e.target.id === 'sheet') { closeProfiles(); return; } // clic fuera del panel
  const tab = e.target.closest('nav [data-tab], [data-tab-go]');
  if (tab) { goTab(tab.dataset.tab || tab.dataset.tabGo); return; }
  const cell = e.target.closest('[data-day]');
  if (cell) { selectedDay = cell.dataset.day; if (moveFrom !== selectedDay) moveFrom = null; render(); const c = $(`[data-day="${selectedDay}"]`); if (c) c.focus(); return; }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const key = btn.dataset.key;
  switch (btn.dataset.act) {
    case 'start': startClass(key); break;
    case 'cue': { const open = btn.classList.toggle('open'); btn.setAttribute('aria-expanded', open); break; }
    case 'go-hoy': goTab('hoy'); break;
    case 'move': moveFrom = moveFrom === key ? null : key; render(); break;
    case 'move-cancel': moveFrom = null; render(); break;
    case 'recover': {
      const d = fromKey(key); currentTab = 'cal'; selectedDay = key; moveFrom = key; calMonth = new Date(d.getFullYear(), d.getMonth(), 1); render();
      const mp = $('.move-picker'); if (mp) mp.scrollIntoView({ block: 'center' }); break;
    }
    case 'goto': {
      const d = fromKey(key); currentTab = 'cal'; selectedDay = key; moveFrom = null; calMonth = new Date(d.getFullYear(), d.getMonth(), 1); render();
      const dt = $('.detail'); if (dt) dt.scrollIntoView({ block: 'start' }); break;
    }
    case 'move-to': {
      const to = btn.dataset.to;
      Planner.moveSession(state.plan, key, to);
      if (state.session && state.session.key === key) state.session.key = to;
      moveFrom = null; selectedDay = to;
      const d = fromKey(to); calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      save(); render(); toast(`Clase pasada al ${dayTitle(to)}.`); break;
    }
    case 'pick-bag': {
      // Rehace la clase del día con o sin saco (mismo tema y mismo grupo de fuerza).
      const day = state.plan[preKey];
      if (!day || day.done) break;
      day.bagChoice = btn.dataset.v === '1';
      Planner.generateDay(state.plan, preKey, state.settings, { keepTheme: true });
      if (state.session && state.session.key === preKey) state.session = null;
      save(); render(); openPreClass(preKey);
      break;
    }
    case 'pick-rhythm':
      state.settings.rhythm = btn.dataset.r; save();
      document.querySelectorAll('.rhythm').forEach(b => { const on = b === btn; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      break;
    case 'pre-start': closeProfiles(); state.session = null; save(); launchClass(preKey, curRhythm()); break;
    case 'profiles': openProfiles(); break;
    case 'profiles-close': closeProfiles(); break;
    case 'use-profile': closeProfiles(); switchProfile(btn.dataset.id); toast(`Perfil: ${activeProfile().name}`); break;
    case 'create-profile': submitNewProfile(); break;
    case 'delete-profile':
      if (confirm(`¿Borrar el perfil «${activeProfile().name}» con todo su historial? No se puede deshacer.`)) { const n = activeProfile().name; deleteActiveProfile(); toast(`Perfil «${n}» borrado.`); }
      break;
    case 'restart':
      if (confirm('¿Empezar la clase de cero? Se pierde el punto en el que la dejaste.')) { state.session = null; save(); startClass(key, true); }
      break;
    case 'regen':
      Planner.generateDay(state.plan, key, state.settings, { keepTheme: true });
      if (state.session && state.session.key === key) state.session = null;
      save(); render(); toast('Ejercicios cambiados. El tema del día se mantiene.'); break;
    case 'extra':
      state.plan[key] = { extra: true, steps: [] };
      Planner.generateDay(state.plan, key, state.settings); save(); render(); break;
    case 'done': markDone(key); render(); break;
    case 'undone': unmarkDone(key); render(); break;
    case 'apply-level': {
      const lv = btn.dataset.level;
      if (LEVELS[lv] && confirm(`¿Cambiar el nivel de «${activeProfile().name}» a ${LEVELS[lv].n}? Las próximas clases se rehacen con ese nivel.`)) {
        state.settings.level = lv; ensurePlan(); render(); toast(`Nivel: ${LEVELS[lv].n}`);
      }
      break;
    }
    case 'month': calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(btn.dataset.dir), 1); render(); break;
    case 'rebuild': ensurePlan(true); render(); toast('Próximos días rehechos.'); break;
    case 'export': exportData(); break;
    case 'export-all': exportAll(); break;
    case 'test-alerts':
      Alerts.unlock(); Alerts.go(); setTimeout(() => Alerts.bell(), 500); Alerts.vibrate([200, 100, 200]);
      setTimeout(() => Alerts.say('Así suenan los avisos. Uno, dos, gancho.'), 1400); break;
    case 'reset':
      if (confirm(`¿Borrar historial, plan y ajustes de «${activeProfile().name}»? No se puede deshacer.`)) { state = freshState(); ensurePlan(); render(); toast('Datos del perfil borrados.'); }
      break;
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'import-file') { importData(e.target.files[0]); e.target.value = ''; return; }
  if (e.target.id === 'profile-name') {
    const name = cleanName(e.target.value);
    if (!name || store.profiles.some(p => p.id !== store.active && p.name.toLowerCase() === name.toLowerCase())) {
      e.target.value = activeProfile().name; toast(name ? 'Ya hay un perfil con ese nombre.' : 'El nombre no puede quedar vacío.', { error: true }); return;
    }
    activeProfile().name = name; save(); renderProfileButton(); toast('Nombre guardado.'); return;
  }
  if (e.target.id === 'pre-level') {
    state.settings.level = e.target.value; ensurePlan(); openPreClass(preKey); toast(`Nivel: ${LEVELS[e.target.value].n}`); return;
  }
  if (e.target.name === 'npday') {
    const n = document.querySelectorAll('#new-profile [name=npday]:checked').length;
    $('#np-count').textContent = `${n} ${n === 1 ? 'día' : 'días'}/semana`; return;
  }
  const f = e.target.closest('#settings');
  if (!f) return;
  const s = state.settings;
  const days = [...f.querySelectorAll('[name=day]:checked')].map(i => Number(i.value));
  if (!days.length) { e.target.checked = true; toast('Deja al menos un día de entrenamiento.', { error: true }); return; }
  const planChanged = ['level', 'duration', 'round', 'rest', 'bag', 'day', 'mode', 'plan', 'bench', 'dumbbells', 'kettlebells', 'lumbar'].includes(e.target.name);
  Object.assign(s, {
    level: f.level.value, duration: Number(f.duration.value), round: Number(f.round.value), rest: Number(f.rest.value),
    bag: f.bag.checked, voice: f.voice.checked, sound: f.sound.checked, vibrate: f.vibrate.checked, days, voiceName: f.voiceName.value,
    mode: MODES[f.mode.value] ? f.mode.value : 'boxeo', lumbar: f.lumbar.checked,
    ...(f.plan ? { plan: f.plan.value, bench: f.bench.checked, dumbbells: parseKg(f.dumbbells.value), kettlebells: parseKg(f.kettlebells.value) } : {}),
  });
  ensurePlan();
  const cnt = f.querySelector('.days-count');
  if (cnt) cnt.textContent = `${days.length} ${days.length === 1 ? 'día' : 'días'}/semana`;
  if (['duration', 'mode', 'plan', 'dumbbells', 'kettlebells', 'bench', 'lumbar'].includes(e.target.name)) render();
  toast(planChanged ? 'Guardado. Los días pendientes se han ajustado.' : 'Guardado.');
});

const player = $('#player');
player.addEventListener('click', e => {
  const r = e.target.closest('[data-rpe]');
  if (r) { Player.rate(Number(r.dataset.rpe)); return; }
  const b = e.target.closest('[data-pact]');
  if (!b) return;
  ({
    play: () => Player.primary(), prev: () => Player.skip(-1), next: () => Player.skip(1),
    close: () => (Player.phase === 'done' ? Player.close() : Player.requestClose()),
    exit: () => Player.close(), stay: () => Player.stay(),
    'notice-ok': () => { const n = $('#p-notice'); if (n) n.hidden = true; },
  })[b.dataset.pact]();
});

document.addEventListener('keydown', e => {
  if (e.code === 'Escape' && !$('#sheet').hidden) { closeProfiles(); return; }
  if (player.hidden || Player.phase === 'done') return;
  if (Player.confirming) { if (e.code === 'Escape') Player.stay(); return; }
  if (e.target.closest && e.target.closest('button') && (e.code === 'Space' || e.code === 'Enter')) return; // el botón ya responde
  if (e.code === 'Space') { e.preventDefault(); Player.primary(); }
  else if (e.code === 'ArrowRight') Player.skip(1);
  else if (e.code === 'ArrowLeft') Player.skip(-1);
  else if (e.code === 'Escape') Player.close();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (!player.hidden && Player.phase === 'run') { Player.requestWake(); Alerts.unlock(); }
    // Si la app quedó abierta de un día para otro, se actualiza "hoy" y el plan.
    if (player.hidden) { ensurePlan(); render(); }
  } else if (!player.hidden && Player.phase === 'run') {
    state.session = { key: Player.key, idx: Player.idx, remaining: Math.max(0, Player.endAt - performance.now()), rhythm: Player.rhythm || 'normal' };
    save();
  }
});

Player.init({
  theme: key => themeOf(state.plan[key]),
  onProgress: s => { state.session = { ...s, rhythm: Player.rhythm || 'normal' }; save(); },
  onComplete: key => {
    const prev = streak();
    markDone(key, Player.steps, Player.rhythm);
    const now = streak();
    lastCelebration = { prev, now, best: bestStreak() };
    renderStreakPill();
  },
  finishExtra: () => {
    const c = lastCelebration;
    if (!c) return '';
    return `<div class="celebrate" role="status"><div class="big-flame" aria-hidden="true">${ICONS.flame}</div>
      <div class="c-num">${c.now}</div><p class="c-label">${c.now === 1 ? 'día' : 'días'} de racha${c.best > c.now ? ` · mejor ${c.best}` : ''}</p>
      <p class="c-msg">${esc(streakMessage(c.prev, c.now))}</p>${weekHTML()}</div>`;
  },
  onClose: () => render(),
  onRate: (key, n) => {
    const h = [...state.history].reverse().find(x => x.date === key);
    if (h) { h.rpe = n; save(); }
  },
});

// Botón atrás de Android (app instalada): cierra paneles, pide confirmar al salir de la clase o vuelve a Hoy.
window.eccoBack = () => {
  if (!$('#sheet').hidden) { closeProfiles(); return true; }
  if (!player.hidden) {
    if (Player.confirming) { Player.stay(); return true; }
    if (Player.phase === 'done') { Player.close(); return true; }
    Player.requestClose(); return true;
  }
  if (currentTab !== 'hoy') { goTab('hoy'); return true; }
  return false;
};

/* ---------- Arranque ---------- */
document.querySelectorAll('nav [data-tab] .ico').forEach((el, i) => { el.innerHTML = [ICONS.home, ICONS.cal, ICONS.gear][i]; });
['prev', 'next'].forEach(k => { $(`[data-pact=${k}]`).innerHTML = ICONS[k]; });
ensurePlan();
renderProfileButton();
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  // Las voces llegan con retraso en algunos navegadores: se refresca la lista de Ajustes.
  speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', () => { if (currentTab === 'ajustes' && !document.activeElement.closest('#settings')) render(); });
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
}
