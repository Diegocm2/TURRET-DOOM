import React from 'react';
import { COLORS, CHARACTERS } from './GameConstants';

function Bar({ label, value, max, color, height = 6 }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[10px] font-mono text-slate-400 w-14 shrink-0">{label}</span>
      <div className="flex-1 rounded-full overflow-hidden bg-slate-800" style={{ height }}>
        <div className="h-full rounded-full transition-all duration-200" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono text-slate-300 w-10 text-right shrink-0">
        {Math.floor(value)}/{Math.floor(max)}
      </span>
    </div>
  );
}

export default function GameHUD({ state }) {
  if (!state) return null;

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-10 flex justify-between p-3 gap-3">
      {/* Player stats */}
      <div className="bg-slate-950/95 backdrop-blur-xl border border-cyan-500/20 rounded-3xl p-3 w-56 space-y-2 shadow-[0_20px_80px_-50px_rgba(56,189,248,0.35)]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-[0.25em]">Jugador</span>
          <span className="text-[10px] font-mono text-amber-300">{state.resources} 🪙</span>
        </div>
        <Bar label="Salud" value={state.playerHealth} max={state.playerMaxHealth} color={COLORS.health} />
        <Bar label="Balas" value={state.playerAmmo} max={state.playerMaxAmmo} color={COLORS.bullet} />
        <Bar label="Energía" value={state.playerMaxFatigue - state.playerFatigue} max={state.playerMaxFatigue} color={COLORS.fatigue} />
        <div className="flex flex-wrap gap-1 text-[9px] text-slate-300 pt-1">
          <span className="px-2 py-0.5 rounded-xl bg-slate-800/80">T:{state.playerTurretCount}</span>
          {state.effects?.attack > 0 && <span className="px-2 py-0.5 rounded-xl bg-red-500/15 text-red-300">⚔️ ATAQUE</span>}
          {state.effects?.shield > 0 && <span className="px-2 py-0.5 rounded-xl bg-blue-500/15 text-blue-300">🛡️ ESCUDO</span>}
          {state.effects?.build > 0 && <span className="px-2 py-0.5 rounded-xl bg-purple-500/15 text-purple-300">⚡ CONSTRUCCIÓN</span>}
        </div>
      </div>

      {/* Enemy stats + weather */}
      <div className="flex flex-col gap-2">
        {state.weather && state.weather.id !== 'calm' && (
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl px-2.5 py-2 flex items-center gap-2">
            <span className="text-sm">{state.weather.icon}</span>
            <div>
              <p className="text-[10px] font-bold text-slate-200 leading-none">{state.weather.name}</p>
              <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{state.weather.description}</p>
            </div>
          </div>
        )}
        <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-2.5 w-44 space-y-1">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm">{CHARACTERS[state.aiCharacterId]?.icon || '🤖'}</span>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{CHARACTERS[state.aiCharacterId]?.name || 'Enemigo IA'}</span>
          </div>
          <Bar label="Salud" value={state.enemyHealth} max={state.enemyMaxHealth} color={COLORS.enemy} />
          <span className="text-[9px] text-slate-500 block">Torretas: {state.enemyTurretCount}</span>
        </div>
      </div>
    </div>
  );
}