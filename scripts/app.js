// 🌍 Initialize Map
const map = L.map('map').setView([19.0760, 72.8777], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 🔧 Hazard Types Config
const hazardTypes = {
  pothole: { icon: '🕳️', color: '#e67e22' },
  flooding: { icon: '🌊', color: '#3498db' },
  debris: { icon: '🗑️', color: '#95a5a6' },
  accident: { icon: '⚠️', color: '#e74c3c' }
};

// 🎯 App State
let hazards = JSON.parse(localStorage.getItem('hazards')) || [];
let lastClickedLatLng = null;
let tempMarker = null;

// 📍 Create Custom Marker
function createCustomIcon(type) {
  return L.divIcon({
    html: `<div style="background:${hazardTypes[type].color}; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; color:white; font-size:16px;">${hazardTypes[type].icon}</div>`,
    className: '',
    iconSize: [30, 30]
  });
}

// 🔁 Load Markers
function loadHazards() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  hazards.forEach(hazard => {
    const marker = L.marker([hazard.lat, hazard.lng], {
      icon: createCustomIcon(hazard.type),
      opacity: hazard.status === 'fixed' ? 0.5 : 1
    }).addTo(map);

    let popup = `<b>${hazard.location}</b><br><small>Type: ${hazard.type}</small><br>${hazard.description}`;
    if (hazard.photo) popup += `<br><img src="${hazard.photo}" style="max-width:200px; margin-top:8px;">`;
    if (hazard.status !== 'fixed') popup += `<button class="fix-btn" onclick="markFixed(${hazard.id})">✅ Mark as Fixed</button>`;

    marker.bindPopup(popup);
  });

  updateHazardList();
  updateHeatmap();
}

// 📌 Map Click Handler
map.on('click', e => {
  if (tempMarker) map.removeLayer(tempMarker);
  lastClickedLatLng = e.latlng;

  tempMarker = L.marker(e.latlng, {
    icon: L.divIcon({
      html: '<div style="background:#3498db80; border-radius:50%; width:20px; height:20px; border:2px solid white;"></div>',
      iconSize: [24, 24]
    })
  }).addTo(map).bindPopup('📍 Location selected').openPopup();

  showToast('Location selected. Now fill the form.');
});

// 📤 Form Submission
document.getElementById('hazard-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!lastClickedLatLng) return showToast('⚠️ Please select a location on the map first!');

  const type = document.getElementById('hazard-type').value;
  const location = document.getElementById('location-input').value;
  const description = document.getElementById('description-input').value;
  const photoFile = document.getElementById('hazard-photo').files[0];
  const photo = photoFile ? await convertToBase64(photoFile) : null;

  const hazard = {
    id: Date.now(),
    lat: lastClickedLatLng.lat,
    lng: lastClickedLatLng.lng,
    type, location, description, photo,
    status: 'reported',
    timestamp: new Date().toISOString()
  };

  hazards.push(hazard);
  localStorage.setItem('hazards', JSON.stringify(hazards));

  e.target.reset();
  lastClickedLatLng = null;
  if (tempMarker) map.removeLayer(tempMarker);
  loadHazards();
  showToast('✅ Hazard reported successfully!');
});

// 🧠 Helpers
async function convertToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// 🗂️ Update Sidebar List
function updateHazardList() {
  const container = document.getElementById('hazard-items');
  container.innerHTML = hazards
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(h => `
      <div class="hazard-item" data-id="${h.id}">
        <strong>${h.location}</strong>
        <p>${hazardTypes[h.type].icon} ${h.type} • ${new Date(h.timestamp).toLocaleString()} ${h.status === 'fixed' ? '(Fixed)' : ''}</p>
      </div>`).join('');

  document.querySelectorAll('.hazard-item').forEach(item => {
    item.addEventListener('click', () => {
      const hazard = hazards.find(h => h.id == item.dataset.id);
      map.flyTo([hazard.lat, hazard.lng], 16);
      const marker = findMarkerByLatLng([hazard.lat, hazard.lng]);
      if (marker) marker.openPopup();
    });
  });
}

// 🔍 Find Marker
function findMarkerByLatLng(latlng) {
  let marker = null;
  map.eachLayer(layer => {
    if (layer instanceof L.Marker && layer.getLatLng().equals(latlng)) marker = layer;
  });
  return marker;
}

// 🔥 Update Heatmap
function updateHeatmap() {
  map.eachLayer(layer => {
    if (layer instanceof L.HeatLayer) map.removeLayer(layer);
  });

  const points = hazards.filter(h => h.status !== 'fixed').map(h => [h.lat, h.lng, 0.5]);
  if (points.length) L.heatLayer(points, { radius: 25, blur: 15 }).addTo(map);
}

// 🍞 Toast Notification
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.innerHTML = `<div class="toast-icon">💬</div><div class="toast-message">${msg}</div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('hide'), 2500);
  setTimeout(() => toast.remove(), 3000);
}

// 🛠️ Admin Mark Fixed
window.markFixed = function (id) {
  const pwd = prompt("Admin password:");
  if (pwd === "safe123") {
    hazards = hazards.map(h => h.id === id ? { ...h, status: 'fixed' } : h);
    localStorage.setItem('hazards', JSON.stringify(hazards));
    loadHazards();
    showToast('✔️ Marked as fixed');
  } else showToast('❌ Incorrect password');
};

// 🧹 Filters
['all', 'reported', 'fixed'].forEach(filter => {
  document.getElementById(`filter-${filter}`).addEventListener('click', () => {
    setActiveFilter(filter);
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        const hazard = hazards.find(h => h.lat === layer.getLatLng().lat && h.lng === layer.getLatLng().lng);
        if (!hazard) return;
        layer.setOpacity(
          filter === 'all' ? 1 :
          (filter === 'reported' && hazard.status === 'reported') ? 1 :
          (filter === 'fixed' && hazard.status === 'fixed') ? 1 : 0.3
        );
      }
    });
  });
});

function setActiveFilter(active) {
  document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filter-${active}`).classList.add('active');
}

// 📍 Locate Me
document.getElementById('locate-me').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(pos => {
    map.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
    showToast('📍 Centered on your location');
  }, () => showToast('⚠️ Location access denied'));
});
//email function
const userName = document.getElementById('user-name').value;
const userEmail = document.getElementById('user-email').value;
const title = document.getElementById('user-title').value;
const messageBody = `A new hazard has been reported!\n\nLocation: ${location}\nType: ${type}\nDescription: ${description}\nDate: ${new Date().toLocaleString()}`;

emailjs.send("service_g7tstof", "template_mzh2jfj", {
  name: userName,
  email: userEmail,
  title: title,
  message: messageBody,
  time: new Date().toLocaleTimeString()
})
.then(() => {
  console.log("✅ Email sent!");
})
.catch((error) => {
  console.error("❌ Email send failed:", error);
});

// Scroll to report form when location input is clicked, only if not visible
const locationInput = document.getElementById('location-input');
if (locationInput) {
  locationInput.addEventListener('click', function(e) {
    const reportFormSection = document.getElementById('report-form');
    if (reportFormSection) {
      const rect = reportFormSection.getBoundingClientRect();
      const fullyVisible = rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
      if (!fullyVisible) {
        reportFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus after scroll
        setTimeout(() => locationInput.focus(), 600);
      } else {
        locationInput.focus();
      }
    }
  });
}

// 📤 Export to CSV
document.getElementById('export-data').addEventListener('click', () => {
  const csv = 'ID,Latitude,Longitude,Type,Location,Description,Status,Date\n' +
    hazards.map(h => `${h.id},${h.lat},${h.lng},${h.type},"${h.location}","${h.description}",${h.status},${h.timestamp}`).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hazards_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  showToast('📤 Exported as CSV');
});

// 🚀 Init
loadHazards();
