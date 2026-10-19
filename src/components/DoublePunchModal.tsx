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
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: 'var(--accent-amber-light)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <AlertTriangle size={15} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>
                Recent Punch Detected
              </h3>
            </div>
          </div>
          <button onClick={onCancel} className="btn-modern btn-ghost" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            {employee.avatar_url && (
              <img
                src={employee.avatar_url}
                alt={employee.full_name}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-full)',
                  objectFit: 'cover',
                  border: '1px solid var(--border-light)',
                }}
              />
            )}
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {employee.full_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {employee.role} • {employee.department}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--accent-amber-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#92400E',
              marginBottom: '18px',
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, marginBottom: '2px' }}>
              <Clock size={14} />
              Double-Punch Guard
            </div>
            You recorded an <strong>{lastLog.action}</strong> punch only <strong>{timeStr}</strong> ago. Do you wish to record another punch?
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onCancel} className="btn-modern btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              onClick={() => onConfirm(inferredAction)}
              className="btn-modern btn-primary"
              style={{ flex: 1.2 }}
            >
              <Check size={14} />
              Confirm {inferredAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
