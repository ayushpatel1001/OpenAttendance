// SheetPulse • Google Drive & Sheets API Configuration & Outbox Batch Manager
// Least-Privilege OAuth 2.0 ('drive.file') • Master DB Auto-Provisioning • 60 Writes/Min Defeat

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sliders,
  Database,
  Zap,
} from 'lucide-react';
import type { MetaState, OutboxItem } from '../types';
import { db } from '../services/db';
import { googleSheetsService } from '../services/googleSheets';

interface GoogleSyncSettingsProps {
  meta: MetaState;
  onUpdateMeta: (partial: Partial<MetaState>) => void;
  onFlushOutbox: () => void;
  isSyncing: boolean;
}

export const GoogleSyncSettings: React.FC<GoogleSyncSettingsProps> = ({
  meta,
  onUpdateMeta,
  onFlushOutbox,
  isSyncing,
}) => {
  const [clientId, setClientId] = useState(meta.google_client_id || '');
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadOutbox = async () => {
    const items = await db.outbox.toArray();
    setOutboxItems(items);
  };

  useEffect(() => {
    loadOutbox();
    const interval = setInterval(loadOutbox, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveClientId = () => {
    onUpdateMeta({ google_client_id: clientId.trim() });
    setStatusMessage('Google Client ID saved. Initializing Google Identity Services...');

    if (clientId.trim()) {
      googleSheetsService.initializeGis(clientId.trim(), (token, expiresIn) => {
        const expiry = Date.now() + expiresIn * 1000;
        onUpdateMeta({
          google_access_token: token,
          google_token_expiry: expiry,
        });
        setStatusMessage('Google Account authenticated with least-privilege drive.file scope!');
      });
    }
  };

  const handleSignInGoogle = () => {
    if (!meta.google_client_id) {
      alert('Please enter and save your Google Cloud OAuth Client ID first.');
      return;
    }
    googleSheetsService.requestAccessToken();
  };

  const handleAutoProvision = async () => {
    if (!meta.google_access_token) {
      // If no live token, simulate provisioning or prompt sign in
      setStatusMessage('Requesting Google authorization...');
      googleSheetsService.requestAccessToken();
      return;
    }

    setIsProvisioning(true);
    setStatusMessage('Provisining _SheetPulse_Master_DB in your Google Drive (all 5 tabs)...');

    try {
      const { spreadsheetId, spreadsheetUrl } = await googleSheetsService.provisionMasterSpreadsheet(
        meta.google_access_token
      );
      onUpdateMeta({
        spreadsheet_id: spreadsheetId,
        spreadsheet_name: '_SheetPulse_Master_DB',
        spreadsheet_url: spreadsheetUrl,
      });
      setStatusMessage(`Provisioning complete! Database active at: ${spreadsheetUrl}`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Provisioning failed: ${err.message}`);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleResetToDemo = async () => {
    if (confirm('Reset SheetPulse database to initial factory demo dataset?')) {
      await db.attendance_logs.clear();
      await db.outbox.clear();
      await db.employees.clear();
      await db.shifts.clear();
      await db.meta.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Google Sheets Provisioning Card */}
      <div className="ft-card ft-card-editorial">
        <div className="ft-card-header">
          <div>
            <div className="ft-card-title">
              <Cloud size={18} color="var(--ft-claret)" />
              <span>GOOGLE DRIVE & SHEETS API v4 INTEGRATION</span>
            </div>
            <div className="ft-card-subtitle">
              Zero Server Backend: Least-privilege 'drive.file' scope grants access only to files created by this app
            </div>
          </div>

          <div>
            {meta.spreadsheet_id ? (
              <span className="badge-ft badge-ft-green">
                <CheckCircle2 size={11} /> DRIVE DB ACTIVE
              </span>
            ) : (
              <span className="badge-ft badge-ft-dark">
                LOCAL OFFLINE MODE
              </span>
            )}
          </div>
        </div>

        <div className="ft-card-body" style={{ padding: '20px' }}>
          {/* OAuth Status Banner */}
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#FFFDFB',
              border: '1px solid var(--ft-border-rule)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
                Google OAuth Connection Status
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ft-ink-muted)' }}>
                {meta.google_access_token ? (
                  <span style={{ color: 'var(--ft-green)', fontWeight: 600 }}>
                    ● Authenticated (Token expires in ~{Math.max(0, Math.round(((meta.google_token_expiry || 0) - Date.now()) / 60000))} mins)
                  </span>
                ) : (
                  <span>Unlinked. Running locally with IndexedDB outbox queue.</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSignInGoogle}
                className="btn-ft btn-ft-outline"
                style={{ fontSize: '12.5px' }}
              >
                <Cloud size={14} />
                {meta.google_access_token ? 'Re-Authenticate Google' : 'Sign In with Google'}
              </button>

              <button
                onClick={handleAutoProvision}
                disabled={isProvisioning}
                className="btn-ft btn-ft-primary"
                style={{ fontSize: '12.5px' }}
              >
                <Zap size={14} />
                {isProvisioning ? 'Provisioning...' : 'Auto-Provision Drive Sheet'}
              </button>
            </div>
          </div>

          {meta.spreadsheet_url && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--ft-green-light)',
                border: '1px solid rgba(0, 127, 59, 0.3)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong style={{ color: 'var(--ft-green)', fontSize: '13px' }}>Master Google Sheet Linked:</strong>
                <div style={{ fontSize: '12px', color: 'var(--ft-ink-body)' }}>{meta.spreadsheet_name} ({meta.spreadsheet_id})</div>
              </div>
              <a
                href={meta.spreadsheet_url}
                target="_blank"
                rel="noreferrer"
                className="btn-ft btn-ft-outline"
                style={{ fontSize: '12px' }}
              >
                Open in Drive <ExternalLink size={12} />
              </a>
            </div>
          )}

          {statusMessage && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--ft-paper-subtle)',
                borderRadius: 'var(--radius-xs)',
                fontSize: '12.5px',
                marginBottom: '18px',
                color: 'var(--ft-ink-primary)',
              }}
            >
              {statusMessage}
            </div>
          )}

          {/* Client ID Configuration Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              GOOGLE CLOUD CLIENT ID (Web Application)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="e.g. 1234567890-abcdefgh.apps.googleusercontent.com"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--ft-border-rule)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono-ledger)',
                  fontSize: '12.5px',
                }}
              />
              <button onClick={handleSaveClientId} className="btn-ft btn-ft-dark">
                Save Client ID
              </button>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--ft-ink-muted)', marginTop: '6px' }}>
              Create in Google Cloud Console with authorized JavaScript origin: <code>http://localhost:5173</code> (or your domain). Scope requested is strictly <code>https://www.googleapis.com/auth/drive.file</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Write Batching & Outbox Queue Card */}
      <div className="ft-card ft-card-dark-header">
        <div className="ft-card-header">
          <div>
            <div className="ft-card-title">
              <Database size={16} color="var(--ft-claret)" />
              <span>OUTBOX BATCH SYNC ENGINE</span>
              <span className="badge-ft badge-ft-dark">
                {outboxItems.length} PENDING IN QUEUE
              </span>
            </div>
            <div className="ft-card-subtitle">
              Defeating Google's 60 Writes/Min Quota: Bundles all punches into a single append call every 20 seconds
            </div>
          </div>

          <button
            onClick={onFlushOutbox}
            disabled={isSyncing || outboxItems.length === 0}
            className="btn-ft btn-ft-primary"
            style={{ fontSize: '12px' }}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Flushing...' : 'Flush Outbox Now'}
          </button>
        </div>

        <div className="ft-card-body" style={{ padding: '18px 20px' }}>
          {outboxItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ft-ink-muted)' }}>
              <CheckCircle2 size={32} color="var(--ft-green)" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ft-ink-primary)' }}>
                Outbox is completely clear
              </div>
              <div style={{ fontSize: '12px' }}>
                All Face ID punches have been bundled and committed to the master ledger.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '12.5px', color: 'var(--ft-ink-muted)', marginBottom: '12px' }}>
                The following {outboxItems.length} punch(es) are staged in local IndexedDB and will be dispatched in the next automated 20-second batch cycle:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {outboxItems.map(item => (
                  <div
                    key={item.id}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#FFFDFB',
                      border: '1px solid var(--ft-border-rule)',
                      borderRadius: 'var(--radius-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <strong>{item.payload.full_name}</strong> ({item.payload.emp_id}) —
                      <span className={`badge-ft ${item.payload.action === 'IN' ? 'badge-ft-green' : 'badge-ft-blue'}`} style={{ marginLeft: '6px' }}>
                        {item.payload.action}
                      </span>
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono-ledger)', color: 'var(--ft-ink-muted)' }}>
                      QUEUED: {new Date(item.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kiosk Hardware & System Reset */}
      <div className="ft-card">
        <div className="ft-card-header">
          <div className="ft-card-title">
            <Sliders size={16} />
            <span>KIOSK HARDWARE & DEVICE SETTINGS</span>
          </div>
        </div>

        <div className="ft-card-body" style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                KIOSK DEVICE IDENTIFIER
              </label>
              <input
                type="text"
                value={meta.kiosk_device_id}
                onChange={e => onUpdateMeta({ kiosk_device_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--ft-border-rule)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono-ledger)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                DATA RETENTION & SEEDING
              </label>
              <button
                onClick={handleResetToDemo}
                className="btn-ft btn-ft-outline"
                style={{ width: '100%', color: 'var(--ft-claret)', justifyContent: 'center' }}
              >
                Reset Database to Factory Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
