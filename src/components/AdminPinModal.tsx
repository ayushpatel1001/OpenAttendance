// OpenAttendance • Admin PIN Keypad Modal
// Locks the admin panel on mobile and kiosks behind a 4-digit PIN

import React, { useState } from 'react';
import { Lock, X, Delete } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  correctPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  correctPin,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setTimeout(() => {
            onSuccess();
            setPin('');
          }, 150);
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 700);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '340px', textAlign: 'center', padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <button onClick={onClose} className="btn-modern btn-ghost" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            color: 'var(--text-primary)',
          }}
        >
          <Lock size={22} />
        </div>

        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0' }}>
          Admin Authentication
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Enter 4-digit PIN to access admin settings and roster
        </p>

        {/* 4 PIN Dots */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: 'var(--radius-full)',
                backgroundColor:
                  error
                    ? 'var(--accent-red)'
                    : idx < pin.length
                    ? 'var(--accent-primary)'
                    : 'var(--bg-subtle)',
                border: `2px solid ${
                  error
                    ? 'var(--accent-red)'
                    : idx < pin.length
                    ? 'var(--accent-primary)'
                    : 'var(--border-light)'
                }`,
                transition: 'all 0.15s ease',
                transform: error ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {error && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--accent-red)',
              fontWeight: 600,
              marginBottom: '14px',
            }}
          >
            Incorrect PIN. Please try again.
          </div>
        )}

        {/* Numeric Keypad for Mobile Touch */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            maxWidth: '260px',
            margin: '0 auto',
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="btn-modern btn-secondary"
              style={{
                height: '52px',
                fontSize: '18px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
              }}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPin('')}
            className="btn-modern btn-ghost"
            style={{ height: '52px', fontSize: '12px', color: 'var(--text-muted)' }}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="btn-modern btn-secondary"
            style={{
              height: '52px',
              fontSize: '18px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
            }}
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="btn-modern btn-ghost"
            style={{ height: '52px' }}
          >
            <Delete size={20} />
          </button>
        </div>

        <div style={{ marginTop: '18px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          Default PIN: <strong style={{ color: 'var(--text-primary)' }}>{correctPin}</strong>
        </div>
      </div>
    </div>
  );
};
