// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAiACEdrFknfxa43WNubTV8A96YaNKgeyc",
  authDomain: "casorwebsite.firebaseapp.com",
  projectId: "casorwebsite",
  storageBucket: "casorwebsite.firebasestorage.app",
  messagingSenderId: "408409784355",
  appId: "1:408409784355:web:9080641fc27a2e5ecc7196",
  measurementId: "G-Q0KLLN365P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
