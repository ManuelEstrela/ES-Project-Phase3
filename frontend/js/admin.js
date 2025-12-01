// admin.js - Painel do Administrador

import {
    STATE,
    apiGet,
    apiPost,
    apiRequest,
    normalizeLocationCard
} from './core.js';

import {
    ensureAuthenticated,
    showToast,
    showSection,
    loadLocations
} from './ui.js';

// ----------------------------------------
// Admin helpers
// ----------------------------------------
export function ensureAdmin() {
    if (!ensureAuthenticated()) return false;

    if (!STATE.isAdmin) {
        showToast('Esta área é apenas para administradores.', 'error');
        return false;
    }
    return true;
}

export async function openAdminPanel() {
    if (!ensureAdmin()) return;

    showSection('admin');

    await Promise.all([
        loadAdminLocations(),
        loadAdminUsers(),
        loadAdminIntegrations()
    ]);
}

// ----------------------------------------
// Gerir Conteúdos (Locais Turísticos)
// ----------------------------------------
export async function loadAdminLocations() {
    const tbody = document.getElementById('adminLocationsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="muted">A carregar pontos turísticos...</td>
        </tr>
    `;

    try {
        let raw;
        try {
            raw = await apiGet('/admin/locations');
        } catch {
            raw = await apiGet('/locations');
        }

        const list = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
        const locations = list.map(normalizeLocationCard).filter(Boolean);

        STATE.adminLocations = locations;

        if (!locations.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="muted">Ainda não existem pontos registados.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = locations.map(loc => `
            <tr>
                <td>${loc.id ?? '-'}</td>
                <td>${loc.name ?? '-'}</td>
                <td>${loc.island ?? '-'}</td>
                <td>${loc.category ?? '-'}</td>
                <td>
                    <button class="btn btn-outline btn-xs" onclick="editAdminLocation(${loc.id})">
                        Editar
                    </button>
                    <button class="btn btn-danger btn-xs" onclick="deleteAdminLocation(${loc.id})">
                        Remover
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.warn('Erro ao carregar locais (admin)', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-error">Não foi possível carregar os pontos turísticos.</td>
            </tr>
        `;
    }
}

export function fillAdminLocationForm(loc) {
    document.getElementById('adminLocationId').value = loc?.id ?? '';
    document.getElementById('adminLocationName').value = loc?.name ?? '';
    document.getElementById('adminLocationIsland').value = loc?.island ?? '';
    document.getElementById('adminLocationCategory').value = loc?.category ?? '';
    document.getElementById('adminLocationImage').value = loc?.image ?? '';
    document.getElementById('adminLocationDescription').value = loc?.description ?? '';

    const saveBtn = document.getElementById('adminLocationSaveBtn');
    const cancelBtn = document.getElementById('adminLocationCancelEditBtn');
    if (saveBtn) saveBtn.textContent = loc ? 'Guardar alterações' : 'Criar ponto turístico';
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !loc);
}

export function editAdminLocation(id) {
    if (!ensureAdmin()) return;

    const loc = (STATE.adminLocations || []).find(l => String(l.id) === String(id));
    if (!loc) return;

    fillAdminLocationForm(loc);
}

export function cancelAdminLocationEdit() {
    fillAdminLocationForm(null);
}

export async function submitAdminLocation(e) {
    e.preventDefault();
    if (!ensureAdmin()) return;

    const id = document.getElementById('adminLocationId').value || null;
    const name = document.getElementById('adminLocationName').value.trim();
    const island = document.getElementById('adminLocationIsland').value.trim();
    const category = document.getElementById('adminLocationCategory').value.trim() || null;
    const image = document.getElementById('adminLocationImage').value.trim() || null;
    const description = document.getElementById('adminLocationDescription').value.trim() || null;

    if (!name || !island) {
        showToast('Nome e ilha são obrigatórios.', 'warning');
        return;
    }

    const payload = { name, island, category, image, description };

    try {
        if (id) {
            await apiRequest(`/admin/locations/${id}`, {
                method: 'PUT',
                body: payload
            });
            showToast('Ponto turístico atualizado com sucesso.', 'success');
        } else {
            await apiPost('/admin/locations', payload);
            showToast('Ponto turístico criado com sucesso.', 'success');
        }

        cancelAdminLocationEdit();
        await Promise.all([
            loadAdminLocations(),
            loadLocations()
        ]);
    } catch (err) {
        console.warn('Erro ao guardar ponto turístico (admin)', err);
        showToast('Não foi possível guardar o ponto turístico. Verifica o backend.', 'error');
    }
}

export async function deleteAdminLocation(id) {
    if (!ensureAdmin()) return;
    if (!confirm('Tem a certeza que pretende remover este ponto turístico?')) return;

    try {
        await apiRequest(`/admin/locations/${id}`, { method: 'DELETE' });
        showToast('Ponto turístico removido.', 'success');
        await Promise.all([
            loadAdminLocations(),
            loadLocations()
        ]);
    } catch (err) {
        console.warn('Erro ao remover ponto turístico (admin)', err);
        showToast('Não foi possível remover o ponto turístico.', 'error');
    }
}

// ----------------------------------------
// Gerir Utilizadores
// ----------------------------------------
export async function loadAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="muted">A carregar utilizadores...</td>
        </tr>
    `;

    try {
        let raw;
        try {
            raw = await apiGet('/admin/users');
        } catch {
            raw = await apiGet('/users');
        }

        const list = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
        STATE.adminUsers = list || [];

        if (!STATE.adminUsers.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="muted">Ainda não existem utilizadores registados.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = STATE.adminUsers.map(u => `
            <tr>
                <td>${u.id ?? '-'}</td>
                <td>${u.name ?? '-'}</td>
                <td>${u.email ?? '-'}</td>
                <td>${u.role ?? 'user'}</td>
                <td>
                    <span class="badge ${u.isActive === false ? 'badge-outline' : 'badge-success'}">
                        ${u.isActive === false ? 'Inativo' : 'Ativo'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline btn-xs" onclick="editAdminUser(${u.id})">
                        Editar
                    </button>
                    <button class="btn btn-danger btn-xs" onclick="deleteAdminUser(${u.id})">
                        Remover
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.warn('Erro ao carregar utilizadores (admin)', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-error">Não foi possível carregar os utilizadores.</td>
            </tr>
        `;
    }
}

export function fillAdminUserForm(user) {
    document.getElementById('adminUserId').value = user?.id ?? '';
    document.getElementById('adminUserName').value = user?.name ?? '';
    document.getElementById('adminUserEmail').value = user?.email ?? '';
    document.getElementById('adminUserRole').value = user?.role ?? 'user';
    document.getElementById('adminUserPassword').value = '';

    const saveBtn = document.getElementById('adminUserSaveBtn');
    const cancelBtn = document.getElementById('adminUserCancelEditBtn');
    const passwordLabelExtra = document.getElementById('adminUserPasswordLabelExtra');

    if (user) {
        if (saveBtn) saveBtn.textContent = 'Guardar alterações';
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (passwordLabelExtra) passwordLabelExtra.textContent = '(preencha apenas se quiser alterar a password)';
    } else {
        if (saveBtn) saveBtn.textContent = 'Criar utilizador';
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (passwordLabelExtra) passwordLabelExtra.textContent = '(apenas para novos utilizadores)';
    }
}

export function editAdminUser(id) {
    if (!ensureAdmin()) return;

    const user = (STATE.adminUsers || []).find(u => String(u.id) === String(id));
    if (!user) return;

    fillAdminUserForm(user);
}

export function cancelAdminUserEdit() {
    fillAdminUserForm(null);
}

export async function submitAdminUser(e) {
    e.preventDefault();
    if (!ensureAdmin()) return;

    const id = document.getElementById('adminUserId').value || null;
    const name = document.getElementById('adminUserName').value.trim();
    const email = document.getElementById('adminUserEmail').value.trim();
    const role = document.getElementById('adminUserRole').value;
    const password = document.getElementById('adminUserPassword').value.trim();

    if (!name || !email || !role) {
        showToast('Nome, email e role são obrigatórios.', 'warning');
        return;
    }

    const payload = { name, email, role };

    try {
        if (id) {
            if (password) {
                payload.newPassword = password;
            }
            await apiRequest(`/admin/users/${id}`, {
                method: 'PATCH',
                body: payload
            });
            showToast('Utilizador atualizado com sucesso.', 'success');
        } else {
            if (!password) {
                showToast('Para criar um utilizador novo, é necessário definir uma password.', 'warning');
                return;
            }
            payload.password = password;
            await apiPost('/admin/users', payload);
            showToast('Utilizador criado com sucesso.', 'success');
        }

        cancelAdminUserEdit();
        await loadAdminUsers();
    } catch (err) {
        console.warn('Erro ao guardar utilizador (admin)', err);
        showToast('Não foi possível guardar o utilizador. Verifica o backend.', 'error');
    }
}

export async function deleteAdminUser(id) {
    if (!ensureAdmin()) return;
    if (!confirm('Tem a certeza que pretende remover este utilizador?')) return;

    try {
        await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
        showToast('Utilizador removido.', 'success');
        await loadAdminUsers();
    } catch (err) {
        console.warn('Erro ao remover utilizador (admin)', err);
        showToast('Não foi possível remover o utilizador.', 'error');
    }
}

// ----------------------------------------
// Monitorizar Integrações
// ----------------------------------------
export async function loadAdminIntegrations() {
    const container = document.getElementById('adminIntegrationsBody');
    if (!container) return;

    container.innerHTML = '<p class="muted">A verificar o estado das integrações...</p>';

    const checks = [];

    // Base de dados / Locations
    try {
        await apiGet('/locations');
        checks.push({ name: 'Base de dados (db4free) / System API', status: 'ok' });
    } catch (err) {
        checks.push({
            name: 'Base de dados (db4free) / System API',
            status: 'error',
            message: err.message || 'Erro ao obter locais.'
        });
    }

    // Open-Meteo (via Experience API)
    try {
        const first = (STATE.locations && STATE.locations[0]) || null;
        const id = first ? first.id : 1;
        await apiGet(`/locations/${id}/weather`);
        checks.push({ name: 'Open-Meteo (meteorologia)', status: 'ok' });
    } catch (err) {
        checks.push({
            name: 'Open-Meteo (meteorologia)',
            status: 'error',
            message: err.message || 'Erro ao obter meteorologia.'
        });
    }

    // Geoapify (indiretamente, através de um local com coordenadas / mapa)
    try {
        const first = (STATE.locations && STATE.locations[0]) || null;
        const id = first ? first.id : 1;
        await apiGet(`/locations/${id}`);
        checks.push({ name: 'Geoapify (geo & mapas)', status: 'ok' });
    } catch (err) {
        checks.push({
            name: 'Geoapify (geo & mapas)',
            status: 'error',
            message: err.message || 'Erro ao obter detalhes do local.'
        });
    }

    container.innerHTML = `
        <ul class="admin-integrations-list">
            ${checks.map(c => `
                <li class="integration-row">
                    <div class="integration-main">
                        <span class="integration-name">${c.name}</span>
                        <span class="badge ${c.status === 'ok' ? 'badge-success' : 'badge-danger'}">
                            ${c.status === 'ok' ? 'Operacional' : 'Com problemas'}
                        </span>
                    </div>
                    ${c.status === 'error' && c.message
        ? `<div class="integration-message">${c.message}</div>`
        : ''
    }
                </li>
            `).join('')}
        </ul>
    `;
}