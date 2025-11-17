import React from 'react';

function ProgressBar({ progress }) {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div style={{ margin: '1rem 0' }}>
      <div
        style={{
          background: '#eee',
          borderRadius: '999px',
          overflow: 'hidden',
          height: '16px',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            background: '#4caf50',
            height: '100%',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
        {percentage}% van de GR5 gewandeld
      </div>
    </div>
  );
}

export default ProgressBar;