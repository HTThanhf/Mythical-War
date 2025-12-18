// game-rules.js
export const GAME_RULES = {
  DECK_SIZE: 64,
  STARTING_HEALTH: 1000,
  STARTING_MANA: 3,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  TURN_TIME_LIMIT: 30000, // 30 giây
};

export const CARD_TYPES = {
  ATTACK: 'attack',
  DEFENSE: 'defense',
  HEAL: 'heal',
  MANA: 'mana'
};