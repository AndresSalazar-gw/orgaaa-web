/* =========================================================
   ORGAAA · CHAT CON ORGA ("Hey Orga")
   Una conversación: escribís o hablás, Orga contesta (y habla si le hablaste).
   Dos tipos de mensaje:
   · Preguntas ("¿qué tengo hoy?", "terminé") → responde con tus tareas reales (voz.js → responder)
   · Pendientes sueltos ("mañana tengo parcial y pagar internet") → los separa en tareas
     y te deja agregarlas con un botón (borrador dentro del chat).
   ========================================================= */

// Estado del chat que NO se guarda: si está escuchando, pensando, y el texto a medias del micrófono.
const orga = { listening: false, busy: false, partial: '', err: '' };
// El historial SÍ se guarda (S.chat), para que siga ahí si recargás.
const msgs = () => S.chat || (S.chat = []);

// Frases para tocar cuando el chat está vacío.
const SUGIERE = ['¿Qué tengo que hacer hoy?', '¿Qué sigue?', '¿Qué hay mañana?', '¿Quién me escribió?'];

/* ---------- la pantalla ---------- */
// V.orga dibuja el chat completo: encabezado, conversación y la barra para escribir.
V.orga = () => `<div class="chat">
    <div class="chat-hd"><span class="corb sm"></span><div><b>Orga</b><span class="label">${orga.listening ? 'Te escucho…' : orga.busy ? 'Escribiendo…' : 'Preguntale o contale tus pendientes'}</span></div><span class="sp"></span>${ai()}${msgs().length ? '<button class="gbtn glass" data-a="chatclear">Nueva charla</button>' : ''}</div>
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
  const typing = orga.busy ? '<div class="cm bot"><span class="corb"></span><div class="bub typing"><i></i><i></i><i></i></div></div>' : '';
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
  return `<div class="cm bot"><span class="corb"></span><div class="bub">${esc(m.text)}${items ? `<div class="citems">${items}</div>` : ''}${draft}</div></div>`;
}

/* ---------- lógica del chat ---------- */
// chatDraw() redibuja SOLO la conversación (no toda la página), así no se borra lo que escribís.
function chatDraw() {
  const log = $('#chatLog');
  if (!log) return;
  log.innerHTML = chatLog();
  log.scrollTop = log.scrollHeight; // baja al último mensaje
  const lb = $('.chat-hd .label');
  if (lb) lb.textContent = orga.listening ? 'Te escucho…' : orga.busy ? 'Escribiendo…' : 'Preguntale o contale tus pendientes';
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

// enviar() es el corazón del chat: agrega tu mensaje, decide qué hacer y agrega la respuesta de Orga.
// porVoz = true si lo dijiste hablando → Orga también contesta hablando.
async function enviar(text, porVoz = false) {
  text = (text || '').trim();
  if (!text || orga.busy) return;
  orga.err = '';
  msgs().push({ who: 'yo', text, voz: porVoz });
  orga.busy = true;
  chatDraw();
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
  msgs().push(m);
  if (S.chat.length > 40) S.chat = S.chat.slice(-40); // guardamos solo los últimos 40
  orga.busy = false;
  save();
  chatDraw();
  if (porVoz) Voz.hablar(m.text);
}

// agregarBorrador() mete en tu lista las tareas del borrador del mensaje número mi.
function agregarBorrador(mi) {
  const m = msgs()[mi];
  if (!m || !m.draft || m.draft.added) return;
  const dayOf = (c) => {
    const k = (c || '').toLowerCase();
    if (!k || k === 'hoy') return 0;
    if (k === 'mañana') return 1;
    const d = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'].findIndex((x) =>
      x.startsWith(k.slice(0, 3)),
    );
    return d < 0 ? 2 : (d - new Date().getDay() + 7) % 7;
  };
  m.draft.tareas.forEach((t, i) =>
    S.tasks.push({
      id: uid('t'),
      ws: t.ws,
      title: t.titulo,
      src: 'voz',
      from: 'Vos',
      due: t.cuando || 'Esta semana',
      day: dayOf(t.cuando),
      prio: [1, 2, 3].includes(t.prioridad) ? t.prioridad : 2,
      ord: t.prioridad === 1 ? -2 + i * 0.01 : 40 + i,
      min: +t.minutos || 15,
      start: t.consejo || CANNED[0],
    }),
  );
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
