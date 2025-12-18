export class InputManager {
  keys: Record<string, boolean> = {};

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  isDown(code: string): boolean {
    return !!this.keys[code];
  }

  getAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('ArrowLeft') || this.isDown('KeyA')) x -= 1;
    if (this.isDown('ArrowRight') || this.isDown('KeyD')) x += 1;
    if (this.isDown('ArrowUp') || this.isDown('KeyW')) y += 1;
    if (this.isDown('ArrowDown') || this.isDown('KeyS')) y -= 1;
    return { x, y };
  }

  isJumpPressed(): boolean {
    return this.isDown('Space') || this.isDown('ArrowUp') || this.isDown('KeyW');
  }

  cleanup() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
