import { TimeRecord, UserSettings } from '../types';
import { displayTime, formatHoursAndMinutes, isRecordAbsent } from './timeCalculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportOptions {
  customFileName?: string;
  mode?: 'picker' | 'download' | 'share' | 'print' | 'open';
}

/**
 * Builds the official DTR jsPDF document instance
 */
export function buildDTRPDFDoc(
  month: string, // format: "YYYY-MM"
  records: TimeRecord[],
  settings: UserSettings
): { doc: jsPDF; defaultFileName: string; monthName: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Filter records for selected month
  const monthRecords = records
    .filter((r) => r.date.startsWith(month))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const monthDate = new Date(month + '-01T00:00:00');
  const monthName = isNaN(monthDate.getTime())
    ? month
    : monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const totalMonthlyHours = monthRecords.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
  const standardHours = settings.standardDailyHours || 8;
  const totalOvertime = monthRecords.reduce((acc, curr) => {
    return acc + Math.max(0, (curr.totalHours || 0) - standardHours);
  }, 0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. Header & Title Block
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, 12, pageWidth - margin * 2, 22, 'F');

  // Title in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(settings.companyName || 'DAILY TIME RECORD & ATTENDANCE REPORT', margin + 6, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text('CIVIL SERVICE FORM NO. 48 / CORPORATE DTR SUMMARY', margin + 6, 28);

  // Month Badge (Top Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(monthName.toUpperCase(), pageWidth - margin - 6, 21, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    pageWidth - margin - 6,
    28,
    { align: 'right' }
  );

  // 2. Employee Info & Metrics Banner
  const startY = 38;

  // Info Box Frame
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, startY, pageWidth - margin * 2, 24, 2, 2, 'FD');

  // Employee details (Left column)
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE NAME:', margin + 5, startY + 6);
  doc.text('EMPLOYEE ID / BADGE:', margin + 5, startY + 12);
  doc.text('DEPARTMENT / UNIT:', margin + 5, startY + 18);

  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.text(settings.employeeName || 'Staff Member', margin + 42, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.employeeId || 'N/A', margin + 42, startY + 12);
  doc.text(settings.department || 'Operations', margin + 42, startY + 18);

  // Metric Summary (Right column)
  const rightColX = margin + (pageWidth - margin * 2) * 0.55;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIFTS LOGGED:', rightColX, startY + 6);
  doc.text('TOTAL HOURS:', rightColX, startY + 12);
  doc.text('OVERTIME (+OT):', rightColX, startY + 18);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`${monthRecords.length} days`, rightColX + 30, startY + 6);

  doc.setTextColor(67, 56, 202); // Indigo-700
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalMonthlyHours.toFixed(2)} hrs (${formatHoursAndMinutes(totalMonthlyHours)})`, rightColX + 30, startY + 12);

  doc.setTextColor(217, 119, 6); // Amber-600
  doc.text(`+${totalOvertime.toFixed(2)} hrs`, rightColX + 30, startY + 18);

  // 3. Table Rows - 2 Column (15/15) Layout: Date, Time In, Time Out (Exclude Day & Break)
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const monthIndex = (parseInt(monthStr, 10) || 1) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const maxRows = Math.max(15, daysInMonth - 15);

  const tableRows: (string | { content: string; styles?: any })[][] = [];

  for (let i = 0; i < maxRows; i++) {
    const leftDay = i + 1 <= 15 ? i + 1 : null;
    const rightDay = 16 + i <= daysInMonth ? 16 + i : null;

    const leftDateStr = leftDay ? `${month}-${String(leftDay).padStart(2, '0')}` : null;
    const rightDateStr = rightDay ? `${month}-${String(rightDay).padStart(2, '0')}` : null;

    const leftRec = leftDateStr ? monthRecords.find((r) => r.date === leftDateStr) : null;
    const rightRec = rightDateStr ? monthRecords.find((r) => r.date === rightDateStr) : null;

    const isLeftAbsent = leftRec ? isRecordAbsent(leftRec) : false;
    const isRightAbsent = rightRec ? isRecordAbsent(rightRec) : false;

    const leftDayLabel = leftDay ? `Day ${leftDay}` : '-';
    const leftIn = leftRec?.timeIn
      ? displayTime(leftRec.timeIn, settings.timeFormat)
      : isLeftAbsent
      ? 'ABSENT'
      : '-';
    const leftOut = leftRec?.timeOut
      ? displayTime(leftRec.timeOut, settings.timeFormat)
      : isLeftAbsent
      ? 'ABSENT'
      : '-';

    const rightDayLabel = rightDay ? `Day ${rightDay}` : '-';
    const rightIn = rightRec?.timeIn
      ? displayTime(rightRec.timeIn, settings.timeFormat)
      : isRightAbsent
      ? 'ABSENT'
      : '-';
    const rightOut = rightRec?.timeOut
      ? displayTime(rightRec.timeOut, settings.timeFormat)
      : isRightAbsent
      ? 'ABSENT'
      : '-';

    tableRows.push([
      leftDayLabel,
      leftIn,
      leftOut,
      rightDayLabel,
      rightIn,
      rightOut,
    ]);
  }

  // 2-Column AutoTable
  autoTable(doc, {
    startY: startY + 28,
    margin: { left: margin, right: margin },
    head: [
      [
        { content: '1st Period (Days 1 - 15)', colSpan: 3, styles: { halign: 'center', fillColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 } },
        { content: `2nd Period (Days 16 - ${daysInMonth})`, colSpan: 3, styles: { halign: 'center', fillColor: [30, 41, 59], fontStyle: 'bold', fontSize: 8.5 } },
      ],
      ['Date', 'Time In', 'Time Out', 'Date', 'Time In', 'Time Out'],
    ],
    body: tableRows,
    foot: [
      [
        {
          content: `TOTAL LOGS: ${monthRecords.length} DAYS  |  PRESENT: ${monthRecords.filter((r) => !isRecordAbsent(r)).length}  |  ABSENT: ${monthRecords.filter((r) => isRecordAbsent(r)).length}  |  TOTAL HOURS: ${totalMonthlyHours.toFixed(2)} hrs (${formatHoursAndMinutes(totalMonthlyHours)})`,
          colSpan: 6,
          styles: { halign: 'center', fontStyle: 'bold', fontSize: 8 },
        },
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85], // Slate-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    footStyles: {
      fillColor: [241, 245, 249], // Slate-100
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      1: { halign: 'center', fontStyle: 'bold', textColor: [16, 117, 76] }, // Emerald
      2: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28] }, // Rose
      3: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      4: { halign: 'center', fontStyle: 'bold', textColor: [16, 117, 76] }, // Emerald
      5: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28] }, // Rose
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
  });

  // Get table bottom Y position
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // Check space for certification and signatures
  let certY = finalY + 8;
  if (certY + 36 > pageHeight) {
    doc.addPage();
    certY = 20;
  }

  // 4. Certification Text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '"I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office."',
    pageWidth / 2,
    certY,
    { align: 'center', maxWidth: pageWidth - margin * 2 }
  );

  // 5. Signature Lines
  const sigY = certY + 18;
  const colWidth = 65;

  // Left: Employee signature
  const empSigX = margin + 12;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(empSigX, sigY, empSigX + colWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.employeeName || 'Employee Signature', empSigX + colWidth / 2, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Employee Signature', empSigX + colWidth / 2, sigY + 8, { align: 'center' });

  // Right: Supervisor signature
  const supSigX = pageWidth - margin - colWidth - 12;
  doc.line(supSigX, sigY, supSigX + colWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Official / Supervisor', supSigX + colWidth / 2, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Verified In-Charge', supSigX + colWidth / 2, sigY + 8, { align: 'center' });

  // 6. Footer (Page numbers and generated stamp)
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Daily Time Keeper • Monthly Summary: ${monthName} • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const safeName = settings.employeeName ? settings.employeeName.replace(/\s+/g, '_') : 'DTR';
  const defaultFileName = `DTR_Summary_${safeName}_${month}.pdf`;

  return { doc, defaultFileName, monthName };
}

/**
 * Generates and saves a clean PDF file with support for:
 * 1. Custom renaming option
 * 2. File System Access API (allows choosing save directory in internal/external memory on supported devices)
 * 3. Web Share API (Android system share sheet: Save to Files / Drive / SD Card)
 * 4. Android Print Manager (window.print with Save as PDF)
 * 5. Direct standard browser download fallback
 */
export async function exportToPDF(
  month: string, // format: "YYYY-MM"
  records: TimeRecord[],
  settings: UserSettings,
  options?: PDFExportOptions
): Promise<{ success: boolean; modeUsed: string; fileName: string; dataUrl?: string; blobUrl?: string; error?: string }> {
  const { doc, defaultFileName } = buildDTRPDFDoc(month, records, settings);
  
  let fileName = options?.customFileName?.trim() || defaultFileName;
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    fileName += '.pdf';
  }

  const mode = options?.mode || 'download';

  // 1. Android Print Manager Mode
  if (mode === 'print') {
    window.print();
    return { success: true, modeUsed: 'print', fileName };
  }

  // Generate PDF Blob, Data URI, and ArrayBuffer
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const dataUri = doc.output('datauristring');
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  // 2. Open Mode (View in browser tab / PDF viewer - works 100% on Android phones)
  if (mode === 'open') {
    try {
      const opened = window.open(blobUrl, '_blank');
      if (!opened) {
        // Popups might be blocked, try window.location or fallback link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return { success: true, modeUsed: 'open', fileName, blobUrl, dataUrl: dataUri };
    } catch (e) {
      console.warn('Window open error:', e);
    }
  }

  // 3. Storage Directory Picker (File System Access API - Desktop Chrome/Edge)
  if (mode === 'picker' && 'showSaveFilePicker' in window) {
    try {
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'PDF Document (*.pdf)',
            accept: {
              'application/pdf': ['.pdf'],
            },
          },
        ],
      });

      const writableStream = await handle.createWritable();
      await writableStream.write(pdfArrayBuffer);
      await writableStream.close();

      return { success: true, modeUsed: 'picker', fileName, blobUrl, dataUrl: dataUri };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, modeUsed: 'picker', fileName, error: 'User cancelled folder selection' };
      }
      console.warn('showSaveFilePicker error, falling back to mobile download:', err);
    }
  }

  // 4. Android System Share (Save to Files, Google Drive, SD Card managers)
  if ((mode === 'share' || (isAndroid && mode === 'picker')) && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: `Daily Time Record (${month})`,
        });
        return { success: true, modeUsed: 'share', fileName, blobUrl, dataUrl: dataUri };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, modeUsed: 'share', fileName, error: 'Share cancelled' };
      }
      console.warn('navigator.share failed, falling back to direct download:', err);
    }
  }

  // 5. High-Compatibility Mobile & Desktop Download
  try {
    // For mobile browsers, also use jsPDF native save which has cross-platform fallback mechanisms
    try {
      doc.save(fileName);
    } catch (saveErr) {
      console.warn('doc.save error:', saveErr);
    }

    // Secondary explicit anchor click with Blob URL & Octet stream fallback
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Keep blob URL active for user fallback tapping
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (e) {}
    }, 60000);

    return { success: true, modeUsed: 'download', fileName, blobUrl, dataUrl: dataUri };
  } catch (err: any) {
    // Ultimate fallback via jsPDF built-in save
    try {
      doc.save(fileName);
    } catch (e) {}
    return { success: true, modeUsed: 'download', fileName, blobUrl, dataUrl: dataUri };
  }
}

/**
 * Generates and downloads a CSV spreadsheet of the Daily Time Record
 */
export async function exportToCSV(
  records: TimeRecord[], 
  settings: UserSettings,
  options?: { customFileName?: string; usePicker?: boolean }
): Promise<void> {
  const headers = ['Date', 'Day', 'Time In', 'Time Out', 'Break (Mins)', 'Total Hours', 'Formatted Hours', 'Tags', 'Remarks'];

  const rows = records.map((record) => {
    const isAbsent = isRecordAbsent(record);
    const d = new Date(record.date + 'T00:00:00');
    const dayName = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'short' });
    
    return [
      `"${record.date}"`,
      `"${dayName}"`,
      `"${record.timeIn ? displayTime(record.timeIn, settings.timeFormat) : 'ABSENT'}"`,
      `"${record.timeOut ? displayTime(record.timeOut, settings.timeFormat) : (isAbsent ? 'ABSENT' : '')}"`,
      record.breakDurationMinutes || 0,
      (record.totalHours || 0).toFixed(2),
      `"${formatHoursAndMinutes(record.totalHours || 0)}"`,
      `"${(record.tags || []).join(', ')}"`,
      `"${(record.remarks || (isAbsent ? 'Absent' : '')).replace(/"/g, '""')}"`
    ];
  });

  const employeeInfo = [
    `"DAILY TIME RECORD (DTR)"`,
    `"Employee Name:", "${settings.employeeName || 'N/A'}"`,
    `"Employee ID:", "${settings.employeeId || 'N/A'}"`,
    `"Department:", "${settings.department || 'N/A'}"`,
    `"Exported Date:", "${new Date().toLocaleDateString()}"`,
    ``
  ];

  const csvContent = [...employeeInfo, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const defaultName = `DTR_${settings.employeeName ? settings.employeeName.replace(/\s+/g, '_') : 'Logs'}_${new Date().toISOString().slice(0, 10)}.csv`;
  let fileName = options?.customFileName?.trim() || defaultName;
  if (!fileName.toLowerCase().endsWith('.csv')) fileName += '.csv';

  if (options?.usePicker && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'CSV Document (*.csv)', accept: { 'text/csv': ['.csv'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
      await writable.close();
      return;
    } catch (e) {
      // fallback
    }
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a complete JSON backup of records and settings
 */
export async function exportBackupJSON(
  records: TimeRecord[], 
  settings: UserSettings,
  options?: { customFileName?: string; usePicker?: boolean }
): Promise<void> {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings,
    records,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const defaultName = `TimeKeeper_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  let fileName = options?.customFileName?.trim() || defaultName;
  if (!fileName.toLowerCase().endsWith('.json')) fileName += '.json';

  if (options?.usePicker && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'JSON Backup (*.json)', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([jsonStr], { type: 'application/json' }));
      await writable.close();
      return;
    } catch (e) {
      // fallback
    }
  }

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

