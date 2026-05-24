import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from './GameEngine';
import GameHUD from './GameHUD';
import TurretDeck from './TurretDeck';

export default function GameCanvas({ level, upgrades, equippedOffensive, equippedCharacter, onGameEnd, onExit }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [hudState, setHudState] = useState(null);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window === 'undefined') return 70;
    return Number(window.localStorage.getItem('turret-doom-volume') || 70);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('turret-doom-volume', String(volume));
  }, [volume]);

  useEffect(() => {
    function handlePauseKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPaused((prev) => {
          const next = !prev;
          if (engineRef.current) {
            next ? engineRef.current.pause() : engineRef.current.resume();
          }
          return next;
        });
        return;
      }

      if (paused) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }

    window.addEventListener('keydown', handlePauseKey, true);
    return () => window.removeEventListener('keydown', handlePauseKey, true);
  }, [paused]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(
      canvasRef.current,
      level,
      upgrades,
      onGameEnd,
      { offensiveTurret: equippedOffensive || 'classic', character: equippedCharacter || 'dolphin' }
    );
    engineRef.current = engine;
    engine.start();

    const hudInterval = setInterval(() => {
      if (engine.running) {
        setHudState(engine.getState());
      }
    }, 100);

    return () => {
      clearInterval(hudInterval);
      engine.stop();
    };
  }, [level, upgrades]);

  const handleSelectTurret = useCallback((type, mode) => {
    if (!engineRef.current) return;
    if (mode === 'offensive') {
      engineRef.current.selectedTurret = type;
      engineRef.current.turretMode = 'offensive';
    } else if (mode === 'support') {
      engineRef.current.selectedDefensive = type;
      engineRef.current.turretMode = 'support';
    } 
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center">
      <div className="relative w-full max-w-[1040px] grow overflow-hidden rounded-3xl border border-slate-700/40 bg-slate-950/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ width: '100%', height: '100%', minHeight: '56vh', display: 'block' }}
        />
        <GameHUD state={hudState} />
        <div className="absolute bottom-4 right-4 rounded-full bg-slate-900/80 px-3 py-2 text-xs text-slate-300 backdrop-blur-sm border border-slate-700/60">
          Presiona <span className="font-semibold text-white">Esc</span> para pausar
        </div>
        {paused && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-6">
            <div className="w-full max-w-xl rounded-[32px] border border-slate-600/80 bg-slate-900/95 p-6 shadow-2xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <p className="text-3xl font-black text-white">Pausa</p>
                  <p className="text-sm text-slate-400">La partida está detenida. Continúa cuando estés listo.</p>
                </div>
                <div className="rounded-2xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-200">Volumen {volume}%</div>
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-700/60 bg-slate-950/90 p-4">
                  <p className="text-sm font-semibold text-slate-200 mb-3">Audio</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setVolume((volume) => Math.max(0, volume - 10))}
                      className="rounded-full bg-slate-800 px-4 py-2 text-base font-bold text-white hover:bg-slate-700"
                    >
                      -
                    </button>
                    <div className="flex-1 rounded-2xl border border-slate-700/70 bg-slate-900 px-4 py-3 text-center text-slate-200">
                      Ajusta el volumen con los botones.
                    </div>
                    <button
                      type="button"
                      onClick={() => setVolume((volume) => Math.min(100, volume + 10))}
                      className="rounded-full bg-slate-800 px-4 py-2 text-base font-bold text-white hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaused(false);
                      engineRef.current?.resume();
                    }}
                    className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Continuar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      engineRef.current?.stop();
                      onExit?.();
                    }}
                    className="rounded-2xl bg-yellow-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-400"
                  >
                    Abandonar partida
                  </button>
                  <button
                    type="button"
                    onClick={() => window.electronApp?.close()}
                    className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
                  >
                    Cerrar juego
                  </button>
                </div>
                <div className="rounded-3xl border border-slate-700/60 bg-slate-950/90 p-3 text-sm text-slate-400">
                  <p className="font-semibold text-slate-200">Consejo rápido</p>
                  <p>Usa la tecla <span className="font-mono">Tab</span> para alternar entre torreta ofensiva y soporte.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      {/* Turret deck BELOW canvas — no overlap */}
      <TurretDeck state={hudState} onSelectTurret={handleSelectTurret} equippedOffensive={equippedOffensive} equippedCharacter={equippedCharacter} onUseAbility={() => engineRef.current?.useSpecialAbility()} />
    </div>
  );
}