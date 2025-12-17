import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAiLtwLXqewgfygF8_A3thHtf-2Gnjheqo",
  authDomain: "dungeon-mayhem-game.firebaseapp.com",
  projectId: "dungeon-mayhem-game",
  storageBucket: "dungeon-mayhem-game.firebasestorage.app",
  messagingSenderId: "214040216436",
  appId: "1:214040216436:web:b443139e82410750efe221",
  measurementId: "G-YWCKPNKL3P"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, collection, addDoc, getDocs, onSnapshot };