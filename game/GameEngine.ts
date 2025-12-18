
import * as THREE from 'three';
import { InputManager } from './InputManager';
import { createTextures } from '../utils/assetGenerator';
import { 
  TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, GRAVITY, JUMP_FORCE, 
  MOVE_SPEED, COLORS, CLIMB_SPEED, ENEMY_SPEED 
} from '../constants';
import { EntityType, Rect } from '../types';

interface Entity {
  id: number;
  type: EntityType;
  mesh: THREE.Mesh;
  rect: Rect;
  velocity: { x: number; y: number };
  grounded: boolean;
  onLadder: boolean;
  direction: number; // 1 or -1
  patrolStart?: number;
  state?: 'idle' | 'chase' | 'patrol';
  animFrame: number;
  animTimer: number;
}

export class GameEngine {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private input: InputManager;
  private textures: Record<string, THREE.Texture>;
  
  private entities: Entity[] = [];
  private solids: Rect[] = [];
  private ladders: Rect[] = [];
  
  private player: Entity | null = null;
  private isRunning = false;
  private lastTime = 0;
  private entityIdCounter = 0;

  private onScoreUpdate: (score: number) => void;
  private onLivesUpdate: (lives: number) => void;
  private onGameOver: () => void;

  private score = 0;
  private lives = 3;

  constructor(
    container: HTMLDivElement, 
    callbacks: {
      onScore: (s: number) => void,
      onLives: (l: number) => void,
      onGameOver: () => void
    }
  ) {
    this.container = container;
    this.onScoreUpdate = callbacks.onScore;
    this.onLivesUpdate = callbacks.onLives;
    this.onGameOver = callbacks.onGameOver;

    // Init Three
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.BACKGROUND);
    
    // Grid Helper
    const worldW = WORLD_WIDTH * TILE_SIZE;
    const worldH = WORLD_HEIGHT * TILE_SIZE;
    const gridHelper = new THREE.GridHelper(worldW, WORLD_WIDTH, COLORS.SKY_GRID, COLORS.SKY_GRID);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.set(worldW / 2, worldH / 2, -5);
    this.scene.add(gridHelper);

    // Initial camera setup
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.imageRendering = 'pixelated';
    container.appendChild(this.renderer.domElement);

    this.input = new InputManager();
    this.textures = createTextures();

    this.initLevel();
    this.resize(container.clientWidth, container.clientHeight);
    this.start();
  }

  private initLevel() {
    // Clear all existing objects from scene and state
    this.entities.forEach(e => this.scene.remove(e.mesh));
    this.scene.children = this.scene.children.filter(child => child instanceof THREE.GridHelper);

    this.entities = [];
    this.solids = [];
    this.ladders = [];

    const mapTemplate = [
      "                         ",
      "    R           R    ",
      "#####H#####   #####H#####",
      "     H             H     ",
      "     H      H      H     ",
      "#####H######H######H#####",
      "     H      H      H     ",
      "     H   @  H      H  S  ",
      "#####H######H######H#####",
      "     H      H      H     ",
      "     H      H   S  H     ",
      "#####H######H######H#####",
      "     H             H     ",
      "  R  H             H  R  ",
      "#########################",
    ].reverse();

    // Create Solids and Ladders
    for (let y = 0; y < mapTemplate.length; y++) {
      const row = mapTemplate[y];
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        const pos = { x: x * TILE_SIZE, y: y * TILE_SIZE };

        if (char === '#') {
          this.createTile(pos.x, pos.y, 'floor');
          this.solids.push({ x: pos.x, y: pos.y, w: TILE_SIZE, h: TILE_SIZE });
        } else if (char === 'H') {
          this.createTile(pos.x, pos.y, 'ladder');
          this.ladders.push({ x: pos.x + 4, y: pos.y, w: 8, h: TILE_SIZE });
        }
      }
    }

    // Create Core Gameplay Entities
    for (let y = 0; y < mapTemplate.length; y++) {
      const row = mapTemplate[y];
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        const pos = { x: x * TILE_SIZE, y: y * TILE_SIZE };

        if (char === '@') {
          this.player = this.createEntity(pos.x, pos.y, EntityType.PLAYER, 'santa_idle');
        } else if (char === 'R') {
          this.createEntity(pos.x, pos.y, EntityType.ENEMY_REINDEER, 'reindeer');
        } else if (char === 'S') {
          this.createEntity(pos.x, pos.y, EntityType.ENEMY_SNOWMAN, 'snowman');
        }
      }
    }

    // Procedural Gift Placement
    const giftVariants = ['gift_red', 'gift_green', 'gift_orange', 'gift_blue', 'gift_purple', 'gift_yellow', 'gift_teal'];
    const allFloorLevels: { y: number; spots: number[] }[] = [];
    for (let y = 1; y < mapTemplate.length; y++) {
        const spots: number[] = [];
        for (let x = 0; x < mapTemplate[y].length; x++) {
            if (mapTemplate[y][x] === ' ' && mapTemplate[y-1][x] === '#') {
                spots.push(x);
            }
        }
        if (spots.length > 0) allFloorLevels.push({ y, spots });
    }

    let reachableFloorLevels = [...allFloorLevels];
    if (reachableFloorLevels.length > 1) {
        const maxY = Math.max(...reachableFloorLevels.map(fl => fl.y));
        reachableFloorLevels = reachableFloorLevels.filter(fl => fl.y < maxY);
    }

    const totalGiftsCount = Math.floor(Math.random() * 3) + 4;
    const occupiedPositions = new Set<string>();
    let giftsPlaced = 0;

    const shuffledReachableLevels = [...reachableFloorLevels].sort(() => Math.random() - 0.5);
    for (const level of shuffledReachableLevels) {
        if (giftsPlaced < totalGiftsCount) {
            const randomX = level.spots[Math.floor(Math.random() * level.spots.length)];
            const randomGiftKey = giftVariants[Math.floor(Math.random() * giftVariants.length)];
            this.createEntity(randomX * TILE_SIZE, level.y * TILE_SIZE, EntityType.GIFT, randomGiftKey);
            occupiedPositions.add(`${randomX},${level.y}`);
            giftsPlaced++;
        }
    }

    const remainingGiftsNeeded = totalGiftsCount - giftsPlaced;
    const extraCandidateSpots: { x: number; y: number }[] = [];
    reachableFloorLevels.forEach(level => {
        level.spots.forEach(x => {
            if (!occupiedPositions.has(`${x},${level.y}`)) {
                extraCandidateSpots.push({ x, y: level.y });
            }
        });
    });

    for (let i = 0; i < remainingGiftsNeeded && extraCandidateSpots.length > 0; i++) {
        const index = Math.floor(Math.random() * extraCandidateSpots.length);
        const spot = extraCandidateSpots.splice(index, 1)[0];
        const randomGiftKey = giftVariants[Math.floor(Math.random() * giftVariants.length)];
        this.createEntity(spot.x * TILE_SIZE, spot.y * TILE_SIZE, EntityType.GIFT, randomGiftKey);
        occupiedPositions.add(`${spot.x},${spot.y}`);
        giftsPlaced++;
    }

    // Procedural Trees
    for (let y = 1; y < mapTemplate.length; y++) {
      let treesOnThisFloor = 0;
      const row = mapTemplate[y];
      const availableX: number[] = [];
      for (let x = 0; x < row.length; x++) {
        const charBelow = mapTemplate[y - 1][x];
        const isOccupiedByGift = occupiedPositions.has(`${x},${y}`);
        const isCoreChar = ['@', 'R', 'S'].includes(mapTemplate[y][x]);
        if (row[x] === ' ' && charBelow === '#' && !isOccupiedByGift && !isCoreChar) availableX.push(x);
      }
      for (let i = availableX.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableX[i], availableX[j]] = [availableX[j], availableX[i]];
      }
      for (const x of availableX) {
        if (treesOnThisFloor < 4) {
          if (Math.random() < 0.25) { 
            this.createEntity(x * TILE_SIZE, y * TILE_SIZE, EntityType.DECORATION, 'tree');
            treesOnThisFloor++;
          }
        }
      }
    }
  }

  private createTile(x: number, y: number, textureKey: string) {
    const geo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    const mat = new THREE.MeshBasicMaterial({ 
      map: this.textures[textureKey], 
      transparent: true 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 0);
    this.scene.add(mesh);
  }

  private createEntity(x: number, y: number, type: EntityType, textureKey: string): Entity {
    const geo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    const mat = new THREE.MeshBasicMaterial({ 
      map: this.textures[textureKey], 
      transparent: true 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 1);
    
    if (type === EntityType.DECORATION || type === EntityType.GIFT) {
        mesh.position.z = 0.5;
    }

    this.scene.add(mesh);
    
    const entity: Entity = {
      id: ++this.entityIdCounter,
      type,
      mesh,
      rect: { x, y, w: TILE_SIZE, h: TILE_SIZE },
      velocity: { x: 0, y: 0 },
      grounded: false,
      onLadder: false,
      direction: 1,
      patrolStart: x,
      state: 'patrol',
      animFrame: 0,
      animTimer: 0
    };
    
    if (type === EntityType.PLAYER || type === EntityType.ENEMY_REINDEER || type === EntityType.ENEMY_SNOWMAN) {
        entity.rect.w = 12;
        entity.rect.x += 2;
    }

    this.entities.push(entity);
    return entity;
  }

  private start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (!this.player) return;

    const axis = this.input.getAxis();
    const ladderParams = this.checkOverlap(this.player.rect, this.ladders);
    this.player.onLadder = !!ladderParams;

    if (this.player.onLadder) {
      this.player.velocity.x = axis.x * MOVE_SPEED * 0.8;
      this.player.velocity.y = axis.y * CLIMB_SPEED;
      this.player.grounded = true;
      
      if (axis.y !== 0 && ladderParams) {
          const ladderCenter = ladderParams.x + ladderParams.w / 2;
          const playerCenter = this.player.rect.x + this.player.rect.w / 2;
          if (Math.abs(ladderCenter - playerCenter) < 4) {
             const diff = ladderCenter - playerCenter;
             this.player.rect.x += diff * 10 * dt;
          }
      }
    } else {
      this.player.velocity.x = axis.x * MOVE_SPEED;
      this.player.velocity.y -= GRAVITY * dt;
      if (this.input.isJumpPressed() && this.player.grounded) {
        this.player.velocity.y = JUMP_FORCE;
        this.player.grounded = false;
      }
    }

    if (axis.x !== 0) {
        this.player.direction = Math.sign(axis.x);
    }

    this.moveEntity(this.player, dt);
    this.updatePlayerAnimation(dt);
    this.constrainToWorld(this.player);

    for (const entity of this.entities) {
      if (entity === this.player) continue;

      if (entity.type === EntityType.GIFT) {
          if (this.checkCollision(this.player.rect, entity.rect)) {
              this.score += 100;
              this.onScoreUpdate(this.score);
              this.removeEntity(entity);
          }
      } else if (entity.type === EntityType.ENEMY_REINDEER || entity.type === EntityType.ENEMY_SNOWMAN) {
        const distY = Math.abs(entity.rect.y - this.player.rect.y);
        const distX = this.player.rect.x - entity.rect.x;

        if (distY < TILE_SIZE && Math.abs(distX) < TILE_SIZE * 8) {
            entity.direction = Math.sign(distX);
            entity.velocity.x = entity.direction * ENEMY_SPEED * 1.2;
        } else {
            entity.velocity.x = entity.direction * ENEMY_SPEED;
        }
        
        entity.mesh.scale.x = entity.direction;
        entity.velocity.y -= GRAVITY * dt;

        this.moveEntity(entity, dt);
        this.constrainToWorld(entity);
        
        if (entity.velocity.x === 0) {
            entity.direction *= -1;
        }

        if (this.checkCollision(this.player.rect, entity.rect)) {
            this.handlePlayerHit();
        }
      }
    }
    
    const gifts = this.entities.filter(e => e.type === EntityType.GIFT);
    if (gifts.length === 0 && this.entities.length > 0) {
        this.score += 1000;
        this.onScoreUpdate(this.score);
        this.initLevel();
    }
  }

  private updatePlayerAnimation(dt: number) {
    if (!this.player) return;

    let textureKey = 'santa_idle';
    const isMovingX = Math.abs(this.player.velocity.x) > 10;
    const isMovingY = Math.abs(this.player.velocity.y) > 10;

    if (this.player.onLadder) {
        // Climbing animation
        const animSpeed = 0.1;
        if (isMovingY) {
            this.player.animTimer += dt;
            if (this.player.animTimer > animSpeed) {
                this.player.animTimer = 0;
                this.player.animFrame = (this.player.animFrame + 1) % 2;
            }
        }
        textureKey = `santa_climb_${this.player.animFrame}`;
        this.player.mesh.scale.x = 1; // Always face ladder
    } else if (!this.player.grounded) {
        // Jump pose
        textureKey = 'santa_jump';
        this.player.mesh.scale.x = this.player.direction;
    } else if (isMovingX) {
        // Running animation
        const animSpeed = 0.12;
        this.player.animTimer += dt;
        if (this.player.animTimer > animSpeed) {
            this.player.animTimer = 0;
            this.player.animFrame = (this.player.animFrame + 1) % 2;
        }
        textureKey = `santa_run_${this.player.animFrame}`;
        this.player.mesh.scale.x = this.player.direction;
    } else {
        // Idle
        textureKey = 'santa_idle';
        this.player.animFrame = 0;
        this.player.animTimer = 0;
        this.player.mesh.scale.x = this.player.direction;
    }

    const mat = this.player.mesh.material as THREE.MeshBasicMaterial;
    if (mat.map !== this.textures[textureKey]) {
        mat.map = this.textures[textureKey];
        mat.needsUpdate = true;
    }
  }

  private handlePlayerHit() {
      this.lives--;
      this.onLivesUpdate(this.lives);
      if (this.lives <= 0) {
          this.isRunning = false;
          this.onGameOver();
      } else {
          this.player!.rect.x = TILE_SIZE * 12;
          this.player!.rect.y = TILE_SIZE * 7; 
          this.player!.velocity = { x: 0, y: 0 };
          this.syncMesh(this.player!);
      }
  }

  private moveEntity(entity: Entity, dt: number) {
    entity.rect.x += entity.velocity.x * dt;
    this.handleCollisions(entity, 'x');
    entity.rect.y += entity.velocity.y * dt;
    entity.grounded = false;
    this.handleCollisions(entity, 'y');
    this.syncMesh(entity);
  }

  private handleCollisions(entity: Entity, axis: 'x' | 'y') {
    for (const solid of this.solids) {
      if (this.checkCollision(entity.rect, solid)) {
        if (axis === 'x') {
          if (entity.velocity.x > 0) entity.rect.x = solid.x - entity.rect.w;
          else if (entity.velocity.x < 0) entity.rect.x = solid.x + solid.w;
          entity.velocity.x = 0;
        } else {
          if (entity.velocity.y > 0) {
            entity.rect.y = solid.y - entity.rect.h;
            entity.velocity.y = 0;
          } else if (entity.velocity.y < 0) {
            entity.rect.y = solid.y + solid.h;
            entity.velocity.y = 0;
            entity.grounded = true;
          }
        }
      }
    }
  }

  private checkCollision(r1: Rect, r2: Rect): boolean {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }
  
  private checkOverlap(r1: Rect, targets: Rect[]): Rect | null {
      for (const t of targets) {
          const centerX = r1.x + r1.w/2;
          const centerY = r1.y + r1.h/2;
          if (centerX > t.x && centerX < t.x + t.w &&
              centerY > t.y && centerY < t.y + t.h) {
              return t;
          }
      }
      return null;
  }

  private constrainToWorld(entity: Entity) {
    if (entity.rect.x < 0) {
        entity.rect.x = 0;
        entity.velocity.x = 0;
    }
    if (entity.rect.x + entity.rect.w > WORLD_WIDTH * TILE_SIZE) {
        entity.rect.x = WORLD_WIDTH * TILE_SIZE - entity.rect.w;
        entity.velocity.x = 0;
    }
    if (entity.rect.y < 0) {
        if (entity === this.player) this.handlePlayerHit();
        else if (entity.type !== EntityType.GIFT) {
             entity.rect.y = WORLD_HEIGHT * TILE_SIZE;
        }
    }
  }

  private syncMesh(entity: Entity) {
    entity.mesh.position.x = entity.rect.x + entity.rect.w / 2;
    entity.mesh.position.y = entity.rect.y + TILE_SIZE / 2;
  }

  private removeEntity(entity: Entity) {
      this.scene.remove(entity.mesh);
      this.entities = this.entities.filter(e => e !== entity);
  }
  
  public reset() {
      this.score = 0;
      this.lives = 3;
      this.onScoreUpdate(0);
      this.onLivesUpdate(3);
      this.initLevel();
      this.isRunning = true;
      this.loop();
  }

  public resize(width: number, height: number) {
      if (width === 0 || height === 0) return;
      this.renderer.setSize(width, height);
      
      const worldW = WORLD_WIDTH * TILE_SIZE;
      const worldH = WORLD_HEIGHT * TILE_SIZE;
      const aspect = width / height;
      const worldAspect = worldW / worldH;

      if (aspect > worldAspect) {
        const viewW = worldH * aspect;
        const offset = (viewW - worldW) / 2;
        this.camera.left = -offset;
        this.camera.right = worldW + offset;
        this.camera.top = worldH;
        this.camera.bottom = 0;
      } else {
        const viewH = worldW / aspect;
        const offset = (viewH - worldH) / 2;
        this.camera.left = 0;
        this.camera.right = worldW;
        this.camera.top = worldH + offset;
        this.camera.bottom = -offset;
      }
      this.camera.updateProjectionMatrix();
  }

  public dispose() {
    this.isRunning = false;
    this.input.cleanup();
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
