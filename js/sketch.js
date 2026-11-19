/* =========================================================
   ORGAAA · TACHONES (rough.js)
   Los trazos tienen significado:
   subrayado = lo que importa ahora · tachón = hecho · círculo = logro · casilla = libreta
   Uso en HTML: <span data-sk="under|strike|circle|box|boxcheck" data-skk="clave-única" data-skc="#color">
   ========================================================= */
// Guarda qué trazos ya se animaron para no repetir la animación cada vez que se redibuja.
const drawnSk = new Set();
let lastTab = null;
// Convierte un texto en un número 'semilla': así el mismo tachón sale siempre igual.
const skSeed = (k) => {
  let x = 7;
  for (const c of k) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  return (x % 99999) + 1;
};

// Crea un <svg> vacío posicionado encima de un elemento.
function skSvg(w, h, x, y) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', w);
  s.setAttribute('height', h);
  s.setAttribute('class', 'sk');
  s.style.cssText = `left:${x}px;top:${y}px`;
  return s;
}
/* Anima el trazo como si se dibujara (solo la primera vez) */
// Animación de 'se está dibujando': stroke-dasharray/offset esconden la línea y luego la revelan.
function skDraw(svg, key, ms) {
  if (drawnSk.has(key)) return;
  drawnSk.add(key);
  svg.querySelectorAll('path').forEach((p) => {
    const L = p.getTotalLength();
    p.style.strokeDasharray = L;
    p.style.strokeDashoffset = L;
    p.getBoundingClientRect();
    p.style.transition = `stroke-dashoffset ${ms || 420}ms cubic-bezier(.4,.1,.3,1)`;
    requestAnimationFrame(() => (p.style.strokeDashoffset = 0));
  });
}
// sketch() busca todos los elementos con data-sk y les dibuja su trazo con rough.js.
// Tipos: under (subrayado), strike (tachón), circle, box, boxcheck.
function sketch() {
  if (!window.rough) return;
  $$('[data-sk]').forEach((el) => {
    if (el.querySelector(':scope > svg.sk')) return;
    const type = el.dataset.sk,
      key = el.dataset.skk || type,
      seed = skSeed(key),
      col = el.dataset.skc || '#EF7A35';
    const w = Math.max(10, el.offsetWidth),
      h = el.offsetHeight;
    if (!w || !h) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    let svg, rc;
    const o = { stroke: col, seed };
    if (type === 'under') {
      svg = skSvg(w + 10, 16, -5, h - 7);
      rc = rough.svg(svg);
      svg.appendChild(rc.line(4, 8, w + 6, 6, { ...o, strokeWidth: 3, roughness: 1.6, bowing: 1.8 }));
    } else if (type === 'strike') {
      svg = skSvg(w + 12, h, -6, 0);
      rc = rough.svg(svg);
      const n = Math.max(2, Math.round(w / 34)),
        pts = [];
      for (let i = 0; i <= n; i++) pts.push([6 + (i * w) / n, h * 0.52 + (i % 2 ? -1 : 1) * h * 0.16]);
      svg.appendChild(rc.curve(pts, { ...o, strokeWidth: 2.6, roughness: 1.3, bowing: 1 }));
      svg.appendChild(rc.line(4, h * 0.55, w + 8, h * 0.45, { ...o, strokeWidth: 2, roughness: 1.8 }));
    } else if (type === 'circle') {
      svg = skSvg(w + 34, h + 26, -17, -13);
      rc = rough.svg(svg);
      svg.appendChild(
        rc.ellipse((w + 34) / 2, (h + 26) / 2, w + 26, h + 18, { ...o, strokeWidth: 4, roughness: 2.2 }),
      );
    } else if (type === 'box' || type === 'boxcheck') {
      svg = skSvg(w + 4, h + 4, -2, -2);
      rc = rough.svg(svg);
      svg.appendChild(rc.rectangle(2, 2, w, h, { ...o, strokeWidth: 1.8, roughness: 1.4 }));
      if (type === 'boxcheck')
        svg.appendChild(
          rc.linearPath(
            [
              [3, h * 0.5],
              [w * 0.42, h - 1],
              [w + 6, -6],
            ],
            { stroke: '#c0392b', seed, strokeWidth: 2.6, roughness: 1.2 },
          ),
        );
    }
    if (!svg) return;
    el.appendChild(svg);
    skDraw(svg, key, type === 'circle' ? 650 : type === 'strike' ? 380 : 420);
  });
}
/* Pestañas Hoy | Semana con subrayado a mano que se desliza */
// Subrayado a mano de las pestañas Hoy | Semana que se desliza al cambiar.
function skTabs() {
  const box = $('.sktabs');
  if (!box || !window.rough) return;
  const act = box.querySelector('button.on'),
    line = box.querySelector('.skline');
  if (!act) return;
  const to = { left: act.offsetLeft + 8, width: Math.max(12, act.offsetWidth - 16) };
  const from = lastTab || to;
  line.style.transition = 'none';
  line.style.left = from.left + 'px';
  line.style.width = from.width + 'px';
  const svg = skSvg(to.width + 8, 12, -4, 0),
    rc = rough.svg(svg);
  svg.appendChild(
    rc.line(4, 6, to.width + 4, 5, {
      stroke: '#EF7A35',
      strokeWidth: 2.8,
      roughness: 1.85,
      bowing: 1.8,
      seed: skSeed(act.textContent),
    }),
  );
  line.innerHTML = '';
  line.appendChild(svg);
  if (!lastTab) skDraw(svg, 'tab-first', 420);
  line.getBoundingClientRect();
  line.style.transition = 'left 220ms ease,width 220ms ease';
  line.style.left = to.left + 'px';
  line.style.width = to.width + 'px';
  lastTab = to;
}
/* Manchones de la entrada: un solo gesto a mano por pantalla, nada más.
   a Noche   → círculo naranja alrededor de "AAA"
   b Naranja → mancha negra muy suave detrás + círculo negro en "AAA"
   c Manchón → mancha naranja sólida detrás del logo negro */
// Dibuja la mancha o el círculo de la bienvenida según la propuesta elegida.
function welcomeScribble() {
  const box = $('.welcome .scrib'),
    lg = $('.welcome .logo.huge');
  if (!box || !lg || !window.rough || box.firstChild) return;
  const o = bOpt(),
    W = lg.offsetWidth,
    H = lg.offsetHeight,
    aaa = lg.querySelector('span');
  const ax = aaa.offsetLeft,
    aw = aaa.offsetWidth;
  const pad = 60,
    svg = skSvg(W + pad * 2, H + pad * 2, -pad, -pad),
    rc = rough.svg(svg),
    seed = 7;
  if (o === 'a' || o === 'b') {
    svg.appendChild(
      rc.ellipse(pad + ax + aw / 2, pad + H / 2, aw + 44, H + 26, {
        stroke: o === 'a' ? '#EF7A35' : '#111',
        strokeWidth: 4,
        roughness: 2.1,
        bowing: 1.4,
        seed,
      }),
    );
  } else {
    inkBlob(svg, pad + W / 2, pad + H / 2, W * 0.62, H * 0.78, 11);
  }
  box.appendChild(svg);
  if (o !== 'c') skDraw(svg, 'welcome-' + o, 900);
}
// Dibuja la mancha del lado de marca en login y registro.
function brandScribble() {
  const box = $('.brandside .bscrib');
  if (!box || !window.rough || box.firstChild) return;
  const o = bOpt(),
    W = box.offsetWidth,
    H = box.offsetHeight;
  const svg = skSvg(W, H, 0, 0),
    rc = rough.svg(svg);
  if (o === 'a')
    svg.appendChild(
      rc.ellipse(W * 0.7, H * 0.22, W * 0.42, W * 0.42, {
        stroke: '#EF7A35',
        strokeWidth: 3,
        roughness: 2.3,
        seed: 5,
      }),
    );
  if (o === 'b') {
    const g = rc.ellipse(W * 0.8, H * 0.24, W * 0.7, W * 0.62, {
      fill: '#111',
      fillStyle: 'hachure',
      hachureGap: 10,
      hachureAngle: -38,
      fillWeight: 2,
      stroke: 'none',
      roughness: 2.6,
      seed: 9,
    });
    g.style.opacity = '.08';
    svg.appendChild(g);
  }
  if (o === 'c') inkBlob(svg, W * 0.86, H * 0.16, W * 0.38, W * 0.34, 13);
  box.appendChild(svg);
  if (o === 'a') skDraw(svg, 'bs-' + o + location.hash, 900);
}
if (document.fonts && document.fonts.ready)
  document.fonts.ready.then(() => {
    $$('svg.sk').forEach((s) => {
      if (!s.closest('.skline')) s.remove();
    });
    requestAnimationFrame(() => {
      sketch();
      skTabs();
      welcomeScribble();
      brandScribble();
    });
  });

/* ---------- Manchas orgánicas (no óvalos) ---------- */
// Generador de números al azar con semilla (siempre da la misma secuencia para la misma semilla).
function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Contorno cerrado suave con radio irregular → path SVG */
// blobD() crea el contorno de una mancha: puntos alrededor de un centro con radio irregular,
// unidos con curvas Bézier (C) para que quede suave.
function blobD(cx, cy, rx, ry, seed, n = 13, wob = 0.32) {
  const r = rnd(seed),
    pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2,
      k = 1 - wob / 2 + r() * wob;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n],
      p1 = pts[i],
      p2 = pts[(i + 1) % n],
      p3 = pts[(i + 2) % n];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d + 'Z';
}
/* Mancha de tinta: cuerpo + gotitas alrededor + borde a mano */
// inkBlob() = mancha de tinta completa: cuerpo + gotitas salpicadas + borde dibujado a mano.
function inkBlob(svg, cx, cy, rx, ry, seed, color = '#EF7A35', drops = 7) {
  const NS = 'http://www.w3.org/2000/svg',
    g = document.createElementNS(NS, 'g'),
    r = rnd(seed + 99);
  const add = (d) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', color);
    g.appendChild(p);
  };
  add(blobD(cx, cy, rx, ry, seed, 14, 0.34));
  for (let i = 0; i < drops; i++) {
    const a = r() * Math.PI * 2;
    if (Math.sin(a) > 0.35) continue;
    const dist = 1.08 + r() * 0.35,
      s = 3 + r() * Math.min(rx, ry) * 0.07;
    add(
      blobD(
        cx + Math.cos(a) * rx * dist,
        cy + Math.sin(a) * ry * dist,
        s,
        s * (0.7 + r() * 0.5),
        seed + 10 + i,
        7,
        0.5,
      ),
    );
  }
  g.classList.add('blobin');
  svg.appendChild(g);
  if (window.rough)
    svg.appendChild(
      rough
        .svg(svg)
        .path(blobD(cx, cy, rx * 1.02, ry * 1.02, seed, 14, 0.34), {
          stroke: color,
          strokeWidth: 2,
          roughness: 2.2,
          seed,
        }),
    );
  return g;
}

/* ---------- Gráficos de la intro (mismo lenguaje que "Del caaaos") ---------- */
// Dibuja todos los gráficos a mano pendientes (.art.rough) de la pantalla.
function introScribble() {
  if (window.rough)
    $$('.art.rough').forEach((b) => {
      if (!b.firstChild) drawArt(b);
    });
}
// drawArt() dibuja cada ilustración según data-art: apps, pick, track, done, splat, circle.
function drawArt(box) {
  const k = box.dataset.art,
    NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 300');
  svg.setAttribute('class', 'artsvg');
  const rc = rough.svg(svg),
    W = '#F5F5F7',
    O = '#EF7A35';
  const txt = (x, y, s, size, col, op = 1) => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('fill', col);
    t.setAttribute('font-family', 'Caveat, cursive');
    t.setAttribute('font-size', size);
    t.setAttribute('opacity', op);
    t.textContent = s;
    svg.appendChild(t);
    return t;
  };
  if (k === 'apps') {
    // tres mensajes que llegan de distintas apps → una sola mancha naranja (Orga)
    [
      [24, 58, 'WhatsApp'],
      [14, 128, 'Slack'],
      [28, 198, 'Calendar'],
    ].forEach(([x, y, n], i) => {
      svg.appendChild(
        rc.rectangle(x, y, 96, 46, { stroke: W, strokeWidth: 1.8, roughness: 1.6, seed: 4 + i }),
      );
      svg.appendChild(
        rc.line(x + 12, y + 18, x + 70 - i * 10, y + 18, {
          stroke: W,
          strokeWidth: 2,
          roughness: 1.2,
          seed: 8 + i,
        }),
      );
      svg.appendChild(
        rc.line(x + 12, y + 30, x + 50, y + 30, { stroke: W, strokeWidth: 2, roughness: 1.2, seed: 12 + i }),
      );
      txt(x + 2, y - 6, n, 17, W, 0.55);
      svg.appendChild(
        rc.curve(
          [
            [x + 100, y + 23],
            [170, y + 23 + (150 - y - 23) * 0.4],
            [200, 150],
          ],
          { stroke: O, strokeWidth: 2.2, roughness: 1.4, seed: 20 + i },
        ),
      );
    });
    inkBlob(svg, 236, 150, 40, 38, 31, O, 6);
    const st = txt(220, 166, '✳', 44, '#111');
    st.setAttribute('font-family', 'Geist, sans-serif');
  }
  if (k === 'pick') {
    // la lista y lo que va primero, encerrado a mano
    [
      ['Cotización Ruiz', 1],
      ['Leer cap. 4', 0.35],
      ['Comprar tinta', 0.35],
    ].forEach(([s, op], i) => {
      txt(78, 104 + i * 66, s, 34, W, op);
      if (i)
        svg.appendChild(
          rc.line(78, 96 + i * 66, 78 + s.length * 12.5, 92 + i * 66, {
            stroke: W,
            strokeWidth: 1.6,
            roughness: 1.8,
            seed: 40 + i,
          }),
        );
    });
    svg.appendChild(rc.ellipse(158, 94, 210, 62, { stroke: O, strokeWidth: 3.4, roughness: 2.2, seed: 44 }));
    txt(26, 112, '1', 64, O);
    svg.appendChild(
      rc.curve(
        [
          [250, 160],
          [268, 128],
          [252, 108],
        ],
        { stroke: O, strokeWidth: 2.2, roughness: 1.4, seed: 46 },
      ),
    );
  }
  if (k === 'track') {
    // una lista que se va tachando sola
    [0, 1, 2, 3].forEach((i) => {
      const y = 50 + i * 54,
        done = i < 3;
      svg.appendChild(
        rc.rectangle(48, y, 26, 26, { stroke: W, strokeWidth: 1.8, roughness: 1.5, seed: 60 + i }),
      );
      svg.appendChild(
        rc.line(92, y + 13, 92 + 140 - i * 22, y + 13, {
          stroke: W,
          strokeWidth: 3,
          roughness: 1,
          seed: 64 + i,
        }),
      );
      if (done) {
        svg.appendChild(
          rc.linearPath(
            [
              [50, y + 13],
              [60, y + 26],
              [82, y - 8],
            ],
            { stroke: O, strokeWidth: 3, roughness: 1.2, seed: 68 + i },
          ),
        );
        svg.appendChild(
          rc.line(86, y + 16, 92 + 150 - i * 22, y + 10, {
            stroke: O,
            strokeWidth: 2.4,
            roughness: 1.8,
            seed: 72 + i,
          }),
        );
      }
    });
    txt(150, 280, 'todooo ✳', 30, O);
  }
  if (k === 'done') {
    // día cerrado: check grande a mano sobre una mancha
    inkBlob(svg, 150, 150, 112, 98, 41, O, 5);
    svg.appendChild(
      rc.linearPath(
        [
          [88, 154],
          [134, 206],
          [222, 92],
        ],
        { stroke: '#111', strokeWidth: 13, roughness: 1.3, seed: 42 },
      ),
    );
  }
  if (k === 'splat') inkBlob(svg, 150, 150, 110, 96, +(box.dataset.seed || 7), box.dataset.c || O, 6);
  if (k === 'circle')
    svg.appendChild(
      rc.ellipse(150, 150, 270, 200, { stroke: box.dataset.c || O, strokeWidth: 5, roughness: 2.4, seed: 8 }),
    );
  box.appendChild(svg);
  skDraw(svg, 'art-' + k + Date.now(), k === 'done' ? 700 : 1200);
  svg.querySelectorAll('path').forEach((p, i) => {
    p.style.transitionDelay = i * 40 + 'ms';
  });
}

/* ---------- Fondos de prueba ---------- */
// Fondo 'Manchas' (alternativa guardada, no está activa).
function bgManchas() {
  const box = $('.fx .mm');
  if (!box || box.firstChild) return;
  const NS = 'http://www.w3.org/2000/svg',
    svg = document.createElementNS(NS, 'svg'),
    W = innerWidth,
    H = innerHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('class', 'mmsvg');
  inkBlob(svg, W * 0.97, H * 0.02, W * 0.2, H * 0.28, 5, '#EF7A35', 5);
  inkBlob(svg, W * 0.02, H * 1.0, W * 0.18, H * 0.24, 17, '#C4521A', 4);
  inkBlob(svg, W * 0.62, H * 0.98, W * 0.08, H * 0.1, 23, '#EF7A35', 3);
  box.appendChild(svg);
}

/* Anillo de avance a mano (reemplaza el anillo multicolor) */
// Anillo de progreso dibujado a mano (rough.arc) para 'Tu progreso'.
function handRings() {
  if (!window.rough) return;
  $$('.handring').forEach((el) => {
    if (el.querySelector('svg')) return;
    const p = Math.max(0.02, Math.min(1, +el.dataset.p || 0)),
      S0 = el.offsetWidth,
      NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${S0} ${S0}`);
    svg.setAttribute('class', 'hr');
    const rc = rough.svg(svg),
      c = S0 / 2,
      r = S0 * 0.84;
    svg.appendChild(
      rc.ellipse(c, c, r, r, { stroke: 'rgba(255,255,255,.18)', strokeWidth: 2, roughness: 1.6, seed: 3 }),
    );
    svg.appendChild(
      rc.arc(c, c, r, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p, false, {
        stroke: '#EF7A35',
        strokeWidth: 7,
        roughness: 1.8,
        seed: 5,
      }),
    );
    el.prepend(svg);
    skDraw(svg, 'hr-' + p + Date.now(), 900);
  });
}
/* Fondo "Tinta": tachones a mano muy suaves en las esquinas */
// Fondo 'Tinta': tachones naranjas suaves en las esquinas.
function bgTinta() {
  const box = $('.fx .mm');
  if (!box || box.firstChild || !window.rough) return;
  const NS = 'http://www.w3.org/2000/svg',
    svg = document.createElementNS(NS, 'svg'),
    W = innerWidth,
    H = innerHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'tintasvg');
  const rc = rough.svg(svg),
    o = { stroke: '#EF7A35', strokeWidth: 2.4, roughness: 2.2 };
  const zz = [];
  for (let i = 0; i < 9; i++) zz.push([W * 0.78 + i * 26, H * 0.08 + (i % 2 ? 40 : 0)]);
  svg.appendChild(rc.curve(zz, { ...o, seed: 2 }));
  svg.appendChild(rc.ellipse(W * 0.93, H * 0.3, 160, 120, { ...o, seed: 4 }));
  svg.appendChild(
    rc.curve(
      [
        [W * 0.03, H * 0.78],
        [W * 0.1, H * 0.7],
        [W * 0.16, H * 0.8],
        [W * 0.22, H * 0.72],
        [W * 0.3, H * 0.84],
      ],
      { ...o, seed: 6 },
    ),
  );
  svg.appendChild(rc.line(W * 0.05, H * 0.9, W * 0.25, H * 0.87, { ...o, seed: 9 }));
  box.appendChild(svg);
}
