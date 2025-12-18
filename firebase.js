// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
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
  sendPasswordResetEmail,  // Thêm dòng này
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
};

// Thêm hàm này vào cuối firebase.js
export async function cleanupEmptyRooms() {
  const roomsSnap = await getDocs(collection(db, "rooms"));
  
  for (const docSnap of roomsSnap.docs) {
    const data = docSnap.data();
    const validPlayers = data.players?.filter(p => p && p.uid) || [];
    
    // Xóa phòng không có player hoặc status = closed
    if (validPlayers.length === 0 || data.status === "closed") {
      const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      await deleteDoc(doc(db, "rooms", docSnap.id));
      console.log("Đã xóa phòng trống:", docSnap.id);
    }
  }
}

// Gọi hàm dọn dẹp khi khởi động (tùy chọn)
// cleanupEmptyRooms();