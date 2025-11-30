// ======================================================
// Azores Uncharted Platform - Frontend (Experience API)
// ======================================================

// ----------------------------------------
// Config & State
// ----------------------------------------
const CONFIG = {
    API_BASE_URL: 'https://tourism-api-prod.us-e2.cloudhub.io/api/v1'
};

const STATE = {
    token: null,
    currentUser: null,
    profile: null,
    islands: [],
    locations: [],
    favorites: [],
    itineraries: [],
    currentItineraryLocationIds: []
};

// ----------------------------------------
// Session persistence (localStorage)
// ----------------------------------------
function restoreSession() {
    try {
        const raw = localStorage.getItem('azores_app_session');
        if (!raw) return;
        const data = JSON.parse(raw);
        STATE.token = data.token || null;
        STATE.currentUser = data.user || null;
    } catch (err) {
        console.warn('Erro a restaurar sessão', err);
    }
}

function persistSession() {
    try {
        localStorage.setItem(
            'azores_app_session',
            JSON.stringify({
                token: STATE.token,
                user: STATE.currentUser
            })
        );
    } catch (err) {
        console.warn('Erro a guardar sessão', err);
    }
}

function clearSession() {
    STATE.token = null;
    STATE.currentUser = null;
    STATE.profile = null;
    STATE.favorites = [];
    STATE.itineraries = [];
    STATE.currentItineraryLocationIds = [];
    try {
        localStorage.removeItem('azores_app_session');
    } catch (err) {
        console.warn('Erro a limpar sessão', err);
    }
}

// ----------------------------------------
// API Layer (fetch + JWT)
// ----------------------------------------
async function apiRequest(path, {
    method = 'GET',
    headers = {},
    body = null,
    skipAuth = false,
    skipJson = false
} = {}) {
    const url = CONFIG.API_BASE_URL + path;

    const finalHeaders = {
        Accept: 'application/json',
        ...headers
    };

    if (body != null && !(body instanceof FormData) && !skipJson) {
        finalHeaders['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    if (!skipAuth && STATE.token) {
        finalHeaders['Authorization'] = `Bearer ${STATE.token}`;
    }

    const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body
    });

    const contentType = response.headers.get('Content-Type') || '';
    let data = null;

    if (!skipJson) {
        if (contentType.includes('application/json')) {
            data = await response.json().catch(() => null);
        } else {
            data = await response.text().catch(() => null);
        }
    }

    if (!response.ok) {
        const err = new Error('Erro na chamada à API');
        err.status = response.status;
        err.data = data;
        throw err;
    }

    return data;
}

function apiGet(path, options = {}) {
    return apiRequest(path, { method: 'GET', ...options });
}

function apiPost(path, body, options = {}) {
    return apiRequest(path, { method: 'POST', body, ...options });
}

// ----------------------------------------
// Normalizers (ajuste de campos da API)
// ----------------------------------------
function normalizeIsland(apiIsland) {
    if (!apiIsland) return null;
    return {
        id: apiIsland.id,
        name: apiIsland.name || '',
        description: apiIsland.description || '',
        image: apiIsland.imageUrl || apiIsland.image || '',
        locations:
            apiIsland.locations ??
            apiIsland.numLocations ??
            apiIsland.numberOfLocations ??
            null
    };
}

function normalizeLocationCard(apiLoc) {
    if (!apiLoc) return null;
    return {
        id: apiLoc.id,
        name: apiLoc.name || '',
        island: apiLoc.island || apiLoc.islandName || '',
        category: apiLoc.category || apiLoc.categoryName || '',
        description: apiLoc.description || '',
        image: apiLoc.imageUrl || apiLoc.image || '',
        rating:
            apiLoc.rating ??
            apiLoc.averageRating ??
            (apiLoc.ratings && apiLoc.ratings.average) ??
            null,
        ratingCount:
            apiLoc.ratingCount ??
            apiLoc.totalRatings ??
            apiLoc.numberOfRatings ??
            (apiLoc.ratings && apiLoc.ratings.count) ??
            0
    };
}

function normalizeItinerary(raw) {
    if (!raw) return null;
    const locationIds =
        raw.locationIds ||
        (Array.isArray(raw.locations) ? raw.locations.map(l => l.id) : []) ||
        [];
    return {
        id: raw.id,
        name: raw.name || '',
        startDate: raw.startDate || raw.start || '',
        endDate: raw.endDate || raw.end || '',
        locationIds,
        totalDistance: raw.totalDistance ?? raw.distance ?? null
    };
}

function normalizeRating(raw) {
    if (!raw) return null;
    return {
        author: raw.author || raw.userName || 'Utilizador',
        rating: raw.rating,
        comment: raw.comment || raw.text || ''
    };
}

// ----------------------------------------
// UI Helpers (toasts, auth UI)
// ----------------------------------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // fallback minimalista
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.classList.add('toast');

    if (type === 'success') toast.classList.add('toast-success');
    if (type === 'error') toast.classList.add('toast-error');
    if (type === 'warning') toast.classList.add('toast-warning');

    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    // animação
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (STATE.currentUser) {
        if (authButtons) authButtons.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');

        const initialEl = document.getElementById('userInitial');
        if (initialEl) {
            const name = STATE.currentUser.name || STATE.currentUser.email || '';
            const initial = name ? name.charAt(0).toUpperCase() : 'U';
            initialEl.textContent = initial;
        }
    } else {
        if (authButtons) authButtons.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
    }
}

function ensureAuthenticated() {
    if (!STATE.token || !STATE.currentUser) {
        showToast('Para utilizar esta funcionalidade, por favor inicie sessão.', 'warning');
        openModal('login');
        return false;
    }
    return true;
}

// ----------------------------------------
// Auth (login / register / logout)
// ----------------------------------------
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
        STATE.token = result.token;
        STATE.currentUser = result.user;
        persistSession();
        updateAuthUI();
        closeModal('login');
        showToast('Sessão iniciada com sucesso.', 'success');

        await Promise.all([
            loadProfile(),
            loadFavorites(),
            loadItineraries()
        ]);
    } catch (err) {
        console.warn('Erro no login', err);
        if (err.status === 401) {
            showToast('Credenciais inválidas.', 'error');
        } else {
            showToast('Não foi possível autenticar. Verifica o backend ou tenta mais tarde.', 'error');
        }
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
        const result = await apiPost('/auth/register', { name, email, password }, { skipAuth: true });
        STATE.token = result.token;
        STATE.currentUser = result.user;
        persistSession();
        updateAuthUI();
        closeModal('register');
        showToast('Conta criada e sessão iniciada.', 'success');

        await Promise.all([
            loadProfile(),
            loadFavorites(),
            loadItineraries()
        ]);
    } catch (err) {
        console.warn('Erro no registo', err);
        showToast('Não foi possível registar. Verifica o backend ou tenta mais tarde.', 'error');
    }
}

async function logout() {
    try {
        if (STATE.token) {
            await apiPost('/auth/logout', null, { skipJson: true }).catch(() => {});
        }
    } catch (err) {
        console.warn('Erro no logout da API', err);
    } finally {
        clearSession();
        updateAuthUI();
        showSection('home');
        showToast('Sessão terminada.', 'info');
    }
}

// ----------------------------------------
// Navegação & Modais
// ----------------------------------------
function showSection(section) {
    document.querySelectorAll('.container > section').forEach(s => {
        s.classList.add('hidden');
    });

    const sectionEl = document.getElementById(section + 'Section');
    if (sectionEl) sectionEl.classList.remove('hidden');

    if (section === 'islands') {
        renderAllIslands();
    } else if (section === 'locations') {
        renderAllLocations();
    } else if (section === 'profile' && STATE.currentUser) {
        renderProfile();
        renderFavoritesInProfile();
        renderItinerariesInProfile();
    } else if (section === 'favorites') {
        renderFavoritesSection();
    } else if (section === 'itineraries') {
        renderItinerariesSection();
    }
}

function openModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) modal.classList.add('active');
}

function closeModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) modal.classList.remove('active');
}

function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    if (modal) modal.classList.remove('active');
}

// ----------------------------------------
// Renderização: Ilhas e Locais
// ----------------------------------------
function renderIslands(container, islands) {
    if (!container) return;

    if (!islands || islands.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Nenhuma ilha encontrada.</p>';
        return;
    }

    container.innerHTML = islands.map(island => `
        <div class="island-card" onclick="filterByIsland('${island.name}')">
            <div class="island-image" style="background-image: url('${island.image || ''}')"></div>
            <div class="island-content">
                <div class="island-name">${island.name}</div>
                <div class="island-stats">
                    <span>📍 ${island.locations != null ? island.locations : ''} locais</span>
                </div>
            </div>
        </div>
    `).join('');
}

function isLocationFavorite(locationId) {
    return (STATE.favorites || []).some(
        f => String(f.id) === String(locationId)
    );
}

function renderLocations(container, locations) {
    if (!container) return;

    if (!locations || locations.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Nenhum local encontrado.</p>';
        return;
    }

    container.innerHTML = locations.map(loc => {
        const fav = isLocationFavorite(loc.id);
        const avg = loc.rating != null ? Number(loc.rating).toFixed(1) : '-';
        const count = loc.ratingCount != null ? loc.ratingCount : 0;

        return `
            <div class="location-card" onclick="openLocationDetails(${loc.id})">
                <button
                    type="button"
                    class="favorite-toggle ${fav ? 'active' : ''}"
                    onclick="toggleFavorite(event, ${loc.id})"
                    aria-label="Marcar como favorito"
                >
                    ${fav ? '♥' : '♡'}
                </button>
                <div class="location-image" style="background-image: url('${loc.image || ''}')"></div>
                <div class="location-content">
                    <div class="location-header">
                        <div class="location-name">${loc.name}</div>
                        <div class="category-badge">${loc.category || ''}</div>
                    </div>
                    <div class="location-island">📍 ${loc.island || ''}</div>
                    <div class="location-description">${loc.description || ''}</div>
                    <div class="rating">
                        <span class="stars">⭐</span>
                        <span style="font-weight: 700; color: var(--accent);">
                            ${avg}
                        </span>
                        <span style="color: var(--text-muted);">
                            (${count})
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAllIslands() {
    const container = document.getElementById('allIslandsGrid');
    renderIslands(container, STATE.islands);
}

function renderAllLocations() {
    const islandFilter = document.getElementById('islandFilter');

    if (islandFilter && islandFilter.children.length === 1 && STATE.islands.length > 0) {
        STATE.islands.forEach(island => {
            const opt = document.createElement('option');
            opt.value = island.name;
            opt.textContent = island.name;
            islandFilter.appendChild(opt);
        });
    }

    const container = document.getElementById('allLocations');
    renderLocations(container, STATE.locations);
}

// ----------------------------------------
// Perfil + Favoritos + Itinerários (secções)
// ----------------------------------------
function renderProfile() {
    if (!STATE.currentUser) return;
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');

    if (nameEl) nameEl.textContent = STATE.currentUser.name || '';
    if (emailEl) emailEl.textContent = STATE.currentUser.email || '';
}

function renderFavoritesSection() {
    const container = document.getElementById('favoriteLocations');
    renderLocations(container, STATE.favorites);
}

function renderFavoritesInProfile() {
    const profileSection = document.getElementById('profileSection');
    if (!profileSection) return;

    let container = document.getElementById('profileFavorites');
    if (!container) {
        container = document.createElement('div');
        container.id = 'profileFavorites';
        container.style.marginTop = '2rem';
        container.innerHTML = `
            <h3 style="margin-bottom: 1rem;">Favoritos</h3>
            <div class="locations-grid" id="profileFavoriteLocations"></div>
        `;
        profileSection.appendChild(container);
    }

    const grid = document.getElementById('profileFavoriteLocations');
    renderLocations(grid, STATE.favorites);
}

function renderItinerariesSection() {
    const list = document.getElementById('itinerariesList');
    if (!list) return;

    const its = STATE.itineraries || [];
    if (!its.length) {
        list.innerHTML = '<p class="muted">Ainda não existem itinerários.</p>';
        return;
    }

    list.innerHTML = its.map(it => {
        const count = Array.isArray(it.locationIds) ? it.locationIds.length : 0;
        const distance = it.totalDistance != null ? `${it.totalDistance} km` : '';
        const dateRange =
            (it.startDate || it.endDate)
                ? `${it.startDate || ''}${it.endDate ? ' — ' + it.endDate : ''}`
                : '';

        const metaParts = [];
        if (count) metaParts.push(`${count} ponto${count > 1 ? 's' : ''}`);
        if (distance) metaParts.push(distance);

        return `
            <div class="itinerary-list-item">
                <div>
                    <h4>${it.name}</h4>
                    ${metaParts.length ? `<p class="muted">${metaParts.join(' • ')}</p>` : ''}
                    ${dateRange ? `<p class="muted">${dateRange}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderItinerariesInProfile() {
    const profileSection = document.getElementById('profileSection');
    if (!profileSection) return;

    let container = document.getElementById('profileItineraries');
    if (!container) {
        container = document.createElement('div');
        container.id = 'profileItineraries';
        container.style.marginTop = '2rem';
        container.innerHTML = `
            <h3 style="margin-bottom: 1rem;">Itinerários</h3>
            <div id="profileItinerariesList" class="itineraries-list"></div>
        `;
        profileSection.appendChild(container);
    }

    const list = document.getElementById('profileItinerariesList');
    if (!list) return;

    const its = STATE.itineraries || [];
    if (!its.length) {
        list.innerHTML = '<p class="muted">Ainda não existem itinerários.</p>';
        return;
    }

    list.innerHTML = its.map(it => {
        const count = Array.isArray(it.locationIds) ? it.locationIds.length : 0;
        const distance = it.totalDistance != null ? `${it.totalDistance} km` : '';
        const dateRange =
            (it.startDate || it.endDate)
                ? `${it.startDate || ''}${it.endDate ? ' — ' + it.endDate : ''}`
                : '';

        const metaParts = [];
        if (count) metaParts.push(`${count} ponto${count > 1 ? 's' : ''}`);
        if (distance) metaParts.push(distance);

        return `
            <div class="itinerary-list-item">
                <div>
                    <h4>${it.name}</h4>
                    ${metaParts.length ? `<p class="muted">${metaParts.join(' • ')}</p>` : ''}
                    ${dateRange ? `<p class="muted">${dateRange}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ----------------------------------------
// Loading data from Experience API
// ----------------------------------------
async function loadIslands() {
    try {
        const islands = await apiGet('/islands');
        if (Array.isArray(islands)) {
            STATE.islands = islands.map(normalizeIsland);
            // Home: 3 ilhas em destaque
            const homeGrid = document.getElementById('islandsGrid');
            if (homeGrid) {
                renderIslands(homeGrid, STATE.islands.slice(0, 3));
            }
        }
    } catch (err) {
        console.warn('Erro ao carregar ilhas', err);
    }
}

async function loadLocations(params = {}) {
    try {
        const searchParams = new URLSearchParams();
        if (params.island) searchParams.set('island', params.island);
        if (params.category) searchParams.set('category', params.category);
        if (params.search) searchParams.set('search', params.search);

        const query = searchParams.toString();
        const path = query ? `/locations?${query}` : '/locations';

        const locations = await apiGet(path);
        if (Array.isArray(locations)) {
            STATE.locations = locations.map(normalizeLocationCard);

            // Home: locais populares (primeiros 6, por agora)
            if (!params.island && !params.category && !params.search) {
                const popularContainer = document.getElementById('popularLocations');
                if (popularContainer) {
                    renderLocations(popularContainer, STATE.locations.slice(0, 6));
                }
            }

            renderAllLocations();
        }
    } catch (err) {
        console.warn('Erro ao carregar locais', err);
    }
}

async function loadProfile() {
    if (!STATE.token) return;
    try {
        const profile = await apiGet('/profile');
        if (profile && profile.name && profile.email) {
            STATE.profile = profile;
            STATE.currentUser = {
                ...(STATE.currentUser || {}),
                name: profile.name,
                email: profile.email
            };
            persistSession();
            updateAuthUI();
        }
    } catch (err) {
        console.warn('Erro ao carregar perfil', err);
        if (err.status === 401) {
            clearSession();
            updateAuthUI();
        }
    }
}

async function loadFavorites() {
    if (!STATE.token) return;
    try {
        const favs = await apiGet('/profile/favorites');
        if (Array.isArray(favs)) {
            STATE.favorites = favs.map(normalizeLocationCard);
        }
    } catch (err) {
        console.warn('Erro ao carregar favoritos', err);
    }
}

async function loadItineraries() {
    if (!STATE.token) return;
    try {
        const resp = await apiGet('/profile/itineraries');
        const list = Array.isArray(resp && resp.data) ? resp.data : [];
        STATE.itineraries = list.map(normalizeItinerary);
    } catch (err) {
        console.warn('Erro ao carregar itinerários', err);
    }
}

// ----------------------------------------
// Filtros e pesquisa
// ----------------------------------------
function filterByIsland(islandName) {
    showSection('locations');
    const islandFilter = document.getElementById('islandFilter');
    if (islandFilter) islandFilter.value = islandName;
    filterLocations();
}

async function filterLocations() {
    const islandVal = document.getElementById('islandFilter')?.value || '';
    const categoryVal = document.getElementById('categoryFilter')?.value || '';

    await loadLocations({
        island: islandVal || undefined,
        category: categoryVal || undefined
    });
}

async function searchLocations() {
    const query = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    await loadLocations({
        search: query || undefined
    });
    showSection('locations');
}

// ----------------------------------------
// Detalhe do Local + Weather + Ratings
// ----------------------------------------
async function openLocationDetails(locationId) {
    const modal = document.getElementById('locationModal');
    const content = document.getElementById('locationModalContent');
    if (!modal || !content) return;

    const baseLoc =
        STATE.locations.find(l => String(l.id) === String(locationId)) ||
        STATE.favorites.find(l => String(l.id) === String(locationId)) ||
        { id: locationId };

    modal.classList.add('active');
    content.innerHTML = `
        <p class="muted">A carregar detalhes para <strong>${baseLoc.name || 'local'}</strong>...</p>
    `;

    try {
        const [detail, weather, ratingsResp] = await Promise.all([
            apiGet(`/locations/${locationId}`),
            apiGet(`/locations/${locationId}/weather`).catch(() => null),
            apiGet(`/locations/${locationId}/ratings`).catch(() => null)
        ]);

        const loc = normalizeLocationCard(detail || baseLoc) || baseLoc;
        const ratingsList = extractRatingsList(ratingsResp);

        renderLocationDetails(loc, weather, ratingsList);
    } catch (err) {
        console.warn('Erro a carregar detalhe do local', err);
        content.innerHTML = `
            <p style="color: var(--text-secondary);">
                Não foi possível carregar os detalhes deste local.
            </p>
        `;
    }
}

function extractRatingsList(ratingsResp) {
    if (!ratingsResp) return [];
    if (Array.isArray(ratingsResp)) return ratingsResp.map(normalizeRating);
    if (Array.isArray(ratingsResp.data)) return ratingsResp.data.map(normalizeRating);
    if (Array.isArray(ratingsResp.ratings)) return ratingsResp.ratings.map(normalizeRating);
    return [];
}

function buildWeatherHtml(weather) {
    if (!weather) {
        return '<p class="muted">Meteorologia indisponível para este local.</p>';
    }

    let temp = null;
    let condition = '';
    let wind = null;

    if (typeof weather.temperature === 'number') {
        temp = weather.temperature;
    } else if (weather.current && typeof weather.current.temperature === 'number') {
        temp = weather.current.temperature;
    } else if (weather.current_weather && typeof weather.current_weather.temperature === 'number') {
        temp = weather.current_weather.temperature;
    } else if (weather.current) {
        const c = weather.current;
        temp = c.temperature ?? c.temperature_2m ?? null;
    }

    condition = weather.condition || weather.summary || '';

    if (weather.current_weather && typeof weather.current_weather.windspeed === 'number') {
        wind = weather.current_weather.windspeed;
    } else if (typeof weather.windSpeed === 'number') {
        wind = weather.windSpeed;
    } else if (weather.current) {
        const c = weather.current;
        wind = c.windSpeed ?? c.windspeed_10m ?? null;
    }

    const parts = [];
    if (temp != null) parts.push(`<span><strong>${temp}°C</strong></span>`);
    if (condition) parts.push(`<span>${condition}</span>`);
    if (wind != null) parts.push(`<span>Vento: ${wind} km/h</span>`);

    if (!parts.length) {
        return '<p class="muted">Meteorologia indisponível para este local.</p>';
    }

    return `<div class="weather-summary">${parts.join(' · ')}</div>`;
}

function renderLocationDetails(loc, weather, ratings) {
    const content = document.getElementById('locationModalContent');
    if (!content) return;

    const avgRating = loc.rating != null ? Number(loc.rating).toFixed(1) : '-';
    const ratingCount =
        loc.ratingCount != null ? loc.ratingCount : (ratings ? ratings.length : 0);

    content.innerHTML = `
        <div class="location-details">
            <div class="location-details-main">
                <div class="location-hero">
                    <div class="location-image large" style="background-image: url('${loc.image || ''}')"></div>
                    <div class="location-hero-content">
                        <div class="location-header">
                            <div class="location-name">${loc.name || ''}</div>
                            <div class="category-badge">${loc.category || ''}</div>
                        </div>
                        <div class="location-island">📍 ${loc.island || ''}</div>
                        <div class="location-description">${loc.description || ''}</div>
                        <div class="location-actions-row">
                            <button
                                type="button"
                                class="btn btn-outline"
                                onclick="addToItinerary(event, ${loc.id})"
                            >
                                Adicionar ao itinerário
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="location-details-sidebar">
                <div class="highlight-card">
                    <h3>Meteorologia</h3>
                    ${buildWeatherHtml(weather)}
                </div>

                <div class="ratings-block">
                    <div class="ratings-summary">
                        <span class="stars">⭐</span>
                        <span><strong>${avgRating}</strong> / 5</span>
                        <span class="muted">(${ratingCount} avaliações)</span>
                    </div>

                    <div class="comments-list">
                        ${
        ratings && ratings.length
            ? ratings.map(r => `
                                    <div class="comment-item">
                                        <div class="comment-meta">
                                            <span>${r.author}</span>
                                            <span>${r.rating ? `${r.rating}★` : ''}</span>
                                        </div>
                                        <div>${r.comment}</div>
                                    </div>
                                `).join('')
            : '<p class="muted">Ainda não existem comentários para este local.</p>'
    }
                    </div>

                    <form class="location-rating-form" onsubmit="submitRating(event, ${loc.id})">
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
                        <div class="form-group">
                            <label>Comentário (opcional)</label>
                            <textarea id="ratingComment" rows="3" placeholder="Partilhe a sua experiência."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Enviar avaliação</button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

async function submitRating(e, locationId) {
    e.preventDefault();
    if (!ensureAuthenticated()) return;

    const value = Number(document.getElementById('ratingValue').value);
    const comment = document.getElementById('ratingComment').value.trim();

    if (!value || value < 1 || value > 5) {
        showToast('Selecione uma classificação entre 1 e 5.', 'warning');
        return;
    }

    try {
        await apiPost(`/locations/${locationId}/ratings`, {
            rating: value,
            comment: comment || null
        });
        showToast('Avaliação enviada com sucesso!', 'success');
        // Recarregar detalhe com ratings atualizados
        openLocationDetails(locationId);
    } catch (err) {
        console.warn('Erro ao enviar avaliação', err);
        showToast('Não foi possível enviar a avaliação.', 'error');
    }
}

// ----------------------------------------
// Favoritos (toggle + integração API)
// ----------------------------------------
async function toggleFavorite(e, locationId) {
    if (e) e.stopPropagation();
    if (!ensureAuthenticated()) return;

    const alreadyFav = isLocationFavorite(locationId);

    try {
        if (alreadyFav) {
            await apiRequest(`/profile/favorites/${locationId}`, {
                method: 'DELETE'
            });
            showToast('Removido dos favoritos.', 'info');
        } else {
            await apiPost('/profile/favorites', { locationId });
            showToast('Adicionado aos favoritos.', 'success');
        }

        // Recarregar favoritos do backend para manter tudo em sync
        await loadFavorites();

        // Atualizar UI dependente
        renderAllLocations();
        renderFavoritesSection();
        if (STATE.currentUser) {
            renderFavoritesInProfile();
        }
    } catch (err) {
        console.warn('Erro ao atualizar favoritos', err);
        showToast('Não foi possível atualizar os favoritos.', 'error');
    }
}

// ----------------------------------------
// Itinerários (criação & lista)
// ----------------------------------------
function resolveLocationById(id) {
    return (
        STATE.locations.find(l => String(l.id) === String(id)) ||
        STATE.favorites.find(l => String(l.id) === String(id)) ||
        null
    );
}

function renderCurrentItineraryPoints() {
    const list = document.getElementById('currentItineraryPoints');
    if (!list) return;

    const ids = STATE.currentItineraryLocationIds || [];

    if (!ids.length) {
        list.innerHTML =
            '<li class="muted" style="font-size:0.9rem;">Ainda não adicionou locais a este itinerário. Use o botão "Adicionar ao itinerário" em qualquer local.</li>';
        return;
    }

    list.innerHTML = ids.map(id => {
        const loc = resolveLocationById(id) || { name: `Local ${id}` };
        return `
            <li>
                <span>${loc.name}</span>
                <button
                    type="button"
                    class="btn btn-outline"
                    onclick="removeFromCurrentItinerary(${id})"
                >
                    &times;
                </button>
            </li>
        `;
    }).join('');
}

function addToItinerary(e, locationId) {
    if (e) e.stopPropagation();
    if (!ensureAuthenticated()) return;

    if (!Array.isArray(STATE.currentItineraryLocationIds)) {
        STATE.currentItineraryLocationIds = [];
    }

    const exists = STATE.currentItineraryLocationIds.some(
        id => String(id) === String(locationId)
    );
    if (exists) {
        showToast('Este local já está no itinerário atual.', 'info');
        return;
    }

    STATE.currentItineraryLocationIds.push(locationId);
    renderCurrentItineraryPoints();
    showToast('Local adicionado ao itinerário atual.', 'success');
}

function removeFromCurrentItinerary(locationId) {
    STATE.currentItineraryLocationIds = (STATE.currentItineraryLocationIds || [])
        .filter(id => String(id) !== String(locationId));
    renderCurrentItineraryPoints();
}

function clearCurrentItinerary() {
    STATE.currentItineraryLocationIds = [];
    renderCurrentItineraryPoints();
    const form = document.getElementById('itineraryForm');
    if (form) form.reset();
    showToast('Itinerário limpo.', 'info');
}

async function saveItinerary(e) {
    e.preventDefault();
    if (!ensureAuthenticated()) return;

    const nameEl = document.getElementById('itineraryName');
    const startEl = document.getElementById('itineraryStart');
    const endEl = document.getElementById('itineraryEnd');

    const name = nameEl?.value.trim();
    const startDate = startEl?.value || null;
    const endDate = endEl?.value || null;
    const locationIds = STATE.currentItineraryLocationIds || [];

    if (!name || !locationIds.length) {
        showToast('Indique um nome e adicione pelo menos um local ao itinerário.', 'warning');
        return;
    }

    try {
        const created = await apiPost('/profile/itineraries', {
            name,
            startDate,
            endDate,
            locationIds
        });

        const normalized = normalizeItinerary(created);
        if (!STATE.itineraries) STATE.itineraries = [];
        STATE.itineraries.push(normalized);

        clearCurrentItinerary();
        renderItinerariesSection();
        renderItinerariesInProfile();
        showToast('Itinerário guardado com sucesso.', 'success');
    } catch (err) {
        console.warn('Erro ao guardar itinerário', err);
        showToast('Não foi possível guardar o itinerário.', 'error');
    }
}

// ----------------------------------------
// Init
// ----------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    restoreSession();
    updateAuthUI();

    // Liga o submit do formulário de itinerário (caso não uses onsubmit inline)
    const itineraryForm = document.getElementById('itineraryForm');
    if (itineraryForm) {
        itineraryForm.addEventListener('submit', saveItinerary);
    }
    renderCurrentItineraryPoints();

    await Promise.all([
        loadIslands(),
        loadLocations()
    ]);

    if (STATE.token) {
        await Promise.all([
            loadProfile(),
            loadFavorites(),
            loadItineraries()
        ]);
    }

    console.log('Azores Uncharted App (Experience API + detalhes + favoritos + itinerários + toasts) inicializado!');
});
