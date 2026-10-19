// SheetPulse • Google Drive & Sheets Configuration (Clean & Minimal)

import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, ExternalLink, RefreshCw, Database, Zap } from 'lucide-react';
import type { MetaState, OutboxItem } from '../types';
import { db } from '../services/db';
import { googleSheetsService, DEFAULT_CLIENT_ID } from '../services/googleSheets';

interface GoogleSyncSettingsProps {
  meta: MetaState;
  onUpdateMeta: (partial: Partial<MetaState>) => void;
  onFlushOutbox: () => void;
  onRerunSetup?: () => void;
  isSyncing: boolean;
}

export const GoogleSyncSettings: React.FC<GoogleSyncSettingsProps> = ({
  meta,
  onUpdateMeta,
  onFlushOutbox,
  onRerunSetup,
  isSyncing,
}) => {
  const [clientId, setClientId] = useState(meta.google_client_id || DEFAULT_CLIENT_ID);
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
    setStatusMessage('Google Client ID saved.');

    if (clientId.trim()) {
      googleSheetsService.initializeGis(clientId.trim(), (token, expiresIn) => {
        const expiry = Date.now() + expiresIn * 1000;
        onUpdateMeta({
          google_access_token: token,
          google_token_expiry: expiry,
        });
        setStatusMessage('Google Account authorized with least-privilege drive.file scope!');
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
      setStatusMessage('Requesting Google authorization...');
      googleSheetsService.requestAccessToken();
      return;
    }

    setIsProvisioning(true);
    setStatusMessage('Provisioning _SheetPulse_Master_DB in your Google Drive (5 tabs)...');

    try {
      const { spreadsheetId, spreadsheetUrl } = await googleSheetsService.provisionMasterSpreadsheet(
        meta.google_access_token
      );
      onUpdateMeta({
        spreadsheet_id: spreadsheetId,
        spreadsheet_name: '_SheetPulse_Master_DB',
        spreadsheet_url: spreadsheetUrl,
      });
      setStatusMessage(`Provisioning complete! Master sheet linked.`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Provisioning failed: ${err.message}`);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleResetToDemo = async () => {
    if (confirm('Reset database to clean initial state?')) {
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
      {/* Google Sheets Provisioning */}
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              <Cloud size={16} />
              Google Drive & Sheets Integration
            </div>
            <div className="card-subtitle-clean">
              Connect your Google account using least-privilege 'drive.file' scope for free cloud persistence
            </div>
          </div>

          <div>
            {meta.spreadsheet_id ? (
              <span className="status-pill pill-green">
                <CheckCircle2 size={11} /> Drive Connected
              </span>
            ) : (
              <span className="status-pill pill-gray">
                Local Storage Mode
              </span>
            )}
          </div>
        </div>

        <div className="card-body-clean">
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>
                Google OAuth Authorization
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {meta.google_access_token ? (
                  <span style={{ color: 'var(--accent-green)', fontWeight: 500 }}>
                    Active session (expires in ~{Math.max(0, Math.round(((meta.google_token_expiry || 0) - Date.now()) / 60000))} mins)
                  </span>
                ) : (
                  <span>Not authenticated. Check-ins are stored safely in local IndexedDB.</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSignInGoogle} className="btn-modern btn-secondary">
                <Cloud size={14} />
                {meta.google_access_token ? 'Re-Connect' : 'Sign In with Google'}
              </button>

              <button
                onClick={handleAutoProvision}
                disabled={isProvisioning}
                className="btn-modern btn-primary"
              >
                <Zap size={14} />
                {isProvisioning ? 'Creating...' : 'Provision Drive Sheet'}
              </button>
            </div>
          </div>

          {meta.spreadsheet_url && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--accent-green-light)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong style={{ color: 'var(--accent-green)', fontSize: '13px' }}>Linked Spreadsheet:</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{meta.spreadsheet_name}</div>
              </div>
              <a
                href={meta.spreadsheet_url}
                target="_blank"
                rel="noreferrer"
                className="btn-modern btn-secondary"
                style={{ fontSize: '12px', textDecoration: 'none' }}
              >
                Open in Drive <ExternalLink size={12} />
              </a>
            </div>
          )}

          {statusMessage && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--accent-blue-light)',
                color: 'var(--accent-blue)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                marginBottom: '16px',
              }}
            >
              {statusMessage}
            </div>
          )}

          {/* Client ID */}
          <div>
            <label className="clean-label">GOOGLE CLOUD CLIENT ID</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="e.g. 1234567890-abcdefgh.apps.googleusercontent.com"
                className="clean-input"
              />
              <button onClick={handleSaveClientId} className="btn-modern btn-secondary">
                Save
              </button>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
              Create in Google Cloud Console with authorized JavaScript origin: <code>http://localhost:5174</code>. Scope: <code>https://www.googleapis.com/auth/drive.file</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Outbox Batch Queue */}
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              <Database size={16} />
              Outbox Sync Queue ({outboxItems.length} Pending)
            </div>
            <div className="card-subtitle-clean">
              Defeats Google's 60 writes/min quota by batching punches every 20 seconds into a single append call
            </div>
          </div>

          <button
            onClick={onFlushOutbox}
            disabled={isSyncing || outboxItems.length === 0}
            className="btn-modern btn-primary"
            style={{ fontSize: '12px' }}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Flushing...' : 'Flush Outbox'}
          </button>
        </div>

        <div className="card-body-clean">
          {outboxItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              All punches are synchronized.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {outboxItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12.5px',
                  }}
                >
                  <div>
                    <strong>{item.payload.full_name}</strong> ({item.payload.emp_id}) —
                    <span className={`status-pill ${item.payload.action === 'IN' ? 'pill-green' : 'pill-blue'}`} style={{ marginLeft: '6px' }}>
                      {item.payload.action}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Queued: {new Date(item.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Device & Reset */}
      <div className="modern-card">
        <div className="card-header-clean">
          <div className="card-title-clean">Device Identifier & Diagnostics</div>
        </div>

        <div className="card-body-clean">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label className="clean-label">KIOSK DEVICE NAME</label>
              <input
                type="text"
                value={meta.kiosk_device_id}
                onChange={e => onUpdateMeta({ kiosk_device_id: e.target.value })}
                className="clean-input"
              />
            </div>

            <div>
              <label className="clean-label">4-DIGIT ADMIN PIN</label>
              <input
                type="password"
                maxLength={4}
                value={meta.admin_pin || '1234'}
                onChange={e => onUpdateMeta({ admin_pin: e.target.value.replace(/\D/g, '') })}
                className="clean-input"
                style={{ letterSpacing: '4px', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label className="clean-label">SETUP WIZARD</label>
              <button
                onClick={onRerunSetup}
                className="btn-modern btn-secondary"
                style={{ width: '100%' }}
              >
                Re-run Setup Wizard
              </button>
            </div>

            <div>
              <label className="clean-label">DATABASE RESET</label>
              <button
                onClick={handleResetToDemo}
                className="btn-modern btn-danger"
                style={{ width: '100%' }}
              >
                Reset Database to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
