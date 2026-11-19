/* =========================================================
   ORGAAA · DATOS
   Datos de ejemplo (demo) y textos fijos de la app.
   Cuando haya backend, seed() se reemplaza por lo que venga de la API.
   ========================================================= */
// Nombre con el que se guarda todo en localStorage.
const KEY = 'orgaaa_web_v1';

/* Fuentes de donde llegan las tareas */
// Objeto con cada app: nombre, abreviatura y color. Se usa en toda la app con SRC.wa, SRC.slack, etc.
const SRC = {
  wa: { name: 'WhatsApp', short: 'WA', color: '#25D366' },
  slack: { name: 'Slack', short: 'SL', color: '#611F69' },
  gcal: { name: 'Calendar', short: 'GC', color: '#1A73E8' },
  notion: { name: 'Notion', short: 'NO', color: '#3a3a3a' },
  gmail: { name: 'Gmail', short: 'GM', color: '#EA4335' },
  voz: { name: 'Hey Orga', short: '✳', color: '#EF7A35' },
};

/* Cómo se conecta cada app (lo que ve el usuario al tocar "Conectar") */
// how: 'number' = número de Orga (WhatsApp) · 'oauth' = pantalla de permisos de la app · 'soon' = fase futura.
// scopes = permisos que se piden · pick = lo que el usuario elige que Orga pueda leer.
const CONNECT = {
  wa: {
    how: 'number',
    fase: 'Lanzamiento',
    desc: 'Reenviale mensajes o audios al número de Orga.',
    note: 'WhatsApp no deja leer tus chats. Vos decidís qué le mandás.',
  },
  gcal: {
    how: 'oauth',
    fase: 'Lanzamiento',
    by: 'Google',
    desc: 'Lee tus eventos para armar tu día.',
    scopes: [
      ['Ver tus eventos', 'Solo lectura'],
      ['Ver tus calendarios', 'Para elegir cuáles'],
    ],
    pick: null,
  },
  slack: {
    how: 'oauth',
    fase: 'Fase 2',
    by: 'Slack',
    desc: 'Lee los canales que elijás y cuando te mencionan.',
    scopes: [
      ['Ver mensajes de canales elegidos', 'Solo esos canales'],
      ['Ver cuando te mencionan', '@vos'],
    ],
    pick: ['#contenido', '#clientes', '#general', 'DM Diego'],
  },
  notion: {
    how: 'oauth',
    fase: 'Fase 2',
    by: 'Notion',
    desc: 'Lee solo las páginas que elegís.',
    scopes: [['Leer páginas elegidas', 'Nada más']],
    pick: ['Investigación UMH', 'Pendientes Homi', 'Ideas', 'Lecturas'],
  },
  gmail: {
    how: 'soon',
    fase: 'Fase 3',
    desc: 'Leer correos importantes.',
    note: 'Google pide una auditoría de seguridad para leer correos. Llega después.',
  },
};

// Colores para avatares.
const AVC = ['#EF7A35', '#D8F35B', '#FF6FCF', '#FFE45C', '#8FE0A6', '#7FB8FF'];
// Horas posibles del resumen diario: [id, texto].
const DIGEST = [
  ['7am', '7:00 a. m.'],
  ['12pm', 'Mediodía'],
  ['8pm', '8:00 p. m.'],
  ['2x', '2 al día'],
];

/* Estado inicial de la demo */
// seed() devuelve el estado inicial completo. Es una función para poder 'reiniciar la demo' cuando queramos.
function seed() {
  return {
    v: 1,
    authed: false, // ¿ya pasó por login/registro?
    onboarded: false, // ¿ya terminó Crear perfil?
    introI: 0,
    pfI: 0,
    profile: { name: '', email: '', rubro: '', uso: [], apps: ['wa', 'gcal'], fuente: '' },
    ws: 'todo',
    view: 'cards',
    acctOpen: false,
    nw: null,
    out: 'wa',
    digest: '7am',
    calDay: 0,
    recapI: 0,
    showMore: false,
    closed: 0,
    simIdx: 0,
    focus: null,
    workspaces: [
      {
        id: 'u',
        name: 'La U',
        icon: 'U',
        color: '#7FB8FF',
        type: 'La U',
        channels: ['Investigación UMH', 'Aula virtual'],
        people: ['Graciela', 'Caleb', 'Christopher'],
        keywords: ['prototipo', 'parcial', 'profe', 'avance', 'encuesta', 'ensayo'],
        time: ['Noches'],
      },
      {
        id: 'trabajo',
        name: 'Trabajo · Homi',
        icon: 'T',
        color: '#EF7A35',
        type: 'Trabajo',
        channels: ['#contenido', '#clientes', 'DM Diego'],
        people: ['Carla', 'Diego'],
        keywords: ['cliente', 'cotización', 'reel', 'Torre Vista'],
        time: ['Mañanas'],
      },
      {
        id: 'personal',
        name: 'Personal',
        icon: 'P',
        color: '#D8F35B',
        type: 'Personal',
        channels: ['Chat contigo', 'Familia'],
        people: ['Mamá'],
        keywords: ['pagar', 'comprar', 'cumple', 'dentista', 'tarjeta'],
        time: ['Fines de semana'],
      },
    ],
    // Conexiones: true = conectado
    sources: { wa: true, gcal: true, slack: true, notion: false, gmail: false },
    picks: { slack: ['#contenido', '#clientes', 'DM Diego'], notion: [] },
    hist: {
      done: ['Daily Homi', 'Encuesta enviada', 'Llamar al banco', 'Subir fotos Torre Vista', 'Leer cap. 3'],
      missed: ['Gym martes', 'Responder a Christopher'],
    },
    // day = días desde hoy (0 hoy, 1 mañana…). Sirve para la vista Semana.
    tasks: [
      {
        id: 't1',
        ws: 'u',
        title: 'Pantallas del prototipo',
        src: 'wa',
        from: 'Graciela',
        chat: 'Investigación UMH',
        due: 'Jue',
        day: 1,
        prio: 1,
        ord: 0,
        min: 90,
        start: 'Abrí Figma. Solo la pantalla Hoy, en gris.',
      },
      {
        id: 't2',
        ws: 'trabajo',
        title: 'Cotización Ruiz',
        src: 'slack',
        from: 'Diego',
        chat: 'DM Diego',
        due: 'Hoy',
        day: 0,
        prio: 1,
        ord: 1,
        min: 20,
        start: 'Duplicá la última y cambiá nombre y monto.',
      },
      {
        id: 't3',
        ws: 'trabajo',
        title: 'Reels Torre Vista',
        src: 'slack',
        from: 'Carla',
        chat: '#contenido',
        due: 'Vie',
        day: 2,
        prio: 1,
        ord: 2,
        min: 120,
        start: 'Solo ordená los clips del primer reel.',
      },
      {
        id: 't4',
        ws: 'personal',
        title: 'Pagar internet',
        src: 'wa',
        from: 'Mamá',
        chat: 'Familia',
        due: 'Antes del 20',
        day: 0,
        prio: 2,
        ord: 3,
        min: 5,
        start: 'Abrí la app del banco. Son 3 minutos.',
      },
      {
        id: 't5',
        ws: 'u',
        title: 'Leer cap. 4 Kotler',
        src: 'notion',
        from: 'Lecturas',
        chat: 'Lecturas',
        due: 'Lun',
        day: 5,
        prio: 3,
        ord: 5,
        min: 40,
        start: 'Leé solo subtítulos y resumen final.',
      },
      {
        id: 't6',
        ws: 'personal',
        title: 'Regalo de Sofi',
        src: 'voz',
        from: 'Vos',
        due: 'Sáb',
        day: 3,
        prio: 2,
        ord: 4,
        min: 30,
        start: 'Preguntale a su hermana qué quiere.',
      },
      {
        id: 't7',
        ws: 'personal',
        title: 'Comprar tinta',
        src: 'wa',
        from: 'Vos',
        chat: 'Chat contigo',
        due: 'Mañana',
        day: 1,
        prio: 3,
        ord: 6,
        min: 15,
        moved: true,
        start: 'Pedila en línea desde el celular.',
      },
    ],
    events: [
      { d: 0, t: '9:00', title: 'Daily Homi', src: 'gcal', ws: 'trabajo' },
      { d: 0, t: '18:00', title: 'Clase Inv. de Mercados', src: 'gcal', ws: 'u' },
      { d: 1, t: '10:00', title: 'Revisión con el profe', src: 'gcal', ws: 'u' },
      { d: 2, t: '15:00', title: 'Entrega reels', src: 'slack', ws: 'trabajo' },
      { d: 3, t: '11:00', title: 'Almuerzo con Chris', src: 'gcal', ws: 'personal' },
      { d: 3, t: '16:00', title: 'Cumple de Sofi', src: 'wa', ws: 'personal' },
      { d: 5, t: '9:00', title: 'Presentación prototipo', src: 'gcal', ws: 'u' },
    ],
    inbox: [
      {
        id: 'm1',
        src: 'wa',
        from: 'Graciela',
        chat: 'Investigación UMH',
        time: '4:52 p. m.',
        gist: '¿Podés armar las pantallas para el jueves?',
        taskId: 't1',
      },
      {
        id: 'm2',
        src: 'slack',
        from: 'Diego',
        chat: 'DM Diego',
        time: '3:30 p. m.',
        gist: 'Ruiz espera la cotización hoy',
        taskId: 't2',
      },
      {
        id: 'm3',
        src: 'slack',
        from: 'Carla',
        chat: '#contenido',
        time: '11:05 a. m.',
        gist: 'Los 3 reels para el viernes',
        taskId: 't3',
      },
      {
        id: 'm4',
        src: 'wa',
        from: 'Mamá',
        chat: 'Familia',
        time: '9:40 a. m.',
        gist: 'Pagá el internet antes del 20',
        taskId: 't4',
      },
    ],
  };
}

/* Mensajes que se simulan con "Simular mensaje" (el último no tiene pistas: Orga pregunta) */
// Mensajes de prueba para 'Simular mensaje'. Cada uno trae la tarea que Orga debería sacar.
const SIM = [
  {
    src: 'wa',
    from: 'Caleb',
    chat: 'Investigación UMH',
    gist: '¿Me pasás la encuesta en Excel hoy?',
    task: {
      title: 'Encuesta a Caleb',
      due: 'Hoy',
      day: 0,
      prio: 1,
      min: 5,
      start: 'Buscala en Drive y mandala ya.',
    },
  },
  {
    src: 'slack',
    from: 'Carla',
    chat: '#contenido',
    gist: 'El reel 1 sale mañana temprano',
    task: {
      title: 'Terminar reel 1',
      due: 'Mañana',
      day: 1,
      prio: 1,
      min: 60,
      start: 'Exportá una versión rápida.',
    },
  },
  {
    src: 'wa',
    from: 'Andrés',
    chat: 'Andrés',
    gist: '¿Me ayudás con lo del viernes?',
    task: {
      title: 'Ayudar a Andrés',
      due: 'Vie',
      day: 2,
      prio: 2,
      min: 30,
      start: 'Preguntale qué necesita exactamente.',
    },
  },
  {
    src: 'gcal',
    from: 'Christopher',
    chat: 'Clases',
    gist: 'Revisión con el profe, vie 10:00',
    task: {
      title: 'Dudas para el profe',
      due: 'Vie',
      day: 2,
      prio: 2,
      min: 15,
      start: 'Anotá solo 3 preguntas.',
    },
  },
];

// Consejos de respaldo cuando no hay IA.
const CANNED = [
  'Poné 10 minutos y hacé lo más feo primero.',
  'Abrí el archivo y escribí solo el título.',
  'Hacé el paso de 2 minutos. Ya.',
  'Avisá que estás en eso. Te compromete.',
];
// Ejemplos para probar Hey Orga.
const EXAMPLES = [
  'Mañana tengo que entregar el ensayo de ética, también llamar al dentista y el sábado comprarle algo a mi hermana.',
  'El viernes presento el prototipo, pagar la tarjeta antes del 20 y Carla me pidió el reel de Torre Vista hoy.',
];

/* Onboarding */
// Las 4 pestañas de la intro: t = línea blanca, s = línea gris, en = frase en inglés, art = dibujo.
const INTRO = [
  {
    t: 'Del caaaaos,',
    s: 'te ayudamos a organizar.',
    en: 'Organizing ain’t perfect. Start with us.',
    art: 'chaos',
  },
  { t: 'Conectamos', s: 'las apps que ya ocupás.', en: 'Everything you know, connected.', art: 'apps' },
  { t: 'Te ayudamos', s: 'a elegir qué va primero.', en: 'Tough decisions? We got ’em.', art: 'pick' },
  { t: 'Keep on track', s: 'todooo.', en: 'No dejes que tus obligaciones te ganen.', art: 'track' },
];
// Opciones de Crear perfil.
const RUBROS = ['Marketing', 'Web', 'Diseño', 'Tech', 'Comunicaciones', 'Otro'];
const USOS = [
  ['trabajo', 'Trabajo'],
  ['u', 'La U'],
  ['vida', 'Vida'],
];
const FUENTES = ['TikTok', 'Instagram', 'Un amigo', 'La U', 'Otro'];

/* Nuevo workspace */
// Opciones del cuestionario de Nuevo workspace.
const NW_TYPES = ['La U', 'Trabajo', 'Proyecto', 'Personal'];
const NW_COLORS = ['#EF7A35', '#D8F35B', '#FF6FCF', '#7FB8FF', '#FFE45C'];
const NW_CH = {
  wa: ['Investigación UMH', 'Familia', 'Chat contigo', 'Grupo del trabajo'],
  slack: ['#contenido', '#clientes', 'DM Diego'],
  gcal: ['Clases', 'Reuniones'],
  notion: ['Investigación UMH', 'Pendientes Homi'],
};
const NW_PEOPLE = ['Graciela', 'Caleb', 'Christopher', 'Carla', 'Diego', 'Mamá', 'Andrés'];
const NW_KW = {
  'La U': ['parcial', 'entrega', 'profe', 'avance', 'tarea'],
  Trabajo: ['cliente', 'cotización', 'reunión', 'reel', 'factura'],
  Proyecto: ['prototipo', 'avance', 'presentación', 'deadline'],
  Personal: ['pagar', 'comprar', 'cumple', 'cita', 'gym'],
};
const NW_TIME = ['Mañanas', 'Tardes', 'Noches', 'Fines de semana'];

/* Íconos (SVG de línea) */
// Íconos en SVG guardados como texto para reutilizarlos (I.daily, I.mic, I.check...).
const I = {
  daily:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  checkL:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  cards:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3.5" width="16" height="10" rx="2.5"/><path d="M4 17.5h16M4 20.5h10" stroke-linecap="round"/></svg>',
  kanban:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="16.5" y="4" width="4" height="7" rx="1.5"/></svg>',
  libreta:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  spark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  later:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  prog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5A8.5 8.5 0 0 1 20.5 12H12z" fill="currentColor"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M8.5 10.5h7"/></svg>',
  recap:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
  mcp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  wid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  google:
    '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-7.9z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>',
};
