// core.js - BACK TO NORMAL (Use Experience API)

export const CONFIG = {
    API_BASE_URL: 'https://experienceapi-turismometeo-13pr64.5sc6y6-3.usa-e2.cloudhub.io/api'
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
        'client_id': '849914e8df8e436da0afa48842e5426e',
        'client_secret': 'Fc25503676274CdE9CA20feE0B2acB39',
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
    
    // Get image URL
    let imageUrl = apiLoc.imageUrl || apiLoc.image || apiLoc.imageurl || '';
    
    // Replace example.com URLs or empty URLs with Picsum
    if (!imageUrl || 
        imageUrl.trim() === '' || 
        imageUrl.includes('example.com') ||
        imageUrl.includes('placeholder')) {
        
        // ✅ Use Picsum instead of Unsplash (Unsplash Source was deprecated)
        // Each location ID gets a different random image
        imageUrl = `https://picsum.photos/600/400?random=${apiLoc.id}`;
    }
    
    return {
        id: apiLoc.id,
        name: apiLoc.name || '',
        island: apiLoc.island || apiLoc.islandName || '',
        category: apiLoc.category || apiLoc.categoryName || '',
        description: apiLoc.description || '',
        image: imageUrl,
        lat: apiLoc.latitude ?? apiLoc.lat ?? null,
        lon: apiLoc.longitude ?? apiLoc.lon ?? null,
        rating: apiLoc.rating ?? apiLoc.averageRating ?? null,
        ratingCount: apiLoc.ratingCount ?? apiLoc.totalRatings ?? 0
    };
}

export function normalizeItinerary(raw) {
    if (!raw) return null;
    
    console.log('=== NORMALIZE ITINERARY DEBUG ===');
    console.log('Raw itinerary:', raw);
    console.log('All keys:', Object.keys(raw));
    console.log('Checking locationIds:', raw.locationIds);
    console.log('Checking locationids:', raw.locationids);
    console.log('Checking locations:', raw.locations);
    console.log('=== END NORMALIZE DEBUG ===');
    
    // Try all possible field names for location IDs
    let locationIds = [];
    if (raw.locationIds && Array.isArray(raw.locationIds)) {
        locationIds = raw.locationIds;
    } else if (raw.locationids && Array.isArray(raw.locationids)) {
        locationIds = raw.locationids;
    } else if (raw.locations && Array.isArray(raw.locations)) {
        locationIds = raw.locations;
    } else if (typeof raw.locationids === 'string') {
        // Database might return as comma-separated string
        locationIds = raw.locationids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    } else if (typeof raw.locationIds === 'string') {
        locationIds = raw.locationIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }
    
    console.log('Final locationIds:', locationIds);
    
    return {
        id: raw.id || raw.itineraryId,
        name: raw.name || raw.itineraryName || 'Sem nome',
        startDate: raw.startDate || raw.startdate || null,
        endDate: raw.endDate || raw.enddate || null,
        locationIds: locationIds,
        totalDistance: raw.totalDistance || raw.distance || null
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