import React, { useState, useMemo } from 'react';
import { 
  MessageSquareText, 
  Search, 
  Tag, 
  Calendar, 
  Clock, 
  Copy, 
  Check, 
  Edit3, 
  Plus, 
  Sparkles,
  Bookmark,
  FileText
} from 'lucide-react';
import { TimeRecord, UserSettings } from '../types';
import { displayTime, formatHoursAndMinutes } from '../utils/timeCalculations';
import { sounds } from '../utils/soundEffects';

interface RemarksTabProps {
  records: TimeRecord[];
  onEditRecord: (record: TimeRecord) => void;
  onNewRecord: () => void;
  settings: UserSettings;
}

export const RemarksTab: React.FC<RemarksTabProps> = ({
  records,
  onEditRecord,
  onNewRecord,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract all unique tags used across records
  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    records.forEach((r) => {
      (r.tags || []).forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [records]);

  // Filter records that have remarks or tags
  const remarksList = useMemo(() => {
    return records
      .filter((rec) => {
        // Tag filter
        if (selectedTagFilter !== 'all') {
          if (!rec.tags?.includes(selectedTagFilter)) return false;
        }

        // Search text
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesRemarks = (rec.remarks || '').toLowerCase().includes(q);
          const matchesDate = rec.date.includes(q);
          const matchesTags = (rec.tags || []).some((t) => t.toLowerCase().includes(q));
          return matchesRemarks || matchesDate || matchesTags;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedTagFilter, searchTerm]);

  // Copy remark to clipboard (great for sending daily summary to boss / standup)
  const handleCopyRemark = (record: TimeRecord) => {
    sounds.playClick();
    const d = new Date(record.date + 'T00:00:00');
    const dayStr = isNaN(d.getTime()) ? record.date : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    const formatted = `📅 Daily Time Record - ${dayStr}\n⏰ Time In: ${displayTime(record.timeIn, settings.timeFormat)} | Time Out: ${displayTime(record.timeOut, settings.timeFormat)} (${formatHoursAndMinutes(record.totalHours)})\n🏷️ Tags: ${(record.tags || []).join(', ') || 'N/A'}\n📝 Remarks: ${record.remarks || 'No specific remarks.'}`;

    navigator.clipboard.writeText(formatted);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const recordsWithRemarksCount = records.filter(r => r.remarks && r.remarks.trim().length > 0).length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Stat Metrics Row (Professional Polish Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Notes Logged
          </p>
          <p className="text-3xl font-bold text-slate-900 font-mono">
            {String(recordsWithRemarksCount).padStart(2, '0')}
            <span className="text-lg font-normal text-slate-400 ml-1">notes</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Active Categories
          </p>
          <p className="text-3xl font-bold text-indigo-600 font-mono">
            {String(allUniqueTags.length).padStart(2, '0')}
            <span className="text-lg font-normal text-slate-400 ml-1">tags</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Coverage Rate
          </p>
          <p className="text-3xl font-bold text-slate-900 font-mono">
            {records.length > 0 ? `${Math.round((recordsWithRemarksCount / records.length) * 100)}` : '0'}
            <span className="text-lg font-normal text-slate-400 ml-1">%</span>
          </p>
        </div>
      </div>

      {/* 2. Main Remarks Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-800 text-base tracking-tight">Shift Remarks & Daily Logs</h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-medium border border-indigo-100">
              {selectedTagFilter === 'all' ? 'All Categories' : `#${selectedTagFilter}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search remarks, tags, or dates..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>

            <button
              onClick={onNewRecord}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-xs uppercase tracking-wide"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {/* Tag Filters Sub-bar */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Tags:</span>
          <button
            onClick={() => {
              sounds.playClick();
              setSelectedTagFilter('all');
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${
              selectedTagFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Remarks
          </button>
          {allUniqueTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                sounds.playClick();
                setSelectedTagFilter(tag);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                selectedTagFilter === tag
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>{tag}</span>
            </button>
          ))}
        </div>

        {/* Remarks Cards List */}
        <div className="p-6 space-y-4">
          {remarksList.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquareText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-700">No remarks found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? `No remarks match "${searchTerm}".`
                  : 'Add remarks to your daily logs to track specific projects, work from home tasks, or overtime.'}
              </p>
            </div>
          ) : (
            remarksList.map((record) => {
              const dateObj = new Date(record.date + 'T00:00:00');
              const formattedDate = isNaN(dateObj.getTime())
                ? record.date
                : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
              
              const isCopied = copiedId === record.id;

              return (
                <div
                  key={record.id}
                  className={`rounded-xl p-5 border shadow-xs transition space-y-3 ${
                    record.isHoliday
                      ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                      : 'bg-white border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  {/* Header: Date + Shift Times */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          record.isHoliday
                            ? 'bg-amber-500 text-slate-900 shadow-sm'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}
                      >
                        {record.isHoliday ? <Sparkles className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{formattedDate}</h4>
                          {record.isHoliday && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold uppercase tracking-wider">
                              <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                              {record.holidayName || 'Holiday'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span className="text-emerald-700 font-semibold">
                            In: {displayTime(record.timeIn, settings.timeFormat)}
                          </span>
                          <span>·</span>
                          <span className="text-rose-700 font-semibold">
                            Out: {displayTime(record.timeOut, settings.timeFormat)}
                          </span>
                          <span>·</span>
                          <span className="text-slate-800 font-bold">
                            {formatHoursAndMinutes(record.totalHours)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Copy & Edit */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyRemark(record)}
                        title="Copy Summary to Clipboard"
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 transition"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          sounds.playClick();
                          onEditRecord(record);
                        }}
                        title="Edit Entry"
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main Remark Text */}
                  <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-100">
                    <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {record.remarks || (
                        <span className="text-slate-400 italic">
                          No written notes entered for this date.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Category Tags */}
                  {record.tags && record.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {record.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100/60"
                        >
                          <Tag className="w-2.5 h-2.5 text-indigo-500" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
