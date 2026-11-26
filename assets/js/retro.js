/*!
 * retro.js · full-bleed "retro" separators. A monochrome scene is drawn into a
 * canvas and covered by a grid of blocks that dissolve, from one corner with
 * some jitter, as the section scrolls into view. Scanlines and a vignette sit
 * on top. Pattern inspired by the separators on fahdseddik.github.io.
 *
 * <section class="retro-pin" data-retro data-src="/assets/img/x.webp"
 *          data-pixel="44" data-direction="TopLeft" data-anchor-x="0.5"> …
 */
(() => {
  'use strict';
  const sections = Array.from(document.querySelectorAll('[data-retro]'));
  if (!sections.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // where each block sits along the dissolve direction (0 = first to clear)
  const along = {
    Top: (i, j) => j, Bottom: (i, j) => 1 - j, Left: (i) => i, Right: (i) => 1 - i,
    TopLeft: (i, j) => (i + j) / 2, TopRight: (i, j) => (1 - i + j) / 2,
    BottomLeft: (i, j) => (i + 1 - j) / 2, BottomRight: (i, j) => (2 - i - j) / 2,
  };

  sections.forEach((sec) => {
    const frame = sec.querySelector('.retro-pin-frame');
    if (!frame) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'retro-pin-canvas';
    frame.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const px = Math.max(12, parseInt(sec.dataset.pixel, 10) || 40);
    const jitter = parseFloat(sec.dataset.randomness || '0.4');
    const dir = along[sec.dataset.direction] || along.TopLeft;
    const ax = parseFloat(sec.dataset.anchorX || '0.5');
    const ay = parseFloat(sec.dataset.anchorY || '0.5');

    const img = new Image();
    img.decoding = 'async';
    let ready = false;
    img.onload = () => { ready = true; draw(progress()); };
    img.src = sec.dataset.src;

    let w = 0, h = 0, blocks = [], cover = '#05070d', visible = false, raf = 0, last = -1;
    const readCover = () => { cover = getComputedStyle(root).getPropertyValue('--bg').trim() || cover; };

    function layout() {
      const r = frame.getBoundingClientRect();
      w = r.width; h = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.max(1, Math.ceil(w / px)), rows = Math.max(1, Math.ceil(h / px));
      let seed = (cols * 39 + rows * 91 + 13) >>> 0;
      const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      blocks = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const t = dir(i / Math.max(1, cols - 1), j / Math.max(1, rows - 1)) + (rand() - 0.5) * jitter;
          blocks.push({ x: i * px, y: j * px, t: clamp01(t) });
        }
      }
      last = -1;
    }

    // 0 when the section's top touches the bottom of the viewport, 1 when it has left the top
    function progress() {
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      return clamp01((vh - r.top) / Math.max(1, vh + r.height));
    }

    function draw(p) {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      if (!ready) return;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const s = Math.max(w / iw, h / ih);
      const dw = iw * s, dh = ih * s;
      ctx.drawImage(img, (w - dw) * ax, (h - dh) * ay, dw, dh);
      // first half of the trip: blocks dissolve; second half: the scene stays clear
      const covered = reduce ? 0 : p < 0.5 ? 1 - p / 0.5 : 0;
      if (covered <= 0) return;
      const cut = (1 - covered) * 1.1 - 0.05;
      ctx.fillStyle = cover;
      for (const b of blocks) if (b.t > cut) ctx.fillRect(b.x, b.y, px + 0.5, px + 0.5);
    }

    function tick() {
      raf = 0;
      if (!visible) return;
      const p = progress();
      if (Math.abs(p - last) > 0.0005) { last = p; draw(p); }
      raf = requestAnimationFrame(tick);
    }

    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    }, { threshold: 0 }).observe(sec);
    new ResizeObserver(() => { layout(); draw(progress()); }).observe(frame);
    document.addEventListener('themechange', () => { readCover(); last = -1; draw(progress()); });
    readCover();
    layout();
  });
})();
