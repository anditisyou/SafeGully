// Initialize Leaflet Map
var map = L.map('map').setView([19.0760, 72.8777], 13); // Mumbai as default

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add marker on map click
map.on('click', function (e) {
  L.marker([e.latlng.lat, e.latlng.lng])
    .addTo(map)
    .bindPopup('Hazard reported here!')
    .openPopup();
});

document.querySelector("form").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Thanks for reporting! Our team will verify soon.");
});
