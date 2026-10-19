// SheetPulse • Tamper-Evident Cryptographic Audit Inspector
// SHA-256 Chain Verification • In-Memory Tamper Simulation • Audit Trail

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, ArrowDown } from 'lucide-react';
import type { AttendanceLog } from '../types';
import { GENESIS_HASH, verifyAuditChain } from '../services/crypto';

interface AuditChainViewProps {
  logs: AttendanceLog[];
}

export const AuditChainView: React.FC<AuditChainViewProps> = ({ logs }) => {
  const [workingLogs, setWorkingLogs] = useState<AttendanceLog[]>(logs);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tamperedIndex, setTamperedIndex] = useState<number | null>(null);
  const [auditResult, setAuditResult] = useState<{
    isValid: boolean;
    brokenIndex: number | null;
    brokenLogId: string | null;
    expectedHash: string | null;
    actualHash: string | null;
    verifiedCount: number;
  }>({
    isValid: true,
    brokenIndex: null,
    brokenLogId: null,
    expectedHash: null,
    actualHash: null,
    verifiedCount: logs.length,
  });

  useEffect(() => {
    setWorkingLogs(logs);
    runVerification(logs);
  }, [logs]);

  const runVerification = async (logsToVerify: AttendanceLog[]) => {
    setIsVerifying(true);
    const res = await verifyAuditChain(logsToVerify);
    setAuditResult(res);
    setIsVerifying(false);
  };

  // Simulate Google Sheet Tampering (manually edit row data without updating hash)
  const simulateTampering = async () => {
    if (workingLogs.length < 3) return;
    const targetIdx = 2; // Row 3
    const copy = JSON.parse(JSON.stringify(workingLogs));

    // Alter timestamp or late_mins (like an employee opening Google Sheets to fake punctuality)
    copy[targetIdx].late_mins = 0;
    copy[targetIdx].action = 'IN';

    setWorkingLogs(copy);
    setTamperedIndex(targetIdx);
    await runVerification(copy);
  };

  // Restore Ledger
  const restoreLedger = async () => {
    setWorkingLogs(logs);
    setTamperedIndex(null);
    await runVerification(logs);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div className="ft-card ft-card-editorial">
        <div className="ft-card-header">
          <div>
            <div className="ft-card-title">
              <span>CRYPTOGRAPHIC TAMPER-DETECTION ENGINE</span>
              {auditResult.isValid ? (
                <span className="badge-ft badge-ft-green">
                  <ShieldCheck size={12} /> ALL {auditResult.verifiedCount} BLOCKS INTACT
                </span>
              ) : (
                <span className="badge-ft badge-ft-claret">
                  <ShieldAlert size={12} /> HASH CHAIN COMPROMISED
                </span>
              )}
            </div>
            <div className="ft-card-subtitle">
              Every punch mathematically binds to the preceding row's SHA-256 hash. Unauthorized Google Sheet edits break the chain.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {tamperedIndex !== null ? (
              <button onClick={restoreLedger} className="btn-ft btn-ft-primary" style={{ fontSize: '12px' }}>
                <CheckCircle2 size={13} />
                Restore Ledger Integrity
              </button>
            ) : (
              <button onClick={simulateTampering} className="btn-ft btn-ft-outline" style={{ fontSize: '12px', color: 'var(--ft-claret)' }}>
                <AlertTriangle size={13} />
                Simulate Google Sheet Tamper
              </button>
            )}

            <button
              onClick={() => runVerification(workingLogs)}
              disabled={isVerifying}
              className="btn-ft btn-ft-outline"
              style={{ fontSize: '12px' }}
            >
              <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
              Re-Verify Chain
            </button>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div style={{ padding: '20px' }}>
          {auditResult.isValid ? (
            <div
              style={{
                backgroundColor: 'var(--ft-green-light)',
                border: '1px solid rgba(0, 127, 59, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ft-green)',
                  border: '1px solid var(--ft-green)',
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 style={{ color: 'var(--ft-green)', fontSize: '16px', margin: 0 }}>
                  Cryptographic Chain 100% Verified
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--ft-ink-body)', margin: '2px 0 0 0' }}>
                  All {auditResult.verifiedCount} attendance events from Genesis to the current Tip are mathematically continuous. No timestamps or punch actions have been manipulated in Google Drive.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--ft-red-light)',
                border: '2px solid var(--ft-claret)',
                borderRadius: 'var(--radius-sm)',
                padding: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ft-claret)',
                  border: '2px solid var(--ft-claret)',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="ft-stamp" style={{ marginBottom: '6px' }}>
                  SECURITY AUDIT FAILURE DETECTED
                </div>
                <h4 style={{ color: 'var(--ft-claret)', fontSize: '17px', margin: '4px 0' }}>
                  Cryptographic Chain Broken at Row #{auditResult.brokenIndex! + 1} ({auditResult.brokenLogId})
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--ft-ink-body)', lineHeight: 1.5, marginBottom: '8px' }}>
                  An unauthorized alteration occurred in Google Sheets! The payload in Row #{auditResult.brokenIndex! + 1} no longer hashes to its recorded cryptographic signature.
                </p>
                <div
                  style={{
                    backgroundColor: '#FFF',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs)',
                    fontFamily: 'var(--font-mono-ledger)',
                    fontSize: '11px',
                    border: '1px solid var(--ft-border-rule)',
                  }}
                >
                  <div>EXPECTED SIGNATURE: <span style={{ color: 'var(--ft-green)', fontWeight: 700 }}>{auditResult.expectedHash}</span></div>
                  <div>ACTUAL SHEET VALUE: <span style={{ color: 'var(--ft-red)', fontWeight: 700 }}>{auditResult.actualHash}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Hashes Summary */}
          <div
            style={{
              marginTop: '18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '12px',
                border: '1px solid var(--ft-border-rule)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--ft-paper-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ft-ink-muted)', fontWeight: 700 }}>
                GENESIS TIP HASH (ANCHOR)
              </div>
              <div style={{ fontFamily: 'var(--font-mono-ledger)', fontSize: '11.5px', wordBreak: 'break-all', marginTop: '4px' }}>
                {GENESIS_HASH}
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                border: '1px solid var(--ft-border-rule)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--ft-paper-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ft-ink-muted)', fontWeight: 700 }}>
                CURRENT CHAIN TIP (LATEST PUNCH)
              </div>
              <div style={{ fontFamily: 'var(--font-mono-ledger)', fontSize: '11.5px', wordBreak: 'break-all', marginTop: '4px', color: 'var(--ft-claret)', fontWeight: 700 }}>
                {workingLogs[workingLogs.length - 1]?.prev_hash_sig || GENESIS_HASH}
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Block Chain Walkthrough */}
        <div style={{ borderTop: '1px solid var(--ft-border-rule)', padding: '18px' }}>
          <h4 style={{ fontSize: '15px', marginBottom: '14px', fontFamily: 'var(--font-serif-headline)' }}>
            Sequential Block Hash Verification Walkthrough:
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {workingLogs.slice(0, 8).map((log, index) => {
              const isBroken = auditResult.brokenIndex === index;
              return (
                <div key={log.log_id}>
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: isBroken ? 'var(--ft-red-light)' : '#FFFDFB',
                      border: `1px solid ${isBroken ? 'var(--ft-claret)' : 'var(--ft-border-rule)'}`,
                      borderRadius: 'var(--radius-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge-ft badge-ft-dark" style={{ width: '28px', justifyContent: 'center' }}>
                        #{index + 1}
                      </span>
                      <div>
                        <span style={{ fontWeight: 700 }}>{log.full_name || log.emp_id}</span>
                        <span style={{ margin: '0 6px', color: 'var(--ft-ink-muted)' }}>•</span>
                        <span className={`badge-ft ${log.action === 'IN' ? 'badge-ft-green' : 'badge-ft-blue'}`}>
                          {log.action}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono-ledger)', fontSize: '11px', color: 'var(--ft-ink-muted)' }}>
                      TIMESTAMP: {new Date(log.iso_timestamp).toLocaleTimeString()}
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-mono-ledger)',
                        fontSize: '11px',
                        backgroundColor: 'var(--ft-paper-subtle)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--ft-border-rule)',
                        color: isBroken ? 'var(--ft-red)' : 'var(--ft-ink-primary)',
                        fontWeight: isBroken ? 700 : 500,
                      }}
                    >
                      SIG: {log.prev_hash_sig.substring(0, 16)}...
                    </div>

                    <div>
                      {isBroken ? (
                        <span className="badge-ft badge-ft-claret">BROKEN LINK</span>
                      ) : (
                        <span className="badge-ft badge-ft-green">VALID ✓</span>
                      )}
                    </div>
                  </div>

                  {index < Math.min(workingLogs.length - 1, 7) && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3px 0' }}>
                      <ArrowDown size={14} color="var(--ft-border-rule)" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
