/*!
 * piano.js · "play me a chord". One octave (C4 to C5) on a triangle-wave synth
 * built with the Web Audio API (no samples, no libraries). Mouse, touch or
 * keyboard (A–K white keys, W E T Y U black keys). It also names the chord
 * you are holding, from the set of pitch classes.
 */
(() => {
  'use strict';
  const box = document.querySelector('[data-piano]');
  if (!box) return;
  const keys = Array.from(box.querySelectorAll('.key[data-note]'));
  const outNotes = box.querySelector('.pr-notes');
  const outChord = box.querySelector('.pr-chord');
  const KEYMAP = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72 };
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const CHORDS = [
    [[0, 4, 7, 11], 'major seventh'], [[0, 4, 7, 10], 'dominant seventh'], [[0, 3, 7, 10], 'minor seventh'],
    [[0, 3, 6, 10], 'half-diminished'], [[0, 4, 7], 'major'], [[0, 3, 7], 'minor'], [[0, 3, 6], 'diminished'],
    [[0, 4, 8], 'augmented'], [[0, 5, 7], 'sus4'], [[0, 2, 7], 'sus2'], [[0, 7], 'power chord (fifth)'],
  ];
  const INTERVALS = ['unison', 'minor second', 'major second', 'minor third', 'major third', 'perfect fourth', 'tritone', 'perfect fifth', 'minor sixth', 'major sixth', 'minor seventh', 'major seventh', 'octave'];

  let ctx = null, master = null;
  const voices = new Map(); // midi -> { osc, gain }
  const held = new Set();
  const byNote = new Map(keys.map((k) => [Number(k.dataset.note), k]));

  function audio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.32;
    lp.connect(comp).connect(master).connect(ctx.destination);
    master.input = lp;
    return ctx;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function noteOn(m) {
    if (held.has(m)) return;
    held.add(m);
    const k = byNote.get(m);
    if (k) k.classList.add('is-on');
    const ac = audio();
    if (ac) {
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = hz(m);
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.35);
      osc.connect(gain).connect(master.input);
      osc.start(t);
      voices.set(m, { osc, gain });
    }
    describe();
  }
  function noteOff(m) {
    if (!held.has(m)) return;
    held.delete(m);
    const k = byNote.get(m);
    if (k) k.classList.remove('is-on');
    const v = voices.get(m);
    if (v && ctx) {
      const t = ctx.currentTime;
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), t);
      v.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      v.osc.stop(t + 0.65);
      voices.delete(m);
    }
    describe();
  }

  function describe() {
    const notes = [...held].sort((a, b) => a - b);
    if (outNotes) outNotes.textContent = notes.length ? notes.map((m) => NAMES[m % 12]).join(' · ') : '–';
    if (!outChord) return;
    if (notes.length === 0) { outChord.textContent = 'play two or more notes'; return; }
    if (notes.length === 1) { outChord.textContent = `${NAMES[notes[0] % 12]}${Math.floor(notes[0] / 12) - 1}`; return; }
    if (notes.length === 2) { outChord.textContent = INTERVALS[Math.min(12, notes[1] - notes[0])]; return; }
    const pcs = [...new Set(notes.map((m) => m % 12))];
    for (const [shape, name] of CHORDS) {
      for (const root of pcs) {
        const set = new Set(pcs.map((p) => (p - root + 12) % 12));
        if (set.size === shape.length && shape.every((s) => set.has(s))) {
          const bass = notes[0] % 12;
          outChord.textContent = `${NAMES[root]} ${name}${bass !== root ? ` / ${NAMES[bass]} in the bass` : ''}`;
          return;
        }
      }
    }
    outChord.textContent = 'a cluster with no common name';
  }

  // pointer: press, glide across keys while held, release anywhere
  let down = false;
  keys.forEach((k) => {
    const m = Number(k.dataset.note);
    k.addEventListener('pointerdown', (e) => { e.preventDefault(); down = true; noteOn(m); });
    k.addEventListener('pointerenter', () => { if (down) noteOn(m); });
    k.addEventListener('pointerleave', () => { if (down) noteOff(m); });
    k.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); noteOn(m); } });
    k.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') noteOff(m); });
  });
  const releaseAll = () => { down = false; [...held].forEach(noteOff); };
  window.addEventListener('pointerup', () => { if (down) releaseAll(); });
  window.addEventListener('blur', releaseAll);

  // computer keyboard, only while the piano is on screen and nobody is typing
  let onScreen = false;
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; if (!onScreen) releaseAll(); }, { threshold: 0.2 }).observe(box);
  const typing = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  document.addEventListener('keydown', (e) => {
    if (!onScreen || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    const m = KEYMAP[e.key.toLowerCase()];
    if (m !== undefined) { e.preventDefault(); noteOn(m); }
  });
  document.addEventListener('keyup', (e) => {
    const m = KEYMAP[e.key.toLowerCase()];
    if (m !== undefined) noteOff(m);
  });
  describe();
})();
