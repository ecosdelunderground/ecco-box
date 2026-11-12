// Banco de ejercicios y combinaciones, y rutinas de fuerza.
// Boxeo: calentamiento RAMP (Raise, Activate/Mobilize, Potentiate) + core + sombra, saco y vuelta a la calma.
// lb: 1 marca los ejercicios que cargan la zona lumbar (se quitan con "Cuidar la zona lumbar").

const PUNCHES = { 1: 'jab', 2: 'cross', 3: 'gancho izquierdo', 4: 'gancho derecho', 5: 'uppercut izquierdo', 6: 'uppercut derecho' };

const EXERCISES = {
  // R: elevar pulsaciones y temperatura
  raise: [
    { id: 'comba', n: 'Comba (real o imaginaria)', c: 'Saltos cortos sobre la punta de los pies, codos pegados al cuerpo.' },
    { id: 'jacks', n: 'Jumping jacks', c: 'Ritmo constante, aterriza suave con las rodillas ligeramente flexionadas.' },
    { id: 'skipping', n: 'Skipping (rodillas arriba)', c: 'Rodillas a la altura de la cadera, brazos en guardia.' },
    { id: 'trote', n: 'Trote en el sitio con guardia', c: 'Manos arriba protegiendo la cara, respira por la nariz.' },
    { id: 'shuffle', n: 'Desplazamientos laterales', c: 'Pasos cortos a izquierda y derecha sin cruzar los pies.' },
    { id: 'rebote', n: 'Rebote de boxeador', c: 'En posición de guardia, rebota ligero cambiando el peso adelante y atrás.' },
    { id: 'talones', n: 'Talones al glúteo', c: 'Ritmo vivo, tronco recto y guardia alta.' },
  ],
  // M: movilidad articular
  mobilize: [
    { id: 'brazos', n: 'Círculos de brazos', c: '20 s hacia delante y 20 s hacia atrás, cada vez más amplios.' },
    { id: 'hombros', n: 'Rotación de hombros y escápulas', c: 'Sube, lleva atrás y baja los hombros en círculo lento.' },
    { id: 'cadera', n: 'Rotación de cadera', c: 'Manos en la cintura, círculos amplios en ambos sentidos.' },
    { id: 'piernas', n: 'Balanceo de piernas', c: 'Delante-atrás y luego lateral, apoyándote en la pared si hace falta.' },
    { id: 'tronco', n: 'Rotación de tronco', c: 'Pies fijos, gira el torso como si lanzaras un cross a cada lado.' },
    { id: 'gato', n: 'Gato-vaca', c: 'A cuatro patas, alterna arquear y redondear la espalda despacio.' },
    { id: 'wgs', n: 'Estiramiento "el mejor del mundo"', c: 'Zancada profunda, codo al suelo por dentro del pie y gira abriendo el brazo al techo.' },
    { id: 'tobillos', n: 'Movilidad de tobillos y muñecas', c: 'Círculos de tobillo alternos mientras haces círculos de muñeca.' },
    { id: 'sentprof', n: 'Sentadilla profunda con apertura', c: 'Baja a sentadilla, codos empujan las rodillas hacia fuera, abre un brazo arriba.' },
    { id: 'toracica', n: 'Rotación torácica a cuatro patas', c: 'Mano en la nuca, abre el codo hacia el techo siguiendo con la mirada. Mitad por lado.', sides: true },
    { id: 'rodillas', n: 'Círculos de rodillas', c: 'Pies juntos, manos en las rodillas, círculos suaves en ambos sentidos.' },
  ],
  // A: activación muscular
  activate: [
    { id: 'sentadilla', n: 'Sentadillas al aire', c: 'Peso en los talones, pecho arriba, baja hasta paralelo.' },
    { id: 'puente', n: 'Puente de glúteo', c: 'Tumbado boca arriba, empuja con talones y aprieta glúteo arriba 1 s.' },
    { id: 'flexinc', n: 'Flexiones inclinadas', c: 'Manos en el sofá o una silla, cuerpo en línea recta.' },
    { id: 'toques', n: 'Plancha con toques de hombro', c: 'Pies separados, cadera quieta mientras tocas el hombro contrario.' },
    { id: 'zancada', n: 'Zancadas alternas', c: 'Rodilla trasera cerca del suelo, tronco erguido.' },
    { id: 'birddog', n: 'Bird-dog', c: 'A cuatro patas, extiende brazo y pierna contrarios y aguanta 2 s.' },
    { id: 'superman', lb: 1, n: 'Superman con jab', c: 'Boca abajo, eleva pecho y lanza jabs lentos en el aire.' },
  ],
  // P: potenciación, movimientos rápidos y específicos
  potentiate: [
    { id: 'sombraligera', n: 'Sombra ligera', c: 'Jab, cross y movimiento de pies al 50 %. Céntrate en la técnica.' },
    { id: 'piesrapidos', n: 'Pies rápidos', c: 'Pasitos muy rápidos en el sitio, 5 s a tope y 5 s suave.' },
    { id: 'jabexpl', n: 'Jab-cross explosivos', c: 'Golpes rápidos y relajados, vuelve siempre a la guardia.' },
    { id: 'sprawlsuave', lb: 1, n: 'Sprawl suave + 1-2', c: 'Baja las caderas, vuelve a guardia y lanza jab-cross.' },
  ],
  // Acondicionamiento HIIT entre asaltos
  hiit: [
    { id: 'burpees', lb: 1, n: 'Burpees', c: 'Pecho al suelo, salto arriba. Si cansa, sin salto.' },
    { id: 'escaladores', n: 'Escaladores (mountain climbers)', c: 'Cadera baja, rodillas al pecho a ritmo alto.' },
    { id: 'sentsalto', lb: 1, n: 'Sentadilla con salto', c: 'Aterriza suave y baja directamente a la siguiente.' },
    { id: 'sprawls', lb: 1, n: 'Sprawls', c: 'Lanza las piernas atrás, cadera al suelo y vuelve a guardia.' },
    { id: 'highknees', n: 'Rodillas arriba a tope', c: 'Máxima velocidad con guardia alta.' },
    { id: 'flexiones', n: 'Flexiones', c: 'Cuerpo rígido. Apoya rodillas si hace falta.' },
    { id: 'skaters', n: 'Saltos de patinador', c: 'Salto lateral a una pierna, toca el suelo con la mano contraria.' },
    { id: 'planchajacks', n: 'Plank jacks', c: 'En plancha, abre y cierra las piernas saltando.' },
    { id: 'speedpunch', n: 'Golpes rápidos (speed punches)', c: 'Puños rectos alternos sin parar, a la altura de los hombros.' },
    { id: 'zancsalto', lb: 1, n: 'Zancadas con salto', c: 'Cambia de pierna en el aire, controla la rodilla.' },
    { id: 'burpeegolpes', lb: 1, n: 'Burpee + 1-2-3-2', c: 'Un burpee y al subir lanza la combinación.' },
    { id: 'sprint', n: 'Sprint en el sitio', c: 'Máxima frecuencia de pies, brazos como en carrera.' },
    { id: 'tuck', lb: 1, n: 'Saltos rodillas al pecho', c: 'Salta y sube las rodillas. Aterriza blando.' },
    { id: 'sentgolpes', n: 'Sentadilla + 1-2', c: 'Baja a sentadilla, sube y lanza jab-cross. Sin pausa.' },
    { id: 'shufflegolpes', n: 'Desplazamiento lateral + 1-2', c: 'Dos pasos laterales, jab-cross, y al otro lado.' },
    { id: 'uppersrap', n: 'Uppercuts rápidos', c: 'Uppercuts alternos sin parar, rodillas flexionadas.' },
    { id: 'ganchosent', n: 'Ganchos en sentadilla isométrica', c: 'Mantén la sentadilla mientras lanzas ganchos alternos.' },
  ],
  core: [
    { id: 'plancha', n: 'Plancha', c: 'Codos bajo hombros, aprieta abdomen y glúteos.' },
    { id: 'russian', lb: 1, n: 'Russian twist con golpes', c: 'Sentado con pies elevados, gira lanzando un golpe a cada lado.' },
    { id: 'bici', lb: 1, n: 'Abdominal bicicleta', c: 'Codo a rodilla contraria, lento y controlado.' },
    { id: 'crunchgolpe', lb: 1, n: 'Crunch con jab-cross', c: 'Sube en crunch y lanza 1-2 arriba antes de bajar.' },
    { id: 'deadbug', n: 'Dead bug', c: 'Zona lumbar pegada al suelo, extiende brazo y pierna contrarios.' },
    { id: 'lateral', sides: true, n: 'Plancha lateral', c: 'Mitad del tiempo por cada lado, cadera alta.' },
    { id: 'elevpiernas', lb: 1, n: 'Elevación de piernas', c: 'Tumbado, sube piernas rectas y baja sin tocar el suelo.' },
    { id: 'hollow', lb: 1, n: 'Hollow hold', c: 'Forma de plátano: lumbar pegada, brazos y piernas estirados.' },
    { id: 'vups', lb: 1, n: 'V-ups', c: 'Junta manos y pies arriba. Versión fácil: rodillas flexionadas.' },
    { id: 'planchat', n: 'Plancha con rotación', c: 'Desde plancha alta, gira y abre un brazo al techo. Alterna lados.' },
    { id: 'crunchinv', lb: 1, n: 'Crunch inverso', c: 'Tumbado, lleva las rodillas al pecho despegando la cadera del suelo.' },
    { id: 'curlup', n: 'Curl-up de McGill', c: 'Una pierna flexionada y manos bajo la lumbar. Eleva solo cabeza y hombros unos centímetros y aguanta 8 s.' },
    { id: 'escalcruz', n: 'Escaladores cruzados lentos', c: 'Rodilla hacia el codo contrario, 2 s por repetición.' },
  ],
  cool: [
    { id: 'pecho', sides: true, n: 'Estiramiento de pecho en pared', c: 'Antebrazo en la pared, gira el cuerpo hacia fuera. Mitad por lado.' },
    { id: 'triceps', sides: true, n: 'Estiramiento de tríceps', c: 'Mano detrás de la cabeza, empuja el codo suave. Mitad por lado.' },
    { id: 'hombrocruz', sides: true, n: 'Hombro cruzado', c: 'Brazo cruzado delante del pecho, sujeta por encima del codo.' },
    { id: 'cuadriceps', sides: true, n: 'Cuádriceps de pie', c: 'Talón al glúteo, rodillas juntas. Mitad por lado.' },
    { id: 'isquios', sides: true, n: 'Isquiotibiales', c: 'Pierna estirada sobre un apoyo bajo, inclínate con la espalda recta.' },
    { id: 'paloma', sides: true, n: 'Postura de la paloma', c: 'Abre la cadera, respira profundo. Mitad por lado.' },
    { id: 'gemelos', sides: true, n: 'Gemelos en pared', c: 'Pierna atrás estirada con el talón en el suelo.' },
    { id: 'nino', n: 'Postura del niño', c: 'Glúteos a los talones, brazos estirados al frente.' },
    { id: 'rotespinal', sides: true, n: 'Rotación espinal tumbado', c: 'Rodillas a un lado, mirada al contrario. Mitad por lado.' },
    { id: 'respira', n: 'Respiración 4-4-6', c: 'Inhala 4 s, aguanta 4 s, exhala 6 s. Baja pulsaciones.' },
    { id: 'mariposa', n: 'Mariposa sentado', c: 'Plantas de los pies juntas, deja caer las rodillas y respira.' },
    { id: 'antebrazos', n: 'Antebrazos y muñecas', c: 'Brazo estirado, tira suave de los dedos hacia ti y luego hacia abajo.' },
    { id: 'cuello', n: 'Cuello lateral', c: 'Oreja al hombro sin subirlo, mano encima sin forzar. Mitad por lado.', sides: true },
    { id: 'pinza', lb: 1, n: 'Flexión hacia delante de pie', c: 'Rodillas un poco flexionadas, deja colgar el tronco y los brazos.' },
    { id: 'cobra', n: 'Cobra', c: 'Boca abajo, empuja con las manos y abre el pecho sin tensar la lumbar.' },
  ],
};

// Cada tema da carácter al día y cambia las combinaciones de saco y sombra.
const THEMES = [
  {
    id: 'tecnica', n: 'Técnica y jab', color: '#22d3ee',
    combos: ['1-1-2', '1-2', '1-2-3', '1-2-1-2', '1-1-2-3', 'jab al cuerpo + 1-2', '1-2-3-2'],
    tip: 'Golpes limpios al 70 %. Vuelve siempre a la guardia y respira en cada golpe.',
  },
  {
    id: 'potencia', n: 'Potencia', color: '#ec4899',
    combos: ['2-3-2', '1-2-3-2', '3-2-3', '5-6-3-2', '1-6-3-2', '2-5-2', '3-4-3'],
    tip: 'Gira cadera y pie trasero en cada cross y gancho. Calidad antes que cantidad.',
  },
  {
    id: 'velocidad', n: 'Velocidad', color: '#fbbf24',
    combos: ['1-2-1-2-1-2', '1-1-2', '3-4-3-4', '1-2-3-4-1-2', '1-2 + 1-2', '5-6-5-6'],
    tip: 'Manos relajadas y rápidas. Ráfagas cortas, sin perder la guardia.',
  },
  {
    id: 'defensa', n: 'Defensa y pies', color: '#86efac',
    combos: ['1-2 + esquiva + 2', '1-2 + rodar + 3-2', 'bloquear + 2-3-2', '1-2 + pivote + 1-2', 'esquiva-esquiva + 3-2', 'paso atrás + 1-2'],
    tip: 'Mueve la cabeza después de cada combinación y no te quedes quieto delante del saco.',
  },
  {
    id: 'resistencia', n: 'Resistencia', color: '#a855f7',
    combos: ['1-2 continuos', '1-2-3-2 + 4 sentadillas', 'golpes al cuerpo 3-4-3-4', '1-2-3 + sprawl', 'jabs dobles en movimiento', '1-2-5-2'],
    tip: 'Ritmo constante todo el asalto. Mejor no parar que ir a tope 30 s y fundirse.',
  },
];

/* ---------- Fuerza ----------
   g: grupo muscular · eq: con qué se puede cargar (m = mancuernas, r = rusas; vacío = peso corporal)
   bench: necesita banco · lb: 1 = carga la zona lumbar (se quita con "Cuidar la zona lumbar")
   rx: repeticiones (o tiempo) por serie · w: 'alto' usa el peso más pesado disponible, 'bajo' el más ligero
   rest: descanso recomendado después de cada serie, en segundos. */
const STRENGTH = [
  // Pecho
  { id: 'presbanco', g: 'pecho', n: 'Press de pecho en banco', eq: ['m', 'r'], bench: true, rx: '10-12', w: 'alto', rest: 90, c: 'Pies en el suelo y espalda apoyada sin arquear. Baja controlado hasta el pecho y empuja.' },
  { id: 'flexdecl', g: 'pecho', n: 'Flexiones declinadas', eq: [], bench: true, rx: '8-12', rest: 75, c: 'Pies en el banco y cuerpo en línea: aprieta glúteo y abdomen para que la lumbar no se hunda.' },
  { id: 'aperturas', g: 'pecho', n: 'Aperturas en banco', eq: ['m', 'r'], bench: true, rx: '12-15', w: 'bajo', rest: 60, c: 'Codos algo flexionados. Abre hasta notar el pecho y cierra apretando.' },
  { id: 'presdos', g: 'pecho', n: 'Press con una mancuerna a dos manos', eq: ['m'], bench: true, rx: '12-15', w: 'alto', rest: 60, c: 'Aprieta la mancuerna entre las palmas durante todo el recorrido.' },
  { id: 'flexlastre', g: 'pecho', n: 'Flexiones con lastre', eq: [], rx: '8-12', rest: 90, c: 'Mochila con peso en la espalda alta y cuerpo rígido. Si la lumbar se hunde, quita peso.' },
  { id: 'presuelo', g: 'pecho', n: 'Press en el suelo', eq: ['m', 'r'], rx: '10-12', w: 'alto', rest: 90, c: 'Tumbado con las rodillas flexionadas. Baja hasta que los codos rocen el suelo.' },
  { id: 'flexiones', g: 'pecho', n: 'Flexiones', eq: [], rx: '10-15', rest: 60, c: 'Cuerpo rígido de cabeza a talones. Apoya las rodillas si hace falta.' },
  // Espalda
  { id: 'remo1', g: 'espalda', n: 'Remo a una mano en banco', eq: ['m', 'r'], bench: true, rx: '10-12 por lado', w: 'alto', rest: 60, c: 'Rodilla y mano en el banco, espalda plana. Lleva el codo hacia la cadera.' },
  { id: 'renegado', g: 'espalda', n: 'Remo renegado', eq: ['m', 'r'], rx: '8 por lado', w: 'bajo', rest: 90, c: 'En plancha sobre las pesas con los pies abiertos. Rema sin girar la cadera.' },
  { id: 'pullover', g: 'espalda', n: 'Pullover en banco', eq: ['m', 'r'], bench: true, rx: '12-15', w: 'alto', rest: 60, c: 'Costillas abajo y lumbar pegada al banco: no arquees al bajar los brazos.' },
  { id: 'remotumb', g: 'espalda', n: 'Remo boca abajo en banco', eq: ['m', 'r'], bench: true, rx: '10-12', w: 'alto', rest: 60, c: 'Pecho apoyado en el banco: la espalda baja no carga. Junta las escápulas arriba.' },
  { id: 'remo1pausa', g: 'espalda', n: 'Remo a una mano con pausa', eq: ['m', 'r'], bench: true, rx: '8-10 por lado', w: 'alto', rest: 60, c: 'Como el remo en banco, pero aguanta 2 s arriba apretando la escápula.' },
  { id: 'remoinclinado', g: 'espalda', n: 'Remo inclinado de pie', eq: ['m', 'r'], lb: 1, rx: '10-12', w: 'alto', rest: 75, c: 'Tronco inclinado y espalda neutra, lleva las pesas a la cadera.' },
  { id: 'remomesa', g: 'espalda', n: 'Remo invertido bajo una mesa', eq: [], rx: '8-12', rest: 75, c: 'Bajo una mesa muy firme, agárrate al borde y tira del pecho hacia ella con el cuerpo recto.' },
  { id: 'ytw', g: 'espalda', n: 'Y-T-W boca abajo', eq: [], rx: '8 de cada', rest: 45, c: 'Frente apoyada y piernas en el suelo. Sube solo los brazos formando Y, T y W, juntando las escápulas.' },
  // Hombro
  { id: 'militarsent', g: 'hombro', n: 'Press militar sentado', eq: ['m', 'r'], bench: true, rx: '10-12', w: 'alto', rest: 90, c: 'Sentado en el banco, abdomen firme. Empuja hacia arriba sin arquear la espalda.' },
  { id: 'arnold', g: 'hombro', n: 'Press Arnold sentado', eq: ['m'], bench: true, rx: '10-12', w: 'bajo', rest: 75, c: 'Empieza con las palmas hacia ti y gíralas mientras subes.' },
  { id: 'laterales', g: 'hombro', n: 'Elevaciones laterales', eq: ['m', 'r'], rx: '12-15', w: 'bajo', rest: 60, c: 'Sube hasta la altura de los hombros, codos algo flexionados, sin balanceo.' },
  { id: 'frontales', g: 'hombro', n: 'Elevaciones frontales', eq: ['m', 'r'], rx: '12-15', w: 'bajo', rest: 60, c: 'Brazo al frente hasta los ojos, alterno y controlado.' },
  { id: 'pajaros', g: 'hombro', n: 'Pájaros con el pecho apoyado', eq: ['m', 'r'], bench: true, rx: '12-15', w: 'bajo', rest: 60, c: 'Boca abajo en el banco, abre los brazos en cruz sin subir los hombros.' },
  { id: 'militarpie', g: 'hombro', n: 'Press militar de pie', eq: ['m', 'r'], lb: 1, rx: '8-10', w: 'alto', rest: 90, c: 'De pie, glúteo apretado, empuja sin arquear.' },
  { id: 'pajarospie', g: 'hombro', n: 'Pájaros inclinado de pie', eq: ['m', 'r'], lb: 1, rx: '12-15', w: 'bajo', rest: 60, c: 'Tronco inclinado, abre los brazos en cruz.' },
  { id: 'pica', g: 'hombro', n: 'Flexiones en pica', eq: [], rx: '6-10', rest: 75, c: 'Cadera alta en V invertida. Baja la cabeza entre las manos y empuja.' },
  // Bíceps
  { id: 'curlalt', g: 'biceps', n: 'Curl de bíceps alterno', eq: ['m', 'r'], rx: '10-12 por brazo', w: 'alto', rest: 60, c: 'Codos pegados al cuerpo, sin balancear el tronco.' },
  { id: 'martillo', g: 'biceps', n: 'Curl martillo', eq: ['m', 'r'], rx: '10-12', w: 'alto', rest: 60, c: 'Palmas mirándose, sube sin mover los codos.' },
  { id: 'concentrado', g: 'biceps', n: 'Curl concentrado', eq: ['m', 'r'], bench: true, rx: '10-12 por brazo', w: 'bajo', rest: 60, c: 'Sentado en el banco, codo apoyado en el muslo. Sube lento.' },
  { id: 'curl', g: 'biceps', n: 'Curl de bíceps', eq: ['m', 'r'], rx: '10-12', w: 'alto', rest: 60, c: 'Los dos brazos a la vez, codos quietos y bajada lenta.' },
  { id: 'curltoalla', g: 'biceps', n: 'Curl isométrico con toalla', eq: [], rx: '3 × 10 s', rest: 45, c: 'Pisa una toalla y tira hacia arriba con los codos a 90°, sin moverte.' },
  // Tríceps
  { id: 'fondos', g: 'triceps', n: 'Fondos entre bancos', eq: [], bench: true, rx: '8-12', rest: 60, c: 'Manos en el banco, baja hasta que el codo forme 90° y hombros lejos de las orejas.' },
  { id: 'kickback', g: 'triceps', n: 'Kickback de tríceps', eq: ['m', 'r'], bench: true, rx: '12-15 por brazo', w: 'bajo', rest: 60, c: 'Apoyado en el banco, codo fijo arriba, estira el brazo hacia atrás.' },
  { id: 'frances', g: 'triceps', n: 'Extensión de tríceps tumbado', eq: ['m', 'r'], bench: true, rx: '10-12', w: 'bajo', rest: 60, c: 'Tumbado en el banco, codos apuntando al techo. Baja la pesa detrás de la cabeza.' },
  { id: 'extnuca', g: 'triceps', n: 'Extensión de tríceps sentado', eq: ['m', 'r'], bench: true, rx: '10-12', w: 'alto', rest: 60, c: 'Sentado, pesa a dos manos detrás de la cabeza. Costillas abajo, sin arquear.' },
  { id: 'diamante', g: 'triceps', n: 'Flexiones diamante', eq: [], rx: '6-12', rest: 60, c: 'Manos juntas bajo el pecho y codos pegados. Apoya las rodillas si hace falta.' },
  // Core que protege la lumbar (anti-movimiento)
  { id: 'arrastre', g: 'core', n: 'Plancha con arrastre de rusa', eq: ['r', 'm'], rx: '8 por lado', w: 'bajo', rest: 60, c: 'En plancha alta, pasa la pesa de un lado a otro por debajo del cuerpo sin mover la cadera.' },
  { id: 'birddog', g: 'core', n: 'Bird dog', eq: [], rx: '8 por lado', rest: 45, c: 'A cuatro patas, estira brazo y pierna contrarios y aguanta 3 s. Espalda quieta como una mesa.' },
  { id: 'deadbug', g: 'core', n: 'Dead bug', eq: [], rx: '8 por lado', rest: 45, c: 'Lumbar pegada al suelo todo el rato. Estira brazo y pierna contrarios despacio.' },
  { id: 'curlup', g: 'core', n: 'Curl-up de McGill', eq: [], rx: '5 × 8 s', rest: 45, c: 'Una pierna flexionada, manos bajo la lumbar. Eleva solo cabeza y hombros y aguanta.' },
  { id: 'lateral', g: 'core', n: 'Plancha lateral', eq: [], rx: '20-30 s por lado', rest: 45, c: 'Codo bajo el hombro y cadera alta, cuerpo en línea.' },
  { id: 'crunchpeso', g: 'core', n: 'Crunch con peso', eq: ['m', 'r'], lb: 1, rx: '12-15', w: 'bajo', rest: 45, c: 'Pesa al pecho, sube en crunch.' },
  { id: 'russianpeso', g: 'core', n: 'Russian twist con peso', eq: ['m', 'r'], lb: 1, rx: '10 por lado', w: 'bajo', rest: 45, c: 'Sentado con el tronco inclinado, gira llevando la pesa a cada lado.' },
  // Cargas
  { id: 'farmer', g: 'carga', n: 'Farmer hold', eq: ['m', 'r'], rx: '30-40 s', w: 'alto', rest: 60, c: 'De pie, una pesa en cada mano. Hombros atrás, abdomen firme y respira.' },
  { id: 'maleta', g: 'carga', n: 'Aguante de maleta', eq: ['m', 'r'], rx: '30 s por lado', w: 'alto', rest: 60, c: 'Una sola pesa a un lado. No te inclines: el tronco se queda recto.' },
  // Pierna y glúteo
  { id: 'goblet', g: 'pierna', n: 'Sentadilla goblet al banco', eq: ['m', 'r'], bench: true, rx: '10-12', w: 'alto', rest: 90, c: 'Pesa al pecho. Baja hasta rozar el banco con el glúteo y sube con el pecho alto.' },
  { id: 'zancatras', g: 'pierna', n: 'Zancada atrás con pesas', eq: ['m', 'r'], rx: '8-10 por pierna', w: 'bajo', rest: 75, c: 'Paso largo atrás, tronco erguido, rodilla trasera cerca del suelo.' },
  { id: 'hipthrust', g: 'pierna', n: 'Hip thrust en banco', eq: ['m', 'r'], bench: true, rx: '10-12', w: 'alto', rest: 75, c: 'Espalda alta en el banco. Empuja con los talones y arriba aprieta glúteo sin arquear.' },
  { id: 'stepup', g: 'pierna', n: 'Subida al banco', eq: ['m', 'r'], bench: true, rx: '8-10 por pierna', w: 'bajo', rest: 75, c: 'Pie entero en el banco, sube empujando con esa pierna sin impulso de la de abajo.' },
  { id: 'bulgara', g: 'pierna', n: 'Sentadilla búlgara', eq: ['m', 'r'], bench: true, rx: '8-10 por pierna', w: 'bajo', rest: 75, c: 'Pie trasero en el banco, baja recto. Tronco erguido.' },
  { id: 'puenteuna', g: 'pierna', n: 'Puente de glúteo a una pierna', eq: [], rx: '10 por lado', rest: 45, c: 'Tumbado, una pierna estirada. Sube la cadera apretando glúteo, sin arquear.' },
  { id: 'pesomuerto', g: 'pierna', n: 'Peso muerto rumano', eq: ['m', 'r'], lb: 1, rx: '10-12', w: 'alto', rest: 90, c: 'Cadera atrás con la espalda neutra, pesas pegadas a las piernas.' },
  { id: 'swing', g: 'pierna', n: 'Swing con rusa', eq: ['r'], lb: 1, rx: '15', w: 'alto', rest: 75, c: 'Bisagra de cadera explosiva, la rusa sube a la altura del pecho.' },
];

/* Rutinas de fuerza. Cada día trabaja dos grupos y los días se van alternando.
   Cada hueco es una lista de ejercicios por preferencia: se usa el primero que encaje con el material
   del perfil (y con "Cuidar la zona lumbar"); si ninguno encaja, otro del mismo grupo. */
const STRENGTH_PLANS = {
  torso4: {
    n: 'Torso, 4 días', desc: 'Dos grupos por día: pecho y tríceps, espalda y bíceps, hombros y core, torso completo.',
    days: [
      { id: 'f-pecho', n: 'Pecho + tríceps', color: '#f43f5e', tip: 'Baja controlado y empuja fuerte. Hombros atrás en todo el press.',
        slots: [['presbanco', 'presuelo'], ['flexdecl', 'flexiones'], ['aperturas'], ['fondos', 'extnuca'], ['presdos', 'presuelo', 'flexiones'], ['kickback', 'frances']] },
      { id: 'f-espalda', n: 'Espalda + bíceps', color: '#3b82f6', tip: 'Tira con el codo, no con la mano. Junta las escápulas al final.',
        slots: [['remo1', 'remotumb'], ['renegado', 'remotumb'], ['pullover'], ['curlalt', 'curl'], ['martillo'], ['concentrado', 'curl']] },
      { id: 'f-hombro', n: 'Hombros + core', color: '#f59e0b', tip: 'Pesos ligeros y técnica limpia: el hombro agradece el control.',
        slots: [['militarsent', 'arnold'], ['laterales'], ['frontales'], ['pajaros', 'pajarospie'], ['arrastre', 'lateral'], ['birddog', 'deadbug']] },
      { id: 'f-torso', n: 'Torso completo', color: '#22c55e', tip: 'Un ejercicio por grupo. Mantén la calidad hasta la última serie.',
        slots: [['flexlastre', 'flexiones'], ['remo1pausa', 'remo1'], ['arnold', 'militarsent'], ['curl', 'curlalt'], ['frances', 'extnuca'], ['farmer', 'maleta']] },
    ],
  },
  full3: {
    n: 'Cuerpo completo, 3 días', desc: 'Pierna o glúteo con un grupo de torso cada día, y core.',
    days: [
      { id: 'f-pierpecho', n: 'Pierna + pecho', color: '#14b8a6', tip: 'Pierna primero, con calma. Luego empuje.',
        slots: [['goblet', 'zancatras'], ['presbanco', 'presuelo'], ['zancatras', 'stepup'], ['flexdecl', 'flexiones'], ['laterales'], ['deadbug', 'birddog']] },
      { id: 'f-glutesp', n: 'Glúteo + espalda', color: '#8b5cf6', tip: 'Aprieta el glúteo arriba y tira con los codos.',
        slots: [['hipthrust', 'puenteuna'], ['remotumb', 'remo1'], ['stepup', 'bulgara'], ['remo1', 'renegado'], ['curlalt'], ['lateral', 'curlup']] },
      { id: 'f-pierhomb', n: 'Pierna + hombro', color: '#ec4899', tip: 'Tronco erguido en las zancadas y sin arquear al empujar.',
        slots: [['bulgara', 'zancatras'], ['militarsent', 'arnold'], ['puenteuna', 'hipthrust'], ['pajaros', 'frontales'], ['frances', 'kickback'], ['farmer', 'maleta']] },
    ],
  },
};
const STRENGTH_DAYS = Object.values(STRENGTH_PLANS).flatMap(p => p.days);

// Tipos de entreno que se eligen en cada perfil.
const MODES = {
  boxeo: { n: 'Cardio boxing', desc: 'Calentamiento, saco de 30 min o más y vuelta a la calma' },
  fuerza: { n: 'Fuerza', desc: 'Series y repeticiones con tu material. Pasas tú de serie' },
  mixto: { n: 'Mixto', desc: 'Media clase de fuerza y media de saco' },
};

// Duraciones según la longitud de la sesión elegida en ajustes.
// Tres bloques: Calentamiento (circuito + core + sombra), Saco y Vuelta a la calma.
// warm: ejercicios del circuito (elevar, movilizar, activar, potenciar) que se repiten `sets` veces;
// core: ejercicios de core que también se repiten `sets` veces; shadow: asaltos de sombra;
// bagMin: minutos mínimos del bloque de saco (asaltos + descansos); cool: estiramientos finales.
const SESSION_PRESETS = {
  30: { warm: { raise: 1, mobilize: 1, activate: 1, potentiate: 0 }, sets: 2, core: 1, shadow: 1, bagMin: 30, cool: 3 },
  45: { warm: { raise: 1, mobilize: 1, activate: 1, potentiate: 1 }, sets: 2, core: 2, shadow: 2, bagMin: 30, cool: 4 },
  60: { warm: { raise: 1, mobilize: 1, activate: 1, potentiate: 1 }, sets: 3, core: 2, shadow: 2, bagMin: 36, cool: 5 },
};
// Fuerza: ejercicios y series según la duración. mix: ejercicios de fuerza y minutos de saco en la clase mixta.
const STRENGTH_PRESETS = {
  30: { ex: 4, sets: 3, mix: { ex: 2, bagMin: 12 } },
  45: { ex: 6, sets: 3, mix: { ex: 3, bagMin: 18 } },
  60: { ex: 6, sets: 4, mix: { ex: 4, bagMin: 24 } },
};
const LEVELS = {
  // core: [trabajo, descanso] en segundos; bag: asaltos de saco por encima del mínimo de tiempo;
  // minRest: descanso mínimo entre asaltos.
  principiante: { n: 'Principiante', core: [30, 20], bag: 0, minRest: 60 },
  intermedio: { n: 'Intermedio', core: [40, 15], bag: 0, minRest: 0 },
  avanzado: { n: 'Avanzado', core: [45, 10], bag: 1, minRest: 0 },
};

function comboToText(combo) {
  return combo.replace(/\d/g, d => PUNCHES[d] || d).replace(/-/g, ' · ');
}

function comboToSpeech(combo) {
  return combo.replace(/\d/g, d => PUNCHES[d] ? ' ' + PUNCHES[d] + ' ' : d).replace(/-/g, ',').replace(/\s+/g, ' ').trim();
}

if (typeof module !== 'undefined') module.exports = { PUNCHES, EXERCISES, THEMES, SESSION_PRESETS, LEVELS, STRENGTH, STRENGTH_PLANS, STRENGTH_DAYS, STRENGTH_PRESETS, MODES, comboToText, comboToSpeech };
