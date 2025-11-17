import React from 'react';

function PhotoMarkerPopup({ photo }) {
  return (
    <div style={{ maxWidth: '200px' }}>
      <img
        src={photo.url}
        alt={photo.caption || 'Polarsteps foto'}
        style={{ width: '100%', borderRadius: '4px', marginBottom: '0.5rem' }}
      />
      {photo.caption && <div style={{ fontWeight: 'bold' }}>{photo.caption}</div>}
      {photo.date && (
        <div style={{ fontSize: '0.8rem', color: '#555' }}>{photo.date}</div>
      )}
    </div>
  );
}

export default PhotoMarkerPopup;