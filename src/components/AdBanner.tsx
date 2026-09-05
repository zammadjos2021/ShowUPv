import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Settings as SettingsIcon, X, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserSettings } from '../types';

interface AdBannerProps {
  settings: UserSettings;
  onOpenSettings?: () => void;
  position?: 'bottom-docked' | 'inline';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  settings,
  onOpenSettings,
  position = 'bottom-docked',
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const adRef = useRef<HTMLModElement | null>(null);

  // If user disabled ad banner in settings, or user dismissed for current session
  if (settings.adBannerEnabled === false || isDismissed) {
    return null;
  }

  const rawInput = settings.adMobSlotId?.trim() || settings.adMobPublisherId?.trim() || '';
  
  // Extract publisher & slot from "ca-app-pub-7009400724603043/1845146236" or individual fields
  let publisherId = 'ca-pub-7009400724603043';
  let slotId = '1845146236';

  if (settings.adMobSlotId && settings.adMobSlotId.includes('/')) {
    const [pub, slot] = settings.adMobSlotId.split('/');
    if (pub) publisherId = pub.replace('ca-app-pub-', 'ca-pub-').trim();
    if (slot) slotId = slot.trim();
  } else {
    if (settings.adMobPublisherId?.trim()) {
      publisherId = settings.adMobPublisherId.trim().replace('ca-app-pub-', 'ca-pub-');
    }
    if (settings.adMobSlotId?.trim()) {
      slotId = settings.adMobSlotId.trim();
    }
  }

  const fullAdUnitId = `${publisherId.replace('ca-pub-', 'ca-app-pub-')}/${slotId}`;
  const isTestMode = settings.adTestMode === true;

  // Dynamic Google AdSense / AdMob script loader for live ad mode
  useEffect(() => {
    if (isTestMode) return;

    let scriptElement: HTMLScriptElement | null = null;
    const scriptSrc = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;

    if (!document.querySelector(`script[src*="adsbygoogle.js"]`)) {
      scriptElement = document.createElement('script');
      scriptElement.src = scriptSrc;
      scriptElement.async = true;
      scriptElement.crossOrigin = 'anonymous';
      scriptElement.onload = () => {
        try {
          // Push ad to adsbygoogle queue
          ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle =
            (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []).push({});
          setAdLoaded(true);
        } catch {
          setAdError(true);
        }
      };
      scriptElement.onerror = () => {
        setAdError(true);
      };
      document.head.appendChild(scriptElement);
    } else {
      try {
        ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle =
          (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []).push({});
        setAdLoaded(true);
      } catch {
        setAdError(true);
      }
    }
  }, [isTestMode, publisherId, slotId]);

  return (
    <aside
      aria-label="Sponsored Advertisement"
      className={`relative w-full overflow-hidden transition-all duration-300 ${
        position === 'bottom-docked'
          ? 'fixed bottom-[60px] left-0 right-0 z-20 flex justify-center px-2 py-1 pointer-events-none'
          : 'my-4 flex justify-center'
      } ${className}`}
    >
      <div
        className={`pointer-events-auto relative w-full max-w-[728px] rounded-xl border border-slate-200/90 bg-white/95 shadow-md backdrop-blur-md transition-all overflow-hidden ${
          position === 'bottom-docked' ? 'border-indigo-100 shadow-indigo-900/5' : ''
        }`}
      >
        {/* Ad Header / Badge Bar */}
        <div className="flex items-center justify-between px-2.5 py-0.5 bg-slate-100/90 border-b border-slate-200/70 text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-wider px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] shadow-2xs">
              Ad
            </span>
            <span className="font-semibold text-slate-700">Google AdMob</span>
            {isTestMode && (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded text-[9px] border border-emerald-300">
                Test Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Configure AdMob Publisher ID & Slot in Settings"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-200/70 transition cursor-pointer"
              >
                <SettingsIcon className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Config</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              title="Hide ad for this session"
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Ad Content Area: Real AdMob or Test Banner */}
        {!isTestMode && !adError ? (
          <div className="w-full flex flex-col items-center justify-center min-h-[50px] sm:min-h-[70px] bg-slate-50 overflow-hidden py-1 px-2">
            <ins
              ref={adRef}
              className="adsbygoogle block w-full text-center"
              style={{ display: 'block', minHeight: '50px' }}
              data-ad-client={publisherId}
              data-ad-slot={slotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
            <div className="w-full text-center text-[9px] text-slate-400 font-mono tracking-tight select-all">
              Unit: {fullAdUnitId}
            </div>
          </div>
        ) : (
          /* High-Quality AdMob Banner Slot (320x50 mobile / 728x90 desktop) with Active Unit ID */
          <div className="relative px-3 py-2 sm:py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-2 min-h-[50px] sm:min-h-[64px]">
            {/* Left Brand Badge & Unit ID */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white drop-shadow-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-100">
                    AdMob Banner
                  </h4>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    320x50 / 728x90
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/60 truncate select-all">
                    {fullAdUnitId}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-1">
                  Active Ad Unit: <strong className="text-white font-mono">{fullAdUnitId}</strong>
                </p>
              </div>
            </div>

            {/* Right Action / Info */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {onOpenSettings ? (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <SettingsIcon className="w-3 h-3" />
                  <span>Configure</span>
                </button>
              ) : (
                <a
                  href="https://admob.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition"
                >
                  <span>Google AdMob</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
