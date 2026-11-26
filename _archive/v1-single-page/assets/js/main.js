/*!
 * abdelrahmanelsayed20.github.io: site interactions
 * Theme, navigation, reveals, timeline, projects, case studies, command palette.
 * Vanilla JS, no dependencies.
 */
(() => {
  'use strict';

  window.__siteReady = true; // tells the inline failsafe in <head> that JS is alive
  const html = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const EMAIL = 's-abdulrahman.hassan@zewailcity.edu.eg';
  const CV_URL = 'assets/Abdelrahman-Elsayed-CV.pdf';
  const LINKS = {
    github: 'https://github.com/abdelrahmanelsayed20',
    linkedin: 'https://www.linkedin.com/in/abdelrahman-elsayed-887232262/',
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };

  /* ------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------ */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg) {
    if (!toastEl) return;
    $('.toast-msg', toastEl).textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ------------------------------------------------------------------
     Theme (dark / light) with a circular view-transition reveal
     ------------------------------------------------------------------ */
  const themeMeta = $('meta[name="theme-color"]');
  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', t === 'light' ? '#f6f4ef' : '#09090b');
    $$('.theme-toggle').forEach((b) => b.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme'));
  }
  function toggleTheme(evt) {
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    const commit = () => { applyTheme(next); store.set('theme', next); };
    if (!document.startViewTransition || mqReduce.matches) { commit(); return; }
    const x = evt && evt.clientX ? evt.clientX : window.innerWidth - 60;
    const y = evt && evt.clientY ? evt.clientY : 40;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const vt = document.startViewTransition(commit);
    vt.ready.then(() => {
      html.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }
  applyTheme(html.getAttribute('data-theme') || 'dark');
  $$('.theme-toggle').forEach((b) => b.addEventListener('click', toggleTheme));
  const mqLight = window.matchMedia('(prefers-color-scheme: light)');
  const onSchemeChange = (e) => { if (!store.get('theme')) applyTheme(e.matches ? 'light' : 'dark'); };
  if (mqLight.addEventListener) mqLight.addEventListener('change', onSchemeChange);

  /* ------------------------------------------------------------------
     Hero intro: split the name into characters, then play
     ------------------------------------------------------------------ */
  let charIndex = 0;
  $$('[data-split]').forEach((el) => {
    const frag = document.createDocumentFragment();
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === 3) {
        for (const c of node.textContent) {
          if (!c.trim()) { frag.appendChild(document.createTextNode(c)); continue; }
          const s = document.createElement('span');
          s.className = 'ch';
          s.style.setProperty('--i', charIndex++);
          s.textContent = c;
          frag.appendChild(s);
        }
      } else if (node.nodeType === 1) {
        node.classList.add('ch');
        node.style.setProperty('--i', charIndex++);
        frag.appendChild(node);
      }
    });
    el.textContent = '';
    el.appendChild(frag);
  });
  const play = () => requestAnimationFrame(() => html.classList.add('ready'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(play);
  } else {
    play();
  }

  /* ------------------------------------------------------------------
     Navigation: scroll progress, scroll-spy, sliding indicator, mobile menu
     ------------------------------------------------------------------ */
  const nav = $('.nav');
  const navLinks = $$('.nav-links a');
  const indicator = $('.nav-indicator');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (nav) nav.style.setProperty('--progress', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function moveIndicator(link) {
    if (!indicator) return;
    if (!link) { indicator.style.opacity = '0'; return; }
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
    indicator.style.opacity = '1';
  }
  function setActive(id) {
    let activeLink = null;
    navLinks.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      if (on) { a.setAttribute('aria-current', 'true'); activeLink = a; } else a.removeAttribute('aria-current');
    });
    moveIndicator(activeLink);
  }
  const spySections = $$('main section[id]');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spySections.forEach((s) => spy.observe(s));
  }
  window.addEventListener('resize', () => moveIndicator($('.nav-links a[aria-current="true"]')));

  const menuBtn = $('.menu-btn');
  const menu = $('#mobile-menu');
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    if (open) { const first = $('a', menu); if (first) setTimeout(() => first.focus(), 60); }
  }
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  if (menu) {
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
    window.matchMedia('(min-width: 921px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  const revealTargets = $$('.reveal, .gantt');
  if ('IntersectionObserver' in window && !mqReduce.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in'));
  }

  /* ------------------------------------------------------------------
     Count-up numbers (proof strip)
     ------------------------------------------------------------------ */
  const counters = $$('[data-count]');
  function runCount(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const t0 = performance.now(), dur = 1400;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(dec);
    };
    requestAnimationFrame(tick);
  }
  if (counters.length && 'IntersectionObserver' in window && !mqReduce.matches) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ------------------------------------------------------------------
     Career timeline: "today" marker + ongoing bars stay accurate over time
     ------------------------------------------------------------------ */
  const track = $('.gantt-track');
  if (track) {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const frac = now.getFullYear() + (now - start) / (365.25 * 864e5);
    const from = parseFloat(getComputedStyle(track).getPropertyValue('--from-year')) || 2022.5;
    const span = parseFloat(getComputedStyle(track).getPropertyValue('--span')) || 4.5;
    const clamped = Math.min(from + span, frac);
    track.style.setProperty('--now', clamped.toFixed(3));
    $$('.gantt-bar[data-ongoing]', track).forEach((b) => b.style.setProperty('--to', clamped.toFixed(3)));
    const label = $('.gantt-today span', track);
    if (label) label.textContent = `today · ${now.toLocaleString('en', { month: 'short' })} ${now.getFullYear()}`;
  }

  /* ------------------------------------------------------------------
     Projects: category filters + a real BM25 search (k1 = 1.2, b = 0.75)
     ------------------------------------------------------------------ */
  const filterBtns = $$('.filters button');
  const projects = $$('.project');
  const searchInput = $('#proj-search');
  const searchStatus = $('#proj-search-status');
  let activeFilter = 'all';
  const inCat = (p, f) => f === 'all' || (p.dataset.cat || '').split(' ').includes(f);

  const STOP = new Set('a an and are as at be by for from has in into is it its of on or that the this to was were with we our i my me you your how what using use used'.split(' '));
  const stem = (w) => (w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y`
    : w.length > 4 && w.endsWith('ing') ? w.slice(0, -3)
    : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
  const tokenize = (t) => (t.toLowerCase().normalize('NFKD').match(/[a-z0-9]+(?:[+#*][a-z0-9]*)?/g) || [])
    .filter((w) => !STOP.has(w)).map(stem);

  // Index every project card once: title counts double, plus the hand-written keyword list.
  const docs = projects.map((p) => {
    const title = ($('h3', p) || {}).textContent || '';
    const body = ($('.project-body', p) || p).textContent;
    const text = `${title} ${title} ${p.dataset.search || ''} ${body}`;
    const toks = tokenize(text);
    const tf = new Map();
    toks.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
    return { el: p, tf, len: toks.length };
  });
  const N = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, N);
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)));
  const idf = (w) => { const n = df.get(w) || 0; return Math.log(1 + (N - n + 0.5) / (n + 0.5)); };
  function bm25(q, d) {
    const k1 = 1.2, b = 0.75;
    let s = 0;
    for (const w of q) {
      const f = d.tf.get(w);
      if (!f) continue;
      s += idf(w) * (f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avgdl));
    }
    return s;
  }
  // a score chip on each card
  docs.forEach((d) => {
    const top = $('.project-top', d.el);
    if (!top) return;
    const chip = document.createElement('span');
    chip.className = 'bm25';
    chip.hidden = true;
    top.appendChild(chip);
    d.chip = chip;
  });

  function applyProjects() {
    const raw = searchInput ? searchInput.value.trim() : '';
    const q = [...new Set(tokenize(raw))];
    let shown = 0, matched = 0;
    const grid = $('#projects-grid');
    if (grid) grid.classList.toggle('searching', q.length > 0);
    const ranked = docs.map((d) => ({ d, s: q.length ? bm25(q, d) : 0 }));
    if (q.length) ranked.sort((a, b) => b.s - a.s);
    ranked.forEach(({ d, s }, i) => {
      const visible = inCat(d.el, activeFilter);
      d.el.classList.toggle('is-hidden', !visible);
      if (visible) shown++;
      const hit = !q.length || s > 0;
      if (visible && q.length && hit) matched++;
      d.el.classList.toggle('is-dim', !!q.length && !hit);
      d.el.style.order = q.length ? String(hit ? i : 100 + i) : '';
      if (d.chip) {
        d.chip.hidden = !q.length || !hit;
        d.chip.textContent = `bm25 ${s.toFixed(2)}`;
      }
    });
    if (searchStatus) {
      searchStatus.textContent = q.length
        ? (matched ? `${matched} of ${shown} project${shown === 1 ? '' : 's'} match “${raw}”, ranked by BM25 score` : `No project matches “${raw}”. Try “lstm”, “search” or “imbalanced”.`)
        : '';
    }
  }

  filterBtns.forEach((b) => {
    const c = $('.count', b);
    if (c) c.textContent = projects.filter((p) => inCat(p, b.dataset.filter)).length;
    b.addEventListener('click', () => {
      activeFilter = b.dataset.filter;
      filterBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      applyProjects();
    });
  });
  if (searchInput) {
    let st = 0;
    searchInput.addEventListener('input', () => { clearTimeout(st); st = setTimeout(applyProjects, 70); });
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape' && searchInput.value) { searchInput.value = ''; applyProjects(); } });
  }

  /* ------------------------------------------------------------------
     Waffle chart: one square per student, filled when it scrolls into view
     ------------------------------------------------------------------ */
  $$('[data-waffle]').forEach((w) => {
    const n = parseInt(w.dataset.waffle, 10) || 100;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) { const sq = document.createElement('i'); sq.style.setProperty('--i', i); frag.appendChild(sq); }
    w.appendChild(frag);
    if ('IntersectionObserver' in window && !mqReduce.matches) {
      const wio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { w.classList.add('in'); wio.disconnect(); } }, { threshold: 0.4 });
      wio.observe(w);
    } else {
      w.classList.add('in');
    }
  });

  /* "Play with fig. 01" links: scroll up, then start a fresh race */
  $$('[data-lab-restart]').forEach((a) => a.addEventListener('click', () => {
    setTimeout(() => { if (window.OptimizerLab) window.OptimizerLab.restart(); }, mqReduce.matches ? 0 : 500);
  }));

  if (finePointer) {
    projects.forEach((p) => {
      p.addEventListener('pointermove', (e) => {
        const r = p.getBoundingClientRect();
        p.style.setProperty('--mx', `${e.clientX - r.left}px`);
        p.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ------------------------------------------------------------------
     Case-study dialogs (native <dialog>, deep-linkable via #case-<id>)
     ------------------------------------------------------------------ */
  let lastOpener = null;
  function openCase(id, opener) {
    const dlg = document.getElementById(`cs-${id}`);
    if (!dlg || typeof dlg.showModal !== 'function') return false;
    lastOpener = opener || document.activeElement;
    if (!dlg.open) dlg.showModal();
    const sc = $('.cs-scroll', dlg);
    if (sc) sc.scrollTop = 0;
    try { history.replaceState(null, '', `#case-${id}`); } catch (e) { /* file:// */ }
    return true;
  }
  $$('[data-case]').forEach((b) => b.addEventListener('click', (e) => {
    if (openCase(b.dataset.case, b)) e.preventDefault();
  }));
  $$('dialog.cs').forEach((dlg) => {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('close', () => {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
      if (lastOpener && document.contains(lastOpener)) lastOpener.focus({ preventScroll: true });
    });
  });
  if (location.hash.indexOf('#case-') === 0) openCase(location.hash.slice(6));

  /* ------------------------------------------------------------------
     Copy email
     ------------------------------------------------------------------ */
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = EMAIL;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) { /* ignore */ }
      ta.remove();
    }
    toast('Email copied to clipboard');
  }
  $$('[data-copy-email]').forEach((b) => b.addEventListener('click', copyEmail));

  /* ------------------------------------------------------------------
     Subtle magnetic pull on primary buttons (fine pointers only)
     ------------------------------------------------------------------ */
  if (finePointer && !mqReduce.matches) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = `translate(${dx * 8}px, ${dy * 6}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------
     Model-card cover: generative "topographic map" in the inferno palette
     ------------------------------------------------------------------ */
  const cover = $('#cover-canvas');
  if (cover && cover.getContext) {
    const INF = ['#000004', '#160b39', '#420a68', '#6a176e', '#932667', '#bc3754', '#dd513a', '#f37819', '#fca50a', '#f6d746', '#fcffa4']
      .map((h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
    const cmap = (t) => {
      t = Math.min(1, Math.max(0, t)) * (INF.length - 1);
      const i = Math.min(INF.length - 2, Math.floor(t)), f = t - i, a = INF[i], b = INF[i + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    };
    // deterministic "random" bumps so the card looks the same for everyone
    const bumps = [[0.22, 0.3, 0.16, 1], [0.72, 0.62, 0.2, 0.9], [0.55, 0.18, 0.11, -0.6], [0.3, 0.8, 0.14, 0.7], [0.88, 0.2, 0.12, 0.55], [0.48, 0.5, 0.28, 0.35]];
    const field = (x, y) => {
      let v = 0.15 * Math.sin(x * 7.1 + y * 2.3) * Math.cos(y * 5.2 - x * 1.4);
      for (const [bx, by, s, a] of bumps) v += a * Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (2 * s * s));
      return v;
    };
    const paint = () => {
      const r = cover.getBoundingClientRect();
      if (!r.width) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(160, Math.round(r.width * scale)), h = Math.max(100, Math.round(r.height * scale));
      cover.width = w; cover.height = h;
      const c = cover.getContext('2d');
      const img = c.createImageData(w, h);
      const vals = new Float32Array(w * h);
      let lo = Infinity, hi = -Infinity;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = field(x / w, (y / h) * (h / w) * 1.6);
        vals[y * w + x] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const LEVELS = 15;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const t = (vals[i] - lo) / (hi - lo);
        const lvl = Math.floor(t * LEVELS);
        const edge = (x > 0 && Math.floor(((vals[i - 1] - lo) / (hi - lo)) * LEVELS) !== lvl) ||
                     (y > 0 && Math.floor(((vals[i - w] - lo) / (hi - lo)) * LEVELS) !== lvl);
        const col = cmap(0.08 + (lvl / LEVELS) * 0.88);
        const k = edge ? 1.0 : 0.42;
        img.data[i * 4] = col[0] * k;
        img.data[i * 4 + 1] = col[1] * k;
        img.data[i * 4 + 2] = col[2] * k;
        img.data[i * 4 + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    };
    paint();
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(paint, 150); });
  }

  /* ------------------------------------------------------------------
     Command palette (Ctrl/Cmd + K, or "/")
     ------------------------------------------------------------------ */
  const pal = $('#palette');
  const palInput = $('#palette-input');
  const palList = $('#palette-list');
  const ICON = {
    go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9 15l3 3 3-3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c3-1 4-6 7-6s3 5 6 5 4-4 5-6"/><circle cx="10" cy="11" r="1.6"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
  };
  const scrollToId = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: mqReduce.matches ? 'auto' : 'smooth' }); };
  const commands = [
    ...['about', 'experience', 'research', 'projects', 'skills', 'contact'].map((id) => ({
      group: 'Go to', label: id[0].toUpperCase() + id.slice(1), icon: 'go', keywords: 'section jump navigate', run: () => scrollToId(id),
    })),
    { group: 'Actions', label: 'Download CV (PDF)', icon: 'file', keywords: 'resume cv pdf', run: () => { window.open(CV_URL, '_blank', 'noopener'); } },
    { group: 'Actions', label: 'Copy email address', icon: 'mail', hint: EMAIL, keywords: 'contact mail', run: copyEmail },
    { group: 'Actions', label: 'Open GitHub', icon: 'ext', hint: '@abdelrahmanelsayed20', keywords: 'code repos', run: () => window.open(LINKS.github, '_blank', 'noopener') },
    { group: 'Actions', label: 'Open LinkedIn', icon: 'ext', keywords: 'profile connect', run: () => window.open(LINKS.linkedin, '_blank', 'noopener') },
    { group: 'Actions', label: 'Toggle dark / light theme', icon: 'theme', keywords: 'mode color', run: () => toggleTheme() },
    { group: 'Optimizer lab', label: 'Restart the optimizer race', icon: 'spark', keywords: 'adam sgd rmsprop adagrad fig 01', run: () => { scrollToId('top'); window.OptimizerLab && window.OptimizerLab.restart(); } },
    { group: 'Optimizer lab', label: 'Next loss landscape', icon: 'spark', keywords: 'himmelblau rosenbrock valleys', run: () => { scrollToId('top'); window.OptimizerLab && window.OptimizerLab.nextLandscape(); } },
    ...$$('dialog.cs').map((d) => ({
      group: 'Case studies', label: d.dataset.title || d.id.replace('cs-', ''), icon: 'book', keywords: d.dataset.keywords || 'project', run: () => openCase(d.id.replace('cs-', '')),
    })),
  ];
  let palItems = [], palSel = 0;

  function score(q, c) {
    if (!q) return 1;
    const hay = `${c.label} ${c.keywords || ''} ${c.group}`.toLowerCase();
    if (hay.includes(q)) return 3 - hay.indexOf(q) / 200;
    let i = 0;
    for (const ch of q) { i = hay.indexOf(ch, i); if (i < 0) return 0; i++; }
    return 1;
  }
  function renderPalette() {
    const q = palInput.value.trim().toLowerCase();
    palItems = commands.map((c) => ({ c, s: score(q, c) })).filter((x) => x.s > 0);
    if (q) palItems.sort((a, b) => b.s - a.s);
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    palList.innerHTML = '';
    if (!palItems.length) {
      palList.innerHTML = '<div class="palette-empty">No matches. Try "cv", "email" or "adam".</div>';
      palInput.removeAttribute('aria-activedescendant');
      return;
    }
    let group = '';
    palItems.forEach((x, i) => {
      if (!q && x.c.group !== group) {
        group = x.c.group;
        const g = document.createElement('div');
        g.className = 'palette-group';
        g.setAttribute('role', 'presentation');
        g.textContent = group;
        palList.appendChild(g);
      }
      const it = document.createElement('div');
      it.className = 'palette-item';
      it.id = `pal-${i}`;
      it.setAttribute('role', 'option');
      it.setAttribute('aria-selected', String(i === palSel));
      it.innerHTML = `${ICON[x.c.icon] || ICON.go}<span></span>${x.c.hint ? '<span class="hint"></span>' : ''}`;
      it.children[1].textContent = x.c.label;
      if (x.c.hint) it.children[2].textContent = x.c.hint;
      it.addEventListener('pointermove', () => { if (palSel !== i) { palSel = i; highlight(); } });
      it.addEventListener('click', () => runSelected(i));
      palList.appendChild(it);
    });
    highlight();
  }
  function highlight() {
    $$('.palette-item', palList).forEach((el, i) => el.setAttribute('aria-selected', String(i === palSel)));
    const sel = $(`#pal-${palSel}`, palList);
    if (sel) { palInput.setAttribute('aria-activedescendant', sel.id); sel.scrollIntoView({ block: 'nearest' }); }
  }
  function runSelected(i) {
    const x = palItems[i];
    if (!x) return;
    pal.close();
    setTimeout(() => x.c.run(), 30);
  }
  function openPalette() {
    if (!pal || typeof pal.showModal !== 'function') return;
    if (pal.open) { pal.close(); return; }
    $$('dialog.cs[open]').forEach((d) => d.close());
    setMenu(false);
    palInput.value = '';
    palSel = 0;
    renderPalette();
    pal.showModal();
    palInput.focus();
  }
  if (pal) {
    palInput.addEventListener('input', () => { palSel = 0; renderPalette(); });
    palInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); palSel = (palSel + 1) % Math.max(1, palItems.length); highlight(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = (palSel - 1 + palItems.length) % Math.max(1, palItems.length); highlight(); }
      else if (e.key === 'Enter') { e.preventDefault(); runSelected(palSel); }
    });
    pal.addEventListener('click', (e) => { if (e.target === pal) pal.close(); });
    $$('[data-palette]').forEach((b) => b.addEventListener('click', openPalette));
    window.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openPalette(); }
      else if (e.key === '/' && !typing && !pal.open) { e.preventDefault(); openPalette(); }
    });
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    $$('[data-kbd-mod]').forEach((el) => { el.textContent = isMac ? '⌘K' : 'Ctrl K'; });
  }

  /* ------------------------------------------------------------------
     Misc
     ------------------------------------------------------------------ */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  $$('[data-top]').forEach((b) => b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: mqReduce.matches ? 'auto' : 'smooth' })));

  // A small hello for the curious ones who open DevTools.
  try {
    console.log(
      '%cHi there 👋%c\nYou opened the console, so you are my kind of person.\nThe 3D landscape in fig. 01 runs the real Adam / SGD-M / RMSProp / AdaGrad update rules.\nLet\'s talk: ' + EMAIL,
      'font: 600 16px system-ui; color: #ff6b35;',
      'font: 13px system-ui; color: inherit;'
    );
  } catch (e) { /* ignore */ }
})();
