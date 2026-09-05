import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Volume2, X, Clock, Calendar, Check, AlertCircle } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export interface AppBannerNotification {
  id: string;
  type: 'alarm' | 'note' | 'shift' | 'system';
  title: string;
  message: string;
  time?: string;
  date?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

interface NotificationBannerProps {
  notifications: AppBannerNotification[];
  onDismissAll?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notifications,
  onDismissAll,
}) => {
  if (!notifications.length) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-3 space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className={`pointer-events-auto rounded-2xl p-3.5 sm:p-4 text-white shadow-2xl border backdrop-blur-md flex items-start justify-between gap-3 relative overflow-hidden ${
              notif.type === 'alarm'
                ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 border-rose-500/50 shadow-rose-950/40'
                : notif.type === 'note'
                ? 'bg-gradient-to-r from-indigo-950 via-blue-900 to-slate-950 border-cyan-400/40 shadow-blue-950/40'
                : 'bg-gradient-to-r from-slate-900 via-[#0d1052] to-slate-900 border-indigo-500/40'
            }`}
          >
            {/* Ambient background glow */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />

            {/* Left: 3D SUP Logo with Alert Badge */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-11 h-11 rounded-xl p-[1px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-md">
                <div className="w-full h-full rounded-[11px] overflow-hidden bg-[#08093d] flex items-center justify-center">
                  <img
                    src="/showup-sup-logo.png"
                    alt="ShowUp SUP Logo"
                    className="w-full h-full object-cover scale-[1.05]"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 text-white text-[10px] shadow-sm ${
                  notif.type === 'alarm' ? 'bg-rose-500' : 'bg-cyan-500 text-slate-950'
                }`}
              >
                {notif.type === 'alarm' ? (
                  <Volume2 className="w-2.5 h-2.5 animate-pulse" />
                ) : (
                  <Bell className="w-2.5 h-2.5" />
                )}
              </div>
            </div>

            {/* Middle: Title, message, and metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white/10 border-white/20 text-cyan-300">
                  {notif.type === 'alarm' ? 'Shift Alarm' : notif.type === 'note' ? 'Task Reminder' : 'ShowUp Alert'}
                </span>
                {notif.time && (
                  <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {notif.time}
                  </span>
                )}
                {notif.date && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {notif.date}
                  </span>
                )}
              </div>

              <h4 className="font-bold text-sm text-white mt-1 leading-snug tracking-tight truncate">
                {notif.title}
              </h4>
              {notif.message && (
                <p className="text-xs text-slate-200 mt-0.5 line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>
              )}

              {/* Action buttons if available */}
              {notif.onAction && notif.actionLabel && (
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      notif.onAction?.();
                    }}
                    className="px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-lg shadow-sm transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{notif.actionLabel}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      notif.onDismiss();
                    }}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Right: Dismiss button */}
            {!notif.onAction && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  notif.onDismiss();
                }}
                className="shrink-0 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
