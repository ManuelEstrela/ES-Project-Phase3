// ========================================
// Açores Tourism Platform - Main App
// ========================================

// === Configuration ===
const CONFIG = {
    API_BASE_URL: 'https://tourism-api-prod.us-e2.cloudhub.io/api/v1',
    // For development: 'http://localhost:8081/api/v1'
};

// === Data Models ===
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
            description: 'Lagoa de cratérica rodeada de natureza pristina.', 
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
    allLocations: [...DATA.locations],
    favorites: []
};

// === Navigation ===
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.container > section').forEach(s => {
        s.classList.add('hidden');
    });

    // Show requested section
    document.getElementById(section + 'Section').classList.remove('hidden');

    // Load section-specific data
    if (section === 'islands') {
        renderAllIslands();
    } else if (section === 'locations') {
        renderAllLocations();
    } else if (section === 'profile' && STATE.currentUser) {
        renderProfile();
    }
}

// === Modal Management ===
function openModal(type) {
    document.getElementById(type + 'Modal').classList.add('active');
}

function closeModal(type) {
    document.getElementById(type + 'Modal').classList.remove('active');
}

// === Authentication ===
function login(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // TODO: Replace with actual API call
    // fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email, password })
    // })
    // .then(res => res.json())
    // .then(data => {
    //     STATE.currentUser = data.user;
    //     localStorage.setItem('token', data.token);
    //     updateAuthUI();
    //     closeModal('login');
    // });

    // Mock authentication
    STATE.currentUser = {
        name: email.split('@')[0],
        email: email
    };

    updateAuthUI();
    closeModal('login');
    alert('Login efetuado com sucesso!');
}

function register(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    // TODO: Replace with actual API call
    // Mock registration
    STATE.currentUser = { name, email };

    updateAuthUI();
    closeModal('register');
    alert('Registo efetuado com sucesso!');
}

function logout() {
    STATE.currentUser = null;
    STATE.favorites = [];
    updateAuthUI();
    showSection('home');
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const authRequired = document.querySelectorAll('.auth-required');

    if (STATE.currentUser) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        authRequired.forEach(el => el.classList.remove('hidden'));
        document.getElementById('userInitial').textContent = 
            STATE.currentUser.name.charAt(0).toUpperCase();
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
        authRequired.forEach(el => el.classList.add('hidden'));
    }
}

// === Rendering Functions ===
function renderIslands(container, islands) {
    container.innerHTML = islands.map(island => `
        <div class="island-card" onclick="filterByIsland('${island.name}')">
            <div class="island-image" style="background-image: url('${island.image}')"></div>
            <div class="island-content">
                <div class="island-name">${island.name}</div>
                <div class="island-stats">
                    <span>📍 ${island.locations} locais</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderLocations(container, locations) {
    if (locations.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">Nenhum local encontrado.</p>';
        return;
    }

    container.innerHTML = locations.map(location => `
        <div class="location-card">
            <div class="location-image" style="background-image: url('${location.image}')"></div>
            <div class="location-content">
                <div class="location-header">
                    <div class="location-name">${location.name}</div>
                    <div class="category-badge">${location.category}</div>
                </div>
                <div class="location-island">📍 ${location.island}</div>
                <div class="location-description">${location.description}</div>
                <div class="rating">
                    <span class="stars">⭐</span>
                    <span>${location.rating}</span>
                    <span style="color: var(--text-light);">(${location.ratingCount})</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAllIslands() {
    renderIslands(document.getElementById('allIslandsGrid'), DATA.islands);
}

function renderAllLocations() {
    const islandFilter = document.getElementById('islandFilter');

    // Populate island filter if empty
    if (islandFilter.children.length === 1) {
        DATA.islands.forEach(island => {
            const option = document.createElement('option');
            option.value = island.name;
            option.textContent = island.name;
            islandFilter.appendChild(option);
        });
    }

    renderLocations(document.getElementById('allLocations'), STATE.allLocations);
}

function renderProfile() {
    if (!STATE.currentUser) return;

    document.getElementById('profileName').textContent = STATE.currentUser.name;
    document.getElementById('profileEmail').textContent = STATE.currentUser.email;
    renderLocations(document.getElementById('favoritesGrid'), STATE.favorites);
}

// === Filters & Search ===
function filterByIsland(islandName) {
    showSection('locations');
    document.getElementById('islandFilter').value = islandName;
    filterLocations();
}

function filterLocations() {
    const islandFilter = document.getElementById('islandFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;

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
    const query = document.getElementById('searchInput').value.toLowerCase();

    if (!query) {
        STATE.allLocations = DATA.locations;
    } else {
        STATE.allLocations = DATA.locations.filter(loc =>
            loc.name.toLowerCase().includes(query) ||
            loc.island.toLowerCase().includes(query) ||
            loc.category.toLowerCase().includes(query) ||
            loc.description.toLowerCase().includes(query)
        );
    }

    showSection('locations');
    renderLocations(document.getElementById('allLocations'), STATE.allLocations);
}

// === Initialization ===
function init() {
    // Render home page
    renderIslands(document.getElementById('islandsGrid'), DATA.islands.slice(0, 3));
    renderLocations(document.getElementById('popularLocations'), DATA.locations.slice(0, 6));

    // Update auth UI
    updateAuthUI();

    console.log('Açores Tourism App initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
