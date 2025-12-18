// ==== battle.js ====
import {
  auth,
  db,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "./firebase.js";

const DECK_SIZE = 64;
const STARTING_HAND_SIZE = 4;
const MANA_PER_TURN = 4;
const MAX_HAND_SIZE = 5;
const MAX_CARDS_BEFORE_DEFEAT = 36; // Thua nếu số bài trên tay > 36

const CARD_IMAGES = {
  "attack": "attack-card.png",
  "defense": "shield-card.png", 
  "heal": "heal-card.png",
  "mana": "mana-card.png",
  "draw": "draw-card.png",
  "combo": "combo-card.png",
  "special": "special-card.png",
  "curse": "curse-card.png"
};

export function initBattle(roomId) {
  // Ẩn sidebar và hiển thị battle full-screen
  const sidebar = document.querySelector(".sidebar");
  const gameContainer = document.querySelector("#game-container");
  
  if (sidebar) sidebar.style.display = "none";
  if (gameContainer) gameContainer.style.display = "block";
  
  // Tạo giao diện battle full-screen
  const main = document.querySelector(".main-content");
  main.innerHTML = '';
  main.style.padding = "0";
  main.style.background = "none";
  
  // Tạo battle container
  const battleContainer = document.createElement("div");
  battleContainer.id = "battle-container";
  battleContainer.className = "battle-container";
  
  // Thêm particles
  const particleContainer = document.createElement("div");
  particleContainer.id = "particles";
  particleContainer.className = "particles-container";
  
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particleContainer.appendChild(particle);
  }
  
  // Battle UI HTML
  battleContainer.innerHTML = `
    <!-- Header -->
    <div class="battle-header">
      <div class="header-left">
        <div id="turn-banner" class="turn-banner">
          <div id="turn-text" class="turn-text">Đang tải trận...</div>
          <div id="mana-display" class="mana-display">
            <span class="mana-label">🔮 Mana:</span>
            <span id="current-mana" class="mana-current">0</span>
            <span class="mana-separator">/</span>
            <span id="max-mana" class="mana-max">4</span>
          </div>
        </div>
        
        <div class="stats-container">
          <div class="stat-box">
            <div class="stat-label">📚 Deck còn</div>
            <div id="deck-count" class="stat-value">0</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-label">❤️ HP của bạn</div>
            <div id="my-hp" class="stat-value hp-value">1000</div>
          </div>
        </div>
      </div>
      
      <div class="header-right">
        <button id="end-turn-btn" class="battle-btn end-turn-btn" disabled>
          ⏭️ Kết thúc lượt
        </button>
        <button id="exit-battle-btn" class="battle-btn exit-btn">
          🚪 Thoát trận
        </button>
      </div>
    </div>
    
    <!-- Main content -->
    <div class="battle-main">
      <!-- Left column -->
      <div class="battle-left">
        <!-- Players panel -->
        <div id="players-panel" class="players-panel">
          <h3 class="panel-title">🎮 NGƯỜI CHƠI</h3>
          <div id="players-grid" class="players-grid"></div>
        </div>
        
        <!-- Board -->
        <div id="board" class="board-panel">
          <div class="board-header">
            <h3 class="board-title">
              🃏 BÀI ĐÃ ĐÁNH
              <span id="board-count" class="board-count">0</span>
            </h3>
          </div>
          <div id="board-cards" class="board-cards"></div>
        </div>
      </div>
      
      <!-- Right column -->
      <div class="battle-right">
        <!-- Hand -->
        <div id="hand-area" class="hand-panel">
          <h3 class="hand-title">
            🎴 BÀI TRÊN TAY
            <span id="hand-count" class="hand-count">0/5</span>
          </h3>
          
          <div id="hand" class="hand-cards"></div>
          
          <div class="hand-controls">
            <div class="selected-info">
              <span id="selected-card-name" class="selected-card"></span>
              <span id="selected-target-name" class="selected-target"></span>
            </div>
            <div class="action-buttons">
              <button id="play-card-btn" class="battle-btn play-btn" disabled>
                🎯 Đánh bài
              </button>
              <button id="skip-btn" class="battle-btn skip-btn" disabled>
                ⏭️ Bỏ lượt
              </button>
            </div>
          </div>
        </div>
        
        <!-- Battle log -->
        <div id="battle-log" class="battle-log">
          <h3 class="log-title">📜 LỊCH SỬ TRẬN ĐẤU</h3>
          <div id="log-messages" class="log-messages">
            <div class="log-placeholder">Trận đấu bắt đầu...</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  battleContainer.appendChild(particleContainer);
  main.appendChild(battleContainer);
  
  // Khởi tạo biến
  let selectedCard = null;
  let selectedTarget = null;
  let isMyTurn = false;
  let hasPlayedThisTurn = false;
  
  // Event listeners
  document.getElementById("exit-battle-btn").addEventListener("click", () => exitBattle(roomId));
  document.getElementById("end-turn-btn").addEventListener("click", () => handleEndTurn(roomId));
  
  const roomRef = doc(db, "rooms", roomId);
  
  // Listen to real-time updates
  onSnapshot(roomRef, async (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const players = data.players || [];
    const turnUid = data.turnUid;
    const currentUserUid = auth.currentUser?.uid;
    
    const me = players.find((p) => p.uid === currentUserUid);
    if (!me) return;
    
    // Cập nhật lượt chơi
    isMyTurn = (turnUid === currentUserUid && me.alive);
    hasPlayedThisTurn = data.hasPlayedThisTurn || false;
    
    // Cập nhật thông tin header
    document.getElementById("current-mana").textContent = me.mana || 0;
    document.getElementById("max-mana").textContent = me.maxMana || MANA_PER_TURN;
    document.getElementById("deck-count").textContent = me.deckCount || 0;
    document.getElementById("my-hp").textContent = me.health || 1000;
    document.getElementById("hand-count").textContent = `${me.hand?.length || 0}/${MAX_HAND_SIZE}`;
    
    // Cập nhật turn banner
    const turnPlayer = players.find(p => p.uid === turnUid);
    const banner = document.getElementById("turn-text");
    
    if (!turnPlayer) {
      banner.textContent = "🔄 Đang tìm người chơi...";
      banner.className = "turn-text waiting";
    } else if (!turnPlayer.alive) {
      banner.textContent = `💀 ${turnPlayer.name} đã thua - Chuyển lượt...`;
      banner.className = "turn-text dead";
    } else {
      if (isMyTurn) {
        banner.textContent = `🎮 LƯỢT CỦA BẠN!`;
        banner.className = "turn-text my-turn";
      } else {
        banner.textContent = `⏳ Lượt của: ${turnPlayer.name}`;
        banner.className = "turn-text opponent-turn";
      }
    }
    
    // Cập nhật player panel
    updatePlayersPanel(players, isMyTurn, currentUserUid, turnUid);
    
    // Cập nhật bài trên tay
    updateHand(me, isMyTurn);
    
    // Cập nhật bàn chơi
    updateBoard(data.board || [], players);
    
    // Xử lý lượt bắt đầu
    if (isMyTurn && !data.turnStarted) {
      await handleTurnStart(roomRef, players, me, data);
    }
    
    // Cập nhật nút bấm
    updateButtons();
    
    // Kiểm tra win
    const result = checkWin(players);
    if (result) {
      showWinMessage(result, roomId);
    }
  });
  
  // ========== CÁC HÀM PHỤ TRỢ ==========
  
  function updatePlayersPanel(players, isMyTurn, currentUserUid, turnUid) {
    const playersGrid = document.getElementById("players-grid");
    playersGrid.innerHTML = "";
    
    players.forEach((p) => {
      const isMe = p.uid === currentUserUid;
      const isTurn = p.uid === turnUid;
      const isDead = !p.alive;
      
      const playerCard = document.createElement("div");
      playerCard.className = "player-battle-card";
      
      if (isMe) playerCard.classList.add("me");
      if (isTurn && p.alive) playerCard.classList.add("active-turn");
      if (isDead) playerCard.classList.add("dead");
      if (selectedTarget === p.uid) playerCard.classList.add("targeted");
      
      playerCard.innerHTML = `
        <div class="player-card-header">
          <h4 class="player-name">
            ${isMe ? "👤 " : "🎮 "}
            ${p.name} ${isMe ? "(BẠN)" : ""}
            ${isTurn && p.alive ? "👑" : ""}
            ${isDead ? "💀" : ""}
          </h4>
          <span class="player-deck">${p.deck || "Chưa chọn"}</span>
        </div>
        
        <div class="player-stats">
          <div class="stat-item">
            <div class="stat-label-small">❤️ HP</div>
            <div class="hp-display ${p.health > 500 ? "high" : p.health > 200 ? "medium" : "low"}">
              ${p.health || 1000}
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-label-small">🔮 Mana</div>
            <div class="mana-display-player">${p.mana || 0}</div>
          </div>
        </div>
        
        <div class="player-info">
          <span class="info-item">🃏 ${p.hand?.length || 0}</span>
          <span class="info-item">📚 ${p.deckCount || 0}</span>
        </div>
        
        ${isDead ? `
          <div class="dead-overlay">
            <div class="dead-text">💀 THUA</div>
          </div>
        ` : ""}
        
        ${isTurn && p.alive ? `
          <div class="turn-glow"></div>
        ` : ""}
      `;
      
      // Sự kiện click chọn mục tiêu
      if (isMyTurn && !isMe && p.alive) {
        playerCard.style.cursor = "pointer";
        playerCard.addEventListener("click", () => {
          if (selectedTarget === p.uid) {
            selectedTarget = null;
            document.getElementById("selected-target-name").textContent = "";
            playerCard.classList.remove("targeted");
          } else {
            selectedTarget = p.uid;
            document.getElementById("selected-target-name").textContent = `→ ${p.name}`;
            playersGrid.querySelectorAll(".player-battle-card").forEach(card => 
              card.classList.remove("targeted")
            );
            playerCard.classList.add("targeted");
          }
          updateButtons();
        });
      }
      
      playersGrid.appendChild(playerCard);
    });
  }
  
  function updateHand(me, isMyTurn) {
    const handDiv = document.getElementById("hand");
    handDiv.innerHTML = "";
    
    // Thêm class stacked
    handDiv.className = "hand-cards stacked";
    
    const handCards = me.hand || [];
    const handCount = handCards.length;
    
    // Hiển thị cảnh báo nếu bài nhiều
    if (handCount > 20) {
      const warning = document.createElement("div");
      warning.className = "hand-warning";
      warning.textContent = `⚠️ ${handCount}/36 bài`;
      handDiv.appendChild(warning);
    }
    
    // Nếu có quá nhiều bài, chỉ hiển thị một phần
    const displayLimit = 15; // Chỉ hiển thị tối đa 15 lá
    const cardsToDisplay = handCount > displayLimit 
      ? handCards.slice(0, displayLimit)
      : handCards;
    
    cardsToDisplay.forEach((card, index) => {
      const cardInfo = parseCardInfo(card);
      const cardElement = document.createElement("div");
      cardElement.className = "battle-card stacked";
      
      if (selectedCard === card) cardElement.classList.add("selected");
      if (isMyTurn && (me.mana || 0) < cardInfo.cost) cardElement.classList.add("insufficient-mana");
      
      cardElement.innerHTML = `
        <div class="card-top ${cardInfo.type.toLowerCase()}">
          ${getCardEmoji(cardInfo.type)}
        </div>
        <div class="card-content">
          <div class="card-name-battle">${cardInfo.name}</div>
          <div class="card-type-battle">${cardInfo.type}</div>
        </div>
        <div class="card-cost">${cardInfo.cost} 🔮</div>
        <div class="card-power ${cardInfo.power > 0 ? "damage" : "heal"}">
          ${cardInfo.power > 0 ? "+" : ""}${cardInfo.power}
        </div>
        <div class="card-tooltip">
          <div class="tooltip-title">${cardInfo.name}</div>
          <div class="tooltip-type ${cardInfo.type.toLowerCase()}">${cardInfo.type}</div>
          <div class="tooltip-info">Mana: ${cardInfo.cost} | Sức mạnh: ${cardInfo.power}</div>
        </div>
      `;
      
      // Thêm số thứ tự nếu có nhiều bài
      if (handCount > displayLimit && index === displayLimit - 1) {
        const counter = document.createElement("div");
        counter.className = "card-counter";
        counter.textContent = `+${handCount - displayLimit}`;
        cardElement.appendChild(counter);
      }
      
      // Sự kiện click chọn bài
      if (isMyTurn) {
        cardElement.addEventListener("click", () => {
          if ((me.mana || 0) < cardInfo.cost) {
            addLogMessage(`❌ Không đủ mana! Cần ${cardInfo.cost} mana`, "error");
            return;
          }
          
          if (selectedCard === card) {
            selectedCard = null;
            document.getElementById("selected-card-name").textContent = "";
            cardElement.classList.remove("selected");
          } else {
            handDiv.querySelectorAll(".battle-card").forEach(c => 
              c.classList.remove("selected")
            );
            selectedCard = card;
            document.getElementById("selected-card-name").textContent = `📜 ${cardInfo.name}`;
            cardElement.classList.add("selected");
          }
          updateButtons();
        });
      }
      
      handDiv.appendChild(cardElement);
    });
    
    // Nếu có quá nhiều bài, hiển thị pile effect
    if (handCount > displayLimit) {
      const pileElement = document.createElement("div");
      pileElement.className = "card-pile";
      pileElement.innerHTML = `
        <div class="card-layer"></div>
        <div class="card-layer"></div>
        <div class="card-layer"></div>
        <div class="card-layer"></div>
        <div class="card-pile-count">+${handCount - displayLimit}</div>
      `;
      handDiv.appendChild(pileElement);
    }
    
    // Cập nhật hand count với cảnh báo
    const handCountElement = document.getElementById("hand-count");
    if (handCount > 30) {
      handCountElement.innerHTML = `<span class="hand-count-warning">${handCount}/36</span>`;
      handCountElement.title = "⚠️ Cẩn thận! Gần đạt giới hạn thua!";
    } else if (handCount > 20) {
      handCountElement.innerHTML = `<span style="color: orange">${handCount}/36</span>`;
      handCountElement.title = "⚠️ Bài trên tay đang nhiều!";
    } else {
      handCountElement.textContent = `${handCount}/36`;
    }
  }

  
  function updateBoard(boardCards, players) {
    const boardDiv = document.getElementById("board-cards");
    boardDiv.innerHTML = "";
    
    document.getElementById("board-count").textContent = boardCards.length;
    
    const stackLimit = Math.min(12, boardCards.length);
    const startIndex = Math.max(0, boardCards.length - stackLimit);
    
    for (let i = startIndex; i < boardCards.length; i++) {
      const boardCard = boardCards[i];
      const cardInfo = parseCardInfo(boardCard.card);
      const fromPlayer = players.find(p => p.uid === boardCard.uid);
      const toPlayer = players.find(p => p.uid === boardCard.target);
      const stackIndex = i - startIndex;
      
      const cardEl = document.createElement("div");
      cardEl.className = "board-card-stack";
      cardEl.style.setProperty("--stack-index", stackIndex);
      
      cardEl.innerHTML = `
        <div class="board-card-inner ${cardInfo.type.toLowerCase()}">
          ${getCardEmoji(cardInfo.type)}
          <div class="board-card-name">${cardInfo.name.substring(0, 10)}...</div>
        </div>
      `;
      
      // Tooltip
      cardEl.addEventListener("mouseenter", (e) => {
        const tooltip = document.createElement("div");
        tooltip.className = "card-tooltip-battle";
        tooltip.innerHTML = `
          <div class="tooltip-title">${cardInfo.name}</div>
          <div class="tooltip-type ${cardInfo.type.toLowerCase()}">${cardInfo.type} - ${cardInfo.power} sức mạnh</div>
          <div class="tooltip-info">
            <div>👤 ${fromPlayer?.name || "Không xác định"} → 🎯 ${toPlayer?.name || "Không xác định"}</div>
            <div class="tooltip-time">${new Date(boardCard.time).toLocaleTimeString()}</div>
          </div>
        `;
        cardEl.appendChild(tooltip);
      });
      
      cardEl.addEventListener("mouseleave", () => {
        const tooltip = cardEl.querySelector('.card-tooltip-battle');
        if (tooltip) tooltip.remove();
      });
      
      boardDiv.appendChild(cardEl);
    }
  }
  
  function updateButtons() {
    const playBtn = document.getElementById("play-card-btn");
    const skipBtn = document.getElementById("skip-btn");
    const endTurnBtn = document.getElementById("end-turn-btn");
    
    const canPlayCard = isMyTurn && selectedCard && selectedTarget;
    const canEndTurn = isMyTurn && hasPlayedThisTurn;
    
    playBtn.disabled = !canPlayCard;
    skipBtn.disabled = !isMyTurn;
    endTurnBtn.disabled = !canEndTurn;
    
    // Thêm tooltip
    playBtn.title = !isMyTurn ? "Không phải lượt của bạn" :
                   !selectedCard ? "Chưa chọn bài" :
                   !selectedTarget ? "Chưa chọn mục tiêu" : "Đánh bài đã chọn";
    
    // Sự kiện cho nút đánh bài
    playBtn.onclick = async () => {
      if (!selectedCard || !selectedTarget || !isMyTurn) return;
      
      const roomRef = doc(db, "rooms", roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return;
      
      const data = roomSnap.data();
      const players = data.players || [];
      const currentUserUid = auth.currentUser?.uid;
      
      const me = players.find(p => p.uid === currentUserUid);
      const targetPlayer = players.find(p => p.uid === selectedTarget);
      
      if (!me || !targetPlayer || !targetPlayer.alive) {
        addLogMessage("❌ Mục tiêu không hợp lệ!", "error");
        return;
      }
      
      const cardInfo = parseCardInfo(selectedCard);
      if ((me.mana || 0) < cardInfo.cost) {
        addLogMessage(`❌ Không đủ mana! Cần ${cardInfo.cost} mana`, "error");
        return;
      }
      
      // Hiệu ứng đánh bài
      playCardAnimation(selectedCard, me.name, targetPlayer.name);
      
      // Áp dụng hiệu ứng card
      const updatedPlayers = applyCardEffect(selectedCard, players, me.uid, selectedTarget);
      
      // Thêm vào lịch sử
      addLogMessage(`🎯 ${me.name} dùng "${cardInfo.name}" lên ${targetPlayer.name}`, "action");
      
      // Cập nhật Firebase
      await updateDoc(roomRef, {
        board: arrayUnion({
          uid: currentUserUid,
          card: selectedCard,
          target: selectedTarget,
          time: Date.now()
        }),
        players: updatedPlayers,
        hasPlayedThisTurn: true,
        turnStarted: true
      });
      
      // Reset selection
      selectedCard = null;
      selectedTarget = null;
      document.getElementById("selected-card-name").textContent = "";
      document.getElementById("selected-target-name").textContent = "";
    };
    
    // Sự kiện cho nút bỏ lượt
    skipBtn.onclick = async () => {
      if (!isMyTurn) return;
      
      const roomRef = doc(db, "rooms", roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return;
      
      const data = roomSnap.data();
      const players = data.players || [];
      const currentUserUid = auth.currentUser?.uid;
      const me = players.find(p => p.uid === currentUserUid);
      
      // Kiểm tra xem có thể đánh bài không
      const canPlayAnyCard = me.hand?.some(card => {
        const cardInfo = parseCardInfo(card);
        return (me.mana || 0) >= cardInfo.cost;
      });
      
      if (canPlayAnyCard) {
        addLogMessage("⚠️ Bạn vẫn còn bài có thể đánh! Hãy sử dụng 'Kết thúc lượt' sau khi đã đánh bài.", "warning");
        return;
      }
      
      addLogMessage(`⏭️ ${me.name} bỏ lượt`, "info");
      await handleEndTurn(roomId);
    };
  }
  
  function addLogMessage(message, type = "info") {
    const logDiv = document.getElementById("log-messages");
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    entry.innerHTML = `<span class="log-time">${time}</span> ${message}`;
    
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
  }
}

// ========== HÀM TẠO CARD ==========
function generateCard(deckName) {
  const cardTypes = [
    { type: "attack", weight: 3, mana: [1, 2, 3] },
    { type: "defense", weight: 2, mana: [1, 2] },
    { type: "heal", weight: 2, mana: [2, 3] },
    { type: "mana", weight: 1, mana: [1] },
    { type: "draw", weight: 1, mana: [2] },
    { type: "combo", weight: 1, mana: [3, 4] },
    { type: "special", weight: 1, mana: [4] }
  ];
  
  const totalWeight = cardTypes.reduce((sum, type) => sum + type.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedType;
  
  for (const type of cardTypes) {
    random -= type.weight;
    if (random <= 0) {
      selectedType = type;
      break;
    }
  }
  
  if (!selectedType) selectedType = cardTypes[0];
  
  const manaCost = selectedType.mana[Math.floor(Math.random() * selectedType.mana.length)];
  
  const prefixes = {
    "attack": ["Lưỡi kiếm", "Mũi tên", "Tia chớp", "Hỏa cầu", "Bão tuyết", "Gió lốc", "Địa chấn"],
    "defense": ["Khiên thép", "Áo giáp", "Hào quang", "Bong bóng", "Lực trường", "Vách đá", "Lá chắn"],
    "heal": ["Thuốc tiên", "Suối nguồn", "Phép lành", "Ánh sáng", "Mưa phùn", "Gió mát", "Sức sống"],
    "mana": ["Ngọc mana", "Tinh thể", "Dòng chảy", "Nguyên tố", "Năng lượng", "Linh khí", "Hạt nhân"],
    "draw": ["Bói toán", "Tiên tri", "Tri thức", "Thư viện", "Cuộn giấy", "Bản đồ", "Bí kíp"],
    "combo": ["Kết hợp", "Đồng bộ", "Hỗn hợp", "Liên kết", "Phối hợp", "Tổng hợp", "Đa dạng"],
    "special": ["Huyền thoại", "Thần thánh", "Bí ẩn", "Cổ xưa", "Độc nhất", "Vô song", "Tuyệt đỉnh"]
  };
  
  const typePrefixes = prefixes[selectedType.type] || prefixes["special"];
  const prefix = typePrefixes[Math.floor(Math.random() * typePrefixes.length)];
  
  const basePower = manaCost * 25;
  const power = Math.floor(basePower + Math.random() * 50);
  
  return `${prefix} ${selectedType.type.charAt(0).toUpperCase() + selectedType.type.slice(1)} [${manaCost}] - ${power}`;
}

// ========== PHÂN TÍCH CARD INFO ==========
function parseCardInfo(cardString) {
  const parts = cardString.split(' - ');
  const namePart = parts[0];
  const power = parseInt(parts[1]) || 0;
  
  const manaMatch = namePart.match(/\[(\d+)\]/);
  const manaCost = manaMatch ? parseInt(manaMatch[1]) : 2;
  
  let type = "special";
  let image = "special-card.png";
  
  const cardTypes = {
    "attack": ["kiếm", "tên", "chớp", "hỏa", "bão", "gió", "địa", "tấn công"],
    "defense": ["khiên", "giáp", "hào", "bong", "trường", "vách", "chắn", "phòng thủ"],
    "heal": ["thuốc", "suối", "phép", "ánh", "mưa", "sức", "hồi", "máu"],
    "mana": ["mana", "tinh", "dòng", "nguyên", "năng", "linh", "hạt", "nạp"],
    "draw": ["bói", "tiên", "tri", "thư", "cuộn", "bản", "bí", "bốc"],
    "combo": ["kết", "đồng", "hỗn", "liên", "phối", "tổng", "đa", "combo"],
    "special": ["huyền", "thần", "bí", "cổ", "độc", "vô", "tuyệt", "special"]
  };
  
  const lowerName = namePart.toLowerCase();
  for (const [cardType, keywords] of Object.entries(cardTypes)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      type = cardType;
      image = `${cardType}-card.png`;
      break;
    }
  }
  
  return {
    name: namePart.replace(/\[\d+\]/, '').trim(),
    type: type.charAt(0).toUpperCase() + type.slice(1),
    cost: manaCost,
    power: power,
    image: image,
    fullName: cardString
  };
}

// ========== ÁP DỤNG HIỆU ỨNG CARD ==========
function applyCardEffect(cardString, players, fromUid, toUid) {
  const cardInfo = parseCardInfo(cardString);
  const fromPlayer = players.find(p => p.uid === fromUid);
  const toPlayer = players.find(p => p.uid === toUid);
  
  if (!fromPlayer || !toPlayer) return players;
  
  const updatedPlayers = players.map(p => {
    if (p.uid === fromUid) {
      const newHand = p.hand.filter(card => card !== cardString);
      return {
        ...p,
        hand: newHand,
        mana: Math.max(0, (p.mana || 0) - cardInfo.cost)
      };
    }
    
    if (p.uid === toUid) {
      let newHealth = p.health || 1000;
      let newMana = p.mana || 0;
      let newHand = p.hand || [];
      let newDeckCount = p.deckCount || 0;
      
      switch(cardInfo.type.toLowerCase()) {
        case "attack":
          newHealth = Math.max(0, newHealth - cardInfo.power);
          break;
          
        case "defense":
          if (fromUid === toUid) {
            newHealth = Math.min(2000, newHealth + Math.floor(cardInfo.power * 0.5));
          }
          break;
          
        case "heal":
          newHealth = Math.min(2000, newHealth + cardInfo.power);
          break;
          
        case "mana":
          newMana = Math.min(10, newMana + Math.floor(cardInfo.power / 50));
          break;
          
        case "draw":
          if (newDeckCount > 0) {
            const newCard = generateCard(p.deck);
            newHand = [...newHand, newCard];
            newDeckCount--;
          }
          break;
          
        case "combo":
          newHealth = Math.min(2000, newHealth - Math.floor(cardInfo.power * 0.7) + Math.floor(cardInfo.power * 0.3));
          break;
          
        case "special":
          newMana = MANA_PER_TURN;
          break;
      }
      
      return {
        ...p,
        health: newHealth,
        mana: newMana,
        hand: newHand,
        deckCount: newDeckCount
      };
    }
    
    return p;
  });
  
  return updatedPlayers;
}

// ========== XỬ LÝ LƯỢT CHƠI ==========
async function handleTurnStart(roomRef, players, me, data) {
  const currentUserUid = auth.currentUser?.uid;
  
  if ((me.deckCount || 0) > 0 && (me.hand?.length || 0) < MAX_HAND_SIZE) {
    const newCard = generateCard(me.deck);
    me.hand = [...(me.hand || []), newCard];
    me.deckCount = Math.max(0, (me.deckCount || 0) - 1);
  }
  
  me.mana = MANA_PER_TURN;
  me.maxMana = MANA_PER_TURN;
  
  const updatedPlayers = players.map(p => {
    if (p.uid === currentUserUid) {
      return me;
    }
    return p;
  });
  
  await updateDoc(roomRef, {
    players: updatedPlayers,
    turnStarted: true,
    hasPlayedThisTurn: false
  });
}

async function handleEndTurn(roomId) {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) return;
  
  const data = roomSnap.data();
  const players = data.players || [];
  const currentUserUid = auth.currentUser?.uid;
  
  const me = players.find(p => p.uid === currentUserUid);
  if (!me || !me.alive) return;
  
  const alivePlayers = players.filter(p => p.alive);
  const currentIndex = alivePlayers.findIndex(p => p.uid === currentUserUid);
  
  if (currentIndex === -1) return;
  
  const nextIndex = (currentIndex + 1) % alivePlayers.length;
  const nextPlayer = alivePlayers[nextIndex];
  
  await updateDoc(roomRef, {
    turnUid: nextPlayer.uid,
    turnStarted: false,
    hasPlayedThisTurn: false,
    turnCount: (data.turnCount || 0) + 1
  });
}

// ========== KIỂM TRA THẮNG THUA ==========
function checkWin(players) {
  const alive = players.filter(p => p.alive && p.health > 0);
  
  // Kiểm tra bài trên tay > 36 thì thua
  players.forEach(p => {
    if (p.alive && (p.hand?.length || 0) > MAX_CARDS_BEFORE_DEFEAT) {
      p.alive = false;
      p.health = 0;
      addLogMessage(`💀 ${p.name} thua vì có quá nhiều bài trên tay (${p.hand.length})!`, "error");
    }
  });
  
  // Lọc lại sau khi kiểm tra bài
  const newAlive = players.filter(p => p.alive && p.health > 0);
  
  if (newAlive.length === 1) {
    return `🏆 ${newAlive[0].name} chiến thắng!`;
  }
  
  if (newAlive.length === 0) {
    return "🤝 Tất cả đều thua!";
  }
  
  const allNoCards = players.every(p => 
    (p.hand?.length || 0) === 0 && 
    (p.deckCount || 0) <= 0
  );
  
  if (allNoCards) {
    const sortedByHP = [...players].sort((a, b) => (b.health || 0) - (a.health || 0));
    if (sortedByHP[0].health === sortedByHP[1]?.health) {
      return "🤝 Hòa trận!";
    }
    return `🏆 ${sortedByHP[0].name} chiến thắng (nhiều HP nhất)!`;
  }
  
  return null;
}

// ========== HIỆU ỨNG CARD ==========
function playCardAnimation(cardName, fromName, toName) {
  const animationDiv = document.createElement("div");
  animationDiv.className = "card-animation";
  
  const cardInfo = parseCardInfo(cardName);
  
  animationDiv.innerHTML = `
    <div class="animation-card ${cardInfo.type.toLowerCase()}">
      ${getCardEmoji(cardInfo.type)}
    </div>
    <div class="animation-text">
      <div class="from-to">${fromName} → ${toName}</div>
      <div class="card-name-animation">${cardInfo.name}</div>
      <div class="card-effect">${cardInfo.type} - ${cardInfo.power}</div>
    </div>
  `;
  
  document.body.appendChild(animationDiv);
  
  const animation = animationDiv.animate(
    [
      { 
        transform: "scale(1) rotate(0deg)", 
        opacity: 1,
        left: "20%",
        top: "80%"
      },
      { 
        transform: "scale(1.5) rotate(180deg)", 
        opacity: 0.9,
        left: "50%",
        top: "50%"
      },
      { 
        transform: "scale(0.5) rotate(360deg)", 
        opacity: 0,
        left: "80%",
        top: "20%"
      }
    ],
    { 
      duration: 1200, 
      easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" 
    }
  );
  
  animation.onfinish = () => animationDiv.remove();
}

// ========== HÀM HỖ TRỢ ==========
function getCardEmoji(type) {
  const emojis = {
    "attack": "⚔️",
    "defense": "🛡️",
    "heal": "❤️",
    "mana": "🔮",
    "draw": "🎴",
    "combo": "🌀",
    "special": "✨"
  };
  return emojis[type.toLowerCase()] || "🃏";
}

function showWinMessage(result, roomId) {
  const overlay = document.createElement("div");
  overlay.className = "win-overlay";
  
  const winBox = document.createElement("div");
  winBox.className = "win-box";
  
  winBox.innerHTML = `
    <div class="win-icon">🏆</div>
    <div class="win-title">
      ${result.includes("chiến thắng") ? "CHIẾN THẮNG!" : "KẾT THÚC!"}
    </div>
    <div class="win-result">${result}</div>
    <div class="win-buttons">
      <button id="back-to-lobby" class="win-btn lobby-btn">
        🏠 Về Lobby
      </button>
      <button id="rematch-btn" class="win-btn rematch-btn">
        🔄 Đấu lại
      </button>
    </div>
  `;
  
  overlay.appendChild(winBox);
  document.body.appendChild(overlay);
  
  document.getElementById("back-to-lobby").addEventListener("click", () => {
    location.reload();
  });
  
  document.getElementById("rematch-btn").addEventListener("click", () => {
    alert("Tính năng đấu lại đang phát triển...");
  });
}

// ========== THOÁT TRẬN ==========
async function exitBattle(roomId) {
  if (!confirm("Bạn có chắc muốn thoát khỏi trận đấu? (Bạn sẽ thua trận này)")) return;
  
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) {
    alert("Trận đấu không tồn tại!");
    location.reload();
    return;
  }
  
  const data = roomSnap.data();
  const players = data.players || [];
  const currentUserUid = auth.currentUser?.uid;
  
  const updatedPlayers = players.map(p => {
    if (p.uid === currentUserUid) {
      return { ...p, alive: false, health: 0 };
    }
    return p;
  });
  
  await updateDoc(roomRef, {
    players: updatedPlayers
  });
  
  alert("Đã thoát khỏi trận đấu!");
  location.reload();
}