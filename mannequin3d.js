'use strict';
/* Animaciones 3D de los ejercicios: un maniquí con volumen, luz y sombra que se mueve en bucle.
   Se genera en el propio dispositivo a partir de las posturas de pictos.js (no descarga nada, funciona sin conexión).
   Usa three.js (vendor/three.min.js, licencia MIT). Si no hay WebGL, la app sigue usando los pictogramas SVG.

   Cómo se pasa de 2D a 3D: las posturas son vistas de lado (11 puntos en una caja 100x100). El eje x del dibujo
   pasa a ser "hacia delante", la y es la altura y el lado de cada extremidad (l = atrás, r = delante) se convierte
   en profundidad. Las posturas frontales (de pie mirando al frente) usan la x como anchura. */

const Mannequin3D = (() => {
  // Posturas frontales: su x es izquierda-derecha, no delante-atrás.
  const FRONTAL = new Set(['stand', 'hips', 'armsOut', 'jackOpen', 'jumpUp', 'shuffle', 'rope', 'triceps', 'cross', 'neck', 'seated']);

  // Posturas extra que solo necesita la animación (segundo fotograma de un movimiento).
  const EXTRA = {
    plankDown: { h: [84, 72], n: [75, 75], p: [46, 80], le: [66, 80], lh: [72, 90], re: [68, 80], rh: [74, 90], lk: [30, 85], lf: [14, 88], rk: [30, 85], rf: [14, 88] },
    crossP: { h: [55, 15], n: [52, 25], p: [48, 51], le: [64, 26], lh: [79, 24], re: [61, 35], rh: [63, 24], lk: [42, 70], lf: [36, 90], rk: [56, 70], rf: [60, 90] },
    hookP: { h: [55, 15], n: [52, 25], p: [48, 51], le: [57, 34], lh: [58, 23], re: [64, 26], rh: [72, 24], lk: [42, 70], lf: [36, 90], rk: [56, 70], rf: [60, 90], z: { re: 1.6, rh: 0.1 } },
    benchDown: { h: [20, 61], n: [28, 64], p: [56, 65], le: [24, 70], lh: [27, 58], re: [26, 70], rh: [29, 58], lk: [68, 70], lf: [72, 92], rk: [70, 70], rf: [74, 92] },
    crunchDown: { h: [14, 84], n: [22, 86], p: [50, 86], le: [26, 80], lh: [36, 76], re: [27, 81], rh: [38, 78], lk: [63, 69], lf: [74, 90], rk: [65, 70], rf: [76, 90] },
    bridgeDown: { h: [14, 84], n: [22, 86], p: [46, 86], le: [30, 90], lh: [40, 90], re: [31, 90], rh: [41, 90], lk: [60, 66], lf: [69, 90], rk: [62, 67], rf: [71, 90] },
    rowDown: { h: [80, 45], n: [72, 50], p: [42, 54], le: [72, 60], lh: [72, 68], re: [70, 60], rh: [68, 74], lk: [40, 68], lf: [22, 68], rk: [48, 74], rf: [48, 92] },
    curlDown: { h: [50, 14], n: [50, 24], p: [50, 50], le: [44, 38], lh: [42, 50], re: [55, 38], rh: [56, 52], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
    seatedDown: { h: [48, 28], n: [48, 38], p: [48, 66], le: [34, 40], lh: [36, 30], re: [62, 40], rh: [60, 30], lk: [64, 68], lf: [66, 92], rk: [66, 69], rf: [68, 92] },
    russianL: { h: [32, 54], n: [36, 62], p: [46, 86], le: [46, 68], lh: [55, 74], re: [47, 70], rh: [57, 76], lk: [59, 70], lf: [72, 78], rk: [60, 71], rf: [73, 79], z: { lh: -1.8, rh: -1.4, le: -1.4, re: -1 } },
    russianR: { h: [32, 54], n: [36, 62], p: [46, 86], le: [46, 68], lh: [55, 74], re: [47, 70], rh: [57, 76], lk: [59, 70], lf: [72, 78], rk: [60, 71], rf: [73, 79], z: { lh: 1.4, rh: 1.8, le: 1, re: 1.4 } },
    jackClosed: { h: [50, 14], n: [50, 24], p: [50, 50], le: [45, 36], lh: [44, 48], re: [55, 36], rh: [56, 48], lk: [48, 70], lf: [47, 90], rk: [52, 70], rf: [53, 90] },
    squatUp: { h: [52, 14], n: [51, 24], p: [49, 50], le: [58, 32], lh: [70, 30], re: [59, 33], rh: [71, 31], lk: [50, 70], lf: [50, 90], rk: [52, 70], rf: [52, 90] },
    mountainB: { h: [82, 54], n: [74, 59], p: [46, 72], le: [72, 74], lh: [72, 90], re: [74, 74], rh: [74, 90], lk: [62, 74], lf: [52, 86], rk: [30, 80], rf: [14, 88] },
    lungeUp: { h: [50, 14], n: [50, 24], p: [50, 50], le: [44, 36], lh: [46, 48], re: [56, 36], rh: [54, 48], lk: [44, 70], lf: [40, 90], rk: [58, 70], rf: [62, 90] },
    deadbugB: { h: [14, 84], n: [22, 86], p: [48, 88], le: [26, 74], lh: [28, 62], re: [24, 74], rh: [25, 62], lk: [50, 70], lf: [66, 70], rk: [64, 82], rf: [80, 80] },
    birddogB: { h: [77, 52], n: [68, 57], p: [40, 59], le: [80, 55], lh: [93, 53], re: [66, 74], rh: [66, 90], lk: [40, 90], lf: [22, 90], rk: [26, 58], rf: [9, 56] },
    hookRear: { h: [55, 15], n: [52, 25], p: [48, 51], le: [62, 27], lh: [70, 25], re: [61, 35], rh: [63, 24], lk: [42, 70], lf: [36, 90], rk: [56, 70], rf: [60, 90], z: { le: -1.6, lh: -0.1 } },
    upperRear: { h: [55, 15], n: [52, 25], p: [48, 51], le: [60, 40], lh: [66, 26], re: [61, 35], rh: [63, 24], lk: [42, 70], lf: [36, 90], rk: [56, 70], rf: [60, 90], z: { le: -0.6, lh: -0.3 } },
    legRaiseDown: { h: [14, 84], n: [22, 86], p: [48, 87], le: [34, 90], lh: [44, 90], re: [35, 90], rh: [45, 90], lk: [66, 85], lf: [84, 83], rk: [67, 86], rf: [85, 84] },
  };
  const pose = name => (typeof POSES !== 'undefined' && POSES[name]) || EXTRA[name] || null;

  // Secuencia de fotogramas de cada ejercicio (si no está aquí se deduce del pictograma).
  // period: segundos por ciclo completo.
  const MOTION = {
    // Saco y sombra: 1-2-gancho
    saco: { seq: ['guard', 'jab', 'guard', 'crossP', 'guard', 'hookP'], period: 2.4, prop: 'bag' },
    sombra: { seq: ['guard', 'jab', 'guard', 'crossP', 'guard', 'hookP'], period: 2.4 },
    sombraligera: { seq: ['guard', 'jab', 'guard', 'crossP'], period: 2.2 },
    jabexpl: { seq: ['guard', 'jab', 'guard', 'crossP'], period: 1.2 },
    speedpunch: { seq: ['jab', 'crossP'], period: 0.6 },
    uppersrap: { seq: ['guard', 'upper'], period: 0.8 },
    // Calentamiento / cardio
    jacks: { seq: ['jackClosed', 'jackOpen'], period: 1 },
    sentadilla: { seq: ['squatUp', 'squat'], period: 2.2 },
    sentsalto: { seq: ['squat', 'jumpUp'], period: 1.4 },
    zancada: { seq: ['lungeUp', 'lunge'], period: 2.4 },
    escaladores: { seq: ['mountain', 'mountainB'], period: 0.7 },
    escalcruz: { seq: ['mountain', 'mountainB'], period: 2 },
    highknees: { seq: ['highKnee', 'run'], period: 0.6 },
    skipping: { seq: ['highKnee', 'run'], period: 0.9 },
    trote: { seq: ['run', 'highKnee'], period: 1 },
    burpees: { seq: ['jumpUp', 'squat', 'plankHigh', 'squat'], period: 3 },
    flexiones: { seq: ['plankHigh', 'plankDown'], period: 2 },
    flexinc: { seq: ['plankHigh', 'plankDown'], period: 2 },
    diamante: { seq: ['plankHigh', 'plankDown'], period: 2 },
    flexlastre: { seq: ['plankHigh', 'plankDown'], period: 2.2 },
    puente: { seq: ['bridgeDown', 'bridge'], period: 2.2 },
    puenteuna: { seq: ['bridgeDown', 'bridge'], period: 2.2 },
    hipthrust: { seq: ['bridgeDown', 'bridge'], period: 2.4 },
    birddog: { seq: ['birddog', 'quadruped', 'birddogB', 'quadruped'], period: 4 },
    // Core
    russian: { seq: ['russianL', 'russianR'], period: 1.6 },
    russianpeso: { seq: ['russianL', 'russianR'], period: 2 },
    crunchpeso: { seq: ['crunchDown', 'crunch'], period: 2 },
    curlup: { seq: ['crunchDown', 'crunch'], period: 3 },
    deadbug: { seq: ['deadbug', 'deadbugB'], period: 3 },
    elevpiernas: { seq: ['legRaiseDown', 'legRaise'], period: 2.6 },
    crunchinv: { seq: ['legRaise', 'kneesIn'], period: 2 },
    // Fuerza
    presbanco: { seq: ['benchDown', 'benchPress'], period: 2.4 },
    presdos: { seq: ['benchDown', 'benchPress'], period: 2.4 },
    remo1: { seq: ['rowDown', 'row'], period: 2.2 },
    remo1pausa: { seq: ['rowDown', 'row', 'row'], period: 3 },
    curl: { seq: ['curlDown', 'curl'], period: 2.2 },
    curlalt: { seq: ['curlDown', 'curl'], period: 2.2 },
    martillo: { seq: ['curlDown', 'curl'], period: 2.2 },
    militarsent: { seq: ['seatedDown', 'seatedPress'], period: 2.4 },
    arnold: { seq: ['seatedDown', 'seatedPress'], period: 2.6 },
    goblet: { seq: ['squatUp', 'squat'], period: 2.4 },
  };

  // Qué zona trabaja cada grupo muscular (se ilumina en verde, como en las fichas de ejercicios).
  const GROUP_PARTS = {
    pecho: ['chest', 'uarm'], espalda: ['back', 'uarm'], hombro: ['shoulder'], biceps: ['uarm'], triceps: ['uarm'],
    core: ['torso'], carga: ['torso', 'farm'], pierna: ['thigh', 'shin'], boxeo: ['shoulder', 'uarm', 'farm'],
  };

  // Golpes por número (1 jab, 2 cross, 3/4 ganchos, 5/6 uppercuts): la combinación del saco, animada.
  const PUNCH_POSE = { 1: 'jab', 2: 'crossP', 3: 'hookP', 4: 'hookRear', 5: 'upper', 6: 'upperRear' };
  function comboMotion(combo) {
    const nums = (String(combo).match(/[1-6]/g) || ['1', '2']).slice(0, 8);
    const seq = [];
    nums.forEach(n => seq.push('guard', PUNCH_POSE[n]));
    seq.push('guard', 'guard', 'guard');
    return { seq, period: seq.length * 0.26, prop: 'bag' };
  }

  // Grupo muscular de un ejercicio (para iluminar la zona que trabaja).
  const BOX_IDS = new Set(['saco', 'sombra', 'sombraligera', 'jabexpl', 'speedpunch', 'uppersrap', 'shufflegolpes', 'sentgolpes', 'ganchosent', 'burpeegolpes', 'piesrapidos', 'rebote']);
  function groupOf(id) {
    if (typeof STRENGTH !== 'undefined') { const e = STRENGTH.find(x => x.id === id); if (e) return e.g; }
    if (BOX_IDS.has(id)) return 'boxeo';
    if (typeof EXERCISES !== 'undefined') {
      if ((EXERCISES.core || []).some(x => x.id === id)) return 'core';
      if ((EXERCISES.activate || []).some(x => x.id === id)) return ['sentadilla', 'puente', 'zancada'].includes(id) ? 'pierna' : ['flexinc'].includes(id) ? 'pecho' : 'core';
    }
    return '';
  }

  function motionFor(id, combo) {
    if (combo) return comboMotion(combo);
    if (MOTION[id]) return MOTION[id];
    const d = (typeof PICTOS !== 'undefined' && PICTOS[id]) || { pose: 'guard' };
    const fx = d.fx || [];
    if (d.ghost) return { seq: [d.ghost, d.pose], period: 2.2 };
    if (fx.includes('speed')) return { seq: [d.pose], period: 0.6, bob: 0.25 };
    if (fx.includes('lr')) return { seq: [d.pose], period: 1.4, sway: 0.9 };
    if (fx.includes('rot')) return { seq: [d.pose], period: 2.4, turn: 0.45 };
    if (fx.includes('up') || fx.includes('updown')) return { seq: [d.pose], period: 1.6, bob: 0.4 };
    return { seq: [d.pose], period: 4, breathe: true };
  }

  // ---- 2D → 3D ----
  const SIDE_Z = { sh: 0.8, el: 0.85, ha: 0.75, hip: 0.5, kn: 0.5, ft: 0.5 };
  function to3D(name) {
    const P = pose(name) || pose('guard');
    const frontal = FRONTAL.has(name);
    const v = (pt, side, k) => {
      const zo = P.z && P.z[k];
      if (frontal) return [0.15, (92 - pt[1]) / 10, (pt[0] - 50) / 10];
      return [(pt[0] - 50) / 10, (92 - pt[1]) / 10, zo !== undefined ? zo : side];
    };
    const J = {
      head: v(P.h, 0), neck: v(P.n, 0), pelvis: v(P.p, 0),
      lel: v(P.le, -SIDE_Z.el, 'le'), lha: v(P.lh, -SIDE_Z.ha, 'lh'), rel: v(P.re, SIDE_Z.el, 're'), rha: v(P.rh, SIDE_Z.ha, 'rh'),
      lkn: v(P.lk, -SIDE_Z.kn, 'lk'), lft: v(P.lf, -SIDE_Z.ft, 'lf'), rkn: v(P.rk, SIDE_Z.kn, 'rk'), rft: v(P.rf, SIDE_Z.ft, 'rf'),
    };
    // Hombros y caderas: a cada lado del cuello y la pelvis.
    const off = (a, dz, dy, dirFrom) => {
      if (frontal) { const s = Math.sign(dirFrom[2] - a[2]) || Math.sign(dz); return [a[0], a[1] + dy, a[2] + s * Math.abs(dz)]; }
      return [a[0], a[1] + dy, a[2] + dz];
    };
    const spine = sub(J.neck, J.pelvis), sl = len(spine) || 1, sd = spine.map(c => c / sl);
    const neckLow = J.neck.map((c, i) => c - sd[i] * 0.35);
    J.lsh = off(neckLow, -SIDE_Z.sh, 0, J.lel); J.rsh = off(neckLow, SIDE_Z.sh, 0, J.rel);
    J.lhip = off(J.pelvis, -SIDE_Z.hip, 0, J.lkn); J.rhip = off(J.pelvis, SIDE_Z.hip, 0, J.rkn);
    // La cabeza un poco más separada del cuello para que no se hunda en el tronco.
    return J;
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const ease = t => t * t * (3 - 2 * t);

  // ---- Escena ----
  let R = null; // { renderer, scene, camera, fig, props }
  let supported = null;

  function isSupported() {
    if (supported !== null) return supported;
    try {
      const c = document.createElement('canvas');
      supported = typeof THREE !== 'undefined' && !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { supported = false; }
    return supported;
  }

  const COL = { skin: 0xd9dfdc, hi: 0x3ee08f, prop: 0x5b6662, bag: 0x2a2f2d, metal: 0x9aa5a0 };

  function build() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xf4fff8, 0x26302c, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(6, 12, 8); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9af5c6, 0.45); rim.position.set(-8, 6, -6); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.ShadowMaterial({ opacity: 0.38 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.48, 64), new THREE.MeshBasicMaterial({ color: 0x3ee08f, transparent: true, opacity: 0.18 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);

    const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05 });
    const skin = mat(COL.skin), hi = mat(COL.hi);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
    const sph = new THREE.SphereGeometry(1, 24, 16);
    const fig = new THREE.Group(); scene.add(fig);
    const parts = {};
    const mk = (geo, name) => { const m = new THREE.Mesh(geo, skin); m.castShadow = true; m.name = name; fig.add(m); return m; };
    // Segmentos: [joint A, joint B, radio A, radio B, zona]
    const SEG = {
      torsoU: ['neck', 'mid', 0.62, 0.52, 'chest'], torsoL: ['mid', 'pelvis', 0.52, 0.5, 'torso'],
      shL: ['lsh', 'neckLow', 0.3, 0.32, 'shoulder'], shR: ['rsh', 'neckLow', 0.3, 0.32, 'shoulder'],
      hipL: ['lhip', 'pelvis', 0.36, 0.4, 'torso'], hipR: ['rhip', 'pelvis', 0.36, 0.4, 'torso'],
      uarmL: ['lsh', 'lel', 0.27, 0.22, 'uarm'], uarmR: ['rsh', 'rel', 0.27, 0.22, 'uarm'],
      farmL: ['lel', 'lha', 0.21, 0.16, 'farm'], farmR: ['rel', 'rha', 0.21, 0.16, 'farm'],
      thighL: ['lhip', 'lkn', 0.38, 0.27, 'thigh'], thighR: ['rhip', 'rkn', 0.38, 0.27, 'thigh'],
      shinL: ['lkn', 'lft', 0.26, 0.17, 'shin'], shinR: ['rkn', 'rft', 0.26, 0.17, 'shin'],
      neckS: ['neckTop', 'neck', 0.17, 0.2, 'neck'],
    };
    for (const k in SEG) {
      parts[k] = { seg: SEG[k], body: mk(cyl, k), a: mk(sph, k + 'a'), b: mk(sph, k + 'b') };
    }
    parts.head = { body: mk(sph, 'head') };
    parts.handL = { body: mk(sph, 'handL') }; parts.handR = { body: mk(sph, 'handR') };
    parts.footL = { body: mk(new THREE.BoxGeometry(1, 1, 1), 'footL') }; parts.footR = { body: mk(new THREE.BoxGeometry(1, 1, 1), 'footR') };

    // Accesorios
    const props = new THREE.Group(); scene.add(props);
    const pmat = mat(COL.prop), bmat = mat(COL.bag), mmat = new THREE.MeshStandardMaterial({ color: COL.metal, roughness: 0.3, metalness: 0.6 });
    const box = (w, h, d, x, y, z, m = pmat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; };
    const bench = (x0, x1, top) => { const g = new THREE.Group(); const w = x1 - x0; g.add(box(w, 0.3, 1.4, x0 + w / 2, top - 0.15, 0));
      g.add(box(0.25, top - 0.3, 1.1, x0 + 0.4, (top - 0.3) / 2, 0)); g.add(box(0.25, top - 0.3, 1.1, x1 - 0.4, (top - 0.3) / 2, 0)); return g; };
    const P2 = x => (x - 50) / 10, PY = y => (92 - y) / 10;
    const PROPS = {
      bench: () => bench(P2(12), P2(78), PY(68)), benchL: () => bench(P2(2), P2(36), PY(58)), benchLow: () => bench(P2(0), P2(30), PY(78)),
      seat: () => bench(P2(30), P2(64), PY(68)), seatL: () => { const g = new THREE.Group(); g.add(box(2.6, PY(64), 1.6, P2(35), PY(64) / 2, 0)); return g; },
      box: () => { const g = new THREE.Group(); g.add(box(2.6, 1.2, 1.8, P2(75), 0.6, 0)); return g; },
      step: () => { const g = new THREE.Group(); g.add(box(2.2, 2, 1.6, P2(81), 1, 0)); return g; },
      stepL: () => { const g = new THREE.Group(); g.add(box(2.2, 2, 1.6, P2(19), 1, 0)); return g; },
      wall: () => { const g = new THREE.Group(); g.add(box(0.3, 9, 4, P2(91), 4.5, 0)); return g; },
      wallL: () => { const g = new THREE.Group(); g.add(box(0.3, 9, 4, P2(27), 4.5, 0)); return g; },
      bag: () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 4.2, 28), bmat); b.castShadow = true; b.position.set(4.1, 5.6, 0); g.add(b);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), mmat); top.position.set(4.1, 8.8, 0); g.add(top); return g; },
    };
    const db = () => { const g = new THREE.Group(); const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), mmat); bar.rotation.x = Math.PI / 2; g.add(bar);
      [-0.38, 0.38].forEach(z => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16), bmat); p.rotation.x = Math.PI / 2; p.position.z = z; p.castShadow = true; g.add(p); }); return g; };
    const kb = () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), bmat); b.position.y = -0.5; b.castShadow = true; g.add(b);
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 16, Math.PI), mmat); h.position.y = -0.15; g.add(h); return g; };
    const dbL = db(), dbR = db(), kbR = kb(); fig.add(dbL, dbR, kbR);
    R = { renderer, scene, camera, fig, parts, props, PROPS, skin, hi, dbL, dbR, kbR, ring };
  }

  // Coloca el maniquí con unas articulaciones dadas.
  function placeFigure(J) {
    const V = a => new THREE.Vector3(a[0], a[1], a[2]);
    const sp = sub(J.neck, J.pelvis), sl = len(sp) || 1, sd = sp.map(c => c / sl);
    const ext = {
      ...J, mid: lerp(J.pelvis, J.neck, 0.5), neckLow: J.neck.map((c, i) => c - sd[i] * 0.35),
      neckTop: lerp(J.neck, J.head, 0.45),
    };
    const up = new THREE.Vector3(0, 1, 0);
    for (const k in R.parts) {
      const p = R.parts[k];
      if (!p.seg) continue;
      const [ja, jb, ra, rb] = p.seg;
      const A = V(ext[ja]), B = V(ext[jb]);
      const d = B.clone().sub(A), L = d.length() || 0.001, r = (ra + rb) / 2;
      p.body.position.copy(A).add(B).multiplyScalar(0.5);
      p.body.quaternion.setFromUnitVectors(up, d.clone().normalize());
      p.body.scale.set(r, L, r);
      p.a.position.copy(A); p.a.scale.setScalar(ra);
      p.b.position.copy(B); p.b.scale.setScalar(rb);
    }
    // Cabeza: ligeramente alargada y separada del cuello.
    const hd = V(J.head), nk = V(J.neck), hdir = hd.clone().sub(nk).normalize();
    const head = R.parts.head.body; head.position.copy(nk).add(hdir.clone().multiplyScalar(1.05)); head.scale.set(0.5, 0.6, 0.48);
    head.quaternion.setFromUnitVectors(up, hdir);
    // Manos
    const hand = (k, a, b) => { const m = R.parts[k].body; const A = V(J[a]), B = V(J[b]); const dir = B.clone().sub(A).normalize();
      m.position.copy(B).add(dir.multiplyScalar(0.18)); m.scale.setScalar(0.22); return m.position; };
    const hl = hand('handL', 'lel', 'lha'), hr = hand('handR', 'rel', 'rha');
    // Pies: caja apuntando hacia delante (o perpendicular a la espinilla si está tumbado).
    const foot = (k, kn, ft) => { const m = R.parts[k].body; const K = V(J[kn]), F = V(J[ft]); const shin = F.clone().sub(K).normalize();
      let fwd = new THREE.Vector3(1, 0, 0); fwd.sub(shin.clone().multiplyScalar(fwd.dot(shin))).normalize();
      if (!isFinite(fwd.x) || fwd.lengthSq() < 0.1) fwd = new THREE.Vector3(0, 0, 1);
      m.position.copy(F).add(fwd.clone().multiplyScalar(0.25)).add(shin.clone().multiplyScalar(0.08));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), fwd); m.quaternion.copy(q); m.scale.set(0.75, 0.24, 0.32); };
    foot('footL', 'lkn', 'lft'); foot('footR', 'rkn', 'rft');
    return { hl, hr };
  }

  function setScene(id, opts = {}) {
    const d = (typeof PICTOS !== 'undefined' && PICTOS[id]) || {};
    const m = motionFor(id, opts.combo);
    // Accesorios
    while (R.props.children.length) R.props.remove(R.props.children[0]);
    const propName = m.prop || d.prop;
    if (propName && R.PROPS[propName]) R.props.add(R.PROPS[propName]());
    const fx = d.fx || [];
    R.dbL.visible = fx.includes('db2'); R.dbR.visible = fx.includes('db') || fx.includes('db2'); R.kbR.visible = fx.includes('kb');
    if (R.kbR.visible) R.dbR.visible = false;
    // Zona trabajada
    const zones = new Set(GROUP_PARTS[opts.group !== undefined ? opts.group : groupOf(id)] || []);
    for (const k in R.parts) {
      const p = R.parts[k]; const zone = p.seg ? p.seg[4] : '';
      const mat = zones.has(zone) ? R.hi : R.skin;
      [p.body, p.a, p.b].forEach(o => { if (o) o.material = mat; });
    }
    // Fotogramas y encuadre (centrado en la caja de todas las posturas)
    const frames = m.seq.map(to3D);
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    frames.forEach(J => Object.values(J).forEach(p => { for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); } }));
    if (propName === 'bag') { max[0] = Math.max(max[0], 5); max[1] = Math.max(max[1], 7.8); }
    min[1] = 0; max[1] += 0.7; // suelo y cabeza
    min[2] = Math.min(min[2], -1); max[2] = Math.max(max[2], 1);
    const cx = (min[0] + max[0]) / 2;
    R.fig.position.set(-cx, 0, 0); R.props.position.set(-cx, 0, 0);
    // Encuadre: esfera que envuelve la caja, vista desde tres cuartos.
    const target = new THREE.Vector3(0, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    const rad = Math.hypot(max[0] - min[0], max[1] - min[1], (max[2] - min[2]) * 0.6) / 2;
    const dist = Math.max(rad, 3.2) / Math.sin((R.camera.fov * Math.PI) / 360) * 0.92;
    const dir = new THREE.Vector3(0.5, 0.36, 1).normalize();
    R.camera.position.copy(target).add(dir.multiplyScalar(dist));
    R.camera.lookAt(target);
    return { frames, m };
  }

  // Pose en el instante t (segundos).
  function frameAt(S, t) {
    const { frames, m } = S;
    let J;
    if (frames.length === 1) J = frames[0];
    else {
      const n = frames.length, seq = n === 2 ? [0, 1, 0, 1] : null;
      const u = ((t / m.period) % 1 + 1) % 1;
      if (n === 2) { const k = u < 0.5 ? ease(u * 2) : ease(2 - u * 2); J = blend(frames[0], frames[1], k); }
      else { const f = u * n, i = Math.floor(f) % n, j = (i + 1) % n; J = blend(frames[i], frames[j], ease(f - Math.floor(f))); }
    }
    const ph = Math.sin((t / m.period) * Math.PI * 2);
    if (m.bob) J = shift(J, [0, Math.max(0, ph) * m.bob, 0]);
    if (m.sway) J = shift(J, [0, 0, ph * m.sway]);
    if (m.breathe) J = shift(J, [0, ph * 0.04, 0]);
    R.fig.rotation.y = m.turn ? ph * m.turn : 0;
    return J;
  }
  function blend(A, B, k) { const o = {}; for (const key in A) o[key] = lerp(A[key], B[key] || A[key], k); return o; }
  function shift(J, d) { const o = {}; for (const k in J) o[k] = [J[k][0] + d[0], J[k][1] + d[1], J[k][2] + d[2]]; return o; }

  function draw(S, t, w, h) {
    R.renderer.setSize(w, h, false);
    R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
    const J = frameAt(S, t);
    const { hl, hr } = placeFigure(J);
    R.dbL.position.copy(hl); R.dbR.position.copy(hr); R.kbR.position.copy(hr);
    R.renderer.render(R.scene, R.camera);
  }

  // ---- API pública ----
  let live = null; // animación en curso { el, raf, S }
  const stills = new Map();

  return {
    isSupported,
    has: id => !!MOTION[id] || (typeof PICTOS !== 'undefined' && !!PICTOS[id]),
    // Imagen fija (para listas). Devuelve un dataURL o null.
    still(id, { size = 104, group } = {}) {
      if (!isSupported()) return null;
      const key = `${id}|${size}|${group || ''}`;
      if (stills.has(key)) return stills.get(key);
      try {
        if (!R) build();
        const S = setScene(id, { group });
        const px = Math.round(size * Math.min(window.devicePixelRatio || 1, 2));
        const m = S.m; const t = S.frames.length > 1 ? m.period * (S.frames.length === 2 ? 0.5 : 1 / S.frames.length) : 0;
        draw(S, t, px, px);
        const url = R.renderer.domElement.toDataURL('image/png');
        stills.set(key, url);
        if (live) this._resume();
        return url;
      } catch (e) { supported = false; return null; }
    },
    // Animación en bucle dentro de un elemento. Solo hay una a la vez (un único lienzo WebGL).
    play(el, id, { group, combo, label } = {}) {
      if (!isSupported() || !el) return false;
      try {
        if (!R) build();
        this.stop();
        const canvas = R.renderer.domElement; canvas.className = 'm3d-canvas';
        canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label ? `Animación: ${label}` : 'Animación del ejercicio');
        el.appendChild(canvas);
        const S = setScene(id, { group, combo });
        const t0 = performance.now();
        live = { el, S, id, group, combo, t0, raf: 0, last: 0 };
        const loop = now => {
          if (!live || !canvas.isConnected) { live = null; return; }
          const r = el.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
          // ~30 fotogramas por segundo: suficiente y gasta la mitad de batería.
          if (r.width > 0 && now - live.last > 30) { live.last = now; draw(live.S, (now - live.t0) / 1000, Math.round(r.width * dpr), Math.round(r.height * dpr)); }
          live.raf = requestAnimationFrame(loop);
        };
        live.raf = requestAnimationFrame(loop);
        return true;
      } catch (e) { supported = false; return false; }
    },
    _resume() { if (live) live.S = setScene(live.id, { group: live.group, combo: live.combo }); },
    playing: () => (live ? live.el : null),
    groupOf,
    stop() { if (live) { cancelAnimationFrame(live.raf); const c = R && R.renderer.domElement; if (c && c.parentNode) c.parentNode.removeChild(c); live = null; } },
    // Fotograma suelto en el instante t (para pruebas y capturas).
    renderAt(id, t, size = 200, group) {
      if (!isSupported()) return null;
      if (!R) build();
      const S = setScene(id, { group }); draw(S, t, size, size);
      const url = R.renderer.domElement.toDataURL('image/png'); if (live) this._resume(); return url;
    },
    // Para las pruebas: pose 3D de un ejercicio.
    _to3D: to3D, _motionFor: motionFor,
  };
})();

if (typeof module !== 'undefined') module.exports = { Mannequin3D };
