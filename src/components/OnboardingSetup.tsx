// SheetPulse • Onboarding & Google Drive Setup Wizard
// Guides the user to Sign In with Google, provision _SheetPulse_Master_DB, and configure the Admin PIN

import React, { useState } from 'react';
import { Cloud, CheckCircle2, Zap, ExternalLink } from 'lucide-react';
import type { MetaState } from '../types';
import { googleSheetsService } from '../services/googleSheets';

interface OnboardingSetupProps {
  meta: MetaState;
  onCompleteSetup: (updatedMeta: Partial<MetaState>) => void;
}

export const OnboardingSetup: React.FC<OnboardingSetupProps> = ({ meta, onCompleteSetup }) => {
  const [step, setStep] = useState<number>(1);
  const [clientId, setClientId] = useState<string>(meta.google_client_id || '');
  const [accessToken, setAccessToken] = useState<string>(meta.google_access_token || '');
  const [tokenExpiry, setTokenExpiry] = useState<number>(meta.google_token_expiry || 0);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(meta.spreadsheet_id || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(meta.spreadsheet_url || '');
  const [adminPin, setAdminPin] = useState<string>(meta.admin_pin || '1234');
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize GIS and request access token
  const handleGoogleSignIn = () => {
    if (!clientId.trim()) {
      setStatusMessage('Please enter a Google Cloud OAuth Client ID, or click "Continue in Local Mode" below.');
      return;
    }

    setStatusMessage('Connecting to Google Identity Services...');
    googleSheetsService.initializeGis(clientId.trim(), (token, expiresIn) => {
      setAccessToken(token);
      setTokenExpiry(Date.now() + expiresIn * 1000);
      setStatusMessage('Google authorization successful! Proceeding to database setup...');
      setTimeout(() => setStep(2), 600);
    });

    googleSheetsService.requestAccessToken();
  };

  // Quick Demo / Local Mode
  const handleContinueLocal = () => {
    setStatusMessage('Local Drive Mode selected. Check-ins will be stored safely in on-device IndexedDB.');
    setStep(2);
  };

  // Auto-Provision Google Sheet
  const handleProvisionSheet = async () => {
    if (accessToken) {
      setIsProvisioning(true);
      setStatusMessage('Creating _SheetPulse_Master_DB with 5 tabs in your Google Drive...');
      try {
        const { spreadsheetId: newId, spreadsheetUrl: newUrl } =
          await googleSheetsService.provisionMasterSpreadsheet(accessToken);
        setSpreadsheetId(newId);
        setSpreadsheetUrl(newUrl);
        setStatusMessage('Google Sheet successfully created and formatted!');
        setTimeout(() => setStep(3), 800);
      } catch (err: any) {
        console.error(err);
        setStatusMessage(`Provisioning failed: ${err.message}. You can continue in Local Mode.`);
      } finally {
        setIsProvisioning(false);
      }
    } else {
      // Local mode provisioning
      setSpreadsheetId('local_sheet_pulse_db');
      setSpreadsheetUrl('');
      setStatusMessage('Local database schema configured.');
      setStep(3);
    }
  };

  // Finish Setup
  const handleFinish = () => {
    onCompleteSetup({
      google_client_id: clientId,
      google_access_token: accessToken,
      google_token_expiry: tokenExpiry,
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: spreadsheetUrl,
      admin_pin: adminPin.length === 4 ? adminPin : '1234',
      is_setup_completed: true,
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="modern-card"
        style={{
          width: '100%',
          maxWidth: '540px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '28px 28px 20px 28px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="brand-icon">SP</div>
            <div>
              <h2 style={{ fontSize: '20px', margin: 0 }}>SheetPulse Setup</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Zero-server attendance backed 100% by your Google Drive
              </div>
            </div>
          </div>

          {/* Stepper Dots */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {[1, 2, 3].map(s => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor:
                    s <= step ? 'var(--accent-primary)' : 'var(--border-light)',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px' }}>
          {/* STEP 1: Google Sign In */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                  Step 1: Connect Your Google Drive
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  SheetPulse uses Google OAuth with least-privilege <code>drive.file</code> scope. The app can only see and manage the specific attendance spreadsheets it creates.
                </p>
              </div>

              <div>
                <label className="clean-label">GOOGLE CLOUD CLIENT ID (OPTIONAL FOR QUICK DEMO)</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="e.g. 1234567890-abcdefgh.apps.googleusercontent.com"
                  className="clean-input"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Leave blank to try the instant local/offline demo mode first.
                </span>
              </div>

              {statusMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12.5px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {statusMessage}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={handleGoogleSignIn}
                  className="btn-modern btn-primary"
                  style={{ height: '44px', fontSize: '14px', gap: '8px' }}
                >
                  <Cloud size={16} />
                  Sign In with Google
                </button>

                <button
                  onClick={handleContinueLocal}
                  className="btn-modern btn-secondary"
                  style={{ height: '40px', fontSize: '13px' }}
                >
                  Continue in Local / Offline Mode
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Provision Master Database */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                  Step 2: Provision Database Sheets
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  SheetPulse will build <code>_SheetPulse_Master_DB</code> with all 5 required tabs (Meta, Employees, Shifts, Attendance_Log, Weekly_Reports) with frozen headers and formulas.
                </p>
              </div>

              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12.5px',
                  lineHeight: 1.6,
                }}
              >
                <div>📄 <strong>_Meta:</strong> Distributed device mutex lock & cryptographic tip</div>
                <div>👥 <strong>Employees:</strong> Roster & 128-float biometric vectors</div>
                <div>⏱️ <strong>Shifts:</strong> Punctuality grace periods & working hours</div>
                <div>📜 <strong>Attendance_Log:</strong> Append-only event stream + SHA-256</div>
                <div>📊 <strong>Weekly_Reports:</strong> Aggregated payroll rollups</div>
              </div>

              {spreadsheetUrl && (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--accent-green-light)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '13px' }}>
                    Google Sheet Provisioned ✓
                  </span>
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-modern btn-secondary"
                    style={{ fontSize: '11.5px', padding: '3px 8px' }}
                  >
                    Open Sheet <ExternalLink size={11} />
                  </a>
                </div>
              )}

              {statusMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12.5px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {statusMessage}
                </div>
              )}

              <button
                onClick={handleProvisionSheet}
                disabled={isProvisioning}
                className="btn-modern btn-primary"
                style={{ height: '44px', fontSize: '14px', gap: '8px' }}
              >
                <Zap size={16} />
                {isProvisioning ? 'Creating Sheets...' : 'Provision Master Database'}
              </button>
            </div>
          )}

          {/* STEP 3: Admin PIN */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                  Step 3: Set Kiosk Admin PIN
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  On mobile devices and wall-mounted tablets, SheetPulse locks into Face ID Kiosk mode. To access settings, roster, and reports, you will enter this 4-digit PIN.
                </p>
              </div>

              <div>
                <label className="clean-label">4-DIGIT ADMIN PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value.replace(/\D/g, ''))}
                  className="clean-input"
                  style={{ fontSize: '20px', letterSpacing: '6px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block', textAlign: 'center' }}>
                  Default is <strong>1234</strong>. You can change this anytime in Admin Settings.
                </span>
              </div>

              <button
                onClick={handleFinish}
                className="btn-modern btn-primary"
                style={{ height: '44px', fontSize: '14px', gap: '8px', marginTop: '10px' }}
              >
                <CheckCircle2 size={16} />
                Launch Face ID Mobile Kiosk
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
