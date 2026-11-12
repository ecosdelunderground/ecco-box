'use strict';
/* Pictogramas de los ejercicios: figura de palitos en verde neón (estilo ECCO), generada en SVG.
   Cada postura son 11 puntos en una caja de 100x100 (suelo en y=92), vista de lado mirando a la derecha
   salvo las marcadas como frontales. Las extremidades "l" (atrás) van en verde oscuro y las "r" (delante)
   en verde neón, para dar profundidad. Una postura "fantasma" muestra de dónde sale el movimiento. */

const POSES = {
  // De pie y frontales
  stand: { h: [50, 14], n: [50, 24], p: [50, 50], le: [43, 36], lh: [41, 48], re: [57, 36], rh: [59, 48], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
  hips: { h: [50, 14], n: [50, 24], p: [50, 50], le: [39, 38], lh: [45, 49], re: [61, 38], rh: [55, 49], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
  armsOut: { h: [50, 14], n: [50, 24], p: [50, 50], le: [37, 25], lh: [24, 25], re: [63, 25], rh: [76, 25], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
  jackOpen: { h: [50, 14], n: [50, 24], p: [50, 50], le: [40, 15], lh: [33, 5], re: [60, 15], rh: [67, 5], lk: [42, 70], lf: [35, 90], rk: [58, 70], rf: [65, 90] },
  jumpUp: { h: [50, 10], n: [50, 20], p: [50, 46], le: [45, 9], lh: [43, 0], re: [55, 9], rh: [57, 0], lk: [47, 65], lf: [46, 83], rk: [53, 65], rf: [54, 83] },
  shuffle: { h: [50, 18], n: [50, 28], p: [50, 53], le: [43, 38], lh: [45, 27], re: [57, 38], rh: [55, 27], lk: [41, 71], lf: [33, 90], rk: [59, 71], rf: [67, 90] },
  rope: { h: [50, 12], n: [50, 22], p: [50, 48], le: [42, 36], lh: [36, 46], re: [58, 36], rh: [64, 46], lk: [47, 67], lf: [47, 85], rk: [53, 67], rf: [53, 85] },
  triceps: { h: [50, 14], n: [50, 24], p: [50, 50], le: [42, 16], lh: [54, 8], re: [59, 10], rh: [53, 22], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
  cross: { h: [50, 14], n: [50, 24], p: [50, 50], le: [44, 34], lh: [45, 28], re: [42, 29], rh: [31, 30], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
  neck: { h: [44, 16], n: [50, 24], p: [50, 50], le: [43, 36], lh: [41, 48], re: [56, 13], rh: [46, 9], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
  skater: { h: [62, 22], n: [57, 31], p: [50, 54], le: [62, 38], lh: [70, 32], re: [48, 40], rh: [40, 48], lk: [44, 72], lf: [34, 84], rk: [56, 72], rf: [58, 90] },
  seated: { h: [50, 44], n: [50, 54], p: [50, 80], le: [40, 66], lh: [34, 80], re: [60, 66], rh: [66, 80], lk: [33, 86], lf: [52, 90], rk: [67, 86], rf: [48, 90] },
  // Boxeo (de lado)
  guard: { h: [54, 15], n: [51, 25], p: [48, 51], le: [57, 34], lh: [58, 23], re: [61, 35], rh: [63, 24], lk: [42, 70], lf: [36, 90], rk: [56, 70], rf: [60, 90] },
  jab: { h: [54, 15], n: [51, 25], p: [48, 51], le: [57, 34], lh: [58, 23], re: [65, 25], rh: [79, 24], lk: [42, 70], lf: [36, 90], rk: [56, 70], rf: [60, 90] },
  upper: { h: [54, 15], n: [51, 25], p: [48, 51], le: [57, 34], lh: [58, 23], re: [62, 40], rh: [68, 26], lk: [42, 70], lf: [36, 90], rk: [56, 70], rf: [60, 90] },
  // Carrera
  run: { h: [53, 14], n: [51, 24], p: [49, 50], le: [43, 34], lh: [45, 44], re: [58, 33], rh: [63, 25], lk: [44, 70], lf: [41, 89], rk: [61, 62], rf: [58, 80] },
  highKnee: { h: [52, 12], n: [51, 22], p: [49, 48], le: [44, 32], lh: [44, 42], re: [58, 32], rh: [62, 22], lk: [48, 69], lf: [48, 90], rk: [64, 50], rf: [64, 68] },
  buttKick: { h: [52, 12], n: [51, 22], p: [49, 48], le: [43, 33], lh: [44, 43], re: [57, 33], rh: [60, 24], lk: [49, 69], lf: [49, 90], rk: [52, 69], rf: [37, 60] },
  sprint: { h: [58, 14], n: [55, 24], p: [48, 49], le: [44, 30], lh: [40, 40], re: [62, 34], rh: [70, 28], lk: [40, 66], lf: [30, 80], rk: [64, 58], rf: [60, 78] },
  tuck: { h: [52, 8], n: [50, 18], p: [48, 44], le: [58, 26], lh: [66, 34], re: [60, 28], rh: [68, 36], lk: [60, 36], lf: [56, 54], rk: [62, 38], rf: [58, 56] },
  // Piernas
  squat: { h: [58, 32], n: [54, 41], p: [40, 62], le: [63, 45], lh: [75, 43], re: [64, 47], rh: [77, 45], lk: [57, 66], lf: [52, 90], rk: [59, 67], rf: [54, 90] },
  deepSquat: { h: [58, 38], n: [54, 47], p: [44, 75], le: [60, 58], lh: [60, 68], re: [58, 33], rh: [60, 18], lk: [58, 68], lf: [53, 90], rk: [61, 69], rf: [56, 90] },
  kneeCircle: { h: [62, 30], n: [57, 38], p: [44, 58], le: [58, 50], lh: [57, 64], re: [61, 50], rh: [60, 65], lk: [56, 67], lf: [52, 90], rk: [58, 68], rf: [54, 90] },
  lunge: { h: [50, 22], n: [50, 32], p: [50, 58], le: [44, 44], lh: [49, 54], re: [56, 44], rh: [51, 54], lk: [40, 84], lf: [24, 90], rk: [68, 60], rf: [68, 90] },
  wgs: { h: [56, 34], n: [52, 42], p: [44, 64], le: [60, 62], lh: [64, 88], re: [54, 28], rh: [56, 14], lk: [34, 86], lf: [18, 90], rk: [62, 66], rf: [64, 90] },
  legSwing: { h: [48, 14], n: [48, 24], p: [47, 50], le: [42, 36], lh: [44, 48], re: [52, 36], rh: [50, 48], lk: [47, 70], lf: [47, 90], rk: [62, 66], rf: [74, 80] },
  quad: { h: [52, 14], n: [51, 24], p: [49, 50], le: [44, 38], lh: [40, 55], re: [57, 36], rh: [61, 46], lk: [49, 71], lf: [39, 57], rk: [52, 70], rf: [52, 90] },
  hamstring: { h: [70, 30], n: [62, 36], p: [44, 56], le: [66, 48], lh: [72, 58], re: [68, 46], rh: [76, 56], lk: [45, 74], lf: [44, 92], rk: [62, 64], rf: [80, 70] },
  calf: { h: [74, 22], n: [67, 30], p: [52, 54], le: [74, 30], lh: [84, 27], re: [75, 32], rh: [85, 30], lk: [42, 72], lf: [28, 90], rk: [63, 71], rf: [62, 90] },
  chest: { h: [56, 14], n: [54, 24], p: [52, 50], le: [42, 26], lh: [30, 24], re: [60, 36], rh: [62, 47], lk: [49, 70], lf: [48, 90], rk: [56, 70], rf: [57, 90] },
  fold: { h: [62, 80], n: [60, 70], p: [50, 50], le: [61, 80], lh: [61, 90], re: [63, 80], rh: [63, 90], lk: [50, 70], lf: [50, 90], rk: [52, 70], rf: [52, 90] },
  forearm: { h: [54, 14], n: [51, 24], p: [49, 50], le: [58, 34], lh: [72, 30], re: [64, 29], rh: [77, 28], lk: [47, 70], lf: [46, 90], rk: [53, 70], rf: [54, 90] },
  // Suelo boca abajo
  plankHigh: { h: [82, 54], n: [74, 59], p: [46, 72], le: [72, 74], lh: [72, 90], re: [74, 74], rh: [74, 90], lk: [30, 80], lf: [14, 88], rk: [30, 80], rf: [14, 88] },
  shoulderTap: { h: [82, 54], n: [74, 59], p: [46, 72], le: [72, 74], lh: [72, 90], re: [80, 66], rh: [74, 60], lk: [30, 80], lf: [14, 88], rk: [30, 80], rf: [14, 88] },
  plankLow: { h: [82, 66], n: [74, 71], p: [46, 78], le: [72, 90], lh: [84, 90], re: [74, 90], rh: [86, 90], lk: [30, 83], lf: [14, 88], rk: [30, 83], rf: [14, 88] },
  mountain: { h: [82, 54], n: [74, 59], p: [46, 72], le: [72, 74], lh: [72, 90], re: [74, 74], rh: [74, 90], lk: [30, 80], lf: [14, 88], rk: [62, 74], rf: [52, 86] },
  sprawl: { h: [80, 58], n: [72, 65], p: [46, 86], le: [70, 78], lh: [70, 90], re: [72, 78], rh: [72, 90], lk: [30, 89], lf: [13, 90], rk: [30, 89], rf: [13, 90] },
  cobra: { h: [80, 44], n: [74, 52], p: [46, 84], le: [70, 70], lh: [70, 90], re: [72, 70], rh: [72, 90], lk: [30, 88], lf: [12, 90], rk: [30, 88], rf: [12, 90] },
  superman: { h: [80, 76], n: [72, 80], p: [46, 87], le: [83, 76], lh: [94, 72], re: [84, 77], rh: [96, 74], lk: [30, 85], lf: [13, 80], rk: [30, 86], rf: [13, 82] },
  quadruped: { h: [77, 52], n: [68, 57], p: [40, 59], le: [66, 74], lh: [66, 90], re: [68, 74], rh: [68, 90], lk: [38, 90], lf: [20, 90], rk: [40, 90], rf: [22, 90] },
  birddog: { h: [77, 52], n: [68, 57], p: [40, 59], le: [66, 74], lh: [66, 90], re: [80, 55], rh: [93, 53], lk: [26, 58], lf: [9, 56], rk: [40, 90], rf: [22, 90] },
  thoracic: { h: [74, 50], n: [68, 57], p: [40, 59], le: [66, 74], lh: [66, 90], re: [66, 44], rh: [64, 31], lk: [38, 90], lf: [20, 90], rk: [40, 90], rf: [22, 90] },
  child: { h: [72, 86], n: [64, 82], p: [34, 78], le: [76, 88], lh: [90, 90], re: [77, 89], rh: [91, 91], lk: [50, 90], lf: [30, 90], rk: [52, 90], rf: [32, 90] },
  pigeon: { h: [56, 46], n: [54, 56], p: [48, 82], le: [60, 70], lh: [64, 88], re: [62, 70], rh: [66, 89], lk: [30, 88], lf: [12, 90], rk: [64, 88], rf: [50, 90] },
  // Suelo boca arriba
  bridge: { h: [14, 84], n: [22, 86], p: [50, 69], le: [30, 90], lh: [40, 90], re: [31, 90], rh: [41, 90], lk: [63, 62], lf: [69, 90], rk: [65, 63], rf: [71, 90] },
  crunch: { h: [26, 68], n: [31, 76], p: [50, 86], le: [40, 72], lh: [50, 66], re: [41, 73], rh: [52, 68], lk: [63, 69], lf: [74, 90], rk: [65, 70], rf: [76, 90] },
  bicycle: { h: [25, 70], n: [31, 77], p: [50, 86], le: [26, 76], lh: [22, 68], re: [38, 74], rh: [29, 68], lk: [66, 79], lf: [84, 76], rk: [46, 70], rf: [60, 70] },
  deadbug: { h: [14, 84], n: [22, 86], p: [48, 88], le: [24, 74], lh: [25, 62], re: [26, 74], rh: [28, 62], lk: [64, 82], lf: [80, 80], rk: [50, 70], rf: [66, 70] },
  legRaise: { h: [14, 84], n: [22, 86], p: [48, 87], le: [34, 90], lh: [44, 90], re: [35, 90], rh: [45, 90], lk: [55, 69], lf: [61, 51], rk: [56, 70], rf: [62, 52] },
  kneesIn: { h: [14, 84], n: [22, 86], p: [48, 84], le: [34, 90], lh: [44, 90], re: [35, 90], rh: [45, 90], lk: [44, 64], lf: [60, 60], rk: [45, 65], rf: [61, 61] },
  hollow: { h: [22, 74], n: [30, 80], p: [50, 88], le: [21, 72], lh: [10, 69], re: [22, 73], rh: [11, 70], lk: [66, 83], lf: [82, 77], rk: [67, 84], rf: [83, 78] },
  vup: { h: [36, 54], n: [40, 63], p: [50, 86], le: [48, 56], lh: [57, 48], re: [49, 57], rh: [59, 49], lk: [59, 68], lf: [67, 52], rk: [60, 69], rf: [68, 53] },
  russian: { h: [32, 54], n: [36, 62], p: [46, 86], le: [46, 68], lh: [55, 74], re: [47, 70], rh: [57, 76], lk: [59, 70], lf: [72, 78], rk: [60, 71], rf: [73, 79] },
  sidePlank: { h: [82, 44], n: [77, 52], p: [50, 70], le: [78, 39], lh: [78, 25], re: [77, 71], rh: [77, 90], lk: [33, 80], lf: [15, 90], rk: [33, 81], rf: [15, 91] },
  twist: { h: [14, 84], n: [22, 86], p: [48, 87], le: [26, 79], lh: [33, 73], re: [27, 80], rh: [34, 74], lk: [62, 80], lf: [72, 90], rk: [63, 81], rf: [74, 91] },
  // Fuerza (banco a la altura y=68)
  benchPress: { h: [20, 61], n: [28, 64], p: [56, 65], le: [27, 52], lh: [27, 38], re: [29, 52], rh: [29, 38], lk: [68, 70], lf: [72, 92], rk: [70, 70], rf: [74, 92] },
  benchFly: { h: [20, 61], n: [28, 64], p: [56, 65], le: [22, 72], lh: [16, 78], re: [36, 72], rh: [42, 78], lk: [68, 70], lf: [72, 92], rk: [70, 70], rf: [74, 92] },
  pullover: { h: [20, 61], n: [28, 64], p: [56, 65], le: [18, 58], lh: [6, 56], re: [19, 59], rh: [7, 57], lk: [68, 70], lf: [72, 92], rk: [70, 70], rf: [74, 92] },
  benchTri: { h: [20, 61], n: [28, 64], p: [56, 65], le: [28, 48], lh: [18, 50], re: [30, 48], rh: [20, 50], lk: [68, 70], lf: [72, 92], rk: [70, 70], rf: [74, 92] },
  floorPress: { h: [14, 84], n: [22, 86], p: [48, 88], le: [22, 74], lh: [22, 60], re: [24, 74], rh: [24, 60], lk: [62, 72], lf: [72, 90], rk: [64, 72], rf: [74, 91] },
  row: { h: [80, 45], n: [72, 50], p: [42, 54], le: [72, 60], lh: [72, 68], re: [60, 42], rh: [62, 56], lk: [40, 68], lf: [22, 68], rk: [48, 74], rf: [48, 92] },
  kickback: { h: [80, 45], n: [72, 50], p: [42, 54], le: [72, 60], lh: [72, 68], re: [58, 50], rh: [44, 46], lk: [40, 68], lf: [22, 68], rk: [48, 74], rf: [48, 92] },
  prone: { h: [80, 58], n: [72, 61], p: [44, 64], le: [70, 72], lh: [70, 84], re: [72, 72], rh: [72, 84], lk: [28, 65], lf: [12, 66], rk: [28, 66], rf: [12, 67] },
  proneFly: { h: [80, 58], n: [72, 61], p: [44, 64], le: [66, 56], lh: [58, 54], re: [78, 56], rh: [86, 54], lk: [28, 65], lf: [12, 66], rk: [28, 66], rf: [12, 67] },
  proneRow: { h: [80, 58], n: [72, 61], p: [44, 64], le: [62, 52], lh: [66, 64], re: [64, 52], rh: [68, 64], lk: [28, 65], lf: [12, 66], rk: [28, 66], rf: [12, 67] },
  seatedPress: { h: [48, 28], n: [48, 38], p: [48, 66], le: [38, 30], lh: [40, 14], re: [58, 30], rh: [56, 14], lk: [64, 68], lf: [66, 92], rk: [66, 69], rf: [68, 92] },
  seatedTri: { h: [48, 28], n: [48, 38], p: [48, 66], le: [44, 16], lh: [40, 30], re: [52, 16], rh: [42, 31], lk: [64, 68], lf: [66, 92], rk: [66, 69], rf: [68, 92] },
  seatedCurl: { h: [56, 34], n: [52, 43], p: [44, 66], le: [58, 56], lh: [60, 70], re: [62, 60], rh: [64, 48], lk: [64, 68], lf: [66, 92], rk: [66, 69], rf: [68, 92] },
  curl: { h: [50, 14], n: [50, 24], p: [50, 50], le: [44, 38], lh: [42, 50], re: [55, 38], rh: [64, 30], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
  frontRaise: { h: [50, 14], n: [50, 24], p: [50, 50], le: [46, 37], lh: [45, 49], re: [62, 24], rh: [76, 24], lk: [46, 70], lf: [45, 90], rk: [54, 70], rf: [55, 90] },
  dips: { h: [48, 34], n: [46, 44], p: [42, 74], le: [34, 54], lh: [26, 68], re: [36, 54], rh: [28, 68], lk: [62, 72], lf: [72, 92], rk: [64, 73], rf: [74, 92] },
  decline: { h: [84, 64], n: [76, 67], p: [46, 62], le: [74, 78], lh: [74, 92], re: [76, 78], rh: [76, 92], lk: [30, 59], lf: [14, 56], rk: [30, 60], rf: [14, 57] },
  stepUp: { h: [55, 12], n: [53, 22], p: [50, 48], le: [46, 36], lh: [44, 48], re: [58, 36], rh: [60, 48], lk: [48, 70], lf: [46, 92], rk: [66, 56], rf: [76, 72] },
  bulgarian: { h: [56, 26], n: [55, 36], p: [52, 60], le: [50, 46], lh: [50, 58], re: [60, 46], rh: [60, 58], lk: [38, 80], lf: [22, 70], rk: [66, 70], rf: [66, 92] },
};

// Qué dibujo lleva cada ejercicio: pose, fantasma (postura de partida), efectos y accesorios.
const PICTOS = {
  // Calentamiento
  comba: { pose: 'rope', fx: ['rope', 'up'] }, jacks: { pose: 'jackOpen', ghost: 'stand' }, skipping: { pose: 'highKnee' },
  trote: { pose: 'run' }, shuffle: { pose: 'shuffle', fx: ['lr'] }, rebote: { pose: 'guard', fx: ['updown'] }, talones: { pose: 'buttKick' },
  brazos: { pose: 'armsOut', fx: ['circles'] }, hombros: { pose: 'stand', fx: ['shoulders'] }, cadera: { pose: 'hips', fx: ['hipRing'] },
  piernas: { pose: 'legSwing', fx: ['legArc'] }, tronco: { pose: 'hips', fx: ['rot'] }, gato: { pose: 'quadruped', fx: ['arch'] },
  wgs: { pose: 'wgs' }, tobillos: { pose: 'legSwing', fx: ['footCircle'] }, sentprof: { pose: 'deepSquat' },
  toracica: { pose: 'thoracic', ghost: 'quadruped' }, rodillas: { pose: 'kneeCircle', fx: ['kneeRing'] },
  sentadilla: { pose: 'squat', ghost: 'stand' }, puente: { pose: 'bridge', fx: ['up'] }, flexinc: { pose: 'plankHigh', prop: 'box' },
  toques: { pose: 'shoulderTap' }, zancada: { pose: 'lunge', ghost: 'stand' }, birddog: { pose: 'birddog' }, superman: { pose: 'superman' },
  sombraligera: { pose: 'jab', ghost: 'guard' }, piesrapidos: { pose: 'guard', fx: ['feet'] }, jabexpl: { pose: 'jab', fx: ['speed'] },
  sprawlsuave: { pose: 'sprawl', ghost: 'guard' },
  // Asaltos
  sombra: { pose: 'jab', ghost: 'guard' }, saco: { pose: 'jab', prop: 'bag' },
  // HIIT
  burpees: { pose: 'jumpUp', ghost: 'plankHigh', fx: ['up'] }, escaladores: { pose: 'mountain', fx: ['speed'] },
  sentsalto: { pose: 'jumpUp', ghost: 'squat', fx: ['up'] }, sprawls: { pose: 'sprawl', ghost: 'guard' }, highknees: { pose: 'highKnee', fx: ['speed'] },
  flexiones: { pose: 'plankHigh', fx: ['updown'] }, skaters: { pose: 'skater', fx: ['lr'] }, planchajacks: { pose: 'plankHigh', fx: ['lr'] },
  speedpunch: { pose: 'jab', fx: ['speed'] }, zancsalto: { pose: 'lunge', fx: ['up'] }, burpeegolpes: { pose: 'jab', ghost: 'plankHigh' },
  sprint: { pose: 'sprint', fx: ['speed'] }, tuck: { pose: 'tuck', fx: ['up'] }, sentgolpes: { pose: 'jab', ghost: 'squat' },
  shufflegolpes: { pose: 'jab', fx: ['lr'] }, uppersrap: { pose: 'upper', fx: ['speed'] }, ganchosent: { pose: 'squat', fx: ['rot'] },
  // Core
  plancha: { pose: 'plankLow' }, russian: { pose: 'russian', fx: ['rot'] }, bici: { pose: 'bicycle' }, crunchgolpe: { pose: 'crunch', ghost: 'twist' },
  deadbug: { pose: 'deadbug' }, lateral: { pose: 'sidePlank' }, elevpiernas: { pose: 'legRaise', fx: ['updown'] }, hollow: { pose: 'hollow' },
  vups: { pose: 'vup' }, planchat: { pose: 'sidePlank', ghost: 'plankHigh' }, crunchinv: { pose: 'kneesIn', ghost: 'legRaise' },
  escalcruz: { pose: 'mountain' },
  // Vuelta a la calma
  pecho: { pose: 'chest', prop: 'wallL' }, triceps: { pose: 'triceps' }, hombrocruz: { pose: 'cross' }, cuadriceps: { pose: 'quad' },
  isquios: { pose: 'hamstring', prop: 'step' }, paloma: { pose: 'pigeon' }, gemelos: { pose: 'calf', prop: 'wall' }, nino: { pose: 'child' },
  rotespinal: { pose: 'twist', fx: ['rot'] }, respira: { pose: 'seated', fx: ['breath'] }, mariposa: { pose: 'seated' },
  antebrazos: { pose: 'forearm' }, cuello: { pose: 'neck' }, pinza: { pose: 'fold' }, cobra: { pose: 'cobra' },
};

Object.assign(PICTOS, {
  // Fuerza
  presbanco: { pose: 'benchPress', prop: 'bench', fx: ['db2'] }, presdos: { pose: 'benchPress', prop: 'bench', fx: ['db'] },
  aperturas: { pose: 'benchFly', ghost: 'benchPress', prop: 'bench', fx: ['db2'] }, flexdecl: { pose: 'decline', prop: 'benchL' },
  flexlastre: { pose: 'plankHigh', fx: ['updown', 'pack'] }, presuelo: { pose: 'floorPress', fx: ['db2'] },
  remo1: { pose: 'row', prop: 'bench', fx: ['db'] }, remo1pausa: { pose: 'row', prop: 'bench', fx: ['db'] },
  renegado: { pose: 'shoulderTap', fx: ['db'] }, pullover: { pose: 'pullover', ghost: 'benchPress', prop: 'bench', fx: ['db'] },
  remotumb: { pose: 'proneRow', ghost: 'prone', prop: 'bench', fx: ['db2'] }, remoinclinado: { pose: 'hamstring', fx: ['db'] },
  militarsent: { pose: 'seatedPress', prop: 'seat', fx: ['db2'] }, arnold: { pose: 'seatedPress', prop: 'seat', fx: ['db2', 'rot'] },
  laterales: { pose: 'armsOut', ghost: 'stand', fx: ['db2'] }, frontales: { pose: 'frontRaise', ghost: 'stand', fx: ['db'] },
  pajaros: { pose: 'proneFly', ghost: 'prone', prop: 'bench', fx: ['db2'] }, militarpie: { pose: 'jackOpen', fx: ['db2'] }, pajarospie: { pose: 'hamstring', fx: ['db'] },
  curlalt: { pose: 'curl', ghost: 'stand', fx: ['db2'] }, curl: { pose: 'curl', ghost: 'stand', fx: ['db2'] }, martillo: { pose: 'curl', fx: ['db2'] },
  concentrado: { pose: 'seatedCurl', prop: 'seat', fx: ['db'] },
  fondos: { pose: 'dips', prop: 'benchL', fx: ['updown'] }, kickback: { pose: 'kickback', ghost: 'row', prop: 'bench', fx: ['db'] },
  frances: { pose: 'benchTri', ghost: 'benchPress', prop: 'bench', fx: ['db2'] }, extnuca: { pose: 'seatedTri', prop: 'seat', fx: ['db'] },
  arrastre: { pose: 'plankHigh', fx: ['kb', 'lr'] }, curlup: { pose: 'crunch' },
  crunchpeso: { pose: 'crunch', fx: ['db'] }, russianpeso: { pose: 'russian', fx: ['rot'] },
  remomesa: { pose: 'floorPress', fx: ['up'] }, ytw: { pose: 'superman' }, pica: { pose: 'fold', fx: ['updown'] },
  curltoalla: { pose: 'curl' }, diamante: { pose: 'plankHigh', fx: ['updown'] },
  farmer: { pose: 'stand', fx: ['db2'] }, maleta: { pose: 'stand', fx: ['db'] },
  goblet: { pose: 'squat', ghost: 'stand', prop: 'seatL' }, zancatras: { pose: 'lunge', ghost: 'stand', fx: ['db2'] },
  hipthrust: { pose: 'bridge', prop: 'benchLow', fx: ['up'] }, stepup: { pose: 'stepUp', prop: 'step', fx: ['db2'] },
  bulgara: { pose: 'bulgarian', prop: 'stepL', fx: ['db2'] }, puenteuna: { pose: 'bridge', fx: ['up'] },
  pesomuerto: { pose: 'hamstring', fx: ['db'] }, swing: { pose: 'squat', fx: ['kb'] },
});

const PICTO_DEFAULT = { pose: 'guard' };

function pictoFigure(P, cls) {
  const L = (a, b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  return `<g class="${cls}">
    <g class="back">${L(P.n, P.le)}${L(P.le, P.lh)}${L(P.p, P.lk)}${L(P.lk, P.lf)}</g>
    <g class="body">${L(P.n, P.p)}<circle cx="${P.h[0]}" cy="${P.h[1]}" r="5.6"/></g>
    <g class="front">${L(P.p, P.rk)}${L(P.rk, P.rf)}${L(P.n, P.re)}${L(P.re, P.rh)}</g></g>`;
}

const PICTO_FX = {
  up: () => '<path class="fx" d="M90 70V40M85 46l5-6 5 6"/>',
  updown: () => '<path class="fx" d="M90 36v34M85 42l5-6 5 6M85 64l5 6 5-6"/>',
  lr: () => '<path class="fx" d="M24 97h52M30 93l-6 4 6 4M70 93l6 4-6 4"/>',
  speed: () => '<path class="fx" d="M8 30h12M4 40h14M8 50h12"/>',
  rot: () => '<path class="fx" d="M30 40a20 7 0 1 0 40 0M66 35l4 5-6 2"/>',
  circles: () => '<circle class="fx" cx="24" cy="25" r="7"/><circle class="fx" cx="76" cy="25" r="7"/>',
  shoulders: () => '<path class="fx" d="M38 22a6 6 0 1 1 6 6M62 22a6 6 0 1 0-6 6"/>',
  hipRing: () => '<ellipse class="fx" cx="50" cy="50" rx="16" ry="5"/>',
  kneeRing: () => '<ellipse class="fx" cx="58" cy="68" rx="9" ry="4"/>',
  legArc: () => '<path class="fx" d="M36 84a30 30 0 0 0 44-10"/>',
  footCircle: () => '<circle class="fx" cx="76" cy="81" r="6"/>',
  arch: () => '<path class="fx" d="M42 50q13-10 26-2"/>',
  feet: () => '<path class="fx" d="M30 97h8M44 97h8M58 97h8"/>',
  rope: () => '<path class="fx" d="M36 46q-18 40 14 48q32-8 14-48"/>',
  breath: () => '<path class="fx" d="M64 36q4-4 8 0t8 0M64 28q4-4 8 0t8 0"/>',
  // Pesas en las manos (reciben la postura)
  db: P => dumbbell(P.rh), db2: P => dumbbell(P.lh) + dumbbell(P.rh),
  kb: P => `<path class="prop" d="M${P.rh[0] - 3} ${P.rh[1] + 1}a3 3 0 0 1 6 0"/><circle class="prop" cx="${P.rh[0]}" cy="${P.rh[1] + 6}" r="4.5"/>`,
  pack: P => `<rect class="prop" x="${P.n[0] - 22}" y="${P.n[1] - 12}" width="16" height="9" rx="2"/>`,
};
const dumbbell = ([x, y]) => `<path class="prop db" d="M${x - 6} ${y}h12M${x - 6} ${y - 4}v8M${x + 6} ${y - 4}v8"/>`;

const PICTO_PROPS = {
  bag: () => '<path class="prop" d="M86 0v14"/><rect class="prop" x="80" y="14" width="13" height="40" rx="5"/>',
  wall: () => '<path class="prop" d="M90 4v88"/>',
  wallL: () => '<path class="prop" d="M28 4v88"/>',
  box: () => '<rect class="prop" x="62" y="80" width="26" height="12" rx="1"/>',
  step: () => '<rect class="prop" x="70" y="72" width="22" height="20" rx="1"/>',
  stepL: () => '<rect class="prop" x="8" y="72" width="22" height="20" rx="1"/>',
  bench: () => '<rect class="prop" x="12" y="68" width="66" height="5" rx="1.5"/><path class="prop" d="M20 73v19M70 73v19"/>',
  benchL: () => '<rect class="prop" x="2" y="58" width="34" height="5" rx="1.5"/><path class="prop" d="M8 63v29M30 63v29"/>',
  benchLow: () => '<rect class="prop" x="0" y="78" width="30" height="5" rx="1.5"/><path class="prop" d="M6 83v9M24 83v9"/>',
  seat: () => '<rect class="prop" x="30" y="68" width="34" height="5" rx="1.5"/><path class="prop" d="M36 73v19M58 73v19"/>',
  seatL: () => '<rect class="prop" x="22" y="64" width="26" height="28" rx="1.5"/>',
};

// SVG del pictograma de un ejercicio (por id). Si no hay dibujo, guardia de boxeo.
function pictoSVG(id, { size = 120, title = '' } = {}) {
  const d = PICTOS[id] || PICTO_DEFAULT;
  const pose = POSES[d.pose] || POSES.guard;
  const ghost = d.ghost && POSES[d.ghost] ? pictoFigure(POSES[d.ghost], 'ghost') : '';
  const props = d.prop && PICTO_PROPS[d.prop] ? PICTO_PROPS[d.prop]() : '';
  const fx = (d.fx || []).map(f => (PICTO_FX[f] ? PICTO_FX[f](pose) : '')).join('');
  return `<svg class="picto" viewBox="-4 -4 108 108" style="width:${size}px;height:${size}px" role="img" aria-label="${title ? `Cómo se hace: ${title.replace(/"/g, '')}` : 'Postura del ejercicio'}">
    <path class="floor" d="M-2 92.5h104"/>${props}${ghost}${pictoFigure(pose, 'fig')}${fx}</svg>`;
}

if (typeof module !== 'undefined') module.exports = { POSES, PICTOS, pictoSVG };
