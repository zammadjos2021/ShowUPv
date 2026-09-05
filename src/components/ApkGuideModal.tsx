import React from 'react';
import { X, Smartphone, Download, CheckCircle2, Share2, Sparkles, Shield, WifiOff } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

interface ApkGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkGuideModal: React.FC<ApkGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold">Android APK & Mobile App Installation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-xl space-y-1.5 border border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Mobile-Optimized PWA / Web APK</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              This Daily Time Keeping application is packaged with full mobile support, offline persistence, and standalone full-screen Android mode.
            </p>
          </div>

          {/* Installation steps for Android Chrome */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              How to Install as APK / App on Android:
            </h4>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  1
                </span>
                <p>
                  Open this application in <strong className="text-slate-900">Google Chrome</strong> or your mobile browser on your Android device.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  2
                </span>
                <p>
                  Tap the <strong className="text-slate-900">Three Dots Menu (⋮)</strong> at the top-right of your browser.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  3
                </span>
                <p>
                  Select <strong className="text-indigo-600">"Install app"</strong> or <strong className="text-indigo-600">"Add to Home screen"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  4
                </span>
                <p>
                  The app will install directly onto your home screen with its dedicated icon and launch without browser address bars!
                </p>
              </div>
            </div>
          </div>

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <WifiOff className="w-4 h-4 text-indigo-600 mb-1" />
              <h5 className="font-bold text-slate-800 text-[11px]">Works Offline</h5>
              <p className="text-[10px] text-slate-500">
                Saves time in/out & remarks locally even without internet.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <Shield className="w-4 h-4 text-emerald-600 mb-1" />
              <h5 className="font-bold text-slate-800 text-[11px]">Private & Secure</h5>
              <p className="text-[10px] text-slate-500">
                Your time records remain securely in your device storage.
              </p>
            </div>
          </div>

          {/* AdMob Banner Reference for Android APK */}
          <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Google AdMob Banner Integration</span>
            </div>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              For web deployment, your responsive AdMob / AdSense banner slot is active. If packaging into a native Android APK in Android Studio, add:
            </p>
            <div className="p-2 bg-slate-900 text-amber-300 font-mono text-[10px] rounded-lg overflow-x-auto select-all">
              <code>implementation 'com.google.android.gms:play-services-ads:21.5.0'</code>
            </div>
            <p className="text-[10px] text-slate-600">
              Active Ad Unit ID: <code className="text-indigo-600 font-bold bg-white px-1 py-0.5 rounded border border-slate-200">ca-app-pub-7009400724603043/1845146236</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm uppercase tracking-wide transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
