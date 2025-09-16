export class Bullet {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public width: number;
  public height: number;
  public color: string;
  public type: 'player' | 'enemy';

  private static playerRocketImage: HTMLImageElement | null = null;
  private static enemyRocketImage: HTMLImageElement | null = null;
  private static playerImageLoaded: boolean = false;
  private static enemyImageLoaded: boolean = false;

  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string, type: 'player' | 'enemy') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.width = radius * 2;
    this.height = radius * 2;
    this.color = color;
    this.type = type;
    
    // Load images if not already loaded
    if (!Bullet.playerRocketImage) {
      Bullet.loadPlayerImage();
    }
    if (!Bullet.enemyRocketImage) {
      Bullet.loadEnemyImage();
    }
  }

  private static loadPlayerImage() {
    Bullet.playerRocketImage = new Image();
    Bullet.playerRocketImage.onload = () => {
      Bullet.playerImageLoaded = true;
      console.log('Player rocket image loaded successfully');
    };
    Bullet.playerRocketImage.onerror = () => {
      console.error('Failed to load player rocket image');
    };
    Bullet.playerRocketImage.src = '/rocket.png';
  }

  private static loadEnemyImage() {
    Bullet.enemyRocketImage = new Image();
    Bullet.enemyRocketImage.onload = () => {
      Bullet.enemyImageLoaded = true;
      console.log('Enemy rocket image loaded successfully');
    };
    Bullet.enemyRocketImage.onerror = () => {
      console.error('Failed to load enemy rocket image');
    };
    Bullet.enemyRocketImage.src = '/enemey_rockets.png';
  }

  public update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    if (this.type === 'player') {
      if (Bullet.playerImageLoaded && Bullet.playerRocketImage) {
        // Draw player rocket image
        ctx.drawImage(
          Bullet.playerRocketImage,
          this.x - this.width / 2,
          this.y - this.height / 2,
          this.width,
          this.height
        );
      } else {
        // Fallback to green rectangle
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      }
    } else {
      if (Bullet.enemyImageLoaded && Bullet.enemyRocketImage) {
        // Draw enemy rocket image
        ctx.drawImage(
          Bullet.enemyRocketImage,
          this.x - this.width / 2,
          this.y - this.height / 2,
          this.width,
          this.height
        );
      } else {
        // Fallback to red circle
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}
