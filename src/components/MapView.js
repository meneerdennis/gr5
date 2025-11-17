import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import PhotoMarkerPopup from './PhotoMarkerPopup';

const photoIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  popupAnchor: [1, -34],
});

function MapView({ routePolyline, hikes, photos }) {
  const center = routePolyline[Math.floor(routePolyline.length / 2)] || [50, 4];

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap-bijdragers'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline positions={routePolyline} color="#ff5722" />

      {photos.map(photo => (
        <Marker
          key={photo.id}
          position={[photo.lat, photo.lng]}
          icon={photoIcon}
        >
          <Popup>
            <PhotoMarkerPopup photo={photo} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default MapView;