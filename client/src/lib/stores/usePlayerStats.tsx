import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameStats } from "../web3/achievements";

interface PlayerStatsState {
  // Player statistics
  stats: GameStats;
  
  // User data from Farcaster
  farcasterFid: number | null;
  displayName: string | null;
  profilePicture: string | null;
  
  // Loading states
  isLoading: boolean;
  lastSynced: Date | null;
  
  // Actions
  updateStats: (newStats: Partial<GameStats>) => void;
  incrementStat: (statKey: keyof GameStats, amount?: number) => void;
  setUserData: (fid: number, displayName: string, profilePicture: string) => void;
  syncWithDatabase: () => Promise<void>;
  loadPlayerStats: (farcasterFid: number) => Promise<void>;
  resetStats: () => void;
}

const initialStats: GameStats = {
  totalScore: 0,
  highScore: 0,
  enemiesDestroyed: 0,
  gamesPlayed: 0,
  timePlayedMinutes: 0,
  streakDays: 1,
  socialShares: 0,
  friendsInvited: 0,
};

export const usePlayerStats = create<PlayerStatsState>()(
  persist(
    (set, get) => ({
      stats: initialStats,
      farcasterFid: null,
      displayName: null,
      profilePicture: null,
      isLoading: false,
      lastSynced: null,
      
      updateStats: (newStats: Partial<GameStats>) => {
        set((state) => ({
          stats: { ...state.stats, ...newStats },
        }));
        // Auto-sync with database when stats are updated
        get().syncWithDatabase();
      },
      
      incrementStat: (statKey: keyof GameStats, amount = 1) => {
        set((state) => ({
          stats: {
            ...state.stats,
            [statKey]: state.stats[statKey] + amount,
          },
        }));
        // Auto-sync with database when stats are updated
        get().syncWithDatabase();
      },
      
      setUserData: (fid: number, displayName: string, profilePicture: string) => {
        set({
          farcasterFid: fid,
          displayName,
          profilePicture,
        });
      },
      
      loadPlayerStats: async (farcasterFid: number) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`/api/player-stats/${farcasterFid}`);
          if (response.ok) {
            const data = await response.json();
            set({
              stats: {
                totalScore: data.totalScore || 0,
                highScore: data.highScore || 0,
                enemiesDestroyed: data.enemiesDestroyed || 0,
                gamesPlayed: data.gamesPlayed || 0,
                timePlayedMinutes: data.timePlayedMinutes || 0,
                streakDays: 1, // Not stored in DB yet
                socialShares: data.socialShares || 0,
                friendsInvited: data.friendsInvited || 0,
              },
              farcasterFid,
              lastSynced: new Date(),
            });
          }
        } catch (error) {
          console.error('Failed to load player stats:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      syncWithDatabase: async () => {
        const { stats, farcasterFid } = get();
        if (!farcasterFid) return;
        
        try {
          await fetch('/api/player-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              farcasterFid,
              ...stats,
            }),
          });
          set({ lastSynced: new Date() });
        } catch (error) {
          console.error('Failed to sync player stats:', error);
        }
      },
      
      resetStats: () => {
        set({ stats: initialStats });
        get().syncWithDatabase();
      },
    }),
    {
      name: 'player-stats-storage',
      partialize: (state) => ({
        stats: state.stats,
        farcasterFid: state.farcasterFid,
        displayName: state.displayName,
        profilePicture: state.profilePicture,
        lastSynced: state.lastSynced,
      }),
    }
  )
);