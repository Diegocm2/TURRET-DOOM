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
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-10 flex justify-between p-2 gap-2">
      {/* Player stats */}
      <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-2.5 w-52 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Jugador</span>
          <span className="text-[10px] font-mono text-yellow-400">{state.resources} 🪙</span>
        </div>
        <Bar label="Salud" value={state.playerHealth} max={state.playerMaxHealth} color={COLORS.health} />
        <Bar label="Balas" value={state.playerAmmo} max={state.playerMaxAmmo} color={COLORS.bullet} />
        <Bar label="Energía" value={state.playerMaxFatigue - state.playerFatigue} max={state.playerMaxFatigue} color={COLORS.fatigue} />
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          <span className="text-[9px] text-slate-500">T:{state.playerTurretCount}</span>
          {state.effects?.attack > 0 && <span className="text-[9px] bg-red-500/20 text-red-300 px-1 rounded">⚔️ATK</span>}
          {state.effects?.shield > 0 && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded">🛡️DEF</span>}
          {state.effects?.build > 0 && <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded">⚡BUILD</span>}
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