import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import AddTimeEntryForm from './AddTimeEntryForm'; // Assuming this component exists
import axios from 'axios';
import { differenceInHours, parseISO } from 'date-fns';

const Timesheets = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const fetchTeamMembers = async () => {
        setLoading(true);
        try {
            // The /api/teams endpoint should return team members with their timesheets eager-loaded
            const response = await axios.get('/api/teams');
            setTeamMembers(response.data);
        } catch (err) {
            setError('Failed to load team members and their timesheets.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    // --- CHANGE 1 OF 2: Calculation Logic ---
    // The calculation for `totalWeeklyPayroll` is replaced with a calculation
    // for `averageHourlyRate`.
    const paidMembers = teamMembers.filter(member => Number(member.hourly_rate) > 0);
    const totalRateSum = paidMembers.reduce((sum, member) => sum + Number(member.hourly_rate), 0);
    const averageHourlyRate = paidMembers.length > 0 ? totalRateSum / paidMembers.length : 0;


    const getTimesheetStats = (member) => {
        const timesheets = member.timesheets || [];
        if (!timesheets.length) {
            return { actualHours: 'No entries', totalPay: '$0.00', status: 'No Timesheet' };
        }

        const latest = timesheets[timesheets.length - 1]; // This logic might need refinement based on week
        const totalHours = timesheets.reduce((acc, sheet) => {
            if (sheet.clock_out && sheet.clock_in) {
                // Using difference in hours might not be precise, but it's okay for this summary
                return acc + differenceInHours(parseISO(sheet.clock_out), parseISO(sheet.clock_in));
            }
            return acc;
        }, 0);

        const hourlyRate = member.hourly_rate || 0;
        const totalPay = totalHours * hourlyRate;

        // Determine status: if any timesheet is active/on_break, show that. Otherwise, 'Submitted'.
        const activeSheet = timesheets.find(sheet => ['active', 'on_break'].includes(sheet.status));
        const status = activeSheet ? activeSheet.status.replace('_', ' ') : 'Submitted';

        return {
            actualHours: `${totalHours.toFixed(1)}h`,
            totalPay: `$${totalPay.toFixed(2)}`,
            status: status,
        };
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Timesheet Management</h3>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Time Entry</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#6c757d' }}>Total Staff</p>
                    <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{teamMembers.length}</p>
                </div>

                {/* --- CHANGE 2 OF 2: Display Logic --- */}
                {/* The card title and value are updated to show the new metric. */}
                <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#6c757d' }}>Average Hourly Rate</p>
                    <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                        ${averageHourlyRate.toFixed(2)}/hr
                    </p>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#6c757d' }}>Pending Applications</p>
                    <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>2</p>
                </div>
                <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#6c757d' }}>Pending Timesheets</p>
                    <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>1</p>
                </div>
            </div>

            <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '20px' }}>Weekly Timesheets</h4>
                {loading && <p>Loading timesheets...</p>}
                {error && <p className="error-message">{error}</p>}
                {!loading && !error && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Employee</th>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Scheduled Hours</th>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Actual Hours</th>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Total Pay</th>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Status</th>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.map(member => {
                                const stats = getTimesheetStats(member);
                                return (
                                    <tr key={member.id}>
                                        <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>
                                            <strong>{member.first_name} {member.last_name}</strong><br />
                                            <small style={{ color: '#6c757d' }}>{member.position}</small>
                                        </td>
                                        <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>40h</td>
                                        <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>{stats.actualHours}</td>
                                        <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>{stats.totalPay}</td>
                                        <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#d1fae5', color: '#065f46', fontSize: '0.8rem' }}>{stats.status}</span>
                                        </td>
                                        <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>
                                            <Link to={`/staff/time-clock/${member.id}`} style={{ color: '#0d6efd', textDecoration: 'none' }}>Clock In</Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Time Entry">
                <AddTimeEntryForm
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => {
                        fetchTeamMembers();
                        setIsModalOpen(false);
                    }}
                    teamMembers={teamMembers}
                />
            </Modal>
        </div>
    );
};

export default Timesheets;
