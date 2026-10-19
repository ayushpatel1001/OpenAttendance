// OpenAttendance • Onboarding & Google Drive Setup Wizard
// Guides the user to Sign In with Google, provision _OpenAttendance_Master_DB, and configure the Admin PIN

import React, { useState } from 'react';
import { CheckCircle2, Zap, ExternalLink } from 'lucide-react';
import type { MetaState } from '../types';
import { googleSheetsService, DEFAULT_CLIENT_ID } from '../services/googleSheets';

interface OnboardingSetupProps {
  meta: MetaState;
  onCompleteSetup: (updatedMeta: Partial<MetaState>) => void;
}

export const OnboardingSetup: React.FC<OnboardingSetupProps> = ({ meta, onCompleteSetup }) => {
  const [step, setStep] = useState<number>(1);
  const [clientId, setClientId] = useState<string>(meta.google_client_id || DEFAULT_CLIENT_ID);
  const [accessToken, setAccessToken] = useState<string>(meta.google_access_token || '');
  const [tokenExpiry, setTokenExpiry] = useState<number>(meta.google_token_expiry || 0);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(meta.spreadsheet_id || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(meta.spreadsheet_url || '');
  const [adminPin, setAdminPin] = useState<string>(meta.admin_pin || '1234');
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize GIS, request access token, and auto-provision Google Sheet
  const handleGoogleSignIn = () => {
    if (!clientId.trim()) {
      setShowClientIdInput(true);
      setStatusMessage('Please enter your Google Cloud OAuth Client ID below, or test in Local Mode.');
      return;
    }

    setStatusMessage('Connecting to Google Identity Services...');
    googleSheetsService.initializeGis(clientId.trim(), async (token, expiresIn) => {
      setAccessToken(token);
      setTokenExpiry(Date.now() + expiresIn * 1000);
      setStatusMessage('Google authorization granted! Provisioning _OpenAttendance_Master_DB in your Google Drive...');
      setIsProvisioning(true);
      setStep(2);

      try {
        const { spreadsheetId: newId, spreadsheetUrl: newUrl } =
          await googleSheetsService.provisionMasterSpreadsheet(token);
        setSpreadsheetId(newId);
        setSpreadsheetUrl(newUrl);
        setStatusMessage('Master spreadsheet successfully created with all 5 tabs in your Google Drive!');
        setTimeout(() => setStep(3), 1200);
      } catch (err: any) {
        console.error(err);
        setStatusMessage(`Google Drive provisioning error: ${err.message}. You can continue or test in Local Mode.`);
      } finally {
        setIsProvisioning(false);
      }
    });

    googleSheetsService.requestAccessToken();
  };

  // Quick Demo / Local Mode
  const handleContinueLocal = () => {
    setStatusMessage('Local Mode selected. Check-ins will be stored safely in on-device IndexedDB.');
    setStep(2);
  };

  // Manual Provision Google Sheet if needed
  const handleProvisionSheet = async () => {
    if (accessToken) {
      setIsProvisioning(true);
      setStatusMessage('Creating _OpenAttendance_Master_DB with 5 tabs in your Google Drive...');
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
      setSpreadsheetId('local_open_attendance_db');
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

  const [showClientIdInput, setShowClientIdInput] = useState<boolean>(!clientId.trim());

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
          maxWidth: '520px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '28px 28px 20px 28px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="brand-icon">OA</div>
            <div>
              <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 700 }}>OpenAttendance</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Sign in with Google to provision your private attendance database
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Step 1: Sign In & Connect Google Drive
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  OpenAttendance is 100% serverless. When you sign in, it connects directly to your Google account to create and manage your attendance spreadsheet in <strong>your personal Google Drive</strong>.
                </p>
              </div>

              {/* Primary Google Sign In Button */}
              <div>
                <button
                  onClick={handleGoogleSignIn}
                  className="btn-google"
                  style={{ height: '48px', fontSize: '15px' }}
                >
                  <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  <span>Sign In with Google</span>
                </button>
              </div>

              {/* Value propositions */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                }}
              >
                <div>📁 <strong>Personal Drive Storage:</strong> Auto-creates <code>_OpenAttendance_Master_DB</code> with 5 tabs.</div>
                <div>🛡️ <strong>Least-Privilege Scope:</strong> Uses <code>drive.file</code> (cannot read your other Drive files).</div>
                <div>🔒 <strong>100% Data Sovereignty:</strong> No external database servers or monthly subscriptions.</div>
              </div>

              {/* Client ID Configuration Field */}
              <div style={{ marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="clean-label" style={{ margin: 0 }}>GOOGLE OAUTH CLIENT ID</label>
                  <button
                    type="button"
                    onClick={() => setShowClientIdInput(!showClientIdInput)}
                    className="btn-ghost"
                    style={{ fontSize: '11px', padding: '2px 6px', textDecoration: 'underline' }}
                  >
                    {showClientIdInput ? 'Hide' : 'Configure / Edit'}
                  </button>
                </div>

                {showClientIdInput ? (
                  <div>
                    <input
                      type="text"
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                      placeholder="e.g. 1234567890-abcdefgh.apps.googleusercontent.com"
                      className="clean-input"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Bake this into AWS Amplify builds using <code>VITE_GOOGLE_CLIENT_ID</code>.
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} />
                    <span>Client ID configured and ready</span>
                  </div>
                )}
              </div>

              {statusMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12.5px',
                    color: 'var(--text-primary)',
                    borderLeft: '3px solid var(--accent-primary)',
                  }}
                >
                  {statusMessage}
                </div>
              )}

              {/* Local Mode Alternative */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', textAlign: 'center' }}>
                <button
                  onClick={handleContinueLocal}
                  className="btn-ghost"
                  style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}
                >
                  or try offline Local Demo mode (IndexedDB only)
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
                  OpenAttendance will build <code>_OpenAttendance_Master_DB</code> with all 5 required tabs (Meta, Employees, Shifts, Attendance_Log, Weekly_Reports) with frozen headers and formulas.
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
                  On mobile devices and wall-mounted tablets, OpenAttendance locks into Face ID Kiosk mode. To access settings, roster, and reports, you will enter this 4-digit PIN.
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
