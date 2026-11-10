// ==========================================
// 1. FIREBASE & API CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDMSgb-0uvwkgghI_VViWhbMhgMcvd4O74",
    authDomain: "paulsportfolio.firebaseapp.com",
    projectId: "paulsportfolio",
    storageBucket: "paulsportfolio.firebasestorage.app",
    messagingSenderId: "978444249147",
    appId: "1:978444249147:web:0706b95b50cdbf1f86d41e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const IMGBB_API_KEY = "d2f5e9da99064c41bdf0f8feafd5d741";

// Helper function to convert YouTube/Vimeo links to embed URLs
function getVideoEmbedUrl(url) {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
}

// ==========================================
// 2. UI ANIMATIONS & TYPING EFFECT
// ==========================================
const typedTextElement = document.getElementById('typed-text');
const textArray = ["Customer Service Rep", "Technical Support Specialist", "Web Developer", "Problem Solver"];
let textArrayIndex = 0, charIndex = 0, isDeleting = false;

function type() {
    const currentText = textArray[textArrayIndex];
    if (isDeleting) { typedTextElement.textContent = currentText.substring(0, charIndex - 1); charIndex--; } 
    else { typedTextElement.textContent = currentText.substring(0, charIndex + 1); charIndex++; }
    let typeSpeed = 100;
    if (isDeleting) typeSpeed /= 2;
    if (!isDeleting && charIndex === currentText.length) { typeSpeed = 2000; isDeleting = true; } 
    else if (isDeleting && charIndex === 0) { isDeleting = false; textArrayIndex = (textArrayIndex + 1) % textArray.length; typeSpeed = 500; }
    setTimeout(type, typeSpeed);
}

const cursorGlow = document.getElementById('cursorGlow');
if (window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener('mousemove', (e) => { cursorGlow.style.left = e.clientX + 'px'; cursorGlow.style.top = e.clientY + 'px'; }, { passive: true });
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => { if (entry.isIntersecting) { setTimeout(() => { entry.target.classList.add('visible'); }, index * 100); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle.addEventListener('click', () => { navLinks.classList.toggle('active'); });
document.querySelectorAll('.nav-links a').forEach(link => { link.addEventListener('click', () => { navLinks.classList.remove('active'); }); });

// ==========================================
// 3. ADMIN PANEL LOGIC
// ==========================================
const adminModal = document.getElementById('adminModal');
const adminTrigger = document.getElementById('adminTrigger');
const closeAdmin = document.getElementById('closeAdmin');
const adminLogin = document.getElementById('adminLogin');
const adminDashboard = document.getElementById('adminDashboard');
const loginBtn = document.getElementById('loginBtn');
const adminPass = document.getElementById('adminPass');

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('admin') === 'true') { openAdminModal(); }

adminTrigger.addEventListener('click', (e) => { e.preventDefault(); openAdminModal(); });
function openAdminModal() { adminModal.style.display = 'block'; }
closeAdmin.addEventListener('click', () => { adminModal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (e.target === adminModal) { adminModal.style.display = 'none'; } });

loginBtn.addEventListener('click', () => {
    if (adminPass.value === 'paul2023') {
        adminLogin.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadAdminProjects();
    } else { alert('Incorrect password!'); }
});

// ==========================================
// 4. PROJECTS & IMGBB UPLOAD MANAGEMENT
// ==========================================
let editDocId = null;
const projTitle = document.getElementById('projTitle');
const projImageFile = document.getElementById('projImageFile');
const projDesc = document.getElementById('projDesc');
const projVideo = document.getElementById('projVideo'); // NEW VIDEO INPUT
const saveProjBtn = document.getElementById('saveProjBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');
const projectsGrid = document.getElementById('projectsGrid');
const adminProjList = document.getElementById('adminProjList');
const uploadStatus = document.getElementById('uploadStatus');

function loadProjects() {
    projectsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-secondary);">Loading projects from cloud...</p>';
    db.collection("projects").orderBy("timestamp", "desc").get().then((querySnapshot) => {
        projectsGrid.innerHTML = '';
        if (querySnapshot.empty) {
            projectsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-secondary);">No projects added yet. Use the Admin panel to add some!</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const proj = doc.data();
            const images = proj.images || [];
            const card = document.createElement('div');
            card.className = 'project-card glass-card fade-in visible';
            
            // 1. Build Video HTML if URL exists
            let videoHtml = '';
            if (proj.videoUrl) {
                const embedUrl = getVideoEmbedUrl(proj.videoUrl);
                if (embedUrl) {
                    videoHtml = `
                        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--glass-border);">
                            <iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
                        </div>
                    `;
                }
            }

            // 2. Build Images HTML
            let imagesHtml = '';
            if (images.length > 0) {
                const gridClass = images.length === 1 ? 'project-images-grid single-image' : 'project-images-grid';
                imagesHtml = `<div class="${gridClass}">`;
                images.forEach(imgUrl => {
                    imagesHtml += `<img src="${imgUrl}" class="project-thumb" alt="${proj.title}" onclick="openLightbox('${imgUrl}')" onerror="this.style.display='none'">`;
                });
                imagesHtml += `</div>`;
            }

            // 3. Build Description and Button HTML
            let descHtml = `<p class="project-desc" id="desc-${doc.id}">${proj.desc}</p>`;
            let btnHtml = '';
            if (proj.desc && proj.desc.length > 120) {
                btnHtml = `<button class="read-more-btn" onclick="toggleDesc(this, 'desc-${doc.id}')">Read more</button>`;
            }

            // 4. Put it all together
            card.innerHTML = `${videoHtml}${imagesHtml}<h3>${proj.title}</h3>${descHtml}${btnHtml}`;
            projectsGrid.appendChild(card);
        });
    }).catch((error) => {
        console.error("Error getting documents: ", error);
        projectsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #ef4444;">Error loading projects. Check console.</p>';
    });
}

// Toggle Description Function (BULLETPROOF)
window.toggleDesc = function(btn, descId) {
    const descElement = document.getElementById(descId);
    if (descElement.classList.contains('expanded')) {
        descElement.classList.remove('expanded');
        btn.textContent = 'Read more';
    } else {
        descElement.classList.add('expanded');
        btn.textContent = 'Read less';
    }
};

function loadAdminProjects() {
    adminProjList.innerHTML = '<li style="justify-content:center;">Loading...</li>';
    db.collection("projects").orderBy("timestamp", "desc").get().then((querySnapshot) => {
        adminProjList.innerHTML = '';
        if (querySnapshot.empty) {
            adminProjList.innerHTML = '<li style="justify-content:center; color:var(--text-secondary);">No projects in database yet.</li>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const proj = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${proj.title}</span><div class="action-btns"><button class="edit-btn" onclick="editProject('${doc.id}')">Edit</button><button class="delete-btn" onclick="deleteProject('${doc.id}')">Delete</button></div>`;
            adminProjList.appendChild(li);
        });
    });
}

window.editProject = function(docId) {
    db.collection("projects").doc(docId).get().then((doc) => {
        if (doc.exists) {
            const proj = doc.data();
            projTitle.value = proj.title;
            projDesc.value = proj.desc;
            // Load the video URL into the input box
            if (projVideo) projVideo.value = proj.videoUrl || '';
            projImageFile.value = '';
            editDocId = docId;
            formTitle.textContent = 'Edit Project';
            saveProjBtn.textContent = 'Update Project';
            cancelEditBtn.style.display = 'inline-flex';
        }
    });
};

cancelEditBtn.addEventListener('click', () => {
    editDocId = null;
    projTitle.value = ''; projImageFile.value = ''; projDesc.value = '';
    if (projVideo) projVideo.value = '';
    formTitle.textContent = 'Add New Project';
    saveProjBtn.textContent = 'Add Project';
    cancelEditBtn.style.display = 'none';
    uploadStatus.style.display = 'none';
});

saveProjBtn.addEventListener('click', async () => {
    const title = projTitle.value.trim();
    const desc = projDesc.value.trim();
    const files = projImageFile.files;
    const videoUrl = projVideo ? projVideo.value.trim() : '';

    if (!title || !desc) { alert('Please fill in the title and description.'); return; }

    saveProjBtn.textContent = 'Processing...';
    saveProjBtn.disabled = true;
    let imageUrls = [];

    if (editDocId && files.length === 0) {
        const doc = await db.collection("projects").doc(editDocId).get();
        if (doc.exists) { imageUrls = doc.data().images || []; }
    }

    if (files.length > 0) {
        uploadStatus.style.display = 'block';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            uploadStatus.textContent = `Uploading image ${i + 1} of ${files.length}...`;
            const formData = new FormData();
            formData.append('image', file);
            try {
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const data = await response.json();
                if (data.success) { imageUrls.push(data.data.url); } 
                else { throw new Error(data.error ? data.error.message : 'Upload failed'); }
            } catch (error) {
                alert(`Image upload failed for ${file.name}: ${error.message}`);
                saveProjBtn.textContent = editDocId ? 'Update Project' : 'Add Project';
                saveProjBtn.disabled = false;
                uploadStatus.style.display = 'none';
                return;
            }
        }
        uploadStatus.textContent = 'All images uploaded successfully!';
    }

    if (imageUrls.length === 0) {
        alert('Please select at least one image to upload.');
        saveProjBtn.textContent = editDocId ? 'Update Project' : 'Add Project';
        saveProjBtn.disabled = false;
        uploadStatus.style.display = 'none';
        return;
    }

    const projectData = { 
        title, 
        images: imageUrls, 
        desc, 
        videoUrl: videoUrl, // Save the raw URL to Firebase
        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    };

    uploadStatus.textContent = 'Saving to database...';

    if (editDocId) {
        db.collection("projects").doc(editDocId).update(projectData).then(() => {
            alert('Project updated successfully!');
            cancelEditBtn.click();
            loadProjects(); loadAdminProjects();
        }).catch((error) => { alert('Error updating: ' + error.message); });
    } else {
        db.collection("projects").add(projectData).then(() => {
            alert('Project added successfully!');
            projTitle.value = ''; projImageFile.value = ''; projDesc.value = '';
            if (projVideo) projVideo.value = '';
            loadProjects(); loadAdminProjects();
        }).catch((error) => { alert('Error adding: ' + error.message); });
    }
    
    setTimeout(() => { 
        saveProjBtn.textContent = editDocId ? 'Update Project' : 'Add Project'; 
        saveProjBtn.disabled = false; 
        uploadStatus.style.display = 'none';
    }, 1000);
});

window.deleteProject = function(docId) {
    if (confirm('Are you sure you want to delete this project from the cloud?')) {
        db.collection("projects").doc(docId).delete().then(() => {
            if (editDocId === docId) { cancelEditBtn.click(); }
            loadProjects(); loadAdminProjects();
        }).catch((error) => { alert('Error deleting: ' + error.message); });
    }
}

// ==========================================
// 5. LIGHTBOX LOGIC
// ==========================================
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const closeLightbox = document.getElementById('closeLightbox');

window.openLightbox = function(src) {
    if (lightbox && lightboxImg) { lightboxImg.src = src; lightbox.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}
function closeLightboxFunc() {
    if (lightbox) { lightbox.style.display = 'none'; if (lightboxImg) lightboxImg.src = ''; document.body.style.overflow = ''; }
}
if (closeLightbox) { closeLightbox.addEventListener('click', closeLightboxFunc); }
if (lightbox) { lightbox.addEventListener('click', (e) => { if (e.target === lightbox) { closeLightboxFunc(); } }); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightbox && lightbox.style.display === 'flex') { closeLightboxFunc(); } });

// ==========================================
// 6. INITIAL LOAD & CONTACT FORM (EMAILJS)
// ==========================================
document.addEventListener('DOMContentLoaded', () => { loadProjects(); type(); });

document.getElementById('contactForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const btn = this.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    // ️ REPLACE WITH YOUR ACTUAL EMAILJS SERVICE ID AND TEMPLATE ID
    const serviceID = 'YOUR_SERVICE_ID'; 
    const templateID = 'YOUR_TEMPLATE_ID'; 

    emailjs.sendForm(serviceID, templateID, this)
        .then(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert('Message sent successfully! I will get back to you soon.');
            this.reset();
        }, (err) => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert('Failed to send message. Please try again or email me directly.');
            console.log('EmailJS FAILED...', err);
        });
});

// ==========================================
// 7. CONSTELLATION BACKGROUND (floating tech icons + dashed links)
// ==========================================
(function () {
  const host = document.getElementById('constellation');
  if (!host) return;

  // Muted, earth-tone brand colors matched to the Brand Kit
  const NODES = [
    { icon: 'fab fa-react',     color: '#4a6b7c', size: 46, x: 12, y: 26 },
    { icon: 'fab fa-html5',     color: '#8a4b3a', size: 44, x: 51, y: 16 },
    { icon: 'fab fa-css3-alt',  color: '#3e5c6b', size: 40, x: 16, y: 52 },
    { icon: 'fab fa-square-js', color: '#44543c', size: 42, x: 84, y: 21 },
    { icon: 'fab fa-git-alt',   color: '#7a4034', size: 38, x: 14, y: 84 },
    { icon: 'fab fa-github',    color: '#2b2a27', size: 40, x: 66, y: 90 },
    { icon: 'fab fa-node-js',   color: '#3f5a41', size: 42, x: 91, y: 76 },
    { icon: 'fab fa-wordpress', color: '#3e5c6b', size: 40, x: 72, y: 62 },
    { icon: 'fab fa-npm',       color: '#7a4034', size: 38, x: 40, y: 84 }
  ];

  // which icons the dashed lines connect
  const LINKS = [[0,1],[1,3],[0,2],[2,4],[4,8],[8,5],[5,6],[6,7],[3,7]];

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  host.appendChild(svg);

  const lines = LINKS.map(() => {
    const l = document.createElementNS(svgNS, 'line');
    l.setAttribute('stroke', 'rgba(26,25,22,0.28)');
    l.setAttribute('stroke-width', '1');
    l.setAttribute('stroke-dasharray', '3 7');
    svg.appendChild(l);
    return l;
  });

  const nodes = NODES.map(cfg => {
    const el = document.createElement('span');
    el.className = 'node';
    el.innerHTML = `<i class="${cfg.icon}" style="font-size:${cfg.size}px;color:${cfg.color}"></i>`;
    host.appendChild(el);
    return {
      el,
      x: cfg.x / 100, y: cfg.y / 100,
      vx: (Math.random() * 0.010 + 0.005) * (Math.random() < .5 ? -1 : 1),
      vy: (Math.random() * 0.010 + 0.005) * (Math.random() < .5 ? -1 : 1),
      depth: Math.random() * 0.5 + 0.2   // parallax strength
    };
  });

  let W = 0, H = 0, mx = 0, my = 0, cmx = 0, cmy = 0;
  const measure = () => { W = host.clientWidth; H = host.clientHeight; };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('mousemove', e => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function draw() {
    const pts = nodes.map(n => [n.x * W + cmx * n.depth * 40, n.y * H + cmy * n.depth * 40]);
    nodes.forEach((n, i) => {
      n.el.style.transform = `translate3d(${pts[i][0]}px, ${pts[i][1]}px, 0) translate(-50%, -50%)`;
    });
    LINKS.forEach(([a, b], i) => {
      const l = lines[i];
      l.setAttribute('x1', pts[a][0]); l.setAttribute('y1', pts[a][1]);
      l.setAttribute('x2', pts[b][0]); l.setAttribute('y2', pts[b][1]);
    });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  draw();
  if (reduced) return; // static constellation for reduced-motion users

  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    cmx += (mx - cmx) * 0.05;  // smooth parallax
    cmy += (my - cmy) * 0.05;
    nodes.forEach(n => {
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < 0.05 || n.x > 0.95) n.vx *= -1;
      if (n.y < 0.08 || n.y > 0.92) n.vy *= -1;
    });
    draw();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();