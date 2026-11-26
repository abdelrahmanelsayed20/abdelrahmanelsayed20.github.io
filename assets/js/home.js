/*!
 * home.js · "text pressure" name for the hero.
 * Every letter of the name is a span in a variable font (Roboto Flex). Its
 * weight depends on its distance from a smoothed cursor: letters near the
 * cursor thin out, letters far away get bold. Vanilla re-implementation of
 * the effect used on fahdseddik.github.io.
 */
(() => {
  'use strict';
  const host = document.querySelector('[data-text-pressure]');
  if (!host) return;
  const lines = Array.from(host.querySelectorAll('.tp-line'));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MIN_W = 110, MAX_W = 700, WDTH = 72;
  const chars = [];

  lines.forEach((ln) => {
    const txt = ln.textContent.trim();
    ln.textContent = '';
    for (const ch of txt) {
      const s = document.createElement('span');
      s.textContent = ch === ' ' ? ' ' : ch;
      s.setAttribute('aria-hidden', 'true');
      ln.appendChild(s);
      chars.push(s);
    }
  });

  const setW = (el, w) => { el.style.fontVariationSettings = `'wght' ${w}, 'wdth' ${WDTH}`; };
  const cache = new Array(chars.length).fill(-1);
  let rel = [];
  let lastWidth = 0;

  function measure() {
    const hr = host.getBoundingClientRect();
    rel = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return [r.left + r.width / 2 - hr.left, r.top + r.height / 2 - hr.top];
    });
  }

  // fit the widest line to the column at the boldest weight, so letters never overflow
  function fit() {
    const w = host.clientWidth;
    if (!w || Math.abs(w - lastWidth) < 1) return;
    lastWidth = w;
    chars.forEach((c) => setW(c, MAX_W));
    // measure the letters themselves: a block-level flex line always reports the
    // container's width, so size it to its content while measuring
    lines.forEach((l) => { l.style.fontSize = '100px'; l.style.width = 'max-content'; });
    const widest = Math.max(...lines.map((l) => l.getBoundingClientRect().width));
    lines.forEach((l) => { l.style.width = ''; });
    const fs = Math.max(34, Math.min(140, (100 * w) / widest)) * 0.985;
    lines.forEach((l) => { l.style.fontSize = `${fs.toFixed(2)}px`; });
    host.classList.add('tp-ready');
    cache.fill(-1);
    measure();
    if (reduce) chars.forEach((c) => setW(c, 560));
    else kick();
  }

  const mouse = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  let running = false, still = 0;

  function frame() {
    const dx = mouse.x - cur.x, dy = mouse.y - cur.y;
    cur.x += dx / 15; cur.y += dy / 15;
    const hr = host.getBoundingClientRect();
    const half = hr.width / 2 || 1;
    let changed = false;
    for (let i = 0; i < chars.length; i++) {
      const p = rel[i];
      if (!p) continue;
      const d = Math.hypot(p[0] + hr.left - cur.x, p[1] + hr.top - cur.y);
      const k = Math.min(1, d / half);
      const w = (MIN_W + (MAX_W - MIN_W) * k) | 0;
      if (w !== cache[i]) { cache[i] = w; setW(chars[i], w); changed = true; }
    }
    if (dx * dx + dy * dy < 0.25 && !changed) {
      if (++still > 12) { running = false; return; }
    } else still = 0;
    requestAnimationFrame(frame);
  }
  function kick() {
    if (reduce || running || !rel.length) return;
    running = true; still = 0;
    requestAnimationFrame(frame);
  }

  const center = () => {
    const r = host.getBoundingClientRect();
    mouse.x = cur.x = r.left + r.width * 0.5;
    mouse.y = cur.y = r.top + r.height * 0.5;
  };
  center();
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; kick(); }, { passive: true });
  window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) { mouse.x = t.clientX; mouse.y = t.clientY; kick(); } }, { passive: true });
  window.addEventListener('scroll', kick, { passive: true });

  const ro = new ResizeObserver(() => fit());
  ro.observe(host);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { lastWidth = 0; fit(); center(); kick(); }).catch(() => {});
  }
  fit();
})();
