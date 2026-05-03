import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';

const SplashScreen: React.FC = () => {
  const { settings } = useSettings();

  const containerVariants = {
    exit: {
      opacity: 0,
      scale: 1.05,
      filter: "blur(10px)",
      transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const titleWords = settings.app_name?.split(' ') || [];

  return (
    <motion.div
      variants={containerVariants}
      exit="exit"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#020202]"
    >
      {/* Cinematic Depth Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary Ambient Glow */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[120%] h-[120%] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.15)_0%,transparent_70%)] blur-[100px]"
        />
        
        {/* Secondary Counter-Glow */}
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[120%] h-[120%] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.1)_0%,transparent_70%)] blur-[120px]"
        />

        {/* Dynamic Light Sweeps */}
        <motion.div 
          animate={{ x: ['-100%', '100%'], opacity: [0, 0.2, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent blur-sm transform -rotate-12"
        />
      </div>

      {/* High-Resolution Noise Texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
           style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />

      <div className="relative z-10 flex flex-col items-center max-w-5xl w-full px-8">
        
        {/* Brand Core */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-16"
        >
          <div className="relative group p-1 bg-gradient-to-br from-white/10 to-transparent rounded-[48px]">
            <div className="relative z-10 bg-black/60 backdrop-blur-3xl rounded-[44px] overflow-hidden p-0.5 border border-white/10 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]">
              <div className="w-32 h-32 md:w-44 md:h-44 rounded-[40px] overflow-hidden bg-zinc-900/50 flex items-center justify-center">
                {settings.app_logo ? (
                  <motion.div
                    initial={{ scale: 1.2, filter: 'blur(10px)', opacity: 0 }}
                    animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
                    transition={{ delay: 0.3, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full"
                  >
                    <img 
                      src={settings.app_logo} 
                      alt="Logo" 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    />
                  </motion.div>
                ) : (
                  <motion.span 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="text-6xl font-thin text-zinc-300 tracking-tighter"
                  >
                    {settings.app_name?.charAt(0)}
                  </motion.span>
                )}
              </div>
            </div>
            {/* Pulsing Aura */}
            <motion.div 
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -inset-4 bg-emerald-500/10 blur-3xl -z-10 rounded-full" 
            />
          </div>
        </motion.div>

        {/* Hero Typography - High End Presentation */}
        <div className="space-y-6">
          <div className="flex flex-wrap justify-center gap-x-4 overflow-hidden">
            {titleWords.map((word, wordIdx) => (
              <div key={wordIdx} className="overflow-hidden flex">
                {word.split('').map((char, charIdx) => (
                  <motion.span
                    key={charIdx}
                    initial={{ y: 200, opacity: 0, rotateX: 90 }}
                    animate={{ y: 0, opacity: 1, rotateX: 0 }}
                    transition={{ 
                      delay: 0.5 + (wordIdx * 0.1) + (charIdx * 0.03), 
                      duration: 1.2, 
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase italic inline-block leading-none"
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="flex items-center justify-center space-x-6 h-6"
          >
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ delay: 1.5, duration: 1, ease: "easeOut" }}
              className="h-[1px] bg-emerald-500/30" 
            />
            <div className="flex overflow-hidden">
              {settings.app_slogan?.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 1.5 + (i * 0.03), 
                    duration: 0.5,
                    ease: "easeOut"
                  }}
                  className="text-[10px] md:text-sm font-bold text-emerald-400 tracking-[0.3em] uppercase whitespace-pre"
                >
                  {char}
                </motion.span>
              ))}
            </div>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ delay: 1.5, duration: 1, ease: "easeOut" }}
              className="h-[1px] bg-emerald-500/30" 
            />
          </motion.div>
        </div>

        {/* Sophisticated Interaction Indicator */}
        <div className="absolute bottom-20 flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-64 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
              />
            </div>
            {/* Progress Percentage - Aesthetic Only */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-2 left-0 right-0 text-center"
            >
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-emerald-500/40 italic">Syncing Core</span>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 2 }}
            className="flex items-center space-x-2 text-white/10"
          >
            <span className="text-[9px] font-black uppercase tracking-widest">Version 4.0.1</span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#10b981]/40">System Ready</span>
          </motion.div>
        </div>
      </div>

      {/* Floating Particles for Depth */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              opacity: 0
            }}
            animate={{ 
              y: [null, Math.random() * -100],
              opacity: [0, Math.random() * 0.3, 0],
              scale: [0, Math.random() * 1.5, 0]
            }}
            transition={{ 
              duration: 5 + Math.random() * 5, 
              repeat: Infinity, 
              delay: Math.random() * 5 
            }}
            className="absolute w-1 h-1 bg-emerald-500/20 rounded-full blur-[1px]"
          />
        ))}
      </div>
    </motion.div>
  );
};

export default SplashScreen;

