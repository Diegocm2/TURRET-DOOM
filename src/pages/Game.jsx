import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainMenu from '../components/game/MainMenu';
import GameCanvas from '../components/game/GameCanvas';
import GameOverScreen from '../components/game/GameOverScreen';
import LevelSelect from '../components/game/LevelSelect';
import {
  UPGRADE_COSTS, getXpReward, getPlayerRankFromXp,
} from '../components/game/GameConstants';

const SCREENS = {
  MENU: 'menu',
  LEVEL_SELECT: 'level_select',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
};

const DEFAULT_CHAR_UPGRADES = { health: 0, magazine: 0, charge_speed: 0, reload_speed: 0, shooting: 0, fatigue: 0 };
const DEFAULT_TURRET_UPGRADES = { fabrication: 0, turret_health: 0, turret_damage: 0, turret_build: 0 };
const LOCAL_SAVE_KEY = 'turret-doom-save-v1';

function buildDefaultSave() {
  return {
    level: 1,
    resources: 0,
    xp: 0,
    wins: 0,
    turretUpgrades: { ...DEFAULT_TURRET_UPGRADES },
    characterUpgrades: { soldier: { ...DEFAULT_CHAR_UPGRADES } },
    equippedOffensive: 'classic',
    equippedCharacter: 'soldier',
  };
}

export default function Game() {
  const [screen, setScreen] = useState(SCREENS.MENU);
  const [gameResult, setGameResult] = useState(null);
  const [localSave, setLocalSave] = useState(null);
  const [equippedOffensive, setEquippedOffensive] = useState('classic');
  const [equippedCharacter, setEquippedCharacter] = useState('soldier');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const queryClient = useQueryClient();

  const { data: saves } = useQuery({
    queryKey: ['gameSave'],
    queryFn: () => base44.entities.GameSave.list('-updated_date', 1),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.GameSave.update(id, data)
      : base44.entities.GameSave.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gameSave'] }),
  });

  useEffect(() => {
    const storedText = window.localStorage.getItem(LOCAL_SAVE_KEY);
    const storedSave = storedText ? JSON.parse(storedText) : null;

    if (saves.length > 0) {
      const s = saves[0];
      setLocalSave(s);
      if (s.equippedOffensive) setEquippedOffensive(s.equippedOffensive);
      if (s.equippedCharacter) setEquippedCharacter(s.equippedCharacter);
      window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify({
        ...s,
        equippedOffensive: s.equippedOffensive || equippedOffensive,
        equippedCharacter: s.equippedCharacter || equippedCharacter,
      }));
    } else if (!localSave && storedSave) {
      setLocalSave(storedSave);
      if (storedSave.equippedOffensive) setEquippedOffensive(storedSave.equippedOffensive);
      if (storedSave.equippedCharacter) setEquippedCharacter(storedSave.equippedCharacter);
    } else if (saves.length === 0 && !localSave) {
      const newSave = buildDefaultSave();
      setLocalSave(newSave);
      window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(newSave));
      saveMutation.mutate({ id: null, data: newSave });
    }
  }, [saves]);

  const save = localSave || buildDefaultSave();

  const persistSave = useCallback((newData) => {
    const updated = { ...save, ...newData };
    const storageSave = { ...updated, equippedOffensive, equippedCharacter };
    window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(storageSave));
    setLocalSave(updated);
    saveMutation.mutate({
      id: save.id || saves[0]?.id,
      data: {
        level: updated.level,
        resources: updated.resources,
        xp: updated.xp,
        wins: updated.wins,
        turretUpgrades: updated.turretUpgrades,
        characterUpgrades: updated.characterUpgrades,
        equippedOffensive,
        equippedCharacter,
      },
    });
  }, [save, saves, equippedOffensive, equippedCharacter]);

  const handleGameEnd = useCallback((result) => {
    setGameResult(result);
    const xpGained = getXpReward(result.level, result.won);
    const updatedXp = (save.xp || 0) + xpGained;
    const newData = {
      resources: (save.resources || 0) + result.reward,
      xp: updatedXp,
      level: getPlayerRankFromXp(updatedXp),
    };
    if (result.won) {
      newData.wins = (save.wins || 0) + 1;
    }
    persistSave(newData);
    setScreen(SCREENS.GAME_OVER);
  }, [save, persistSave, selectedLevel]);

  // onUpgrade(key, category) where category = 'character' | 'turret'
  const handleUpgrade = useCallback((key, category) => {
    const upgrades = category === 'character'
      ? (save.characterUpgrades?.[equippedCharacter] || {})
      : (save.turretUpgrades || {});
    const currentLevel = upgrades[key] || 0;
    const maxLevel = UPGRADE_COSTS[key].length - 1;
    if (currentLevel >= maxLevel) return;
    const cost = UPGRADE_COSTS[key][currentLevel + 1];
    if ((save.resources || 0) < cost) return;

    if (category === 'character') {
      const newCharUpgrades = {
        ...save.characterUpgrades,
        [equippedCharacter]: {
          ...(save.characterUpgrades?.[equippedCharacter] || {}),
          [key]: currentLevel + 1,
        },
      };
      persistSave({ resources: save.resources - cost, characterUpgrades: newCharUpgrades });
    } else {
      persistSave({
        resources: save.resources - cost,
        turretUpgrades: { ...save.turretUpgrades, [key]: currentLevel + 1 },
      });
    }
  }, [save, equippedCharacter, persistSave]);

  // Build combined upgrades object for the game engine
  const getActiveUpgrades = useCallback(() => {
    const charUpgs = save.characterUpgrades?.[equippedCharacter] || {};
    return { ...charUpgs, ...(save.turretUpgrades || {}) };
  }, [save, equippedCharacter]);

  const handlePlay = () => {
    setSelectedLevel(save.level || 1);
    setScreen(SCREENS.LEVEL_SELECT);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {screen === SCREENS.MENU && (
        <MainMenu
          level={save.level || 1}
          resources={save.resources || 0}
          xp={save.xp || 0}
          wins={save.wins || 0}
          turretUpgrades={save.turretUpgrades || DEFAULT_TURRET_UPGRADES}
          characterUpgrades={save.characterUpgrades || { soldier: { ...DEFAULT_CHAR_UPGRADES } }}
          equippedOffensive={equippedOffensive}
          onChangeOffensive={setEquippedOffensive}
          equippedCharacter={equippedCharacter}
          onChangeCharacter={setEquippedCharacter}
          onUpgrade={handleUpgrade}
          onPlay={handlePlay}
          onClose={() => window.electronAPI?.quit?.() || window.close()}
          onCredits={() => {}}
        />
      )}

      {screen === SCREENS.LEVEL_SELECT && (
        <LevelSelect
          maxLevel={save.level || 1}
          onSelectLevel={(lvl) => { setSelectedLevel(lvl); setScreen(SCREENS.PLAYING); }}
          onBack={() => setScreen(SCREENS.MENU)}
        />
      )}

      {screen === SCREENS.PLAYING && (
        <GameCanvas
          level={selectedLevel}
          upgrades={getActiveUpgrades()}
          equippedOffensive={equippedOffensive}
          equippedCharacter={equippedCharacter}
          onGameEnd={handleGameEnd}
        />
      )}

      {screen === SCREENS.GAME_OVER && gameResult && (
        <GameOverScreen
          result={{ ...gameResult, xpGained: getXpReward(gameResult.level, gameResult.won) }}
          onRetry={() => {
            if (gameResult.won) setSelectedLevel(prev => prev + 1);
            setScreen(SCREENS.PLAYING);
          }}
          onReplay={() => setScreen(SCREENS.PLAYING)}
          onUpgrades={() => setScreen(SCREENS.MENU)}
          onMenu={() => setScreen(SCREENS.MENU)}
        />
      )}
    </div>
  );
}