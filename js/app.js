/* =========================================================
   ORGAAA · APP
   Rutas, barra lateral, acciones, IA y temporizador.
   ========================================================= */
// Rutas de la app (cada pantalla tiene su #nombre en la URL). Las de entrada están en views-entry.js.
const APP = [
  'hoy',
  'semana',
  'orga',
  'cuenta',
  'cuenta-menu',
  'resumen',
  'progreso',
  'conexiones',
  'widgets',
  'plan',
  'recap',
  'nuevo-workspace',
];
// route = pantalla actual. flash = aviso temporal que aparece en la isla.
let route = 'bienvenida',
  flash = null;

/* ---------- barra lateral (escritorio) y barra inferior (celular) ---------- */
// shell() arma el "esqueleto" de la app: barra lateral (escritorio) + contenido + barra inferior (celular).
// Recibe el HTML de la pantalla actual y lo mete en <main>.
function shell(content) {
  const sec = ['hoy', 'semana'].includes(route) ? 'daily' : route === 'orga' ? 'orga' : 'cuenta';
  const cnt = (id) =>
    S.tasks.filter((t) => !t.done && !t.moved && t.ws && srcOn(t.src) && (id === 'todo' || t.ws === id))
      .length;
  const nm = userName();
  return `<div class="shell">
    <nav class="side" aria-label="Principal">
      <div class="brand">${LOGO}</div>
      <div class="nav">
        <button class="${sec === 'daily' ? 'on' : ''}" data-a="go" data-h="hoy">${I.daily}Daily</button>
        <button class="orga-btn" data-a="go" data-h="orga">${I.mic}Hey Orga<kbd>⌘K</kbd></button>
        <button class="${sec === 'cuenta' ? 'on' : ''}" data-a="go" data-h="cuenta">${I.user}Cuenta</button>
      </div>
      <div class="sec"><span>Workspaces</span><button data-a="addws" aria-label="Agregar workspace">+</button></div>
      <div class="wslist">${wsAll()
        .map(
          (w) =>
            `<button class="${S.ws === w[0] ? 'on' : ''}" data-a="setws" data-k="${w[0]}"><span class="wsico xs" ${w[3] ? `style="background:${w[3]};color:#111"` : ''}>${w[2]}</span>${esc(w[1])}<span class="n">${cnt(w[0]) || ''}</span></button>`,
        )
        .join('')}</div>
      <button class="me" data-a="go" data-h="cuenta"><span class="av" style="background:${avc(nm)}">${esc(nm.charAt(0))}</span><span><b>${esc(nm)}</b><span class="label">${ai()}</span></span></button>
    </nav>
    <main class="main" id="main">${content}</main>
  </div>
  <nav class="tabbar glass" aria-label="Principal">
    <button class="${sec === 'daily' ? 'on' : ''}" data-a="go" data-h="hoy">${I.daily}Daily</button>
    <button class="mic ${sec === 'orga' ? 'on' : ''}" data-a="go" data-h="orga" aria-label="Hey Orga">${I.mic}</button>
    <button class="${sec === 'cuenta' ? 'on' : ''}" data-a="go" data-h="cuenta-menu">${I.user}Cuenta</button>
  </nav>`;
}

/* ---------- Recorrido (solo demo): saltar a cualquier pantalla ---------- */
// Recorrido: solo para la demo. Permite saltar a cualquier pantalla desde el botón '☰ Pantallas'.
const TOUR = [
  [
    'Entrada',
    [
      ['bienvenida', 'Bienvenido'],
      ['iniciar-sesion', 'Iniciar sesión'],
      ['registro', 'Registrarte'],
      ['google', 'Entrar con Google'],
      ['intro', 'Intro (4)'],
      ['crear-perfil', 'Crear perfil (4)'],
    ],
  ],
  [
    'Daily',
    [
      ['hoy', 'Hoy'],
      ['semana', 'Semana'],
      ['orga', 'Hey Orga'],
    ],
  ],
  [
    'Cuenta',
    [
      ['cuenta', 'Perfil'],
      ['resumen', 'Resumen diario'],
      ['progreso', 'Tu progreso'],
      ['recap', 'Tu Recap'],
      ['conexiones', 'Conexiones'],
      ['widgets', 'Widgets'],
      ['plan', 'Tu plan'],
      ['nuevo-workspace', 'Nuevo workspace'],
    ],
  ],
];
// Arma el HTML del modal del recorrido con map() y join(): un chip por pantalla.
const tourHtml =
  () => `<h3 style="font-size:26px;font-weight:500;letter-spacing:-.03em">Recorrido</h3><p class="label" style="margin-top:4px">Saltá a cualquier pantalla. Solo existe en la demo.</p>
  ${TOUR.map(([g, rs]) => `<p class="qlab">${g}</p><div class="chiprow">${rs.map(([r, l]) => `<button class="chip ${route === r ? 'on' : ''}" data-a="jump" data-h="${r}">${l}</button>`).join('')}</div>`).join('')}
  <p class="qlab">Fondo</p><div class="chiprow">${BGS.map(([k, l]) => `<button class="chip ${bgNow() === k ? 'on' : ''}" data-a="setbg" data-k="${k}">${l}</button>`).join('')}</div>
  <div style="display:flex;gap:8px;margin-top:24px"><button class="gbtn glass" data-a="closeall">Cerrar</button><button class="gbtn glass" data-a="coachstart">Ver tutorial</button><span style="flex:1"></span><button class="gbtn glass" data-a="reset">Empezar desde cero</button></div>`;

/* ---------- Fondos de prueba ---------- */
// Fondos disponibles. El primero es el de por defecto.
const BGS = [
  ['tinta', 'Tinta'],
  ['degradado', 'Degradado'],
];
// Fondo actual. Si el guardado ya no existe, usa 'tinta'.
const bgNow = () => (BGS.some((b) => b[0] === S.bg) ? S.bg : 'tinta');

/* ---------- Mini tutorial (primera vez que entrás) ---------- */
// Pasos del mini tutorial: [selector CSS del elemento a señalar, título, texto].
// Los selectores tienen versión escritorio y celular separadas por coma.
const COACH = [
  ['.side .nav [data-h=hoy], .tabbar [data-h=hoy]', 'Daily', 'Tu día ordenado. Lo primero, arriba.'],
  ['.sktabs', 'Hoy o Semana', 'Cambiá entre tu día y tu calendario.'],
  ['.seg', 'Vistas', 'Tarjetas, Kanban o Libreta. Como te guste.'],
  ['.hero', 'Ahora', 'Lo que va primero y cómo empezarlo. La flecha arranca 10 min de foco.'],
  ['.rail .panel', 'Te escribieron', 'Lo que llega por WhatsApp, Slack o Calendar. Orga ya lo leyó.'],
  ['.side .orga-btn, .tabbar .mic', 'Hey Orga', 'Tu chat con Orga. Preguntale qué tenés o contale tus pendientes, escribiendo o hablando. Atajo ⌘K.'],
  ['.wslist', 'Workspaces', 'La U, Trabajo, Personal. Orga decide dónde va cada cosa.'],
  ['.side .me, .tabbar [data-h=cuenta-menu]', 'Cuenta', 'Resumen diario, progreso, Recap y conexiones.'],
];
// Paso actual del tutorial (-1 = apagado).
let coachI = -1;
// Devuelve el primer elemento que coincide y que SÍ se ve en pantalla (mide su tamaño).
const visible = (sel) =>
  [...document.querySelectorAll(sel)].find((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none';
  });
// Arranca el tutorial desde el paso 1, en la pantalla Hoy.
function coachStart() {
  S.view = 'cards';
  S.coachDone = false;
  save();
  if (route !== 'hoy') go('hoy');
  else {
    closeAll();
    render();
  }
  coachI = 0;
  setTimeout(coachShow, 350);
}
// Termina el tutorial y lo marca como visto para que no salga otra vez.
function coachEnd() {
  window.scrollTo(0, 0);
  coachI = -1;
  S.coachDone = true;
  save();
  $('#coach').className = 'coach';
  $('#coach').innerHTML = '';
}
// Dibuja el paso actual: un hueco iluminado sobre el elemento y una tarjeta con el texto.
// getBoundingClientRect() da la posición exacta del elemento en pantalla.
function coachShow() {
  if (coachI < 0) return; // el tutorial ya se cerró (por ejemplo, con Escape)
  while (coachI < COACH.length && !visible(COACH[coachI][0])) coachI++;
  if (coachI >= COACH.length) {
    coachEnd();
    toast('Listo. A ordenaaar ✳');
    return;
  }
  const [sel, t, d] = COACH[coachI],
    el = visible(sel);
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect(),
    pad = 8,
    total = COACH.filter((c) => visible(c[0])).length,
    n = COACH.slice(0, coachI + 1).filter((c) => visible(c[0])).length;
  const below = r.bottom + 190 < innerHeight,
    tw = Math.min(320, innerWidth - 32);
  const left = Math.max(16, Math.min(innerWidth - tw - 16, r.left));
  $('#coach').className = 'coach on';
  $('#coach').innerHTML =
    `<div class="spot" style="left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px"></div>
    <div class="ctip" style="left:${left}px;width:${tw}px;${below ? `top:${r.bottom + 18}px` : `bottom:${innerHeight - r.top + 18}px`}">
      <span class="label">${n} de ${total}</span><b>${t}</b><p>${d}</p>
      <div class="cbtns"><button class="skip" data-a="coachend">Saltar</button><button class="wbtn" data-a="coachnext">${n === total ? 'Empezar' : 'Siguiente'}</button></div></div>`;
  if (window.rough) {
    const sp = $('#coach .spot'),
      w = r.width + pad * 2,
      h = r.height + pad * 2,
      svg = skSvg(w + 16, h + 16, -8, -8);
    svg.appendChild(
      rough
        .svg(svg)
        .rectangle(8, 8, w, h, { stroke: '#EF7A35', strokeWidth: 2.6, roughness: 1.8, seed: coachI + 3 }),
    );
    sp.appendChild(svg);
    skDraw(svg, 'coach' + coachI + Date.now(), 450);
  }
}

/* ---------- render ---------- */
// view() decide qué pantalla dibujar según la ruta.
function view() {
  if (CUENTA.includes(route) || route === 'cuenta-menu') return V.cuenta(route);
  return (V[route] || V.hoy)();
}
// render() vuelve a dibujar TODA la pantalla con el estado actual (S).
// Patrón: cambia el estado → save() → render(). Así la pantalla siempre refleja los datos.
function render() {
  const entry = ENTRY.includes(route);
  document.body.className =
    (entry ? 'entry-mode ' : '') + (route === 'bienvenida' ? 'brand ' : '') + 'bg-' + bgNow();
  const mm = $('.fx .mm');
  if (mm && mm.dataset.k !== bgNow()) {
    mm.innerHTML = '';
    mm.dataset.k = bgNow();
  }
  if (bgNow() === 'manchas') bgManchas();
  if (bgNow() === 'tinta') requestAnimationFrame(bgTinta);
  $('#root').innerHTML = entry ? `<div class="entry">${V[route]()}</div>` : shell(view());
  if (route === 'orga') chatAfter(); // el chat baja al último mensaje
  island();
  tick();
  requestAnimationFrame(() => {
    sketch();
    skTabs();
    welcomeScribble();
    brandScribble();
    introScribble();
    handRings();
  });
}

/* ---------- rutas (hash) ---------- */
// guard() protege rutas: si no iniciaste sesión te manda a la bienvenida;
// si no terminaste el onboarding, a la intro.
function guard(r) {
  if (!ENTRY.includes(r) && !APP.includes(r)) r = S.authed ? 'hoy' : 'bienvenida';
  if (APP.includes(r) && !S.authed) r = 'bienvenida';
  if (APP.includes(r) && !S.onboarded) r = 'intro';
  if (r === 'nuevo-workspace' && !S.nw) r = 'cuenta';
  return r;
}
// go() navega a otra pantalla: pasa por guard(), cambia el #hash de la URL y redibuja.
function go(r) {
  r = guard(r);
  const changed = r !== route;
  if (r === 'recap' && route !== 'recap') S.recapI = 0;
  route = r;
  closeAll();
  try {
    if (location.hash !== '#' + r) history.replaceState(null, '', '#' + r);
  } catch (e) {}
  render();
  if (changed) window.scrollTo(0, 0);
}
// Si cambia el tamaño de la ventana durante el tutorial, recalcula la posición.
addEventListener('resize', () => {
  if (coachI >= 0) coachShow();
});
// Si el usuario usa atrás/adelante del navegador, cambiamos de pantalla.
addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (h && h !== route) go(h);
});

/* ---------- isla y temporizador ---------- */
// island() actualiza la isla de arriba (como la Dynamic Island):
// muestra un mensaje nuevo (flash) o el temporizador del foco.
function island() {
  const el = $('#island'),
    f = S.focus && findT(S.focus.id);
  if (flash && Date.now() < flash.until) {
    el.className = 'island on';
    el.innerHTML = `<span class="l">${sq(flash.src, 'xs')}${esc(short(flash.text, 46))}</span><span class="o">✳</span>`;
    return;
  }
  if (f) {
    el.className = 'island on';
    el.dataset.a = 'go';
    el.dataset.h = 'hoy';
    el.innerHTML = `<span class="l">${ringSvg(progress())}${esc(short(f.title, 28))}</span><span class="o" data-timer>${fmt(left())}</span>`;
  } else {
    el.className = 'island';
    el.innerHTML = '';
  }
}
// tick() corre cada segundo: actualiza números del temporizador, barras y anillos sin redibujar todo.
function tick() {
  if (!S.focus) return;
  if (left() <= 0) {
    S.focus = null;
    save();
    toast('¡10 min! Ya arrancaste.');
    render();
    return;
  }
  $$('[data-timer]').forEach((e) => (e.textContent = fmt(left())));
  const p = progress();
  $$('[data-bar]').forEach((e) => (e.style.width = p * 100 + '%'));
  $$('[data-ring]').forEach((e) => {
    const r = +e.dataset.ring;
    e.setAttribute('stroke-dashoffset', 2 * Math.PI * r * (1 - p));
  });
}
// setInterval ejecuta tick() cada 1000 ms (1 segundo).
setInterval(() => {
  tick();
  if (flash && Date.now() >= flash.until) {
    flash = null;
    island();
  }
}, 1000);

/* ---------- acciones sobre tareas ---------- */
// done() marca una tarea como hecha: primero dibuja el tachón a mano y 650 ms después redibuja.
function done(id) {
  const t = findT(id);
  if (!t || t.done) return;
  const tgt = document.querySelector(
    `.row[data-id="${id}"] .t .ink, .hero[data-id="${id}"] h2 .ink, .kc[data-id="${id}"] .kt .ink, .ln[data-id="${id}"] span .ink`,
  );
  if (tgt) {
    const libro = !!tgt.closest('.ln');
    tgt.dataset.sk = 'strike';
    tgt.dataset.skk = (libro ? 'lx-' : 'x-') + id;
    tgt.dataset.skc = libro ? '#c0392b' : '#EF7A35';
    sketch();
  }
  $$(`.row[data-id="${id}"],.hero[data-id="${id}"],.kc[data-id="${id}"]`).forEach((e) =>
    e.classList.add('closing'),
  );
  t.done = true;
  t.moved = false;
  S.closed++;
  if (S.focus && S.focus.id === id) S.focus = null;
  save();
  closeAll();
  toast('✓ Una menos');
  setTimeout(render, 650);
}
// focus() arranca 10 minutos de foco sobre una tarea (600000 ms).
function focus(id) {
  const t = findT(id);
  if (!t) return;
  t.moved = false;
  S.focus = { id, start: Date.now(), dur: 600000 };
  save();
  toast('10 min. Mirá la isla ↑');
  if (!['hoy', 'widgets'].includes(route)) go('hoy');
  else {
    closeAll();
    render();
  }
}
// moveTo() se usa al soltar una tarjeta en el Kanban: decide qué hacer según la columna.
function moveTo(id, col) {
  const t = findT(id);
  if (!t) return;
  if (col === 'done') return done(id);
  if (col === 'focus') return focus(id);
  if (t.done) {
    t.done = false;
    S.closed = Math.max(0, S.closed - 1);
  }
  if (S.focus && S.focus.id === id) S.focus = null;
  t.moved = col === 'manana';
  save();
  render();
  toast(col === 'manana' ? 'A mañana. Sin culpa.' : 'De vuelta a hoy');
}

/* Simula un mensaje que llega por WhatsApp, Slack o Calendar */
// sim() simula que llega un mensaje (WhatsApp/Slack/Calendar).
// 1) aparece 'Orga está leyendo…' 2) a los 1.6 s se convierte en tarea y classify() decide el workspace.
function sim() {
  const s = SIM[S.simIdx % SIM.length];
  S.simIdx++;
  S.sources[s.src] = true;
  const m = {
    id: uid('m'),
    src: s.src,
    from: s.from,
    chat: s.chat,
    time: nowStr(),
    gist: s.gist,
    taskId: null,
    reading: true,
    fresh: true,
  };
  S.inbox.unshift(m);
  if (route !== 'hoy' || S.view === 'kanban') {
    S.view = S.view === 'kanban' ? 'cards' : S.view;
    route = 'hoy';
  }
  flash = { src: s.src, text: `${s.from}: ${s.gist}`, until: Date.now() + 1600 };
  render();
  setTimeout(() => {
    const c = classify(s.gist + ' ' + s.task.title, s.from, s.chat),
      id = uid('t');
    S.tasks.push({
      id,
      ws: c.ws,
      title: s.task.title,
      src: s.src,
      from: s.from,
      chat: s.chat,
      due: s.task.due,
      day: s.task.day,
      prio: s.task.prio,
      ord: s.task.prio === 1 ? -1 : 50,
      min: s.task.min,
      start: s.task.start,
    });
    m.reading = false;
    m.taskId = id;
    S.inbox.forEach((x) => (x.fresh = false));
    save();
    flash = {
      src: s.src,
      text: c.ws ? `Nueva → ${wsName(c.ws)}: ${s.task.title}` : `¿Dónde va “${s.task.title}”?`,
      until: Date.now() + 3000,
    };
    render();
    toast(c.ws ? '✳ Nueva tarea' : '✳ Orga te pregunta');
  }, 1600);
}

/* ---------- IA (Claude) con respaldo sin IA ---------- */
// Si el usuario no dio permiso a la IA, la apagamos y seguimos en modo demo.
function aiErr(e) {
  if (e && e.code === 'not_granted') {
    sampleFn = null;
    render();
  }
}
// advice() pide a la IA otro consejo para empezar la tarea. async/await = espera la respuesta sin congelar la página.
// Sin IA, rota entre consejos fijos (CANNED).
async function advice(id) {
  const t = findT(id),
    p = $('#adv'),
    b = $('#advBtn');
  if (!t || !p) return;
  if (!sampleFn) {
    const nx = CANNED[(CANNED.indexOf(p.textContent) + 1) % CANNED.length];
    p.textContent = nx;
    t.start = nx;
    save();
    return;
  }
  b.classList.add('busy');
  p.textContent = '…';
  try {
    const r = await sampleFn(
      `Sos Orga. Voseo salvadoreño, directo, sin culpa. Dame UN primer paso físico para empezar esta tarea YA, de 2 a 15 minutos. MÁXIMO 9 palabras. Sin saludo, sin comillas, sin listas.
Tarea: "${t.title}" (pedida por ${t.from}, para ${t.due}). No repitás: "${t.start}"`,
      {
        modelTier: 'quick',
        cache: false,
        onText: ({ text }) => {
          const a = $('#adv');
          if (a) a.textContent = text;
        },
      },
    );
    const x = (r.text || '').trim().replace(/^"|"$/g, '');
    if (x) {
      t.start = x;
      save();
      const a = $('#adv');
      if (a) a.textContent = x;
    }
  } catch (e) {
    aiErr(e);
    p.textContent = t.start;
  }
  b && b.classList.remove('busy');
}
// reorg() reordena los pendientes. Con IA: le mandamos las tareas y nos devuelve un JSON con el orden.
// Sin IA: ordena por prioridad y deja primero lo que toma 5 min o menos.
async function reorg() {
  const b = $('#reorgBtn');
  b && b.classList.add('busy');
  const tasks = vis().filter((t) => !t.done && t.ws);
  let ok = false;
  if (sampleFn) {
    try {
      const r =
        await sampleFn.json(`Sos Orga. Ordená estos pendientes de una universitaria salvadoreña que estudia y trabaja, de más a menos prioritario: urgencia, impacto (dinero, clientes, compañeros esperando) y lo de ≤5 min conviene sacarlo rápido.
Respondé SOLO JSON: {"orden":["ids"],"consejos":{"<id>":"primer paso, máx 9 palabras, voseo"}} (consejos solo para las 3 primeras).
Tareas: ${JSON.stringify(tasks.map((t) => ({ id: t.id, titulo: t.title, de: t.from, cuando: t.due, min: t.min })))}`);
      if (r && Array.isArray(r.orden)) {
        r.orden.forEach((id, i) => {
          const t = findT(id);
          if (t) {
            t.ord = i;
            t.prio = i < 3 ? 1 : i < 5 ? 2 : 3;
            t.moved = false;
          }
        });
        if (r.consejos)
          for (const id in r.consejos) {
            const t = findT(id);
            if (t && r.consejos[id]) t.start = r.consejos[id];
          }
        ok = true;
      }
    } catch (e) {
      aiErr(e);
    }
  }
  if (!ok) {
    await new Promise((r) => setTimeout(r, 700));
    tasks
      .sort((a, b) => a.prio - b.prio || (a.min <= 5 ? -1 : 0) - (b.min <= 5 ? -1 : 0) || a.ord - b.ord)
      .forEach((t, i) => (t.ord = i));
  }
  save();
  render();
  toast('✳ Reordenado');
}
/* Dictado de Claude (solo dentro de Claude). Afuera, el chat usa el micrófono del navegador (voz.js). */
// setupDict() conecta el dictado con el chat: texto parcial en la barra, y al terminar se envía.
function setupDict() {
  let dicho = '';
  dict.onPartial(({ text }) => {
    const i = $('#chatIn');
    if (i) i.value = (dicho + ' ' + text).trim();
  });
  dict.onFinal(({ text }) => {
    dicho = (dicho + ' ' + text).trim();
  });
  dict.onState(({ state }) => {
    if (state === 'listening') return;
    if (orga.listening) {
      orga.listening = false;
      const txt = dicho;
      dicho = '';
      if (route === 'orga') render();
      if (txt) enviar(txt, true);
    }
  });
}

/* ---------- nuevo workspace ---------- */
// Guarda lo que escribiste en el nombre del workspace antes de redibujar (si no, se borraría).
function nwCap() {
  const i = $('#nwname');
  if (i && S.nw) S.nw.name = i.value;
}
// Agrega o quita un chip (canal, persona, palabra, horario) del workspace nuevo.
function nwToggle(f, b) {
  nwCap();
  const k = b.dataset.k,
    a = S.nw[f];
  a.includes(k) ? a.splice(a.indexOf(k), 1) : a.push(k);
  save();
  b.classList.toggle('on', a.includes(k));
}
// Guarda el nombre escrito en Crear perfil.
function capName() {
  const i = $('#pname');
  if (i) {
    S.profile.name = i.value.trim();
    save();
  }
}

/* ---------- mapa de acciones (data-a="…") ---------- */
// A = mapa de ACCIONES. Cada botón del HTML tiene data-a="nombre" y aquí está qué hace.
// Ventaja: un solo listener de clic para toda la app (delegación de eventos), ver más abajo.
const A = {
  go: (b) => go(b.dataset.h),
  // Botón "Hey Orga" de Hoy: abre el chat y prende el micrófono de una vez.
  voz: () => {
    go('orga');
    setTimeout(chatMic, 120);
  },
  closeall: closeAll,
  noop: () => {},
  setbg: (b) => {
    S.bg = b.dataset.k;
    save();
    render();
    $$('[data-a=setbg]').forEach((x) => x.classList.toggle('on', x.dataset.k === S.bg));
  },
  coachstart: () => {
    closeAll();
    coachStart();
  },
  coachnext: () => {
    coachI++;
    coachShow();
  },
  coachend: () => coachEnd(),
  setopt: (b) => {
    S.brandOpt = b.dataset.k;
    save();
    render();
  },
  tour: () => openModal(tourHtml(), 'wide'),
  jump: (b) => {
    const r = b.dataset.h;
    if (APP.includes(r)) {
      S.authed = true;
      S.onboarded = true;
    }
    if (r === 'intro') S.introI = 0;
    if (r === 'crear-perfil') S.pfI = 0;
    if (r === 'nuevo-workspace') return A.addws();
    save();
    go(r);
  },
  /* entrada */
  loginGoogle: () => {
    S.authed = true;
    S.onboarded = true;
    if (!S.profile.email) S.profile.email = 'andrea.m@gmail.com';
    save();
    toast('Hola de nuevo ✳');
    go('hoy');
  },
  googlePick: (b) => {
    S.authed = true;
    S.profile.name = b.dataset.n.split(' ')[0];
    S.profile.email = b.dataset.m;
    S.introI = 0;
    save();
    go('intro');
  },
  introNext: () => {
    if ((S.introI || 0) >= 3) {
      S.pfI = 0;
      save();
      return go('crear-perfil');
    }
    S.introI++;
    save();
    render();
  },
  introPrev: () => {
    S.introI = Math.max(0, S.introI - 1);
    save();
    render();
  },
  pfNext: () => {
    capName();
    if (S.pfI === 2)
      ['wa', 'gcal', 'slack', 'notion'].forEach((k) => (S.sources[k] = S.profile.apps.includes(k)));
    S.pfI = Math.min(3, S.pfI + 1);
    save();
    render();
  },
  pfPrev: () => {
    capName();
    if (!S.pfI) return go('intro');
    S.pfI--;
    save();
    render();
  },
  pfRubro: (b) => {
    capName();
    S.profile.rubro = b.dataset.k;
    save();
    render();
  },
  pfUso: (b) => {
    const k = b.dataset.k,
      u = S.profile.uso;
    u.includes(k) ? u.splice(u.indexOf(k), 1) : u.push(k);
    save();
    b.classList.toggle('on', u.includes(k));
  },
  pfApp: (b) => {
    const k = b.dataset.k,
      u = S.profile.apps;
    u.includes(k) ? u.splice(u.indexOf(k), 1) : u.push(k);
    save();
    b.classList.toggle('on', u.includes(k));
  },
  pfFuente: (b) => {
    S.profile.fuente = b.dataset.k;
    save();
    $$('[data-a="pfFuente"]').forEach((x) => x.classList.toggle('on', x.dataset.k === S.profile.fuente));
  },
  pfDone: () => {
    capName();
    S.authed = true;
    S.onboarded = true;
    save();
    toast(`Bienvenid@, ${userName()} ✳`);
    go('hoy');
    if (!S.coachDone) setTimeout(coachStart, 700);
  },
  logout: () => {
    S.authed = false;
    save();
    go('bienvenida');
  },
  reset: () => {
    S = seed();
    save();
    drawnSk.clear();
    go('bienvenida');
  },
  /* daily */
  task: (b) => taskDrawer(b.dataset.id),
  done: (b) => done(b.dataset.id),
  undo: (b) => {
    const t = findT(b.dataset.id);
    if (t) {
      t.done = false;
      S.closed = Math.max(0, S.closed - 1);
      save();
      render();
    }
  },
  focus: (b) => focus(b.dataset.id),
  focusTop: () => {
    const t = openT()[0];
    t ? focus(t.id) : toast('Nada pendiente');
  },
  stopfocus: () => {
    S.focus = null;
    save();
    render();
  },
  advice: (b) => advice(b.dataset.id),
  move: (b) => {
    const t = findT(b.dataset.id);
    t.moved = true;
    if (S.focus && S.focus.id === t.id) S.focus = null;
    save();
    closeAll();
    toast('A mañana. Sin culpa.');
    render();
  },
  unmove: (b) => {
    const t = findT(b.dataset.id);
    t.moved = false;
    save();
    render();
    toast('De vuelta a hoy');
  },
  more: () => {
    S.showMore = !S.showMore;
    save();
    render();
  },
  setview: (b) => {
    S.view = b.dataset.k;
    save();
    render();
  },
  calday: (b) => {
    S.calDay = +b.dataset.k;
    save();
    render();
  },
  reorg,
  sim,
  assign: (b) => {
    const t = findT(b.dataset.id);
    if (!t) return;
    const wasOpen = $('#drawer').classList.contains('on');
    t.ws = b.dataset.k;
    const l = learn(t, t.ws);
    save();
    render();
    toast(l ? '✳ Orga aprendió' : 'Movida a ' + wsName(t.ws));
    if (wasOpen) taskDrawer(t.id, l);
  },
  setws: (b) => {
    S.ws = b.dataset.k;
    save();
    render();
  },
  /* orga (chat) */
  chatmic: () => chatMic(),
  chatask: (b) => enviar(b.dataset.q),
  chatadd: (b) => agregarBorrador(+b.dataset.m),
  chatdrop: (b) => {
    S.chat.splice(+b.dataset.m, 1);
    save();
    chatDraw();
  },
  // Cambia el workspace de una tarea del borrador (rota entre los que hay).
  chatws: (b) => {
    const t = msgs()[+b.dataset.m].draft.tareas[+b.dataset.i];
    const ids = [...S.workspaces.map((w) => w.id), null];
    t.ws = ids[(ids.indexOf(t.ws) + 1) % ids.length];
    save();
    chatDraw();
  },
  chatclear: () => {
    S.chat = [];
    save();
    render();
  },
  /* cuenta */
  toggleacct: () => {
    S.acctOpen = !S.acctOpen;
    save();
    $('.acct') && $('.acct').classList.toggle('open', S.acctOpen);
  },
  setout: (b) => {
    S.out = b.dataset.k;
    save();
    render();
  },
  setdig: (b) => {
    S.digest = b.dataset.k;
    save();
    render();
    toast('Listo');
  },
  connect: (b) => connectModal(b.dataset.k),
  pick: (b) => {
    const app = b.dataset.app,
      k = b.dataset.k,
      a = S.picks[app] || (S.picks[app] = []);
    a.includes(k) ? a.splice(a.indexOf(k), 1) : a.push(k);
    save();
    b.classList.toggle('on', a.includes(k));
    b.querySelector('.ck').textContent = a.includes(k) ? '✓' : '';
  },
  allow: (b) => {
    const k = b.dataset.k;
    if (CONNECT[k].pick && !(S.picks[k] || []).length) {
      toast('Elegí al menos uno');
      return;
    }
    S.sources[k] = true;
    save();
    closeAll();
    render();
    toast(`✓ ${SRC[k].name} conectado`);
  },
  disconnect: (b) => {
    S.sources[b.dataset.k] = false;
    save();
    closeAll();
    render();
    toast('Desconectado');
  },
  pro: () => toast('Pro llega pronto ✳'),
  recapnext: () => {
    S.recapI = ((S.recapI || 0) + 1) % 6;
    save();
    render();
  },
  recapprev: () => {
    S.recapI = ((S.recapI || 0) + 5) % 6;
    save();
    render();
  },
  share: () =>
    openModal(
      `<h3 style="font-size:24px;font-weight:500;letter-spacing:-.03em">Compartir tu Recap</h3><div class="sgrid">${[
        ['IG', 'Stories', '#E1306C'],
        ['WA', 'WhatsApp', '#25D366'],
        ['TT', 'TikTok', '#111'],
        ['X', 'X', '#333'],
        ['🔗', 'Copiar link', '#444'],
        ['⬇', 'Guardar', '#444'],
      ]
        .map(
          ([i, l, c]) =>
            `<button class="sopt" data-a="shareto" data-k="${l}"><span style="background:${c}">${i}</span>${l}</button>`,
        )
        .join('')}</div>`,
    ),
  shareto: (b) => {
    closeAll();
    toast(b.dataset.k === 'Copiar link' ? 'Link copiado (demo)' : 'Listo para ' + b.dataset.k + ' (demo)');
  },
  /* nuevo workspace */
  addws: () => {
    S.nw = {
      step: 0,
      name: '',
      type: 'Proyecto',
      color: '#FF6FCF',
      channels: [],
      people: [],
      keywords: [],
      time: [],
    };
    save();
    go('nuevo-workspace');
  },
  nwnext: () => {
    nwCap();
    if (S.nw.step === 0 && !S.nw.name.trim()) {
      toast('Ponele un nombre');
      return;
    }
    S.nw.step++;
    save();
    render();
  },
  nwback: () => {
    nwCap();
    if (S.nw.step === 0) return A.nwcancel();
    S.nw.step--;
    save();
    render();
  },
  nwcancel: () => {
    S.nw = null;
    save();
    go('cuenta');
  },
  nwtype: (b) => {
    nwCap();
    S.nw.type = b.dataset.k;
    save();
    render();
  },
  nwcolor: (b) => {
    nwCap();
    S.nw.color = b.dataset.k;
    save();
    render();
  },
  nwch: (b) => nwToggle('channels', b),
  nwpp: (b) => nwToggle('people', b),
  nwkw: (b) => nwToggle('keywords', b),
  nwtime: (b) => nwToggle('time', b),
  nwdone: () => {
    const n = S.nw,
      id = uid('w');
    S.workspaces.push({
      id,
      name: n.name.trim(),
      icon: n.name.trim().charAt(0).toUpperCase(),
      color: n.color,
      type: n.type,
      channels: n.channels,
      people: n.people,
      keywords: n.keywords,
      time: n.time,
    });
    // Orga revisa lo que estaba sin lugar con las reglas nuevas
    S.tasks
      .filter((t) => !t.ws)
      .forEach((t) => {
        const c = classify(t.title, t.from, t.chat);
        if (c.ws) t.ws = c.ws;
      });
    S.ws = id;
    S.nw = null;
    S.acctOpen = true;
    save();
    toast('Workspace creado ✳');
    go('hoy');
  },
};
// Delegación de eventos: escuchamos TODOS los clics del documento y buscamos el elemento con data-a más cercano.
// Así los botones funcionan aunque se creen después con render().
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  e.stopPropagation();
  const f = A[b.dataset.a];
  if (f) f(b, e);
});

/* Formularios (login, registro, agregar persona o palabra) */
// Formularios: preventDefault() evita que la página se recargue; validamos los datos a mano.
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  const k = f.dataset.form,
    v = (id) => ($('#' + id) || {}).value || '';
  // Chat con Orga: enviás lo que escribiste.
  if (k === 'chat') {
    const t = v('chatIn');
    $('#chatIn').value = '';
    orga.partial = '';
    return enviar(t);
  }
  if (k === 'login') {
    if (!/\S+@\S+\.\S+/.test(v('lmail'))) return toast('Revisá tu correo');
    if (v('lpass').length < 6) return toast('Contraseña: mín. 6');
    S.profile.email = v('lmail').trim();
    S.authed = true;
    S.onboarded = true;
    save();
    toast('Hola de nuevo ✳');
    go('hoy');
  }
  if (k === 'registro') {
    if (!v('rname').trim()) return toast('¿Cómo te llamás?');
    if (!/\S+@\S+\.\S+/.test(v('rmail'))) return toast('Revisá tu correo');
    if (v('rpass').length < 6) return toast('Contraseña: mín. 6');
    S.profile.name = v('rname').trim();
    S.profile.email = v('rmail').trim();
    S.authed = true;
    S.introI = 0;
    save();
    go('intro');
  }
  if (k === 'nwadd') {
    const id = f.dataset.k,
      val = v(id).trim();
    if (!val) return;
    nwCap();
    const fld = id === 'nwppin' ? 'people' : 'keywords';
    if (!S.nw[fld].includes(val)) S.nw[fld].push(val);
    save();
    render();
    $('#' + id) && $('#' + id).focus();
  }
});

/* Kanban: arrastrar y soltar */
// Kanban con la API de arrastrar y soltar (Drag and Drop) de HTML5:
// dragstart guarda el id de la tarjeta, dragover marca la columna, drop la mueve.
document.addEventListener('dragstart', (e) => {
  const c = e.target.closest('[data-drag]');
  if (!c) return;
  e.dataTransfer.setData('text/plain', c.dataset.drag);
  e.dataTransfer.effectAllowed = 'move';
  c.classList.add('dragging');
});
document.addEventListener('dragend', (e) => {
  const c = e.target.closest('[data-drag]');
  c && c.classList.remove('dragging');
  $$('.kcol.over').forEach((x) => x.classList.remove('over'));
});
document.addEventListener('dragover', (e) => {
  const col = e.target.closest('[data-drop]');
  if (!col) return;
  e.preventDefault();
  $$('.kcol.over').forEach((x) => x !== col && x.classList.remove('over'));
  col.classList.add('over');
});
document.addEventListener('drop', (e) => {
  const col = e.target.closest('[data-drop]');
  if (!col) return;
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  col.classList.remove('over');
  if (id) moveTo(id, col.dataset.drop);
});

/* Atajos: ⌘K / Ctrl+K abre Hey Orga · Esc cierra */
// Atajos de teclado: ⌘K o Ctrl+K abre Hey Orga, Esc cierra, flechas pasan el Recap.
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && S.authed && S.onboarded) {
    e.preventDefault();
    go('orga');
    setTimeout(() => $('#chatIn') && $('#chatIn').focus(), 50);
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j' && S.authed && S.onboarded) {
    e.preventDefault();
    go('orga');
    setTimeout(chatMic, 120);
  }
  if (e.key === 'Escape') {
    if (coachI >= 0) return coachEnd();
    if (route === 'recap') go('progreso');
    else closeAll();
  }
  if (route === 'recap' && e.key === 'ArrowRight') A.recapnext();
  if (route === 'recap' && e.key === 'ArrowLeft') A.recapprev();
});

/* ---------- arranque ---------- */
// ARRANQUE. Si la página corre dentro de Claude, pedimos la IA (sample) y el dictado.
// claude.use() devuelve una promesa (.then) porque tarda un momento. Fuera de Claude (Netlify) esto se salta.
if (window.claude && typeof window.claude.use === 'function') {
  window.claude
    .use('sample')
    .then((s) => {
      if (s) {
        sampleFn = s;
        render();
      }
    })
    .catch(() => {});
  window.claude
    .use('dictation')
    .then((d) => {
      if (d) {
        dict = d;
        setupDict();
        if (route === 'orga') render();
      }
    })
    .catch(() => {});
}
S.inbox.forEach((m) => {
  m.fresh = false;
  m.reading = false;
});
if (S.focus && left() <= 0) S.focus = null;
// Primera pantalla: la del #hash de la URL, o Hoy si ya iniciaste sesión, o la bienvenida.
route = guard(location.hash.slice(1) || (S.authed ? 'hoy' : 'bienvenida'));
render();
