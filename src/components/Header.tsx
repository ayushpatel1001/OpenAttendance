// SheetPulse • Minimal Executive Header

import React from 'react';
import { ShieldCheck, RefreshCw, Cloud } from 'lucide-react';
import type { MetaState } from '../types';

interface HeaderProps {
  meta: MetaState;
  pendingSyncCount: number;
  activeEmployeesCount: number;
  totalEmployeesCount: number;
  chainValid: boolean;
  onRefreshSync: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  meta,
  pendingSyncCount,
  activeEmployeesCount,
  totalEmployeesCount,
  chainValid,
  onRefreshSync,
  isSyncing,
}) => {
  const attendanceRate = totalEmployeesCount > 0 
    ? Math.round((activeEmployeesCount / totalEmployeesCount) * 100) 
    : 100;

  return (
    <header className="minimal-header">
      {/* Brand Identity */}
      <div className="header-brand">
        <div className="brand-icon">SP</div>
        <div>
          <div className="brand-title">
            SheetPulse
            <span className="brand-badge">Face ID</span>
          </div>
          <div className="brand-subtitle">
            Zero-server biometric attendance backed by Google Drive & Sheets
          </div>
        </div>
      </div>

      {/* Live Status Indicators & Controls */}
      <div className="header-actions">
        {/* Presence Ratio */}
        <div className="status-pill pill-gray" title="Today's attendance ratio">
          <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{attendanceRate}%</span>
          <span>Present ({activeEmployeesCount}/{totalEmployeesCount})</span>
        </div>

        {/* Audit Chain */}
        <div className={`status-pill ${chainValid ? 'pill-green' : 'pill-red'}`}>
          <ShieldCheck size={13} />
          <span>{chainValid ? 'Chain Verified' : 'Integrity Mismatch'}</span>
        </div>

        {/* Google Drive Status */}
        <div className={`status-pill ${meta.spreadsheet_id ? 'pill-blue' : 'pill-gray'}`}>
          <Cloud size={13} />
          <span>{meta.spreadsheet_id ? 'Drive Connected' : 'Local Mode'}</span>
        </div>

        {/* Pending Outbox Queue */}
        {pendingSyncCount > 0 && (
          <div className="status-pill pill-amber">
            <span>{pendingSyncCount} in Outbox</span>
          </div>
        )}

        {/* Flush Button */}
        <button
          onClick={onRefreshSync}
          disabled={isSyncing}
          className="btn-modern btn-secondary"
          style={{ padding: '5px 10px', fontSize: '12px' }}
          title="Flush pending punches to Google Sheets"
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </header>
  );
};
