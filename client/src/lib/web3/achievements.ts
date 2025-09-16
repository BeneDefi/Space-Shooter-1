// Achievement system for Galaxiga Mini App

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: (stats: GameStats) => boolean;
    reward: number; // GALAXIGA tokens
    nftMetadata?: {
      name: string;
      description: string;
      image: string;
    };
  }
  
  export interface GameStats {
    totalScore: number;
    highScore: number;
    enemiesDestroyed: number;
    gamesPlayed: number;
    timePlayedMinutes: number;
    streakDays: number;
    socialShares: number;
    friendsInvited: number;
  }
  
  export const ACHIEVEMENTS: Achievement[] = [
    {
      id: 'first_blood',
      name: 'First Blood',
      description: 'Destroy your first enemy',
      icon: '🎯',
      condition: (stats) => stats.enemiesDestroyed >= 1,
      reward: 10,
      nftMetadata: {
        name: 'Galaxiga First Blood',
        description: 'Commemorating your first enemy destroyed in Galaxiga',
        image: '/achievements/first-blood.png'
      }
    },
    {
      id: 'centurion',
      name: 'Centurion',
      description: 'Destroy 100 enemies',
      icon: '💯',
      condition: (stats) => stats.enemiesDestroyed >= 100,
      reward: 100,
      nftMetadata: {
        name: 'Galaxiga Centurion',
        description: 'Elite warrior who has destroyed 100 enemies',
        image: '/achievements/centurion.png'
      }
    },
    {
      id: 'high_scorer',
      name: 'High Scorer',
      description: 'Reach 10,000 points in a single game',
      icon: '🏆',
      condition: (stats) => stats.highScore >= 10000,
      reward: 50,
    },
    {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Share your score 5 times',
      icon: '🦋',
      condition: (stats) => stats.socialShares >= 5,
      reward: 25,
    },
    {
      id: 'friend_magnet',
      name: 'Friend Magnet',
      description: 'Invite 3 friends to play',
      icon: '🧲',
      condition: (stats) => stats.friendsInvited >= 3,
      reward: 75,
    },
    {
      id: 'dedicated_player',
      name: 'Dedicated Player',
      description: 'Play for 7 consecutive days',
      icon: '📅',
      condition: (stats) => stats.streakDays >= 7,
      reward: 200,
      nftMetadata: {
        name: 'Galaxiga Dedication Badge',
        description: 'Awarded for playing 7 consecutive days',
        image: '/achievements/dedicated.png'
      }
    },
    {
      id: 'marathon_gamer',
      name: 'Marathon Gamer',
      description: 'Play for 60 minutes total',
      icon: '🏃',
      condition: (stats) => stats.timePlayedMinutes >= 60,
      reward: 30,
    }
  ];
  
  export class AchievementSystem {
    private static instance: AchievementSystem;
    private unlockedAchievements: Set<string> = new Set();
  
    static getInstance(): AchievementSystem {
      if (!AchievementSystem.instance) {
        AchievementSystem.instance = new AchievementSystem();
      }
      return AchievementSystem.instance;
    }
  
    checkAchievements(stats: GameStats): Achievement[] {
      const newlyUnlocked: Achievement[] = [];
  
      ACHIEVEMENTS.forEach(achievement => {
        if (!this.unlockedAchievements.has(achievement.id) && achievement.condition(stats)) {
          this.unlockedAchievements.add(achievement.id);
          newlyUnlocked.push(achievement);
          this.showAchievementNotification(achievement);
        }
      });
  
      return newlyUnlocked;
    }
  
    private showAchievementNotification(achievement: Achievement) {
      // Create achievement popup notification
      const notification = document.createElement('div');
      notification.className = 'achievement-notification';
      notification.innerHTML = `
        <div class="achievement-popup">
          <div class="achievement-icon">${achievement.icon}</div>
          <div class="achievement-text">
            <h3>Achievement Unlocked!</h3>
            <p>${achievement.name}</p>
            <span>+${achievement.reward} GALAXIGA</span>
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  
    getUnlockedAchievements(): string[] {
      return Array.from(this.unlockedAchievements);
    }
  
    getTotalRewards(): number {
      return ACHIEVEMENTS
        .filter(achievement => this.unlockedAchievements.has(achievement.id))
        .reduce((total, achievement) => total + achievement.reward, 0);
    }
  }