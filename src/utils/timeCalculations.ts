import { TimeRecord } from '../types';

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object to HH:mm string (24-hour format)
 */
export function formatTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats HH:mm (24h) to 12-hour format with AM/PM (e.g. 08:30 AM)
 */
export function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const formattedHours = String(hours).padStart(2, '0');
  return `${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Converts formatted string depending on user preference
 */
export function displayTime(timeStr: string, format: '12h' | '24h' = '12h'): string {
  if (!timeStr) return '--:--';
  if (format === '12h') {
    return formatTimeTo12Hour(timeStr);
  }
  return timeStr;
}

/**
 * Calculates net hours between timeIn and timeOut minus break minutes
 */
export const COMMON_TAGS = [
  'Regular Shift',
  'Holiday / Special Day',
  'Office',
  'WFH (Remote)',
  'Weekend OT',
  'Saturday OT',
  'Sunday OT',
  'Overtime',
  'Absent',
  'Site Visit',
  'Client Meeting',
  'Half Day',
  'Late - Traffic',
  'Official Business',
  'Training',
  'Sick Leave',
  'Vacation Leave',
  'Emergency Leave'
];

/**
 * Checks if a given date string (YYYY-MM-DD) falls on a weekend (Saturday or Sunday)
 */
export function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

/**
 * Returns whether the date is specifically Saturday
 */
export function isSaturday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d.getTime()) && d.getDay() === 6;
}

/**
 * Returns whether the date is specifically Sunday
 */
export function isSunday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d.getTime()) && d.getDay() === 0;
}

/**
 * Returns standard day name and short day code
 */
export function getDayInfo(dateStr: string): { dayName: string; shortDay: string; dayIndex: number; isWeekend: boolean } {
  if (!dateStr) return { dayName: '', shortDay: '', dayIndex: -1, isWeekend: false };
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return { dayName: '', shortDay: '', dayIndex: -1, isWeekend: false };
  const dayIndex = d.getDay();
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const shortDay = d.toLocaleDateString('en-US', { weekday: 'short' });
  const isWk = dayIndex === 0 || dayIndex === 6;
  return { dayName, shortDay, dayIndex, isWeekend: isWk };
}

/**
 * Checks if a record is tagged or recorded as an Absence
 */
export function isRecordAbsent(record: Partial<TimeRecord>): boolean {
  if (!record) return false;
  if (record.isHoliday) return false;
  if (record.tags && record.tags.includes('Absent')) return true;
  if (!record.timeIn && !record.timeOut) return true;
  return false;
}

/**
 * Computes the 5-day work week breakdown for a record:
 * - Mon-Fri: Standard up to standardDailyHours (e.g. 8h) is Regular, excess is Overtime
 * - Sat & Sun: 100% of hours worked are marked as Overtime
 */
export function calculateRecordBreakdown(
  record: Partial<TimeRecord>,
  standardDailyHours: number = 8
): {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  isWeekend: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isOvertime: boolean;
  overtimeType: 'weekend' | 'weekday' | 'none';
} {
  const total = record.totalHours || 0;
  if (isRecordAbsent(record) || total <= 0) {
    return {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      isWeekend: isWeekend(record.date || ''),
      isSaturday: isSaturday(record.date || ''),
      isSunday: isSunday(record.date || ''),
      isOvertime: false,
      overtimeType: 'none'
    };
  }

  const dateStr = record.date || '';
  const sat = isSaturday(dateStr);
  const sun = isSunday(dateStr);
  const wk = sat || sun;

  if (wk) {
    // Saturday & Sunday: All hours are Overtime (Rest Day / Weekend OT)
    return {
      totalHours: total,
      regularHours: 0,
      overtimeHours: total,
      isWeekend: true,
      isSaturday: sat,
      isSunday: sun,
      isOvertime: true,
      overtimeType: 'weekend'
    };
  }

  // Weekday (Monday - Friday 5-day schedule)
  const regularHours = Math.min(total, standardDailyHours);
  const overtimeHours = Math.max(0, total - standardDailyHours);

  return {
    totalHours: total,
    regularHours,
    overtimeHours,
    isWeekend: false,
    isSaturday: false,
    isSunday: false,
    isOvertime: overtimeHours > 0 || (record.tags?.includes('Overtime') ?? false),
    overtimeType: overtimeHours > 0 ? 'weekday' : 'none'
  };
}

export function calculateNetHours(timeIn: string, timeOut: string, breakMinutes: number = 0): number {
  if (!timeIn || !timeOut) return 0;

  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);

  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;

  let inTotalMinutes = inH * 60 + inM;
  let outTotalMinutes = outH * 60 + outM;

  // Handle overnight shift if timeOut is earlier in day clock than timeIn
  if (outTotalMinutes < inTotalMinutes) {
    outTotalMinutes += 24 * 60;
  }

  const grossMinutes = Math.max(0, outTotalMinutes - inTotalMinutes);
  const netMinutes = Math.max(0, grossMinutes - (breakMinutes || 0));

  return parseFloat((netMinutes / 60).toFixed(2));
}

/**
 * Formats decimal hours into a clean "8h 30m" string
 */
export function formatHoursAndMinutes(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return '0h 00m';
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Pre-populated seed records for demo / initial launch
 */
export function getInitialRecords(): TimeRecord[] {
  const today = new Date();
  
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return formatDate(d);
  };

  return [
    {
      id: 'rec-1',
      date: getPastDateStr(4),
      timeIn: '09:00',
      timeOut: '18:00',
      breakDurationMinutes: 60,
      totalHours: 8.0,
      remarks: 'Regular office shift. Completed client sprint review and deployed v1.4 release.',
      tags: ['Office', 'Completed Task'],
      createdAt: Date.now() - 4 * 86400000,
      updatedAt: Date.now() - 4 * 86400000,
    },
    {
      id: 'rec-2',
      date: getPastDateStr(3),
      timeIn: '08:45',
      timeOut: '19:15',
      breakDurationMinutes: 60,
      totalHours: 9.5,
      remarks: 'Overtime approved by lead. Prepared quarterly compliance paperwork and data backups.',
      tags: ['Office', 'Overtime', 'Approved'],
      createdAt: Date.now() - 3 * 86400000,
      updatedAt: Date.now() - 3 * 86400000,
    },
    {
      id: 'rec-3',
      date: getPastDateStr(2),
      timeIn: '09:00',
      timeOut: '18:00',
      breakDurationMinutes: 60,
      totalHours: 8.0,
      remarks: 'Work from home (WFH). Conducted remote sprint planning & architecture sync.',
      tags: ['WFH', 'Meeting'],
      createdAt: Date.now() - 2 * 86400000,
      updatedAt: Date.now() - 2 * 86400000,
    },
    {
      id: 'rec-4',
      date: getPastDateStr(1),
      timeIn: '09:00',
      timeOut: '18:00',
      breakDurationMinutes: 60,
      totalHours: 8.0,
      remarks: 'Client on-site inspection in morning; returned to HQ for afternoon deliverables.',
      tags: ['Site Visit', 'Office'],
      createdAt: Date.now() - 1 * 86400000,
      updatedAt: Date.now() - 1 * 86400000,
    }
  ];
}
