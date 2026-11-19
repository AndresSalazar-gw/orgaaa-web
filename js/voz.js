/* =========================================================
   ORGAAA · VOZ Y CEREBRO DE ORGA
   Aquí viven 3 piezas que usa el chat (views-orga.js):
   · responder() = el cerebro: entiende tu pregunta y arma la respuesta con tus tareas reales
   · oir()       = el oído: micrófono → texto
   · hablar()    = la boca: texto → voz
   Todo usa las funciones de voz que ya trae el navegador (Web Speech API):
   · SpeechRecognition  = oído  (voz → texto)
   · speechSynthesis    = boca  (texto → voz)
   No hay llaves de API ni servidor. Funciona en Chrome, Edge y Safari.
   Firefox no tiene reconocimiento de voz: ahí quedan los botones de ejemplo.
   ========================================================= */

// El navegador expone el reconocimiento con dos nombres distintos (Chrome usa webkit...).
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let rec = null; // el reconocedor activo
let vozVoice = null; // la voz en español elegida

/* ---------- utilidades de texto ---------- */
// norm() baja a minúsculas y quita acentos, para comparar sin sufrir con "mañana" vs "manana".
const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
// has() pregunta si el texto contiene alguna de estas palabras.
const has = (t, words) => words.some((w) => t.includes(w));
// dur() convierte minutos a como lo diría una persona: 90 → "una hora y media".
function dur(m) {
  if (m < 60) return `${m} minutos`;
  const h = Math.floor(m / 60),
    r = m % 60;
  const hs = h === 1 ? 'una hora' : `${h} horas`;
  return r === 0 ? hs : r === 30 ? `${hs} y media` : `${hs} y ${r} minutos`;
}
// lista() une ["a","b","c"] como "a, b y c".
const lista = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]);

// resumenHoy() arma la respuesta del día: cuántas cosas, cuáles, y por cuál empezar (y por qué).
function resumenHoy(abiertas, eventos, evTxt) {
  const top = abiertas[0];
  const otras = abiertas.slice(1, 3).map((x) => x.title);
  const resto = abiertas.length - 1 - otras.length;
  // El "por qué" sale de los datos: quién lo pidió y para cuándo.
  const DIAS = { lun: 'el lunes', mar: 'el martes', mie: 'el miércoles', jue: 'el jueves', vie: 'el viernes', sab: 'el sábado', dom: 'el domingo' };
  const cuando = DIAS[norm(String(top.due)).slice(0, 3)] || String(top.due).toLowerCase();
  const porque = top.from && top.from !== 'Vos' ? ` porque ${top.from} lo espera para ${cuando}` : '';
  return {
    texto:
      `Hoy tenés ${abiertas.length} ${abiertas.length === 1 ? 'pendiente' : 'pendientes'}. ` +
      `Te recomiendo empezar por ${top.title}${porque}. Primer paso: ${top.start}` +
      (otras.length ? ` Después siguen ${lista(otras)}${resto > 0 ? ` y ${resto} más` : ''}.` : '') +
      (eventos.length ? ` En tu agenda: ${evTxt(eventos)}.` : ''),
    items: abiertas.slice(0, 4),
  };
}

/* ---------- el cerebro: entiende la frase y arma la respuesta ---------- */
// responder() recibe lo que dijiste y devuelve { texto, items }.
// Lee las tareas reales (S.tasks) del momento, por eso la respuesta siempre está al día.
function responder(raw) {
  // Quitamos el "Hey Orga" del principio. El micrófono a veces oye "orca" u "olga", por eso las variantes.
  let t = norm(raw)
    .replace(/^(hey|ey|oye|hola|ok)[ ,]+(orga|orca|olga|organa|horga|orgaaa)\b[ ,.]*/, '')
    .replace(/[¿?¡!.,]/g, '')
    .trim();
  const nm = userName();
  const abiertas = openT();
  const top = abiertas[0];
  const ev = (d) => S.events.filter((e) => e.d === d && srcOn(e.src) && wsOk(e));
  const evTxt = (a) => lista(a.map((e) => `${e.title} a las ${e.t}`));

  // 1) Solo dijo "Hey Orga": lo saludamos y esperamos.
  if (!t) return { texto: `Decime, ${nm}. ¿Qué necesitás?`, items: [] };

  // 2) Marcar una tarea como hecha. Buscamos si nombró alguna; si no, cerramos la primera.
  if (has(t, ['termine', 'listo', 'hice', 'hecha', 'hecho', 'marca', 'cierra', 'completa', 'ya esta'])) {
    const nombrada = abiertas.find((x) =>
      norm(x.title)
        .split(' ')
        .some((w) => w.length > 4 && t.includes(w)),
    );
    const tarea = nombrada || top;
    if (!tarea) return { texto: 'No tenés nada pendiente. Todo cerrado.', items: [] };
    done(tarea.id); // la misma función del botón ✓: tacha, cuenta y guarda
    const quedan = abiertas.length - 1;
    return {
      texto: `Listo, cerré ${tarea.title}. ${quedan ? `Te quedan ${quedan}.` : 'Ya no te queda nada. Descansá.'}`,
      items: [],
    };
  }

  // 3) Empezar a enfocarse: arranca el temporizador de 10 minutos (la isla de arriba).
  // Solo órdenes claras ("empecemos"), para no confundir con "¿por dónde empiezo?".
  if (has(t, ['empecemos', 'arranquemos', 'enfocame', 'enfoquemonos', 'modo foco', 'temporizador', '10 minutos', 'diez minutos', 'vamos con'])) {
    if (!top) return { texto: 'No hay nada para empezar. Todo cerrado.', items: [] };
    // Igual que el botón "Empezar 10 min", pero sin sacarte del chat.
    top.moved = false;
    S.focus = { id: top.id, start: Date.now(), dur: 600000 };
    save();
    island();
    return { texto: `Dale. Diez minutos con ${top.title}. ${top.start}`, items: [top] };
  }

  // 3b) Pide sus pendientes, una recomendación, o dice que no entendió → resumen del día con recomendación.
  const pideLista = has(t, ['pendiente', 'que tengo', 'cuales', 'que hago', 'que me toca', 'que hay hoy', 'mis tareas', 'no te entendi', 'no entendi', 'repeti', 'otra vez']);
  const pideConsejo = has(t, ['recomiend', 'sugier', 'consejo', 'por donde', 'en que empiez', 'con que empiez', 'cual empiezo']);
  if ((pideLista || pideConsejo) && !has(t, ['manana', 'semana'])) {
    if (!abiertas.length) return { texto: `Todo cerrado, ${nm}. No tenés nada pendiente.`, items: [] };
    if (pideConsejo && !pideLista)
      return { texto: `Te recomiendo empezar por ${top.title}. ${top.start}`, items: [top] };
    return resumenHoy(abiertas, ev(0), evTxt);
  }

  // 4) ¿Qué sigue? Una sola tarea, con el primer paso chiquito.
  if (has(t, ['sigue', 'siguiente', 'ahora', 'primero', 'por donde', 'importante', 'prioridad'])) {
    if (!top) return { texto: 'No hay nada pendiente. Todo cerrado.', items: [] };
    return { texto: `Ahora toca ${top.title}. Son ${dur(top.min)}. ${top.start}`, items: [top] };
  }

  // 5) Agenda / reuniones.
  if (has(t, ['agenda', 'reunion', 'evento', 'calendario', 'clase', 'cita'])) {
    const cuando = has(t, ['manana']) ? 1 : 0;
    const a = ev(cuando);
    return {
      texto: a.length
        ? `${cuando ? 'Mañana' : 'Hoy'} tenés ${evTxt(a)}.`
        : `No tenés eventos ${cuando ? 'mañana' : 'hoy'}.`,
      items: [],
    };
  }

  // 6) Mañana: tareas que vencen mañana y eventos de mañana.
  if (has(t, ['manana'])) {
    const ts = vis().filter((x) => !x.done && x.day === 1);
    const a = ev(1);
    if (!ts.length && !a.length) return { texto: 'Mañana está libre. Por ahora no hay nada.', items: [] };
    const p1 = ts.length ? `Mañana vencen ${lista(ts.map((x) => x.title))}.` : '';
    const p2 = a.length ? ` Y en tu agenda: ${evTxt(a)}.` : '';
    return { texto: (p1 + p2).trim(), items: ts };
  }

  // 7) La semana: cuántas cosas hay por día.
  if (has(t, ['semana'])) {
    const n = vis().filter((x) => !x.done).length;
    const e = S.events.filter((x) => x.d > 0 && x.d < 7 && srcOn(x.src)).length;
    return { texto: `Esta semana tenés ${n} tareas pendientes y ${e} eventos en el calendario.`, items: [] };
  }

  // 8) Mensajes que entraron (WhatsApp, Slack...).
  if (has(t, ['mensaje', 'escribieron', 'escribio', 'whatsapp', 'slack', 'quien me'])) {
    const m = S.inbox.filter((x) => srcOn(x.src)).slice(0, 3);
    if (!m.length) return { texto: 'No hay mensajes nuevos.', items: [] };
    return {
      texto: `Te escribieron ${lista(m.map((x) => `${x.from}: ${x.gist}`))}.`,
      items: [],
    };
  }

  // 9) Avance del día.
  if (has(t, ['avance', 'progreso', 'cuantas', 'cuanto llevo', 'como voy', 'hechas'])) {
    const hechas = vis().filter((x) => x.done).length;
    return {
      texto: `Llevás ${hechas} cerradas hoy y te faltan ${abiertas.length}. ${hechas ? 'Vas bien.' : 'Empezá por la primera.'}`,
      items: [],
    };
  }

  // 10) Ayuda: qué sabe hacer.
  if (has(t, ['ayuda', 'que puedes', 'que podes', 'que sabes', 'como funciona'])) {
    return {
      texto:
        'Preguntame qué tenés hoy, qué sigue, qué hay mañana, tu agenda o tus mensajes. También decime "terminé" para cerrar una tarea o "empecemos" para enfocarte diez minutos.',
      items: [],
    };
  }

  // 11) Qué tengo que hacer hoy (también lo que cae por defecto si dijo "hoy", "tarea", etc.).
  if (has(t, ['hoy', 'tengo', 'hacer', 'tarea', 'dia', 'toca', 'que hay'])) {
    if (!abiertas.length) return { texto: `Todo cerrado, ${nm}. No tenés nada pendiente.`, items: [] };
    return resumenHoy(abiertas, ev(0), evTxt);
  }

  // 12) Charla corta: saludos y gracias, para que se sienta como hablar con alguien.
  if (/^(hola|buenas|que onda|que tal|como estas|hey)\b/.test(t))
    return {
      texto: `¡Hola, ${nm}! ${abiertas.length ? `Tenés ${abiertas.length} pendientes hoy. ¿Querés que te diga por cuál empezar?` : 'Hoy no tenés nada pendiente.'}`,
      items: [],
    };
  if (/^(gracias|ok|va|dale|perfecto|genial|buenisimo|de una)\b/.test(t))
    return { texto: 'De nada. Aquí estoy cuando me necesités.', items: [] };
  if (/^(si|simon|va pues|sale)\b/.test(t) && top)
    return { texto: `Empezá por ${top.title}. ${top.start}`, items: [top] };

  // 13) No entendió: le damos pistas en vez de quedarnos callados.
  return {
    texto: 'No te entendí bien. Probá con: qué tengo hoy, qué sigue, qué hay mañana, o terminé.',
    items: [],
    noEntendi: true, // el chat usa esto para preguntarle a la IA, si hay
  };
}

/* ---------- la boca: Orga habla ---------- */
// elegirVoz() busca una voz en español. Prefiere latinoamericano (es-MX, es-US, es-419) antes que España.
function elegirVoz() {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  const es = vs.filter((v) => /^es/i.test(v.lang));
  vozVoice =
    es.find((v) => /es[-_](MX|US|419|SV|AR|CO)/i.test(v.lang)) || es.find((v) => /^es/i.test(v.lang)) || null;
}
// Las voces cargan de a poco: volvemos a elegir cuando el navegador avisa que ya están.
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = elegirVoz;
  elegirVoz();
}
// hablar() dice el texto en voz alta y avisa cuando termina.
function hablar(texto, alTerminar) {
  if (!window.speechSynthesis) return alTerminar && alTerminar();
  speechSynthesis.cancel(); // si estaba hablando, corta
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = vozVoice ? vozVoice.lang : 'es-MX';
  if (vozVoice) u.voice = vozVoice;
  u.rate = 1.03;
  u.pitch = 1;
  u.onend = u.onerror = () => alTerminar && alTerminar();
  speechSynthesis.speak(u);
}

/* ---------- el oído: Orga escucha ---------- */
// oir() activa el micrófono. Llama a parcial() mientras hablás y a final() cuando terminás la frase.
// Lo usan la ventana "Hey Orga" y también el dictado de la pantalla Orga.
function oir({ parcial, final, fin, error }) {
  if (!SR) return error && error('no-soporte');
  detener();
  rec = new SR();
  rec.lang = 'es-MX';
  rec.interimResults = true; // devuelve texto a medias mientras hablás
  rec.continuous = false; // se corta solo cuando hacés una pausa
  let dicho = ''; // frases que el navegador ya dio por terminadas
  let ultimo = ''; // lo último que oyó, aunque no esté "terminado"
  let pausa = null; // temporizador: si dejás de hablar, cortamos nosotros
  // Algunos navegadores nunca marcan la frase como final. Por eso, si hay una pausa de 1.2 s con texto,
  // apagamos el micrófono a mano y usamos lo último que se oyó.
  const cortar = () => {
    try {
      rec && rec.stop();
    } catch (e) {}
  };
  rec.onresult = (ev) => {
    let tmp = '';
    dicho = '';
    for (let i = 0; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) dicho += r[0].transcript + ' ';
      else tmp += r[0].transcript;
    }
    ultimo = (dicho + tmp).trim();
    parcial && parcial(ultimo);
    clearTimeout(pausa);
    pausa = setTimeout(cortar, 1200);
  };
  rec.onspeechend = cortar; // el navegador avisa que dejaste de hablar
  rec.onerror = (ev) => {
    clearTimeout(pausa);
    error && error(ev.error);
  };
  rec.onend = () => {
    clearTimeout(pausa);
    rec = null;
    const txt = dicho.trim() || ultimo; // si no hubo "final", usamos lo último que oyó
    txt ? final && final(txt) : fin && fin();
  };
  try {
    rec.start();
  } catch (e) {
    error && error('no-iniciado');
  }
}
// detener() apaga micrófono y voz.
function detener() {
  if (rec) {
    rec.onend = null;
    try {
      rec.abort();
    } catch (e) {}
    rec = null;
  }
}

// Mensajes de error del micrófono, entendibles.
const ERR = {
  'not-allowed': 'Permití el micrófono en el navegador (el candado de la barra de arriba) y probá otra vez.',
  'service-not-allowed': 'El navegador no deja usar el micrófono acá. Probá en Chrome o Safari desde la web publicada.',
  'no-speech': 'No te escuché. Tocá el micrófono y hablá.',
  network: 'El navegador no pudo conectarse al servicio de voz. Revisá tu internet y probá otra vez.',
  aborted: 'Se cortó el micrófono. Probá otra vez.',
  'audio-capture': 'No encuentro un micrófono conectado.',
  'no-soporte': 'Este navegador no escucha voz (Firefox). Usá Chrome, Edge o Safari, o escribí.',
};

// Objeto público: el chat solo usa estas piezas.
const Voz = { soporta: !!SR, oir, detener, hablar, responder, ERR };
