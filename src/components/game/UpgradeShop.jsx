import React from 'react';
import { UPGRADE_COSTS, UPGRADE_NAMES, UPGRADE_ICONS } from './GameConstants';
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Shield } from 'lucide-react';

function UpgradeCard({ upgradeKey, currentLevel, resources, onUpgrade }) {
  const maxLevel = UPGRADE_COSTS[upgradeKey].length - 1;
  const nextCost = currentLevel < maxLevel ? UPGRADE_COSTS[upgradeKey][currentLevel + 1] : null;
  const canAfford = nextCost !== null && resources >= nextCost;
  const isMaxed = currentLevel >= maxLevel;

  return (
    <div className={`relative bg-slate-800/60 backdrop-blur-sm border rounded-xl p-4 transition-all ${
      isMaxed ? 'border-yellow-500/30' : canAfford ? 'border-blue-500/30 hover:border-blue-400/60' : 'border-slate-700/50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{UPGRADE_ICONS[upgradeKey]}</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">{UPGRADE_NAMES[upgradeKey]}</h3>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: maxLevel }, (_, i) => (
                <div
                  key={i}
                  className={`w-5 h-1.5 rounded-full transition-all ${
                    i < currentLevel ? 'bg-blue-400' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        {isMaxed ? (
          <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg uppercase">MAX</span>
        ) : (
          <Button
            size="sm"
            disabled={!canAfford}
            onClick={() => onUpgrade(upgradeKey)}
            className={`text-xs h-8 ${
              canAfford
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {nextCost} 🪙
          </Button>
        )}
      </div>
    </div>
  );
}

export default function UpgradeShop({ upgrades, resources, onUpgrade, onBack }) {
  const playerUpgrades = ['fabrication', 'fatigue', 'shooting', 'reload_speed', 'health', 'magazine', 'charge_speed'];
  const turretUpgrades = ['turret_health', 'turret_damage', 'turret_build'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl">
            <span className="text-yellow-400 font-bold text-lg">{resources}</span>
            <span className="text-yellow-300">🪙</span>
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-2">Mejoras</h1>
        <p className="text-slate-400 text-sm mb-8">Mejora tu luchador y tus torretas con los recursos recolectados</p>

        {/* Player upgrades */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Luchador</h2>
          </div>
          <div className="grid gap-3">
            {playerUpgrades.map(key => (
              <UpgradeCard
                key={key}
                upgradeKey={key}
                currentLevel={upgrades[key] || 0}
                resources={resources}
                onUpgrade={onUpgrade}
              />
            ))}
          </div>
        </div>

        {/* Turret upgrades */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Torretas</h2>
          </div>
          <div className="grid gap-3">
            {turretUpgrades.map(key => (
              <UpgradeCard
                key={key}
                upgradeKey={key}
                currentLevel={upgrades[key] || 0}
                resources={resources}
                onUpgrade={onUpgrade}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}