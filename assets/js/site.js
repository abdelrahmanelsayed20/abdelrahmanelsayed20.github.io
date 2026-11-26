/*!
 * site.js · shared runtime for abdelrahmanelsayed20.github.io
 * Theme, navigation, custom cursor, signature page transitions, WebGL dither
 * background, per-tab effects, reveals, quotes, ambient sound, scroll-pinned
 * slideshows and case-study dialogs. Vanilla JS, no dependencies.
 * Interaction patterns inspired by fahdseddik.github.io (Fahd Seddik).
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mqReduce.matches;
  const finePointer = window.matchMedia('(any-hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k, s) { try { return (s || localStorage).getItem(k); } catch (e) { return null; } },
    set(k, v, s) { try { (s || localStorage).setItem(k, v); } catch (e) { /* private mode */ } },
    del(k, s) { try { (s || localStorage).removeItem(k); } catch (e) { /* ignore */ } },
  };
  const session = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();
  const tab = root.dataset.activeTab || 'home';

  if (reduced()) root.dataset.reducedMotion = 'true';

  /* ======================================================================
     1. Performance tier (low / medium / high), cached per device
     ====================================================================== */
  const tier = (() => {
    const cached = store.get('perf-tier-v2');
    if (cached === 'low' || cached === 'medium' || cached === 'high') { root.dataset.perfTier = cached; return cached; }
    let t = 'high';
    const conn = navigator.connection;
    if (conn && (conn.saveData || /(^|\W)(slow-2g|2g|3g)($|\W)/.test(conn.effectiveType || ''))) t = 'low';
    else {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) t = 'low';
        else {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).toLowerCase() : '';
          if (/swiftshader|llvmpipe|software|mali-[234]|adreno \(tm\) [2-4]|powervr|videocore/.test(r)) t = 'low';
          else if (/intel.*(hd|uhd) graphics|mali|adreno/.test(r)) t = 'medium';
          if (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '') && t === 'high') t = 'medium';
          const lose = gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        }
      } catch (e) { t = 'low'; }
    }
    root.dataset.perfTier = t;
    store.set('perf-tier-v2', t);
    return t;
  })();

  /* ======================================================================
     2. Theme toggle (+ "pristine" breathing cue until first use)
     ====================================================================== */
  const metaTheme = $('meta[name="theme-color"]');
  const syncMeta = () => { if (metaTheme) metaTheme.setAttribute('content', root.dataset.theme === 'dark' ? '#05070d' : '#f8fafd'); };
  function setTheme(t, persist) {
    root.dataset.theme = t;
    if (persist) {
      store.set('theme', t);
      store.set('theme-toggle-seen', 'true');
      delete root.dataset.themePristine;
    }
    syncMeta();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  }
  syncMeta();
  const themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  const onScheme = (e) => { if (!store.get('theme')) setTheme(e.matches ? 'dark' : 'light', false); };
  if (mqDark.addEventListener) mqDark.addEventListener('change', onScheme);

  /* ======================================================================
     3. Mobile menu (morphing hamburger + drawer sheet)
     ====================================================================== */
  const hb = $('.hamburger-btn');
  const sheet = $('.hamburger-sheet');
  const overlay = $('.hamburger-overlay');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    if (hb) { hb.setAttribute('aria-expanded', String(open)); hb.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
    if (sheet) { sheet.setAttribute('aria-hidden', String(!open)); sheet.inert = !open; }
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && sheet) { const a = $('a', sheet); if (a) a.focus({ preventScroll: true }); }
  }
  if (sheet) sheet.inert = true;
  if (hb) hb.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  if (overlay) overlay.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); if (hb) hb.focus(); }
  });

  /* ======================================================================
     4. Custom cursor (ring follows with lag, dot follows exactly)
     ====================================================================== */
  (function cursor() {
    const ring = $('.cursor');
    const dot = $('.cursor-dot');
    if (!finePointer || !ring || !dot) return;
    root.classList.add('has-cursor');
    let x = -100, y = -100, rx = x, ry = y, on = false, raf = 0;
    const k = reduced() ? 1 : 0.45;
    const tick = () => {
      raf = 0;
      rx += (x - rx) * k; ry += (y - ry) * k;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!on) { on = true; rx = x; ry = y; ring.classList.add('is-on'); dot.classList.add('is-on'); }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget) { on = false; ring.classList.remove('is-on'); dot.classList.remove('is-on'); }
    });
    const HOVER = 'a, button, [data-cursor="hover"], summary, label, select, [role="tab"], canvas[data-cursor]';
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      ring.classList.toggle('is-hover', !!(t && t.closest && t.closest(HOVER)));
    });
    document.addEventListener('pointerdown', () => ring.classList.add('is-press'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-press'));
  })();

  /* ======================================================================
     5. Signature page transition
        out: panel slides up to cover, the name is "written" left to right,
             then we navigate. A sessionStorage flag makes the next page paint
             fully covered (see the inline <head> script), then the panel
             slides away.
     ====================================================================== */
  const PT = (() => {
    const wrap = $('.page-transition');
    const panel = wrap && $('.pt-panel', wrap);
    const sig = wrap && $('.pt-signature', wrap);
    const ok = !!(wrap && panel && sig && panel.animate && session);
    const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const POWER2 = 'cubic-bezier(0.33, 1, 0.68, 1)';
    let busy = false;
    if (ok && reduced()) wrap.dataset.mode = 'reduced';

    const cancelAll = () => { [panel, sig].forEach((el) => el.getAnimations().forEach((a) => a.cancel())); };
    function finishIncoming() { delete root.dataset.ptIncoming; cancelAll(); document.dispatchEvent(new Event('pt:revealed')); }

    function reveal() {
      if (!ok || root.dataset.ptIncoming !== 'true') {
        document.dispatchEvent(new Event('pt:lift'));
        document.dispatchEvent(new Event('pt:revealed'));
        return;
      }
      store.del('pt-incoming', session);
      document.dispatchEvent(new Event('pt:lift'));
      if (reduced()) {
        panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear', fill: 'forwards' }).finished.then(finishIncoming, finishIncoming);
        return;
      }
      sig.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: EXPO, fill: 'forwards' });
      panel.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duration: 650, easing: EXPO, fill: 'forwards' })
        .finished.then(finishIncoming, finishIncoming);
    }

    const sameOrigin = (u) => { try { return new URL(u, location.href).origin === location.origin; } catch (e) { return false; } };
    const samePage = (u) => { try { const x = new URL(u, location.href); return x.pathname === location.pathname && x.search === location.search; } catch (e) { return true; } };
    function eligible(a, e) {
      if (!a || !a.href || a.hasAttribute('download') || 'noTransition' in a.dataset) return false;
      if (a.target && a.target !== '_self') return false;
      if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) return false;
      const raw = a.getAttribute('href') || '';
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return false;
      if (!sameOrigin(a.href) || samePage(a.href)) return false;
      if (/\.(pdf|png|jpe?g|gif|svg|zip)$/i.test(new URL(a.href).pathname)) return false;
      return true;
    }

    function go(url) {
      if (!ok || busy) { location.href = url; return; }
      busy = true;
      store.set('pt-incoming', '1', session);
      setMenu(false);
      try { fetch(url, { credentials: 'same-origin', priority: 'high' }).catch(() => {}); } catch (e) { /* old browsers */ }
      const nav = () => { location.href = url; };
      if (reduced()) {
        panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear', fill: 'forwards' })
          .finished.then(() => setTimeout(nav, 40), nav);
        return;
      }
      // same choreography as the reference: cover 0.6s (expo.out); the name starts
      // writing 0.05s before the cover lands and takes 0.7s (power2.out); hold 0.08s
      panel.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }], { duration: 600, easing: EXPO, fill: 'forwards' });
      sig.animate(
        [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)' }],
        { duration: 700, delay: 550, easing: POWER2, fill: 'forwards' }
      ).finished.then(() => setTimeout(nav, 80), nav);
    }

    if (ok) {
      document.addEventListener('click', (e) => {
        if (e.defaultPrevented) return;
        const a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!eligible(a, e)) return;
        e.preventDefault();
        go(a.href);
      }, true);
      // back/forward cache: never come back to a covered page
      window.addEventListener('pageshow', (e) => { if (e.persisted) { busy = false; store.del('pt-incoming', session); delete root.dataset.ptIncoming; cancelAll(); } });
      window.addEventListener('popstate', () => { busy = false; cancelAll(); });
    }

    // prefetch internal pages on intent
    const done = new Set();
    const prefetch = (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || !eligible(a) || done.has(a.href)) return;
      done.add(a.href);
      const l = document.createElement('link');
      l.rel = 'prefetch'; l.href = a.href;
      document.head.appendChild(l);
    };
    document.addEventListener('pointerover', prefetch, { passive: true });
    document.addEventListener('touchstart', prefetch, { passive: true });
    document.addEventListener('focusin', prefetch);

    return { reveal, go };
  })();

  /* ======================================================================
     6. Background stage: WebGL2 Bayer-dithered dot field with pointer
        ripples, a per-page palette and smooth theme tweening.
     ====================================================================== */
  const PALETTES = {
    dark: {
      home:       { bg: [0.045, 0.052, 0.075], top: [0.085, 0.15, 0.30], dot: [0.50, 0.27, 0.52] },
      education:  { bg: [0.045, 0.052, 0.045], top: [0.08, 0.12, 0.10], dot: [0.38, 0.34, 0.22] },
      experience: { bg: [0.052, 0.045, 0.04], top: [0.12, 0.13, 0.15], dot: [0.42, 0.31, 0.22] },
      research:   { bg: [0.045, 0.045, 0.058], top: [0.09, 0.10, 0.17], dot: [0.30, 0.34, 0.55] },
      projects:   { bg: [0.038, 0.045, 0.058], top: [0.08, 0.12, 0.18], dot: [0.18, 0.36, 0.42] },
      skills:     { bg: [0.055, 0.045, 0.04], top: [0.12, 0.10, 0.11], dot: [0.38, 0.22, 0.26] },
      nf:         { bg: [0.045, 0.045, 0.058], top: [0.10, 0.08, 0.16], dot: [0.42, 0.26, 0.46] },
    },
    light: {
      home:       { bg: [0.965, 0.972, 0.984], top: [0.66, 0.74, 0.92], dot: [0.92, 0.74, 0.84] },
      education:  { bg: [0.962, 0.972, 0.962], top: [0.62, 0.72, 0.70], dot: [0.94, 0.86, 0.66] },
      experience: { bg: [0.972, 0.965, 0.952], top: [0.70, 0.70, 0.74], dot: [0.92, 0.80, 0.66] },
      research:   { bg: [0.955, 0.952, 0.965], top: [0.58, 0.62, 0.80], dot: [0.78, 0.80, 0.96] },
      projects:   { bg: [0.962, 0.965, 0.972], top: [0.60, 0.70, 0.78], dot: [0.70, 0.86, 0.88] },
      skills:     { bg: [0.972, 0.962, 0.952], top: [0.62, 0.70, 0.80], dot: [0.86, 0.66, 0.60] },
      nf:         { bg: [0.955, 0.952, 0.965], top: [0.66, 0.62, 0.80], dot: [0.90, 0.76, 0.90] },
    },
  };
  const palFor = () => {
    const set = PALETTES[root.dataset.theme === 'light' ? 'light' : 'dark'];
    const p = set[tab] || set.home;
    return { bg: p.bg.slice(), top: p.top.slice(), dot: p.dot.slice() };
  };
  const css = (c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

  (function bgStage() {
    const host = $('.bg-stage');
    if (!host) return;
    let cur = palFor();
    let redraw = () => {};
    const paintCss = () => { host.style.background = `linear-gradient(to top, ${css(cur.bg)}, ${css(cur.top)})`; };
    paintCss();

    function tweenTo(next, dur) {
      const from = { bg: cur.bg.slice(), top: cur.top.slice(), dot: cur.dot.slice() };
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        const e = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
        ['bg', 'top', 'dot'].forEach((key) => { for (let i = 0; i < 3; i++) cur[key][i] = from[key][i] + (next[key][i] - from[key][i]) * e; });
        paintCss();
        redraw();
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    document.addEventListener('themechange', () => tweenTo(palFor(), tier === 'low' ? 200 : tier === 'medium' ? 500 : 850));

    if (tab === 'skills') return; // calm gradient only (like a sheet of paper)

    const canvas = document.createElement('canvas');
    let gl = null;
    try { gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return;

    const VS = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;
    const FS = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uPx;
uniform vec3 uColor; uniform vec3 uGrad1; uniform vec3 uGrad2;
uniform float uAspect;
uniform vec2 uClick[10]; uniform float uClickT[10];
out vec4 outColor;
float hash21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float Bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0)), c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * 0.25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float px = max(1.0, uPx);
  vec2 pixelUV = fract(gl_FragCoord.xy / px);
  float cellPx = 8.0 * px;
  vec2 cellId = floor(gl_FragCoord.xy / cellPx);
  vec2 cellUv = (cellId * cellPx) / uRes;
  vec2 aUv = cellUv * vec2(uAspect, 1.0);
  float base = noise(aUv * 8.0 + uTime * 0.05) * 0.5 - 0.65;
  float feed = base + 0.45;
  for (int i = 0; i < 10; ++i){
    vec2 pos = uClick[i];
    if (pos.x < 0.0) continue;
    float t = max(uTime - uClickT[i], 0.0);
    if (t > 3.0) continue;
    vec2 cuv = (pos / uRes) * vec2(uAspect, 1.0);
    float r = distance(aUv, cuv);
    float ring = exp(-pow((r - 0.45 * t) / 0.12, 2.0));
    float atten = exp(-2.5 * t) * exp(-10.0 * r);
    feed = max(feed, ring * atten);
  }
  float bayer = Bayer8(gl_FragCoord.xy / px) - 0.5;
  float cov = step(0.5, feed + bayer);
  float M = maskCircle(pixelUV, cov);
  vec3 grad = mix(uGrad1, uGrad2, uv.y);
  vec3 col = mix(grad, uColor, M * 0.85);
  float fade = smoothstep(0.75, 0.8, length(uv - 0.5));
  outColor = vec4(mix(col, grad, fade), 1.0);
}`;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[bg] shader:', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[bg] link:', gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['uRes', 'uTime', 'uPx', 'uColor', 'uGrad1', 'uGrad2', 'uAspect', 'uClick', 'uClickT'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

    host.appendChild(canvas);
    const DPR_CAP = tier === 'low' ? 1 : tier === 'medium' ? 1.25 : 1.5;
    const FPS = tier === 'low' ? 24 : tier === 'medium' ? 40 : 60;
    const clicks = new Float32Array(20).fill(-1);
    const clickT = new Float32Array(10);
    let clickIdx = 0, W = 1, H = 1, dpr = 1, raf = 0, last = 0, lastMove = 0;
    const t0 = performance.now();
    const now = () => (performance.now() - t0) / 1000 * 0.9;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      W = Math.max(1, Math.floor(window.innerWidth * dpr));
      H = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
      redraw();
    }
    function render() {
      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uTime, reduced() ? 4.0 : now());
      gl.uniform1f(U.uPx, 3);
      gl.uniform1f(U.uAspect, W / H);
      gl.uniform3fv(U.uColor, cur.dot);
      gl.uniform3fv(U.uGrad1, cur.bg);
      gl.uniform3fv(U.uGrad2, cur.top);
      gl.uniform2fv(U.uClick, clicks);
      gl.uniform1fv(U.uClickT, clickT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    redraw = () => { if (reduced() || !raf) render(); };
    const loop = (ts) => {
      raf = requestAnimationFrame(loop);
      if (ts - last < 1000 / FPS - 1) return;
      last = ts;
      const t = now();
      for (let i = 0; i < 10; i++) if (clicks[i * 2] >= 0 && t - clickT[i] > 3) { clicks[i * 2] = -1; clicks[i * 2 + 1] = -1; }
      render();
    };
    function ripple(cx, cy) {
      if (reduced()) return;
      clicks[clickIdx * 2] = cx * dpr;
      clicks[clickIdx * 2 + 1] = (window.innerHeight - cy) * dpr;
      clickT[clickIdx] = now();
      clickIdx = (clickIdx + 1) % 10;
    }
    window.addEventListener('pointermove', (e) => { const n = performance.now(); if (n - lastMove < 130) return; lastMove = n; ripple(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('pointerdown', (e) => ripple(e.clientX, e.clientY), { passive: true });
    window.addEventListener('resize', resize);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; canvas.remove(); });
    resize();
    const start = () => { if (!raf && !reduced()) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', () => (reduced() ? (stop(), render()) : start()));
    render();
    start();
  })();

  /* ======================================================================
     7. Per-tab effects (home aura is pure CSS, in the HTML)
     ====================================================================== */
  (function tabEffects() {
    const host = $('.bg-effects');
    if (!host) return;
    const make = (cls) => {
      const d = document.createElement('div');
      d.className = `fx ${cls}`;
      const c = document.createElement('canvas');
      d.appendChild(c); host.appendChild(d);
      return c;
    };
    const ink = () => getComputedStyle(root).getPropertyValue('--text-3').trim() || 'rgba(170,180,200,0.7)';

    if (tab === 'projects' || tab === 'skills') {
      const c = make('fx-wavy');
      const ctx = c.getContext('2d');
      const draw = () => {
        const d = Math.min(window.devicePixelRatio || 1, 2);
        const w = host.clientWidth, h = host.clientHeight;
        c.width = w * d; c.height = h * d;
        ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = ink(); ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
        const step = Math.max(36 * Math.min(w / 800, h / 600), 22), amp = 14, f = 0.018;
        for (let x = 0; x <= w; x += step) {
          ctx.beginPath();
          for (let y = 0; y <= h; y += 2) { const xx = x + Math.sin(y * f) * amp; if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); }
          ctx.stroke();
        }
        for (let y = 0; y <= h; y += step) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 2) { const yy = y + Math.sin(x * f) * amp; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
          ctx.stroke();
        }
      };
      draw();
      window.addEventListener('resize', draw);
      document.addEventListener('themechange', draw);
    }

    if (tab === 'education') {
      const c = make('fx-dots');
      const ctx = c.getContext('2d');
      const gap = tier === 'low' ? 42 : tier === 'medium' ? 32 : 26;
      const R = 130, J = 24, K = 0.16;
      let dots = [], dirty = true, raf = 0, color = ink();
      const m = { x: -1e4, y: -1e4 };
      const build = () => {
        const d = Math.min(window.devicePixelRatio || 1, 2);
        const w = host.clientWidth, h = host.clientHeight;
        c.width = w * d; c.height = h * d;
        ctx.setTransform(d, 0, 0, d, 0, 0);
        dots = [];
        for (let r = 0; r < Math.ceil(h / gap); r++) {
          for (let q = 0; q < Math.ceil(w / gap); q++) {
            const ox = q * gap + gap / 2, oy = r * gap + gap / 2;
            dots.push({ ox, oy, cx: ox, cy: oy, rx: 0, ry: 0, on: false, col: q, row: r });
          }
        }
        dirty = true; kick();
      };
      const frame = () => {
        raf = 0;
        if (!dirty) return;
        const w = host.clientWidth, h = host.clientHeight;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = color; ctx.globalAlpha = 0.6;
        const mc = Math.floor(m.x / gap), mr = Math.floor(m.y / gap), span = Math.ceil(R / gap) + 1;
        let moving = false;
        ctx.beginPath();
        for (const p of dots) {
          let tx = p.ox, ty = p.oy;
          if (Math.abs(p.col - mc) <= span && Math.abs(p.row - mr) <= span && Math.hypot(m.x - p.ox, m.y - p.oy) < R) {
            if (!p.on) { p.rx = (Math.random() - 0.5) * J * 2; p.ry = (Math.random() - 0.5) * J * 2; p.on = true; }
            tx = p.ox + p.rx; ty = p.oy + p.ry;
          } else p.on = false;
          p.cx += (tx - p.cx) * K; p.cy += (ty - p.cy) * K;
          if (Math.abs(p.cx - tx) > 0.12 || Math.abs(p.cy - ty) > 0.12) moving = true;
          ctx.moveTo(p.cx + 1.2, p.cy);
          ctx.arc(p.cx, p.cy, 1.2, 0, Math.PI * 2);
        }
        ctx.fill();
        dirty = moving;
        if (dirty) kick();
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
      window.addEventListener('pointermove', (e) => { m.x = e.clientX; m.y = e.clientY; dirty = true; kick(); }, { passive: true });
      document.addEventListener('mouseleave', () => { m.x = m.y = -1e4; dirty = true; kick(); });
      window.addEventListener('resize', build);
      document.addEventListener('themechange', () => { color = ink(); dirty = true; kick(); });
      build();
    }
  })();

  /* ======================================================================
     8. Reveal on scroll (+ a staggered entrance for the first screen)
     ====================================================================== */
  (function reveals() {
    const els = $$('.reveal');
    if (!els.length || !('IntersectionObserver' in window) || reduced()) return;
    const vh = window.innerHeight;
    const first = [];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.remove('no-show');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.classList.add('no-show');
      if (r.top < vh * 0.96) first.push(el); else io.observe(el);
    });
    const show = () => first.forEach((el, i) => { el.style.setProperty('--rd', `${i * 70}ms`); el.classList.remove('no-show'); });
    const go = () => requestAnimationFrame(() => requestAnimationFrame(show));
    document.addEventListener('pt:lift', go, { once: true });
    // clear stagger delays after the entrance so hovers stay snappy
    setTimeout(() => first.forEach((el) => el.style.removeProperty('--rd')), 2200);
  })();

  /* ======================================================================
     9. Rotating quote stripes
     ====================================================================== */
  $$('.quote-stripe').forEach((q) => {
    const lines = $$('.quote-line', q);
    if (lines.length < 2) return;
    let i = 0;
    const set = () => lines.forEach((l, k) => {
      l.classList.toggle('is-before', k < i);
      l.classList.toggle('is-after', k > i);
      l.setAttribute('aria-hidden', String(k !== i));
    });
    set();
    setInterval(() => { if (!document.hidden) { i = (i + 1) % lines.length; set(); } }, 5200);
  });

  /* ======================================================================
     10. Ambient sound: a small generative pad synthesized live with
         WebAudio (no audio files). Remembers on/off across pages.
     ====================================================================== */
  const Ambient = (() => {
    let ctx = null, master = null, bus = null, playing = false, timer = 0, idx = 0;
    // slow progression, voiced low and wide: Cmaj9, Am9, Fmaj9, G6sus
    const CHORDS = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 48, 52, 55, 57], [43, 50, 55, 57, 62]];
    const SPARKLE = [72, 74, 76, 79, 81, 84];
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function impulse(sec, decay) {
      const rate = ctx.sampleRate, len = Math.floor(rate * sec), b = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return b;
    }
    function build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.05; comp.release.value = 0.4;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; lp.Q.value = 0.3;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.045;
      const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 420;
      lfo.connect(lfoAmt).connect(lp.frequency); lfo.start();
      const rev = ctx.createConvolver(); rev.buffer = impulse(4.5, 2.4);
      const wet = ctx.createGain(); wet.gain.value = 0.62;
      const dry = ctx.createGain(); dry.gain.value = 0.5;
      lp.connect(dry).connect(comp);
      lp.connect(rev).connect(wet).connect(comp);
      comp.connect(master).connect(ctx.destination);
      bus = lp;
      return true;
    }
    function chord(notes, t, dur) {
      notes.forEach((m, i) => {
        [0, 1].forEach((v) => {
          const o = ctx.createOscillator();
          o.type = v ? 'triangle' : 'sine';
          o.frequency.value = hz(m);
          o.detune.value = (v ? 7 : -5) + (Math.random() * 4 - 2);
          const g = ctx.createGain();
          const peak = (v ? 0.018 : 0.034) * (i === 0 ? 1.25 : 1);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(peak, t + 2.6);
          g.gain.setValueAtTime(peak, t + dur - 0.4);
          g.gain.linearRampToValueAtTime(0, t + dur + 3.0);
          o.connect(g).connect(bus);
          o.start(t); o.stop(t + dur + 3.2);
        });
      });
      if (Math.random() < 0.85) {
        const st = t + 1.2 + Math.random() * (dur - 2.4);
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(SPARKLE[(Math.random() * SPARKLE.length) | 0]);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.026, st + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 3.6);
        o.connect(g).connect(bus); o.start(st); o.stop(st + 3.7);
      }
    }
    function loop() {
      if (!playing) return;
      const dur = 8;
      chord(CHORDS[idx % CHORDS.length], ctx.currentTime + 0.08, dur);
      idx++;
      timer = setTimeout(loop, dur * 1000 - 120);
    }
    let want = false;
    // the chord loop only runs while the context is actually running: a context
    // created without a user gesture stays suspended, and its clock stands still
    function begin() { if (want && !playing && ctx.state === 'running') { playing = true; loop(); } }
    function start() {
      if (!ctx) {
        if (!build()) return false;
        ctx.onstatechange = begin;
      }
      want = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.9);
      if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
      begin();
      return true;
    }
    function stop() {
      want = false;
      playing = false;
      clearTimeout(timer);
      if (ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.35); }
    }
    return { start, stop, get on() { return playing; }, get running() { return !!ctx && ctx.state === 'running'; } };
  })();

  (function soundUI() {
    const wrap = $('.sound-toggle-wrap');
    const btn = wrap && $('.sound-toggle', wrap);
    if (!btn) return;
    const label = $('.sound-label', wrap);
    let on = false, hint = null;
    if (store.get('sound-clicked') === '1') wrap.dataset.clicked = 'true';
    const render = () => {
      wrap.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      if (label) label.textContent = on ? 'ambient · live synth' : '';
    };
    const dropHint = () => { if (hint) { hint.remove(); hint = null; } };
    function set(v, persist) {
      on = v && Ambient.start();
      if (!v) Ambient.stop();
      render();
      if (persist) {
        store.set('sound-state', on ? 'on' : 'off', session);
        store.set('sound-clicked', '1');
        wrap.dataset.clicked = 'true';
      }
      dropHint();
    }
    btn.addEventListener('click', () => set(!on, true));
    // remember across page loads: try to carry on straight away (allowed when the
    // browser still counts the click that navigated here); otherwise the music
    // resumes on the first click or key press on the new page
    if (session && store.get('sound-state', session) === 'on') {
      set(true, false);
      const resume = (e) => {
        if (wrap.contains(e.target)) return;
        window.removeEventListener('pointerdown', resume, true);
        window.removeEventListener('keydown', resume, true);
        if (on) Ambient.start();
      };
      setTimeout(() => {
        if (on && !Ambient.running) {
          window.addEventListener('pointerdown', resume, true);
          window.addEventListener('keydown', resume, true);
        }
      }, 350);
    }
    if (wrap.dataset.clicked !== 'true') {
      setTimeout(() => {
        if (on || wrap.dataset.clicked === 'true') return;
        hint = document.createElement('span');
        hint.className = 'sound-hint';
        hint.setAttribute('role', 'status');
        hint.innerHTML = 'Want some ambient music? <kbd>&#9834;</kbd>';
        wrap.insertBefore(hint, btn);
        setTimeout(dropHint, 9000);
      }, 2400);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && on) Ambient.stop();
      else if (!document.hidden && on) Ambient.start();
    });
  })();

  /* ======================================================================
     11. "Hey, come back!" when the tab is hidden
     ====================================================================== */
  (function awayTitle() {
    const title = document.title;
    const fav = $('#favicon');
    const href = fav ? fav.getAttribute('href') : '';
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        document.title = 'Hey, come back!';
        root.style.setProperty('--bg-sat', '0.18');
        if (fav) fav.setAttribute('href', '/assets/img/favicon-away.svg');
      } else {
        document.title = title;
        root.style.setProperty('--bg-sat', '1');
        if (fav) fav.setAttribute('href', href);
      }
    });
  })();

  /* ======================================================================
     12. Scroll-pinned slideshow + side rail (experience page)
     ====================================================================== */
  $$('[data-scrolly]').forEach((sc) => {
    const details = $$('.sd-item', sc);
    const visuals = $$('.sv-item', sc);
    const rail = $('.ssn-rail', sc);
    const dots = rail ? $$('.ssn-dot', rail) : [];
    const skip = rail ? $('.ssn-skip', rail) : null;
    const n = details.length;
    if (!n) return;
    sc.style.setProperty('--n', String(n));
    const mq = window.matchMedia('(max-width: 880px)');
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    let raf = 0, active = -1;
    const geom = () => {
      const r = sc.getBoundingClientRect();
      return { top: r.top + window.scrollY, total: Math.max(1, r.height - window.innerHeight), r };
    };
    function update() {
      raf = 0;
      if (mq.matches) {
        details.forEach((d) => { d.style.removeProperty('--o'); d.style.removeProperty('--ty'); d.dataset.active = 'true'; });
        if (rail) rail.classList.remove('is-visible');
        return;
      }
      const { total, r } = geom();
      const p = clamp(-r.top / total, 0, 1);
      const raw = p * (n - 1);
      const i0 = Math.min(Math.floor(raw), Math.max(0, n - 2));
      const pos = n > 1 ? i0 + smooth(0.28, 0.72, raw - i0) : 0;
      const base = Math.floor(pos);
      const frac = pos - base;
      const look = (k) => {
        if (n === 1) return { o: 1, ty: 0 };
        if (k === base) return { o: clamp(1 - frac * 1.6, 0, 1), ty: -frac * 14 };
        if (k === base + 1) return { o: clamp(frac * 1.6 - 0.6, 0, 1), ty: (1 - frac) * 14 };
        return { o: 0, ty: k < pos ? -14 : 14 };
      };
      details.forEach((d, k) => {
        const s = look(k);
        d.style.setProperty('--o', s.o.toFixed(3));
        d.style.setProperty('--ty', `${s.ty.toFixed(2)}%`);
        d.dataset.active = String(s.o > 0.5);
      });
      visuals.forEach((v, k) => {
        const s = look(k);
        v.style.setProperty('--o', s.o.toFixed(3));
        v.style.setProperty('--ty', `${(s.ty * 0.5).toFixed(2)}%`);
        v.style.setProperty('--rot', `${((k - pos) * 5).toFixed(2)}deg`);
        v.style.setProperty('--sc', (1 - Math.min(1, Math.abs(k - pos)) * 0.06).toFixed(3));
      });
      const a = Math.round(pos);
      if (a !== active) {
        active = a;
        dots.forEach((d, k) => { d.classList.toggle('is-active', k === a); if (k === a) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      }
      if (rail) rail.classList.toggle('is-visible', r.top < window.innerHeight * 0.4 && r.bottom > window.innerHeight * 0.6);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    dots.forEach((d, k) => d.addEventListener('click', () => {
      const { top, total } = geom();
      const target = top + (n > 1 ? (k / (n - 1)) * total : 0);
      window.scrollTo({ top: target, behavior: reduced() ? 'auto' : 'smooth' });
    }));
    if (skip) skip.addEventListener('click', () => {
      const { top, r } = geom();
      window.scrollTo({ top: top + r.height - window.innerHeight * 0.25, behavior: reduced() ? 'auto' : 'smooth' });
    });
    update();
  });

  /* ======================================================================
     13. Marquee rows: repeat items until a set fills the row, then clone it
     ====================================================================== */
  $$('.mq-track').forEach((track) => {
    const originals = Array.from(track.children);
    if (!originals.length) return;
    const row = track.parentElement;
    const mark = (el) => {
      el.classList.add('mq-clone');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('tabindex', '-1');
      $$('a, button', el).forEach((x) => x.setAttribute('tabindex', '-1'));
      return el;
    };
    let guard = 0;
    while (track.scrollWidth < row.clientWidth + 360 && guard++ < 8) originals.forEach((o) => track.appendChild(mark(o.cloneNode(true))));
    Array.from(track.children).forEach((o) => track.appendChild(mark(o.cloneNode(true))));
    const px = track.scrollWidth / 2;
    track.style.setProperty('--mq-dur', `${Math.max(30, px / 22)}s`);
  });

  /* ======================================================================
     14. Case-study dialogs (native <dialog>, deep-linkable #case-<id>)
     ====================================================================== */
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
  $$('[data-case]').forEach((b) => b.addEventListener('click', (e) => { if (openCase(b.dataset.case, b)) e.preventDefault(); }));
  $$('dialog.cs').forEach((dlg) => {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('close', () => {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
      if (lastOpener && document.contains(lastOpener)) lastOpener.focus({ preventScroll: true });
    });
  });
  if (location.hash.indexOf('#case-') === 0) {
    const id = location.hash.slice(6);
    if (root.dataset.ptIncoming === 'true') document.addEventListener('pt:revealed', () => openCase(id), { once: true });
    else openCase(id);
  }
  // same-page links such as <a href="#case-iot"> change only the hash
  window.addEventListener('hashchange', () => { if (location.hash.indexOf('#case-') === 0) openCase(location.hash.slice(6)); });

  /* ======================================================================
     15. Waffle chart: one square per student
     ====================================================================== */
  $$('[data-waffle]').forEach((w) => {
    const n = parseInt(w.dataset.waffle, 10) || 100;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) { const sq = document.createElement('i'); sq.style.setProperty('--i', String(i)); frag.appendChild(sq); }
    w.appendChild(frag);
    if ('IntersectionObserver' in window && !reduced()) {
      const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { w.classList.add('in'); io.disconnect(); } }, { threshold: 0.35 });
      io.observe(w);
    } else w.classList.add('in');
  });

  /* footer year */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* expose a tiny API for page scripts */
  window.Site = { tier, reduced, store, go: PT.go, openCase };

  /* reveal the page once the DOM is ready (runs after paint, see inline head script) */
  requestAnimationFrame(() => requestAnimationFrame(PT.reveal));
})();
