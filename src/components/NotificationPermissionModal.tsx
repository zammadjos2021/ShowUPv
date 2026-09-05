import React from 'react';
import { Bell, ShieldCheck, X, Clock, Sparkles } from 'lucide-react';
import { requestPwaNotificationPermission, showPwaPushNotification } from '../utils/pwaNotifications';
import { sounds } from '../utils/soundEffects';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionDecided?: (status: 'granted' | 'denied' | 'dismissed') => void;
}

export function NotificationPermissionModal({
  isOpen,
  onClose,
  onPermissionDecided,
}: NotificationPermissionModalProps) {
  if (!isOpen) return null;

  const handleAllow = async () => {
    sounds.playClick();
    const perm = await requestPwaNotificationPermission();
    localStorage.setItem('showup_notification_prompt_answered', 'true');
    
    if (perm === 'granted') {
      sounds.playSuccess();
      await showPwaPushNotification('ShowUp SUP Notifications Enabled', {
        body: 'Shift reminders, alarm chimes, and DTR alerts are now active!',
        icon: '/showup-sup-logo.png',
        tag: 'showup-welcome-alert'
      });
      onPermissionDecided?.('granted');
    } else {
      onPermissionDecided?.('denied');
    }
    onClose();
  };

  const handleDeny = () => {
    sounds.playClick();
    localStorage.setItem('showup_notification_prompt_answered', 'true');
    onPermissionDecided?.('denied');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
        
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDeny}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="relative mb-3">
            <img 
              src="/showup-sup-logo.png" 
              alt="ShowUp SUP" 
              className="w-16 h-16 rounded-2xl shadow-lg border border-slate-100 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-white shadow-sm">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            Enable Notifications &amp; Alarms?
          </h3>
          <p className="text-sm text-slate-500 mt-1.5 max-w-xs">
            ShowUp SUP can alert you with banners &amp; chimes when your shift starts, ends, or hits overtime.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2.5 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Shift &amp; Break Reminders</h4>
              <p className="text-[11px] text-slate-500">Get timely alerts when target shift hours are reached.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Alarm &amp; Task Alerts</h4>
              <p className="text-[11px] text-slate-500">Receive audio alerts and banners for scheduled shift tasks.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleAllow}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Allow Notifications</span>
          </button>
          <button
            type="button"
            onClick={handleDeny}
            className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition active:scale-98 cursor-pointer"
          >
            Deny / Not Now
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          You can change this anytime in <strong>Settings &gt; Notification and alarm settings</strong>.
        </p>
      </div>
    </div>
  );
}
