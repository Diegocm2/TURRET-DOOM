import { TILE_SIZE, COLORS, TURRET_TYPES, TURRET_CATEGORY, POWERUP_TYPES, CHARACTERS, getGridSize, getAIDifficulty, getWeatherForLevel, getTurretUpgradeKeys } from './GameConstants';

const ZONE_W = 180;   // resource zone width (left rectangle)
const ZONE_GAP = 10;  // gap between zone and grid
const GRID_PAD = 12;  // padding around canvas edges

function lightColor(hex) {
  try {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 0xff) + 60);
    const g = Math.min(255, ((n >> 8) & 0xff) + 60);
    const b = Math.min(255, (n & 0xff) + 60);
    return `rgb(${r},${g},${b})`;
  } catch { return hex; }
}

export class GameEngine {
  // Hex boundary: cube-coord check max(|q|,|s|,|q+s|) <= r
  // where q = gx - cx, s = gy - cy, r = floor(N/2)
  hexR() { return Math.floor(this.gridSize / 2); }
  hexCX() { return Math.floor(this.gridSize / 2); }
  hexCY() { return Math.floor(this.gridSize / 2); }
  isValidHexCell(gx, gy) {
    const q = gx - this.hexCX(), s = gy - this.hexCY();
    return Math.max(Math.abs(q), Math.abs(s), Math.abs(q + s)) <= this.hexR();
  }

  // Screen position of tile center
  cellCX(gx) { return this.gridOriginX + gx * TILE_SIZE + TILE_SIZE / 2; }
  cellCY(gy) { return this.gridOriginY + gy * TILE_SIZE + TILE_SIZE / 2; }

  // Find middle-of-side start positions
  getStartPositions() {
    const N = this.gridSize;
    // Left side: gx=0, collect all valid gy
    const leftYs = [];
    for (let gy = 0; gy < N; gy++) if (this.isValidHexCell(0, gy)) leftYs.push(gy);
    const rightYs = [];
    for (let gy = 0; gy < N; gy++) if (this.isValidHexCell(N - 1, gy)) rightYs.push(gy);
    return {
      playerX: 0,
      playerY: leftYs[Math.floor(leftYs.length / 2)],
      enemyX: N - 1,
      enemyY: rightYs[Math.floor(rightYs.length / 2)],
    };
  }

  constructor(canvas, level, upgrades, onGameEnd, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.level = level;
    this.upgrades = upgrades || {};
    this.turretUpgrades = this.upgrades.turretUpgrades || {};
    const { turretUpgrades, ...characterUpgrades } = this.upgrades;
    this.upgrades = { ...characterUpgrades };
    this.onGameEnd = onGameEnd;
    this.gridSize = getGridSize(level); // always odd
    this.aiDifficulty = getAIDifficulty(level);
    this.running = false;
    this.paused = false;
    this.frameCount = 0;
    this.animationId = null;

    // Layout
    const N = this.gridSize;
    this.gridOriginX = ZONE_W + ZONE_GAP + GRID_PAD;
    this.gridOriginY = GRID_PAD;
    this.totalWidth = this.gridOriginX + N * TILE_SIZE + GRID_PAD;
    this.totalHeight = N * TILE_SIZE + 2 * GRID_PAD;

    // Resource zone rectangle (left side)
    this.resourceZone = {
      x: GRID_PAD,
      y: GRID_PAD,
      w: ZONE_W,
      h: this.totalHeight - 2 * GRID_PAD,
    };

    canvas.width = this.totalWidth;
    canvas.height = this.totalHeight;

    // Character (player)
    this.characterId = options.character || 'dolphin';
    this.characterCfg = CHARACTERS[this.characterId] || CHARACTERS.dolphin;

    // AI character — pick a random one based on level
    const charIds = Object.keys(CHARACTERS);
    const aiCharIdx = Math.min(Math.floor(this.level / 2), charIds.length - 1);
    this.aiCharacterId = charIds[aiCharIdx];
    this.aiCharacterCfg = CHARACTERS[this.aiCharacterId] || CHARACTERS.dolphin;

    // Turret selection
    this.selectedTurret = options.offensiveTurret || 'classic';
    this.selectedDefensive = 'shield';
    this.turretMode = 'offensive';
    this.abilityCooldown = 0;
    this.sharkDashMode = false; // tiburón: esperando clic para embestir

    // Sound effects (placeholder files in public/assets/sounds)
    this.sounds = {
      turretFire: this.loadSound('/assets/sounds/turret-fire.wav'),
      turretBuild: this.loadSound('/assets/sounds/turret-build.wav'),
      collector: this.loadSound('/assets/sounds/collector-sfx.wav'),
      ability: this.loadSound('/assets/sounds/ability.wav'),
    };

    // Weather
    this.weather = getWeatherForLevel(level);

    // Mouse
    this.mouse = { x: 0, y: 0, down: false, rightDown: false };
    this.mouseOnGrid = false;
    this.hoveredTile = null;

    // Start positions
    const { playerX, playerY, enemyX, enemyY } = this.getStartPositions();
    this.player = this.createFighter(playerX, playerY, true);
    this.enemy = this.createFighter(enemyX, enemyY, false);

    this.playerTurrets = [];
    this.enemyTurrets = [];
    this.bullets = [];
    this.particles = [];
    this.resources = [];
    this.powerups = [];
    this.floatingTexts = [];
    this.fireZones = [];

    this.playerResources = 20;
    this.collectedResources = 0;

    this.gridResources = [];
    this.gridPowerups = [];

    this.spawnResources();
    this.spawnPowerups();
    this.spawnGridResources();
    this.spawnGridPowerups();

    this.playerEffects = { attack: 0, build: 0, shield: 0 };

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);

    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  getTurretUpgradeValue(type, key) {
    return this.turretUpgrades?.[type]?.[key] || 0;
  }

  getFighterXY(gx, gy) { return { x: this.cellCX(gx), y: this.cellCY(gy) }; }
  getTurretXY(gx, gy) { return { x: this.cellCX(gx), y: this.cellCY(gy) }; }

  createFighter(gridX, gridY, isPlayer) {
    const charCfg = isPlayer ? this.characterCfg : this.aiCharacterCfg;
    const charStats = charCfg?.stats || {};
    const baseHealth = 100 + (charStats.healthBonus || 0) + (isPlayer ? (this.upgrades.health || 0) * 25 : this.aiDifficulty.healthMultiplier * 50);
    const baseMagazine = 10 + (charStats.magazineBonus || 0) + (isPlayer ? (this.upgrades.magazine || 0) * 3 : Math.floor(this.level * 1.5));
    const pos = this.getFighterXY(gridX, gridY);
    return {
      gridX, gridY, x: pos.x, y: pos.y,
      health: baseHealth, maxHealth: baseHealth,
      ammo: 0, maxAmmo: baseMagazine,
      fatigue: 0, maxFatigue: 100,
      fatigueRecovery: 0.3 + (isPlayer ? (this.upgrades.fatigue || 0) * 0.1 : this.level * 0.03),
      reloadTimer: 0,
      reloadRate: Math.max(80 - (isPlayer ? (this.upgrades.reload_speed || 0) * 6 : this.level * 3), 15),
      shootDamage: 10 + (charStats.damageBonus || 0) + (isPlayer ? (this.upgrades.shooting || 0) * 3 : this.aiDifficulty.damageMultiplier * 5),
      fatigueExtra: charStats.speedPenalty || 0,
      characterId: isPlayer ? this.characterId : this.aiCharacterId,
      bobOffset: Math.random() * Math.PI * 2, // phase offset for bob animation
      isPlayer, alive: true, shootCooldown: 0, stunTimer: 0,
    };
  }

  // Audio helpers
  loadSound(src) {
    if (typeof Audio === 'undefined') return null;
    try {
      const sound = new Audio(src);
      sound.preload = 'auto';
      return sound;
    } catch {
      return null;
    }
  }

  getSoundVolume() {
    if (typeof window === 'undefined') return 0.7;
    const value = Number(window.localStorage.getItem('turret-doom-volume') || 70);
    return Math.max(0, Math.min(1, value / 100));
  }

  playSound(name) {
    const sound = this.sounds?.[name];
    if (!sound) return;
    try {
      const instance = sound.cloneNode(true);
      instance.volume = this.getSoundVolume();
      instance.play().catch(() => {});
    } catch {
      try {
        sound.volume = this.getSoundVolume();
        sound.play().catch(() => {});
      } catch {}
    }
  }

  // ── SPECIAL ABILITY ──────────────────────────────────────────────────────
  useSpecialAbility() {
    const p = this.player;
    if (!p.alive || this.abilityCooldown > 0 || !this.characterCfg.ability) return;
    const ability = this.characterCfg.ability;
    // cost 0 means no ammo needed (tank)
    if (ability.cost > 0 && p.ammo < ability.cost) return;

    const COOLDOWN = 1500; // 25 seconds at 60fps

    if (this.characterId === 'octopus') {
      this.playSound('ability');
      p.ammo -= ability.cost;
      const baseAngle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
      const spread = Math.PI / 2; // 90° total spread
      for (let i = 0; i < 8; i++) {
        const angle = baseAngle - spread / 2 + (spread / 7) * i;
        this.bullets.push({
          x: p.x, y: p.y,
          vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
          damage: p.shootDamage * 0.8,
          isPlayer: true, type: 'normal', life: 150,
        });
      }
      this.abilityCooldown = COOLDOWN;
      this.addFloatingText('🐙 ¡Tentáculos!', p.x, p.y - 30, '#A855F7');

    } else if (this.characterId === 'tank') {
      // Heal 30 HP (capped at max)
      const healed = Math.min(30, p.maxHealth - p.health);
      p.health = Math.min(p.maxHealth, p.health + 30);
      this.abilityCooldown = COOLDOWN;
      this.addFloatingText(`💚 +${Math.round(healed)} vida`, p.x, p.y - 30, '#22C55E');

    } else if (this.characterId == 'thorns') {
      this.playSound('ability');
      // Activar efecto de espinas por 5 segundos
      this.playerEffects.shield = 300; 
      this.abilityCooldown = COOLDOWN;
      this.addFloatingText('🐡 ¡Espinas activadas!', p.x, p.y - 30, '#b3b14f');

    } else if (this.characterId === 'sniper') {
      p.ammo -= ability.cost;
      // Homing: always targets the enemy fighter directly
      const target = this.enemy;
      const angle = Math.atan2(target.y - p.y, target.x - p.x);
      this.bullets.push({
        x: p.x, y: p.y,
        vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12,
        damage: p.shootDamage * 3,
        isPlayer: true, type: 'homing', life: 400, piercing: true,
        targetRef: target, // tracks the enemy position
      });
      this.abilityCooldown = COOLDOWN;
      this.addFloatingText('🗡️ ¡Espada Marina!', p.x, p.y - 30, '#10B981');

    } else if (this.characterId === 'shark') {
      // [Q] activa el modo embestida: el siguiente clic en el grid ejecuta la embestida
      this.sharkDashMode = true;
      this.addFloatingText('🦈 ¡Elige destino!', p.x, p.y - 30, '#64748B');
    }
  }

  // Ejecutar la embestida del tiburón hacia una casilla objetivo
  executeSharkDash(targetGX, targetGY) {
    const p = this.player;
    if (!p.alive || !this.isValidHexCell(targetGX, targetGY)) return;
    this.sharkDashMode = false;

    // Línea recta: preferir eje con mayor diferencia, luego moverse solo en ese eje
    const dx = targetGX - p.gridX;
    const dy = targetGY - p.gridY;
    const steps = [];
    if (Math.abs(dx) >= Math.abs(dy)) {
      // Horizontal primero, luego vertical
      for (let i = 1; i <= Math.abs(dx); i++) steps.push({ gx: p.gridX + Math.sign(dx) * i, gy: p.gridY });
      for (let i = 1; i <= Math.abs(dy); i++) steps.push({ gx: targetGX, gy: p.gridY + Math.sign(dy) * i });
    } else {
      // Vertical primero, luego horizontal
      for (let i = 1; i <= Math.abs(dy); i++) steps.push({ gx: p.gridX, gy: p.gridY + Math.sign(dy) * i });
      for (let i = 1; i <= Math.abs(dx); i++) steps.push({ gx: p.gridX + Math.sign(dx) * i, gy: targetGY });
    }
    // Filtrar celdas válidas
    const validSteps = steps.filter(s => this.isValidHexCell(s.gx, s.gy));

    const dashDamage = p.shootDamage * 1.5;
    validSteps.forEach((step, i) => {
      setTimeout(() => {
        if (!this.running) return;
        // Dañar enemigos en esta casilla
        const allEnemies = [this.enemy, ...this.enemyTurrets.filter(t => t.alive)];
        for (const ent of allEnemies) {
          if (ent.gridX === step.gx && ent.gridY === step.gy) {
            ent.health -= dashDamage;
            this.spawnParticles(ent.x, ent.y, '#94A3B8', 8);
            if (ent.health <= 0) this.handleDeath(ent);
          }
        }
        // Mover jugador
        p.gridX = step.gx; p.gridY = step.gy;
        const np = this.getFighterXY(step.gx, step.gy);
        p.x = np.x; p.y = np.y;
      }, i * 40);
    });

    const COOLDOWN = 1500;
    this.abilityCooldown = COOLDOWN;
    this.addFloatingText('🦈 ¡Embestida!', p.x, p.y - 30, '#64748B');
  }

  handleContextMenu(e) { e.preventDefault(); }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.totalWidth / rect.width;
    const scaleY = this.totalHeight / rect.height;
    this.mouse.x = (e.clientX - rect.left) * scaleX;
    this.mouse.y = (e.clientY - rect.top) * scaleY;

    const gx = Math.floor((this.mouse.x - this.gridOriginX) / TILE_SIZE);
    const gy = Math.floor((this.mouse.y - this.gridOriginY) / TILE_SIZE);
    const onGrid = gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize && this.isValidHexCell(gx, gy);
    this.mouseOnGrid = onGrid;
    this.hoveredTile = onGrid ? { x: gx, y: gy } : null;
  }

  handleMouseDown(e) {
    if (e.button === 0) {
      this.mouse.down = true;
      if (this.mouseOnGrid && this.sharkDashMode && this.hoveredTile) {
        this.executeSharkDash(this.hoveredTile.x, this.hoveredTile.y);
      } else if (this.mouseOnGrid) {
        this.playerShoot();
      } else if (this.mouse.x >= this.resourceZone.x && this.mouse.x <= this.resourceZone.x + this.resourceZone.w &&
                 this.mouse.y >= this.resourceZone.y && this.mouse.y <= this.resourceZone.y + this.resourceZone.h) {
        // Click on resource zone — try to collect clicked resource
        this.collectClickedResource();
      }
    } else if (e.button === 2) {
      this.mouse.rightDown = true;
      if (this.mouseOnGrid && this.hoveredTile)
        this.playerBuildTurret(this.hoveredTile.x, this.hoveredTile.y);
    }
  }

  handleMouseUp(e) {
    if (e.button === 0) this.mouse.down = false;
    if (e.button === 2) this.mouse.rightDown = false;
  }

  handleKeyDown(e) {
    if (this.paused || !this.player.alive) return;
    const p = this.player;
    let dx = 0, dy = 0;

    switch (e.key.toLowerCase()) {
      // Simple flat-grid controls: W=up, S=down, A=left, D=right
      case 'w': case 'arrowup':    dy = -1; break;
      case 's': case 'arrowdown':  dy =  1; break;
      case 'a': case 'arrowleft':  dx = -1; break;
      case 'd': case 'arrowright': dx =  1; break;
      case '1': this.selectedTurret = 'classic'; this.turretMode = 'offensive'; return;
      case '2': this.selectedTurret = 'jelly';  this.turretMode = 'offensive'; return;
      case '3': this.selectedTurret = 'fire';    this.turretMode = 'offensive'; return;
      case '4': this.selectedTurret = 'laser';   this.turretMode = 'offensive'; return;
      case '5': this.selectedDefensive = 'shield';    this.turretMode = 'support'; return;
      case '6': this.selectedDefensive = 'collector'; this.turretMode = 'support'; return;
      case 'tab': e.preventDefault(); this.turretMode = this.turretMode === 'offensive' ? 'support' : 'offensive'; return;
      case 'q': this.useSpecialAbility(); return;
      default: return;
    }

    e.preventDefault();
    const newX = p.gridX + dx;
    const newY = p.gridY + dy;

    if (!this.isValidHexCell(newX, newY)) return;
    if (p.fatigue >= p.maxFatigue || p.stunTimer > 0) return;
    if (this.isTileOccupied(newX, newY)) return;

    const fatigueMult = this.weather?.effects?.fatiguePenalty || 1;
    p.fatigue = Math.min(p.maxFatigue, p.fatigue + Math.max(5, (20 + (p.fatigueExtra || 0) - (this.upgrades.fatigue || 0) * 2) * fatigueMult));
    // If just hit max fatigue, apply 5-second stun (300 frames @ 60fps)
    if (p.fatigue >= p.maxFatigue) { p.stunTimer = 300; }
    p.gridX = newX; p.gridY = newY;
    const np = this.getFighterXY(newX, newY);
    p.x = np.x; p.y = np.y;
  }

  isTileOccupied(gx, gy) {
    if ([...this.playerTurrets, ...this.enemyTurrets].some(t => t.gridX === gx && t.gridY === gy && t.alive)) return true;
    if (this.player.gridX === gx && this.player.gridY === gy) return true;
    if (this.enemy.gridX === gx && this.enemy.gridY === gy) return true;
    return false;
  }

  isAdjacentToFighter(gx, gy, fighter) {
    return Math.abs(gx - fighter.gridX) <= 1 && Math.abs(gy - fighter.gridY) <= 1;
  }

  playerShoot() {
    const p = this.player;
    if (!p.alive || p.ammo <= 0 || p.shootCooldown > 0) return;
    // Weather: storm reduces accuracy
    const accuracyPenalty = this.weather?.effects?.playerAccuracyPenalty || 0;
    if (accuracyPenalty > 0 && Math.random() < accuracyPenalty) {
      p.ammo--;
      p.shootCooldown = 15;
      this.addFloatingText('❌ fallo', p.x, p.y - 20, '#94A3B8');
      return;
    }
    const angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
    this.bullets.push({
      x: p.x, y: p.y,
      vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
      damage: p.shootDamage * (this.playerEffects.attack > 0 ? 1.5 : 1),
      isPlayer: true, type: 'normal', life: 150,
    });
    p.ammo--;
    p.shootCooldown = 15;
  }

  playerBuildTurret(gx, gy) {
    const p = this.player;
    if (!p.alive) return;
    if (!this.isAdjacentToFighter(gx, gy, p)) {
      this.addFloatingText('¡Muy lejos!', p.x, p.y - 20, '#EF4444');
      return;
    }

    const pwIdx = this.gridPowerups.findIndex(pw => pw.gridX === gx && pw.gridY === gy);
    if (pwIdx !== -1) {
      this.applyPowerup(this.gridPowerups[pwIdx], true);
      this.gridPowerups.splice(pwIdx, 1);
      return;
    }

    if (this.isTileOccupied(gx, gy)) {
      this.addFloatingText('¡Ocupado!', p.x, p.y - 20, '#EF4444');
      return;
    }

    const selectedType = this.turretMode === 'offensive' ? this.selectedTurret : this.selectedDefensive;
    const cfg = TURRET_TYPES[selectedType];

    if (cfg.category === TURRET_CATEGORY.collector) {
      if (!this.gridResources.some(r => r.gridX === gx && r.gridY === gy)) {
        this.addFloatingText('¡Solo en recursos!', p.x, p.y - 20, '#F59E0B')    ;
        return;
      }
    }

    const buildMultiplier = this.weather?.effects?.buildCostMultiplier || 1;
    const cost = Math.max(1, Math.ceil((cfg.cost - (this.upgrades.fabrication || 0) * 2) * buildMultiplier));
    if (this.playerResources < cost) {
      this.addFloatingText('¡Sin recursos!', p.x, p.y - 20, '#EF4444');
      return;
    }

    this.playerResources -= cost;
    const buildTime = this.playerEffects.build > 0
      ? 30
      : Math.max(
          30,
          120 - this.getTurretUpgradeValue(selectedType, 'turret_build') * 15
        );
    const turret = this.createTurret(gx, gy, selectedType, true, buildTime);
    if (cfg.category === TURRET_CATEGORY.collector) turret.collectTimer = 0;
    this.playerTurrets.push(turret);
    this.addFloatingText(`-${cost} 🪙`, p.x, p.y - 20, COLORS.resource);
    this.playSound('turretBuild');
  }

  createTurret(gx, gy, type, isPlayer, buildTime = 120) {
    const cfg = TURRET_TYPES[type];
    const upgradeKeys = getTurretUpgradeKeys(type);
    const healthBonus = isPlayer && upgradeKeys.includes('turret_health')
      ? this.getTurretUpgradeValue(type, 'turret_health') * 10
      : isPlayer
        ? 0
        : this.aiDifficulty.healthMultiplier * 15;
    const damageBonus = isPlayer && upgradeKeys.includes('turret_damage')
      ? this.getTurretUpgradeValue(type, 'turret_damage') * 2
      : isPlayer
        ? 0
        : this.aiDifficulty.damageMultiplier * 3;
    const pos = this.getTurretXY(gx, gy);
    return {
      gridX: gx, gridY: gy, x: pos.x, y: pos.y,
      type, category: cfg.category,
      health: cfg.health + healthBonus, maxHealth: cfg.health + healthBonus,
      damage: cfg.damage + damageBonus,
      range: cfg.range, fireRate: cfg.fireRate, fireTimer: 0,
      isPlayer, alive: true, building: true,
      buildTimer: buildTime, buildMax: buildTime,
    };
  }

  // Called when player presses E — picks up all resources/powerups in the zone near player
  collectClickedResource() {
    const p = this.player;
    if (!p.alive) return;
    const resourceRadius = 12; // Hit detection radius for resources

    // Check if clicking directly on a resource
    for (let i = 0; i < this.resources.length; i++) {
      const r = this.resources[i];
      const dx = this.mouse.x - r.x;
      const dy = this.mouse.y - r.y;
      if (Math.hypot(dx, dy) < resourceRadius) {
        this.playerResources += r.value;
        this.collectedResources += r.value;
        this.addFloatingText(`+${r.value} 🪙`, r.x, r.y - 10, COLORS.resource);
        this.spawnParticles(r.x, r.y, COLORS.resource, 5);
        this.resources.splice(i, 1);
        return;
      }
    }

    // Check if clicking directly on a powerup
    for (let i = 0; i < this.powerups.length; i++) {
      const pw = this.powerups[i];
      const dx = this.mouse.x - pw.x;
      const dy = this.mouse.y - pw.y;
      if (Math.hypot(dx, dy) < resourceRadius) {
        this.applyPowerup(pw, false);
        this.powerups.splice(i, 1);
        return;
      }
    }
  }

  // Legacy: kept for internal use
  collectNearbyResources() {
    this.collectClickedResource();
  }

  // Legacy: kept for internal use
  collectResource() {
    this.collectNearbyResources();
  }

  applyPowerup(pw, fromGrid = false) {
    const cfg = POWERUP_TYPES[pw.type];
    const px = fromGrid ? this.cellCX(pw.gridX) : pw.x;
    const py = fromGrid ? this.cellCY(pw.gridY) : pw.y;
    if (pw.type === 'health') {
      this.player.health = Math.min(this.player.health + cfg.value, this.player.maxHealth);
      this.addFloatingText(`+${cfg.value} ❤️`, this.player.x, this.player.y - 20, COLORS.health);
    } else {
      this.playerEffects[pw.type] = cfg.duration;
      this.addFloatingText(`${cfg.name}!`, this.player.x, this.player.y - 20, cfg.color);
    }
    this.spawnParticles(px, py, cfg.color, 8);
  }

  // Resources spawn inside the left rectangle zone
  createResource() {
    const z = this.resourceZone;
    return {
      x: z.x + 18 + Math.random() * (z.w - 36),
      y: z.y + 30 + Math.random() * (z.h - 60),
      value: 3 + Math.floor(Math.random() * 5),
      pulse: Math.random() * Math.PI * 2,
    };
  }

  spawnResources() {
    for (let i = 0; i < 8 + this.level * 2; i++) this.resources.push(this.createResource());
  }

  spawnPowerups() {
    const types = ['health', 'build', 'attack', 'shield'];
    for (let i = 0; i < 3; i++) {
      const z = this.resourceZone;
      this.powerups.push({
        x: z.x + 18 + Math.random() * (z.w - 36),
        y: z.y + 30 + Math.random() * (z.h - 60),
        type: types[Math.floor(Math.random() * types.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  spawnGridResources() {
    const count = 4 + Math.floor(this.gridSize / 3);
    const { playerX, playerY, enemyX, enemyY } = this.getStartPositions();
    const occupied = new Set([`${playerX},${playerY}`, `${enemyX},${enemyY}`]);
    let attempts = 0;
    while (this.gridResources.length < count && attempts < 400) {
      attempts++;
      const gx = Math.floor(Math.random() * this.gridSize);
      const gy = Math.floor(Math.random() * this.gridSize);
      const key = `${gx},${gy}`;
      if (!occupied.has(key) && this.isValidHexCell(gx, gy)) {
        occupied.add(key);
        this.gridResources.push({ gridX: gx, gridY: gy, value: 3 + Math.floor(Math.random() * 4), pulse: Math.random() * Math.PI * 2 });
      }
    }
  }

  spawnGridPowerups() {
    const count = 2 + Math.floor(this.level / 2);
    const { playerX, playerY, enemyX, enemyY } = this.getStartPositions();
    const occupied = new Set([
      ...this.gridResources.map(r => `${r.gridX},${r.gridY}`),
      `${playerX},${playerY}`, `${enemyX},${enemyY}`,
    ]);
    const types = ['health', 'build', 'attack', 'shield'];
    let placed = 0, attempts = 0;
    while (placed < count && attempts < 400) {
      attempts++;
      const gx = Math.floor(Math.random() * this.gridSize);
      const gy = Math.floor(Math.random() * this.gridSize);
      const key = `${gx},${gy}`;
      if (!occupied.has(key) && this.isValidHexCell(gx, gy)) {
        occupied.add(key);
        this.gridPowerups.push({ gridX: gx, gridY: gy, type: types[Math.floor(Math.random() * types.length)], pulse: Math.random() * Math.PI * 2 });
        placed++;
      }
    }
  }

  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({ text, x, y, color, life: 60, maxLife: 60 });
  }

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, life: 20 + Math.random() * 20, maxLife: 40, size: 2 + Math.random() * 3 });
    }
  }

  // === AI ===
  updateAI() {
    const e = this.enemy;
    if (!e.alive) return;
    if (this.frameCount % Math.max(this.aiDifficulty.reactionSpeed, 10) === 0) this.aiDecide();
    if (e.ammo < e.maxAmmo) { e.reloadTimer++; if (e.reloadTimer >= e.reloadRate) { e.ammo++; e.reloadTimer = 0; } }
    if (e.shootCooldown > 0) e.shootCooldown--;
    if (e.ammo > 0 && e.shootCooldown <= 0 && Math.random() < this.aiDifficulty.accuracy) this.aiShoot();
  }

  aiDecide() {
    const e = this.enemy, p = this.player;
    const dist = Math.abs(e.gridX - p.gridX) + Math.abs(e.gridY - p.gridY);

    if (this.frameCount % this.aiDifficulty.buildRate === 0 && this.enemyTurrets.length < this.aiDifficulty.turretBudget) {
      const offensiveTypes = ['classic', 'jelly', 'fire', 'laser'].filter((_, i) => i <= Math.floor(this.level / 2));
      const defensiveTypes = this.level >= 3 ? ['shield', 'wall'] : [];
      const all = [...offensiveTypes, ...defensiveTypes];
      const type = all[Math.floor(Math.random() * all.length)];
      const offsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
      for (const [ox, oy] of offsets) {
        const nx = e.gridX + ox, ny = e.gridY + oy;
        if (this.isValidHexCell(nx, ny) && !this.isTileOccupied(nx, ny)) {
          this.enemyTurrets.push(this.createTurret(nx, ny, type, false, 90));
          break;
        }
      }
    }

    if (e.fatigue < e.maxFatigue * 0.7 && Math.random() < this.aiDifficulty.aggressiveness) {
      let dx = 0, dy = 0;
      if (dist > 3) {
        dx = Math.sign(p.gridX - e.gridX); dy = Math.sign(p.gridY - e.gridY);
        if (Math.random() > 0.5) dx = 0; else dy = 0;
      } else if (dist < 2) {
        dx = -Math.sign(p.gridX - e.gridX); dy = -Math.sign(p.gridY - e.gridY);
        if (Math.random() > 0.5) dx = 0; else dy = 0;
      }
      const nx = e.gridX + dx, ny = e.gridY + dy;
      if (this.isValidHexCell(nx, ny) && !this.isTileOccupied(nx, ny)) {
        e.fatigue += 20; e.gridX = nx; e.gridY = ny;
        const np = this.getFighterXY(nx, ny);
        e.x = np.x; e.y = np.y;
      }
    }
  }

  aiShoot() {
    const e = this.enemy;
    const targets = [this.player, ...this.playerTurrets.filter(t => t.alive && !t.building)];
    if (!targets.length) return;
    let closest = targets[0], minDist = Infinity;
    for (const t of targets) {
      const d = Math.hypot(t.x - e.x, t.y - e.y);
      if (d < minDist) { minDist = d; closest = t; }
    }
    const angle = Math.atan2(closest.y - e.y, closest.x - e.x);
    const inaccuracy = (1 - this.aiDifficulty.accuracy) * 0.5;
    const a = angle + (Math.random() - 0.5) * inaccuracy;
    this.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, damage: e.shootDamage, isPlayer: false, type: 'normal', life: 150 });
    e.ammo--; e.shootCooldown = 20;
  }

  isShieldProtected(entity, isPlayerEntity) {
    return (isPlayerEntity ? this.playerTurrets : this.enemyTurrets)
      .filter(t => t.alive && !t.building && t.type === 'shield')
      .some(st => Math.hypot(entity.x - st.x, entity.y - st.y) <= st.range * TILE_SIZE);
  }

  updateTurrets(turrets, isPlayer) {
    for (const t of turrets) {
      if (!t.alive) continue;
      if (t.building) { t.buildTimer--; if (t.buildTimer <= 0) t.building = false; continue; }

      if (t.type === 'collector' && isPlayer) {
        t.collectTimer = (t.collectTimer || 0) + 1;
        const collectInterval = Math.max(30, TURRET_TYPES.collector.collectRate - this.getTurretUpgradeValue(t.type, 'collector_rate') * 20);
        if (t.collectTimer >= collectInterval) {
          t.collectTimer = 0;
          if (this.gridResources.some(r => r.gridX === t.gridX && r.gridY === t.gridY)) {
            const amount = TURRET_TYPES.collector.collectAmount + (this.upgrades.fabrication || 0);
            this.playerResources += amount;
            this.collectedResources += amount;
            this.addFloatingText(`+${amount} ⛏️`, t.x, t.y - TILE_SIZE * 0.6, COLORS.turretCollector);
            this.playSound('collector');
          }
        }
        continue;
      }

      if (t.type === 'shield' || t.type === 'wall' || t.type === 'collector') continue;

      t.fireTimer--;
      if (t.fireTimer > 0) continue;

      const targets = isPlayer
        ? [this.enemy, ...this.enemyTurrets.filter(et => et.alive && !et.building)]
        : [this.player, ...this.playerTurrets.filter(pt => pt.alive && !pt.building)];

      const rangeMultiplier = (t.isPlayer && this.weather?.effects?.turretRangeMultiplier) || 1;
      let target = null, minDist = t.range * TILE_SIZE * rangeMultiplier;
      for (const tgt of targets) {
        const d = Math.hypot(tgt.x - t.x, tgt.y - t.y);
        if (d < minDist) { minDist = d; target = tgt; }
      }
      if (!target) continue;

      t.fireTimer = TURRET_TYPES[t.type].fireRate;
      const angle = Math.atan2(target.y - t.y, target.x - t.x);

      switch (t.type) {
        case 'classic': this.bullets.push({ x: t.x, y: t.y, vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, damage: t.damage, isPlayer, type: 'normal', life: 150 }); break;
        case 'jelly':  this.bullets.push({ x: t.x, y: t.y, vx: Math.cos(angle)*4, vy: Math.sin(angle)*4, damage: t.damage, isPlayer, type: 'jelly', life: 200, jellys: 3 }); break;
        case 'fire':    this.fireZones.push({ x: target.x, y: target.y, radius: TILE_SIZE * 1.5, damage: t.damage, isPlayer, life: 120, maxLife: 120 }); break;
        case 'laser':   this.bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, damage: t.damage, isPlayer, type: 'laser', life: 20, sourceX: t.x, sourceY: t.y }); break;
      }
      if (t.isPlayer) this.playSound('turretFire');
    }
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life--;
      if (b.life <= 0) { this.bullets.splice(i, 1); continue; }

      if (b.type === 'laser') {
        const targets = b.isPlayer
          ? [this.enemy, ...this.enemyTurrets.filter(t => t.alive)]
          : [this.player, ...this.playerTurrets.filter(t => t.alive)];
        for (const tgt of targets) {
          if (Math.hypot(tgt.x - b.tx, tgt.y - b.ty) < TILE_SIZE / 2) {
            let dmgL = b.damage * (!b.isPlayer && this.playerEffects.shield ? 0.5 : 1);
            const thornsL = (tgt.isPlayer && this.characterId === 'thorns') || (!tgt.isPlayer && this.aiCharacterId === 'thorns');
            if (thornsL) dmgL *= 0.5;
            tgt.health -= dmgL;
            if (thornsL) {
              const reflectL = dmgL * 0.25;
              const attackerL = b.isPlayer ? this.player : this.enemy;
              attackerL.health -= reflectL;
              this.spawnParticles(attackerL.x, attackerL.y, '#b3b14f', 4);
              this.addFloatingText(`🐡 -${Math.round(reflectL)}`, attackerL.x, attackerL.y - 20, '#b3b14f');
              if (attackerL.health <= 0) this.handleDeath(attackerL);
            }
            if (tgt.health <= 0) this.handleDeath(tgt);
          }
        }
        continue;
      }

      // Homing: steer toward target each frame
      if (b.type === 'homing' && b.targetRef && b.targetRef.alive) {
        const tx = b.targetRef.x, ty = b.targetRef.y;
        const desired = Math.atan2(ty - b.y, tx - b.x);
        const current = Math.atan2(b.vy, b.vx);
        let diff = desired - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turnSpeed = 0.18;
        const newAngle = current + Math.max(-turnSpeed, Math.min(turnSpeed, diff));
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(newAngle) * speed;
        b.vy = Math.sin(newAngle) * speed;
      }

      b.x += b.vx; b.y += b.vy;
      if (b.x < 0 || b.x > this.totalWidth || b.y < 0 || b.y > this.totalHeight) { this.bullets.splice(i, 1); continue; }

      const targets = b.isPlayer
        ? [this.enemy, ...this.enemyTurrets.filter(t => t.alive && !t.building)]
        : [this.player, ...this.playerTurrets.filter(t => t.alive && !t.building)];

      let hit = false;
      for (const tgt of targets) {
        if (Math.hypot(tgt.x - b.x, tgt.y - b.y) < TILE_SIZE / 2) {
          let dmg = b.damage;
          if (!b.piercing) {
            if (!b.isPlayer && this.playerEffects.shield > 0) dmg *= 0.5;
            if (this.isShieldProtected(tgt, tgt === this.player || this.playerTurrets.includes(tgt))) dmg *= 0.7;
          }
          const thorns = (tgt.isPlayer && this.characterId === 'thorns') || (!tgt.isPlayer && this.aiCharacterId === 'thorns');
          if (thorns) dmg *= 0.5;
          tgt.health -= dmg;
          this.spawnParticles(b.x, b.y, b.isPlayer ? COLORS.bullet : COLORS.enemyBullet, 3);
          if (thorns) {
            const reflect = dmg * 0.25;
            const attacker = b.isPlayer ? this.player : this.enemy;
            attacker.health -= reflect;
            this.spawnParticles(attacker.x, attacker.y, '#b3b14f', 4);
            this.addFloatingText(`🐡 -${Math.round(reflect)}`, attacker.x, attacker.y - 20, '#b3b14f');
            if (attacker.health <= 0) this.handleDeath(attacker);
          }
          if (tgt.health <= 0) this.handleDeath(tgt);

          if (b.type === 'jelly' && b.jellys > 0) {
            b.jellys--;
            let next = null, nd = Infinity;
            for (const nt of targets) {
              if (nt === tgt || !nt.alive) continue;
              const dd = Math.hypot(nt.x - b.x, nt.y - b.y);
              if (dd < nd) { nd = dd; next = nt; }
            }
            if (next) { const a = Math.atan2(next.y - b.y, next.x - b.x); b.vx = Math.cos(a)*4; b.vy = Math.sin(a)*4; }
            else { this.bullets.splice(i, 1); }
          } else { this.bullets.splice(i, 1); }
          hit = true; break;
        }
      }
    }
  }

  updateFireZones() {
    for (let i = this.fireZones.length - 1; i >= 0; i--) {
      const fz = this.fireZones[i];
      fz.life--;
      if (fz.life <= 0) { this.fireZones.splice(i, 1); continue; }
      const targets = fz.isPlayer
        ? [this.enemy, ...this.enemyTurrets.filter(t => t.alive)]
        : [this.player, ...this.playerTurrets.filter(t => t.alive)];
      for (const tgt of targets) {
        if (Math.hypot(tgt.x - fz.x, tgt.y - fz.y) < fz.radius) {
          let dmg = fz.damage * 0.05;
          if (!fz.isPlayer && this.playerEffects.shield > 0) dmg *= 0.5;
          const thorns = (tgt.isPlayer && this.characterId === 'thorns') || (!tgt.isPlayer && this.aiCharacterId === 'thorns');
          if (thorns) dmg *= 0.5;
          tgt.health -= dmg;
          if (thorns) {
            const reflect = dmg * 0.25;
            const attacker = fz.isPlayer ? this.player : this.enemy;
            attacker.health -= reflect;
            this.spawnParticles(attacker.x, attacker.y, '#b3b14f', 4);
            this.addFloatingText(`🐡 -${Math.round(reflect)}`, attacker.x, attacker.y - 20, '#b3b14f');
            if (attacker.health <= 0) this.handleDeath(attacker);
          }
          if (tgt.health <= 0) this.handleDeath(tgt);
        }
      }
    }
  }

  handleDeath(entity) {
    entity.alive = false; entity.health = 0;
    this.spawnParticles(entity.x, entity.y, entity.isPlayer ? COLORS.player : COLORS.enemy, 15);
    if (entity === this.player) setTimeout(() => this.endGame(false), 500);
    else if (entity === this.enemy) setTimeout(() => this.endGame(true), 500);
  }

  endGame(won) {
    this.running = false;
    const reward = won ? 10 + this.level * 5 + this.collectedResources : Math.floor(this.collectedResources * 0.3);
    this.onGameEnd && this.onGameEnd({ won, reward, level: this.level });
  }

  update() {
    this.frameCount++;
    const p = this.player, e = this.enemy;

    if (p.alive) {
      if (p.stunTimer > 0) { p.stunTimer--; } else { p.fatigue = Math.max(0, p.fatigue - p.fatigueRecovery); }
      if (p.shootCooldown > 0) p.shootCooldown--;
      if (this.abilityCooldown > 0) this.abilityCooldown--;
    }
    if (e.alive) { e.fatigue = Math.max(0, e.fatigue - e.fatigueRecovery); }

    if (p.alive && p.ammo < p.maxAmmo) {
      p.reloadTimer++;
      const chargeBonus = (this.upgrades.charge_speed || 0) * 3;
      if (p.reloadTimer >= Math.max(p.reloadRate - chargeBonus, 3)) { p.ammo++; p.reloadTimer = 0; }
    }

    if (this.mouse.down && this.mouseOnGrid && this.frameCount % 15 === 0) this.playerShoot();

    for (const key of Object.keys(this.playerEffects)) {
      if (this.playerEffects[key] > 0) this.playerEffects[key]--;
    }

    if (this.frameCount % 300 === 0 && this.resources.length < 12 + this.level * 2)
      this.resources.push(this.createResource());

    if (this.frameCount % 600 === 0 && this.powerups.length < 3) {
      const types = ['health', 'build', 'attack', 'shield'];
      const z = this.resourceZone;
      this.powerups.push({
        x: z.x + 18 + Math.random() * (z.w - 36),
        y: z.y + 30 + Math.random() * (z.h - 60),
        type: types[Math.floor(Math.random() * types.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }

    if (this.frameCount % 900 === 0 && this.gridPowerups.length < 2 + Math.floor(this.level / 2)) {
      const occupied = new Set([
        ...this.gridResources.map(r => `${r.gridX},${r.gridY}`),
        ...this.gridPowerups.map(pw => `${pw.gridX},${pw.gridY}`),
        ...this.playerTurrets.filter(t => t.alive).map(t => `${t.gridX},${t.gridY}`),
        ...this.enemyTurrets.filter(t => t.alive).map(t => `${t.gridX},${t.gridY}`),
        `${this.player.gridX},${this.player.gridY}`,
        `${this.enemy.gridX},${this.enemy.gridY}`,
      ]);
      const types = ['health', 'build', 'attack', 'shield'];
      for (let a = 0; a < 100; a++) {
        const gx = Math.floor(Math.random() * this.gridSize);
        const gy = Math.floor(Math.random() * this.gridSize);
        if (!occupied.has(`${gx},${gy}`) && this.isValidHexCell(gx, gy)) {
          this.gridPowerups.push({ gridX: gx, gridY: gy, type: types[Math.floor(Math.random() * types.length)], pulse: Math.random() * Math.PI * 2 });
          break;
        }
      }
    }

    this.updateAI();
    this.updateTurrets(this.playerTurrets, true);
    this.updateTurrets(this.enemyTurrets, false);
    this.updateBullets();
    this.updateFireZones();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.95; pt.vy *= 0.95; pt.life--;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.8; ft.life--;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  // === RENDERING ===
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.totalWidth, this.totalHeight);

    // Weather background tint
    if (this.weather?.bgTint) {
      ctx.fillStyle = this.weather.bgTint;
      ctx.fillRect(0, 0, this.totalWidth, this.totalHeight);
    }

    this.drawResourceZone(ctx);
    this.drawGrid(ctx);
    this.drawGridResources(ctx);
    this.drawGridPowerups(ctx);
    this.drawFireZones(ctx);
    this.drawShieldAuras(ctx);

    // Sort entities by y for overlap (closer = on top)
    const allEntities = [
      ...this.playerTurrets.filter(t => t.alive),
      ...this.enemyTurrets.filter(t => t.alive),
      ...(this.player.alive ? [this.player] : []),
      ...(this.enemy.alive ? [this.enemy] : []),
    ].sort((a, b) => a.y - b.y);

    for (const ent of allEntities) {
      if ('type' in ent) this.drawTurret(ctx, ent);
      else this.drawFighter(ctx, ent);
    }

    this.drawBullets(ctx);
    this.drawResources(ctx);
    this.drawPowerups(ctx);
    this.drawParticles(ctx);
    this.drawFloatingTexts(ctx);
  }

  drawResourceZone(ctx) {
    const z = this.resourceZone;
    ctx.fillStyle = 'rgba(245,158,11,0.06)';
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = 'rgba(245,158,11,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(z.x, z.y, z.w, z.h);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(245,158,11,0.85)';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('⛏ RECURSOS', z.x + z.w / 2, z.y + 10);
    ctx.fillStyle = 'rgba(245,158,11,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('[E] o clic aquí', z.x + z.w / 2, z.y + 28);
  }

  drawGrid(ctx) {
    const TS = TILE_SIZE;
    const activeType = this.turretMode === 'offensive' ? this.selectedTurret : this.selectedDefensive;
    const hovTurretType = this.hoveredTile ? TURRET_TYPES[activeType] : null;

    for (let gy = 0; gy < this.gridSize; gy++) {
      for (let gx = 0; gx < this.gridSize; gx++) {
        if (!this.isValidHexCell(gx, gy)) continue;
        const sx = this.gridOriginX + gx * TS;
        const sy = this.gridOriginY + gy * TS;

        const hasRes = this.gridResources.some(r => r.gridX === gx && r.gridY === gy);
        const hasPw  = this.gridPowerups.some(p => p.gridX === gx && p.gridY === gy);
        const isHov  = this.hoveredTile?.x === gx && this.hoveredTile?.y === gy;

        let fill = (gx + gy) % 2 === 0 ? '#1E293B' : '#162030';
        if (hasRes) fill = 'rgba(245,158,11,0.18)';
        if (hasPw)  fill = 'rgba(168,85,247,0.18)';

        ctx.fillStyle = fill;
        ctx.fillRect(sx, sy, TS, TS);

        if (isHov) {
          ctx.fillStyle = hovTurretType?.category === TURRET_CATEGORY.collector
            ? (hasRes ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.25)')
            : 'rgba(96,165,250,0.22)';
          ctx.fillRect(sx, sy, TS, TS);
        }

        ctx.strokeStyle = 'rgba(51,65,85,0.7)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx, sy, TS, TS);
      }
    }

    // Hex boundary outline
    ctx.strokeStyle = 'rgba(96,165,250,0.3)';
    ctx.lineWidth = 2;
    for (let gy = 0; gy < this.gridSize; gy++) {
      for (let gx = 0; gx < this.gridSize; gx++) {
        if (!this.isValidHexCell(gx, gy)) continue;
        const sx = this.gridOriginX + gx * TS, sy = this.gridOriginY + gy * TS;
        const edges = [[0,-1, sx,sy,sx+TS,sy],[1,0, sx+TS,sy,sx+TS,sy+TS],[0,1, sx,sy+TS,sx+TS,sy+TS],[-1,0, sx,sy,sx,sy+TS]];
        for (const [ddx, ddy, x1, y1, x2, y2] of edges) {
          if (!this.isValidHexCell(gx + ddx, gy + ddy)) {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
        }
      }
    }
  }

  drawGridResources(ctx) {
    for (const r of this.gridResources) {
      if (this.playerTurrets.some(t => t.alive && t.gridX === r.gridX && t.gridY === r.gridY)) continue;
      r.pulse = (r.pulse || 0) + 0.04;
      const px = this.cellCX(r.gridX), py = this.cellCY(r.gridY);
      const size = 6 * (1 + Math.sin(r.pulse) * 0.12);
      ctx.shadowColor = COLORS.turretCollector; ctx.shadowBlur = 8;
      ctx.fillStyle = COLORS.turretCollector; ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(px, py - size); ctx.lineTo(px + size * 0.6, py);
      ctx.lineTo(px, py + size); ctx.lineTo(px - size * 0.6, py);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
  }

  drawGridPowerups(ctx) {
    for (const pw of this.gridPowerups) {
      if ([...this.playerTurrets, ...this.enemyTurrets].some(t => t.alive && t.gridX === pw.gridX && t.gridY === pw.gridY)) continue;
      pw.pulse = (pw.pulse || 0) + 0.05;
      const cfg = POWERUP_TYPES[pw.type];
      const px = this.cellCX(pw.gridX), py = this.cellCY(pw.gridY);
      const scale = 1 + Math.sin(pw.pulse) * 0.18;
      ctx.shadowColor = cfg.color; ctx.shadowBlur = 12;
      ctx.fillStyle = cfg.color; ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.arc(px, py, TILE_SIZE * 0.3 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = `${Math.floor(14 * scale)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cfg.icon, px, py);
      ctx.shadowBlur = 0;
    }
  }

  drawShieldAuras(ctx) {
    for (const st of [...this.playerTurrets, ...this.enemyTurrets].filter(t => t.alive && !t.building && t.type === 'shield')) {
      ctx.strokeStyle = COLORS.turretShield;
      ctx.globalAlpha = 0.12 + Math.sin(this.frameCount * 0.05) * 0.05;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.range * TILE_SIZE, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawFighter(ctx, f) {
    const charId = f.characterId || (f.isPlayer ? this.characterId : this.aiCharacterId);
    const charCfg = CHARACTERS[charId] || CHARACTERS.dolphin;
    const R = TILE_SIZE * 0.33;
    // Bob animation
    const bob = Math.sin(this.frameCount * 0.07 + (f.bobOffset || 0)) * 2.5;
    const fx = f.x, fy = f.y + bob;

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(fx, f.y + R * 0.8, R * 0.7, R * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glow ring
    ctx.shadowColor = charCfg.color; ctx.shadowBlur = 20;
    ctx.strokeStyle = charCfg.color + 'AA';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(fx, fy, R + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw character body based on type
    ctx.save();
    ctx.translate(fx, fy);
    switch (charId) {
      case 'dolphin': // Delfín — azul, nariz hacia adelante
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.ellipse(0, 0, R, R * 0.68, 0, 0, Math.PI * 2);
        ctx.fill();
        // Aleta dorsal
        ctx.fillStyle = '#1D4ED8';
        ctx.beginPath();
        ctx.moveTo(-R * 0.1, -R * 0.6); ctx.lineTo(R * 0.2, -R);
        ctx.lineTo(R * 0.4, -R * 0.6); ctx.closePath(); ctx.fill();
        // Morro
        ctx.fillStyle = '#60A5FA';
        ctx.beginPath();
        ctx.ellipse(R * 0.55, 0, R * 0.3, R * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ojo
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(R * 0.2, -R * 0.18, R * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(R * 0.25, -R * 0.18, R * 0.07, 0, Math.PI * 2); ctx.fill();
        break;
      case 'octopus': // Pulpo — morado, tentáculos
        ctx.fillStyle = '#A855F7';
        ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 0.7, 0, Math.PI * 2); ctx.fill();
        // Tentáculos
        ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = R * 0.22;
        for (let i = 0; i < 4; i++) {
          const tx = Math.cos((Math.PI / 3) * i - Math.PI / 3) * R * 0.9;
          const ty = R * 0.5 + Math.abs(Math.sin(this.frameCount * 0.1 + i)) * R * 0.3;
          ctx.beginPath(); ctx.moveTo(Math.cos((Math.PI / 3) * i - Math.PI / 3) * R * 0.4, R * 0.3);
          ctx.lineTo(tx, ty); ctx.stroke();
        }
        // Ojos
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-R * 0.22, -R * 0.1, R * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(R * 0.22, -R * 0.1, R * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1E1B4B'; ctx.beginPath(); ctx.arc(-R * 0.18, -R * 0.12, R * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1E1B4B'; ctx.beginPath(); ctx.arc(R * 0.26, -R * 0.12, R * 0.08, 0, Math.PI * 2); ctx.fill();
        break;
      case 'shark': // Tiburón — gris oscuro, aleta triangular grande
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(0, 0, R, R * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        // Aleta dorsal grande
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-R * 0.1, -R * 0.5); ctx.lineTo(R * 0.05, -R * 1.1);
        ctx.lineTo(R * 0.35, -R * 0.5); ctx.closePath(); ctx.fill();
        // Cola
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-R * 0.7, 0); ctx.lineTo(-R * 1.1, -R * 0.35);
        ctx.lineTo(-R * 1.0, 0); ctx.lineTo(-R * 1.1, R * 0.35);
        ctx.closePath(); ctx.fill();
        // Boca
        ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(R * 0.4, R * 0.05, R * 0.22, 0.2, Math.PI - 0.2); ctx.stroke();
        // Ojo
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(R * 0.15, -R * 0.12, R * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(R * 0.18, -R * 0.14, R * 0.04, 0, Math.PI * 2); ctx.fill();
        break;
      case 'tank': // Ballena — grande, azul marino
        ctx.fillStyle = '#4B5563';
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.1, R * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Vientre claro
        ctx.fillStyle = '#9CA3AF';
        ctx.beginPath();
        ctx.ellipse(R * 0.1, R * 0.2, R * 0.65, R * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cola
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.moveTo(-R * 0.85, 0); ctx.lineTo(-R * 1.3, -R * 0.45);
        ctx.lineTo(-R * 1.15, 0); ctx.lineTo(-R * 1.3, R * 0.45);
        ctx.closePath(); ctx.fill();
        // Ojo
        ctx.fillStyle = '#1F2937'; ctx.beginPath(); ctx.arc(R * 0.35, -R * 0.22, R * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(R * 0.38, -R * 0.25, R * 0.05, 0, Math.PI * 2); ctx.fill();
        break;
      case 'thorns':
        const thornsActive = this.playerEffects.shield > 0 && f.isPlayer;
        const thornsScale = thornsActive ? 1.35 : 1.0;
        const spikeCount = 12;
        const bodyR = R * thornsScale;

        // Pulso animado cuando está activo
        const thornsPulse = thornsActive ? 1 + Math.sin(this.frameCount * 0.18) * 0.07 : 1;
        const finalR = bodyR * thornsPulse;

        // Aura exterior cuando activo
        if (thornsActive) {
          ctx.globalAlpha = 0.18 + Math.sin(this.frameCount * 0.15) * 0.08;
          ctx.fillStyle = '#FFD700';
          ctx.beginPath(); ctx.arc(0, 0, finalR + 10, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Cuerpo principal — gradiente amarillo-verdoso
        const bodyGrad = ctx.createRadialGradient(-finalR * 0.25, -finalR * 0.25, finalR * 0.05, 0, 0, finalR);
        bodyGrad.addColorStop(0, '#F0E060');
        bodyGrad.addColorStop(0.6, '#C8B840');
        bodyGrad.addColorStop(1, '#8A7A20');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.arc(0, 0, finalR, 0, Math.PI * 2); ctx.fill();

        // Patrón de manchas
        ctx.fillStyle = 'rgba(100,90,20,0.35)';
        const spotAngles = [0.4, 1.2, 2.1, 3.0, 3.9, 5.1];
        for (const sa of spotAngles) {
          const sr = finalR * 0.52;
          ctx.beginPath();
          ctx.ellipse(Math.cos(sa) * sr, Math.sin(sa) * sr, finalR * 0.13, finalR * 0.10, sa, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pinchos
        for (let s = 0; s < spikeCount; s++) {
          const sAngle = (Math.PI * 2 / spikeCount) * s + (thornsActive ? this.frameCount * 0.012 : 0);
          const innerRad = finalR * 0.88;
          const outerRad = finalR * (thornsActive ? 1.55 : 1.38);
          const halfW = Math.PI * 2 / spikeCount * 0.32;

          ctx.fillStyle = thornsActive ? '#FFE44D' : '#A09030';
          ctx.strokeStyle = thornsActive ? '#FFA500' : '#6B6020';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sAngle - halfW) * innerRad, Math.sin(sAngle - halfW) * innerRad);
          ctx.lineTo(Math.cos(sAngle) * outerRad,         Math.sin(sAngle) * outerRad);
          ctx.lineTo(Math.cos(sAngle + halfW) * innerRad, Math.sin(sAngle + halfW) * innerRad);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Borde del cuerpo
        ctx.strokeStyle = thornsActive ? '#FFD700' : '#6B6020';
        ctx.lineWidth = thornsActive ? 2.2 : 1.5;
        ctx.beginPath(); ctx.arc(0, 0, finalR, 0, Math.PI * 2); ctx.stroke();

        // Ojo izquierdo
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-finalR * 0.28, -finalR * 0.18, finalR * 0.18, finalR * 0.22, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2000';
        ctx.beginPath(); ctx.arc(-finalR * 0.24, -finalR * 0.16, finalR * 0.10, 0, Math.PI * 2); ctx.fill();
        // Brillo ojo izquierdo
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-finalR * 0.20, -finalR * 0.21, finalR * 0.04, 0, Math.PI * 2); ctx.fill();

        // Ojo derecho
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(finalR * 0.28, -finalR * 0.18, finalR * 0.18, finalR * 0.22, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2000';
        ctx.beginPath(); ctx.arc(finalR * 0.32, -finalR * 0.16, finalR * 0.10, 0, Math.PI * 2); ctx.fill();
        // Brillo ojo derecho
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(finalR * 0.36, -finalR * 0.21, finalR * 0.04, 0, Math.PI * 2); ctx.fill();

        // Boca
        ctx.strokeStyle = '#4a3800';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, finalR * 0.28, finalR * 0.22, 0.15, Math.PI - 0.15);
        ctx.stroke();

        // Texto activo
        if (thornsActive) {
          ctx.fillStyle = '#FFD700';
          ctx.font = `bold ${Math.floor(finalR * 0.55)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText('⚡', 0, -finalR - 4);
        }
        break;
      case 'sniper': // Pez Espada — verde, morro largo y fino
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 0.85, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        // Espada/morro largo
        ctx.fillStyle = '#6EE7B7';
        ctx.beginPath();
        ctx.moveTo(R * 0.7, -R * 0.06); ctx.lineTo(R * 1.5, 0);
        ctx.lineTo(R * 0.7, R * 0.06); ctx.closePath(); ctx.fill();
        // Aleta superior
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.moveTo(-R * 0.1, -R * 0.45); ctx.lineTo(R * 0.15, -R * 0.85);
        ctx.lineTo(R * 0.4, -R * 0.45); ctx.closePath(); ctx.fill();
        // Ojo
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(R * 0.2, -R * 0.1, R * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#064E3B'; ctx.beginPath(); ctx.arc(R * 0.23, -R * 0.12, R * 0.06, 0, Math.PI * 2); ctx.fill();
        break;
      default:
        ctx.fillStyle = charCfg.color || '#3B82F6';
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    }

    // Team indicator ring (enemy = red tint)
    if (!f.isPlayer) {
      ctx.strokeStyle = 'rgba(239,68,68,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, Math.PI * 2); ctx.stroke();
    }

    // Stun indicator
    if (f.stunTimer > 0) {
      ctx.fillStyle = '#FDE047';
      ctx.font = `${R * 0.9}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('💫', 0, -R - 4);
    }

    ctx.restore();

    // Health bar
    const bw = R * 2.8;
    this.drawHealthBar(ctx, fx - bw / 2, fy - R - 14, bw, 5, f.health, f.maxHealth);
    // Fatigue bar
    if (f.fatigue > 0) {
      const pct = f.fatigue / f.maxFatigue;
      ctx.fillStyle = 'rgba(30,41,59,0.8)'; ctx.fillRect(fx - bw / 2, fy + R + 4, bw, 3);
      ctx.fillStyle = COLORS.fatigue; ctx.fillRect(fx - bw / 2, fy + R + 4, bw * pct, 3);
    }
  }

  drawTurret(ctx, t) {
    const cfg = TURRET_TYPES[t.type];
    const color = cfg.color;
    const R = TILE_SIZE * 0.28;

    if (t.building) {
      const progress = 1 - t.buildTimer / t.buildMax;
      ctx.globalAlpha = 0.3 + progress * 0.7;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(t.x - TILE_SIZE * 0.44, t.y - TILE_SIZE * 0.44, TILE_SIZE * 0.88, TILE_SIZE * 0.88);
      ctx.beginPath(); ctx.arc(t.x, t.y, R * 0.7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    // Team tint on tile
    ctx.fillStyle = t.isPlayer ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)';
    ctx.fillRect(t.x - TILE_SIZE / 2 + 1, t.y - TILE_SIZE / 2 + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.fillStyle = color;

    if (t.type === 'wall') {
      ctx.fillRect(t.x - R * 0.85, t.y - R * 0.85, R * 1.7, R * 1.7);
    } else if (t.type === 'shield') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(t.x + Math.cos(a) * R, t.y + Math.sin(a) * R)
                : ctx.lineTo(t.x + Math.cos(a) * R, t.y + Math.sin(a) * R);
      }
      ctx.closePath(); ctx.fill();
    } else if (t.type === 'collector') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const radius = R * (i % 2 === 0 ? 0.9 : 0.45);
        const px = t.x + Math.cos(angle) * radius;
        const py = t.y + Math.sin(angle) * radius;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(t.x, t.y, R * 0.72, 0, Math.PI * 2); ctx.fill();
      // Barrel pointing toward enemy side
      ctx.strokeStyle = lightColor(color); ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + (t.isPlayer ? R : -R), t.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#F8FAFC';
    ctx.font = `${R * 0.8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg.icon, t.x, t.y + 1);

    const bw = R * 2;
    this.drawHealthBar(ctx, t.x - bw / 2, t.y - TILE_SIZE / 2 - 5, bw, 3, t.health, t.maxHealth);
  }

  drawHealthBar(ctx, x, y, w, h, current, max) {
    const pct = Math.max(0, current / max);
    ctx.fillStyle = COLORS.healthBarBg; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pct > 0.5 ? COLORS.healthBar : pct > 0.25 ? COLORS.fatigue : COLORS.enemy;
    ctx.fillRect(x, y, w * pct, h);
  }

  drawBullets(ctx) {
    for (const b of this.bullets) {
      if (b.type === 'laser') {
        ctx.strokeStyle = b.isPlayer ? COLORS.turretLaser : '#F87171';
        ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
        ctx.shadowColor = b.isPlayer ? COLORS.turretLaser : '#F87171'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(b.sourceX, b.sourceY); ctx.lineTo(b.tx, b.ty); ctx.stroke();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        continue;
      }
      ctx.shadowColor = b.isPlayer ? COLORS.bullet : COLORS.enemyBullet; ctx.shadowBlur = 6;
      ctx.fillStyle = b.isPlayer ? COLORS.bullet : COLORS.enemyBullet;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.type === 'jelly' ? 4 : 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  drawFireZones(ctx) {
    for (const fz of this.fireZones) {
      const alpha = (fz.life / fz.maxLife) * 0.35;
      ctx.fillStyle = fz.isPlayer ? `rgba(249,115,22,${alpha})` : `rgba(239,68,68,${alpha})`;
      ctx.beginPath(); ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawResources(ctx) {
    for (const r of this.resources) {
      r.pulse += 0.05;
      const scale = 1 + Math.sin(r.pulse) * 0.15;
      const size = 7 * scale;
      ctx.shadowColor = COLORS.resource; ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS.resource;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y - size); ctx.lineTo(r.x + size * 0.7, r.y);
      ctx.lineTo(r.x, r.y + size); ctx.lineTo(r.x - size * 0.7, r.y);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.text; ctx.font = '9px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(r.value, r.x, r.y + size + 10);
    }
  }

  drawPowerups(ctx) {
    for (const pw of this.powerups) {
      pw.pulse += 0.04;
      const cfg = POWERUP_TYPES[pw.type];
      const scale = 1 + Math.sin(pw.pulse) * 0.2;
      const size = 10 * scale;
      ctx.shadowColor = cfg.color; ctx.shadowBlur = 15;
      ctx.fillStyle = cfg.color; ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(pw.x, pw.y, size + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = `${Math.floor(14 * scale)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cfg.icon, pw.x, pw.y);
      ctx.shadowBlur = 0;
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloatingTexts(ctx) {
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.life / ft.maxLife;
      ctx.fillStyle = ft.color; ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }

  start() {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      if (!this.paused) this.update();
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  stop() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  getState() {
    return {
      playerHealth: this.player.health, playerMaxHealth: this.player.maxHealth,
      playerAmmo: this.player.ammo, playerMaxAmmo: this.player.maxAmmo,
      playerFatigue: this.player.fatigue, playerMaxFatigue: this.player.maxFatigue,
      enemyHealth: this.enemy.health, enemyMaxHealth: this.enemy.maxHealth,
      resources: this.playerResources,
      selectedTurret: this.selectedTurret, selectedDefensive: this.selectedDefensive,
      turretMode: this.turretMode,
      effects: { ...this.playerEffects },
      playerTurretCount: this.playerTurrets.filter(t => t.alive).length,
      enemyTurretCount: this.enemyTurrets.filter(t => t.alive).length,
      abilityCooldown: this.abilityCooldown,
      abilityMaxCooldown: 1500,
      characterId: this.characterId,
      aiCharacterId: this.aiCharacterId,
      characterAbility: this.characterCfg.ability,
      sharkDashMode: this.sharkDashMode,
      weather: this.weather,
    };
  }
}