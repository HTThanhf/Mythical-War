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
      <div id="deck-grid" class="deck-grid"></div>
      <p id="deck-hint">Chờ người chơi khác chọn deck...</p>
    </div>
  `;

  const grid = document.getElementById("deck-grid");
  const roomRef = doc(db, "rooms", roomId);
  window.battleStarted = false;

  // Lắng nghe realtime phòng
  onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const players = data.players || [];

    grid.innerHTML = "";

    // Vẽ nút deck
    DECKS.forEach((deck) => {
      const taken = players.some((p) => p.deck === deck);
      const btn = document.createElement("button");
      btn.textContent = deck;
      btn.disabled = taken || players.some((p) => p.uid === auth.currentUser.uid);
      btn.className = taken ? "deck taken" : "deck";

      btn.addEventListener("click", async () => {
        await chooseDeck(roomRef, players, deck);
      });

      grid.appendChild(btn);
    });

    // Điều kiện đủ người (>=2, nhưng cho phép test >=1)
    const enoughPlayers = players.length >= 1;
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

  // Kiểm tra nếu đã chọn deck rồi
  if (currentPlayers.some((p) => p.uid === user.uid && p.deck)) {
    alert("Bạn đã chọn deck rồi!");
    return;
  }

  // Xóa player cũ (nếu có)
  const updatedPlayers = currentPlayers.filter((p) => p.uid !== user.uid);

  // Thêm player mới
  updatedPlayers.push({
    uid: user.uid,
    name: user.email.split("@")[0],
    deck,
    health: 1000,
    mana: 3,
    shield: 0,
    hand: [],
    deckCount: 64,
    alive: true,
  });

  await updateDoc(roomRef, { players: updatedPlayers });
  alert(`Bạn đã chọn deck: ${deck}`);
}

// Chuẩn bị dữ liệu vào trận
async function startBattle(roomRef, players) {
  const updatedPlayers = players.map((p) => ({
    ...p,
    hand: [],
    deckCount: 64,
    alive: true,
  }));

  // Random người đi đầu tiên
  const firstTurn =
    updatedPlayers[Math.floor(Math.random() * updatedPlayers.length)].uid;

  await updateDoc(roomRef, {
    players: updatedPlayers,
    status: "playing",
    turnUid: firstTurn,
    turnStarted: false,
    turnCount: 0,
    board: [],
  });
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
    `;
    list.appendChild(div);
  });
}
