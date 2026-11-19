/* =========================================================
   ORGAAA · NÚCLEO
   Estado, utilidades y la lógica que decide a qué workspace va cada tarea.
   ========================================================= */
// S (de "State") guarda TODO lo que la app sabe: tareas, workspaces, perfil, etc.
// Intentamos leerlo de localStorage (memoria del navegador). Si no hay nada, usamos los datos de ejemplo.
let S;
try {
  S = JSON.parse(localStorage.getItem(KEY));
} catch (e) {}
// Si no había datos guardados (o eran de otra versión), arrancamos con seed() de data.js.
if (!S || S.v !== 1) S = seed();
// save() guarda el estado en localStorage como texto (JSON) para que no se pierda al recargar.
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
};

/* IA: se activan solas si la página corre como artifact de Claude */
// sampleFn = la IA de Claude (pedirle texto); dict = el dictado por voz. Empiezan vacíos (null)
// y se llenan en app.js solo si la página corre dentro de Claude.
let sampleFn = null,
  dict = null;

/* ---------- utilidades ---------- */
// $ busca UN elemento del HTML con un selector CSS (como '#toast' o '.hero').
const $ = (s) => document.querySelector(s);
// $$ busca TODOS los elementos que coincidan y los devuelve como arreglo.
const $$ = (s) => [...document.querySelectorAll(s)];
// esc() "escapa" el texto: convierte < > & " ' en códigos seguros para que nadie pueda inyectar HTML.
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
// uid() crea un id único al azar, por ejemplo 't4f9k2a' para una tarea nueva.
const uid = (p) => p + Math.random().toString(36).slice(2, 8);
// short() recorta un texto largo y le pone '…' al final.
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
// cap() pone la primera letra en mayúscula.
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// nowStr() devuelve la hora actual en formato de El Salvador (ej. 3:30 p. m.).
const nowStr = () => new Date().toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' });
// dayStr() devuelve el día de hoy (o de hoy + off días) como 'Miércoles 18'.
const dayStr = (off = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return cap(d.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric' }));
};
// avc() elige siempre el mismo color de avatar para un mismo nombre.
const avc = (n) => {
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVC[h % AVC.length];
};
// fmt() convierte milisegundos a 'minutos:segundos' para el temporizador (ej. 9:58).
const fmt = (ms) => {
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
// left() = cuánto tiempo le queda al foco de 10 minutos.
const left = () => (S.focus ? S.focus.start + S.focus.dur - Date.now() : 0);
// progress() = qué tanto avanzó el foco, de 0 a 1 (sirve para barras y anillos).
const progress = () => (S.focus ? Math.min(1, (Date.now() - S.focus.start) / S.focus.dur) : 0);
// Nombre del usuario; si todavía no lo escribió, usamos 'Andrea' (la persona de la investigación).
const userName = () => S.profile.name || 'Andrea';

// Logo ORGAAA hecho con texto: ORG en negrita (900) + AAA delgada (500).
const LOGO = '<span class="logo"><b>ORG</b><span>AAA</span></span>';
// sq() dibuja el cuadrito de una app (WA, SL, GC...) con su color.
const sq = (k, cls = '') =>
  `<span class="sq ${cls}" style="background:${SRC[k].color}">${SRC[k].short}</span>`;
// ai() muestra el indicador 'IA en vivo' (verde) o 'Demo' (gris).
const ai = () =>
  `<span class="dotai ${sampleFn ? 'on' : ''}"><i></i>${sampleFn ? 'IA en vivo' : 'Demo'}</span>`;
// ringSvg() dibuja un anillo de progreso en SVG. stroke-dashoffset controla cuánto se ve lleno.
function ringSvg(p, r = 9, sw = 3) {
  const C = 2 * Math.PI * r,
    s = r * 2 + sw + 1;
  return `<svg class="ring" viewBox="0 0 ${s} ${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="${sw}"/><circle data-ring="${r}" cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="#EF7A35" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 ${s / 2} ${s / 2})"/></svg>`;
}

/* ---------- workspaces ---------- */
// Lista de workspaces incluyendo 'Todo' al inicio. Cada uno: [id, nombre, ícono, color].
const wsAll = () => [['todo', 'Todo', '✳'], ...S.workspaces.map((w) => [w.id, w.name, w.icon, w.color])];
// Busca un workspace por su id.
const wsById = (id) => S.workspaces.find((w) => w.id === id);
// Devuelve el nombre de un workspace a partir de su id.
const wsName = (id) => (wsAll().find((w) => w[0] === id) || [0, 'Sin asignar'])[1];
// Devuelve el color de un workspace (gris si no existe).
const wsCol = (id) => (wsById(id) || { color: '#888' }).color;
// wsTag() dibuja la etiqueta de color del workspace. Si la tarea no tiene workspace, muestra '¿Dónde va?'.
const wsTag = (id, act = '', tid = '') =>
  id
    ? `<button class="wstag" style="--c:${wsCol(id)}" ${act ? `data-a="${act}" data-id="${tid}"` : ''}>${esc(wsName(id))}</button>`
    : `<button class="wstag ask" ${act ? `data-a="${act}" data-id="${tid}"` : ''}>¿Dónde va?</button>`;

/* Orga decide a qué workspace va cada tarea sumando señales:
   canal de origen = 3 · persona = 2 · palabra clave = 1
   ≥3 asigna solo · 1–2 asigna y deja corregir · 0 pregunta "¿Dónde va?" */
function classify(text, from, channel) {
  const T = (text + ' ' + (from || '') + ' ' + (channel || '')).toLowerCase();
  let best = null;
  S.workspaces.forEach((w) => {
    let sc = 0;
    const why = [];
    w.channels.forEach((c) => {
      if ((channel && channel.toLowerCase() === c.toLowerCase()) || T.includes(c.toLowerCase())) {
        sc += 3;
        why.push(c);
      }
    });
    w.people.forEach((p) => {
      if (T.includes(p.toLowerCase())) {
        sc += 2;
        why.push(p);
      }
    });
    w.keywords.forEach((k) => {
      if (T.includes(k.toLowerCase())) {
        sc += 1;
        why.push('“' + k + '”');
      }
    });
    if (sc > 0 && (!best || sc > best.sc)) best = { ws: w.id, sc, why: why.slice(0, 2).join(', ') };
  });
  return best
    ? { ws: best.ws, conf: best.sc >= 3 ? 'alta' : 'media', why: best.why }
    : { ws: null, conf: 'baja', why: '' };
}
/* Cuando el usuario corrige, Orga aprende: agrega la persona o el canal a las reglas */
function learn(t, wsId) {
  const w = wsById(wsId);
  if (!w) return '';
  if (t.from && t.from !== 'Vos' && !w.people.includes(t.from)) {
    S.workspaces.forEach((x) => {
      x.people = x.people.filter((p) => p !== t.from);
    });
    w.people.push(t.from);
    return `${t.from} → ${w.name}`;
  }
  if (t.chat && !w.channels.includes(t.chat)) {
    w.channels.push(t.chat);
    return `${t.chat} → ${w.name}`;
  }
  return '';
}

/* ---------- selectores ---------- */
// ¿Está conectada esta app? La voz (Hey Orga) siempre cuenta como conectada.
const srcOn = (k) => k === 'voz' || S.sources[k] === true;
// ¿La tarea pertenece al workspace que está viendo el usuario?
const wsOk = (t) => S.ws === 'todo' || t.ws === S.ws;
// vis() = tareas visibles: de apps conectadas y del workspace actual. Usa filter().
const vis = () => S.tasks.filter((t) => srcOn(t.src) && wsOk(t));
// openT() = pendientes de hoy, ordenados por prioridad (1 primero) y luego por orden (ord). Usa sort().
const openT = () =>
  vis()
    .filter((t) => !t.done && !t.moved && t.ws)
    .sort((a, b) => a.prio - b.prio || a.ord - b.ord);
// unsure() = tareas que Orga no supo dónde poner (sin workspace).
const unsure = () => S.tasks.filter((t) => !t.done && !t.ws && srcOn(t.src));
// Busca una tarea por id con find().
const findT = (id) => S.tasks.find((t) => t.id === id);
// Busca el mensaje original (WhatsApp, Slack...) que generó una tarea.
const msgFor = (id) => S.inbox.find((m) => m.taskId === id);

/* ---------- capas: toast, panel, modal ---------- */
// tt guarda el temporizador del toast para poder reiniciarlo.
let tt;
// toast() muestra un mensajito blanco abajo por 2.3 segundos.
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove('on'), 2300);
}
// openDrawer() abre el panel lateral derecho (detalle de tarea).
function openDrawer(html) {
  $('#drawer').innerHTML = html;
  $('#drawer').classList.add('on');
  $('#scrim').classList.add('on');
}
// openModal() abre una ventana al centro (permisos, compartir, recorrido).
function openModal(html, cls = '') {
  $('#modal').innerHTML = `<div class="box ${cls}">${html}</div>`;
  $('#scrim').classList.add('on');
}
// closeAll() cierra panel, modal y el fondo oscuro.
function closeAll() {
  $('#drawer').classList.remove('on');
  $('#modal').innerHTML = '';
  $('#scrim').classList.remove('on');
}
