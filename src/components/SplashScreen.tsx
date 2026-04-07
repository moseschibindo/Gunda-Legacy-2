import React from 'react';
import { motion } from 'motion/react';
import { useSettings } from '../context/SettingsContext';

const SplashScreen: React.FC = () => {
  const { settings } = useSettings();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-600 text-white"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-4"
      >
        {settings.app_logo ? (
          <img src={settings.app_logo} alt="Logo" className="w-24 h-24 rounded-full shadow-xl" />
        ) : (
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-emerald-600 text-4xl font-bold shadow-xl">
            G
          </div>
        )}
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-3xl font-bold tracking-tight"
      >
        {settings.app_name}
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-emerald-100 mt-2"
      >
        {settings.app_slogan}
      </motion.p>
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mt-12 w-2 h-2 bg-white rounded-full"
      />
    </motion.div>
  );
};

export default SplashScreen;
