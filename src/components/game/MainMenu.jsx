import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Settings, Sword, Lock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  TURRET_TYPES, TURRET_CATEGORY, UPGRADE_COSTS, UPGRADE_NAMES, UPGRADE_ICONS,
  CHARACTER_UPGRADES, getTurretUpgradeKeys,
  CHARACTERS, PROGRESSION_UNLOCKS, getPlayerLevel, getUnlockedTurrets, getUnlockedCharacters, getNextUnlock, getXpForLevel
} from './GameConstants';

const OFFENSIVE_TURRETS = Object.entries(TURRET_TYPES).filter(([, c]) => c.category === TURRET_CATEGORY.offensive);

function EquipmentPanel({ equippedOffensive, onChangeOffensive, playerLevel }) {
  const unlockedTurrets = getUnlockedTurrets(playerLevel);
  return (
    <div className="p-4 text-lg">
      <div className="bg-slate-800/60 border border-red-700/30 rounded-xl p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Torreta Ofensiva</span>
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
                <span className="text-sm text-slate-300">{cfg.name}</span>
                {unlocked
                  ? <span className="text-sm text-yellow-500">{cfg.cost}🪙</span>
                  : <span className="text-sm text-slate-500">Niv.{unlock?.level}</span>
                }
              </button>
            );
          })}
        </div>
      </div>
      <div className="bg-slate-800/60 border border-emerald-700/30 rounded-xl p-3 mb-2 flex items-center gap-3">
        <span className="text-2xl">{TURRET_TYPES.shield.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-emerald-300">{TURRET_TYPES.shield.name}</span>
            <span className="text-xs text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Fija</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{TURRET_TYPES.shield.description}</p>
        </div>
      </div>
      <div className="bg-slate-800/60 border border-yellow-700/30 rounded-xl p-3 flex items-center gap-3">
        <span className="text-2xl">{TURRET_TYPES.collector.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-yellow-300">{TURRET_TYPES.collector.name}</span>
            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">Fija</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{TURRET_TYPES.collector.description}</p>
        </div>
      </div>
    </div>
  );
}

function CharactersPanel({ equippedCharacter, onChangeCharacter, playerLevel }) {
  const unlockedChars = getUnlockedCharacters(playerLevel);
  return (
    <div className="p-4 space-y-2 text-lg">
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
                <span className="text-base font-bold text-white">{char.name}</span>
                {isEquipped && <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold">EQUIPADO</span>}
                {!unlocked && <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Niv.{unlock?.level}</span>}
              </div>
              <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{char.description}</p>
              {char.ability && unlocked && (
                <p className="text-sm text-purple-400 mt-0.5">✨ {char.ability.name} [Q]</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

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
          <p className="text-sm text-slate-200 font-medium truncate">{UPGRADE_NAMES[upgradeKey]}</p>
          <div className="flex gap-0.5 mt-0.5">
            {Array.from({ length: maxLevel }, (_, i) => (
              <div key={i} className={`w-3 h-1 rounded-full ${i < currentLevel ? 'bg-blue-400' : 'bg-slate-600'}`} />
            ))}
          </div>
        </div>
      </div>
      {isMaxed ? (
        <span className="text-sm font-bold text-yellow-400 ml-2 shrink-0">MAX</span>
      ) : (
        <button
          disabled={!canAfford}
          onClick={() => onUpgrade(upgradeKey)}
          className={`text-sm px-2 py-1 rounded-lg font-bold ml-2 shrink-0 ${
            canAfford ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {nextCost}🪙
        </button>
      )}
    </div>
  );
}

function UpgradeSection({ title, color, icon, keys, getLevel, resources, onUpgrade, category, targetType }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <span>{icon}</span>
        <span className={`text-sm font-bold uppercase tracking-wider ${color}`}>{title}</span>
      </div>
      <div className="space-y-1.5">
        {keys.map(key => (
          <MiniUpgradeCard
            key={key}
            upgradeKey={key}
            currentLevel={getLevel(key)}
            resources={resources}
            onUpgrade={(k) => onUpgrade(k, category, targetType)}
          />
        ))}
      </div>
    </div>
  );
}

export default function MainMenu({ level, resources, turretUpgrades, characterUpgrades, xp, wins, onPlay, equippedOffensive, onChangeOffensive, equippedCharacter, onChangeCharacter, onUpgrade, onClose,  onCredits }) {
  const [activeTab, setActiveTab] = useState('menu');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [menuVolume, setMenuVolume] = useState(() => {
    if (typeof window === 'undefined') return 70;
    return Number(window.localStorage.getItem('turret-doom-menu-volume') || 70);
  });
  const [menuMusicEnabled, setMenuMusicEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('turret-doom-music-enabled') === 'true';
  });
  const [menuBrightness, setMenuBrightness] = useState(() => {
    if (typeof window === 'undefined') return 80;
    return Number(window.localStorage.getItem('turret-doom-brightness') || 80);
  });

  const playerLevel = getPlayerLevel(xp);
  const nextUnlock = getNextUnlock(playerLevel);
  const xpToNext = nextUnlock ? Math.max(0, getXpForLevel(playerLevel + 1) - xp) : 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('turret-doom-menu-volume', String(menuVolume));
  }, [menuVolume]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('turret-doom-music-enabled', String(menuMusicEnabled));
  }, [menuMusicEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('turret-doom-brightness', String(menuBrightness));
    document.documentElement.style.filter = `brightness(${menuBrightness}%)`;
  }, [menuBrightness]);

  const tabs = [
    { id: 'characters', label: 'Personajes', icon: '👤' },
    { id: 'equipment', label: 'Torretas', icon: '🔫' },
    { id: 'menu', label: 'Inicio', icon: '🏠' },
    { id: 'upgrades', label: 'Mejoras', icon: '📈' },
  ];

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-start p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-screen max-w-full"
      >
        <div className="text-center mb-10">
          <h1 className="text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            TURRET DOOM
          </h1>
          <p className="text-slate-500 text-base tracking-widest uppercase mt-3">Estrategia Y Combate</p>
        </div>

        <div className="flex gap-8">
          <div className="flex-1 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-[0_30px_80px_-40px_rgba(15,23,42,0.8)] overflow-hidden h-[72vh]">
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-hidden">

                {activeTab === 'menu' && (
                  <div className="p-6 space-y-4">
                    <div className="mx-auto flex flex-col gap-5 w-full max-w-[560px]">
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

                      {nextUnlock && (
                        <div className="bg-slate-800/60 border border-purple-700/30 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-purple-300 font-bold">Próximo desbloqueo</span>
                            <span className="text-xs text-slate-500">Niv.{nextUnlock.level}</span>
                          </div>
                          <p className="text-sm text-white mb-2">{nextUnlock.label}</p>
                          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${((playerLevel - (nextUnlock.level - 1)) / 1) * 100}%` }} />
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5">Consigue {xpToNext} XP más</p>
                        </div>
                      )}
                      {!nextUnlock && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                          <p className="text-yellow-400 font-bold">🏆 ¡Todo desbloqueado!</p>
                        </div>
                      )}

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
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSettingsOpen(true)}
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Abrir ajustes
                      </Button>
                      <Button
                        onClick={onClose}
                        variant="outline"
                        className="border-red-700/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
                      >
                        <X className="w-4 h-4" />
                        Salir del juego
                      </Button>
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
                  <div className="p-5 text-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-slate-500 uppercase tracking-wider font-bold">Recursos disponibles</span>
                      <span className="text-yellow-400 font-bold text-lg">{resources} 🪙</span>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                      <div className="space-y-6">
                        <UpgradeSection
                          title={`Torreta — ${TURRET_TYPES[equippedOffensive]?.name || equippedOffensive}`}
                          color="text-red-400"
                          icon={TURRET_TYPES[equippedOffensive]?.icon || '🔧'}
                          keys={getTurretUpgradeKeys(equippedOffensive)}
                          getLevel={(k) => turretUpgrades?.[equippedOffensive]?.[k] || 0}
                          resources={resources}
                          onUpgrade={onUpgrade}
                          category="turret"
                          targetType={equippedOffensive}
                        />
                        <UpgradeSection
                          title={`Escudo — ${TURRET_TYPES.shield?.name}`}
                          color="text-emerald-400"
                          icon={TURRET_TYPES.shield?.icon || '🛡️'}
                          keys={getTurretUpgradeKeys('shield')}
                          getLevel={(k) => turretUpgrades?.shield?.[k] || 0}
                          resources={resources}
                          onUpgrade={onUpgrade}
                          category="turret"
                          targetType="shield"
                        />
                        <UpgradeSection
                          title={`Recolectora — ${TURRET_TYPES.collector?.name}`}
                          color="text-yellow-400"
                          icon={TURRET_TYPES.collector?.icon || '⛏️'}
                          keys={getTurretUpgradeKeys('collector')}
                          getLevel={(k) => turretUpgrades?.collector?.[k] || 0}
                          resources={resources}
                          onUpgrade={onUpgrade}
                          category="turret"
                          targetType="collector"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex border-t border-slate-700/50 bg-slate-950/80 backdrop-blur-sm">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-4 flex flex-col items-center gap-1.5 font-bold transition-all ${
                      activeTab === tab.id
                        ? 'text-white bg-slate-800/70'
                        : 'text-slate-500 hover:text-slate-300'
                    } ${tab.id !== 'menu' ? 'text-lg' : 'text-base'}`}
                  >
                    <span className="text-2xl">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal Ajustes */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4">
          <div className="w-full max-w-xl rounded-[32px] border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
              <div>
                <p className="text-4xl font-black text-white">Ajustes</p>
                <p className="text-sm text-slate-400 mt-1">Controla sonido, música y brillo.</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-full border border-slate-700/80 bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-700/60 bg-slate-950/90 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-300">Sonido general</p>
                    <p className="text-xs text-slate-500">Ajusta el volumen principal del juego.</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{menuVolume}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setMenuVolume(v => Math.max(0, v - 10))} className="rounded-full bg-slate-800 px-4 py-2 text-base font-bold text-white hover:bg-slate-700">-</button>
                  <div className="flex-1 rounded-2xl border border-slate-700/70 bg-slate-900 px-4 py-3 text-center text-slate-200">Volumen del juego.</div>
                  <button type="button" onClick={() => setMenuVolume(v => Math.min(100, v + 10))} className="rounded-full bg-slate-800 px-4 py-2 text-base font-bold text-white hover:bg-slate-700">+</button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-700/60 bg-slate-950/90 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-300">Música</p>
                    <p className="text-xs text-slate-500">Activa o desactiva la música de fondo.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuMusicEnabled(v => !v)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${menuMusicEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    {menuMusicEnabled ? 'Activada' : 'Desactivada'}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Funcionalidad lista: la música se habilita/deshabilita aquí aunque todavía no haya pistas.</p>
              </div>

              <div className="rounded-3xl border border-slate-700/60 bg-slate-950/90 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-300">Brillo</p>
                    <p className="text-xs text-slate-500">Ajusta la luminosidad general del juego.</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{menuBrightness}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setMenuBrightness(v => Math.max(40, v - 10))} className="rounded-full bg-slate-800 px-4 py-2 text-base font-bold text-white hover:bg-slate-700">-</button>
                  <div className="flex-1 rounded-2xl border border-slate-700/70 bg-slate-900 px-4 py-3 text-center text-slate-200">Brillo del juego.</div>
                  <button type="button" onClick={() => setMenuBrightness(v => Math.min(120, v + 10))} className="rounded-full bg-slate-800 px-4 py-2 text-base font-bold text-white hover:bg-slate-700">+</button>
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() => { setSettingsOpen(false); setCreditsOpen(true); }}
                  className="w-full rounded-2xl border border-purple-700/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 font-bold py-3 transition-all"
                >
                  🎬 Créditos
                </button>
                <Button onClick={() => setSettingsOpen(false)} variant="secondary">Volver al menú</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Créditos */}
      {creditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-[32px] border border-purple-700/40 bg-slate-900/95 p-8 shadow-2xl text-center"
          >
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
              Créditos
            </h2>
            <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent my-4" />

            <div className="space-y-4 text-left">
              <div className="bg-slate-800/60 border border-purple-700/20 rounded-2xl p-4">
                <p className="text-xs text-purple-400 uppercase tracking-wider font-bold mb-1">Desarrollador</p>
                <p className="text-white font-semibold">Diego Cabrera Martínez</p>
              </div>
              <div className="bg-slate-800/60 border border-blue-700/20 rounded-2xl p-4">
                <p className="text-xs text-blue-400 uppercase tracking-wider font-bold mb-1">Institución</p>
                <p className="text-white font-semibold">Universidad de Granada</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/20 rounded-2xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Juego</p>
                <p className="text-white font-semibold">Turret Doom</p>
                <p className="text-slate-400 text-sm mt-0.5">Estrategia y Combate</p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent my-6" />
            <button
              onClick={() => setCreditsOpen(false)}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 transition-all"
            >
              Cerrar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}