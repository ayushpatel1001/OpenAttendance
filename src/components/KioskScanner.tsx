// OpenAttendance • Minimal Face ID Kiosk Terminal
// Modern On-Device Biometrics • Clean HUD • Audio & Voice Confirmation

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  CheckCircle2,
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
  const [opticalStatus, setOpticalStatus] = useState<string>('Ready to scan');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [selectedActionOverride, setSelectedActionOverride] = useState<'AUTO' | 'IN' | 'OUT'>('AUTO');

  // Double punch guard
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
      setOpticalStatus('Align face with camera');
    } catch (err: any) {
      console.error('Camera start failed:', err);
      setCameraError(err.message || 'Unable to access camera. Please grant camera permission.');
      setCameraActive(false);
    }
  }, []);

  // Stop Camera
  const handleStopCamera = useCallback(() => {
    if (videoRef.current) {
      faceIdEngine.stopCamera(videoRef.current);
      setCameraActive(false);
      setOpticalStatus('Camera offline');
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
    setOpticalStatus(`Verified: ${employee.full_name}`);

    let actionToUse: PunchAction;
    if (selectedActionOverride !== 'AUTO') {
      actionToUse = selectedActionOverride as PunchAction;
    } else if (forcedAction) {
      actionToUse = forcedAction;
    } else {
      actionToUse = await inferNextAction(employee.emp_id);
    }

    // Check Double Punch Guard
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
      const log = await executeFacePunch(employee, actionToUse, 0.96);

      if (meta.sound_enabled) {
        audioService.playSuccessChime();
      }

      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#2563EB', '#10B981', '#111827'],
      });

      if (meta.voice_enabled) {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const greeting = actionToUse === 'IN' ? 'Welcome' : 'Goodbye';
        audioService.speak(`${greeting} ${employee.full_name}. Recorded ${actionToUse} at ${timeStr}.`);
      }

      setVerifiedEmployee({ employee, log });
      onPunchSuccess(log);

      setTimeout(() => {
        setVerifiedEmployee(null);
        setIsVerifying(false);
        setConfidenceScore(0);
        setOpticalStatus('Ready to scan');
      }, 2600);
    } catch (e) {
      console.error('Punch execution error:', e);
      setIsVerifying(false);
    }
  };

  // Live video frame processing loop
  useEffect(() => {
    let animId: number;
    let lastScanTime = 0;

    const scanFrame = () => {
      const now = Date.now();
      if (cameraActive && videoRef.current && !isVerifying && !verifiedEmployee) {
        if (now - lastScanTime > 350) {
          lastScanTime = now;
          const { vector, faceDetected } = faceIdEngine.extractEmbeddingFromVideo(videoRef.current);

          if (faceDetected && vector.length === 128) {
            setOpticalStatus('Matching biometric profile...');
            const matchResult = faceIdEngine.matchEmployee(vector, employees, 0.84);
            setConfidenceScore(matchResult.confidence);

            if (matchResult.matched && matchResult.employee) {
              processPunch(matchResult.employee);
            }
          } else {
            setConfidenceScore(0);
            setOpticalStatus('Align face with camera');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Main Terminal Card */}
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              <Camera size={16} />
              Face ID Check-In Terminal
            </div>
            <div className="card-subtitle-clean">
              On-device biometric verification • 100% private 128-float vector matching
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Mode Selector */}
            <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {(['AUTO', 'IN', 'OUT'] as const).map(action => (
                <button
                  key={action}
                  onClick={() => setSelectedActionOverride(action)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    border: 'none',
                    backgroundColor: selectedActionOverride === action ? 'var(--accent-primary)' : '#FFFFFF',
                    color: selectedActionOverride === action ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: selectedActionOverride === action ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Voice toggle */}
            <button
              onClick={() => onUpdateMeta({ voice_enabled: !meta.voice_enabled })}
              className="btn-modern btn-secondary"
              style={{ padding: '6px 9px' }}
              title={meta.voice_enabled ? 'Voice Feedback Enabled' : 'Voice Muted'}
            >
              {meta.voice_enabled ? <Volume2 size={14} color="var(--accent-blue)" /> : <VolumeX size={14} />}
            </button>

            {/* Wake Lock toggle */}
            <button
              onClick={toggleWakeLock}
              className="btn-modern btn-secondary"
              style={{ padding: '6px 9px' }}
              title="Keep kiosk tablet screen awake"
            >
              <Maximize2 size={14} color={meta.wake_lock_enabled ? 'var(--accent-green)' : 'currentColor'} />
            </button>
          </div>
        </div>

        <div className="card-body-clean" style={{ textAlign: 'center', padding: '24px 20px' }}>
          {/* Camera Viewport Frame */}
          <div className="camera-terminal">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-stream"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />

            {/* Idle state */}
            {!cameraActive && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  padding: '2rem',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <Camera size={26} color="#94A3B8" />
                </div>
                <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                  Camera is turned off
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '12.5px', maxWidth: '320px', marginBottom: '16px' }}>
                  Enable the camera to verify employee check-ins using sub-second on-device Face ID.
                </p>
                <button
                  onClick={handleStartCamera}
                  className="btn-modern btn-primary"
                  style={{ padding: '9px 18px', fontSize: '13px' }}
                >
                  <Camera size={15} />
                  Enable Camera
                </button>
              </div>
            )}

            {/* Camera Active Reticle */}
            {cameraActive && (
              <>
                <div
                  className={`camera-reticle ${
                    confidenceScore > 80 ? 'verifying' : confidenceScore > 30 ? 'detected' : ''
                  }`}
                />

                <div
                  style={{
                    position: 'absolute',
                    bottom: '14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(8px)',
                    color: '#FFFFFF',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {opticalStatus}
                </div>
              </>
            )}

            {/* Verified Popup Overlay */}
            {verifiedEmployee && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  zIndex: 20,
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--accent-green-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-green)',
                    marginBottom: '12px',
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>

                {verifiedEmployee.employee.avatar_url && (
                  <img
                    src={verifiedEmployee.employee.avatar_url}
                    alt={verifiedEmployee.employee.full_name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: 'var(--radius-full)',
                      objectFit: 'cover',
                      border: '2px solid var(--border-light)',
                      marginBottom: '10px',
                    }}
                  />
                )}

                <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                  {verifiedEmployee.employee.full_name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  {verifiedEmployee.employee.role} • {verifiedEmployee.employee.department}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span
                    className={`status-pill ${
                      verifiedEmployee.log.action === 'IN' ? 'pill-green' : 'pill-blue'
                    }`}
                    style={{ fontSize: '13px', padding: '4px 12px' }}
                  >
                    Recorded {verifiedEmployee.log.action}
                  </span>
                  <span className="status-pill pill-gray" style={{ fontSize: '12px' }}>
                    {new Date(verifiedEmployee.log.iso_timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Camera controls */}
          {cameraActive && (
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleStopCamera}
                className="btn-modern btn-secondary"
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                <CameraOff size={13} />
                Turn Off Camera
              </button>
            </div>
          )}

          {cameraError && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                backgroundColor: 'var(--accent-red-light)',
                color: 'var(--accent-red)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                textAlign: 'left',
              }}
            >
              {cameraError}
            </div>
          )}
        </div>
      </div>

      {/* Instant Test Bench (Clean & Minimal) */}
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              <Sparkles size={15} color="var(--accent-blue)" />
              Quick Test Profiles
            </div>
            <div className="card-subtitle-clean">
              Click any enrolled employee to simulate an instant Face ID punch
            </div>
          </div>
        </div>

        <div className="card-body-clean" style={{ padding: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '10px',
            }}
          >
            {employees.map(emp => (
              <div
                key={emp.emp_id}
                onClick={() => processPunch(emp)}
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFFFFF',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#9CA3AF';
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)';
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF';
                }}
              >
                {emp.avatar_url && (
                  <img
                    src={emp.avatar_url}
                    alt={emp.full_name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      objectFit: 'cover',
                      border: '1px solid var(--border-light)',
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {emp.full_name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {emp.emp_id} • {emp.shift_id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Double Punch Warning Modal */}
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
