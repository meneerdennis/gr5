import React from 'react';

const layoutStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

function Layout({ children }) {
  return <div style={layoutStyle}>{children}</div>;
}

export default Layout;