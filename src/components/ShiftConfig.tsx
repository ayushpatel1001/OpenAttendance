// SheetPulse • Shift & Grace Rules (Minimal & Editable)

import React, { useState } from 'react';
import { Plus, Check, X, Edit2, Trash2 } from 'lucide-react';
import type { Shift } from '../types';
import { db } from '../services/db';

interface ShiftConfigProps {
  shifts: Shift[];
  onRefreshShifts: () => void;
}

export const ShiftConfig: React.FC<ShiftConfigProps> = ({ shifts, onRefreshShifts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const [shiftId, setShiftId] = useState('');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [graceMins, setGraceMins] = useState(10);
  const [minHours, setMinHours] = useState(8.0);
  const [workingDaysStr, setWorkingDaysStr] = useState('MON,TUE,WED,THU,FRI');

  const openAddModal = () => {
    setEditingShift(null);
    setShiftId(`SH-${Date.now().toString().slice(-4)}`);
    setName('');
    setStartTime('09:00');
    setEndTime('18:00');
    setGraceMins(10);
    setMinHours(8.0);
    setWorkingDaysStr('MON,TUE,WED,THU,FRI');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Shift) => {
    setEditingShift(s);
    setShiftId(s.shift_id);
    setName(s.name);
    setStartTime(s.start_time);
    setEndTime(s.end_time);
    setGraceMins(s.grace_mins);
    setMinHours(s.min_full_day_hrs);
    setWorkingDaysStr(s.working_days.join(','));
    setIsModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newShift: Shift = {
      shift_id: shiftId.trim(),
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
  };

  const handleDeleteShift = async (id: string, shiftName: string) => {
    if (confirm(`Delete shift "${shiftName}"?`)) {
      await db.shifts.delete(id);
      onRefreshShifts();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              Shift Policies & Grace Rules
              <span className="status-pill pill-gray">{shifts.length} Configured</span>
            </div>
            <div className="card-subtitle-clean">
              Manage work hours, punctuality grace periods, and night-shift pairing parameters
            </div>
          </div>

          <button onClick={openAddModal} className="btn-modern btn-primary">
            <Plus size={14} />
            Create Shift
          </button>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Shift ID</th>
                <th>Name</th>
                <th>Hours</th>
                <th>Grace Window</th>
                <th>Daily Target</th>
                <th>Working Days</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.shift_id}>
                  <td>
                    <span className="status-pill pill-gray" style={{ fontFamily: 'var(--font-mono)' }}>
                      {s.shift_id}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{s.name}</strong>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                      {s.start_time} – {s.end_time}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill pill-amber">
                      {s.grace_mins} mins
                    </span>
                  </td>
                  <td>{s.min_full_day_hrs} hrs</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {s.working_days.map(d => (
                        <span key={d} className="status-pill pill-blue" style={{ fontSize: '10.5px', padding: '1px 5px' }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openEditModal(s)}
                        className="btn-modern btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteShift(s.shift_id, s.name)}
                        className="btn-modern btn-ghost"
                        style={{ padding: '4px 6px', color: 'var(--accent-red)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', margin: 0 }}>
                {editingShift ? `Edit Shift (${editingShift.shift_id})` : 'Create New Shift'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-modern btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveShift} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {!editingShift && (
                  <div>
                    <label className="clean-label">SHIFT IDENTIFIER</label>
                    <input
                      type="text"
                      required
                      value={shiftId}
                      onChange={e => setShiftId(e.target.value)}
                      placeholder="e.g. SH-EVENING"
                      className="clean-input"
                    />
                  </div>
                )}

                <div>
                  <label className="clean-label">SHIFT NAME *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. European Trading Session"
                    className="clean-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="clean-label">START TIME (24h)</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="clean-input"
                    />
                  </div>

                  <div>
                    <label className="clean-label">END TIME (24h)</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="clean-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="clean-label">GRACE PERIOD (MINUTES)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="60"
                      value={graceMins}
                      onChange={e => setGraceMins(Number(e.target.value))}
                      className="clean-input"
                    />
                  </div>

                  <div>
                    <label className="clean-label">FULL DAY TARGET (HOURS)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      value={minHours}
                      onChange={e => setMinHours(Number(e.target.value))}
                      className="clean-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="clean-label">WORKING DAYS (COMMA SEPARATED)</label>
                  <input
                    type="text"
                    value={workingDaysStr}
                    onChange={e => setWorkingDaysStr(e.target.value)}
                    placeholder="MON,TUE,WED,THU,FRI"
                    className="clean-input"
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-modern btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-modern btn-primary">
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
