import React from 'react';
import { Button } from "@/components/ui/button";
import { Trophy, Skull, Coins, RotateCcw, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GameOverScreen({ result, onRetry, onReplay, onUpgrades, onMenu }) {
  const won = result?.won;
  const xpGained = result?.xpGained || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
      >
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
          won ? 'bg-yellow-500/20' : 'bg-red-500/20'
        }`}>
          {won ? (
            <Trophy className="w-10 h-10 text-yellow-400" />
          ) : (
            <Skull className="w-10 h-10 text-red-400" />
          )}
        </div>

        <h2 className={`text-2xl font-black mb-2 ${won ? 'text-yellow-400' : 'text-red-400'}`}>
          {won ? '¡VICTORIA!' : 'DERROTA'}
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          {won ? `¡Has completado el nivel ${result.level}!` : 'Tu luchador ha caído en batalla'}
        </p>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 flex items-center justify-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-3 rounded-xl">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold">+{result.reward}</span>
            <span className="text-slate-400 text-xs">🪙</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-3 rounded-xl">
            <span className="text-indigo-400 font-bold">+{xpGained}</span>
            <span className="text-slate-400 text-xs">⭐ XP</span>
          </div>
        </div>

        <div className="space-y-3">
          {won ? (
            <>
              <Button onClick={onRetry} className="w-full bg-green-600 hover:bg-green-500 h-11">
                Siguiente Nivel →
              </Button>
              <Button onClick={onReplay} className="w-full bg-blue-600 hover:bg-blue-500 h-11">
                <RotateCcw className="w-4 h-4 mr-2" />
                Repetir Nivel
              </Button>
            </>
          ) : (
            <Button onClick={onRetry} className="w-full bg-blue-600 hover:bg-blue-500 h-11">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          )}
          <Button onClick={onUpgrades} variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 h-11">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Mejoras
          </Button>
          <Button onClick={onMenu} variant="ghost" className="w-full text-slate-500 hover:text-slate-300">
            Menú Principal
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}