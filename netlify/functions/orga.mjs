/* =========================================================
   ORGAAA · CEREBRO DE ORGA EN EL SERVIDOR (Netlify Function)
   El chat "Hey Orga" le manda aquí la conversación y tus datos.
   Esta función le pregunta a Claude (API de Anthropic) y devuelve:
   { reply: "lo que Orga dice", actions: [ ...lo que Orga quiere hacer ] }
   La clave de la API vive SOLO aquí (variable de entorno en Netlify),
   nunca en el navegador ni en GitHub.
   Se llama desde el navegador en: /.netlify/functions/orga
   ========================================================= */

// Dirección de la API de mensajes de Anthropic.
const API_URL = 'https://api.anthropic.com/v1/messages';
// Modelo rápido y barato, ideal para un chat corto.
const MODEL = 'claude-haiku-5-5';
// Tope de tokens de la respuesta (las respuestas de Orga son cortas).
const MAX_TOKENS = 600;
// Largo máximo permitido para cada mensaje del chat.
const MAX_CHARS = 2000;
// Cuántos mensajes del historial le mandamos a Claude.
const MAX_HISTORIAL = 12;
// Límite simple: 30 pedidos por minuto por cada IP.
const LIMITE_POR_MINUTO = 30;
// Si Claude tarda más de esto, cortamos y devolvemos un error claro
// (Netlify corta las funciones a los 10 s, así que salimos antes).
const TIEMPO_MAXIMO_MS = 9000;

/* ---------- límite de pedidos por IP ---------- */
// Guardamos en memoria las horas de los últimos pedidos de cada IP.
// Ojo: esta memoria se borra cuando Netlify reinicia la función, por eso es un límite "simple".
const pedidosPorIp = new Map();

// demasiadosPedidos() devuelve true si esa IP ya hizo 30 pedidos en el último minuto.
function demasiadosPedidos(ip) {
  // Momento actual en milisegundos.
  const ahora = Date.now();
  // Nos quedamos solo con los pedidos de los últimos 60 segundos.
  const recientes = (pedidosPorIp.get(ip) || []).filter((t) => ahora - t < 60_000);
  // Si ya llegó al límite, guardamos la lista limpia y avisamos que se pasó.
  if (recientes.length >= LIMITE_POR_MINUTO) {
    pedidosPorIp.set(ip, recientes);
    return true;
  }
  // Si no, anotamos este pedido y lo dejamos pasar.
  recientes.push(ahora);
  pedidosPorIp.set(ip, recientes);
  // Limpieza: si el mapa crece mucho, borramos las IPs que ya no tienen pedidos recientes.
  if (pedidosPorIp.size > 5000) {
    for (const [k, v] of pedidosPorIp) if (!v.some((t) => ahora - t < 60_000)) pedidosPorIp.delete(k);
  }
  return false;
}

/* ---------- personalidad de Orga (system prompt) ---------- */
// Instrucciones fijas: quién es Orga, cómo habla y qué reglas sigue.
const SYSTEM = `Sos Orga, el asistente de organización de ORGAAA, para estudiantes universitarios que estudian y trabajan.

Cómo hablás:
- Siempre respondés con 1 a 3 frases cálidas en español salvadoreño con voseo ("tenés", "empezá", "contame"). Directo, como una amiga que sabe organizarse.
- Tus respuestas a veces se leen en voz alta: sin listas, sin viñetas, sin emojis, sin markdown.
- Nunca hacés sentir culpa por lo atrasado. Si algo se pasó, lo reacomodás y seguís ("lo demás espera").
- Los mensajes del usuario a veces vienen de una transcripción de voz y pueden traer palabras mal oídas. Si no entendés qué quiso decir, preguntale en una frase corta en vez de adivinar, y no uses herramientas hasta que te aclare.

Qué decir después de cada acción (los resultados de las herramientas te dicen lo que la app hizo):
- Si priorizaste: nombrá en orden las 3 primeras tareas y da una razón corta para la primera (su fecha límite, los minutos que toma o la carga del día).
- Si agregaste una tarea: confirmá a qué workspace fue, por su nombre.
- Si completaste una tarea: celebralo corto y decí qué sigue, si hay algo.
- Si guardaste un recordatorio: confirmá qué y cuándo, con palabras ("mañana a las 9", "en una hora").
- Si una herramienta devolvió un error, explicalo simple y ofrecé otra opción.

Reglas de datos:
- Usá SOLO las tareas, eventos y workspaces que vienen en el contexto. No inventes tareas, fechas, eventos ni personas.
- Si no sabés algo o no está en los datos, decilo con honestidad y ofrecé ayuda.
- Para referirte a una tarea existente usá su "id" exacto del contexto.

Herramientas (úsalas cuando el usuario lo pida o cuando claramente le ayude):
- agregar_tarea: cuando te cuenta algo que tiene que hacer. Una llamada por cada tarea. Elegí el workspace por su id según el tema (el que mejor encaje).
- completar_tarea: cuando dice que ya terminó algo.
- priorizar: cuando pregunta por dónde empezar, qué va primero o pide ordenar su día. Ordená las tareas pendientes de hoy según fecha límite, tiempo estimado y carga del día (lo corto y urgente primero, lo que otros esperan antes).
- recordar: cuando pide que le recordés algo a una hora. La fecha y hora va en formato ISO 8601 con la misma zona horaria de "ahora".
- iniciar_foco: cuando quiere empezar a concentrarse ya. Por defecto 10 minutos.

Siempre escribí una frase para el usuario además de usar herramientas, diciendo lo que hiciste.`;

/* ---------- herramientas que Claude puede usar ---------- */
// Cada herramienta describe una acción que el navegador sabe hacer.
// strict: true obliga a Claude a respetar exactamente este formato.
const TOOLS = [
  {
    name: 'agregar_tarea',
    description: 'Agrega una tarea nueva a la lista del usuario.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        // Título corto de la tarea (máx. 5 palabras).
        titulo: { type: 'string', description: 'Título corto, máximo 5 palabras.' },
        // Id del workspace donde va, o null si no se sabe.
        workspace: { type: ['string', 'null'], description: 'Id de un workspace del contexto, o null.' },
        // Cuántos minutos calcula que toma.
        minutos_estimados: { type: 'integer', description: 'Minutos estimados para hacerla.' },
        // 1 = hoy/mañana, 2 = esta semana, 3 = cuando pueda.
        prioridad: { type: 'integer', enum: [1, 2, 3], description: '1 hoy/mañana, 2 esta semana, 3 cuando pueda.' },
        // Fecha límite en formato AAAA-MM-DD, o null si no tiene.
        fecha_limite: { type: ['string', 'null'], description: 'Fecha límite AAAA-MM-DD, o null.' },
        // Primer paso chiquito para arrancar (voseo).
        primer_paso: { type: 'string', description: 'Primer paso concreto, máximo 9 palabras, con voseo.' },
      },
      required: ['titulo', 'workspace', 'minutos_estimados', 'prioridad', 'fecha_limite', 'primer_paso'],
      additionalProperties: false,
    },
  },
  {
    name: 'completar_tarea',
    description: 'Marca como hecha una tarea existente.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        // Id exacto de la tarea, tomado del contexto.
        id: { type: 'string', description: 'Id de la tarea del contexto.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'priorizar',
    description: 'Reordena las tareas pendientes de hoy, de la más a la menos importante.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        // Lista de ids en el nuevo orden.
        ids_en_orden: { type: 'array', items: { type: 'string' }, description: 'Ids de tareas en el nuevo orden.' },
        // Explicación corta del orden, para mostrar en el chat.
        razon_corta: { type: 'string', description: 'Por qué ese orden, máximo 15 palabras, voseo.' },
      },
      required: ['ids_en_orden', 'razon_corta'],
      additionalProperties: false,
    },
  },
  {
    name: 'recordar',
    description: 'Programa un recordatorio que avisa al usuario a una fecha y hora.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        // Qué hay que recordar.
        titulo: { type: 'string', description: 'Qué recordar, corto.' },
        // Cuándo avisar, en ISO 8601 con zona horaria (ej. 2026-11-26T15:30:00-06:00).
        fecha_hora_iso: { type: 'string', description: 'Fecha y hora ISO 8601 con zona horaria.' },
      },
      required: ['titulo', 'fecha_hora_iso'],
      additionalProperties: false,
    },
  },
  {
    name: 'iniciar_foco',
    description: 'Arranca el temporizador de foco con la primera tarea pendiente.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        // Duración del foco en minutos.
        minutos: { type: 'integer', description: 'Minutos de foco, normalmente 10.' },
      },
      required: ['minutos'],
      additionalProperties: false,
    },
  },
];

// herramientasPara() copia TOOLS y, si el usuario tiene workspaces, obliga a agregar_tarea
// a elegir uno de sus ids reales (enum). Así Orga siempre puede confirmar a qué workspace fue.
function herramientasPara(workspaces) {
  const ids = workspaces.map((w) => w.id).filter(Boolean);
  if (!ids.length) return TOOLS;
  return TOOLS.map((t) => {
    if (t.name !== 'agregar_tarea') return t;
    const copia = structuredClone(t);
    copia.input_schema.properties.workspace = {
      type: 'string',
      enum: ids,
      description: 'Id del workspace que mejor encaja con el tema de la tarea (siempre elegí uno).',
    };
    return copia;
  });
}

/* ---------- utilidades de respuesta ---------- */
// json() arma una respuesta HTTP con un objeto convertido a JSON.
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// error() arma una respuesta de error con un mensaje claro en español.
const error = (mensaje, status) => json({ error: mensaje }, status);

// recorte() corta un texto a un largo máximo, por si llegan datos muy largos (títulos, nombres).
const recorte = (s, n = 200) => String(s ?? '').slice(0, n);

/* ---------- limpiar el historial ---------- */
// limpiarHistorial() convierte el chat del navegador al formato que pide la API:
// solo roles "user"/"assistant", texto, que empiece con el usuario y sin dos seguidos del mismo rol.
function limpiarHistorial(historial) {
  const salida = [];
  for (const m of historial.slice(-MAX_HISTORIAL)) {
    // Ignoramos lo que no tenga el formato esperado.
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const texto = m.content.trim();
    if (!texto) continue;
    // La API pide que la conversación empiece con el usuario.
    if (!salida.length && m.role !== 'user') continue;
    const ultimo = salida[salida.length - 1];
    // Si se repite el rol, juntamos los textos en un solo mensaje.
    if (ultimo && ultimo.role === m.role) ultimo.content += '\n' + texto;
    else salida.push({ role: m.role, content: texto });
  }
  return salida;
}

/* ---------- llamar a la API de Anthropic ---------- */
// llamarClaude() hace UN pedido a la API. Devuelve { data } si salió bien,
// o { status, mensaje } con un error claro en español si falló (nunca incluye la clave).
async function llamarClaude(apiKey, cuerpo, tiempoMs) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // La clave va en este header, desde el servidor. El navegador nunca la ve.
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(cuerpo),
      // Si tarda demasiado, cortamos para devolver un error claro.
      signal: AbortSignal.timeout(tiempoMs),
    });
    // Si la API respondió con error, lo anotamos en los logs de Netlify (sin la clave) y avisamos.
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      console.error('Error de la API de Anthropic', res.status, detalle.slice(0, 500));
      // 429 / 529 = la API está saturada o llegamos al límite de la cuenta.
      if (res.status === 429 || res.status === 529)
        return { status: 503, mensaje: 'Orga está con mucha gente ahora. Probá en un ratito.' };
      // 401 / 403 = la clave está mal o no tiene permiso.
      if (res.status === 401 || res.status === 403)
        return { status: 502, mensaje: 'Orga no pudo autenticarse con la API. Revisá la clave en Netlify.' };
      return { status: 502, mensaje: 'Orga no pudo pensar la respuesta. Probá otra vez.' };
    }
    return { data: await res.json() };
  } catch (e) {
    // Error de red o se acabó el tiempo.
    console.error('Fallo al llamar a la API de Anthropic', e?.name, e?.message);
    const porTiempo = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return { status: 504, mensaje: porTiempo ? 'Orga tardó demasiado. Probá otra vez.' : 'No me pude conectar con Orga.' };
  }
}

// textoDe() junta los bloques de texto de una respuesta (ignora thinking y tool_use).
const textoDe = (data) =>
  (data?.content || [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text.trim())
    .join(' ')
    .trim();

/* ---------- resultados de las herramientas ---------- */
// resultadoDe() arma el "tool_result" de una acción: le cuenta a Claude qué hizo la app,
// con los datos reales (títulos, workspace, orden), para que escriba la respuesta final.
// ctx = { tareas, workspaces, primera } · primera = la tarea que quedó de primera al priorizar.
function resultadoDe(uso, ctx) {
  const i = uso.input || {};
  // Buscadores rápidos dentro del contexto.
  const tarea = (id) => ctx.tareas.find((t) => t.id === id);
  const wsNombre = (id) => ctx.workspaces.find((w) => w.id === id)?.nombre;
  let texto = '';
  let fallo = false;

  if (uso.name === 'agregar_tarea') {
    const ws = wsNombre(i.workspace);
    texto = ws
      ? `Tarea agregada: "${i.titulo}" en el workspace ${ws}.`
      : `Tarea agregada: "${i.titulo}". Quedó sin workspace elegido: la app la acomoda según sus reglas y el usuario puede cambiarla tocando la etiqueta.`;
  } else if (uso.name === 'completar_tarea') {
    const t = tarea(i.id);
    if (!t) [fallo, texto] = [true, 'No existe una tarea con ese id.'];
    else if (t.hecha) texto = `"${t.titulo}" ya estaba hecha.`;
    else {
      t.hecha = true; // la marcamos en el contexto, para que las acciones siguientes no la usen
      texto = `Tarea completada: "${t.titulo}".`;
    }
  } else if (uso.name === 'priorizar') {
    const orden = (i.ids_en_orden || []).map(tarea).filter((t) => t && !t.hecha);
    if (!orden.length) [fallo, texto] = [true, 'Ninguno de esos ids es una tarea pendiente.'];
    else {
      ctx.primera = orden[0];
      // Le damos los datos de las 3 primeras para que pueda explicar la razón (fecha, minutos, carga).
      const top = orden
        .slice(0, 3)
        .map((t, k) => `${k + 1}. ${t.titulo} (${t.minutos ?? '?'} min, fecha ${t.fecha ?? 'sin fecha'})`)
        .join('; ');
      // Quitamos el punto final de la razón para no repetirlo ("primero..").
      const porque = String(i.razon_corta || 'sin razón').replace(/[.\s]+$/, '');
      texto = `Lista de hoy reordenada. Las primeras: ${top}. Tu razón: ${porque}.`;
    }
  } else if (uso.name === 'recordar') {
    texto = isNaN(Date.parse(i.fecha_hora_iso))
      ? ((fallo = true), 'La fecha y hora no es válida. Pedí la hora otra vez.')
      : `Recordatorio guardado: "${i.titulo}" para ${i.fecha_hora_iso}.`;
  } else if (uso.name === 'iniciar_foco') {
    // El foco arranca con la primera pendiente (la que quedó de primera si recién priorizaste).
    const t = ctx.primera || ctx.tareas.find((x) => !x.hecha);
    texto = t
      ? `Foco de ${i.minutos} minutos iniciado con "${t.titulo}".`
      : ((fallo = true), 'No hay tareas pendientes para enfocarse.');
  } else {
    [fallo, texto] = [true, 'Esa herramienta no existe.'];
  }
  // is_error: true le avisa a Claude que la acción no se pudo hacer.
  return { type: 'tool_result', tool_use_id: uso.id, content: texto, ...(fallo ? { is_error: true } : {}) };
}

/* ---------- la función principal ---------- */
// Netlify ejecuta esta función cada vez que el navegador llama a /.netlify/functions/orga.
// req = el pedido que llega; context trae datos como la IP del visitante.
export default async (req, context) => {
  // 1) Solo aceptamos POST (el chat manda datos).
  if (req.method !== 'POST') return error('Usá POST para hablar con Orga.', 405);

  // 2) Límite de pedidos por IP.
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'desconocida';
  if (demasiadosPedidos(ip)) return error('Vas muy rápido. Esperá un minuto y probá otra vez.', 429);

  // 3) La clave tiene que estar configurada en Netlify (Environment variables).
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return error('Orga no está configurada en el servidor (falta la clave de la API).', 500);

  // 4) Leemos el cuerpo del pedido como JSON.
  let body;
  try {
    body = await req.json();
  } catch {
    return error('El pedido no tiene un formato válido.', 400);
  }

  // 5) Revisamos el historial: tiene que ser una lista y ningún mensaje puede pasar de 2000 caracteres.
  const historial = Array.isArray(body?.historial) ? body.historial : [];
  if (historial.some((m) => typeof m?.content === 'string' && m.content.length > MAX_CHARS))
    return error(`El mensaje es muy largo. Máximo ${MAX_CHARS} caracteres.`, 413);
  const messages = limpiarHistorial(historial);
  // El último mensaje tiene que ser del usuario (es lo que Orga va a contestar).
  if (!messages.length || messages[messages.length - 1].role !== 'user')
    return error('No hay ningún mensaje para responder.', 400);

  // 6) Armamos el contexto con los datos reales del usuario (recortados, por seguridad).
  const tareas = (Array.isArray(body.tareas) ? body.tareas : []).slice(0, 80).map((t) => ({
    id: recorte(t.id, 40),
    titulo: recorte(t.titulo),
    workspace: t.workspace == null ? null : recorte(t.workspace, 40),
    minutos: Number(t.minutos) || null,
    prioridad: Number(t.prioridad) || null,
    fecha: t.fecha == null ? null : recorte(t.fecha, 40),
    hecha: !!t.hecha,
  }));
  const eventos = (Array.isArray(body.eventos) ? body.eventos : []).slice(0, 30).map((e) => ({
    titulo: recorte(e.titulo),
    hora: recorte(e.hora, 20),
  }));
  const workspaces = (Array.isArray(body.workspaces) ? body.workspaces : []).slice(0, 20).map((w) => ({
    id: recorte(w.id, 40),
    nombre: recorte(w.nombre, 60),
  }));
  const ahora = recorte(body.ahora, 60) || new Date().toISOString();
  const nombre = recorte(body.nombre, 40) || 'el usuario';

  // Este bloque cambia en cada pedido, por eso va después de las instrucciones fijas.
  const contexto = `Contexto actual (datos reales, no inventes otros):
- Usuario: ${nombre}
- Ahora: ${ahora}
- Workspaces: ${JSON.stringify(workspaces)}
- Tareas: ${JSON.stringify(tareas)}
- Eventos de hoy: ${JSON.stringify(eventos)}`;

  // 7) Lo que se repite en las dos llamadas a la API.
  const base = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Esfuerzo bajo: piensa poco, responde rápido y no gasta los 600 tokens pensando.
    output_config: { effort: 'low' },
    // Dos bloques de system: las instrucciones fijas y el contexto del momento.
    system: [
      { type: 'text', text: SYSTEM },
      { type: 'text', text: contexto },
    ],
    // Las herramientas, con los workspaces reales del usuario.
    tools: herramientasPara(workspaces),
  };
  // Las dos llamadas juntas tienen que terminar antes de que Netlify corte la función.
  const limite = Date.now() + TIEMPO_MAXIMO_MS;

  // 8) PRIMERA llamada: Claude decide qué hacer ("auto" = puede usar herramientas o solo contestar).
  const r1 = await llamarClaude(apiKey, { ...base, tool_choice: { type: 'auto' }, messages }, TIEMPO_MAXIMO_MS);
  if (!r1.data) return error(r1.mensaje, r1.status);
  const data = r1.data;

  // Si Claude se negó a responder (filtro de seguridad), devolvemos algo amable.
  if (data.stop_reason === 'refusal')
    return json({ reply: 'Eso no te lo puedo ayudar. ¿Vemos tus pendientes?', actions: [] });

  // 9) Separamos el texto de las acciones. La respuesta trae varios "bloques":
  //    text = lo que Orga dice · tool_use = una acción · thinking = lo que pensó (no se muestra).
  const usos = (data.content || []).filter((b) => b.type === 'tool_use');
  // Cada acción sale como { tipo: "agregar_tarea", ...datos } para el navegador.
  const actions = usos.map((b) => ({ tipo: b.name, ...b.input }));
  let reply = textoDe(data);

  // 10) SEGUNDA llamada (solo si hubo acciones): le contamos a Claude qué hizo la app
  //     (tool_result) para que escriba una respuesta final natural.
  if (usos.length) {
    // Resultados en el mismo orden que las acciones (así "priorizar" se procesa antes que "iniciar_foco").
    const ctx = { tareas: tareas.map((t) => ({ ...t })), workspaces, primera: null };
    const resultados = usos.map((u) => resultadoDe(u, ctx));
    const restante = limite - Date.now();
    // Si ya casi no queda tiempo, nos saltamos la segunda llamada y usamos lo que haya.
    if (restante > 1500) {
      const r2 = await llamarClaude(
        apiKey,
        {
          ...base,
          // "none" = esta vez solo escribe, no vuelve a usar herramientas.
          tool_choice: { type: 'none' },
          messages: [
            ...messages,
            // La respuesta de la primera llamada va completa y sin cambios (incluye thinking y tool_use).
            { role: 'assistant', content: data.content },
            // Todos los resultados van juntos en un solo mensaje del usuario.
            { role: 'user', content: resultados },
          ],
        },
        restante,
      );
      // Si la segunda salió bien, su texto es la respuesta final. Si falló, seguimos con el de la primera
      // (las acciones ya son válidas y el navegador arma una frase si no hay texto).
      const final = r2.data && r2.data.stop_reason !== 'refusal' ? textoDe(r2.data) : '';
      if (final) reply = final;
      else console.error('La segunda llamada no dio texto; uso el de la primera.', r2.mensaje || r2.data?.stop_reason);
    }
  }

  // 11) Si se quedó sin tokens antes de escribir y no hizo nada, avisamos.
  if (!reply && data.stop_reason === 'max_tokens' && !actions.length)
    return error('Orga se enredó con la respuesta. Probá preguntando más corto.', 502);

  // 12) Listo: el texto final y las acciones de la primera llamada.
  return json({ reply, actions });
};
