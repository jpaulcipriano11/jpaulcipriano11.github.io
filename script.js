/* ============================================================
   PAUL — PORTFOLIO ENGINE
   (GPU scene lives in scene.js — this file owns everything else)
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

/* ---------- 1 · THEME ---------- */
(function () {
  const root = document.documentElement, btn = $('#themeToggle');
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

/* ---------- 5 · PROJECTS CLOUD ---------- */
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

/* ---------- 6 · ADMIN ---------- */
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

/* ---------- 7 · LIGHTBOX ---------- */
(function () {
  const lb = $('#lightbox'), img = $('#lightboxImg'), close = $('#closeLightbox');
  if (!lb) return;
  window.openLightbox = function (src) { img.src = src; lb.style.display = 'flex'; document.body.style.overflow = 'hidden'; };
  function shut() { lb.style.display = 'none'; img.src = ''; document.body.style.overflow = ''; }
  if (close) { close.addEventListener('click', shut); close.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shut(); } }); }
  lb.addEventListener('click', e => { if (e.target === lb) shut(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && lb.style.display === 'flex') shut(); });
})();

/* ---------- 8 · CONTACT + COPY ---------- */
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

/* ---------- 9 · BOOT ---------- */
loadProjects();