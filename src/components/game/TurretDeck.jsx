import React from 'react';
import { TURRET_TYPES, TURRET_CATEGORY, CHARACTERS } from './GameConstants';

const FIXED_SUPPORT = [
  ['shield', TURRET_TYPES.shield],
  ['collector', TURRET_TYPES.collector],
];

export default function TurretDeck({ state, onSelectTurret, equippedOffensive, equippedCharacter, onUseAbility }) {
  if (!state) return null;
  const isOffensive = state.turretMode === 'offensive';
  const { selectedDefensive } = state;
  const offCfg = TURRET_TYPES[equippedOffensive] || TURRET_TYPES.classic;
  const charCfg = CHARACTERS[equippedCharacter] || CHARACTERS.dolphin;
  const ability = charCfg.ability;
  const cooldownPct = ability ? Math.max(0, (state.abilityCooldown || 0) / (state.abilityMaxCooldown || 1500)) : 0;
  const abilityReady = ability && (state.abilityCooldown || 0) === 0 && (ability.cost === 0 || state.playerAmmo >= ability.cost);
  const sharkDashMode = state.sharkDashMode || false;

  return (
    <div className="flex items-center gap-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl px-6 py-3">
      {/* Equipped offensive slot */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider text-center">Ofensiva [1]</span>
        <div className="flex gap-2">
          <button
            onClick={() => onSelectTurret(equippedOffensive, 'offensive')}
            title={`${offCfg.name} — ${offCfg.description}`}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 transition-all ${
              isOffensive
                ? 'border-red-400 bg-red-500/20 shadow-lg shadow-red-500/20 scale-110'
                : 'border-red-400/50 bg-red-500/10'
            }`}
          >
            <span className="text-2xl leading-none">{offCfg.icon}</span>
            <span className="text-xs text-yellow-400 leading-none mt-1">{offCfg.cost}🪙</span>
          </button>
        </div>
      </div>

      <div className="w-px h-16 bg-slate-700/60" />

      {/* Fixed support */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider text-center">Soporte [5-6]</span>
        <div className="flex gap-2">
          {FIXED_SUPPORT.map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => onSelectTurret(type, 'support')}
              title={`${cfg.name} — ${cfg.description}`}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 transition-all ${
                selectedDefensive === type
                  ? !isOffensive
                    ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20 scale-110'
                    : 'border-emerald-400/50 bg-emerald-500/10'
                  : 'border-slate-600 bg-slate-800/60 hover:border-slate-400'
              }`}
            >
              <span className="text-2xl leading-none">{cfg.icon}</span>
              <span className="text-xs text-yellow-400 leading-none mt-1">{cfg.cost}🪙</span>
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-16 bg-slate-700/60" />

      {/* Active slot indicator */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Activo</span>
        <div className={`w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
          isOffensive ? 'border-red-400 bg-red-500/20' : 'border-emerald-400 bg-emerald-500/20'
        }`}>
          <span className="text-2xl leading-none">
            {isOffensive ? offCfg.icon : TURRET_TYPES[selectedDefensive]?.icon}
          </span>
        </div>
        <span className="text-xs text-slate-500">[Tab]</span>
      </div>

      {/* Special ability button (only if character has one) */}
      {ability && (
        <>
          <div className="w-px h-16 bg-slate-700/60" />
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Habilidad [Q]</span>
            <button
              onClick={onUseAbility}
              disabled={!abilityReady}
              title={`${ability.name} — ${ability.cost} bala`}
              className={`relative flex flex-col items-center justify-center w-18 h-16 px-3 rounded-xl border-2 transition-all overflow-hidden ${
                sharkDashMode
                  ? 'border-cyan-400 bg-cyan-500/30 shadow-lg shadow-cyan-500/40 animate-pulse cursor-pointer'
                  : abilityReady
                    ? 'border-purple-400 bg-purple-500/20 hover:bg-purple-500/30 shadow-lg shadow-purple-500/20 cursor-pointer'
                    : 'border-slate-600 bg-slate-800/60 cursor-not-allowed opacity-60'
              }`}
            >
              {cooldownPct > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-slate-700/70 transition-all"
                  style={{ height: `${cooldownPct * 100}%` }}
                />
              )}
              <span className="text-2xl leading-none relative z-10">{ability.icon}</span>
              <span className="text-xs text-purple-300 leading-none mt-0.5 relative z-10">{ability.name}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}