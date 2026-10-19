// Double-Punch Guard Modal (< 3 minutes check)

import React from 'react';
import { AlertTriangle, Clock, X, Check } from 'lucide-react';
import type { Employee, AttendanceLog, PunchAction } from '../types';

interface DoublePunchModalProps {
  isOpen: boolean;
  employee: Employee | null;
  lastLog: AttendanceLog | null;
  elapsedSeconds: number;
  inferredAction: PunchAction;
  onConfirm: (action: PunchAction) => void;
  onCancel: () => void;
}

export const DoublePunchModal: React.FC<DoublePunchModalProps> = ({
  isOpen,
  employee,
  lastLog,
  elapsedSeconds,
  inferredAction,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !employee || !lastLog) return null;

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="ft-modal-overlay">
      <div className="ft-modal-content" style={{ maxWidth: '480px' }}>
        <div className="ft-modal-header" style={{ borderBottomColor: 'var(--ft-amber)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--ft-amber-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ft-amber)',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', margin: 0, color: 'var(--ft-ink-primary)' }}>
                Double-Punch Warning
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--ft-ink-muted)' }}>
                Kiosk Guard Active (&lt; 3 minutes)
              </div>
            </div>
          </div>
          <button onClick={onCancel} className="btn-ft btn-ft-subtle" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="ft-card-body" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            {employee.avatar_url && (
              <img
                src={employee.avatar_url}
                alt={employee.full_name}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--ft-border-dark)',
                }}
              />
            )}
            <div>
              <div style={{ fontFamily: 'var(--font-serif-headline)', fontSize: '17px', fontWeight: 700 }}>
                {employee.full_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ft-ink-muted)' }}>
                {employee.role} • {employee.department}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--ft-amber-light)',
              border: '1px solid rgba(199, 107, 0, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '13.5px',
              color: '#6F3C00',
              marginBottom: '20px',
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
              <Clock size={15} />
              Recent Punch Detected
            </div>
            You recorded an <strong>{lastLog.action}</strong> punch only <strong>{timeStr}</strong> ago. Did you intend to record an immediate <strong>{inferredAction}</strong> punch, or was this an accidental re-scan?
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              className="btn-ft btn-ft-outline"
              style={{ flex: 1 }}
            >
              <X size={15} />
              Cancel & Discard
            </button>
            <button
              onClick={() => onConfirm(inferredAction)}
              className="btn-ft btn-ft-primary"
              style={{ flex: 1.2 }}
            >
              <Check size={15} />
              Confirm {inferredAction} Punch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
