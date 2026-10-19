// OpenAttendance • Weekly Rollup & Reporting (Clean & Minimal)

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
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
    a.download = `OpenAttendance_Weekly_Report_${currentWeek}.csv`;
    a.click();
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
      handleDownloadCsv();
      setExportNotice('Exported as clean CSV formatted for immediate Google Sheets / Excel import.');
    }
    setIsExporting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="modern-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>REGULAR HOURS</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalRegularHours.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 500 }}>hrs</span>
          </div>
        </div>

        <div className="modern-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>OVERTIME HOURS</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '4px' }}>
            +{totalOvertimeHours.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 500 }}>hrs</span>
          </div>
        </div>

        <div className="modern-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>LATE ARRIVALS</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: totalLateArrivals > 0 ? 'var(--accent-amber)' : 'var(--accent-green)', marginTop: '4px' }}>
            {totalLateArrivals}
          </div>
        </div>

        <div className="modern-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>UNPAIRED PUNCHES</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: totalMissingOut > 0 ? 'var(--accent-red)' : 'var(--accent-green)', marginTop: '4px' }}>
            {totalMissingOut}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              Weekly Attendance & Overtime Rollup
              <select
                value={currentWeek}
                onChange={e => setCurrentWeek(e.target.value)}
                style={{
                  padding: '3px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  marginLeft: '8px',
                }}
              >
                <option value="2026-W42">2026-W42 (Current)</option>
                <option value="2026-W41">2026-W41 (Oct 05 - Oct 11)</option>
                <option value="2026-W40">2026-W40 (Sep 28 - Oct 04)</option>
              </select>
            </div>
            <div className="card-subtitle-clean">
              Aggregated across 16-hour shift pairing windows for accurate overnight shift accounting
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleDownloadCsv} className="btn-modern btn-secondary" style={{ fontSize: '12px' }}>
              <Download size={13} />
              Export CSV
            </button>
            <button
              onClick={handleExportGoogleSheet}
              disabled={isExporting}
              className="btn-modern btn-primary"
              style={{ fontSize: '12px' }}
            >
              <FileSpreadsheet size={13} />
              {isExporting ? 'Exporting...' : 'Export to Sheet'}
            </button>
          </div>
        </div>

        {exportNotice && (
          <div
            style={{
              padding: '10px 18px',
              backgroundColor: 'var(--accent-blue-light)',
              color: 'var(--accent-blue)',
              fontSize: '12.5px',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            {exportNotice}
          </div>
        )}

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Regular Hours</th>
                <th>Overtime</th>
                <th>Late Flags</th>
                <th>Missing Punches</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map(row => (
                <tr key={row.emp_id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.full_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {row.emp_id}
                    </div>
                  </td>
                  <td>{row.department}</td>
                  <td>
                    <span className="status-pill pill-green">{row.days_present} Days</span>
                  </td>
                  <td>
                    {row.days_absent > 0 ? (
                      <span className="status-pill pill-gray">{row.days_absent} Days</span>
                    ) : (
                      <span style={{ color: 'var(--accent-green)' }}>0</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {row.total_regular_hrs.toFixed(1)}h
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: row.overtime_hrs > 0 ? 'var(--accent-green)' : 'inherit' }}>
                    {row.overtime_hrs > 0 ? `+${row.overtime_hrs.toFixed(1)}h` : '0.0h'}
                  </td>
                  <td>
                    {row.late_count > 0 ? (
                      <span className="status-pill pill-amber">{row.late_count} Late</span>
                    ) : (
                      <span style={{ color: 'var(--accent-green)' }}>0</span>
                    )}
                  </td>
                  <td>
                    {row.missing_out_punches > 0 ? (
                      <span className="status-pill pill-red">
                        <AlertCircle size={10} /> {row.missing_out_punches} Missing
                      </span>
                    ) : (
                      <span style={{ color: 'var(--accent-green)' }}>0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
