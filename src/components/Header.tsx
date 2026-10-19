// OpenAttendance • Minimal Executive Header with Kiosk Mode Lock

import React from 'react';
import { ShieldCheck, RefreshCw, Cloud, Lock, Unlock } from 'lucide-react';
import type { MetaState } from '../types';

interface HeaderProps {
  meta: MetaState;
  pendingSyncCount: number;
  activeEmployeesCount: number;
  totalEmployeesCount: number;
  chainValid: boolean;
  isAdminUnlocked: boolean;
  onOpenPinModal: () => void;
  onLockAdmin: () => void;
  onRefreshSync: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  meta,
  pendingSyncCount,
  activeEmployeesCount,
  totalEmployeesCount,
  chainValid,
  isAdminUnlocked,
  onOpenPinModal,
  onLockAdmin,
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
        <div className="brand-icon">OA</div>
        <div>
          <div className="brand-title">
            OpenAttendance
            <span className="brand-badge">
              {isAdminUnlocked ? 'Admin Mode' : 'Kiosk Active'}
            </span>
          </div>
          <div className="brand-subtitle">
            Zero-server attendance backed by Google Drive & Sheets
          </div>
        </div>
      </div>

      {/* Status & Kiosk Lock Action */}
      <div className="header-actions">
        {/* Presence Ratio */}
        <div className="status-pill pill-gray" title="Today's attendance ratio">
          <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{attendanceRate}%</span>
          <span>Present ({activeEmployeesCount}/{totalEmployeesCount})</span>
        </div>

        {/* Audit Chain */}
        <div className={`status-pill ${chainValid ? 'pill-green' : 'pill-red'}`}>
          <ShieldCheck size={13} />
          <span>{chainValid ? 'Verified' : 'Tampered'}</span>
        </div>

        {/* Google Drive Status */}
        <div className={`status-pill ${meta.spreadsheet_id ? 'pill-blue' : 'pill-gray'}`}>
          <Cloud size={13} />
          <span>{meta.spreadsheet_id ? 'Drive' : 'Local'}</span>
        </div>

        {/* Pending Outbox Queue */}
        {pendingSyncCount > 0 && (
          <div className="status-pill pill-amber">
            <span>{pendingSyncCount} Outbox</span>
          </div>
        )}

        {/* Flush Button (only if admin unlocked or pending) */}
        {isAdminUnlocked && (
          <button
            onClick={onRefreshSync}
            disabled={isSyncing}
            className="btn-modern btn-secondary"
            style={{ padding: '5px 10px', fontSize: '12px' }}
            title="Flush pending punches to Google Sheets"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        )}

        {/* Admin PIN Lock / Unlock Button */}
        {isAdminUnlocked ? (
          <button
            onClick={onLockAdmin}
            className="btn-modern btn-secondary"
            style={{ padding: '5px 12px', fontSize: '12px', gap: '5px', fontWeight: 600 }}
            title="Lock kiosk and hide admin settings"
          >
            <Lock size={13} color="var(--accent-red)" />
            Lock Kiosk
          </button>
        ) : (
          <button
            onClick={onOpenPinModal}
            className="btn-modern btn-secondary"
            style={{ padding: '5px 12px', fontSize: '12px', gap: '5px' }}
            title="Unlock admin panel with PIN"
          >
            <Unlock size={13} />
            Admin
          </button>
        )}
      </div>
    </header>
  );
};
