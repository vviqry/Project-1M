/**
 * Project 1M Quest Tracker - Firebase Synchronization Service
 * Manages Firebase Realtime Database connection, state streaming, and cloud persistence.
 */

(function () {
  // User's Firebase Project Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDENWy6strsUZa2JjKcX05t7hzMYXyRz2g",
    authDomain: "project-1m-tracker.firebaseapp.com",
    databaseURL: "https://project-1m-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "project-1m-tracker",
    storageBucket: "project-1m-tracker.firebasestorage.app",
    messagingSenderId: "145942115313",
    appId: "1:145942115313:web:1c37273b15b0fffd3c4a50"
  };

  class FirebaseSyncService {
    constructor() {
      this.db = null;
      this.dataRef = null;
      this.status = 'initializing'; // 'initializing' | 'synced' | 'syncing' | 'offline' | 'error'
      this.isInitialLoadDone = false;
      this.debounceTimer = null;
      this.lastSyncedTimestamp = null;

      this.init();
    }

    init() {
      if (typeof window.firebase === 'undefined') {
        console.warn('[FirebaseSync] Firebase SDK compat script not loaded yet.');
        this.updateStatus('offline', 'SDK Offline');
        return;
      }

      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.database();
        this.dataRef = this.db.ref('tracker_data');

        // Monitor Firebase internal connection status
        const connectedRef = this.db.ref('.info/connected');
        connectedRef.on('value', (snap) => {
          if (snap.val() === true) {
            console.log('[FirebaseSync] Terhubung ke Firebase Cloud.');
            if (this.isInitialLoadDone) {
              this.updateStatus('synced', 'Tersinkron Cloud');
            }
          } else {
            console.warn('[FirebaseSync] Koneksi internet/cloud terputus.');
            this.updateStatus('offline', 'Mode Offline');
          }
        });

        console.log('[FirebaseSync] Berhasil diinisialisasi untuk project: project-1m-tracker');
      } catch (err) {
        console.error('[FirebaseSync] Gagal inisialisasi:', err);
        this.updateStatus('error', 'Gagal Koneksi');
      }
    }

    updateStatus(status, label = '') {
      this.status = status;
      window.dispatchEvent(
        new CustomEvent('p1m-cloud-status', {
          detail: {
            status,
            label,
            timestamp: this.lastSyncedTimestamp
          }
        })
      );
    }

    /**
     * Start real-time listener for database updates.
     * @param {Function} onCloudDataCallback Callback receiving the remote payload
     */
    listenToCloud(onCloudDataCallback) {
      if (!this.dataRef) return;

      this.dataRef.on('value', (snapshot) => {
        const cloudData = snapshot.val();
        this.isInitialLoadDone = true;
        this.lastSyncedTimestamp = Date.now();
        this.updateStatus('synced', 'Tersinkron Cloud');

        if (typeof onCloudDataCallback === 'function') {
          onCloudDataCallback(cloudData);
        }
      }, (error) => {
        console.error('[FirebaseSync] Gagal membaca data cloud:', error);
        this.updateStatus('error', 'Gagal Membaca Cloud');
      });
    }

    /**
     * Save data to Firebase with debouncing to prevent excessive writes.
     * @param {Object} data Entire store payload to persist
     * @param {Boolean} immediate If true, skips debounce
     */
    saveToCloud(data, immediate = false) {
      if (!this.dataRef) return;

      this.updateStatus('syncing', 'Menyimpan ke Cloud...');

      if (immediate) {
        this.performSave(data);
        return;
      }

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.performSave(data);
      }, 300);
    }

    performSave(data) {
      if (!this.dataRef) return;

      const payload = {
        ...data,
        updatedAt: Date.now()
      };

      this.dataRef.set(payload)
        .then(() => {
          this.lastSyncedTimestamp = Date.now();
          this.updateStatus('synced', 'Tersinkron Cloud');
          console.log('[FirebaseSync] Data berhasil disimpan ke Firebase Cloud.');
        })
        .catch((err) => {
          console.error('[FirebaseSync] Gagal menyimpan ke cloud:', err);
          this.updateStatus('error', 'Gagal Sinkronisasi');
        });
    }
  }

  // Expose globally
  window.FirebaseSync = new FirebaseSyncService();
})();
