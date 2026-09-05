import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Calendar as CalendarIcon, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Timer, 
  Coffee,
  Sparkles,
  AlertCircle,
  UserX,
  RotateCcw,
  Save,
  Bell,
  BellRing,
  BellOff,
  StickyNote,
  Plus,
  Trash2,
  Check,
  Volume2,
  CheckSquare,
  Square,
  CalendarClock,
  Send,
  Radio,
  Smartphone,
  ExternalLink,
  X
} from 'lucide-react';
import { TimeRecord, UserSettings, ShiftNote, ShiftAlarm } from '../types';
import { 
  formatDate, 
  formatTime, 
  calculateNetHours, 
  formatHoursAndMinutes,
  displayTime,
  COMMON_TAGS,
  isRecordAbsent,
  isWeekend,
  isSaturday,
  isSunday,
  getDayInfo,
  calculateRecordBreakdown
} from '../utils/timeCalculations';
import { sounds } from '../utils/soundEffects';
import { showPwaPushNotification } from '../utils/pwaNotifications';

interface ClockTabProps {
  records: TimeRecord[];
  onSaveRecord: (record: Omit<TimeRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  settings: UserSettings;
  activeShift: {
    isActive: boolean;
    date: string;
    timeIn: string;
    remarks: string;
    tags: string[];
    breakDurationMinutes: number;
  } | null;
  onClockIn: (date: string, timeIn: string, tags: string[], remarks: string) => void;
  onClockOut: (timeOut: string) => void;
  onCancelActiveShift: () => void;
  onTriggerNotification?: (notif: { id: string; type: 'alarm' | 'note' | 'shift' | 'system'; title: string; message: string; time?: string; date?: string }) => void;
}


export const ClockTab: React.FC<ClockTabProps> = ({
  records,
  onSaveRecord,
  settings,
  activeShift,
  onClockIn,
  onClockOut,
  onCancelActiveShift,
  onTriggerNotification,
}) => {
  // Current time state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Form input state
  const [selectedDate, setSelectedDate] = useState<string>(formatDate());
  const [timeIn, setTimeIn] = useState<string>(settings.defaultTimeIn || '09:00');
  const [timeOut, setTimeOut] = useState<string>(settings.defaultTimeOut || '18:00');
  const [breakMinutes, setBreakMinutes] = useState<number>(settings.defaultBreakMinutes || 60);
  const [remarks, setRemarks] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Regular Shift', 'Office']);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [holidayName, setHolidayName] = useState<string>('Regular Holiday');
  const [showToast, setShowToast] = useState<string | null>(null);

  // --- SAVED NOTES & TASKS ---
  const [notes, setNotes] = useState<ShiftNote[]>(() => {
    try {
      const saved = localStorage.getItem('showup_shift_notes');
      return saved ? JSON.parse(saved) : [
        {
          id: 'note-1',
          date: formatDate(),
          title: 'Daily Task Checklist',
          content: 'Submit client sprint report & review timesheets before payroll cutoff.',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          reminderDate: formatDate(),
          reminderTime: '18:00',
          reminderEnabled: true,
          notified: false,
          completed: false
        }
      ];
    } catch {
      return [];
    }
  });

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteReminderDate, setNoteReminderDate] = useState(formatDate());
  const [noteReminderTime, setNoteReminderTime] = useState('18:00');
  const [noteReminderEnabled, setNoteReminderEnabled] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [activeNoteAlert, setActiveNoteAlert] = useState<ShiftNote | null>(null);

  // Persist notes
  useEffect(() => {
    localStorage.setItem('showup_shift_notes', JSON.stringify(notes));
  }, [notes]);

  const handleAddNote = () => {
    if (!noteContent.trim() && !noteTitle.trim()) return;
    const newNote: ShiftNote = {
      id: `note-${Date.now()}`,
      date: selectedDate,
      title: noteTitle.trim() || 'Shift Task',
      content: noteContent.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reminderDate: noteReminderEnabled ? noteReminderDate : undefined,
      reminderTime: noteReminderEnabled ? noteReminderTime : undefined,
      reminderEnabled: noteReminderEnabled,
      notified: false,
      completed: false
    };

    setNotes([newNote, ...notes]);
    setNoteTitle('');
    setNoteContent('');
    setIsAddingNote(false);
    sounds.playSuccess();

    setShowToast(noteReminderEnabled ? `Note & Reminder set for ${noteReminderDate} ${noteReminderTime}!` : 'Note saved!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleToggleTaskCompleted = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, completed: !n.completed } : n));
    sounds.playClick();
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    sounds.playClick();
  };

  const handleTestPushNote = (note: ShiftNote) => {
    triggerAlarmSound();
    setActiveNoteAlert(note);
    showPwaPushNotification(`ShowUp Task Alert: ${note.title}`, {
      body: note.content || 'Your scheduled shift task is due!',
      icon: '/showup-sup-logo.png',
      tag: `showup-note-${note.id}`
    });
    onTriggerNotification?.({
      id: `note-${Date.now()}`,
      type: 'note',
      title: `Task Alert: ${note.title}`,
      message: note.content || 'Scheduled shift task reminder is due!',
      time: note.reminderTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: note.reminderDate || formatDate()
    });
    setShowToast(`Reminder banner & alarm triggered for "${note.title}"`);
    setTimeout(() => setShowToast(null), 3000);
  };

  // --- SHIFT ALARM STATE ---
  const [alarms, setAlarms] = useState<ShiftAlarm[]>(() => {
    try {
      const saved = localStorage.getItem('showup_shift_alarms');
      return saved ? JSON.parse(saved) : [
        { id: 'alarm-1', label: 'Lunch Break Reminder', time: '12:00', enabled: true },
        { id: 'alarm-2', label: 'Shift End / Clock Out', time: '18:00', enabled: true }
      ];
    } catch {
      return [];
    }
  });
  const [newAlarmTime, setNewAlarmTime] = useState('18:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('End of Shift');
  const [isAddingAlarm, setIsAddingAlarm] = useState(false);
  const [ringingAlarm, setRingingAlarm] = useState<{ id: string; label: string; time: string } | null>(null);

  // Persist alarms
  useEffect(() => {
    localStorage.setItem('showup_shift_alarms', JSON.stringify(alarms));
  }, [alarms]);

  // Alarm sound generator
  const triggerAlarmSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const playBeep = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + timeOffset);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.3);
      };
      playBeep(0);
      playBeep(0.35);
      playBeep(0.7);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  };

  // Check scheduled notes and alarms every second
  useEffect(() => {
    const checkScheduledNotifications = () => {
      const now = new Date();
      const todayString = formatDate(now);
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentSeconds = now.getSeconds();

      // 1. Check Shift Alarms
      const matchedAlarm = alarms.find(a => a.enabled && a.time === currentHHMM);
      if (matchedAlarm && currentSeconds < 2) {
        setRingingAlarm({ id: matchedAlarm.id, label: matchedAlarm.label, time: matchedAlarm.time });
        triggerAlarmSound();
        showPwaPushNotification(`ShowUp Alarm: ${matchedAlarm.label}`, {
          body: `Scheduled time is ${matchedAlarm.time} - Shift alarm ringing!`,
          icon: '/showup-sup-logo.png',
          tag: `showup-alarm-${matchedAlarm.id}`
        });
        onTriggerNotification?.({
          id: `alarm-${Date.now()}`,
          type: 'alarm',
          title: `Alarm: ${matchedAlarm.label}`,
          message: `Scheduled shift alert triggered at ${matchedAlarm.time}.`,
          time: matchedAlarm.time,
          date: todayString
        });
      }

      // 2. Check Shift Notes & Tasks with Date + Time Reminders
      notes.forEach((note) => {
        if (
          note.reminderEnabled &&
          !note.notified &&
          note.reminderDate &&
          note.reminderTime &&
          note.reminderDate === todayString &&
          note.reminderTime === currentHHMM &&
          currentSeconds < 2
        ) {
          triggerAlarmSound();
          setActiveNoteAlert(note);
          showPwaPushNotification(`ShowUp Task Due: ${note.title}`, {
            body: note.content || 'Your scheduled shift task is due now.',
            icon: '/showup-sup-logo.png',
            tag: `showup-note-due-${note.id}`
          });
          onTriggerNotification?.({
            id: `note-${Date.now()}`,
            type: 'note',
            title: `Task Due: ${note.title}`,
            message: note.content || 'Your scheduled shift task is due now.',
            time: note.reminderTime,
            date: note.reminderDate
          });

          // Mark as notified so it doesn't trigger on every tick
          setNotes(prev => prev.map(n => n.id === note.id ? { ...n, notified: true } : n));
        }
      });
    };

    checkScheduledNotifications();
    const interval = setInterval(checkScheduledNotifications, 1000);
    return () => clearInterval(interval);
  }, [alarms, notes]);

  const handleToggleAlarm = (id: string) => {
    setAlarms(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    sounds.playClick();
  };

  const handleAddAlarm = () => {
    if (!newAlarmTime) return;
    const newA: ShiftAlarm = {
      id: `alarm-${Date.now()}`,
      label: newAlarmLabel.trim() || 'Shift Alert',
      time: newAlarmTime,
      enabled: true
    };
    setAlarms([...alarms, newA]);
    setIsAddingAlarm(false);
    sounds.playSuccess();
    setShowToast('Alarm set!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms(alarms.filter(a => a.id !== id));
    sounds.playClick();
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync with existing record for selected date if one exists
  useEffect(() => {
    const existing = records.find(r => r.date === selectedDate);
    if (existing) {
      setTimeIn(existing.timeIn);
      setTimeOut(existing.timeOut || '');
      setBreakMinutes(existing.breakDurationMinutes);
      setRemarks(existing.remarks || '');
      setSelectedTags(existing.tags || []);
      setIsHoliday(Boolean(existing.isHoliday));
      setHolidayName(existing.holidayName || 'Regular Holiday');
    } else if (activeShift && activeShift.date === selectedDate) {
      setTimeIn(activeShift.timeIn);
      setTimeOut('');
      setBreakMinutes(activeShift.breakDurationMinutes);
      setRemarks(activeShift.remarks);
      setSelectedTags(activeShift.tags);
      setIsHoliday(false);
      setHolidayName('Regular Holiday');
    } else {
      setIsHoliday(false);
      setHolidayName('Regular Holiday');
    }
  }, [selectedDate, records, activeShift]);

  // Elapsed active shift time calculation
  const [elapsedActiveDuration, setElapsedActiveDuration] = useState<string>('00:00:00');

  useEffect(() => {
    if (!activeShift?.isActive) return;

    const calculateElapsed = () => {
      const [inH, inM] = activeShift.timeIn.split(':').map(Number);
      const now = new Date();
      const shiftStart = new Date();
      shiftStart.setHours(inH, inM, 0, 0);

      let diffMs = now.getTime() - shiftStart.getTime();
      if (diffMs < 0) diffMs = 0; // Guard

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setElapsedActiveDuration(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // Check selected date day properties
  const selectedDayInfo = getDayInfo(selectedDate);
  const isWeekendSelected = isWeekend(selectedDate);
  const isSatSelected = isSaturday(selectedDate);
  const isSunSelected = isSunday(selectedDate);

  // Real-time calculation of net work hours & overtime
  const isAbsentMode = !isHoliday && ((!timeIn && !timeOut) || selectedTags.includes('Absent'));
  const calculatedHours = (isHoliday || isAbsentMode) && (!timeIn || !timeOut) ? 0 : calculateNetHours(timeIn, timeOut, breakMinutes);
  
  // 5-Day Work Week Policy: Saturday & Sunday are 100% Overtime; Mon-Fri is excess above standard hours
  const overtime = isWeekendSelected 
    ? calculatedHours 
    : Math.max(0, calculatedHours - (settings.standardDailyHours || 8));

  // Quick tag toggle
  const toggleTag = (tag: string) => {
    sounds.playClick();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
      if (tag === 'Holiday / Special Day') {
        setIsHoliday(false);
      }
    } else {
      setSelectedTags([...selectedTags, tag]);
      if (tag === 'Holiday / Special Day') {
        setIsHoliday(true);
      }
    }
  };

  const handleMarkAsAbsent = () => {
    sounds.playClick();
    setTimeIn('');
    setTimeOut('');
    setBreakMinutes(0);
    setIsHoliday(false);
    if (!selectedTags.includes('Absent')) {
      setSelectedTags(['Absent', ...selectedTags.filter(t => t !== 'Regular Shift' && t !== 'Saturday OT' && t !== 'Sunday OT' && t !== 'Weekend OT' && t !== 'Holiday / Special Day')]);
    }
    if (!remarks.trim() || remarks.startsWith('Official Holiday')) {
      setRemarks('Absent');
    }
    triggerToast(`Tagged as Absent for ${selectedDate} (Editable anytime)`);
  };

  const handleClearAbsentMode = () => {
    sounds.playClick();
    setTimeIn(settings.defaultTimeIn || '09:00');
    setTimeOut(settings.defaultTimeOut || '18:00');
    setBreakMinutes(settings.defaultBreakMinutes || 60);
    const tagsWithoutAbsent = selectedTags.filter(t => t !== 'Absent');
    if (isWeekendSelected) {
      const otTag = isSatSelected ? 'Saturday OT' : 'Sunday OT';
      if (!tagsWithoutAbsent.includes(otTag)) {
        tagsWithoutAbsent.push(otTag);
      }
    }
    setSelectedTags(tagsWithoutAbsent);
    if (remarks === 'Absent') {
      setRemarks('');
    }
  };

  const handleSaveHolidayWithoutTimes = () => {
    sounds.playSuccess();
    setTimeIn('');
    setTimeOut('');
    setBreakMinutes(0);
    setIsHoliday(true);
    const finalHName = holidayName.trim() || 'Regular Holiday';
    const updatedTags = selectedTags.filter(t => t !== 'Absent' && t !== 'Regular Shift');
    if (!updatedTags.includes('Holiday / Special Day')) {
      updatedTags.unshift('Holiday / Special Day');
    }
    setSelectedTags(updatedTags);
    const finalRemark = remarks.trim() && remarks !== 'Absent' ? remarks : `Official Holiday: ${finalHName}`;
    setRemarks(finalRemark);

    // Save directly to records & database with no time in or out!
    onSaveRecord({
      date: selectedDate,
      timeIn: '',
      timeOut: '',
      breakDurationMinutes: 0,
      totalHours: 0,
      remarks: finalRemark,
      tags: updatedTags,
      isHoliday: true,
      holidayName: finalHName,
    });

    triggerToast(`Saved as Official Holiday (No In/Out) for ${selectedDate}!`);
  };

  const handleClearHolidayMode = () => {
    sounds.playClick();
    setIsHoliday(false);
    setTimeIn(settings.defaultTimeIn || '09:00');
    setTimeOut(settings.defaultTimeOut || '18:00');
    setBreakMinutes(settings.defaultBreakMinutes || 60);
    const tagsWithoutHoliday = selectedTags.filter(t => t !== 'Holiday / Special Day');
    if (isWeekendSelected) {
      const otTag = isSatSelected ? 'Saturday OT' : 'Sunday OT';
      if (!tagsWithoutHoliday.includes(otTag)) {
        tagsWithoutHoliday.push(otTag);
      }
    }
    setSelectedTags(tagsWithoutHoliday);
    if (remarks.startsWith('Official Holiday')) {
      setRemarks('');
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTagInput.trim()) return;
    if (!selectedTags.includes(customTagInput.trim())) {
      setSelectedTags([...selectedTags, customTagInput.trim()]);
    }
    setCustomTagInput('');
  };

  // One-tap quick punch handlers
  const handleQuickClockIn = () => {
    sounds.playClockIn();
    const nowStr = formatTime();
    const todayStr = formatDate();
    setSelectedDate(todayStr);
    setTimeIn(nowStr);
    setTimeOut('');
    // Ensure Absent is removed if clocking in
    let tagsWithoutAbsent = selectedTags.filter(t => t !== 'Absent');
    if (isWeekend(todayStr)) {
      const otTag = isSaturday(todayStr) ? 'Saturday OT' : 'Sunday OT';
      if (!tagsWithoutAbsent.includes(otTag)) {
        tagsWithoutAbsent = [otTag, ...tagsWithoutAbsent];
      }
    }
    setSelectedTags(tagsWithoutAbsent);
    onClockIn(todayStr, nowStr, tagsWithoutAbsent, remarks);
    triggerToast(`Clocked In at ${displayTime(nowStr, settings.timeFormat)}`);
  };

  const handleQuickClockOut = () => {
    sounds.playClockOut();
    const nowStr = formatTime();
    setTimeOut(nowStr);
    onClockOut(nowStr);
    triggerToast(`Clocked Out at ${displayTime(nowStr, settings.timeFormat)}`);
  };

  const handleSetTimeInNow = () => {
    sounds.playClick();
    const nowStr = formatTime();
    setTimeIn(nowStr);
    if (selectedTags.includes('Absent')) {
      setSelectedTags(selectedTags.filter(t => t !== 'Absent'));
    }
  };

  const handleSetTimeOutNow = () => {
    sounds.playClick();
    const nowStr = formatTime();
    setTimeOut(nowStr);
  };

  const handleSetDateToday = () => {
    sounds.playClick();
    const todayStr = formatDate();
    setSelectedDate(todayStr);
  };

  const handleSetDateYesterday = () => {
    sounds.playClick();
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDate(d));
  };

  const handleSaveManualRecord = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClockIn();

    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    let finalTags = [...selectedTags];
    let finalHours = calculatedHours;

    // If no timeIn & no timeOut is input, tag it as Absent automatically UNLESS marked as Holiday
    if (!timeIn && !timeOut) {
      if (isHoliday) {
        if (!finalTags.includes('Holiday / Special Day')) {
          finalTags = ['Holiday / Special Day', ...finalTags.filter(t => t !== 'Absent')];
        }
        finalHours = 0;
      } else {
        if (!finalTags.includes('Absent')) {
          finalTags = ['Absent', ...finalTags];
        }
        finalHours = 0;
      }
    } else if (timeIn && timeOut && finalTags.includes('Absent')) {
      finalTags = finalTags.filter(t => t !== 'Absent');
    }

    // Auto-attach Weekend Overtime tag if recorded on Saturday or Sunday with active hours
    if (isWeekendSelected && finalHours > 0 && !finalTags.includes('Absent') && !isHoliday) {
      const wkTag = isSatSelected ? 'Saturday OT' : 'Sunday OT';
      if (!finalTags.includes(wkTag) && !finalTags.includes('Weekend OT') && !finalTags.includes('Overtime')) {
        finalTags = [wkTag, ...finalTags];
      }
    }

    onSaveRecord({
      date: selectedDate,
      timeIn: timeIn || '',
      timeOut: timeOut || '',
      breakDurationMinutes: breakMinutes,
      totalHours: finalHours,
      remarks,
      tags: finalTags,
      isHoliday,
      holidayName: isHoliday ? holidayName.trim() || 'Regular Holiday' : undefined,
    });

    if (isHoliday && (!timeIn || !timeOut)) {
      triggerToast(`Saved as Official Holiday (No In/Out) for ${selectedDate}!`);
    } else if (!timeIn && !timeOut) {
      triggerToast(`Tagged as Absent for ${selectedDate} (Editable anytime)`);
    } else if (isWeekendSelected) {
      triggerToast(`Weekend Overtime saved for ${selectedDayInfo.dayName} (${selectedDate})!`);
    } else {
      triggerToast(`Record for ${selectedDate} saved successfully!`);
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(null);
    }, 3000);
  };

  // Formatted date string for live clock
  const formattedTodayDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const liveHours = String(currentTime.getHours()).padStart(2, '0');
  const liveMinutes = String(currentTime.getMinutes()).padStart(2, '0');
  const liveSeconds = String(currentTime.getSeconds()).padStart(2, '0');
  const liveAmPm = currentTime.getHours() >= 12 ? 'PM' : 'AM';

  // Compute weekly stats for top metric cards
  const now = new Date();
  const currentWeekRecords = records.filter((r) => {
    const recDate = new Date(r.date + 'T00:00:00');
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    return recDate >= startOfWeek;
  });

  const weeklyBreakdowns = currentWeekRecords.map(r => calculateRecordBreakdown(r, settings.standardDailyHours || 8));
  const weeklyTotalHours = weeklyBreakdowns.reduce((acc, curr) => acc + curr.totalHours, 0);
  const weeklyRegularHours = weeklyBreakdowns.reduce((acc, curr) => acc + curr.regularHours, 0);
  const weeklyOvertimeHours = weeklyBreakdowns.reduce((acc, curr) => acc + curr.overtimeHours, 0);
  const weeklyAbsences = currentWeekRecords.filter(r => isRecordAbsent(r)).length;
  const daysPresent = currentWeekRecords.filter(r => !isRecordAbsent(r)).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{showToast}</span>
        </div>
      )}

      {/* Prominent Notification Banner for Active Alarms with SUP Logo */}
      {ringingAlarm && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 border-2 border-rose-500 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-3 relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl p-[1px] bg-gradient-to-tr from-cyan-400 via-rose-500 to-rose-400 shadow-md">
                <div className="w-full h-full rounded-[11px] overflow-hidden bg-[#08093d] flex items-center justify-center">
                  <img
                    src="/showup-sup-logo.png"
                    alt="ShowUp SUP Logo"
                    className="w-full h-full object-cover scale-[1.05]"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-slate-900 flex items-center justify-center text-white text-[10px] shadow-sm">
                <Volume2 className="w-2.5 h-2.5 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-500/40 animate-pulse">
                  ALARM RINGING
                </span>
                <span className="text-xs font-mono font-bold text-rose-200">
                  {ringingAlarm.time}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-white mt-0.5">
                {ringingAlarm.label}
              </h3>
              <p className="text-xs text-rose-200/90">
                Scheduled shift alarm alert triggered. Audio chime is sounding.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setRingingAlarm(null);
              }}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-rose-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Dismiss Alarm</span>
            </button>
          </div>
        </div>
      )}

      {/* Prominent Notification Banner for Due Notes & Tasks with SUP Logo */}
      {activeNoteAlert && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-blue-900 to-slate-950 border-2 border-cyan-400 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-3 relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl p-[1px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-md">
                <div className="w-full h-full rounded-[11px] overflow-hidden bg-[#08093d] flex items-center justify-center">
                  <img
                    src="/showup-sup-logo.png"
                    alt="ShowUp SUP Logo"
                    className="w-full h-full object-cover scale-[1.05]"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 border-2 border-slate-900 flex items-center justify-center text-slate-950 text-[10px] shadow-sm font-bold">
                <Bell className="w-2.5 h-2.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/40">
                  TASK DUE ALERT
                </span>
                {activeNoteAlert.reminderTime && (
                  <span className="text-xs font-mono font-bold text-cyan-200">
                    {activeNoteAlert.reminderTime}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base text-white mt-0.5">
                {activeNoteAlert.title}
              </h3>
              {activeNoteAlert.content && (
                <p className="text-xs text-slate-200 mt-0.5 line-clamp-2">
                  {activeNoteAlert.content}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                sounds.playSuccess();
                handleToggleTaskCompleted(activeNoteAlert.id);
                setActiveNoteAlert(null);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Mark Done</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setActiveNoteAlert(null);
              }}
              className="p-2.5 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Hero Upper Clock In / Clock Out Section */}
      <div className="bg-gradient-to-br from-[#08093d] via-[#0d1052] to-[#121869] rounded-2xl p-5 sm:p-7 text-white shadow-lg border border-[#1e257a] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Live Clock & Today Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left w-full md:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                {activeShift?.isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    ACTIVE SHIFT RUNNING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    READY TO PUNCH
                  </span>
                )}
              </div>

              {/* Big Digital Clock */}
              <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-white drop-shadow-sm">
                {settings.timeFormat === '12h'
                  ? `${String(currentTime.getHours() % 12 || 12).padStart(2, '0')}:${liveMinutes}:${liveSeconds}`
                  : `${liveHours}:${liveMinutes}:${liveSeconds}`}
                <span className="text-xl sm:text-2xl font-sans font-bold text-cyan-300 ml-2">
                  {settings.timeFormat === '12h' ? liveAmPm : 'HRS'}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{formattedTodayDate}</span>
              </p>
            </div>
          </div>

          {/* Middle: Active Shift Duration (if clocked in) */}
          {activeShift?.isActive && (
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/15 text-center flex flex-col items-center justify-center min-w-[180px]">
              <span className="text-[11px] text-slate-300 font-medium">Clocked In at {displayTime(activeShift.timeIn, settings.timeFormat)}</span>
              <span className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300 tracking-wider">
                {elapsedActiveDuration}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Elapsed Work Time</span>
            </div>
          )}

          {/* Right: Clock In / Clock Out Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            {!activeShift?.isActive ? (
              <>
                <button
                  id="upper-clock-in-btn"
                  onClick={handleQuickClockIn}
                  className="w-full sm:w-44 py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer"
                >
                  <LogIn className="w-5 h-5 text-white" />
                  <span>CLOCK IN</span>
                </button>
                <button
                  disabled
                  title="Clock In first to enable Clock Out"
                  className="w-full sm:w-40 py-4 px-5 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-bold text-sm uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 opacity-60"
                >
                  <LogOut className="w-5 h-5 text-slate-500" />
                  <span>CLOCK OUT</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <button
                  id="upper-clock-out-btn"
                  onClick={handleQuickClockOut}
                  className="w-full sm:w-48 py-4 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer"
                >
                  <LogOut className="w-5 h-5 text-white" />
                  <span>CLOCK OUT</span>
                </button>
                <button
                  onClick={onCancelActiveShift}
                  className="text-xs text-slate-300 hover:text-white underline px-3 py-1 font-medium transition cursor-pointer"
                >
                  Cancel shift
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Log & Remark Entry Bar under Clock Controls */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/15">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Quick Remark:
              </span>
              <span className="text-[11px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-md font-mono">
                {selectedDate}
              </span>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add shift activities, tasks, or remarks for this date..."
                className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white/15 transition backdrop-blur-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveManualRecord}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#08093d] font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Remark</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Stat Metrics Row (5-Day Work Week & Weekend OT) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Weekly Regular
          </p>
          <p className="text-3xl font-bold text-slate-900 font-mono">
            {weeklyRegularHours.toFixed(1)}
            <span className="text-lg font-normal text-slate-400 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Mon–Fri regular schedule
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Overtime (+OT)
          </p>
          <p className="text-3xl font-bold text-amber-600 font-mono">
            +{weeklyOvertimeHours.toFixed(1)}
            <span className="text-lg font-normal text-slate-400 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-amber-600/80 mt-1">
            Sat/Sun 100% OT + Weekday OT
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Days Present
          </p>
          <p className="text-3xl font-bold text-indigo-600 font-mono">
            {String(daysPresent).padStart(2, '0')}
            <span className="text-lg font-normal text-slate-400 ml-1">shifts</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {weeklyTotalHours.toFixed(1)}h total time logged
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Absences Logged
          </p>
          <p className="text-3xl font-bold text-rose-600 font-mono">
            {String(weeklyAbsences).padStart(2, '0')}
            <span className="text-lg font-normal text-slate-400 ml-1">days</span>
          </p>
          <p className="text-[11px] text-rose-600/80 mt-1">
            Unrecorded or absent days
          </p>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols on desktop): Full Daily Entry & Remarks Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main DTR Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 text-sm">Daily Attendance & Work Record</h2>
                  <span className="text-[10px] text-slate-500 font-medium">5-Day Work Week (Mon–Fri Regular • Sat/Sun Overtime)</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-medium border border-indigo-100">
                  {records.some((r) => r.date === selectedDate) ? 'Editing Saved Record' : 'New Entry'}
                </span>

                {/* Tag / Save Holiday without time in/out button - like Tag Absent button */}
                {!isHoliday ? (
                  <button
                    type="button"
                    onClick={handleSaveHolidayWithoutTimes}
                    title="Save record as Holiday with no Time In / Out"
                    className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md border border-amber-300 flex items-center gap-1 transition shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Tag Holiday</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleClearHolidayMode}
                    title="Clear holiday and set normal work hours"
                    className="px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-md border border-amber-400 flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-800" />
                    <span>Clear Holiday</span>
                  </button>
                )}

                {!isAbsentMode ? (
                  <button
                    type="button"
                    onClick={handleMarkAsAbsent}
                    title="Tag record as absent"
                    className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Tag Absent</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleClearAbsentMode}
                    title="Set normal work hours"
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Set Normal Hours</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveManualRecord} className="p-6 space-y-4">
              {/* Weekend Overtime Alert Banner */}
              {isWeekendSelected && !isAbsentMode && !isHoliday && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-amber-900">
                      {isSatSelected ? 'Saturday' : 'Sunday'} Overtime Mark
                    </span>
                    <span className="text-[11px] text-amber-700 hidden sm:inline">
                      • Weekend work: 100% of hours logged are marked as Overtime
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    REST DAY OT
                  </span>
                </div>
              )}

              {/* Holiday status alert banner */}
              {isHoliday && (!timeIn || !timeOut) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-amber-950">
                      Official Holiday (No In/Out • 0.00 hrs)
                    </span>
                    <span className="text-[11px] text-amber-800 hidden sm:inline">
                      • Tagged as {holidayName || 'Regular Holiday'} • Displayed as [HOLIDAY] on DTR Form 48
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearHolidayMode}
                    className="text-[11px] font-semibold text-amber-900 hover:text-black underline cursor-pointer"
                  >
                    Set Normal Hours
                  </button>
                </div>
              )}

              {/* Absent status alert banner */}
              {isAbsentMode && (!timeIn || !timeOut) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-rose-800">Tagged as Absent (0.00 hrs)</span>
                    <span className="text-[11px] text-rose-600 hidden sm:inline">• Keep editable anytime or add times below</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAbsentMode}
                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline"
                  >
                    Restore Hours
                  </button>
                </div>
              )}

              {/* Date Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Date of Record
                </label>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium text-slate-900"
                    required
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetDateToday}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                        selectedDate === formatDate()
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={handleSetDateYesterday}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
              </div>

              {/* Time In & Time Out */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                      Time In (Arrival)
                    </label>
                    <div className="flex items-center gap-2">
                      {timeIn && (
                        <button
                          type="button"
                          onClick={() => setTimeIn('')}
                          className="text-[10px] text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSetTimeInNow}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        Set Now
                      </button>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={timeIn}
                    onChange={(e) => {
                      setTimeIn(e.target.value);
                      if (selectedTags.includes('Absent') && e.target.value) {
                        setSelectedTags(selectedTags.filter(t => t !== 'Absent'));
                      }
                    }}
                    placeholder="--:--"
                    className="w-full px-3 py-2 text-base font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {timeIn ? `Format: ${displayTime(timeIn, settings.timeFormat)}` : 'No Time In (Absent)'}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      Time Out (Departure)
                    </label>
                    <div className="flex items-center gap-2">
                      {timeOut && (
                        <button
                          type="button"
                          onClick={() => setTimeOut('')}
                          className="text-[10px] text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSetTimeOutNow}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        Set Now
                      </button>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={timeOut}
                    onChange={(e) => setTimeOut(e.target.value)}
                    placeholder="--:--"
                    className="w-full px-3 py-2 text-base font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {timeOut ? `Format: ${displayTime(timeOut, settings.timeFormat)}` : 'No Time Out (Absent)'}
                  </p>
                </div>
              </div>

              {/* Break Duration Deduction */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Coffee className="w-3.5 h-3.5 text-amber-600" />
                    Break / Lunch Deduction
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 30, 45, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setBreakMinutes(mins);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          breakMinutes === mins
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mins === 0 ? 'No Break' : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Net Hours Computed Badge */}
                <div className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border shadow-xs flex items-center justify-between sm:justify-start gap-3 ${
                  isHoliday && (!timeIn || !timeOut)
                    ? 'bg-amber-50 border-amber-300'
                    : isAbsentMode && (!timeIn || !timeOut) 
                      ? 'bg-rose-50 border-rose-200' 
                      : isWeekendSelected && calculatedHours > 0
                        ? 'bg-amber-50/80 border-amber-300'
                        : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                      {isHoliday && (!timeIn || !timeOut) ? 'Holiday Record' : isWeekendSelected ? 'Weekend Hours' : 'Net Hours'}
                    </span>
                    <span className={`text-lg font-bold font-mono ${
                      isHoliday && (!timeIn || !timeOut)
                        ? 'text-amber-900 font-black tracking-wide'
                        : isAbsentMode && (!timeIn || !timeOut) 
                          ? 'text-rose-700' 
                          : isWeekendSelected && calculatedHours > 0
                            ? 'text-amber-900'
                            : 'text-slate-900'
                    }`}>
                      {isHoliday && (!timeIn || !timeOut) ? '0.0h (HOLIDAY)' : formatHoursAndMinutes(calculatedHours)}
                    </span>
                  </div>
                  {isHoliday && (
                    <span className="text-xs font-extrabold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-700" />
                      {holidayName || 'Holiday'}
                    </span>
                  )}
                  {isWeekendSelected && calculatedHours > 0 && !isHoliday ? (
                    <span className="text-xs font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300">
                      +{calculatedHours.toFixed(1)}h Weekend OT (100%)
                    </span>
                  ) : overtime > 0 && !isHoliday ? (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      +{overtime.toFixed(1)}h Weekday OT
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Remarks and Category Tags */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Remarks & Work Details / Holiday / Absence Reason
                </label>

                {/* Quick Tag Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 border cursor-pointer ${
                          isSelected
                            ? tag === 'Absent'
                              ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                              : tag === 'Holiday / Special Day'
                                ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold shadow-xs'
                                : 'bg-indigo-600 text-white border-indigo-600 font-medium shadow-xs'
                            : tag === 'Absent'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : tag === 'Holiday / Special Day'
                                ? 'bg-amber-100/70 text-amber-900 border-amber-300 hover:bg-amber-200 font-semibold'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Tag className="w-3 h-3" />
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Remarks Textarea */}
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="Write details about today's tasks, holiday name, overtime, or reason for absence..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 resize-none leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="submit"
                  className={`flex-1 py-3.5 px-4 rounded-lg active:scale-[0.99] font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    isHoliday && (!timeIn || !timeOut)
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20'
                      : isAbsentMode && (!timeIn || !timeOut)
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isHoliday && (!timeIn || !timeOut)
                      ? 'Save Holiday (No Times)'
                      : isAbsentMode && (!timeIn || !timeOut)
                        ? 'Save Absent Record'
                        : 'Save Daily Record'}
                  </span>
                </button>

                {/* Button to save Holiday with out time in or out, like Tag Absent button */}
                {!isHoliday ? (
                  <button
                    type="button"
                    onClick={handleSaveHolidayWithoutTimes}
                    title="Save record as Holiday with no Time In or Out"
                    className="py-3.5 px-4 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    <span>Tag Holiday</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleClearHolidayMode}
                    title="Clear holiday and set normal hours"
                    className="py-3.5 px-4 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 border border-amber-400 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-800" />
                    <span>Restore Normal Hours</span>
                  </button>
                )}

                {!isAbsentMode && (
                  <button
                    type="button"
                    onClick={handleMarkAsAbsent}
                    className="py-3.5 px-4 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Tag Absent</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (5 cols on desktop): Today Summary, Quick Remark & Policy Notice */}
        <div className="lg:col-span-5 space-y-6">
          {/* A. Today's Shift Status & Quick Insights Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Shift Overview</h3>
                  <span className="text-[11px] text-slate-400">Current Session Details</span>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                activeShift?.isActive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {activeShift?.isActive ? '● Shift Active' : '○ Standby'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Standard Daily Shift</span>
                <span className="font-mono font-bold text-slate-800">{settings.standardDailyHours || 8}h Regular Target</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Selected Date Record</span>
                <span className="font-semibold text-indigo-700">{selectedDayInfo.dayName}, {selectedDate}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Overtime Tier Policy</span>
                <span className="font-semibold text-amber-700">
                  {isWeekendSelected ? 'Rest Day OT (100% Rate)' : 'Regular Overtime (>8h)'}
                </span>
              </div>
            </div>
          </div>

          {/* B. Added Feature 1: Saved Notes, Tasks & Push Notification Reminders */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Shift Notes & Tasks</h3>
                  <span className="text-[11px] text-slate-400">Scheduled in-app reminders & task logs</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsAddingNote(!isAddingNote)}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingNote ? 'Cancel' : 'New Note/Task'}</span>
                </button>
              </div>
            </div>

            {/* Active ringing Task Alert Banner */}
            {activeNoteAlert && (
              <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Volume2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-amber-100">TASK REMINDER DUE NOW</div>
                    <div className="font-bold text-sm text-white">{activeNoteAlert.title}</div>
                    {activeNoteAlert.content && (
                      <div className="text-xs text-amber-50 mt-0.5 line-clamp-1">{activeNoteAlert.content}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleTaskCompleted(activeNoteAlert.id);
                      setActiveNoteAlert(null);
                    }}
                    className="px-3 py-1.5 bg-white text-amber-900 font-extrabold text-xs rounded-lg shadow-sm hover:bg-amber-50 transition cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Done</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNoteAlert(null)}
                    className="px-2.5 py-1.5 bg-black/20 hover:bg-black/30 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Note Creation Form with Date/Time Push Reminder */}
            {isAddingNote && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 mb-4 space-y-3 shadow-inner">
                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                    Task / Note Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Client sync, Submit timesheet, Team standup"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                    Activity & Details
                  </label>
                  <textarea
                    placeholder="Write your note or task details here..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-amber-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                {/* Reminder Date & Time Controls */}
                <div className="p-3 bg-white rounded-lg border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={noteReminderEnabled}
                        onChange={(e) => setNoteReminderEnabled(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-600" />
                        Schedule In-App Reminder
                      </span>
                    </label>
                    {noteReminderEnabled && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                        In-App Chime & Alert
                      </span>
                    )}
                  </div>

                  {noteReminderEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Reminder Date</label>
                        <input
                          type="date"
                          value={noteReminderDate}
                          onChange={(e) => setNoteReminderDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono font-medium focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Reminder Time</label>
                        <input
                          type="time"
                          value={noteReminderTime}
                          onChange={(e) => setNoteReminderTime(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Set Alert</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notes List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <CalendarClock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  No tasks or notes yet. Click <strong>New Note/Task</strong> to set one.
                </div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border transition ${
                      n.completed
                        ? 'bg-slate-50/60 border-slate-200 opacity-60'
                        : 'bg-slate-50 border-slate-200/90 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskCompleted(n.id)}
                          className={`mt-0.5 text-slate-400 hover:text-emerald-600 transition cursor-pointer shrink-0 ${
                            n.completed ? 'text-emerald-600' : ''
                          }`}
                          title={n.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
                        >
                          {n.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className={`font-bold text-xs text-slate-900 truncate ${n.completed ? 'line-through text-slate-500' : ''}`}>
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              • {n.date} {n.createdAt}
                            </span>
                          </div>

                          {n.content && (
                            <p className={`text-xs text-slate-600 whitespace-pre-wrap break-words leading-relaxed mb-2 ${n.completed ? 'line-through text-slate-400' : ''}`}>
                              {n.content}
                            </p>
                          )}

                          {/* Reminder Time Tag & Push Status */}
                          {n.reminderEnabled && n.reminderDate && n.reminderTime && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                              <Bell className="w-3 h-3 text-amber-600" />
                              <span>Alert: {n.reminderDate} at {n.reminderTime}</span>
                              {n.notified && (
                                <span className="text-emerald-600 font-normal ml-1">✓ Notified</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Test Alert Button */}
                        <button
                          type="button"
                          onClick={() => handleTestPushNote(n)}
                          title="Trigger Test Alarm & Alert"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          title="Delete Note"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* C. Added Feature 2: Shift Alarms & Reminders */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Shift Alarms & Alerts</h3>
                  <span className="text-[11px] text-slate-400">Timely break & punch reminders</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingAlarm(!isAddingAlarm)}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingAlarm ? 'Cancel' : 'Set Alarm'}</span>
              </button>
            </div>

            {/* Active ringing banner */}
            {ringingAlarm && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500 text-white flex items-center justify-between animate-bounce shadow-md">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>ALARM: {ringingAlarm}</span>
                </div>
                <button
                  onClick={() => setRingingAlarm(null)}
                  className="px-2.5 py-1 bg-white text-rose-700 font-black text-[10px] uppercase rounded-lg shadow-sm cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Add Alarm Form */}
            {isAddingAlarm && (
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 mb-4 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">Alert Time</label>
                    <input
                      type="time"
                      value={newAlarmTime}
                      onChange={(e) => setNewAlarmTime(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">Label</label>
                    <input
                      type="text"
                      placeholder="e.g., Afternoon Break"
                      value={newAlarmLabel}
                      onChange={(e) => setNewAlarmLabel(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingAlarm(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 px-2.5 py-1 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAlarm}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Alarm</span>
                  </button>
                </div>
              </div>
            )}

            {/* Alarm List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alarms.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg border flex items-center justify-between transition ${
                    a.enabled ? 'bg-slate-50 border-indigo-100' : 'bg-slate-50/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleAlarm(a.id)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        a.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                      title={a.enabled ? 'Disable alarm' : 'Enable alarm'}
                    >
                      {a.enabled ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-sm">{a.time}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{a.label}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerAlarmSound();
                        setShowToast(`Previewed audio for ${a.label}`);
                        setTimeout(() => setShowToast(null), 2000);
                      }}
                      title="Test Audio"
                      className="text-[10px] text-slate-400 hover:text-indigo-600 p-1 transition cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAlarm(a.id)}
                      title="Delete Alarm"
                      className="text-slate-300 hover:text-rose-600 p-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* D. Notice & Reminder Pill */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 shadow-xs">
            <div className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-800 shrink-0">
              !
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Reminder:</strong> Please ensure all daily remarks, break deductions, and attendance records are verified before payroll processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

