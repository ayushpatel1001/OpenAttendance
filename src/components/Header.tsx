// Financial Times Editorial Masthead & Live Market-Style Attendance Ticker

import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
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
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const attendanceRate = totalEmployeesCount > 0 
    ? Math.round((activeEmployeesCount / totalEmployeesCount) * 100) 
    : 100;

  return (
    <header>
      {/* Super Header / Global Exchange Bar */}
      <div className="super-header">
        <div className="super-header-left">
          <span>{currentDate}</span>
          <span>•</span>
          <span>LONDON • NEW YORK • TOKYO • SINGAPORE</span>
        </div>
        <div className="super-header-right">
          <span className="edition-badge">
            <span style={{ fontSize: '14px' }}>●</span> GLOBAL KIOSK EDITION
          </span>
          <span>•</span>
          <span>DEVICE: <strong style={{ color: 'var(--ft-ink-primary)' }}>{meta.kiosk_device_id}</strong></span>
          <span>•</span>
          <span style={{ color: meta.wake_lock_enabled ? 'var(--ft-green)' : 'var(--ft-ink-muted)' }}>
            WAKE LOCK: {meta.wake_lock_enabled ? 'ENGAGED' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Main Masthead Banner */}
      <div className="masthead">
        <div className="masthead-title-wrap">
          <div className="masthead-eyebrow">THE BRING-YOUR-OWN-BACKEND ATTENDANCE SYSTEM</div>
          <h1 className="masthead-title">
            <span style={{ color: 'var(--ft-claret)' }}>THE</span> SHEETPULSE
          </h1>
          <div className="masthead-subtitle">
            Executive Biometric Face ID Ledger • Zero Server, Zero Subscription, 100% Google Drive Data Ownership
          </div>
        </div>
      </div>

      {/* Live Financial Market Ticker Tape */}
      <div className="market-ticker">
        <div className="ticker-label">
          <span>LIVE LEDGER</span>
          <span style={{ fontSize: '9px' }}>▶</span>
        </div>

        <div className="ticker-item">
          <span>PRESENT RATIO:</span>
          <span className="ticker-value-green">{attendanceRate}% ▲</span>
          <span style={{ color: 'var(--ft-ink-muted)' }}>({activeEmployeesCount}/{totalEmployeesCount})</span>
        </div>

        <span style={{ color: 'var(--ft-border-rule)' }}>|</span>

        <div className="ticker-item">
          <span>OUTBOX QUEUE:</span>
          {pendingSyncCount > 0 ? (
            <span className="ticker-value-amber">{pendingSyncCount} PENDING BATCH</span>
          ) : (
            <span className="ticker-value-green">ALL SYNCED (0)</span>
          )}
        </div>

        <span style={{ color: 'var(--ft-border-rule)' }}>|</span>

        <div className="ticker-item">
          <span>AUDIT CHAIN:</span>
          {chainValid ? (
            <span className="ticker-value-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} /> SHA-256 SECURED
            </span>
          ) : (
            <span className="ticker-value-claret" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}>
              ⚠ INTEGRITY MISMATCH
            </span>
          )}
        </div>

        <span style={{ color: 'var(--ft-border-rule)' }}>|</span>

        <div className="ticker-item">
          <span>BACKEND:</span>
          {meta.spreadsheet_id ? (
            <span className="ticker-value-green">GOOGLE SHEETS CONNECTED</span>
          ) : (
            <span style={{ color: 'var(--ft-oxford)' }}>LOCAL / OFFLINE DRIVE</span>
          )}
        </div>

        <span style={{ color: 'var(--ft-border-rule)' }}>|</span>

        <div className="ticker-item">
          <button
            onClick={onRefreshSync}
            disabled={isSyncing}
            className="btn-ft btn-ft-subtle"
            style={{ padding: '2px 8px', fontSize: '11px', height: '22px' }}
            title="Flush pending punches to Google Sheets"
          >
            <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'BATCHING...' : 'FLUSH QUEUE'}
          </button>
        </div>
      </div>
    </header>
  );
};
