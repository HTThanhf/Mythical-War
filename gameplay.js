// ==== gameplay.js ====
import {
  auth,
  db,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "./firebase.js";
import { initBattle } from "./battle.js";

const DECKS = ["Jol", "Chung Ah", "Aramis", "Zupitere", "Mel", "Mano"];

// Mở giao diện chọn deck
export function openDeckSelect(roomId) {
  const main = document.querySelector(".main-content");
  main.innerHTML = `
    <div id="deck-select">
      <h2>Chọn Bộ Deck</h2>
      <button id="exit-deck-btn" class="exit-btn">← Thoát Phòng</button>
      <div id="deck-grid" class="deck-grid"></div>
      <p id="deck-hint">Chờ người chơi khác chọn deck...</p>
    </div>
  `;

  // Thêm sự kiện cho nút thoát
  document.getElementById("exit-deck-btn").addEventListener("click", async () => {
    await exitRoom(roomId);
  });

  const grid = document.getElementById("deck-grid");
  const roomRef = doc(db, "rooms", roomId);
  window.battleStarted = false;
  window.roomId = roomId;

  // Lắng nghe realtime phòng
  onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const players = data.players || [];
    const currentUserUid = auth.currentUser?.uid;

    // Tìm thông tin player hiện tại
    const currentPlayer = players.find(p => p.uid === currentUserUid);
    const hasChosenDeck = currentPlayer?.deck;

    grid.innerHTML = "";

    // Vẽ nút deck
    DECKS.forEach((deck) => {
      const takenByOthers = players.some((p) => p.uid !== currentUserUid && p.deck === deck);
      
      const btn = document.createElement("button");
      btn.textContent = deck;
      btn.className = "deck";
      
      if (takenByOthers) {
        btn.disabled = true;
        btn.className = "deck taken";
        const takenBy = players.find(p => p.deck === deck);
        btn.title = `Đã được ${takenBy?.name || "người khác"} chọn`;
      } else if (hasChosenDeck && currentPlayer.deck !== deck) {
        btn.disabled = true;
        btn.className = "deck taken";
        btn.title = "Bạn đã chọn deck khác";
      } else if (hasChosenDeck && currentPlayer.deck === deck) {
        btn.disabled = false;
        btn.className = "deck selected";
        btn.title = "Bạn đã chọn deck này";
      } else {
        btn.disabled = false;
        btn.title = "Click để chọn deck này";
      }

      btn.addEventListener("click", async () => {
        await chooseDeck(roomRef, players, deck);
      });

      grid.appendChild(btn);
    });

    // Cập nhật hint
    const hint = document.getElementById("deck-hint");
    if (hasChosenDeck) {
      hint.textContent = `Bạn đã chọn deck: ${currentPlayer.deck}. Đang chờ người chơi khác...`;
    } else {
      hint.textContent = "Vui lòng chọn một deck";
    }

    // Điều kiện đủ người (>=2)
    const enoughPlayers = players.length >= 2;
    const allChosen = enoughPlayers && players.every((p) => p.deck);

    if (allChosen && data.status !== "playing") {
      startBattle(roomRef, players);
    }

    // Nếu phòng đã chuyển sang playing → vào trận
    if (data.status === "playing" && !window.battleStarted) {
      window.battleStarted = true;
      initBattle(roomId);
    }
  });
}

// Xử lý chọn deck
async function chooseDeck(roomRef, players, deck) {
  const user = auth.currentUser;
  if (!user) return;

  const docSnap = await getDoc(roomRef);
  const roomData = docSnap.data();
  const currentPlayers = roomData.players || [];

  const deckTakenByOthers = currentPlayers.some(p => 
    p.uid !== user.uid && p.deck === deck
  );
  
  if (deckTakenByOthers) {
    alert("Deck này đã có người khác chọn! Vui lòng chọn deck khác.");
    return;
  }

  const playerIndex = currentPlayers.findIndex(p => p.uid === user.uid);
  
  if (playerIndex === -1) {
    alert("Bạn không có trong phòng!");
    return;
  }

  const currentPlayer = currentPlayers[playerIndex];
  if (currentPlayer.deck) {
    const change = confirm(`Bạn đã chọn deck: ${currentPlayer.deck}. Bạn có muốn đổi sang ${deck} không?`);
    if (!change) return;
  }

  const updatedPlayers = [...currentPlayers];
  updatedPlayers[playerIndex] = {
    ...updatedPlayers[playerIndex],
    deck: deck,
    deckCount: 60, // 64 - 4 lá đầu = 60 lá còn lại
    hand: []
  };

  await updateDoc(roomRef, { players: updatedPlayers });
  alert(`Bạn đã chọn deck: ${deck}`);
}

// Hàm tạo 4 lá bài ngẫu nhiên
function generateInitialHand(deckName) {
  const cards = [];
  const cardTypes = ["attack", "defense", "heal", "mana"];
  const prefixes = ["Mạnh mẽ", "Nhanh nhẹn", "Bí ẩn", "Thần thánh", "Cổ xưa", "Tối thượng"];
  
  for (let i = 0; i < 4; i++) {
    const type = cardTypes[Math.floor(Math.random() * cardTypes.length)];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const power = Math.floor(Math.random() * 100) + 1;
    cards.push(`${prefix} ${type} - ${power} (${deckName})`);
  }
  
  return cards;
}

// Chuẩn bị dữ liệu vào trận
async function startBattle(roomRef, players) {
  // Mỗi người chơi nhận 4 lá bài đầu tiên
  const updatedPlayers = players.map((p) => ({
    ...p,
    health: 1000,
    mana: 3,
    hand: generateInitialHand(p.deck), // Thêm 4 lá bài
    deckCount: 60, // 64 - 4 = 60 lá còn lại
    alive: true,
  }));

  // Random người đi đầu tiên
  const firstTurn = updatedPlayers[Math.floor(Math.random() * updatedPlayers.length)].uid;

  await updateDoc(roomRef, {
    players: updatedPlayers,
    status: "playing",
    turnUid: firstTurn,
    turnStarted: false,
    turnCount: 0,
    board: [],
  });
  
  alert("Tất cả người chơi đã chọn deck! Trận đấu bắt đầu!");
}

// (Phần UI khởi động trận cũ - giữ nguyên, dùng trong future)
function startMatchUI(players) {
  const main = document.querySelector(".main-content");
  main.innerHTML = `
    <div id="match">
      <h2>Trận đấu bắt đầu!</h2>
      <div id="players-list"></div>
    </div>
  `;

  const list = document.getElementById("players-list");
  players.forEach((p) => {
    const div = document.createElement("div");
    div.className = "player-card";
    div.innerHTML = `
      <h3>${p.name}</h3>
      <p>Deck: ${p.deck}</p>
      <p>HP: ${p.health}</p>
      <p>Mana: ${p.mana}</p>
      <p>Bài trên tay: ${p.hand?.length || 0}</p>
    `;
    list.appendChild(div);
  });
}

async function exitRoom(roomId) {
  if (!confirm("Bạn có chắc muốn thoát khỏi phòng này?")) return;
  
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) {
    alert("Phòng không tồn tại!");
    location.reload();
    return;
  }
  
  const data = roomSnap.data();
  const players = data.players || [];
  
  const newPlayers = players.filter(p => p.uid !== auth.currentUser?.uid);
  
  if (newPlayers.length === 0) {
    await updateDoc(roomRef, {
      players: [],
      status: "closed"
    });
    console.log("Đã xóa phòng vì không còn người chơi");
  } else {
    await updateDoc(roomRef, {
      players: newPlayers
    });
  }
  
  alert("Đã thoát khỏi phòng!");
  location.reload();
}