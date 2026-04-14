import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initOfflineDB } from './utils/offlineSync'

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => {
                console.log('Service Worker registered successfully');
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// Initialize offline database
initOfflineDB().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);