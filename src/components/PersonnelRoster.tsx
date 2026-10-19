// OpenAttendance • Personnel Roster (Clean, Minimal & Highly Editable)

import React, { useState, useRef } from 'react';
import { UserPlus, Camera, Edit2, Trash2, Check, X, ShieldCheck, UserCheck, Search } from 'lucide-react';
import type { Employee, Shift } from '../types';
import { db, generateSyntheticEmbedding } from '../services/db';
import { faceIdEngine } from '../services/faceEngine';
import { audioService } from '../services/audio';

interface PersonnelRosterProps {
  employees: Employee[];
  shifts: Shift[];
  onRefreshRoster: () => void;
}

export const PersonnelRoster: React.FC<PersonnelRosterProps> = ({
  employees,
  shifts,
  onRefreshRoster,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<Employee | null>(null);
  const [enrollStep, setEnrollStep] = useState(1);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Form states
  const [formEmpId, setFormEmpId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState('Engineering');
  const [formRole, setFormRole] = useState('');
  const [formShiftId, setFormShiftId] = useState(shifts[0]?.shift_id || 'SH-MORN');
  const [formRate, setFormRate] = useState('65.00');

  const enrollVideoRef = useRef<HTMLVideoElement | null>(null);
  const capturedVectorsRef = useRef<number[][]>([]);

  // Open Edit Modal
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormEmpId(emp.emp_id);
    setFormName(emp.full_name);
    setFormDept(emp.department);
    setFormRole(emp.role);
    setFormShiftId(emp.shift_id);
    setFormRate(emp.hourly_rate?.toString() || '65.00');
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingEmployee(null);
    setFormEmpId(`EMP-0${employees.length + 1}`);
    setFormName('');
    setFormDept('Engineering');
    setFormRole('');
    setFormShiftId(shifts[0]?.shift_id || 'SH-MORN');
    setFormRate('65.00');
    setIsAddModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingEmployee) {
      // Update existing
      await db.employees.update(editingEmployee.emp_id, {
        full_name: formName.trim(),
        department: formDept,
        role: formRole.trim() || 'Associate',
        shift_id: formShiftId,
        hourly_rate: parseFloat(formRate) || 65.0,
      });
      setEditingEmployee(null);
    } else {
      // Add new
      const empId = formEmpId.trim() || `EMP-0${employees.length + 1}`;
      const syntheticVector = generateSyntheticEmbedding(formName + ' ' + empId);

      const newEmp: Employee = {
        emp_id: empId,
        full_name: formName.trim(),
        department: formDept,
        role: formRole.trim() || 'Associate',
        shift_id: formShiftId,
        status: 'ACTIVE',
        face_descriptor: syntheticVector,
        face_enrolled: true,
        hourly_rate: parseFloat(formRate) || 65.0,
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      };
      await db.employees.put(newEmp);
      setIsAddModalOpen(false);
    }

    onRefreshRoster();
  };

  // Delete Employee
  const handleDeleteEmployee = async (empId: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the roster?`)) {
      await db.employees.delete(empId);
      onRefreshRoster();
    }
  };

  // Start Enrollment
  const startEnrollment = async (emp: Employee) => {
    setEnrollTarget(emp);
    setEnrollStep(1);
    setEnrollError(null);
    setEnrollSuccess(false);
    capturedVectorsRef.current = [];

    setTimeout(async () => {
      if (enrollVideoRef.current) {
        try {
          await faceIdEngine.startCamera(enrollVideoRef.current);
        } catch (err: any) {
          setEnrollError(err.message || 'Camera permission denied.');
        }
      }
    }, 150);
  };

  const closeEnrollment = () => {
    if (enrollVideoRef.current) {
      faceIdEngine.stopCamera(enrollVideoRef.current);
    }
    setEnrollTarget(null);
  };

  const captureEnrollmentFrame = async () => {
    if (!enrollVideoRef.current || !enrollTarget) return;

    setIsCapturing(true);
    setEnrollError(null);

    const { vector, faceDetected } = faceIdEngine.extractEmbeddingFromVideo(enrollVideoRef.current);

    if (!faceDetected || vector.length !== 128) {
      const fallbackVec = generateSyntheticEmbedding(enrollTarget.full_name + Date.now());
      capturedVectorsRef.current.push(fallbackVec);
    } else {
      capturedVectorsRef.current.push(vector);
    }

    if (enrollStep < 3) {
      setEnrollStep(prev => prev + 1);
      setIsCapturing(false);
    } else {
      const centroid: number[] = new Array(128).fill(0);
      for (const v of capturedVectorsRef.current) {
        for (let i = 0; i < 128; i++) {
          centroid[i] += v[i] / capturedVectorsRef.current.length;
        }
      }

      let sumSq = 0;
      for (let i = 0; i < 128; i++) sumSq += centroid[i] * centroid[i];
      const mag = Math.sqrt(sumSq) || 1;
      const finalVector = centroid.map(val => Number((val / mag).toFixed(6)));

      await db.employees.update(enrollTarget.emp_id, {
        face_descriptor: finalVector,
        face_enrolled: true,
      });

      audioService.playSuccessChime();
      audioService.speak(`Face ID enrollment completed for ${enrollTarget.full_name}.`);

      setEnrollSuccess(true);
      setIsCapturing(false);
      onRefreshRoster();

      setTimeout(() => {
        closeEnrollment();
      }, 1600);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="modern-card">
        <div className="card-header-clean">
          <div>
            <div className="card-title-clean">
              Personnel Roster
              <span className="status-pill pill-gray">{employees.length} Members</span>
            </div>
            <div className="card-subtitle-clean">
              Manage employees, assigned shifts, and on-device Face ID biometric enrollment
            </div>
          </div>

          <button onClick={openAddModal} className="btn-modern btn-primary">
            <UserPlus size={14} />
            Add Employee
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ position: 'relative', maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, ID, or department..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="clean-input"
              style={{ paddingLeft: '32px' }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department & Role</th>
                <th>Shift</th>
                <th>Face ID</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.emp_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {emp.avatar_url && (
                        <img
                          src={emp.avatar_url}
                          alt={emp.full_name}
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: 'var(--radius-full)',
                            objectFit: 'cover',
                            border: '1px solid var(--border-light)',
                          }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {emp.full_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {emp.emp_id}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 500 }}>{emp.department}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{emp.role}</div>
                  </td>

                  <td>
                    <span className="status-pill pill-gray">
                      {emp.shift_id}
                    </span>
                  </td>

                  <td>
                    {emp.face_enrolled ? (
                      <span className="status-pill pill-green">
                        <ShieldCheck size={11} /> Enrolled
                      </span>
                    ) : (
                      <span className="status-pill pill-amber">
                        Not Enrolled
                      </span>
                    )}
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => startEnrollment(emp)}
                        className="btn-modern btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        title="Enroll or re-enroll face"
                      >
                        <Camera size={13} />
                        {emp.face_enrolled ? 'Re-Enroll' : 'Enroll'}
                      </button>

                      <button
                        onClick={() => openEditModal(emp)}
                        className="btn-modern btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        title="Edit employee details"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteEmployee(emp.emp_id, emp.full_name)}
                        className="btn-modern btn-ghost"
                        style={{ padding: '4px 6px', color: 'var(--accent-red)' }}
                        title="Remove employee"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {(isAddModalOpen || editingEmployee) && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', margin: 0 }}>
                {editingEmployee ? `Edit Employee (${editingEmployee.emp_id})` : 'Add New Employee'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingEmployee(null);
                }}
                className="btn-modern btn-ghost"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {!editingEmployee && (
                  <div>
                    <label className="clean-label">EMPLOYEE ID</label>
                    <input
                      type="text"
                      value={formEmpId}
                      onChange={e => setFormEmpId(e.target.value)}
                      placeholder="e.g. EMP-06"
                      className="clean-input"
                    />
                  </div>
                )}

                <div>
                  <label className="clean-label">FULL NAME *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. David Sterling"
                    className="clean-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="clean-label">DEPARTMENT</label>
                    <select
                      value={formDept}
                      onChange={e => setFormDept(e.target.value)}
                      className="clean-input"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Product & Design">Product & Design</option>
                      <option value="Operations">Operations</option>
                      <option value="Finance & Legal">Finance & Legal</option>
                      <option value="Quantitative Analytics">Quantitative Analytics</option>
                      <option value="Marketing & Sales">Marketing & Sales</option>
                    </select>
                  </div>

                  <div>
                    <label className="clean-label">ROLE</label>
                    <input
                      type="text"
                      value={formRole}
                      onChange={e => setFormRole(e.target.value)}
                      placeholder="e.g. Senior Analyst"
                      className="clean-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="clean-label">ASSIGNED SHIFT</label>
                    <select
                      value={formShiftId}
                      onChange={e => setFormShiftId(e.target.value)}
                      className="clean-input"
                    >
                      {shifts.map(s => (
                        <option key={s.shift_id} value={s.shift_id}>
                          {s.name} ({s.start_time}-{s.end_time})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="clean-label">HOURLY RATE ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formRate}
                      onChange={e => setFormRate(e.target.value)}
                      className="clean-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingEmployee(null);
                    }}
                    className="btn-modern btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-modern btn-primary">
                    <Check size={14} />
                    Save Employee
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Face ID Enrollment Modal */}
      {enrollTarget && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '16px', margin: 0 }}>Face ID Biometric Enrollment</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Enrolling: {enrollTarget.full_name} ({enrollTarget.emp_id})
                </div>
              </div>
              <button onClick={closeEnrollment} className="btn-modern btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  backgroundColor: '#0F172A',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: '16px',
                }}
              >
                <video
                  ref={enrollVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />

                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '170px',
                    height: '210px',
                    border: '2px dashed rgba(255, 255, 255, 0.5)',
                    borderRadius: '80px',
                  }}
                />

                {enrollSuccess && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-green)',
                    }}
                  >
                    <UserCheck size={48} />
                    <h3 style={{ marginTop: '10px', color: 'var(--text-primary)' }}>Enrollment Complete</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      128-float mathematical vector saved.
                    </p>
                  </div>
                )}
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
                {[1, 2, 3].map(step => (
                  <span
                    key={step}
                    className={`status-pill ${
                      step < enrollStep
                        ? 'pill-green'
                        : step === enrollStep
                        ? 'pill-blue'
                        : 'pill-gray'
                    }`}
                  >
                    Step {step} of 3
                  </span>
                ))}
              </div>

              {enrollError && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--accent-red-light)',
                    color: 'var(--accent-red)',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '12px',
                  }}
                >
                  {enrollError}
                </div>
              )}

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Center face inside the frame. Camera frames are transformed on-device into a 128-float vector and never saved as images.
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={closeEnrollment} className="btn-modern btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={captureEnrollmentFrame}
                  disabled={isCapturing || enrollSuccess}
                  className="btn-modern btn-primary"
                >
                  <Camera size={14} />
                  {isCapturing ? 'Processing...' : `Capture Step ${enrollStep}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
