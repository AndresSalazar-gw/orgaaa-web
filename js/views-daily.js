/* =========================================================
   ORGAAA · DAILY
   Hoy | Semana · vistas Tarjetas / Kanban / Libreta
   ========================================================= */
// Las 3 vistas de Daily: [id, nombre, ícono].
const VIEWS = [
  ['cards', 'Tarjetas', I.cards],
  ['kanban', 'Kanban', I.kanban],
  ['libreta', 'Libreta', I.libreta],
];

// Barra de arriba de Daily: pestañas Hoy | Semana, fecha, selector de vista y Reordenar.
function dailyBar(tab) {
  return `<div class="bar">
    <div class="sktabs"><button class="${tab === 'hoy' ? 'on' : ''}" data-a="go" data-h="hoy">Hoy</button><button class="${tab === 'semana' ? 'on' : ''}" data-a="go" data-h="semana">Semana</button><span class="skline"></span></div>
    <span class="when">${esc(dayStr())} · ${esc(wsName(S.ws))}</span>
    <span class="sp"></span>
    ${tab === 'hoy' ? `<div class="seg glass">${VIEWS.map((v) => `<button class="${S.view === v[0] ? 'on' : ''}" data-a="setview" data-k="${v[0]}" title="${v[1]}">${v[2]}<span>${v[1]}</span></button>`).join('')}</div>` : ''}
    <button class="gbtn glass vozbtn" data-a="voz" aria-label="Hablar con Orga">${I.mic}Hey Orga</button>
    <button class="gbtn glass" data-a="reorg" id="reorgBtn">✳ Reordenar</button>
  </div>`;
}

// Una fila de tarea: círculo para marcar, título, workspace y minutos.
const rowT = (t) => `<div class="row glass" data-id="${t.id}">
  <button class="chk" data-a="done" data-id="${t.id}" aria-label="Marcar hecha">${I.check}</button>
  <span class="t" data-a="task" data-id="${t.id}"><span class="ink">${esc(t.title)}</span></span>
  ${S.ws === 'todo' ? wsTag(t.ws) : ''}
  <span class="m">${t.min} min</span></div>`;

/* Tarjeta "Ahora" (o "En foco" con temporizador) */
// Tarjeta 'Ahora': la tarea más importante. Tiene 3 estados: vacía, en foco (con temporizador) o normal.
function hero(top) {
  const f = S.focus && findT(S.focus.id);
  const w = wsById(S.ws);
  if (!top && w && !S.tasks.some((t) => t.ws === w.id))
    return `<div class="hero glass empty"><div><span class="wsico" style="background:${w.color};color:#111;margin:0 auto 18px;width:44px;height:44px;font-size:18px">${esc(w.icon)}</span><h2>${esc(w.name)} está listo.</h2>
    <p class="tip" style="margin:12px auto 0">Lo que llegue de ${esc([...w.channels, ...w.people].slice(0, 3).join(', ') || 'sus reglas')} va a caer aquí.</p>
    <button class="gbtn glass" style="margin-top:20px" data-a="sim">${I.plus} Simular mensaje</button></div></div>`;
  if (!top)
    return `<div class="hero glass empty"><div><div class="art rough donemark" data-art="done"></div><h2>Todo cerrado.</h2><p class="tip" style="margin:12px auto 0">Descansá. Mañana seguimos.</p></div></div>`;
  if (f && f.id === top.id)
    return `<div class="hero glass" data-id="${top.id}">
    <div class="hd"><span class="label">En foco · ${SRC[top.src].name} · ${esc(top.from)}</span><span class="r">10 min</span></div>
    <div class="body"><h2 data-a="task" data-id="${top.id}"><span class="ink">${esc(top.title)}</span></h2><p class="tip">${esc(top.start)}</p></div>
    <div class="tmr" data-timer style="grid-row:2;grid-column:2;align-self:end">${fmt(left())}</div>
    <div class="prog"><i data-bar style="width:${progress() * 100}%"></i></div>
    <div class="ft"><button class="circ-btn fill" data-a="done" data-id="${top.id}" aria-label="Lo cerré">${I.checkL}</button><button class="gbtn glass" data-a="stopfocus">Pausar</button><span class="sp"></span><span class="label">Mirá la isla arriba ↑</span></div></div>`;
  return `<div class="hero glass" data-id="${top.id}">
    <div class="hd"><span class="label">Ahora · ${SRC[top.src].name} · ${esc(top.from)}</span><span class="r">${top.min} min</span></div>
    <div class="body"><h2 data-a="task" data-id="${top.id}"><span class="ink">${esc(top.title)}</span></h2><p class="tip">${esc(top.start)}</p></div>
    <div class="ft"><button class="circ-btn" data-a="focus" data-id="${top.id}" aria-label="Empezar 10 minutos">${I.arrow}</button><span class="label">Empezar 10 min</span><span class="sp"></span>${wsTag(top.ws)}<button class="star" data-a="task" data-id="${top.id}" aria-label="Opciones">✳</button></div></div>`;
}

/* Cuando Orga no sabe a qué workspace va algo, pregunta */
// Cuando Orga no está seguro del workspace, pregunta con estos botones.
const askBox = () =>
  unsure()
    .map(
      (t) => `<div class="ask">
  <div class="q">✳ <b>${esc(t.title)}</b> <span class="mu">· ${esc(t.from)} por ${SRC[t.src].name}. ¿Dónde va?</span></div>
  <div class="wspick">${S.workspaces.map((w) => `<button class="wstag" style="--c:${w.color}" data-a="assign" data-id="${t.id}" data-k="${w.id}">${esc(w.name)}</button>`).join('')}</div></div>`,
    )
    .join('');

/* Riel derecho: lo que entra, la agenda y el avance */
// Riel derecho: Te escribieron (mensajes), agenda de hoy y avance del día.
function rail() {
  const items = S.inbox.filter((m) => srcOn(m.src)).slice(0, 5);
  const evs = S.events.filter((e) => e.d === 0 && srcOn(e.src) && (S.ws === 'todo' || e.ws === S.ws));
  const all = vis(),
    dn = all.filter((t) => t.done).length,
    tot = all.filter((t) => !t.moved || t.done).length;
  const C = 2 * Math.PI * 22;
  return `<aside class="rail">
    <div class="panel glass">
      <div class="ph"><span>Te escribieron</span>${ai()}</div>
      ${
        items
          .map((m) => {
            const t = m.taskId && findT(m.taskId);
            return `<div class="msg ${m.fresh ? 'enter' : ''}">${sq(m.src, 'xs')}
        <div class="b"><div class="n"><span>${esc(m.from)} · ${esc(m.chat || '')}</span><span>${esc(m.time)}</span></div>
        <div class="g ${m.reading ? 'reading' : ''}">${m.reading ? 'Orga está leyendo<span class="dots"></span>' : esc(m.gist)}</div></div>
        ${t ? `<button class="tag" data-a="task" data-id="${t.id}">${t.done ? '✓' : '→ tarea'}</button>` : ''}</div>`;
          })
          .join('') || '<p class="label">Nada nuevo.</p>'
      }
      <button class="gbtn glass" style="width:100%;margin-top:10px" data-a="sim">${I.plus} Simular mensaje</button>
    </div>
    <div class="panel glass">
      <div class="ph"><span>Agenda de hoy</span><span>${SRC.gcal.name}</span></div>
      ${evs.map((e) => `<div class="ev"><span class="h">${e.t}</span><span class="t">${esc(e.title)}</span>${sq(e.src, 'xs')}</div>`).join('') || '<p class="label">Sin eventos.</p>'}
    </div>
    <div class="panel glass mini">
      <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/><circle cx="26" cy="26" r="22" fill="none" stroke="#EF7A35" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - (tot ? dn / tot : 0))}" transform="rotate(-90 26 26)"/></svg>
      <div><b>${dn} de ${tot}</b><div class="label">cerradas hoy</div></div>
    </div>
  </aside>`;
}

// Pantalla Hoy. Según S.view muestra Tarjetas, Kanban o Libreta.
V.hoy = () => {
  if (S.view === 'kanban')
    return (
      dailyBar('hoy') +
      `<div class="head"><h1>Arrastrá.<br><span>Orga se acuerda.</span></h1></div>${askBox()}${kanban()}`
    );
  if (S.view === 'libreta')
    return (
      dailyBar('hoy') +
      `<div class="daily" style="margin-top:30px"><div>${askBox()}${libreta()}</div>${rail()}</div>`
    );
  const o = openT(),
    top = S.focus && findT(S.focus.id) && !findT(S.focus.id).done ? findT(S.focus.id) : o[0];
  const rest = o.filter((t) => t !== top),
    nx = S.showMore ? rest : rest.slice(0, 4);
  const now = o.filter((t) => t.prio === 1).length;
  const moved = vis().filter((t) => !t.done && t.moved),
    dn = vis().filter((t) => t.done);
  return `${dailyBar('hoy')}
  <div class="daily">
    <div>
      <div class="head"><h1>${now ? `<span class="ink" data-sk="under" data-skk="h1-${now}">${now} ${now === 1 ? 'cosa' : 'cosas'}</span> hoy.` : 'Día tranqui.'}<br><span>Lo demás espera.</span></h1></div>
      ${askBox()}
      <div style="margin-top:14px">${hero(top)}</div>
      ${nx.length ? `<div class="sect"><span>Después</span>${rest.length > 4 ? `<button data-a="more">${S.showMore ? 'Ocultar' : '+' + (rest.length - 4) + ' más'}</button>` : ''}</div>${nx.map(rowT).join('')}` : ''}
      ${moved.length ? `<div class="sect"><span>A mañana, sin culpa</span></div>${moved.map((t) => `<div class="row glass moved" data-id="${t.id}"><span class="t" data-a="task" data-id="${t.id}">${esc(t.title)}</span><button class="back" data-a="unmove" data-id="${t.id}">Traer a hoy</button></div>`).join('')}` : ''}
      ${dn.length ? `<div class="sect"><span>Cerraste</span><span>${dn.length}</span></div>${dn.map((t) => `<div class="row glass" style="opacity:.55"><span class="t"><span class="ink" data-sk="strike" data-skk="x-${t.id}">${esc(t.title)}</span></span><button class="back" data-a="undo" data-id="${t.id}">Deshacer</button></div>`).join('')}` : ''}
    </div>
    ${rail()}
  </div>`;
};

/* Kanban con arrastrar y soltar */
// Vista Kanban: 4 columnas. draggable="true" permite arrastrar las tarjetas.
function kanban() {
  const o = openT(),
    f = S.focus && findT(S.focus.id);
  const foco = f && !f.done ? [f] : [];
  const todo = o.filter((t) => !foco.includes(t)),
    hecho = vis().filter((t) => t.done),
    man = vis().filter((t) => !t.done && t.moved);
  const card = (t, st) => `<div class="kc glass ${st}" draggable="true" data-drag="${t.id}" data-id="${t.id}">
    <div class="kt" data-a="task" data-id="${t.id}"><span class="ink" ${st === 'done' ? `data-sk="strike" data-skk="k-${t.id}"` : ''}>${esc(t.title)}</span></div>
    <div class="km"><span><i style="background:${wsCol(t.ws)}"></i>${t.min} min · ${esc(t.due)}</span>${st !== 'done' ? `<button class="chk sm" data-a="done" data-id="${t.id}" aria-label="Hecha">${I.check}</button>` : '<span class="o">✓</span>'}</div></div>`;
  const col = (k, n, arr, st) =>
    `<div class="kcol" data-drop="${k}"><div class="kh"><span ${k === 'done' ? 'class="ink" data-sk="under" data-skk="kh-done"' : ''}>${n}</span><span>${arr.length}</span></div>${arr.map((t) => card(t, st)).join('') || '<div class="kempty">Soltá aquí</div>'}</div>`;
  return `<div class="kan">${col('todo', 'Por hacer', todo, '')}${col('focus', 'En foco', foco, 'focus')}${col('done', 'Hecho', hecho, 'done')}${col('manana', 'Mañana', man, '')}</div>`;
}

/* Libreta: la misma lista en papel */
// Vista Libreta: la misma lista como hoja de papel, con casillas y tachones a mano.
function libreta() {
  const o = openT(),
    d = vis().filter((t) => t.done),
    m = vis().filter((t) => !t.done && t.moved);
  const li = (t, cls) => `<div class="ln ${cls}" data-id="${t.id}">
    <button class="box" data-a="${cls === 'done' ? 'undo' : 'done'}" data-id="${t.id}" data-sk="${cls === 'done' ? 'boxcheck' : 'box'}" data-skk="b-${t.id}-${cls}" data-skc="#1d2a4a" aria-label="Marcar"></button>
    <span class="${t.prio === 1 && cls !== 'done' ? 'hl' : ''}" data-a="task" data-id="${t.id}"><span class="ink" ${cls === 'done' ? `data-sk="strike" data-skk="lx-${t.id}" data-skc="#c0392b"` : ''}>${esc(t.title)}</span></span><small>${t.min}'</small></div>`;
  return `<div class="paper"><div class="ph">Pendientes <small>${esc(dayStr().toLowerCase())}</small></div>
    ${o.map((t) => li(t, '')).join('')}${d.map((t) => li(t, 'done')).join('')}
    ${m.length ? `<div class="pnote">→ mañana: ${m.map((t) => esc(t.title)).join(', ')}</div>` : ''}
    <div class="pdoodle">✳ te ordenaaa</div></div>`;
}

// Pantalla Semana: 7 columnas (hoy + 6 días) con eventos y tareas de cada día.
V.semana = () => {
  const sel = S.calDay || 0;
  const all = vis(),
    dn = all.filter((t) => t.done).length;
  const cols = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const evs = S.events
        .filter((e) => e.d === i && srcOn(e.src) && (S.ws === 'todo' || e.ws === S.ws))
        .sort((a, b) => a.t.padStart(5, '0').localeCompare(b.t.padStart(5, '0')));
      const ts = all.filter((t) => !t.done && t.ws && (t.moved ? 1 : t.day) === i);
      return `<div class="wcol glass ${i === 0 ? 'today' : ''} ${i === sel ? 'on' : ''}" data-a="calday" data-k="${i}">
      <div class="wh"><span>${d.toLocaleDateString('es-SV', { weekday: 'short' })}</span><b ${i === 0 ? 'data-sk="circle" data-skk="today-wk"' : ''}>${d.getDate()}</b></div>
      ${evs.map((e) => `<div class="wi" style="--c:${SRC[e.src].color}"><small>${e.t} · ${SRC[e.src].name}</small>${esc(e.title)}</div>`).join('')}
      ${ts.map((t) => `<div class="wi task" style="--c:${wsCol(t.ws)}" data-a="task" data-id="${t.id}"><small>✳ ${t.min} min</small>${esc(t.title)}</div>`).join('')}
    </div>`;
    })
    .join('');
  return `${dailyBar('semana')}
  <div class="head"><h1>Tu semana.<br><span>${dn} de ${all.length} cerradas.</span></h1></div>
  <div class="weekgrid">${cols}</div>
  <div class="statgrid"><div class="glass stat"><b>${S.closed}</b><span>cerradas hoy</span></div><div class="glass stat"><b>${openT().length}</b><span>pendientes</span></div><div class="glass stat"><b>${vis().filter((t) => t.moved && !t.done).length}</b><span>a mañana, sin culpa</span></div></div>`;
};

/* Detalle de tarea (panel lateral) */
// Panel de detalle de una tarea: consejo, empezar, mañana, hecho, workspace y mensaje original.
function taskDrawer(id, learned) {
  const t = findT(id);
  if (!t) return;
  const m = msgFor(id);
  openDrawer(`<div class="dt">
    <div class="top"><span class="label">${SRC[t.src].name} · ${esc(t.from)}</span><button class="ib" data-a="closeall" aria-label="Cerrar">${I.x}</button></div>
    <h3>${esc(t.title)}</h3>
    <p class="tip" id="adv">${esc(t.start)}</p>
    <button class="wbtn full" style="margin-top:22px" data-a="focus" data-id="${id}">Empezar 10 min</button>
    <div class="acts3">
      <button data-a="advice" data-id="${id}" id="advBtn"><span style="font-size:20px;line-height:1">✳</span>Otro consejo</button>
      <button data-a="move" data-id="${id}">${I.later}Mañana</button>
      <button data-a="done" data-id="${id}">${I.checkL}Hecho</button>
    </div>
    <div class="meta">
      <div><span>Para</span><span>${esc(t.due)}</span></div>
      <div><span>Tiempo</span><span>${t.min} min</span></div>
      <div><span>Prioridad</span><span>${['', 'Ahora', 'Esta semana', 'Cuando podás'][t.prio]}</span></div>
    </div>
    <p class="qlab" style="margin:20px 0 10px">Workspace · tocá para mover</p>
    <div class="wspick">${S.workspaces.map((w) => `<button class="wstag" style="--c:${w.color};${t.ws === w.id ? '' : 'opacity:.45'}" data-a="assign" data-id="${id}" data-k="${w.id}">${t.ws === w.id ? '✓ ' : ''}${esc(w.name)}</button>`).join('')}</div>
    ${learned ? `<p class="learn">✳ Orga aprendió: ${esc(learned)}</p>` : ''}
    ${m ? `<div class="quote"><small>Mensaje original · ${esc(m.chat || SRC[m.src].name)} · ${esc(m.time)}</small>“${esc(m.gist)}”</div>` : ''}
  </div>`);
}
