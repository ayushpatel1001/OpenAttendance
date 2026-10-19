// SheetPulse • Weekly Reporting & Night-Shift Pairing Engine
// 16-Hour Pairing Window • Overtime Multipliers • Missing-Punch Resolution

import { db } from './db';
import type { Shift, WeeklyRollupRow } from '../types';

/**
 * Computes ISO 8601 Week String (e.g. "2026-W42") from a Date object
 */
export function getIsoWeekString(d: Date): string {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${target.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Computes weekly rollup metrics for all employees implementing the 16-hour pairing algorithm
 */
export async function generateWeeklyReport(targetIsoWeek?: string): Promise<WeeklyRollupRow[]> {
  const employees = await db.employees.toArray();
  const shifts = await db.shifts.toArray();
  const shiftMap = new Map<string, Shift>(shifts.map(s => [s.shift_id, s]));

  const allLogs = await db.attendance_logs.toArray();

  // If no target week provided, default to current week
  const week = targetIsoWeek || getIsoWeekString(new Date());

  // Filter logs belonging to the target ISO week
  const weekLogs = allLogs.filter(log => {
    const logDate = new Date(log.iso_timestamp);
    return getIsoWeekString(logDate) === week;
  });

  const reportRows: WeeklyRollupRow[] = [];

  for (const emp of employees) {
    const empLogs = weekLogs
      .filter(l => l.emp_id === emp.emp_id)
      .sort((a, b) => new Date(a.iso_timestamp).getTime() - new Date(b.iso_timestamp).getTime());

    const shift = shiftMap.get(emp.shift_id);
    const standardDailyHours = shift?.min_full_day_hrs || 8.0;

    let daysPresentSet = new Set<string>();
    let totalWorkedMinutes = 0;
    let lateCount = 0;
    let missingOutPunches = 0;

    // 16-Hour Pairing Algorithm (Section 3.3.4 of PRD)
    let i = 0;
    while (i < empLogs.length) {
      const punch = empLogs[i];

      if (punch.action === 'IN') {
        daysPresentSet.add(punch.local_date);
        if (punch.late_mins > 0) {
          lateCount++;
        }

        // Look for matching OUT within 16 hours
        let paired = false;
        const punchTime = new Date(punch.iso_timestamp).getTime();

        for (let j = i + 1; j < empLogs.length; j++) {
          const nextPunch = empLogs[j];
          const nextTime = new Date(nextPunch.iso_timestamp).getTime();
          const diffHours = (nextTime - punchTime) / (3600 * 1000);

          if (diffHours > 16) {
            // Exceeded 16 hours window; stop searching
            break;
          }

          if (nextPunch.action === 'OUT') {
            // Successfully paired
            const durationMins = Math.floor((nextTime - punchTime) / (60 * 1000));
            totalWorkedMinutes += Math.max(0, durationMins);
            paired = true;
            i = j; // skip to after this OUT
            break;
          } else if (nextPunch.action === 'IN') {
            // Found another IN without an intervening OUT!
            break;
          }
        }

        if (!paired) {
          missingOutPunches++;
          // Credit standard shift hours with an administrative penalty flag
          totalWorkedMinutes += Math.floor(standardDailyHours * 60);
        }
      }

      i++;
    }

    const totalWorkedHours = totalWorkedMinutes / 60;
    const daysPresent = daysPresentSet.size;
    const standardTotalHours = daysPresent * standardDailyHours;

    const regularHours = Math.min(totalWorkedHours, standardTotalHours);
    const overtimeHours = Math.max(0, totalWorkedHours - standardTotalHours);

    // Compute estimated absent days (standard working week of 5-6 days)
    const workingDaysCount = shift?.working_days?.length || 5;
    const daysAbsent = Math.max(0, workingDaysCount - daysPresent);

    reportRows.push({
      iso_week: week,
      date_range: `Week of ${week}`,
      emp_id: emp.emp_id,
      full_name: emp.full_name,
      department: emp.department,
      days_present: daysPresent,
      days_absent: daysAbsent,
      total_regular_hrs: Number(regularHours.toFixed(1)),
      overtime_hrs: Number(overtimeHours.toFixed(1)),
      late_count: lateCount,
      missing_out_punches: missingOutPunches,
    });
  }

  return reportRows;
}

/**
 * Exports report rows to a clean CSV formatted string
 */
export function exportReportToCsv(rows: WeeklyRollupRow[]): string {
  const headers = [
    'ISO Week',
    'Employee ID',
    'Full Name',
    'Department',
    'Days Present',
    'Days Absent',
    'Regular Hours',
    'Overtime Hours',
    'Late Arrivals',
    'Missing OUT Punches',
  ];

  const lines = [headers.join(',')];

  for (const r of rows) {
    const line = [
      `"${r.iso_week}"`,
      `"${r.emp_id}"`,
      `"${r.full_name}"`,
      `"${r.department}"`,
      r.days_present,
      r.days_absent,
      r.total_regular_hrs,
      r.overtime_hrs,
      r.late_count,
      r.missing_out_punches,
    ];
    lines.push(line.join(','));
  }

  return lines.join('\n');
}
