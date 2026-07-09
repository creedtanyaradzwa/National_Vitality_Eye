import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initOfflineDB } from './utils/offlineSync'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

// Initialize offline database
initOfflineDB().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
);