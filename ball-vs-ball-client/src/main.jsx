import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './ui/styles/hud.css';
import './ui/styles/popups.css';
import './ui/styles/store.css';

// No StrictMode: its double-run of effects would build the WebGL world twice in development.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
