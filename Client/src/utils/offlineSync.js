// src/utils/offlineSync.js
import { openDB } from 'idb';

// IndexedDB setup
const DB_NAME = 'vitality-eye-offline-v3';
const DB_VERSION = 10; 
const STORE_NAME = 'pending-operations';

let db = null;

// Initialize IndexedDB
export async function initOfflineDB() {
    try {
        db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion) {
                console.log('Upgrading database from version', oldVersion, 'to', newVersion);
                
                // Always create the store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('type', 'type');
                    store.createIndex('synced', 'synced');
                } else {
                    // If store exists, make sure indexes are present
                    const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
                    if (!store.indexNames.contains('timestamp')) {
                        store.createIndex('timestamp', 'timestamp');
                    }
                    if (!store.indexNames.contains('type')) {
                        store.createIndex('type', 'type');
                    }
                    if (!store.indexNames.contains('synced')) {
                        store.createIndex('synced', 'synced');
                    }
                }
            }
        });
        console.log('Offline DB initialized');
        return db;
    } catch (error) {
        console.error('Failed to initialize offline DB:', error);
        return null;
    }
}

// Save operation for offline sync
export async function saveOfflineOperation(url, method, body, type = 'api') {
    if (!db) await initOfflineDB();
    if (!db) return null;
    
    const pendingOp = {
        url,
        method,
        body,
        type,
        timestamp: Date.now(),
        synced: false,
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()
    };
    
    try {
        await db.add(STORE_NAME, pendingOp);
        console.log('Operation saved for offline sync:', pendingOp.id);
        
        // Request background sync if available
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-medical-records');
        }
        
        return pendingOp;
    } catch (error) {
        console.error('Failed to save offline operation:', error);
        return null;
    }
}

// Get all pending operations
export async function getPendingOperations() {
    if (!db) await initOfflineDB();
    if (!db) return [];
    
    try {
        // Check if the store exists and has the index
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            console.log('Store not found, reinitializing...');
            await initOfflineDB();
            return [];
        }
        
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        
        // Try to get by index, fallback to getAll if index fails
        try {
            const index = store.index('synced');
            return await index.getAll(false);
        } catch {
            // Index not found, use getAll and filter
            console.log('Index not found, using getAll');
            const allItems = await store.getAll();
            return allItems.filter(item => !item.synced);
        }
    } catch (error) {
        console.error('Error getting pending operations:', error);
        return [];
    }
}

// Mark operation as synced
export async function markOperationSynced(id) {
    if (!db) await initOfflineDB();
    if (!db) return;
    
    try {
        const op = await db.get(STORE_NAME, id);
        if (op) {
            op.synced = true;
            await db.put(STORE_NAME, op);
        }
    } catch (error) {
        console.error('Error marking operation as synced:', error);
    }
}

// Delete operation
export async function deleteOperation(id) {
    if (!db) await initOfflineDB();
    if (!db) return;
    
    try {
        await db.delete(STORE_NAME, id);
    } catch (error) {
        console.error('Error deleting operation:', error);
    }
}

// Clear all synced operations
export async function clearSyncedOperations() {
    if (!db) await initOfflineDB();
    if (!db) return;
    
    try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const allItems = await store.getAll();
        for (const op of allItems) {
            if (op.synced) {
                await store.delete(op.id);
            }
        }
    } catch (error) {
        console.error('Error clearing synced operations:', error);
    }
}

// Sync pending operations with server
// Sync pending operations with server
export async function syncPendingOperations() {
    const pendingOps = await getPendingOperations();
    console.log(`Syncing ${pendingOps.length} pending operations...`);
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    for (const op of pendingOps) {
        try {
            const apiUrl = `${API_BASE_URL}${op.url}`;
            
            const response = await fetch(apiUrl, {
                method: op.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(op.body)
            });
            
            if (response.ok) {
                await markOperationSynced(op.id);
                console.log('Synced operation:', op.id);
            } else if (response.status === 401) {
                console.log('Token expired, stopping sync');
                break;
            }
        } catch (error) {
            console.log('Sync failed for operation:', op.id, error);
        }
    }
    
    await clearSyncedOperations();
}

// Check online status
export function isOnline() {
    return navigator.onLine;
}

// Listen for online/offline events
export function initOnlineStatusListener(callback) {
    const handleOnline = () => {
        console.log('Back online! Syncing data...');
        syncPendingOperations();
        if (callback) callback(true);
    };
    
    const handleOffline = () => {
        console.log('Offline mode activated');
        if (callback) callback(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}