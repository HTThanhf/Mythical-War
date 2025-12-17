// ==== battle.js ====
import {
  auth,
  db,
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "./firebase.js";

const DECK_SIZE = 64;

export function initBattle(roomId) {
  const main = document.querySelector(".main-content");
  main.innerHTML = `
    <div id="battle-ui">
      <div id="players-panel"></div>
      <div id="turn-banner">Đang tải trận...</div>
      <div id="board">
        <p>Deck còn: <span id="deck-count">0</span></p>
        <div id="board-cards"></div>
      </div>
      <div id="hand-area">
        <div id="hand"></div>
        <button id="play-btn" disabled>Đánh</button>
        <button id="skip-btn" disabled>Bỏ lượt</button>
      </div>
    </div>
  `;

  const roomRef = doc(db, "rooms", roomId);
  let selectedCard = null;
  let selectedTarget = null;

  onSnapshot(roomRef, async (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const players = data.players || [];
    let turnUid = data.turnUid;

    const me = players.find((p) => p.uid === auth.currentUser.uid);
    if (!me) return;

    // ==== Player panel ====
    const panel = document.getElementById("players-panel");
    panel.innerHTML = "";
    players.forEach((p) => {
      const div = document.createElement("div");
      div.className = "player-card";
      if (p.uid === auth.currentUser.uid) div.classList.add("me");
      if (p.uid === turnUid) div.classList.add("active-turn");
      if (!p.alive) div.classList.add("dead");
      div.innerHTML = `
        <h4>${p.name}</h4>
        <p>Deck: ${p.deck}</p>
        <p>HP: ${p.health}</p>
        <p>Mana: ${p.mana}</p>
      `;
      if (p.uid !== auth.currentUser.uid && p.alive) {
        div.addEventListener("click", () => {
          selectedTarget = p.uid;
          panel.querySelectorAll(".player-card").forEach((x) =>
            x.classList.remove("target")
          );
          div.classList.add("target");
        });
      }
      panel.appendChild(div);
    });

    // ==== Banner ====
    const banner = document.getElementById("turn-banner");
    const turnPlayer = players.find((p) => p.uid === turnUid);
    banner.textContent = turnPlayer
      ? `Lượt của: ${turnPlayer.name}`
      : "Đang tải lượt...";

    // ==== Hand ====
    const handDiv = document.getElementById("hand");
    handDiv.innerHTML = "";
    (me.hand || []).forEach((card, i) => {
      const c = document.createElement("div");
      c.className = "card";
      c.textContent = card;
      c.style.left = `${i * 35}px`;
      c.addEventListener("click", () => {
        handDiv.querySelectorAll(".card").forEach((x) =>
          x.classList.remove("selected")
        );
        c.classList.add("selected");
        selectedCard = card;
      });
      handDiv.appendChild(c);
    });

    // ==== Deck count + board ====
    document.getElementById("deck-count").textContent = me.deckCount || 0;
    const boardDiv = document.getElementById("board-cards");
    boardDiv.innerHTML = "";
    (data.board || []).forEach((b) => {
      const cardEl = document.createElement("div");
      cardEl.className = "board-card";
      cardEl.textContent = `${b.card} (${players.find(p=>p.uid===b.uid)?.name||"?"})`;
      boardDiv.appendChild(cardEl);
    });

    // ==== Nút ====
    const playBtn = document.getElementById("play-btn");
    const skipBtn = document.getElementById("skip-btn");
    const isMyTurn = turnUid === auth.currentUser.uid && me.alive;

    playBtn.disabled = !isMyTurn || !selectedCard || !selectedTarget;
    skipBtn.disabled = !isMyTurn || !me.hand?.length;

    // === Nếu đến lượt mình -> auto rút bài ===
    if (isMyTurn && !data.turnStarted) {
      await handleTurnStart(roomRef, players, me, data);
    }

    // === Nút đánh ===
    playBtn.onclick = async () => {
      if (!selectedCard || !selectedTarget) return;
      playCardAnimation(selectedCard);

      // Xóa card khỏi tay
      me.hand = me.hand.filter((c) => c !== selectedCard);

      await updateDoc(roomRef, {
        board: arrayUnion({
          uid: auth.currentUser.uid,
          card: selectedCard,
          target: selectedTarget,
          time: Date.now(),
        }),
        players: players.map((p) =>
          p.uid === me.uid ? { ...p, hand: me.hand } : p
        ),
      });

      selectedCard = null;
      selectedTarget = null;
    };

    // === Nút bỏ lượt ===
    skipBtn.onclick = async () => {
      await handleTurnEnd(roomRef, players, me.uid);
    };

    // === Check win/hòa ===
    const result = checkWin(players);
    if (result) {
      banner.textContent = result;
      playBtn.disabled = true;
      skipBtn.disabled = true;
    }
  });
}

// ==== Hỗ trợ ====
async function handleTurnStart(roomRef, players, me, data) {
  // Nếu deck > 0, auto rút 1 lá (trừ turn đầu)
  if (data.turnCount > 0 && me.deckCount > 0) {
    const newCard = "Card" + Math.floor(Math.random() * 100);
    me.hand.push(newCard);
    me.deckCount--;
  }

  // Nếu deck=0 và hand=0 => skip luôn
  if (me.deckCount <= 0 && me.hand.length === 0) {
    await handleTurnEnd(roomRef, players, me.uid);
    return;
  }

  // Đánh dấu đã start
  await updateDoc(roomRef, { players, turnStarted: true });
}

async function handleTurnEnd(roomRef, players, currentUid) {
  const alive = players.filter((p) => p.alive);
  const idx = alive.findIndex((p) => p.uid === currentUid);
  const next = alive[(idx + 1) % alive.length];
  await updateDoc(roomRef, {
    turnUid: next.uid,
    turnStarted: false,
    turnCount: (players.turnCount || 0) + 1,
  });
}

function checkWin(players) {
  const alive = players.filter((p) => p.alive && p.health > 0);
  if (alive.length === 1) return `🏆 ${alive[0].name} thắng!`;
  const canPlay = alive.some((p) => p.hand.length > 0 || p.deckCount > 0);
  if (!canPlay) return "🤝 Hòa!";
  return null;
}

function playCardAnimation(cardName) {
  const div = document.createElement("div");
  div.className = "board-card";
  div.textContent = cardName;
  div.style.position = "absolute";
  div.style.left = "50%";
  div.style.top = "80%";
  div.style.transform = "translateX(-50%)";
  document.body.appendChild(div);
  div.animate(
    [
      { transform: "translateX(-50%) translateY(0) scale(1)", opacity: 1 },
      {
        transform: "translateX(-50%) translateY(-250px) scale(1.2)",
        opacity: 0.8,
      },
    ],
    { duration: 800, easing: "ease-out" }
  ).onfinish = () => div.remove();
}
