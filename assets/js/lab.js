/*!
 * Optimizer Lab (fig. 01) for abdelrahmanelsayed20.github.io
 * An interactive loss-landscape race: Adam vs SGD+Momentum vs RMSProp vs AdaGrad.
 * Vanilla Canvas 2D, no dependencies, respects prefers-reduced-motion.
 *
 * The math core (section 1) is DOM-free so it can be unit-tested in Node:
 *   node -e "const C=require('./assets/js/lab.js'); console.log(C.LANDSCAPES.length)"
 */
(() => {
  'use strict';

  /* ======================================================================
     1. CORE MATH (DOM-free)
     ====================================================================== */
  const Core = (() => {
    const MAX_STEPS = 1100;
    const ARRIVE_STREAK = 18; // consecutive steps inside a basin = "arrived"

    // Each landscape: f(x, y) on a square domain, per-optimizer learning
    // rates (tuned offline so every optimizer behaves like it does in
    // practice), a list of known minima and curated start points.
    const LANDSCAPES = [
      {
        id: 'valleys',
        name: 'Twin valleys',
        blurb: 'one global minimum, one tempting local one',
        x: [-2.6, 2.6],
        y: [-2.6, 2.6],
        f: (x, y) =>
          0.16 * (x * x + y * y) -
          1.4 * Math.exp(-((x - 1.05) ** 2 + (y - 0.85) ** 2) / 0.55) -
          1.0 * Math.exp(-((x + 1.2) ** 2 + (y + 0.95) ** 2) / 0.42) +
          0.07 * Math.sin(2.1 * x) * Math.cos(2.3 * y) +
          1.1428, // shift so the global minimum sits at loss ~0
        lr: { adam: 0.008, sgdm: 0.0015, rmsprop: 0.008, adagrad: 0.06 },
        speed: 1,
        maxSteps: 800,
        minima: null, // computed numerically on first use
        starts: [[-2.2, 2.1], [2.3, -2.0], [-0.3, -2.4], [-2.4, -0.1], [0.4, 2.4], [2.1, 2.2]],
      },
      {
        id: 'himmelblau',
        name: 'Himmelblau',
        blurb: 'four equally deep minima',
        x: [-5, 5],
        y: [-5, 5],
        f: (x, y) => Math.log1p((x * x + y - 11) ** 2 + (x + y * y - 7) ** 2),
        lr: { adam: 0.012, sgdm: 0.0018, rmsprop: 0.01, adagrad: 0.07 },
        speed: 1,
        maxSteps: 800,
        minima: [
          [3, 2],
          [-2.805118, 3.131312],
          [-3.77931, -3.283186],
          [3.584428, -1.848126],
        ],
        starts: [[-0.4, -0.6], [0.3, 4.4], [-4.5, 0.2], [4.6, 4.5], [0.8, -4.6], [-4.4, 4.6]],
      },
      {
        id: 'rosenbrock',
        name: 'Rosenbrock',
        blurb: 'the classic curved banana valley',
        x: [-2, 2],
        y: [-1, 3],
        f: (x, y) => Math.log1p((1 - x) ** 2 + 100 * (y - x * x) ** 2),
        lr: { adam: 0.025, sgdm: 0.002, rmsprop: 0.003, adagrad: 0.4 },
        speed: 3,
        maxSteps: 1100,
        minima: [[1, 1]],
        starts: [[-1.6, 2.6], [-1.2, -0.6], [1.7, -0.6], [-0.4, 2.8], [1.8, 2.7], [0.2, -0.8]],
      },
    ];

    const OPTIMIZERS = [
      {
        id: 'adam',
        name: 'Adam',
        init: () => ({ m: [0, 0], v: [0, 0], t: 0 }),
        step(p, g, s, lr) {
          const b1 = 0.9, b2 = 0.999, eps = 1e-8;
          s.t += 1;
          const c1 = 1 - b1 ** s.t, c2 = 1 - b2 ** s.t;
          for (let i = 0; i < 2; i++) {
            s.m[i] = b1 * s.m[i] + (1 - b1) * g[i];
            s.v[i] = b2 * s.v[i] + (1 - b2) * g[i] * g[i];
            p[i] -= (lr * (s.m[i] / c1)) / (Math.sqrt(s.v[i] / c2) + eps);
          }
        },
      },
      {
        id: 'sgdm',
        name: 'SGD + Momentum',
        short: 'SGD-M',
        init: () => ({ v: [0, 0] }),
        step(p, g, s, lr) {
          const mu = 0.9;
          for (let i = 0; i < 2; i++) {
            s.v[i] = mu * s.v[i] - lr * g[i];
            p[i] += s.v[i];
          }
        },
      },
      {
        id: 'rmsprop',
        name: 'RMSProp',
        init: () => ({ s: [0, 0] }),
        step(p, g, s, lr) {
          const rho = 0.9, eps = 1e-8;
          for (let i = 0; i < 2; i++) {
            s.s[i] = rho * s.s[i] + (1 - rho) * g[i] * g[i];
            p[i] -= (lr * g[i]) / (Math.sqrt(s.s[i]) + eps);
          }
        },
      },
      {
        id: 'adagrad',
        name: 'AdaGrad',
        init: () => ({ G: [0, 0] }),
        step(p, g, s, lr) {
          const eps = 1e-8;
          for (let i = 0; i < 2; i++) {
            s.G[i] += g[i] * g[i];
            p[i] -= (lr * g[i]) / (Math.sqrt(s.G[i]) + eps);
          }
        },
      },
    ];

    const span = (L) => Math.max(L.x[1] - L.x[0], L.y[1] - L.y[0]);

    function grad(L, x, y) {
      const hx = (L.x[1] - L.x[0]) * 1e-5;
      const hy = (L.y[1] - L.y[0]) * 1e-5;
      return [
        (L.f(x + hx, y) - L.f(x - hx, y)) / (2 * hx),
        (L.f(x, y + hy) - L.f(x, y - hy)) / (2 * hy),
      ];
    }

    // Grid search for local minima, then polish each with plain gradient
    // descent. Used for landscapes that do not hard-code their minima.
    function findMinima(L) {
      const n = 140, xs = [], ys = [], v = new Float64Array(n * n);
      for (let i = 0; i < n; i++) {
        xs.push(L.x[0] + ((L.x[1] - L.x[0]) * i) / (n - 1));
        ys.push(L.y[0] + ((L.y[1] - L.y[0]) * i) / (n - 1));
      }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) v[j * n + i] = L.f(xs[i], ys[j]);
      const found = [];
      for (let j = 1; j < n - 1; j++) {
        for (let i = 1; i < n - 1; i++) {
          const c = v[j * n + i];
          let isMin = true;
          for (let dj = -1; dj <= 1 && isMin; dj++)
            for (let di = -1; di <= 1; di++)
              if ((di || dj) && v[(j + dj) * n + (i + di)] <= c) { isMin = false; break; }
          if (!isMin) continue;
          const p = [xs[i], ys[j]];
          for (let k = 0; k < 600; k++) {
            const g = grad(L, p[0], p[1]);
            p[0] -= 0.01 * g[0];
            p[1] -= 0.01 * g[1];
          }
          if (!found.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < span(L) * 0.02)) found.push(p);
        }
      }
      return found;
    }

    function prepare(L) {
      if (L._ready) return L;
      const pts = L.minima || findMinima(L);
      const withF = pts.map(([x, y]) => ({ x, y, f: L.f(x, y) }));
      const fmin = Math.min(...withF.map((m) => m.f));
      const fmax = Math.max(...withF.map((m) => m.f));
      const tol = Math.max(1e-6, (fmax - fmin) * 0.02, 1e-3);
      L.mins = withF.map((m) => ({ ...m, global: m.f - fmin <= tol }));
      L.reach = span(L) * 0.03;
      L._ready = true;
      return L;
    }

    function nearestMin(L, x, y) {
      let best = null, bd = Infinity;
      for (const m of L.mins) {
        const d = Math.hypot(m.x - x, m.y - y);
        if (d < bd) { bd = d; best = m; }
      }
      return { min: best, d: bd };
    }

    function createRace(L, start) {
      prepare(L);
      return {
        L,
        start: start.slice(),
        step: 0,
        done: false,
        racers: OPTIMIZERS.map((o) => ({
          o,
          p: start.slice(),
          s: o.init(),
          loss: L.f(start[0], start[1]),
          trail: [start[0], start[1]],
          streak: 0,
          streakStart: -1,
          arrived: -1,
          basin: null,
          rank: 0,
        })),
      };
    }

    function advance(race, n) {
      const L = race.L;
      for (let k = 0; k < n && !race.done; k++) {
        race.step += 1;
        for (const r of race.racers) {
          const g = grad(L, r.p[0], r.p[1]);
          r.o.step(r.p, g, r.s, L.lr[r.o.id]);
          // keep everyone on the map (clamping is what a bounded search space does)
          r.p[0] = Math.min(L.x[1], Math.max(L.x[0], r.p[0]));
          r.p[1] = Math.min(L.y[1], Math.max(L.y[0], r.p[1]));
          r.loss = L.f(r.p[0], r.p[1]);
          r.trail.push(r.p[0], r.p[1]);
          if (r.arrived < 0) {
            const { min, d } = nearestMin(L, r.p[0], r.p[1]);
            if (d < L.reach) {
              if (r.streak === 0) r.streakStart = race.step;
              r.streak += 1;
              if (r.streak >= ARRIVE_STREAK) {
                r.arrived = r.streakStart;
                r.basin = min;
              }
            } else {
              r.streak = 0;
            }
          }
        }
        if (race.racers.every((r) => r.arrived >= 0) || race.step >= (L.maxSteps || MAX_STEPS)) race.done = true;
      }
      // rank: first to settle in a GLOBAL minimum wins
      const winners = race.racers
        .filter((r) => r.arrived >= 0 && r.basin && r.basin.global)
        .sort((a, b) => a.arrived - b.arrived);
      race.racers.forEach((r) => { r.rank = 0; });
      winners.forEach((r, i) => { r.rank = i + 1; });
      return race;
    }

    // One-sentence summary of a finished race, for the caption.
    function summarize(race) {
      const rs = race.racers;
      const name = (r) => r.o.short || r.o.name;
      const list = (arr) => {
        const n = arr.map(name);
        return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
      };
      const first = rs.find((r) => r.rank === 1);
      const trapped = rs.filter((r) => r.arrived >= 0 && r.basin && !r.basin.global);
      const lost = rs.filter((r) => r.arrived < 0);
      const parts = [];
      if (first) {
        parts.push(`${name(first)} reached the global minimum first, in ${first.arrived} steps.`);
      } else if (trapped.length === rs.length) {
        return 'All four optimizers rolled into the local minimum. Click another spot on the surface to try again.';
      } else {
        parts.push('No optimizer reached the global minimum this time.');
      }
      if (trapped.length) parts.push(`${list(trapped)} got trapped in a local minimum.`);
      if (lost.length) parts.push(`${list(lost)} ${lost.length > 1 ? 'were' : 'was'} still crawling after ${race.step} steps.`);
      return parts.join(' ');
    }

    return { LANDSCAPES, OPTIMIZERS, MAX_STEPS, grad, prepare, createRace, advance, nearestMin, summarize, span };
  })();

  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) module.exports = Core;
    return;
  }

  /* ======================================================================
     2. RENDERER + INTERACTION
     ====================================================================== */
  const canvas = document.getElementById('lab-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const stage = canvas.parentElement;
  const $ = (id) => document.getElementById(id);
  const elStep = $('lab-step');
  const elLegend = $('lab-legend');
  const elTip = $('lab-tip');
  const elNote = $('lab-note');
  const btnRestart = $('lab-restart');
  const landButtons = Array.from(document.querySelectorAll('[data-land]'));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const html = document.documentElement;

  const N = 46; // grid samples per axis
  const STEPS_PER_FRAME = 1;
  const CB = 28; // colour buckets
  const AB = 5; // alpha (depth) buckets
  const Z_SCALE = 0.9;
  const CAM_D = 4.4;

  // matplotlib "inferno" control points
  const INFERNO = ['#000004', '#160b39', '#420a68', '#6a176e', '#932667', '#bc3754', '#dd513a', '#f37819', '#fca50a', '#f6d746', '#fcffa4'];

  let W = 0, H = 0, DPR = 1, SCALE = 1;
  let yaw = -0.78, pitch = 0.6;
  let landIdx = 0, L = null, race = null;
  let vu, vv, vz, px, py, pd; // per-vertex world + projected
  let segA, segB, segC, order, counts, segKey; // segments
  let colors = [], alphas = [], optColors = {}, ink = '#888', inkSoft = 'rgba(128,128,128,.4)';
  let visible = true, rafId = 0, lastT = 0, lastHud = 0, holdUntil = 0;
  let lastInteract = -Infinity, dragging = false, dragMoved = 0, dragX = 0, dragY = 0;
  let hoverIdx = -1, startCursor = 0, reduce = mqReduce.matches;

  const hexToRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const INF_RGB = INFERNO.map(hexToRgb);
  function inferno(t) {
    t = Math.min(1, Math.max(0, t)) * (INF_RGB.length - 1);
    const i = Math.min(INF_RGB.length - 2, Math.floor(t)), f = t - i;
    const a = INF_RGB[i], b = INF_RGB[i + 1];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  }

  function readTheme() {
    const light = html.getAttribute('data-theme') === 'light';
    const cs = getComputedStyle(html);
    // dark: skip the near-black start of the map; light: skip the pale end
    const [t0, t1] = light ? [0.06, 0.8] : [0.2, 1.0];
    colors = Array.from({ length: CB }, (_, i) => inferno(t0 + ((t1 - t0) * i) / (CB - 1)));
    const [a0, a1] = light ? [0.22, 0.85] : [0.18, 0.92];
    alphas = Array.from({ length: AB }, (_, i) => a0 + ((a1 - a0) * i) / (AB - 1));
    for (const o of Core.OPTIMIZERS) optColors[o.id] = cs.getPropertyValue(`--c-${o.id}`).trim() || '#fff';
    ink = cs.getPropertyValue('--text-2').trim() || '#999';
    inkSoft = cs.getPropertyValue('--line-strong').trim() || 'rgba(128,128,128,.3)';
    buildLegend();
    requestDraw();
  }

  /* ---------- landscape geometry ---------- */
  function buildLandscape(i) {
    landIdx = i;
    L = Core.prepare(Core.LANDSCAPES[i]);
    const n = N * N;
    vu = new Float32Array(n); vv = new Float32Array(n); vz = new Float32Array(n);
    px = new Float32Array(n); py = new Float32Array(n); pd = new Float32Array(n);
    const vals = new Float64Array(n);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < N; j++) {
      for (let k = 0; k < N; k++) {
        const x = L.x[0] + ((L.x[1] - L.x[0]) * k) / (N - 1);
        const y = L.y[0] + ((L.y[1] - L.y[0]) * j) / (N - 1);
        const v = L.f(x, y);
        vals[j * N + k] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    L._lo = lo; L._hi = hi;
    for (let j = 0; j < N; j++) {
      for (let k = 0; k < N; k++) {
        const idx = j * N + k;
        vu[idx] = (2 * k) / (N - 1) - 1;
        vv[idx] = (2 * j) / (N - 1) - 1;
        vz[idx] = ((vals[idx] - lo) / (hi - lo) - 0.42) * Z_SCALE;
      }
    }
    const segCount = 2 * N * (N - 1);
    segA = new Int32Array(segCount); segB = new Int32Array(segCount); segC = new Uint8Array(segCount);
    order = new Int32Array(segCount); counts = new Int32Array(CB * AB + 1); segKey = new Uint16Array(segCount);
    let s = 0;
    const bucket = (a, b) => {
      const h = ((vz[a] + vz[b]) / 2 / Z_SCALE + 0.42);
      return Math.min(CB - 1, Math.max(0, Math.round(h * (CB - 1))));
    };
    for (let j = 0; j < N; j++) for (let k = 0; k < N - 1; k++) { const a = j * N + k, b = a + 1; segA[s] = a; segB[s] = b; segC[s] = bucket(a, b); s++; }
    for (let k = 0; k < N; k++) for (let j = 0; j < N - 1; j++) { const a = j * N + k, b = a + N; segA[s] = a; segB[s] = b; segC[s] = bucket(a, b); s++; }
    landButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.land) === i)));
    startCursor = 0;
  }

  // world coords for a point of the domain
  const toU = (x) => (2 * (x - L.x[0])) / (L.x[1] - L.x[0]) - 1;
  const toV = (y) => (2 * (y - L.y[0])) / (L.y[1] - L.y[0]) - 1;
  const toZ = (f) => ((f - L._lo) / (L._hi - L._lo) - 0.42) * Z_SCALE;
  const fromU = (u) => L.x[0] + ((u + 1) / 2) * (L.x[1] - L.x[0]);
  const fromV = (v) => L.y[0] + ((v + 1) / 2) * (L.y[1] - L.y[0]);

  let cyw = 1, syw = 0, cpt = 1, spt = 0;
  const P = { x: 0, y: 0, d: 0 };
  function project(u, v, z) {
    const x1 = u * cyw - v * syw;
    const y1 = u * syw + v * cyw;
    const up = y1 * spt + z * cpt;
    const depth = -y1 * cpt + z * spt;
    const s = CAM_D / (CAM_D - depth);
    P.x = W / 2 + x1 * s * SCALE;
    P.y = H * 0.5 - up * s * SCALE;
    P.d = depth;
    return P;
  }

  /* ---------- race control ---------- */
  function newRace(start) {
    if (!start) {
      const list = L.starts;
      const base = list[startCursor % list.length];
      startCursor++;
      const j = Core.span(L) * 0.025;
      start = [base[0] + (Math.random() - 0.5) * j, base[1] + (Math.random() - 0.5) * j];
    }
    race = Core.createRace(L, start);
    if (reduce) Core.advance(race, L.maxSteps || Core.MAX_STEPS);
    holdUntil = 0;
    if (elNote) elNote.textContent = reduce ? Core.summarize(race) : `${L.name}: ${L.blurb}. Racing from (${start[0].toFixed(2)}, ${start[1].toFixed(2)})…`;
    updateHud(true);
    requestDraw();
  }

  function setLandscape(i) {
    buildLandscape(((i % Core.LANDSCAPES.length) + Core.LANDSCAPES.length) % Core.LANDSCAPES.length);
    newRace();
  }

  /* ---------- legend / HUD ---------- */
  let legendItems = {};
  function buildLegend() {
    if (!elLegend) return;
    if (!elLegend.childElementCount) {
      for (const o of Core.OPTIMIZERS) {
        const li = document.createElement('li');
        li.className = 'lab-racer';
        li.dataset.opt = o.id;
        li.innerHTML = `<span class="lab-dot" aria-hidden="true"></span><span class="lab-name">${o.name}</span><span class="lab-loss">--</span><span class="lab-badge"></span>`;
        elLegend.appendChild(li);
        legendItems[o.id] = { li, loss: li.querySelector('.lab-loss'), badge: li.querySelector('.lab-badge') };
      }
    }
    for (const o of Core.OPTIMIZERS) {
      const it = legendItems[o.id];
      if (it) it.li.style.setProperty('--c', optColors[o.id]);
    }
  }

  function updateHud(force) {
    if (!race) return;
    if (elStep) elStep.textContent = `step ${String(race.step).padStart(4, '0')}`;
    for (const r of race.racers) {
      const it = legendItems[r.o.id];
      if (!it) continue;
      it.loss.textContent = `loss ${r.loss.toFixed(3)}`;
      let badge = '', state = 'running';
      if (r.arrived >= 0) {
        if (r.basin.global) { state = 'global'; badge = r.rank === 1 ? '1st' : r.rank === 2 ? '2nd' : r.rank === 3 ? '3rd' : `${r.rank}th`; }
        else { state = 'local'; badge = 'local min'; }
      } else if (race.done) { state = 'lost'; badge = 'wandering'; }
      if (it.badge.textContent !== badge) it.badge.textContent = badge;
      if (it.li.dataset.state !== state) it.li.dataset.state = state;
    }
    if (race.done && elNote && (force || !elNote.dataset.final)) {
      elNote.textContent = Core.summarize(race);
      elNote.dataset.final = '1';
    } else if (!race.done && elNote) {
      delete elNote.dataset.final;
    }
  }

  /* ---------- drawing ---------- */
  function resize() {
    const r = stage.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    SCALE = Math.min(W, H * 1.12) * 0.315;
    requestDraw();
  }

  function draw() {
    if (!L || !W) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    cyw = Math.cos(yaw); syw = Math.sin(yaw); cpt = Math.cos(pitch); spt = Math.sin(pitch);

    // project vertices
    const n = N * N;
    let dmin = Infinity, dmax = -Infinity;
    for (let i = 0; i < n; i++) {
      project(vu[i], vv[i], vz[i]);
      px[i] = P.x; py[i] = P.y; pd[i] = P.d;
      if (P.d < dmin) dmin = P.d;
      if (P.d > dmax) dmax = P.d;
    }
    const dr = dmax - dmin || 1;

    // counting-sort segments into colour x depth buckets -> few stroke() calls
    const segCount = segA.length;
    counts.fill(0);
    for (let s = 0; s < segCount; s++) {
      const d = (pd[segA[s]] + pd[segB[s]]) / 2;
      const ab = Math.min(AB - 1, Math.floor(((d - dmin) / dr) * AB));
      const k = segC[s] * AB + ab;
      segKey[s] = k;
      counts[k + 1]++;
    }
    for (let k = 1; k < counts.length; k++) counts[k] += counts[k - 1];
    const cursor = counts.slice(0, CB * AB);
    for (let s = 0; s < segCount; s++) order[cursor[segKey[s]]++] = s;

    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (let k = 0; k < CB * AB; k++) {
      const from = counts[k], to = counts[k + 1];
      if (from === to) continue;
      ctx.strokeStyle = colors[Math.floor(k / AB)];
      ctx.globalAlpha = alphas[k % AB];
      ctx.beginPath();
      for (let q = from; q < to; q++) {
        const s = order[q];
        ctx.moveTo(px[segA[s]], py[segA[s]]);
        ctx.lineTo(px[segB[s]], py[segB[s]]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // minima markers
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.2;
    for (const m of L.mins) {
      const p = project(toU(m.x), toV(m.y), toZ(m.f) + 0.01);
      const r = m.global ? 5 : 3.5;
      ctx.globalAlpha = m.global ? 0.9 : 0.55;
      ctx.beginPath();
      ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y);
      ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (race) {
      // start marker
      const s0 = project(toU(race.start[0]), toV(race.start[1]), toZ(L.f(race.start[0], race.start[1])) + 0.015);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s0.x, s0.y, 6, 0, Math.PI * 2);
      ctx.stroke();

      // trails
      ctx.lineJoin = 'round';
      for (const r of race.racers) {
        const t = r.trail;
        if (t.length < 4) continue;
        ctx.strokeStyle = optColors[r.o.id];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        for (let i = 0; i < t.length; i += 2) {
          const p = project(toU(t[i]), toV(t[i + 1]), toZ(L.f(t[i], t[i + 1])) + 0.012);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // balls
      for (const r of race.racers) {
        const p = project(toU(r.p[0]), toV(r.p[1]), toZ(r.loss) + 0.02);
        const c = optColors[r.o.id];
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath();
        ctx.arc(p.x - 1.3, p.y - 1.3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // hover marker
    if (hoverIdx >= 0 && !dragging) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(px[hoverIdx], py[hoverIdx], 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /* ---------- loop ---------- */
  let drawQueued = false;
  function requestDraw() {
    if (drawQueued || rafId) return;
    drawQueued = true;
    requestAnimationFrame(() => { drawQueued = false; draw(); });
  }

  function loop(t) {
    rafId = 0;
    if (!visible || document.hidden || reduce) return;
    const dt = lastT ? Math.min(3, (t - lastT) / 16.67) : 1;
    lastT = t;
    if (!dragging && t - lastInteract > 3500) yaw += 0.0016 * dt;
    if (race && !race.done) {
      Core.advance(race, STEPS_PER_FRAME * (L.speed || 1));
      if (race.done) holdUntil = t + 3800;
    } else if (race && race.done && holdUntil && t > holdUntil && t - lastInteract > 6000) {
      newRace();
    }
    draw();
    if (t - lastHud > 90 || (race && race.done)) { updateHud(); lastHud = t; }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (!rafId && visible && !document.hidden && !reduce) {
      lastT = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  /* ---------- interaction ---------- */
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    let best = -1, bd = 22 * 22;
    for (let i = 0; i < px.length; i++) {
      const dx = px[i] - x, dy = py[i] - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function showTip(idx, clientX, clientY) {
    if (!elTip) return;
    if (idx < 0) { elTip.hidden = true; return; }
    const x = fromU(vu[idx]), y = fromV(vv[idx]);
    elTip.textContent = `x ${x.toFixed(2)}  y ${y.toFixed(2)}  loss ${L.f(x, y).toFixed(3)}`;
    const r = stage.getBoundingClientRect();
    elTip.style.transform = `translate(${Math.round(clientX - r.left + 14)}px, ${Math.round(clientY - r.top + 14)}px)`;
    elTip.hidden = false;
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = 0;
    dragX = e.clientX;
    dragY = e.clientY;
    lastInteract = performance.now();
    if (e.pointerType === 'mouse') canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - dragX, dy = e.clientY - dragY;
      dragMoved += Math.abs(dx) + Math.abs(dy);
      dragX = e.clientX;
      dragY = e.clientY;
      yaw += dx * 0.0085;
      pitch = Math.min(1.15, Math.max(0.28, pitch + dy * 0.005));
      lastInteract = performance.now();
      if (dragMoved > 4) { canvas.classList.add('is-dragging'); showTip(-1); }
      requestDraw();
    } else if (e.pointerType === 'mouse') {
      hoverIdx = pick(e.clientX, e.clientY);
      showTip(hoverIdx, e.clientX, e.clientY);
      requestDraw();
    }
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    if (dragMoved <= 4 && e.type === 'pointerup') {
      const idx = pick(e.clientX, e.clientY);
      if (idx >= 0) newRace([fromU(vu[idx]), fromV(vv[idx])]);
    }
    lastInteract = performance.now();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { hoverIdx = -1; showTip(-1); requestDraw(); });

  canvas.addEventListener('keydown', (e) => {
    let handled = true;
    if (e.key === 'ArrowLeft') yaw -= 0.12;
    else if (e.key === 'ArrowRight') yaw += 0.12;
    else if (e.key === 'ArrowUp') pitch = Math.min(1.15, pitch + 0.06);
    else if (e.key === 'ArrowDown') pitch = Math.max(0.28, pitch - 0.06);
    else if (e.key === 'Enter' || e.key === ' ') newRace();
    else handled = false;
    if (handled) { e.preventDefault(); lastInteract = performance.now(); requestDraw(); }
  });

  if (btnRestart) btnRestart.addEventListener('click', () => { lastInteract = -Infinity; newRace(); start(); });
  landButtons.forEach((b) => b.addEventListener('click', () => { lastInteract = -Infinity; setLandscape(Number(b.dataset.land)); start(); }));

  /* ---------- lifecycle ---------- */
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }, { threshold: 0.05 }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  new MutationObserver(readTheme).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  const onReduce = () => { reduce = mqReduce.matches; newRace(race ? race.start : null); start(); };
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);

  buildLandscape(0);
  readTheme();
  resize();
  newRace();
  start();

  // Small public API (used by the command palette)
  window.OptimizerLab = {
    restart() { lastInteract = -Infinity; newRace(); start(); },
    nextLandscape() { lastInteract = -Infinity; setLandscape(landIdx + 1); start(); },
    setLandscape(i) { lastInteract = -Infinity; setLandscape(i); start(); },
  };
})();
