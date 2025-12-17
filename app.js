import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, collection, addDoc, getDocs, onSnapshot, doc, getDoc, updateDoc, arrayUnion } from './firebase.js';

const authContainer = document.getElementById('auth-container');
const gameContainer = document.getElementById('game-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Kiểm tra auth state
auth.onAuthStateChanged(user => {
  if (user) {
    authContainer.style.display = 'none';
    gameContainer.style.display = 'flex';
    logoutBtn.style.display = 'block';  // Giờ sẽ show vì logout-btn đã move
    loadLobby(); // Load lobby sau login
  } else {
    authContainer.style.display = 'block';
    gameContainer.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
});

// Đăng ký
registerBtn.addEventListener('click', () => {
  createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(userCredential => alert('Đăng ký thành công!'))
    .catch(error => alert(error.message));
});

// Đăng nhập
loginBtn.addEventListener('click', () => {
  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(userCredential => alert('Đăng nhập thành công!'))
    .catch(error => alert(error.message));
});

// Đăng xuất
logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => alert('Đăng xuất thành công!'));
});

// Menu sidebar
document.querySelectorAll('.sidebar li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(li.dataset.section).classList.add('active');
  });
});

function loadLobby() {
  const roomList = document.getElementById('room-list');
  const createRoomBtn = document.getElementById('create-room');
  const quickJoinBtn = document.getElementById('quick-join');

  // Hiển thị list phòng realtime
  onSnapshot(collection(db, 'rooms'), snapshot => {
    roomList.innerHTML = '';
    snapshot.forEach(doc => {
      const room = doc.data();
      const li = document.createElement('li');
      li.textContent = `${room.name} (Người chơi: ${room.players.length}/4)`;
      li.addEventListener('click', () => joinRoom(doc.id));
      roomList.appendChild(li);
    });
  });

  // Tạo phòng
  createRoomBtn.addEventListener('click', async () => {
    const roomName = prompt('Tên phòng:');
    if (roomName) {
      await addDoc(collection(db, 'rooms'), {
        name: roomName,
        players: [auth.currentUser.uid],
        status: 'waiting' // Có thể thêm logic game sau
      });
    }
  });

  // Vào nhanh (tìm phòng waiting đầu tiên)
  quickJoinBtn.addEventListener('click', async () => {
    const querySnapshot = await getDocs(collection(db, 'rooms'));
    let joined = false;
    querySnapshot.forEach(doc => {
      if (!joined && doc.data().status === 'waiting' && doc.data().players.length < 4) {
        joinRoom(doc.id);
        joined = true;
      }
    });
    if (!joined) alert('Không có phòng chờ!');
  });
}

// Join phòng (cập nhật players)
async function joinRoom(roomId) {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (roomSnap.exists()) {
    const players = roomSnap.data().players;
    if (!players.includes(auth.currentUser.uid) && players.length < 4) {
      await updateDoc(roomRef, {
        players: arrayUnion(auth.currentUser.uid)
      });
      alert('Đã vào phòng!'); // Sau này redirect vào game room
    } else {
      alert('Phòng đầy hoặc bạn đã ở trong!');
    }
  }
}

function shuffleDeck(deck) {
  return deck.sort(() => Math.random() - 0.5);
}
// Deck mẫu: const deck = ['Attack', 'Shield', 'Draw', ...];