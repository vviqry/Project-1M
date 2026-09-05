/**
 * Project 1M Quest Tracker - Firebase Synchronization Service
 * Manages Firebase Realtime Database connection with Anonymous Authentication,
 * user-scoped data paths, and cloud persistence.
 *
 * SECURITY: Each user gets their own UID-scoped data path (users/{uid}/tracker_data)
 * so that no one can read or write another user's data.
 */

(function () {
  // ============================================================
  // Cloud sync enabled with Firebase Anonymous Authentication
  // and isolated user-scoped data paths: users/{uid}/tracker_data
  // ============================================================
  const CLOUD_SYNC_ENABLED = true;

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
      this.auth = null;
      this.userId = null;
      this.isAuthReady = false;
      this.authReadyCallbacks = [];
      this.pendingSaveData = null;
      this.pendingListenerCallback = null;
      this.status = 'initializing'; // 'initializing' | 'synced' | 'syncing' | 'offline' | 'error' | 'disabled'
      this.isInitialLoadDone = false;
      this.debounceTimer = null;
      this.lastSyncedTimestamp = null;
      this.enabled = CLOUD_SYNC_ENABLED;

      if (!this.enabled) {
        console.warn('[FirebaseSync] Cloud sync is DISABLED.');
        this.updateStatus('offline', 'Sync Dinonaktifkan');
        return;
      }

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
        this.auth = firebase.auth();

        this.updateStatus('syncing', 'Menghubungkan & Autentikasi...');

        // Listen for Auth state changes (Anonymous Auth)
        this.auth.onAuthStateChanged((user) => {
          if (user) {
            console.log('[FirebaseSync] User terautentikasi (UID):', user.uid);
            this.handleAuthenticatedUser(user.uid);
          } else {
            console.log('[FirebaseSync] Belum ada user aktif. Melakukan sign-in anonymous...');
            this.auth.signInAnonymously()
              .then((credential) => {
                console.log('[FirebaseSync] Anonymous sign-in sukses. UID:', credential.user.uid);
                this.handleAuthenticatedUser(credential.user.uid);
              })
              .catch((err) => {
                console.error('[FirebaseSync] Gagal Anonymous Sign-In:', err);
                this.updateStatus('error', 'Gagal Autentikasi');
              });
          }
        });

        console.log('[FirebaseSync] Inisialisasi service untuk project: ' + firebaseConfig.projectId);
      } catch (err) {
        console.error('[FirebaseSync] Gagal inisialisasi:', err);
        this.updateStatus('error', 'Gagal Koneksi');
      }
    }

    handleAuthenticatedUser(uid) {
      if (this.userId === uid && this.dataRef) {
        return;
      }

      this.userId = uid;
      this.isAuthReady = true;

      // SECURITY: Path data terisolasi per-user -> users/{uid}/tracker_data
      const userPath = 'users/' + this.userId + '/tracker_data';
      this.dataRef = this.db.ref(userPath);
      console.log('[FirebaseSync] Database path user aktif:', userPath);

      // Monitor connection status
      const connectedRef = this.db.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
          console.log('[FirebaseSync] Terhubung ke Firebase Cloud.');
          if (this.isInitialLoadDone) {
            this.updateStatus('synced', 'Tersinkron Cloud');
          }
        } else {
          console.warn('[FirebaseSync] Koneksi Firebase terputus/offline.');
          this.updateStatus('offline', 'Mode Offline');
        }
      });

      // Execute any callbacks waiting for auth
      const callbacks = [...this.authReadyCallbacks];
      this.authReadyCallbacks = [];
      callbacks.forEach((cb) => {
        try {
          cb(this.userId);
        } catch (e) {
          console.error('[FirebaseSync] Error in auth callback:', e);
        }
      });

      // Dispatch global event
      window.dispatchEvent(new CustomEvent('p1m-firebase-auth-ready', {
        detail: { uid: this.userId, path: userPath }
      }));

      // If a listener was waiting, attach it
      if (this.pendingListenerCallback) {
        const cb = this.pendingListenerCallback;
        this.pendingListenerCallback = null;
        this.listenToCloud(cb);
      }

      // If a save was pending before auth completed, write it now
      if (this.pendingSaveData) {
        const dataToSave = this.pendingSaveData;
        this.pendingSaveData = null;
        console.log('[FirebaseSync] Menyimpan data yang tertunda sebelum autentikasi...');
        this.saveToCloud(dataToSave, true);
      }
    }

    onAuthReady(callback) {
      if (!this.enabled) return;
      if (this.isAuthReady && this.userId) {
        callback(this.userId);
      } else {
        this.authReadyCallbacks.push(callback);
      }
    }

    updateStatus(status, label = '') {
      this.status = status;
      window.dispatchEvent(
        new CustomEvent('p1m-cloud-status', {
          detail: {
            status,
            label,
            timestamp: this.lastSyncedTimestamp,
            userId: this.userId
          }
        })
      );
    }

    /**
     * Start real-time listener for database updates.
     * @param {Function} onCloudDataCallback Callback receiving the remote payload
     */
    listenToCloud(onCloudDataCallback) {
      if (!this.enabled) return;

      if (!this.dataRef) {
        console.log('[FirebaseSync] Menunggu auth sebelum membaca data cloud...');
        this.pendingListenerCallback = onCloudDataCallback;
        return;
      }

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
        this.updateStatus('error', 'Gagal Membaca Cloud: ' + (error.code || 'Permission Denied'));
      });
    }

    /**
     * Save data to Firebase with debouncing to prevent excessive writes.
     * @param {Object} data Entire store payload to persist
     * @param {Boolean} immediate If true, skips debounce
     */
    saveToCloud(data, immediate = false) {
      if (!this.enabled) return;

      if (!this.dataRef) {
        console.log('[FirebaseSync] Menunda penyimpanan cloud sampai auth selesai...');
        this.pendingSaveData = data;
        return;
      }

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
      if (!this.enabled || !this.dataRef) return;

      const payload = {
        ...data,
        updatedAt: Date.now()
      };

      this.dataRef.set(payload)
        .then(() => {
          this.lastSyncedTimestamp = Date.now();
          this.updateStatus('synced', 'Tersinkron Cloud');
          console.log('[FirebaseSync] Data berhasil disimpan ke: users/' + this.userId + '/tracker_data');
        })
        .catch((err) => {
          console.error('[FirebaseSync] Gagal menyimpan ke cloud:', err);
          this.updateStatus('error', 'Gagal Sinkronisasi: ' + (err.code || 'Error'));
        });
    }
  }

  // Expose globally
  window.FirebaseSync = new FirebaseSyncService();
})();
