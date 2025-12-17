// ==== KHÔNG SỬA ====
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from "./firebase.js";

// ==== SỬA PHẦN NÀY ====

// Element
const authContainer = document.getElementById("auth-container");
const gameContainer = document.getElementById("game-container");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const registerBtn = document.getElementById("register-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

// Theo dõi trạng thái user
auth.onAuthStateChanged((user) => {
  if (user) {
    authContainer.style.display = "none";
    gameContainer.style.display = "flex";
    logoutBtn.style.display = "block";
    loadLobby();
  } else {
    authContainer.style.display = "block";
    gameContainer.style.display = "none";
  }
});

// Đăng ký
registerBtn.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Đăng ký thành công!");
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
});

// Đăng nhập
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Đăng nhập thành công!");
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
});

// Đăng xuất
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  alert("Đã đăng xuất!");
});

// Sidebar navigation
document.querySelectorAll(".sidebar li").forEach((li) => {
  li.addEventListener("click", () => {
    document.querySelectorAll(".sidebar li").forEach((x) => x.classList.remove("active"));
    li.classList.add("active");
    document.querySelectorAll(".section").forEach((sec) => sec.classList.remove("active"));
    document.getElementById(li.dataset.section).classList.add("active");
  });
});

// ==== Lobby ====
function loadLobby() {
  const roomList = document.getElementById("room-list");
  const createRoomBtn = document.getElementById("create-room");
  const quickJoinBtn = document.getElementById("quick-join");

  // realtime room list
  onSnapshot(collection(db, "rooms"), (snapshot) => {
    roomList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const room = docSnap.data();
      const li = document.createElement("li");
      li.textContent = `${room.name} (Người chơi: ${room.players?.length || 0}/4)`;
      li.addEventListener("click", () => joinRoom(docSnap.id));
      roomList.appendChild(li);
    });
  });

  // Tạo phòng
  createRoomBtn.addEventListener("click", async () => {
    const roomName = prompt("Nhập tên phòng:");
    if (!roomName) return;
    await addDoc(collection(db, "rooms"), {
      name: roomName,
      players: [auth.currentUser.uid],
      status: "waiting"
    });
  });

  // Vào nhanh
  quickJoinBtn.addEventListener("click", async () => {
    const querySnapshot = await getDocs(collection(db, "rooms"));
    let joined = false;
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      if (data.status === "waiting" && (data.players?.length || 0) < 4) {
        await joinRoom(docSnap.id);
        joined = true;
        break;
      }
    }
    if (!joined) alert("Không có phòng chờ!");
  });
}

// ==== Join phòng ====
async function joinRoom(roomId) {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return alert("Phòng không tồn tại!");

  const data = roomSnap.data();
  const players = data.players || [];

  if (players.includes(auth.currentUser.uid)) return alert("Bạn đã trong phòng này!");
  if (players.length >= 4) return alert("Phòng đã đầy!");

  await updateDoc(roomRef, {
    players: arrayUnion(auth.currentUser.uid)
  });
  alert("Đã vào phòng!");
}
