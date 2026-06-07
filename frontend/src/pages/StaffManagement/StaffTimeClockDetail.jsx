import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ClockIn from '../../components/ClockIn';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { format, differenceInMinutes } from 'date-fns';

const StaffTimeClockDetail = () => {
    const navigate = useNavigate();
    const { loggedInStaff, logout } = useStaffAuth();

    const [activeSheet, setActiveSheet] = useState(null);
    const [recentTimesheets, setRecentTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoClockoutNotice, setAutoClockoutNotice] = useState(false);

    // Ref to the setTimeout handle so we can cancel it if staff manually clocks out
    const autoClockoutTimerRef = useRef(null);

    // ── Schedule helpers ──────────────────────────────────────────────────────
    const getTodaySchedule = () => {
        if (!loggedInStaff?.schedule) return null;
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const daySchedule = loggedInStaff.schedule[days[new Date().getDay()]];
        if (daySchedule?.active) return daySchedule; // return full object {active, start, end}
        return null;
    };

    const todaySchedule = getTodaySchedule();
    const todayScheduleText = todaySchedule ? `${todaySchedule.start} - ${todaySchedule.end}` : null;

    // ── Date/time helpers (unchanged from your original) ─────────────────────
    const parseTime = (dateStr) => {
        if (!dateStr) return null;
        try {
            if (dateStr instanceof Date) return dateStr;
            if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
                return new Date(dateStr);
            }
            if (dateStr.includes(' ') && dateStr.includes(':')) {
                return new Date(dateStr.replace(' ', 'T') + 'Z');
            }
            return new Date(dateStr);
        } catch (e) {
            console.error('Error parsing date:', dateStr, e);
            return null;
        }
    };

    const formatTimeDisplay = (date) => {
        if (!date) return 'N/A';
        try {
            const d = typeof date === 'string' ? parseTime(date) : date;
            return d ? format(d, 'hh:mm a') : 'N/A';
        } catch (e) { return 'Invalid Time'; }
    };

    const formatDateDisplay = (date) => {
        if (!date) return 'N/A';
        try {
            const d = typeof date === 'string' ? parseTime(date) : date;
            return d ? format(d, 'MMM dd, yyyy') : 'N/A';
        } catch (e) { return 'Invalid Date'; }
    };

    // ── fetchData (unchanged structure from your original) ───────────────────
    const fetchData = useCallback(async () => {
        if (!loggedInStaff) return;
        setLoading(true);
        try {
            const [statusRes, timesheetsRes] = await Promise.all([
                axios.get(`/api/teams/${loggedInStaff.id}/status`),
                axios.get(`/api/teams/${loggedInStaff.id}/timesheets`)
            ]);

            setActiveSheet(statusRes.data);

            const allTimesheets = timesheetsRes.data || [];
            const clockInTimesheets = allTimesheets.filter(sheet => {
                if (sheet.entry_type === 'clock_in') return true;
                if (!sheet.entry_type && (!sheet.notes || !sheet.notes.toLowerCase().includes('manual entry'))) return true;
                return false;
            });

            const sorted = clockInTimesheets
                .sort((a, b) => parseTime(b.clock_in) - parseTime(a.clock_in))
                .slice(0, 10);

            setRecentTimesheets(sorted);
        } catch (err) {
            console.error('Failed to fetch clock data.', err);
        } finally {
            setLoading(false);
        }
    }, [loggedInStaff]);

    // ── scheduleAutoClockout ──────────────────────────────────────────────────
    // Given a "HH:MM" end time string, calculates exactly how many milliseconds
    // remain until that time today and fires a setTimeout.
    // When it fires → POST /api/timesheets/auto-clock-out → refresh UI.
    const scheduleAutoClockout = useCallback((scheduledEndStr) => {
        // Clear any previous timer
        if (autoClockoutTimerRef.current) {
            clearTimeout(autoClockoutTimerRef.current);
            autoClockoutTimerRef.current = null;
        }

        const [endHour, endMin] = scheduledEndStr.split(':').map(Number);
        const now = new Date();
        const shiftEndAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin, 0, 0);

        // ms until shift end — if already past, fire immediately (server handles it safely)
        const delay = Math.max(shiftEndAt.getTime() - now.getTime(), 0);

        console.log(
            `[AutoClockout] Shift ends at ${scheduledEndStr}. ` +
            `Timer set for ${Math.round(delay / 1000)}s from now.`
        );

        autoClockoutTimerRef.current = setTimeout(async () => {
            console.log(`[AutoClockout] Timer fired — calling auto-clock-out for ${scheduledEndStr}`);
            try {
                const res = await axios.post(
                    '/api/timesheets/auto-clock-out',
                    {
                        team_id: loggedInStaff.id,
                        scheduled_end: scheduledEndStr,
                    },
                    {
                        headers: { Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                    }
                );

                if (!res.data?.already_done) {
                    setAutoClockoutNotice(true);
                }
            } catch (err) {
                console.error('[AutoClockout] Request failed:', err);
            } finally {
                // Always refresh so the UI shows completed state
                fetchData();
            }
        }, delay);
    }, [loggedInStaff, fetchData]);

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (loggedInStaff?.status === 'active') {
            fetchData();
        } else if (loggedInStaff) {
            setLoading(false);
        }
    }, [fetchData, loggedInStaff]);

    // ── Arm / re-arm the auto-clockout timer whenever activeSheet changes ─────
    // Covers: page load while clocked in, clock-in action, break start/end.
    // Cancels: when activeSheet becomes null/completed (manual clock-out).
    useEffect(() => {
        if (autoClockoutTimerRef.current) {
            clearTimeout(autoClockoutTimerRef.current);
            autoClockoutTimerRef.current = null;
        }

        const isActive = activeSheet && ['active', 'on_break'].includes(activeSheet.status);
        if (isActive && todaySchedule?.end) {
            scheduleAutoClockout(todaySchedule.end);
        }

        return () => {
            if (autoClockoutTimerRef.current) {
                clearTimeout(autoClockoutTimerRef.current);
            }
        };
    }, [activeSheet, todaySchedule, scheduleAutoClockout]);

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleAction = async (endpoint) => {
        // Cancel the auto-clockout timer — staff is taking a manual action
        if (autoClockoutTimerRef.current) {
            clearTimeout(autoClockoutTimerRef.current);
            autoClockoutTimerRef.current = null;
        }
        setAutoClockoutNotice(false);
        try {
            await axios.post(
                endpoint,
                { team_id: loggedInStaff.id },
                { headers: { Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }
            );
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
        if (autoClockoutTimerRef.current) clearTimeout(autoClockoutTimerRef.current);
        logout();
        navigate('/staff/time-clock');
    };

    // ── Guards ────────────────────────────────────────────────────────────────
    if (!loggedInStaff) {
        return <div className="time-clock-page"><p>Loading User...</p></div>;
    }

    if (loggedInStaff.status !== 'active') {
        return (
            <div className="time-clock-page">
                <div className="time-clock-dashboard">
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
                    <div className="dashboard-card" style={{ textAlign: 'center' }}>
                        <h3>Account Inactive</h3>
                        <p style={{ color: '#6b7280', padding: '20px 0' }}>
                            Your account is currently inactive. Please contact a manager to reactivate it.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="time-clock-page">
            <div className="time-clock-dashboard">

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

                {/* Auto-clockout notice banner */}
                {autoClockoutNotice && (
                    <div style={{
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        marginBottom: '4px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.3rem' }}>⏰</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: '600', color: '#9a3412', fontSize: '0.9rem' }}>
                                    Your shift has ended — you've been automatically clocked out
                                </p>
                                <p style={{ margin: 0, color: '#c2410c', fontSize: '0.8rem', marginTop: '2px' }}>
                                    Clocked out at your scheduled end time ({todaySchedule?.end}).
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setAutoClockoutNotice(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412', fontSize: '1.2rem', lineHeight: 1, padding: '4px' }}
                        >
                            ✕
                        </button>
                    </div>
                )}

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

                {/* Today's Schedule */}
                <div className="dashboard-card">
                    <h3>Today's Schedule</h3>
                    {todayScheduleText ? (
                        <p style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary-blue)', margin: '10px 0' }}>
                            {todayScheduleText}
                        </p>
                    ) : (
                        <p className="no-schedule-message" style={{ textAlign: 'center', color: '#6b7280', padding: '10px 0' }}>
                            You're not scheduled to work today.
                        </p>
                    )}
                </div>

                {/* Recent Clock-In Activity */}
                <div className="dashboard-card">
                    <h3>Recent Clock-In Activity</h3>
                    <div className="activity-log">
                        {loading ? (
                            <p>Loading activity...</p>
                        ) : recentTimesheets.length === 0 ? (
                            <p className="no-activity-message" style={{ textAlign: 'center', color: '#6b7280', padding: '10px 0' }}>
                                No recent clock-in activity found.
                            </p>
                        ) : (
                            recentTimesheets.map(sheet => {
                                const date = formatDateDisplay(sheet.clock_in);
                                const startTime = formatTimeDisplay(sheet.clock_in);
                                const endTime = sheet.clock_out ? formatTimeDisplay(sheet.clock_out) : 'Active';
                                const statusText = sheet.status ? sheet.status.replace('_', ' ') : 'Completed';

                                let hoursWorked = null;
                                if (sheet.clock_out) {
                                    const mins = differenceInMinutes(parseTime(sheet.clock_out), parseTime(sheet.clock_in));
                                    hoursWorked = (mins / 60).toFixed(1);
                                }

                                return (
                                    <div className="activity-item" key={sheet.id}>
                                        <div>
                                            <p>
                                                <strong>{date}</strong>
                                                {sheet.auto_clocked_out && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '0.68rem',
                                                        background: '#fff7ed',
                                                        color: '#c2410c',
                                                        border: '1px solid #fed7aa',
                                                        borderRadius: '4px',
                                                        padding: '1px 6px',
                                                        verticalAlign: 'middle',
                                                    }}>
                                                        Auto clocked out
                                                    </span>
                                                )}
                                            </p>
                                            <small>
                                                {startTime} - {endTime}
                                                {hoursWorked && ` • ${hoursWorked}h`}
                                            </small>
                                            {sheet.break_start && (
                                                <small style={{ display: 'block', color: '#f97316', marginTop: '2px' }}>
                                                    Includes break time
                                                </small>
                                            )}
                                        </div>
                                        <span className={`status-tag status-${sheet.status || 'completed'}`}>
                                            {statusText}
                                        </span>
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
