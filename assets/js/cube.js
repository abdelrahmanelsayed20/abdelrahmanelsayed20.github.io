/*!
 * cube.js · interactive Rubik's cube for the home hero (three.js).
 * Drag to spin (with inertia), click for a quarter turn; when idle it scrambles
 * itself one layer at a time. Pauses when off-screen or in a background tab.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/environments/RoomEnvironment.js/+esm';

const host = document.querySelector('.home-cube');
if (host) {
  try { init(host); } catch (err) { console.warn('[cube]', err); host.classList.add('no-webgl'); }
}

function roundedBox(size, radius, seg) {
  const g = new THREE.BoxGeometry(size, size, size, seg, seg, seg);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const v = new THREE.Vector3(), inner = new THREE.Vector3(), n = new THREE.Vector3();
  const h = size / 2 - radius;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    inner.set(THREE.MathUtils.clamp(v.x, -h, h), THREE.MathUtils.clamp(v.y, -h, h), THREE.MathUtils.clamp(v.z, -h, h));
    n.subVectors(v, inner);
    if (n.lengthSq() > 1e-10) {
      n.normalize();
      v.copy(inner).addScaledVector(n, radius);
      pos.setXYZ(i, v.x, v.y, v.z);
      nor.setXYZ(i, n.x, n.y, n.z); // exact normals: no seams on the rounded edges
    }
  }
  return g;
}

function stickerGeometry(size, radius) {
  const s = size / 2, r = radius;
  const shape = new THREE.Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s); shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r); shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s); shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r); shape.quadraticCurveTo(-s, -s, -s + r, -s);
  return new THREE.ShapeGeometry(shape, 6);
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.85)');
  grd.addColorStop(0.35, 'rgba(0,0,0,0.5)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0.15)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cssAccent() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  return v || '#5fa7ff';
}

function init(host) {
  const tier = document.documentElement.dataset.perfTier || 'high';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1 : tier === 'medium' ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('data-cursor', 'hover');
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(6.4, 4.4, 6.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xfff0d6, 1.15); key.position.set(6, 8, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9ab4ff, 0.18); fill.position.set(-5, -2, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(new THREE.Color(cssAccent()), 0.45); rim.position.set(-2, -3, -8); scene.add(rim);

  // colours: a palette pulled from the site accents
  const FACE = { px: '#5fa7ff', nx: '#f786be', py: '#f4f6fb', ny: '#b48cff', pz: '#45d6b8', nz: '#ffcb57' };
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: '#0b0f1a', metalness: 0.1, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.35 });
  const faceMats = Object.fromEntries(Object.entries(FACE).map(([k, c]) => [k, new THREE.MeshPhysicalMaterial({
    color: c, metalness: 0.02, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.15,
  })]));
  const bodyGeo = roundedBox(0.95, 0.1, 6);
  const stickerGeo = stickerGeometry(0.8, 0.13);

  const group = new THREE.Group();
  group.scale.setScalar(0.78);
  group.rotation.set(-0.42, 0.62, 0);
  scene.add(group);
  const pivot = new THREE.Object3D();
  group.add(pivot);

  const OUT = 0.476; // sticker offset from the cubie centre
  const cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const cubie = new THREE.Group();
    cubie.position.set(x, y, z);
    cubie.add(new THREE.Mesh(bodyGeo, bodyMat));
    const addSticker = (mat, px, py, pz, rx, ry) => {
      const m = new THREE.Mesh(stickerGeo, mat);
      m.position.set(px, py, pz);
      m.rotation.set(rx, ry, 0);
      cubie.add(m);
    };
    if (x === 1) addSticker(faceMats.px, OUT, 0, 0, 0, Math.PI / 2);
    if (x === -1) addSticker(faceMats.nx, -OUT, 0, 0, 0, -Math.PI / 2);
    if (y === 1) addSticker(faceMats.py, 0, OUT, 0, -Math.PI / 2, 0);
    if (y === -1) addSticker(faceMats.ny, 0, -OUT, 0, Math.PI / 2, 0);
    if (z === 1) addSticker(faceMats.pz, 0, 0, OUT, 0, 0);
    if (z === -1) addSticker(faceMats.nz, 0, 0, -OUT, 0, Math.PI);
    group.add(cubie);
    cubies.push(cubie);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 64),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.6 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.9;
  shadow.renderOrder = -1;
  scene.add(shadow);

  /* ---------- layer turns ---------- */
  const AXES = ['x', 'y', 'z'];
  const m4 = new THREE.Matrix4();
  let turn = null;
  let nextTurnAt = performance.now() + 1800 + Math.random() * 1200;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function startTurn(axis, layer, dir) {
    if (turn) return;
    const sel = cubies.filter((c) => Math.round(c.position[axis]) === layer);
    pivot.rotation.set(0, 0, 0);
    pivot.updateMatrixWorld(true);
    sel.forEach((c) => pivot.attach(c));
    turn = { axis, dir, sel, t0: performance.now(), dur: 460 };
  }
  function randomTurn() {
    startTurn(AXES[(Math.random() * 3) | 0], [-1, 0, 1][(Math.random() * 3) | 0], Math.random() < 0.5 ? 1 : -1);
  }
  function settle() {
    pivot.updateMatrixWorld(true);
    turn.sel.forEach((c) => {
      group.attach(c);
      c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
      // snap the orientation to the exact 90° rotation it should be
      m4.makeRotationFromQuaternion(c.quaternion);
      const e = m4.elements;
      for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) e[i] = Math.round(e[i]);
      c.quaternion.setFromRotationMatrix(m4);
    });
    turn = null;
    nextTurnAt = performance.now() + 2500 + Math.random() * 2000;
  }

  /* ---------- drag with inertia ---------- */
  const drag = { on: false, x: 0, y: 0, vx: 0, vy: 0, moved: 0 };
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    drag.on = true; drag.moved = 0; drag.x = e.clientX; drag.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    host.classList.add('is-dragged');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag.on) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.vy = dx * 0.005; drag.vx = dy * 0.005;
    group.rotation.y += drag.vy; group.rotation.x += drag.vx;
    drag.x = e.clientX; drag.y = e.clientY;
    wake();
  });
  const end = () => {
    if (!drag.on) return;
    drag.on = false;
    if (drag.moved < 6) randomTurn(); // a tap/click turns a layer
    wake();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  /* ---------- render loop (only while visible) ---------- */
  let visible = true, raf = 0, last = performance.now();
  const size = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!drag.on) {
      drag.vx *= 0.94; drag.vy *= 0.94;
      const calm = 1 - Math.min(1, (Math.abs(drag.vx) + Math.abs(drag.vy)) * 50);
      group.rotation.x += drag.vx;
      group.rotation.y += drag.vy + (reduce ? 0 : dt * 0.16 * calm);
    }
    group.position.y = reduce ? 0 : Math.sin(now * 0.0008) * 0.06;
    if (turn) {
      const t = Math.min(1, (now - turn.t0) / turn.dur);
      pivot.rotation[turn.axis] = turn.dir * (Math.PI / 2) * ease(t);
      if (t >= 1) settle();
    } else if (!reduce && !drag.on && now >= nextTurnAt) randomTurn();
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  new ResizeObserver(() => { size(); wake(); }).observe(host);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; wake(); }, { threshold: 0.01 }).observe(host);
  document.addEventListener('visibilitychange', wake);
  document.addEventListener('themechange', () => { rim.color.set(cssAccent()); wake(); });

  size();
  renderer.render(scene, camera);
  host.classList.add('is-ready');
  wake();
}
