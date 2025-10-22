/**
 * Persistence.js - Session Persistence for Claude Flow
 * Handles auto-save, session recovery, and state management
 * Uses IndexedDB for large data, localStorage for preferences
 */

class PersistenceEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.dbName = 'ClaudeFlowDB';
        this.dbVersion = 1;
        this.db = null;
        this.autoSaveInterval = null;
        this.autoSaveDelay = 5000; // Auto-save every 5 seconds
        this.lastSaveTime = 0;
        this.isDirty = false;

        // Storage keys
        this.keys = {
            preferences: 'claudeflow_preferences',
            currentSession: 'claudeflow_current_session',
            sessionState: 'claudeflow_session_state'
        };

        this.init();
    }

    /**
     * Initialize persistence engine
     */
    async init() {
        try {
            // Initialize IndexedDB
            await this.initIndexedDB();

            // Setup auto-save
            this.setupAutoSave();

            // Load last session state
            await this.loadSessionState();

            console.log('Persistence engine initialized');
        } catch (error) {
            console.error('Failed to initialize persistence:', error);
            // Fall back to localStorage only
        }
    }

    /**
     * Initialize IndexedDB
     */
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB not available, using localStorage only');
                resolve();
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                    sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
                    sessionStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('snapshots')) {
                    const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
                    snapshotStore.createIndex('sessionId', 'sessionId', { unique: false });
                    snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('IndexedDB schema created');
            };
        });
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        // Save on canvas changes
        if (this.canvas.svg) {
            const observer = new MutationObserver(() => {
                this.markDirty();
            });

            observer.observe(this.canvas.svg, {
                childList: true,
                subtree: true,
                attributes: true
            });
        }

        // Periodic auto-save
        this.autoSaveInterval = setInterval(() => {
            if (this.isDirty) {
                this.autoSave();
            }
        }, this.autoSaveDelay);

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveSessionState();
        });

        // Save on visibility change (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isDirty) {
                this.saveSessionState();
            }
        });
    }

    /**
     * Mark session as dirty (needs saving)
     */
    markDirty() {
        this.isDirty = true;
    }

    /**
     * Auto-save current session
     */
    async autoSave() {
        try {
            await this.saveSessionState();
            this.isDirty = false;
            this.lastSaveTime = Date.now();
            console.log('Auto-saved at', new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    /**
     * Save current session state
     */
    async saveSessionState() {
        try {
            const state = this.captureSessionState();

            // Save to localStorage for quick recovery
            this.saveToLocalStorage(this.keys.sessionState, state);

            // Save to IndexedDB for persistence
            if (this.db) {
                await this.saveToIndexedDB('sessions', {
                    id: 'current',
                    ...state,
                    savedAt: new Date().toISOString()
                });
            }

            return state;
        } catch (error) {
            console.error('Failed to save session state:', error);
            throw error;
        }
    }

    /**
     * Capture current session state
     */
    captureSessionState() {
        const state = {
            canvasState: {
                zoom: this.canvas.zoom || 1,
                panX: this.canvas.panX || 0,
                panY: this.canvas.panY || 0
            },
            flowData: {
                nodes: this.canvas.nodes || [],
                edges: this.canvas.edges || []
            },
            timestamp: new Date().toISOString()
        };

        return state;
    }

    /**
     * Load session state
     */
    async loadSessionState() {
        try {
            // Try IndexedDB first
            if (this.db) {
                const state = await this.loadFromIndexedDB('sessions', 'current');
                if (state) {
                    this.restoreSessionState(state);
                    return state;
                }
            }

            // Fall back to localStorage
            const state = this.loadFromLocalStorage(this.keys.sessionState);
            if (state) {
                this.restoreSessionState(state);
                return state;
            }

            console.log('No previous session found');
            return null;
        } catch (error) {
            console.error('Failed to load session state:', error);
            return null;
        }
    }

    /**
     * Restore session state to canvas
     */
    restoreSessionState(state) {
        try {
            // Restore canvas state
            if (state.canvasState) {
                if (state.canvasState.zoom !== undefined) {
                    this.canvas.zoom = state.canvasState.zoom;
                }
                if (state.canvasState.panX !== undefined) {
                    this.canvas.panX = state.canvasState.panX;
                }
                if (state.canvasState.panY !== undefined) {
                    this.canvas.panY = state.canvasState.panY;
                }
                if (this.canvas.updateTransform) {
                    this.canvas.updateTransform();
                }
            }

            // Restore flow data
            if (state.flowData) {
                if (state.flowData.nodes) {
                    this.canvas.nodes = state.flowData.nodes;
                }
                if (state.flowData.edges) {
                    this.canvas.edges = state.flowData.edges;
                }
                if (this.canvas.render) {
                    this.canvas.render();
                }
            }

            console.log('Session state restored');
        } catch (error) {
            console.error('Failed to restore session state:', error);
        }
    }

    /**
     * Save preferences
     */
    savePreferences(preferences) {
        try {
            this.saveToLocalStorage(this.keys.preferences, preferences);
            return true;
        } catch (error) {
            console.error('Failed to save preferences:', error);
            return false;
        }
    }

    /**
     * Load preferences
     */
    loadPreferences() {
        try {
            return this.loadFromLocalStorage(this.keys.preferences) || {};
        } catch (error) {
            console.error('Failed to load preferences:', error);
            return {};
        }
    }

    /**
     * Save to localStorage
     */
    saveToLocalStorage(key, data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('localStorage save failed:', error);
            return false;
        }
    }

    /**
     * Load from localStorage
     */
    loadFromLocalStorage(key) {
        try {
            const serialized = localStorage.getItem(key);
            return serialized ? JSON.parse(serialized) : null;
        } catch (error) {
            console.error('localStorage load failed:', error);
            return null;
        }
    }

    /**
     * Save to IndexedDB
     */
    saveToIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not available'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load from IndexedDB
     */
    loadFromIndexedDB(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not available'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete from IndexedDB
     */
    deleteFromIndexedDB(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not available'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all from IndexedDB store
     */
    getAllFromIndexedDB(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not available'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all session data
     */
    async clearAllData() {
        try {
            // Clear localStorage
            Object.values(this.keys).forEach(key => {
                localStorage.removeItem(key);
            });

            // Clear IndexedDB
            if (this.db) {
                await this.deleteFromIndexedDB('sessions', 'current');
            }

            console.log('All session data cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Create snapshot for undo/redo
     */
    async createSnapshot(description = '') {
        try {
            const snapshot = {
                id: Date.now().toString(),
                sessionId: 'current',
                description,
                state: this.captureSessionState(),
                timestamp: new Date().toISOString()
            };

            if (this.db) {
                await this.saveToIndexedDB('snapshots', snapshot);
            }

            return snapshot;
        } catch (error) {
            console.error('Failed to create snapshot:', error);
            throw error;
        }
    }

    /**
     * Get storage usage info
     */
    async getStorageInfo() {
        const info = {
            localStorage: {
                used: 0,
                limit: 5 * 1024 * 1024 // Approximate 5MB limit
            },
            indexedDB: {
                available: !!this.db
            }
        };

        // Calculate localStorage usage
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        info.localStorage.used = totalSize * 2; // UTF-16 encoding

        // Get IndexedDB usage if available
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            info.indexedDB.quota = estimate.quota;
            info.indexedDB.usage = estimate.usage;
        }

        return info;
    }

    /**
     * Cleanup method
     */
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.db) {
            this.db.close();
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.PersistenceEngine = PersistenceEngine;
}
