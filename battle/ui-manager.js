// ==== ui-manager.js ====
import { effectManager } from './effect-system.js';


export function createEffectIcons(effects, playerId) {
  if (!effects || effects.length === 0) return '';
  
  // Chỉ hiển thị tối đa 5 icon
  const displayEffects = effects.slice(0, 5);
  
  return displayEffects.map(effect => `
    <div class="effect-icon ${effect.type}" 
         title="${effect.name} - ${effect.description}"
         data-effect-id="${effect.id}"
         data-player-id="${playerId}">
      ${effect.icon}
      ${effect.duration > 0 ? `<span class="effect-duration">${effect.duration}</span>` : ''}
      ${effect.stacks > 1 ? `<span class="effect-stacks">${effect.stacks}</span>` : ''}
    </div>
  `).join('');
}

export function showEffectPopup(effects, playerName) {
  const popup = document.getElementById('effect-popup');
  const list = document.getElementById('effect-popup-list');
  
  if (!effects || effects.length === 0) {
    list.innerHTML = `<div class="no-effects">${playerName} không có hiệu ứng nào</div>`;
  } else {
    list.innerHTML = effects.map(effect => `
      <div class="effect-item ${effect.type}">
        <div class="effect-header">
          <span class="effect-icon-large">${effect.icon}</span>
          <div>
            <strong>${effect.name}</strong>
            <div class="effect-type">${getEffectTypeName(effect.type)}</div>
          </div>
        </div>
        <div class="effect-desc">${effect.description}</div>
        ${effect.duration > 0 ? `
          <div class="effect-info">
            <span>⏳ Còn lại: ${effect.duration}/${effect.maxDuration} lượt</span>
          </div>
        ` : ''}
        ${effect.stacks > 1 ? `
          <div class="effect-info">
            <span>📊 Lớp: ${effect.stacks}/${effect.maxStacks}</span>
          </div>
        ` : ''}
        ${Object.keys(effect.modifiers).length > 0 ? `
          <div class="effect-modifiers">
            ${Object.entries(effect.modifiers).map(([key, value]) => `
              <div class="modifier">
                ${getModifierLabel(key)}: ${value > 0 ? '+' : ''}${value}${key.includes('Percent') ? '%' : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  }
  
  popup.style.display = 'flex';
}

function getEffectTypeName(type) {
  const types = {
    buff: "BUFF (Tăng cường)",
    debuff: "DEBUFF (Yếu đuối)",
    stance: "HÌNH THÁI",
    aura: "AURA"
  };
  return types[type] || type.toUpperCase();
}

function getModifierLabel(key) {
  const labels = {
    attackDamagePercent: "⚔️ Sát thương tấn công",
    spellDamagePercent: "🔮 Sát thương phép",
    damageReductionPercent: "🛡️ Giảm sát thương",
    healingReceivedPercent: "❤️ Lượng hồi máu",
    shieldBonus: "🛡️ Khiên",
    drawBonus: "🎴 Bài rút thêm"
  };
  return labels[key] || key;
}

export function showMechanicInfo(player) {
  const deck = player.deck;
  let description = "";
  
  switch(deck) {
    case "JOL – ELVEN PRINCE":
      description = `
        <strong>✨ Mana Fragment</strong><br>
        • Tối đa: 10 fragment<br>
        • Dùng để kích hoạt kỹ năng mạnh<br>
        • Hiện có: ${player.keyMechanic?.current || 0}/10<br>
        • <em>Cách tích lũy:</em><br>
        &nbsp;&nbsp;• Quick Slash (đánh đầu lượt)<br>
        &nbsp;&nbsp;• Nature's Shield (khi có <2 fragment)<br>
        &nbsp;&nbsp;• Forest Guidance (+1 fragment)<br>
      `;
      break;
    case "Sargula - Void Punisher":
      description = `
        <strong>⚫ Void Charge</strong><br>
        • Tối đa: 8 charge<br>
        • Khi đủ 8: vào Void Form<br>
        • Hiện có: ${player.keyMechanic?.current || 0}/8<br>
        • <em>Cách tích lũy:</em><br>
        &nbsp;&nbsp;• Void Scythe (3 đòn = +2 charge)<br>
        &nbsp;&nbsp;• Sacrificial Ritual (hy sinh bài)<br>
        &nbsp;&nbsp;• Abyss Pain (tự gây sát thương)<br>
      `;
      break;
    default:
      description = "Không có cơ chế đặc biệt";
  }
  
  // Tạo popup tạm thời
  const popup = document.createElement('div');
  popup.className = 'mechanic-popup';
  popup.innerHTML = `
    <div class="mechanic-popup-content">
      <h4>${player.name} - ${deck}</h4>
      <div class="mechanic-description">${description}</div>
      <button class="close-mechanic">Đóng</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Close button
  popup.querySelector('.close-mechanic').addEventListener('click', () => {
    document.body.removeChild(popup);
  });
  
  // Click outside to close
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      document.body.removeChild(popup);
    }
  });
}