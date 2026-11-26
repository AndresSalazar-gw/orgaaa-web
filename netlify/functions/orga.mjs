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
- Español salvadoreño con voseo ("tenés", "empezá", "contame"). Cálido y directo, como una amiga que sabe organizarse.
- Máximo 2 o 3 frases cortas. Tus respuestas a veces se leen en voz alta: sin listas, sin viñetas, sin emojis, sin markdown.
- Nunca hacés sentir culpa por lo atrasado. Si algo se pasó, lo reacomodás y seguís ("lo demás espera").

Reglas de datos:
- Usá SOLO las tareas, eventos y workspaces que vienen en el contexto. No inventes tareas, fechas, eventos ni personas.
- Si no sabés algo o no está en los datos, decilo con honestidad y ofrecé ayuda.
- Para referirte a una tarea existente usá su "id" exacto del contexto.

Herramientas (úsalas cuando el usuario lo pida o cuando claramente le ayude):
- agregar_tarea: cuando te cuenta algo que tiene que hacer. Una llamada por cada tarea. Elegí el workspace por su id según el tema; si no encaja ninguno, usá null.
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

  // 7) Llamamos a la API de Anthropic.
  let data;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // La clave va en este header, desde el servidor. El navegador nunca la ve.
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // Esfuerzo bajo: piensa poco, responde rápido y no gasta los 600 tokens pensando.
        output_config: { effort: 'low' },
        // Dos bloques de system: las instrucciones fijas y el contexto del momento.
        system: [
          { type: 'text', text: SYSTEM },
          { type: 'text', text: contexto },
        ],
        tools: TOOLS,
        // "auto" = Claude decide si usa herramientas o solo contesta.
        tool_choice: { type: 'auto' },
        messages,
      }),
      // Si tarda demasiado, cortamos para devolver un error claro.
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });

    // Si la API respondió con error, lo anotamos en los logs de Netlify (sin la clave) y avisamos.
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      console.error('Error de la API de Anthropic', res.status, detalle.slice(0, 500));
      // 429 / 529 = la API está saturada o llegamos al límite de la cuenta.
      if (res.status === 429 || res.status === 529)
        return error('Orga está con mucha gente ahora. Probá en un ratito.', 503);
      // 401 / 403 = la clave está mal o no tiene permiso.
      if (res.status === 401 || res.status === 403)
        return error('Orga no pudo autenticarse con la API. Revisá la clave en Netlify.', 502);
      return error('Orga no pudo pensar la respuesta. Probá otra vez.', 502);
    }
    data = await res.json();
  } catch (e) {
    // Error de red o se acabó el tiempo.
    console.error('Fallo al llamar a la API de Anthropic', e?.name, e?.message);
    const porTiempo = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return error(porTiempo ? 'Orga tardó demasiado. Probá otra vez.' : 'No me pude conectar con Orga.', 504);
  }

  // 8) Si Claude se negó a responder (filtro de seguridad), devolvemos algo amable.
  if (data.stop_reason === 'refusal')
    return json({ reply: 'Eso no te lo puedo ayudar. ¿Vemos tus pendientes?', actions: [] });

  // 9) Separamos el texto de las acciones. La respuesta trae varios "bloques":
  //    text = lo que Orga dice · tool_use = una acción · thinking = lo que pensó (lo ignoramos).
  const textos = [];
  const actions = [];
  for (const bloque of data.content || []) {
    if (bloque.type === 'text' && bloque.text) textos.push(bloque.text.trim());
    // Cada acción sale como { tipo: "agregar_tarea", ...datos }.
    if (bloque.type === 'tool_use') actions.push({ tipo: bloque.name, ...bloque.input });
  }
  let reply = textos.join(' ').trim();

  // 10) Si se quedó sin tokens antes de escribir, avisamos (las acciones completas igual se aplican).
  if (!reply && data.stop_reason === 'max_tokens' && !actions.length)
    return error('Orga se enredó con la respuesta. Probá preguntando más corto.', 502);

  // 11) Listo: devolvemos el texto y las acciones al navegador.
  return json({ reply, actions });
};
