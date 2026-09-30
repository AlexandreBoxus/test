/*
 * Configuration Firebase (base de données partagée).
 *
 * Laisser `null` : le site fonctionne en mode démonstration (données dans le navigateur).
 * Pour passer en mode réel, remplacez `null` par l'objet « firebaseConfig » affiché dans
 * la console Firebase (Paramètres du projet → Vos applications → Application Web), par ex. :
 *
 * WA.FIREBASE_CONFIG = {
 *   apiKey: 'AIza…',
 *   authDomain: 'reseau-associatif-walhain.firebaseapp.com',
 *   projectId: 'reseau-associatif-walhain',
 *   storageBucket: 'reseau-associatif-walhain.appspot.com',
 *   messagingSenderId: '123456789',
 *   appId: '1:123456789:web:abc123',
 * };
 *
 * Ces valeurs ne sont pas secrètes : la sécurité est assurée par les règles Firestore
 * (fichier firestore.rules) et par Firebase Authentication.
 */
window.WA = window.WA || {};
WA.FIREBASE_CONFIG = null;

// Développement uniquement : utiliser les émulateurs Firebase locaux (firebase emulators:start).
WA.FIREBASE_EMULATOR = false;
