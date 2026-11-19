/* =========================================================
   ORGAAA · CUENTA (estilo Spotify)
   Perfil plegable con workspaces · Resumen diario · Tu progreso ·
   Tu Recap · Conexiones · Widgets · Tu plan · Nuevo workspace
   ========================================================= */
// Rutas que se ven dentro del diseño de Cuenta.
const CUENTA = ['cuenta', 'resumen', 'progreso', 'conexiones', 'widgets', 'plan', 'recap'];

// Columna izquierda de Cuenta (estilo Spotify): perfil plegable con workspaces + menú.
function acctSide(cur) {
  const nm = userName(),
    on = Object.keys(S.sources).filter((k) => S.sources[k]).length;
  const item = (ic, label, right, h) =>
    `<button class="mi ${cur === h ? 'on' : ''}" data-a="go" data-h="${h}"><span class="mico">${I[ic]}</span><span class="ml">${label}</span>${right || ''}</button>`;
  return `<div class="acctside">
    <div class="acct glass ${S.acctOpen ? 'open' : ''}">
      <button class="acc-h" data-a="toggleacct"><span class="av" style="background:${avc(nm)}">${esc(nm.charAt(0).toUpperCase())}</span>
        <span style="flex:1"><b class="pn">${esc(nm)}</b><br><span class="label">${esc(wsName(S.ws))} · ${S.workspaces.length} workspaces</span></span><span class="chev">${I.chev}</span></button>
      <div class="acc-body"><div>
        <div class="acc-sep"></div>
        ${wsAll()
          .map(
            (w) =>
              `<button class="wsrow ${S.ws === w[0] ? 'on' : ''}" data-a="setws" data-k="${w[0]}"><span class="wsico" ${w[3] && S.ws === w[0] ? `style="background:${w[3]};color:#111"` : ''}>${w[2]}</span><span style="flex:1">${esc(w[1])}</span>${S.ws === w[0] ? '<span class="o">✓</span>' : ''}</button>`,
          )
          .join('')}
        <button class="wsrow" data-a="addws"><span class="wsico add">+</span><span style="flex:1">Agregar workspace</span></button>
        <button class="wsrow" data-a="go" data-h="cuenta"><span class="wsico add">${I.user.replace('<svg', '<svg width="16" height="16"')}</span><span style="flex:1">Ver perfil</span></button>
      </div></div>
    </div>
    <div class="menu">
      ${item('clock', 'Resumen diario', `<span class="m">${(DIGEST.find((d) => d[0] === S.digest) || DIGEST[0])[1]}</span>`, 'resumen')}
      ${item('prog', 'Tu progreso', '<span class="m">Privado</span>', 'progreso')}
      ${item('recap', 'Tu Recap', '<span class="badge lime">Compartir</span>', 'recap')}
      ${item('mcp', 'Conexiones', `<span class="m">${on} apps</span>`, 'conexiones')}
      ${item('wid', 'Widgets', '<span class="m">iPhone · Mac</span>', 'widgets')}
      ${item('plan', 'Tu plan', '<span class="badge">Gratis</span>', 'plan')}
    </div>
    <button class="reset" data-a="logout">Cerrar sesión</button>
    <button class="reset" style="margin-top:8px" data-a="reset">Reiniciar demo</button>
  </div>`;
}

// Botón de volver (solo se ve en celular).
const paneBack = `<button class="ib glass back" data-a="go" data-h="cuenta-menu" aria-label="Volver">${I.back}</button>`;

// PANES = el contenido de la derecha de Cuenta, una función por sección.
const PANES = {};

// Perfil: lo que Orga sabe de vos, fondo de la app y tus workspaces.
PANES.cuenta = () => {
  const P = S.profile;
  const usos = P.uso.map((k) => (USOS.find((u) => u[0] === k) || [0, k])[1]).join(', ') || '—';
  return `${paneBack}<h1>Hola, ${esc(userName())}.<br><span>Esto sabe Orga de vos.</span></h1>
  <div class="pfgrid">
    <div class="pfcard glass"><div class="k">Correo</div><div class="v">${esc(P.email || 'andrea.m@gmail.com')}</div></div>
    <div class="pfcard glass"><div class="k">A qué te dedicás</div><div class="v">${esc(P.rubro || '—')}</div></div>
    <div class="pfcard glass"><div class="k">Lo usás para</div><div class="v">${esc(usos)}</div></div>
    <div class="pfcard glass"><div class="k">Nos conociste por</div><div class="v">${esc(P.fuente || '—')}</div></div>
  </div>
  <div class="sect"><span>Fondo de la app</span></div>
  <div class="chiprow" style="margin-top:12px">${BGS.map(([k, l]) => `<button class="chip ${bgNow() === k ? 'on' : ''}" data-a="setbg" data-k="${k}">${l}</button>`).join('')}</div>
  <div class="sect"><span>Tus workspaces</span><button data-a="addws">+ Agregar</button></div>
  ${S.workspaces
    .map(
      (
        w,
      ) => `<div class="row glass"><span class="wsico" style="background:${w.color};color:#111">${esc(w.icon)}</span>
    <span class="t">${esc(w.name)}<br><span class="label">${esc([...w.channels.slice(0, 2), ...w.people.slice(0, 2)].join(' · '))}</span></span>
    <span class="m">${S.tasks.filter((t) => t.ws === w.id && !t.done).length} pendientes</span></div>`,
    )
    .join('')}`;
};

/* Resumen diario: el output que te llega afuera de la app */
// Calcula los números del resumen diario: cerradas, pendientes, mensajes y por workspace.
function digestData() {
  const all = S.tasks.filter((t) => srcOn(t.src) && t.ws),
    d = all.filter((t) => t.done),
    o = all.filter((t) => !t.done && !t.moved).sort((a, b) => a.prio - b.prio || a.ord - b.ord),
    m = all.filter((t) => !t.done && t.moved);
  return {
    d,
    o,
    m,
    next: o[0],
    msgs: S.inbox.filter((x) => srcOn(x.src)).length,
    byWs: S.workspaces.map((w) => ({ w, n: o.filter((t) => t.ws === w.id).length })).filter((x) => x.n),
  };
}
// Resumen diario: cómo y a qué hora te llega (WhatsApp, correo, notificación o widget).
PANES.resumen = () => {
  const D = digestData(),
    nm = userName();
  const outs = [
    ['wa', 'WhatsApp'],
    ['mail', 'Correo'],
    ['noti', 'Notificación'],
    ['wid', 'Widget'],
  ];
  const txt = `Buenas, ${nm} ✳\nHoy cerraste ${D.d.length}. Quedan ${D.o.length}${D.m.length ? ` y ${D.m.length} pasó a mañana` : ''}.\nTe llegaron ${D.msgs} mensajes; ya los ordené.\nArrancá con: ${D.next ? D.next.title : 'nada urgente'}.`;
  const hr = { '7am': '7:00', '12pm': '12:00', '8pm': '20:00', '2x': '7:00 y 20:00' }[S.digest];
  const prev = {
    wa: `<div class="pv wa"><div class="pvh"><span class="sq xs" style="background:#EF7A35;color:#111">✳</span>Orga <span class="label">· WhatsApp · ${hr}</span></div><div class="bub">${esc(txt).replace(/\n/g, '<br>')}</div></div>`,
    mail: `<div class="pv mail"><div class="label">De: Orga · Asunto: Tu día en 4 líneas</div><div class="mailbody">${esc(txt).replace(/\n/g, '<br>')}</div></div>`,
    noti: `<div class="pv noti glass"><span class="sq xs" style="background:#EF7A35;color:#111">✳</span><div><b>Orga</b><br>Cerraste ${D.d.length}. Ahora: ${esc(D.next ? D.next.title : 'nada urgente')}.</div></div>`,
    wid: `<div class="pv widp">${LOGO.replace('class="logo"', 'class="logo" style="font-size:22px"')}<div class="wbig">${D.d.length}/${D.d.length + D.o.length}</div><div class="label" style="color:#111">Ahora: ${esc(D.next ? D.next.title : '—')}</div></div>`,
  };
  return `${paneBack}<h1>Tu día,<br><span>en 4 líneas.</span></h1>
  <div class="statgrid" style="margin-top:0"><div class="glass stat"><b>${D.d.length}</b><span>cerradas</span></div><div class="glass stat"><b>${D.o.length}</b><span>quedan</span></div><div class="glass stat"><b>${D.msgs}</b><span>mensajes leídos</span></div></div>
  <div class="twocol" style="margin-top:8px">
    <div>
      <div class="sect"><span>Así te llega</span></div>
      <div class="chiprow" style="margin-top:12px">${outs.map(([k, l]) => `<button class="chip ${S.out === k ? 'on' : ''}" data-a="setout" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="sect"><span>¿A qué hora?</span></div>
      <div class="chiprow" style="margin-top:12px">${DIGEST.map(([k, l]) => `<button class="chip ${S.digest === k ? 'on' : ''}" data-a="setdig" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="sect"><span>Por workspace</span></div>
      ${D.byWs.map((x) => `<div class="row glass"><span class="wsico xs" style="background:${x.w.color};color:#111">${x.w.icon}</span><span class="t">${esc(x.w.name)}</span><span class="m">${x.n} pendientes</span></div>`).join('')}
    </div>
    <div><div class="sect"><span>Vista previa</span></div><div style="margin-top:12px">${prev[S.out]}</div></div>
  </div>`;
};

/* Tu progreso: privado */
// Tu progreso: porcentaje cumplido, por workspace, lo que cumpliste, lo que no se dio y pendientes.
PANES.progreso = () => {
  const all = S.tasks.filter((t) => srcOn(t.src) && t.ws),
    d = all.filter((t) => t.done),
    o = all.filter((t) => !t.done && !t.moved),
    m = all.filter((t) => !t.done && t.moved);
  const doneN = d.length + S.hist.done.length,
    tot = doneN + o.length + m.length + S.hist.missed.length,
    pct = tot ? Math.round((doneN / tot) * 100) : 0;
  const ws = S.workspaces.map((w) => {
    const ts = S.tasks.filter((t) => t.ws === w.id);
    return { w, dn: ts.filter((t) => t.done).length, tot: ts.length };
  });
  const li = (arr, cls) =>
    arr
      .map(
        (x, i) =>
          `<div class="pli ${cls}">${cls === 'no' ? '· ' : cls === 'pend' ? '○ ' : ''}<span class="ink" ${cls === 'ok' ? `data-sk="strike" data-skk="p-${i}-${x.slice(0, 8)}" data-skc="#D8F35B"` : ''}>${esc(x)}</span></div>`,
      )
      .join('');
  return `${paneBack}<h1>${pct}% cumplido.<br><span>Esta semana. Solo vos lo ves.</span></h1>
  <div class="twocol">
    <div class="handring" data-p="${pct / 100}"><div class="center"><b>${doneN}</b><span class="label">de ${tot}</span></div></div>
    <div><div class="label">Por workspace</div>${ws.map((x) => `<div class="wsbar"><span>${esc(x.w.name)}</span><span class="label">${x.dn}/${x.tot}</span><div class="wbar"><i style="width:${x.tot ? (x.dn / x.tot) * 100 : 0}%;background:${x.w.color}"></i></div></div>`).join('')}</div>
  </div>
  <div class="pcols">
    <div class="glass pcol"><div class="ph2">Cumpliste</div>${li(d.map((t) => t.title).concat(S.hist.done), 'ok')}</div>
    <div class="glass pcol"><div class="ph2">No se dio</div>${li(S.hist.missed.concat(m.map((t) => t.title)), 'no')}<p class="label" style="margin-top:8px">Sin culpa. Lo reprogramamos.</p></div>
    <div class="glass pcol"><div class="ph2">Pendientes</div>${li(
      o.map((t) => t.title),
      'pend',
    )}</div>
  </div>`;
};

/* Conexiones: cómo se conecta cada app y qué permisos pide */
// Conexiones: cada app con su forma de conectarse y en qué fase del lanzamiento entra.
PANES.conexiones = () => {
  const tile = (k) => {
    const c = CONNECT[k],
      on = S.sources[k];
    let ft;
    if (c.how === 'soon') ft = `<span class="badge ghost">${c.fase}</span>`;
    else if (on)
      ft = `<span class="pill-on">Conectado</span><span class="sp" style="flex:1"></span><button class="gbtn glass" data-a="connect" data-k="${k}">${c.pick ? 'Elegir' : 'Ver'}</button>`;
    else
      ft = `<button class="wbtn" style="padding:10px 16px;font-size:13.5px" data-a="connect" data-k="${k}">Conectar</button><span class="label" style="margin-left:auto">${c.fase}</span>`;
    return `<div class="ctile glass ${on ? '' : 'off'}"><div class="h">${sq(k)}${c.how === 'number' ? '<span class="label">Número de Orga</span>' : c.by ? `<span class="label">Permiso de ${c.by}</span>` : ''}</div>
      <div><div class="nm">${SRC[k].name}</div><div class="st">${c.desc}</div></div><div class="ft">${ft}</div></div>`;
  };
  return `${paneBack}<h1>Orga lee.<br><span>Vos seguís igual.</span></h1>
  <div class="cgrid">${['wa', 'gcal', 'slack', 'notion', 'gmail'].map(tile).join('')}
    <div class="ctile glass"><div class="h"><span class="sq" style="background:#EF7A35;color:#111">✳</span><span class="label">Micrófono</span></div><div><div class="nm">Hey Orga</div><div class="st">Le hablás y ordena. Solo cuando tocás el orbe.</div></div><div class="ft"><button class="gbtn glass" data-a="go" data-h="orga">Probar</button></div></div>
  </div>
  <div class="how">
    <div class="glass"><b>1</b>Tocás Conectar y la app te pide permiso.</div>
    <div class="glass"><b>2</b>Elegís qué puede leer: canales, páginas o calendarios.</div>
    <div class="glass"><b>3</b>Orga solo lee. Nunca responde por vos.</div>
    <div class="glass"><b>4</b>Lo desconectás cuando querás.</div>
  </div>`;
};

/* Consentimiento (simula la pantalla de permisos de cada app) */
// Simula la pantalla de permisos (OAuth) de cada app, o el número de Orga en el caso de WhatsApp.
function connectModal(k) {
  const c = CONNECT[k];
  if (c.how === 'number')
    return openModal(`<div class="oauth">
    <div class="apps">${sq('wa')}<span class="dash"></span><span class="sq" style="background:#EF7A35;color:#111">✳</span></div>
    <h3>Orga en WhatsApp</h3><p class="who">${c.note}</p>
    <div class="waqr"><div class="qr">${qrSvg()}</div><div><span class="label">Guardá este número</span><br><b>+503 7000 0RGA</b><br><span class="label">Escribile, reenviale o mandale audios.</span></div></div>
    <div class="scopes"><div class="scope on"><span class="ck">✓</span><span>Leer lo que vos le mandés<small>Mensajes, reenvíos y audios</small></span></div>
    <div class="scope on"><span class="ck">✓</span><span>Mandarte tu resumen diario<small>Podés pausarlo cuando querás</small></span></div></div>
    <div class="acts"><button class="gbtn glass" data-a="closeall">Cerrar</button><button class="wbtn" data-a="allow" data-k="wa">${S.sources.wa ? 'Listo' : 'Ya lo guardé'}</button></div>
    ${S.sources.wa ? '<button class="reset" data-a="disconnect" data-k="wa">Desconectar</button>' : ''}</div>`);
  const picks = S.picks[k] || [];
  openModal(`<div class="oauth">
    <div class="apps"><span class="sq" style="background:#EF7A35;color:#111">✳</span><span class="dash"></span>${sq(k)}</div>
    <h3>ORGAAA quiere acceder<br>a tu ${SRC[k].name}</h3>
    <p class="who">${esc(S.profile.email || 'andrea.m@gmail.com')} · pantalla de ${c.by}</p>
    <div class="scopes">${c.scopes.map((s) => `<div class="scope on"><span class="ck">✓</span><span>${s[0]}<small>${s[1]}</small></span></div>`).join('')}</div>
    ${c.pick ? `<p class="qlab" style="margin:0 0 10px">Elegí qué puede leer</p><div class="scopes" style="margin-top:0">${c.pick.map((p) => `<button class="scope ${picks.includes(p) ? 'on' : ''}" data-a="pick" data-app="${k}" data-k="${esc(p)}"><span class="ck">${picks.includes(p) ? '✓' : ''}</span><span>${esc(p)}</span></button>`).join('')}</div>` : ''}
    <div class="acts"><button class="gbtn glass" data-a="closeall">Cancelar</button><button class="wbtn" data-a="allow" data-k="${k}">Permitir</button></div>
    ${S.sources[k] ? `<button class="reset" data-a="disconnect" data-k="${k}">Desconectar ${SRC[k].name}</button>` : ''}
    <p class="fine">Demo: en la versión real esta pantalla la muestra ${c.by}.</p></div>`);
}
/* QR decorativo (no escanea) */
// QR decorativo (no se puede escanear).
function qrSvg() {
  let r = '';
  let x = 11;
  for (let i = 0; i < 21; i++)
    for (let j = 0; j < 21; j++) {
      x = (x * 9301 + 49297) % 233280;
      const fixed = (i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7);
      if (
        fixed
          ? (i % 6 === 0 || j % 6 === 0 || (i % 6 > 1 && i % 6 < 5 && j % 6 > 1 && j % 6 < 5)) &&
            !(i > 13 && j > 13)
          : x / 233280 > 0.52
      )
        r += `<rect x="${j}" y="${i}" width="1" height="1"/>`;
    }
  return `<svg viewBox="0 0 21 21" fill="#111">${r}</svg>`;
}

// Widgets: cómo se vería Orga en el iPhone, la Dynamic Island y la Mac.
PANES.widgets = () => {
  const o = openT(),
    all = vis(),
    done = all.filter((t) => t.done).length,
    total = all.length;
  const f = S.focus && findT(S.focus.id),
    ft = f || o[0];
  const clock = new Date()
    .toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' })
    .replace(/\s?[ap]\.?\s?m\.?/i, '');
  const C = 2 * Math.PI * 29,
    tm = S.focus ? fmt(left()) : '10:00';
  return `${paneBack}<h1>Sin abrir la app.<br><span>Solo lo siguiente.</span></h1>
  <div class="wgrid">
    <div class="wbox glass"><div class="wl">iPhone · Bloqueo</div><div class="lock"><div class="label">${esc(dayStr())}</div><div class="clock">${clock}</div>
      <div class="wrow"><div class="gauge glass"><svg viewBox="0 0 66 66"><circle cx="33" cy="33" r="29" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="4"/><circle cx="33" cy="33" r="29" fill="none" stroke="#EF7A35" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - (total ? done / total : 0))}" transform="rotate(-90 33 33)"/></svg>${done}/${total}</div>
      <div class="lrect glass"><b>${ft ? esc(ft.title) : 'Todo listo'}</b>${ft ? ft.min + ' min' : ''}</div></div></div></div>
    <div class="wbox glass"><div class="wl">iPhone · Inicio</div><div class="homegrid">
      <div class="wsmall glass"><span class="label">Ahora</span><div class="t">${ft ? esc(ft.title) : 'Nada'}</div><div style="display:flex;justify-content:space-between">${I.arrow.replace('<svg', '<svg width="20"')}<span>✳</span></div></div>
      <div class="wsmall or">${LOGO.replace('class="logo"', 'class="logo" style="font-size:20px"')}<div style="font-size:34px;font-weight:500;letter-spacing:-.04em">${done}/${total}</div></div></div></div>
    <div class="wbox glass"><div class="wl">Dynamic Island</div>
      <div class="pillc"><span style="display:flex;gap:8px;align-items:center">${ringSvg(progress())}${ft ? esc(short(ft.title, 18)) : 'Orga'}</span><span class="o" data-timer>${tm}</span></div>
      <div class="exp"><span class="label">${ft ? esc(ft.title) : ''}</span><div class="tm o" data-timer>${tm}</div></div>
      ${S.focus ? '' : '<button class="gbtn glass" style="width:100%;margin-top:10px" data-a="focusTop">Probar 10 min</button>'}</div>
    <div class="wbox glass"><div class="wl">Mac · Barra de menú y escritorio</div>
      <div class="macmock"><div class="mb"><span>${LOGO.replace('class="logo"', 'class="logo" style="font-size:12px"')}</span><span class="isl">✳ ${ft ? esc(short(ft.title, 18)) : 'Listo'} <b class="o" ${S.focus ? 'data-timer' : ''}>${S.focus ? tm : done + '/' + total}</b></span><span>${clock}</span></div>
      <div class="desk"><div class="dw"><span class="label">Ahora</span><div style="font-weight:600">${ft ? esc(ft.title) : 'Nada'}</div></div></div></div></div>
  </div>`;
};

// Tu plan: Gratis vs Pro (precios de prueba).
PANES.plan = () => `${paneBack}<h1>Tu plan.<br><span>Gratis mientras estudiás.</span></h1>
  <div class="plans">
    <div class="plan glass"><span class="badge ghost" style="align-self:flex-start">Actual</span><div class="pr">$0 <small>/ mes</small></div>
      <ul><li>WhatsApp y Google Calendar</li><li>Hey Orga: 20 al día</li><li>Resumen diario</li><li>3 workspaces</li></ul></div>
    <div class="plan pro"><span class="badge" style="align-self:flex-start;background:#111;color:#fff">Pro · propuesta</span><div class="pr">$2.99 <small>/ mes</small></div>
      <ul><li>Slack, Notion y Gmail</li><li>Hey Orga sin límite</li><li>Recap completo</li><li>Workspaces sin límite</li></ul>
      <button class="kbtn" data-a="pro">Probar Pro</button></div>
  </div>
  <p class="fine" style="text-align:left">Precios de prueba para validar con usuarios.</p>`;

// Pantalla Cuenta: junta la columna izquierda y la sección elegida.
V.cuenta = (sub) => {
  const menu = sub === 'cuenta-menu',
    cur = !sub || menu ? 'cuenta' : sub,
    pane = PANES[cur === 'recap' ? 'progreso' : cur] || PANES.cuenta;
  return `<div class="bar"><span class="when">Cuenta</span><span class="sp"></span>${ai()}</div>
  <div class="acctgrid ${menu ? '' : 'sub'}">${acctSide(cur)}<div class="pane">${pane()}</div></div>
  ${cur === 'recap' ? recap() : ''}`;
};

/* Tu Recap: historias para compartir (marca ruidosa) */
// Las 6 historias del Recap (como Spotify Wrapped).
function recapSlides() {
  return [
    { bg: '#EF7A35', fg: '#111', k: 'Tu Recap', big: 'Tu semana<br>en Orga', sub: 'Tocá para seguir →' },
    {
      bg: '#111',
      fg: '#fff',
      k: 'Cerraste',
      big: `<span class="ink" data-sk="circle" data-skk="rc-${23 + S.closed}">${23 + S.closed}</span><br>tareas`,
      sub: 'Más que la semana pasada. Así sí.',
    },
    {
      bg: '#D8F35B',
      fg: '#111',
      k: 'Tu app más ruidosa',
      big: 'Whats<br>App',
      sub: '41 mensajes se volvieron 12 tareas.',
    },
    {
      bg: '#FF6FCF',
      fg: '#111',
      k: 'Tu mejor hora',
      big: '8:30<br>p. m.',
      sub: 'Ahí arrancás todo. Te guardamos ese rato.',
    },
    {
      bg: '#111',
      fg: '#fff',
      k: 'Lo que más pospusiste',
      big: 'Leer cap. 4<br>Kotler',
      sub: '5 veces. Sin culpa. Esta semana sí.',
    },
    {
      bg: '#EF7A35',
      fg: '#111',
      k: 'Tu tipo',
      big: 'Arranca<br>tarde,<br>cierra<br>fuerte.',
      sub: 'Compartilo y etiquetá a tu grupo.',
    },
  ];
}
// Dibuja la historia actual del Recap en pantalla completa.
function recap() {
  const SL = recapSlides(),
    i = S.recapI || 0,
    s = SL[i];
  return `<div class="recapwrap" data-a="go" data-h="progreso">
    <button class="rnav" style="left:calc(50% - 250px)" data-a="recapprev" aria-label="Anterior">‹</button>
    <div class="recap" style="background:${s.bg};color:${s.fg}" data-a="recapnext">
      <div class="rbars">${SL.map((_, j) => `<i class="${j < i ? 'done' : j === i ? 'now' : ''}"></i>`).join('')}</div>
      <div class="rtop">${LOGO.replace('class="logo"', 'class="logo" style="font-size:24px"')}<button class="rx" data-a="go" data-h="progreso" aria-label="Cerrar">✕</button></div>
      <div class="rk">${s.k}</div><div class="rbig">${s.big}</div><div class="rsub">${s.sub}</div>
      <button class="rshare" data-a="share"><span style="color:${s.fg}">Compartir ↗</span></button>
      ${i === 0 ? '<div class="art rough rdeco" data-art="splat" data-c="#111" data-seed="5"></div>' : ''}
      ${i === 2 ? '<div class="art rough rdeco" data-art="splat" data-c="#111" data-seed="12"></div>' : ''}
      ${i === 3 ? '<div class="art rough rdeco" data-art="circle" data-c="#111"></div>' : ''}
      ${i === 5 ? '<div class="art rough rdeco" data-art="splat" data-c="#111" data-seed="19"></div>' : ''}
    </div>
    <button class="rnav" style="right:calc(50% - 250px)" data-a="recapnext" aria-label="Siguiente">›</button>
  </div>`;
}

/* Nuevo workspace: 5 preguntas para que Orga sepa qué va ahí */
// Nuevo workspace: 5 preguntas para que Orga sepa qué tareas van ahí.
V['nuevo-workspace'] = () => {
  const n = S.nw;
  if (!n) return V.cuenta();
  const st = n.step;
  const chips = (arr, sel, act) =>
    `<div class="chiprow">${arr.map((x) => `<button class="chip ${sel.includes(x) ? 'on' : ''}" data-a="${act}" data-k="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
  const addInp = (id, ph) =>
    `<form class="addrow" data-form="nwadd" data-k="${id}"><input class="inp sm glass" id="${id}" placeholder="${ph}" autocomplete="off"><button class="ib glass" type="submit" aria-label="Agregar">${I.plus}</button></form>`;
  let body = '';
  if (st === 0)
    body = `<h1>Nuevo workspace.<br><span>¿Cómo se llama?</span></h1>
    <input class="inp glass" id="nwname" placeholder="Ej: Proyecto ORGAAA" value="${esc(n.name)}" autocomplete="off" style="max-width:460px">
    <p class="qlab">¿Qué tipo es?</p>${chips(NW_TYPES, [n.type], 'nwtype')}
    <p class="qlab">Color</p><div class="chiprow">${NW_COLORS.map((c) => `<button class="dotc ${n.color === c ? 'on' : ''}" style="background:${c}" data-a="nwcolor" data-k="${c}" aria-label="Color"></button>`).join('')}</div>`;
  if (st === 1)
    body = `<h1>¿De dónde llegan<br><span>sus tareas?</span></h1><p class="label" style="font-size:14px">Lo que venga de estos chats y canales va aquí.</p>
    ${Object.keys(NW_CH)
      .filter((k) => S.sources[k])
      .map((k) => `<p class="qlab">${sq(k, 'xs')} ${SRC[k].name}</p>${chips(NW_CH[k], n.channels, 'nwch')}`)
      .join('')}`;
  if (st === 2)
    body = `<h1>¿Quiénes<br><span>son parte?</span></h1><p class="label" style="font-size:14px">Si alguien de aquí te pide algo, va a este workspace.</p><div style="height:20px"></div>
    ${chips([...new Set(NW_PEOPLE.concat(n.people))], n.people, 'nwpp')}${addInp('nwppin', 'Agregar persona')}`;
  if (st === 3) {
    const sug = [...new Set((NW_KW[n.type] || []).concat(n.keywords))];
    body = `<h1>Palabras que<br><span>lo identifican.</span></h1><p class="label" style="font-size:14px">Si un mensaje las menciona, va aquí.</p><div style="height:20px"></div>
    ${chips(sug, n.keywords, 'nwkw')}${addInp('nwkwin', 'Agregar palabra')}`;
  }
  if (st === 4)
    body = `<h1>¿Cuándo le<br><span>dedicás tiempo?</span></h1><p class="label" style="font-size:14px">Orga te sugiere sus tareas en esos momentos.</p><div style="height:20px"></div>
    <div class="circles">${NW_TIME.map((x) => `<button class="circ glass ${n.time.includes(x) ? 'on' : ''}" data-a="nwtime" data-k="${x}">${x}</button>`).join('')}</div>`;
  if (st === 5)
    body = `<h1>Orga ya sabe<br><span>qué va aquí.</span></h1>
    <div class="rules glass" style="max-width:560px"><div class="rh"><span class="wsico" style="background:${n.color};color:#111">${esc((n.name || 'W').charAt(0).toUpperCase())}</span><b>${esc(n.name || 'Nuevo workspace')}</b><span class="label">${esc(n.type)}</span></div>
    ${n.channels.length ? `<div class="rule"><span>Canales · peso 3</span>${n.channels.map(esc).join(', ')}</div>` : ''}
    ${n.people.length ? `<div class="rule"><span>Personas · peso 2</span>${n.people.map(esc).join(', ')}</div>` : ''}
    ${n.keywords.length ? `<div class="rule"><span>Palabras · peso 1</span>${n.keywords.map(esc).join(', ')}</div>` : ''}
    ${n.time.length ? `<div class="rule"><span>Te lo sugiere</span>${n.time.join(', ')}</div>` : ''}</div>
    <p class="label" style="margin-top:14px;font-size:13.5px">Si Orga no está seguro, te pregunta. Cada vez que corregís, aprende.</p>`;
  return `<div class="nwwrap">
    <div class="qtop" style="max-width:none"><button class="ib glass" data-a="nwback" aria-label="Atrás">${I.back}</button><span class="label">${st < 5 ? `${st + 1} de 5` : 'Listo'}</span><button class="skip" data-a="nwcancel">Cancelar</button></div>
    <div class="qbar" style="max-width:none"><i style="width:${Math.min(100, (st + 1) * 20)}%"></i></div>
    <div style="margin-top:6vh">${body}</div>
    <div class="qfoot" style="max-width:none"><button class="wbtn" style="min-width:220px" data-a="${st < 5 ? 'nwnext' : 'nwdone'}">${st < 5 ? 'Continuar' : 'Crear workspace'}</button></div>
  </div>`;
};
