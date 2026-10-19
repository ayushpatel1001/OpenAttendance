// SheetPulse • Main Application Entry
// Financial Times Executive Biometric Attendance Ledger & PWA

import { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  ShieldCheck,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import type { Employee, Shift, AttendanceLog, MetaState } from './types';
import { db, initializeDatabase, getSystemMeta, updateSystemMeta } from './services/db';
import { verifyAuditChain } from './services/crypto';
import { googleSheetsService } from './services/googleSheets';
import { Header } from './components/Header';
import { KioskScanner } from './components/KioskScanner';
import { AttendanceLedger } from './components/AttendanceLedger';
import { PersonnelRoster } from './components/PersonnelRoster';
import { ShiftConfig } from './components/ShiftConfig';
import { WeeklyGazette } from './components/WeeklyGazette';
import { AuditChainView } from './components/AuditChainView';
import { GoogleSyncSettings } from './components/GoogleSyncSettings';

type NavTab = 'kiosk' | 'ledger' | 'roster' | 'shifts' | 'reports' | 'audit' | 'sync';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('kiosk');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [meta, setMeta] = useState<MetaState | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isChainValid, setIsChainValid] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reload data from IndexedDB
  const refreshData = useCallback(async () => {
    const emps = await db.employees.toArray();
    const shfs = await db.shifts.toArray();
    const lgs = await db.attendance_logs.reverse().sortBy('iso_timestamp');
    const m = await getSystemMeta();
    const outboxCount = await db.outbox.count();

    setEmployees(emps);
    setShifts(shfs);
    setLogs(lgs);
    setMeta(m);
    setPendingSyncCount(outboxCount);

    // Verify cryptographic chain
    const chainRes = await verifyAuditChain(lgs);
    setIsChainValid(chainRes.isValid);
  }, []);

  // Initialize DB and background services
  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await refreshData();

      // Start 20-second background write-batching loop
      googleSheetsService.startBackgroundSync(result => {
        if (result.syncedCount > 0) {
          showToast(result.message);
          refreshData();
        }
      });
    };
    init();

    return () => {
      googleSheetsService.stopBackgroundSync();
    };
  }, [refreshData]);

  // Handle Meta updates
  const handleUpdateMeta = async (partial: Partial<MetaState>) => {
    await updateSystemMeta(partial);
    await refreshData();
  };

  // Manual Flush Outbox Queue
  const handleFlushOutbox = async () => {
    setIsSyncing(true);
    const res = await googleSheetsService.flushOutboxQueue();
    setIsSyncing(false);
    showToast(res.message);
    await refreshData();
  };

  const handlePunchSuccess = async (_log: AttendanceLog) => {
    await refreshData();
  };

  if (!meta) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1E5' }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-serif-headline)' }}>
          <h2 style={{ fontSize: '24px', color: 'var(--ft-claret)' }}>SheetPulse Ledger</h2>
          <p style={{ fontSize: '13px', color: 'var(--ft-ink-muted)' }}>Initialising cryptographic biometric database...</p>
        </div>
      </div>
    );
  }

  const activeEmployeesCount = employees.filter(e => e.status === 'ACTIVE').length;

  return (
    <div className="app-container">
      {/* Editorial Header & Live Market Ticker */}
      <Header
        meta={meta}
        pendingSyncCount={pendingSyncCount}
        activeEmployeesCount={activeEmployeesCount}
        totalEmployeesCount={employees.length}
        chainValid={isChainValid}
        onRefreshSync={handleFlushOutbox}
        isSyncing={isSyncing}
      />

      {/* Financial Times Navigation Tabs */}
      <nav className="ft-nav">
        <div className="ft-nav-tabs">
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`ft-nav-tab ${activeTab === 'kiosk' ? 'active' : ''}`}
          >
            <Camera size={15} />
            Face ID Kiosk Terminal
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`ft-nav-tab ${activeTab === 'ledger' ? 'active' : ''}`}
          >
            <BookOpen size={15} />
            Attendance Ledger ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`ft-nav-tab ${activeTab === 'roster' ? 'active' : ''}`}
          >
            <Users size={15} />
            Personnel Roster ({employees.length})
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`ft-nav-tab ${activeTab === 'shifts' ? 'active' : ''}`}
          >
            <Clock size={15} />
            Shift & Grace Rules
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`ft-nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
          >
            <TrendingUp size={15} />
            Weekly Gazette & Rollup
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`ft-nav-tab ${activeTab === 'audit' ? 'active' : ''}`}
          >
            <ShieldCheck size={15} />
            Cryptographic Audit
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`ft-nav-tab ${activeTab === 'sync' ? 'active' : ''}`}
          >
            <Cloud size={15} />
            Google Drive Sync
          </button>
        </div>
      </nav>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--ft-border-dark)',
            color: '#FFF1E5',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-paper-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 9999,
            fontSize: '13px',
            fontFamily: 'var(--font-sans-body)',
            borderLeft: '4px solid var(--ft-claret)',
          }}
        >
          <CheckCircle2 size={16} color="var(--ft-green)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Body */}
      <main style={{ flex: 1 }}>
        {activeTab === 'kiosk' && (
          <KioskScanner
            employees={employees}
            meta={meta}
            onPunchSuccess={handlePunchSuccess}
            onUpdateMeta={handleUpdateMeta}
          />
        )}

        {activeTab === 'ledger' && <AttendanceLedger logs={logs} />}

        {activeTab === 'roster' && (
          <PersonnelRoster
            employees={employees}
            shifts={shifts}
            onRefreshRoster={refreshData}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftConfig shifts={shifts} onRefreshShifts={refreshData} />
        )}

        {activeTab === 'reports' && <WeeklyGazette />}

        {activeTab === 'audit' && <AuditChainView logs={logs} />}

        {activeTab === 'sync' && (
          <GoogleSyncSettings
            meta={meta}
            onUpdateMeta={handleUpdateMeta}
            onFlushOutbox={handleFlushOutbox}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Editorial Footer */}
      <footer
        style={{
          marginTop: '40px',
          borderTop: '3px double var(--ft-border-dark)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--ft-ink-muted)',
        }}
      >
        <div>
          <strong>SHEETPULSE EXECUTIVE BIOMETRIC LEDGER</strong> • Published under Financial Times Design Standards
        </div>
        <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono-ledger)' }}>
          <span>ZERO SERVERS</span>
          <span>•</span>
          <span>100% USER GOOGLE DRIVE</span>
          <span>•</span>
          <span>SHA-256 AUDIT TRAIL</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
