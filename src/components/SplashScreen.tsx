import React from 'react';
import { motion } from 'motion/react';
import { useSettings } from '../context/SettingsContext';

const SplashScreen: React.FC = () => {
  const { settings } = useSettings();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0a]"
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -80, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute -bottom-[10%] -right-[5%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            x: [0, 50, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[110px]"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 0.8 
          }}
          className="relative mb-8"
        >
          {/* Logo Glow */}
          <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-30 rounded-full animate-pulse" />
          
          {settings.app_logo ? (
            <img 
              src={settings.app_logo} 
              alt="Logo" 
              className="w-32 h-32 rounded-[32px] shadow-2xl relative z-10 border border-white/10" 
            />
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[32px] flex items-center justify-center text-white text-5xl font-black shadow-2xl relative z-10 border border-white/10">
              {settings.app_name?.charAt(0) || 'G'}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="text-center px-6"
        >
          <h1 className="text-5xl font-black tracking-tighter text-white mb-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-emerald-400">
              {settings.app_name}
            </span>
          </h1>
          <p className="text-lg font-medium text-emerald-100/60 tracking-wide uppercase text-[10px]">
            {settings.app_slogan}
          </p>
        </motion.div>

        {/* Loading Indicator */}
        <div className="mt-16 flex space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"
            />
          ))}
        </div>
      </div>

      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </motion.div>
  );
};

export default SplashScreen;
