// Local-First Offline-Ready IndexedDB Storage Layer using Dexie.js
// Stores roster, shift rules, tamper-evident logs, and offline outbox queue

import Dexie, { type Table } from 'dexie';
import type { Employee, Shift, AttendanceLog, OutboxItem, MetaState } from '../types';
import { GENESIS_HASH, computePunchHash } from './crypto';

// Generate synthetic 128-float normalized biometric vector embedding for an identity
export function generateSyntheticEmbedding(seed: string): number[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const vec: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < 128; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const val = (h / 0xffffffff) * 2 - 1;
    vec.push(val);
    sumSq += val * val;
  }
  const mag = Math.sqrt(sumSq) || 1;
  return vec.map(v => Number((v / mag).toFixed(6)));
}

export class SheetPulseDatabase extends Dexie {
  employees!: Table<Employee, string>;
  shifts!: Table<Shift, string>;
  attendance_logs!: Table<AttendanceLog, string>;
  outbox!: Table<OutboxItem, number>;
  meta!: Table<{ key: string; value: any; updated_at: string }, string>;

  constructor() {
    super('SheetPulse_Master_DB');
    this.version(1).stores({
      employees: 'emp_id, department, shift_id, status',
      shifts: 'shift_id',
      attendance_logs: 'log_id, emp_id, local_date, iso_timestamp, sync_status',
      outbox: '++id, log_id, created_at, retry_count',
      meta: 'key',
    });
  }
}

export const db = new SheetPulseDatabase();

// Initial Seed Data
const INITIAL_SHIFTS: Shift[] = [
  {
    shift_id: 'SH-MORN',
    name: 'Morning Shift (Global Markets)',
    start_time: '09:00',
    end_time: '18:00',
    grace_mins: 10,
    min_full_day_hrs: 8.0,
    working_days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  },
  {
    shift_id: 'SH-NIGHT',
    name: 'Night Shift (Overnight Clearing)',
    start_time: '22:00',
    end_time: '06:00',
    grace_mins: 15,
    min_full_day_hrs: 7.5,
    working_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  },
  {
    shift_id: 'SH-EXEC',
    name: 'Executive Advisory',
    start_time: '09:30',
    end_time: '18:30',
    grace_mins: 20,
    min_full_day_hrs: 8.0,
    working_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  },
];

const INITIAL_EMPLOYEES: Employee[] = [
  {
    emp_id: 'EMP-01',
    full_name: 'Aravind Kumar',
    department: 'Quantitative Analytics',
    role: 'Lead Financial Engineer',
    shift_id: 'SH-MORN',
    status: 'ACTIVE',
    face_descriptor: generateSyntheticEmbedding('Aravind Kumar 2026'),
    face_enrolled: true,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    hourly_rate: 68.50,
  },
  {
    emp_id: 'EMP-02',
    full_name: 'Sarah Jenkins',
    department: 'Editorial & Research',
    role: 'Senior Bureau Editor',
    shift_id: 'SH-MORN',
    status: 'ACTIVE',
    face_descriptor: generateSyntheticEmbedding('Sarah Jenkins 2026'),
    face_enrolled: true,
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    hourly_rate: 72.00,
  },
  {
    emp_id: 'EMP-03',
    full_name: 'Liam Chen',
    department: 'Fixed Income & Derivatives',
    role: 'Trading Operations Specialist',
    shift_id: 'SH-NIGHT',
    status: 'ACTIVE',
    face_descriptor: generateSyntheticEmbedding('Liam Chen 2026'),
    face_enrolled: true,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    hourly_rate: 64.00,
  },
  {
    emp_id: 'EMP-04',
    full_name: 'Elena Rostova',
    department: 'Legal & Risk Governance',
    role: 'Compliance Counsel',
    shift_id: 'SH-EXEC',
    status: 'ACTIVE',
    face_descriptor: generateSyntheticEmbedding('Elena Rostova 2026'),
    face_enrolled: true,
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    hourly_rate: 85.00,
  },
  {
    emp_id: 'EMP-05',
    full_name: 'Marcus Thorne',
    department: 'Treasury & Infrastructure',
    role: 'Chief Clearing Director',
    shift_id: 'SH-MORN',
    status: 'ACTIVE',
    face_descriptor: generateSyntheticEmbedding('Marcus Thorne 2026'),
    face_enrolled: true,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    hourly_rate: 95.00,
  },
];

// Initialize Database & Seed
export async function initializeDatabase(): Promise<void> {
  const empCount = await db.employees.count();
  if (empCount === 0) {
    console.log('[SheetPulse] Seeding initial roster, shifts, and cryptographic audit log...');
    await db.shifts.bulkAdd(INITIAL_SHIFTS);
    await db.employees.bulkAdd(INITIAL_EMPLOYEES);

    // Seed recent attendance logs with valid SHA-256 chain
    let prevHash = GENESIS_HASH;
    const initialLogs: AttendanceLog[] = [];

    const now = new Date();
    // Generate yesterday and today logs
    const seedPunches = [
      { emp_id: 'EMP-01', action: 'IN' as const, offsetHours: -26, late_mins: 0 },
      { emp_id: 'EMP-02', action: 'IN' as const, offsetHours: -25.8, late_mins: 4 },
      { emp_id: 'EMP-01', action: 'OUT' as const, offsetHours: -17.2, late_mins: 0 },
      { emp_id: 'EMP-02', action: 'OUT' as const, offsetHours: -17.0, late_mins: 0 },
      { emp_id: 'EMP-03', action: 'IN' as const, offsetHours: -12.0, late_mins: 0 },
      { emp_id: 'EMP-03', action: 'OUT' as const, offsetHours: -4.0, late_mins: 0 },
      { emp_id: 'EMP-01', action: 'IN' as const, offsetHours: -1.2, late_mins: 2 },
      { emp_id: 'EMP-02', action: 'IN' as const, offsetHours: -1.0, late_mins: 8 },
      { emp_id: 'EMP-04', action: 'IN' as const, offsetHours: -0.5, late_mins: 0 },
    ];

    for (let i = 0; i < seedPunches.length; i++) {
      const p = seedPunches[i];
      const pDate = new Date(now.getTime() + p.offsetHours * 3600 * 1000);
      const log_id = `log-seed-${i + 1}`;
      const iso_timestamp = pDate.toISOString();
      const local_date = iso_timestamp.split('T')[0];
      const emp = INITIAL_EMPLOYEES.find(e => e.emp_id === p.emp_id);

      const hash = await computePunchHash(prevHash, {
        log_id,
        emp_id: p.emp_id,
        iso_timestamp,
        action: p.action,
        late_mins: p.late_mins,
      });

      initialLogs.push({
        log_id,
        iso_timestamp,
        local_date,
        emp_id: p.emp_id,
        full_name: emp?.full_name,
        action: p.action,
        device_id: 'Kiosk-London-Desk01',
        method: 'FACE',
        geo_lat_lng: '51.5074,-0.1278', // Workplace office coordinates
        late_mins: p.late_mins,
        confidence_score: 0.97,
        prev_hash_sig: hash,
        sync_status: 'synced',
      });

      prevHash = hash;
    }

    await db.attendance_logs.bulkAdd(initialLogs);

    // Initial Meta State
    await db.meta.put({
      key: 'system_state',
      value: {
        schema_version: '1.0.0',
        last_reported_week: '2026-W42',
        report_lock: 'IDLE',
        last_row_hash: prevHash,
        kiosk_device_id: 'Kiosk-London-Desk01',
        voice_enabled: true,
        sound_enabled: true,
        wake_lock_enabled: true,
        spreadsheet_name: '_SheetPulse_Master_DB',
      } as MetaState,
      updated_at: new Date().toISOString(),
    });
  }
}

// Get System Meta State
export async function getSystemMeta(): Promise<MetaState> {
  const item = await db.meta.get('system_state');
  if (item && item.value) {
    return item.value as MetaState;
  }
  return {
    schema_version: '1.0.0',
    last_reported_week: '2026-W42',
    report_lock: 'IDLE',
    last_row_hash: GENESIS_HASH,
    kiosk_device_id: 'Kiosk-London-Desk01',
    voice_enabled: true,
    sound_enabled: true,
    wake_lock_enabled: true,
    spreadsheet_name: '_SheetPulse_Master_DB',
  };
}

// Update System Meta State
export async function updateSystemMeta(partial: Partial<MetaState>): Promise<void> {
  const current = await getSystemMeta();
  const updated = { ...current, ...partial };
  await db.meta.put({
    key: 'system_state',
    value: updated,
    updated_at: new Date().toISOString(),
  });
}
