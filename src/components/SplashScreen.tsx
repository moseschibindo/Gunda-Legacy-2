import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, SkipForward, Compass, Volume2, VolumeX, Shield, Trees } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const ScenicVideos = [
  // Beautiful ocean shoreline drone video
  'https://vjs.zencdn.net/v/oceans.mp4',
  // Green rolling mountains and hills
  'https://assets.mixkit.co/videos/preview/mixkit-beautiful-landscape-of-green-hills-under-clouds-40625-large.mp4',
  // Forest stream sunlight
  'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4'
];

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { user, profile } = useAuth();
  const [stage, setStage] = useState(0);
  const [muted, setMuted] = useState(true);
  const [videoIndex, setVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if it's the user's first sign up (created in the last 10 minutes)
  const isFirstSignUp = user?.created_at
    ? (new Date().getTime() - new Date(user.created_at).getTime() < 600000)
    : false;

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 3200), // Change to welcome & congratulations
      setTimeout(() => setStage(2), 7000), // Change to Gunda Technologies message
      setTimeout(() => onComplete(), 11000), // Finish
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Attempt to rotate videos if one fails
  const handleVideoError = () => {
    if (videoIndex < ScenicVideos.length - 1) {
      setVideoIndex(prev => prev + 1);
    }
  };

  const userName = profile?.name ? profile.name.trim() : 'Valued Member';

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[200] flex flex-col justify-between bg-black text-white overflow-hidden select-none"
    >
      {/* Background Scenic Video player */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          key={ScenicVideos[videoIndex]}
          src={ScenicVideos[videoIndex]}
          autoPlay
          loop
          muted={muted}
          playsInline
          onError={handleVideoError}
          className="absolute inset-0 w-full h-full object-cover scale-105 filter brightness-[0.45] saturate-[1.25]"
        />
        
        {/* Colorful gradient overlay that moves */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/40 via-blue-950/30 to-purple-950/40 mix-blend-color-add animate-pulse duration-[6000ms]" />
        
        {/* Soft elegant vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.85)_100%)]" />
      </div>

      {/* Screen Header Controls */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8 w-full">
        <div className="flex items-center space-x-2">
          <Compass className="text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
            Cinematic Journey
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Mute toggle with modern indicator */}
          <button
            onClick={() => setMuted(prev => !prev)}
            className="flex items-center justify-center p-2.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 transition-all"
            title={muted ? "Unmute Ambient Ocean" : "Mute Sound"}
          >
            {muted ? <VolumeX className="text-white/60" size={16} /> : <Volume2 className="text-emerald-400 animate-bounce" size={16} />}
          </button>

          {/* Quick skip button */}
          <button
            onClick={onComplete}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/30 transition-all text-xs font-black uppercase tracking-[0.15em] text-emerald-400"
          >
            <span>Skip Splash</span>
            <SkipForward size={14} />
          </button>
        </div>
      </div>

      {/* Cinematic Copywriting Stages */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 max-w-4xl mx-auto w-full text-center">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div
              key="intro-stage"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div className="inline-flex py-1.5 px-4 rounded-full bg-emerald-500/10 border border-emerald-400/20 backdrop-blur-md mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400 animate-pulse">
                  System Initializing
                </span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase italic bg-gradient-to-b from-white via-white to-gray-400 bg-clip-text text-transparent">
                HELLO
              </h1>

              <div className="h-1.5 w-16 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 mx-auto rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              
              <p className="text-gray-400 text-xs md:text-sm font-medium tracking-[0.12em] max-w-md mx-auto">
                Breathe in the tranquility. Preparing your exclusive space with absolute cinematic refinement.
              </p>
            </motion.div>
          )}

          {stage === 1 && (
            <motion.div
              key="welcome-user-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              className="space-y-6 md:space-y-8"
            >
              {isFirstSignUp ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center space-x-2 py-1 px-4 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-extrabold uppercase text-[10px] tracking-widest animate-bounce shadow-xl"
                >
                  <Sparkles size={12} className="animate-spin text-amber-300" />
                  <span>Congratulations on your first signup! 🎉</span>
                </motion.div>
              ) : (
                <div className="inline-flex items-center space-x-2 py-1 px-4 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 font-extrabold uppercase text-[10px] tracking-widest">
                  <Shield size={12} className="text-emerald-400" />
                  <span>Returning Active Legend</span>
                </div>
              )}

              {/* Dynamic name display with premium typography and glowing colorful gradients */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.45em] text-gray-400">
                  Welcome to the Vanguard,
                </p>
                <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none uppercase">
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-slow drop-shadow-[0_4px_24px_rgba(16,185,129,0.3)]">
                    {userName}
                  </span>
                </h2>
              </div>

              <div className="max-w-xl mx-auto">
                <p className="text-sm md:text-base text-gray-300 font-medium tracking-wide">
                  {isFirstSignUp 
                    ? "Welcome to your starting line. We are absolutely honored to have you register. Prepare to build your legacy with us starting today."
                    : "Welcome back to your high-integrity digital registry. Your contributions and stats are securely synced and awaiting your strategy."
                  }
                </p>
              </div>
            </motion.div>
          )}

          {stage === 2 && (
            <motion.div
              key="technologies-stage"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 1.2 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="flex justify-center mb-2">
                <Trees className="text-emerald-400 animate-pulse" size={40} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.5em] text-emerald-400">
                  Unleash Your Legacy
                </p>
                <h3 className="text-4xl md:text-6xl font-black italic text-white tracking-tighter leading-none">
                  WELCOME TO THE WORLD OF <br/>
                  <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-slow">
                    GUNDAS TECHNOLOGIES
                  </span>
                </h3>
              </div>

              <div className="max-w-xl mx-auto space-y-4">
                <p className="text-xs md:text-sm text-gray-400 font-semibold uppercase tracking-[0.2em]">
                  Where Innovation Meets Legacy
                </p>
                <p className="text-sm md:text-base text-gray-300">
                  Experience a polished reality of real-time collaboration, beautiful bento dashboards, responsive mobile registry feeds, and premium cinematic interface tools.
                </p>
              </div>

              {/* Glowing active pulse locator */}
              <div className="flex justify-center gap-1.5 pt-4">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.6, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                      duration: 1.2, 
                      repeat: Infinity, 
                      delay: i * 0.25 
                    }}
                    className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modern Cinematic Loading Indicator */}
      <div className="relative z-10 px-6 pb-12 text-center w-full max-w-md mx-auto">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
            <span>Saturating Visuals</span>
            <span>{Math.round((stage + 1) * 33.3)}%</span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: '0%' }}
              animate={{ width: stage === 0 ? '33.3%' : stage === 1 ? '66.6%' : '100%' }}
              transition={{ duration: 3.5, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
