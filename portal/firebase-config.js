// Public Firebase web config. These values identify the project; they are
// not secrets. Access is controlled by Firestore rules and Auth.
const firebaseConfig = {
  apiKey: "AIzaSyAiACEdrFknfxa43WNubTV8A96YaNKgeyc",
  authDomain: "casorwebsite.firebaseapp.com",
  projectId: "casorwebsite",
  storageBucket: "casorwebsite.appspot.com",
  messagingSenderId: "408409784355",
  appId: "1:408409784355:web:9080641fc27a2e5ecc7196",
  measurementId: "G-Q0KLLN365P"
};

firebase.initializeApp(firebaseConfig);
// Auth is only loaded on portal pages. Public pages skip the auth SDK
// entirely (smaller download for visitors), so guard against it missing.
const auth = (typeof firebase.auth === 'function') ? firebase.auth() : null;
const db = firebase.firestore();
// Storage is not used anywhere (it needs the paid Blaze plan). Files,
// Library items and Site Images are Google Drive "Anyone with the link"
// URLs saved in Firestore.
