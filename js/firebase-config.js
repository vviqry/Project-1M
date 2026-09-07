/**
 * Project 1M Quest Tracker - Firebase Synchronization & Authentication Service
 * Manages Firebase Realtime Database connection with Google Sign-In Authentication,
 * user-scoped data paths (users/{uid}/tracker_data), and profile metadata.
 *
 * SECURITY: Each user gets their own UID-scoped data path so that no user
 * can read or write another user's data.
 */

(function () {
  'use strict';

  // ============================================================
  // Cloud sync enabled with Firebase Google Authentication
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
      this.connectedRef = null;
      this.auth = null;
      this.googleProvider = null;
      this.userId = null;
      this.currentUser = null;
      this.isAuthReady = false;
      this.authReadyCallbacks = [];
      this.pendingSaveData = null;
      this.pendingListenerCallback = null;
      this.activeDataListener = null;
      this.status = 'initializing'; // 'initializing' | 'synced' | 'syncing' | 'offline' | 'error' | 'unauthenticated'
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

        // Setup Google Auth Provider
        this.googleProvider = new firebase.auth.GoogleAuthProvider();
        this.googleProvider.setCustomParameters({ prompt: 'select_account' });

        this.updateStatus('initializing', 'Memeriksa sesi login...');

        // Check for redirect result in case signInWithRedirect was used
        if (this.auth.getRedirectResult) {
          this.auth.getRedirectResult()
            .then((result) => {
              if (result && result.user) {
                console.log('[FirebaseSync] Redirect login sukses untuk:', result.user.email);
              }
            })
            .catch((err) => {
              console.warn('[FirebaseSync] Redirect result notice:', err.message);
            });
        }

        // Listen for Auth state changes
        this.auth.onAuthStateChanged((user) => {
          this.isAuthReady = true;

          // If user is anonymous from previous app version, sign out so they can sign in with Google
          if (user && user.isAnonymous) {
            console.log('[FirebaseSync] Sesi anonymous lama terdeteksi. Melakukan sign out otomatis untuk Google Sign-In...');
            this.auth.signOut().then(() => {
              this.handleUnauthenticatedUser();
            });
            return;
          }

          if (user) {
            console.log('[FirebaseSync] Google User login aktif:', user.email, 'UID:', user.uid);
            this.handleAuthenticatedUser(user);
          } else {
            console.log('[FirebaseSync] Tidak ada sesi login aktif.');
            this.handleUnauthenticatedUser();
          }
        });

        console.log('[FirebaseSync] Inisialisasi service untuk project: ' + firebaseConfig.projectId);
      } catch (err) {
        console.error('[FirebaseSync] Gagal inisialisasi Firebase:', err);
        this.updateStatus('error', 'Gagal Inisialisasi Firebase');
      }
    }

    /**
     * Sign in with Google using Popup (primary method for PWA).
     * Fallback to Redirect if popup is strictly blocked.
     */
    async signInWithGoogle() {
      if (!this.auth || !this.googleProvider) {
        throw new Error('Firebase Auth belum siap.');
      }

      this.updateStatus('syncing', 'Membuka Google Login...');

      try {
        const result = await this.auth.signInWithPopup(this.googleProvider);
        console.log('[FirebaseSync] Google Sign-In popup berhasil:', result.user.email);
        return { success: true, user: result.user };
      } catch (error) {
        console.error('[FirebaseSync] Error saat Google Sign-In:', error);

        // If popup was blocked by browser, offer redirect fallback
        if (error.code === 'auth/popup-blocked') {
          console.warn('[FirebaseSync] Popup diblokir. Mencoba fallback ke signInWithRedirect...');
          try {
            await this.auth.signInWithRedirect(this.googleProvider);
            return { redirecting: true };
          } catch (redirectErr) {
            console.error('[FirebaseSync] Gagal redirect login:', redirectErr);
            throw redirectErr;
          }
        }

        let userFriendlyMsg = 'Gagal login dengan Google.';
        if (error.code === 'auth/popup-closed-by-user') {
          userFriendlyMsg = 'Jendela login Google ditutup sebelum selesai.';
        } else if (error.code === 'auth/cancelled-popup-request') {
          userFriendlyMsg = 'Permintaan login dibatalkan.';
        } else if (error.code === 'auth/network-request-failed') {
          userFriendlyMsg = 'Gagal terhubung ke server Google. Periksa koneksi internet Anda.';
        } else if (error.code === 'auth/unauthorized-domain') {
          userFriendlyMsg = 'Domain ini belum diotorisasi di Firebase Console (Authentication > Settings > Authorized Domains).';
        }

        this.updateStatus('unauthenticated', 'Belum Login');
        const err = new Error(userFriendlyMsg);
        err.originalCode = error.code;
        throw err;
      }
    }

    /**
     * Sign out current user and clear cloud sync listeners.
     */
    async signOut() {
      if (!this.auth) return;

      try {
        await this.auth.signOut();
        console.log('[FirebaseSync] User berhasil logout.');
        this.handleUnauthenticatedUser();
        return { success: true };
      } catch (err) {
        console.error('[FirebaseSync] Gagal logout:', err);
        throw err;
      }
    }

    handleAuthenticatedUser(user) {
      this.userId = user.uid;
      this.currentUser = {
        uid: user.uid,
        displayName: user.displayName || 'Penjelajah 1M',
        email: user.email || '',
        photoURL: user.photoURL || ''
      };

      // Path data terisolasi per-user -> users/{uid}/tracker_data
      const userPath = 'users/' + this.userId + '/tracker_data';
      this.dataRef = this.db.ref(userPath);
      console.log('[FirebaseSync] Database path user aktif:', userPath);

      // Simpan/perbarui metadata profil user di cloud
      try {
        this.db.ref('users/' + this.userId + '/profile').update({
          displayName: this.currentUser.displayName,
          email: this.currentUser.email,
          photoURL: this.currentUser.photoURL,
          lastLogin: Date.now()
        }).catch((e) => console.warn('[FirebaseSync] Notice update profile:', e.message));
      } catch (e) {}

      // Monitor connection status
      if (this.connectedRef) {
        this.connectedRef.off();
      }
      this.connectedRef = this.db.ref('.info/connected');
      this.connectedRef.on('value', (snap) => {
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
          cb(this.userId, this.currentUser);
        } catch (e) {
          console.error('[FirebaseSync] Error in auth callback:', e);
        }
      });

      // Dispatch global events for UI & Store
      window.dispatchEvent(new CustomEvent('p1m-auth-state-changed', {
        detail: { isAuthenticated: true, user: this.currentUser, path: userPath }
      }));
      window.dispatchEvent(new CustomEvent('p1m-firebase-auth-ready', {
        detail: { uid: this.userId, user: this.currentUser, path: userPath }
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

    handleUnauthenticatedUser() {
      // Detach active database listeners
      if (this.dataRef) {
        this.dataRef.off();
        this.dataRef = null;
      }
      if (this.connectedRef) {
        this.connectedRef.off();
        this.connectedRef = null;
      }

      this.userId = null;
      this.currentUser = null;
      this.isInitialLoadDone = false;
      this.pendingSaveData = null;
      this.pendingListenerCallback = null;

      this.updateStatus('unauthenticated', 'Belum Login');

      // Dispatch global auth change event
      window.dispatchEvent(new CustomEvent('p1m-auth-state-changed', {
        detail: { isAuthenticated: false, user: null }
      }));
    }

    onAuthReady(callback) {
      if (!this.enabled) return;
      if (this.isAuthReady && this.userId) {
        callback(this.userId, this.currentUser);
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
            userId: this.userId,
            user: this.currentUser
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
        console.log('[FirebaseSync] Menunggu auth Google sebelum membaca data cloud...');
        this.pendingListenerCallback = onCloudDataCallback;
        return;
      }

      // Detach previous listener if existing
      if (this.activeDataListener && this.dataRef) {
        this.dataRef.off('value', this.activeDataListener);
      }

      this.activeDataListener = (snapshot) => {
        const cloudData = snapshot.val();
        this.isInitialLoadDone = true;
        this.lastSyncedTimestamp = Date.now();
        this.updateStatus('synced', 'Tersinkron Cloud');

        if (typeof onCloudDataCallback === 'function') {
          onCloudDataCallback(cloudData);
        }
      };

      this.dataRef.on('value', this.activeDataListener, (error) => {
        console.error('[FirebaseSync] Gagal membaca data cloud:', error);
        this.updateStatus('error', 'Gagal Membaca Cloud: ' + (error.code || 'Permission Denied'));
      });
    }

    /**
     * Stop real-time listener.
     */
    stopListening() {
      if (this.dataRef && this.activeDataListener) {
        this.dataRef.off('value', this.activeDataListener);
        this.activeDataListener = null;
      }
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
        userId: this.userId,
        userEmail: this.currentUser ? this.currentUser.email : null,
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
