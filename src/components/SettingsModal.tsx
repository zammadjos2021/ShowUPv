import React, { useState, useRef } from 'react';
import { X, Check, Save, User, Building2, Clock, Upload, Download, RotateCcw, ShieldCheck, Bell, Radio, HelpCircle, ExternalLink, Camera, Image, Trash2, CheckCircle2, Cloud, LogIn, LogOut, RefreshCw, Sparkles } from 'lucide-react';
import { UserSettings, TimeRecord } from '../types';
import { User as FirebaseUser } from '../lib/firebase';
import { exportBackupJSON } from '../utils/exportUtils';
import { sounds } from '../utils/soundEffects';
import { requestPwaNotificationPermission, showPwaPushNotification, playChimeSound } from '../utils/pwaNotifications';
import { NotificationHelpModal } from './NotificationHelpModal';

interface SettingsModalProps {
  settings: UserSettings;
  records: TimeRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (newSettings: UserSettings) => void;
  onRestoreRecords: (restoredRecords: TimeRecord[], restoredSettings?: UserSettings) => void;
  onResetSampleData: () => void;
  currentUser?: FirebaseUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  records,
  isOpen,
  onClose,
  onSaveSettings,
  onRestoreRecords,
  onResetSampleData,
  currentUser = null,
  onOpenAuth,
  onLogout,
  onSyncNow,
  isSyncing = false,
}) => {
  const [formData, setFormData] = useState<UserSettings>(settings);
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [permState, setPermState] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  if (!isOpen) return null;

  const employeeInitials = formData.employeeName
    ? formData.employeeName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'JD';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        // Resize to high-density 256x256 max dimensions for fast performance and safe storage
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setFormData((prev) => ({ ...prev, profilePicture: dataUrl }));
          sounds.playClockIn();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input so user can choose same file again if needed
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    sounds.playClick();
    setFormData((prev) => ({ ...prev, profilePicture: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClockIn();
    onSaveSettings(formData);
    setShowSavedMsg(true);
    setTimeout(() => {
      setShowSavedMsg(false);
      onClose();
    }, 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.records)) {
          onRestoreRecords(json.records, json.settings);
          sounds.playClockIn();
          alert(`Successfully restored ${json.records.length} records from backup file!`);
          onClose();
        } else if (Array.isArray(json)) {
          onRestoreRecords(json);
          sounds.playClockIn();
          alert(`Successfully restored ${json.length} records!`);
          onClose();
        } else {
          alert('Invalid backup JSON format.');
        }
      } catch (err) {
        alert('Failed to parse backup file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold">Profile & App Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Cloud Sync & Firebase Account Banner */}
          <div className="p-4 bg-gradient-to-br from-indigo-900 via-[#0d1052] to-[#08093d] rounded-2xl text-white shadow-md border border-indigo-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-cyan-400/40 flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight">Firebase Cloud Sync</h4>
                  <p className="text-[10px] text-indigo-200">Google Firestore Persistence</p>
                </div>
              </div>

              {currentUser ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-semibold">
                  Local Mode
                </span>
              )}
            </div>

            {currentUser ? (
              <div className="pt-1 space-y-2.5">
                <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/10">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser.displayName || formData.employeeName || 'Logged In User'}
                    </p>
                    <p className="text-[11px] text-slate-300 truncate">
                      {currentUser.email || 'Google Account'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      if (onLogout) onLogout();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Log Out</span>
                  </button>
                </div>

                {onSyncNow && (
                  <button
                    type="button"
                    onClick={async () => {
                      sounds.playClick();
                      await onSyncNow();
                    }}
                    disabled={isSyncing}
                    className="w-full py-2 px-3 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-indigo-400/30 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Synchronizing with Firestore...' : 'Sync All Records to Cloud Now'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="pt-1 space-y-2">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Sign in with Google to automatically back up your shifts, prevent data loss when clearing cookies, and sync across your mobile and desktop devices.
                </p>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onOpenAuth();
                    }}
                    className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm border border-cyan-300/30 transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In to Enable Cloud Sync</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile Picture & Account Session Card */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                Profile Picture &amp; Account Session
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                formData.profilePicture 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}>
                {formData.profilePicture ? 'Custom Photo Active' : 'Default Avatar'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Avatar Preview with App Theme Gradient Dual Outline */}
              <div className="relative shrink-0 group">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 rounded-full blur-xs opacity-50 group-hover:opacity-100 transition duration-300"></div>
                  <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-md">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#08093d] p-[1.5px] flex items-center justify-center text-white text-base font-bold ring-1 ring-white/20">
                      {formData.profilePicture ? (
                        <img
                          src={formData.profilePicture}
                          alt="Profile Avatar"
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Fallback if image fails
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="bg-gradient-to-tr from-[#0d1052] to-[#1e257a] w-full h-full rounded-full flex items-center justify-center font-black text-base text-cyan-200 border border-cyan-400/20">
                          {employeeInitials}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  title="Change Picture"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-sm hover:bg-indigo-700 transition"
                >
                  <Camera className="w-3 h-3" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{formData.profilePicture ? 'Change Picture' : 'Upload Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={!formData.profilePicture}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition ${
                      formData.profilePicture
                        ? 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title={formData.profilePicture ? 'Reset to default initials avatar' : 'Default avatar is already active'}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Set to Default</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {formData.profilePicture 
                    ? 'Custom photo will be shown across the header and employee reports.' 
                    : 'No photo selected. Using standard default initials avatar.'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Employee & DTR Identity
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Employee Full Name
              </label>
              <input
                type="text"
                value={formData.employeeName}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Employee ID / Badge #
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="e.g. EMP-2026-88"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Department / Unit
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. IT Operations"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Company / Agency Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Apex Global Solutions"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {/* Time & Shift Rules */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Work Shift Configuration
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Time In
                </label>
                <input
                  type="time"
                  value={formData.defaultTimeIn || '09:00'}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultTimeIn: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default 9:00 AM</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Time Out
                </label>
                <input
                  type="time"
                  value={formData.defaultTimeOut || '18:00'}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultTimeOut: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default 6:00 PM</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Standard Daily Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  step="0.5"
                  value={formData.standardDailyHours}
                  onChange={(e) =>
                    setFormData({ ...formData, standardDailyHours: Number(e.target.value) || 8 })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Hours before Overtime</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Break (Mins)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={formData.defaultBreakMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultBreakMinutes: Number(e.target.value) || 60 })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default lunch break</span>
              </div>
            </div>

            {/* Time Format */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Time Format Display
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, timeFormat: '12h' })}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    formData.timeFormat === '12h'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  12-Hour (08:30 AM)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, timeFormat: '24h' })}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    formData.timeFormat === '24h'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  24-Hour (08:30)
                </button>
              </div>
            </div>

            {/* Web Push Notification Settings & Permission */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <img 
                    src="/showup-sup-logo.png" 
                    alt="SUP App Icon" 
                    className="w-4 h-4 rounded-md object-cover border border-cyan-400/40"
                    referrerPolicy="no-referrer"
                  />
                  Web Push & PWA Notifications
                </span>
                <span className={`text-[10px] font-bold ${
                  permState === 'granted'
                    ? 'text-emerald-600'
                    : permState === 'denied'
                      ? 'text-amber-600'
                      : 'text-indigo-600'
                }`}>
                  {permState === 'granted'
                    ? 'Active'
                    : permState === 'denied'
                      ? 'Blocked (Unblock Guide)'
                      : 'Not Allowed'}
                </span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const perm = await requestPwaNotificationPermission();
                    setPermState(perm);
                    if (perm === 'granted') {
                      await showPwaPushNotification('ShowUp Notifications Enabled', {
                        body: 'Shift alarms and scheduled notes will alert you right away!'
                      });
                      playChimeSound(880);
                    } else if (perm === 'denied') {
                      setIsHelpModalOpen(true);
                    }
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                    permState === 'granted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{permState === 'granted' ? 'Notifications Active' : 'Request Permission'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setIsHelpModalOpen(true);
                  }}
                  className="py-2 px-3 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="How to Unblock or Configure"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Unblock Guide</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Shift alarms, audio chimes, and reminders alert you directly inside this app and via native device push.
              </p>
            </div>

            {/* Google AdMob / AdSense Web Banner Settings */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-[10px] shadow-2xs">
                    Ad
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      Google AdMob / AdSense Banner Slot
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Standard 320x50 (mobile) & 728x90 (desktop) ad slot
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.adBannerEnabled !== false}
                    onChange={(e) =>
                      setFormData({ ...formData, adBannerEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formData.adBannerEnabled !== false && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Publisher ID (ca-pub-...)
                      </label>
                      <input
                        type="text"
                        value={formData.adMobPublisherId || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val.includes('/')) {
                            const [pub, slot] = val.split('/');
                            setFormData({
                              ...formData,
                              adMobPublisherId: pub.replace('ca-app-pub-', 'ca-pub-'),
                              adMobSlotId: slot,
                            });
                          } else {
                            setFormData({ ...formData, adMobPublisherId: val.replace('ca-app-pub-', 'ca-pub-') });
                          }
                        }}
                        placeholder="e.g. ca-pub-7009400724603043"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Default: ca-pub-7009400724603043
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Ad Unit / Slot ID
                      </label>
                      <input
                        type="text"
                        value={formData.adMobSlotId || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val.includes('/')) {
                            const [pub, slot] = val.split('/');
                            setFormData({
                              ...formData,
                              adMobPublisherId: pub.replace('ca-app-pub-', 'ca-pub-'),
                              adMobSlotId: slot,
                            });
                          } else {
                            setFormData({ ...formData, adMobSlotId: val });
                          }
                        }}
                        placeholder="e.g. 1845146236 or full Ad Unit ID"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Default: 1845146236 (ca-app-pub-.../1845146236)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-700">
                        AdMob Test Mode
                      </span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                        Recommended for Development
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.adTestMode !== false}
                        onChange={(e) =>
                          setFormData({ ...formData, adTestMode: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal">
                    Displays responsive web banner ad slot. If packaged into an Android APK (using Capacitor, Cordova, or TWA), this slot also maps seamlessly to your AdMob banner units.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Backup, Restore & Reset */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Data Backup & Storage
            </h4>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportBackupJSON(records, settings)}
                className="flex-1 py-2 px-3 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </button>

              <label className="flex-1 py-2 px-3 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('Reset to initial sample time keeping records?')) {
                  onResetSampleData();
                  onClose();
                }
              }}
              className="w-full py-1.5 text-[11px] text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Load Sample Demonstration Data</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wide transition"
            >
              <Save className="w-4 h-4" />
              <span>{showSavedMsg ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      <NotificationHelpModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onPermissionGranted={() => setPermState('granted')}
      />
    </div>
  );
};
