import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and, gte, lte, ilike, or } from "drizzle-orm";
import { 
  users, 
  playerStats, 
  gameSessions, 
  playerRankings,
  userAchievements,
  highScores,
  type User, 
  type InsertUser, 
  type HighScore,
  type PlayerStats,
  type GameSession,
  type PlayerRanking
} from "@shared/schema";


export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveHighScore?(userId: number, scoreData: Omit<HighScore, 'id' | 'userId'>): Promise<void>;
  getLeaderboard?(limit: number): Promise<HighScore[]>;
  
  // Enhanced player data methods
  getPlayerStats(userId: number): Promise<PlayerStats | undefined>;
  updatePlayerStats(userId: number, stats: Partial<PlayerStats>): Promise<void>;
  saveGameSession(userId: number, sessionData: Omit<GameSession, 'id' | 'userId' | 'playedAt'>): Promise<void>;
  getPlayerRankings(userId: number): Promise<PlayerRanking[]>;
  getTopPlayers(category: string, timeframe?: 'daily' | 'weekly' | 'monthly' | 'all', limit?: number): Promise<any[]>;
  getPlayerProfile(userId: number): Promise<any>;
  searchPlayers(query: string, limit?: number): Promise<User[]>;
  updatePlayerRankings(): Promise<void>;
}

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    const newUser = result[0];
    
    // Initialize player stats for new user
    await db.insert(playerStats).values({
      userId: newUser.id,
      totalScore: 0,
      highScore: 0,
      enemiesDestroyed: 0,
      gamesPlayed: 0,
      timePlayedMinutes: 0,
      streakDays: 1,
      socialShares: 0,
      friendsInvited: 0,
    });
    
    return newUser;
  }

  async getPlayerStats(userId: number): Promise<PlayerStats | undefined> {
    const result = await db.select().from(playerStats).where(eq(playerStats.userId, userId)).limit(1);
    return result[0];
  }

  async updatePlayerStats(userId: number, stats: Partial<PlayerStats>): Promise<void> {
    await db.update(playerStats)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(playerStats.userId, userId));
  }

  async saveGameSession(userId: number, sessionData: Omit<GameSession, 'id' | 'userId' | 'playedAt'>): Promise<void> {
    await db.insert(gameSessions).values({
      userId,
      ...sessionData,
    });
    
    // Update player stats
    const currentStats = await this.getPlayerStats(userId);
    if (currentStats) {
      const updatedStats = {
        gamesPlayed: currentStats.gamesPlayed + 1,
        totalScore: currentStats.totalScore + sessionData.score,
        enemiesDestroyed: currentStats.enemiesDestroyed + sessionData.enemiesKilled,
        timePlayedMinutes: currentStats.timePlayedMinutes + Math.round(sessionData.gameTime / 60000),
        lastPlayedAt: new Date(),
      };
      
      if (sessionData.score > currentStats.highScore) {
        (updatedStats as any).highScore = sessionData.score;
      }
      
      await this.updatePlayerStats(userId, updatedStats);
    }
  }

  async getPlayerRankings(userId: number): Promise<PlayerRanking[]> {
    return await db.select().from(playerRankings).where(eq(playerRankings.userId, userId));
  }

  async getTopPlayers(category: string = 'score', timeframe: 'daily' | 'weekly' | 'monthly' | 'all' = 'all', limit: number = 10): Promise<any[]> {
    let dateFilter = undefined;
    const now = new Date();
    
    switch (timeframe) {
      case 'daily':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    if (timeframe === 'all') {
      // Get overall rankings
      return await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
          score: playerStats.highScore,
          totalScore: playerStats.totalScore,
          level: playerStats.gamesPlayed,
          enemiesDestroyed: playerStats.enemiesDestroyed,
          gamesPlayed: playerStats.gamesPlayed,
          timePlayedMinutes: playerStats.timePlayedMinutes,
        })
        .from(playerStats)
        .innerJoin(users, eq(playerStats.userId, users.id))
        .orderBy(desc(playerStats.highScore))
        .limit(limit);
    } else {
      // Get time-based rankings from game sessions
      return await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          profilePicture: users.profilePicture,
          score: gameSessions.score,
          level: gameSessions.level,
          enemiesKilled: gameSessions.enemiesKilled,
          gameTime: gameSessions.gameTime,
          playedAt: gameSessions.playedAt,
        })
        .from(gameSessions)
        .innerJoin(users, eq(gameSessions.userId, users.id))
        .where(dateFilter ? gte(gameSessions.playedAt, dateFilter) : undefined)
        .orderBy(desc(gameSessions.score))
        .limit(limit);
    }
  }

  async getPlayerProfile(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    const stats = await this.getPlayerStats(userId);
    const rankings = await this.getPlayerRankings(userId);
    
    // Get recent game sessions
    const recentSessions = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.userId, userId))
      .orderBy(desc(gameSessions.playedAt))
      .limit(10);
      
    return {
      user,
      stats,
      rankings,
      recentSessions,
    };
  }

  async searchPlayers(query: string, limit: number = 20): Promise<User[]> {
    // Simple text search - in production you'd use full-text search
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.displayName, `%${query}%`)
        )
      )
      .limit(limit);
  }

  async updatePlayerRankings(): Promise<void> {
    // This would typically be run as a scheduled job
    // For now, we'll calculate rankings on-demand
    console.log('Player rankings updated');
  }

  async saveHighScore(userId: number, scoreData: Omit<HighScore, 'id' | 'userId'>): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await db.insert(highScores).values({
      userId,
      ...scoreData,
    });
  }

  async getLeaderboard(limit: number = 10): Promise<HighScore[]> {
    return await db
      .select()
      .from(highScores)
      .orderBy(desc(highScores.score), desc(highScores.level))
      .limit(limit);
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private highScores: HighScore[];
  currentId: number;

  constructor() {
    this.users = new Map();
    this.highScores = [];
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      displayName: null,
      profilePicture: null,
      farcasterFid: null,
      createdAt: now,
      lastActive: now
    };
    this.users.set(id, user);
    return user;
  }

  async getPlayerStats(): Promise<PlayerStats | undefined> {
    // Mock implementation
    return undefined;
  }

  async updatePlayerStats(): Promise<void> {
    // Mock implementation
  }

  async saveGameSession(): Promise<void> {
    // Mock implementation
  }

  async getPlayerRankings(): Promise<PlayerRanking[]> {
    return [];
  }

  async getTopPlayers(): Promise<any[]> {
    return [];
  }

  async getPlayerProfile(): Promise<any> {
    return {};
  }

  async searchPlayers(): Promise<User[]> {
    return [];
  }

  async updatePlayerRankings(): Promise<void> {
    // Mock implementation
  }

  async saveHighScore(userId: number, scoreData: Omit<HighScore, 'id' | 'userId'>): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const highScore: HighScore = {
      id: this.highScores.length + 1,
      userId,
      ...scoreData
    };

    // Remove any existing score from this user for this session
    this.highScores = this.highScores.filter(score => 
      !(score.userId === userId && Math.abs(new Date(score.timestamp).getTime() - Date.now()) < 60000)
    );

    this.highScores.push(highScore);
  }

  async getLeaderboard(limit: number = 10): Promise<HighScore[]> {
    return this.highScores
      .sort((a, b) => {
        // Sort by score descending, then by level descending
        if (a.score !== b.score) return b.score - a.score;
        if (a.level !== b.level) return b.level - a.level;
        return a.gameTime - b.gameTime; // Faster time wins for same score/level
      })
      .slice(0, limit);
  }
}

// Use DatabaseStorage for real database connectivity
export const storage = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
