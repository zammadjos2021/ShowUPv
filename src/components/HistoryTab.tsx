import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  Trash2, 
  Edit3, 
  FileSpreadsheet, 
  Printer, 
  Plus, 
  MessageSquare,
  Sparkles,
  ArrowUpDown,
  FileDown,
  UserX
} from 'lucide-react';
import { TimeRecord, UserSettings } from '../types';
import { displayTime, formatHoursAndMinutes, isRecordAbsent, calculateRecordBreakdown, isWeekend, isSaturday, isSunday } from '../utils/timeCalculations';
import { exportToPDF } from '../utils/exportUtils';
import { sounds } from '../utils/soundEffects';

interface HistoryTabProps {
  records: TimeRecord[];
  onEditRecord: (record: TimeRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNewRecord: () => void;
  onExportCSV: () => void;
  onOpenPrintDTR: () => void;
  settings: UserSettings;
}

type DateFilter = 'all' | 'this_week' | 'this_month' | 'last_month';
type StatusFilter = 'all' | 'present' | 'absent';


export const HistoryTab: React.FC<HistoryTabProps> = ({
  records,
  onEditRecord,
  onDeleteRecord,
  onNewRecord,
  onExportCSV,
  onOpenPrintDTR,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortAscending, setSortAscending] = useState(false);

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return records
      .filter((rec) => {
        // Date range filter
        if (dateFilter === 'this_month') {
          const recDate = new Date(rec.date + 'T00:00:00');
          if (recDate.getFullYear() !== currentYear || recDate.getMonth() !== currentMonth) {
            return false;
          }
        } else if (dateFilter === 'last_month') {
          const recDate = new Date(rec.date + 'T00:00:00');
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          if (recDate.getFullYear() !== lastMonthYear || recDate.getMonth() !== lastMonth) {
            return false;
          }
        } else if (dateFilter === 'this_week') {
          const recDate = new Date(rec.date + 'T00:00:00');
          const dayOfWeek = now.getDay();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - dayOfWeek);
          startOfWeek.setHours(0, 0, 0, 0);
          if (recDate < startOfWeek) return false;
        }

        // Status Filter
        const isAbsent = isRecordAbsent(rec);
        if (statusFilter === 'present' && isAbsent) return false;
        if (statusFilter === 'absent' && !isAbsent) return false;

        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesDate = rec.date.includes(term);
          const matchesRemarks = (rec.remarks || '').toLowerCase().includes(term);
          const matchesTags = (rec.tags || []).some((t) => t.toLowerCase().includes(term));
          const matchesAbsent = isAbsent && term.includes('absent');
          return matchesDate || matchesRemarks || matchesTags || matchesAbsent;
        }

        return true;
      })
      .sort((a, b) => {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortAscending ? -diff : diff;
      });
  }, [records, dateFilter, statusFilter, searchTerm, sortAscending]);

  // Aggregate statistics with 5-day work week breakdown
  const breakdowns = useMemo(() => {
    return filteredRecords.map((rec) =>
      calculateRecordBreakdown(rec, settings.standardDailyHours || 8)
    );
  }, [filteredRecords, settings.standardDailyHours]);

  const totalHours = useMemo(() => {
    return breakdowns.reduce((acc, curr) => acc + curr.totalHours, 0);
  }, [breakdowns]);

  const totalRegular = useMemo(() => {
    return breakdowns.reduce((acc, curr) => acc + curr.regularHours, 0);
  }, [breakdowns]);

  const totalOvertime = useMemo(() => {
    return breakdowns.reduce((acc, curr) => acc + curr.overtimeHours, 0);
  }, [breakdowns]);

  const presentCount = useMemo(() => {
    return filteredRecords.filter(r => !isRecordAbsent(r)).length;
  }, [filteredRecords]);

  const absentCount = useMemo(() => {
    return filteredRecords.filter(r => isRecordAbsent(r)).length;
  }, [filteredRecords]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Summary Stats Metric Cards (5-Day Work Week & Weekend OT) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Days Present</p>
          <p className="text-3xl font-bold text-slate-900 font-mono">
            {String(presentCount).padStart(2, '0')}
            <span className="text-lg font-normal text-slate-400 ml-1">shifts</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{totalHours.toFixed(1)}h total logged</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Absences</p>
          <p className="text-3xl font-bold text-rose-600 font-mono">
            {String(absentCount).padStart(2, '0')}
            <span className="text-lg font-normal text-slate-400 ml-1">days</span>
          </p>
          <p className="text-[11px] text-rose-600/80 mt-1">Unrecorded or absent</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Regular (Mon–Fri)</p>
          <p className="text-3xl font-bold text-indigo-600 font-mono">
            {totalRegular.toFixed(1)}
            <span className="text-lg font-normal text-slate-400 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Standard 5-day base</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Overtime (+OT)</p>
          <p className="text-3xl font-bold text-amber-600 font-mono">
            +{totalOvertime.toFixed(1)}
            <span className="text-lg font-normal text-slate-400 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-amber-600/80 mt-1">Sat/Sun 100% + Excess</p>
        </div>
      </div>

      {/* 2. Main Activity Logs Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-800 text-base tracking-tight">Recent Activity Logs</h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-medium border border-indigo-100">
              {dateFilter === 'this_month' ? 'Current Month' : dateFilter === 'this_week' ? 'Current Week' : 'All Shifts'}
            </span>
          </div>

          {/* Search & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search date, tag, or remarks..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                setSortAscending(!sortAscending);
              }}
              title="Sort order"
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{sortAscending ? 'Oldest' : 'Newest'}</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onOpenPrintDTR();
              }}
              title="Save PDF / Print DTR"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>PDF Report</span>
            </button>

            <button
              onClick={onExportCSV}
              title="Download CSV"
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={onNewRecord}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-xs uppercase tracking-wide"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Date & Status Filter Pills Sub-bar */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Range:</span>
            {(['all', 'this_week', 'this_month', 'last_month'] as DateFilter[]).map((filter) => {
              const labels: Record<DateFilter, string> = {
                all: 'All Time',
                this_week: 'This Week',
                this_month: 'This Month',
                last_month: 'Last Month',
              };
              return (
                <button
                  key={filter}
                  onClick={() => {
                    sounds.playClick();
                    setDateFilter(filter);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    dateFilter === filter
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {labels[filter]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Status:</span>
            <button
              onClick={() => {
                sounds.playClick();
                setStatusFilter('all');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setStatusFilter('present');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === 'present'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Present
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setStatusFilter('absent');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === 'absent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Absent
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-700">No activity logs recorded</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm ? `No records match your query "${searchTerm}".` : 'Log your first daily shift to populate the ledger.'}
              </p>
              <button
                onClick={onNewRecord}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                + Add Attendance Entry
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/60 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Time In</th>
                  <th className="px-6 py-3.5 font-semibold">Time Out</th>
                  <th className="px-6 py-3.5 font-semibold">Hours</th>
                  <th className="px-6 py-3.5 font-semibold">Remarks & Notes</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {filteredRecords.map((record, index) => {
                  const isAbsent = isRecordAbsent(record);
                  const isSat = isSaturday(record.date);
                  const isSun = isSunday(record.date);
                  const isWeekendDay = isWeekend(record.date);
                  const breakdown = calculateRecordBreakdown(record, settings.standardDailyHours || 8);

                  const dateObj = new Date(record.date + 'T00:00:00');
                  const formattedDate = isNaN(dateObj.getTime())
                    ? record.date
                    : dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                  const dayName = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const isZebra = index % 2 === 1;

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50 transition ${
                        isAbsent 
                          ? 'bg-rose-50/30 hover:bg-rose-50/60' 
                          : isWeekendDay && !isAbsent
                            ? 'bg-amber-50/20 hover:bg-amber-50/50'
                            : isZebra ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      {/* Date */}
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                            isAbsent
                              ? 'text-rose-700 bg-rose-100/70 border-rose-200'
                              : isWeekendDay
                                ? 'text-amber-800 bg-amber-100/70 border-amber-200'
                                : 'text-indigo-600 bg-indigo-50 border-indigo-100/50'
                          }`}>
                            {dayName}
                          </span>
                          <span>{formattedDate}</span>
                          {record.isHoliday && (
                            <span className="text-[10px] uppercase font-extrabold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs inline-flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                              {record.holidayName || 'Holiday'}
                              {record.timeIn && <span className="text-[9px] font-semibold opacity-75">(Worked)</span>}
                            </span>
                          )}
                          {isAbsent && !record.isHoliday && (
                            <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                              Absent
                            </span>
                          )}
                          {isWeekendDay && !isAbsent && !record.isHoliday && (
                            <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200 hidden sm:inline">
                              Rest Day
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Time In */}
                      <td className="px-6 py-4 font-mono font-medium whitespace-nowrap">
                        {record.timeIn ? (
                          <span className="text-slate-800 font-bold">{displayTime(record.timeIn, settings.timeFormat)}</span>
                        ) : record.isHoliday ? (
                          <span className="text-amber-800 text-xs font-semibold italic">No In (Holiday)</span>
                        ) : (
                          <span className="text-rose-500 text-xs font-bold">Absent</span>
                        )}
                      </td>

                      {/* Time Out */}
                      <td className="px-6 py-4 font-mono font-medium whitespace-nowrap">
                        {record.timeOut ? (
                          <span className="text-slate-800 font-bold">{displayTime(record.timeOut, settings.timeFormat)}</span>
                        ) : record.isHoliday ? (
                          <span className="text-amber-800 text-xs font-semibold italic">No Out (Holiday)</span>
                        ) : (
                          <span className="text-rose-500 text-xs font-bold">Absent</span>
                        )}
                      </td>

                      {/* Total Net Hours & Overtime Mark */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold ${
                            isAbsent 
                              ? 'text-rose-600' 
                              : isWeekendDay 
                                ? 'text-amber-900' 
                                : 'text-slate-900'
                          }`}>
                            {record.totalHours.toFixed(1)}h
                          </span>

                          {isWeekendDay && !isAbsent && record.totalHours > 0 ? (
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded border border-amber-300">
                              {isSat ? 'Sat OT' : 'Sun OT'} (100%)
                            </span>
                          ) : breakdown.overtimeHours > 0 && !isAbsent ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              +{breakdown.overtimeHours.toFixed(1)}h OT
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Remarks & Tags */}
                      <td className="px-6 py-4 italic text-slate-500 max-w-xs">
                        <div className="space-y-1">
                          <p className="line-clamp-2">{record.remarks || (isAbsent ? 'Tagged as Absent' : isWeekendDay ? `${dayName} Overtime Shift` : 'Normal shift')}</p>
                          {record.tags && record.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 not-italic">
                              {record.tags.map((t) => (
                                <span
                                  key={t}
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                    t === 'Absent'
                                      ? 'bg-rose-100 text-rose-700 font-bold border border-rose-200'
                                      : t.includes('OT') || t.includes('Overtime')
                                        ? 'bg-amber-100 text-amber-800 font-bold border border-amber-200'
                                        : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              sounds.playClick();
                              onEditRecord(record);
                            }}
                            title="Edit Record (Input or change times anytime)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              sounds.playClick();
                              if (confirm(`Delete record for ${record.date}?`)) {
                                onDeleteRecord(record.id);
                              }
                            }}
                            title="Delete Record"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
