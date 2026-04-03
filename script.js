let alleLocaties = [];
let favorieten = [];
let huidigeLocaties = [];
let map = null;
let markers = [];

function laadFav() {
    let saved = localStorage.getItem('favorieten');
    if (saved) favorieten = JSON.parse(saved);
}

function bewaarFav() {
    localStorage.setItem('favorieten', JSON.stringify(favorieten));
}

async function haalData() {
    let url = 'https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/bruxelles_parcours_bd/records?limit=20';
    let res = await fetch(url);
    let data = await res.json();
    
    alleLocaties = data.results.map(item => ({
        id: item.id,
        naam: item.naam_fresco_nl || item.nom_de_la_fresque || 'Onbekend',
        tekenaar: item.dessinateur || 'Onbekend',
        jaar: item.date || 'Onbekend',
        adres: item.adres_nl || item.adresse_fr || 'Onbekend',
        gemeente: item.gemeente || item.commune || 'Brussel',
        lat: item.geo_point?.lat || 50.85,
        lng: item.geo_point?.lon || 4.35
    }));
    
    huidigeLocaties = [...alleLocaties];
    toonKaart();
    toonTabel();
    document.getElementById('aantalInfo').innerHTML = alleLocaties.length + ' locaties';
}

function toonKaart() {
    if (!map) {
        map = L.map('map').setView([50.85, 4.35], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
    markers.forEach(m => m.remove());
    markers = [];
    
    huidigeLocaties.forEach(loc => {
        let m = L.marker([loc.lat, loc.lng]);
        m.bindPopup(`<b>${loc.naam}</b><br>${loc.adres}<br>${loc.tekenaar}<br>${loc.jaar}`);
        m.addTo(map);
        markers.push(m);
    });
}

function toonTabel() {
    let html = '';
    huidigeLocaties.forEach((loc, i) => {
        let isFav = favorieten.includes(loc.id);
        html += `<tr>
            <td>${i+1}</td>
            <td><b>${loc.naam}</b></td>
            <td>${loc.adres}</td>
            <td>${loc.tekenaar}</td>
            <td>${loc.jaar}</td>
            <td><button onclick="toggleFav('${loc.id}')" style="background:none;border:none;font-size:18px;cursor:pointer;">${isFav ? '❤️' : '🤍'}</button></td>
        </tr>`;
    });
    document.getElementById('tabelBody').innerHTML = html;
    document.getElementById('aantalInfo').innerHTML = huidigeLocaties.length + ' locaties';
}

function toggleFav(id) {
    let idx = favorieten.indexOf(id);
    if (idx === -1) favorieten.push(id);
    else favorieten.splice(idx, 1);
    bewaarFav();
    toonTabel();
    toonKaart();
}

function filterEnToon() {
    let zoek = document.getElementById('zoekInput').value.toLowerCase();
    let gemeente = document.getElementById('filterSelect').value;
    let result = [...alleLocaties];
    
    if (zoek.length >= 2) {
        result = result.filter(l => l.naam.toLowerCase().includes(zoek) || l.tekenaar.toLowerCase().includes(zoek));
    }
    if (gemeente !== 'all') {
        result = result.filter(l => l.gemeente === gemeente);
    }
    
    let sort = document.getElementById('sorteerSelect').value;
    if (sort === 'naam') result.sort((a,b) => a.naam.localeCompare(b.naam));
    if (sort === 'jaar') result.sort((a,b) => b.jaar.localeCompare(a.jaar));
    
    huidigeLocaties = result;
    toonKaart();
    toonTabel();
}

function toonFav() {
    let result = alleLocaties.filter(l => favorieten.includes(l.id));
    if (result.length === 0) alert('Geen favorieten');
    huidigeLocaties = result;
    toonKaart();
    toonTabel();
}

function reset() {
    document.getElementById('zoekInput').value = '';
    document.getElementById('filterSelect').value = 'all';
    document.getElementById('sorteerSelect').value = 'naam';
    huidigeLocaties = [...alleLocaties];
    toonKaart();
    toonTabel();
}

document.getElementById('laadKnop').onclick = haalData;
document.getElementById('favKnop').onclick = toonFav;
document.getElementById('resetKnop').onclick = reset;
document.getElementById('zoekInput').oninput = filterEnToon;
document.getElementById('filterSelect').onchange = filterEnToon;
document.getElementById('sorteerSelect').onchange = filterEnToon;

laadFav();
haalData();