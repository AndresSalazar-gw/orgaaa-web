/* =========================================================
   ORGAAA · CHAT CON ORGA ("Hey Orga")
   Una conversación: escribís o hablás, Orga contesta (y habla si le hablaste).
   Dos tipos de mensaje:
   · Preguntas ("¿qué tengo hoy?", "terminé") → responde con tus tareas reales (voz.js → responder)
   · Pendientes sueltos ("mañana tengo parcial y pagar internet") → los separa en tareas
     y te deja agregarlas con un botón (borrador dentro del chat).
   Primero le pregunta a Claude (voz.js → preguntarAClaude). Claude contesta con texto y
   acciones (agregar, completar, priorizar, recordar, enfocarse) que aquí se aplican.
   Si no hay servidor (ej. Live Server), usa el respaldo de palabras clave de arriba.
   ========================================================= */

// Estado del chat que NO se guarda: si está escuchando, pensando, y el texto a medias del micrófono.
// claude = true si la última respuesta vino de Claude, false si vino del respaldo (Demo).
const orga = { listening: false, busy: false, partial: '', err: '', claude: false };
// El historial SÍ se guarda (S.chat), para que siga ahí si recargás.
const msgs = () => S.chat || (S.chat = []);
// Los recordatorios también se guardan en S (y S va a localStorage con save()).
const recordatorios = () => S.reminders || (S.reminders = []);
// Texto de la etiqueta del encabezado según lo que esté pasando.
const chatLabel = () =>
  orga.listening ? 'Te escucho…' : orga.busy ? 'Orga está pensando…' : 'Preguntale o contale tus pendientes';
// orgaDot() dibuja el puntito discreto del encabezado: verde = Claude, gris = Demo (tooltip al pasar el mouse).
const orgaDot = () => {
  const on = orga.claude || !!sampleFn;
  const txt = on ? 'Claude' : 'Demo';
  return `<span class="dotai mini ${on ? 'on' : ''}" title="${txt}" aria-label="${txt}"><i></i></span>`;
};

// Frases para tocar cuando el chat está vacío.
const SUGIERE = ['¿Qué tengo que hacer hoy?', '¿Qué sigue?', '¿Qué hay mañana?', '¿Quién me escribió?'];

/* ---------- la pantalla ---------- */
// V.orga dibuja el chat completo: encabezado, conversación y la barra para escribir.
V.orga = () => `<div class="chat">
    <div class="chat-hd"><span class="corb sm"></span><div><b>Orga</b><span class="label">${chatLabel()}</span></div><span class="sp"></span>${orgaDot()}${msgs().length ? '<button class="gbtn glass" data-a="chatclear">Nueva charla</button>' : ''}</div>
    <div class="chat-log" id="chatLog">${chatLog()}</div>
    <form class="chat-in glass ${orga.listening ? 'on' : ''}" data-form="chat">
      <button type="button" class="cmic" data-a="chatmic" aria-label="${orga.listening ? 'Parar' : 'Hablar'}">${orga.listening ? '<span class="vbars"><b></b><b></b><b></b><b></b></span>' : I.mic}</button>
      <input id="chatIn" autocomplete="off" placeholder="${orga.listening ? 'Te escucho…' : 'Escribile a Orga…'}" value="${esc(orga.partial)}">
      <button class="csend" aria-label="Enviar">${I.arrow}</button>
    </form>
  </div>`;

// chatLog() arma todos los mensajes. Si no hay ninguno, muestra el saludo y sugerencias.
function chatLog() {
  const nm = userName();
  const hola = `<div class="cm bot"><span class="corb"></span><div class="bub">Hola ${esc(nm)}. Preguntame qué tenés hoy, o contame de corrido todo lo que tenés pendiente y yo lo ordeno.</div></div>`;
  const list = msgs().map(cmHtml).join('');
  const chips = !msgs().length
    ? `<div class="csug">${[...SUGIERE, 'Ejemplo: ' + EXAMPLES[0].slice(0, 38) + '…']
        .map((q, i) => `<button class="chip" data-a="chatask" data-q="${esc(i < SUGIERE.length ? q : EXAMPLES[0])}">${esc(q)}</button>`)
        .join('')}</div>`
    : '';
  // Burbuja de puntitos mientras Orga piensa (con texto para lectores de pantalla).
  const typing = orga.busy ? '<div class="cm bot"><span class="corb"></span><div class="bub typing" role="status" aria-label="Orga está pensando…"><i></i><i></i><i></i></div></div>' : '';
  const err = orga.err ? `<p class="cerr">${esc(orga.err)}</p>` : '';
  return hola + chips + list + typing + err;
}

// cmHtml() dibuja UN mensaje. m.who = 'yo' u 'orga'.
function cmHtml(m, mi) {
  if (m.who === 'yo')
    return `<div class="cm yo"><div class="bub">${m.voz ? I.mic : ''}${esc(m.text)}</div></div>`;
  // Tarjetas de tareas que Orga mencionó (se leen en vivo: si la cerrás, se ve tachada).
  const items = (m.ids || [])
    .map(findT)
    .filter(Boolean)
    .map(
      (t) => `<div class="ctask ${t.done ? 'done' : ''}">
      <button class="chk" data-a="done" data-id="${t.id}" aria-label="Marcar hecha">${I.check}</button>
      <span data-a="task" data-id="${t.id}">${esc(t.title)}</span><em>${t.min} min</em></div>`,
    )
    .join('');
  // Borrador: tareas que Orga sacó de tu texto, listas para agregar.
  const d = m.draft;
  const draft = d
    ? `<div class="cdraft">${d.tareas
        .map(
          (t, i) => `<div class="ctask">
        <span>${esc(t.titulo)}${t.cuando ? ` <em>· ${esc(t.cuando)}</em>` : ''}</span>
        ${
          d.added
            ? wsTag(t.ws)
            : t.ws
              ? `<button class="wstag" style="--c:${wsCol(t.ws)}" data-a="chatws" data-m="${mi}" data-i="${i}">${esc(wsName(t.ws))}</button>`
              : `<button class="wstag ask" data-a="chatws" data-m="${mi}" data-i="${i}">¿Dónde va?</button>`
        }</div>`,
        )
        .join('')}
      ${
        d.added
          ? '<div class="cdone">✓ Agregadas a tu día <button class="gbtn glass" data-a="go" data-h="hoy">Ver en Hoy</button></div>'
          : `<div class="cbtns"><button class="wbtn" data-a="chatadd" data-m="${mi}">Agregar ${d.tareas.length}</button><button class="gbtn glass" data-a="chatdrop" data-m="${mi}">Descartar</button></div><p class="fine">Tocá el workspace para cambiarlo. Orga aprende.</p>`
      }</div>`
    : '';
  // Razón del orden (cuando Claude priorizó): una línea chiquita debajo del texto.
  const razon = m.razon ? `<p class="fine">${esc(m.razon)}</p>` : '';
  // Botón para activar avisos del navegador: solo si este mensaje creó un recordatorio y todavía no hay permiso.
  const avisos =
    m.avisos && 'Notification' in window && Notification.permission === 'default'
      ? '<div class="cbtns"><button class="gbtn glass" data-a="avisos">Activar avisos</button></div>'
      : '';
  return `<div class="cm bot"><span class="corb"></span><div class="bub">${esc(m.text)}${razon}${items ? `<div class="citems">${items}</div>` : ''}${draft}${avisos}</div></div>`;
}

/* ---------- lógica del chat ---------- */
// chatDraw() redibuja SOLO la conversación (no toda la página), así no se borra lo que escribís.
function chatDraw() {
  const log = $('#chatLog');
  if (!log) return;
  log.innerHTML = chatLog();
  log.scrollTop = log.scrollHeight; // baja al último mensaje
  const lb = $('.chat-hd .label');
  if (lb) lb.textContent = chatLabel();
  // Actualizamos también el puntito Claude / Demo.
  const dot = $('.chat-hd .dotai');
  if (dot) dot.outerHTML = orgaDot();
}
// Después de cada render() completo, bajamos al último mensaje.
function chatAfter() {
  const log = $('#chatLog');
  if (log) log.scrollTop = log.scrollHeight;
}

// esPendiente() decide si lo que escribiste es una lista de cosas por hacer (para ordenar)
// o una pregunta/orden para Orga. Regla simple: si pregunta, es pregunta; si dice "tengo que",
// "acordate", "agregá"... o trae varias partes, son pendientes.
function esPendiente(txt) {
  const t = norm(txt).replace(/^(hey|ey|oye|hola)[ ,]+(orga|orca|olga)[ ,]*/, '');
  // Por voz no llegan signos de pregunta, así que buscamos palabras de pregunta en cualquier parte.
  if (/\?/.test(txt)) return false;
  if (/(que tengo|que hago|que hay|que sigue|que me toca|cuales|cual es|cuantas|cuanto|quien|como voy|dime|decime|dijeras|dices|recomiend|sugier|por donde|empiez|no te entendi|no entendi|pendientes que)/.test(t)) return false;
  if (/^(que|cual|como|donde|cuando|termine|ya termine|listo|marca|empecemos|arranquemos|ayuda|hola|gracias)\b/.test(t)) return false;
  return /(tengo que|hay que|acordate|acuerdame|recordame|recuerdame|anota|agrega|apunta|necesito|debo|me pidio|tengo parcial|entregar|pagar|comprar|llamar)/.test(t);
}

// limpiarPedido() quita el "acordate de", "anotá que"... para que el título quede limpio.
const limpiarPedido = (txt) =>
  txt
    .replace(/^\s*(hey,?\s*orga[,:]?\s*)/i, '')
    .replace(/^(acordate|acuérdame|acuerdame|recordame|recordáme|recuérdame|anotá|anota|agregá|agrega|apuntá|apunta)(\s+(de|que))?\s+/i, '');

// parsear() separa el texto en tareas. Con IA (dentro de Claude) usa un prompt; sin IA, localParse() con regex.
async function parsear(text) {
  let r = null;
  if (sampleFn) {
    try {
      r = await sampleFn.json(`Sos Orga. El usuario (universitario salvadoreño) dictó esto, desordenado:
"""${text}"""
Sus workspaces (asigná cada tarea al que corresponda según personas y palabras clave; si no estás seguro usá null):
${JSON.stringify(S.workspaces.map((w) => ({ id: w.id, nombre: w.name, tipo: w.type, personas: w.people, palabras: w.keywords })))}
Extraé cada pendiente. Respondé SOLO JSON: {"resumen":"máx 8 palabras, voseo, ej: Empezá por el ensayo.","tareas":[{"titulo":"máx 4 palabras","prioridad":1,"minutos":20,"cuando":"una palabra como Mañana o Sáb, o null","consejo":"primer paso, máx 9 palabras, voseo","ws":"id del workspace o null","porque":"máx 3 palabras"}]}
prioridad 1 = hoy/mañana, 2 = esta semana, 3 = cuando pueda. Ordená de más a menos prioritaria.`);
      if (!r || !Array.isArray(r.tareas)) r = null;
    } catch (e) {
      aiErr(e);
    }
  }
  if (!r) r = localParse(limpiarPedido(text));
  // Si la frase era una sola tarea corta, localParse puede no encontrar nada: la tomamos entera.
  if (!r.tareas.length && text.split(' ').length >= 2) {
    const t = limpiarPedido(text).replace(/[.!]$/, '');
    r.tareas = [{ titulo: cap(t.split(' ').slice(0, 5).join(' ')), prioridad: 2, minutos: 15, cuando: null, consejo: CANNED[0], _src: t }];
    r.resumen = '';
  }
  // Las que la IA no asignó, las clasifica Orga con sus reglas (canal 3, persona 2, palabra 1).
  r.tareas.forEach((t) => {
    if (!t.ws || !wsById(t.ws)) {
      const c = classify(t._src || t.titulo, null);
      t.ws = c.ws;
      t.porque = c.why;
    }
  });
  return r;
}

// conversar() se usa cuando Orga no entendió y hay IA: responde libre, corto, con tus tareas como contexto.
async function conversar(text) {
  const tareas = openT().slice(0, 8).map((t) => `${t.title} (${t.min} min, ${wsName(t.ws)})`).join('; ');
  const r = await sampleFn(
    `Sos Orga, asistente de organización de ${userName()}, universitario salvadoreño. Voseo, directo, cálido, sin culpa. Respondé en máximo 2 frases cortas (se van a leer en voz alta). Sin listas ni emojis.
Sus pendientes de hoy: ${tareas || 'ninguno'}.
Mensaje: "${text}"`,
    { modelTier: 'quick', cache: false },
  );
  return (r.text || '').trim();
}

// enviar() es el corazón del chat: agrega tu mensaje, le pregunta a Claude y agrega la respuesta de Orga.
// Si Claude no está disponible, usa el respaldo de palabras clave (respaldo()).
// porVoz = true si lo dijiste hablando → Orga también contesta hablando.
async function enviar(text, porVoz = false) {
  text = (text || '').trim();
  if (!text || orga.busy) return;
  orga.err = '';
  msgs().push({ who: 'yo', text, voz: porVoz });
  orga.busy = true; // prende "Orga está pensando…"
  chatDraw();
  let m;
  // 1) Le preguntamos a Claude a través del servidor.
  const r = await Voz.preguntarAClaude();
  if (r && r.aviso) {
    // El servidor avisó algo (mensaje muy largo, muchos pedidos): lo mostramos.
    m = { who: 'orga', text: r.aviso };
  } else if (r) {
    // Claude contestó: aplicamos sus acciones y armamos el mensaje.
    orga.claude = true;
    m = aplicarAcciones(r);
  } else {
    // 2) Sin servidor: el sistema de palabras clave de siempre, para que Orga nunca quede muda.
    orga.claude = false;
    m = await respaldo(text);
  }
  msgs().push(m);
  if (S.chat.length > 40) S.chat = S.chat.slice(-40); // guardamos solo los últimos 40
  orga.busy = false;
  save();
  chatDraw();
  if (porVoz) Voz.hablar(m.text); // si le hablaste, Orga te contesta en voz alta
}

// respaldo() es el chat SIN Claude (modo Demo): decide si es una lista de pendientes o una pregunta
// y responde con las reglas de palabras clave. Devuelve el mensaje de Orga.
async function respaldo(text) {
  await new Promise((x) => setTimeout(x, 450)); // pausa chiquita: se siente que "piensa"
  let m;
  if (esPendiente(text)) {
    const r = await parsear(text);
    const n = r.tareas.length;
    m = {
      who: 'orga',
      text: n
        ? `Encontré ${n} ${n === 1 ? 'cosa' : 'cosas'}. ${r.resumen || ''} ${n === 1 ? '¿La agrego?' : '¿Las agrego?'}`.replace(/\s+/g, ' ')
        : 'No encontré tareas ahí. Contame de nuevo con un poco más de detalle.',
      draft: n ? { tareas: r.tareas, added: false } : null,
    };
  } else {
    const r = responder(text);
    let texto = r.texto;
    if (r.noEntendi && sampleFn) {
      try {
        texto = (await conversar(text)) || texto;
      } catch (e) {
        aiErr(e);
      }
    }
    m = { who: 'orga', text: texto, ids: r.items.map((x) => x.id) };
  }
  return m;
}

/* ---------- acciones que manda Claude ---------- */
// aplicarAcciones() recibe { reply, actions } del servidor, ejecuta cada acción
// con la lógica que ya tiene la app, y devuelve el mensaje de Orga para el chat.
function aplicarAcciones(r) {
  const ids = []; // tareas que se muestran como tarjetas debajo del mensaje
  const hecho = []; // frases de respaldo por si Claude no escribió texto
  let razon = ''; // razón del orden, si priorizó
  let avisos = false; // true si se creó un recordatorio (para ofrecer "Activar avisos")

  r.actions.forEach((a, i) => {
    // try/catch: si una acción viene rara, la saltamos sin romper las demás.
    try {
      // agregar_tarea → crea la tarea con la misma función que usan los borradores.
      if (a.tipo === 'agregar_tarea') {
        const fecha = fechaLimite(a.fecha_limite, a.prioridad);
        // Si Claude no eligió workspace (o eligió uno que no existe), lo decide classify() como siempre.
        const ws = wsById(a.workspace) ? a.workspace : classify(a.titulo, null).ws;
        const t = nuevaTarea(
          { titulo: a.titulo, ws, prioridad: a.prioridad, minutos: a.minutos_estimados, cuando: fecha.due, consejo: a.primer_paso },
          i,
          fecha.day,
        );
        ids.push(t.id);
        hecho.push(`Agregué ${t.title}.`);
      }
      // completar_tarea → la misma función del botón ✓ (tacha, cuenta y guarda).
      if (a.tipo === 'completar_tarea') {
        const t = findT(a.id);
        if (t && !t.done) {
          done(t.id);
          ids.push(t.id);
          hecho.push(`Listo, cerré ${t.title}.`);
        }
      }
      // priorizar → reordena la lista de Hoy igual que el botón Reorganizar (reorg en app.js).
      if (a.tipo === 'priorizar') {
        const orden = (a.ids_en_orden || []).map(findT).filter((t) => t && !t.done);
        orden.forEach((t, k) => {
          t.ord = k - 1000; // negativo: quedan antes que las tareas que Claude no nombró
          t.prio = k < 3 ? 1 : k < 5 ? 2 : 3;
          t.moved = false;
        });
        ids.push(...orden.slice(0, 3).map((t) => t.id)); // mostramos las 3 primeras
        razon = a.razon_corta || '';
        if (orden[0]) hecho.push(`Empezá por ${orden[0].title}.`);
      }
      // recordar → se guarda en S.reminders; revisarRecordatorios() avisa a la hora.
      if (a.tipo === 'recordar') {
        const cuando = Date.parse(a.fecha_hora_iso);
        if (!isNaN(cuando)) {
          recordatorios().push({ id: uid('r'), titulo: a.titulo, cuando, avisado: false });
          avisos = true;
          hecho.push(`Te aviso ${cuandoTxt(cuando)}: ${a.titulo}.`);
        }
      }
      // iniciar_foco → el mismo temporizador de la isla, con la primera tarea pendiente.
      if (a.tipo === 'iniciar_foco') {
        const top = openT()[0];
        if (top) {
          const min = Math.min(120, Math.max(1, Math.round(+a.minutos) || 10));
          top.moved = false;
          S.focus = { id: top.id, start: Date.now(), dur: min * 60000 };
          island();
          ids.push(top.id);
          hecho.push(`Dale, ${min} minutos con ${top.title}. ${top.start}`);
        }
      }
    } catch (e) {
      console.warn('Orga: no pude aplicar la acción', a && a.tipo, e);
    }
  });

  // Texto final: lo que escribió Claude; si no escribió nada, armamos uno con lo que se hizo.
  const text = r.reply || hecho.join(' ') || 'Listo.';
  return { who: 'orga', text, ids: [...new Set(ids)], razon, avisos };
}

// fechaLimite() convierte "AAAA-MM-DD" (o null) en lo que usa la app:
// day = días desde hoy (0 hoy, 1 mañana…) y due = etiqueta corta ("Hoy", "Mañana", "Vie", "12/12").
function fechaLimite(iso, prioridad) {
  // Sin fecha: si es urgente va para hoy; si no, "Esta semana".
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso))
    return prioridad === 1 ? { day: 0, due: 'Hoy' } : { day: 2, due: 'Esta semana' };
  const [y, mo, d] = iso.split('-').map(Number);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // Diferencia en días entre esa fecha y hoy (si ya pasó, cuenta como hoy: lo demás espera).
  const day = Math.max(0, Math.round((new Date(y, mo - 1, d) - hoy) / 86400000));
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const due = day === 0 ? 'Hoy' : day === 1 ? 'Mañana' : day < 7 ? DIAS[new Date(y, mo - 1, d).getDay()] : `${d}/${mo}`;
  return { day, due };
}

// cuandoTxt() dice una hora como la diría una persona: "hoy a las 3:30 p. m." o "el viernes a las 9:00 a. m.".
function cuandoTxt(ms) {
  const f = new Date(ms);
  const hora = f.toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' });
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);
  if (f.toDateString() === hoy.toDateString()) return `hoy a las ${hora}`;
  if (f.toDateString() === manana.toDateString()) return `mañana a las ${hora}`;
  return `el ${f.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric' })} a las ${hora}`;
}

/* ---------- recordatorios ---------- */
// revisarRecordatorios() mira si a algún recordatorio ya le llegó la hora.
// Si sí: mensaje en el chat, toast y notificación del navegador (si diste permiso).
function revisarRecordatorios() {
  const ahora = Date.now();
  let hubo = false;
  recordatorios().forEach((r) => {
    if (r.avisado || r.cuando > ahora) return;
    r.avisado = true;
    hubo = true;
    // Si la página estaba cerrada y se pasó la hora, lo decimos sin culpa.
    const tarde = ahora - r.cuando > 5 * 60000;
    const texto = tarde ? `Este era para hace un rato: ${r.titulo}. Todavía estás a tiempo.` : `Recordatorio: ${r.titulo}.`;
    msgs().push({ who: 'orga', text: texto });
    toast('⏰ ' + r.titulo);
    // Notification = aviso del sistema operativo, aunque estés en otra pestaña.
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Orga', { body: r.titulo });
      } catch (e) {}
    }
  });
  if (hubo) {
    // Borramos los avisados de hace más de un día, para que la lista no crezca para siempre.
    S.reminders = recordatorios().filter((r) => !r.avisado || ahora - r.cuando < 86400000);
    save();
    chatDraw();
  }
}
// Revisamos cada 15 segundos, y una vez al abrir la página (por si se pasó alguno con la página cerrada).
setInterval(revisarRecordatorios, 15000);
setTimeout(revisarRecordatorios, 2000);

/* ---------- crear tareas ---------- */
// nuevaTarea() crea UNA tarea y la mete en tu lista. La usan los borradores del chat y las acciones de Claude.
// t = { titulo, ws, prioridad, minutos, cuando, consejo } · i = posición (para el orden) · day = días desde hoy.
function nuevaTarea(t, i = 0, day = dayOf(t.cuando)) {
  const tarea = {
    id: uid('t'),
    ws: t.ws,
    title: t.titulo,
    src: 'voz',
    from: 'Vos',
    due: t.cuando || 'Esta semana',
    day,
    prio: [1, 2, 3].includes(t.prioridad) ? t.prioridad : 2,
    ord: t.prioridad === 1 ? -2 + i * 0.01 : 40 + i,
    min: +t.minutos || 15,
    start: t.consejo || CANNED[0],
  };
  S.tasks.push(tarea);
  return tarea;
}
// dayOf() convierte "Mañana", "Vie", "viernes"… en días desde hoy (0 hoy, 1 mañana…).
function dayOf(c) {
  const k = (c || '').toLowerCase();
  if (!k || k === 'hoy') return 0;
  if (k === 'mañana') return 1;
  const d = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'].findIndex((x) =>
    x.startsWith(k.slice(0, 3)),
  );
  return d < 0 ? 2 : (d - new Date().getDay() + 7) % 7;
}

// agregarBorrador() mete en tu lista las tareas del borrador del mensaje número mi.
function agregarBorrador(mi) {
  const m = msgs()[mi];
  if (!m || !m.draft || m.draft.added) return;
  m.draft.tareas.forEach((t, i) => nuevaTarea(t, i));
  m.draft.added = true;
  save();
  toast(`✳ ${m.draft.tareas.length} agregadas`);
  chatDraw();
}

// chatMic() prende o apaga el micrófono. Usa el dictado de Claude si existe; si no, el del navegador.
function chatMic() {
  if (orga.listening) {
    dict ? dict.stop().catch(() => {}) : Voz.detener();
    return;
  }
  if (window.speechSynthesis) speechSynthesis.cancel(); // si Orga hablaba, se calla para escucharte
  orga.err = '';
  if (dict) {
    orga.listening = true;
    render();
    dict.start().catch((e) => {
      if (e && e.code === 'not_granted') dict = null;
      orga.listening = false;
      orga.err = 'Sin micrófono. Escribí.';
      render();
    });
    return;
  }
  if (!Voz.soporta) {
    orga.err = Voz.ERR['no-soporte'];
    return chatDraw();
  }
  orga.listening = true;
  render();
  const listo = (txt) => {
    orga.listening = false;
    orga.partial = '';
    render();
    if (txt) enviar(txt, true);
  };
  Voz.oir({
    parcial: (t) => {
      orga.partial = t;
      const i = $('#chatIn');
      if (i) i.value = t;
    },
    final: listo,
    fin: () => {
      orga.err = Voz.ERR['no-speech'];
      listo('');
    },
    error: (c) => {
      orga.err = Voz.ERR[c] || 'No pude usar el micrófono. Escribí.';
      listo('');
    },
  });
}

/* Separador sin IA (modo demo o sin conexión) */
// localParse() separa el texto en tareas SIN IA, con expresiones regulares (regex):
// corta por comas, puntos, 'también', 'y + nombre'... y busca días (hoy, mañana, viernes).
function localParse(text) {
  const parts = text
    .replace(/^\s*hey,?\s*orga[,:]?\s*/i, '')
    .split(
      /\s*(?:,|\.|;|\by además\b|\btambién\b|\by luego\b|\by que\b|\by\s+(?=[A-ZÁÉÍÓÚ])|\by\s+(?=(?:el\s+)?(?:hoy|mañana|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s)|\n)\s*/,
    )
    .map((s) => s.trim())
    .filter((s) => s.split(' ').length >= 3);
  const day = (p) =>
    (p.match(/\b(hoy|mañana|lunes|martes|miércoles|jueves|viernes|sábado|domingo|antes del \d+)\b/i) ||
      [])[0] || null;
  const tareas = parts
    .map((p) => {
      const d = day(p);
      let t = p
        .replace(/^([A-ZÁÉÍÓÚ][a-záéíóúñ]+)\s+me\s+(pidió|dijo que|mandó)\s+/, '')
        .replace(
          /^(y\s+)?(que\s+)?((el\s+)?(hoy|mañana|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s+)?(que\s+)?(tengo que|hay que|acordate que|me pidió|necesito|debo)?\s*/i,
          '',
        )
        .replace(/^(que\s+)?(tengo que|hay que)\s*/i, '');
      t = t
        .replace(/\b(hoy|mañana)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^(el|la|los|las|un|una)\s+/i, '');
      t = t
        .split(' ')
        .slice(0, 4)
        .join(' ')
        .replace(/\s+(de|y|el|la|los|las|a|al|para|con|que|por|me|antes|del|mi|tu|su)$/i, '')
        .replace(/\s+(de|y|el|la|a|al)$/i, '');
      return {
        titulo: cap(t),
        prioridad: /hoy|mañana/i.test(p) ? 1 : d ? 2 : 3,
        minutos: 20,
        cuando: d ? cap(d) : null,
        consejo: CANNED[0],
        _src: p,
      };
    })
    .sort((a, b) => a.prioridad - b.prioridad);
  return {
    resumen: tareas.length ? `Empezá por: ${tareas[0].titulo.toLowerCase()}.` : 'No encontré tareas.',
    tareas,
  };
}
