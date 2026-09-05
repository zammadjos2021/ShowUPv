import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Smartphone, FileSpreadsheet, FileDown, Bell, BellRing, LogIn, LogOut, Cloud, CheckCircle2 } from 'lucide-react';
import { UserSettings } from '../types';
import { User as FirebaseUser } from '../lib/firebase';
import { sounds } from '../utils/soundEffects';

interface NavbarHeaderProps {
  onOpenSettings: () => void;
  onOpenApkGuide: () => void;
  onOpenPrintDTR: () => void;
  onExportCSV: () => void;
  onReplaySplash?: () => void;
  activeShiftDuration: string | null;
  settings: UserSettings;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  currentUser?: FirebaseUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const NavbarHeader: React.FC<NavbarHeaderProps> = ({
  onOpenSettings,
  onOpenApkGuide,
  onOpenPrintDTR,
  onExportCSV,
  onReplaySplash,
  activeShiftDuration,
  settings,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  currentUser = null,
  onOpenAuth,
  onLogout,
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const displayName = currentUser?.displayName || settings.employeeName || 'Staff Member';

  const employeeInitials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'EM';

  const avatarSource = currentUser?.photoURL || settings.profilePicture;

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#08093d] flex items-center justify-between px-4 sm:px-8 text-white shrink-0 border-b border-[#141b63] shadow-md">
      <div className="flex items-center gap-3">
        {/* Animated 3D SUP Time & Attendance Logo */}
        <motion.div
          onClick={onReplaySplash}
          whileHover={{ scale: 1.08, rotate: -2 }}
          whileTap={{ scale: 0.94 }}
          title="ShowUp - Tap to replay splash screen"
          className="relative w-10 h-10 shrink-0 cursor-pointer drop-shadow-md select-none rounded-xl p-[1.5px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-sm"
        >
          <div className="w-full h-full rounded-[10.5px] overflow-hidden bg-[#08093d] flex items-center justify-center shadow-inner">
            <img
              src="/showup-sup-logo.png"
              alt="ShowUp SUP Logo"
              className="w-full h-full object-cover scale-[1.04]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Active Shift Indicator Dot */}
          {activeShiftDuration && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-900"></span>
            </span>
          )}
        </motion.div>

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              <span className="h-[30px] inline-flex items-center">ShowUp</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block mb-0.5"></span>
            </h1>
            
            {/* Status bar active alert pill */}
            {unreadNotificationsCount > 0 && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={onOpenNotifications || onOpenSettings}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold shadow-xs hover:bg-rose-500/30 transition cursor-pointer"
                title={`${unreadNotificationsCount} active alert(s)`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                <span>{unreadNotificationsCount} Alert{unreadNotificationsCount > 1 ? 's' : ''}</span>
              </motion.button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 hidden sm:block tracking-normal font-normal mt-0.5">
            {activeShiftDuration ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Shift: {activeShiftDuration}
              </span>
            ) : (
              'Time & Attendance'
            )}
          </p>
        </div>
      </div>

      {/* Right Controls & Current Session Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Status Bar Notification Button */}
          <button
            onClick={onOpenNotifications || onOpenSettings}
            title={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} Active Alarm/Task Alerts` : 'Notification & Alarm Center'}
            className={`p-2 rounded-lg relative transition flex items-center cursor-pointer ${
              unreadNotificationsCount > 0
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 hover:bg-rose-900'
                : 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 hover:bg-indigo-800/60'
            }`}
          >
            {unreadNotificationsCount > 0 ? (
              <BellRing className="w-4 h-4 text-rose-400 animate-bounce" />
            ) : (
              <Bell className="w-4 h-4 text-indigo-300" />
            )}
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center border-2 border-[#08093d] shadow-xs">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenPrintDTR}
            title="Save Monthly PDF & Print DTR"
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Save PDF / DTR</span>
          </button>

          <button
            onClick={onExportCSV}
            title="Export CSV"
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">CSV</span>
          </button>

          <button
            onClick={onOpenApkGuide}
            title="Mobile APK / Installation Guide"
            className="p-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 transition flex items-center"
          >
            <Smartphone className="w-4 h-4 text-indigo-300" />
          </button>
        </div>

        {/* Sign In Button for Guest / Unauthenticated State */}
        {!currentUser && onOpenAuth && (
          <motion.button
            onClick={() => {
              sounds.playClick();
              onOpenAuth();
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 shadow-md border border-cyan-400/30 transition cursor-pointer"
            title="Sign in with Google or Email to sync attendance to Firestore"
          >
            {/* Google G mini icon */}
            <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0">
              <svg className="w-full h-full" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>
            <span>Sign In</span>
          </motion.button>
        )}

        {/* User Session Profile Tray & Menu */}
        <div className="relative">
          <motion.button
            onClick={() => {
              if (currentUser) {
                setShowAccountMenu(!showAccountMenu);
              } else {
                onOpenSettings();
              }
            }}
            title={currentUser ? `Signed in as ${displayName}. Click for account options.` : "User Settings & Session Profile"}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2.5 text-left p-1 rounded-2xl bg-[#08093d] hover:bg-[#0c0e4d] border border-transparent hover:border-[#1e257a]/50 transition-all duration-200 group cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${currentUser ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`}></span>
                <p className={`text-[10px] uppercase tracking-wider font-extrabold ${currentUser ? 'text-emerald-300' : 'text-cyan-300'}`}>
                  {currentUser ? 'Cloud Synced' : 'Current Session'}
                </p>
              </div>
              <p className="text-xs font-bold text-white max-w-[130px] truncate group-hover:text-cyan-200 transition">
                {displayName}
              </p>
            </div>

            {/* Profile Picture Tray with App Theme Dual Gradient Glow & Outline */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full blur-xs opacity-50 group-hover:opacity-90 transition-all duration-300"></div>
              <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-sm">
                <div className="w-[44px] h-[44px] min-w-[44px] min-h-[44px] rounded-full overflow-hidden bg-[#08093d] p-[1.5px] flex items-center justify-center text-xs font-extrabold text-cyan-200 shadow-inner ring-1 ring-white/20">
                  {avatarSource ? (
                    <img
                      src={avatarSource}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="bg-gradient-to-tr from-[#0d1052] to-[#1e257a] w-full h-full rounded-full flex items-center justify-center font-black text-xs text-cyan-200 border border-cyan-400/20">
                      {employeeInitials}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.button>

          {/* Logged-In User Quick Dropdown Menu */}
          <AnimatePresence>
            {showAccountMenu && currentUser && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in"
              >
                <div className="p-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#08093d] shrink-0 border border-indigo-200">
                    {avatarSource ? (
                      <img src={avatarSource} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                        {employeeInitials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email || 'Google Account'}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Firestore Sync Active</span>
                    </div>
                  </div>
                </div>

                <div className="py-1 space-y-0.5">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowAccountMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <span>App &amp; DTR Settings</span>
                  </button>

                  {onOpenAuth && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setShowAccountMenu(false);
                        onOpenAuth();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 transition cursor-pointer"
                    >
                      <Cloud className="w-4 h-4 text-cyan-600" />
                      <span>Cloud Sync &amp; Backup Details</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      sounds.playClick();
                      setShowAccountMenu(false);
                      if (onLogout) {
                        onLogout();
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};


