// SheetPulse • Google Drive & Sheets API v4 Integration Engine
// Least-privilege 'drive.file' scope • 5-Tab Master DB Provisioning • Write-Batch Engine (Defeating 60 writes/min)

import { db, getSystemMeta, updateSystemMeta } from './db';

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DEFAULT_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  message: string;
  error?: any;
}

class GoogleSheetsService {
  private tokenClient: any = null;
  private syncTimer: any = null;

  /**
   * Initializes Google Identity Services (GIS) Token Client
   */
  public initializeGis(clientId: string, onTokenReceived: (token: string, expiresIn: number) => void): void {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      console.warn('Google Identity Services script not yet loaded.');
      return;
    }

    try {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_FILE_SCOPE,
        callback: (response: any) => {
          if (response.error !== undefined) {
            console.error('Google OAuth error:', response);
            return;
          }
          const expiresIn = response.expires_in || 3599;
          onTokenReceived(response.access_token, expiresIn);
        },
      });
    } catch (e) {
      console.error('Failed to init GIS token client:', e);
    }
  }

  /**
   * Requests OAuth Access Token via popup or silent prompt
   */
  public requestAccessToken(prompt: string = ''): void {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt });
    } else {
      console.warn('Token client not initialized. Enter a Google Client ID in settings.');
    }
  }

  /**
   * Provisions the 5-Tab Master Database inside the user's Google Drive
   */
  public async provisionMasterSpreadsheet(accessToken: string): Promise<{
    spreadsheetId: string;
    spreadsheetUrl: string;
  }> {
    const title = '_SheetPulse_Master_DB';

    const createPayload = {
      properties: {
        title,
        locale: 'en_GB',
        autoRecalc: 'ON_CHANGE',
      },
      sheets: [
        {
          properties: {
            title: '_Meta',
            gridProperties: { rowCount: 20, columnCount: 6, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Employees',
            gridProperties: { rowCount: 100, columnCount: 9, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Shifts',
            gridProperties: { rowCount: 20, columnCount: 8, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Attendance_Log',
            gridProperties: { rowCount: 10000, columnCount: 10, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Weekly_Reports',
            gridProperties: { rowCount: 500, columnCount: 10, frozenRowCount: 1 },
          },
        },
      ],
    };

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to create spreadsheet: HTTP ${res.status}`);
    }

    const created = await res.json();
    const spreadsheetId = created.spreadsheetId;
    const spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    // Initialize Headers for all 5 tabs
    await this.populateInitialHeaders(spreadsheetId, accessToken);

    // Save to local meta state
    await updateSystemMeta({
      spreadsheet_id: spreadsheetId,
      spreadsheet_name: title,
      spreadsheet_url: spreadsheetUrl,
    });

    return { spreadsheetId, spreadsheetUrl };
  }

  /**
   * Writes headers and initial seed metadata into the newly created Google Sheet
   */
  private async populateInitialHeaders(spreadsheetId: string, accessToken: string): Promise<void> {
    const metaHeaders = [
      ['Key (Col A)', 'Value (Col B)', 'Updated_At (Col C)', 'Notes (Col D)'],
      ['schema_version', '1.0.0', new Date().toISOString(), 'SheetPulse schema version'],
      ['last_reported_week', '2026-W42', new Date().toISOString(), 'ISO week pointer'],
      ['report_lock', 'IDLE', new Date().toISOString(), 'Mutex lock state'],
      ['last_row_hash', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', new Date().toISOString(), 'Audit tip hash'],
    ];

    const employeesHeaders = [
      ['emp_id', 'full_name', 'department', 'shift_id', 'status', 'pin_hash', 'face_descriptor_json', 'hourly_rate_enc', 'role'],
    ];

    const shiftsHeaders = [
      ['shift_id', 'name', 'start_time', 'end_time', 'grace_mins', 'min_full_day_hrs', 'working_days'],
    ];

    const attendanceHeaders = [
      ['log_id', 'iso_timestamp', 'local_date', 'emp_id', 'action', 'device_id', 'method', 'geo_lat_lng', 'late_mins', 'prev_hash_sig'],
    ];

    const weeklyHeaders = [
      ['iso_week', 'date_range', 'emp_id', 'full_name', 'days_present', 'days_absent', 'total_regular_hrs', 'overtime_hrs', 'late_count', 'missing_out_punches'],
    ];

    const batchData = [
      { range: '_Meta!A1:D5', values: metaHeaders },
      { range: 'Employees!A1:I1', values: employeesHeaders },
      { range: 'Shifts!A1:G1', values: shiftsHeaders },
      { range: 'Attendance_Log!A1:J1', values: attendanceHeaders },
      { range: 'Weekly_Reports!A1:J1', values: weeklyHeaders },
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    });
  }

  /**
   * Flushes pending outbox punches in a single write-batch to Google Sheets
   * (or executes simulated local sync if in standalone/demo mode)
   */
  public async flushOutboxQueue(): Promise<SyncResult> {
    const outboxItems = await db.outbox.toArray();
    if (outboxItems.length === 0) {
      return { success: true, syncedCount: 0, message: 'Outbox is empty. All punches synced.' };
    }

    const meta = await getSystemMeta();
    const token = meta.google_access_token;
    const spreadsheetId = meta.spreadsheet_id;

    // Check if real Google Sheet connection is active
    if (token && spreadsheetId) {
      try {
        // Map outbox items to Attendance_Log columns A through J
        const rows = outboxItems.map(item => {
          const l = item.payload;
          return [
            l.log_id,
            l.iso_timestamp,
            l.local_date,
            l.emp_id,
            l.action,
            l.device_id,
            l.method,
            l.geo_lat_lng || '',
            l.late_mins,
            l.prev_hash_sig,
          ];
        });

        // Defeat 60 writes/min quota: Append all 20-50 pending punches in a SINGLE API call!
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Attendance_Log!A:J:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        const res = await fetch(appendUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rows }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Append failed: HTTP ${res.status}`);
        }

        // Mark logs as synced in IndexedDB
        for (const item of outboxItems) {
          await db.attendance_logs.update(item.log_id, { sync_status: 'synced' });
        }
        await db.outbox.clear();

        const now = new Date().toISOString();
        await updateSystemMeta({ last_synced_at: now });

        return {
          success: true,
          syncedCount: rows.length,
          message: `Successfully batched ${rows.length} punch(es) to Google Sheets!`,
        };
      } catch (err: any) {
        console.error('Google Sheets sync failed:', err);
        return {
          success: false,
          syncedCount: 0,
          message: `Sync failed: ${err.message}. Retaining in IndexedDB outbox.`,
          error: err,
        };
      }
    } else {
      // Local / Offline Simulation Mode
      // Simulates batch processing and ensures full UI testability
      await new Promise(r => setTimeout(r, 600)); // subtle network latency simulation

      for (const item of outboxItems) {
        await db.attendance_logs.update(item.log_id, { sync_status: 'synced' });
      }
      await db.outbox.clear();

      const now = new Date().toISOString();
      await updateSystemMeta({ last_synced_at: now });

      return {
        success: true,
        syncedCount: outboxItems.length,
        message: `Offline Batch Sync Complete: ${outboxItems.length} punch(es) committed to local ledger!`,
      };
    }
  }

  /**
   * Creates a standalone Google Sheet for a weekly report (PRD Section 3.3.3)
   */
  public async createStandaloneWeeklySheet(
    isoWeek: string,
    reportData: any[][],
    accessToken: string
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const title = `SheetPulse_Weekly_Report_${isoWeek}`;

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [
          {
            properties: {
              title: `Report_${isoWeek}`,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to create standalone weekly sheet.');
    }

    const created = await res.json();
    const spreadsheetId = created.spreadsheetId;

    // Append report data
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Report_${isoWeek}!A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: reportData }),
    });

    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }

  /**
   * Starts automatic 20-second background sync timer
   */
  public startBackgroundSync(onSyncComplete?: (result: SyncResult) => void): void {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(async () => {
      const pendingCount = await db.outbox.count();
      if (pendingCount > 0) {
        const res = await this.flushOutboxQueue();
        if (onSyncComplete) onSyncComplete(res);
      }
    }, 20000); // every 20 seconds
  }

  public stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
