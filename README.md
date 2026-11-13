# ECCO Box

Clases guiadas de cardio boxing, fuerza y mixtas en casa, con calendario que rota los ejercicios.
App web instalable (PWA): funciona sin conexión y guarda los datos solo en el dispositivo.

**Abrir:** https://ecosdelunderground.github.io/ecco-box/

**iPhone:** ábrela en Safari → Compartir → «Añadir a pantalla de inicio».
**Android:** ábrela en Chrome → ⋮ → «Instalar aplicación» (o usa el APK).

**Animaciones 3D:** cada ejercicio se ve con un maniquí 3D animado que la app genera en el propio dispositivo
(`mannequin3d.js`, a partir de las posturas de `pictos.js`). No descarga nada y funciona sin conexión.
En el saco, el maniquí hace la combinación del momento. Se puede desactivar en Ajustes → «Animaciones 3D».
Usa [three.js](https://threejs.org) r149 (licencia MIT, en `vendor/`).
