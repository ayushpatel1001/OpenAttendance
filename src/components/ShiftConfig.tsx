// Shift Rules & Grace Period Configuration

import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import type { Shift } from '../types';
import { db } from '../services/db';

interface ShiftConfigProps {
  shifts: Shift[];
  onRefreshShifts: () => void;
}

export const ShiftConfig: React.FC<ShiftConfigProps> = ({ shifts, onRefreshShifts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftId, setShiftId] = useState('');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [graceMins, setGraceMins] = useState(10);
  const [minHours, setMinHours] = useState(8.0);
  const [workingDaysStr, setWorkingDaysStr] = useState('MON,TUE,WED,THU,FRI');

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: Shift = {
      shift_id: shiftId.trim() || `SH-CUSTOM-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      start_time: startTime,
      end_time: endTime,
      grace_mins: Number(graceMins),
      min_full_day_hrs: Number(minHours),
      working_days: workingDaysStr.split(',').map(s => s.trim().toUpperCase()),
    };

    await db.shifts.put(newShift);
    onRefreshShifts();
    setIsModalOpen(false);
    setName('');
    setShiftId('');
  };

  return (
    <div className="ft-card ft-card-editorial">
      <div className="ft-card-header">
        <div>
          <div className="ft-card-title">
            <span>SHIFT POLICIES & GRACE PERIOD RULES</span>
            <span className="badge-ft badge-ft-dark">{shifts.length} CONFIGURED</span>
          </div>
          <div className="ft-card-subtitle">
            Controls punctuality thresholds, late flags, and night shift 16-hour pairing logic
          </div>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn-ft btn-ft-primary" style={{ fontSize: '12.5px' }}>
          <Plus size={14} />
          Create Shift Policy
        </button>
      </div>

      <div className="ft-table-wrapper" style={{ border: 'none' }}>
        <table className="ft-table">
          <thead>
            <tr>
              <th>SHIFT ID</th>
              <th>POLICY NAME</th>
              <th>SCHEDULED HOURS</th>
              <th>GRACE PERIOD</th>
              <th>FULL DAY TARGET</th>
              <th>WORKING DAYS</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map(s => (
              <tr key={s.shift_id}>
                <td>
                  <span className="badge-ft badge-ft-dark">{s.shift_id}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-serif-headline)', fontSize: '14.5px' }}>
                    {s.name}
                  </div>
                </td>
                <td>
                  <div style={{ fontFamily: 'var(--font-mono-ledger)', fontWeight: 600 }}>
                    {s.start_time} — {s.end_time}
                  </div>
                </td>
                <td>
                  <span className="badge-ft badge-ft-amber">
                    {s.grace_mins} MINUTES
                  </span>
                </td>
                <td>
                  <div style={{ fontFamily: 'var(--font-mono-ledger)' }}>{s.min_full_day_hrs} hrs</div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {s.working_days.map(d => (
                      <span key={d} className="badge-ft badge-ft-blue" style={{ fontSize: '10px' }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Shift Modal */}
      {isModalOpen && (
        <div className="ft-modal-overlay">
          <div className="ft-modal-content" style={{ maxWidth: '480px' }}>
            <div className="ft-modal-header">
              <h3 style={{ fontSize: '18px', margin: 0 }}>Create Shift Policy</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-ft btn-ft-subtle" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="ft-card-body" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    SHIFT ID (e.g. SH-EVENING)
                  </label>
                  <input
                    type="text"
                    required
                    value={shiftId}
                    onChange={e => setShiftId(e.target.value)}
                    placeholder="SH-EVENING"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--ft-border-rule)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono-ledger)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    SHIFT NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. European Trading Session"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--ft-border-rule)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      START TIME (24h)
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid var(--ft-border-rule)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono-ledger)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      END TIME (24h)
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid var(--ft-border-rule)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono-ledger)',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      GRACE WINDOW (MINS)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="60"
                      value={graceMins}
                      onChange={e => setGraceMins(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid var(--ft-border-rule)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono-ledger)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      FULL DAY QUOTA (HRS)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      value={minHours}
                      onChange={e => setMinHours(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid var(--ft-border-rule)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono-ledger)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    WORKING DAYS (comma separated)
                  </label>
                  <input
                    type="text"
                    value={workingDaysStr}
                    onChange={e => setWorkingDaysStr(e.target.value)}
                    placeholder="MON,TUE,WED,THU,FRI"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--ft-border-rule)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono-ledger)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ft btn-ft-outline" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-ft btn-ft-primary" style={{ flex: 1.5 }}>
                    <Check size={14} />
                    Save Shift
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
