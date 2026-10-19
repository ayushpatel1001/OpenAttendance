// SheetPulse • Financial Times Executive Attendance System
// TypeScript Domain Schema and Core Types

export type PunchAction = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export interface Employee {
  emp_id: string; // e.g. "EMP-01"
  full_name: string;
  department: string;
  role: string;
  shift_id: string;
  status: EmployeeStatus;
  pin_hash?: string;
  face_descriptor: number[]; // 128-float normalized mathematical vector embedding
  face_enrolled: boolean;
  avatar_url?: string;
  hourly_rate?: number;
}

export interface Shift {
  shift_id: string; // e.g. "SH-MORN", "SH-NIGHT"
  name: string;
  start_time: string; // "09:00" (24h)
  end_time: string; // "18:00"
  grace_mins: number; // e.g. 10
  min_full_day_hrs: number; // e.g. 8.0
  working_days: string[]; // ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
}

export interface AttendanceLog {
  log_id: string; // UUID v4
  iso_timestamp: string; // ISO 8601 UTC
  local_date: string; // YYYY-MM-DD
  emp_id: string;
  full_name?: string;
  action: PunchAction;
  device_id: string;
  method: 'FACE';
  geo_lat_lng?: string;
  late_mins: number;
  confidence_score?: number; // 0.0 - 1.0 (e.g. 0.96)
  prev_hash_sig: string; // SHA-256 chain hash
  sync_status: 'synced' | 'pending_sync' | 'error';
  error_message?: string;
}

export interface OutboxItem {
  id?: number; // auto-increment
  log_id: string;
  payload: AttendanceLog;
  created_at: string;
  retry_count: number;
}

export interface MetaState {
  schema_version: string;
  last_reported_week: string;
  report_lock: string;
  last_row_hash: string;
  google_client_id?: string;
  google_access_token?: string;
  google_token_expiry?: number;
  spreadsheet_id?: string;
  spreadsheet_name?: string;
  spreadsheet_url?: string;
  last_synced_at?: string;
  kiosk_device_id: string;
  voice_enabled: boolean;
  sound_enabled: boolean;
  wake_lock_enabled: boolean;
  is_setup_completed?: boolean;
  admin_pin?: string;
}

export interface WeeklyRollupRow {
  iso_week: string;
  date_range: string;
  emp_id: string;
  full_name: string;
  department: string;
  days_present: number;
  days_absent: number;
  total_regular_hrs: number;
  overtime_hrs: number;
  late_count: number;
  missing_out_punches: number;
}

export interface BiometricVerificationResult {
  matched: boolean;
  employee?: Employee;
  confidence: number; // 0 - 100%
  distance: number;
  livenessPassed: boolean;
}
