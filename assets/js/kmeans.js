/*!
 * kmeans.js · a tiny k-means playground: click to drop points, pick k,
 * step or run Lloyd's algorithm from a k-means++ start. Decision regions are
 * shaded on a coarse grid; centroids glide to their new means.
 */
(() => {
  'use strict';
  const box = document.querySelector('[data-kmeans]');
  if (!box) return;
  const stage = box.querySelector('.km-stage');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-cursor', 'hover');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'k-means clustering playground. Click to add points.');
  stage.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const $ = (s) => box.querySelector(s);
  const kBtns = Array.from(box.querySelectorAll('[data-k]'));
  const btnStep = $('[data-km="step"]'), btnRun = $('[data-km="run"]'), btnNew = $('[data-km="new"]');
  const outIter = $('[data-km-out="iter"]'), outInertia = $('[data-km-out="inertia"]'), outState = $('[data-km-out="state"]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['#5fa7ff', '#f786be', '#45d6b8', '#ffcb57', '#b48cff', '#ff8a5b'];

  let pts = [], cents = [], k = 3, iter = 0, running = false, converged = false, raf = 0, runTimer = 0;
  let w = 0, h = 0, dpr = 1;

  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const clamp01 = (x) => Math.min(0.98, Math.max(0.02, x));
  const d2 = (a, x, y) => (a.x - x) ** 2 + (a.y - y) ** 2;

  function scatter() {
    pts = [];
    const blobs = 3 + ((Math.random() * 2) | 0);
    for (let b = 0; b < blobs; b++) {
      const cx = 0.14 + Math.random() * 0.72, cy = 0.16 + Math.random() * 0.68;
      const sx = 0.04 + Math.random() * 0.05, sy = 0.04 + Math.random() * 0.06;
      const n = 34 + ((Math.random() * 26) | 0);
      for (let i = 0; i < n; i++) pts.push({ x: clamp01(cx + gauss() * sx), y: clamp01(cy + gauss() * sy), a: -1 });
    }
    seed();
  }
  function seed() { // k-means++
    stop();
    const first = pts[(Math.random() * pts.length) | 0];
    cents = [{ x: first.x, y: first.y, tx: first.x, ty: first.y }];
    while (cents.length < k) {
      const dist = pts.map((p) => Math.min(...cents.map((c) => d2(c, p.x, p.y))));
      let r = Math.random() * dist.reduce((s, v) => s + v, 0), i = 0;
      while (i < dist.length - 1 && r > dist[i]) { r -= dist[i]; i++; }
      cents.push({ x: pts[i].x, y: pts[i].y, tx: pts[i].x, ty: pts[i].y });
    }
    iter = 0; converged = false;
    assign();
    report();
    kick();
  }
  function assign() {
    let changed = 0;
    pts.forEach((p) => {
      let best = 0, bd = Infinity;
      cents.forEach((c, j) => { const d = d2({ x: c.tx, y: c.ty }, p.x, p.y); if (d < bd) { bd = d; best = j; } });
      if (p.a !== best) { p.a = best; changed++; }
    });
    return changed;
  }
  function update() {
    cents.forEach((c, j) => {
      let sx = 0, sy = 0, n = 0;
      pts.forEach((p) => { if (p.a === j) { sx += p.x; sy += p.y; n++; } });
      if (n) { c.tx = sx / n; c.ty = sy / n; }
    });
  }
  function step() {
    if (converged) return 0;
    update();
    const ch = assign();
    iter++;
    if (ch === 0) converged = true;
    report();
    kick();
    return ch;
  }
  function inertia() {
    return pts.reduce((s, p) => { const c = cents[p.a]; return c ? s + d2({ x: c.tx, y: c.ty }, p.x, p.y) : s; }, 0);
  }
  function report() {
    if (outIter) outIter.textContent = String(iter);
    if (outInertia) outInertia.textContent = (inertia() * 100).toFixed(2);
    if (outState) outState.textContent = converged ? `converged after ${iter} iteration${iter === 1 ? '' : 's'}` : running ? 'running…' : `${pts.length} points · k = ${k}`;
  }
  function run() {
    if (running) { stop(); report(); return; }
    if (converged) seed();
    running = true;
    btnRun.textContent = 'Pause';
    const tick = () => {
      step();
      if (converged) { stop(); report(); return; }
      runTimer = setTimeout(tick, reduce ? 120 : 650);
    };
    tick();
  }
  function stop() { running = false; clearTimeout(runTimer); if (btnRun) btnRun.textContent = 'Run'; }

  /* ---------- drawing ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = stage.clientWidth; h = stage.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    kick();
  }
  const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim() || '#888';
  function draw() {
    raf = 0;
    let moving = false;
    cents.forEach((c) => {
      const f = reduce ? 1 : 0.16;
      c.x += (c.tx - c.x) * f; c.y += (c.ty - c.y) * f;
      if (Math.abs(c.tx - c.x) > 1e-4 || Math.abs(c.ty - c.y) > 1e-4) moving = true;
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // decision regions on a coarse grid
    const cell = 14;
    ctx.globalAlpha = 0.09;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const nx = (x + cell / 2) / w, ny = (y + cell / 2) / h;
        let best = 0, bd = Infinity;
        cents.forEach((c, j) => { const d = d2(c, nx, ny); if (d < bd) { bd = d; best = j; } });
        ctx.fillStyle = COLORS[best % COLORS.length];
        ctx.fillRect(x, y, cell - 1, cell - 1);
      }
    }
    // links from points to their centroid
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;
    pts.forEach((p) => {
      const c = cents[p.a];
      if (!c) return;
      ctx.strokeStyle = COLORS[p.a % COLORS.length];
      ctx.beginPath(); ctx.moveTo(p.x * w, p.y * h); ctx.lineTo(c.x * w, c.y * h); ctx.stroke();
    });
    // points
    ctx.globalAlpha = 0.95;
    pts.forEach((p) => {
      ctx.fillStyle = p.a >= 0 ? COLORS[p.a % COLORS.length] : ink();
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3.1, 0, Math.PI * 2); ctx.fill();
    });
    // centroids
    ctx.globalAlpha = 1;
    cents.forEach((c, j) => {
      const x = c.x * w, y = c.y * h;
      ctx.fillStyle = COLORS[j % COLORS.length];
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 9); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 9, y); ctx.closePath();
      ctx.stroke(); ctx.fill();
    });
    if (moving) kick();
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };

  /* ---------- input ---------- */
  canvas.addEventListener('pointerdown', (e) => {
    const b = canvas.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    for (let i = 0; i < 9; i++) pts.push({ x: clamp01(x + gauss() * 0.022), y: clamp01(y + gauss() * 0.03), a: -1 });
    converged = false;
    assign(); report(); kick();
  });
  kBtns.forEach((b) => b.addEventListener('click', () => {
    k = parseInt(b.dataset.k, 10) || 3;
    kBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    seed();
  }));
  if (btnStep) btnStep.addEventListener('click', () => { stop(); step(); });
  if (btnRun) btnRun.addEventListener('click', run);
  if (btnNew) btnNew.addEventListener('click', scatter);
  new ResizeObserver(resize).observe(stage);
  document.addEventListener('themechange', kick);
  resize();
  scatter();
})();
