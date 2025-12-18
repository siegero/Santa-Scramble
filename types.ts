import * as THREE from 'three';

export enum EntityType {
  PLAYER,
  ENEMY_REINDEER,
  ENEMY_SNOWMAN,
  GIFT,
  OBSTACLE,
  LADDER,
  DECORATION // Trees, Snow piles
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameState {
  score: number;
  lives: number;
  highScore: number;
  gameOver: boolean;
  level: number;
}

export type AssetMap = Record<string, THREE.Texture>;