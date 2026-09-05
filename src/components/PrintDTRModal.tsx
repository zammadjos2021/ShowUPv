import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileDown, 
  Check, 
  FolderDown, 
  Share2, 
  FileEdit, 
  HardDrive, 
  Sparkles, 
  Info,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Eye
} from 'lucide-react';
import { TimeRecord, UserSettings } from '../types';
import { displayTime, formatHoursAndMinutes, isRecordAbsent } from '../utils/timeCalculations';
import { exportToPDF } from '../utils/exportUtils';
import { sounds } from '../utils/soundEffects';

interface PrintDTRModalProps {
  records: TimeRecord[];
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
}

export const PrintDTRModal: React.FC<PrintDTRModalProps> = ({
  records,
  isOpen,
  onClose,
  settings,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [fileName, setFileName] = useState<string>('');
  const [isCustomName, setIsCustomName] = useState(false);
  const [showAndroidTips, setShowAndroidTips] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ 
    active: boolean; 
    message: string; 
    isError?: boolean; 
    directUrl?: string; 
    downloadName?: string;
  }>({
    active: false,
    message: '',
  });

  // Calculate default filename whenever month or settings change
  useEffect(() => {
    if (!isCustomName) {
      const safeName = settings.employeeName ? settings.employeeName.trim().replace(/\s+/g, '_') : 'DTR';
      setFileName(`DTR_Summary_${safeName}_${selectedMonth}`);
    }
  }, [selectedMonth, settings.employeeName, isCustomName]);

  if (!isOpen) return null;

  // Filter records for selected month
  const monthRecords = records
    .filter((r) => r.date.startsWith(selectedMonth))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalMonthlyHours = monthRecords.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);

  const monthName = new Date(selectedMonth + '-01T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Quick preset naming templates
  const applyPreset = (preset: string) => {
    sounds.playClick();
    const safeName = settings.employeeName ? settings.employeeName.trim().replace(/\s+/g, '_') : 'Employee';
    const [year, mon] = selectedMonth.split('-');
    let name = '';

    if (preset === 'standard') {
      name = `DTR_Summary_${safeName}_${selectedMonth}`;
    } else if (preset === 'form48') {
      name = `Civil_Service_Form48_${safeName}_${selectedMonth}`;
    } else if (preset === 'monthly') {
      name = `Monthly_DTR_${monthName.replace(/\s+/g, '_')}_${safeName}`;
    } else if (preset === 'simple') {
      name = `DTR_${year}_${mon}`;
    }

    setFileName(name);
    setIsCustomName(true);
  };

  const handleResetName = () => {
    sounds.playClick();
    setIsCustomName(false);
    const safeName = settings.employeeName ? settings.employeeName.trim().replace(/\s+/g, '_') : 'DTR';
    setFileName(`DTR_Summary_${safeName}_${selectedMonth}`);
  };

  // Trigger Save with options
  const handleExport = async (mode: 'picker' | 'download' | 'share' | 'print' | 'open') => {
    sounds.playClick();
    
    // Clean file name
    let cleanName = fileName.trim() || `DTR_${selectedMonth}`;
    if (!cleanName.toLowerCase().endsWith('.pdf')) {
      cleanName += '.pdf';
    }

    if (mode === 'print') {
      window.print();
      return;
    }

    setSaveStatus({ active: true, message: 'Generating PDF...' });

    try {
      const res = await exportToPDF(selectedMonth, records, settings, {
        customFileName: cleanName,
        mode,
      });

      if (res.success) {
        sounds.playSuccess();
        const successMsg = 
          mode === 'picker' 
            ? 'PDF saved to chosen storage!' 
            : mode === 'share' 
            ? 'Sent to Android system share!' 
            : mode === 'open'
            ? 'PDF opened in viewer tab!'
            : 'PDF download initiated to device!';
        
        setSaveStatus({ 
          active: true, 
          message: successMsg, 
          directUrl: res.dataUrl || res.blobUrl, 
          downloadName: cleanName 
        });
        setTimeout(() => setSaveStatus((prev) => ({ ...prev, active: false })), 6000);
      } else {
        if (res.error?.includes('cancelled')) {
          setSaveStatus({ active: false, message: '' });
        } else {
          setSaveStatus({ active: true, message: res.error || 'Failed to save', isError: true });
          setTimeout(() => setSaveStatus({ active: false, message: '' }), 4000);
        }
      }
    } catch (err: any) {
      setSaveStatus({ active: true, message: 'Export error occurred', isError: true });
      setTimeout(() => setSaveStatus({ active: false, message: '' }), 4000);
    }
  };

  const hasNativePicker = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  const hasShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col my-4 sm:my-8">
        
        {/* Modal Header & Quick Bar (Hidden during print) */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Official Daily Time Record (DTR)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-300 font-medium border border-indigo-700/50">
                  Form 48
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Export, print, or save to device internal/external memory</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-[11px] text-slate-400 font-medium">Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs bg-transparent text-white font-mono focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File Renaming & Storage Destination Options Bar (Print: hidden) */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-800/95 text-slate-200 border-b border-slate-700/80 print:hidden space-y-3">
          {/* File Renaming Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <FileEdit className="w-4 h-4 text-indigo-400 shrink-0" />
              <label htmlFor="dtr-filename-input" className="text-xs font-semibold text-slate-300 shrink-0">
                File Name:
              </label>
              <div className="relative flex-1 flex items-center">
                <input
                  id="dtr-filename-input"
                  type="text"
                  value={fileName}
                  onChange={(e) => {
                    setFileName(e.target.value);
                    setIsCustomName(true);
                  }}
                  placeholder="e.g. DTR_Summary_Juan_Dela_Cruz_2026-08"
                  className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-12"
                />
                <span className="absolute right-2.5 text-[11px] font-mono text-slate-400 pointer-events-none">
                  .pdf
                </span>
              </div>
              {isCustomName && (
                <button
                  onClick={handleResetName}
                  className="text-[11px] text-indigo-300 hover:text-indigo-200 underline whitespace-nowrap"
                  title="Reset to default format"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold mr-1">Presets:</span>
              <button
                onClick={() => applyPreset('standard')}
                className="px-2 py-0.5 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-300 border border-slate-600/60 transition"
              >
                Standard DTR
              </button>
              <button
                onClick={() => applyPreset('form48')}
                className="px-2 py-0.5 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-300 border border-slate-600/60 transition"
              >
                Form 48
              </button>
              <button
                onClick={() => applyPreset('monthly')}
                className="px-2 py-0.5 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-300 border border-slate-600/60 transition"
              >
                By Month
              </button>
            </div>
          </div>

          {/* Action Destination Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/60">
            <div className="flex flex-wrap items-center gap-2">
              {/* Option 1: Direct Download (Enhanced for Android) */}
              <button
                id="dtr-direct-download-btn"
                onClick={() => handleExport('download')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition active:scale-98"
                title="Download PDF directly to Downloads folder"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Download PDF</span>
              </button>

              {/* Option 2: Android Share (Save to Files / Google Drive / Apps) */}
              {hasShare && (
                <button
                  id="dtr-android-share-btn"
                  onClick={() => handleExport('share')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 border border-indigo-500 shadow-sm transition active:scale-98"
                  title="Send via Android Share Sheet (Save to Files, Google Drive, SD Card, etc.)"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Android Share / Save</span>
                </button>
              )}

              {/* Option 3: Open in Tab / PDF Viewer */}
              <button
                id="dtr-open-tab-btn"
                onClick={() => handleExport('open')}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-600 transition"
                title="Open PDF in a new tab or Android PDF Viewer for 1-tap download"
              >
                <Eye className="w-3.5 h-3.5 text-amber-300" />
                <span>Open / View PDF</span>
              </button>

              {/* Option 4: Android Print Manager */}
              <button
                id="dtr-android-print-btn"
                onClick={() => handleExport('print')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition active:scale-98"
                title="Open Android Print Manager to print or Save as PDF to any memory location"
              >
                <Printer className="w-3.5 h-3.5 text-blue-200" />
                <span>Android Print</span>
              </button>

              {/* Option 5: Save to Folder / SD Card (Desktop / Supported Browsers) */}
              {hasNativePicker && (
                <button
                  id="dtr-choose-folder-btn"
                  onClick={() => handleExport('picker')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-600 transition"
                  title="Open file location selector to choose storage directory"
                >
                  <FolderDown className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Choose Folder</span>
                </button>
              )}
            </div>

            {/* Android Guide Toggle */}
            <button
              onClick={() => setShowAndroidTips(!showAndroidTips)}
              className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 font-medium transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android save tips</span>
              {showAndroidTips ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Android Save Guide Accordion */}
          {showAndroidTips && (
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700 text-xs space-y-1.5 text-slate-300 animate-fadeIn">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <span>How to Save PDF on Android Phone (Internal & SD Card):</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
                <li>
                  <strong className="text-white">Method 1 (Download PDF):</strong> Tapping Download saves the PDF file directly to your Android <strong>Downloads</strong> folder.
                </li>
                <li>
                  <strong className="text-white">Method 2 (Android Share / Save):</strong> Opens Android's system share sheet where you can pick <strong>"Files by Google"</strong>, <strong>"Save to Drive"</strong>, or your <strong>SD Card manager</strong>.
                </li>
                <li>
                  <strong className="text-white">Method 3 (Android Print):</strong> In the printer dropdown, select <strong>"Save as PDF"</strong>, then tap the PDF icon to choose any storage folder.
                </li>
                <li>
                  <strong className="text-white">Method 4 (Open / View PDF):</strong> Opens the PDF in Google Chrome's built-in PDF viewer with a permanent top download button.
                </li>
              </ul>
            </div>
          )}

          {/* Status notification toast with direct tap link for Android fallback */}
          {saveStatus.active && (
            <div className={`px-3 py-2 rounded-lg text-xs font-semibold flex flex-wrap items-center justify-between gap-2 ${
              saveStatus.isError ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {!saveStatus.isError ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <Info className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{saveStatus.message}</span>
              </div>
              {saveStatus.directUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={saveStatus.directUrl}
                    download={saveStatus.downloadName || `${fileName}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold underline flex items-center gap-1 shadow-2xs transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>Tap here if file didn't start</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Printable Official DTR Document Content */}
        <div className="p-6 md:p-8 bg-white text-slate-900 space-y-4 font-sans text-xs print:p-0 print:m-0 overflow-y-auto max-h-[55vh]">
          {/* Header */}
          <div className="text-center border-b border-slate-300 pb-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
              CIVIL SERVICE FORM NO. 48 / STANDARD CORPORATE FORM
            </span>
            <h2 className="text-lg font-bold uppercase tracking-tight text-slate-900 mt-0.5">
              DAILY TIME RECORD
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              {settings.companyName || 'Corporate & Field Operations'}
            </p>
          </div>

          {/* Employee Info Header */}
          <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200 text-xs">
            <div>
              <p>
                <span className="font-semibold text-slate-600">Employee Name:</span>{' '}
                <span className="font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                  {settings.employeeName || '__________________________'}
                </span>
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-600">Employee ID:</span>{' '}
                <span className="font-mono font-medium text-slate-800">
                  {settings.employeeId || 'N/A'}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p>
                <span className="font-semibold text-slate-600">For the Month of:</span>{' '}
                <span className="font-bold text-indigo-900">{monthName}</span>
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-600">Department:</span>{' '}
                <span className="text-slate-800">{settings.department || 'General Staff'}</span>
              </p>
            </div>
          </div>

          {/* 2-Column (15/15) DTR Table - Date, Time In, Time Out only */}
          {(() => {
            const [yearStr, monthStr] = selectedMonth.split('-');
            const year = parseInt(yearStr, 10) || new Date().getFullYear();
            const monthIndex = (parseInt(monthStr, 10) || 1) - 1;
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
            const maxRows = Math.max(15, daysInMonth - 15);

            return (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-400 text-[11px] text-center">
                  <thead>
                    <tr className="bg-slate-200 font-bold border-b border-slate-400 text-slate-900">
                      <th colSpan={3} className="border border-slate-400 py-1 px-2 text-xs uppercase tracking-wide bg-slate-200">
                        1st Period (Days 1 - 15)
                      </th>
                      <th className="w-2.5 bg-slate-300 border-l border-r border-slate-400 p-0"></th>
                      <th colSpan={3} className="border border-slate-400 py-1 px-2 text-xs uppercase tracking-wide bg-slate-200">
                        2nd Period (Days 16 - {daysInMonth})
                      </th>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-b border-slate-400 text-slate-800">
                      <th className="border border-slate-400 py-1 px-2 w-[16%]">Date</th>
                      <th className="border border-slate-400 py-1 px-2 text-emerald-800 w-[17%]">Time In</th>
                      <th className="border border-slate-400 py-1 px-2 text-rose-800 w-[17%]">Time Out</th>
                      <th className="w-2.5 bg-slate-300 border-l border-r border-slate-400 p-0"></th>
                      <th className="border border-slate-400 py-1 px-2 w-[16%]">Date</th>
                      <th className="border border-slate-400 py-1 px-2 text-emerald-800 w-[17%]">Time In</th>
                      <th className="border border-slate-400 py-1 px-2 text-rose-800 w-[17%]">Time Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxRows }).map((_, i) => {
                      const leftDay = i + 1 <= 15 ? i + 1 : null;
                      const rightDay = 16 + i <= daysInMonth ? 16 + i : null;

                      const leftDateStr = leftDay ? `${selectedMonth}-${String(leftDay).padStart(2, '0')}` : null;
                      const rightDateStr = rightDay ? `${selectedMonth}-${String(rightDay).padStart(2, '0')}` : null;

                      const leftRec = leftDateStr ? monthRecords.find((r) => r.date === leftDateStr) : null;
                      const rightRec = rightDateStr ? monthRecords.find((r) => r.date === rightDateStr) : null;

                      const isLeftAbsent = leftRec ? isRecordAbsent(leftRec) : false;
                      const isRightAbsent = rightRec ? isRecordAbsent(rightRec) : false;

                      const isLeftHoliday = Boolean(leftRec?.isHoliday);
                      const isRightHoliday = Boolean(rightRec?.isHoliday);

                      return (
                        <tr key={i} className={`border-b border-slate-300 hover:bg-slate-50 ${isLeftHoliday || isRightHoliday ? 'bg-amber-50/30' : ''}`}>
                          {/* Left Column: Days 1 to 15 */}
                          <td className={`border border-slate-300 py-1 px-1.5 font-mono font-bold ${
                            isLeftHoliday ? 'text-amber-900 bg-amber-100/70' : 'text-slate-700 bg-slate-50/70'
                          }`}>
                            {leftDay ? `Day ${leftDay}` : '-'}
                            {isLeftHoliday && <span className="ml-1 text-[9px] font-black uppercase text-amber-800">★</span>}
                          </td>
                          <td className={`border border-slate-300 py-1 px-1.5 font-mono font-bold ${
                            isLeftHoliday && !leftRec?.timeIn
                              ? 'text-amber-800 bg-amber-50/60 text-[10px]'
                              : isLeftAbsent
                              ? 'text-rose-600 bg-rose-50/50'
                              : leftRec?.timeIn
                              ? 'text-emerald-700'
                              : 'text-slate-400 font-normal'
                          }`}>
                            {leftRec?.timeIn
                              ? displayTime(leftRec.timeIn, settings.timeFormat)
                              : isLeftHoliday
                              ? 'HOLIDAY'
                              : isLeftAbsent
                              ? 'ABSENT'
                              : '-'}
                          </td>
                          <td className={`border border-slate-300 py-1 px-1.5 font-mono font-bold ${
                            isLeftHoliday && !leftRec?.timeOut
                              ? 'text-amber-800 bg-amber-50/60 text-[10px]'
                              : isLeftAbsent
                              ? 'text-rose-600 bg-rose-50/50'
                              : leftRec?.timeOut
                              ? 'text-rose-700'
                              : 'text-slate-400 font-normal'
                          }`}>
                            {leftRec?.timeOut
                              ? displayTime(leftRec.timeOut, settings.timeFormat)
                              : isLeftHoliday
                              ? 'HOLIDAY'
                              : isLeftAbsent
                              ? 'ABSENT'
                              : '-'}
                          </td>

                          {/* Middle Separator */}
                          <td className="w-2.5 bg-slate-200 border-l border-r border-slate-400 p-0"></td>

                          {/* Right Column: Days 16 to 31 */}
                          <td className={`border border-slate-300 py-1 px-1.5 font-mono font-bold ${
                            isRightHoliday ? 'text-amber-900 bg-amber-100/70' : 'text-slate-700 bg-slate-50/70'
                          }`}>
                            {rightDay ? `Day ${rightDay}` : '-'}
                            {isRightHoliday && <span className="ml-1 text-[9px] font-black uppercase text-amber-800">★</span>}
                          </td>
                          <td className={`border border-slate-300 py-1 px-1.5 font-mono font-bold ${
                            isRightHoliday && !rightRec?.timeIn
                              ? 'text-amber-800 bg-amber-50/60 text-[10px]'
                              : isRightAbsent
                              ? 'text-rose-600 bg-rose-50/50'
                              : rightRec?.timeIn
                              ? 'text-emerald-700'
                              : 'text-slate-400 font-normal'
                          }`}>
                            {rightRec?.timeIn
                              ? displayTime(rightRec.timeIn, settings.timeFormat)
                              : isRightHoliday
                              ? 'HOLIDAY'
                              : isRightAbsent
                              ? 'ABSENT'
                              : '-'}
                          </td>
                          <td className={`border border-slate-300 py-1 px-1.5 font-mono font-bold ${
                            isRightHoliday && !rightRec?.timeOut
                              ? 'text-amber-800 bg-amber-50/60 text-[10px]'
                              : isRightAbsent
                              ? 'text-rose-600 bg-rose-50/50'
                              : rightRec?.timeOut
                              ? 'text-rose-700'
                              : 'text-slate-400 font-normal'
                          }`}>
                            {rightRec?.timeOut
                              ? displayTime(rightRec.timeOut, settings.timeFormat)
                              : isRightHoliday
                              ? 'HOLIDAY'
                              : isRightAbsent
                              ? 'ABSENT'
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                      <td colSpan={3} className="p-1.5 text-center">
                        1st Period Logged: <span className="text-indigo-700">{monthRecords.filter(r => parseInt(r.date.split('-')[2], 10) <= 15).length} Days</span>
                      </td>
                      <td className="w-2.5 bg-slate-200 border-l border-r border-slate-400 p-0"></td>
                      <td colSpan={3} className="p-1.5 text-center">
                        2nd Period Logged: <span className="text-indigo-700">{monthRecords.filter(r => parseInt(r.date.split('-')[2], 10) > 15).length} Days</span>
                      </td>
                    </tr>
                    <tr className="bg-slate-200/90 font-bold border-t border-slate-300 text-slate-900">
                      <td colSpan={7} className="p-2 text-center text-xs uppercase tracking-wider">
                        Total Monthly Hours: <span className="text-indigo-700 font-mono text-sm ml-1 font-bold">{totalMonthlyHours.toFixed(2)} hrs</span> <span className="text-slate-600 font-normal font-sans text-xs">({formatHoursAndMinutes(totalMonthlyHours)})</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}

          {/* Certification Text */}
          <div className="pt-2 text-[10px] text-slate-600 leading-relaxed border-t border-slate-200">
            <p className="italic text-center">
              "I certify on my honor that the above is a true and correct report of the hours of work performed,
              record of which was made daily at the time of arrival and departure from office."
            </p>
          </div>

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 w-4/5 mx-auto pt-1 font-bold text-slate-800">
                {settings.employeeName || 'Employee Signature'}
              </div>
              <span className="text-[10px] text-slate-500">Employee Signature</span>
            </div>

            <div>
              <div className="border-t border-slate-400 w-4/5 mx-auto pt-1 font-bold text-slate-800">
                Verified In-Charge / Supervisor
              </div>
              <span className="text-[10px] text-slate-500">Authorized Official / Department Head</span>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden in print) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <span className="text-xs text-slate-500">
            {monthRecords.length} shifts recorded in {monthName} ({totalMonthlyHours.toFixed(1)} total hours)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={() => handleExport('open')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-2xs transition"
              title="Open PDF in new tab"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Open PDF</span>
            </button>
            <button
              onClick={() => handleExport('print')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-2xs transition"
              title="Android Print Manager"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Android Print</span>
            </button>
            <button
              onClick={() => handleExport('download')}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 shadow-sm uppercase tracking-wider transition active:scale-98"
              title="Download PDF directly"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

