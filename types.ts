export type Vector2 = {
  x: number;
  y: number;
};

export type EntityType = 
  | 'MARIO' 
  | 'GOOMBA' 
  | 'SPINY'
  | 'LAKITU'
  | 'SPINY_EGG'
  | 'BLOOPER'
  | 'CHEEP_CHEEP'
  | 'BOO'
  | 'COIN' 
  | 'MUSHROOM' 
  | 'FIRE_FLOWER'
  | 'STAR'
  | 'FIREBALL'
  | 'PARTICLE'
  | 'BOSS_GOOMBA'
  | 'BOSS_MECHA'
  | 'BOSS_DEMON'
  | 'PROJECTILE'
  | 'CHECKPOINT';

export type TileType = 
  | 'EMPTY' 
  | 'GROUND' 
  | 'BRICK' 
  | 'QUESTION' 
  | 'QUESTION_MUSHROOM'
  | 'QUESTION_FLOWER'
  | 'QUESTION_STAR'
  | 'QUESTION_HIT' 
  | 'HARD_BLOCK' 
  | 'PIPE_L' 
  | 'PIPE_R' 
  | 'PIPE_TOP_L' 
  | 'PIPE_TOP_R'
  | 'FLAG_POLE'
  | 'FLAG_TOP'
  | 'CORAL';

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  vel: Vector2;
  size: Vector2;
  dead?: boolean;
  grounded?: boolean;
  wasGrounded?: boolean; // Track previous frame grounded state for landing effects
  facing: number; // 1 for right, -1 for left
  dying?: boolean;
  dyingTimer?: number;
  // AI State
  timer?: number; // For Lakitu throw cooldown, Star timer, Fireball life, Boss patterns
  actionState?: number; // Boss generic state, Boo state (0: chase, 1: shy)
  originalY?: number; // For wave motion (Cheep Cheep)
  // Health System
  health?: number; // 1: Small, 2: Big, 3: Fire
  maxHealth?: number;
  invulnerableTimer?: number; // Post-damage invincibility
  starTimer?: number; // Starman invincibility
  activated?: boolean; // For checkpoints
  fireballAmmo?: number; // Ammo for Fire Mario
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  color: string;
  rotation?: number;
  rotVel?: number;
}

export interface GameState {
  status: 'START' | 'PLAYING' | 'GAME_OVER' | 'WIN' | 'LEVEL_COMPLETE' | 'PAUSED';
  level: number;
  score: number;
  coins: number;
  lives: number;
  time: number;
  cameraX: number;
}

export interface LevelData {
  map: string[];
  background: string;
  isUnderwater?: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean; // Jump
  down: boolean;
  run: boolean; // Also shoots
  fire: boolean; // Explicit fire button
}