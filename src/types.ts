export interface TimeRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:mm (24-hour format)
  timeOut: string; // HH:mm (24-hour format) or empty
  breakDurationMinutes: number; // e.g. 60 min
  totalHours: number; // calculated decimal hours e.g. 8.5
  remarks: string; // user notes
  tags: string[]; // e.g. ["Office", "WFH", "Overtime", "Site Visit", "Meeting", "Late"]
  isHoliday?: boolean; // Tagged as holiday / special day
  holidayName?: string; // Optional holiday title (e.g., Christmas Day, Regular Holiday)
  createdAt: number;
  updatedAt: number;
}

export interface UserSettings {
  employeeName: string;
  employeeId: string;
  department: string;
  companyName: string;
  profilePicture?: string; // base64 Data URL or image URL; empty/undefined = default avatar
  standardDailyHours: number; // default 8
  defaultBreakMinutes: number; // default 60
  defaultTimeIn?: string; // default "09:00"
  defaultTimeOut?: string; // default "18:00"
  timeFormat: '12h' | '24h';
  adMobPublisherId?: string; // e.g. "ca-pub-xxxxxxxxxxxxxxxx"
  adMobSlotId?: string; // e.g. "1234567890"
  adBannerEnabled?: boolean; // toggle ad banner slot visibility
  adTestMode?: boolean; // display AdMob test banner or real Google Ads
}

export type ActiveTab = 'clock' | 'records' | 'remarks' | 'summary';

export interface ShiftNote {
  id: string;
  date: string;
  title: string;
  content: string;
  createdAt: string;
  reminderDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:mm
  reminderEnabled?: boolean;
  notified?: boolean;
  completed?: boolean;
}

export interface ShiftAlarm {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
}
