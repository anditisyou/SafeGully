const map = L.map('map').setView([19.0760, 72.8777], 13);

const lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
});

const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors & © CARTO'
});

lightLayer.addTo(map);

const hazardTypes = {
  pothole: { icon: '🕳️', color: '#e67e22' },
  flooding: { icon: '🌊', color: '#3498db' },
  debris: { icon: '🗑️', color: '#95a5a6' },
  accident: { icon: '⚠️', color: '#e74c3c' }
};

function createCustomIcon(type) {
  return L.divIcon({
    html: `<div style="background:${hazardTypes[type].color}; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; color:white; font-size:16px;">${hazardTypes[type].icon}</div>`,
    className: '',
    iconSize: [30, 30]
  });
}

let hazards = JSON.parse(localStorage.getItem('hazards')) || [];
let lastClickedLatLng = null;
let tempMarker = null;

function loadHazards() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  hazards.forEach(hazard => {
    const marker = L.marker([hazard.lat, hazard.lng], { 
      icon: createCustomIcon(hazard.type),
      opacity: hazard.status === 'fixed' ? 0.5 : 1
    }).addTo(map);

    let popupContent = `<b>${hazard.location}</b><br>
                       <small>Type: ${hazard.type}</small><br>
                       ${hazard.description}`;

    if (hazard.photo) {
      popupContent += `<br><img src="${hazard.photo}" style="max-width:200px; margin-top:8px;">`;
    }

    if (hazard.status !== 'fixed') {
      popupContent += `<button class="fix-btn" onclick="markFixed(${hazard.id})">Mark as Fixed</button>`;
    }

    marker.bindPopup(popupContent);
  });

  updateHazardList();
  updateHeatmap();
}

map.on('click', function(e) {
  if (tempMarker) {
    map.removeLayer(tempMarker);
  }

  lastClickedLatLng = e.latlng;
  tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
    icon: L.divIcon({
      html: '<div style="background:#3498db80; border-radius:50%; width:20px; height:20px; border:2px solid white;"></div>',
      className: '',
      iconSize: [24, 24]
    })
  }).addTo(map)
    .bindPopup('Selected location')
    .openPopup();

  showToast('Location selected. Now fill the form.');
});

document.getElementById('hazard-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  if (!lastClickedLatLng) {
    showToast('Please select a location on the map first!');
    return;
  }

  const type = document.getElementById('hazard-type').value;
  const location = document.getElementById('location-input').value;
  const description = document.getElementById('description-input').value;
  const photoInput = document.getElementById('hazard-photo');
  let photo = null;

  if (photoInput.files[0]) {
    photo = await convertToBase64(photoInput.files[0]);
  }

  const hazard = {
    id: Date.now(),
    lat: lastClickedLatLng.lat,
    lng: lastClickedLatLng.lng,
    type,
    location,
    description,
    photo,
    status: 'reported',
    timestamp: new Date().toISOString()
  };

  hazards.push(hazard);
  localStorage.setItem('hazards', JSON.stringify(hazards));
  e.target.reset();
  lastClickedLatLng = null;
  if (tempMarker) map.removeLayer(tempMarker);
  tempMarker = null;
  loadHazards();
  showToast('Hazard reported successfully!');
});

async function convertToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
  });
}

function updateHazardList() {
  const container = document.getElementById('hazard-items');
  container.innerHTML = hazards
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(hazard => `
      <div class="hazard-item" data-id="${hazard.id}">
        <strong>${hazard.location}</strong>
        <p>${hazardTypes[hazard.type].icon} ${hazard.type} • 
           ${new Date(hazard.timestamp).toLocaleString()}
           ${hazard.status === 'fixed' ? ' (Fixed)' : ''}</p>
      </div>
    `).join('');

  document.querySelectorAll('.hazard-item').forEach(item => {
    item.addEventListener('click', () => {
      const hazard = hazards.find(h => h.id == item.dataset.id);
      map.flyTo([hazard.lat, hazard.lng], 16);
      const marker = findMarkerByLatLng([hazard.lat, hazard.lng]);
      if (marker) marker.openPopup();
    });
  });
}

function findMarkerByLatLng(latlng) {
  let foundMarker = null;
  map.eachLayer(layer => {
    if (layer instanceof L.Marker && 
        layer.getLatLng().equals(latlng)) {
      foundMarker = layer;
    }
  });
  return foundMarker;
}

function updateHeatmap() {
  map.eachLayer(layer => {
    if (layer instanceof L.HeatLayer) {
      map.removeLayer(layer);
    }
  });

  const points = hazards
    .filter(h => h.status !== 'fixed')
    .map(h => [h.lat, h.lng, 0.5]);
  
  if (points.length > 0) {
    L.heatLayer(points, { radius: 25, blur: 15 }).addTo(map);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

window.markFixed = function(id) {
  const password = prompt("Enter admin password:");
  if (password === "safe123") {
    hazards = hazards.map(h => 
      h.id === id ? { ...h, status: 'fixed' } : h
    );
    localStorage.setItem('hazards', JSON.stringify(hazards));
    loadHazards();
    showToast('Hazard marked as fixed');
  } else {
    showToast('Incorrect password');
  }
};

document.getElementById('filter-all').addEventListener('click', () => {
  setActiveFilter('all');
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      layer.setOpacity(1);
    }
  });
});

document.getElementById('filter-reported').addEventListener('click', () => {
  setActiveFilter('reported');
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const hazard = hazards.find(h => 
        h.lat === layer.getLatLng().lat && 
        h.lng === layer.getLatLng().lng
      );
      layer.setOpacity(hazard.status === 'reported' ? 1 : 0.3);
    }
  });
});

document.getElementById('filter-fixed').addEventListener('click', () => {
  setActiveFilter('fixed');
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const hazard = hazards.find(h => 
        h.lat === layer.getLatLng().lat && 
        h.lng === layer.getLatLng().lng
      );
      layer.setOpacity(hazard.status === 'fixed' ? 1 : 0.3);
    }
  });
});

function setActiveFilter(filter) {
  document.querySelectorAll('.filters button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`filter-${filter}`).classList.add('active');
}

document.getElementById('locate-me').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(pos => {
    map.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
    showToast('Centered on your location');
  }, () => {
    showToast('Could not access your location');
  });
});

document.getElementById('export-data').addEventListener('click', () => {
  const csv = 'ID,Latitude,Longitude,Type,Location,Description,Status,Date\n' +
    hazards.map(h => 
      `${h.id},${h.lat},${h.lng},${h.type},"${h.location}","${h.description}",${h.status},${h.timestamp}`
    ).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hazard_reports_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('Data exported successfully');
});

const themeSwitcher = document.getElementById('theme-switcher');
const body = document.body;

function setMapLayer(theme) {
  if (theme === 'dark') {
    if (map.hasLayer(lightLayer)) {
      map.removeLayer(lightLayer);
    }
    darkLayer.addTo(map);
  } else {
    if (map.hasLayer(darkLayer)) {
      map.removeLayer(darkLayer);
    }
    lightLayer.addTo(map);
  }
}

function setTheme(theme) {
  body.classList.toggle('dark-mode', theme === 'dark');
  themeSwitcher.checked = theme === 'dark';
  setMapLayer(theme);
  localStorage.setItem('theme', theme);
}

themeSwitcher.addEventListener('change', (e) => {
  setTheme(e.target.checked ? 'dark' : 'light');
});

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
});

loadHazards();