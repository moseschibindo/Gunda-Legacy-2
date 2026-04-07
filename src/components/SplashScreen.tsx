import { motion } from 'motion/react';
import { useSettings } from '../hooks/useSettings';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { settings } = useSettings();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 2.5, ease: "easeInOut" }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0F172A] overflow-hidden"
    >
      {/* Atmospheric Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 1 }}
          className="absolute -bottom-[10%] -right-[5%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[100px]" 
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: 0.2 
          }}
          className="relative"
        >
          <div className="absolute inset-0 bg-blue-500/30 blur-2xl rounded-full animate-pulse" />
          <img
            src={settings.app_logo}
            alt="Logo"
            className="relative h-32 w-32 rounded-[2rem] shadow-2xl border border-white/10 object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">
            {settings.app_name}
          </h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-3 text-lg font-medium text-blue-100/80 tracking-wide uppercase text-[10px]"
          >
            {settings.app_slogan}
          </motion.p>
        </motion.div>
      </div>

      <div className="absolute bottom-16 w-48">
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full bg-gradient-to-r from-transparent via-blue-400 to-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
}
