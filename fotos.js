async function haalFotos() {
    let url = 'https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/bruxelles_parcours_bd/records?limit=20';
    let response = await fetch(url);
    let data = await response.json();
    
    let grid = document.getElementById('fotosGrid');
    let html = '';
    
    for (let i = 0; i < data.results.length; i++) {
        let item = data.results[i];
        let naam = item.naam_fresco_nl || item.nom_de_la_fresque || 'Onbekend';
        let adres = item.adres_nl || item.adresse_fr || 'Onbekend';
        let tekenaar = item.dessinateur || 'Onbekend';
        let jaar = item.date || 'Onbekend';
        let fotoUrl = item.image ? item.image.url : '';
        
        if (fotoUrl) {
            fotoUrl = 'https://cors-anywhere.herokuapp.com/' + fotoUrl;
        }
        
        html += '<div class="foto-card">';
        if (fotoUrl) {
            html += '<img src="' + fotoUrl + '" alt="' + naam + '">';
        } else {
            html += '<div style="height:180px;background:#1e3c72;display:flex;align-items:center;justify-content:center;color:white;">Geen foto</div>';
        }
        html += '<div class="foto-info">';
        html += '<h3>' + naam + '</h3>';
        html += '<p><strong>Adres:</strong> ' + adres + '</p>';
        html += '<p><strong>Tekenaar:</strong> ' + tekenaar + '</p>';
        html += '<p><strong>Jaar:</strong> ' + jaar + '</p>';
        html += '</div>';
        html += '</div>';
    }
    
    grid.innerHTML = html;
}

haalFotos();