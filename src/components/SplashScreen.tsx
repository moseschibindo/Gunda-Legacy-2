import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { profile } = useAuth();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 3500), // Show welcome message
      setTimeout(() => onComplete(), 5500), // Finish
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const userName = profile?.name?.split(' ')[0] || 'User';

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050505] overflow-hidden"
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, 180, 0],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-600/30 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -120, 0],
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-blue-600/20 blur-[150px] rounded-full"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_70%)]" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-lg">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <div className="flex flex-col items-center">
              <motion.div
                key="hello-wrap"
                initial="initial"
                animate="animate"
                className="overflow-hidden mb-2"
              >
                <motion.h1 
                  variants={{
                    initial: { y: "100%" },
                    animate: { y: 0 }
                  }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="text-6xl md:text-8xl font-black text-white tracking-tight italic"
                >
                  Hello
                </motion.h1>
              </motion.div>

              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "40px", opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="h-1.5 bg-emerald-500 rounded-full mb-6"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                className="relative"
              >
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">
                  <span className="bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-slow drop-shadow-2xl">
                    {userName}
                  </span>
                </h2>
                
                {/* Accent glow behind name */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-emerald-500/20 blur-2xl -z-10"
                />
              </motion.div>
            </div>
          )}

          {stage === 1 && (
            <motion.div
              key="welcome-wrap"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center">
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs font-black uppercase tracking-[0.5em] text-emerald-400 mb-4"
                >
                  Welcome to
                </motion.p>
                <h3 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter leading-tight">
                  GUNDA <span className="text-emerald-500">LEGACY</span> APP
                </h3>
              </div>
              
              <div className="flex justify-center gap-1 mt-8">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                      duration: 1, 
                      repeat: Infinity, 
                      delay: i * 0.2 
                    }}
                    className="w-2 h-2 rounded-full bg-emerald-500"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
