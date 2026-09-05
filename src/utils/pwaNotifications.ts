// Web Push & PWA Notification Utility for ShowUp

export async function requestPwaNotificationPermission(): Promise<NotificationPermission> {
  // Support Expo / React Native Webview environment
  const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  if (globalObj) {
    const expoNotifications = (globalObj.ExpoNotifications || globalObj.Notifications) as {
      requestPermissionsAsync?: () => Promise<{ status: string; granted: boolean }>;
    } | undefined;

    if (expoNotifications && typeof expoNotifications.requestPermissionsAsync === 'function') {
      try {
        const expoResult = await expoNotifications.requestPermissionsAsync();
        return expoResult.granted || expoResult.status === 'granted' ? 'granted' : 'denied';
      } catch (err) {
        console.warn('Expo Notifications request error:', err);
      }
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported in this browser environment');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    // Callback style fallback for legacy browsers
    return new Promise((resolve) => {
      try {
        Notification.requestPermission((perm) => {
          resolve(perm);
        });
      } catch {
        resolve('denied');
      }
    });
  }
}

export async function showPwaPushNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    const perm = await requestPwaNotificationPermission();
    if (perm !== 'granted') return false;
  }

  try {
    // Try service worker notification first (better background & mobile PWA delivery)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          icon: '/showup-icon-192.png',
          badge: '/showup-icon-192.png',
          ...options,
        } as NotificationOptions);
        return true;
      }
    }

    // Fallback to standard window Notification
    new Notification(title, {
      icon: '/showup-icon-192.png',
      ...options,
    });
    return true;
  } catch (err) {
    console.warn('Failed to send notification:', err);
    try {
      new Notification(title, {
        icon: '/showup-icon-192.png',
        ...options,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export function playChimeSound(freq: number = 880): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const playNote = (pitch: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playNote(freq, 0, 0.22);
    playNote(freq * 1.25, 0.15, 0.25);
    playNote(freq * 1.5, 0.3, 0.35);
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

export function registerPwaServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('PWA ServiceWorker registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA ServiceWorker registration skipped/failed:', err);
        });
    });
  }
}

export function syncPwaSchedules(alarms: unknown[], notes: unknown[]): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_SCHEDULE',
      alarms,
      notes,
    });
  }
}
