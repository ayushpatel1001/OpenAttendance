// SheetPulse • Weekly Gazette & Rollup Reporting
// 16-Hour Pairing Rollup • Overtime Tracking • Standalone Google Sheet Export

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Printer, AlertCircle } from 'lucide-react';
import type { WeeklyRollupRow } from '../types';
import { generateWeeklyReport, exportReportToCsv, getIsoWeekString } from '../services/reports';
import { googleSheetsService } from '../services/googleSheets';
import { getSystemMeta } from '../services/db';

export const WeeklyGazette: React.FC = () => {
  const [reportRows, setReportRows] = useState<WeeklyRollupRow[]>([]);
  const [currentWeek, setCurrentWeek] = useState<string>(getIsoWeekString(new Date()));
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const loadReport = async (week: string) => {
    const data = await generateWeeklyReport(week);
    setReportRows(data);
  };

  useEffect(() => {
    loadReport(currentWeek);
  }, [currentWeek]);

  // Aggregate stats
  const totalRegularHours = reportRows.reduce((acc, r) => acc + r.total_regular_hrs, 0);
  const totalOvertimeHours = reportRows.reduce((acc, r) => acc + r.overtime_hrs, 0);
  const totalLateArrivals = reportRows.reduce((acc, r) => acc + r.late_count, 0);
  const totalMissingOut = reportRows.reduce((acc, r) => acc + r.missing_out_punches, 0);

  const handleDownloadCsv = () => {
    const csv = exportReportToCsv(reportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SheetPulse_Weekly_Report_${currentWeek}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportGoogleSheet = async () => {
    setIsExporting(true);
    setExportNotice(null);
    const meta = await getSystemMeta();

    if (meta.google_access_token) {
      try {
        const matrixData = [
          ['ISO Week', 'Date Range', 'Emp ID', 'Full Name', 'Department', 'Days Present', 'Days Absent', 'Regular Hours', 'Overtime Hours', 'Late Count', 'Missing OUT Punches'],
          ...reportRows.map(r => [
            r.iso_week,
            r.date_range,
            r.emp_id,
            r.full_name,
            r.department,
            r.days_present,
            r.days_absent,
            r.total_regular_hrs,
            r.overtime_hrs,
            r.late_count,
            r.missing_out_punches,
          ]),
        ];

        const { spreadsheetUrl } = await googleSheetsService.createStandaloneWeeklySheet(
          currentWeek,
          matrixData,
          meta.google_access_token
        );

        setExportNotice(`Standalone Google Sheet created: ${spreadsheetUrl}`);
      } catch (err: any) {
        setExportNotice(`Export failed: ${err.message}. Ensure valid OAuth token.`);
      }
    } else {
      // Local simulation export
      handleDownloadCsv();
      setExportNotice('Exported as clean CSV formatted for immediate Google Sheets / Excel import.');
    }
    setIsExporting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Editorial Summary Banner */}
      <div className="ft-card ft-card-editorial">
        <div className="ft-card-header">
          <div>
            <div className="ft-card-title">
              <span>EXECUTIVE WEEKLY REPORT & PAYROLL ROLLUP</span>
              <select
                value={currentWeek}
                onChange={e => setCurrentWeek(e.target.value)}
                style={{
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono-ledger)',
                  fontWeight: 700,
                  backgroundColor: 'var(--ft-claret-light)',
                  color: 'var(--ft-claret)',
                  border: '1px solid rgba(153, 15, 61, 0.3)',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer',
                }}
              >
                <option value="2026-W42">2026-W42 (CURRENT)</option>
                <option value="2026-W41">2026-W41 (OCT 05 - OCT 11)</option>
                <option value="2026-W40">2026-W40 (SEP 28 - OCT 04)</option>
              </select>
            </div>
            <div className="ft-card-subtitle">
              Calculated via 16-Hour Pairing Window • Overtime multipliers applied • Standalone Sheet Ready
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrint} className="btn-ft btn-ft-outline" style={{ fontSize: '12px' }}>
              <Printer size={13} />
              Print Gazette
            </button>
            <button onClick={handleDownloadCsv} className="btn-ft btn-ft-outline" style={{ fontSize: '12px' }}>
              <Download size={13} />
              Export CSV
            </button>
            <button
              onClick={handleExportGoogleSheet}
              disabled={isExporting}
              className="btn-ft btn-ft-primary"
              style={{ fontSize: '12px' }}
            >
              <FileSpreadsheet size={13} />
              {isExporting ? 'Exporting...' : 'Export to Google Sheet'}
            </button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--ft-border-rule)',
            backgroundColor: '#FFFDFB',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          <div style={{ borderRight: '1px solid var(--ft-border-rule)', paddingRight: '12px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ft-ink-muted)', fontWeight: 600 }}>
              REGULAR WORKED HOURS
            </div>
            <div style={{ fontFamily: 'var(--font-serif-headline)', fontSize: '24px', fontWeight: 700, color: 'var(--ft-ink-primary)' }}>
              {totalRegularHours.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 500 }}>hrs</span>
            </div>
          </div>

          <div style={{ borderRight: '1px solid var(--ft-border-rule)', paddingRight: '12px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ft-ink-muted)', fontWeight: 600 }}>
              APPROVED OVERTIME
            </div>
            <div style={{ fontFamily: 'var(--font-serif-headline)', fontSize: '24px', fontWeight: 700, color: 'var(--ft-green)' }}>
              +{totalOvertimeHours.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 500 }}>hrs</span>
            </div>
          </div>

          <div style={{ borderRight: '1px solid var(--ft-border-rule)', paddingRight: '12px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ft-ink-muted)', fontWeight: 600 }}>
              LATE ARRIVALS
            </div>
            <div style={{ fontFamily: 'var(--font-serif-headline)', fontSize: '24px', fontWeight: 700, color: totalLateArrivals > 0 ? 'var(--ft-amber)' : 'var(--ft-green)' }}>
              {totalLateArrivals} <span style={{ fontSize: '14px', fontWeight: 500 }}>flagged</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ft-ink-muted)', fontWeight: 600 }}>
              MISSING OUT PUNCHES
            </div>
            <div style={{ fontFamily: 'var(--font-serif-headline)', fontSize: '24px', fontWeight: 700, color: totalMissingOut > 0 ? 'var(--ft-red)' : 'var(--ft-green)' }}>
              {totalMissingOut} <span style={{ fontSize: '14px', fontWeight: 500 }}>unpaired</span>
            </div>
          </div>
        </div>

        {exportNotice && (
          <div
            style={{
              padding: '10px 18px',
              backgroundColor: 'var(--ft-paper-subtle)',
              borderBottom: '1px solid var(--ft-border-rule)',
              fontSize: '12.5px',
              color: 'var(--ft-ink-primary)',
            }}
          >
            {exportNotice}
          </div>
        )}

        {/* Table */}
        <div className="ft-table-wrapper" style={{ border: 'none' }}>
          <table className="ft-table">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>DEPARTMENT</th>
                <th>PRESENT</th>
                <th>ABSENT</th>
                <th>REGULAR HOURS</th>
                <th>OVERTIME HOURS</th>
                <th>LATE COUNT</th>
                <th>MISSING OUT</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map(row => (
                <tr key={row.emp_id}>
                  <td>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-serif-headline)', fontSize: '14px' }}>
                      {row.full_name}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono-ledger)', color: 'var(--ft-ink-muted)' }}>
                      {row.emp_id}
                    </div>
                  </td>

                  <td>{row.department}</td>

                  <td>
                    <span className="badge-ft badge-ft-green">{row.days_present} DAYS</span>
                  </td>

                  <td>
                    {row.days_absent > 0 ? (
                      <span className="badge-ft badge-ft-dark">{row.days_absent} DAYS</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--ft-green)' }}>0</span>
                    )}
                  </td>

                  <td style={{ fontFamily: 'var(--font-mono-ledger)', fontWeight: 600 }}>
                    {row.total_regular_hrs.toFixed(1)}h
                  </td>

                  <td style={{ fontFamily: 'var(--font-mono-ledger)', fontWeight: 600, color: row.overtime_hrs > 0 ? 'var(--ft-green)' : 'inherit' }}>
                    {row.overtime_hrs > 0 ? `+${row.overtime_hrs.toFixed(1)}h` : '0.0h'}
                  </td>

                  <td>
                    {row.late_count > 0 ? (
                      <span className="badge-ft badge-ft-amber">{row.late_count} LATE</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--ft-green)' }}>0</span>
                    )}
                  </td>

                  <td>
                    {row.missing_out_punches > 0 ? (
                      <span className="badge-ft badge-ft-claret">
                        <AlertCircle size={10} /> {row.missing_out_punches} MISSING
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--ft-green)' }}>0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={2}>LEDGER TOTALS:</td>
                <td>—</td>
                <td>—</td>
                <td>{totalRegularHours.toFixed(1)} hrs</td>
                <td style={{ color: 'var(--ft-green)' }}>+{totalOvertimeHours.toFixed(1)} hrs</td>
                <td>{totalLateArrivals}</td>
                <td>{totalMissingOut}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
