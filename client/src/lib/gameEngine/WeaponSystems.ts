import { Bullet } from './Bullet';
import { Particle } from './Particle';

export type WeaponType = 'basic' | 'laser' | 'spread' | 'homing' | 'plasma';

export interface WeaponEffect {
  type: WeaponType;
  duration: number; // in milliseconds
  isActive: boolean;
  startTime: number;
  ammo?: number; // For limited ammo weapons
}

export class WeaponSystem {
  private currentWeapon: WeaponType = 'basic';
  private weaponEffects: Map<WeaponType, WeaponEffect> = new Map();
  private fireTimer: number = 0;
  private homeTargets: Array<{x: number, y: number}> = [];

  public setWeapon(weapon: WeaponType, duration: number = 10000, ammo?: number) {
    const currentTime = Date.now();
    
    this.weaponEffects.set(weapon, {
      type: weapon,
      duration,
      isActive: true,
      startTime: currentTime,
      ammo: ammo
    });
    
    this.currentWeapon = weapon;
  }

  public getCurrentWeapon(): WeaponType {
    this.updateWeaponEffects();
    return this.currentWeapon;
  }

  public updateWeaponEffects() {
    const currentTime = Date.now();
    
    Array.from(this.weaponEffects.entries()).forEach(([weaponType, effect]) => {
      if (effect.isActive) {
        // Check if weapon has expired
        if (currentTime - effect.startTime > effect.duration) {
          effect.isActive = false;
          if (this.currentWeapon === weaponType) {
            this.currentWeapon = 'basic';
          }
        }
        
        // Check if ammo depleted
        if (effect.ammo !== undefined && effect.ammo <= 0) {
          effect.isActive = false;
          if (this.currentWeapon === weaponType) {
            this.currentWeapon = 'basic';
          }
        }
      }
    });
  }

  public updateTargets(enemies: Array<{x: number, y: number}>) {
    this.homeTargets = enemies;
  }

  public updateFireTimer() {
    this.fireTimer++;
  }

  public canFire(fireDelay: number): boolean {
    // Different fire rates for different weapons
    const weaponFireDelay = this.getWeaponFireDelay(fireDelay);
    
    if (this.fireTimer >= weaponFireDelay) {
      this.fireTimer = 0;
      return true;
    }
    return false;
  }

  private getWeaponFireDelay(baseDelay: number): number {
    switch (this.currentWeapon) {
      case 'laser':
        return Math.floor(baseDelay * 0.3); // Very fast
      case 'spread':
        return Math.floor(baseDelay * 1.5); // Slower
      case 'homing':
        return Math.floor(baseDelay * 2); // Much slower
      case 'plasma':
        return Math.floor(baseDelay * 0.8); // Slightly faster
      case 'basic':
      default:
        return baseDelay;
    }
  }

  public fire(playerX: number, playerY: number, bulletScale: number = 1.0): Bullet[] {
    if (!this.canFire(15)) return [];

    const bullets: Bullet[] = [];
    
    // Consume ammo if applicable
    const currentEffect = this.weaponEffects.get(this.currentWeapon);
    if (currentEffect && currentEffect.ammo !== undefined) {
      currentEffect.ammo--;
    }

    switch (this.currentWeapon) {
      case 'basic':
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -8,
          7 * bulletScale,
          '#00ff00',
          'player'
        ));
        break;

      case 'laser':
        // Thin, fast beam
        bullets.push(new Bullet(
          playerX,
          playerY - 20,
          0,
          -12,
          4 * bulletScale,
          '#ff00ff',
          'player'
        ));
        break;

      case 'spread':
        // 5-way spread
        const spreadAngles = [-0.6, -0.3, 0, 0.3, 0.6];
        for (const angle of spreadAngles) {
          bullets.push(new Bullet(
            playerX + Math.sin(angle) * 10,
            playerY - 20,
            Math.sin(angle) * 4,
            -8 * Math.cos(angle),
            6 * bulletScale,
            '#ffaa00',
            'player'
          ));
        }
        break;

      case 'homing':
        // Homing missile
        if (this.homeTargets.length > 0) {
          const target = this.homeTargets[Math.floor(Math.random() * this.homeTargets.length)];
          const dx = target.x - playerX;
          const dy = target.y - playerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            bullets.push(new HomingBullet(
              playerX,
              playerY - 20,
              (dx / distance) * 6,
              (dy / distance) * 6,
              8 * bulletScale,
              '#00ffff',
              'player',
              target
            ));
          }
        } else {
          // No targets, fire straight
          bullets.push(new Bullet(
            playerX,
            playerY - 20,
            0,
            -6,
            8 * bulletScale,
            '#00ffff',
            'player'
          ));
        }
        break;

      case 'plasma':
        // Large, slow-moving plasma bolt
        bullets.push(new PlasmaBullet(
          playerX,
          playerY - 20,
          0,
          -5,
          14 * bulletScale,
          '#00ff88',
          'player'
        ));
        break;
    }

    return bullets;
  }

  public getWeaponDescription(weapon: WeaponType): string {
    switch (weapon) {
      case 'laser':
        return 'High-speed laser beam';
      case 'spread':
        return 'Five-way spread shot';
      case 'homing':
        return 'Auto-targeting missiles';
      case 'plasma':
        return 'Devastating plasma cannon';
      case 'basic':
      default:
        return 'Standard blaster';
    }
  }

  public getRemainingAmmo(weapon: WeaponType): number | undefined {
    const effect = this.weaponEffects.get(weapon);
    return effect?.ammo;
  }

  public getRemainingTime(weapon: WeaponType): number {
    const effect = this.weaponEffects.get(weapon);
    if (!effect || !effect.isActive) return 0;
    
    const elapsed = Date.now() - effect.startTime;
    return Math.max(0, effect.duration - elapsed);
  }
}

// Specialized bullet types
export class HomingBullet extends Bullet {
  private target: {x: number, y: number};
  private turnSpeed: number = 0.1;
  
  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string, type: 'player' | 'enemy', target: {x: number, y: number}) {
    super(x, y, vx, vy, radius, color, type);
    this.target = target;
  }

  public update() {
    // Homing behavior
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const targetVx = (dx / distance) * 6;
      const targetVy = (dy / distance) * 6;
      
      // Gradually turn towards target
      this.vx += (targetVx - this.vx) * this.turnSpeed;
      this.vy += (targetVy - this.vy) * this.turnSpeed;
    }
    
    super.update();
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Trail effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    
    // Missile body
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    
    // Thruster flame
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(this.x - 2, this.y + this.height/2, 4, 6);
    
    ctx.restore();
  }
}

export class PlasmaBullet extends Bullet {
  private pulseTime: number = 0;
  
  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string, type: 'player' | 'enemy') {
    super(x, y, vx, vy, radius, color, type);
  }

  public update() {
    super.update();
    this.pulseTime += 0.2;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Pulsing glow effect
    const glowIntensity = 0.8 + 0.4 * Math.sin(this.pulseTime * 3);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15 * glowIntensity;
    
    // Core
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner glow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width/4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// Weapon pickup
export class WeaponPickup {
  public x: number;
  public y: number;
  public width: number = 25;
  public height: number = 25;
  public weaponType: WeaponType;
  public color: string;
  public speed: number = 1;
  public pulseTime: number = 0;
  public duration?: number;
  public ammo?: number;

  constructor(x: number, y: number, weaponType: WeaponType) {
    this.x = x;
    this.y = y;
    this.weaponType = weaponType;
    
    // Set properties based on weapon type
    switch (weaponType) {
      case 'laser':
        this.color = '#ff00ff';
        this.duration = 8000;
        break;
      case 'spread':
        this.color = '#ffaa00';
        this.duration = 12000;
        break;
      case 'homing':
        this.color = '#00ffff';
        this.ammo = 20;
        break;
      case 'plasma':
        this.color = '#00ff88';
        this.ammo = 15;
        break;
      default:
        this.color = '#ffffff';
    }
  }

  public update() {
    this.y += this.speed;
    this.pulseTime += 0.15;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Pulsing glow effect
    const glowIntensity = 0.7 + 0.3 * Math.sin(this.pulseTime * 4);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12 * glowIntensity;
    
    // Weapon icon based on type
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    const centerX = this.x;
    const centerY = this.y;
    const size = this.width / 2;
    
    switch (this.weaponType) {
      case 'laser':
        // Lightning bolt
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size/2, centerY - size/3);
        ctx.lineTo(centerX - size/3, centerY - size/3);
        ctx.lineTo(centerX + size/3, centerY + size/3);
        ctx.lineTo(centerX - size/2, centerY + size/3);
        ctx.lineTo(centerX, centerY + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
        
      case 'spread':
        // Fan pattern
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.8, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI * 0.75 + (i * Math.PI * 0.5 / 4);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX + Math.cos(angle) * size, centerY + Math.sin(angle) * size);
          ctx.stroke();
        }
        break;
        
      case 'homing':
        // Target/crosshair
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(centerX - size, centerY);
        ctx.lineTo(centerX + size, centerY);
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX, centerY + size);
        ctx.stroke();
        break;
        
      case 'plasma':
        // Energy ball
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Inner energy
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    // Ammo indicator
    if (this.ammo) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.ammo.toString(), centerX, centerY + size + 12);
    }
    
    ctx.restore();
  }

  public static getRandomWeapon(): WeaponType {
    const weapons: WeaponType[] = ['laser', 'spread', 'homing', 'plasma'];
    return weapons[Math.floor(Math.random() * weapons.length)];
  }
}