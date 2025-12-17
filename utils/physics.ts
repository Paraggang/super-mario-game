import { Entity, Vector2, TileType, EntityType, Particle } from '../types';
import { TILE_SIZE, GRAVITY, TERMINAL_VELOCITY, FRICTION, ACCELERATION, MOVE_SPEED, GOOMBA_SPEED, SPINY_SPEED, MUSHROOM_SPEED, STAR_SPEED } from '../constants';

// --- Types Helper ---
export const parseMap = (asciiMap: string[]): { tiles: TileType[][], entities: Entity[], spawn: Vector2, width: number, height: number } => {
  const height = asciiMap.length;
  const width = asciiMap[0].length;
  const tiles: TileType[][] = Array(height).fill(null).map(() => Array(width).fill('EMPTY'));
  const entities: Entity[] = [];
  let spawn: Vector2 = { x: 100, y: 100 };

  for (let y = 0; y < height; y++) {
    const row = asciiMap[y];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      const pos = { x: x * TILE_SIZE, y: y * TILE_SIZE };
      
      // Skip if tile is already filled (handled by multi-tile structures like pipes)
      if (tiles[y][x] !== 'EMPTY') continue;

      switch (char) {
        case '#': tiles[y][x] = 'GROUND'; break;
        case '=': tiles[y][x] = 'HARD_BLOCK'; break;
        case 'B': tiles[y][x] = 'BRICK'; break;
        case '?': tiles[y][x] = 'QUESTION'; break;
        case 'Q': tiles[y][x] = 'QUESTION_MUSHROOM'; break;
        case 'W': tiles[y][x] = 'QUESTION_FLOWER'; break;
        case '*': tiles[y][x] = 'QUESTION_STAR'; break;
        case 'V': tiles[y][x] = 'CORAL'; break;
        case 'T': 
          // Pipe Body (2-wide)
          tiles[y][x] = 'PIPE_L'; 
          if (x + 1 < width) tiles[y][x+1] = 'PIPE_R';
          break;
        case 'P':
          // Pipe Top (2-wide)
           tiles[y][x] = 'PIPE_TOP_L'; 
           if (x + 1 < width) tiles[y][x+1] = 'PIPE_TOP_R';
           break;
        case 'F': 
            tiles[y][x] = 'FLAG_TOP';
            for(let fy = y + 1; fy < height; fy++) {
                if (asciiMap[fy] && asciiMap[fy][x] === '#') break;
                if (tiles[fy]) tiles[fy][x] = 'FLAG_POLE';
            }
            break;
        case 'G':
          entities.push({
            id: `goomba-${x}-${y}`,
            type: 'GOOMBA',
            pos,
            vel: { x: -GOOMBA_SPEED, y: 0 },
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: false,
            facing: -1
          });
          break;
        case 'Y':
          entities.push({
            id: `spiny-${x}-${y}`,
            type: 'SPINY',
            pos,
            vel: { x: -SPINY_SPEED, y: 0 },
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: false,
            facing: -1
          });
          break;
        case 'L':
          entities.push({
            id: `lakitu-${x}-${y}`,
            type: 'LAKITU',
            pos,
            vel: { x: 0, y: 0 },
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: false,
            facing: -1,
            timer: 0 // Cooldown for throwing
          });
          break;
        case 'Z': // Blooper
          entities.push({
            id: `blooper-${x}-${y}`,
            type: 'BLOOPER',
            pos,
            vel: { x: 0, y: 0 },
            size: { x: TILE_SIZE, y: TILE_SIZE * 1.5 },
            grounded: false,
            facing: -1,
            timer: 0
          });
          break;
        case 'E': // Cheep Cheep
          entities.push({
            id: `cheep-${x}-${y}`,
            type: 'CHEEP_CHEEP',
            pos,
            vel: { x: -2, y: 0 },
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: false,
            facing: -1,
            originalY: pos.y
          });
          break;
        case 'O': // Boo
          entities.push({
            id: `boo-${x}-${y}`,
            type: 'BOO',
            pos,
            vel: { x: 0, y: 0 },
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: false,
            facing: -1,
            actionState: 0 // 0: Chase, 1: Shy
          });
          break;
        case 'K':
          entities.push({
            id: `boss1-${x}-${y}`,
            type: 'BOSS_GOOMBA',
            pos: { x: pos.x, y: pos.y - TILE_SIZE }, // Larger
            vel: { x: 0, y: 0 },
            size: { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
            grounded: false,
            facing: -1,
            health: 3,
            maxHealth: 3,
            timer: 0,
            invulnerableTimer: 0
          });
          break;
        case 'M':
          entities.push({
            id: `boss2-${x}-${y}`,
            type: 'BOSS_MECHA',
            pos: { x: pos.x, y: pos.y - TILE_SIZE },
            vel: { x: 0, y: 0 },
            size: { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
            grounded: false,
            facing: -1,
            health: 4,
            maxHealth: 4,
            timer: 0,
            invulnerableTimer: 0
          });
          break;
        case 'X':
          entities.push({
            id: `boss3-${x}-${y}`,
            type: 'BOSS_DEMON',
            pos: { x: pos.x, y: pos.y - TILE_SIZE },
            vel: { x: 0, y: 0 },
            size: { x: TILE_SIZE * 2.5, y: TILE_SIZE * 2.5 },
            grounded: false,
            facing: -1,
            health: 5,
            maxHealth: 5,
            timer: 0,
            invulnerableTimer: 0
          });
          break;
        case 'C':
          entities.push({
            id: `checkpoint-${x}-${y}`,
            type: 'CHECKPOINT',
            pos: { x: pos.x, y: pos.y },
            vel: { x: 0, y: 0 },
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: true,
            facing: 1,
            activated: false
          });
          break;
        case 'S':
          spawn = pos;
          break;
      }
    }
  }

  return { tiles, entities, spawn, width: width * TILE_SIZE, height: height * TILE_SIZE };
};

// --- Collision ---

export const checkRectCollision = (r1: {pos: Vector2, size: Vector2}, r2: {pos: Vector2, size: Vector2}) => {
  return (
    r1.pos.x < r2.pos.x + r2.size.x &&
    r1.pos.x + r1.size.x > r2.pos.x &&
    r1.pos.y < r2.pos.y + r2.size.y &&
    r1.pos.y + r1.size.y > r2.pos.y
  );
};

export const resolveMapCollision = (entity: Entity, tiles: TileType[][], onHitBlock?: (x: number, y: number) => void) => {
    // Horizontal
    entity.pos.x += entity.vel.x;
    
    let startX = Math.floor(entity.pos.x / TILE_SIZE);
    let endX = Math.floor((entity.pos.x + entity.size.x - 0.1) / TILE_SIZE);
    let startY = Math.floor(entity.pos.y / TILE_SIZE);
    let endY = Math.floor((entity.pos.y + entity.size.y - 0.1) / TILE_SIZE);

    if (startY < 0) startY = 0;
    if (endY >= tiles.length) endY = tiles.length - 1;
    if (startX < 0) startX = 0;
    
    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (!tiles[y] || !tiles[y][x]) continue;
            const tile = tiles[y][x];
            if (isSolid(tile)) {
                if (entity.vel.x > 0) { 
                    entity.pos.x = x * TILE_SIZE - entity.size.x;
                    // Bounce specific entities
                    if (entity.type === 'FIREBALL' || entity.type === 'PROJECTILE') {
                         entity.vel.x = 0;
                         entity.dead = true;
                    } else if (entity.type === 'STAR') {
                        entity.vel.x = -entity.vel.x;
                    } else if (['GOOMBA', 'SPINY', 'MUSHROOM', 'BOSS_GOOMBA', 'BOSS_MECHA', 'BOSS_DEMON', 'BLOOPER', 'CHEEP_CHEEP'].includes(entity.type)) {
                         entity.vel.x = -entity.vel.x;
                         entity.facing = entity.vel.x > 0 ? 1 : -1;
                    } else {
                        entity.vel.x = tile === 'FLAG_POLE' ? 0 : 0;
                    }
                } else if (entity.vel.x < 0) { 
                    entity.pos.x = (x + 1) * TILE_SIZE;
                    if (entity.type === 'FIREBALL' || entity.type === 'PROJECTILE') {
                         entity.vel.x = 0;
                         entity.dead = true;
                    } else if (entity.type === 'STAR') {
                        entity.vel.x = -entity.vel.x;
                    } else if (['GOOMBA', 'SPINY', 'MUSHROOM', 'BOSS_GOOMBA', 'BOSS_MECHA', 'BOSS_DEMON', 'BLOOPER', 'CHEEP_CHEEP'].includes(entity.type)) {
                        entity.vel.x = -entity.vel.x;
                        entity.facing = entity.vel.x > 0 ? 1 : -1;
                    } else {
                        entity.vel.x = tile === 'FLAG_POLE' ? 0 : 0;
                    }
                }
            }
        }
    }

    // Vertical
    entity.pos.y += entity.vel.y;
    entity.grounded = false;

    startX = Math.floor(entity.pos.x / TILE_SIZE);
    endX = Math.floor((entity.pos.x + entity.size.x - 0.1) / TILE_SIZE);
    startY = Math.floor(entity.pos.y / TILE_SIZE);
    endY = Math.floor((entity.pos.y + entity.size.y - 0.1) / TILE_SIZE);

    if (startY < 0) startY = 0;
    if (endY >= tiles.length) endY = tiles.length - 1;

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (!tiles[y] || !tiles[y][x]) continue;
            const tile = tiles[y][x];
            if (isSolid(tile)) {
                if (entity.vel.y > 0) { 
                    entity.pos.y = y * TILE_SIZE - entity.size.y;
                    entity.vel.y = 0;
                    entity.grounded = true;
                    if (entity.type === 'FIREBALL') {
                        entity.vel.y = -6; // Bounce high
                    }
                    if (entity.type === 'STAR') {
                        entity.vel.y = -8; // Bounce
                    }
                } else if (entity.vel.y < 0) { 
                    entity.pos.y = (y + 1) * TILE_SIZE;
                    entity.vel.y = 0;
                    if (onHitBlock) onHitBlock(x, y);
                }
            }
        }
    }
};

export const isSolid = (t: TileType) => {
    return t !== 'EMPTY' && t !== 'FLAG_TOP' && t !== 'FLAG_POLE' && t !== 'CORAL';
};

export const handleBlockInteraction = (x: number, y: number, tiles: TileType[][], canBreakBricks: boolean = false): { particles: Particle[], spawn?: Entity, broke: boolean } | null => {
    const tile = tiles[y][x];
    const particles: Particle[] = [];
    const center = { x: x * TILE_SIZE + TILE_SIZE/2, y: y * TILE_SIZE + TILE_SIZE/2 };

    if (tile === 'QUESTION') {
        tiles[y][x] = 'QUESTION_HIT';
        particles.push({
            id: `coin-${Math.random()}`,
            type: 'PARTICLE',
            pos: { x: center.x - 10, y: center.y - 20 },
            vel: { x: 0, y: -8 },
            size: { x: 20, y: 20 },
            life: 30,
            maxLife: 30,
            color: 'coin',
            facing: 1
        });
        return { particles, broke: false };
    } 

    if (tile === 'QUESTION_MUSHROOM') {
        tiles[y][x] = 'QUESTION_HIT';
        const mushroom: Entity = {
            id: `mushroom-${x}-${y}`,
            type: 'MUSHROOM',
            pos: { x: x * TILE_SIZE, y: y * TILE_SIZE - TILE_SIZE }, // Spawn above
            vel: { x: MUSHROOM_SPEED, y: 0 },
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: false,
            facing: 1
        };
        return { particles: [], spawn: mushroom, broke: false };
    }

    if (tile === 'QUESTION_FLOWER') {
        tiles[y][x] = 'QUESTION_HIT';
        const flower: Entity = {
            id: `flower-${x}-${y}`,
            type: 'FIRE_FLOWER',
            pos: { x: x * TILE_SIZE, y: y * TILE_SIZE - TILE_SIZE }, // Spawn above
            vel: { x: 0, y: 0 }, // Stationary
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: true,
            facing: 1
        };
        return { particles: [], spawn: flower, broke: false };
    }

    if (tile === 'QUESTION_STAR') {
        tiles[y][x] = 'QUESTION_HIT';
        const star: Entity = {
            id: `star-${x}-${y}`,
            type: 'STAR',
            pos: { x: x * TILE_SIZE, y: y * TILE_SIZE - TILE_SIZE }, 
            vel: { x: STAR_SPEED, y: -5 }, // Pops out moving
            size: { x: TILE_SIZE, y: TILE_SIZE },
            grounded: false,
            facing: 1
        };
        return { particles: [], spawn: star, broke: false };
    }
    
    if (tile === 'BRICK') {
        if (canBreakBricks) {
            tiles[y][x] = 'EMPTY';
            for(let i=0; i<4; i++) {
                 particles.push({
                    id: `debris-${Math.random()}`,
                    type: 'PARTICLE',
                    pos: { x: center.x, y: center.y },
                    vel: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 1) * 12 },
                    size: { x: 10, y: 10 },
                    life: 60,
                    maxLife: 60,
                    color: 'bg-orange-700',
                    facing: 1,
                    rotation: Math.random() * 360,
                    rotVel: (Math.random() - 0.5) * 20
                });
            }
            return { particles, broke: true };
        } else {
            return { particles: [], broke: false };
        }
    }

    return null;
};