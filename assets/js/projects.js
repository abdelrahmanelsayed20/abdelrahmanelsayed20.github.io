/*!
 * projects.js · featured carousel, filter pills with a sliding highlight,
 * FLIP-animated grid, and a real BM25 search over the project cards
 * (k1 = 1.2, b = 0.75, the scoring function behind NutriQuest).
 */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

  /* ---------- highlight a card (used by the featured carousel) ---------- */
  function highlight(id) {
    const card = document.getElementById(id);
    if (!card) return;
    if (card.classList.contains('is-hidden')) { selectFilter('all'); }
    card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    card.classList.remove('is-highlighted');
    void card.offsetWidth;
    card.classList.add('is-highlighted');
    setTimeout(() => card.classList.remove('is-highlighted'), 2400);
  }

  /* ---------- featured carousel ---------- */
  (function featured() {
    const fp = $('.fp-carousel');
    if (!fp) return;
    const slides = $$('.fp-slide', fp);
    const dots = $$('.fp-dot', fp);
    const bar = $('.fp-progress', fp);
    const DUR = 5200;
    let i = 0, timer = 0, hovering = false, onScreen = true;
    fp.style.setProperty('--fp-dur', `${DUR}ms`);
    const paused = () => hovering || !onScreen || document.hidden || reduce;
    function arm() {
      clearTimeout(timer);
      bar.classList.remove('run');
      void bar.offsetWidth;
      if (paused()) return;
      bar.classList.add('run');
      timer = setTimeout(() => show(i + 1), DUR);
    }
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        const on = k === i;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
        s.tabIndex = on ? 0 : -1;
      });
      dots.forEach((d, k) => { d.classList.toggle('is-active', k === i); d.setAttribute('aria-selected', String(k === i)); });
      arm();
    }
    slides.forEach((s) => s.addEventListener('click', () => highlight(s.dataset.target)));
    dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
    fp.addEventListener('mouseenter', () => { hovering = true; arm(); });
    fp.addEventListener('mouseleave', () => { hovering = false; arm(); });
    fp.addEventListener('focusin', () => { hovering = true; arm(); });
    fp.addEventListener('focusout', () => { hovering = false; arm(); });
    new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; arm(); }).observe(fp);
    document.addEventListener('visibilitychange', arm);
    show(0);
  })();

  /* ---------- grid: filters + BM25 search ---------- */
  const grid = $('.pg-grid');
  if (!grid) return;
  const cards = $$('.pcard', grid);
  const pills = $$('.pg-pill');
  const pillBg = $('.pg-pill-bg');
  const input = $('#pg-search');
  const status = $('#pg-status');
  let filter = 'all';
  const inCat = (c, f) => f === 'all' || (c.dataset.cat || '').split(' ').includes(f);

  const STOP = new Set('a an and are as at be by for from has in into is it its of on or that the this to was were with we our i my me you your how what using use used'.split(' '));
  const stem = (w) => (w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y`
    : w.length > 4 && w.endsWith('ing') ? w.slice(0, -3)
      : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
  const tokenize = (t) => (t.toLowerCase().normalize('NFKD').match(/[a-z0-9]+(?:[+#*][a-z0-9]*)?/g) || [])
    .filter((w) => !STOP.has(w)).map(stem);

  const docs = cards.map((c) => {
    const title = ($('.pcard-title', c) || {}).textContent || '';
    const text = `${title} ${title} ${c.dataset.search || ''} ${($('.pcard-body', c) || c).textContent}`;
    const toks = tokenize(text);
    const tf = new Map();
    toks.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
    const chip = document.createElement('span');
    chip.className = 'bm25'; chip.hidden = true;
    const kind = $('.pcard-kind', c);
    if (kind) kind.appendChild(chip);
    return { el: c, tf, len: toks.length, chip };
  });
  const N = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, N);
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)));
  const idf = (w) => { const n = df.get(w) || 0; return Math.log(1 + (N - n + 0.5) / (n + 0.5)); };
  const bm25 = (q, d) => q.reduce((s, w) => {
    const f = d.tf.get(w);
    return f ? s + (idf(w) * (f * 2.2)) / (f + 1.2 * (0.25 + (0.75 * d.len) / avgdl)) : s;
  }, 0);

  pills.forEach((p) => {
    const c = $('.count', p);
    if (c) c.textContent = String(cards.filter((x) => inCat(x, p.dataset.filter)).length);
  });

  function moveBg(btn, instant) {
    if (!pillBg || !btn) return;
    if (instant) pillBg.style.transition = 'none';
    pillBg.style.width = `${btn.offsetWidth}px`;
    pillBg.style.transform = `translateX(${btn.offsetLeft}px)`;
    if (instant) { void pillBg.offsetWidth; pillBg.style.transition = ''; }
  }

  function apply() {
    const before = new Map();
    docs.forEach((d) => { if (!d.el.classList.contains('is-hidden')) before.set(d.el, d.el.getBoundingClientRect()); });
    const raw = input ? input.value.trim() : '';
    const q = [...new Set(tokenize(raw))];
    const ranked = docs.map((d) => ({ d, s: q.length ? bm25(q, d) : 0 }));
    if (q.length) ranked.sort((a, b) => b.s - a.s);
    let shown = 0, matched = 0;
    ranked.forEach(({ d, s }, i) => {
      const vis = inCat(d.el, filter);
      const hit = !q.length || s > 0;
      d.el.classList.toggle('is-hidden', !vis);
      d.el.classList.toggle('is-dim', !!q.length && !hit);
      d.el.style.order = q.length ? String(hit ? i : 100 + i) : '';
      d.chip.hidden = !q.length || !hit;
      d.chip.textContent = `bm25 ${s.toFixed(2)}`;
      if (vis) shown++;
      if (vis && q.length && hit) matched++;
    });
    if (status) {
      status.textContent = q.length
        ? (matched ? `${matched} of ${shown} project${shown === 1 ? '' : 's'} match “${raw}”, ranked by BM25` : `No project matches “${raw}”. Try “lstm”, “search” or “imbalanced”.`)
        : '';
    }
    if (reduce || !grid.animate) return;
    docs.forEach((d) => {
      if (d.el.classList.contains('is-hidden')) return;
      const a = d.el.getBoundingClientRect();
      const b = before.get(d.el);
      if (b) {
        const dx = b.left - a.left, dy = b.top - a.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) d.el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, easing: EASE });
      } else {
        d.el.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: EASE });
      }
    });
  }

  function selectFilter(f) {
    filter = f;
    pills.forEach((p) => p.setAttribute('aria-selected', String(p.dataset.filter === f)));
    moveBg(pills.find((p) => p.dataset.filter === f));
    apply();
  }
  pills.forEach((p) => p.addEventListener('click', () => selectFilter(p.dataset.filter)));
  if (input) {
    let t = 0;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 80); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { input.value = ''; apply(); } });
  }
  const placeBg = () => moveBg(pills.find((p) => p.dataset.filter === filter), true);
  placeBg();
  window.addEventListener('resize', placeBg);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeBg).catch(() => {});

  // deep links such as /projects/#p-nutriquest glow the card once the page is uncovered
  const fromHash = () => {
    const el = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (el && el.classList.contains('pcard')) highlight(el.id);
  };
  if (document.documentElement.dataset.ptIncoming === 'true') document.addEventListener('pt:revealed', fromHash, { once: true });
  else fromHash();
})();
