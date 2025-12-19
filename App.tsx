
import React, { useState, useEffect, useMemo } from 'react';
import { GameCanvas } from './components/GameCanvas';

const PixelHeart: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 7 7" 
    className={`w-3 h-3 md:w-4 md:h-4 text-red-500 ${className}`}
    style={{ imageRendering: 'pixelated' }}
  >
    <path 
      d="M1 0h2v1H1V0zm3 0h2v1H4V0zM0 1h7v3H0V1zm1 3h5v1H1V4zm1 1h3v1H2V5zm1 1h1v1H3V6z" 
      fill="currentColor" 
    />
  </svg>
);

const LOADING_MESSAGES = [
  "POLISHING RUDOLPH'S NOSE...",
  "CALCULATING CHIMNEY CIRCUMFERENCE...",
  "DE-ICING THE SLEIGH RUNNERS...",
  "CHECKING THE LIST TWICE...",
  "UNTANGLING 500 MILES OF LIGHTS...",
  "OPTIMIZING COOKIE CONSUMPTION...",
  "RE-STUFFING THE COAL SACKS...",
  "UPDATING ELF PRODUCTIVITY QUOTAS...",
  "WARMING THE EMERGENCY COCOA...",
  "CALIBRATING NORTH POLE COMPASS...",
  "FEEDING THE HUNGRY YETI...",
  "TEACHING REINDEER TO FLY (AGAIN)..."
];

const LoadingScreen: React.FC<{ progress: number }> = ({ progress }) => {
  const totalBlocks = 12;
  const activeBlocks = Math.floor((progress / 100) * totalBlocks);

  // Memoize the message so it doesn't change during the progress fill
  const loadingMessage = useMemo(() => {
    return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
  }, []);

  return (
    <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-[100] text-white select-none">
      <div className="border-4 border-white p-8 md:p-12 flex flex-col items-center max-w-[90%] md:max-w-xl">
        {/* Style matching GAME OVER typography but in white */}
        <h2 className="text-2xl md:text-5xl font-bold tracking-tighter text-center leading-tight text-white mb-2">
          CHRISTMAS
        </h2>
        <h2 className="text-2xl md:text-5xl font-bold tracking-tighter text-center leading-tight text-white mb-10">
          LOADING
        </h2>
        
        {/* Retro Blocky Progress Bar */}
        <div className="flex gap-2 w-full justify-center">
          {Array.from({ length: totalBlocks }).map((_, i) => (
            <div 
              key={i}
              className={`w-4 h-6 md:w-6 md:h-8 border-2 border-white transition-colors duration-75 ${
                i < activeBlocks ? 'bg-white' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
        
        <p className="mt-8 text-[8px] md:text-[10px] text-gray-500 tracking-[0.2em] animate-pulse text-center">
          {loadingMessage}
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(1440);
  const [gameOver, setGameOver] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const duration = 2500; // Shortened to 2.5 seconds
    const intervalTime = 50;
    const increment = 100 / (duration / intervalTime);
    
    const timer = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsLoading(false), 300); // Small buffer for effect
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

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
    <div className="w-full h-screen bg-slate-900 flex items-center justify-center overflow-hidden select-none p-4 pixel-font">
      <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col items-center justify-center">
        
        {/* Aspect Ratio Container */}
        <div className="relative w-full aspect-[25/15] bg-[#001133] shadow-2xl border-4 border-slate-700 rounded-lg overflow-hidden">
          
          {isLoading && <LoadingScreen progress={loadingProgress} />}

          {/* Game Layer */}
          <GameCanvas 
            onScore={handleScore} 
            onLives={setLives}
            onGameOver={handleGameOver}
            resetTrigger={resetTrigger}
          />

          {/* HUD Layer */}
          <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start text-white pointer-events-none z-10 retro-shadow">
             {/* Left side: Lives Only */}
             <div className="flex flex-col gap-2">
               <div className="flex items-center">
                 <span className="text-[8px] md:text-[10px] mr-2 text-gray-300">LIVES:</span>
                 <div className="flex gap-1 w-[48px] md:w-[64px] justify-start">
                   {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                     <PixelHeart key={i} className="animate-pulse" />
                   ))}
                 </div>
               </div>
             </div>
             
             {/* Centered Logo */}
             <div className="absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center">
               <h1 className="text-sm md:text-xl font-bold tracking-tighter text-red-500 text-center whitespace-nowrap">
                 SANTA SCRAMBLE
               </h1>
               <div className="w-full h-1 bg-red-600/30 mt-1 rounded-full"></div>
             </div>
             
             {/* Right side: High Score and Current Score */}
             <div className="flex flex-col items-end gap-2">
               <div className="flex items-baseline gap-2">
                 <span className="text-[8px] md:text-[10px] text-yellow-500">HI-SCORE:</span>
                 <span className="text-[10px] md:text-xs text-yellow-400">{highScore.toString().padStart(6, '0')}</span>
               </div>
               <div className="flex items-baseline gap-2">
                 <span className="text-[8px] md:text-[10px] text-gray-300">SCORE:</span>
                 <span className="text-[10px] md:text-xs text-white">{score.toString().padStart(6, '0')}</span>
               </div>
             </div>
          </div>

          {/* Game Over Layer */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-50 text-white">
              <h2 className="text-3xl md:text-5xl font-bold text-red-600 mb-6 tracking-tighter animate-pulse text-center px-4 uppercase">GAME OVER</h2>
              <p className="text-sm md:text-lg mb-10 text-yellow-400">FINAL SCORE: {score}</p>
              <button 
                onClick={handleRestart}
                className="px-8 py-4 bg-green-700 hover:bg-green-600 text-white text-xs md:text-sm font-bold rounded-none shadow-[4px_4px_0_rgb(20,60,20)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all pointer-events-auto border-2 border-white"
              >
                TRY AGAIN
              </button>
            </div>
          )}
          
          {!gameOver && !isLoading && (
               <div className="absolute bottom-4 left-0 w-full text-center opacity-40 text-[8px] md:text-[10px] text-white pointer-events-none z-10 retro-shadow">
                  ARROWS TO MOVE • SPACE TO JUMP
               </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
