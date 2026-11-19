# ORGAAA · Web

ORGAAA junta los pendientes que te llegan por WhatsApp, Slack, Google Calendar y Notion, los ordena con IA y te dice **cómo empezar** cada uno.

Este repo tiene el prototipo funcional de la versión web. Es HTML, CSS y JavaScript sin dependencias ni build.

## Cómo correrlo

- Abrí `index.html` con **Live Server** en VS Code.
- También funciona abriendo el archivo directo en el navegador.
- Los datos se guardan en `localStorage`. Para empezar de cero: **Cuenta → Reiniciar demo**.

## Para entender el código

Leé `GUIA-DEL-CODIGO.md`: explica cómo funciona la app y qué concepto se usa en cada archivo. Dentro de los `.js`, cada función tiene un comentario `//` que dice qué hace.

## Estructura

```
index.html            entrada; carga CSS y JS en orden
css/
  tokens.css          colores, fuentes y radios  ← branding cambia SOLO esto
  base.css            reset, vidrio, botones, chips, capas flotantes
  entry.css           bienvenida, login, registro, intro, crear perfil
  app.css             barra lateral, Daily, Orga, Cuenta
  responsive.css      tablet y celular
js/
  data.js             datos de ejemplo y textos fijos
  core.js             estado, utilidades y clasificador de workspaces
  sketch.js           tachones a mano (rough.js)
  views-entry.js      pantallas de entrada
  views-daily.js      Hoy, Semana, Kanban, Libreta, detalle de tarea
  views-orga.js       Talk with Orga
  voz.js              "Hey Orga": escucha, entiende y responde con voz
  views-cuenta.js     Cuenta, Resumen, Progreso, Recap, Conexiones, Widgets, Plan, Nuevo workspace
  app.js              rutas, acciones, IA y temporizador
```

## Flujo

```
Bienvenido
├── Iniciar sesión ─────────────────────────────► Daily
└── Registrarte → Google → Intro (4) → Crear perfil (4) → Daily

App (barra lateral en escritorio, barra inferior en celular)
├── Daily ── Hoy | Semana · vistas Tarjetas / Kanban / Libreta
├── Hey Orga (⌘K)
└── Cuenta ── perfil y workspaces · Resumen diario · Tu progreso · Tu Recap
              · Conexiones · Widgets · Tu plan · + Nuevo workspace
```

Cada pantalla tiene su ruta con `#`: `#bienvenida`, `#hoy`, `#semana`, `#orga`, `#cuenta`, `#resumen`, `#progreso`, `#recap`, `#conexiones`, `#widgets`, `#plan`, `#nuevo-workspace`.

## Cómo decide Orga el workspace

Suma señales de cada workspace:

| Señal | Peso |
|---|---|
| Canal o chat de origen | 3 |
| Persona que lo pide | 2 |
| Palabra clave | 1 |

- 3 o más: asigna solo.
- 1 o 2: asigna y deja corregir.
- 0: pregunta "¿Dónde va?".
- Cuando corregís, Orga agrega esa persona o canal a las reglas (`learn()` en `core.js`).

## Qué es real y qué es demo

| Parte | Estado |
|---|---|
| Flujo, pantallas, workspaces, kanban, foco de 10 min | Funciona |
| IA (ordenar, consejos, Hey Orga) | Real solo dentro de Claude; afuera usa respuestas de ejemplo |
| Conexiones (WhatsApp, Calendar, Slack, Notion) | Simuladas; muestran la pantalla de permisos |
| Login y registro | Simulados, sin servidor |

## Publicar en Netlify

1. En Netlify: **Add new site → Import from GitHub** y elegí este repo.
2. Build command: vacío. Publish directory: `.`
3. Cada push a `main` se publica solo.

## Trabajo en equipo

Cada integrante trabaja en una rama, hace commit y abre un pull request:

```bash
git pull
git checkout -b nombre/cambio
# … cambios …
git add .
git commit -m "Describe el cambio"
git push -u origin nombre/cambio
```
