// core.js - config, state, sessão, API layer, normalizers

export const CONFIG = {
    API_BASE_URL: 'https://tourism-api-prod.us-e2.cloudhub.io/api/v1'
};

export const STATE = {
    token: null,
    currentUser: null,
    profile: null,
    islands: [],
    locations: [],
    favorites: [],
    itineraries: [],
    currentItineraryLocationIds: [],
    isAdmin: false,
    adminLocations: [],
    adminUsers: []
};

// ----------------------------------------
// Session persistence (localStorage)
// ----------------------------------------
export function restoreSession() {
    try {
        const raw = localStorage.getItem('azores_app_session');
        if (!raw) return;
        const data = JSON.parse(raw);
        STATE.token = data.token || null;
        STATE.currentUser = data.user || null;
        const role = STATE.currentUser && STATE.currentUser.role;
        STATE.isAdmin = !!(role && String(role).toLowerCase().includes('admin'));
    } catch (err) {
        console.warn('Erro a restaurar sessão', err);
    }
}

export function persistSession() {
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

export function clearSession() {
    STATE.token = null;
    STATE.currentUser = null;
    STATE.profile = null;
    STATE.favorites = [];
    STATE.itineraries = [];
    STATE.currentItineraryLocationIds = [];
    STATE.isAdmin = false;
    STATE.adminLocations = [];
    STATE.adminUsers = [];
    try {
        localStorage.removeItem('azores_app_session');
    } catch (err) {
        console.warn('Erro a limpar sessão', err);
    }
}

// ----------------------------------------
// API Layer (fetch + JWT)
// ----------------------------------------
export async function apiRequest(path, {
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

export function apiGet(path, options = {}) {
    return apiRequest(path, { method: 'GET', ...options });
}

export function apiPost(path, body, options = {}) {
    return apiRequest(path, { method: 'POST', body, ...options });
}

// ----------------------------------------
// Normalizers
// ----------------------------------------
export function normalizeIsland(apiIsland) {
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

export function normalizeLocationCard(apiLoc) {
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

export function normalizeItinerary(raw) {
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

export function normalizeRating(raw) {
    if (!raw) return null;
    return {
        author: raw.author || raw.userName || 'Utilizador',
        rating: raw.rating,
        comment: raw.comment || raw.text || ''
    };
}