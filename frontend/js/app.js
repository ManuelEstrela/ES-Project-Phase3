// === Configuration ===
const CONFIG = {
    API_BASE_URL: 'https://tourism-api-prod.us-e2.cloudhub.io/api/v1',
    MAX_FAVORITES: 50,
    MAX_ITINERARY_POINTS: 20
};

// === Data Models (fallback estático para modo demo/offline) ===
const DATA = {
    islands: [
        {
            name: 'São Miguel',
            locations: 42,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940570/search_images/0a51d4d81fc0320fe0f64abb67c64691c5f5129d.jpg'
        },
        {
            name: 'Terceira',
            locations: 28,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940570/search_images/94947f38e2f5fcc117c40754de26b1290054311d.jpg'
        },
        {
            name: 'Faial',
            locations: 18,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940570/search_images/8586605cb47dc9767accebc9eefcba59bf82ab17.jpg'
        },
        {
            name: 'Pico',
            locations: 15,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940577/search_images/d5cf151a3f77374d750cace159c83bf0699a1f6f.jpg'
        },
        {
            name: 'São Jorge',
            locations: 12,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940577/search_images/cba9feba2714389465d5553294077c36c0a5f771.jpg'
        },
        {
            name: 'Santa Maria',
            locations: 10,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940578/search_images/3181bdcc7fc0adcb50d9e93ad88f3053c73e94df.jpg'
        },
        {
            name: 'Graciosa',
            locations: 8,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940586/search_images/5f0234f6e64f31eff481c4524e1ced6d1ef55e9e.jpg'
        },
        {
            name: 'Flores',
            locations: 14,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940587/search_images/4e9f0312ce73eec94f01e41506e0c4e186e3c7b1.jpg'
        },
        {
            name: 'Corvo',
            locations: 5,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763940586/search_images/313ab5462cb556e34711b973a97e9d1bf1fc93b1.jpg'
        }
    ],

    locations: [
        {
            id: 1,
            name: 'Lagoa das Sete Cidades',
            island: 'São Miguel',
            category: 'Lagoa',
            description: 'Lagoa icónica com paisagem única nos Açores.',
            rating: 4.8,
            ratingCount: 342,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763845619/search_images/7fb56bb8bed2e7ec72cb6ad0e370693b8f0ac2be.jpg'
        },
        {
            id: 2,
            name: 'Furnas',
            island: 'São Miguel',
            category: 'Termas',
            description: 'Caldeiras vulcânicas e águas termais.',
            rating: 4.7,
            ratingCount: 280,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763941742/search_images/55e88db7245078dfb56ae1cd61173ab6a494af17.jpg'
        },
        {
            id: 3,
            name: 'Ponta Delgada',
            island: 'São Miguel',
            category: 'Cidade',
            description: 'Capital dos Açores com arquitetura histórica.',
            rating: 4.6,
            ratingCount: 150,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763941742/search_images/05bad432afdd4de53363230b2e6015e48545deb7.jpg'
        },
        {
            id: 4,
            name: 'Caldeira Velha',
            island: 'São Miguel',
            category: 'Cascata',
            description: 'Cascata termal natural com piscinas naturais.',
            rating: 4.9,
            ratingCount: 421,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763941754/search_images/fd21c71b77c8bc55f4d18277585491373b36dc82.jpg'
        },
        {
            id: 5,
            name: 'Lagoa do Fogo',
            island: 'São Miguel',
            category: 'Lagoa',
            description: 'Lagoa cratérica rodeada de natureza pristina.',
            rating: 4.8,
            ratingCount: 389,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763770016/search_images/95898937699774d0582f3cbcbbb33d58a1bff3e2.jpg'
        },
        {
            id: 6,
            name: 'Miradouro da Boca do Inferno',
            island: 'São Miguel',
            category: 'Miradouro',
            description: 'Vista panorâmica sobre as Sete Cidades.',
            rating: 4.7,
            ratingCount: 256,
            image: 'https://pplx-res.cloudinary.com/image/upload/v1763941755/search_images/9f76bdcb1a47f418e3ec7ecc28c516a5da3a5d48.jpg'
        }
    ]
};

// === State Management ===
const STATE = {
    currentUser: null,
    token: null,
    allLocations: [...DATA.locations],
    favorites: [],
    itineraries: [],
    currentItinerary: {
        name: '',
        startDate: '',
        endDate: '',
        points: [] // array de IDs de locais
    },
    selectedLocation: null,
    isLoading: false
};

// === Helpers: Persistência (localStorage) ===
function restoreSession() {
    try {
        const user = localStorage.getItem('azores_user');
        const token = localStorage.getItem('azores_token');
        const favs = localStorage.getItem('azores_favorites');
        const its = localStorage.getItem('azores_itineraries');

        if (user) STATE.currentUser = JSON.parse(user);
        if (token) STATE.token = token;
        if (favs) STATE.favorites = JSON.parse(favs);
        if (its) STATE.itineraries = JSON.parse(its);
    } catch (e) {
        console.warn('Erro a restaurar sessão', e);
    }
}

function persistSession() {
    try {
        if (STATE.currentUser) {
            localStorage.setItem('azores_user', JSON.stringify(STATE.currentUser));
        } else {
            localStorage.removeItem('azores_user');
        }

        if (STATE.token) {
            localStorage.setItem('azores_token', STATE.token);
        } else {
            localStorage.removeItem('azores_token');
        }

        localStorage.setItem('azores_favorites', JSON.stringify(STATE.favorites || []));
        localStorage.setItem('azores_itineraries', JSON.stringify(STATE.itineraries || []));
    } catch (e) {
        console.warn('Erro a persistir sessão', e);
    }
}

// === Helpers: Toasts ===
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// === Helpers: API (REST) ===
async function apiRequest(path, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${path}`;
    const headers = options.headers ? { ...options.headers } : {};

    if (!options.skipJson) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (STATE.token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${STATE.token}`;
    }

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
        let msg = `Erro ${response.status}`;
        try {
            const errBody = await response.json();
            if (errBody && errBody.message) msg = errBody.message;
        } catch (_) {
            // ignore
        }
        throw new Error(msg);
    }

    if (response.status === 204) return null;

    try {
        return await response.json();
    } catch {
        return null;
    }
}

function apiGet(path, opts = {}) {
    return apiRequest(path, { method: 'GET', ...opts });
}

function apiPost(path, body, opts = {}) {
    return apiRequest(path, { method: 'POST', body, ...opts });
}

// === Loading State (opcional, para futura skeletons) ===
function setLoading(isLoading) {
    STATE.isLoading = isLoading;
    // Aqui poderias adicionar um spinner global se quiseres
}

// === Utilities ===
function ensureAuthenticated() {
    if (!STATE.currentUser) {
        showToast('Por favor, inicie sessão para aceder a esta funcionalidade.', 'warning');
        openModal('login');
        return false;
    }
    return true;
}

function findLocationById(id) {
    return DATA.locations.find(l => String(l.id) === String(id));
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-PT');
}

function formatDateRange(start, end) {
    if (!start && !end) return '';
    if (start && !end) return `Início: ${formatDate(start)}`;
    if (!start && end) return `Até: ${formatDate(end)}`;
    return `${formatDate(start)} → ${formatDate(end)}`;
}

// === Navigation ===
function showSection(section) {
    // Secções que exigem autenticação
    const requiresAuth = ['profile', 'itineraries', 'favorites'];
    if (requiresAuth.includes(section) && !ensureAuthenticated()) {
        return;
    }

    document.querySelectorAll('.container > section').forEach(s => {
        s.classList.add('hidden');
    });

    const sectionEl = document.getElementById(section + 'Section');
    if (sectionEl) {
        sectionEl.classList.remove('hidden');
    }

    if (section === 'islands') {
        renderAllIslands();
    } else if (section === 'locations') {
        renderAllLocations();
    } else if (section === 'profile' && STATE.currentUser) {
        renderProfile();
    } else if (section === 'itineraries') {
        renderItinerariesView();
    } else if (section === 'favorites') {
        renderFavoritesView();
    }
}

// === Modal Management ===
function openModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (!modal) return;
    modal.classList.add('active');
}

function closeModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (!modal) return;
    modal.classList.remove('active');
}

// Location details modal (separado para conveniência)
function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    if (modal) modal.classList.remove('active');
    STATE.selectedLocation = null;
}

// === Authentication ===
async function login(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        showToast('Preencha email e password.', 'warning');
        return;
    }

    try {
        const result = await apiPost('/auth/login', { email, password }, { skipAuth: true });
        // Espera-se algo como { token, user }
        STATE.token = result.token || null;
        STATE.currentUser = result.user || { name: email.split('@')[0], email };
        persistSession();
        updateAuthUI();
        closeModal('login');
        showToast('Login efetuado com sucesso!', 'success');
    } catch (err) {
        console.warn('Erro na API de login, a usar modo demo.', err);
        // Fallback modo demo (sem backend)
        STATE.token = null;
        STATE.currentUser = { name: email.split('@')[0], email };
        persistSession();
        updateAuthUI();
        closeModal('login');
        showToast('Login em modo demonstração (backend indisponível).', 'warning');
    }
}

async function register(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    if (!name || !email || !password) {
        showToast('Preencha todos os campos.', 'warning');
        return;
    }

    try {
        await apiPost('/auth/register', { name, email, password }, { skipAuth: true });
        showToast('Registo efetuado. Pode agora iniciar sessão.', 'success');

        // Opcionalmente autenticar logo após registo
        STATE.currentUser = { name, email };
        STATE.token = null;
        persistSession();
        updateAuthUI();
        closeModal('register');
    } catch (err) {
        console.warn('Erro na API de registo, a usar modo demo.', err);
        STATE.currentUser = { name, email };
        STATE.token = null;
        persistSession();
        updateAuthUI();
        closeModal('register');
        showToast('Registo em modo demonstração (backend indisponível).', 'warning');
    }
}

function logout() {
    STATE.currentUser = null;
    STATE.token = null;
    STATE.favorites = [];
    STATE.currentItinerary = { name: '', startDate: '', endDate: '', points: [] };
    persistSession();
    updateAuthUI();
    showSection('home');
    showToast('Sessão terminada.', 'info');
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (STATE.currentUser) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        const initial = STATE.currentUser.name
            ? STATE.currentUser.name.charAt(0).toUpperCase()
            : 'U';
        document.getElementById('userInitial').textContent = initial;
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// === Rendering Functions ===
function renderIslands(container, islands) {
    if (!container) return;
    container.innerHTML = islands.map(island => `
        <div class="island-card" onclick="filterByIsland('${island.name}')">
            <div class="island-image" style="background-image: url('${island.image || ''}')"></div>
            <div class="island-content">
                <div class="island-name">${island.name}</div>
                <div class="island-stats">
                    <span>📍 ${island.locations || 0} locais</span>
                </div>
            </div>
        </div>
    `).join('');
}

function isFavorite(locationId) {
    return STATE.favorites.includes(locationId);
}

function renderLocations(container, locations) {
    if (!container) return;

    if (!locations || locations.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum local encontrado.</p>';
        return;
    }

    container.innerHTML = locations.map(location => `
        <div class="location-card" onclick="openLocationDetails(${location.id})">
            <button
                class="favorite-toggle ${isFavorite(location.id) ? 'active' : ''}"
                onclick="toggleFavorite(${location.id}, event)"
                aria-label="Adicionar aos favoritos"
                title="Adicionar aos favoritos"
            >
                ${isFavorite(location.id) ? '❤' : '♡'}
            </button>
            <div class="location-image" style="background-image: url('${location.image || ''}')"></div>
            <div class="location-content">
                <div class="location-header">
                    <div class="location-name">${location.name}</div>
                    <div class="category-badge">${location.category || 'Ponto turístico'}</div>
                </div>
                <div class="location-island">📍 ${location.island || 'Açores'}</div>
                <div class="location-description">${location.description || ''}</div>
                <div class="location-meta-row">
                    <div class="location-meta-left">
                        <div class="rating">
                            <span class="stars">⭐</span>
                            <span style="font-weight: 700; color: var(--accent);">
                                ${location.rating ? location.rating.toFixed(1) : '-'}
                            </span>
                            <span style="color: var(--text-muted);">
                                (${location.ratingCount || 0})
                            </span>
                        </div>
                    </div>
                    <button
                        class="btn btn-outline"
                        type="button"
                        onclick="addToCurrentItinerary(${location.id}, event)"
                    >
                        Adicionar ao itinerário
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAllIslands() {
    const container = document.getElementById('allIslandsGrid');
    renderIslands(container, DATA.islands);
}

function renderAllLocations() {
    const islandFilter = document.getElementById('islandFilter');

    // Preenche dropdown de ilhas se ainda não estiver preenchido
    if (islandFilter && islandFilter.children.length === 1) {
        const seen = new Set();
        DATA.locations.forEach(loc => {
            if (!loc.island || seen.has(loc.island)) return;
            seen.add(loc.island);
            const option = document.createElement('option');
            option.value = loc.island;
            option.textContent = loc.island;
            islandFilter.appendChild(option);
        });
    }

    renderLocations(document.getElementById('allLocations'), STATE.allLocations);
}

function renderProfile() {
    if (!STATE.currentUser) return;

    document.getElementById('profileName').textContent = STATE.currentUser.name || 'Utilizador';
    document.getElementById('profileEmail').textContent = STATE.currentUser.email || '';
}

// Itineraries view
function renderCurrentItineraryPoints() {
    const container = document.getElementById('currentItineraryPoints');
    if (!container) return;

    const points = STATE.currentItinerary.points || [];
    if (points.length === 0) {
        container.innerHTML = '<p class="muted">Ainda não adicionou pontos a este itinerário.</p>';
        return;
    }

    container.innerHTML = points.map((id, index) => {
        const loc = findLocationById(id);
        const name = loc ? loc.name : `Ponto #${id}`;
        const island = loc && loc.island ? ` · ${loc.island}` : '';

        return `
            <div class="itinerary-point">
                <div class="itinerary-point-name">
                    ${index + 1}. ${name}${island}
                </div>
                <div class="itinerary-point-actions">
                    <button type="button" class="btn btn-outline" onclick="moveItineraryPointUp(${index})">↑</button>
                    <button type="button" class="btn btn-outline" onclick="moveItineraryPointDown(${index})">↓</button>
                    <button type="button" class="btn btn-outline" onclick="removeItineraryPoint(${index})">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderItinerariesList() {
    const container = document.getElementById('itinerariesList');
    if (!container) return;

    const list = STATE.itineraries || [];
    if (list.length === 0) {
        container.innerHTML = '<p class="muted">Ainda não tem itinerários guardados.</p>';
        return;
    }

    container.innerHTML = list.map(it => {
        const points = (it.points || it.locations || []).map(p => {
            const id = typeof p === 'number' ? p : p.id || p.locationId;
            const loc = findLocationById(id);
            return loc ? loc.name : `Ponto #${id}`;
        });

        return `
            <div class="itinerary-item">
                <div class="itinerary-item-header">
                    <div>
                        <h4>${it.name || 'Itinerário'}</h4>
                        <div class="itinerary-item-meta">
                            ${formatDateRange(it.startDate, it.endDate)} · ${points.length} pontos
                        </div>
                    </div>
                    <div class="itinerary-item-actions">
                        <button type="button" class="btn btn-outline" onclick="exportItineraryToPDF('${it.id}')">
                            Exportar PDF
                        </button>
                    </div>
                </div>
                <ul class="itinerary-item-points">
                    ${points.map(pn => `<li>${pn}</li>`).join('')}
                </ul>
            </div>
        `;
    }).join('');
}

function renderItinerariesView() {
    if (!ensureAuthenticated()) return;

    // Garantir que itinerários são carregados (se backend existir)
    loadItineraries();
    renderCurrentItineraryPoints();
    renderItinerariesList();
}

// Favorites view
function renderFavoritesView() {
    if (!ensureAuthenticated()) return;

    const favLocations = DATA.locations.filter(loc => STATE.favorites.includes(loc.id));
    renderLocations(document.getElementById('favoriteLocations'), favLocations);
}

// Location details modal
function renderLocationDetails(location, extraDetails) {
    const container = document.getElementById('locationModalContent');
    if (!container) return;

    const details = extraDetails || {};
    const acc = details.accessibility || location.accessibility || [];
    const accessibilityBadges = Array.isArray(acc) ? acc : [];

    const rating = details.rating || location.rating;
    const ratingCount = details.ratingCount || location.ratingCount;
    const comments = details.comments || [];

    container.innerHTML = `
        <div class="location-details-header">
            <div>
                <div class="location-details-title">${location.name}</div>
                <div class="location-details-meta">
                    <span>📍 ${location.island || 'Açores'}</span>
                    <span class="badge">${location.category || 'Ponto turístico'}</span>
                </div>
            </div>
        </div>

        <div class="location-details-layout">
            <div>
                <div class="location-details-description">
                    ${details.longDescription || location.description || ''}
                </div>

                <div class="location-actions-row">
                    <button
                        class="btn btn-outline"
                        type="button"
                        onclick="toggleFavorite(${location.id})"
                    >
                        ${isFavorite(location.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    </button>
                    <button
                        class="btn btn-primary"
                        type="button"
                        onclick="addToCurrentItinerary(${location.id})"
                    >
                        Adicionar ao itinerário
                    </button>
                </div>

                <div class="weather-widget" id="weatherWidget">
                    <strong>Meteorologia</strong>
                    <p class="muted">A carregar dados meteorológicos...</p>
                </div>

                <div class="ratings-block">
                    <div class="ratings-summary">
                        <span class="stars">⭐</span>
                        <span><strong>${rating ? rating.toFixed(1) : '-'}</strong> / 5</span>
                        <span class="muted">(${ratingCount || 0} avaliações)</span>
                    </div>
                    <div id="commentsContainer" class="comments-list">
                        ${
                            comments.length
                                ? comments.map(c => `
                                    <div class="comment-item">
                                        <div class="comment-meta">
                                            <span>${c.author || 'Utilizador'}</span>
                                            <span>${c.rating ? `${c.rating}★` : ''}</span>
                                        </div>
                                        <div>${c.comment || ''}</div>
                                    </div>
                                `).join('')
                                : '<p class="muted">Ainda não existem comentários para este local.</p>'
                        }
                    </div>

                    ${
                        STATE.currentUser
                            ? `
                                <form onsubmit="submitRating(event, ${location.id})" style="margin-top: 0.75rem;">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label>Classificação</label>
                                            <select id="ratingValue">
                                                <option value="5">5 - Excelente</option>
                                                <option value="4">4 - Muito bom</option>
                                                <option value="3">3 - Satisfatório</option>
                                                <option value="2">2 - Fraco</option>
                                                <option value="1">1 - Mau</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Comentário (opcional)</label>
                                        <textarea id="ratingComment" rows="3" placeholder="Partilhe a sua experiência..."></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-primary">Enviar avaliação</button>
                                </form>
                            `
                            : '<p class="muted" style="margin-top: 0.75rem;">Autentique-se para deixar uma avaliação.</p>'
                    }
                </div>
            </div>

            <div>
                <div class="location-map" id="locationMap"></div>
                ${
                    accessibilityBadges.length
                        ? `
                            <div style="margin-top: 1rem;">
                                <strong>Acessibilidade</strong>
                                <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                    ${accessibilityBadges.map(a => `<span class="badge badge-outline">${a}</span>`).join('')}
                                </div>
                            </div>
                        `
                        : ''
                }
            </div>
        </div>
    `;

    // Inicializar mapa se tivermos coordenadas
    if (typeof L !== 'undefined' && location.latitude && location.longitude) {
        const map = L.map('locationMap').setView([location.latitude, location.longitude], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(map);
        L.marker([location.latitude, location.longitude]).addTo(map).bindPopup(location.name);
    } else {
        const mapContainer = document.getElementById('locationMap');
        if (mapContainer) {
            mapContainer.innerHTML = '<div class="muted" style="padding: 1rem;">Mapa indisponível para este local (coordenadas em falta).</div>';
        }
    }

    // Carregar meteorologia e detalhes extra
    loadWeather(location);
}

// === Filters & Search ===
function filterByIsland(islandName) {
    showSection('locations');
    const islandFilter = document.getElementById('islandFilter');
    if (islandFilter) {
        islandFilter.value = islandName;
    }
    filterLocations();
}

function filterLocations() {
    const islandFilter = document.getElementById('islandFilter')?.value || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';

    let filtered = DATA.locations;

    if (islandFilter) {
        filtered = filtered.filter(loc => loc.island === islandFilter);
    }

    if (categoryFilter) {
        filtered = filtered.filter(loc => loc.category === categoryFilter);
    }

    STATE.allLocations = filtered;
    renderLocations(document.getElementById('allLocations'), STATE.allLocations);
}

function searchLocations() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();

    if (!query) {
        STATE.allLocations = DATA.locations;
    } else {
        STATE.allLocations = DATA.locations.filter(loc =>
            (loc.name || '').toLowerCase().includes(query) ||
            (loc.island || '').toLowerCase().includes(query) ||
            (loc.category || '').toLowerCase().includes(query) ||
            (loc.description || '').toLowerCase().includes(query)
        );
    }

    showSection('locations');
    renderLocations(document.getElementById('allLocations'), STATE.allLocations);
}

// === Favorites ===
function toggleFavorite(locationId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (!ensureAuthenticated()) return;

    const index = STATE.favorites.indexOf(locationId);
    if (index === -1) {
        if (STATE.favorites.length >= CONFIG.MAX_FAVORITES) {
            showToast(`Limite de ${CONFIG.MAX_FAVORITES} favoritos atingido.`, 'warning');
            return;
        }
        STATE.favorites.push(locationId);
        showToast('Adicionado aos favoritos.', 'success');
    } else {
        STATE.favorites.splice(index, 1);
        showToast('Removido dos favoritos.', 'info');
    }

    persistSession();

    // Re-render cards que possam estar visíveis
    renderAllLocations();
    renderFavoritesView();
}

function addToCurrentItinerary(locationId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (!ensureAuthenticated()) return;

    const points = STATE.currentItinerary.points;
    if (points.includes(locationId)) {
        showToast('Este ponto já está no itinerário atual.', 'info');
        return;
    }
    if (points.length >= CONFIG.MAX_ITINERARY_POINTS) {
        showToast(`Máximo de ${CONFIG.MAX_ITINERARY_POINTS} pontos por itinerário.`, 'warning');
        return;
    }

    points.push(locationId);
    renderCurrentItineraryPoints();
    showToast('Ponto adicionado ao itinerário atual.', 'success');
}

function moveItineraryPointUp(index) {
    const points = STATE.currentItinerary.points;
    if (index <= 0 || index >= points.length) return;
    [points[index - 1], points[index]] = [points[index], points[index - 1]];
    renderCurrentItineraryPoints();
}

function moveItineraryPointDown(index) {
    const points = STATE.currentItinerary.points;
    if (index < 0 || index >= points.length - 1) return;
    [points[index + 1], points[index]] = [points[index], points[index + 1]];
    renderCurrentItineraryPoints();
}

function removeItineraryPoint(index) {
    const points = STATE.currentItinerary.points;
    if (index < 0 || index >= points.length) return;
    points.splice(index, 1);
    renderCurrentItineraryPoints();
}

function clearCurrentItinerary() {
    STATE.currentItinerary = { name: '', startDate: '', endDate: '', points: [] };
    document.getElementById('itineraryName').value = '';
    document.getElementById('itineraryStart').value = '';
    document.getElementById('itineraryEnd').value = '';
    renderCurrentItineraryPoints();
}

// === Itineraries ===
async function saveItinerary(e) {
    e.preventDefault();
    if (!ensureAuthenticated()) return;

    const name = document.getElementById('itineraryName').value.trim();
    const startDate = document.getElementById('itineraryStart').value;
    const endDate = document.getElementById('itineraryEnd').value;
    const points = STATE.currentItinerary.points;

    if (!name) {
        showToast('O nome do itinerário é obrigatório.', 'warning');
        return;
    }

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            showToast('A data de fim deve ser igual ou posterior à data de início.', 'warning');
            return;
        }
    }

    if (!points.length) {
        showToast('Selecione pelo menos 1 ponto turístico.', 'warning');
        return;
    }

    if (points.length > CONFIG.MAX_ITINERARY_POINTS) {
        showToast(`Máximo de ${CONFIG.MAX_ITINERARY_POINTS} pontos por itinerário.`, 'warning');
        return;
    }

    const payload = {
        name,
        startDate: startDate || null,
        endDate: endDate || null,
        points
    };

    try {
        const created = await apiPost('/itineraries', payload);
        if (created) {
            STATE.itineraries.push(created);
        } else {
            // fallback se API não devolver nada específico
            STATE.itineraries.push({
                id: Date.now(),
                ...payload
            });
        }

        persistSession();
        renderItinerariesList();
        clearCurrentItinerary();
        showToast('Itinerário criado com sucesso.', 'success');
    } catch (err) {
        console.warn('Erro ao guardar itinerário na API, a guardar localmente.', err);
        STATE.itineraries.push({
            id: Date.now(),
            ...payload
        });
        persistSession();
        renderItinerariesList();
        clearCurrentItinerary();
        showToast('Itinerário guardado localmente (backend indisponível).', 'warning');
    }
}

async function loadItineraries() {
    if (!STATE.currentUser || !STATE.token) {
        // Apenas localStorage
        renderItinerariesList();
        return;
    }

    try {
        const list = await apiGet('/itineraries');
        if (Array.isArray(list)) {
            STATE.itineraries = list;
            persistSession();
        }
    } catch (err) {
        console.warn('Erro ao obter itinerários da API, a usar dados locais.', err);
    } finally {
        renderItinerariesList();
    }
}

// === PDF Export ===
function exportItineraryToPDF(itineraryId) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        showToast('Biblioteca de geração de PDF não está disponível.', 'error');
        return;
    }

    const it = STATE.itineraries.find(i => String(i.id) === String(itineraryId));
    if (!it) {
        showToast('Itinerário não encontrado.', 'error');
        return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(it.name || 'Itinerário Açores', 10, 20);

    doc.setFontSize(11);
    doc.text(`Datas: ${formatDateRange(it.startDate, it.endDate)}`, 10, 30);

    const points = (it.points || it.locations || []).map(p => {
        const id = typeof p === 'number' ? p : p.id || p.locationId;
        const loc = findLocationById(id);
        return loc ? `${loc.name} (${loc.island || 'Açores'})` : `Ponto #${id}`;
    });

    doc.text('Pontos turísticos:', 10, 40);

    let y = 48;
    points.forEach((p, idx) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(`${idx + 1}. ${p}`, 10, y);
        y += 7;
    });

    doc.save(`${(it.name || 'itinerario').replace(/\s+/g, '_')}.pdf`);
    showToast('PDF gerado com sucesso.', 'success');
}

// === Meteorologia ===
async function loadWeather(location) {
    const widget = document.getElementById('weatherWidget');
    if (!widget) return;

    if (!location.latitude || !location.longitude) {
        widget.innerHTML = `
            <strong>Meteorologia</strong>
            <p class="muted">Coordenadas não disponíveis para este local.</p>
        `;
        return;
    }

    try {
        // Primeiro tenta /weather, se falhar tenta /tempo (de acordo com RAML)
        let data;
        try {
            data = await apiGet(`/weather?lat=${location.latitude}&lon=${location.longitude}`);
        } catch {
            data = await apiGet(`/tempo?lat=${location.latitude}&lon=${location.longitude}`);
        }

        if (!data) {
            widget.innerHTML = `
                <strong>Meteorologia</strong>
                <p class="muted">Dados meteorológicos indisponíveis.</p>
            `;
            return;
        }

        const temp = data.temperature ?? data.temp ?? null;
        const condition = data.condition || data.summary || 'Condição desconhecida';
        const wind = data.windSpeed ?? data.wind ?? null;
        const alerts = data.alerts || [];

        widget.innerHTML = `
            <strong>Meteorologia</strong>
            <p>${temp !== null ? `${temp}°C` : ''} ${condition}</p>
            ${wind !== null ? `<p class="muted">Vento: ${wind} km/h</p>` : ''}
            ${
                alerts.length
                    ? `<div class="weather-alert">
                           ⚠ ${alerts[0].title || 'Alerta meteorológico ativo.'}
                       </div>`
                    : ''
            }
        `;
    } catch (err) {
        console.warn('Erro a carregar meteorologia', err);
        widget.innerHTML = `
            <strong>Meteorologia</strong>
            <p class="muted">Não foi possível obter os dados meteorológicos.</p>
        `;
    }
}

// === Ratings / Comentários ===
async function openLocationDetails(locationId) {
    const location = findLocationById(locationId);
    if (!location) return;

    STATE.selectedLocation = location;
    const modal = document.getElementById('locationModal');
    if (modal) modal.classList.add('active');

    // Tentar obter detalhes completos do backend
    try {
        const details = await apiGet(`/locations/${location.id}`);
        renderLocationDetails(location, details || {});
    } catch (err) {
        console.warn('Erro a carregar detalhes do local, a usar dados básicos.', err);
        renderLocationDetails(location, {});
    }
}

async function submitRating(e, locationId) {
    e.preventDefault();
    if (!ensureAuthenticated()) return;

    const ratingValue = parseInt(document.getElementById('ratingValue').value, 10);
    const comment = document.getElementById('ratingComment').value.trim();

    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
        showToast('Selecione uma classificação válida (1-5).', 'warning');
        return;
    }

    const payload = {
        locationId,
        rating: ratingValue,
        comment
    };

    try {
        await apiPost('/ratings', payload);
        showToast('Avaliação enviada com sucesso.', 'success');
        // Recarregar detalhes para refletir nova avaliação
        openLocationDetails(locationId);
    } catch (err) {
        console.warn('Erro ao enviar rating para API, apenas local.', err);
        showToast('Não foi possível enviar a avaliação (backend indisponível).', 'warning');
    }
}

// === Data Loading from API ===
async function loadInitialData() {
    setLoading(true);
    try {
        const locations = await apiGet('/locations');
        if (Array.isArray(locations) && locations.length) {
            DATA.locations = locations;
            STATE.allLocations = locations;
        }

        // Construir estatísticas de ilhas com base nas localizações carregadas
        const staticIslandsIndex = new Map(DATA.islands.map(i => [i.name, i]));
        const islandMap = new Map();

        DATA.locations.forEach(loc => {
            const name = loc.island || 'Açores';
            if (!islandMap.has(name)) {
                islandMap.set(name, { name, locations: 0 });
            }
            islandMap.get(name).locations += 1;
        });

        DATA.islands = Array.from(islandMap.values()).map(island => {
            const base = staticIslandsIndex.get(island.name);
            return base ? { ...base, locations: island.locations } : island;
        });

        renderHomeFromCurrentData();
        renderAllLocations();
    } catch (err) {
        console.warn('Falha ao carregar dados da API, a usar dataset estático.', err);
        showToast('A carregar dados em cache. Algumas informações podem estar desatualizadas.', 'warning');
        renderHomeFromCurrentData();
        renderAllLocations();
    } finally {
        setLoading(false);
    }
}

// === Home Rendering ===
function renderHomeFromCurrentData() {
    renderIslands(
        document.getElementById('islandsGrid'),
        DATA.islands.slice(0, 3)
    );
    STATE.allLocations = [...DATA.locations];
    renderLocations(
        document.getElementById('popularLocations'),
        STATE.allLocations.slice(0, 6)
    );
}

// === Initialization ===
function init() {
    restoreSession();
    updateAuthUI();
    renderHomeFromCurrentData();
    renderAllLocations();
    loadInitialData(); // tenta substituir dados estáticos pelos da API

    console.log('Açores Tourism App initialized successfully!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
