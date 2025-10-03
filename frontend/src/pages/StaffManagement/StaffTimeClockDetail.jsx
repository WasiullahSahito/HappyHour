import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ClockIn from '../../components/ClockIn';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { format, parseISO } from 'date-fns';

const StaffTimeClockDetail = () => {
    const navigate = useNavigate();
    const { loggedInStaff, logout } = useStaffAuth();

    const [activeSheet, setActiveSheet] = useState(null);
    const [recentTimesheets, setRecentTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!loggedInStaff) return;
        setLoading(true);
        try {
            const [statusRes, timesheetsRes] = await Promise.all([
                axios.get(`/api/teams/${loggedInStaff.id}/status`),
                axios.get(`/api/teams/${loggedInStaff.id}/timesheets`)
            ]);
            setActiveSheet(statusRes.data);
            setRecentTimesheets(timesheetsRes.data);
        } catch (err) {
            console.error('Failed to fetch clock data.', err);
        } finally {
            setLoading(false);
        }
    }, [loggedInStaff]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (endpoint) => {
        try {
            await axios.post(endpoint, { team_id: loggedInStaff.id });
            fetchData();
        } catch (error) {
            alert('An error occurred: ' + (error.response?.data?.message || 'Please try again.'));
        }
    };

    const handleClockIn = () => handleAction('/api/timesheets/clock-in');
    const handleClockOut = () => handleAction('/api/timesheets/clock-out');
    const handleTakeBreak = () => handleAction('/api/timesheets/take-break');
    const handleEndBreak = () => handleAction('/api/timesheets/end-break');

    const handleSignOut = () => {
        logout();
        navigate('/staff/time-clock');
    };

    if (!loggedInStaff) {
        return <div className="time-clock-page"><p>Loading User...</p></div>;
    }

    return (
        <div className="time-clock-page">
            <div className="time-clock-dashboard">

                {/* --- NEW HEADER SECTION --- */}
                <header className="dashboard-header">
                    <div className="user-info">
                        <div className="avatar">{loggedInStaff.first_name.charAt(0)}</div>
                        <div>
                            <strong>{loggedInStaff.first_name} {loggedInStaff.last_name}</strong>
                            <small>{loggedInStaff.position} • {loggedInStaff.branch}</small>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="btn-sign-out">Sign Out</button>
                </header>

                {loading ? <p>Loading clock status...</p> : (
                    <ClockIn
                        user={loggedInStaff}
                        activeSheet={activeSheet}
                        onClockIn={handleClockIn}
                        onClockOut={handleClockOut}
                        onTakeBreak={handleTakeBreak}
                        onEndBreak={handleEndBreak}
                    />
                )}

                <div className="dashboard-card">
                    <h3>Today's Schedule</h3>
                    <p className="no-schedule-message" style={{ textAlign: 'center', color: '#6b7280', padding: '10px 0' }}>
                        You're not scheduled to work today.
                    </p>
                </div>

                <div className="dashboard-card">
                    <h3>Recent Activity</h3>
                    <div className="activity-log">
                        {loading ? (
                            <p>Loading activity...</p>
                        ) : recentTimesheets.length === 0 ? (
                            <p className="no-activity-message" style={{ textAlign: 'center', color: '#6b7280', padding: '10px 0' }}>No recent activity found.</p>
                        ) : (
                            recentTimesheets.map(sheet => {
                                const date = format(parseISO(sheet.clock_in), 'yyyy-MM-dd');
                                const startTime = format(parseISO(sheet.clock_in), 'HH:mm');
                                const endTime = sheet.clock_out ? format(parseISO(sheet.clock_out), 'HH:mm') : 'Active';
                                const statusText = sheet.status.replace('_', ' ');

                                return (
                                    <div className="activity-item" key={sheet.id}>
                                        <div>
                                            <p>{date}</p>
                                            <small>{startTime} - {endTime}</small>
                                        </div>
                                        <span className={`status-tag status-${sheet.status}`}>{statusText}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffTimeClockDetail;
