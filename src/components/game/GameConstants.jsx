// Game constants and configurations

export const TILE_SIZE = 72;
export const RESOURCE_AREA_SIZE = 3;

export const COLORS = {
  player: '#3B82F6',
  playerLight: '#60A5FA',
  enemy: '#EF4444',
  enemyLight: '#F87171',
  grid: '#1E293B',
  gridLine: '#334155',
  gridHighlight: '#475569',
  background: '#0F172A',
  resource: '#F59E0B',
  resourceLight: '#FBBF24',
  health: '#22C55E',
  healthBar: '#16A34A',
  healthBarBg: '#1E293B',
  turretClassic: '#8B5CF6',
  turretBounce: '#EC4899',
  turretFire: '#F97316',
  turretLaser: '#06B6D4',
  turretShield: '#10B981',
  turretWall: '#6B7280',
  turretCollector: '#F59E0B',
  powerupHealth: '#22C55E',
  powerupBuild: '#A855F7',
  powerupAttack: '#EF4444',
  powerupShield: '#3B82F6',
  bullet: '#FBBF24',
  enemyBullet: '#F87171',
  fatigue: '#F59E0B',
  text: '#F8FAFC',
  textDim: '#94A3B8',
  panelBg: 'rgba(15, 23, 42, 0.9)',
  panelBorder: '#334155',
};

export const TURRET_CATEGORY = {
  offensive: 'offensive',
  defensive: 'defensive',
  collector: 'collector',
};

export const TURRET_TYPES = {
  classic: {
    name: 'Gamba', category: TURRET_CATEGORY.offensive, color: '#8B5CF6',
    damage: 8, range: 4, fireRate: 60, cost: 15, health: 50,
    description: 'Dispara proyectiles pesados de coral en línea recta', icon: '🦐',
  },
  jelly: {
    name: 'Medusa', category: TURRET_CATEGORY.offensive, color: '#8B5CF6',
    damage: 5, range: 5, fireRate: 90, cost: 25, health: 40,
    description: 'Lanza medusas eléctricas que rebotan entre enemigos', icon: '🪼',
  },
  fire: {
    name: 'Chorro Abisal', category: TURRET_CATEGORY.offensive, color: '#F97316',
    damage: 3, range: 3, fireRate: 120, cost: 30, health: 60,
    description: 'Expulsa chorros termales de las profundidades en área', icon: '🌋',
  },
  laser: {
    name: 'Faro', category: TURRET_CATEGORY.offensive, color: '#06B6D4',
    damage: 1.5, range: 6, fireRate: 5, cost: 35, health: 35,
    description: 'Dispara un haz bioluminiscente de largo alcance', icon: <img width="48" height="48" src="https://img.icons8.com/color/48/lighthouse--v1.png" alt="lighthouse--v1"/>,
  },
  shield: {
    name: 'Concha', category: TURRET_CATEGORY.defensive, color: '#10B981',
    damage: 0, range: 2.5, fireRate: 0, cost: 20, health: 80,
    description: 'Reduce el daño recibido por aliados cercanos', icon: '🐚',
    shieldRadius: 2.5, damageReduction: 0.3,
  },
  collector: {
    name: 'Coral', category: TURRET_CATEGORY.collector, color: '#F59E0B',
    damage: 0, range: 0, fireRate: 0, cost: 20, health: 40,
    description: 'Recolecta automáticamente el recurso sobre el que está construida', icon: '🪸',
    collectRate: 180, collectAmount: 4,
  },
};

export const POWERUP_TYPES = {
  health: { name: 'Vida', color: '#22C55E', icon: '❤️', duration: 0, value: 25 },
  build:  { name: 'Construcción Rápida', color: '#A855F7', icon: '⚡', duration: 300, value: 0.5 },
  attack: { name: 'Boost Ataque', color: '#EF4444', icon: '⚔️', duration: 300, value: 1.5 },
  shield: { name: 'Escudo', color: '#3B82F6', icon: '🛡️', duration: 200, value: 0.5 },
};

export const UPGRADE_NAMES = {
  fabrication: 'Habilidad de Construcción',
  fatigue: 'Stamina Máxima',
  shooting: 'Daño de Disparo',
  reload_speed: 'Velocidad de Recarga',
  health: 'Salud Máxima',
  magazine: 'Cargador',
  charge_speed: 'Velocidad de Recuperación de Stamina',
  turret_health: 'Salud de Torreta',
  turret_damage: 'Daño de Torreta',
  turret_build: 'Velocidad Construcción de Torreta',
  collector_rate: 'Velocidad de Recolección',
};

export const UPGRADE_ICONS = {
  fabrication: '🔧',
  fatigue: '🏃',
  shooting: '🔫',
  reload_speed: '⏱️',
  health: '❤️',
  magazine: '📦',
  charge_speed: '⚡',
  turret_health: '🛡️',
  turret_damage: '💥',
  turret_build: '🏗️',
  collector_rate: '⛏️',
};

// ── UPGRADE CATEGORIES ────────────────────────────────────────────────────────
export const CHARACTER_UPGRADES = ['fabrication', 'health', 'magazine', 'charge_speed', 'reload_speed', 'shooting', 'fatigue'];
export const TURRET_UPGRADES = ['turret_health', 'turret_damage', 'turret_build', 'collector_rate'];
export const TURRET_UPGRADE_KEYS_BY_TYPE = {
  classic:  ['turret_damage', 'turret_health', 'turret_build'],
  jelly:   ['turret_damage', 'turret_health', 'turret_build'],
  fire:     ['turret_damage', 'turret_health', 'turret_build'],
  laser:    ['turret_damage', 'turret_health', 'turret_build'],
  shield:   ['turret_health', 'turret_build'],
  collector: ['collector_rate', 'turret_health', 'turret_build']
};

export function getTurretUpgradeKeys(type) {
  return TURRET_UPGRADE_KEYS_BY_TYPE[type] || ['turret_health', 'turret_build'];
}

export function buildDefaultTurretUpgrades() {
  return Object.keys(TURRET_TYPES).reduce((acc, type) => {
    acc[type] = getTurretUpgradeKeys(type).reduce((obj, key) => {
      obj[key] = 0;
      return obj;
    }, {});
    return acc;
  }, {});
}

export const UPGRADE_COSTS = {
  fabrication:   [0, 30,  75, 150, 300],
  fatigue:       [0, 25,  60, 120, 240],
  shooting:      [0, 35,  85, 170, 340],
  reload_speed:  [0, 30,  75, 150, 300],
  health:        [0, 40, 100, 200, 400],
  magazine:      [0, 30,  75, 150, 300],
  charge_speed:  [0, 25,  60, 120, 240],
  turret_health: [0, 35,  80, 160, 320],
  turret_damage: [0, 40,  95, 190, 380],
  turret_build:  [0, 30,  70, 140, 280],
  collector_rate:[0, 30,  70, 140, 280],
};

// ── CHARACTERS (ordered by unlockLevel) ──────────────────────────────────────
export const CHARACTERS = {
  dolphin: {
    id: 'dolphin', name: 'Delfín', icon: '🐬',
    description: 'El explorador del mar. Equilibrado en todo.',
    color: '#3B82F6', unlockLevel: 1,
    stats: { healthBonus: 0, magazineBonus: 0, damageBonus: 0, fatigueBonus: 0, speedPenalty: 0 },
    ability: null,
  },
  octopus: {
    id: 'octopus', name: 'Pulpo', icon: '🐙',
    description: 'Habilidad especial: gasta 1 bala y dispara 8 en la dirección apuntada en abanico.',
    color: '#A855F7', unlockLevel: 3,
    stats: { healthBonus: -10, magazineBonus: 5, damageBonus: 0, fatigueBonus: 1, speedPenalty: 0 },
    ability: { name: 'Racimo De Tentáculos', key: 'q', cost: 1, icon: '🐙' },
  },
  shark: {
    id: 'shark', name: 'Tiburón', icon: '🦈',
    description: 'Habilidad: clica una casilla y se abalanza hacia ella dañando todo lo que encuentre a su paso.',
    color: '#64748B', unlockLevel: 5,
    stats: { healthBonus: 20, magazineBonus: 0, damageBonus: 10, fatigueBonus: 0, speedPenalty: 0 },
    ability: { name: 'Embestida Mortal', key: 'q', cost: 0, icon: '🦈' },
  },
  tank: {
    id: 'tank', name: 'Ballena', icon: '🐋',
    description: 'Gran resistencia, se mueve más lento. Habilidad: recupera 30 de vida.',
    color: '#6B7280', unlockLevel: 7,
    stats: { healthBonus: 60, magazineBonus: 0, damageBonus: 5, fatigueBonus: -1, speedPenalty: 10 },
    ability: { name: 'Ingesta de Plácton', key: 'q', cost: 0, icon: '💚' },
  },
  thorns: {
    id: 'thorns', name: 'Pez Globo', icon: '🐡',
    description: 'Pez que se infla rápidamente absorbiendo agua. Habilidad: se infla, reduciendo el daño recibido un 50% dañando al rival un 25% por 5 segundos.',
    color: '#b3b14f', unlockLevel: 9,
    stats: { healthBonus: 10, magazineBonus: 0, damageBonus: 0, fatigueBonus: 0, speedPenalty: 0 },
    ability: { name: 'Inflación de Más', key: 'q', cost: 0, icon: '🐡' },
  },
  sniper: {
    id: 'sniper', name: 'Pez Espada', icon: '🐟',
    description: 'Habilidad: disparo teledirigido que hace el triple de daño e ignora escudos.',
    color: '#10B981', unlockLevel: 10,
    stats: { healthBonus: -20, magazineBonus: -3, damageBonus: 20, fatigueBonus: 1, speedPenalty: 0 },
    ability: { name: 'Espada Marina', key: 'q', cost: 1, icon: '🗡️' },
  },
};

// ── PROGRESSION UNLOCKS ──────────────────────────────────────────────────────
export const PROGRESSION_UNLOCKS = [
  { level: 1,  type: 'turret',    id: 'classic',   label: 'Torreta Gamba' },
  { level: 1,  type: 'character', id: 'dolphin',   label: 'Personaje: Delfín' },
  { level: 2,  type: 'turret',    id: 'jelly',     label: 'Torreta Medusa' },
  { level: 3,  type: 'character', id: 'octopus',   label: 'Personaje: Pulpo' },
  { level: 4,  type: 'turret',    id: 'fire',      label: 'Torreta Chorro Abisal' },
  { level: 5,  type: 'character', id: 'shark',     label: 'Personaje: Tiburón' },
  { level: 6,  type: 'turret',    id: 'shield',    label: 'Torreta Concha' },
  { level: 7,  type: 'turret',    id: 'laser',     label: 'Torreta Faro' },
  { level: 8,  type: 'character', id: 'tank',      label: 'Personaje: Ballena' },
  { level: 9,  type: 'character', id: 'thorns',    label: 'Personaje: Pez Globo' },
  { level: 10, type: 'character', id: 'sniper',    label: 'Personaje: Pez Espada' },
];

export function getUnlockedTurrets(playerLevel) {
  return PROGRESSION_UNLOCKS.filter(u => u.type === 'turret' && u.level <= playerLevel).map(u => u.id);
}

export function getUnlockedCharacters(playerLevel) {
  return PROGRESSION_UNLOCKS.filter(u => u.type === 'character' && u.level <= playerLevel).map(u => u.id);
}

export function getOffensiveTurrets(playerLevel) {
  const unlocked = getUnlockedTurrets(playerLevel);
  return Object.entries(TURRET_TYPES).filter(([id, cfg]) => cfg.category === TURRET_CATEGORY.offensive && unlocked.includes(id));
}

export function getPlayerLevel(xp) {
  return getPlayerRankFromXp(xp);
}

export function getNextUnlock(playerLevel) {
  return PROGRESSION_UNLOCKS.find(u => u.level === playerLevel + 1) || null;
}

export function getNextUnlockForRank(rank) {
  return PROGRESSION_UNLOCKS.find(u => u.level === rank + 1) || null;
}

export function getGridSize(level) {
  const s = Math.min(7 + Math.floor(level / 2) * 2, 15);
  return s % 2 === 1 ? s : s + 1;
}

export function getAIDifficulty(level) {
  return {
    reactionSpeed: Math.max(120 - level * 10, 20),
    accuracy: Math.min(0.3 + level * 0.07, 0.95),
    buildRate: Math.max(200 - level * 15, 40),
    aggressiveness: Math.min(0.2 + level * 0.08, 0.9),
    turretBudget: 10 + level * 5,
    healthMultiplier: 1 + level * 0.15,
    damageMultiplier: 1 + level * 0.1,
  };
}

// ── WEATHER SYSTEM ────────────────────────────────────────────────────────────
export const WEATHER_TYPES = {
  calm: {
    id: 'calm', name: 'Calma', icon: '🌊',
    description: 'Mar en calma. Sin efectos.',
    color: '#3B82F6', bgTint: null, effects: {},
  },
  storm: {
    id: 'storm', name: 'Tormenta', icon: '⛈️',
    description: 'Visibilidad reducida. Precisión del jugador -30%.',
    color: '#6B7280', bgTint: 'rgba(30,30,60,0.35)',
    effects: { playerAccuracyPenalty: 0.3, fogOverlay: true },
  },
  swell: {
    id: 'swell', name: 'Oleaje', icon: '🌊💥',
    description: 'Oleaje fuerte. Costo de construcción +50%.',
    color: '#0EA5E9', bgTint: 'rgba(14,165,233,0.12)',
    effects: { buildCostMultiplier: 1.5 },
  },
  heat: {
    id: 'heat', name: 'Calor Abrasador', icon: '☀️',
    description: 'Calor extremo. Fatiga se acumula un 40% más rápido.',
    color: '#F97316', bgTint: 'rgba(249,115,22,0.10)',
    effects: { fatiguePenalty: 1.4 },
  },
  fog: {
    id: 'fog', name: 'Niebla Marina', icon: '🌫️',
    description: 'Niebla densa. Rango de torretas reducido a la mitad.',
    color: '#94A3B8', bgTint: 'rgba(148,163,184,0.18)',
    effects: { turretRangeMultiplier: 0.5, fogOverlay: true },
  },
};

const WEATHER_ROTATION = ['calm', 'storm', 'swell', 'heat', 'fog'];

export function getWeatherForLevel(level) {
  const idx = Math.floor((level - 1) / 5) % WEATHER_ROTATION.length;
  const key = /** @type {keyof typeof WEATHER_TYPES} */ (WEATHER_ROTATION[idx]);
  return WEATHER_TYPES[key];
}

// ── XP SYSTEM ─────────────────────────────────────────────────────────────────
export function getXpForLevel(rank) {
  return rank <= 1 ? 0 : Math.floor(150 * Math.pow(rank - 1, 1.7));
}

export function getPlayerRankFromXp(xp) {
  let rank = 1;
  while (getXpForLevel(rank + 1) <= (xp || 0) && rank < 10) rank++;
  return rank;
}

export function getXpReward(level, won) {
  return won ? 80 + level * 20 : 20 + level * 5;
}