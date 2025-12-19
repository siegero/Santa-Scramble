
import * as THREE from 'three';
import { SPRITES, COLORS, GLOBAL_PALETTE } from '../constants';

export const createTextures = (): Record<string, THREE.Texture> => {
  const textures: Record<string, THREE.Texture> = {};

  const drawSprite = (matrix: number[][]) => {
    const size = 16;
    const scale = 4; // Upscale for crispness
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d')!;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const colorIndex = matrix[y]?.[x] || 0;
        if (colorIndex !== 0 && GLOBAL_PALETTE[colorIndex]) {
          ctx.fillStyle = GLOBAL_PALETTE[colorIndex];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  // Generate standard textures
  textures['santa_idle'] = drawSprite(SPRITES.SANTA_IDLE);
  textures['santa_run_0'] = drawSprite(SPRITES.SANTA_RUN_0);
  textures['santa_run_1'] = drawSprite(SPRITES.SANTA_RUN_1);
  textures['santa_jump'] = drawSprite(SPRITES.SANTA_JUMP);
  textures['santa_climb_0'] = drawSprite(SPRITES.SANTA_CLIMB_0);
  textures['santa_climb_1'] = drawSprite(SPRITES.SANTA_CLIMB_1);
  
  textures['reindeer_0'] = drawSprite(SPRITES.REINDEER_0);
  textures['reindeer_1'] = drawSprite(SPRITES.REINDEER_1);
  textures['snowman'] = drawSprite(SPRITES.SNOWMAN);
  
  // Register the 2 tree variants
  textures['tree_0'] = drawSprite(SPRITES.TREE_0);
  textures['tree_1'] = drawSprite(SPRITES.TREE_1);
  
  textures['floor'] = drawSprite(SPRITES.FLOOR);
  textures['ladder'] = drawSprite(SPRITES.LADDER);

  // Generate Gift Variations
  const giftVariants = [
    { name: 'gift_red', colorIdx: 1 },
    { name: 'gift_green', colorIdx: 7 },
    { name: 'gift_orange', colorIdx: 6 },
    { name: 'gift_blue', colorIdx: 9 },
    { name: 'gift_purple', colorIdx: 10 },
    { name: 'gift_yellow', colorIdx: 11 },
    { name: 'gift_teal', colorIdx: 12 },
  ];

  giftVariants.forEach(variant => {
    const matrix = SPRITES.GIFT.map(row => row.map(pixel => pixel === 1 ? variant.colorIdx : pixel));
    textures[variant.name] = drawSprite(matrix);
  });

  // Alias for backward compatibility
  textures['santa'] = textures['santa_idle'];
  textures['reindeer'] = textures['reindeer_0'];
  textures['gift'] = textures['gift_red'];
  textures['tree'] = textures['tree_0']; // Default fallback

  return textures;
};
