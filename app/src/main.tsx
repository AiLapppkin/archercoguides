import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Telegram appends #tgWebAppData=...&tgWebAppVersion=... to the URL on launch.
// By the time this script runs, telegram-web-app.js has already parsed the
// hash into window.Telegram.WebApp.initData, so replacing the URL is safe —
// otherwise HashRouter reads the Telegram payload as a route and falls through
// to the 404 page.
if (window.location.hash.startsWith('#tgWebApp')) {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
