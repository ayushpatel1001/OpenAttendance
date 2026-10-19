// Chronological Attendance Ledger & Cryptographic Audit Table

import React, { useState } from 'react';
import { Search, Filter, Download, ShieldCheck, CheckCircle2, Clock, Copy, Check } from 'lucide-react';
import type { AttendanceLog } from '../types';

interface AttendanceLedgerProps {
  logs: AttendanceLog[];
}

export const AttendanceLedger: React.FC<AttendanceLedgerProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.full_name && log.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.prev_hash_sig.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const exportCsv = () => {
    const headers = ['Log ID', 'ISO Timestamp', 'Local Date', 'Employee ID', 'Name', 'Action', 'Method', 'Late Mins', 'SHA-256 Hash', 'Sync Status'];
    const rows = filteredLogs.map(l => [
      l.log_id,
      l.iso_timestamp,
      l.local_date,
      l.emp_id,
      `"${l.full_name || ''}"`,
      l.action,
      l.method,
      l.late_mins,
      l.prev_hash_sig,
      l.sync_status,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SheetPulse_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="ft-card ft-card-editorial">
      <div className="ft-card-header">
        <div>
          <div className="ft-card-title">
            <span>CHRONOLOGICAL ATTENDANCE LEDGER</span>
            <span className="badge-ft badge-ft-dark">{filteredLogs.length} ENTRIES</span>
          </div>
          <div className="ft-card-subtitle">
            Cryptographically chained append-only stream mapped to 'Attendance_Log' Google Sheets tab
          </div>
        </div>

        <button onClick={exportCsv} className="btn-ft btn-ft-outline" style={{ fontSize: '12px' }}>
          <Download size={13} />
          Export Ledger (CSV)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--ft-border-rule)',
          backgroundColor: '#FFFDFB',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--ft-ink-muted)" />
          <input
            type="text"
            placeholder="Search by Employee ID, Name, or Hash..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '13px',
              border: '1px solid var(--ft-border-rule)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--ft-paper-bg)',
              fontFamily: 'var(--font-sans-body)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="var(--ft-ink-muted)" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ft-ink-muted)' }}>ACTION:</span>
          {(['ALL', 'IN', 'OUT'] as const).map(action => (
            <button
              key={action}
              onClick={() => setActionFilter(action)}
              className="btn-ft"
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: actionFilter === action ? 'var(--ft-border-dark)' : 'transparent',
                color: actionFilter === action ? '#FFF1E5' : 'var(--ft-ink-body)',
                border: '1px solid var(--ft-border-rule)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="ft-table-wrapper" style={{ border: 'none' }}>
        <table className="ft-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>EMPLOYEE</th>
              <th>ACTION</th>
              <th>METHOD</th>
              <th>PUNCTUALITY</th>
              <th>DEVICE</th>
              <th>SHA-256 CHAIN HASH</th>
              <th>SYNC STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--ft-ink-muted)' }}>
                  No attendance records found matching filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const dateObj = new Date(log.iso_timestamp);
                const timeStr = dateObj.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const dateStr = dateObj.toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <tr key={log.log_id}>
                    <td>
                      <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono-ledger)' }}>{timeStr}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ft-ink-muted)' }}>{dateStr}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-serif-headline)', fontSize: '14px' }}>
                        {log.full_name || log.emp_id}
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono-ledger)', color: 'var(--ft-ink-muted)' }}>
                        {log.emp_id}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge-ft ${
                          log.action === 'IN' ? 'badge-ft-green' : 'badge-ft-blue'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <span className="badge-ft badge-ft-dark" style={{ gap: '4px' }}>
                        FACE ID
                      </span>
                    </td>

                    <td>
                      {log.action === 'IN' && log.late_mins > 0 ? (
                        <span className="badge-ft badge-ft-amber">
                          +{log.late_mins}m LATE
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--ft-green)', fontWeight: 600 }}>
                          ON TIME
                        </span>
                      )}
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--ft-ink-muted)', fontFamily: 'var(--font-mono-ledger)' }}>
                      {log.device_id}
                    </td>

                    <td>
                      <div
                        onClick={() => copyToClipboard(log.prev_hash_sig)}
                        title="Click to copy SHA-256 hash"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          padding: '3px 6px',
                          backgroundColor: 'var(--ft-paper-subtle)',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--ft-border-rule)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono-ledger)',
                        }}
                      >
                        <ShieldCheck size={12} color="var(--ft-green)" />
                        <span>{log.prev_hash_sig.substring(0, 10)}...{log.prev_hash_sig.substring(log.prev_hash_sig.length - 6)}</span>
                        {copiedHash === log.prev_hash_sig ? (
                          <Check size={12} color="var(--ft-green)" />
                        ) : (
                          <Copy size={11} color="var(--ft-ink-muted)" />
                        )}
                      </div>
                    </td>

                    <td>
                      {log.sync_status === 'synced' ? (
                        <span className="badge-ft badge-ft-green">
                          <CheckCircle2 size={11} /> SYNCED
                        </span>
                      ) : (
                        <span className="badge-ft badge-ft-amber">
                          <Clock size={11} /> OUTBOX QUEUE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
