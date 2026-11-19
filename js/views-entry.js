/* =========================================================
   ORGAAA · VISTAS DE ENTRADA
   Bienvenido → Iniciar sesión → Home
   Bienvenido → Registrarte → Google → Intro (4) → Crear perfil (4) → Home
   ========================================================= */
// V = objeto con TODAS las pantallas. Cada una es una función que devuelve HTML como texto (template literal).
// Ejemplo: V.hoy() devuelve el HTML de la pantalla Hoy.
const V = {};
// Pantallas de entrada (antes de iniciar sesión).
const ENTRY = ['bienvenida', 'iniciar-sesion', 'registro', 'google', 'intro', 'crear-perfil'];

/* Propuestas visuales de la entrada (se eligen arriba en la bienvenida) */
// Propuestas visuales de la bienvenida. La primera es la de por defecto.
const BRAND_OPTS = [
  ['c', 'Manchón'],
  ['a', 'Noche'],
  ['b', 'Naranja'],
];
const bOpt = () => S.brandOpt || 'c';

// Pantalla 1: Bienvenido a Orga.
V.bienvenida = () => {
  const o = bOpt();
  return `<div class="welcome opt-${o}">
  <div class="top">
    <span class="optsw"><span class="label">Propuesta</span>${BRAND_OPTS.map(([k, l]) => `<button class="${o === k ? 'on' : ''}" data-a="setopt" data-k="${k}">${l}</button>`).join('')}</span>
    <button class="toplink" data-a="go" data-h="iniciar-sesion">Iniciar sesión</button>
  </div>
  <div class="wlogo"><div class="scrib"></div><div class="logo huge"><b>ORG</b><span>AAA</span></div></div>
  <p class="claim">Del caos, <span class="ink" data-sk="under" data-skk="claim-${o}" data-skc="${o === 'b' ? '#111' : '#EF7A35'}">te ordenaaa.</span></p>
  <div class="acts">
    <button class="${o === 'b' ? 'kbtn' : 'wbtn'}" data-a="go" data-h="registro">Registrarte</button>
    <button class="ghost" data-a="go" data-h="iniciar-sesion">Iniciar sesión</button>
  </div>
  <p class="foot">Para quienes estudian y trabajan.</p>
</div>`;
};

/* Lado de marca de las pantallas divididas */
// Componente reutilizable: el lado de marca de las pantallas divididas (login, registro, Google).
const brandSide = (big, p) => `<div class="brandside opt-${bOpt()}">
  <div class="bscrib"></div>
  ${LOGO}
  <div class="big">${big}</div>
  <p>${p}</p>
</div>`;

// Iniciar sesión: con Google o con correo. El formulario se valida en app.js (evento submit).
V['iniciar-sesion'] = () => `<div class="split">
  ${brandSide('Hola de<br><span>nuevo.</span>', 'Tu día ya está ordenado. Entrá y empezá por lo primero.')}
  <div class="formside"><button class="ib glass back" data-a="go" data-h="bienvenida" aria-label="Volver">${I.back}</button>
    <div class="inner">
      <h1>Iniciar<br><span>sesión.</span></h1>
      <button class="gbtn-google" data-a="loginGoogle">${I.google}Continuar con Google</button>
      <div class="or">o con tu correo</div>
      <form class="stack" data-form="login">
        <input class="inp" id="lmail" type="email" placeholder="Correo" autocomplete="email" value="${esc(S.profile.email)}">
        <input class="inp" id="lpass" type="password" placeholder="Contraseña" autocomplete="current-password">
        <button class="wbtn full" type="submit">Entrar</button>
      </form>
      <p class="switch">¿No tenés cuenta? <button data-a="go" data-h="registro">Registrate</button></p>
    </div>
  </div>
</div>`;

// Registrarte: crea la cuenta y lleva a la intro.
V.registro = () => `<div class="split">
  ${brandSide('Del caaaos<br><span>al orden.</span>', 'Conectá lo que ya ocupás. Orga lee, ordena y te dice cómo empezar.')}
  <div class="formside"><button class="ib glass back" data-a="go" data-h="bienvenida" aria-label="Volver">${I.back}</button>
    <div class="inner">
      <h1>Creá tu<br><span>cuenta.</span></h1>
      <button class="gbtn-google" data-a="go" data-h="google">${I.google}Registrarte con Google</button>
      <div class="or">o con tu correo</div>
      <form class="stack" data-form="registro">
        <input class="inp" id="rname" placeholder="Tu nombre" autocomplete="given-name">
        <input class="inp" id="rmail" type="email" placeholder="Correo" autocomplete="email">
        <input class="inp" id="rpass" type="password" placeholder="Contraseña (mín. 6)" autocomplete="new-password">
        <button class="wbtn full" type="submit">Crear cuenta</button>
      </form>
      <p class="switch">¿Ya tenés cuenta? <button data-a="go" data-h="iniciar-sesion">Iniciá sesión</button></p>
    </div>
  </div>
</div>`;

// Selector de cuenta de Google (simulado).
V.google = () => `<div class="split">
  ${brandSide('Un toque<br><span>y listo.</span>', 'Solo pedimos tu nombre y correo. Lo demás lo conectás vos, cuando querás.')}
  <div class="formside"><button class="ib glass back" data-a="go" data-h="registro" aria-label="Volver">${I.back}</button>
    <div class="inner">
      <h1>Entrá con<br><span>Google.</span></h1>
      <div class="glass gacc">
        <div class="label" style="padding:6px 14px 8px">Elegí una cuenta</div>
        <button class="accrow" data-a="googlePick" data-n="Andrea Martínez" data-m="andrea.m@gmail.com"><span class="av" style="background:#EF7A35;width:40px;height:40px;font-size:15px">A</span><span style="flex:1"><b>Andrea Martínez</b><br><span class="label">andrea.m@gmail.com</span></span>${I.arrow}</button>
        <button class="accrow" data-a="go" data-h="registro"><span class="av" style="background:rgba(255,255,255,.12);color:#fff;width:40px;height:40px">+</span><span style="flex:1">Usar otra cuenta</span></button>
      </div>
      <div class="perm"><div>Tu nombre y foto</div><div>Tu correo</div></div>
      <p class="fine" style="text-align:left">No leemos tu Gmail ni tu Calendar sin que lo conectés aparte.</p>
    </div>
  </div>
</div>`;

/* Arte de cada pestaña de la intro */
// Devuelve el dibujo de cada pestaña de la intro. 'chaos' es SVG fijo; los demás se dibujan con rough.js.
function introArt(k) {
  if (k === 'chaos')
    return `<svg viewBox="0 0 300 200" class="art"><path class="scrib" d="M30 120c20-60 60 30 30-20s-40 50 10 20 30-70 50-10-60 40-20 30 40-60 20-10-50 30 0 10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <path d="M150 100h18" stroke="#EF7A35" stroke-width="4" stroke-linecap="round"/><path d="M162 92l8 8-8 8" fill="none" stroke="#EF7A35" stroke-width="4" stroke-linecap="round"/>
    ${[0, 1, 2].map((i) => `<g class="line" style="animation-delay:${0.6 + i * 0.25}s"><circle cx="200" cy="${70 + i * 30}" r="8" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="216" y="${67 + i * 30}" width="${60 - i * 12}" height="6" rx="3" fill="#fff"/></g>`).join('')}</svg>`;
  return `<div class="art rough" data-art="${k}"></div>`;
}

// Intro de 4 pestañas con puntos de avance.
V.intro = () => {
  const i = S.introI || 0,
    T = INTRO[i];
  return `<div class="split">
    <div class="artside"><div class="stage glass">${introArt(T.art)}</div></div>
    <div class="formside"><div class="inner">
      <div class="intro-top"><div class="dots4">${INTRO.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div><button class="skip" data-a="go" data-h="crear-perfil">Saltar</button></div>
      <h1>${T.t}<br><span>${T.s}</span></h1>
      <p class="intro-en">${T.en}</p>
      <div class="intro-acts">
        ${i > 0 ? `<button class="ib glass" data-a="introPrev" aria-label="Atrás" style="width:52px;height:52px">${I.back}</button>` : ''}
        <button class="wbtn" style="flex:1" data-a="introNext">${i === 3 ? 'Crear perfil' : 'Siguiente'}</button>
      </div>
    </div></div>
  </div>`;
};

// Crear perfil: 4 preguntas (nombre y rubro, para qué, qué apps, dónde nos conociste).
V['crear-perfil'] = () => {
  const i = S.pfI || 0,
    P = S.profile;
  const top = `<div class="qtop">
    <button class="ib glass" data-a="pfPrev" aria-label="Atrás">${I.back}</button>
    <span class="label">${i + 1} de 4</span>
    <button class="skip" data-a="pfDone">Saltar</button></div>
    <div class="qbar"><i style="width:${(i + 1) * 25}%"></i></div>`;
  let body = '',
    btn = 'Continuar';
  if (i === 0)
    body = `<h1>¿Quién sos?</h1>
    <input class="inp glass" id="pname" placeholder="Tu nombre" value="${esc(P.name)}" autocomplete="off" style="max-width:420px">
    <p class="qlab">¿A qué te dedicás?</p>
    <div class="chiprow">${RUBROS.map((r) => `<button class="chip ${P.rubro === r ? 'on' : ''}" data-a="pfRubro" data-k="${r}">${r}</button>`).join('')}</div>`;
  if (i === 1)
    body = `<h1>¿Para qué<br><span>lo vas a usar?</span></h1>
    <div class="circles">${USOS.map(([k, l]) => `<button class="circ glass ${P.uso.includes(k) ? 'on' : ''}" data-a="pfUso" data-k="${k}">${l}</button>`).join('')}</div>
    <p class="qlab">El balanceee que soñaste. Elegí todos los que quieras.</p>`;
  if (i === 2) {
    body = `<h1>¿Qué ocupás<br><span>para organizarte?</span></h1>
    <div class="circles">${['wa', 'gcal', 'slack', 'notion'].map((k) => `<button class="circ glass ${P.apps.includes(k) ? 'on' : ''}" data-a="pfApp" data-k="${k}">${sq(k)}${SRC[k].name}</button>`).join('')}</div>
    <p class="qlab">Las conectás después, con permiso de cada app.</p>`;
    btn = 'Conectar';
  }
  if (i === 3) {
    body = `<h1>¿Dónde nos<br><span>conociste?</span></h1>
    <div class="chiprow">${FUENTES.map((r) => `<button class="chip ${P.fuente === r ? 'on' : ''}" data-a="pfFuente" data-k="${r}">${r}</button>`).join('')}</div>`;
    btn = 'Entrar a Orga';
  }
  return `<div class="qwrap">${top}<div class="qbody">${body}</div>
    <div class="qfoot"><button class="wbtn" style="min-width:220px" data-a="${i === 3 ? 'pfDone' : 'pfNext'}">${btn}</button></div></div>`;
};
