// === 1. Typing Effect ===
const typedTextElement = document.getElementById('typed-text');
const textArray = ["Customer Service Rep", "Technical Support Specialist", "Web Developer", "Problem Solver"];
let textArrayIndex = 0;
let charIndex = 0;
let isDeleting = false;

function type() {
    const currentText = textArray[textArrayIndex];
    
    if (isDeleting) {
        typedTextElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typedTextElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = 100;
    if (isDeleting) typeSpeed /= 2;

    if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textArrayIndex = (textArrayIndex + 1) % textArray.length;
        typeSpeed = 500;
    }

    setTimeout(type, typeSpeed);
}

// === 2. Cursor Glow Effect ===
const cursorGlow = document.getElementById('cursorGlow');
if (window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });
}

// === 3. Scroll Animations ===
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// === 4. Mobile Menu Toggle ===
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// === 5. Admin Panel Logic ===
const adminModal = document.getElementById('adminModal');
const adminTrigger = document.getElementById('adminTrigger');
const closeAdmin = document.getElementById('closeAdmin');
const adminLogin = document.getElementById('adminLogin');
const adminDashboard = document.getElementById('adminDashboard');
const loginBtn = document.getElementById('loginBtn');
const adminPass = document.getElementById('adminPass');

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('admin') === 'true') {
    openAdminModal();
}

adminTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    openAdminModal();
});

function openAdminModal() {
    adminModal.style.display = 'block';
}

closeAdmin.addEventListener('click', () => {
    adminModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === adminModal) {
        adminModal.style.display = 'none';
    }
});

loginBtn.addEventListener('click', () => {
    if (adminPass.value === 'paul2023') {
        adminLogin.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadAdminProjects();
    } else {
        alert('Incorrect password!');
    }
});

// === 6. Projects Management (LocalStorage) ===
let editIndex = -1;

const projTitle = document.getElementById('projTitle');
const projImages = document.getElementById('projImages');
const projDesc = document.getElementById('projDesc');
const saveProjBtn = document.getElementById('saveProjBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');
const projectsGrid = document.getElementById('projectsGrid');
const adminProjList = document.getElementById('adminProjList');

function loadProjects() {
    const projects = JSON.parse(localStorage.getItem('paul_projects')) || [];
    projectsGrid.innerHTML = '';
    
    if (projects.length === 0) {
        projectsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-secondary);">No projects added yet. Use the Admin panel to add some!</p>';
        return;
    }

    projects.forEach((proj) => {
        // Handle legacy data (single 'img' string) or new 'images' array
        const images = proj.images || (proj.img ? [proj.img] : []);
        
        const card = document.createElement('div');
        card.className = 'project-card glass-card fade-in visible';
        
        let imagesHtml = '';
        if (images.length > 0) {
            const gridClass = images.length === 1 ? 'project-images-grid single-image' : 'project-images-grid';
            imagesHtml = `<div class="${gridClass}">`;
            images.forEach(imgUrl => {
                // Added onclick to open lightbox
                imagesHtml += `<img src="${imgUrl}" class="project-thumb" alt="${proj.title}" onclick="openLightbox('${imgUrl}')" onerror="this.style.display='none'">`;
            });
            imagesHtml += `</div>`;
        }

        card.innerHTML = `
            ${imagesHtml}
            <h3>${proj.title}</h3>
            <p>${proj.desc}</p>
        `;
        projectsGrid.appendChild(card);
    });
}

function loadAdminProjects() {
    const projects = JSON.parse(localStorage.getItem('paul_projects')) || [];
    adminProjList.innerHTML = '';
    
    projects.forEach((proj, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${proj.title}</span>
            <div class="action-btns">
                <button class="edit-btn" onclick="editProject(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteProject(${index})">Delete</button>
            </div>
        `;
        adminProjList.appendChild(li);
    });
}

// Edit Project Function
window.editProject = function(index) {
    const projects = JSON.parse(localStorage.getItem('paul_projects')) || [];
    const proj = projects[index];
    
    projTitle.value = proj.title;
    // Convert array back to newline-separated string for easy editing
    projImages.value = proj.images ? proj.images.join('\n') : (proj.img || '');
    projDesc.value = proj.desc;
    
    editIndex = index;
    formTitle.textContent = 'Edit Project';
    saveProjBtn.textContent = 'Update Project';
    cancelEditBtn.style.display = 'inline-flex';
};

// Cancel Edit Function
cancelEditBtn.addEventListener('click', () => {
    editIndex = -1;
    projTitle.value = '';
    projImages.value = '';
    projDesc.value = '';
    formTitle.textContent = 'Add New Project';
    saveProjBtn.textContent = 'Add Project';
    cancelEditBtn.style.display = 'none';
});

// Save (Add or Update) Project Function
saveProjBtn.addEventListener('click', () => {
    const title = projTitle.value.trim();
    const imagesText = projImages.value.trim();
    const desc = projDesc.value.trim();

    if (!title || !imagesText) {
        alert('Please fill in the title and at least one image URL.');
        return;
    }

    // Split by new line and filter out empty lines
    const images = imagesText.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    const projects = JSON.parse(localStorage.getItem('paul_projects')) || [];

    if (editIndex >= 0) {
        // Update existing
        projects[editIndex] = { title, images, desc };
        alert('Project updated successfully!');
        cancelEditBtn.click(); // Reset form
    } else {
        // Add new
        projects.push({ title, images, desc });
        alert('Project added successfully!');
        projTitle.value = '';
        projImages.value = '';
        projDesc.value = '';
    }

    localStorage.setItem('paul_projects', JSON.stringify(projects));
    loadProjects();
    loadAdminProjects();
});

// Delete Project Function
window.deleteProject = function(index) {
    if (confirm('Are you sure you want to delete this project?')) {
        const projects = JSON.parse(localStorage.getItem('paul_projects')) || [];
        projects.splice(index, 1);
        localStorage.setItem('paul_projects', JSON.stringify(projects));
        
        // If we deleted the item currently being edited, reset the form
        if (editIndex === index) {
            cancelEditBtn.click();
        } else if (editIndex > index) {
            editIndex--; // Adjust index if an earlier item was deleted
        }
        
        loadProjects();
        loadAdminProjects();
    }
}

// === 7. Lightbox Logic ===
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const closeLightbox = document.getElementById('closeLightbox');

window.openLightbox = function(src) {
    lightboxImg.src = src;
    lightbox.style.display = 'flex';
}

function closeLightboxFunc() {
    lightbox.style.display = 'none';
    lightboxImg.src = '';
}

closeLightbox.addEventListener('click', closeLightboxFunc);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightboxFunc();
    }
});

// === Initial Load ===
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    type();
});

// === Contact Form Mock Submit ===
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thank you for your message! (Note: Connect this to a backend service like Formspree or EmailJS to receive actual emails).');
    this.reset();
});