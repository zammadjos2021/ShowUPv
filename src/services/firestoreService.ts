import {
  db,
  doc,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from '../lib/firebase';
import { TimeRecord, UserSettings } from '../types';

/**
 * Saves or updates user settings & profile document in Firestore
 */
export async function saveUserSettingsToFirestore(
  userId: string,
  settings: UserSettings,
  email?: string | null
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        employeeName: settings.employeeName || '',
        employeeId: settings.employeeId || '',
        department: settings.department || '',
        companyName: settings.companyName || '',
        profilePicture: settings.profilePicture || '',
        standardDailyHours: settings.standardDailyHours || 8,
        defaultBreakMinutes: settings.defaultBreakMinutes || 60,
        defaultTimeIn: settings.defaultTimeIn || '09:00',
        defaultTimeOut: settings.defaultTimeOut || '18:00',
        timeFormat: settings.timeFormat || '12h',
        email: email || '',
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving user settings to Firestore:', err);
    throw err;
  }
}

/**
 * Saves a single time record to user's subcollection in Firestore
 */
export async function saveRecordToFirestore(
  userId: string,
  record: TimeRecord
): Promise<void> {
  try {
    const recordRef = doc(db, 'users', userId, 'records', record.id);
    await setDoc(
      recordRef,
      {
        id: record.id,
        date: record.date,
        timeIn: record.timeIn,
        timeOut: record.timeOut || '',
        breakDurationMinutes: record.breakDurationMinutes || 0,
        totalHours: record.totalHours || 0,
        remarks: record.remarks || '',
        tags: record.tags || [],
        createdAt: record.createdAt || Date.now(),
        updatedAt: record.updatedAt || Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving record to Firestore:', err);
    throw err;
  }
}

/**
 * Deletes a single time record from user's subcollection in Firestore
 */
export async function deleteRecordFromFirestore(
  userId: string,
  recordId: string
): Promise<void> {
  try {
    const recordRef = doc(db, 'users', userId, 'records', recordId);
    await deleteDoc(recordRef);
  } catch (err) {
    console.error('Error deleting record from Firestore:', err);
    throw err;
  }
}

/**
 * Syncs multiple records to user's subcollection (used when migrating or restoring)
 */
export async function syncLocalRecordsToFirestore(
  userId: string,
  records: TimeRecord[]
): Promise<void> {
  try {
    const promises = records.map((rec) => saveRecordToFirestore(userId, rec));
    await Promise.all(promises);
  } catch (err) {
    console.error('Error batch syncing records to Firestore:', err);
    throw err;
  }
}

/**
 * Fetches all user records from Firestore once
 */
export async function fetchUserRecordsFromFirestore(
  userId: string
): Promise<TimeRecord[]> {
  try {
    const recordsCol = collection(db, 'users', userId, 'records');
    const snapshot = await getDocs(recordsCol);
    const list: TimeRecord[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as TimeRecord);
    });
    // Sort descending by date
    list.sort((a, b) => (b.date > a.date ? 1 : -1));
    return list;
  } catch (err) {
    console.error('Error fetching user records from Firestore:', err);
    return [];
  }
}

/**
 * Real-time listener for user records
 */
export function subscribeToUserRecords(
  userId: string,
  onUpdate: (records: TimeRecord[]) => void
): () => void {
  const recordsCol = collection(db, 'users', userId, 'records');
  const unsubscribe = onSnapshot(
    recordsCol,
    (snapshot) => {
      const list: TimeRecord[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as TimeRecord);
      });
      list.sort((a, b) => (b.date > a.date ? 1 : -1));
      onUpdate(list);
    },
    (error) => {
      console.warn('Firestore records subscription notice:', error.message);
    }
  );

  return unsubscribe;
}
