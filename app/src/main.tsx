import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service worker registration is injected automatically by vite-plugin-pwa
// (registerSW.js, autoUpdate). The old manual register('/sw.js') pointed at the
// wrong path for the /nauka-app/ base and kept stale versions alive.
