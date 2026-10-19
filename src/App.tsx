// SheetPulse • Main Application Entry
// Modern Minimalist Biometric Attendance PWA

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
    setTimeout(() => setToastMessage(null), 3000);
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

    const chainRes = await verifyAuditChain(lgs);
    setIsChainValid(chainRes.isValid);
  }, []);

  // Initialize DB and background services
  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await refreshData();

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

  const handleUpdateMeta = async (partial: Partial<MetaState>) => {
    await updateSystemMeta(partial);
    await refreshData();
  };

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading SheetPulse...
        </div>
      </div>
    );
  }

  const activeEmployeesCount = employees.filter(e => e.status === 'ACTIVE').length;

  return (
    <div className="app-container">
      {/* Minimal Header */}
      <Header
        meta={meta}
        pendingSyncCount={pendingSyncCount}
        activeEmployeesCount={activeEmployeesCount}
        totalEmployeesCount={employees.length}
        chainValid={isChainValid}
        onRefreshSync={handleFlushOutbox}
        isSyncing={isSyncing}
      />

      {/* Modern Minimal Navigation Bar */}
      <nav className="minimal-nav">
        <button
          onClick={() => setActiveTab('kiosk')}
          className={`nav-pill ${activeTab === 'kiosk' ? 'active' : ''}`}
        >
          <Camera size={15} />
          Face ID Kiosk
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`nav-pill ${activeTab === 'ledger' ? 'active' : ''}`}
        >
          <BookOpen size={15} />
          Event Ledger ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`nav-pill ${activeTab === 'roster' ? 'active' : ''}`}
        >
          <Users size={15} />
          Personnel ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`nav-pill ${activeTab === 'shifts' ? 'active' : ''}`}
        >
          <Clock size={15} />
          Shifts & Grace
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`nav-pill ${activeTab === 'reports' ? 'active' : ''}`}
        >
          <TrendingUp size={15} />
          Weekly Rollup
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`nav-pill ${activeTab === 'audit' ? 'active' : ''}`}
        >
          <ShieldCheck size={15} />
          Audit Chain
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`nav-pill ${activeTab === 'sync' ? 'active' : ''}`}
        >
          <Cloud size={15} />
          Google Sync
        </button>
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#111827',
            color: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 9999,
            fontSize: '12.5px',
          }}
        >
          <CheckCircle2 size={15} color="var(--accent-green)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'kiosk' && (
          <KioskScanner
            employees={employees}
            meta={meta}
            onPunchSuccess={handlePunchSuccess}
            onUpdateMeta={handleUpdateMeta}
          />
        )}

        {activeTab === 'ledger' && (
          <AttendanceLedger logs={logs} onRefresh={refreshData} />
        )}

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

      {/* Minimal Footer */}
      <footer
        style={{
          marginTop: '36px',
          borderTop: '1px solid var(--border-light)',
          paddingTop: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <div>
          SheetPulse • Zero-Server Biometric Attendance PWA
        </div>
        <div style={{ display: 'flex', gap: '14px' }}>
          <span>100% User Data Sovereignty</span>
          <span>•</span>
          <span>Google Drive & Sheets API v4</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
