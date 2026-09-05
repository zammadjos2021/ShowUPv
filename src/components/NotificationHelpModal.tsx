import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  BellRing, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle, 
  Volume2, 
  Laptop, 
  Smartphone, 
  Globe 
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import { playChimeSound, requestPwaNotificationPermission, showPwaPushNotification } from '../utils/pwaNotifications';

interface NotificationHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export function NotificationHelpModal({
  isOpen,
  onClose,
  onPermissionGranted,
}: NotificationHelpModalProps) {
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile' | 'in-app'>('desktop');
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentPerm = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

  const handleOpenInNewTab = () => {
    sounds.playClick();
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRetryPermission = async () => {
    sounds.playClick();
    const perm = await requestPwaNotificationPermission();
    if (perm === 'granted') {
      sounds.playSuccess();
      playChimeSound(920);
      await showPwaPushNotification('ShowUp Notifications Active', {
        body: 'Alarms and shift task reminders are enabled!',
      });
      setTestResult('Permission granted successfully!');
      if (onPermissionGranted) onPermissionGranted();
      setTimeout(() => {
        onClose();
      }, 1200);
    } else if (perm === 'denied') {
      setTestResult('Still blocked by browser settings. Please follow the steps below.');
    }
  };

  const handleTestInAppAlarm = () => {
    sounds.playAlarm(880, 0.8);
    playChimeSound(880);
    setTestResult('Chimed! In-app audio & visual alerts are active.');
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/showup-sup-logo.png" 
              alt="ShowUp Notification Icon" 
              className="w-10 h-10 rounded-xl object-cover border border-cyan-400/40 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-base font-bold text-white">Notification Permission Guide</h3>
              <p className="text-xs text-indigo-200">
                {currentPerm === 'denied' ? 'Permission is currently blocked in browser' : 'Enable alarms & background reminders'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-700 text-xs">
          {/* Iframe Notice & Standalone Launcher */}
          {isInIframe && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-xs">Running in Embedded Preview Mode</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Modern browsers automatically restrict push prompts inside preview frames. Opening in a standalone tab allows immediate native permission approval.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition text-xs"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Troubleshooting Tabs */}
          <div>
            <div className="flex border-b border-slate-200 mb-3">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveTab('desktop');
                }}
                className={`pb-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'desktop'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Chrome & Edge</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveTab('mobile');
                }}
                className={`pb-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'mobile'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile & Safari</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveTab('in-app');
                }}
                className={`pb-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'in-app'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>In-App Alarms</span>
              </button>
            </div>

            {/* Tab 1: Chrome / Edge Desktop */}
            {activeTab === 'desktop' && (
              <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 text-xs">How to unblock in Chrome, Edge & Brave:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
                  <li>
                    Look at the left side of the address bar at the top of your browser.
                  </li>
                  <li>
                    Click the <strong>Tune / Settings</strong> icon <span className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">⚙️</span> or <strong>Lock icon</strong> <span className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">🔒</span>.
                  </li>
                  <li>
                    Under <strong>Permissions</strong>, find <strong>Notifications</strong> and toggle it to <strong>Allow</strong> (or choose "Ask").
                  </li>
                  <li>
                    Refresh this page or click <strong>Retry Permission</strong> below.
                  </li>
                </ol>
              </div>
            )}

            {/* Tab 2: Mobile / Safari */}
            {activeTab === 'mobile' && (
              <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 text-xs">How to enable on Mobile & Safari:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
                  <li>
                    <strong>Android Chrome:</strong> Tap the 3 dots menu <span className="font-bold">⋮</span> &rarr; <strong>Settings</strong> &rarr; <strong>Site Settings</strong> &rarr; <strong>Notifications</strong> &rarr; Allow.
                  </li>
                  <li>
                    <strong>iPhone / iOS (Safari):</strong> Tap <strong>Share</strong> &rarr; <strong>Add to Home Screen</strong>. Installed PWA web apps have full system notification privileges.
                  </li>
                  <li>
                    <strong>Safari macOS:</strong> Safari menu &rarr; Settings &rarr; Websites &rarr; Notifications &rarr; Set ShowUp to Allow.
                  </li>
                </ol>
              </div>
            )}

            {/* Tab 3: In-App Alerts (Always Working) */}
            {activeTab === 'in-app' && (
              <div className="space-y-2.5 bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>In-App Shift Alarms are Always Protected</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Even if external browser push notifications remain blocked, ShowUp's internal audio synthesizer, shift alarm popups, and task chime alerts continue to work seamlessly whenever you have this tab open.
                </p>
                <button
                  type="button"
                  onClick={handleTestInAppAlarm}
                  className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition text-xs cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test In-App Chime & Sound</span>
                </button>
              </div>
            )}
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-indigo-600" />
              <span>{testResult}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Standalone</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetryPermission}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Retry Permission</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
