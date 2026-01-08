// ui.js
// UI geral (auth, navegação, ilhas, locais, perfil, favoritos, itinerários, detalhe)

import {
    STATE,
    apiGet,
    apiPost,
    apiRequest,
    normalizeIsland,
    normalizeLocationCard,
    normalizeItinerary,
    normalizeRating,
    persistSession,
    clearSession
} from './core.js';

// ----------------------------------------
// Global Variables for Maps
// ----------------------------------------
let currentMapInstance = null; // Mapa do modal de detalhes
let itineraryMapInstance = null; // Mapa da criação de itinerário
let itineraryRouteLayer = null; // (Opcional) Referência para camada de rota se necessário gestão fina

// ----------------------------------------
// FEATURE: MATH HELPERS (Para Otimização)
// ----------------------------------------
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da terra em km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// ----------------------------------------
// FEATURE: Otimização de Rota (UC-09)
// ----------------------------------------
export function optimizeItinerary() {
    const ids = STATE.currentItineraryLocationIds;
    if (!ids || ids.length < 3) {
        showToast('Adicione pelo menos 3 locais para otimizar.', 'warning');
        return;
    }

    // Resolver objetos completos para ter acesso a lat/lon
    const locations = ids.map(id => resolveLocationById(id)).filter(l => l && l.lat && l.lon);

    if (locations.length !== ids.length) {
        showToast('Alguns locais não têm coordenadas. Otimização parcial.', 'warning');
    }

    // Algoritmo "Nearest Neighbor"
    // Começa no primeiro ponto (assumimos que é o ponto de partida)
    const optimizedIds = [locations[0].id];
    let currentLoc = locations[0];
    let unvisited = locations.slice(1);

    while (unvisited.length > 0) {
        let nearest = null;
        let minDist = Infinity;
        let nearestIndex = -1;

        // Encontrar o mais próximo do atual
        unvisited.forEach((loc, index) => {
            const dist = getDistanceFromLatLonInKm(currentLoc.lat, currentLoc.lon, loc.lat, loc.lon);
            if (dist < minDist) {
                minDist = dist;
                nearest = loc;
                nearestIndex = index;
            }
        });

        if (nearest) {
            optimizedIds.push(nearest.id);
            currentLoc = nearest;
            unvisited.splice(nearestIndex, 1);
        } else {
            break;
        }
    }

    // Atualizar estado e UI
    STATE.currentItineraryLocationIds = optimizedIds;
    renderCurrentItineraryPoints();
    updateItineraryPreview();
    showToast('Rota otimizada com sucesso!', 'success');
}

// ----------------------------------------
// FEATURE: Alertas Meteorológicos (UC-06)
// ----------------------------------------
export async function renderWeatherAlerts() {
    const container = document.getElementById('homeAlertsContainer');
    if (!container) return;

    try {
        let alerts = [];
        const homeData = await apiGet('/home').catch(() => null);

        if (homeData && homeData.weatherAlerts) {
            alerts = homeData.weatherAlerts;
        }
        // Skip simulation if home endpoint doesn't exist

        if (alerts.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="weather-alert-banner" style="
                background: #fee2e2; 
                color: #b91c1c; 
                padding: 1rem; 
                border-radius: 8px; 
                margin-bottom: 2rem; 
                border: 1px solid #fecaca;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            ">
                <span>⚠️</span>
                <span><strong>Alerta Meteorológico:</strong> ${alert.message || alert}</span>
            </div>
        `).join('');

    } catch (err) {
        console.info('Home/alerts endpoint not available');
    }
}

// ----------------------------------------
// MAP HELPER FUNCTIONS (Leaflet Logic)
// ----------------------------------------

// 1. Inicializa o mapa de um local específico (Modal)
function initLocationMap(lat, lon, name) {
    if (!lat || !lon) return;

    // Se já existir um mapa, destruí-lo antes de criar um novo
    if (currentMapInstance) {
        currentMapInstance.remove();
        currentMapInstance = null;
    }

    setTimeout(() => {
        const mapContainer = document.getElementById('locationMap');
        if (!mapContainer) return;

        currentMapInstance = L.map('locationMap').setView([lat, lon], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(currentMapInstance);

        L.marker([lat, lon])
            .addTo(currentMapInstance)
            .bindPopup(`<b>${name}</b>`)
            .openPopup();

        currentMapInstance.invalidateSize();
    }, 100);
}

// 2. Inicializa o mapa do Itinerário (Secção Itinerários)
function initItineraryMap() {
    const mapContainer = document.getElementById('itineraryMap');
    if (!mapContainer) return;

    // Garante que o contentor está visível
    mapContainer.style.display = 'block';

    if (itineraryMapInstance) {
        itineraryMapInstance.invalidateSize();
        return;
    }

    // Coordenadas centrais (focadas nos Açores, ex: São Miguel como default)
    itineraryMapInstance = L.map('itineraryMap').setView([37.7412, -25.6756], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(itineraryMapInstance);
}

// 3. Desenha a rota e marcadores no mapa do Itinerário
async function updateItineraryPreview() {
    // Se não houver pontos, esconde o mapa
    if (!STATE.currentItineraryLocationIds || STATE.currentItineraryLocationIds.length === 0) {
        const container = document.getElementById('itineraryMap');
        if (container) container.style.display = 'none';
        return;
    }

    // Garante que o mapa existe
    initItineraryMap();

    // Limpar camadas anteriores (marcadores e linhas) para redesenhar
    itineraryMapInstance.eachLayer((layer) => {
        // Remove tudo que não seja o tile provider (mapa base)
        if (!!layer.toGeoJSON) {
            itineraryMapInstance.removeLayer(layer);
        }
    });

    const latLngs = [];

    // Adicionar Marcadores
    STATE.currentItineraryLocationIds.forEach((id, index) => {
        const loc = resolveLocationById(id);
        if (loc && loc.lat && loc.lon) {
            const point = [loc.lat, loc.lon];
            latLngs.push(point);

            L.marker(point)
                .addTo(itineraryMapInstance)
                .bindPopup(`<b>${index + 1}. ${loc.name}</b>`);
        }
    });

    // Desenhar Rota
    if (latLngs.length > 1) {
        // Linha reta imediata (feedback visual rápido)
        const polyline = L.polyline(latLngs, { color: 'grey', weight: 3, dashArray: '5, 10' }).addTo(itineraryMapInstance);
        itineraryMapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50] });

        // Tentar obter rota real da API (UC-09: Routes)
        try {
            await fetchAndDrawRealRoute(latLngs);
        } catch (err) {
            console.warn('Não foi possível carregar a rota detalhada da API.', err);
        }
    } else if (latLngs.length === 1) {
        itineraryMapInstance.setView(latLngs[0], 12);
    }
}

// 4. Busca rota real à API (Process API /routes)
async function fetchAndDrawRealRoute(points) {
    const fullPathCoordinates = [];

    // Itera par-a-par para pedir segmentos à API
    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];

        const originStr = `${start[0]},${start[1]}`;
        const destStr = `${end[0]},${end[1]}`;

        try {
            // Chamada à tua Process API (/routes)
            const routeData = await apiGet(`/routes?origin=${originStr}&destination=${destStr}`);

            if (routeData && routeData.path) {
                const segment = routeData.path.map(p => [p.lat, p.lon]);
                fullPathCoordinates.push(...segment);
            } else {
                // Fallback se a API não devolver path
                fullPathCoordinates.push(start, end);
            }
        } catch (e) {
            // Fallback em caso de erro
            fullPathCoordinates.push(start, end);
        }
    }

    if (fullPathCoordinates.length > 0) {
        // Desenha a linha "real" a azul
        L.polyline(fullPathCoordinates, { color: '#0ea5e9', weight: 5 }).addTo(itineraryMapInstance);
    }
}

// ----------------------------------------
// UI Helpers (toasts, auth UI, modais)
// ----------------------------------------
export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
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

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

export function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const adminNavItem = document.getElementById('adminNavItem');

    if (STATE.currentUser) {
        if (authButtons) authButtons.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');

        const initialEl = document.getElementById('userInitial');
        if (initialEl) {
            const base = STATE.currentUser.name || STATE.currentUser.email || 'U';
            initialEl.textContent = base.charAt(0).toUpperCase();
        }

        if (adminNavItem) {
            adminNavItem.classList.toggle('hidden', !STATE.isAdmin);
        }
    } else {
        if (authButtons) authButtons.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        if (adminNavItem) adminNavItem.classList.add('hidden');
    }
}

export function openModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) modal.classList.add('active');
}

export function closeModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) modal.classList.remove('active');
}

export function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    if (modal) modal.classList.remove('active');
}

export function ensureAuthenticated() {
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
export async function login(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        showToast('Preencha email e password.', 'warning');
        return;
    }

    try {
        const result = await apiPost('/users/login', { email, password }, { skipAuth: true });
        
        console.log('Login response:', result);
        
        // Database API returns user object directly
        STATE.token = 'client-session-' + Date.now();
        STATE.currentUser = {
            id: result.id,
            name: result.name,
            email: result.email,
            role: result.role || 'user'
        };
        
        // Check for admin role
        const role = STATE.currentUser.role;
        STATE.isAdmin = !!(role && String(role).toLowerCase().includes('admin'));
        
        // CRITICAL: Save to localStorage BEFORE calling any other functions
        persistSession();
        
        console.log('Saved to localStorage:', {
            token: STATE.token,
            user: STATE.currentUser
        });
        
        // Update UI
        updateAuthUI();
        closeModal('login');
        showToast('Sessão iniciada com sucesso.', 'success');

        // Load additional data (but DON'T let them overwrite currentUser)
        loadFavorites().catch(() => console.info('Favorites not available'));
        loadItineraries().catch(() => console.info('Itineraries not available'));
        
        // DON'T call loadProfile() - it might overwrite currentUser with wrong data
    } catch (err) {
        console.warn('Erro no login', err);
        if (err.status === 401) {
            showToast('Credenciais inválidas.', 'error');
        } else {
            showToast('Não foi possível autenticar. Verifica o backend.', 'error');
        }
    }
}

export async function register(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    if (!name || !email || !password) {
        showToast('Preencha todos os campos.', 'warning');
        return;
    }

    try {
        const result = await apiPost('/users', { 
            name: name,
            email: email, 
            password: password 
        }, { skipAuth: true });
        
        console.log('Register response:', result);
        
        // ✅ FIX: Handle null response from Database API
        if (!result || !result.id) {
            // Database API created user but didn't return it
            // Try to login immediately to get the user data
            try {
                const loginResult = await apiPost('/users/login', { email, password }, { skipAuth: true });
                
                STATE.token = 'client-session-' + Date.now();
                STATE.currentUser = {
                    id: loginResult.id,
                    name: loginResult.name,
                    email: loginResult.email,
                    role: loginResult.role || 'user'
                };
            } catch (loginErr) {
                // If login also fails, create minimal user object
                STATE.token = 'client-session-' + Date.now();
                STATE.currentUser = {
                    id: Date.now(), // Temporary ID
                    name: name,
                    email: email,
                    role: 'user'
                };
            }
        } else {
            // Normal path - Database API returned user
            STATE.token = 'client-session-' + Date.now();
            STATE.currentUser = {
                id: result.id,
                name: result.name,
                email: result.email,
                role: result.role || 'user'
            };
        }
        
        const role = STATE.currentUser.role;
        STATE.isAdmin = !!(role && String(role).toLowerCase().includes('admin'));
        
        persistSession();
        
        console.log('Saved to localStorage:', {
            token: STATE.token,
            user: STATE.currentUser
        });
        
        updateAuthUI();
        closeModal('register');
        showToast('Conta criada e sessão iniciada.', 'success');

        loadFavorites().catch(() => console.info('Favorites not available'));
        loadItineraries().catch(() => console.info('Itineraries not available'));
    } catch (err) {
        console.warn('Erro no registo', err);
        console.error('Register error details:', err);
        showToast('Não foi possível registar. O email pode já estar em uso.', 'error');
    }
}

export function logout() {
    clearSession();
    updateAuthUI();
    showSection('home');
    showToast('Sessão terminada.', 'info');
}

// ----------------------------------------
// Navegação SPA
// ----------------------------------------
export function showSection(section) {
    // Esconder todas as secções principais dentro da .container
    document.querySelectorAll('.container > section').forEach(s => {
        s.classList.add('hidden');
    });

    // Mostrar / esconder a Hero Section consoante a secção
    const hero = document.getElementById('heroSection');
    if (hero) {
        if (section === 'home') {
            hero.classList.remove('hidden');
        } else {
            hero.classList.add('hidden');
        }
    }

    // Mostrar a secção pedida
    const sectionEl = document.getElementById(section + 'Section');
    if (sectionEl) sectionEl.classList.remove('hidden');

    // Lógica específica por secção
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
        // Se já existirem pontos no itinerário atual, atualiza o mapa ao entrar na secção
        if (STATE.currentItineraryLocationIds && STATE.currentItineraryLocationIds.length > 0) {
            setTimeout(updateItineraryPreview, 200);
        }
    }
}

// Função para exportar um itinerário específico para PDF (UC-10)
export async function exportItineraryPDF(itineraryId) {
    if (!ensureAuthenticated()) return;

    const itinerary = STATE.itineraries.find(i => String(i.id) === String(itineraryId));
    
    console.log('=== PDF EXPORT DEBUG ===');
    console.log('Looking for itinerary ID:', itineraryId);
    console.log('Found itinerary:', itinerary);
    console.log('LocationIds:', itinerary?.locationIds);
    console.log('STATE.itineraries:', STATE.itineraries);
    console.log('=== END PDF DEBUG ===');
    
    if (!itinerary) {
        showToast('Itinerário não encontrado.', 'error');
        return;
    }

    // Verificar se a biblioteca jsPDF foi carregada
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('Erro ao carregar biblioteca de PDF.', 'error');
        return;
    }

    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(14, 165, 233); // Cor primária (azul)
    doc.text("Azores Uncharted", 105, 20, null, null, "center");

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Itinerário: ${itinerary.name}`, 20, 40);

    doc.setFontSize(12);
    doc.setTextColor(100);
    const dateText = (itinerary.startDate || itinerary.endDate)
        ? `Data: ${itinerary.startDate || ''} a ${itinerary.endDate || ''}`
        : 'Data: Não definida';
    doc.text(dateText, 20, 50);

    doc.line(20, 55, 190, 55); // Linha separadora

    // Listar Locais
    let yPos = 70;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Locais a visitar:", 20, yPos);
    yPos += 10;

    doc.setFontSize(12);

    if (itinerary.locationIds && itinerary.locationIds.length > 0) {
        itinerary.locationIds.forEach((locId, index) => {
            const loc = resolveLocationById(locId);
            const locName = loc ? loc.name : `Local #${locId}`;
            const locIsland = loc ? loc.island : '';

            doc.text(`${index + 1}. ${locName} (${locIsland})`, 25, yPos);
            yPos += 10;

            // Se a página encher, criar nova
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });
    } else {
        doc.text("Sem locais definidos.", 25, yPos);
    }

    // Rodapé
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Gerado por Azores Uncharted", 105, 290, null, null, "center");

    // Guardar ficheiro
    const safeName = itinerary.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`itinerario_${safeName}.pdf`);

    showToast('Download do PDF iniciado!', 'success');
}

// Tornar a função global para ser usada no onclick do HTML injetado
window.exportItineraryPDF = exportItineraryPDF;

// ----------------------------------------
// Renderização: Ilhas e Locais
// ----------------------------------------
export function renderIslands(container, islands) {
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

export function isLocationFavorite(locationId) {
    return (STATE.favorites || []).some(
        f => String(f.id) === String(locationId)
    );
}

export function renderLocations(container, locations) {
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

export function renderAllIslands() {
    const container = document.getElementById('allIslandsGrid');
    renderIslands(container, STATE.islands);
}

export function renderAllLocations() {
    const islandFilter = document.getElementById('islandFilter');

    if (islandFilter && STATE.islands.length > 0) {
        const existingValues = Array.from(islandFilter.options).map(o => o.value);
        STATE.islands.forEach(island => {
            if (!island || !island.name) return;
            if (!existingValues.includes(island.name)) {
                const opt = document.createElement('option');
                opt.value = island.name;
                opt.textContent = island.name;
                islandFilter.appendChild(opt);
            }
        });
    }

    const container = document.getElementById('allLocations');
    renderLocations(container, STATE.locations);
}

// ----------------------------------------
// Perfil + Favoritos + Itinerários - secções
// ----------------------------------------

// Alterna entre ver e editar o perfil
export function toggleEditProfile() {
    const viewMode = document.getElementById('profileViewMode');
    const editForm = document.getElementById('profileEditForm');

    if (!viewMode || !editForm) return;

    // Se vamos mostrar o formulário, preenchemos com os dados atuais
    if (editForm.classList.contains('hidden')) {
        document.getElementById('editProfileName').value = STATE.currentUser?.name || '';
        document.getElementById('editProfileEmail').value = STATE.currentUser?.email || '';
        document.getElementById('editProfilePassword').value = ''; // Limpar password

        viewMode.classList.add('hidden');
        editForm.classList.remove('hidden');
    } else {
        // Cancelar edição
        viewMode.classList.remove('hidden');
        editForm.classList.add('hidden');
    }
}

// Submeter alterações do perfil (UC-08)
export async function saveProfile(e) {
    e.preventDefault();
    if (!ensureAuthenticated()) return;

    const name = document.getElementById('editProfileName').value.trim();
    const email = document.getElementById('editProfileEmail').value.trim();
    const password = document.getElementById('editProfilePassword').value.trim();

    if (!name || !email) {
        showToast('Nome e email são obrigatórios.', 'warning');
        return;
    }

    const payload = { name, email };
    if (password) {
        payload.newPassword = password;
    }

    try {
        // Try /profile first, fallback to /users/{id}
        let updatedUser;
        try {
            updatedUser = await apiRequest('/profile', {
                method: 'PATCH',
                body: payload
            });
        } catch (err) {
            if (err.status === 404 && STATE.currentUser?.id) {
                // Fallback: try updating via /users/{id}
                updatedUser = await apiRequest(`/users/${STATE.currentUser.id}`, {
                    method: 'PATCH',
                    body: payload
                });
            } else {
                throw err;
            }
        }

        // Update local state
        STATE.currentUser = { ...STATE.currentUser, ...updatedUser };
        if (updatedUser.user) STATE.currentUser = updatedUser.user;

        persistSession();
        updateAuthUI();
        renderProfile();
        toggleEditProfile();

        showToast('Perfil atualizado com sucesso!', 'success');
    } catch (err) {
        console.warn('Erro ao atualizar perfil', err);
        showToast('A edição de perfil ainda não está disponível. Entre em contato com o administrador.', 'warning');
    }
}

export function renderProfile() {
    if (!STATE.currentUser) return;

    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const initialEl = document.getElementById('profileAvatarInitial');

    if (nameEl) nameEl.textContent = STATE.currentUser.name || 'Utilizador';
    if (emailEl) emailEl.textContent = STATE.currentUser.email || '';

    if (initialEl) {
        const base = STATE.currentUser.name || STATE.currentUser.email || 'U';
        initialEl.textContent = base.charAt(0).toUpperCase();
    }
}

export function renderFavoritesSection() {
    const container = document.getElementById('favoriteLocations');
    renderLocations(container, STATE.favorites);
}

export function renderFavoritesInProfile() {
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
        // Inserir antes dos itinerários ou no final se não existir placeholder
        const placeholder = document.getElementById('profileStatsPlaceholder');
        if(placeholder) {
            placeholder.parentNode.insertBefore(container, placeholder.nextSibling);
        } else {
            profileSection.appendChild(container); // Fallback
        }
    }

    const grid = document.getElementById('profileFavoriteLocations');
    renderLocations(grid, STATE.favorites);
}

export function renderItinerariesSection() {
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
                <div style="flex: 1;">
                    <h4>${it.name}</h4>
                    ${metaParts.length ? `<p class="muted">${metaParts.join(' • ')}</p>` : ''}
                    ${dateRange ? `<p class="muted">${dateRange}</p>` : ''}
                </div>
                <div class="itinerary-item-actions">
                     <button class="btn btn-outline btn-xs" onclick="exportItineraryPDF(${it.id})" title="Exportar PDF">
                        📄 PDF
                     </button>
                </div>
            </div>
        `;
    }).join('');
}

export function renderItinerariesInProfile() {
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

        // Inserir depois dos favoritos (se existir)
        const favContainer = document.getElementById('profileFavorites');
        if (favContainer) {
            favContainer.parentNode.insertBefore(container, favContainer.nextSibling);
        } else {
            profileSection.appendChild(container);
        }
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
                <div style="flex: 1;">
                    <h4>${it.name}</h4>
                    ${metaParts.length ? `<p class="muted">${metaParts.join(' • ')}</p>` : ''}
                    ${dateRange ? `<p class="muted">${dateRange}</p>` : ''}
                </div>
                <div class="itinerary-item-actions">
                     <button class="btn btn-outline btn-xs" onclick="exportItineraryPDF(${it.id})" title="Exportar PDF">
                        📄 PDF
                     </button>
                </div>
            </div>
        `;
    }).join('');
}

// ----------------------------------------
// Loading data from Experience API
// ----------------------------------------
export async function loadIslands() {
    try {
        const islands = await apiGet('/islands');
        if (Array.isArray(islands)) {
            STATE.islands = islands.map(normalizeIsland);

            const homeGrid = document.getElementById('islandsGrid');
            if (homeGrid) {
                renderIslands(homeGrid, STATE.islands.slice(0, 3));
            }
        }
        // CHAMADA AOS ALERTAS (UC-06)
        renderWeatherAlerts();
    } catch (err) {
        console.warn('Erro ao carregar ilhas', err);
    }
}

export async function loadLocations(params = {}) {
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

export async function loadProfile() {
    // DON'T call this after login - we already have correct user data from login response
    // Calling this would overwrite the correct user data
    console.info('loadProfile() skipped - using login data');
    return;
}

export async function loadFavorites() {
    if (!STATE.token || !STATE.currentUser?.id) return;
    try {
        // ✅ FIX: Pass userId as query parameter
        const favs = await apiGet(`/favorites?userId=${STATE.currentUser.id}`).catch(() => []);
        if (Array.isArray(favs)) {
            STATE.favorites = favs.map(normalizeLocationCard);
        }
    } catch (err) {
        console.info('Favorites endpoint not available yet');
        STATE.favorites = [];
    }
}

export async function loadItineraries() {
    if (!STATE.token || !STATE.currentUser?.id) return;
    try {
        // ✅ FIX: Pass userId as query parameter
        const resp = await apiGet(`/itineraries?userId=${STATE.currentUser.id}`).catch(() => null);
        
        console.log('Loaded itineraries response:', resp);  // ✅ DEBUG
        
        // Handle different response formats
        let list = [];
        if (Array.isArray(resp)) {
            list = resp;
        } else if (resp && Array.isArray(resp.data)) {
            list = resp.data;
        } else if (resp && Array.isArray(resp.itineraries)) {
            list = resp.itineraries;
        }
        
        STATE.itineraries = list.map(normalizeItinerary);
        
        console.log('Normalized itineraries:', STATE.itineraries);  // ✅ DEBUG
    } catch (err) {
        console.info('Itineraries endpoint not available yet');
        STATE.itineraries = [];
    }
}

// ----------------------------------------
// Filtros e pesquisa
// ----------------------------------------
export function filterByIsland(islandName) {
    showSection('locations');
    const islandFilter = document.getElementById('islandFilter');
    if (islandFilter) islandFilter.value = islandName;
    filterLocations();
}

export async function filterLocations() {
    const islandVal = document.getElementById('islandFilter')?.value || '';
    const categoryVal = document.getElementById('categoryFilter')?.value || '';

    await loadLocations({
        island: islandVal || undefined,
        category: categoryVal || undefined
    });
}

export async function searchLocations() {
    const query = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    await loadLocations({
        search: query || undefined
    });
    showSection('locations');
}

// ----------------------------------------
// Detalhe do Local + Weather + Ratings
// ----------------------------------------
export async function openLocationDetails(locationId) {
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
        const [detail, weatherResponse, ratingsResp] = await Promise.all([
    apiGet(`/locations/${locationId}`).catch(() => baseLoc),
    apiGet(`/locations/${locationId}/weather`).catch(() => null),
    apiGet(`/ratings?locationId=${locationId}`).catch(() => null)
]);

const loc = normalizeLocationCard(detail || baseLoc) || baseLoc;
const ratingsList = extractRatingsList(ratingsResp);

// Extract the actual weather object from the response
const weather = weatherResponse?.weather || weatherResponse;

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

export function extractRatingsList(ratingsResp) {
    if (!ratingsResp) return [];
    if (Array.isArray(ratingsResp)) return ratingsResp.map(normalizeRating);
    if (Array.isArray(ratingsResp.data)) return ratingsResp.data.map(normalizeRating);
    if (Array.isArray(ratingsResp.ratings)) return ratingsResp.ratings.map(normalizeRating);
    return [];
}

export function buildWeatherHtml(weather) {
    console.log('=== WEATHER DEBUG ===');
    console.log('Raw weather data:', weather);
    console.log('weather.current:', weather?.current);
    console.log('weather.current.temperature_2m:', weather?.current?.temperature_2m);
    
    if (!weather) {
        console.log('Weather is null/undefined');
        return '<p class="muted">Meteorologia indisponível para este local.</p>';
    }

    let temp = null;
    let condition = '';
    let wind = null;
    let humidity = null;

    // Handle OpenMeteo format (weather.current.*)
    if (weather.current) {
        const c = weather.current;
        
        console.log('Processing weather.current...');
        
        // Temperature
        temp = c.temperature_2m ?? c.temperature ?? null;
        console.log('Temperature:', temp);
        
        // Wind speed
        wind = c.wind_speed_10m ?? c.windspeed_10m ?? c.windSpeed ?? null;
        console.log('Wind:', wind);
        
        // Humidity
        humidity = c.relative_humidity_2m ?? c.humidity ?? null;
        console.log('Humidity:', humidity);
        
        // Weather condition from weather_code
        if (c.weather_code !== undefined) {
            const code = c.weather_code;
            console.log('Weather code:', code);
            if (code === 0) condition = 'Céu limpo';
            else if (code <= 3) condition = 'Parcialmente nublado';
            else if (code <= 48) condition = 'Nevoeiro';
            else if (code <= 67) condition = 'Chuva';
            else if (code <= 77) condition = 'Neve';
            else if (code <= 82) condition = 'Aguaceiros';
            else if (code <= 99) condition = 'Trovoada';
            console.log('Condition:', condition);
        }
    }
    
    // Fallback: check root level fields
    if (temp === null && typeof weather.temperature === 'number') {
        temp = weather.temperature;
        console.log('Using fallback temperature:', temp);
    }
    if (!condition && weather.condition) {
        condition = weather.condition;
        console.log('Using fallback condition:', condition);
    }
    if (wind === null && typeof weather.windSpeed === 'number') {
        wind = weather.windSpeed;
        console.log('Using fallback wind:', wind);
    }

    const parts = [];
    if (temp !== null) parts.push(`<span><strong>${temp.toFixed(1)}°C</strong></span>`);
    if (condition) parts.push(`<span>${condition}</span>`);
    if (wind !== null) parts.push(`<span>Vento: ${wind.toFixed(0)} km/h</span>`);
    if (humidity !== null) parts.push(`<span>Humidade: ${humidity}%</span>`);

    console.log('Final parts:', parts);
    console.log('Parts length:', parts.length);

    if (!parts.length) {
        console.log('No weather parts found - returning unavailable message');
        return '<p class="muted">Meteorologia indisponível para este local.</p>';
    }

    const result = `<div class="weather-summary">${parts.join(' · ')}</div>`;
    console.log('Final HTML:', result);
    console.log('=== END WEATHER DEBUG ===');
    
    return result;
}

export function renderLocationDetails(loc, weather, ratings) {
    const content = document.getElementById('locationModalContent');
    if (!content) return;

    const avgRating = loc.rating != null ? Number(loc.rating).toFixed(1) : '-';
    const ratingCount = loc.ratingCount != null ? loc.ratingCount : (ratings ? ratings.length : 0);

    // HTML injetado
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
                        
                        <div id="locationMap" class="location-map" style="margin-top: 1.5rem; height: 300px; border-radius: 12px; z-index: 0;"></div>

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

    // INICIAR O MAPA se tivermos coordenadas (chama a função auxiliar definida no topo)
    if (loc.lat && loc.lon) {
        initLocationMap(loc.lat, loc.lon, loc.name);
    } else {
        // Fallback visual se não houver coordenadas
        const mapDiv = document.getElementById('locationMap');
        if(mapDiv) {
            mapDiv.innerHTML = '<div class="muted" style="text-align:center; padding: 2rem; background: #f1f5f9;">Mapa indisponível</div>';
        }
    }
}

export async function submitRating(e, locationId) {
    e.preventDefault();
    if (!ensureAuthenticated()) return;

    const value = Number(document.getElementById('ratingValue').value);
    const comment = document.getElementById('ratingComment').value.trim();

    if (!value || value < 1 || value > 5) {
        showToast('Selecione uma classificação entre 1 e 5.', 'warning');
        return;
    }

    try {
        await apiPost(`/ratings`, {
            locationId: locationId,
            userId: STATE.currentUser?.id || null,  // ✅ ADD THIS
            rating: value,
            comment: comment || null
        });
        showToast('Avaliação enviada com sucesso!', 'success');
        openLocationDetails(locationId);
    } catch (err) {
        console.warn('Erro ao enviar avaliação', err);
        console.error('Rating error details:', err.data);  // ✅ ADD THIS FOR DEBUGGING
        showToast('Não foi possível enviar a avaliação.', 'error');
    }
}

// ----------------------------------------
// Favoritos
// ----------------------------------------
export async function toggleFavorite(e, locationId) {
    if (e) e.stopPropagation();
    if (!ensureAuthenticated()) return;

    const alreadyFav = isLocationFavorite(locationId);

    try {
        if (alreadyFav) {
            await apiRequest(`/favorites/${locationId}`, {
                method: 'DELETE'
            });
            showToast('Removido dos favoritos.', 'info');
        } else {
            // ✅ FIX: Use lowercase to match database API
            await apiPost('/favorites', { 
                userid: STATE.currentUser?.id,
                locationid: locationId 
            });
            showToast('Adicionado aos favoritos.', 'success');
        }

        await loadFavorites();

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
export function resolveLocationById(id) {
    return (
        STATE.locations.find(l => String(l.id) === String(id)) ||
        STATE.favorites.find(l => String(l.id) === String(id)) ||
        null
    );
}

export function renderCurrentItineraryPoints() {
    const list = document.getElementById('currentItineraryPoints');
    if (!list) return;

    const ids = STATE.currentItineraryLocationIds || [];

    if (!ids.length) {
        list.innerHTML =
            '<li class="muted" style="font-size:0.9rem;">Ainda não adicionou locais a este itinerário. Use o botão "Adicionar ao itinerário" em qualquer local.</li>';
        return;
    }

    list.innerHTML = ids.map((id, index) => {
        const loc = resolveLocationById(id) || { name: `Local ${id}` };
        return `
            <li>
                <span><strong>${index + 1}.</strong> ${loc.name}</span>
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

export function addToItinerary(e, locationId) {
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

    // Atualiza a lista e o mapa
    renderCurrentItineraryPoints();
    updateItineraryPreview();

    showToast('Local adicionado ao itinerário atual.', 'success');
}

export function removeFromCurrentItinerary(locationId) {
    STATE.currentItineraryLocationIds = (STATE.currentItineraryLocationIds || [])
        .filter(id => String(id) !== String(locationId));

    // Atualiza a lista e o mapa
    renderCurrentItineraryPoints();
    updateItineraryPreview();
}

export function clearCurrentItinerary() {
    STATE.currentItineraryLocationIds = [];
    renderCurrentItineraryPoints();
    updateItineraryPreview();

    const form = document.getElementById('itineraryForm');
    if (form) form.reset();
}

export async function saveItinerary(e) {
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

    // ✅ TRY ALL POSSIBLE FIELD NAME VARIATIONS
    const payload = {
    userId: STATE.currentUser?.id,  // ✅ camelCase
    name: name,
    startDate: startDate,           // ✅ camelCase
    endDate: endDate,               // ✅ camelCase
    locationIds: locationIds.join(',')  // ✅ camelCase (won't work yet, but correct format)
};

    console.log('Saving itinerary with payload:', payload);

    try {
    const created = await apiPost('/profile/itineraries', payload);
    
    // ✅ Instead of adding to STATE.itineraries, reload from server
    await loadItineraries();
    
    clearCurrentItinerary();
    renderItinerariesSection();
    renderItinerariesInProfile();
    showToast('Itinerário guardado com sucesso.', 'success');
    } catch (err) {
        console.warn('Erro ao guardar itinerário', err);
        showToast('Não foi possível guardar o itinerário.', 'error');
    }
}