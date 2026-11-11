/* ============================================================
   PAUL — PORTFOLIO ENGINE
   wireframe console · dark/light · live canvas · cloud projects
   ============================================================ */
'use strict';

/* ---------- 0 · CONFIG ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDMSgb-0uvwkgghI_VViWhbMhgMcvd4O74",
  authDomain: "paulsportfolio.firebaseapp.com",
  projectId: "paulsportfolio",
  storageBucket: "paulsportfolio.firebasestorage.app",
  messagingSenderId: "978444249147",
  appId: "1:978444249147:web:0706b95b50cdbf1f86d41e"
};
const IMGBB_API_KEY = "d2f5e9da99064c41bdf0f8feafd5d741";
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
const ADMIN_PASSWORD = 'paul2023';
const CONTACT_EMAIL = 'jpaulcipriano@gmail.com';

let db = null;
try { if (window.firebase) { firebase.initializeApp(firebaseConfig); db = firebase.firestore(); } }
catch (e) { console.warn('Firebase unavailable:', e); }
if (window.emailjs && !EMAILJS_PUBLIC_KEY.startsWith('YOUR_')) { try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch (e) {} }

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- 1 · THEME (dark / light) ---------- */
(function () {
  const root = document.documentElement;
  const btn = $('#themeToggle');
  function apply(t, announce) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('paul-theme', t); } catch (e) {}
    if (btn) {
      btn.setAttribute('aria-pressed', String(t === 'light'));
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = t === 'dark' ? '#0A0D14' : '#F4F2EB';
    document.dispatchEvent(new CustomEvent('themechange'));
    if (announce) toast(t === 'dark' ? 'DARK MODE ●' : 'LIGHT MODE ○');
  }
  apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
  if (btn) btn.addEventListener('click', () => apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    let saved = null; try { saved = localStorage.getItem('paul-theme'); } catch (err) {}
    if (!saved) apply(e.matches ? 'light' : 'dark', false);
  });
})();

/* ---------- 2 · NAV / SCROLL / REVEAL ---------- */
(function () {
  const navbar = $('#navbar'), progress = $('#scrollProgress');
  const menuToggle = $('#menuToggle'), navLinks = $('#navLinks');
  function onScroll() {
    if (navbar) navbar.classList.toggle('is-scrolled', scrollY > 10);
    if (progress) {
      const h = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
    }
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.innerHTML = open ? '<i class="fas fa-xmark"></i>' : '<i class="fas fa-bars"></i>';
    });
    $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
      navLinks.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }));
    addEventListener('resize', () => { if (innerWidth > 768) navLinks.classList.remove('active'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') navLinks.classList.remove('active'); });
  }

  const links = $$('.nav-links a[href^="#"]').filter(a => !a.classList.contains('nav-cta'));
  const secObs = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-40% 0px -55% 0px' });
  $$('main section[id]').forEach(s => secObs.observe(s));

  const revObs = new IntersectionObserver(es => es.forEach((en, i) => {
    if (en.isIntersecting) { setTimeout(() => en.target.classList.add('visible'), i * 70); revObs.unobserve(en.target); }
  }), { threshold: 0.12 });
  $$('.fade-in').forEach(el => revObs.observe(el));

  const glow = $('#cursorGlow');
  if (glow && matchMedia('(pointer: fine)').matches && !reducedMotion) {
    document.addEventListener('mousemove', e => {
      glow.style.opacity = '1';
      glow.style.transform = `translate(${e.clientX - 170}px, ${e.clientY - 170}px)`;
    }, { passive: true });
    document.addEventListener('mouseleave', () => glow.style.opacity = '0');
  }
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
})();

/* ---------- 3 · TYPING ---------- */
(function () {
  const el = $('#typed-text'); if (!el) return;
  const words = ["Customer Service Rep", "Technical Support Specialist", "Web Developer", "Problem Solver"];
  let wi = 0, ci = 0, del = false;
  (function type() {
    const w = words[wi];
    ci += del ? -1 : 1;
    el.textContent = w.substring(0, ci);
    let speed = del ? 45 : 95;
    if (!del && ci === w.length) { speed = 2000; del = true; }
    else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; speed = 450; }
    setTimeout(type, speed);
  })();
})();

/* ---------- 4 · COUNTERS + WORK PIPELINE ---------- */
(function () {
  $$('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
    const obs = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; obs.disconnect();
      if (reducedMotion) { el.textContent = target + suf; return; }
      const t0 = performance.now(), dur = 1400;
      (function tick(now) {
        const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }), { threshold: 0.4 });
    obs.observe(el);
  });

  const steps = $$('.step');
  const idx = $('#workIndex'), comp = $('#workCompany'), role = $('#workRole'), bar = $('#workBar');
  if (steps.length && idx) {
    const obs = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      steps.forEach(s => s.classList.toggle('is-active', s === el));
      idx.textContent = el.dataset.index.padStart(2, '0');
      comp.textContent = el.dataset.company;
      role.textContent = el.dataset.role;
      bar.style.width = (parseInt(el.dataset.index, 10) / steps.length * 100) + '%';
    }), { rootMargin: '-42% 0px -52% 0px' });
    steps.forEach(s => obs.observe(s));
  }
})();

/* ---------- 5 · LIVE CANVAS SCENE (wireframe headset) ---------- */
(function () {
  const canvas = $('#sceneCanvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const stage = canvas.parentElement;
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  }
  new ResizeObserver(resize).observe(stage); resize();

  const S = { yaw: .6, pitch: -.16, yawT: .6, pitchT: -.16, zoom: 1, speed: .6, signal: 60, grid: true, glow: true, mode: 'wire', dragging: false };

  /* geometry — built once */
  function buildHeadset() {
    const verts = [], faces = [], edges = [];
    const addV = (x, y, z) => (verts.push([x, y, z]), verts.length - 1);
    const quad = (a, b, c, d) => faces.push([a, b, c, d]);
    const R = 1.02, tube = .055, arcSeg = 26, tubeSeg = 8;
    let prev = null;
    for (let i = 0; i <= arcSeg; i++) {
      const t = Math.PI * i / arcSeg, nx = Math.cos(t), ny = Math.sin(t);
      const cx = nx * R, cy = ny * R, ring = [];
      for (let j = 0; j < tubeSeg; j++) {
        const a = 2 * Math.PI * j / tubeSeg;
        ring.push(addV(cx + Math.cos(a) * tube * nx, cy + Math.cos(a) * tube * ny, Math.sin(a) * tube));
      }
      if (prev) for (let j = 0; j < tubeSeg; j++) quad(prev[j], prev[(j + 1) % tubeSeg], ring[(j + 1) % tubeSeg], ring[j]);
      prev = ring;
    }
    function cup(side) {
      const cx = side * (R + .06), cy = -.04, r = .34, h = .16, seg = 18;
      const outer = [], inner = [];
      for (let j = 0; j < seg; j++) {
        const a = 2 * Math.PI * j / seg, y = cy + Math.cos(a) * r, z = Math.sin(a) * r;
        outer.push(addV(cx + side * h / 2, y, z)); inner.push(addV(cx - side * h / 2, y, z));
      }
      for (let j = 0; j < seg; j++) quad(outer[j], outer[(j + 1) % seg], inner[(j + 1) % seg], inner[j]);
      const co = addV(cx + side * h / 2, cy, 0), ci = addV(cx - side * h / 2, cy, 0);
      for (let j = 0; j < seg; j++) { faces.push([co, outer[j], outer[(j + 1) % seg]]); faces.push([ci, inner[(j + 1) % seg], inner[j]]); }
    }
    cup(1); cup(-1);
    const boom = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      boom.push(addV(-R - .06 + t * .55, -.1 - Math.sin(t * Math.PI * .5) * .62, .1 + t * .5));
    }
    const end = verts[boom[boom.length - 1]], mr = .09, lat = 6, lon = 8, sph = [];
    for (let i = 0; i <= lat; i++) {
      const ph = Math.PI * i / lat, row = [];
      for (let j = 0; j < lon; j++) {
        const th = 2 * Math.PI * j / lon;
        row.push(addV(end[0] + mr * Math.sin(ph) * Math.cos(th), end[1] + mr * Math.cos(ph), end[2] + mr * Math.sin(ph) * Math.sin(th)));
      }
      sph.push(row);
    }
    for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) quad(sph[i][j], sph[i][(j + 1) % lon], sph[i + 1][(j + 1) % lon], sph[i + 1][j]);
    const seen = new Set();
    faces.forEach(f => { for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length], key = a < b ? a + '_' + b : b + '_' + a; if (!seen.has(key)) { seen.add(key); edges.push([a, b]); } } });
    for (let i = 0; i < boom.length - 1; i++) edges.push([boom[i], boom[i + 1]]);
    return { verts, faces, edges, mic: end };
  }
  const G = buildHeadset();

  /* particles */
  let P = [];
  function seed(n) {
    while (P.length < n) P.push({ r: 1.7 + Math.random() * 1.1, a: Math.random() * Math.PI * 2, y: -1.2 + Math.random() * 2.6, sp: .08 + Math.random() * .22, ph: Math.random() * 6.28, size: 1.4 + Math.random() * 1.8, hue: Math.random() });
    P.length = n;
  }
  seed(S.signal);

  /* palette */
  const hex = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  let C = {};
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const g = k => cs.getPropertyValue(k).trim();
    C = { accent: hex(g('--accent') || '#5B8CFF'), cyan: hex(g('--cyan') || '#22C8E8'), amber: hex(g('--amber') || '#FFB224'), surface: hex(g('--surface') || '#111726'), bg: g('--bg') || '#0A0D14', line: g('--line-2') || 'rgba(148,163,199,.28)', grid: g('--grid') || 'rgba(91,140,255,.08)' };
  }
  readPalette();
  document.addEventListener('themechange', readPalette);
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  /* pulses from mic */
  let pulses = [], lastPulse = 0;

  function draw(time) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
    const f = Math.min(W, H) * 1.35 * S.zoom, d = 4.6;
    const proj = (x, y, z) => {
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const s = f / (z2 + d);
      return [W / 2 + x1 * s, H / 2 - y1 * s, z2, x1, y1];
    };
    if (S.grid) {
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (let g = -3; g <= 3.01; g += .75) {
        let a = proj(g, -1.55, -3), b = proj(g, -1.55, 3);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        a = proj(-3, -1.55, g); b = proj(3, -1.55, g);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    /* particles */
    P.forEach(p => {
      const x = Math.cos(p.a) * p.r, z = Math.sin(p.a) * p.r, y = p.y + Math.sin(time + p.ph) * .08;
      const q = proj(x, y, z), s = 4.6 / (q[2] + d), r = p.size * s;
      const col = p.hue < .6 ? C.accent : (p.hue < .85 ? C.cyan : C.amber);
      if (S.glow) { ctx.fillStyle = rgba(col, .12); ctx.beginPath(); ctx.arc(q[0], q[1], r * 3, 0, 6.29); ctx.fill(); }
      ctx.fillStyle = rgba(col, .8); ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 6.29); ctx.fill();
    });
    /* object */
    const pts = G.verts.map(v => proj(v[0], v[1], v[2]));
    if (S.mode === 'wire') {
      const pass = (w, mul) => {
        ctx.lineWidth = w;
        G.edges.forEach(e => {
          const a = pts[e[0]], b = pts[e[1]];
          const al = clamp(1.15 - ((a[2] + b[2]) / 2 + d) / 9, .1, .85) * mul;
          ctx.strokeStyle = rgba(C.accent, al);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        });
      };
      if (S.glow) pass(3.2, .16);
      pass(1, 1);
    } else {
      const order = G.faces.map((fc, i) => {
        let z = 0; fc.forEach(v => z += pts[v][2]);
        return [z / fc.length, i];
      }).sort((a, b) => b[0] - a[0]);
      const L = [-.45, .75, -.5];
      order.forEach(([, i]) => {
        const fc = G.faces[i];
        const a = pts[fc[0]], b = pts[fc[1]], c = pts[fc[2]];
        const ux = b[3] - a[3], uy = b[4] - a[4], uz = b[2] - a[2];
        const vx = c[3] - a[3], vy = c[4] - a[4], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        const light = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const base = mix(C.surface, C.accent, .22);
        const col = base.map(v => clamp(v * (.45 + .8 * light), 0, 255));
        ctx.fillStyle = rgba(col, .97);
        ctx.strokeStyle = rgba(C.accent, .25); ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]);
        for (let k = 1; k < fc.length; k++) ctx.lineTo(pts[fc[k]][0], pts[fc[k]][1]);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      });
    }
    /* mic signal pulses */
    if (!reducedMotion && time - lastPulse > 2) { lastPulse = time; pulses.push(time); }
    pulses = pulses.filter(t => time - t < 1.6);
    const m = proj(G.mic[0], G.mic[1], G.mic[2]);
    pulses.forEach(t => {
      const p = (time - t) / 1.6;
      ctx.strokeStyle = rgba(C.green || C.accent, (1 - p) * .5);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(m[0], m[1], 8 + p * 64 * S.zoom, 0, 6.29); ctx.stroke();
    });
  }

  /* loop — single rAF, paused offscreen/hidden */
  let running = true, last = performance.now();
  new IntersectionObserver(es => es.forEach(en => running = en.isIntersecting), { threshold: 0 }).observe(stage);
  document.addEventListener('visibilitychange', () => last = performance.now());
  (function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!running || document.hidden) return;
    if (!S.dragging && !reducedMotion) S.yawT += dt * S.speed * .5;
    S.yaw += (S.yawT - S.yaw) * .08;
    S.pitch += (S.pitchT - S.pitch) * .08;
    if (!reducedMotion) P.forEach(p => p.a += p.sp * dt);
    draw(now / 1000);
  })(last);

  /* interaction */
  let px = 0, py = 0;
  canvas.addEventListener('pointerdown', e => { S.dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing'); });
  canvas.addEventListener('pointermove', e => {
    if (!S.dragging) return;
    S.yawT += (e.clientX - px) * .006;
    S.pitchT = clamp(S.pitchT + (e.clientY - py) * .005, -1.1, 1.1);
    px = e.clientX; py = e.clientY;
  });
  ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { S.dragging = false; canvas.classList.remove('grabbing'); }));
  canvas.addEventListener('dblclick', () => setMode(S.mode === 'wire' ? 'render' : 'wire'));
  canvas.addEventListener('wheel', e => { e.preventDefault(); S.zoom = clamp(S.zoom * (e.deltaY < 0 ? 1.06 : .94), .7, 1.6); sync(); }, { passive: false });
  canvas.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowLeft') { S.yawT -= .18; e.preventDefault(); }
    if (k === 'ArrowRight') { S.yawT += .18; e.preventDefault(); }
    if (k === 'ArrowUp') { S.pitchT = clamp(S.pitchT - .12, -1.1, 1.1); e.preventDefault(); }
    if (k === 'ArrowDown') { S.pitchT = clamp(S.pitchT + .12, -1.1, 1.1); e.preventDefault(); }
    if (k === ' ' || k === 'Enter') { setMode(S.mode === 'wire' ? 'render' : 'wire'); e.preventDefault(); }
  });

  /* controls */
  const elSpeed = $('#ctlSpeed'), elZoom = $('#ctlZoom'), elSignal = $('#ctlSignal'), elGrid = $('#ctlGrid'), elGlow = $('#ctlGlow');
  const bWire = $('#modeWire'), bRender = $('#modeRender');
  function setMode(m) {
    S.mode = m;
    bWire.classList.toggle('is-on', m === 'wire'); bWire.setAttribute('aria-pressed', String(m === 'wire'));
    bRender.classList.toggle('is-on', m === 'render'); bRender.setAttribute('aria-pressed', String(m === 'render'));
  }
  function sync() {
    elSpeed.value = S.speed; elZoom.value = S.zoom; elSignal.value = S.signal;
    elGrid.checked = S.grid; elGlow.checked = S.glow;
  }
  elSpeed.addEventListener('input', () => S.speed = parseFloat(elSpeed.value));
  elZoom.addEventListener('input', () => S.zoom = parseFloat(elZoom.value));
  elSignal.addEventListener('input', () => { S.signal = parseInt(elSignal.value, 10); seed(S.signal); });
  elGrid.addEventListener('change', () => S.grid = elGrid.checked);
  elGlow.addEventListener('change', () => S.glow = elGlow.checked);
  bWire.addEventListener('click', () => setMode('wire'));
  bRender.addEventListener('click', () => setMode('render'));
  $('#ctlReset').addEventListener('click', () => {
    Object.assign(S, { yawT: .6, pitchT: -.16, zoom: 1, speed: .6, signal: 60, grid: true, glow: true });
    seed(60); setMode('wire'); sync(); toast('SCENE RESET ⟲');
  });
  $('#ctlExport').addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = canvas.width; out.height = canvas.height;
    const octx = out.getContext('2d');
    octx.fillStyle = C.bg; octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0);
    const a = document.createElement('a');
    a.download = 'paul-headset-scene.png';
    a.href = out.toDataURL('image/png');
    a.click(); toast('SCENE EXPORTED ↓');
  });
  sync();
})();

/* ---------- 6 · PROJECTS CLOUD ---------- */
function getVideoEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  if (yt) return 'https://www.youtube.com/embed/' + yt[1];
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return 'https://player.vimeo.com/video/' + vm[1];
  return null;
}
function buildCard(id, proj) {
  const card = document.createElement('div');
  card.className = 'project-card glass-card fade-in visible';
  let html = '';
  const embed = getVideoEmbedUrl(proj.videoUrl);
  if (embed) html += `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin-bottom:16px;border:1px solid var(--line)"><iframe src="${esc(embed)}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen loading="lazy" title="${esc(proj.title)} video"></iframe></div>`;
  const images = proj.images || [];
  if (images.length) {
    html += `<div class="project-images-grid${images.length === 1 ? ' single-image' : ''}">`;
    images.forEach(u => html += `<img src="${esc(u)}" class="project-thumb" alt="${esc(proj.title)}" loading="lazy" onclick="openLightbox('${esc(u)}')" onerror="this.style.display='none'">`);
    html += '</div>';
  }
  html += `<h3>${esc(proj.title)}</h3><p class="project-desc" id="desc-${esc(id)}">${esc(proj.desc)}</p>`;
  if (proj.desc && proj.desc.length > 120) html += `<button class="read-more-btn" type="button" onclick="toggleDesc(this,'desc-${esc(id)}')">READ MORE</button>`;
  card.innerHTML = html;
  return card;
}
function projError(msg) {
  const grid = $('#projectsGrid');
  grid.innerHTML = `<div class="proj-state mono"><i class="fas fa-triangle-exclamation"></i> ${esc(msg)} <button class="btn btn-ghost btn-sm" data-retry type="button">Retry</button></div>`;
  const c = $('#projCount'); if (c) c.textContent = '— / —';
}
function loadProjects() {
  const grid = $('#projectsGrid'); if (!grid) return;
  grid.innerHTML = '<div class="proj-state mono"><i class="fas fa-circle-notch fa-spin"></i> LOADING PROJECTS FROM CLOUD…</div>';
  if (!db) { projError('CLOUD CONNECTION UNAVAILABLE.'); return; }
  db.collection('projects').orderBy('timestamp', 'desc').get().then(snap => {
    grid.innerHTML = '';
    const c = $('#projCount');
    if (c) c.textContent = String(snap.size).padStart(2, '0') + ' / ' + String(snap.size).padStart(2, '0');
    if (snap.empty) { grid.innerHTML = '<div class="proj-state mono">NO PROJECTS YET — ADD SOME FROM THE ADMIN PANEL.</div>'; return; }
    snap.forEach(doc => grid.appendChild(buildCard(doc.id, doc.data())));
  }).catch(err => { console.error(err); projError('COULD NOT REACH THE PROJECT CLOUD.'); });
}
document.addEventListener('click', e => { if (e.target.closest('[data-retry]')) loadProjects(); });
window.toggleDesc = function (btn, id) {
  const el = document.getElementById(id); if (!el) return;
  const open = el.classList.toggle('expanded');
  btn.textContent = open ? 'READ LESS' : 'READ MORE';
};

/* ---------- 7 · ADMIN ---------- */
(function () {
  const modal = $('#adminModal'), trigger = $('#adminTrigger'), closeBtn = $('#closeAdmin');
  const login = $('#adminLogin'), dash = $('#adminDashboard'), loginBtn = $('#loginBtn'), pass = $('#adminPass');
  if (!modal) return;
  const open = () => modal.style.display = 'block';
  const close = () => modal.style.display = 'none';
  if (trigger) trigger.addEventListener('click', e => { e.preventDefault(); open(); });
  if (closeBtn) { closeBtn.addEventListener('click', close); closeBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }); }
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'block') close(); });
  if (new URLSearchParams(location.search).get('admin') === 'true') open();
  if (loginBtn) loginBtn.addEventListener('click', () => {
    if (pass.value === ADMIN_PASSWORD) { login.style.display = 'none'; dash.style.display = 'block'; loadAdminProjects(); }
    else { toast('INCORRECT PASSWORD ✕'); pass.value = ''; }
  });
  if (pass) pass.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });

  const title = $('#projTitle'), file = $('#projImageFile'), desc = $('#projDesc'), video = $('#projVideo');
  const save = $('#saveProjBtn'), cancel = $('#cancelEditBtn'), formTitle = $('#formTitle');
  const list = $('#adminProjList'), status = $('#uploadStatus');
  let editId = null;

  window.loadAdminProjects = function () {
    if (!list || !db) return;
    list.innerHTML = '<li style="justify-content:center">Loading…</li>';
    db.collection('projects').orderBy('timestamp', 'desc').get().then(snap => {
      list.innerHTML = '';
      if (snap.empty) { list.innerHTML = '<li style="justify-content:center">No projects in database yet.</li>'; return; }
      snap.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${esc(doc.data().title)}</span><div class="action-btns"><button class="edit-btn" type="button" onclick="editProject('${doc.id}')">EDIT</button><button class="delete-btn" type="button" onclick="deleteProject('${doc.id}')">DELETE</button></div>`;
        list.appendChild(li);
      });
    });
  };
  window.editProject = function (id) {
    db.collection('projects').doc(id).get().then(doc => {
      if (!doc.exists) return;
      const p = doc.data();
      title.value = p.title; desc.value = p.desc; if (video) video.value = p.videoUrl || '';
      file.value = ''; editId = id;
      formTitle.textContent = 'Edit Project'; save.textContent = 'Update Project'; cancel.style.display = 'inline-flex';
    });
  };
  if (cancel) cancel.addEventListener('click', () => {
    editId = null; title.value = ''; file.value = ''; desc.value = ''; if (video) video.value = '';
    formTitle.textContent = 'Add New Project'; save.textContent = 'Add Project';
    cancel.style.display = 'none'; status.style.display = 'none';
  });
  if (save) save.addEventListener('click', async () => {
    const t = title.value.trim(), d = desc.value.trim(), v = video ? video.value.trim() : '';
    if (!t || !d) { toast('TITLE + DESCRIPTION REQUIRED'); return; }
    if (!db) { toast('CLOUD UNAVAILABLE'); return; }
    save.textContent = 'Processing…'; save.disabled = true;
    let urls = [];
    if (editId && file.files.length === 0) {
      const doc = await db.collection('projects').doc(editId).get();
      if (doc.exists) urls = doc.data().images || [];
    }
    if (file.files.length) {
      status.style.display = 'block';
      for (let i = 0; i < file.files.length; i++) {
        status.textContent = `UPLOADING IMAGE ${i + 1} OF ${file.files.length}…`;
        const fd = new FormData(); fd.append('image', file.files[i]);
        try {
          const res = await fetch('https://api.imgbb.com/1/upload?key=' + IMGBB_API_KEY, { method: 'POST', body: fd });
          const data = await res.json();
          if (data.success) urls.push(data.data.url); else throw new Error(data.error ? data.error.message : 'Upload failed');
        } catch (err) {
          toast('UPLOAD FAILED: ' + err.message);
          save.textContent = editId ? 'Update Project' : 'Add Project'; save.disabled = false; status.style.display = 'none';
          return;
        }
      }
    }
    if (!urls.length) { toast('SELECT AT LEAST ONE IMAGE'); save.textContent = editId ? 'Update Project' : 'Add Project'; save.disabled = false; return; }
    const payload = { title: t, desc: d, images: urls, videoUrl: v, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    status.textContent = 'SAVING TO DATABASE…';
    const op = editId ? db.collection('projects').doc(editId).update(payload) : db.collection('projects').add(payload);
    op.then(() => {
      toast(editId ? 'PROJECT UPDATED ✓' : 'PROJECT ADDED ✓');
      if (editId) cancel.click(); else { title.value = ''; desc.value = ''; file.value = ''; if (video) video.value = ''; }
      loadProjects(); loadAdminProjects();
    }).catch(err => toast('SAVE FAILED: ' + err.message))
      .finally(() => setTimeout(() => { save.textContent = editId ? 'Update Project' : 'Add Project'; save.disabled = false; status.style.display = 'none'; }, 800));
  });
  window.deleteProject = function (id) {
    if (!confirm('Delete this project from the cloud?')) return;
    db.collection('projects').doc(id).delete().then(() => {
      if (editId === id) cancel.click();
      toast('PROJECT DELETED'); loadProjects(); loadAdminProjects();
    }).catch(err => toast('DELETE FAILED: ' + err.message));
  };
})();

/* ---------- 8 · LIGHTBOX ---------- */
(function () {
  const lb = $('#lightbox'), img = $('#lightboxImg'), close = $('#closeLightbox');
  if (!lb) return;
  window.openLightbox = function (src) { img.src = src; lb.style.display = 'flex'; document.body.style.overflow = 'hidden'; };
  function shut() { lb.style.display = 'none'; img.src = ''; document.body.style.overflow = ''; }
  if (close) { close.addEventListener('click', shut); close.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shut(); } }); }
  lb.addEventListener('click', e => { if (e.target === lb) shut(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && lb.style.display === 'flex') shut(); });
})();

/* ---------- 9 · CONTACT + COPY ---------- */
(function () {
  const copy = $('#copyEmail');
  if (copy) copy.addEventListener('click', async () => {
    const email = copy.dataset.email;
    try { await navigator.clipboard.writeText(email); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = email; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    }
    copy.textContent = 'COPIED ✓'; toast('EMAIL COPIED ✓');
    setTimeout(() => copy.textContent = 'COPY', 1800);
  });

  const form = $('#contactForm'); if (!form) return;
  const btn = $('#sendBtn'), status = $('#formStatus');
  const original = btn.innerHTML;
  function reset() { btn.innerHTML = original; btn.disabled = false; }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const name = fd.get('name'), email = fd.get('email'), type = fd.get('project_type'), msg = fd.get('message');
    btn.disabled = true; btn.innerHTML = 'Sending… <i class="fas fa-circle-notch fa-spin"></i>';
    status.className = 'form-status mono'; status.textContent = '';
    function mailto() {
      const subject = encodeURIComponent('Project brief — ' + type);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nProject type: ${type}\n\n${msg}`);
      location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      status.classList.add('ok');
      status.textContent = 'BRIEF DRAFTED ✓ — YOUR MAIL APP SHOULD OPEN WITH EVERYTHING PRE-FILLED.';
      reset();
    }
    if (window.emailjs && !EMAILJS_SERVICE_ID.startsWith('YOUR_')) {
      emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form)
        .then(() => { status.classList.add('ok'); status.textContent = 'BRIEF SENT ✓ — I WILL REPLY WITHIN 24 HOURS.'; form.reset(); reset(); toast('MESSAGE SENT ✓'); })
        .catch(err => { console.warn('EmailJS failed, using mailto:', err); mailto(); });
    } else mailto();
  });
})();

/* ---------- 10 · BOOT ---------- */
loadProjects();