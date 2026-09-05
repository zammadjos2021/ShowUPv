import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { NavbarHeader } from './components/NavbarHeader';
import { BottomTabBar } from './components/BottomTabBar';
import { ClockTab } from './components/ClockTab';
import { HistoryTab } from './components/HistoryTab';
import { RemarksTab } from './components/RemarksTab';
import { SummaryTab } from './components/SummaryTab';
import { EditRecordModal } from './components/EditRecordModal';
import { PrintDTRModal } from './components/PrintDTRModal';
import { SettingsModal } from './components/SettingsModal';
import { ApkGuideModal } from './components/ApkGuideModal';
import { SplashScreen } from './components/SplashScreen';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import { NotificationBanner, AppBannerNotification } from './components/NotificationBanner';
import { AuthModal } from './components/AuthModal';
import { AdBanner } from './components/AdBanner';

import { TimeRecord, UserSettings, ActiveTab } from './types';
import { getInitialRecords } from './utils/timeCalculations';
import { exportToCSV, exportBackupJSON } from './utils/exportUtils';
import { sounds } from './utils/soundEffects';
import { registerPwaServiceWorker } from './utils/pwaNotifications';
import {
  auth,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  testFirestoreConnection,
} from './lib/firebase';
import {
  saveUserSettingsToFirestore,
  saveRecordToFirestore,
  deleteRecordFromFirestore,
  syncLocalRecordsToFirestore,
  subscribeToUserRecords,
} from './services/firestoreService';

const STORAGE_KEYS = {
  RECORDS: 'dtr_time_records_v1',
  SETTINGS: 'dtr_user_settings_v1',
  ACTIVE_SHIFT: 'dtr_active_shift_v1',
};

const DEFAULT_SETTINGS: UserSettings = {
  employeeName: 'John Doe',
  employeeId: 'EMP-2026-001',
  department: 'Operations',
  companyName: 'Acme Corporation',
  standardDailyHours: 8,
  defaultBreakMinutes: 60,
  defaultTimeIn: '09:00',
  defaultTimeOut: '18:00',
  timeFormat: '12h',
  adMobPublisherId: 'ca-pub-7009400724603043',
  adMobSlotId: '1845146236',
  adBannerEnabled: true,
  adTestMode: false,
};

export default function App() {
  // Load saved state from LocalStorage or seed defaults
  const [records, setRecords] = useState<TimeRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return getInitialRecords();
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          adMobPublisherId: parsed.adMobPublisherId?.trim() ? parsed.adMobPublisherId : 'ca-pub-7009400724603043',
          adMobSlotId: parsed.adMobSlotId?.trim() ? parsed.adMobSlotId : '1845146236',
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [activeShift, setActiveShift] = useState<{
    isActive: boolean;
    date: string;
    timeIn: string;
    remarks: string;
    tags: string[];
    breakDurationMinutes: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Active Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('clock');

  // Splash Screen state (shows upon opening the application)
  const [showSplash, setShowSplash] = useState(true);

  // Firebase Auth & Cloud Sync state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialCloudSyncRef = useRef(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isApkGuideOpen, setIsApkGuideOpen] = useState(false);
  const [isPrintDTROpen, setIsPrintDTROpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [isNotificationPromptOpen, setIsNotificationPromptOpen] = useState(false);

  // App Banner & Status Bar Notifications State
  const [activeBanners, setActiveBanners] = useState<AppBannerNotification[]>([]);

  // Test Firestore connection and setup Auth listener
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Automatically populate profile info if available
        if (user.displayName) {
          setSettings((prev) => ({
            ...prev,
            employeeName: prev.employeeName === 'John Doe' ? user.displayName! : prev.employeeName,
            profilePicture: prev.profilePicture || user.photoURL || undefined,
          }));
        }

        // Subscribe to user's records in Firestore
        const unsubscribeRecords = subscribeToUserRecords(user.uid, async (cloudRecords) => {
          if (cloudRecords && cloudRecords.length > 0) {
            setRecords(cloudRecords);
          } else if (!isInitialCloudSyncRef.current && records.length > 0) {
            // First time cloud setup: sync existing local records to user's Firestore subcollection
            isInitialCloudSyncRef.current = true;
            try {
              await syncLocalRecordsToFirestore(user.uid, records);
              await saveUserSettingsToFirestore(user.uid, settings, user.email);
            } catch (syncErr) {
              console.warn('Initial cloud migration notice:', syncErr);
            }
          }
        });

        return () => {
          unsubscribeRecords();
        };
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const handleTriggerNotification = (notif: {
    id: string;
    type: 'alarm' | 'note' | 'shift' | 'system';
    title: string;
    message: string;
    time?: string;
    date?: string;
  }) => {
    const bannerItem: AppBannerNotification = {
      ...notif,
      onDismiss: () => {
        setActiveBanners((prev) => prev.filter((b) => b.id !== notif.id));
      },
    };

    setActiveBanners((prev) => {
      // Prevent duplicates
      const filtered = prev.filter((b) => b.id !== notif.id);
      return [bannerItem, ...filtered].slice(0, 3);
    });
  };

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    } catch {
      // localstorage full or restricted
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // localstorage full or restricted
    }
  }, [settings]);

  useEffect(() => {
    try {
      if (activeShift) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFT, JSON.stringify(activeShift));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT);
      }
    } catch {
      // ignore
    }
  }, [activeShift]);

  // Initialize PWA Service Worker & Check for first-time notification permission prompt
  useEffect(() => {
    registerPwaServiceWorker();

    try {
      const answered = localStorage.getItem('showup_notification_prompt_answered');
      if (!answered) {
        const timer = setTimeout(() => {
          setIsNotificationPromptOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Handler: Save or Update Record from form
  const handleSaveRecord = (recordData: Omit<TimeRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existingIndex = records.findIndex((r) => r.date === recordData.date);
    let targetRecord: TimeRecord;

    if (existingIndex >= 0) {
      // Update existing record for that date
      const updated = [...records];
      targetRecord = {
        ...updated[existingIndex],
        ...recordData,
        updatedAt: Date.now(),
      };
      updated[existingIndex] = targetRecord;
      setRecords(updated);
    } else {
      // Create new record
      targetRecord = {
        ...recordData,
        id: 'rec-' + Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setRecords([targetRecord, ...records]);
    }

    // If user is authenticated, persist to user's Firestore records
    if (currentUser) {
      saveRecordToFirestore(currentUser.uid, targetRecord).catch((err) => {
        console.warn('Firestore auto-save record notice:', err);
      });
    }

    // If saving the active shift's date, clear active shift
    if (activeShift && activeShift.date === recordData.date) {
      setActiveShift(null);
    }
  };

  // Handler: Update Record from Modal
  const handleUpdateRecord = (updatedRecord: TimeRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );

    if (currentUser) {
      saveRecordToFirestore(currentUser.uid, updatedRecord).catch((err) => {
        console.warn('Firestore auto-update record notice:', err);
      });
    }
  };

  // Handler: Delete Record
  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));

    if (currentUser) {
      deleteRecordFromFirestore(currentUser.uid, id).catch((err) => {
        console.warn('Firestore auto-delete record notice:', err);
      });
    }
  };

  // Handler: Quick Clock In
  const handleClockIn = (date: string, timeIn: string, tags: string[], remarks: string) => {
    const newShift = {
      isActive: true,
      date,
      timeIn,
      remarks,
      tags,
      breakDurationMinutes: settings.defaultBreakMinutes || 60,
    };
    setActiveShift(newShift);
  };

  // Handler: Quick Clock Out
  const handleClockOut = (timeOut: string) => {
    if (!activeShift) return;

    // Calculate hours and save as completed record
    const [inH, inM] = activeShift.timeIn.split(':').map(Number);
    const [outH, outM] = timeOut.split(':').map(Number);
    let inMinutes = inH * 60 + inM;
    let outMinutes = outH * 60 + outM;
    if (outMinutes < inMinutes) outMinutes += 24 * 60;

    const grossMinutes = Math.max(0, outMinutes - inMinutes);
    const netMinutes = Math.max(0, grossMinutes - activeShift.breakDurationMinutes);
    const totalHours = parseFloat((netMinutes / 60).toFixed(2));

    handleSaveRecord({
      date: activeShift.date,
      timeIn: activeShift.timeIn,
      timeOut,
      breakDurationMinutes: activeShift.breakDurationMinutes,
      totalHours,
      remarks: activeShift.remarks,
      tags: activeShift.tags,
    });

    setActiveShift(null);
  };

  const handleCancelActiveShift = () => {
    if (confirm('Cancel active shift?')) {
      setActiveShift(null);
    }
  };

  // Handler: Reset to sample demo data
  const handleResetSampleData = () => {
    setRecords(getInitialRecords());
  };

  // Handler: Restore from JSON
  const handleRestoreRecords = (
    restoredRecords: TimeRecord[],
    restoredSettings?: UserSettings
  ) => {
    setRecords(restoredRecords);
    if (restoredSettings) {
      setSettings(restoredSettings);
    }
    if (currentUser) {
      syncLocalRecordsToFirestore(currentUser.uid, restoredRecords);
      if (restoredSettings) {
        saveUserSettingsToFirestore(currentUser.uid, restoredSettings, currentUser.email);
      }
    }
  };

  // Manual Cloud Sync
  const handleSyncAllToFirestore = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      await syncLocalRecordsToFirestore(currentUser.uid, records);
      await saveUserSettingsToFirestore(currentUser.uid, settings, currentUser.email);
    } catch (err) {
      console.error('Error manual syncing:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    sounds.playClick();
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    sounds.playClick();
    exportToCSV(records, settings);
  };

  const handleExportBackupJSON = () => {
    sounds.playClick();
    exportBackupJSON(records, settings);
  };

  // Compute live duration if shift active
  const activeShiftDuration = activeShift ? `Clocked in @ ${activeShift.timeIn}` : null;
  const remarksCount = records.filter((r) => r.remarks && r.remarks.trim().length > 0).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 pb-16">
      {/* Global Notification Banner with SUP Logo */}
      <NotificationBanner
        notifications={activeBanners}
        onDismissAll={() => setActiveBanners([])}
      />

      {/* Top Navigation Bar / Status Bar */}
      <NavbarHeader
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenApkGuide={() => setIsApkGuideOpen(true)}
        onOpenPrintDTR={() => setIsPrintDTROpen(true)}
        onExportCSV={handleExportCSV}
        onReplaySplash={() => setShowSplash(true)}
        activeShiftDuration={activeShiftDuration}
        settings={settings}
        unreadNotificationsCount={activeBanners.length}
        onOpenNotifications={() => {
          setActiveTab('clock');
        }}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'clock' && (
          <ClockTab
            records={records}
            onSaveRecord={handleSaveRecord}
            settings={settings}
            activeShift={activeShift}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onCancelActiveShift={handleCancelActiveShift}
            onTriggerNotification={handleTriggerNotification}
          />
        )}

        {activeTab === 'records' && (
          <HistoryTab
            records={records}
            onEditRecord={(record) => setEditingRecord(record)}
            onDeleteRecord={handleDeleteRecord}
            onNewRecord={() => setActiveTab('clock')}
            onExportCSV={handleExportCSV}
            onOpenPrintDTR={() => setIsPrintDTROpen(true)}
            settings={settings}
          />
        )}

        {activeTab === 'remarks' && (
          <RemarksTab
            records={records}
            onEditRecord={(record) => setEditingRecord(record)}
            onNewRecord={() => setActiveTab('clock')}
            settings={settings}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            records={records}
            settings={settings}
            onOpenPrintDTR={() => setIsPrintDTROpen(true)}
            onExportCSV={handleExportCSV}
            onExportBackupJSON={handleExportBackupJSON}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {/* Google AdMob / AdSense Web Banner Slot */}
        <AdBanner
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          position="inline"
        />

        {/* Visible Credits */}
        <div className="mt-6 mb-6 pb-2 text-center select-none">
          <p className="text-xs font-semibold text-slate-500 tracking-wide font-['Roboto',sans-serif]">
            <span className="font-bold text-slate-700">ShowUP 2026</span> by <span className="text-indigo-600 font-bold">samDEV</span>
          </p>
        </div>
      </main>

      {/* Bottom Segmented Tab Navigation Bar */}
      <BottomTabBar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          sounds.playClick();
          setActiveTab(tab);
        }}
        recordCount={records.length}
        remarksCount={remarksCount}
      />

      {/* Modals */}
      <EditRecordModal
        record={editingRecord}
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdateRecord}
        settings={settings}
      />

      <PrintDTRModal
        records={records}
        isOpen={isPrintDTROpen}
        onClose={() => setIsPrintDTROpen(false)}
        settings={settings}
      />

      <SettingsModal
        settings={settings}
        records={records}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          if (currentUser) {
            saveUserSettingsToFirestore(currentUser.uid, newSettings, currentUser.email);
          }
        }}
        onRestoreRecords={handleRestoreRecords}
        onResetSampleData={handleResetSampleData}
        currentUser={currentUser}
        onOpenAuth={() => {
          setIsSettingsOpen(false);
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onSyncNow={handleSyncAllToFirestore}
        isSyncing={isSyncing}
      />

      {/* Account Sign In & Cloud Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSyncNow={handleSyncAllToFirestore}
        isSyncing={isSyncing}
      />

      <ApkGuideModal
        isOpen={isApkGuideOpen}
        onClose={() => setIsApkGuideOpen(false)}
      />

      {/* First-time Notification & Alarm Permission Prompt */}
      <NotificationPermissionModal
        isOpen={isNotificationPromptOpen}
        onClose={() => setIsNotificationPromptOpen(false)}
        onPermissionDecided={(status) => {
          if (status === 'granted') {
            setSettings((prev) => ({ ...prev, enableNotifications: true }));
          } else {
            setSettings((prev) => ({ ...prev, enableNotifications: false }));
          }
        }}
      />

      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            onComplete={() => setShowSplash(false)}
            employeeName={settings.employeeName}
            companyName={settings.companyName}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
