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

    if (isDeleting) {
        typeSpeed /= 2; // Delete faster
    }

    if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000; // Pause at end
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textArrayIndex = (textArrayIndex + 1) % textArray.length;
        typeSpeed = 500; // Pause before next word
    }

    setTimeout(type, typeSpeed);
}

// === 2. Cursor Glow Effect ===
const cursorGlow = document.getElementById('cursorGlow');

// Only enable on non-touch devices to save battery/performance on mobile
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
            // Add a slight delay for staggered effect
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
const addProjBtn = document.getElementById('addProjBtn');
const projTitle = document.getElementById('projTitle');
const projImg = document.getElementById('projImg');
const projDesc = document.getElementById('projDesc');
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
        const card = document.createElement('div');
        card.className = 'project-card glass-card fade-in visible';
        card.innerHTML = `
            <img src="${proj.img}" alt="${proj.title}" onerror="this.src='https://via.placeholder.com/400x200?text=Project+Image'">
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
            <button class="delete-btn" onclick="deleteProject(${index})">Delete</button>
        `;
        adminProjList.appendChild(li);
    });
}

addProjBtn.addEventListener('click', () => {
    if (!projTitle.value || !projImg.value) {
        alert('Please fill in at least the title and image URL.');
        return;
    }

    const projects = JSON.parse(localStorage.getItem('paul_projects')) || [];
    projects.push({
        title: projTitle.value,
        img: projImg.value,
        desc: projDesc.value
    });

    localStorage.setItem('paul_projects', JSON.stringify(projects));
    
    projTitle.value = '';
    projImg.value = '';
    projDesc.value = '';
    
    loadProjects();
    loadAdminProjects();
    alert('Project added successfully!');
});

window.deleteProject = function(index) {
    if (confirm('Are you sure you want to delete this project?')) {
        const projects = JSON.parse(localStorage.getItem('paul_projects')) || [];
        projects.splice(index, 1);
        localStorage.setItem('paul_projects', JSON.stringify(projects));
        loadProjects();
        loadAdminProjects();
    }
}

// === Initial Load ===
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    type(); // Start typing animation
});

// === Contact Form Mock Submit ===
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thank you for your message! (Note: Connect this to a backend service like Formspree or EmailJS to receive actual emails).');
    this.reset();
});