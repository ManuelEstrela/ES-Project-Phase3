// main.js - ponto de entrada da app
import * as ui from './ui.js';
import * as core from './core.js';

import { STATE, restoreSession } from './core.js';
import {
    updateAuthUI,
    openModal,
    closeModal,
    closeLocationModal,
    showSection,
    login,
    register,
    logout,
    filterByIsland,
    filterLocations,
    searchLocations,
    openLocationDetails,
    toggleFavorite,
    addToItinerary,
    removeFromCurrentItinerary,
    clearCurrentItinerary,
    submitRating,
    saveItinerary,
    renderCurrentItineraryPoints,
    loadIslands,
    loadLocations,
    loadProfile,
    loadFavorites,
    loadItineraries,
    renderItinerariesInProfile,
    toggleEditProfile,
    saveProfile,
    optimizeItinerary
} from './ui.js';

import {
    openAdminPanel,
    submitAdminLocation,
    cancelAdminLocationEdit,
    editAdminLocation,
    deleteAdminLocation,
    submitAdminUser,
    cancelAdminUserEdit,
    editAdminUser,
    deleteAdminUser
} from './admin.js';

// Expor funções globais
window.toggleEditProfile = toggleEditProfile;
window.saveProfile = saveProfile;
window.saveItinerary = ui.saveItinerary;
window.optimizeItinerary = optimizeItinerary; // NOVO EXPORT
window.exportItineraryPDF = ui.exportItineraryPDF;

// Expor funções usadas em atributos onclick/onsubmit no HTML
window.showSection = showSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeLocationModal = closeLocationModal;

window.login = login;
window.register = register;
window.logout = logout;

window.searchLocations = searchLocations;
window.filterLocations = filterLocations;
window.filterByIsland = filterByIsland;

window.openLocationDetails = openLocationDetails;
window.toggleFavorite = toggleFavorite;

window.addToItinerary = addToItinerary;
window.removeFromCurrentItinerary = removeFromCurrentItinerary;
window.clearCurrentItinerary = clearCurrentItinerary;
window.submitRating = submitRating;

// Admin
window.openAdminPanel = openAdminPanel;
window.submitAdminLocation = submitAdminLocation;
window.cancelAdminLocationEdit = cancelAdminLocationEdit;
window.editAdminLocation = editAdminLocation;
window.deleteAdminLocation = deleteAdminLocation;
window.submitAdminUser = submitAdminUser;
window.cancelAdminUserEdit = cancelAdminUserEdit;
window.editAdminUser = editAdminUser;
window.deleteAdminUser = deleteAdminUser;

// Init
document.addEventListener('DOMContentLoaded', async () => {
    restoreSession();
    updateAuthUI();

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

    console.log('Azores Uncharted App (modules) inicializado!');
});