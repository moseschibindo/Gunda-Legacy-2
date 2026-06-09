import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, SkipForward, Compass, Volume2, VolumeX, Shield, Zap, Flame, Award } from 'lucide-react';

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
  const [dataSaver, setDataSaver] = useState(true); // Default to data saver to protect mobile bundles
  const [videoSrc, setVideoSrc] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-detect connection quality, screen state, and manage video caching
  useEffect(() => {
    let active = true;
    const isMobile = window.innerWidth <= 768;
    const nav = navigator as any;
    const isSlowOrMetered = nav.connection 
      ? (nav.connection.saveData || ['slow-2g', '2g', '3g'].includes(nav.connection.effectiveType))
      : false;

    const arrangeVideoSource = async () => {
      try {
        const url = ScenicVideos[videoIndex];
        
        if ('caches' in window) {
          const cache = await caches.open('gunda-video-cache');
          const cachedResponse = await cache.match(url);
          
          if (cachedResponse) {
            // Already cached! Create a local object URL instantly (0 network cost, playing fully offline)
            const blob = await cachedResponse.blob();
            if (active) {
              setVideoSrc(URL.createObjectURL(blob));
              setDataSaver(false); // Cached video has 0 load weight/data cost, can play safely!
              return;
            }
          }

          // If not cached and we are on a fast connection, load and cache in background for future turns
          if (!isMobile && !isSlowOrMetered) {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response.clone());
              const blob = await response.blob();
              if (active) {
                setVideoSrc(URL.createObjectURL(blob));
                setDataSaver(false);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Scenery video offline cache engine skipped:', err);
      }

      // If anything fails or we are preserving mobile data, default to zero-data custom render engine
      if (active) {
        setDataSaver(true);
      }
    };

    arrangeVideoSource();

    return () => {
      active = false;
    };
  }, [videoIndex]);

  // Clean up ObjectURLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

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
      className="fixed inset-0 z-[200] flex flex-col justify-between bg-[#040807] text-white overflow-hidden select-none"
    >
      {/* Background Section (Video vs. High-Performance Mobile Nature Canvas) */}
      <div className="absolute inset-0 z-0 overflow-hidden w-full h-full">
        {dataSaver ? (
          /* Zero-Data Beautiful Nature Canvas (Hills, Skies & Sunset Glow in CSS/SVG) */
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1c18] via-[#040b11] to-[#010304]">
            {/* Animated Scenic Stars & Glowing Sunbeam Accent */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[180%] h-[180%] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18)_0%,transparent_50%)] animate-pulse duration-[8000ms]" />
            <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-emerald-500/10 blur-[130px] rounded-full animate-pulse duration-[12000ms]" />
            <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[160px] rounded-full animate-pulse duration-[10000ms]" />

            {/* Breathtaking Low-poly / Fluid Svg Mountains and Hills Accent */}
            <svg className="absolute bottom-0 left-0 w-full h-[60%] opacity-25" viewBox="0 0 1440 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,450 Q360,320 720,410 T1440,360 L1440,800 L0,800 Z" fill="url(#hill-grad-1)"></path>
              <path d="M0,580 Q300,520 600,600 T1200,540 T1440,590 L1440,800 L0,800 Z" fill="url(#hill-grad-2)"></path>
              <defs>
                <linearGradient id="hill-grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#064e3b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="hill-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#022c22" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#010504" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        ) : (
          /* Cinematic HD Video layer - Fully scaled for all screen types (including 100% of mobile) */
          <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              key={videoSrc || ScenicVideos[videoIndex]}
              src={videoSrc || ScenicVideos[videoIndex]}
              autoPlay
              loop
              muted={muted}
              playsInline
              webkit-playsinline="true"
              preload="auto"
              onError={handleVideoError}
              style={{ minWidth: '100%', minHeight: '100%' }}
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.45] saturate-[1.3] scale-102"
            />
          </div>
        )}

        {/* Ambient Overlay Layer (Universal) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020504] via-transparent to-[#020504]/80 pointer-events-none" />
      </div>

      {/* Screen Header Controls */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8 w-full">
        <div className="flex items-center space-x-2">
          <Compass className="text-emerald-400 animate-spin" style={{ animationDuration: '10s' }} size={16} />
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">
            ADVANCED GUNDA LEGACY SAVINGS APP
          </span>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Mute toggle with modern indicator */}
          {!dataSaver && (
            <button
              onClick={() => setMuted(prev => !prev)}
              className="flex items-center justify-center p-2 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 transition-all"
              title={muted ? "Unmute Sound" : "Mute Sound"}
            >
              {muted ? <VolumeX className="text-white/60" size={14} /> : <Volume2 className="text-emerald-400 animate-bounce" size={14} />}
            </button>
          )}

          {/* Quick skip button */}
          <button
            onClick={onComplete}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/30 transition-all text-[9.5px] font-black uppercase tracking-widest text-emerald-400"
          >
            <span>Skip</span>
            <SkipForward size={12} />
          </button>
        </div>
      </div>

      {/* Cinematic Copywriting Stages */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 max-w-4xl mx-auto w-full text-center">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div
              key="intro-stage"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div className="inline-flex py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-400/20 backdrop-blur-md mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">
                  Initializing Atmosphere
                </span>
              </div>
              
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none uppercase italic bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent">
                HELLO
              </h1>

              <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 via-emerald-400 to-blue-500 mx-auto rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
              
              <p className="text-neutral-400 text-[11px] md:text-xs font-semibold tracking-[0.15em] max-w-xs md:max-w-md mx-auto leading-relaxed">
                BREATHE IN THE TRANQUILITY. PREPARING YOUR EXCLUSIVE REGINAL SYSTEM ASSETS.
              </p>
            </motion.div>
          )}

          {stage === 1 && (
            <motion.div
              key="welcome-user-stage"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-6 md:space-y-7"
            >
              {isFirstSignUp ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center space-x-2 py-1.5 px-4 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 text-amber-300 font-extrabold uppercase text-[10px] tracking-widest animate-pulse shadow-xl"
                >
                  <Sparkles size={12} className="animate-spin text-amber-300" />
                  <span>CONGRATULATIONS ON YOUR SIGN UP! 🎉</span>
                </motion.div>
              ) : (
                <div className="inline-flex items-center space-x-2 py-1 px-4 border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 rounded-full font-black uppercase text-[10px] tracking-widest">
                  <Flame size={12} className="text-emerald-400 animate-pulse" />
                  <span>PREMIUM ACTIVE REGISTRY PROTOCOL</span>
                </div>
              )}

              {/* Dynamic name display with premium typography and glowing colorful gradients */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.45em] text-neutral-400">
                  Welcome back,
                </p>
                <h2 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none uppercase">
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-slow drop-shadow-[0_4px_24px_rgba(16,185,129,0.25)]">
                    {userName}
                  </span>
                </h2>
              </div>

              <div className="max-w-xl mx-auto px-4">
                <p className="text-xs md:text-sm text-neutral-300 leading-relaxed tracking-wider">
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.9 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="flex justify-center">
                <Award className="text-emerald-400 animate-bounce" size={36} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.45em] text-emerald-400">
                  Unleash Your Legacy
                </p>
                <h3 className="text-3xl md:text-6xl font-black italic text-white tracking-tighter leading-none">
                  WELCOME TO THE WORLD OF <br/>
                  <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-slow">
                    GUNDAS TECHNOLOGIES
                  </span>
                </h3>
              </div>

              <div className="max-w-xl mx-auto px-4 space-y-3">
                <p className="text-xs text-emerald-300 font-bold uppercase tracking-[0.25em]">
                  Where Innovation Meets Legacy
                </p>
                <p className="text-xs md:text-sm text-neutral-300 leading-relaxed italic">
                  "Experience a polished reality of real-time collaboration, beautiful bento dashboards, responsive mobile registry feeds, and premium cinematic interface tools."
                </p>
              </div>

              {/* Glowing active pulse locator */}
              <div className="flex justify-center gap-1.5 pt-4">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                      duration: 1.2, 
                      repeat: Infinity, 
                      delay: i * 0.25 
                    }}
                    className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modern Cinematic Loading Indicator */}
      <div className="relative z-10 px-6 pb-12 text-center w-full max-w-xs md:max-w-sm mx-auto">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-neutral-500">
            <span>Optimized Scenery loading</span>
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
