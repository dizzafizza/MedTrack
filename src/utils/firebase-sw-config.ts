/**
 * Firebase Service Worker Configuration Utility
 * Replaces placeholders in firebase-messaging-sw.js with actual environment variables
 */

export function getFirebaseServiceWorkerConfig() {
  // Use process.env in Node.js (build time), import.meta.env in browser (runtime)
  const env = typeof process !== 'undefined' && process.env ? process.env : import.meta.env;
  
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || ''
  };
}

export function generateFirebaseServiceWorkerContent() {
  const config = getFirebaseServiceWorkerConfig();
  
  // Check if we have valid Firebase configuration
  const hasValidConfig = config.apiKey && config.projectId && config.messagingSenderId;
  
  return `/**
 * Firebase Cloud Messaging Service Worker for MedTrack
 * Handles FCM push notifications when app is closed or in background
 * Generated automatically during build process
 */

${hasValidConfig ? `
// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "${config.apiKey}",
  authDomain: "${config.authDomain}",
  projectId: "${config.projectId}",
  storageBucket: "${config.storageBucket}",
  messagingSenderId: "${config.messagingSenderId}",
  appId: "${config.appId}"
};` : `
// Firebase configuration not available - FCM disabled in development
console.warn('🚧 Firebase configuration not available - FCM disabled');
const firebaseConfig = null;`}

// Initialize Firebase in service worker
let messaging = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
    // Only initialize Firebase if we have valid configuration
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    
    console.log('🔥 Firebase messaging initialized in service worker');

    // Handle background push messages
    messaging.onBackgroundMessage((payload) => {
      console.log('📱 FCM background message received:', payload);
      
      try {
        // Extract notification data
        const notificationTitle = payload.notification?.title || 'MedTrack Reminder';
        const notificationOptions = {
          body: payload.notification?.body || 'Time for your medication',
          icon: payload.notification?.icon || '/pill-icon.svg',
          badge: '/pill-icon.svg',
          data: {
            ...payload.data,
            fcm: true,
            timestamp: Date.now()
          },
          tag: payload.data?.medicationId ? \`medication_\${payload.data.medicationId}\` : 'medtrack-fcm',
          requireInteraction: true,
          actions: [
            { action: 'take', title: '✅ Taken', icon: '/pill-icon.svg' },
            { action: 'snooze', title: '⏰ Snooze 15min', icon: '/pill-icon.svg' },
            { action: 'skip', title: '⏸️ Skip', icon: '/pill-icon.svg' }
          ],
          vibrate: [200, 100, 200],
          silent: false,
          renotify: true
        };

        // Show the notification
        return self.registration.showNotification(notificationTitle, notificationOptions);
        
      } catch (error) {
        console.error('Failed to show FCM background notification:', error);
        
        // Fallback notification
        return self.registration.showNotification('MedTrack Reminder', {
          body: 'Time for your medication',
          icon: '/pill-icon.svg',
          badge: '/pill-icon.svg',
          requireInteraction: true
        });
      }
    });

    console.log('✅ Firebase messaging service worker ready');
  } else {
    console.warn('⚠️ Firebase configuration incomplete - FCM disabled in development');
  }

} catch (error) {
  console.error('❌ Failed to initialize Firebase in service worker:', error);
}

// Always create a fallback messaging object to prevent errors
if (!messaging) {
  messaging = {
    onBackgroundMessage: () => {
      console.warn('Firebase messaging not available - background push notifications disabled');
    }
  };
}

// Export messaging for potential use by main service worker
self.firebaseMessaging = messaging;`;
}
