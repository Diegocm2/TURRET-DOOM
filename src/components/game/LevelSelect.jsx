import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Star, ArrowLeft } from 'lucide-react';

export default function LevelSelect({ maxLevel, onSelectLevel, onBack }) {
  const totalLevels = Math.max(maxLevel + 2, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-black text-white">Seleccionar Nivel</h1>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: totalLevels }, (_, i) => {
            const lvl = i + 1;
            const unlocked = lvl <= maxLevel;
            const isCurrent = lvl === maxLevel;

            return (
              <motion.button
                key={lvl}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => unlocked && onSelectLevel(lvl)}
                disabled={!unlocked}
                className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all font-black text-lg ${
                  isCurrent
                    ? 'border-blue-400 bg-blue-500/20 text-blue-300 shadow-lg shadow-blue-500/20'
                    : unlocked
                    ? 'border-slate-600 bg-slate-800/60 text-white hover:border-slate-400 hover:bg-slate-700/60 cursor-pointer'
                    : 'border-slate-800 bg-slate-900/40 text-slate-700 cursor-not-allowed'
                }`}
              >
                {!unlocked ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <>
                    {isCurrent && <Star className="w-3 h-3 text-yellow-400 absolute top-1.5 right-1.5" fill="currentColor" />}
                    <span>{lvl}</span>
                  </>
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Supera cada nivel para desbloquear el siguiente
        </p>
      </motion.div>
    </div>
  );
}