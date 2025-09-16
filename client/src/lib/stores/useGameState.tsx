import { create } from "zustand";
import { usePlayerStats } from "./usePlayerStats";

export type GamePhase = "ready" | "playing" | "paused" | "ended";

interface GameSessionData {
  startTime: number;
  endTime?: number;
  enemiesKilled: number;
  powerUpsCollected: number;
  bulletsShot: number;
  bulletsHit: number;
  maxLevel: number;
}

interface GameState {
  gamePhase: GamePhase;
  score: number;
  lives: number;
  level: number;
  sessionData: GameSessionData;
  
  // Actions
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: (finalStats?: Partial<GameSessionData>) => Promise<void>;
  restartGame: () => void;
  setScore: (score: number) => void;
  setLives: (lives: number) => void;
  setLevel: (level: number) => void;
  incrementLevel: () => void;
  updateSessionData: (data: Partial<GameSessionData>) => void;
  incrementEnemiesKilled: () => void;
  incrementPowerUpsCollected: () => void;
  incrementBulletStats: (shot?: boolean, hit?: boolean) => void;
}

export const useGameState = create<GameState>((set, get) => ({
  gamePhase: "ready",
  score: 0,
  lives: 3,
  level: 1,
  sessionData: {
    startTime: 0,
    enemiesKilled: 0,
    powerUpsCollected: 0,
    bulletsShot: 0,
    bulletsHit: 0,
    maxLevel: 1,
  },
  
  startGame: () => {
    const now = Date.now();
    set({ 
      gamePhase: "playing",
      sessionData: {
        startTime: now,
        enemiesKilled: 0,
        powerUpsCollected: 0,
        bulletsShot: 0,
        bulletsHit: 0,
        maxLevel: 1,
      }
    });
  },
  
  pauseGame: () => set({ gamePhase: "paused" }),
  resumeGame: () => set({ gamePhase: "playing" }),
  
  endGame: async (finalStats?: Partial<GameSessionData>) => {
    const state = get();
    const endTime = Date.now();
    const gameTime = endTime - state.sessionData.startTime;
    
    // Update session data with final stats
    const finalSessionData = {
      ...state.sessionData,
      endTime,
      ...finalStats,
    };
    
    // Calculate accuracy
    const accuracy = finalSessionData.bulletsShot > 0 
      ? finalSessionData.bulletsHit / finalSessionData.bulletsShot 
      : 0;
    
    try {
      // Save game session to backend
      const response = await fetch('/api/game/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          score: state.score,
          level: finalSessionData.maxLevel,
          gameTime,
          enemiesKilled: finalSessionData.enemiesKilled,
          powerUpsCollected: finalSessionData.powerUpsCollected,
          accuracy,
        }),
      });
      
      if (response.ok) {
        console.log('Game session saved successfully');
        
        // Update player stats store
        const playerStats = usePlayerStats.getState();
        playerStats.updateStats({
          gamesPlayed: playerStats.stats.gamesPlayed + 1,
          totalScore: playerStats.stats.totalScore + state.score,
          enemiesDestroyed: playerStats.stats.enemiesDestroyed + finalSessionData.enemiesKilled,
          timePlayedMinutes: playerStats.stats.timePlayedMinutes + Math.round(gameTime / 60000),
        });
        
        if (state.score > playerStats.stats.highScore) {
          playerStats.updateStats({ highScore: state.score });
        }
      } else {
        console.error('Failed to save game session:', await response.text());
      }
    } catch (error) {
      console.error('Error saving game session:', error);
    }
    
    set({ 
      gamePhase: "ended",
      sessionData: finalSessionData
    });
  },
  
  restartGame: () => set({ 
    gamePhase: "ready", 
    score: 0, 
    lives: 3, 
    level: 1,
    sessionData: {
      startTime: 0,
      enemiesKilled: 0,
      powerUpsCollected: 0,
      bulletsShot: 0,
      bulletsHit: 0,
      maxLevel: 1,
    }
  }),
  
  setScore: (score: number) => set({ score }),
  setLives: (lives: number) => set({ lives }),
  setLevel: (level: number) => set((state) => ({ 
    level,
    sessionData: {
      ...state.sessionData,
      maxLevel: Math.max(state.sessionData.maxLevel, level)
    }
  })),
  incrementLevel: () => set((state) => ({ 
    level: state.level + 1,
    sessionData: {
      ...state.sessionData,
      maxLevel: Math.max(state.sessionData.maxLevel, state.level + 1)
    }
  })),
  
  updateSessionData: (data: Partial<GameSessionData>) => 
    set((state) => ({
      sessionData: { ...state.sessionData, ...data }
    })),
    
  incrementEnemiesKilled: () => 
    set((state) => ({
      sessionData: {
        ...state.sessionData,
        enemiesKilled: state.sessionData.enemiesKilled + 1
      }
    })),
    
  incrementPowerUpsCollected: () => 
    set((state) => ({
      sessionData: {
        ...state.sessionData,
        powerUpsCollected: state.sessionData.powerUpsCollected + 1
      }
    })),
    
  incrementBulletStats: (shot = false, hit = false) => 
    set((state) => ({
      sessionData: {
        ...state.sessionData,
        bulletsShot: state.sessionData.bulletsShot + (shot ? 1 : 0),
        bulletsHit: state.sessionData.bulletsHit + (hit ? 1 : 0)
      }
    })),
}));

// Helper function to access game session data
export const getGameSessionStats = () => {
  const state = useGameState.getState();
  return {
    ...state.sessionData,
    gameTime: state.sessionData.endTime 
      ? state.sessionData.endTime - state.sessionData.startTime 
      : Date.now() - state.sessionData.startTime,
    accuracy: state.sessionData.bulletsShot > 0 
      ? state.sessionData.bulletsHit / state.sessionData.bulletsShot 
      : 0,
  };
};
