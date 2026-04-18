import React from 'react';
import { motion } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';

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
            scale: [1, 1.4, 1],
            x: [0, 150, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/30 blur-[130px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -120, 0],
            y: [0, 150, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute -bottom-[10%] -right-[5%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.6, 1],
            x: [0, 80, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[130px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
          className="absolute bottom-[20%] left-[20%] w-[45%] h-[45%] rounded-full bg-rose-500/25 blur-[110px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 40, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute top-[40%] left-[40%] w-[35%] h-[35%] rounded-full bg-amber-400/20 blur-[90px]"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 100,
            damping: 15,
            duration: 1.5 
          }}
          className="relative mb-10"
        >
          {/* Enhanced Multi-color Logo Aura */}
          <motion.div 
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-10 bg-gradient-to-tr from-emerald-500/40 via-blue-500/40 to-purple-500/40 blur-[60px] rounded-full z-0" 
          />
          
          <div className="relative z-10 p-2 bg-white/10 backdrop-blur-3xl rounded-[48px] border border-white/20 shadow-2xl glass-shimmer overflow-hidden">
            {settings.app_logo ? (
              <motion.div
                initial={{ filter: 'brightness(0) invert(1)' }}
                animate={{ filter: 'brightness(1) invert(0)' }}
                transition={{ duration: 1, delay: 0.5 }}
                className="w-36 h-36 rounded-[40px] overflow-hidden bg-white/5"
              >
                <img 
                  src={settings.app_logo} 
                  alt="Organization Logo" 
                  className="w-full h-full object-cover" 
                />
              </motion.div>
            ) : (
              <div className="w-36 h-36 bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 rounded-[40px] flex items-center justify-center text-white shadow-inner">
                <motion.span 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                  className="text-6xl font-black tracking-tighter"
                >
                  {settings.app_name?.charAt(0) || 'L'}
                </motion.span>
              </div>
            )}
            {/* Shimmer overlay */}
            <motion.div 
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-center px-6"
        >
          <div className="overflow-hidden mb-2">
            <motion.h1 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="text-7xl font-black tracking-tight text-white"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-blue-200 to-purple-300">
                {settings.app_name}
              </span>
            </motion.h1>
          </div>
          <motion.div
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, letterSpacing: "0.25em" }}
            transition={{ delay: 1.8, duration: 1.5 }}
            className="text-sm font-bold text-white/40 uppercase tracking-[0.25em]"
          >
            {settings.app_slogan}
          </motion.div>
        </motion.div>

        {/* Dynamic Colorful Loading Indicator */}
        <div className="mt-24 flex space-x-4">
          {[
            'bg-emerald-400', 
            'bg-blue-400', 
            'bg-purple-400',
            'bg-rose-400'
          ].map((colorClass, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: [0.2, 1, 0.2], 
                y: [0, -12, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 2 + (i * 0.15),
                ease: "easeInOut"
              }}
              className={cn("w-3 h-3 rounded-full shadow-lg", colorClass)}
              style={{ boxShadow: `0 0 20px currentColor` }}
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
