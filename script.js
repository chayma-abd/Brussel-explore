let alleLocaties = [];
let favorieten = [];
let huidigeLocaties = [];
let map = null;
let markers = [];

function laadFavorieten() {
    let saved = localStorage.getItem('favorieten');
    if (saved) {
        favorieten = JSON.parse(saved);
    }
}

function bewaarFavorieten() {
    localStorage.setItem('favorieten', JSON.stringify(favorieten));
}

async function haalData() {
    let laadKnop = document.getElementById('laadKnop');
    laadKnop.innerHTML = 'Bezig met laden...';
    
    let url = 'https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/bruxelles_parcours_bd/records?limit=20';
    let response = await fetch(url);
    let data = await response.json();
    
    alleLocaties = [];
    for (let i = 0; i < data.results.length; i++) {
        let item = data.results[i];
        
        let nederlandseNaam = item.naam_fresco_nl || item.nom_de_la_fresque || 'Onbekend';
        let nederlandsAdres = item.adres_nl || item.adresse_fr || 'Onbekend';
        let nederlandseGemeente = item.gemeente || item.commune || 'Brussel';
        
        alleLocaties.push({
            id: item.id,
            naam: nederlandseNaam,
            tekenaar: item.dessinateur || 'Onbekend',
            jaar: item.date || 'Onbekend',
            adres: nederlandsAdres,
            gemeente: nederlandseGemeente,
            lat: item.geo_point ? item.geo_point.lat : 50.85,
            lng: item.geo_point ? item.geo_point.lon : 4.35
        });
    }
    
    huidigeLocaties = [];
    for (let i = 0; i < alleLocaties.length; i++) {
        huidigeLocaties.push(alleLocaties[i]);
    }
    
    toonKaart();
    toonTabel();
    laadKnop.innerHTML = 'Laad locaties';
    document.getElementById('aantalInfo').innerHTML = alleLocaties.length + ' locaties geladen';
}

function toonKaart() {
    if (!map) {
        map = L.map('map').setView([50.85, 4.35], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
    
    for (let i = 0; i < markers.length; i++) {
        markers[i].remove();
    }
    markers = [];
    
    for (let i = 0; i < huidigeLocaties.length; i++) {
        let loc = huidigeLocaties[i];
        let marker = L.marker([loc.lat, loc.lng]);
        let popupText = '<b>' + loc.naam + '</b><br>' + loc.adres + '<br>Tekenaar: ' + loc.tekenaar + '<br>Jaar: ' + loc.jaar;
        marker.bindPopup(popupText);
        marker.addTo(map);
        markers.push(marker);
    }
}

function setupObserver() {
    let observer = new IntersectionObserver(function(entries) {
        for (let i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
                entries[i].target.style.opacity = '1';
                entries[i].target.style.transform = 'translateY(0)';
                observer.unobserve(entries[i].target);
            }
        }
    }, { threshold: 0.1 });

    let rijen = document.querySelectorAll('#tabelBody tr');
    for (let i = 0; i < rijen.length; i++) {
        rijen[i].style.opacity = '0';
        rijen[i].style.transform = 'translateY(20px)';
        rijen[i].style.transition = 'all 0.5s ease';
        observer.observe(rijen[i]);
    }
}

function toonTabel() {
    let html = '';
    for (let i = 0; i < huidigeLocaties.length; i++) {
        let loc = huidigeLocaties[i];
        let isFav = false;
        for (let j = 0; j < favorieten.length; j++) {
            if (favorieten[j] === loc.id) {
                isFav = true;
                break;
            }
        }
        let hartje = isFav ? '❤️' : '🤍';
        html += '<tr>';
        html += '<td>' + (i+1) + '</td>';
        html += '<td><b>' + loc.naam + '</b></td>';
        html += '<td>' + loc.adres + '</td>';
        html += '<td>' + loc.tekenaar + '</td>';
        html += '<td>' + loc.jaar + '</td>';
        html += '<td><button onclick="toggleFavoriet(\'' + loc.id + '\')" style="background:none;border:none;font-size:20px;cursor:pointer;">' + hartje + '</button></td>';
        html += '</tr>';
    }
    document.getElementById('tabelBody').innerHTML = html;
    document.getElementById('aantalInfo').innerHTML = huidigeLocaties.length + ' locaties gevonden';
    
    setTimeout(setupObserver, 100);
}

function toggleFavoriet(id) {
    let index = -1;
    for (let i = 0; i < favorieten.length; i++) {
        if (favorieten[i] === id) {
            index = i;
            break;
        }
    }
    
    if (index === -1) {
        favorieten.push(id);
    } else {
        favorieten.splice(index, 1);
    }
    
    bewaarFavorieten();
    toonTabel();
    toonKaart();
}

function filterEnToon() {
    let zoekterm = document.getElementById('zoekInput').value.toLowerCase();
    let gemeente = document.getElementById('filterSelect').value;
    
    let resultaat = [];
    for (let i = 0; i < alleLocaties.length; i++) {
        resultaat.push(alleLocaties[i]);
    }
    
    if (zoekterm.length >= 2) {
        let temp = [];
        for (let i = 0; i < resultaat.length; i++) {
            if (resultaat[i].naam.toLowerCase().includes(zoekterm) || resultaat[i].tekenaar.toLowerCase().includes(zoekterm)) {
                temp.push(resultaat[i]);
            }
        }
        resultaat = temp;
    }
    
    if (gemeente !== 'all') {
        let temp = [];
        for (let i = 0; i < resultaat.length; i++) {
            if (resultaat[i].gemeente === gemeente) {
                temp.push(resultaat[i]);
            }
        }
        resultaat = temp;
    }
    
    let sorteer = document.getElementById('sorteerSelect').value;
    if (sorteer === 'naam') {
        resultaat.sort(function(a, b) {
            if (a.naam < b.naam) return -1;
            if (a.naam > b.naam) return 1;
            return 0;
        });
    } else if (sorteer === 'jaar') {
        resultaat.sort(function(a, b) {
            if (a.jaar > b.jaar) return -1;
            if (a.jaar < b.jaar) return 1;
            return 0;
        });
    }
    
    huidigeLocaties = resultaat;
    toonKaart();
    toonTabel();
}

function toonAlleenFavorieten() {
    let resultaat = [];
    for (let i = 0; i < alleLocaties.length; i++) {
        for (let j = 0; j < favorieten.length; j++) {
            if (alleLocaties[i].id === favorieten[j]) {
                resultaat.push(alleLocaties[i]);
                break;
            }
        }
    }
    huidigeLocaties = resultaat;
    toonKaart();
    toonTabel();
}

function resetAlles() {
    document.getElementById('zoekInput').value = '';
    document.getElementById('filterSelect').value = 'all';
    document.getElementById('sorteerSelect').value = 'naam';
    huidigeLocaties = [];
    for (let i = 0; i < alleLocaties.length; i++) {
        huidigeLocaties.push(alleLocaties[i]);
    }
    toonKaart();
    toonTabel();
}

function toggleThema() {
    if (document.body.classList.contains('donker')) {
        document.body.classList.remove('donker');
        document.getElementById('themaKnop').innerHTML = 'Donker thema';
    } else {
        document.body.classList.add('donker');
        document.getElementById('themaKnop').innerHTML = 'Licht thema';
    }
}

document.getElementById('laadKnop').onclick = haalData;
document.getElementById('favKnop').onclick = toonAlleenFavorieten;
document.getElementById('resetKnop').onclick = resetAlles;
document.getElementById('themaKnop').onclick = toggleThema;
document.getElementById('zoekInput').oninput = filterEnToon;
document.getElementById('filterSelect').onchange = filterEnToon;
document.getElementById('sorteerSelect').onchange = filterEnToon;

laadFavorieten();
haalData();