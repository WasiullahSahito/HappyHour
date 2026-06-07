import React from 'react';
import Modal from '../../components/Modal';
import { format, addDays } from 'date-fns';

const RosterPDFModal = ({ isOpen, onClose, currentWeekStart, teamMembers, shifts, prepAreas }) => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const generatedAt = format(new Date(), 'M/d/yyyy, h:mm:ss a');

    const handlePrint = () => {
        const printContent = document.getElementById('printable-roster-area').innerHTML;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Staff Roster</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: white;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .roster-pdf-container {
                        padding: 10px;
                        background: #fff;
                    }
                    .roster-pdf-header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #1e293b;
                        padding-bottom: 20px;
                    }
                    .roster-pdf-header h1 {
                        font-size: 2.2rem;
                        font-weight: 800;
                        color: #1e293b;
                        margin: 0 0 10px 0;
                        letter-spacing: 1px;
                    }
                    .roster-pdf-header .week-info {
                        color: #64748b;
                        font-size: 1rem;
                        margin: 5px 0;
                    }
                    .roster-pdf-header .location {
                        font-weight: 600;
                        color: #64748b;
                        font-size: 0.9rem;
                    }
                    .roster-pdf-table {
                        width: 100%;
                        border-collapse: collapse;
                        border: 2px solid #e2e8f0;
                        table-layout: fixed;
                    }
                    .roster-pdf-table th {
                        background: #f8f9fa !important;
                        padding: 12px 6px;
                        border: 1px solid #e2e8f0;
                        color: #475569;
                        font-size: 0.75rem;
                        text-align: center;
                        font-weight: 700;
                    }
                    .roster-pdf-table th.prep-area-col {
                        text-align: left;
                        width: 120px;
                        background: #1e293b !important;
                        color: white !important;
                    }
                    .roster-pdf-table td {
                        padding: 8px 4px;
                        border: 1px solid #e2e8f0;
                        text-align: center;
                        vertical-align: top;
                        min-height: 60px;
                        font-size: 0.7rem;
                    }
                    .roster-pdf-table td.prep-area-col {
                        text-align: left;
                        font-weight: 700;
                        color: #1e293b;
                        background: #f1f5f9 !important;
                    }
                    .staff-assignment {
                        padding: 4px 6px;
                        margin: 2px 0;
                        background: #f0fdf4 !important;
                        border: 1px solid #bbf7d0;
                        border-radius: 3px;
                    }
                    .staff-name {
                        font-weight: 700;
                        color: #166534;
                        display: block;
                        font-size: 0.75rem;
                        margin-bottom: 2px;
                    }
                    .staff-time {
                        color: #15803d;
                        font-size: 0.65rem;
                        font-weight: 600;
                    }
                    .staff-hours {
                        color: #166534;
                        font-size: 0.6rem;
                        margin-top: 1px;
                    }
                    .empty-cell {
                        color: #cbd5e1;
                        font-size: 0.8rem;
                        padding: 20px 10px;
                    }
                    .roster-pdf-footer {
                        margin-top: 30px;
                        text-align: center;
                        color: #94a3b8;
                        font-size: 0.7rem;
                        border-top: 2px solid #e2e8f0;
                        padding-top: 20px;
                    }
                    .print-actions-container {
                        display: none !important;
                    }
                    .day-header {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .day-label {
                        font-size: 0.7rem;
                        font-weight: 600;
                        color: #475569;
                    }
                    .day-date {
                        font-size: 0.8rem;
                        font-weight: 800;
                        color: #1e293b;
                    }
                    @media print {
                        @page {
                            size: landscape;
                            margin: 1cm;
                        }
                        body {
                            padding: 0 !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    // Get all shifts for a specific prep area on a specific day
    const getShiftsForCell = (prepAreaId, day) => {
        return shifts.filter(shift => shift.prep_area_id === prepAreaId && shift.day === day);
    };

    // Get staff member by ID
    const getStaffById = (staffId) => {
        return teamMembers.find(m => m.id === staffId);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Weekly Roster - ${format(currentWeekStart, 'dd MMM')}`}
            modalClass="modal-xl"
        >
            <style>{`
                .roster-pdf-container {
                    padding: 24px;
                    background: #fff;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                .roster-pdf-header {
                    text-align: center;
                    margin-bottom: 40px;
                    border-bottom: 3px solid #1e293b;
                    padding-bottom: 24px;
                }
                .roster-pdf-header h1 {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0 0 12px 0;
                    letter-spacing: 1px;
                }
                .roster-pdf-header .week-info {
                    color: #64748b;
                    font-size: 1.125rem;
                    margin: 8px 0;
                }
                .roster-pdf-header .location {
                    font-weight: 600;
                    color: #64748b;
                    font-size: 1rem;
                }

                .roster-pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 2px solid #e2e8f0;
                }
                .roster-pdf-table th {
                    background: #f8f9fa;
                    padding: 14px 8px;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                    font-size: 0.8rem;
                    font-weight: 700;
                }
                .roster-pdf-table th.prep-area-col {
                    text-align: left;
                    min-width: 140px;
                    background: #1e293b;
                    color: white;
                }
                .roster-pdf-table td {
                    padding: 10px 6px;
                    border: 1px solid #e2e8f0;
                    text-align: center;
                    vertical-align: top;
                }
                .roster-pdf-table td.prep-area-col {
                    text-align: left;
                    font-weight: 700;
                    color: #1e293b;
                    background: #f1f5f9;
                }

                .staff-assignment {
                    padding: 6px 8px;
                    margin: 4px 0;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 4px;
                    text-align: left;
                }
                .staff-name {
                    font-weight: 700;
                    color: #166534;
                    display: block;
                    font-size: 0.8rem;
                    margin-bottom: 3px;
                }
                .staff-time {
                    color: #15803d;
                    font-size: 0.7rem;
                    font-weight: 600;
                }
                .staff-hours {
                    color: #166534;
                    font-size: 0.65rem;
                    margin-top: 2px;
                }
                .empty-cell {
                    color: #cbd5e1;
                    font-size: 0.9rem;
                    padding: 30px 10px;
                }

                .roster-pdf-footer {
                    margin-top: 40px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 0.8rem;
                    border-top: 2px solid #e2e8f0;
                    padding-top: 24px;
                }

                .print-button {
                    background-color: #22c55e !important;
                    border-color: #22c55e !important;
                    color: #fff !important;
                    font-weight: bold !important;
                }

                .day-header {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .day-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #475569;
                }
                .day-date {
                    font-size: 0.875rem;
                    font-weight: 800;
                    color: #1e293b;
                }
            `}</style>

            <div id="printable-roster-area" className="roster-pdf-container">
                <div className="roster-pdf-header">
                    <h1>WEEKLY STAFF ROSTER</h1>
                    <div className="week-info">
                        Week of {format(currentWeekStart, 'dd MMM')} – {format(addDays(currentWeekStart, 6), 'dd MMM yyyy')}
                    </div>
                    <div className="location">Main Location</div>
                </div>

                <table className="roster-pdf-table">
                    <thead>
                        <tr>
                            <th className="prep-area-col">Prep Area</th>
                            {days.map((day, index) => (
                                <th key={day}>
                                    <div className="day-header">
                                        <div className="day-label">{day}</div>
                                        <div className="day-date">
                                            {format(addDays(currentWeekStart, index), 'dd MMM')}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {prepAreas.map(area => (
                            <tr key={area.id}>
                                <td className="prep-area-col">{area.name}</td>
                                {days.map(day => {
                                    const assignments = getShiftsForCell(area.id, day);

                                    return (
                                        <td key={day}>
                                            {assignments.length > 0 ? (
                                                assignments.map(shift => {
                                                    const staff = getStaffById(shift.staff_id);
                                                    if (!staff) return null;

                                                    return (
                                                        <div key={shift.id} className="staff-assignment">
                                                            <div className="staff-name">
                                                                {staff.first_name} {staff.last_name}
                                                            </div>
                                                            <div className="staff-time">
                                                                {shift.start_time} - {shift.end_time}
                                                            </div>
                                                            <div className="staff-hours">
                                                                {shift.hours}h ({shift.break_minutes}m break)
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-cell">—</div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="roster-pdf-footer">
                    <p style={{ marginBottom: '8px', fontWeight: 600 }}>
                        Generated on {generatedAt}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>
                        This roster shows all staff assignments by prep area and day.<br />
                        Individual shift times and break periods are displayed for each assignment.
                    </p>
                </div>

                <div className="print-actions-container" style={{
                    marginTop: '40px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    paddingTop: '24px',
                    borderTop: '1px solid #e5e7eb'
                }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        style={{ padding: '10px 25px' }}
                    >
                        Close
                    </button>
                    <button
                        className="btn btn-primary print-button"
                        onClick={handlePrint}
                        style={{ padding: '10px 25px' }}
                    >
                        Print PDF
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default RosterPDFModal;
