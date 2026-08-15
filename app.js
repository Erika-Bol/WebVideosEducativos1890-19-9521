const API_URL = 'https://backvideo-hpevgdenh7hygvfm.canadacentral-01.azurewebsites.net/api/videos';

// DOM Elements
const videoGrid = document.getElementById('video-grid');
const categoryFilter = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
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
                <div class="card-actions">
                    <button class="card-action-btn like-btn" title="Me gusta" onclick="handleCardLike(event, ${video.id}, this)">👍 Me gusta</button>
                    <button class="card-action-btn" title="Comentar" onclick="handleCardComment(event, ${video.id})">💬 Comentar</button>
                    <button class="card-action-btn" title="Compartir" onclick="handleCardShare(event, '${video.urlVideo}', this)">🔗 Compartir</button>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openModal(video));
        videoGrid.appendChild(card);
    });
}

// Event Listeners
function setupEventListeners() {
    // Filter Function
    const applyFilters = () => {
        const selectedCategory = categoryFilter.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filteredVideos = allVideos;

        if (selectedCategory !== 'all') {
            filteredVideos = filteredVideos.filter(v => v.categoria === selectedCategory);
        }

        if (searchTerm) {
            filteredVideos = filteredVideos.filter(v =>
                (v.titulo || '').toLowerCase().includes(searchTerm) ||
                (v.descripcion || '').toLowerCase().includes(searchTerm) ||
                (v.categoria || '').toLowerCase().includes(searchTerm)
            );
        }

        renderVideos(filteredVideos);
    };

    // Category Filter
    categoryFilter.addEventListener('change', applyFilters);

    // Search Input (Real-time)
    searchInput.addEventListener('input', applyFilters);

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

// Storage keys for local overrides
const INTERACTIONS_KEY = 'edustream_interactions';

function getInteractions(videoId) {
    const data = JSON.parse(localStorage.getItem(INTERACTIONS_KEY)) || {};
    return data[videoId] || { likes: [], comments: [] };
}

function saveInteractions(videoId, interactions) {
    const data = JSON.parse(localStorage.getItem(INTERACTIONS_KEY)) || {};
    data[videoId] = interactions;
    localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(data));
}

let currentActiveVideo = null;

// Open Video Player Modal
async function openModal(video) {
    if (!AuthAPI.isAuthenticated()) {
        alert("Debes iniciar sesión para reproducir los videos. Serás redirigido a la página de acceso.");
        window.location.href = 'login.html';
        return;
    }

    modalTitle.textContent = "Cargando detalle...";
    modalDesc.textContent = "";
    modalCategory.textContent = "";
    modalDuration.textContent = "";
    document.getElementById('comments-list').innerHTML = '';
    
    // Obtener detalle del video por ID desde la API
    try {
        const response = await fetch(`${API_URL}/${video.id}`);
        if (response.ok) {
            const videoDetalle = await response.json();
            video = videoDetalle;
        }
    } catch (e) {
        console.warn("No se pudo obtener el detalle por ID, usando datos básicos.");
    }

    currentActiveVideo = video;

    modalTitle.textContent = video.titulo;
    modalDesc.textContent = video.descripcion;
    modalCategory.textContent = video.categoria;
    modalDuration.textContent = video.duracion;
    
    player.src = video.urlVideo;
    player.poster = video.poster;
    
    // Configurar interacciones (Likes, Comments, Share)
    setupInteractions(video);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; 
    
    player.play().catch(e => console.log("Autoplay prevented:", e));
}

function setupInteractions(video) {
    const user = AuthAPI.getCurrentUser();
    const localInt = getInteractions(video.id);
    
    // Merging API and Local Likes
    // The API might have likes and usuariosLikes array
    let apiLikes = video.usuariosLikes || [];
    let combinedLikes = [...new Set([...apiLikes, ...localInt.likes])];
    
    // Some local likes might mean we need to track if we UNLIKED something the API had? 
    // To keep it simple, localInt.likes will be the definitive list for this user if they interact.
    // Let's check if current user liked it:
    let isLiked = combinedLikes.includes(user.carnet) || localInt.likes.includes(user.carnet);
    
    const btnLike = document.getElementById('btn-like');
    const btnComment = document.getElementById('btn-comment');
    const btnShare = document.getElementById('btn-share');
    const commentForm = document.getElementById('comment-form');

    // Reset Listeners by cloning
    btnLike.replaceWith(btnLike.cloneNode(true));
    btnShare.replaceWith(btnShare.cloneNode(true));
    btnComment.replaceWith(btnComment.cloneNode(true));
    commentForm.replaceWith(commentForm.cloneNode(true));
    
    const newBtnLike = document.getElementById('btn-like');
    const newBtnShare = document.getElementById('btn-share');
    const newBtnComment = document.getElementById('btn-comment');
    const newCommentForm = document.getElementById('comment-form');

    newBtnComment.addEventListener('click', () => {
        document.getElementById('comment-input').focus();
    });

    // Initialize Like Button UI
    updateLikeUI(newBtnLike, isLiked, combinedLikes.length);

    newBtnLike.addEventListener('click', () => {
        isLiked = !isLiked;
        
        let currentLikes = getInteractions(video.id).likes;
        if (currentLikes.length === 0 && apiLikes.length > 0) {
            currentLikes = [...apiLikes]; // initialize from API if first time
        }

        if (isLiked) {
            if (!currentLikes.includes(user.carnet)) currentLikes.push(user.carnet);
        } else {
            currentLikes = currentLikes.filter(c => c !== user.carnet);
        }

        localInt.likes = currentLikes;
        saveInteractions(video.id, localInt);
        updateLikeUI(newBtnLike, isLiked, currentLikes.length);
    });

    newBtnShare.addEventListener('click', () => {
        navigator.clipboard.writeText(video.urlVideo).then(() => {
            const originalText = newBtnShare.textContent;
            newBtnShare.textContent = "¡Copiado!";
            setTimeout(() => newBtnShare.textContent = originalText, 2000);
        });
    });

    newCommentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        if (text) {
            addComment(video.id, text);
            input.value = '';
        }
    });

    // Render Comments
    renderComments(video);
}

function updateLikeUI(btn, isLiked, total) {
    const likesCountEl = document.getElementById('modal-likes-count');
    if (likesCountEl) {
        likesCountEl.innerHTML = `👍 ${total} Me gusta${total !== 1 ? 's' : ''}`;
    }

    if (isLiked) {
        btn.classList.add('active');
        btn.innerHTML = `Te gusta`;
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `Me gusta`;
    }
}

function renderComments(video) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '';
    const user = AuthAPI.getCurrentUser();

    const localInt = getInteractions(video.id);
    let apiComments = video.comentarios || [];
    
    // Overwrite API comments with local ones if local exists, else use API
    let comments = localInt.comments.length > 0 ? localInt.comments : JSON.parse(JSON.stringify(apiComments));
    
    // Save to local so we have a working copy
    if (localInt.comments.length === 0 && comments.length > 0) {
        localInt.comments = comments;
        saveInteractions(video.id, localInt);
    }

    comments.forEach((c) => {
        const item = document.createElement('div');
        item.className = 'comment-item';
        
        const isOwner = c.carne === user.carnet;
        const deleteBtn = `<button class="comment-action delete" onclick="deleteComment(${video.id}, ${c.id}, ${isOwner})">🗑️ Eliminar</button>`;
        
        item.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${c.estudiante}</span>
                <span class="comment-date">${c.fecha || 'Reciente'}</span>
            </div>
            <div class="comment-body">${c.texto}</div>
            <div class="comment-footer">
                <button class="comment-action" onclick="showReplyForm(${video.id}, ${c.id})">↩️ Responder</button>
                ${deleteBtn}
            </div>
            <div id="reply-container-${c.id}" class="reply-form-container"></div>
            <div class="replies-list" id="replies-${c.id}">
                ${(c.respuestas || []).map(r => `
                    <div class="comment-item">
                        <div class="comment-header">
                            <span class="comment-author">${r.estudiante}</span>
                            <span class="comment-date">${r.fecha || 'Reciente'}</span>
                        </div>
                        <div class="comment-body">${r.texto}</div>
                        <div class="comment-footer">
                            <button class="comment-action delete" onclick="deleteReply(${video.id}, ${c.id}, ${r.id}, ${r.carne === user.carnet})">🗑️ Eliminar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        list.appendChild(item);
    });
}

window.showReplyForm = function(videoId, commentId) {
    const container = document.getElementById(`reply-container-${commentId}`);
    if (container.innerHTML !== '') {
        container.innerHTML = ''; // Toggle
        return;
    }
    
    container.innerHTML = `
        <form class="comment-form" onsubmit="event.preventDefault(); addReply(${videoId}, ${commentId});">
            <textarea id="reply-input-${commentId}" placeholder="Escribe una respuesta..." required style="min-height: 50px; padding: 0.5rem;"></textarea>
            <div class="comment-actions">
                <button type="submit" class="btn-primary" style="padding: 0.5rem 1rem;">Enviar</button>
            </div>
        </form>
    `;
}

window.addComment = function(videoId, text) {
    const user = AuthAPI.getCurrentUser();
    const localInt = getInteractions(videoId);
    
    const newComment = {
        id: Date.now(),
        carne: user.carnet,
        estudiante: user.nombre,
        texto: text,
        fecha: new Date().toLocaleString(),
        respuestas: []
    };
    
    localInt.comments.push(newComment);
    saveInteractions(videoId, localInt);
    
    if (currentActiveVideo && currentActiveVideo.id === videoId) {
        renderComments(currentActiveVideo);
    }
}

window.addReply = function(videoId, commentId) {
    const input = document.getElementById(`reply-input-${commentId}`);
    const text = input.value.trim();
    if (!text) return;

    const user = AuthAPI.getCurrentUser();
    const localInt = getInteractions(videoId);
    
    const comment = localInt.comments.find(c => c.id === commentId);
    if (comment) {
        if (!comment.respuestas) comment.respuestas = [];
        comment.respuestas.push({
            id: Date.now(),
            carne: user.carnet,
            estudiante: user.nombre,
            texto: text,
            fecha: new Date().toLocaleString()
        });
        saveInteractions(videoId, localInt);
        
        if (currentActiveVideo && currentActiveVideo.id === videoId) {
            renderComments(currentActiveVideo);
        }
    }
}

window.deleteComment = function(videoId, commentId, isOwner) {
    if (!isOwner) {
        alert("Error 403 Forbidden: Acceso denegado. Solo puedes eliminar tus propios comentarios.");
        return;
    }
    
    if(confirm("¿Estás seguro de que deseas eliminar este comentario?")) {
        const localInt = getInteractions(videoId);
        localInt.comments = localInt.comments.filter(c => c.id !== commentId);
        saveInteractions(videoId, localInt);
        
        if (currentActiveVideo && currentActiveVideo.id === videoId) {
            renderComments(currentActiveVideo);
        }
    }
}

window.deleteReply = function(videoId, parentId, replyId, isOwner) {
    if (!isOwner) {
        alert("Error 403 Forbidden: Acceso denegado. Solo puedes eliminar tus propios comentarios.");
        return;
    }
    
    if(confirm("¿Estás seguro de que deseas eliminar esta respuesta?")) {
        const localInt = getInteractions(videoId);
        const parent = localInt.comments.find(c => c.id === parentId);
        if (parent && parent.respuestas) {
            parent.respuestas = parent.respuestas.filter(r => r.id !== replyId);
            saveInteractions(videoId, localInt);
            
            if (currentActiveVideo && currentActiveVideo.id === videoId) {
                renderComments(currentActiveVideo);
            }
        }
    }
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

// Global Handlers for Card Buttons
window.handleCardLike = function(event, videoId, btnElement) {
    event.stopPropagation();
    if (!AuthAPI.isAuthenticated()) {
        alert("Debes iniciar sesión para interactuar.");
        window.location.href = 'login.html';
        return;
    }
    
    const user = AuthAPI.getCurrentUser();
    const localInt = getInteractions(videoId);
    let currentLikes = localInt.likes;
    
    const video = allVideos.find(v => v.id === videoId);
    let apiLikes = video ? (video.usuariosLikes || []) : [];
    
    if (currentLikes.length === 0 && apiLikes.length > 0) {
        currentLikes = [...apiLikes];
    }
    
    let isLiked = currentLikes.includes(user.carnet);
    
    if (isLiked) {
        currentLikes = currentLikes.filter(c => c !== user.carnet);
        btnElement.style.color = 'var(--text-secondary)';
    } else {
        currentLikes.push(user.carnet);
        btnElement.style.color = 'var(--accent)';
    }
    
    localInt.likes = currentLikes;
    saveInteractions(videoId, localInt);
}

window.handleCardComment = function(event, videoId) {
    event.stopPropagation();
    const video = allVideos.find(v => v.id === videoId);
    if(video) {
        openModal(video).then(() => {
            setTimeout(() => {
                const commentInput = document.getElementById('comment-input');
                if (commentInput) commentInput.focus();
            }, 500);
        });
    }
}

window.handleCardShare = function(event, url, btnElement) {
    event.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
        const original = btnElement.innerHTML;
        btnElement.innerHTML = "🔗 ¡Copiado!";
        setTimeout(() => btnElement.innerHTML = original, 2000);
    });
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
