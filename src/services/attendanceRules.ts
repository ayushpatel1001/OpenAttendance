// OpenAttendance • Shift & Rules Engine
// Double-Punch Prevention (< 3 min) • Late Arrival Grace Rules • SHA-256 Log Dispatch

import { db, getSystemMeta, updateSystemMeta } from './db';
import { computePunchHash } from './crypto';
import type { Employee, Shift, AttendanceLog, PunchAction } from '../types';

export interface DoublePunchCheck {
  isDoublePunch: boolean;
  lastLog?: AttendanceLog;
  elapsedSeconds: number;
  message?: string;
}

/**
 * Checks if employee punched within the last 3 minutes (180s)
 */
export async function checkDoublePunch(emp_id: string): Promise<DoublePunchCheck> {
  const recentLogs = await db.attendance_logs
    .where('emp_id')
    .equals(emp_id)
    .reverse()
    .sortBy('iso_timestamp');

  if (recentLogs.length === 0) {
    return { isDoublePunch: false, elapsedSeconds: 999999 };
  }

  const lastLog = recentLogs[0];
  const lastPunchTime = new Date(lastLog.iso_timestamp).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastPunchTime) / 1000);

  if (elapsedSeconds < 180) {
    const elapsedMins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timeStr = elapsedMins > 0 ? `${elapsedMins}m ${secs}s` : `${secs}s`;

    return {
      isDoublePunch: true,
      lastLog,
      elapsedSeconds,
      message: `You recorded punch '${lastLog.action}' ${timeStr} ago. Are you sure you wish to record another punch?`,
    };
  }

  return { isDoublePunch: false, lastLog, elapsedSeconds };
}

/**
 * Determines whether the next natural punch is IN or OUT
 */
export async function inferNextAction(emp_id: string): Promise<PunchAction> {
  const recentLogs = await db.attendance_logs
    .where('emp_id')
    .equals(emp_id)
    .reverse()
    .sortBy('iso_timestamp');

  if (recentLogs.length === 0) return 'IN';

  const lastLog = recentLogs[0];
  // Check if last punch was on the same calendar day or recent
  const lastDate = new Date(lastLog.iso_timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - lastDate.getTime()) / (3600 * 1000);

  // If last was IN and within 16 hours, infer OUT
  if (lastLog.action === 'IN' && diffHours < 16) {
    return 'OUT';
  }

  return 'IN';
}

/**
 * Calculates late arrival minutes based on shift rules and grace window
 */
export function calculateLateMinutes(shift: Shift | undefined, punchDate: Date): number {
  if (!shift || !shift.start_time) return 0;

  const [shiftHours, shiftMins] = shift.start_time.split(':').map(Number);
  const scheduledTime = new Date(punchDate);
  scheduledTime.setHours(shiftHours, shiftMins, 0, 0);

  const graceMins = shift.grace_mins || 0;
  const graceThresholdTime = new Date(scheduledTime.getTime() + graceMins * 60 * 1000);

  if (punchDate.getTime() > graceThresholdTime.getTime()) {
    const lateDiffMs = punchDate.getTime() - scheduledTime.getTime();
    return Math.floor(lateDiffMs / (60 * 1000));
  }

  return 0;
}

/**
 * Executes a Face ID punch with cryptographic hash chain chaining and outbox queueing
 */
export async function executeFacePunch(
  employee: Employee,
  action: PunchAction,
  confidenceScore: number = 0.96
): Promise<AttendanceLog> {
  const now = new Date();
  const iso_timestamp = now.toISOString();
  const local_date = iso_timestamp.split('T')[0];
  const log_id = `punch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Retrieve shift for late minutes calculation
  const shift = await db.shifts.get(employee.shift_id);
  const late_mins = action === 'IN' ? calculateLateMinutes(shift, now) : 0;

  // Retrieve previous tip hash for the tamper-evident chain
  const meta = await getSystemMeta();
  const prevHash = meta.last_row_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  // Compute new SHA-256 block hash
  const punchHash = await computePunchHash(prevHash, {
    log_id,
    emp_id: employee.emp_id,
    iso_timestamp,
    action,
    late_mins,
  });

  const newLog: AttendanceLog = {
    log_id,
    iso_timestamp,
    local_date,
    emp_id: employee.emp_id,
    full_name: employee.full_name,
    action,
    device_id: meta.kiosk_device_id || 'Kiosk-London-Desk01',
    method: 'FACE',
    geo_lat_lng: '51.5074,-0.1278', // Workplace coordinates
    late_mins,
    confidence_score: confidenceScore,
    prev_hash_sig: punchHash,
    sync_status: 'pending_sync',
  };

  // 1. Write to local IndexedDB logs
  await db.attendance_logs.add(newLog);

  // 2. Add to outbox queue for Google Sheets write-batching
  await db.outbox.add({
    log_id,
    payload: newLog,
    created_at: iso_timestamp,
    retry_count: 0,
  });

  // 3. Advance tip of the cryptographic chain in _Meta
  await updateSystemMeta({
    last_row_hash: punchHash,
  });

  return newLog;
}
