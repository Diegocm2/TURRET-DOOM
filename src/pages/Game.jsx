import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainMenu from '../components/game/MainMenu';
import GameCanvas from '../components/game/GameCanvas';
import GameOverScreen from '../components/game/GameOverScreen';
import LevelSelect from '../components/game/LevelSelect';
import {
  UPGRADE_COSTS, getXpReward, getPlayerRankFromXp, CHARACTERS,
  buildDefaultTurretUpgrades,
} from '../components/game/GameConstants';

const SCREENS = {
  MENU: 'menu',
  LEVEL_SELECT: 'level_select',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
};

const DEFAULT_CHAR_UPGRADES = { fabrication: 0, health: 0, magazine: 0, charge_speed: 0, reload_speed: 0, shooting: 0, fatigue: 0 };
const DEFAULT_TURRET_UPGRADES = buildDefaultTurretUpgrades();
const LOCAL_SAVE_KEY = 'turret-doom-save-v1';

const DEFAULT_CHARACTER_IDS = Object.keys(CHARACTERS);
function buildDefaultCharacterUpgrades() {
  return DEFAULT_CHARACTER_IDS.reduce((acc, id) => ({
    ...acc,
    [id]: { ...DEFAULT_CHAR_UPGRADES },
  }), {});
}

function buildDefaultSave() {
  return {
    level: 1,
    resources: 0,
    xp: 0,
    wins: 0,
    turretUpgrades: { ...DEFAULT_TURRET_UPGRADES },
    characterUpgrades: buildDefaultCharacterUpgrades(),
    equippedOffensive: 'classic',
    equippedCharacter: 'dolphin',
  };
}

export default function Game() {
  const [screen, setScreen] = useState(SCREENS.MENU);
  const [menuInitialTab, setMenuInitialTab] = useState('menu');
  const [gameResult, setGameResult] = useState(null);
  const [localSave, setLocalSave] = useState(null);
  const [equippedOffensive, setEquippedOffensive] = useState('classic');
  const [equippedCharacter, setEquippedCharacter] = useState('dolphin');
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
      const upgradedSave = {
        ...buildDefaultSave(),
        ...storedSave,
        turretUpgrades: {
          ...buildDefaultTurretUpgrades(),
          ...(storedSave.turretUpgrades || {}),
        },
        characterUpgrades: {
          ...buildDefaultCharacterUpgrades(),
          ...(storedSave.characterUpgrades || {}),
        },
        equippedCharacter: CHARACTERS[storedSave.equippedCharacter]?.id ? storedSave.equippedCharacter : 'dolphin',
      };
      setLocalSave(upgradedSave);
      if (upgradedSave.equippedOffensive) setEquippedOffensive(upgradedSave.equippedOffensive);
      if (upgradedSave.equippedCharacter) setEquippedCharacter(upgradedSave.equippedCharacter);
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
  const handleUpgrade = useCallback((key, category, turretType) => {
    if (category === 'character') {
      const upgrades = save.characterUpgrades?.[equippedCharacter] || {};
      const currentLevel = upgrades[key] || 0;
      const maxLevel = UPGRADE_COSTS[key].length - 1;
      if (currentLevel >= maxLevel) return;
      const cost = UPGRADE_COSTS[key][currentLevel + 1];
      if ((save.resources || 0) < cost) return;

      const newCharUpgrades = {
        ...save.characterUpgrades,
        [equippedCharacter]: {
          ...(save.characterUpgrades?.[equippedCharacter] || {}),
          [key]: currentLevel + 1,
        },
      };
      persistSave({ resources: save.resources - cost, characterUpgrades: newCharUpgrades });
      return;
    }

    const type = turretType || equippedOffensive;
    const upgrades = (save.turretUpgrades?.[type] || {});
    const currentLevel = upgrades[key] || 0;
    const maxLevel = UPGRADE_COSTS[key].length - 1;
    if (currentLevel >= maxLevel) return;
    const cost = UPGRADE_COSTS[key][currentLevel + 1];
    if ((save.resources || 0) < cost) return;

    persistSave({
      resources: save.resources - cost,
      turretUpgrades: {
        ...save.turretUpgrades,
        [type]: {
          ...save.turretUpgrades?.[type],
          [key]: currentLevel + 1,
        },
      },
    });
  }, [save, equippedCharacter, equippedOffensive, persistSave]);

  // Build combined upgrades object for the game engine
  const getActiveUpgrades = useCallback(() => {
    const charUpgs = save.characterUpgrades?.[equippedCharacter] || {};
    return {
      ...charUpgs,
      turretUpgrades: save.turretUpgrades || buildDefaultTurretUpgrades(),
    };
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
          characterUpgrades={save.characterUpgrades || buildDefaultCharacterUpgrades()}
          equippedOffensive={equippedOffensive}
          onChangeOffensive={setEquippedOffensive}
          equippedCharacter={equippedCharacter}
          onChangeCharacter={setEquippedCharacter}
          onUpgrade={handleUpgrade}
          onPlay={handlePlay}
          onClose={() => window.electronAPI?.quit?.() || window.close()}
          onCredits={() => {}}
          initialTab={menuInitialTab}
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
          onUpgrades={() => {
            setMenuInitialTab('upgrades');
            setScreen(SCREENS.MENU);
          }}
          onMenu={() => {
            setMenuInitialTab('menu');
            setScreen(SCREENS.MENU);
          }}
        />
      )}
    </div>
  );
}