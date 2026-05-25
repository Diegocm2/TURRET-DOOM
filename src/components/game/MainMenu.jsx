import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Sword, Lock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  TURRET_TYPES, TURRET_CATEGORY, UPGRADE_COSTS, UPGRADE_NAMES, UPGRADE_ICONS,
  CHARACTER_UPGRADES, TURRET_UPGRADES,
  CHARACTERS, PROGRESSION_UNLOCKS, getPlayerLevel, getUnlockedTurrets, getUnlockedCharacters, getNextUnlock
} from './GameConstants';

const OFFENSIVE_TURRETS = Object.entries(TURRET_TYPES).filter(([, c]) => c.category === TURRET_CATEGORY.offensive);

// ── Equipment panel ───────────────────────────────────────────────────────────
function EquipmentPanel({ equippedOffensive, onChangeOffensive, playerLevel }) {
  const unlockedTurrets = getUnlockedTurrets(playerLevel);

  return (
    <div className="p-4">
      {/* Offensive (switchable, only unlocked) */}
      <div className="bg-slate-800/60 border border-red-700/30 rounded-xl p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Torreta Ofensiva</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {OFFENSIVE_TURRETS.map(([type, cfg]) => {
            const unlocked = unlockedTurrets.includes(type);
            const unlock = PROGRESSION_UNLOCKS.find(u => u.id === type && u.type === 'turret');
            return (
              <button
                key={type}
                onClick={() => unlocked && onChangeOffensive(type)}
                disabled={!unlocked}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border-2 flex-1 min-w-[52px] transition-all relative ${
                  !unlocked
                    ? 'border-slate-700 bg-slate-900/60 opacity-50 cursor-not-allowed'
                    : equippedOffensive === type
                      ? 'border-red-400 bg-red-500/20 scale-105 shadow-md shadow-red-500/20'
                      : 'border-slate-600 bg-slate-900/40 hover:border-slate-500'
                }`}
              >
                {!unlocked && <Lock className="absolute top-1 right-1 w-2.5 h-2.5 text-slate-500" />}
                <span className="text-xl">{cfg.icon}</span>
                <span className="text-[9px] text-slate-300">{cfg.name}</span>
                {unlocked
                  ? <span className="text-[9px] text-yellow-500">{cfg.cost}🪙</span>
                  : <span className="text-[9px] text-slate-500">Niv.{unlock?.level}</span>
                }
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed: Defensive */}
      <div className="bg-slate-800/60 border border-emerald-700/30 rounded-xl p-3 mb-2 flex items-center gap-3">
        <span className="text-2xl">{TURRET_TYPES.shield.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-emerald-300">{TURRET_TYPES.shield.name}</span>
            <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Fija</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{TURRET_TYPES.shield.description}</p>
        </div>
      </div>

      {/* Fixed: Collector */}
      <div className="bg-slate-800/60 border border-yellow-700/30 rounded-xl p-3 flex items-center gap-3">
        <span className="text-2xl">{TURRET_TYPES.collector.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-yellow-300">{TURRET_TYPES.collector.name}</span>
            <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">Fija</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{TURRET_TYPES.collector.description}</p>
        </div>
      </div>
    </div>
  );
}

// ── Characters panel ──────────────────────────────────────────────────────────
function CharactersPanel({ equippedCharacter, onChangeCharacter, playerLevel }) {
  const unlockedChars = getUnlockedCharacters(playerLevel);
  return (
    <div className="p-4 space-y-2">
      {Object.values(CHARACTERS).map(char => {
        const unlocked = unlockedChars.includes(char.id);
        const isEquipped = equippedCharacter === char.id;
        const unlock = PROGRESSION_UNLOCKS.find(u => u.id === char.id && u.type === 'character');
        return (
          <button
            key={char.id}
            onClick={() => unlocked && onChangeCharacter(char.id)}
            disabled={!unlocked}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
              !unlocked
                ? 'border-slate-700 bg-slate-900/40 opacity-50 cursor-not-allowed'
                : isEquipped
                  ? 'border-blue-400 bg-blue-500/20 shadow-md shadow-blue-500/20'
                  : 'border-slate-600 bg-slate-800/60 hover:border-slate-500 cursor-pointer'
            }`}
          >
            <span className="text-3xl shrink-0">{char.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{char.name}</span>
                {isEquipped && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold">EQUIPADO</span>}
                {!unlocked && <span className="text-[9px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Niv.{unlock?.level}</span>}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{char.description}</p>
              {char.ability && unlocked && (
                <p className="text-[10px] text-purple-400 mt-0.5">✨ {char.ability.name} [Q]</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Upgrade card ─────────────────────────────────────────────────────────────
function MiniUpgradeCard({ upgradeKey, currentLevel, resources, onUpgrade }) {
  const maxLevel = UPGRADE_COSTS[upgradeKey].length - 1;
  const nextCost = currentLevel < maxLevel ? UPGRADE_COSTS[upgradeKey][currentLevel + 1] : null;
  const canAfford = nextCost !== null && resources >= nextCost;
  const isMaxed = currentLevel >= maxLevel;

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
      isMaxed ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-slate-700/40 bg-slate-800/40'
    }`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-base shrink-0">{UPGRADE_ICONS[upgradeKey]}</span>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-200 font-medium truncate">{UPGRADE_NAMES[upgradeKey]}</p>
          <div className="flex gap-0.5 mt-0.5">
            {Array.from({ length: maxLevel }, (_, i) => (
              <div key={i} className={`w-3 h-1 rounded-full ${i < currentLevel ? 'bg-blue-400' : 'bg-slate-600'}`} />
            ))}
          </div>
          <div className="text-[9px] text-slate-400 mt-1">Nivel {currentLevel}/{maxLevel}</div>
        </div>
      </div>
      {isMaxed ? (
        <span className="text-[9px] font-bold text-yellow-400 ml-2 shrink-0">MAX</span>
      ) : (
        <button
          disabled={!canAfford}
          onClick={() => onUpgrade(upgradeKey)}
          className={`text-[10px] px-2 py-1 rounded-lg font-bold ml-2 shrink-0 ${
            canAfford ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {nextCost}🪙
        </button>
      )}
    </div>
  );
}

// ── Upgrade section with label ────────────────────────────────────────────────
function UpgradeSection({ title, color, icon, keys, getLevel, resources, onUpgrade, category }) {
  return (
    <div className="mb-3">
      <div className={`flex items-center gap-1.5 mb-1.5 px-1`}>
        <span>{icon}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{title}</span>
      </div>
      <div className="space-y-1.5">
        {keys.map(key => (
          <MiniUpgradeCard
            key={key}
            upgradeKey={key}
            currentLevel={getLevel(key)}
            resources={resources}
            onUpgrade={(k) => onUpgrade(k, category)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MainMenu({ level, resources, turretUpgrades, characterUpgrades, wins, xp, onPlay, equippedOffensive, onChangeOffensive, equippedCharacter, onChangeCharacter, onUpgrade, onClose, initialTab = 'menu' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const playerLevel = getPlayerLevel(xp);
  const nextUnlock = getNextUnlock(playerLevel);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tabs = [
    { id: 'menu', label: 'Inicio', icon: '🏠' },
    { id: 'characters', label: 'Personajes', icon: '👤' },
    { id: 'equipment', label: 'Torretas', icon: '🔫' },
    { id: 'upgrades', label: 'Mejoras', icon: '📈' },
  ];

  const offensiveUpgradeKeys = ['turret_damage', 'turret_health', 'turret_build'];
  const defensiveUpgradeKeys = ['turret_health', 'turret_build'];
  const collectorUpgradeKeys = ['collector_rate', 'turret_health', 'turret_build'];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-10"
      style={{
        backgroundImage: `linear-gradient(to bottom right, rgba(15,23,42,0.95), rgba(15,23,42,0.95)), url('/assets/images/menu-bg.gif')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-7xl"
      >
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            TURRET DOOM
          </h1>
          <p className="text-slate-500 text-base tracking-widest uppercase mt-3">Estrategia & Combate</p>
        </div>

        <div className="flex justify-center">
          <div className="flex-1 min-w-[640px] max-w-5xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-slate-700/50">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-5 flex flex-col items-center gap-1.5 text-base font-bold transition-all ${
                    activeTab === tab.id
                      ? 'text-white bg-slate-800/60 border-b-2 border-blue-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-2xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {activeTab === 'menu' && (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                    <div className="space-y-5">
                      <Button
                        onClick={onPlay}
                        className="w-full h-24 text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-2xl shadow-blue-500/30 transition-all rounded-2xl"
                      >
                        <Sword className="w-10 h-10 mr-3" />
                        JUGAR
                      </Button>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-5 text-center">
                          <p className="text-sm text-slate-500 uppercase tracking-wider">Nivel</p>
                          <p className="text-5xl font-black text-white mt-1">{level}</p>
                        </div>
                        <div className="bg-slate-800/60 border border-purple-700/40 rounded-xl p-5 text-center">
                          <p className="text-sm text-slate-500 uppercase tracking-wider">Rango</p>
                          <p className="text-4xl font-black text-purple-400 mt-1">P{playerLevel}</p>
                        </div>
                        <div className="bg-slate-800/60 border border-yellow-700/40 rounded-xl p-5 text-center">
                          <p className="text-sm text-slate-500 uppercase tracking-wider">🪙</p>
                          <p className="text-3xl font-black text-yellow-400 mt-1">{resources}</p>
                        </div>
                      </div>

                      {nextUnlock ? (
                        <div className="bg-slate-800/60 border border-purple-700/30 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-purple-300 font-bold">Próximo desbloqueo</span>
                            <span className="text-xs text-slate-500">Niv.{nextUnlock.level}</span>
                          </div>
                          <p className="text-sm text-white mb-2">{nextUnlock.label}</p>
                          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${nextUnlock ? Math.min(100, Math.max(0, ((playerLevel - (nextUnlock.level - 1)) / 1) * 100)) : 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5">
                            {nextUnlock
                              ? `Llega al nivel ${nextUnlock.level} para desbloquear más contenido`
                              : '¡Has alcanzado el nivel máximo!'}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                          <p className="text-yellow-400 font-bold">🏆 ¡Todo desbloqueado!</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-5">
                      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Controles</h3>
                        <div className="grid grid-cols-2 gap-2.5 text-sm text-slate-400">
                          <div><span className="font-mono bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">WASD</span> Mover</div>
                          <div><span className="font-mono bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">Click Der</span> Construir</div>
                          <div><span className="font-mono bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">Click Izq</span> Disparar</div>
                          <div><span className="font-mono bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">Clic recurso</span> Recoger</div>
                          <div><span className="font-mono bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">Q</span> Habilidad</div>
                          <div><span className="font-mono bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">Tab</span> Alternar</div>
                        </div>
                      </div>
                      {onClose && (
                        <div className="flex justify-center">
                          <Button
                            onClick={onClose}
                            variant="outline"
                            className="border-red-700/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
                          >
                            <X className="w-4 h-4" />
                            Guardar y Salir
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'characters' && (
                <CharactersPanel
                  equippedCharacter={equippedCharacter}
                  onChangeCharacter={onChangeCharacter}
                  playerLevel={playerLevel}
                />
              )}

              {activeTab === 'equipment' && (
                <EquipmentPanel
                  equippedOffensive={equippedOffensive}
                  onChangeOffensive={onChangeOffensive}
                  playerLevel={playerLevel}
                />
              )}

              {activeTab === 'upgrades' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-500 uppercase tracking-wider font-bold">Recursos disponibles</span>
                    <span className="text-yellow-400 font-bold text-lg">{resources} 🪙</span>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                    <div className="space-y-6">
                      <UpgradeSection
                        title={`Mejoras Ofensivas — ${TURRET_TYPES[equippedOffensive]?.name || 'Ofensiva'}`}
                        color="text-red-400"
                        icon="⚔️"
                        keys={offensiveUpgradeKeys}
                        getLevel={(k) => turretUpgrades?.[equippedOffensive]?.[k] || 0}
                        resources={resources}
                        onUpgrade={(k) => onUpgrade(k, 'turret', equippedOffensive)}
                        category="turret"
                      />
                      <UpgradeSection
                        title="Mejoras Defensivas — Concha"
                        color="text-emerald-400"
                        icon="🛡️"
                        keys={defensiveUpgradeKeys}
                        getLevel={(k) => turretUpgrades?.shield?.[k] || 0}
                        resources={resources}
                        onUpgrade={(k) => onUpgrade(k, 'turret', 'shield')}
                        category="turret"
                      />
                      <UpgradeSection
                        title="Mejoras de Recolección — Coral"
                        color="text-yellow-400"
                        icon="🪸"
                        keys={collectorUpgradeKeys}
                        getLevel={(k) => turretUpgrades?.collector?.[k] || 0}
                        resources={resources}
                        onUpgrade={(k) => onUpgrade(k, 'turret', 'collector')}
                        category="turret"
                      />
                    </div>
                    <div className="space-y-6">
                      <UpgradeSection
                        title={`Personaje — ${CHARACTERS[equippedCharacter]?.name || equippedCharacter}`}
                        color="text-blue-400"
                        icon={CHARACTERS[equippedCharacter]?.icon || '👤'}
                        keys={CHARACTER_UPGRADES}
                        getLevel={(k) => characterUpgrades?.[equippedCharacter]?.[k] || 0}
                        resources={resources}
                        onUpgrade={onUpgrade}
                        category="character"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}