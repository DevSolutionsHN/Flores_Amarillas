/* =========================================================================
   PARA TI 🌻 — script.js
   ========================================================================= */

const CONFIG = {

  nombre: "VALERIA",

  mensaje:
`Entre tantas flores, tú siempre serás mi favorita. 🌻💛

Gracias por llenar mis días de momentos bonitos, por hacerme sonreír y por ser esa persona especial que hace que todo se sienta un poquito más bonito.

Te quiero muchoooo. 💛`,


  floresContorno: 42,
};

/* =========================================================================
   Fin de la zona de personalización.
   ========================================================================= */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* -----------------------------------------------------------------------
     Referencias al DOM
     ----------------------------------------------------------------------- */
  const card       = document.getElementById("card");
  const scene      = document.getElementById("scene");
  const canvas     = document.getElementById("fireflies");
  const intro      = document.getElementById("intro");
  const sunWrap    = document.getElementById("sunflower-wrap");
  const paraQuien  = document.getElementById("para-quien");
  const stemEl     = document.getElementById("stem");
  const branchesEl = document.getElementById("branches");
  const treeEl     = document.getElementById("tree");
  const flowersEl  = document.getElementById("flowers");
  const fallingEl  = document.getElementById("falling");
  const messageEl  = document.getElementById("message");

  if (CONFIG.nombre && CONFIG.nombre.trim()) {
    paraQuien.textContent = `Para ti, ${CONFIG.nombre.trim()}`;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const rand  = (min, max) => Math.random() * (max - min) + min;

  /* -----------------------------------------------------------------------
     Estado compartido de la geometría (árbol + corazón)
     ----------------------------------------------------------------------- */
  let stemBaseY   = 0;
  let stemTopY    = 0;
  let stemHeight  = 0;
  let leafDefs    = [];
  let heartCenter = { x: 0, y: 0 };
  let heartScale  = 1;
  let heartPositions = [];
  const flowerEls = []; // { pos, emoji }

  /* -----------------------------------------------------------------------
     Luciérnagas de fondo (canvas ligero, sin librerías externas)
     ----------------------------------------------------------------------- */
  const ctx = canvas.getContext("2d");
  let fireflies = [];
  let cw = 0, ch = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function sizeCanvas() {
    cw = card.clientWidth;
    ch = card.clientHeight;
    canvas.width  = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width  = cw + "px";
    canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeFireflies() {
    const target = prefersReducedMotion ? 8 : Math.round((cw * ch) / 26000);
    const count = Math.max(6, Math.min(target, 42));
    fireflies = Array.from({ length: count }, () => ({
      x: rand(0, cw),
      y: rand(0, ch),
      r: rand(0.6, 1.8),
      speed: rand(0.05, 0.18),
      angle: rand(0, Math.PI * 2),
      twinkle: rand(0, Math.PI * 2),
    }));
  }

  function drawFireflies() {
    ctx.clearRect(0, 0, cw, ch);
    for (const f of fireflies) {
      f.angle += 0.0025;
      f.x += Math.cos(f.angle) * f.speed;
      f.y += Math.sin(f.angle * 1.3) * f.speed;
      f.twinkle += 0.03;
      if (f.x < -5) f.x = cw + 5;
      if (f.x > cw + 5) f.x = -5;
      if (f.y < -5) f.y = ch + 5;
      if (f.y > ch + 5) f.y = -5;
      const alpha = 0.22 + Math.abs(Math.sin(f.twinkle)) * 0.5;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 214, 120, ${alpha.toFixed(2)})`;
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(drawFireflies);
  }

  sizeCanvas();
  makeFireflies();
  requestAnimationFrame(drawFireflies);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeCanvas();
      makeFireflies();
      if (heartPositions.length) layoutHeart(true);
    }, 200);
  });

  /* -----------------------------------------------------------------------
     Geometría del árbol y del corazón
     ----------------------------------------------------------------------- */
  function computeGeometry() {
    const sw = scene.clientWidth;
    const sh = scene.clientHeight;

    stemBaseY  = sh * 0.88;
    stemTopY   = sh * 0.44;
    stemHeight = stemBaseY - stemTopY;

    // Solo 2 hojas, una a cada lado, bien repartidas en la mitad del tallo
    // (como en un girasol real: pocas hojas grandes, no muchas chiquitas).
    const leafFracs = [0.18, 0.30];
    leafDefs = leafFracs.map((frac, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      return {
        x: sw / 2,
        y: stemBaseY - stemHeight * frac,
        side,
        w: Math.max(34, sw * rand(0.14, 0.175)),
        rot: side > 0 ? rand(24, 36) : -rand(24, 36),
      };
    });

    heartCenter = { x: sw / 2, y: sh * 0.40 };
    heartScale  = Math.min(sw * 0.80, sh * 0.46, 300) / 32;
  }

  // Punto de la curva del corazón en coordenadas "locales" (sin escalar
  // todavía a píxeles de pantalla). x va de -16 a 16, y aprox. de -17 a 5.
  function heartLocalPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x, y };
  }

  // ¿El punto (x,y) cae dentro del polígono formado por el contorno del
  // corazón? (algoritmo de "ray casting", clásico point-in-polygon).
  function pointInsideHeart(x, y, outline) {
    let inside = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const xi = outline[i].x, yi = outline[i].y;
      const xj = outline[j].x, yj = outline[j].y;
      const crosses =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  // Tabla de longitud de arco del contorno del corazón, calculada una sola
  // vez. Antes el borde se repartía en intervalos iguales del parámetro t
  // de la curva, pero esa curva no avanza a velocidad constante: unos
  // tramos (como las puntas de arriba) quedaban con girasoles muy juntos y
  // otros muy separados, y por eso el contorno se veía chueco/mal hecho.
  // Repartiendo por longitud de arco real, la separación entre girasoles
  // del borde es la misma en todo el contorno.
  const HEART_ARC = (() => {
    const steps = 2000;
    const pts = [];
    let cum = 0;
    let prev = heartLocalPoint(0);
    pts.push({ s: 0, p: prev });
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const p = heartLocalPoint(t);
      cum += Math.hypot(p.x - prev.x, p.y - prev.y);
      pts.push({ s: cum, p });
      prev = p;
    }
    return { pts, total: cum };
  })();

  // Rectángulo real que ocupa la curva del corazón, calculado a partir de
  // la misma tabla de arriba. ESTE era el verdadero motivo de los huecos
  // en los arcos de arriba: el relleno usaba un rango vertical fijo puesto
  // "a ojo" (de -18 a 6), pero la curva en realidad sube hasta cerca de 12
  // en las puntas de los lóbulos. El contorno sí llegaba hasta ahí (usa la
  // curva completa), pero el relleno se quedaba corto y nunca buscaba
  // puntos en esa franja de arriba, así que esa zona quedaba vacía por
  // dentro aunque el borde se viera completo.
  const HEART_BOUNDS = (() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const { p } of HEART_ARC.pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = 0.5; // pequeño margen para no cortar el borde
    return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
  })();

  // Genera una retícula de puntos (con un poco de desorden orgánico) y se
  // queda solo con los que caen dentro del corazón, para que quede
  // completamente repleto de girasoles por dentro.
  //
  // OJO: el paso de la retícula se calcula a partir de heartScale, es decir,
  // en píxeles reales de pantalla, y no en unidades "locales" fijas. Antes
  // el paso era un número fijo (1.45), así que en corazones grandes esa
  // misma separación se estiraba en pantalla y dejaba huecos visibles entre
  // girasoles (el corazón se veía "a medias"). Ahora, sin importar qué tan
  // grande salga el corazón, los girasoles siempre quedan a la misma
  // distancia real entre sí. Además, el barrido usa HEART_BOUNDS (el
  // rectángulo real de la curva) en vez de un rango fijo, para que sí
  // llegue hasta las puntas de arriba.
  function buildHeartFillLocal(outline) {
    const targetSpacingPx = 15; // separación deseada entre girasoles (px)
    const maxPoints = 360;      // techo por rendimiento, no por estética
    let step = Math.max(0.55, targetSpacingPx / heartScale);
    let points = [];

    for (let attempt = 0; attempt < 6; attempt++) {
      points = [];
      const jitter = step * 0.35;
      for (let x = HEART_BOUNDS.minX; x <= HEART_BOUNDS.maxX; x += step) {
        for (let y = HEART_BOUNDS.minY; y <= HEART_BOUNDS.maxY; y += step) {
          const jx = x + rand(-jitter, jitter);
          const jy = y + rand(-jitter, jitter);
          if (pointInsideHeart(jx, jy, outline)) points.push({ x: jx, y: jy });
        }
      }
      // Si nos pasamos del límite, agrandamos un poco TODA la retícula y
      // reintentamos, en vez de borrar puntos al azar (eso era lo que
      // dejaba huecos irregulares y hacía que se viera mal armado).
      if (points.length <= maxPoints) break;
      step *= 1.12;
    }

    return points;
  }

  function sampleHeartOutline(count) {
    const { pts, total } = HEART_ARC;
    const result = [];
    let j = 0;
    for (let i = 0; i < count; i++) {
      const targetS = (i / count) * total;
      while (j < pts.length - 1 && pts[j].s < targetS) j++;
      result.push(pts[j].p);
    }
    return result;
  }

  function buildHeartPositions() {
    // Igual que el relleno, el contorno recalcula cuántas florecitas
    // necesita según el tamaño real en pantalla (heartScale), respetando
    // CONFIG.floresContorno como mínimo. Así el borde siempre luce parejo
    // y tupido, sea cual sea el tamaño del corazón.
    const targetOutlineSpacingPx = 13;
    const outlineCount = Math.min(
      260,
      Math.max(
        CONFIG.floresContorno,
        Math.round((HEART_ARC.total * heartScale) / targetOutlineSpacingPx)
      )
    );
    const localOutline = sampleHeartOutline(outlineCount);
    const localFill = buildHeartFillLocal(localOutline);

    const toScreen = (p) => ({
      x: heartCenter.x + p.x * heartScale,
      y: heartCenter.y - p.y * heartScale,
    });

    return [...localOutline.map(toScreen), ...localFill.map(toScreen)];
  }

  function layoutHeart(instant) {
    computeGeometry();
    heartPositions = buildHeartPositions();
    flowerEls.forEach((f, i) => {
      const p = heartPositions[i % heartPositions.length];
      if (instant) f.pos.style.transitionDuration = "0s";
      f.pos.style.transform = `translate(${p.x}px, ${p.y}px)`;
      if (instant) {
        requestAnimationFrame(() => {
          f.pos.style.transitionDuration = "";
        });
      }
    });
  }

  /* -----------------------------------------------------------------------
     Flores
     ----------------------------------------------------------------------- */
  function createFlower(x, y, opts = {}) {
    const pos = document.createElement("div");
    pos.className = "flower";
    pos.style.transform = `translate(${x}px, ${y}px)`;

    const emoji = document.createElement("span");
    emoji.className = "flower-emoji";
    emoji.textContent = opts.symbol || "🌻";
    emoji.style.setProperty("--fs", (opts.size || rand(18, 26)).toFixed(0) + "px");
    emoji.style.setProperty("--d", (opts.delay || 0).toFixed(2) + "s");

    pos.appendChild(emoji);
    flowersEl.appendChild(pos);
    flowerEls.push({ pos, emoji });
  }

  /* -----------------------------------------------------------------------
     Hojas
     ----------------------------------------------------------------------- */
  function buildLeaves() {
    leafDefs.forEach((l) => {
      const el = document.createElement("div");
      el.className = "leaf";
      const lh = l.w * 1.15;
      el.style.left = l.x + "px";
      el.style.top  = (l.y - lh) + "px";
      el.style.setProperty("--lw", l.w.toFixed(0) + "px");
      el.style.setProperty("--lh", lh.toFixed(0) + "px");
      el.style.setProperty("--rot", l.rot.toFixed(1) + "deg");
      el.style.setProperty("--flip", l.side > 0 ? 1 : -1);
      branchesEl.appendChild(el);
      l.el = el;
    });
  }

  function growLeaves() {
    return new Promise((resolve) => {
      leafDefs.forEach((l, i) => {
        setTimeout(() => {
          l.el.classList.add("is-grown");
        }, i * 180);
      });
      setTimeout(resolve, leafDefs.length * 180 + 850);
    });
  }

  /* -----------------------------------------------------------------------
     Lluvia de flores
     ----------------------------------------------------------------------- */
  const petalSymbols = ["🌻", "🌻", "🌼"];

  function spawnPetal() {
    if (fallingEl.childElementCount > 22) return;
    const p = document.createElement("span");
    p.className = "petal";
    p.textContent = petalSymbols[Math.floor(rand(0, petalSymbols.length))];
    p.style.setProperty("--x", rand(4, 96).toFixed(1) + "%");
    p.style.setProperty("--size", rand(12, 22).toFixed(0) + "px");
    p.style.setProperty("--dur", rand(7, 13).toFixed(1) + "s");
    p.style.setProperty("--delay", rand(0, 1.2).toFixed(1) + "s");
    p.style.setProperty("--drift", rand(-40, 40).toFixed(0) + "px");
    p.style.setProperty("--rot", rand(120, 320).toFixed(0) + "deg");
    fallingEl.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }

  function startFalling() {
    spawnPetal();
    setInterval(spawnPetal, prefersReducedMotion ? 1400 : 650);
  }

  /* -----------------------------------------------------------------------
     Mensaje romántico
     ----------------------------------------------------------------------- */
  function revealMessage() {
    messageEl.innerHTML = "";
    CONFIG.mensaje.split(/\n\s*\n/).forEach((para) => {
      const p = document.createElement("p");
      p.textContent = para.trim();
      messageEl.appendChild(p);
    });
    requestAnimationFrame(() => messageEl.classList.add("is-visible"));
  }


  /* -----------------------------------------------------------------------
     Secuencia principal: intro -> árbol -> corazón -> lluvia + mensaje
     ----------------------------------------------------------------------- */
  let started = false;

  async function startSequence() {
    if (started) return;
    started = true;

    sunWrap.classList.add("is-tapped");
    intro.classList.add("is-hidden");

    computeGeometry();
    buildLeaves();

    await sleep(250);

    // 1) el tallo crece desde abajo
    stemEl.style.height = stemHeight + "px";
    await sleep(prefersReducedMotion ? 150 : 1700);

    // 2) las hojas se despliegan
    await growLeaves();
    await sleep(prefersReducedMotion ? 100 : 350);

    // 3) el tallo con sus hojas pasa a un segundo plano (queda visible,
    //    solo más discreto — antes se apagaba casi del todo) y el
    //    corazón se forma directamente ahí, sin capullos previos ni
    //    ninguna flor apareciendo antes en el árbol.
    treeEl.classList.add("is-background");

    heartPositions = buildHeartPositions();
    // De la punta hacia arriba, para que el corazón se sienta como un
    // ramo que florece, en vez de aparecer todo de golpe o al azar.
    const ordered = heartPositions.slice().sort((a, b) => b.y - a.y);

    ordered.forEach((p, i) => {
      const delay = Math.min(i * 9, 1500) + rand(0, 60);
      setTimeout(() => {
        createFlower(p.x, p.y, { delay: 0, size: rand(13, 22) });
      }, delay);
    });

    const heartFormTime = Math.min(ordered.length * 9, 1500) + 750;
    await sleep(prefersReducedMotion ? 200 : heartFormTime);

    // 4) el corazón late suavemente
    flowersEl.classList.add("is-beating");
    await sleep(1700);
    flowersEl.classList.remove("is-beating");

    // 5) comienza la lluvia de flores y aparece el mensaje
    startFalling();
    revealMessage();
  }

  // Soporta click, touch y pointer events para que funcione bien tanto en
  // computadora como en celular (el "started" evita que se dispare dos veces).
  sunWrap.addEventListener("pointerup", startSequence, { passive: true });
  sunWrap.addEventListener("click", startSequence);
  sunWrap.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      startSequence();
    },
    { passive: false }
  );
})();
