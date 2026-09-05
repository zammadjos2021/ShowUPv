import React, { useState, useEffect } from 'react';
import { X, Check, Clock, Calendar, Tag, FileText, Coffee, UserX, AlertTriangle, Sparkles } from 'lucide-react';
import { TimeRecord, UserSettings } from '../types';
import { 
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

interface EditRecordModalProps {
  record: TimeRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRecord: TimeRecord) => void;
  settings: UserSettings;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
  settings,
}) => {
  const [date, setDate] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [remarks, setRemarks] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  useEffect(() => {
    if (record) {
      setDate(record.date);
      setTimeIn(record.timeIn || '');
      setTimeOut(record.timeOut || '');
      setBreakMinutes(record.breakDurationMinutes ?? 60);
      setRemarks(record.remarks || '');
      setTags(record.tags || []);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const dayInfo = getDayInfo(date);
  const isWeekendDay = isWeekend(date);
  const isSat = isSaturday(date);
  const isSun = isSunday(date);

  const isAbsent = (!timeIn && !timeOut) || tags.includes('Absent');
  const calculatedHours = isAbsent && (!timeIn || !timeOut) ? 0 : calculateNetHours(timeIn, timeOut, breakMinutes);
  
  // 5-Day Work Week breakdown:
  const breakdown = calculateRecordBreakdown(
    { date, timeIn, timeOut, breakDurationMinutes: breakMinutes, totalHours: calculatedHours, tags },
    settings.standardDailyHours || 8
  );

  const handleMarkAsAbsent = () => {
    sounds.playClick();
    setTimeIn('');
    setTimeOut('');
    setBreakMinutes(0);
    if (!tags.includes('Absent')) {
      setTags(['Absent', ...tags.filter((t) => t !== 'Regular Shift' && t !== 'Saturday OT' && t !== 'Sunday OT' && t !== 'Weekend OT')]);
    }
    if (!remarks.trim()) {
      setRemarks('Absent');
    }
  };

  const handleClearAbsent = () => {
    sounds.playClick();
    const updated = tags.filter((t) => t !== 'Absent');
    if (isWeekendDay) {
      const wkTag = isSat ? 'Saturday OT' : 'Sunday OT';
      if (!updated.includes(wkTag)) {
        updated.push(wkTag);
      }
    }
    setTags(updated);
    if (remarks === 'Absent') {
      setRemarks('');
    }
  };

  const toggleTag = (tag: string) => {
    sounds.playClick();
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTag.trim()) return;
    if (!tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
    }
    setCustomTag('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClockIn();

    let finalTags = [...tags];
    let finalHours = calculatedHours;

    // If no timeIn & no timeOut is input, tag it as Absent automatically
    if (!timeIn && !timeOut) {
      if (!finalTags.includes('Absent')) {
        finalTags = ['Absent', ...finalTags];
      }
      finalHours = 0;
    } else if (timeIn && timeOut && finalTags.includes('Absent')) {
      // If user provided valid time in & out, remove Absent tag unless they explicitly want it
      finalTags = finalTags.filter((t) => t !== 'Absent');
    }

    // Auto-attach Weekend Overtime tag if recorded on Saturday or Sunday with active hours
    if (isWeekendDay && finalHours > 0 && !finalTags.includes('Absent')) {
      const wkTag = isSat ? 'Saturday OT' : 'Sunday OT';
      if (!finalTags.includes(wkTag) && !finalTags.includes('Weekend OT') && !finalTags.includes('Overtime')) {
        finalTags = [wkTag, ...finalTags];
      }
    }

    onSave({
      ...record,
      date,
      timeIn: timeIn || '',
      timeOut: timeOut || '',
      breakDurationMinutes: breakMinutes,
      totalHours: finalHours,
      remarks,
      tags: finalTags,
      updatedAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold">Edit Attendance Record</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Weekend Overtime Alert Banner */}
          {isWeekendDay && !isAbsent && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-amber-900">
                  {isSat ? 'Saturday' : 'Sunday'} Overtime Mark
                </span>
                <span className="text-[11px] text-amber-700 hidden sm:inline">
                  • 5-day work week: 100% of weekend hours count as Overtime
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                REST DAY OT
              </span>
            </div>
          )}

          {/* Quick Absent State Banner */}
          {isAbsent ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-bold text-rose-800">Tagged as Absent (0.00 hrs)</span>
                <span className="text-[11px] text-rose-600 hidden sm:inline">• Enter Time In/Out anytime to record hours</span>
              </div>
              <button
                type="button"
                onClick={handleClearAbsent}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline"
              >
                Clear Absent
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span>Need to mark this date as absent?</span>
              <button
                type="button"
                onClick={handleMarkAsAbsent}
                className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 flex items-center gap-1 transition"
              >
                <UserX className="w-3.5 h-3.5 text-rose-600" />
                <span>Mark as Absent</span>
              </button>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              required
            />
          </div>

          {/* Time In & Time Out */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Time In
                </label>
                {timeIn && (
                  <button
                    type="button"
                    onClick={() => setTimeIn('')}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                placeholder="--:--"
                className="w-full px-3 py-2 text-base font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                {timeIn ? displayTime(timeIn, settings.timeFormat) : 'No Time In (Absent)'}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Time Out
                </label>
                {timeOut && (
                  <button
                    type="button"
                    onClick={() => setTimeOut('')}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                placeholder="--:--"
                className="w-full px-3 py-2 text-base font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                {timeOut ? displayTime(timeOut, settings.timeFormat) : 'No Time Out (Absent)'}
              </span>
            </div>
          </div>

          {/* Break Duration */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              Break Duration (Minutes)
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[0, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setBreakMinutes(mins)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                    breakMinutes === mins
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mins === 0 ? 'No Break' : `${mins}m`}
                </button>
              ))}
              <input
                type="number"
                min="0"
                max="240"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs text-center bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>
          </div>

          {/* Computed Net Hours Summary */}
          <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
            isAbsent && (!timeIn || !timeOut)
              ? 'bg-rose-50/70 border-rose-200'
              : isWeekendDay && calculatedHours > 0
                ? 'bg-amber-50/80 border-amber-300'
                : 'bg-indigo-50/70 border-indigo-100'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${
                isAbsent && (!timeIn || !timeOut)
                  ? 'text-rose-900'
                  : isWeekendDay && calculatedHours > 0
                    ? 'text-amber-900'
                    : 'text-indigo-900'
              }`}>
                {isWeekendDay ? `${dayInfo.dayName} Hours (Weekend Rest Day):` : 'Calculated Net Hours:'}
              </span>
              <span className={`text-base font-mono font-bold ${
                isAbsent && (!timeIn || !timeOut)
                  ? 'text-rose-700'
                  : isWeekendDay && calculatedHours > 0
                    ? 'text-amber-950'
                    : 'text-indigo-700'
              }`}>
                {formatHoursAndMinutes(calculatedHours)} ({calculatedHours.toFixed(2)} hrs)
              </span>
            </div>

            {isWeekendDay && calculatedHours > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-xs">
                <span className="text-amber-800 font-medium">Overtime Classification:</span>
                <span className="font-mono font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                  +{calculatedHours.toFixed(2)}h Weekend OT (100%)
                </span>
              </div>
            )}

            {!isWeekendDay && breakdown.overtimeHours > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-indigo-200/60 text-xs">
                <span className="text-indigo-800 font-medium">Overtime Excess (&gt;{settings.standardDailyHours || 8}h):</span>
                <span className="font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  +{breakdown.overtimeHours.toFixed(2)}h Weekday OT
                </span>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Remarks & Absence Reason / Work Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Absent - Sick leave, Emergency, or regular work notes..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800 leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              Tags & Categories
            </label>
            <div className="flex flex-wrap gap-1">
              {COMMON_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    tags.includes(t)
                      ? t === 'Absent'
                        ? 'bg-rose-600 text-white border-rose-600 font-bold'
                        : 'bg-indigo-600 text-white border-indigo-600 font-medium'
                      : t === 'Absent'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Custom tag..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wide transition"
            >
              <Check className="w-4 h-4" />
              <span>Update Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

