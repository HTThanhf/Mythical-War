
import {
  auth,
  db,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "../firebase.js";
import { updateBattleHandLayout, handLayoutManager } from './hand-layout-manager.js';
import { DeckManager } from '../deck-manager.js';
import { Effect, EffectManager, EffectType, ModifierType } from './effect-system.js';

// Và khởi tạo effectManager ở đây:
const effectManager = new EffectManager();

const DECK_SIZE = 64;
const STARTING_HAND_SIZE = 4;
const MANA_PER_TURN = 4;
const MAX_HAND_SIZE = 5;
const MAX_CARDS_BEFORE_DEFEAT = 36;

// ========== GLOBAL VARIABLES ==========
let selectedCard = null;
let selectedTarget = null;
let isMyTurn = false;
let hasPlayedThisTurn = false;
let jolPassivesApplied = false;
let sargulaPassivesApplied = false;

// ========== BATTLE INITIALIZATION ==========
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
  
  // Tạo battle container với UI cập nhật để hiển thị effects
  const battleContainer = document.createElement("div");
  battleContainer.id = "battle-container";
  battleContainer.className = "battle-container";
  
  // Battle UI HTML với phần hiển thị effects
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
          
          <!-- Resource display for decks -->
          <div class="stat-box" id="resource-display" style="display: none;">
            <div class="stat-label" id="resource-label">✨ Fragment</div>
            <div id="resource-value" class="stat-value">0/10</div>
          </div>
        </div>
        
        <!-- Player effects display -->
        <div id="player-effects-display" class="player-effects-display">
          <h4>📊 HIỆU ỨNG CỦA BẠN</h4>
          <div id="my-effects-list" class="effects-list"></div>
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
        
        <!-- Effect popup -->
        <div id="effect-popup" class="effect-popup" style="display: none;">
          <div class="effect-popup-content">
            <h4 id="effect-popup-title">HIỆU ỨNG</h4>
            <div id="effect-popup-list" class="effect-popup-list"></div>
            <button id="close-effect-popup" class="close-effect-btn">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  main.appendChild(battleContainer);
  
  // Setup event listeners
  document.getElementById("exit-battle-btn").addEventListener("click", () => exitBattle(roomId));
  document.getElementById("end-turn-btn").addEventListener("click", () => handleEndTurn(roomId));
  document.getElementById("close-effect-popup").addEventListener("click", () => {
    document.getElementById("effect-popup").style.display = "none";
  });
  
  // Setup hand layout manager
  setTimeout(() => {
    handLayoutManager.setupResizeListener();
    updateBattleHandLayout();
  }, 300);
  
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
    
    // Apply deck-specific passives
    await applyDeckPassives(me, players, roomRef, currentUserUid);
    
    // Cập nhật lượt chơi
    isMyTurn = (turnUid === currentUserUid && me.alive);
    hasPlayedThisTurn = data.hasPlayedThisTurn || false;
    
    // Cập nhật thông tin header
    updateHeaderInfo(me);
    
    // Cập nhật turn banner
    updateTurnBanner(players, turnUid, isMyTurn);
    
    // Cập nhật player panel với effects
    updatePlayersPanel(players, isMyTurn, currentUserUid, turnUid);
    
    // Cập nhật bài trên tay
    updateHand(me, isMyTurn);
    setTimeout(() => {
      updateBattleHandLayout();
    }, 100);
    
    // Cập nhật bàn chơi
    updateBoard(data.board || [], players);
    
    // Xử lý lượt bắt đầu
    if (isMyTurn && !data.turnStarted) {
      await handleTurnStart(roomRef, players, me, data);
    }
    
    // Xử lý effects đầu lượt
    if (isMyTurn) {
      const expiredEffects = effectManager.processTurnStart(currentUserUid);
      if (expiredEffects > 0) {
        addLogMessage(`🔄 ${expiredEffects} hiệu ứng đã hết hạn`, "info");
      }
    }
    
    // Cập nhật nút bấm
    updateButtons();
    
    // Kiểm tra win
    const result = checkWin(players);
    if (result) {
      showWinMessage(result, roomId);
    }
  });
  
  // Setup event listeners for play and skip buttons
  setupButtonListeners(roomId);
}

// ========== DECK PASSIVES ==========
async function applyDeckPassives(me, players, roomRef, currentUserUid) {
  const deck = DeckManager.getDeck(me.deck);
  if (!deck) return;
  
  // JOL Passives
  if (me.deck === "JOL – ELVEN PRINCE" && !jolPassivesApplied) {
    // Battle Instinct: +1 lá khởi đầu
    if (me.deckCount > 0 && (me.hand?.length || 0) < STARTING_HAND_SIZE + 1) {
      const newCard = DeckManager.generateCard(me.deck);
      me.hand = [...(me.hand || []), newCard];
      me.deckCount--;
      addLogMessage(`🌟 ${me.name} kích hoạt Battle Instinct: +1 lá khởi đầu!`, "special");
      
      // Initialize mana fragments
      if (!me.manaFragments) {
        me.manaFragments = 0;
      }
      
      await updateDoc(roomRef, {
        players: players.map(p => p.uid === currentUserUid ? me : p)
      });
    }
    jolPassivesApplied = true;
  }
  
  // Sargula Passives
  if (me.deck === "Sargula - Void Punisher" && !sargulaPassivesApplied) {
    // Initialize void charge
    if (!me.voidCharge) {
      me.voidCharge = 0;
    }
    
    // Check for Void Form activation
    if (me.voidCharge >= 8 && !me.voidForm?.isActive) {
      me.voidForm = { isActive: true, duration: 1 };
      addLogMessage(`⚫ ${me.name} kích hoạt VOID FORM!`, "special");
      
      // Add Void Form effect
      const voidFormEffect = effectManager.createSargulaEffect(
        "Void Form Activation",
        "Void Form",
        { duration: 1 }
      );
      
      if (voidFormEffect) {
        effectManager.addEffect(currentUserUid, voidFormEffect);
      }
    }
    
    sargulaPassivesApplied = true;
  }
}

// ========== HEADER INFO ==========
function updateHeaderInfo(me) {
  document.getElementById("current-mana").textContent = me.mana || 0;
  document.getElementById("max-mana").textContent = me.maxMana || MANA_PER_TURN;
  document.getElementById("deck-count").textContent = me.deckCount || 0;
  document.getElementById("my-hp").textContent = me.health || 1000;
  document.getElementById("hand-count").textContent = `${me.hand?.length || 0}/${MAX_HAND_SIZE}`;
  
  // Update resource display based on deck
  const resourceDisplay = document.getElementById("resource-display");
  const resourceLabel = document.getElementById("resource-label");
  const resourceValue = document.getElementById("resource-value");
  
  if (me.deck === "JOL – ELVEN PRINCE") {
    resourceDisplay.style.display = "block";
    resourceLabel.textContent = "✨ Fragment";
    resourceValue.textContent = `${me.manaFragments || 0}/10`;
  } else if (me.deck === "Sargula - Void Punisher") {
    resourceDisplay.style.display = "block";
    resourceLabel.textContent = "⚫ Charge";
    resourceValue.textContent = `${me.voidCharge || 0}/8`;
  } else {
    resourceDisplay.style.display = "none";
  }
  
  // Update player effects display
  updateMyEffectsDisplay(me.uid);
}

// ========== PLAYER PANEL WITH EFFECTS ==========
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
    
    // Get player effects
    const playerEffects = effectManager.getPlayerEffects(p.uid);
    const effectsHtml = playerEffects.length > 0 ? `
      <div class="player-effects-icons">
        ${playerEffects.map(effect => `
          <div class="player-effect-icon ${effect.type}" 
               title="${effect.name}: ${effect.description}">
            ${effect.icon}
            ${effect.duration > 0 ? `<span class="effect-duration-small">${effect.duration}</span>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';
    
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
        
        ${p.manaFragments !== undefined ? `
          <div class="stat-item">
            <div class="stat-label-small">✨ Fragment</div>
            <div class="fragment-display">${p.manaFragments || 0}</div>
          </div>
        ` : ''}
        
        ${p.voidCharge !== undefined ? `
          <div class="stat-item">
            <div class="stat-label-small">⚫ Charge</div>
            <div class="charge-display">${p.voidCharge || 0}</div>
          </div>
        ` : ''}
      </div>
      
      <!-- Shield display -->
      <div class="shield-status">
        ${(p.shield || p.tempShield?.value) ? `
          <div class="shield-bar">
            <div class="shield-fill ${p.tempShield?.value ? 'temp' : ''}" 
                 style="width: ${Math.min(100, ((p.shield || 0) + (p.tempShield?.value || 0)) / 10)}%"></div>
          </div>
          <div class="shield-text">
            🛡️ Shield: ${p.shield || 0}${p.tempShield?.value ? ` (+${p.tempShield.value} tạm thời)` : ''}
          </div>
        ` : ''}
      </div>
      
      <!-- Effects display -->
      ${effectsHtml}
      
      <div class="player-info">
        <span class="info-item">🃏 ${p.hand?.length || 0}</span>
        <span class="info-item">📚 ${p.deckCount || 0}</span>
      </div>
      
      ${isDead ? `
        <div class="dead-overlay">
          <div class="dead-text">💀 THUA</div>
        </div>
      ` : ''}
      
      ${isTurn && p.alive ? `
        <div class="turn-glow"></div>
      ` : ''}
      
      <!-- Shield overlay nếu có shield -->
      ${(p.shield || p.tempShield?.value) ? `
        <div class="player-shield-overlay ${p.shield > 200 ? 'active' : ''}"></div>
      ` : ''}
    `;
    
    // Add effect popup on hover
    if (playerEffects.length > 0) {
      playerCard.addEventListener("mouseenter", () => {
        showEffectPopupForPlayer(p, playerEffects);
      });
    }
    
    // Sự kiện click chọn mục tiêu
    if (isMyTurn && !isMe && p.alive && !effectManager.hasModifier(p.uid, ModifierType.IMMUNE_TO_TARGETING)) {
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

// ========== EFFECT POPUP ==========
function showEffectPopupForPlayer(player, effects) {
  const popup = document.getElementById("effect-popup");
  const title = document.getElementById("effect-popup-title");
  const list = document.getElementById("effect-popup-list");
  
  title.textContent = `HIỆU ỨNG - ${player.name}`;
  
  if (!effects || effects.length === 0) {
    list.innerHTML = `<div class="no-effects">${player.name} không có hiệu ứng nào</div>`;
  } else {
    list.innerHTML = effects.map(effect => `
      <div class="effect-popup-item ${effect.type}">
        <div class="effect-popup-header">
          <span class="effect-popup-icon">${effect.icon}</span>
          <div>
            <strong>${effect.name}</strong>
            <div class="effect-popup-type">${getEffectTypeName(effect.type)}</div>
          </div>
        </div>
        <div class="effect-popup-desc">${effect.description}</div>
        ${effect.duration > 0 ? `
          <div class="effect-popup-info">
            <span>⏳ Còn lại: ${effect.duration}/${effect.maxDuration} lượt</span>
          </div>
        ` : ''}
        ${effect.stacks > 1 ? `
          <div class="effect-popup-info">
            <span>📊 Lớp: ${effect.stacks}/${effect.maxStacks}</span>
          </div>
        ` : ''}
        ${Object.keys(effect.modifiers).length > 0 ? `
          <div class="effect-popup-modifiers">
            ${Object.entries(effect.modifiers).map(([key, value]) => `
              <div class="modifier">
                ${getModifierLabel(key)}: ${value > 0 ? '+' : ''}${value}${key.includes('Percent') ? '%' : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${effect.deck ? `<div class="effect-popup-deck">Deck: ${effect.deck}</div>` : ''}
      </div>
    `).join('');
  }
  
  popup.style.display = "flex";
}

function updateMyEffectsDisplay(playerId) {
  const effectsList = document.getElementById("my-effects-list");
  const effects = effectManager.getPlayerEffects(playerId);
  
  if (!effects || effects.length === 0) {
    effectsList.innerHTML = '<div class="no-effects">Không có hiệu ứng</div>';
    return;
  }
  
  effectsList.innerHTML = effects.map(effect => `
    <div class="my-effect ${effect.type}" title="${effect.name}: ${effect.description}">
      <span class="my-effect-icon">${effect.icon}</span>
      <span class="my-effect-name">${effect.name}</span>
      ${effect.duration > 0 ? `<span class="my-effect-duration">${effect.duration}</span>` : ''}
    </div>
  `).join('');
}

// ========== HAND MANAGEMENT ==========
function updateHand(me, isMyTurn) {
  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";
  
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
  
  const displayLimit = 15;
  const cardsToDisplay = handCount > displayLimit 
    ? handCards.slice(0, displayLimit)
    : handCards;
  
  cardsToDisplay.forEach((card, index) => {
    const cardInfo = parseCardInfo(card, me.deck);
    const cardElement = document.createElement("div");
    cardElement.className = "battle-card stacked";
    
    if (selectedCard === card) cardElement.classList.add("selected");
    if (isMyTurn && (me.mana || 0) < cardInfo.cost) cardElement.classList.add("insufficient-mana");
    
    cardElement.innerHTML = `
      <div class="card-top ${cardInfo.type.toLowerCase()}">
        ${cardInfo.emoji}
      </div>
      <div class="card-content">
        <div class="card-name-battle">${cardInfo.name}</div>
        <div class="card-type-battle">${cardInfo.type}</div>
        ${cardInfo.isDeckCard ? `<div class="deck-badge">${cardInfo.deck.substring(0, 3)}</div>` : ''}
      </div>
      <div class="card-cost">${cardInfo.cost} 🔮</div>
      <div class="card-power ${cardInfo.power > 0 ? "damage" : "heal"}">
        ${cardInfo.power > 0 ? "+" : ""}${cardInfo.power}
      </div>
      <div class="card-tooltip">
        <div class="tooltip-title">${cardInfo.name}</div>
        <div class="tooltip-type ${cardInfo.type.toLowerCase()}">${cardInfo.type}</div>
        ${cardInfo.deck ? `<div class="deck-tooltip">${cardInfo.deck}</div>` : ''}
        <div class="tooltip-info">Mana: ${cardInfo.cost} | Sức mạnh: ${cardInfo.power}</div>
        <div class="tooltip-target">Mục tiêu: ${cardInfo.needsTarget ? 'Kẻ địch' : 'Bản thân'}</div>
        ${cardInfo.deckCardInfo?.description ? `
          <div class="tooltip-description">${cardInfo.deckCardInfo.description}</div>
        ` : ''}
      </div>
    `;
    
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

// ========== CARD PARSING ==========
function parseCardInfo(cardString, deckName = null) {
  return DeckManager.parseCardInfo(cardString, deckName);
}

// ========== BUTTON MANAGEMENT ==========
function setupButtonListeners(roomId) {
  const playBtn = document.getElementById("play-card-btn");
  const skipBtn = document.getElementById("skip-btn");
  
  playBtn.addEventListener("click", async () => {
    await handlePlayCard(roomId);
  });
  
  skipBtn.addEventListener("click", async () => {
    await handleSkipTurn(roomId);
  });
}

async function handlePlayCard(roomId) {
  if (!selectedCard || !isMyTurn) return;
  
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;
  
  const data = roomSnap.data();
  const players = data.players || [];
  const currentUserUid = auth.currentUser?.uid;
  
  const me = players.find(p => p.uid === currentUserUid);
  const targetPlayer = selectedTarget ? players.find(p => p.uid === selectedTarget) : null;
  
  if (!me) {
    addLogMessage("❌ Không tìm thấy thông tin người chơi!", "error");
    return;
  }
  
  const cardInfo = parseCardInfo(selectedCard, me.deck);
  
  // Kiểm tra mana
  if ((me.mana || 0) < cardInfo.cost) {
    addLogMessage(`❌ Không đủ mana! Cần ${cardInfo.cost} mana, bạn có ${me.mana || 0}`, "error");
    return;
  }
  
  // Kiểm tra target
  if (cardInfo.needsTarget && !selectedTarget) {
    addLogMessage("❌ Cần chọn mục tiêu!", "error");
    return;
  }
  
  if (cardInfo.needsTarget && targetPlayer && !targetPlayer.alive) {
    addLogMessage("❌ Mục tiêu đã thua!", "error");
    return;
  }
  
  // Kiểm tra immune to targeting
  if (targetPlayer && effectManager.hasModifier(targetPlayer.uid, ModifierType.IMMUNE_TO_TARGETING)) {
    addLogMessage(`🛡️ ${targetPlayer.name} đang miễn nhiễu với nhắm bắn!`, "error");
    return;
  }
  
  // Hiệu ứng đánh bài
  const targetName = targetPlayer ? targetPlayer.name : "Bản thân";
  playCardAnimation(selectedCard, me.name, targetName);
  
  // Áp dụng hiệu ứng card
  const updatedPlayers = await applyCardEffect(selectedCard, players, me.uid, selectedTarget);
  
  // Thêm vào lịch sử
  if (cardInfo.needsTarget && targetPlayer) {
    addLogMessage(`🎯 ${me.name} dùng "${cardInfo.name}" lên ${targetPlayer.name}`, "action");
  } else {
    addLogMessage(`✨ ${me.name} dùng "${cardInfo.name}" lên bản thân`, "action");
  }
  
  // Cập nhật Firebase
  try {
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
    
    // Cập nhật lại giao diện
    document.querySelectorAll(".battle-card.selected").forEach(card => {
      card.classList.remove("selected");
    });
    document.querySelectorAll(".player-battle-card.targeted").forEach(card => {
      card.classList.remove("targeted");
    });
    
    setTimeout(() => {
      updateBattleHandLayout();
    }, 150);
  } catch (error) {
    console.error("Lỗi khi đánh bài:", error);
    addLogMessage("❌ Lỗi khi đánh bài!", "error");
  }
}

async function handleSkipTurn(roomId) {
  if (!isMyTurn) return;
  
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;
  
  const data = roomSnap.data();
  const players = data.players || [];
  const currentUserUid = auth.currentUser?.uid;
  const me = players.find(p => p.uid === currentUserUid);
  
  if (!me) return;
  
  // Kiểm tra xem có thể đánh bài không
  const canPlayAnyCard = me.hand?.some(card => {
    const cardInfo = parseCardInfo(card, me.deck);
    return (me.mana || 0) >= cardInfo.cost;
  });
  
  if (canPlayAnyCard) {
    const confirmSkip = confirm("⚠️ Bạn vẫn còn bài có thể đánh!\n\nBạn có chắc muốn bỏ lượt?\n\nNếu muốn kết thúc lượt sau khi đã đánh bài, hãy dùng nút 'Kết thúc lượt'.");
    if (!confirmSkip) return;
  }
  
  addLogMessage(`⏭️ ${me.name} bỏ lượt`, "info");
  await handleEndTurn(roomId);
}

function updateButtons() {
  const playBtn = document.getElementById("play-card-btn");
  const skipBtn = document.getElementById("skip-btn");
  const endTurnBtn = document.getElementById("end-turn-btn");
  
  let needsTarget = true;
  let cardInfo = null;
  
  if (selectedCard) {
    cardInfo = parseCardInfo(selectedCard);
    needsTarget = cardInfo.needsTarget;
  }
  
  const canPlayCard = isMyTurn && selectedCard && (needsTarget ? selectedTarget : true);
  const canEndTurn = isMyTurn && hasPlayedThisTurn;
  
  playBtn.disabled = !canPlayCard;
  skipBtn.disabled = !isMyTurn;
  endTurnBtn.disabled = !canEndTurn;
  
  // Tooltips
  if (!isMyTurn) {
    playBtn.title = "Không phải lượt của bạn";
    playBtn.classList.remove("can-play");
  } else if (!selectedCard) {
    playBtn.title = "Chưa chọn bài";
    playBtn.classList.remove("can-play");
  } else if (needsTarget && !selectedTarget) {
    playBtn.title = "Chưa chọn mục tiêu";
    playBtn.classList.remove("can-play");
  } else {
    playBtn.title = "Đánh bài đã chọn";
    playBtn.classList.add("can-play");
    
    if (cardInfo && cardInfo.isDeckCard) {
      playBtn.title = `Dùng ${cardInfo.name}`;
    }
  }
}

// ========== CARD EFFECT APPLICATION ==========
async function applyCardEffect(cardString, players, fromUid, toUid) {
  const cardInfo = parseCardInfo(cardString);
  const fromPlayer = players.find(p => p.uid === fromUid);
  
  if (!fromPlayer) return players;
  
  let updatedPlayers = [...players];
  const playerIndex = updatedPlayers.findIndex(p => p.uid === fromUid);
  
  if (playerIndex === -1) return updatedPlayers;
  
  let player = { ...updatedPlayers[playerIndex] };
  
  // Trừ mana và xóa bài
  player.hand = player.hand.filter(card => card !== cardString);
  player.mana = Math.max(0, (player.mana || 0) - cardInfo.cost);
  
  // Xử lý deck-specific cards
  if (cardInfo.isDeckCard && cardInfo.deckCardInfo) {
    const deckCard = cardInfo.deckCardInfo;
    
    // Xử lý effects từ card
    if (deckCard.effects) {
      for (const effectData of deckCard.effects) {
        await processCardEffect(effectData, cardInfo, player, toUid, updatedPlayers);
      }
    }
    
    // Xử lý damage/heal cơ bản
    if (deckCard.type === "attack" && toUid && deckCard.power > 0) {
      const targetIndex = updatedPlayers.findIndex(p => p.uid === toUid);
      if (targetIndex !== -1) {
        let targetPlayer = { ...updatedPlayers[targetIndex] };
        
        // Tính toán damage với modifiers
        let damage = deckCard.power || 0;
        
        // Áp dụng damage modifiers
        const damageModifiers = effectManager.calculateModifiers(fromUid);
        if (deckCard.target === "single") {
          damage *= (1 + (damageModifiers[ModifierType.ATTACK_DAMAGE_PERCENT] || 0) / 100);
        } else if (deckCard.target === "multiple") {
          damage *= (1 + (damageModifiers[ModifierType.SPELL_DAMAGE_PERCENT] || 0) / 100);
        }
        
        // Áp dụng all damage modifier
        damage *= (1 + (damageModifiers[ModifierType.ALL_DAMAGE_PERCENT] || 0) / 100);
        
        // Gây damage
        targetPlayer = applyDamageWithModifiers(targetPlayer, Math.floor(damage), fromUid, updatedPlayers, cardInfo.name);
        updatedPlayers[targetIndex] = targetPlayer;
      }
    }
  } else {
    // Xử lý card generic
    updatedPlayers = applyGenericCardEffect(cardInfo, updatedPlayers, fromUid, toUid);
  }
  
  // Cập nhật player
  updatedPlayers[playerIndex] = player;
  
  return updatedPlayers;
}

async function processCardEffect(effectData, cardInfo, player, targetUid, allPlayers) {
  const deck = DeckManager.getDeck(player.deck);
  if (!deck) return;
  
  // Kiểm tra điều kiện
  if (effectData.condition) {
    const conditionMet = checkCondition(effectData.condition, player, allPlayers);
    if (!conditionMet) return;
  }
  
  // Xử lý cost (nếu có)
  if (effectData.cost) {
    if (effectData.cost.manaFragments && (player.manaFragments || 0) < effectData.cost.manaFragments) {
      return;
    }
    if (effectData.cost.voidCharge && (player.voidCharge || 0) < effectData.cost.voidCharge) {
      return;
    }
  }
  
  // Thực hiện action
  if (effectData.action) {
    const result = effectData.action(player, targetUid ? allPlayers.find(p => p.uid === targetUid) : null);
    
    if (result) {
      // Xử lý kết quả
      if (result.effect) {
        // Thêm effect vào manager
        effectManager.addEffect(player.uid, result.effect);
      }
      
      if (result.showNotification) {
        addLogMessage(result.showNotification, "special");
      }
      
      if (result.drawCards) {
        // Rút bài
        for (let i = 0; i < result.drawCards; i++) {
          if (player.deckCount > 0) {
            player.hand.push(DeckManager.generateCard(player.deck));
            player.deckCount--;
          }
        }
      }
      
      if (result.healSelf) {
        player.health = Math.min(player.maxHealth || 1000, (player.health || 1000) + result.healSelf);
      }
      
      if (result.manaReduction) {
        player.mana = Math.min(10, (player.mana || 0) + result.manaReduction);
      }
      
      if (result.bonusDamage) {
        // Xử lý bonus damage ở nơi khác
      }
    }
  }
  
  // Xử lý effect có sẵn trong effectData
  if (effectData.type === "buff" || effectData.type === "debuff") {
    let effect;
    
    if (player.deck === "JOL – ELVEN PRINCE") {
      effect = effectManager.createJolEffect(cardInfo.name, effectData.name || "Custom Effect", effectData);
    } else if (player.deck === "Sargula - Void Punisher") {
      effect = effectManager.createSargulaEffect(cardInfo.name, effectData.name || "Custom Effect", effectData);
    } else {
      effect = effectManager.createEffectFromDeckCard(
        cardInfo.name,
        player.deck,
        effectData
      );
    }
    
    if (effect) {
      effectManager.addEffect(player.uid, effect);
    }
  }
}

function checkCondition(conditionType, player, allPlayers) {
  switch(conditionType) {
    case "ifManaFragmentsLessThan2":
      return (player.manaFragments || 0) < 2;
    case "ifManaFragmentsAtLeast2":
      return (player.manaFragments || 0) >= 2;
    case "inVoidForm":
      return player.voidForm?.isActive || false;
    case "ifFirstCardInTurn":
      return player.turnState?.firstCardPlayed === false;
    case "ifMaxManaAtLeast10":
      return (player.maxMana || 4) >= 10;
    case "isLowestHPPlayer":
      return allPlayers.filter(p => p.alive).every(other => 
        player.health <= other.health
      );
    case "healthBelow25Percent":
      return (player.health || 1000) <= 250;
    case "ifKillDuringAvatar":
      return player.avatarActive?.active && player.lastKill;
    case "ifKillTarget":
      return player.lastKill;
    case "enemyDiedLastTurn":
      return player.enemiesDiedLastTurn > 0;
    default:
      return true;
  }
}

// ========== DAMAGE CALCULATION WITH MODIFIERS ==========
function applyDamageWithModifiers(player, damage, fromUid, allPlayers, cardName) {
  let effectiveDamage = damage;
  const fromPlayer = allPlayers.find(p => p.uid === fromUid);
  
  // Lấy modifiers của target
  const targetModifiers = effectManager.calculateModifiers(player.uid);
  
  // Áp dụng damage taken modifier
  const damageTakenMod = targetModifiers[ModifierType.DAMAGE_TAKEN_PERCENT] || 0;
  effectiveDamage *= (1 + damageTakenMod / 100);
  
  // Áp dụng damage reduction
  const damageReduction = targetModifiers[ModifierType.DAMAGE_REDUCTION_PERCENT] || 0;
  effectiveDamage *= Math.max(0, (100 - damageReduction) / 100);
  
  // Áp dụng shield piercing
  const shieldPiercing = fromPlayer ? effectManager.getModifierValue(fromUid, ModifierType.SHIELD_PIERCING) || 0 : 0;
  
  // Xử lý shield
  if (player.shield && player.shield > 0) {
    const pierceAmount = Math.floor(player.shield * (shieldPiercing / 100));
    const remainingShield = player.shield - pierceAmount;
    
    if (remainingShield >= effectiveDamage) {
      player.shield -= effectiveDamage;
      effectiveDamage = 0;
      addLogMessage(`🛡️ ${player.name} chặn ${damage} damage bằng Shield (${pierceAmount} bị xuyên)`, "defense");
    } else {
      effectiveDamage -= remainingShield;
      player.shield = 0;
      addLogMessage(`🛡️ ${player.name} chặn ${remainingShield} damage bằng Shield (${pierceAmount} bị xuyên)`, "defense");
    }
  }
  
  // Áp dụng temp shield
  if (player.tempShield && player.tempShield.value > 0 && effectiveDamage > 0) {
    if (player.tempShield.value >= effectiveDamage) {
      player.tempShield.value -= effectiveDamage;
      effectiveDamage = 0;
      addLogMessage(`🛡️ ${player.name} chặn ${damage} damage bằng Temp Shield`, "defense");
    } else {
      effectiveDamage -= player.tempShield.value;
      addLogMessage(`🛡️ ${player.name} chặn ${player.tempShield.value} damage bằng Temp Shield`, "defense");
      player.tempShield.value = 0;
    }
  }
  
  // Áp dụng damage
  if (effectiveDamage > 0) {
    player.health = Math.max(0, (player.health || 1000) - Math.floor(effectiveDamage));
    addLogMessage(`⚔️ ${player.name} nhận ${Math.floor(effectiveDamage)} damage từ ${cardName}`, "damage");
    
    // Kiểm tra lifesteal
    if (fromPlayer) {
      const lifestealPercent = effectManager.getModifierValue(fromUid, ModifierType.LIFESTEAL_PERCENT) || 0;
      if (lifestealPercent > 0) {
        const healAmount = Math.floor(effectiveDamage * (lifestealPercent / 100));
        fromPlayer.health = Math.min(fromPlayer.maxHealth || 1000, (fromPlayer.health || 1000) + healAmount);
        addLogMessage(`🩸 ${fromPlayer.name} hút ${healAmount} HP`, "heal");
      }
    }
  }
  
  // Kiểm tra tử vong
  if (player.health <= 0) {
    player.alive = false;
    player.health = 0;
    addLogMessage(`💀 ${player.name} đã thua!`, "death");
    
    // Kích hoạt trigger onKill
    if (fromPlayer) {
      const effects = effectManager.getPlayerEffects(fromUid);
      effects.forEach(effect => {
        if (effect.triggers.onKill) {
          effect.trigger('onKill', { 
            playerId: fromUid, 
            effect, 
            killedPlayer: player 
          });
        }
      });
      
      // Cập nhật lastKill cho các điều kiện
      fromPlayer.lastKill = true;
    }
  }
  
  return player;
}

// ========== GENERIC CARD EFFECTS ==========
function applyGenericCardEffect(cardInfo, players, fromUid, toUid) {
  let updatedPlayers = [...players];
  const fromPlayer = updatedPlayers.find(p => p.uid === fromUid);
  const toPlayer = toUid ? updatedPlayers.find(p => p.uid === toUid) : null;
  
  if (!fromPlayer || (toUid && !toPlayer)) return updatedPlayers;
  
  // Xử lý cho mục tiêu
  if (toUid) {
    const targetIndex = updatedPlayers.findIndex(p => p.uid === toUid);
    if (targetIndex !== -1) {
      let targetPlayer = { ...updatedPlayers[targetIndex] };
      
      switch(cardInfo.type.toLowerCase()) {
        case "attack":
          targetPlayer = applyDamageWithModifiers(targetPlayer, cardInfo.power, fromUid, updatedPlayers, cardInfo.name);
          break;
          
        case "defense":
          if (fromUid === toUid) {
            targetPlayer.shield = (targetPlayer.shield || 0) + Math.floor(cardInfo.power * 0.5);
            addLogMessage(`🛡️ ${targetPlayer.name} nhận ${Math.floor(cardInfo.power * 0.5)} Shield từ ${cardInfo.name}`, "defense");
          }
          break;
          
        case "heal":
          targetPlayer.health = Math.min(2000, (targetPlayer.health || 1000) + cardInfo.power);
          addLogMessage(`❤️ ${targetPlayer.name} hồi ${cardInfo.power} HP từ ${cardInfo.name}`, "heal");
          break;
          
        case "mana":
          targetPlayer.mana = Math.min(10, (targetPlayer.mana || 0) + Math.floor(cardInfo.power / 50));
          addLogMessage(`🔮 ${targetPlayer.name} nhận ${Math.floor(cardInfo.power / 50)} Mana từ ${cardInfo.name}`, "mana");
          break;
          
        case "draw":
          if (targetPlayer.deckCount > 0) {
            const newCard = DeckManager.generateCard(targetPlayer.deck);
            targetPlayer.hand = [...targetPlayer.hand, newCard];
            targetPlayer.deckCount--;
            addLogMessage(`🎴 ${targetPlayer.name} rút 1 lá từ ${cardInfo.name}`, "draw");
          }
          break;
      }
      
      updatedPlayers[targetIndex] = targetPlayer;
    }
  }
  
  return updatedPlayers;
}

// ========== TURN MANAGEMENT ==========
async function handleTurnStart(roomRef, players, me, data) {
  const currentUserUid = auth.currentUser?.uid;
  
  // Reset một số buffs ở đầu lượt
  if (me.lastKill) {
    me.lastKill = false;
  }
  
  // Giảm duration của temp shield
  if (me.tempShield && me.tempShield.duration > 0) {
    me.tempShield.duration--;
    if (me.tempShield.duration <= 0 && me.tempShield.value > 0) {
      addLogMessage(`🛡️ ${me.name} mất ${me.tempShield.value} Temp Shield!`, "defense");
      me.tempShield.value = 0;
    }
  }
  
  // Rút bài nếu deck còn
  if ((me.deckCount || 0) > 0 && (me.hand?.length || 0) < MAX_HAND_SIZE) {
    const newCard = DeckManager.generateCard(me.deck);
    me.hand = [...(me.hand || []), newCard];
    me.deckCount = Math.max(0, (me.deckCount || 0) - 1);
  }
  
  me.mana = MANA_PER_TURN;
  me.maxMana = 10;
  
  // Reset turn state
  me.turnState = { firstCardPlayed: false };
  
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
  
  // Xử lý effects cuối lượt
  effectManager.processTurnEnd(currentUserUid);
  
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
  
  setTimeout(() => {
    updateBattleHandLayout();
  }, 100);
}

// ========== HELPER FUNCTIONS ==========
function getEffectTypeName(type) {
  const types = {
    buff: "BUFF (Tăng cường)",
    debuff: "DEBUFF (Yếu đuối)",
    stance: "HÌNH THÁI",
    aura: "AURA",
    mark: "ĐÁNH DẤU",
    curse: "NGUYỀN",
    passive: "BỊ ĐỘNG"
  };
  return types[type] || type.toUpperCase();
}

function getModifierLabel(key) {
  const labels = {
    // Damage
    [ModifierType.ATTACK_DAMAGE_PERCENT]: "⚔️ Sát thương tấn công",
    [ModifierType.SPELL_DAMAGE_PERCENT]: "🔮 Sát thương phép",
    [ModifierType.ALL_DAMAGE_PERCENT]: "💥 Tổng sát thương",
    [ModifierType.DAMAGE_TAKEN_PERCENT]: "🎯 Sát thương nhận",
    
    // Defense
    [ModifierType.DAMAGE_REDUCTION_PERCENT]: "🛡️ Giảm sát thương",
    [ModifierType.DODGE_CHANCE]: "🌀 Tỉ lệ né",
    [ModifierType.BLOCK_AMOUNT]: "🛡️ Lượng block",
    
    // Healing
    [ModifierType.HEALING_RECEIVED_PERCENT]: "❤️ Lượng hồi máu",
    [ModifierType.LIFESTEAL_PERCENT]: "🩸 Tỉ lệ hút máu",
    [ModifierType.HP_REGEN]: "💚 HP hồi/lượt",
    
    // Mana
    [ModifierType.MANA_COST_REDUCTION_PERCENT]: "🔋 Giảm tiêu hao mana",
    [ModifierType.MAX_MANA_INCREASE]: "🔮 Max mana",
    [ModifierType.MANA_REGEN]: "💙 Mana hồi/lượt",
    
    // Card
    [ModifierType.DRAW_BONUS]: "🎴 Bài rút thêm",
    [ModifierType.MAX_HAND_SIZE]: "🃏 Max bài trên tay",
    [ModifierType.DISCARD_PENALTY_REDUCTION]: "🗑️ Giảm penalty discard",
    
    // Shield
    [ModifierType.SHIELD_BONUS]: "🛡️ Lượng khiên",
    [ModifierType.SHIELD_PIERCING]: "⚡ Xuyên khiên",
    [ModifierType.SHIELD_EFFECTIVENESS]: "🛡️ Hiệu quả khiên",
    
    // Special
    [ModifierType.IMMUNE_TO_TARGETING]: "👁️ Miễn nhắm bắn",
    [ModifierType.IMMUNE_TO_DEBUFFS]: "🛡️ Miễn debuff",
    [ModifierType.TAUNT]: "🤬 Buộc tấn công",
    [ModifierType.REFLECT_PERCENT]: "↩️ Phản sát thương",
    [ModifierType.COUNTER_CHANCE]: "⚔️ Phản đòn",
    
    // Deck mechanics
    [ModifierType.MANA_FRAGMENT_GAIN]: "✨ Mana Fragment",
    [ModifierType.VOID_CHARGE_GAIN]: "⚫ Void Charge",
    [ModifierType.EXTEND_DURATION]: "⏱️ Kéo dài",
    [ModifierType.RESET_DURATION]: "🔄 Reset duration"
  };
  
  return labels[key] || key;
}

function updateTurnBanner(players, turnUid, isMyTurn) {
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
}

// ========== WIN/LOSE CHECK ==========
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

// ========== ANIMATIONS & UI ==========
function playCardAnimation(cardName, fromName, toName) {
  const animationDiv = document.createElement("div");
  animationDiv.className = "card-animation";
  
  const cardInfo = parseCardInfo(cardName);
  const cardEmoji = DeckManager.getCardEmoji(cardInfo.type.toLowerCase());
  
  animationDiv.innerHTML = `
    <div class="animation-card ${cardInfo.type.toLowerCase()}">
      ${cardEmoji}
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

// ========== LOG MESSAGES ==========
function addLogMessage(message, type = "info") {
  if (!document.getElementById("log-messages")) {
    if (!window.tempBattleLogs) {
      window.tempBattleLogs = [];
    }
    window.tempBattleLogs.push({ message, type, time: new Date() });
    console.log(`[${type}] ${message}`);
    return;
  }
  
  const logDiv = document.getElementById("log-messages");
  if (!logDiv) {
    console.log(`[${type}] ${message}`);
    return;
  }
  
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  entry.innerHTML = `<span class="log-time">${time}</span> ${message}`;
  
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
  
  if (window.tempBattleLogs && window.tempBattleLogs.length > 0) {
    window.tempBattleLogs.forEach(log => {
      const tempEntry = document.createElement("div");
      tempEntry.className = `log-entry ${log.type}`;
      const tempTime = new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      tempEntry.innerHTML = `<span class="log-time">${tempTime}</span> ${log.message}`;
      logDiv.insertBefore(tempEntry, logDiv.firstChild);
    });
    window.tempBattleLogs = [];
  }
}

// ========== BOARD UPDATE ==========
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
        ${cardInfo.emoji}
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

// ========== EXIT BATTLE ==========
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

// Export effectManager để dùng ở file khác
export { effectManager };