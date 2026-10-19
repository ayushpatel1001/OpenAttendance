// SheetPulse • Kiosk Face ID Terminal
// On-Device Biometric Verification • Reticle HUD • Speech Confirmation • Wake Lock

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import type { Employee, AttendanceLog, PunchAction, MetaState } from '../types';
import { faceIdEngine } from '../services/faceEngine';
import { audioService } from '../services/audio';
import { checkDoublePunch, inferNextAction, executeFacePunch } from '../services/attendanceRules';
import { DoublePunchModal } from './DoublePunchModal';

interface KioskScannerProps {
  employees: Employee[];
  meta: MetaState;
  onPunchSuccess: (log: AttendanceLog) => void;
  onUpdateMeta: (partial: Partial<MetaState>) => void;
}

export const KioskScanner: React.FC<KioskScannerProps> = ({
  employees,
  meta,
  onPunchSuccess,
  onUpdateMeta,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedEmployee, setVerifiedEmployee] = useState<{
    employee: Employee;
    log: AttendanceLog;
  } | null>(null);

  // Optical metrics
  const [opticalStatus, setOpticalStatus] = useState<string>('POSITION FACE IN RETICLE');
  const [lightingLevel, setLightingLevel] = useState<number>(0.8);
  const [livenessPassed, setLivenessPassed] = useState<boolean>(true);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [selectedActionOverride, setSelectedActionOverride] = useState<'AUTO' | 'IN' | 'OUT'>('AUTO');

  // Double punch guard state
  const [doublePunchGuard, setDoublePunchGuard] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    lastLog: AttendanceLog | null;
    elapsedSeconds: number;
    inferredAction: PunchAction;
  }>({
    isOpen: false,
    employee: null,
    lastLog: null,
    elapsedSeconds: 0,
    inferredAction: 'IN',
  });

  // Wake lock
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        onUpdateMeta({ wake_lock_enabled: true });
      } catch (err) {
        console.warn('Wake Lock request rejected:', err);
      }
    }
  }, [onUpdateMeta]);

  // Start Camera
  const handleStartCamera = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      setCameraError(null);
      await faceIdEngine.startCamera(videoRef.current);
      setCameraActive(true);
      setOpticalStatus('SCANNING FOR BIOMETRIC ENROLLMENTS...');
    } catch (err: any) {
      console.error('Camera start failed:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions.');
      setCameraActive(false);
    }
  }, []);

  // Stop Camera
  const handleStopCamera = useCallback(() => {
    if (videoRef.current) {
      faceIdEngine.stopCamera(videoRef.current);
      setCameraActive(false);
      setOpticalStatus('CAMERA OFFLINE');
    }
  }, []);

  // Toggle Wake Lock
  const toggleWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      onUpdateMeta({ wake_lock_enabled: false });
    } else {
      await requestWakeLock();
    }
  };

  // Complete Punch Flow
  const processPunch = async (employee: Employee, forcedAction?: PunchAction) => {
    setIsVerifying(true);
    setOpticalStatus(`MATCH CONFIRMED: ${employee.full_name.toUpperCase()}`);

    // Determine Action
    let actionToUse: PunchAction;
    if (selectedActionOverride !== 'AUTO') {
      actionToUse = selectedActionOverride as PunchAction;
    } else if (forcedAction) {
      actionToUse = forcedAction;
    } else {
      actionToUse = await inferNextAction(employee.emp_id);
    }

    // Check Double-Punch Guard (< 3 minutes) if not forced
    if (!forcedAction) {
      const guardCheck = await checkDoublePunch(employee.emp_id);
      if (guardCheck.isDoublePunch && guardCheck.lastLog) {
        if (meta.sound_enabled) audioService.playWarningChime();
        setDoublePunchGuard({
          isOpen: true,
          employee,
          lastLog: guardCheck.lastLog,
          elapsedSeconds: guardCheck.elapsedSeconds,
          inferredAction: actionToUse,
        });
        setIsVerifying(false);
        return;
      }
    }

    try {
      // Execute punch with cryptographic hash chain
      const log = await executeFacePunch(employee, actionToUse, 0.97);

      // Play harmonic bell chime
      if (meta.sound_enabled) {
        audioService.playSuccessChime();
      }

      // Celebratory Confetti
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#990F3D', '#0F5499', '#007F3B', '#FFF1E5', '#141414'],
      });

      // Voice Feedback
      if (meta.voice_enabled) {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const greeting = actionToUse === 'IN' ? 'Welcome' : 'Goodbye';
        audioService.speak(`${greeting} ${employee.full_name}. Recorded ${actionToUse} at ${timeStr}.`);
      }

      // Show verified card overlay
      setVerifiedEmployee({ employee, log });
      onPunchSuccess(log);

      setTimeout(() => {
        setVerifiedEmployee(null);
        setIsVerifying(false);
        setConfidenceScore(0);
        setOpticalStatus('POSITION FACE IN RETICLE');
      }, 3000);
    } catch (e) {
      console.error('Punch execution error:', e);
      setIsVerifying(false);
    }
  };

  // Continuous Camera Detection Loop
  useEffect(() => {
    let animId: number;
    let lastScanTime = 0;

    const scanFrame = () => {
      const now = Date.now();
      if (cameraActive && videoRef.current && !isVerifying && !verifiedEmployee) {
        // Run extraction every 400ms to stay super responsive while lightweight
        if (now - lastScanTime > 400) {
          lastScanTime = now;
          const { vector, faceDetected, lightingQuality, livenessPassed: livePass } =
            faceIdEngine.extractEmbeddingFromVideo(videoRef.current);

          setLightingLevel(lightingQuality);
          setLivenessPassed(livePass);

          if (faceDetected && vector.length === 128) {
            setOpticalStatus('ANALYZING 128-D VECTOR EMBEDDING...');
            const matchResult = faceIdEngine.matchEmployee(vector, employees, 0.84);
            setConfidenceScore(matchResult.confidence);

            if (matchResult.matched && matchResult.employee) {
              processPunch(matchResult.employee);
            } else {
              setOpticalStatus('FACE DETECTED • MATCHING ROSTER...');
            }
          } else {
            setConfidenceScore(0);
            setOpticalStatus('POSITION FACE IN RETICLE');
          }
        }
      }
      animId = requestAnimationFrame(scanFrame);
    };

    if (cameraActive) {
      animId = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraActive, isVerifying, verifiedEmployee, employees]);

  // Request wake lock on component mount if enabled
  useEffect(() => {
    if (meta.wake_lock_enabled) {
      requestWakeLock();
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [requestWakeLock, meta.wake_lock_enabled]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Kiosk Viewport Card */}
      <div className="ft-card ft-card-editorial">
        <div className="ft-card-header">
          <div className="ft-card-title">
            <span style={{ color: 'var(--ft-claret)' }}>■</span>
            <span>BIOMETRIC KIOSK TERMINAL</span>
            <span className="badge-ft badge-ft-dark">FACE ID v1.0</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Action Mode Selector */}
            <div style={{ display: 'flex', border: '1px solid var(--ft-border-rule)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {(['AUTO', 'IN', 'OUT'] as const).map(action => (
                <button
                  key={action}
                  onClick={() => setSelectedActionOverride(action)}
                  className="btn-ft"
                  style={{
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    border: 'none',
                    borderRadius: 0,
                    backgroundColor: selectedActionOverride === action ? 'var(--ft-claret)' : 'transparent',
                    color: selectedActionOverride === action ? '#FFF1E5' : 'var(--ft-ink-body)',
                    fontWeight: selectedActionOverride === action ? 700 : 500,
                  }}
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Voice Feedback Toggle */}
            <button
              onClick={() => onUpdateMeta({ voice_enabled: !meta.voice_enabled })}
              className={`btn-ft ${meta.voice_enabled ? 'btn-ft-outline' : 'btn-ft-subtle'}`}
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title={meta.voice_enabled ? 'Voice Speech Enabled' : 'Voice Speech Muted'}
            >
              {meta.voice_enabled ? <Volume2 size={14} color="var(--ft-claret)" /> : <VolumeX size={14} />}
            </button>

            {/* Wake Lock Toggle */}
            <button
              onClick={toggleWakeLock}
              className={`btn-ft ${meta.wake_lock_enabled ? 'btn-ft-outline' : 'btn-ft-subtle'}`}
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Prevent Screen Sleep (Screen Wake Lock)"
            >
              <Maximize2 size={14} color={meta.wake_lock_enabled ? 'var(--ft-green)' : 'currentColor'} />
            </button>
          </div>
        </div>

        <div className="ft-card-body" style={{ padding: '24px 20px', textAlign: 'center' }}>
          {/* Camera Viewport Frame */}
          <div className="kiosk-viewport-wrap">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="kiosk-video"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />

            {/* Placeholder state when camera is stopped */}
            {!cameraActive && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF1E5',
                  padding: '2rem',
                }}
              >
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 241, 229, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    border: '1px solid rgba(255, 241, 229, 0.2)',
                  }}
                >
                  <Camera size={36} color="var(--ft-claret)" />
                </div>
                <h3 style={{ color: '#FFF1E5', fontSize: '19px', marginBottom: '8px' }}>
                  Camera Scanner Inactive
                </h3>
                <p style={{ color: '#C8BEB4', fontSize: '13px', maxWidth: '380px', marginBottom: '18px' }}>
                  Activate the device camera to initiate high-speed on-device Face ID verification.
                </p>
                <button
                  onClick={handleStartCamera}
                  className="btn-ft btn-ft-primary"
                  style={{ padding: '10px 22px', fontSize: '14px', gap: '8px' }}
                >
                  <Camera size={16} />
                  Start Kiosk Camera
                </button>
              </div>
            )}

            {/* Live Camera HUD Overlay */}
            {cameraActive && (
              <div className="kiosk-hud-overlay">
                {/* Top HUD Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(20, 20, 20, 0.65)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs)',
                    color: '#FFF1E5',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono-ledger)',
                    backdropFilter: 'blur(3px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--ft-claret)', fontSize: '10px' }}>●</span>
                    <span>OPTICAL SENSOR: ONLINE</span>
                  </div>
                  <div>LIGHT: {Math.round(lightingLevel * 100)}%</div>
                  <div>LIVENESS: {livenessPassed ? 'PASSED ✓' : 'CHECKING...'}</div>
                  <div>MODE: {selectedActionOverride}</div>
                </div>

                {/* Center Biometric Reticle */}
                <div
                  className={`kiosk-reticle-box ${
                    confidenceScore > 80 ? 'verifying' : confidenceScore > 30 ? 'detected' : ''
                  }`}
                >
                  <div className="corner-bracket tl" />
                  <div className="corner-bracket tr" />
                  <div className="corner-bracket bl" />
                  <div className="corner-bracket br" />
                  <div className="scanning-laser" />
                </div>

                {/* Bottom HUD Bar */}
                <div
                  style={{
                    background: 'rgba(20, 20, 20, 0.75)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-xs)',
                    color: '#FFF1E5',
                    textAlign: 'center',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono-ledger)',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: isVerifying ? '#5cdb8e' : 'var(--ft-paper-bg)',
                    }}
                  >
                    {opticalStatus}
                  </div>
                  {confidenceScore > 0 && (
                    <div style={{ fontSize: '11px', color: '#ffafc0', marginTop: '3px' }}>
                      MATCH PROBABILITY: {confidenceScore}%
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verified Confirmation Stamp Overlay */}
            {verifiedEmployee && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 241, 229, 0.95)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  zIndex: 20,
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <div className="ft-stamp" style={{ fontSize: '16px', marginBottom: '16px' }}>
                  ★ FT BIOMETRIC RECORD CERTIFIED ★
                </div>

                {verifiedEmployee.employee.avatar_url && (
                  <img
                    src={verifiedEmployee.employee.avatar_url}
                    alt={verifiedEmployee.employee.full_name}
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--ft-claret)',
                      marginBottom: '12px',
                    }}
                  />
                )}

                <h2 style={{ fontSize: '26px', color: 'var(--ft-ink-primary)', marginBottom: '4px' }}>
                  {verifiedEmployee.employee.full_name}
                </h2>
                <div style={{ fontSize: '14px', color: 'var(--ft-ink-muted)', marginBottom: '14px' }}>
                  {verifiedEmployee.employee.role} • {verifiedEmployee.employee.department}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                  <span
                    className={`badge-ft ${
                      verifiedEmployee.log.action === 'IN' ? 'badge-ft-green' : 'badge-ft-blue'
                    }`}
                    style={{ fontSize: '14px', padding: '6px 14px' }}
                  >
                    RECORDED: {verifiedEmployee.log.action}
                  </span>
                  <span className="badge-ft badge-ft-dark" style={{ fontSize: '13px' }}>
                    {new Date(verifiedEmployee.log.iso_timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                {verifiedEmployee.log.late_mins > 0 && (
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--ft-amber)',
                      fontWeight: 600,
                      marginBottom: '8px',
                    }}
                  >
                    Note: Arrival flagged with {verifiedEmployee.log.late_mins} min grace overtime.
                  </div>
                )}

                <div
                  style={{
                    fontFamily: 'var(--font-mono-ledger)',
                    fontSize: '11px',
                    color: 'var(--ft-ink-subtle)',
                    wordBreak: 'break-all',
                    maxWidth: '380px',
                    textAlign: 'center',
                  }}
                >
                  SHA-256: {verifiedEmployee.log.prev_hash_sig.substring(0, 32)}...
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls & Status Bar */}
          {cameraActive && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={handleStopCamera}
                className="btn-ft btn-ft-outline"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <CameraOff size={14} />
                Stop Camera
              </button>
            </div>
          )}

          {cameraError && (
            <div
              style={{
                marginTop: '16px',
                backgroundColor: 'var(--ft-red-light)',
                color: 'var(--ft-red)',
                border: '1px solid rgba(186,0,0,0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '12.5px',
                textAlign: 'left',
              }}
            >
              <strong>Camera Access Notice:</strong> {cameraError}
            </div>
          )}
        </div>
      </div>

      {/* Biometric Test Bench / Quick Simulation Drawer */}
      <div className="ft-card ft-card-dark-header">
        <div className="ft-card-header">
          <div className="ft-card-title" style={{ fontSize: '15px' }}>
            <Sparkles size={16} color="var(--ft-claret)" />
            <span>BIOMETRIC TEST BENCH & SIMULATION DESK</span>
          </div>
          <div className="ft-card-subtitle">
            Simulate instant Face ID punch without hardware camera
          </div>
        </div>

        <div className="ft-card-body" style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: '12.5px', color: 'var(--ft-ink-muted)', marginBottom: '14px' }}>
            Click an enrolled employee below to simulate an instantaneous on-device Face ID recognition event, test double-punch guard, and witness real-time cryptographic ledger chaining:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '12px',
            }}
          >
            {employees.map(emp => (
              <div
                key={emp.emp_id}
                onClick={() => processPunch(emp)}
                style={{
                  border: '1px solid var(--ft-border-rule)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFDFB',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ft-claret)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-paper-md)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ft-border-rule)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {emp.avatar_url && (
                  <img
                    src={emp.avatar_url}
                    alt={emp.full_name}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--ft-border-dark)',
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif-headline)',
                      fontSize: '14px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {emp.full_name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ft-ink-muted)' }}>
                    {emp.emp_id} • {emp.shift_id}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span className="badge-ft badge-ft-green" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      FACE ID READY
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Double-Punch Warning Modal */}
      <DoublePunchModal
        isOpen={doublePunchGuard.isOpen}
        employee={doublePunchGuard.employee}
        lastLog={doublePunchGuard.lastLog}
        elapsedSeconds={doublePunchGuard.elapsedSeconds}
        inferredAction={doublePunchGuard.inferredAction}
        onConfirm={action => {
          if (doublePunchGuard.employee) {
            processPunch(doublePunchGuard.employee, action);
          }
          setDoublePunchGuard(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => {
          setDoublePunchGuard(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};
