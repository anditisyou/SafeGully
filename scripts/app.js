// Initialize Leaflet Map
var map = L.map('map').setView([19.0760, 72.8777], 13); // Mumbai as default

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Store last clicked location
let lastClickedLatLng = null;

// Add marker on map click and store location
map.on('click', function(e) {
  // Clear previous marker if exists
  if (lastClickedLatLng) {
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
  }
  
  // Store new location
  lastClickedLatLng = e.latlng;
  
  // Add temporary marker
  L.marker([e.latlng.lat, e.latlng.lng])
    .addTo(map)
    .bindPopup('Potential hazard location')
    .openPopup();
});

// Handle form submission
document.getElementById('hazard-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const location = document.getElementById('location-input').value;
  const description = document.getElementById('description-input').value;

  if (lastClickedLatLng) {
    // Add permanent marker with form data
    L.marker([lastClickedLatLng.lat, lastClickedLatLng.lng])
      .addTo(map)
      .bindPopup(`<b>${location}</b><br>${description}`)
      .openPopup();
    
    // Reset form and location
    e.target.reset();
    lastClickedLatLng = null;
    
    // Show confirmation
    alert("Thanks for reporting! Our team will verify soon.");
  } else {
    alert("Please click on the map to select a location first!");
  }
});
