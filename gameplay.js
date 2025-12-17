// ==== gameplay.js ====
import {
  auth,
  db,
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "./firebase.js";
import { initBattle } from "./battle.js";

// Deck data
const DECKS = ["Jol", "Chung Ah", "Aramis", "Zupitere", "Mel", "Mano"];

// Hàm mở giao diện chọn deck
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

  // Theo dõi realtime phòng
  onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const players = data.players || [];

    grid.innerHTML = "";

    // Tạo nút chọn deck
    DECKS.forEach((deck) => {
      const taken = players.some((p) => p.deck === deck);
      const btn = document.createElement("button");
      btn.textContent = deck;
      btn.disabled = taken || players.some((p) => p.uid === auth.currentUser.uid);
      btn.className = taken ? "deck taken" : "deck";

      btn.addEventListener("click", async () => {
        const already = players.find((p) => p.uid === auth.currentUser.uid);
        if (already) {
          alert("Bạn đã chọn deck rồi!");
          return;
        }
        await updateDoc(roomRef, {
          players: arrayUnion({
            uid: auth.currentUser.uid,
            name: auth.currentUser.email.split("@")[0],
            deck,
            health: 1000,
            mana: 3,
            shield: 0,
          }),
        });
        alert(`Bạn đã chọn deck: ${deck}`);
      });

      grid.appendChild(btn);
    });

    // Nếu tất cả người chơi (≥2) đều có deck
    const enoughPlayers = players.length >= 2;
    const allChosen = enoughPlayers && players.every((p) => p.deck);

    if (allChosen && data.status !== "playing") {
  // === Chuẩn bị dữ liệu vào trận ===
	   const updatedPlayers = players.map(p => ({
        ...p,    
        hand: [],
        deckCount: 64,
        alive: true,
      }));

      // Random người đi đầu tiên
      const firstTurn = updatedPlayers[Math.floor(Math.random() * updatedPlayers.length)].uid;

      // Cập nhật Firestore
      updateDoc(roomRef, {
        players: updatedPlayers,
        status: "playing",
        turnUid: firstTurn,
        turnStarted: false,
        turnCount: 0,
        board: [],
      });
    }


    // Khi phòng chuyển sang trạng thái playing
    if (data.status === "playing") {
      initBattle(roomId);
    }
  });
}

// Giao diện khi bắt đầu trận
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
