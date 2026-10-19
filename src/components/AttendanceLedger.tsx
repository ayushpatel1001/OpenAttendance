// SheetPulse • Attendance Ledger (Clean, Minimal & Searchable)

import React, { useState } from 'react';
import { Search, Download, ShieldCheck, Copy, Check, Trash2 } from 'lucide-react';
import type { AttendanceLog } from '../types';
import { db } from '../services/db';

interface AttendanceLedgerProps {
  logs: AttendanceLog[];
  onRefresh?: () => void;
}

export const AttendanceLedger: React.FC<AttendanceLedgerProps> = ({ logs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const handleDeleteLog = async (logId: string) => {
    if (confirm('Delete this punch record? Note: Cryptographic audit chain will flag any break unless re-calculated.')) {
      await db.attendance_logs.delete(logId);
      if (onRefresh) onRefresh();
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              Attendance Event Ledger
              <span className="status-pill pill-gray">{filteredLogs.length} Records</span>
            </div>
            <div className="card-subtitle-clean">
              Immutable event stream cryptographically chained via SHA-256 hashes
            </div>
          </div>

          <button onClick={exportCsv} className="btn-modern btn-secondary" style={{ fontSize: '12px' }}>
            <Download size={13} />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '300px', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search employee, ID, or hash..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="clean-input"
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ALL', 'IN', 'OUT'] as const).map(action => (
              <button
                key={action}
                onClick={() => setActionFilter(action)}
                className={`btn-modern ${actionFilter === action ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '11.5px' }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Time & Date</th>
                <th>Employee</th>
                <th>Action</th>
                <th>Punctuality</th>
                <th>SHA-256 Signature</th>
                <th>Sync Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No matching attendance records.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const dateObj = new Date(log.iso_timestamp);
                  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <tr key={log.log_id}>
                      <td>
                        <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{timeStr}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dateStr}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.full_name || log.emp_id}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {log.emp_id}
                        </div>
                      </td>

                      <td>
                        <span className={`status-pill ${log.action === 'IN' ? 'pill-green' : 'pill-blue'}`}>
                          {log.action}
                        </span>
                      </td>

                      <td>
                        {log.action === 'IN' && log.late_mins > 0 ? (
                          <span className="status-pill pill-amber">
                            +{log.late_mins}m Late
                          </span>
                        ) : (
                          <span className="status-pill pill-green">
                            On Time
                          </span>
                        )}
                      </td>

                      <td>
                        <div
                          onClick={() => copyToClipboard(log.prev_hash_sig)}
                          title="Click to copy hash signature"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '3px 7px',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <ShieldCheck size={12} color="var(--accent-green)" />
                          <span>{log.prev_hash_sig.substring(0, 10)}...</span>
                          {copiedHash === log.prev_hash_sig ? (
                            <Check size={11} color="var(--accent-green)" />
                          ) : (
                            <Copy size={11} color="var(--text-muted)" />
                          )}
                        </div>
                      </td>

                      <td>
                        {log.sync_status === 'synced' ? (
                          <span className="status-pill pill-green">
                            Synced
                          </span>
                        ) : (
                          <span className="status-pill pill-amber">
                            Queued
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteLog(log.log_id)}
                          className="btn-modern btn-ghost"
                          style={{ padding: '3px 6px', color: 'var(--accent-red)' }}
                          title="Delete punch"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
