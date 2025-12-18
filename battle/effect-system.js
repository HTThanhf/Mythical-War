// ==== effect-system.js ====
// HỆ THỐNG QUẢN LÝ HIỆU ỨNG (BUFF/DEBUFF/AURA/STANCE) - TÍCH HỢP VỚI DECK

// ========== ENUMS & CONSTANTS ==========
export const EffectType = {
  BUFF: 'buff',           // Hiệu ứng tích cực
  DEBUFF: 'debuff',       // Hiệu ứng tiêu cực
  STANCE: 'stance',       // Hình thái (chỉ 1 active)
  AURA: 'aura',           // Aura ảnh hưởng xung quanh
  MARK: 'mark',           // Đánh dấu
  CURSE: 'curse',         // Lời nguyền
  PASSIVE: 'passive'      // Bị động
};

// Modifier types tương thích với deck system
export const ModifierType = {
  // Damage modifiers (phù hợp với JOL & Sargula)
  ATTACK_DAMAGE_PERCENT: 'attackDamagePercent',      // JOL: Nature's Fury
  SPELL_DAMAGE_PERCENT: 'spellDamagePercent',        // JOL: Eternal Wisdom
  ALL_DAMAGE_PERCENT: 'allDamagePercent',            // Sargula: Void Form
  DAMAGE_TAKEN_PERCENT: 'damageTakenPercent',        // Tăng damage nhận (marked target)
  
  // Defense modifiers
  DAMAGE_REDUCTION_PERCENT: 'damageReductionPercent', // JOL: Avatar
  DODGE_CHANCE: 'dodgeChance',                       // JOL: Blink Step
  BLOCK_AMOUNT: 'blockAmount',                       // Block damage
  
  // Healing & Life modifiers
  HEALING_RECEIVED_PERCENT: 'healingReceivedPercent', // JOL: Avatar lifesteal
  LIFESTEAL_PERCENT: 'lifestealPercent',             // JOL: Split Wood
  HP_REGEN: 'hpRegen',                               // Hồi HP mỗi lượt
  
  // Resource modifiers
  MANA_COST_REDUCTION_PERCENT: 'manaCostReductionPercent', // JOL: Swift Strike
  MAX_MANA_INCREASE: 'maxManaIncrease',               // JOL: Mana Growth
  MANA_REGEN: 'manaRegen',                           // Hồi mana mỗi lượt
  
  // Card draw & hand modifiers
  DRAW_BONUS: 'drawBonus',                           // JOL: Eternal Wisdom
  MAX_HAND_SIZE: 'maxHandSize',                      // Tăng max hand size
  DISCARD_PENALTY_REDUCTION: 'discardPenaltyReduction', // Giảm penalty khi discard
  
  // Shield modifiers
  SHIELD_BONUS: 'shieldBonus',                       // JOL: Nature's Shield, Avatar
  SHIELD_PIERCING: 'shieldPiercing',                 // Sargula: Void Form
  SHIELD_EFFECTIVENESS: 'shieldEffectiveness',       // Hiệu quả shield
  
  // Special modifiers (cho deck mechanics)
  IMMUNE_TO_TARGETING: 'immuneToTargeting',          // JOL: Avatar, Forest Solitude
  IMMUNE_TO_DEBUFFS: 'immuneToDebuffs',              // Miễn debuff
  TAUNT: 'taunt',                                    // Buộc tấn công
  REFLECT_PERCENT: 'reflectPercent',                 // Phản damage
  COUNTER_CHANCE: 'counterChance',                   // Phản đòn
  
  // Deck-specific mechanics
  MANA_FRAGMENT_GAIN: 'manaFragmentGain',            // JOL: + fragment
  VOID_CHARGE_GAIN: 'voidChargeGain',                // Sargula: + charge
  EXTEND_DURATION: 'extendDuration',                 // Kéo dài duration
  RESET_DURATION: 'resetDuration'                    // Reset duration
};

// ========== EFFECT CLASS ==========
export class Effect {
  constructor(data) {
    // Basic info
    this.id = data.id || `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = data.name || 'Unnamed Effect';
    this.icon = data.icon || this._getDefaultIcon(data.type);
    this.type = data.type || EffectType.BUFF;
    this.description = data.description || '';
    this.source = data.source || 'unknown'; // 'card', 'ability', 'passive'
    this.sourceId = data.sourceId; // ID của card/ability tạo effect
    this.deck = data.deck || null; // Deck tạo effect (JOL/Sargula)
    
    // Duration & Stacking
    this.duration = data.duration ?? 1; // null/undefined = vĩnh viễn (stance)
    this.maxDuration = data.maxDuration || this.duration;
    this.stacks = data.stacks || 1;
    this.maxStacks = data.maxStacks || 1;
    this.isStackable = data.isStackable ?? (data.maxStacks > 1);
    
    // Modifiers (ảnh hưởng đến stats)
    this.modifiers = data.modifiers || {};
    
    // Conditions & Triggers (cho deck mechanics)
    this.conditions = data.conditions || {};
    this.triggers = data.triggers || {
      onApply: data.onApply,         // Khi apply effect
      onRemove: data.onRemove,       // Khi remove effect
      onTurnStart: data.onTurnStart, // Đầu lượt
      onTurnEnd: data.onTurnEnd,     // Cuối lượt
      onDamageDealt: data.onDamageDealt, // Khi gây damage
      onDamageTaken: data.onDamageTaken, // Khi nhận damage
      onCardPlay: data.onCardPlay,   // Khi đánh bài
      onCardDraw: data.onCardDraw,   // Khi rút bài
      onKill: data.onKill,           // Khi hạ mục tiêu
      onDeath: data.onDeath          // Khi chết
    };
    
    // Visual & UI
    this.color = data.color || this._getTypeColor(data.type);
    this.priority = data.priority || 0; // Độ ưu tiên hiển thị
    this.showOnPlayer = data.showOnPlayer !== false; // Hiển thị trên player UI
    this.tooltip = data.tooltip || '';
    
    // State
    this.appliedAt = Date.now();
    this.lastUpdated = Date.now();
    this.isExpired = false;
  }
  
  // Lấy màu theo type
  _getTypeColor(type) {
    const colors = {
      [EffectType.BUFF]: '#4CAF50',      // Xanh lá
      [EffectType.DEBUFF]: '#F44336',    // Đỏ
      [EffectType.STANCE]: '#2196F3',    // Xanh dương
      [EffectType.AURA]: '#FF9800',      // Cam
      [EffectType.MARK]: '#9C27B0',      // Tím
      [EffectType.CURSE]: '#795548',     // Nâu
      [EffectType.PASSIVE]: '#607D8B'    // Xám
    };
    return colors[type] || '#FFFFFF';
  }
  
  // Lấy icon mặc định theo type
  _getDefaultIcon(type) {
    const icons = {
      [EffectType.BUFF]: '⬆️',
      [EffectType.DEBUFF]: '⬇️',
      [EffectType.STANCE]: '🔄',
      [EffectType.AURA]: '💫',
      [EffectType.MARK]: '🎯',
      [EffectType.CURSE]: '☠️',
      [EffectType.PASSIVE]: '⚙️'
    };
    return icons[type] || '✨';
  }
  
  // Giảm duration
  reduceDuration() {
    if (this.duration === null || this.duration === undefined) {
      return false; // Vĩnh viễn
    }
    
    if (this.duration > 0) {
      this.duration--;
      this.lastUpdated = Date.now();
      
      if (this.duration <= 0) {
        this.isExpired = true;
        return true; // Đã hết
      }
    }
    return false;
  }
  
  // Thêm stack
  addStack(amount = 1) {
    if (this.isStackable && this.stacks < this.maxStacks) {
      this.stacks = Math.min(this.maxStacks, this.stacks + amount);
      this.lastUpdated = Date.now();
      return true;
    }
    return false;
  }
  
  // Lấy giá trị modifier
  getModifierValue(key) {
    const baseValue = this.modifiers[key] || 0;
    return baseValue * this.stacks; // Nhân với số stack
  }
  
  // Kiểm tra điều kiện
  checkCondition(conditionType, context) {
    if (!this.conditions[conditionType]) return true;
    
    // Các điều kiện phổ biến cho deck
    switch(conditionType) {
      case 'ifManaFragmentsAtLeast':
        return (context.player.manaFragments || 0) >= this.conditions.ifManaFragmentsAtLeast;
      case 'ifVoidChargeAtLeast':
        return (context.player.voidCharge || 0) >= this.conditions.ifVoidChargeAtLeast;
      case 'ifInVoidForm':
        return context.player.voidForm?.isActive || false;
      case 'ifStanceActive':
        return context.player.stances?.[this.conditions.ifStanceActive]?.isActive || false;
      case 'ifHealthBelowPercent':
        const maxHealth = context.player.maxHealth || 1000;
        const currentHealth = context.player.health || maxHealth;
        return (currentHealth / maxHealth * 100) < this.conditions.ifHealthBelowPercent;
      case 'ifHasMarkedTarget':
        return !!context.player.markedTarget;
      case 'ifFirstCardInTurn':
        return context.isFirstCardInTurn || false;
      case 'ifKilledTarget':
        return context.killedTarget || false;
      default:
        return true;
    }
  }
  
  // Kích hoạt trigger
  trigger(eventType, context) {
    if (this.triggers[eventType]) {
      return this.triggers[eventType](context);
    }
    return null;
  }
  
  // Tạo HTML cho tooltip
  getTooltipHTML() {
    const durationText = this.duration === null ? '⏳ Vĩnh viễn' : `⏳ ${this.duration}/${this.maxDuration} lượt`;
    const stackText = this.stacks > 1 ? `📊 ${this.stacks}/${this.maxStacks} lớp` : '';
    
    const modifierHTML = Object.entries(this.modifiers)
      .map(([key, value]) => {
        const label = this._getModifierLabel(key);
        const displayValue = value > 0 ? `+${value}` : value;
        const unit = key.includes('Percent') ? '%' : '';
        return `<div class="modifier">${label}: ${displayValue}${unit}</div>`;
      })
      .join('');
    
    return `
      <div class="effect-tooltip ${this.type}">
        <div class="effect-header">
          <span class="effect-icon" style="color: ${this.color}">${this.icon}</span>
          <strong>${this.name}</strong>
          ${this.deck ? `<span class="effect-deck">${this.deck}</span>` : ''}
        </div>
        <div class="effect-desc">${this.description}</div>
        ${this.duration !== null ? `<div class="effect-duration">${durationText}</div>` : ''}
        ${stackText ? `<div class="effect-stacks">${stackText}</div>` : ''}
        ${modifierHTML ? `
          <div class="effect-modifiers">
            <div class="modifiers-title">📈 Hiệu ứng:</div>
            ${modifierHTML}
          </div>
        ` : ''}
        ${this.source ? `<div class="effect-source">🎯 Nguồn: ${this.source}</div>` : ''}
      </div>
    `;
  }
  
  // Lấy label cho modifier
  _getModifierLabel(key) {
    const labels = {
      // Damage
      [ModifierType.ATTACK_DAMAGE_PERCENT]: '⚔️ Sát thương tấn công',
      [ModifierType.SPELL_DAMAGE_PERCENT]: '🔮 Sát thương phép',
      [ModifierType.ALL_DAMAGE_PERCENT]: '💥 Tổng sát thương',
      [ModifierType.DAMAGE_TAKEN_PERCENT]: '🎯 Sát thương nhận',
      
      // Defense
      [ModifierType.DAMAGE_REDUCTION_PERCENT]: '🛡️ Giảm sát thương',
      [ModifierType.DODGE_CHANCE]: '🌀 Tỉ lệ né',
      [ModifierType.BLOCK_AMOUNT]: '🛡️ Lượng block',
      
      // Healing
      [ModifierType.HEALING_RECEIVED_PERCENT]: '❤️ Lượng hồi máu',
      [ModifierType.LIFESTEAL_PERCENT]: '🩸 Tỉ lệ hút máu',
      [ModifierType.HP_REGEN]: '💚 HP hồi/lượt',
      
      // Mana
      [ModifierType.MANA_COST_REDUCTION_PERCENT]: '🔋 Giảm tiêu hao mana',
      [ModifierType.MAX_MANA_INCREASE]: '🔮 Max mana',
      [ModifierType.MANA_REGEN]: '💙 Mana hồi/lượt',
      
      // Card
      [ModifierType.DRAW_BONUS]: '🎴 Bài rút thêm',
      [ModifierType.MAX_HAND_SIZE]: '🃏 Max bài trên tay',
      [ModifierType.DISCARD_PENALTY_REDUCTION]: '🗑️ Giảm penalty discard',
      
      // Shield
      [ModifierType.SHIELD_BONUS]: '🛡️ Lượng khiên',
      [ModifierType.SHIELD_PIERCING]: '⚡ Xuyên khiên',
      [ModifierType.SHIELD_EFFECTIVENESS]: '🛡️ Hiệu quả khiên',
      
      // Special
      [ModifierType.IMMUNE_TO_TARGETING]: '👁️ Miễn nhắm bắn',
      [ModifierType.IMMUNE_TO_DEBUFFS]: '🛡️ Miễn debuff',
      [ModifierType.TAUNT]: '🤬 Buộc tấn công',
      [ModifierType.REFLECT_PERCENT]: '↩️ Phản sát thương',
      [ModifierType.COUNTER_CHANCE]: '⚔️ Phản đòn',
      
      // Deck mechanics
      [ModifierType.MANA_FRAGMENT_GAIN]: '✨ Mana Fragment',
      [ModifierType.VOID_CHARGE_GAIN]: '⚫ Void Charge',
      [ModifierType.EXTEND_DURATION]: '⏱️ Kéo dài',
      [ModifierType.RESET_DURATION]: '🔄 Reset duration'
    };
    
    return labels[key] || key;
  }
}

// ========== EFFECT MANAGER ==========
export class EffectManager {
  constructor() {
    this.effects = new Map(); // playerId -> Array<Effect>
    this.globalEffects = [];  // Effects ảnh hưởng toàn trận
    this.eventListeners = new Map();
  }
  
  // ===== PLAYER EFFECTS =====
  
  // Thêm effect cho player
  addEffect(playerId, effectData) {
    if (!this.effects.has(playerId)) {
      this.effects.set(playerId, []);
    }
    
    const playerEffects = this.effects.get(playerId);
    
    // Kiểm tra nếu effect đã tồn tại (cho stackable)
    const existingEffect = playerEffects.find(e => 
      e.name === effectData.name && 
      e.source === effectData.source &&
      e.isStackable
    );
    
    if (existingEffect && effectData.isStackable) {
      // Stack effect
      if (existingEffect.addStack()) {
        // Update duration nếu effect mới có duration dài hơn
        if (effectData.duration !== null && existingEffect.duration !== null) {
          if (effectData.duration > existingEffect.duration) {
            existingEffect.duration = effectData.duration;
            existingEffect.maxDuration = effectData.maxDuration || effectData.duration;
          }
        }
        
        // Trigger onApply nếu có
        if (existingEffect.triggers.onApply) {
          existingEffect.trigger('onApply', { playerId, effect: existingEffect });
        }
        
        return existingEffect;
      }
    } else {
      // Thêm effect mới
      const effect = new Effect(effectData);
      playerEffects.push(effect);
      
      // Trigger onApply
      if (effect.triggers.onApply) {
        effect.trigger('onApply', { playerId, effect });
      }
      
      // Xử lý special effect types
      this._handleSpecialEffectType(effect, playerId, playerEffects);
      
      return effect;
    }
    
    return null;
  }
  
  // Xử lý effect type đặc biệt
  _handleSpecialEffectType(effect, playerId, playerEffects) {
    switch(effect.type) {
      case EffectType.STANCE:
        // Chỉ 1 stance active tại 1 thời điểm
        const otherStances = playerEffects.filter(e => 
          e.type === EffectType.STANCE && 
          e.id !== effect.id &&
          e.deck === effect.deck // Chỉ cùng deck
        );
        otherStances.forEach(stance => {
          this.removeEffect(playerId, stance.id);
        });
        break;
        
      case EffectType.MARK:
        // Chỉ 1 mark active tại 1 thời điểm
        const otherMarks = playerEffects.filter(e => 
          e.type === EffectType.MARK && 
          e.id !== effect.id
        );
        otherMarks.forEach(mark => {
          this.removeEffect(playerId, mark.id);
        });
        break;
    }
  }
  
  // Xóa effect
  removeEffect(playerId, effectId) {
    if (!this.effects.has(playerId)) return null;
    
    const playerEffects = this.effects.get(playerId);
    const effectIndex = playerEffects.findIndex(e => e.id === effectId);
    
    if (effectIndex !== -1) {
      const effect = playerEffects[effectIndex];
      
      // Trigger onRemove
      if (effect.triggers.onRemove) {
        effect.trigger('onRemove', { playerId, effect });
      }
      
      playerEffects.splice(effectIndex, 1);
      return effect;
    }
    
    return null;
  }
  
  // Lấy effects của player
  getPlayerEffects(playerId) {
    return this.effects.get(playerId) || [];
  }
  
  // Kiểm tra player có effect nào
  hasEffect(playerId, effectName) {
    const effects = this.getPlayerEffects(playerId);
    return effects.some(e => e.name === effectName);
  }
  
  // Lấy effect cụ thể
  getEffect(playerId, effectName) {
    const effects = this.getPlayerEffects(playerId);
    return effects.find(e => e.name === effectName);
  }
  
  // ===== GLOBAL EFFECTS =====
  
  addGlobalEffect(effectData) {
    const effect = new Effect(effectData);
    this.globalEffects.push(effect);
    
    if (effect.triggers.onApply) {
      effect.trigger('onApply', { global: true, effect });
    }
    
    return effect;
  }
  
  removeGlobalEffect(effectId) {
    const index = this.globalEffects.findIndex(e => e.id === effectId);
    if (index !== -1) {
      const effect = this.globalEffects[index];
      
      if (effect.triggers.onRemove) {
        effect.trigger('onRemove', { global: true, effect });
      }
      
      this.globalEffects.splice(index, 1);
      return effect;
    }
    return null;
  }
  
  // ===== TURN PROCESSING =====
  
  // Xử lý đầu lượt
  processTurnStart(playerId) {
    const effects = this.getPlayerEffects(playerId);
    const expiredEffects = [];
    
    effects.forEach(effect => {
      // Trigger onTurnStart
      if (effect.triggers.onTurnStart) {
        const result = effect.trigger('onTurnStart', { 
          playerId, 
          effect,
          turnType: 'start'
        });
        
        // Xử lý kết quả từ trigger (cho deck mechanics)
        this._processTriggerResult(result, playerId);
      }
      
      // Giảm duration
      if (effect.reduceDuration()) {
        expiredEffects.push(effect.id);
      }
    });
    
    // Xóa expired effects
    expiredEffects.forEach(effectId => {
      this.removeEffect(playerId, effectId);
    });
    
    return expiredEffects.length;
  }
  
  // Xử lý cuối lượt
  processTurnEnd(playerId) {
    const effects = this.getPlayerEffects(playerId);
    
    effects.forEach(effect => {
      if (effect.triggers.onTurnEnd) {
        const result = effect.trigger('onTurnEnd', { 
          playerId, 
          effect,
          turnType: 'end'
        });
        
        this._processTriggerResult(result, playerId);
      }
    });
  }
  
  // Xử lý kết quả từ trigger
  _processTriggerResult(result, playerId) {
    if (!result) return;
    
    // Xử lý các kết quả phổ biến từ deck
    if (result.damageToAllEnemies) {
      // Gây damage to all enemies - xử lý ở battle logic
      this._emitEvent('damageToAllEnemies', {
        playerId,
        damage: result.damageToAllEnemies,
        source: 'effect'
      });
    }
    
    if (result.healSelf) {
      this._emitEvent('heal', {
        playerId,
        amount: result.healSelf,
        source: 'effect'
      });
    }
    
    if (result.drawCards) {
      this._emitEvent('drawCards', {
        playerId,
        count: result.drawCards,
        source: 'effect'
      });
    }
    
    if (result.extendAvatar) {
      // Tìm Avatar effect và kéo dài
      const avatarEffect = this.getEffect(playerId, "Avatar Form");
      if (avatarEffect && avatarEffect.duration !== null) {
        avatarEffect.duration += result.extendAvatar;
        avatarEffect.maxDuration = Math.max(avatarEffect.maxDuration, avatarEffect.duration);
      }
    }
    
    if (result.resetVoidForm) {
      const voidFormEffect = this.getEffect(playerId, "Void Form");
      if (voidFormEffect && voidFormEffect.duration !== null) {
        voidFormEffect.duration = result.resetVoidForm;
        voidFormEffect.maxDuration = result.resetVoidForm;
      }
    }
  }
  
  // ===== MODIFIER CALCULATION =====
  
  // Tính tổng modifiers của player
  calculateModifiers(playerId) {
    const effects = this.getPlayerEffects(playerId);
    const totalModifiers = {
      // Damage
      [ModifierType.ATTACK_DAMAGE_PERCENT]: 0,
      [ModifierType.SPELL_DAMAGE_PERCENT]: 0,
      [ModifierType.ALL_DAMAGE_PERCENT]: 0,
      [ModifierType.DAMAGE_TAKEN_PERCENT]: 0,
      
      // Defense
      [ModifierType.DAMAGE_REDUCTION_PERCENT]: 0,
      [ModifierType.DODGE_CHANCE]: 0,
      [ModifierType.BLOCK_AMOUNT]: 0,
      
      // Healing
      [ModifierType.HEALING_RECEIVED_PERCENT]: 0,
      [ModifierType.LIFESTEAL_PERCENT]: 0,
      [ModifierType.HP_REGEN]: 0,
      
      // Mana
      [ModifierType.MANA_COST_REDUCTION_PERCENT]: 0,
      [ModifierType.MAX_MANA_INCREASE]: 0,
      [ModifierType.MANA_REGEN]: 0,
      
      // Card
      [ModifierType.DRAW_BONUS]: 0,
      [ModifierType.MAX_HAND_SIZE]: 0,
      [ModifierType.DISCARD_PENALTY_REDUCTION]: 0,
      
      // Shield
      [ModifierType.SHIELD_BONUS]: 0,
      [ModifierType.SHIELD_PIERCING]: 0,
      [ModifierType.SHIELD_EFFECTIVENESS]: 0,
      
      // Special (boolean flags)
      [ModifierType.IMMUNE_TO_TARGETING]: false,
      [ModifierType.IMMUNE_TO_DEBUFFS]: false,
      [ModifierType.TAUNT]: false
    };
    
    effects.forEach(effect => {
      Object.entries(effect.modifiers).forEach(([key, value]) => {
        if (totalModifiers[key] !== undefined) {
          if (typeof value === 'boolean') {
            totalModifiers[key] = totalModifiers[key] || value;
          } else {
            totalModifiers[key] += effect.getModifierValue(key);
          }
        }
      });
    });
    
    return totalModifiers;
  }
  
  // Lấy giá trị modifier cụ thể
  getModifierValue(playerId, modifierKey) {
    const modifiers = this.calculateModifiers(playerId);
    return modifiers[modifierKey] || 0;
  }
  
  // Kiểm tra boolean modifier
  hasModifier(playerId, modifierKey) {
    const value = this.getModifierValue(playerId, modifierKey);
    return Boolean(value);
  }
  
  // ===== EVENT SYSTEM =====
  
  // Gửi event
  _emitEvent(eventType, data) {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => listener(data));
  }
  
  // Đăng ký event listener
  on(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }
  
  // Hủy đăng ký event listener
  off(eventType, callback) {
    if (!this.eventListeners.has(eventType)) return;
    
    const listeners = this.eventListeners.get(eventType);
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  // ===== DECK-SPECIFIC HELPERS =====
  
  // Tạo effect từ deck card
  createEffectFromDeckCard(cardName, deckName, effectData) {
    const baseEffect = {
      name: effectData.name || cardName,
      icon: effectData.icon || '✨',
      type: effectData.type || EffectType.BUFF,
      description: effectData.description || '',
      source: 'card',
      sourceId: cardName,
      deck: deckName,
      duration: effectData.duration,
      maxStacks: effectData.maxStacks || 1,
      isStackable: effectData.isStackable || false,
      modifiers: effectData.modifiers || {},
      conditions: effectData.conditions || {},
      triggers: {
        onApply: effectData.onApply,
        onRemove: effectData.onRemove,
        onTurnStart: effectData.onTurnStart,
        onTurnEnd: effectData.onTurnEnd,
        onDamageDealt: effectData.onDamageDealt,
        onDamageTaken: effectData.onDamageTaken
      },
      priority: effectData.priority || 0
    };
    
    return new Effect(baseEffect);
  }
  
  // Tạo JOL-specific effects
  createJolEffect(cardName, effectType, data = {}) {
    const jolEffects = {
      'Nature\'s Fury': {
        name: "Nature's Fury",
        icon: "🌿",
        type: EffectType.STANCE,
        description: "Đơn mục tiêu mạnh hơn +30%, +200 Shield",
        deck: "JOL – ELVEN PRINCE",
        duration: null, // Vĩnh viễn
        modifiers: {
          [ModifierType.ATTACK_DAMAGE_PERCENT]: 30,
          [ModifierType.SHIELD_BONUS]: 200
        }
      },
      'Eternal Wisdom': {
        name: "Eternal Wisdom",
        icon: "📚",
        type: EffectType.STANCE,
        description: "Đa mục tiêu mạnh hơn +25%, +1 lá khi rút",
        deck: "JOL – ELVEN PRINCE",
        duration: null,
        modifiers: {
          [ModifierType.SPELL_DAMAGE_PERCENT]: 25,
          [ModifierType.DRAW_BONUS]: 1
        }
      },
      'Avatar Form': {
        name: "Avatar Form",
        icon: "👑",
        type: EffectType.BUFF,
        description: "Giảm 50% damage, Miễn nhiễu, Hút máu 100%",
        deck: "JOL – ELVEN PRINCE",
        duration: data.duration || 2,
        modifiers: {
          [ModifierType.DAMAGE_REDUCTION_PERCENT]: 50,
          [ModifierType.HEALING_RECEIVED_PERCENT]: 100,
          [ModifierType.IMMUNE_TO_TARGETING]: true
        },
        onTurnStart: (context) => {
          return {
            damageToAllEnemies: 150,
            message: "⚡ Avatar aura gây 150 damage cho tất cả kẻ địch"
          };
        }
      },
      'Marked Target': {
        name: "Marked Target",
        icon: "🎯",
        type: EffectType.MARK,
        description: "Mục tiêu bị đánh dấu - dễ tổn thương hơn",
        deck: "JOL – ELVEN PRINCE",
        duration: 2,
        modifiers: {
          [ModifierType.DAMAGE_TAKEN_PERCENT]: 20
        }
      }
    };
    
    const effectTemplate = jolEffects[effectType];
    if (!effectTemplate) return null;
    
    return new Effect({
      ...effectTemplate,
      source: 'card',
      sourceId: cardName,
      ...data
    });
  }
  
  // Tạo Sargula-specific effects
  createSargulaEffect(cardName, effectType, data = {}) {
    const sargulaEffects = {
      'Void Form': {
        name: "Void Form",
        icon: "💀",
        type: EffectType.STANCE,
        description: "+50% damage, Bỏ qua Shield, Miễn nhiễu",
        deck: "Sargula - Void Punisher",
        duration: data.duration || 2,
        modifiers: {
          [ModifierType.ALL_DAMAGE_PERCENT]: 50,
          [ModifierType.SHIELD_PIERCING]: 100,
          [ModifierType.IMMUNE_TO_TARGETING]: true
        }
      },
      'Facing Target': {
        name: "Facing Target",
        icon: "🎯",
        type: EffectType.BUFF,
        description: `Giảm 30% sát thương từ mục tiêu ${data.targetName || ''}`,
        deck: "Sargula - Void Punisher",
        duration: 1,
        modifiers: {
          [ModifierType.DAMAGE_REDUCTION_PERCENT]: 30
        }
      },
      'Void Barrier': {
        name: "Void Barrier",
        icon: "🛡️",
        type: EffectType.BUFF,
        description: `Nhận ${data.shieldAmount || 150} Shield${data.doubled ? ' (ĐÃ KHUẾCH ĐẠI)' : ''}`,
        deck: "Sargula - Void Punisher",
        duration: 2,
        modifiers: {
          [ModifierType.SHIELD_BONUS]: data.shieldAmount || 150
        }
      },
      'Last Breath': {
        name: "Last Breath of the Void",
        icon: "😶",
        type: EffectType.BUFF,
        description: "Miễn nhiễu, +400 Shield, +4 Void Charge",
        deck: "Sargula - Void Punisher",
        duration: 2,
        modifiers: {
          [ModifierType.SHIELD_BONUS]: 400,
          [ModifierType.IMMUNE_TO_TARGETING]: true
        }
      }
    };
    
    const effectTemplate = sargulaEffects[effectType];
    if (!effectTemplate) return null;
    
    return new Effect({
      ...effectTemplate,
      source: 'card',
      sourceId: cardName,
      ...data
    });
  }
  
  // ===== CLEANUP =====
  
  // Xóa tất cả effects của player
  clearPlayerEffects(playerId) {
    const effects = this.getPlayerEffects(playerId);
    effects.forEach(effect => {
      if (effect.triggers.onRemove) {
        effect.trigger('onRemove', { playerId, effect, reason: 'clear' });
      }
    });
    
    this.effects.delete(playerId);
    return effects.length;
  }
  
  // Reset toàn bộ system
  reset() {
    this.effects.clear();
    this.globalEffects = [];
    this.eventListeners.clear();
  }
  
  // ===== DEBUG & INFO =====
  
  // Lấy thông tin debug
  getDebugInfo() {
    const playerCount = this.effects.size;
    let totalEffects = 0;
    let activeStances = 0;
    let activeMarks = 0;
    
    this.effects.forEach((effects, playerId) => {
      totalEffects += effects.length;
      effects.forEach(effect => {
        if (effect.type === EffectType.STANCE) activeStances++;
        if (effect.type === EffectType.MARK) activeMarks++;
      });
    });
    
    return {
      playerCount,
      totalEffects,
      globalEffects: this.globalEffects.length,
      activeStances,
      activeMarks,
      listeners: this.eventListeners.size
    };
  }
}

