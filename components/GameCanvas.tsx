
import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';

interface GameCanvasProps {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onGameOver: () => void;
  resetTrigger: number; // Increment to reset
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onScore, onLives, onGameOver, resetTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    engineRef.current = new GameEngine(containerRef.current, {
      onScore,
      onLives,
      onGameOver
    });

    const handleResize = () => {
      if (containerRef.current && engineRef.current) {
        engineRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    
    handleResize();

    return () => {
      resizeObserver.disconnect();
      engineRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      if (resetTrigger > 0 && engineRef.current) {
          engineRef.current.reset();
      }
  }, [resetTrigger]);

  return <div ref={containerRef} className="absolute inset-0 block bg-black overflow-hidden" />;
};
