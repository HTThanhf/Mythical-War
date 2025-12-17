// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// === DÁN CONFIG CỦA M Ở ĐÂY ===
const firebaseConfig = {
  apiKey: "AIzaSyAiLtwLXqewgfygF8_A3thHtf-2Gnjheqo",
  authDomain: "dungeon-mayhem-game.firebaseapp.com",
  projectId: "dungeon-mayhem-game",
  storageBucket: "dungeon-mayhem-game.firebasestorage.app",
  messagingSenderId: "214040216436",
  appId: "1:214040216436:web:b443139e82410750efe221",
  measurementId: "G-YWCKPNKL3P"
};

// Khởi tạo
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
};
