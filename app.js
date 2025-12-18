// ==== app.js ====
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
import { openDeckSelect } from "./gameplay.js";
import { initBattle } from "./battle/index.js";

// ==== THÊM HÀM initUI ====
function initUI() {
  loadLobby();
  initSidebarNavigation();
  initDeleteAccountButton();
  initExitButtons();
}

function initExitButtons() {
  // Thêm nút Thoát phòng vào lobby UI
  const lobbySection = document.getElementById("lobby");
  if (lobbySection && !document.getElementById("exit-room-btn")) {
    const exitBtn = document.createElement("button");
    exitBtn.id = "exit-room-btn";
    exitBtn.textContent = "Thoát Phòng Hiện Tại";
    exitBtn.style.marginTop = "10px";
    exitBtn.style.background = "#e63946";
    exitBtn.style.color = "white";
    exitBtn.style.border = "none";
    exitBtn.style.padding = "8px 15px";
    exitBtn.style.borderRadius = "6px";
    exitBtn.style.cursor = "pointer";
    
    exitBtn.addEventListener("click", async () => {
      await removePlayerFromRooms();
      alert("Đã thoát khỏi phòng!");
      location.reload();
    });
    
    lobbySection.querySelector(".lobby-actions").appendChild(exitBtn);
  }
}

function initSidebarNavigation() {
  document.querySelectorAll(".sidebar li").forEach((li) => {
    li.addEventListener("click", () => {
      document.querySelectorAll(".sidebar li").forEach((x) => x.classList.remove("active"));
      li.classList.add("active");
      document.querySelectorAll(".section").forEach((sec) => sec.classList.remove("active"));
      document.getElementById(li.dataset.section).classList.add("active");
    });
  });
}

function initDeleteAccountButton() {
  const deleteAccBtn = document.getElementById("delete-account-btn");
  if (deleteAccBtn) {
    deleteAccBtn.addEventListener("click", async () => {
      if (!confirm("Bạn chắc chắn muốn xóa tài khoản?")) return;

      await removePlayerFromRooms(); // Rời tất cả phòng
      try {
        await auth.currentUser.delete();
        alert("Tài khoản đã được xóa!");
        location.reload();
      } catch (err) {
        alert("Lỗi khi xóa tài khoản: " + err.message);
      }
    });
  }
}

// ==== KHÔNG SỬA PHẦN DƯỚI ĐÂY ====

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
    
    if (logoutBtn) logoutBtn.style.display = "block";
    
    // ĐỢI DOM sẵn sàng rồi mới khởi tạo UI
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initUI);
    } else {
      initUI(); // DOM đã sẵn sàng
    }
    
  } else {
    authContainer.style.display = "block";
    gameContainer.style.display = "none";
  }
});

// Đăng ký
registerBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Vui lòng nhập email và mật khẩu");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Đăng ký thành công:", userCredential.user);
    alert("Đăng ký thành công!");
  } catch (err) {
    console.error("Lỗi đăng ký chi tiết:", err.code, err.message);
    
    // Hiển thị thông báo thân thiện dựa trên mã lỗi
    switch (err.code) {
      case 'auth/email-already-in-use':
        alert("Email này đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.");
        break;
      case 'auth/invalid-email':
        alert("Địa chỉ email không hợp lệ.");
        break;
      case 'auth/operation-not-allowed':
        alert("Phương thức đăng nhập bằng email/mật khẩu chưa được bật. Vui lòng kiểm tra Firebase Console.");
        break;
      case 'auth/weak-password':
        alert("Mật khẩu quá yếu. Vui lòng đặt mật khẩu có ít nhất 6 ký tự.");
        break;
      default:
        alert("Đăng ký thất bại: " + err.message);
    }
  }
});

// Đăng nhập
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Vui lòng nhập email và mật khẩu");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Đăng nhập thành công!");
  } catch (err) {
    console.error("Lỗi đăng nhập:", err.code, err.message);
    
    // Hiển thị thông báo thân thiện
    if (err.code === 'auth/invalid-credential') {
      alert("Email hoặc mật khẩu không đúng.");
    } else if (err.code === 'auth/user-not-found') {
      alert("Tài khoản không tồn tại. Vui lòng đăng ký!");
    } else if (err.code === 'auth/wrong-password') {
      alert("Mật khẩu không đúng!");
    } else if (err.code === 'auth/user-disabled') {
      alert("Tài khoản này đã bị vô hiệu hóa.");
    } else {
      alert("Lỗi đăng nhập: " + err.message);
    }
  }
});

// Reset password
const resetBtn = document.createElement("button");
resetBtn.textContent = "Quên mật khẩu?";
resetBtn.style.margin = "5px";
resetBtn.style.background = "transparent";
resetBtn.style.color = "#007bff";
resetBtn.style.border = "none";
resetBtn.style.cursor = "pointer";

resetBtn.addEventListener("click", async () => {
  const email = prompt("Nhập email để reset mật khẩu:");
  if (email) {
    try {
      // Cần import sendPasswordResetEmail từ firebase.js
      const { sendPasswordResetEmail } = await import("./firebase.js");
      await sendPasswordResetEmail(auth, email);
      alert("Email reset mật khẩu đã được gửi!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }
});

// Thêm nút reset vào auth container
document.querySelector(".auth-buttons").appendChild(resetBtn); // Sửa từ resitBtn thành resetBtn

// Đăng xuất
logoutBtn.addEventListener("click", async () => {
  await removePlayerFromRooms(); // Xóa khỏi phòng trước khi out
  await signOut(auth);
  alert("Đã đăng xuất!");
});

// Xóa player khỏi mọi phòng hiện tại
async function removePlayerFromRooms() {
  if (!auth.currentUser) return;
  const roomsSnap = await getDocs(collection(db, "rooms"));
  for (const docSnap of roomsSnap.docs) {
    const data = docSnap.data();
    if (data.players?.some(p => p.uid === auth.currentUser.uid || p === auth.currentUser.uid)) {
      const newPlayers = data.players.filter(p => (p.uid || p) !== auth.currentUser.uid);

      if (newPlayers.length === 0) {
        await updateDoc(doc(db, "rooms", docSnap.id), { players: [], status: "closed" });
      } else {
        await updateDoc(doc(db, "rooms", docSnap.id), { players: newPlayers });
      }
    }
  }
}

// ==== Lobby ====
// Cập nhật hàm loadLobby
function loadLobby() {
  const roomList = document.getElementById("room-list");
  const createRoomBtn = document.getElementById("create-room");
  const quickJoinBtn = document.getElementById("quick-join");

  // realtime room list với fix player count
  onSnapshot(collection(db, "rooms"), (snapshot) => {
    roomList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const room = docSnap.data();
      
      // FIX: Chỉ tính những player có uid (loại bỏ player đã thoát nhưng chưa được xóa đúng)
      const validPlayers = room.players?.filter(p => p && p.uid) || [];
      
      // Không hiển thị phòng đã closed
      if (room.status === "closed") return;
      
      const li = document.createElement("li");
      li.textContent = `${room.name} (Người chơi: ${validPlayers.length}/4)`;
      
      // Thêm indicator nếu đang trong phòng này
      const isInRoom = validPlayers.some(p => p.uid === auth.currentUser?.uid);
      if (isInRoom) {
        li.innerHTML += " <span style='color:#00ff00;font-size:12px;'>(Bạn đang ở đây)</span>";
      }
      
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
      players: [{
        uid: auth.currentUser.uid,
        name: auth.currentUser.email.split("@")[0]
      }],
      status: "waiting"
    });
  });

  // Vào nhanh
  quickJoinBtn.addEventListener("click", async () => {
    const querySnapshot = await getDocs(collection(db, "rooms"));
    let joined = false;
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      // FIX: Lọc valid players để kiểm tra số lượng
      const validPlayers = data.players?.filter(p => p && p.uid) || [];
      if (data.status === "waiting" && validPlayers.length < 4) {
        await joinRoom(docSnap.id);
        joined = true;
        break;
      }
    }
    if (!joined) alert("Không có phòng chờ!");
  });
}

// ==== Join phòng ====
// Cập nhật hàm joinRoom để fix vấn đề "Bạn đã trong phòng này"
async function joinRoom(roomId) {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return alert("Phòng không tồn tại!");

  const data = roomSnap.data();
  
  // FIX: Lọc players hợp lệ
  const players = (data.players || []).filter(p => p && p.uid);
  
  // Kiểm tra nếu đã tham gia
  if (players.some(p => p.uid === auth.currentUser.uid)) {
    // Nếu đã trong phòng, chuyển thẳng vào deck select hoặc battle
    if (data.status === "waiting") {
      alert("Bạn đã trong phòng này! Chuyển đến chọn deck...");
      openDeckSelect(roomId);
    } else if (data.status === "playing") {
      alert("Trận đấu đã bắt đầu! Vào game...");
      initBattle(roomId);
    } else {
      alert("Bạn đã trong phòng này với trạng thái: " + data.status);
    }
    return;
  }
  
  if (players.length >= 4) return alert("Phòng đã đầy!");
  
  if (data.status !== "waiting") {
    return alert("Phòng này đã bắt đầu trận đấu!");
  }

  // THÊM thông tin player với name
  await updateDoc(roomRef, {
    players: arrayUnion({ 
      uid: auth.currentUser.uid,
      name: auth.currentUser.email.split("@")[0]
    })
  });

  alert("Đã vào phòng!");
  openDeckSelect(roomId);
}

// Khi đóng tab hoặc reload => auto out phòng
window.addEventListener("beforeunload", async () => {
  await removePlayerFromRooms();
});