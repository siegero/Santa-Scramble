
import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';

const App: React.FC = () => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(1440);
  const [gameOver, setGameOver] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleScore = (s: number) => {
    setScore(s);
    if (s > highScore) setHighScore(s);
  };

  const handleGameOver = () => {
    setGameOver(true);
  };

  const handleRestart = () => {
    setGameOver(false);
    setScore(0);
    setLives(3);
    setResetTrigger(prev => prev + 1);
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex items-center justify-center overflow-hidden font-mono select-none p-4">
      <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col items-center justify-center">
        
        {/* Aspect Ratio Container */}
        <div className="relative w-full aspect-[25/15] bg-[#001133] shadow-2xl border-4 border-slate-700 rounded-lg overflow-hidden">
          
          {/* Game Layer */}
          <GameCanvas 
            onScore={handleScore} 
            onLives={setLives}
            onGameOver={handleGameOver}
            resetTrigger={resetTrigger}
          />

          {/* HUD Layer */}
          <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start text-white pointer-events-none z-10">
             <div>
               <h1 className="text-xl font-bold tracking-widest text-red-500 drop-shadow-md">SANTA SCRAMBLE</h1>
               <p className="text-sm text-gray-300">SCORE: {score.toString().padStart(6, '0')}</p>
             </div>
             
             <div className="flex flex-col items-end">
               <p className="text-sm text-yellow-400">HIGH SCORE: {highScore.toString().padStart(6, '0')}</p>
               <div className="flex gap-1 mt-1">
                 <span className="text-sm mr-2">LIVES:</span>
                 {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                   <span key={i} className="text-red-500 text-lg">♥</span>
                 ))}
               </div>
             </div>
          </div>

          {/* Game Over Layer */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white">
              <h2 className="text-5xl font-bold text-red-500 mb-4 pixel-font">GAME OVER</h2>
              <p className="text-xl mb-8">FINAL SCORE: {score}</p>
              <button 
                onClick={handleRestart}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-[0_4px_0_rgb(20,80,20)] active:shadow-none active:translate-y-1 transition-all pointer-events-auto"
              >
                TRY AGAIN
              </button>
            </div>
          )}
          
          {!gameOver && (
               <div className="absolute bottom-2 left-0 w-full text-center opacity-50 text-xs text-white pointer-events-none z-10">
                  CONTROLS: ARROWS / WASD to Move • SPACE / UP to Jump
               </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
