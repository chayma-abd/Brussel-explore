'use strict';

// ==================== CONSTANTEN ====================
const API_BASE_URL = 'https://opendata.brussels.be/api/records/1.0/search/';
const STORAGE_KEYS = {
FAVORITES: 'brussels_favorites',
THEME: 'brussels_theme',
VIEW_MODE: 'brussels_view_mode'
};

// ==================== DOM ELEMENTEN SELECTEREN ====================
const elements = {
// Weergave elementen
tableView: document.getElementById('tableView'),
mapView: document.getElementById('mapView'),
locationsGrid: document.getElementById('locationsGrid'),
tableBody: document.getElementById('tableBody'),
resultCount: document.getElementById('resultCount'),

// Controls
searchInput: document.getElementById('searchInput'),
categoryFilter: document.getElementById('categoryFilter'),
sortSelect: document.getElementById('sortSelect'),
loadDataBtn: document.getElementById('loadDataBtn'),
showFavoritesBtn: document.getElementById('showFavoritesBtn'),
resetFiltersBtn: document.getElementById('resetFiltersBtn'),
viewToggle: document.getElementById('viewToggle'),
themeToggle: document.getElementById('themeToggle'),
currentViewBadge: document.getElementById('currentViewBadge'),

// Feedback elementen
errorMessage: document.getElementById('errorMessage'),
loadingIndicator: document.getElementById('loadingIndicator'),
searchValidation: document.getElementById('searchValidation')
};

// ==================== GLOBALE VARIABELEN ====================
let allLocations = [];
let currentDisplayedLocations = [];
let favorites = loadFavorites();
let isShowingFavorites = false;
let currentView = 'map'; // 'map', 'table', of 'grid'
let map = null;
let mapMarkers = [];

// ==================== INITIALISATIE ====================
window.addEventListener('DOMContentLoaded', () => {
console.log('🚀 BrusselsExplorer gestart!');

// Laad opgeslagen instellingen
loadTheme();
loadViewMode();

// Setup event listeners
setupEventListeners();

// Initialiseer kaart
initMap();

// Laad initiële data
loadLocationsFromAPI();
});

// ==================== EVENT LISTENERS ====================
const setupEventListeners = () => {
// Data laden
elements.loadDataBtn.addEventListener('click', () => {
console.log('📡 Data laden knop geklikt');
loadLocationsFromAPI();
});

// Zoeken met validatie
elements.searchInput.addEventListener('input', (event) => {
const value = event.target.value;
console.log(`🔍 Zoeken: ${value}`);

// Formulier validatie - minstens 2 tekens of leeg
if (value.length > 0 && value.length < 2) {
elements.searchValidation.textContent = '⚠️ Voer minstens 2 tekens in';
} else {
elements.searchValidation.textContent = '';
filterAndDisplayLocations();
}
});

// Filteren
elements.categoryFilter.addEventListener('change', () => {
console.log(`🏷️ Filter gewijzigd naar: ${elements.categoryFilter.value}`);
filterAndDisplayLocations();
});

// Sorteren
elements.sortSelect.addEventListener('change', () => {
console.log(`📊 Sortering gewijzigd naar: ${elements.sortSelect.value}`);
filterAndDisplayLocations();
});

// Favorieten weergave toggle
elements.showFavoritesBtn.addEventListener('click', () => {
console.log('❤️ Favorieten knop geklikt');
toggleFavoritesView();
});

// Reset filters
elements.resetFiltersBtn.addEventListener('click', () => {
console.log('🔄 Reset filters');
resetFilters();
});

// View toggle (tabel/kaart)
elements.viewToggle.addEventListener('click', () => {
console.log('👁️ View toggle geklikt');
toggleViewMode();
});

// Thema toggle
elements.themeToggle.addEventListener('click', () => {
console.log('🎨 Thema wisselen');
toggleTheme();
});
};

// ==================== KAART INITIALISATIE ====================
const initMap = () => {
// Centrum van Brussel
const brusselsCenter = [50.8503, 4.3517];

map = L.map('map').setView(brusselsCenter, 13);

// Voeg OpenStreetMap tiles toe
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
maxZoom: 19
}).addTo(map);

console.log('🗺️ Kaart geïnitialiseerd');
};

// ==================== API DATA OPHALEN (Async/Await + Fetch) ====================
const loadLocationsFromAPI = async () => {
try {
showLoading(true);
hideError();

// Gebruik een publieke dataset van OpenData Brussels
// We gebruiken de "toeristische-attracties" dataset
const url = `${API_BASE_URL}?dataset=toeristische-attracties&rows=50&sort=naam`;

console.log('📡 Ophalen van data:', url);

const response = await fetch(url);

// Controleer response status
if (!response.ok) {
throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
console.log('✅ Data ontvangen:', data);

// Verwerk de data
if (data.records && data.records.length > 0) {
processAPIData(data);
} else {
// Fallback naar voorbeelddata als API geen data teruggeeft
console.warn('⚠️ Geen data van API, gebruik voorbeelddata');
useSampleData();
}

} catch (error) {
console.error('❌ Fout bij ophalen data:', error);
showError(`Kon geen data ophalen: ${error.message}`);

// Fallback: Gebruik voorbeelddata
useSampleData();
} finally {
showLoading(false);
}
};

// ==================== DATA VERWERKEN ====================
const processAPIData = (apiData) => {
try {
// Transformeer API data naar ons formaat
allLocations = apiData.records.map((record, index) => {
const fields = record.fields;

return {
id: record.recordid || `loc_${index}`,
name: fields.naam || fields.titel || fields.name || 'Naam onbekend',
type: fields.type || fields.categorie || fields.category || 'Bezienswaardigheid',
description: fields.beschrijving || fields.omschrijving || fields.description || 'Geen beschrijving beschikbaar',
address: fields.adres || fields.locatie || fields.address || 'Adres onbekend',
latitude: fields.geo_point_2d?.[0] || fields.latitude || 50.85,
longitude: fields.geo_point_2d?.[1] || fields.longitude || 4.35,
category: determineCategory(fields)
};
});

console.log(`✅ ${allLocations.length} locaties verwerkt`);

// Toon de data
filterAndDisplayLocations();

} catch (error) {
console.error('❌ Fout bij verwerken data:', error);
useSampleData();
}
};

// ==================== CATEGORIE BEPALEN (Ternary operator) ====================
const determineCategory = (fields) => {
const type = (fields.type || fields.categorie || '').toLowerCase();

// Ternary operator voor categorie bepaling
const category = type.includes('cultuur') || type.includes('museum') ? 'culture' :
type.includes('natuur') || type.includes('park') ? 'nature' :
type.includes('geschiedenis') || type.includes('historisch') ? 'history' :
type.includes('kunst') ? 'art' : 'culture';

return category;
};

// ==================== VOORBEELD DATA (FALLBACK) ====================
const useSampleData = () => {
console.log('📦 Voorbeelddata laden...');

allLocations = [
{ id: '1', name: 'Atomium', type: 'Bezienswaardigheid', description: 'Iconisch gebouw uit de Wereldtentoonstelling van 1958, symbool van Brussel', address: 'Place de l\'Atomium 1, 1020 Brussel', latitude: 50.8949, longitude: 4.3410, category: 'history' },
{ id: '2', name: 'Grote Markt', type: 'Historische plek', description: 'Midden van Brussel met prachtige gildehuizen en stadhuis, UNESCO werelderfgoed', address: 'Grote Markt, 1000 Brussel', latitude: 50.8469, longitude: 4.3526, category: 'history' },
{ id: '3', name: 'Manneken Pis', type: 'Beeld', description: 'Beroemd standbeeld van een plassend jongetje, symbool van Brussel', address: 'Rue de l\'Étuve, 1000 Brussel', latitude: 50.8450, longitude: 4.3500, category: 'art' },
{ id: '4', name: 'Koninklijk Paleis', type: 'Paleis', description: 'Officieel paleis van de Belgische koning, te bezoeken in de zomer', address: 'Rue Brederode 16, 1000 Brussel', latitude: 50.8423, longitude: 4.3596, category: 'history' },
{ id: '5', name: 'Parc du Cinquantenaire', type: 'Park', description: 'Prachtig park met triomfboog en musea, ideaal voor wandelingen', address: 'Avenue de la Renaissance, 1000 Brussel', latitude: 50.8402, longitude: 4.3925, category: 'nature' },
{ id: '6', name: 'Magritte Museum', type: 'Museum', description: 'Museum gewijd aan de Belgische surrealist René Magritte', address: 'Rue de la Régence 3, 1000 Brussel', latitude: 50.8424, longitude: 4.3596, category: 'culture' },
{ id: '7', name: 'Mini-Europa', type: 'Attractiepark', description: 'Park met miniatuurversies van beroemde Europese gebouwen', address: 'Avenue du Football 1, 1020 Brussel', latitude: 50.8945, longitude: 4.3380, category: 'culture' },
{ id: '8', name: 'Koninklijke Musea voor Schone Kunsten', type: 'Museum', description: 'Belangrijkste kunstmuseum van België met werk van Vlaamse meesters', address: 'Rue de la Régence 3, 1000 Brussel', latitude: 50.8420, longitude: 4.3585, category: 'culture' },
{ id: '9', name: 'Jubelpark', type: 'Park', description: 'Prachtig park met triomfboog en verschillende musea', address: 'Jubelpark, 1000 Brussel', latitude: 50.8395, longitude: 4.3920, category: 'nature' },
{ id: '10', name: 'Zoniënwoud', type: 'Bos', description: 'Uitgestrekt bos aan de rand van Brussel, ideaal om te wandelen', address: 'Zoniënwoud, 1160 Brussel', latitude: 50.7700, longitude: 4.4200, category: 'nature' }
];

filterAndDisplayLocations();
};

// ==================== FILTEREN EN SORTEREN (Array methods) ====================
const filterAndDisplayLocations = () => {
try {
// Haal filter waarden op
const searchTerm = elements.searchInput.value.toLowerCase();
const category = elements.categoryFilter.value;
const sortBy = elements.sortSelect.value;

// Bepaal welke dataset te gebruiken (alle of favorieten)
let locationsToFilter = isShowingFavorites ?
allLocations.filter(loc => favorites.includes(loc.id)) :
allLocations;

// Filter op zoekterm (Array method: filter)
let filtered = locationsToFilter.filter(location => {
const matchesSearch = searchTerm === '' ||
location.name.toLowerCase().includes(searchTerm) ||
location.description.toLowerCase().includes(searchTerm);

const matchesCategory = category === 'all' || location.category === category;

return matchesSearch && matchesCategory;
});

// Sorteer (Array method: sort met ternary)
filtered.sort((a, b) => {
if (sortBy === 'name') {
return a.name.localeCompare(b.name);
} else if (sortBy === 'name-desc') {
return b.name.localeCompare(a.name);
} else if (sortBy === 'type') {
return a.type.localeCompare(b.type);
}
return 0;
});

// Update huidige weergave
currentDisplayedLocations = filtered;

// Update result count met ternary operator
const countText = isShowingFavorites ? 'favorieten' : 'locaties';
elements.resultCount.textContent = `${filtered.length} ${countText} gevonden`;

// Update alle weergaven
updateTableView();
updateMapMarkers();
updateGridView();

console.log(`✅ ${filtered.length} locaties weergegeven`);

} catch (error) {
console.error('❌ Fout bij filteren:', error);
showError('Fout bij het filteren van data');
}
};

// ==================== TABELWEERGAVE (6 kolommen) ====================
const updateTableView = () => {
if (!elements.tableBody) return;

if (currentDisplayedLocations.length === 0) {
elements.tableBody.innerHTML = `
<tr>
<td colspan="6" class="text-center">
${isShowingFavorites ? 'Geen favoriete locaties gevonden' : 'Geen locaties gevonden. Klik op "Laad locaties"'}
</td>
</tr>
`;
return;
}

// Template literals voor HTML generatie
elements.tableBody.innerHTML = currentDisplayedLocations.map((location, index) => `
<tr>
<td>${index + 1}</td>
<td><strong>${escapeHtml(location.name)}</strong></td>
<td>${getCategoryIcon(location.category)} ${location.category}</td>
<td>${escapeHtml(location.type)}</td>
<td><i class="fas fa-map-marker-alt"></i> ${escapeHtml(location.address.substring(0, 40))}...</td>
<td>
<button class="favorite-table-btn" data-id="${location.id}" data-name="${escapeHtml(location.name)}">
<i class="fas fa-heart ${favorites.includes(location.id) ? 'active' : ''}"></i>
</button>
</td>
</tr>
`).join('');

// Voeg event listeners toe aan favoriet knoppen in tabel
document.querySelectorAll('.favorite-table-btn').forEach(btn => {
btn.addEventListener('click', () => {
const id = btn.dataset.id;
toggleFavorite(id);
});
});
};

// ==================== KAART MARKERS UPDATE ====================
const updateMapMarkers = () => {
if (!map) return;

// Verwijder bestaande markers
mapMarkers.forEach(marker => marker.remove());
mapMarkers = [];

// Voeg nieuwe markers toe (Array method: forEach)
currentDisplayedLocations.forEach(location => {
const marker = L.marker([location.latitude, location.longitude])
.bindPopup(`
<strong>${escapeHtml(location.name)}</strong><br>
${escapeHtml(location.type)}<br>
${escapeHtml(location.address)}<br>
<button onclick="window.toggleFavoriteFromMap('${location.id}')" class="map-favorite-btn">
${favorites.includes(location.id) ? '❤️ Verwijder uit favorieten' : '🤍 Toevoegen aan favorieten'}
</button>
`)
.addTo(map);

mapMarkers.push(marker);
});

// Pas kaartzoom aan als er markers zijn
if (mapMarkers.length > 0) {
const group = L.featureGroup(mapMarkers);
map.fitBounds(group.getBounds().pad(0.1));
}
};

// ==================== GRIDWEERGAVE ====================
const updateGridView = () => {
if (!elements.locationsGrid) return;

if (currentDisplayedLocations.length === 0) {
elements.locationsGrid.innerHTML = `
<div class="no-data">
<i class="fas fa-map-marked-alt"></i>
<p>Geen locaties gevonden</p>
</div>
`;
return;
}

elements.locationsGrid.innerHTML = currentDisplayedLocations.map(location => `
<div class="location-card" data-id="${location.id}">
<div class="card-header">
<h3>${escapeHtml(location.name)}</h3>
<button class="favorite-btn ${favorites.includes(location.id) ? 'active' : ''}" data-id="${location.id}">
<i class="fas fa-heart"></i>
</button>
</div>
<div class="card-content">
<p><i class="fas fa-tag"></i> ${escapeHtml(location.type)}</p>
<p><i class="fas fa-map-pin"></i> ${escapeHtml(location.address)}</p>
<p><i class="fas fa-info-circle"></i> ${escapeHtml(location.description.substring(0, 100))}...</p>
</div>
<div class="card-footer">
<span>${getCategoryIcon(location.category)} ${location.category}</span>
<span><i class="fas fa-star"></i> ${location.id}</span>
</div>
</div>
`).join('');

// Voeg event listeners toe aan favoriet knoppen in grid
document.querySelectorAll('.favorite-btn').forEach(btn => {
btn.addEventListener('click', (e) => {
e.stopPropagation();
const id = btn.dataset.id;
toggleFavorite(id);
});
});
};

// ==================== VIEW MODE TOGGLE ====================
const toggleViewMode = () => {
if (currentView === 'map') {
currentView = 'table';
elements.tableView.style.display = 'block';
elements.mapView.style.display = 'none';
elements.locationsGrid.style.display = 'none';
elements.viewToggle.innerHTML = '<i class="fas fa-map"></i> Kaartweergave';
elements.currentViewBadge.textContent = '📋 Tabelweergave (6 kolommen)';
} else if (currentView === 'table') {
currentView = 'grid';
elements.tableView.style.display = 'none';
elements.mapView.style.display = 'none';
elements.locationsGrid.style.display = 'grid';
elements.viewToggle.innerHTML = '<i class="fas fa-map"></i> Kaartweergave';
elements.currentViewBadge.textContent = '🎴 Gridweergave';
} else {
currentView = 'map';
elements.tableView.style.display = 'none';
elements.mapView.style.display = 'block';
elements.locationsGrid.style.display = 'none';
elements.viewToggle.innerHTML = '<i class="fas fa-table"></i> Lijstweergave';
elements.currentViewBadge.textContent = '📍 Kaartweergave';

// Refresh kaart
setTimeout(() => {
if (map) map.invalidateSize();
}, 100);
}

// Sla view mode op in localStorage
localStorage.setItem(STORAGE_KEYS.VIEW_MODE, currentView);
};

// ==================== VIEW MODE LADEN ====================
const loadViewMode = () => {
const savedView = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
if (savedView && (savedView === 'map' || savedView === 'table' || savedView === 'grid')) {
currentView = savedView;

if (currentView === 'map') {
elements.tableView.style.display = 'none';
elements.mapView.style.display = 'block';
elements.locationsGrid.style.display = 'none';
elements.viewToggle.innerHTML = '<i class="fas fa-table"></i> Lijstweergave';
elements.currentViewBadge.textContent = '📍 Kaartweergave';
} else if (currentView === 'table') {
elements.tableView.style.display = 'block';
elements.mapView.style.display = 'none';
elements.locationsGrid.style.display = 'none';
elements.viewToggle.innerHTML = '<i class="fas fa-map"></i> Kaartweergave';
elements.currentViewBadge.textContent = '📋 Tabelweergave (6 kolommen)';
} else {
elements.tableView.style.display = 'none';
elements.mapView.style.display = 'none';
elements.locationsGrid.style.display = 'grid';
elements.viewToggle.innerHTML = '<i class="fas fa-map"></i> Kaartweergave';
elements.currentViewBadge.textContent = '🎴 Gridweergave';
}
}
};

// ==================== FAVORIETEN TOGGLE (LocalStorage) ====================
const toggleFavorite = (id) => {
const index = favorites.indexOf(id);

if (index === -1) {
favorites.push(id);
console.log(`❤️ Locatie ${id} toegevoegd aan favorieten`);
} else {
favorites.splice(index, 1);
console.log(`💔 Locatie ${id} verwijderd uit favorieten`);
}

// Opslaan in localStorage
localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));

// Update weergaven
filterAndDisplayLocations();
};

// ==================== FAVORIETEN LADEN ====================
const loadFavorites = () => {
const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
return saved ? JSON.parse(saved) : [];
};

// ==================== FAVORIETEN WEERGAVE TOGGLE ====================
const toggleFavoritesView = () => {
isShowingFavorites = !isShowingFavorites;

if (isShowingFavorites) {
elements.showFavoritesBtn.innerHTML = '<i class="fas fa-heart-broken"></i> Toon alles';
elements.showFavoritesBtn.classList.add('active');
} else {
elements.showFavoritesBtn.innerHTML = '<i class="fas fa-heart"></i> Favorieten';
elements.showFavoritesBtn.classList.remove('active');
}

filterAndDisplayLocations();
};

// ==================== RESET FILTERS ====================
const resetFilters = () => {
elements.searchInput.value = '';
elements.categoryFilter.value = 'all';
elements.sortSelect.value = 'name';
elements.searchValidation.textContent = '';
isShowingFavorites = false;
elements.showFavoritesBtn.innerHTML = '<i class="fas fa-heart"></i> Favorieten';

filterAndDisplayLocations();
};

// ==================== THEMA TOGGLE (LocalStorage) ====================
const toggleTheme = () => {
const isDark = document.body.classList.toggle('dark-theme');
const icon = elements.themeToggle.querySelector('i');

if (isDark) {
icon.classList.remove('fa-moon');
icon.classList.add('fa-sun');
localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
} else {
icon.classList.remove('fa-sun');
icon.classList.add('fa-moon');
localStorage.setItem(STORAGE_KEYS.THEME, 'light');
}
};

// ==================== THEMA LADEN ====================
const loadTheme = () => {
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
const icon = elements.themeToggle.querySelector('i');

if (savedTheme === 'dark') {
document.body.classList.add('dark-theme');
icon.classList.remove('fa-moon');
icon.classList.add('fa-sun');
}
};

// ==================== HELPER FUNCTIES ====================
const getCategoryIcon = (category) => {
const icons = {
culture: '🏛️',
nature: '🌳',
history: '🏰',
art: '🎨'
};
return icons[category] || '📍';
};

const escapeHtml = (str) => {
if (!str) return '';
return str
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');
};

const showLoading = (show) => {
elements.loadingIndicator.style.display = show ? 'flex' : 'none';
};

const showError = (message) => {
elements.errorMessage.textContent = message;
elements.errorMessage.style.display = 'block';
setTimeout(() => {
elements.errorMessage.style.display = 'none';
}, 5000);
};

const hideError = () => {
elements.errorMessage.style.display = 'none';
};

// ==================== GLOBAL FUNCTIONS (voor kaart popups) ====================
window.toggleFavoriteFromMap = (id) => {
toggleFavorite(id);
updateMapMarkers();
};

// ==================== INTERSECTION OBSERVER (Lazy Loading) ====================
const setupIntersectionObserver = () => {
const lazyElements = document.querySelectorAll('.lazy-load');

const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
entry.target.classList.add('loaded');
observer.unobserve(entry.target);
}
});
}, {
rootMargin: '50px',
threshold: 0.1
});

lazyElements.forEach(el => observer.observe(el));
};

// Start observer na laden van data
window.addEventListener('load', () => {
setTimeout(setupIntersectionObserver, 1000);
});