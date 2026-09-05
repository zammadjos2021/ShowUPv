import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ShieldCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  employeeName?: string;
  companyName?: string;
}

export function SplashScreen({ onComplete, employeeName, companyName }: SplashScreenProps) {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Initializing attendance workspace...');

  useEffect(() => {
    // Step 1: progress bump
    const t1 = setTimeout(() => {
      setProgress(45);
      setStatusText('Loading daily time records & logs...');
    }, 450);

    // Step 2: progress bump
    const t2 = setTimeout(() => {
      setProgress(85);
      setStatusText(employeeName ? `Welcome back, ${employeeName}` : 'Preparing DTR dashboard...');
    }, 1100);

    // Step 3: complete
    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Ready');
    }, 1700);

    // Step 4: trigger onComplete callback
    const t4 = setTimeout(() => {
      onComplete();
    }, 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete, employeeName]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.45, ease: 'easeInOut' } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#050624] via-[#08093d] to-[#04051a] text-white p-6 select-none overflow-hidden"
    >
      {/* Background ambient radial glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top minimal status bar / skip button */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>v1.2.0 • Offline Ready</span>
        </div>
        <button
          onClick={onComplete}
          className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 cursor-pointer backdrop-blur-sm"
        >
          Skip &rarr;
        </button>
      </div>

      {/* Center Branding & Logo */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="relative mb-6"
        >
          {/* Outer animated gradient aura */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 25px rgba(6, 182, 212, 0.3)',
                '0 0 50px rgba(59, 130, 246, 0.5)',
                '0 0 25px rgba(6, 182, 212, 0.3)',
              ],
            }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-[2.5px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-2xl"
          >
            <div className="w-full h-full rounded-[22px] overflow-hidden bg-[#08093d] flex items-center justify-center shadow-inner">
              <img
                src="/showup-sup-logo.png"
                alt="ShowUp Logo"
                className="w-full h-full object-cover scale-[1.04]"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>

          {/* Floating badge */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-cyan-500 text-[#04051a] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>DTR</span>
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1">
            Show<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">Up</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium tracking-wide uppercase text-indigo-200/90">
            Daily Time Record & Attendance
          </p>
        </motion.div>

        {companyName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{companyName}</span>
          </motion.p>
        )}
      </div>

      {/* Bottom Progress Bar & Loading Status */}
      <div className="w-full max-w-sm flex flex-col items-center gap-3 pb-4">
        {/* Animated Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60 p-[0.5px]">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.4 }}
          />
        </div>

        {/* Status text */}
        <div className="flex items-center justify-between w-full text-[11px] text-slate-400 px-0.5">
          <span className="truncate pr-2">{statusText}</span>
          <span className="font-mono text-cyan-400 font-bold shrink-0">{progress}%</span>
        </div>

        <p className="text-[10px] text-slate-500 text-center mt-1">
          Tap screen or press Skip to enter immediately
        </p>
      </div>
    </motion.div>
  );
}
