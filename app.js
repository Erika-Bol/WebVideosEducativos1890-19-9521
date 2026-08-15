const API_URL = 'https://backvideo-hpevgdenh7hygvfm.canadacentral-01.azurewebsites.net/api/videos';

// DOM Elements
const videoGrid = document.getElementById('video-grid');
const categoryFilter = document.getElementById('category-filter');
const loadingSpinner = document.getElementById('loading-spinner');
const modal = document.getElementById('video-modal');
const closeModalBtn = document.getElementById('close-modal');
const player = document.getElementById('player');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalCategory = document.getElementById('modal-category');
const modalDuration = document.getElementById('modal-duration');

let allVideos = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    fetchVideos();
    setupEventListeners();
});

// Update UI based on auth state
function updateAuthUI() {
    const authNavItem = document.getElementById('auth-nav-item');
    if (AuthAPI.isAuthenticated()) {
        const user = AuthAPI.getCurrentUser();
        authNavItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="color: var(--text-secondary); font-size: 0.9rem;">Hola, <strong>${user.nombre.split(' ')[0]}</strong></span>
                <button onclick="AuthAPI.logoutUser()" style="background: none; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.3s;">Salir</button>
            </div>
        `;
    } else {
        authNavItem.innerHTML = `<a href="login.html" class="btn-primary" style="padding: 0.5rem 1rem; border-radius: 8px;">Acceder</a>`;
    }
}

// Fetch videos from API
async function fetchVideos() {
    showLoading(true);
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar los videos');
        
        // Note: The API returns an array directly, based on the endpoint structure provided
        // Let's handle both possible structures: raw array or { items: [...] }
        const data = await response.json();
        
        // If the API returns the exact output provided in the previous terminal execution:
        // it returns an array of objects.
        allVideos = Array.isArray(data) ? data : (data.items || []);
        
        populateCategories(allVideos);
        renderVideos(allVideos);
    } catch (error) {
        console.error('Fetch error:', error);
        videoGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: var(--danger);">Ocurrió un error al cargar el catálogo de videos. Por favor, intenta más tarde.</p>`;
    } finally {
        showLoading(false);
    }
}

// Populate Category Filter dropdown
function populateCategories(videos) {
    const categories = new Set();
    videos.forEach(video => {
        if (video.categoria) {
            categories.add(video.categoria);
        }
    });

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Render video cards
function renderVideos(videos) {
    videoGrid.innerHTML = '';
    
    if (videos.length === 0) {
        videoGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: var(--text-secondary);">No se encontraron videos para esta categoría.</p>`;
        return;
    }

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="video-thumb">
                <img src="${video.poster}" alt="${video.titulo}" loading="lazy" onerror="this.src='https://placehold.co/600x400/1e2233/white?text=Video'">
                <div class="play-overlay">
                    <div class="play-icon">▶</div>
                </div>
                <span class="duration-badge">${video.duracion}</span>
            </div>
            <div class="video-info-card">
                <span class="badge">${video.categoria}</span>
                <h3 class="video-title">${video.titulo}</h3>
                <p class="video-desc">${video.descripcion}</p>
                <div class="video-meta">
                    <span class="likes">${video.likes || 0}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openModal(video));
        videoGrid.appendChild(card);
    });
}

// Event Listeners
function setupEventListeners() {
    // Category Filter
    categoryFilter.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        if (selectedCategory === 'all') {
            renderVideos(allVideos);
        } else {
            const filteredVideos = allVideos.filter(v => v.categoria === selectedCategory);
            renderVideos(filteredVideos);
        }
    });

    // Close Modal
    closeModalBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside the content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Open Video Player Modal
function openModal(video) {
    if (!AuthAPI.isAuthenticated()) {
        alert("Debes iniciar sesión para reproducir los videos. Serás redirigido a la página de acceso.");
        window.location.href = 'login.html';
        return;
    }

    modalTitle.textContent = video.titulo;
    modalDesc.textContent = video.descripcion;
    modalCategory.textContent = video.categoria;
    modalDuration.textContent = video.duracion;
    
    player.src = video.urlVideo;
    player.poster = video.poster;
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Auto-play the video
    player.play().catch(e => console.log("Autoplay prevented:", e));
}

// Close Video Player Modal
function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Stop video playback
    player.pause();
    player.currentTime = 0;
    player.src = '';
}

// Show/Hide Loading Spinner
function showLoading(show) {
    if (show) {
        loadingSpinner.style.display = 'block';
        videoGrid.style.display = 'none';
    } else {
        loadingSpinner.style.display = 'none';
        videoGrid.style.display = 'grid';
    }
}
