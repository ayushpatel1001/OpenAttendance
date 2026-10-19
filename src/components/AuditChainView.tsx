// OpenAttendance • Cryptographic Audit Inspector (Clean & Minimal)

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
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

  const simulateTampering = async () => {
    if (workingLogs.length < 3) return;
    const targetIdx = 2;
    const copy = JSON.parse(JSON.stringify(workingLogs));
    copy[targetIdx].late_mins = 0;
    copy[targetIdx].action = 'IN';

    setWorkingLogs(copy);
    setTamperedIndex(targetIdx);
    await runVerification(copy);
  };

  const restoreLedger = async () => {
    setWorkingLogs(logs);
    setTamperedIndex(null);
    await runVerification(logs);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              Cryptographic Audit Chain
              {auditResult.isValid ? (
                <span className="status-pill pill-green">
                  <ShieldCheck size={12} /> {auditResult.verifiedCount} Blocks Intact
                </span>
              ) : (
                <span className="status-pill pill-red">
                  <ShieldAlert size={12} /> Integrity Tampered
                </span>
              )}
            </div>
            <div className="card-subtitle-clean">
              Mathematical SHA-256 chain links prevent unauthorized overtime forgery in Google Sheets
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {tamperedIndex !== null ? (
              <button onClick={restoreLedger} className="btn-modern btn-primary" style={{ fontSize: '12px' }}>
                <CheckCircle2 size={13} />
                Restore Authentic Chain
              </button>
            ) : (
              <button
                onClick={simulateTampering}
                className="btn-modern btn-secondary"
                style={{ fontSize: '12px', color: 'var(--accent-red)' }}
              >
                <AlertTriangle size={13} />
                Simulate Sheet Tampering
              </button>
            )}

            <button
              onClick={() => runVerification(workingLogs)}
              disabled={isVerifying}
              className="btn-modern btn-secondary"
              style={{ fontSize: '12px' }}
            >
              <RefreshCw size={13} className={isVerifying ? 'animate-spin' : ''} />
              Re-Verify
            </button>
          </div>
        </div>

        <div className="card-body-clean">
          {auditResult.isValid ? (
            <div
              style={{
                backgroundColor: 'var(--accent-green-light)',
                border: '1px solid rgba(5, 150, 105, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-green)',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <strong style={{ color: 'var(--accent-green)', fontSize: '14px' }}>
                  Cryptographic Chain 100% Valid
                </strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  All {auditResult.verifiedCount} attendance records from Genesis to current tip are continuous. No timestamps have been altered.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--accent-red-light)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-red)',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: 'var(--accent-red)', fontSize: '14px' }}>
                  Chain Corrupted at Block #{auditResult.brokenIndex! + 1} ({auditResult.brokenLogId})
                </strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 10px 0' }}>
                  Unauthorized manual alteration detected in Google Sheets! The payload in Row #{auditResult.brokenIndex! + 1} no longer matches its cryptographic signature.
                </p>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <div>EXPECTED: <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{auditResult.expectedHash}</span></div>
                  <div>RECORDED: <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{auditResult.actualHash}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Hashes Summary */}
          <div
            style={{
              marginTop: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                GENESIS HASH ANCHOR
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', wordBreak: 'break-all', marginTop: '3px' }}>
                {GENESIS_HASH}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                CURRENT CHAIN TIP
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', wordBreak: 'break-all', marginTop: '3px', fontWeight: 600 }}>
                {workingLogs[workingLogs.length - 1]?.prev_hash_sig || GENESIS_HASH}
              </div>
            </div>
          </div>

          {/* Sequential Block Walk */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Sequential Block Signatures:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {workingLogs.slice(0, 6).map((log, index) => {
                const isBroken = auditResult.brokenIndex === index;
                return (
                  <div key={log.log_id}>
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: isBroken ? 'var(--accent-red-light)' : '#FFFFFF',
                        border: `1px solid ${isBroken ? 'var(--accent-red)' : 'var(--border-light)'}`,
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="status-pill pill-gray" style={{ fontFamily: 'var(--font-mono)' }}>
                          #{index + 1}
                        </span>
                        <strong>{log.full_name || log.emp_id}</strong>
                        <span className={`status-pill ${log.action === 'IN' ? 'pill-green' : 'pill-blue'}`}>
                          {log.action}
                        </span>
                      </div>

                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.prev_hash_sig.substring(0, 16)}...
                      </div>

                      <div>
                        {isBroken ? (
                          <span className="status-pill pill-red">Broken</span>
                        ) : (
                          <span className="status-pill pill-green">Verified</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
