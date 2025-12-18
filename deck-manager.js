// ==== deck-manager.js ====
import { Effect } from './battle/effect-system.js';

// JOL - ELVEN PRINCE DECK (ĐÃ ĐƯỢC CÂN BẰNG CHO 4 NGƯỜI)
export const JOL_DECK = {
  name: "JOL – ELVEN PRINCE",
  keyMechanic: {
    name: "Mana Fragment",
    icon: "✨",
    max: 10,
    description: "Tích lũy Mana Fragment để kích hoạt kỹ năng mạnh. Chỉ có 1 hình thái tại 1 thời điểm."
  },
  
  stances: {
    NATURES_FURY: {
      id: 'natures_fury',
      name: "Nature's Fury",
      icon: "🌿",
      description: "Bài tấn công đơn mục tiêu mạnh hơn +30%",
      isActive: false,
      modifiers: { attackDamagePercent: 30 }
    },
    ETERNAL_WISDOM: {
      id: 'eternal_wisdom',
      name: "Eternal Wisdom", 
      icon: "📚",
      description: "Bài đa mục tiêu mạnh hơn +25%",
      isActive: false,
      modifiers: { spellDamagePercent: 25, drawBonus: 1 }
    }
  },
  
  // ==== A. BÀI CẤP THẤP - TẤN CÔNG & TÍCH LŨY (28 LÁ) ====
  cards: {
    // 10 lá
    "Elven Blade Strike": {
      mana: 1,
      type: "attack",
      power: 90,
      target: "single",
      emoji: "⚔️",
      description: "Gây 90 damage cho 1 mục tiêu",
      effects: [
        {
          name: "Swiftness",
          icon: "⚡",
          description: "Đánh đầu tiên trong lượt: +1 Mana Fragment",
          condition: "ifFirstCardInTurn",
          action: (player) => {
            if (!player.manaFragments) player.manaFragments = 0;
            player.manaFragments = Math.min(10, player.manaFragments + 1);
            return { 
              showNotification: "⚡ Nhanh Nhẹn: +1 Mana Fragment",
              effect: null 
            };
          }
        }
      ]
    },
    
    // 8 lá
    "Nature's Shield": {
      mana: 2,
      type: "defense",
      power: 80,
      target: "self",
      emoji: "🛡️",
      description: "Nhận 80 Shield",
      effects: [
        {
          name: "Fragment Accumulation",
          icon: "➕",
          description: "Nếu có dưới 2 Mana Fragment, nhận thêm 1",
          condition: "ifManaFragmentsLessThan2",
          action: (player) => {
            if ((player.manaFragments || 0) < 2) {
              player.manaFragments = (player.manaFragments || 0) + 1;
              return {
                showNotification: "➕ +1 Mana Fragment (ít hơn 2)",
                effect: null
              };
            }
            return null;
          }
        },
        {
          name: "Shield Buff",
          icon: "🛡️",
          type: "buff",
          duration: 1,
          modifiers: { shieldBonus: 80 },
          description: "Nhận 80 Shield"
        }
      ]
    },
    
    // 6 lá
    "Forest Guidance": {
      mana: 2,
      type: "draw",
      power: 1,
      target: "self",
      emoji: "🌲",
      description: "Rút 1 lá bài. Nhận 1 Mana Fragment",
      effects: [
        {
          name: "Forest Wisdom",
          icon: "📖",
          description: "Rút 1 lá, nhận 1 Mana Fragment",
          action: (player) => {
            if (!player.manaFragments) player.manaFragments = 0;
            player.manaFragments = Math.min(10, player.manaFragments + 1);
            return {
              showNotification: "🌲 Dẫn Lối Rừng Xanh: +1 Mana Fragment",
              drawCards: 1,
              effect: null
            };
          }
        }
      ]
    },
    
    // 4 lá
    "Swift Strike": {
      mana: 3,
      type: "attack",
      power: 140,
      target: "single",
      emoji: "💨",
      description: "Gây 140 damage cho 1 mục tiêu",
      effects: [
        {
          name: "Combo Discount",
          icon: "💰",
          description: "Nếu có ít nhất 2 Mana Fragment: giảm giá 2 mana",
          condition: "ifManaFragmentsAtLeast2",
          action: (player) => {
            if ((player.manaFragments || 0) >= 2) {
              return {
                showNotification: "💰 Combo: Giảm 2 mana!",
                manaReduction: 2,
                effect: null
              };
            }
            return null;
          }
        }
      ]
    },
    
    // ==== B. BÀI CẤP TRUNG - CHUYỂN ĐỔI & COMBO (24 LÁ) ====
    // 6 lá
    "Embrace Nature": {
      mana: 4,
      type: "stance",
      requirement: { manaFragments: 2 },
      target: "self",
      emoji: "🔄",
      description: "Chọn 1 hình thái: Nature's Fury hoặc Eternal Wisdom",
      effects: [
        {
          name: "Stance Change",
          icon: "🔄",
          description: "Chuyển đổi hình thái chiến đấu",
          action: (player, choice) => {
            // Reset all stances
            Object.values(player.stances || {}).forEach(stance => {
              stance.isActive = false;
            });
            
            // Activate chosen stance
            if (choice === 'fury') {
              player.stances.NATURES_FURY.isActive = true;
              return {
                effect: new Effect({
                  name: "Nature's Fury",
                  icon: "🌿",
                  type: "stance",
                  duration: 0, // Permanent until changed
                  description: "+30% sát thương đơn mục tiêu, +200 Shield",
                  modifiers: { 
                    attackDamagePercent: 30,
                    shieldBonus: 200
                  }
                }),
                showNotification: "🌿 Kích hoạt Nature's Fury!"
              };
            } else {
              player.stances.ETERNAL_WISDOM.isActive = true;
              return {
                effect: new Effect({
                  name: "Eternal Wisdom",
                  icon: "📚", 
                  type: "stance",
                  duration: 0,
                  description: "+25% sát thương đa mục tiêu, gây 120 damage cho 2 kẻ địch ngẫu nhiên",
                  modifiers: { 
                    spellDamagePercent: 25
                  }
                }),
                showNotification: "📚 Kích hoạt Eternal Wisdom!",
                immediateEffect: {
                  damageToRandomEnemies: { damage: 120, count: 2 }
                }
              };
            }
          }
        }
      ]
    },
    
    // 6 lá
    "Split Wood": {
      mana: 5,
      type: "attack",
      requirement: { stance: "NATURES_FURY" },
      power: 220,
      target: "single",
      emoji: "🪓",
      description: "Gây 220 damage, hồi HP bằng 40% sát thương",
      effects: [
        {
          name: "Lifesteal",
          icon: "🩸",
          description: "Hồi HP bằng 40% sát thương gây ra",
          action: (player, targetPlayer, damageDealt) => {
            const healAmount = Math.floor(damageDealt * 0.4);
            return {
              healSelf: healAmount,
              showNotification: `🩸 Hút máu: +${healAmount} HP`,
              effect: null
            };
          }
        },
        {
          name: "Greedy Strike",
          icon: "💰",
          description: "Trả thêm 2 Mana Fragment để gây thêm 100 damage",
          optional: true,
          cost: { manaFragments: 2 },
          action: (player) => {
            if ((player.manaFragments || 0) >= 2) {
              player.manaFragments -= 2;
              return {
                bonusDamage: 100,
                showNotification: "💰 Tham Lam: +100 damage",
                effect: null
              };
            }
            return null;
          }
        }
      ]
    },
    
    // 6 lá
    "Forest Energy Drops": {
      mana: 4,
      type: "attack",
      requirement: { stance: "ETERNAL_WISDOM" },
      power: 80,
      target: "multiple",
      targetCount: 3,
      emoji: "💧",
      description: "Gây 80 damage cho 3 kẻ địch ngẫu nhiên",
      effects: [
        {
          name: "Mark Highest Damage",
          icon: "🎯",
          description: "Đánh dấu mục tiêu chịu damage cao nhất",
          action: (player, damagedPlayers) => {
            if (damagedPlayers && damagedPlayers.length > 0) {
              const highestDamageTarget = damagedPlayers.reduce((max, p) => 
                p.damageTaken > max.damageTaken ? p : max
              );
              return {
                markedTarget: highestDamageTarget.id,
                showNotification: `🎯 Đánh dấu ${highestDamageTarget.name}`,
                effect: new Effect({
                  name: "Marked Target",
                  icon: "🎯",
                  type: "debuff",
                  duration: 2,
                  description: "Mục tiêu bị đánh dấu - dễ tổn thương hơn",
                  modifiers: { damageTakenPercent: 20 }
                })
              };
            }
            return null;
          }
        }
      ]
    },
    
    // 6 lá
    "Deep Forest Echo": {
      mana: 3,
      type: "attack",
      requirement: { 
        stance: "NATURES_FURY",
        condition: "hasMarkedTarget"
      },
      power: 180,
      target: "marked",
      emoji: "🌳",
      description: "Gây 180 damage cho mục tiêu bị đánh dấu. Hồi 200 HP",
      effects: [
        {
          name: "Echo Heal",
          icon: "❤️",
          description: "Hồi 200 HP sau khi gây damage",
          action: (player) => {
            return {
              healSelf: 200,
              showNotification: "❤️ Tiếng Vọng Rừng Sâu: +200 HP",
              effect: null
            };
          }
        }
      ]
    },
    
    // ==== C. BÀI CẤP CAO - KỸ NĂNG TỐI THƯỢNG (12 LÁ) ====
    // 4 lá
    "Avatar - Supreme Power": {
      mana: 7,
      type: "ultimate",
      requirement: { manaFragments: 5 },
      target: "self",
      emoji: "👑",
      description: "Giảm 50% damage, Miễn nhiễu, Hút máu 100%, gây 150 damage toàn bộ",
      effects: [
        {
          name: "Avatar Form",
          icon: "👑",
          type: "buff",
          duration: 2,
          description: "Giảm 50% sát thương, Miễn nhiễu, Hút máu 100%",
          modifiers: {
            damageReductionPercent: 50,
            healingReceivedPercent: 100, // Lifesteal
            immuneToTargeting: true
          },
          onTurnStart: (player) => {
            // Gây damage cho tất cả kẻ địch mỗi lượt
            return {
              damageToAllEnemies: 150,
              message: "⚡ Avatar aura gây 150 damage cho tất cả kẻ địch"
            };
          },
          onApply: () => {
            return { showNotification: "👑 HÓA THÂN - SỨC MẠNH TỐI CAO!" };
          }
        },
        {
          name: "Awakening",
          icon: "🌟",
          description: "Nếu hạ mục tiêu trong hiệu ứng: kéo dài thêm 1 lượt (tối đa +2)",
          condition: "ifKillDuringAvatar",
          action: (player) => {
            // Logic handled elsewhere
            return { extendAvatar: 1 };
          }
        }
      ]
    },
    
    // 4 lá
    "Forest Solitude": {
      mana: 5,
      type: "defense",
      condition: "isLowestHPPlayer",
      target: "self",
      emoji: "🏞️",
      description: "Chỉ dùng được nếu bạn là người có ít HP nhất. Nhận Miễn nhiễu +300 Shield",
      effects: [
        {
          name: "Solitude Protection",
          icon: "🛡️",
          type: "buff",
          duration: 1,
          description: "Miễn nhiễu trong 1 lượt + 300 Shield (không mất theo lượt)",
          modifiers: {
            shieldBonus: 300,
            immuneToTargeting: true
          },
          onApply: () => {
            return { showNotification: "🏞️ Cô Độc Của Rừng: Miễn nhiễu +300 Shield!" };
          }
        }
      ]
    },
    
    // 4 lá
    "Mana Growth": {
      mana: 2,
      type: "special",
      power: 50,
      target: "single",
      emoji: "🌱",
      description: "Gây 50 damage. Vĩnh viễn tăng Max Mana lên 1 (tối đa +7)",
      effects: [
        {
          name: "Permanent Mana Increase",
          icon: "⬆️",
          description: "Vĩnh viễn tăng Max Mana lên 1",
          action: (player) => {
            if (!player.maxMana) player.maxMana = 4;
            if (player.maxMana < 10) {
              player.maxMana += 1;
              return {
                showNotification: `🌱 Mana Phát Triển: Max Mana tăng lên ${player.maxMana}`,
                effect: null
              };
            }
            return null;
          }
        },
        {
          name: "Awakening Bonus",
          icon: "⚡",
          description: "Nếu Max Mana >= 10: +100 damage và ảnh hưởng thêm 1 mục tiêu",
          condition: "ifMaxManaAtLeast10",
          action: (player) => {
            return {
              bonusDamage: 100,
              additionalTargets: 1,
              showNotification: "⚡ Thức Tỉnh: +100 damage, thêm 1 mục tiêu!",
              effect: null
            };
          }
        }
      ]
    }
  },
  
  // Deck composition (64 lá)
  deckComposition: {
    "Elven Blade Strike": 10,       // A1: 10 lá
    "Nature's Shield": 8,           // A2: 8 lá
    "Forest Guidance": 6,           // A3: 6 lá
    "Swift Strike": 4,              // A4: 4 lá
    "Embrace Nature": 6,            // B1: 6 lá
    "Split Wood": 6,                // B2: 6 lá
    "Forest Energy Drops": 6,       // B3: 6 lá
    "Deep Forest Echo": 6,          // B4: 6 lá
    "Avatar - Supreme Power": 4,    // C1: 4 lá
    "Forest Solitude": 4,           // C2: 4 lá
    "Mana Growth": 4                // C3: 4 lá
  },
  
  // Generate random card from deck
  generateCard() {
    const cards = [];
    for (const [cardName, count] of Object.entries(this.deckComposition)) {
      for (let i = 0; i < count; i++) {
        cards.push(cardName);
      }
    }
    
    if (cards.length === 0) {
      console.warn("JOL deck is empty!");
      return "Basic Strike [1] - 100";
    }
    
    const randomIndex = Math.floor(Math.random() * cards.length);
    const cardName = cards[randomIndex];
    const cardInfo = this.cards[cardName] || { 
      mana: 2, 
      type: "attack", 
      power: 100,
      emoji: "🃏"
    };
    
    return `${cardName} [${cardInfo.mana}] - ${cardInfo.power}`;
  },
  
  // Get card info by name
  getCardInfo(cardName) {
    return this.cards[cardName] || null;
  }
};

// SARgula - Void Punisher DECK (TỐI ƯU CHO 4 NGƯỜI)
export const SARGULA_DECK = {
  name: "Sargula - Void Punisher",
  keyMechanic: {
    name: "Void Charge",
    icon: "⚫",
    max: 8,
    description: "Khi Void Charge >= 8, vào Void Form trong lượt hiện tại. Void Form: bài được khuếch đại 30% và bỏ qua 50 Shield"
  },
  
  voidForm: {
    isActive: false,
    modifiers: {
      damagePercent: 30,
      shieldPierce: 50
    }
  },
  
  // ==== A. BÀI CẤP THẤP - GÂY SÁT THƯƠNG & TÍCH VC (26 LÁ) ====
  cards: {
    // 10 lá
    "Void Scythe": {
      mana: 1,
      type: "attack",
      power: 80,
      target: "single",
      emoji: "⚫",
      description: "Gây 80 damage cho 1 mục tiêu",
      effects: [
        {
          name: "Void Memory",
          icon: "📝",
          description: "Ghi nhớ 1 đòn. Đủ 3 đòn: nhận 2 Void Charge",
          action: (player) => {
            if (!player.voidScytheCount) player.voidScytheCount = 0;
            player.voidScytheCount++;
            
            if (player.voidScytheCount >= 3) {
              player.voidScytheCount = 0;
              if (!player.voidCharge) player.voidCharge = 0;
              player.voidCharge = Math.min(8, player.voidCharge + 2);
              return {
                showNotification: "📝 Đủ 3 đòn Void Scythe: +2 Void Charge!",
                effect: null
              };
            } else {
              return {
                showNotification: `📝 Void Scythe: ${player.voidScytheCount}/3`,
                effect: null
              };
            }
          }
        }
      ]
    },
    
    // 6 lá
    "Sacrificial Ritual": {
      mana: 0,
      type: "special",
      target: "self",
      emoji: "🔪",
      description: "Hy sinh: Chọn 1 lá bài trên tay (không phải lá này) và vứt bỏ nó. Nhận 2 Void Charge",
      effects: [
        {
          name: "Sacrifice",
          icon: "🔪",
          description: "Vứt 1 lá bài để nhận 2 Void Charge",
          requiresDiscard: true,
          action: (player) => {
            if (!player.voidCharge) player.voidCharge = 0;
            player.voidCharge = Math.min(8, player.voidCharge + 2);
            return {
              showNotification: "🔪 Nghi Lễ Hiến Tế: +2 Void Charge",
              effect: null
            };
          }
        }
      ]
    },
    
    // 6 lá
    "Abyss Pain": {
      mana: 2,
      type: "attack",
      power: 160,
      target: "single",
      emoji: "😖",
      description: "Gây 60 damage cho CHÍNH BẠN, sau đó gây 160 damage cho 1 mục tiêu. Nhận 1 Void Charge",
      effects: [
        {
          name: "Self Harm",
          icon: "💔",
          description: "Tự gây 60 damage",
          action: (player) => {
            const selfDamage = 60;
            return {
              damageSelf: selfDamage,
              showNotification: `💔 Nỗi Đau Vực Thẳm: -${selfDamage} HP`,
              effect: null
            };
          }
        },
        {
          name: "Void Charge Gain",
          icon: "⚫",
          description: "Nhận 1 Void Charge",
          action: (player) => {
            if (!player.voidCharge) player.voidCharge = 0;
            player.voidCharge = Math.min(8, player.voidCharge + 1);
            return {
              showNotification: "⚫ +1 Void Charge",
              effect: null
            };
          }
        }
      ]
    },
    
    // 4 lá
    "Void Step": {
      mana: 2,
      type: "defense",
      target: "single",
      emoji: "👣",
      description: "Chọn 1 người chơi. Sargula 'đối mặt' với họ cho đến cuối lượt. Giảm 30% sát thương nhận từ họ",
      effects: [
        {
          name: "Face Target",
          icon: "🎯",
          type: "buff",
          duration: 1,
          description: "Giảm 30% sát thương từ mục tiêu đối mặt",
          action: (player, targetPlayerId) => {
            return {
              effect: new Effect({
                name: "Facing " + targetPlayerId,
                icon: "🎯",
                type: "buff",
                duration: 1,
                description: `Giảm 30% sát thương từ người chơi ${targetPlayerId}`,
                modifiers: {
                  damageReductionFromTarget: 30,
                  targetId: targetPlayerId
                }
              }),
              showNotification: "👣 Bước Chân Hư Vô: Đối mặt với mục tiêu"
            };
          }
        }
      ]
    },
    
    // ==== B. BÀI CẤP TRUNG - VOID FORM & KHUẾCH ĐẠI (20 LÁ) ====
    // 6 lá
    "Void Grasp": {
      mana: 3,
      type: "attack",
      requirement: { voidCharge: 3 },
      power: 120,
      target: "single",
      emoji: "👁️",
      description: "Gây 120 damage. Nếu trong Void Form: kéo dài Void Form thêm 1 lượt",
      effects: [
        {
          name: "Extend Void Form",
          icon: "⏱️",
          description: "Nếu trong Void Form: kéo dài thêm 1 lượt",
          condition: "inVoidForm",
          action: (player) => {
            return {
              extendVoidForm: 1,
              showNotification: "⏱️ Kéo dài Void Form thêm 1 lượt",
              effect: null
            };
          }
        },
        {
          name: "Void Amplification",
          icon: "⚡",
          description: "Trong Void Form: +30% damage, bỏ qua 50 Shield",
          condition: "inVoidForm",
          action: (player) => {
            return {
              voidFormBonus: true,
              showNotification: "⚡ Void Form: +30% damage, xuyên 50 Shield",
              effect: null
            };
          }
        }
      ]
    },
    
    // 5 lá
    "Chaotic Release": {
      mana: 4,
      type: "attack",
      requirement: { voidCharge: 5 },
      power: 100,
      target: "all_others",
      emoji: "🌀",
      description: "Gây 100 damage cho tất cả kẻ địch. Tiêu hao tất cả Void Charge",
      effects: [
        {
          name: "Charge Consumption",
          icon: "🔥",
          description: "Tiêu hao tất cả Void Charge, mỗi charge +10 damage",
          action: (player) => {
            const voidCharge = player.voidCharge || 0;
            const bonusDamage = voidCharge * 10;
            player.voidCharge = 0;
            
            return {
              bonusDamage: bonusDamage,
              showNotification: `🔥 Tiêu hao ${voidCharge} Void Charge: +${bonusDamage} damage`,
              effect: null
            };
          }
        }
      ]
    },
    
    // 5 lá
    "Void Barrier": {
      mana: 3,
      type: "defense",
      requirement: { voidCharge: 2 },
      power: 150,
      target: "self",
      emoji: "🛡️",
      description: "Nhận 150 Shield. Nếu có ít nhất 4 Void Charge: Shield x2",
      effects: [
        {
          name: "Charge Enhanced Shield",
          icon: "🛡️",
          type: "buff",
          duration: 2,
          description: "Nhận Shield, x2 nếu có >=4 Void Charge",
          action: (player) => {
            const baseShield = 150;
            const voidCharge = player.voidCharge || 0;
            const finalShield = voidCharge >= 4 ? baseShield * 2 : baseShield;
            
            return {
              effect: new Effect({
                name: "Void Barrier",
                icon: "🛡️",
                type: "buff",
                duration: 2,
                description: `Nhận ${finalShield} Shield${voidCharge >= 4 ? " (x2 nhờ Void Charge)" : ""}`,
                modifiers: { shieldBonus: finalShield }
              }),
              showNotification: `🛡️ Void Barrier: +${finalShield} Shield${voidCharge >= 4 ? " (ĐÃ KHUẾCH ĐẠI)" : ""}`
            };
          }
        }
      ]
    },
    
    // 4 lá
    "Soul Harvest": {
      mana: 2,
      type: "special",
      requirement: { condition: "enemyDiedLastTurn" },
      power: 0,
      target: "self",
      emoji: "🌙",
      description: "Chỉ dùng được nếu có kẻ địch chết lượt trước. Nhận 3 Void Charge, rút 2 lá",
      effects: [
        {
          name: "Harvest Souls",
          icon: "🌙",
          description: "Nhận 3 Void Charge, rút 2 lá",
          action: (player) => {
            if (!player.voidCharge) player.voidCharge = 0;
            player.voidCharge = Math.min(8, player.voidCharge + 3);
            
            return {
              drawCards: 2,
              showNotification: "🌙 Thu Hoạch Linh Hồn: +3 Void Charge, rút 2 lá",
              effect: null
            };
          }
        }
      ]
    },
    
    // ==== C. BÀI CẤP CAO - VOID FORM TỐI THƯỢNG (18 LÁ) ====
    // 6 lá
    "Void Form - Absolute Power": {
      mana: 6,
      type: "ultimate",
      requirement: { voidCharge: 8 },
      target: "self",
      emoji: "💀",
      description: "Kích hoạt Void Form: +50% damage, bỏ qua tất cả Shield, miễn nhiễu 1 lượt",
      effects: [
        {
          name: "Enter Void Form",
          icon: "💀",
          type: "buff",
          duration: 2,
          description: "Void Form: +50% damage, bỏ qua Shield, miễn nhiễu",
          onApply: (player) => {
            player.voidCharge = 0; // Tiêu hao tất cả charge
            player.voidForm = { isActive: true, duration: 2 };
            
            return {
              effect: new Effect({
                name: "Void Form",
                icon: "💀",
                type: "stance",
                duration: 2,
                description: "+50% sát thương, bỏ qua Shield, miễn nhiễu",
                modifiers: {
                  damagePercent: 50,
                  shieldPierce: 100,
                  immuneToTargeting: true
                }
              }),
              showNotification: "💀 VOID FORM - ABSOLUTE POWER!"
            };
          }
        }
      ]
    },
    
    // 6 lá
    "Oblivion's Call": {
      mana: 5,
      type: "attack",
      requirement: { inVoidForm: true },
      power: 200,
      target: "single",
      emoji: "☠️",
      description: "Chỉ dùng được trong Void Form. Gây 200 damage. Nếu hạ mục tiêu: reset Void Form duration",
      effects: [
        {
          name: "Oblivion Reset",
          icon: "🔄",
          description: "Nếu hạ mục tiêu: reset Void Form về 2 lượt",
          condition: "ifKillTarget",
          action: (player) => {
            return {
              resetVoidForm: 2,
              showNotification: "☠️ Oblivion's Call: Reset Void Form!",
              effect: null
            };
          }
        }
      ]
    },
    
    // 6 lá
    "Last Breath of the Void": {
      mana: 4,
      type: "defense",
      condition: "healthBelow25Percent",
      target: "self",
      emoji: "😶",
      description: "Chỉ dùng được khi HP dưới 25%. Nhận miễn nhiễu 2 lượt, 400 Shield, +4 Void Charge",
      effects: [
        {
          name: "Last Stand",
          icon: "😶",
          type: "buff",
          duration: 2,
          description: "Miễn nhiễu 2 lượt, 400 Shield, +4 Void Charge",
          onApply: (player) => {
            if (!player.voidCharge) player.voidCharge = 0;
            player.voidCharge = Math.min(8, player.voidCharge + 4);
            
            return {
              effect: new Effect({
                name: "Last Breath of the Void",
                icon: "😶",
                type: "buff",
                duration: 2,
                description: "Miễn nhiễu, +400 Shield, +4 Void Charge",
                modifiers: {
                  shieldBonus: 400,
                  immuneToTargeting: true
                }
              }),
              showNotification: "😶 Hơi Thở Cuối Của Hư Vô: Miễn nhiễu +400 Shield +4 Void Charge!"
            };
          }
        }
      ]
    }
  },
  
  // Deck composition (64 lá)
  deckComposition: {
    "Void Scythe": 10,               // A1: 10 lá
    "Sacrificial Ritual": 6,         // A2: 6 lá
    "Abyss Pain": 6,                 // A3: 6 lá
    "Void Step": 4,                  // A4: 4 lá
    "Void Grasp": 6,                 // B1: 6 lá
    "Chaotic Release": 5,            // B2: 5 lá
    "Void Barrier": 5,               // B3: 5 lá
    "Soul Harvest": 4,               // B4: 4 lá
    "Void Form - Absolute Power": 6, // C1: 6 lá
    "Oblivion's Call": 6,            // C2: 6 lá
    "Last Breath of the Void": 6     // C3: 6 lá
  },
  
  // Generate random card from deck
  generateCard() {
    const cards = [];
    for (const [cardName, count] of Object.entries(this.deckComposition)) {
      for (let i = 0; i < count; i++) {
        cards.push(cardName);
      }
    }
    
    if (cards.length === 0) {
      console.warn("Sargula deck is empty!");
      return "Void Strike [2] - 100";
    }
    
    const randomIndex = Math.floor(Math.random() * cards.length);
    const cardName = cards[randomIndex];
    const cardInfo = this.cards[cardName] || { 
      mana: 2, 
      type: "attack", 
      power: 100,
      emoji: "⚫"
    };
    
    return `${cardName} [${cardInfo.mana}] - ${cardInfo.power}`;
  },
  
  // Get card info by name
  getCardInfo(cardName) {
    return this.cards[cardName] || null;
  },
  
  // Check if player can enter Void Form
  checkVoidForm(player) {
    if (!player.voidForm) player.voidForm = { isActive: false };
    
    if ((player.voidCharge || 0) >= 8 && !player.voidForm.isActive) {
      player.voidForm.isActive = true;
      player.voidForm.duration = 1; // Chỉ active trong lượt hiện tại
      player.voidCharge = 0;
      return true;
    }
    
    return false;
  }
};

// Deck Manager - Main class to manage all decks
export class DeckManager {
  static DECKS = {
    "JOL – ELVEN PRINCE": JOL_DECK,
    "Sargula - Void Punisher": SARGULA_DECK
  };
  
  static getDeck(deckName) {
    return this.DECKS[deckName] || null;
  }
  
  static getAllDecks() {
    return Object.keys(this.DECKS);
  }
  
  static generateCard(deckName) {
    const deck = this.getDeck(deckName);
    if (deck && deck.generateCard) {
      return deck.generateCard();
    }
    return this.generateGenericCard(deckName);
  }
  
  static getCardInfo(deckName, cardString) {
    // Extract card name from card string (format: "Card Name [mana] - power")
    const cardNameMatch = cardString.match(/^([^\[]+)/);
    if (!cardNameMatch) return null;
    
    const cardName = cardNameMatch[1].trim();
    const deck = this.getDeck(deckName);
    
    if (deck && deck.getCardInfo) {
      return deck.getCardInfo(cardName);
    }
    
    return null;
  }
  
  static generateGenericCard(deckName) {
    const types = [
      { type: "attack", weight: 3, mana: [1, 2, 3], emoji: "⚔️" },
      { type: "defense", weight: 2, mana: [1, 2], emoji: "🛡️" },
      { type: "heal", weight: 2, mana: [2, 3], emoji: "❤️" },
      { type: "mana", weight: 1, mana: [1], emoji: "🔮" },
      { type: "draw", weight: 1, mana: [2], emoji: "🎴" }
    ];
    
    const totalWeight = types.reduce((sum, type) => sum + type.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType = types[0];
    
    for (const type of types) {
      random -= type.weight;
      if (random <= 0) {
        selectedType = type;
        break;
      }
    }
    
    const manaCost = selectedType.mana[Math.floor(Math.random() * selectedType.mana.length)];
    const basePower = manaCost * 25;
    const power = Math.floor(basePower + Math.random() * 50);
    
    const prefixes = {
      attack: ["Lưỡi kiếm", "Mũi tên", "Tia chớp", "Hỏa cầu", "Bão tuyết"],
      defense: ["Khiên thép", "Áo giáp", "Hào quang", "Bong bóng", "Lực trường"],
      heal: ["Thuốc tiên", "Suối nguồn", "Phép lành", "Ánh sáng", "Mưa phùn"],
      mana: ["Ngọc mana", "Tinh thể", "Dòng chảy", "Nguyên tố", "Năng lượng"],
      draw: ["Bói toán", "Tiên tri", "Tri thức", "Thư viện", "Cuộn giấy"]
    };
    
    const typePrefixes = prefixes[selectedType.type] || prefixes.attack;
    const prefix = typePrefixes[Math.floor(Math.random() * typePrefixes.length)];
    
    const cardName = `${prefix} ${selectedType.type.charAt(0).toUpperCase() + selectedType.type.slice(1)}`;
    
    return `${cardName} [${manaCost}] - ${power}`;
  }
  
  // Get emoji for card type
  static getCardEmoji(cardType) {
    const emojis = {
      attack: "⚔️",
      defense: "🛡️",
      heal: "❤️",
      mana: "🔮",
      draw: "🎴",
      special: "✨",
      stance: "🔄",
      ultimate: "👑"
    };
    
    return emojis[cardType.toLowerCase()] || "🃏";
  }
  
  // Parse card string to get info
  static parseCardInfo(cardString, deckName = null) {
    // Try to get deck-specific info first
    if (deckName) {
      const deck = this.getDeck(deckName);
      if (deck) {
        const cardNameMatch = cardString.match(/^([^\[]+)/);
        if (cardNameMatch) {
          const cardName = cardNameMatch[1].trim();
          const deckCardInfo = deck.getCardInfo(cardName);
          
          if (deckCardInfo) {
            // Extract mana and power from card string
            const manaMatch = cardString.match(/\[(\d+)\]/);
            const manaCost = manaMatch ? parseInt(manaMatch[1]) : deckCardInfo.mana;
            
            const powerMatch = cardString.match(/- (\d+)/);
            const power = powerMatch ? parseInt(powerMatch[1]) : deckCardInfo.power;
            
            return {
              name: cardName,
              type: deckCardInfo.type.charAt(0).toUpperCase() + deckCardInfo.type.slice(1),
              cost: manaCost,
              power: power,
              emoji: deckCardInfo.emoji || this.getCardEmoji(deckCardInfo.type),
              fullName: cardString,
              target: deckCardInfo.target || "single",
              needsTarget: deckCardInfo.target === "single" || deckCardInfo.target === "multiple",
              isDeckCard: true,
              deck: deckName,
              deckCardInfo: deckCardInfo
            };
          }
        }
      }
    }
    
    // Fallback to generic parsing
    const parts = cardString.split(' - ');
    if (parts.length < 2) {
      return {
        name: cardString.substring(0, 20) + (cardString.length > 20 ? "..." : ""),
        type: "Special",
        cost: 2,
        power: 100,
        emoji: "🃏",
        fullName: cardString,
        target: "self",
        needsTarget: false,
        isDeckCard: false
      };
    }
    
    const namePart = parts[0];
    const power = parseInt(parts[1]) || 0;
    
    const manaMatch = namePart.match(/\[(\d+)\]/);
    const manaCost = manaMatch ? parseInt(manaMatch[1]) : 2;
    
    let type = "special";
    const lowerName = namePart.toLowerCase();
    
    if (lowerName.includes("kiếm") || lowerName.includes("tên") || lowerName.includes("chớp") || 
        lowerName.includes("tấn công") || lowerName.includes("attack")) {
      type = "attack";
    } else if (lowerName.includes("khiên") || lowerName.includes("giáp") || lowerName.includes("chắn") || 
               lowerName.includes("phòng thủ") || lowerName.includes("defense")) {
      type = "defense";
    } else if (lowerName.includes("thuốc") || lowerName.includes("suối") || lowerName.includes("hồi") || 
               lowerName.includes("heal")) {
      type = "heal";
    } else if (lowerName.includes("mana") || lowerName.includes("tinh thể")) {
      type = "mana";
    } else if (lowerName.includes("bói") || lowerName.includes("rút") || lowerName.includes("draw")) {
      type = "draw";
    }
    
    const needsTarget = type === "attack";
    
    return {
      name: namePart.replace(/\[\d+\]/, '').trim(),
      type: type.charAt(0).toUpperCase() + type.slice(1),
      cost: manaCost,
      power: power,
      emoji: this.getCardEmoji(type),
      fullName: cardString,
      target: needsTarget ? "single" : "self",
      needsTarget: needsTarget,
      isDeckCard: false
    };
  }
}