import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  Printer, 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award, 
  User, 
  Building2,
  CheckCircle2,
  Briefcase,
  FileDown,
  Check,
  UserX
} from 'lucide-react';
import { TimeRecord, UserSettings } from '../types';
import { formatHoursAndMinutes, isRecordAbsent } from '../utils/timeCalculations';
import { exportToPDF } from '../utils/exportUtils';
import { sounds } from '../utils/soundEffects';

interface SummaryTabProps {
  records: TimeRecord[];
  settings: UserSettings;
  onOpenPrintDTR: () => void;
  onExportCSV: () => void;
  onExportBackupJSON: () => void;
  onOpenSettings: () => void;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  records,
  settings,
  onOpenPrintDTR,
  onExportCSV,
  onExportBackupJSON,
  onOpenSettings,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isPdfDownloaded, setIsPdfDownloaded] = useState(false);

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalDays = records.length;
    const presentDays = records.filter(r => !isRecordAbsent(r)).length;
    const absentDays = records.filter(r => isRecordAbsent(r)).length;
    const totalHours = records.reduce((acc, r) => acc + (r.totalHours || 0), 0);
    const standardDaily = settings.standardDailyHours || 8;

    let regularHours = 0;
    let overtimeHours = 0;

    records.forEach((r) => {
      const h = r.totalHours || 0;
      if (h > standardDaily) {
        regularHours += standardDaily;
        overtimeHours += h - standardDaily;
      } else {
        regularHours += h;
      }
    });

    const avgDailyHours = presentDays > 0 ? totalHours / presentDays : 0;

    // Tag counts
    const tagMap: Record<string, { count: number; hours: number }> = {};
    records.forEach((r) => {
      (r.tags || []).forEach((tag) => {
        if (!tagMap[tag]) {
          tagMap[tag] = { count: 0, hours: 0 };
        }
        tagMap[tag].count += 1;
        tagMap[tag].hours += r.totalHours || 0;
      });
    });

    // Recent 7 days for mini trend
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recentDays = sorted.slice(-7);

    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      regularHours,
      overtimeHours,
      avgDailyHours,
      tagMap,
      recentDays,
    };
  }, [records, settings.standardDailyHours]);


  const handleDownloadPDF = async () => {
    sounds.playSuccess();
    try {
      const res = await exportToPDF(selectedMonth, records, settings, { mode: 'download' });
      if (res.success) {
        setIsPdfDownloaded(true);
        setTimeout(() => setIsPdfDownloaded(false), 3000);
      }
    } catch (e) {
      console.error('PDF export failed:', e);
    }
  };

  const monthName = new Date(selectedMonth + '-01T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Profile / Employee Header Card (Professional Polish Design) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 border border-slate-300">
            {settings.profilePicture ? (
              <img
                src={settings.profilePicture}
                alt={settings.employeeName || 'Staff Member'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : settings.employeeName ? (
              settings.employeeName.charAt(0).toUpperCase()
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {settings.employeeName || 'Staff Member'}
              </h2>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-100">
                {settings.department || 'Active Staff'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              {settings.employeeId && (
                <span className="font-mono text-slate-600">ID: {settings.employeeId}</span>
              )}
              {settings.companyName && (
                <>
                  <span>•</span>
                  <span>{settings.companyName}</span>
                </>
              )}
              <span>•</span>
              <span>{settings.standardDailyHours || 8}h Standard Shift</span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition shadow-2xs"
        >
          Edit Profile & Settings
        </button>
      </div>

      {/* 2. Top Key Totals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Days Present
          </p>
          <p className="text-3xl font-bold font-mono text-slate-900">
            {String(stats.presentDays).padStart(2, '0')}
            <span className="text-lg font-normal text-slate-400 ml-1">shifts</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Active work attendance
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Absences Logged
          </p>
          <p className="text-3xl font-bold font-mono text-rose-600">
            {String(stats.absentDays).padStart(2, '0')}
            <span className="text-lg font-normal text-slate-400 ml-1">days</span>
          </p>
          <p className="text-[11px] text-rose-600/80 mt-1">
            Leaves & absent records
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Hours Logged
          </p>
          <p className="text-3xl font-bold font-mono text-indigo-600">
            {stats.totalHours.toFixed(1)}
            <span className="text-lg font-normal text-slate-400 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Avg {stats.avgDailyHours.toFixed(1)}h / active shift
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Overtime (+OT)
          </p>
          <p className="text-3xl font-bold font-mono text-amber-600">
            +{stats.overtimeHours.toFixed(1)}
            <span className="text-lg font-normal text-slate-400 ml-1">hrs</span>
          </p>
          <p className="text-[11px] text-amber-600/80 mt-1">
            Above {settings.standardDailyHours || 8}h threshold
          </p>
        </div>
      </div>

      {/* 3. Recent Shift Distribution Chart */}
      {stats.recentDays.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Weekly Attendance & Shift Duration Trends
            </h3>
            <span className="text-xs text-slate-400">Target: {settings.standardDailyHours || 8}h / shift</span>
          </div>

          <div className="flex items-end justify-between gap-3 h-40 pt-4 pb-2">
            {stats.recentDays.map((r) => {
              const isAbsent = isRecordAbsent(r);
              const maxScale = 12; // 12h max
              const heightPercent = isAbsent ? 10 : Math.min(100, Math.max(12, (r.totalHours / maxScale) * 100));
              const isOvertime = r.totalHours > (settings.standardDailyHours || 8);
              const dateObj = new Date(r.date + 'T00:00:00');
              const dayLabel = isNaN(dateObj.getTime()) ? r.date.slice(5) : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={r.id} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 hidden group-hover:block bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded font-mono shadow-md whitespace-nowrap z-10">
                    {r.date}: {isAbsent ? 'Absent (0.0h)' : `${r.totalHours.toFixed(1)}h`}
                  </div>

                  {/* Hours label */}
                  <span className={`text-[11px] font-mono font-bold ${isAbsent ? 'text-rose-500' : 'text-slate-700'}`}>
                    {isAbsent ? 'ABS' : `${r.totalHours.toFixed(1)}h`}
                  </span>

                  {/* Bar */}
                  <div className="w-full max-w-[44px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        isAbsent 
                          ? 'bg-rose-400' 
                          : isOvertime 
                            ? 'bg-amber-500' 
                            : 'bg-indigo-600'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span className={`text-xs font-medium ${isAbsent ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Activity & Work Tag Breakdown */}
      {Object.keys(stats.tagMap).length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center gap-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            Activity & Task Breakdown
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.entries(stats.tagMap) as [string, { count: number; hours: number }][]).map(([tag, data]) => (
              <div
                key={tag}
                className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 block">#{tag}</span>
                  <span className="text-[11px] text-slate-500">{data.count} shift entries</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-indigo-600 block">
                    {data.hours.toFixed(1)} hrs
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatHoursAndMinutes(data.hours)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Export Actions & Official DTR PDF Generation */}
      <div className="bg-indigo-900 text-white rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileDown className="w-4 h-4 text-indigo-400" />
              Monthly Time Summary & PDF Reports
            </h3>
            <p className="text-xs text-indigo-200 mt-1">
              Export a clean, professional PDF file with date, time in, and time out for the selected month.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-indigo-200 font-medium">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs bg-indigo-950/80 border border-indigo-700 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          {/* Primary Save PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="py-3 px-4 rounded-lg bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition"
          >
            {isPdfDownloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>PDF Downloaded!</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-indigo-700" />
                <span>Save PDF File</span>
              </>
            )}
          </button>

          {/* Print DTR Sheet Modal */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenPrintDTR();
            }}
            className="py-3 px-4 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-indigo-700 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print View</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={() => {
              sounds.playClick();
              onExportCSV();
            }}
            className="py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* Backup JSON */}
          <button
            onClick={() => {
              sounds.playClick();
              onExportBackupJSON();
            }}
            className="py-3 px-4 rounded-lg bg-indigo-950/60 hover:bg-indigo-950 text-indigo-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-indigo-800 transition"
          >
            <Download className="w-4 h-4" />
            <span>JSON Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};

