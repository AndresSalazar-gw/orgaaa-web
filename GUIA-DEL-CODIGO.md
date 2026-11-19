# Guía del código de ORGAAA

Este archivo explica qué hace cada parte del código y qué concepto de programación web se usa en cada lugar. Dentro de los archivos `.js`, los comentarios `//` explican cada función.

## Cómo está armada la app

1. `index.html` carga los estilos (CSS) y los scripts (JS) en orden.
2. `data.js` trae los datos de ejemplo. `core.js` guarda el estado en `S`.
3. Cada pantalla es una función dentro de `V` (por ejemplo `V.hoy`) que devuelve HTML como texto.
4. `render()` en `app.js` dibuja la pantalla actual con los datos de `S`.
5. Cada botón tiene `data-a="acción"`. Al tocarlo, `app.js` busca esa acción en el objeto `A`, cambia `S`, guarda con `save()` y vuelve a llamar a `render()`.

```
clic en un botón → A.accion() → cambia S → save() → render() → pantalla nueva
```

## Conceptos y dónde están

| Concepto | Dónde verlo |
|---|---|
| HTML semántico (`main`, `nav`, `aside`, `form`) | `index.html`, `shell()` en `app.js` |
| Variables CSS (custom properties) | `css/tokens.css` y su uso con `var(--orange)` |
| Flexbox | `.bar`, `.row`, `.chiprow` en `css/app.css` |
| CSS Grid | `.shell`, `.daily`, `.weekgrid`, `.kan` en `css/app.css` |
| Diseño responsive (media queries) | `css/responsive.css` |
| Animaciones y transiciones CSS | `@keyframes` en `css/base.css` y `css/app.css` |
| Glassmorphism (`backdrop-filter`) | `.glass` en `css/base.css` |
| Selección del DOM | `$` y `$$` en `js/core.js` |
| Template literals (HTML con `${}`) | todas las funciones `V.*` |
| Arreglos: `map`, `filter`, `find`, `sort`, `some` | `vis()`, `openT()` en `core.js`; `kanban()` en `views-daily.js` |
| Objetos | `S`, `SRC`, `CONNECT` en `data.js` |
| Eventos y delegación de eventos | `document.addEventListener('click', …)` en `app.js` |
| Formularios y validación | evento `submit` en `app.js` |
| Arrastrar y soltar (Drag and Drop) | Kanban, al final de `app.js` |
| `localStorage` y JSON | `save()` en `core.js` |
| Rutas con `#hash` | `go()` y `guard()` en `app.js` |
| Temporizadores (`setInterval`, `setTimeout`) | `tick()` y `sim()` en `app.js` |
| Promesas y `async/await` | `advice()`, `reorg()`, `processText()` en `app.js` |
| Expresiones regulares (regex) | `localParse()` en `views-orga.js` |
| Web Speech API (voz: oído y boca) | `js/voz.js` (`oir()`, `hablar()`, `responder()`) |
| SVG y dibujo con una librería (rough.js) | `js/sketch.js` |
| Seguridad básica (escapar texto) | `esc()` en `core.js` |
| Lógica de negocio: clasificador por puntaje | `classify()` y `learn()` en `core.js` |

## Archivos por persona

Para que no choquen los cambios, cada persona trabaja en archivos distintos:

| Persona | Archivos |
|---|---|
| Andrés (flujo y funcionalidad) | `js/*.js` |
| Chris (branding) | `css/tokens.css`, `css/entry.css` |
| John (branding) | logo y textos de la intro (`js/data.js`), carpeta `assets/` |
