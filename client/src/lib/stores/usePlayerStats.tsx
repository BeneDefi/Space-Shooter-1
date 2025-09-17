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
  
  // Daily login and streak data
  lastLoginDate: string | null;
  currentStreak: number;
  
  // Purchase history
  purchaseHistory: PurchaseRecord[];
  
  // Loading states
  isLoading: boolean;
  lastSynced: Date | null;
  
  // Actions
  updateStats: (newStats: Partial<GameStats>) => void;
  incrementStat: (statKey: keyof GameStats, amount?: number) => void;
  setUserData: (fid: number, displayName: string, profilePicture: string) => void;
  checkDailyLogin: () => Promise<void>;
  addPurchase: (purchase: PurchaseRecord) => void;
  syncWithDatabase: () => Promise<void>;
  loadPlayerStats: (farcasterFid: number) => Promise<void>;
  resetStats: () => void;
}

interface PurchaseRecord {
  id: number;
  itemName: string;
  itemType: string;
  price: number;
  currency: string;
  purchasedAt: Date;
}

const initialStats: GameStats = {
  totalScore: 0,
  highScore: 0,
  enemiesDestroyed: 0,
  gamesPlayed: 0,
  timePlayedMinutes: 0,
  streakDays: 1,
  maxStreak: 1,
  dailyLogins: 1,
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
      lastLoginDate: null,
      currentStreak: 1,
      purchaseHistory: [],
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
                streakDays: data.streakDays || 1,
                maxStreak: data.maxStreak || 1,
                dailyLogins: data.dailyLogins || 1,
                socialShares: data.socialShares || 0,
                friendsInvited: data.friendsInvited || 0,
              },
              farcasterFid,
              lastLoginDate: data.lastLoginAt ? new Date(data.lastLoginAt).toISOString().split('T')[0] : null,
              currentStreak: data.streakDays || 1,
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
      
      checkDailyLogin: async () => {
        const { farcasterFid, lastLoginDate } = get();
        if (!farcasterFid) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        // Skip if already logged in today
        if (lastLoginDate === today) return;
        
        try {
          const response = await fetch('/api/daily-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ farcasterFid }),
          });
          
          if (response.ok) {
            const data = await response.json();
            set({
              lastLoginDate: today,
              currentStreak: data.streakDays,
              stats: {
                ...get().stats,
                streakDays: data.streakDays,
                maxStreak: Math.max(get().stats.maxStreak, data.streakDays),
                dailyLogins: get().stats.dailyLogins + 1,
              },
            });
            get().syncWithDatabase();
          }
        } catch (error) {
          console.error('Failed to check daily login:', error);
        }
      },
      
      addPurchase: (purchase: PurchaseRecord) => {
        set((state) => ({
          purchaseHistory: [purchase, ...state.purchaseHistory],
        }));
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
        lastLoginDate: state.lastLoginDate,
        currentStreak: state.currentStreak,
        purchaseHistory: state.purchaseHistory,
        lastSynced: state.lastSynced,
      }),
    }
  )
);