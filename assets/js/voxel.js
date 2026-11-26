/*!
 * voxel.js · live voxel lettering (same style as the name GIF in the footer):
 * solid front faces, see-through outlined walls and tops, and a highlight that
 * sweeps across the letters. The word turns towards the pointer.
 */
(() => {
  'use strict';
  const stage = document.querySelector('[data-voxel]');
  if (!stage) return;

  const FONT = {
    A: ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX'],
    D: ['XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.'],
    I: ['XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', 'XXXXXX'],
    S: ['.XXXXX', 'XX....', 'XX....', 'XX....', '.XXXX.', '....XX', '....XX', '....XX', 'XXXXX.'],
  };
  const ROWS = 9, GAP = 1, DEPTH = 1.4;
  const word = (stage.dataset.voxel || 'DSAI').toUpperCase().split('').filter((c) => FONT[c]);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // voxels in world units, centred on the origin
  const letters = [];
  let x0 = 0;
  word.forEach((ch) => {
    const g = FONT[ch];
    const vox = [];
    g.forEach((row, r) => row.split('').forEach((v, c) => { if (v === 'X') vox.push([x0 + c, ROWS - 1 - r]); }));
    letters.push(vox);
    x0 += g[0].length + GAP;
  });
  const W = x0 - GAP, cx = W / 2, cy = ROWS / 2;
  const occ = new Set();
  letters.forEach((l) => l.forEach(([x, y]) => occ.add(`${x},${y}`)));

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const PALETTE = {
    dark: { base: '#c9d3f5', hi: '#6f9bff' },
    light: { base: '#25316d', hi: '#5f7fd0' },
  };
  const theme = () => (document.documentElement.dataset.theme === 'light' ? PALETTE.light : PALETTE.dark);

  let yaw = 0.5, pitch = 0.36, tYaw = 0.5, tPitch = 0.36, hover = false;
  let visible = true, raf = 0, w = 0, h = 0, dpr = 1;

  const mix = (a, b, t) => {
    const p = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = stage.clientWidth; h = stage.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }

  function draw(now) {
    const sy = Math.sin(yaw), cyw = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    // orthographic camera: right r, up u, towards-viewer v
    const r = [cyw, 0, sy];
    const u = [sy * sp, cp, -cyw * sp];
    const v = [-sy * cp, sp, cyw * cp];
    const scale = Math.min((w * 0.78) / (W * Math.abs(cyw) + DEPTH * Math.abs(sy) + 2), (h * 0.62) / (ROWS * cp + 4));
    const P = (x, y, z) => {
      const X = x - cx, Y = y - cy;
      return [w / 2 + scale * (X * r[0] + Y * r[1] + z * r[2]), h / 2 - scale * (X * u[0] + Y * u[1] + z * u[2])];
    };
    const depth = (x, y, z) => (x - cx) * v[0] + (y - cy) * v[1] + z * v[2];
    const leftWalls = sy > 0.02, rightWalls = sy < -0.02, tops = sp > 0.02;
    const faces = [];
    letters.forEach((vox, li) => {
      vox.forEach(([x, y]) => {
        faces.push([depth(x + 0.5, y + 0.5, 0), li, 0, [[x, y, 0], [x + 1, y, 0], [x + 1, y + 1, 0], [x, y + 1, 0]]]);
        if (leftWalls && !occ.has(`${x - 1},${y}`)) faces.push([depth(x, y + 0.5, -DEPTH / 2), li, 1, [[x, y, 0], [x, y + 1, 0], [x, y + 1, -DEPTH], [x, y, -DEPTH]]]);
        if (rightWalls && !occ.has(`${x + 1},${y}`)) faces.push([depth(x + 1, y + 0.5, -DEPTH / 2), li, 1, [[x + 1, y, 0], [x + 1, y + 1, 0], [x + 1, y + 1, -DEPTH], [x + 1, y, -DEPTH]]]);
        if (tops && !occ.has(`${x},${y + 1}`)) faces.push([depth(x + 0.5, y + 1, -DEPTH / 2), li, 1, [[x, y + 1, 0], [x + 1, y + 1, 0], [x + 1, y + 1, -DEPTH], [x, y + 1, -DEPTH]]]);
      });
    });
    faces.sort((a, b) => a[0] - b[0]);

    const pal = theme();
    const t = now / 1000;
    const n = letters.length;
    // highlight sweep: a soft band travelling across the letters every few seconds
    const sweep = ((t * 0.55) % 1.6) * (n + 2) - 1;
    const colors = letters.map((_, li) => mix(pal.base, pal.hi, reduce ? 0 : Math.max(0, 1 - Math.abs(li - sweep) / 1.2)));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    for (const [, li, kind, quad] of faces) {
      const pts = quad.map((q) => P(q[0], q[1], q[2]));
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (kind === 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colors[li];
        ctx.fill();
        ctx.strokeStyle = colors[li];
        ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'destination-out'; // see-through walls
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colors[li];
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    raf = 0;
    if (!hover && !reduce) {
      tYaw = 0.42 * Math.sin(now / 2600) + 0.08;
      tPitch = 0.34 + 0.08 * Math.sin(now / 3400);
    }
    yaw += (tYaw - yaw) * 0.08;
    pitch += (tPitch - pitch) * 0.08;
    draw(now);
    if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };

  stage.addEventListener('pointermove', (e) => {
    const b = stage.getBoundingClientRect();
    const nx = (e.clientX - b.left) / b.width - 0.5;
    const ny = (e.clientY - b.top) / b.height - 0.5;
    hover = true;
    tYaw = -nx * 1.5;
    tPitch = 0.34 - ny * 0.6;
    if (reduce) { yaw = tYaw; pitch = tPitch; draw(performance.now()); }
    wake();
  });
  stage.addEventListener('pointerleave', () => { hover = false; wake(); });

  new ResizeObserver(() => { resize(); draw(performance.now()); wake(); }).observe(stage);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; wake(); }).observe(stage);
  document.addEventListener('visibilitychange', wake);
  document.addEventListener('themechange', () => draw(performance.now()));
  resize();
  draw(performance.now());
  wake();
})();
