import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import AddTimeEntryForm from './AddTimeEntryForm';
import EditTimeEntryForm from './EditTimeEntryForm';
import axios from 'axios';
import {
    differenceInMinutes,
    parseISO,
    format,
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    isAfter,
    isBefore,
    eachDayOfInterval,
    isSameDay,
    parse
} from 'date-fns';
import { toast } from 'react-hot-toast';

const Timesheets = () => {
    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Set axios default header with timezone
    useEffect(() => {
        axios.defaults.headers.common['Timezone'] = userTimezone;
    }, [userTimezone]);

    // --- IMPROVED TIME PARSER ---
    const parseTime = (dateStr) => {
        if (!dateStr) return null;

        try {
            // If it's already a Date object
            if (dateStr instanceof Date) return dateStr;

            // If it's an ISO string or has timezone info
            if (dateStr.includes('T') || dateStr.includes('Z') || dateStr.includes('+')) {
                return new Date(dateStr);
            }

            // If it's a database string like "2026-01-26 03:22:00"
            if (dateStr.includes(' ') && dateStr.includes(':')) {
                const utcStr = dateStr.replace(' ', 'T') + 'Z';
                return new Date(utcStr);
            }

            // Fallback
            return new Date(dateStr);
        } catch (error) {
            console.error('Error parsing date:', dateStr, error);
            return null;
        }
    };

    // --- FORMAT TIME IN USER'S TIMEZONE ---
    const formatTimeDisplay = (date, showSeconds = false) => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? parseTime(date) : date;
            if (!dateObj) return 'N/A';
            return dateObj.toLocaleTimeString('en-US', {
                timeZone: userTimezone,
                hour12: true,
                hour: 'numeric',
                minute: '2-digit',
                second: showSeconds ? '2-digit' : undefined
            });
        } catch (error) {
            console.error('Error formatting date:', date, error);
            return 'Invalid Time';
        }
    };

    // --- FORMAT DATE IN USER'S TIMEZONE ---
    const formatDateDisplay = (date) => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? parseTime(date) : date;
            if (!dateObj) return 'N/A';
            return dateObj.toLocaleDateString('en-US', {
                timeZone: userTimezone,
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', date, error);
            return 'Invalid Date';
        }
    };

    // --- STATE ---
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [editingEntry, setEditingEntry] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weeklySchedules, setWeeklySchedules] = useState({});
    // 🆕 State for the weekly resource plan (contains hourly_rate, labor_target, etc.)
    const [resourcePlan, setResourcePlan] = useState(null);
    // 🆕 Loading state for resource plan
    const [planLoading, setPlanLoading] = useState(false);

    // --- FETCH RESOURCE PLAN FOR CURRENT WEEK --- 🆕
    const fetchResourcePlanForWeek = async (weekStart) => {
        setPlanLoading(true);
        try {
            const weekStartStr = format(weekStart, 'yyyy-MM-dd');
            const response = await axios.get('/api/resource-plans', {
                params: { week_start: weekStartStr }
            });
            setResourcePlan(response.data.plan);
        } catch (error) {
            // If 404 (no plan), just set to null – no error toast needed
            if (error.response?.status !== 404) {
                console.error('Failed to fetch resource plan:', error);
            }
            setResourcePlan(null);
        } finally {
            setPlanLoading(false);
        }
    };

    // Fetch team members and their weekly schedules
    const fetchTeamMembers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/teams');
            const members = response.data;
            setTeamMembers(members);
            await fetchWeeklySchedulesForCurrentWeek(members);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load team members.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch weekly schedule for a specific staff member and week
    const fetchStaffScheduleForWeek = async (staffId, weekStartDate) => {
        try {
            const response = await axios.get(`/api/teams/${staffId}/schedule`, {
                params: { date: format(weekStartDate, 'yyyy-MM-dd') }
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch schedule for staff ${staffId}:`, error);
            return null;
        }
    };

    // Fetch weekly schedules for all team members for current week
    const fetchWeeklySchedulesForCurrentWeek = async (members) => {
        const schedules = {};
        const promises = members.map(async (member) => {
            const scheduleData = await fetchStaffScheduleForWeek(member.id, currentWeekStart);
            schedules[member.id] = scheduleData;
        });
        await Promise.all(promises);
        setWeeklySchedules(schedules);
    };

    // Initial data load and when week changes
    useEffect(() => {
        fetchTeamMembers();
        fetchResourcePlanForWeek(currentWeekStart); // 🆕 fetch plan for this week
    }, [currentWeekStart]);

    // --- NAVIGATION LOGIC ---
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const todayStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const minWeekLimit = subWeeks(todayStart, 6);

    const handlePrevWeek = () => {
        const prev = subWeeks(currentWeekStart, 1);
        if (!isBefore(prev, minWeekLimit)) {
            setCurrentWeekStart(prev);
        } else {
            toast.error("You can only view up to 6 weeks in the past.");
        }
    };

    const handleNextWeek = () => {
        const next = addWeeks(currentWeekStart, 1);
        if (!isAfter(next, todayStart)) {
            setCurrentWeekStart(next);
        } else {
            toast.error("Cannot toggle to future weeks.");
        }
    };

    // --- CALCULATIONS ---
    const calculateScheduledHoursForWeek = (memberId) => {
        const scheduleData = weeklySchedules[memberId];

        if (!scheduleData) {
            const member = teamMembers.find(m => m.id === memberId);
            if (!member || !member.schedule) return '0h';
            return calculateScheduledHoursFromSchedule(member.schedule);
        }

        const schedule = scheduleData.specific || scheduleData.regular;
        if (!schedule) return '0h';

        return calculateScheduledHoursFromSchedule(schedule);
    };

    const calculateScheduledHoursFromSchedule = (schedule) => {
        if (!schedule || typeof schedule !== 'object') return '0h';

        let totalMinutes = 0;
        Object.values(schedule).forEach(day => {
            if (day.active && day.start && day.end) {
                try {
                    const startTime = parse(day.start, 'HH:mm', new Date());
                    const endTime = parse(day.end, 'HH:mm', new Date());
                    const diff = differenceInMinutes(endTime, startTime);
                    if (diff > 0) totalMinutes += diff;
                } catch (error) {
                    console.error('Error calculating schedule hours:', error);
                }
            }
        });
        return `${(totalMinutes / 60).toFixed(1)}h`;
    };

    const getScheduledHoursForDay = (memberId, day) => {
        const scheduleData = weeklySchedules[memberId];

        if (scheduleData) {
            const schedule = scheduleData.specific || scheduleData.regular;
            if (schedule && typeof schedule === 'object') {
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const dayName = dayNames[day.getDay()];
                const daySchedule = schedule[dayName];
                if (daySchedule && daySchedule.active && daySchedule.start && daySchedule.end) {
                    try {
                        const startTime = parse(daySchedule.start, 'HH:mm', new Date());
                        const endTime = parse(daySchedule.end, 'HH:mm', new Date());
                        const diff = differenceInMinutes(endTime, startTime);
                        if (diff > 0) return `${(diff / 60).toFixed(1)}h`;
                    } catch (error) {
                        console.error('Error calculating day schedule hours:', error);
                    }
                }
            }
        }

        const member = teamMembers.find(m => m.id === memberId);
        if (!member || !member.schedule) return '0h';

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[day.getDay()];
        const daySchedule = member.schedule[dayName];

        if (daySchedule && daySchedule.active && daySchedule.start && daySchedule.end) {
            try {
                const startTime = parse(daySchedule.start, 'HH:mm', new Date());
                const endTime = parse(daySchedule.end, 'HH:mm', new Date());
                const diff = differenceInMinutes(endTime, startTime);
                if (diff > 0) return `${(diff / 60).toFixed(1)}h`;
            } catch (error) {
                console.error('Error calculating day schedule hours:', error);
            }
        }

        return '0h';
    };

    const getTimesheetStats = (member) => {
        const allTimesheets = member.timesheets || [];

        const weeklySheets = allTimesheets.filter(t => {
            if (!t.clock_in) return false;
            const clockInDate = parseTime(t.clock_in);
            return clockInDate >= currentWeekStart && clockInDate <= weekEnd;
        });

        const totalMinutes = weeklySheets.reduce((acc, sheet) => {
            if (sheet.clock_out && sheet.clock_in) {
                const start = parseTime(sheet.clock_in);
                const end = parseTime(sheet.clock_out);
                return acc + Math.max(0, differenceInMinutes(end, start));
            }
            return acc;
        }, 0);

        const totalHours = totalMinutes / 60;
        const hourlyRate = Number(member.hourly_rate) || 0;

        const manualEntries = weeklySheets.filter(t =>
            t.entry_type === 'manual' ||
            (t.notes && t.notes.includes('Manual')) ||
            (t.notes && t.status === 'completed' && !t.entry_type)
        ).length;

        const clockInEntries = weeklySheets.filter(t =>
            t.entry_type === 'clock_in' ||
            (!t.notes && t.status === 'completed') ||
            (t.notes && !t.notes.includes('Manual') && t.status === 'completed')
        ).length;

        const activeSheet = weeklySheets.find(sheet => ['active', 'on_break'].includes(sheet.status));
        const status = activeSheet ? activeSheet.status.replace('_', ' ') : 'Completed';

        return {
            actualHours: totalHours,
            totalPay: totalHours * hourlyRate,
            status: status,
            clockInEntries,
            manualEntries,
            weeklySheets
        };
    };

    const getEntryType = (entry) => {
        if (entry.entry_type === 'manual' ||
            (entry.notes && entry.notes.includes('Manual')) ||
            (entry.notes && entry.status === 'completed' && !entry.entry_type)) {
            return 'manual';
        }
        return 'clock_in';
    };

    const paidMembers = teamMembers.filter(member => Number(member.hourly_rate) > 0);
    const totalRateSum = paidMembers.reduce((sum, member) => sum + Number(member.hourly_rate), 0);
    const averageHourlyRateFromStaff = paidMembers.length > 0 ? totalRateSum / paidMembers.length : 0; // fallback

    const pendingApplications = teamMembers.filter(member => member.status === 'inactive').length;
    const pendingTimesheets = teamMembers.reduce((count, member) => {
        const activeSheets = member.timesheets?.filter(t => t.status === 'active' || t.status === 'on_break').length || 0;
        return count + activeSheets;
    }, 0);

    const selectedMember = teamMembers.find(m => m.id === selectedMemberId);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Timesheet Management</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Time Entry</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '30px', borderBottom: '1px solid #dee2e6', marginBottom: '25px' }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        padding: '10px 5px', border: 'none', background: 'none', cursor: 'pointer',
                        color: activeTab === 'overview' ? '#007bff' : '#6c757d',
                        borderBottom: activeTab === 'overview' ? '2px solid #007bff' : 'none',
                        fontWeight: '600'
                    }}
                >Weekly Overview</button>
                <button
                    onClick={() => setActiveTab('details')}
                    style={{
                        padding: '10px 5px', border: 'none', background: 'none', cursor: 'pointer',
                        color: activeTab === 'details' ? '#007bff' : '#6c757d',
                        borderBottom: activeTab === 'details' ? '2px solid #007bff' : 'none',
                        fontWeight: '600'
                    }}
                >Staff Details</button>
            </div>

            {activeTab === 'overview' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div className="card" style={{ padding: '20px' }}>
                            <p style={{ margin: 0, color: '#6c757d' }}>Total Staff</p>
                            <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{teamMembers.length}</p>
                        </div>
                        <div className="card" style={{ padding: '20px' }}>
                            <p style={{ margin: 0, color: '#6c757d' }}>Average Hourly Rate</p>
                            <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                                {planLoading ? (
                                    <span style={{ fontSize: '1rem', color: '#999' }}>Loading...</span>
                                ) : resourcePlan?.hourly_rate ? (
                                    `$${Number(resourcePlan.hourly_rate).toFixed(2)}/hr`
                                ) : (
                                    `$${averageHourlyRateFromStaff.toFixed(2)}/hr*`
                                )}
                            </p>
                            {!resourcePlan && !planLoading && (
                                <small style={{ color: '#f39c12', fontSize: '0.75rem' }}>
                                    * No plan – using staff average
                                </small>
                            )}
                        </div>
                        <div className="card" style={{ padding: '20px' }}>
                            <p style={{ margin: 0, color: '#6c757d' }}>Pending Approvals</p>
                            <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--orange)' }}>{pendingApplications}</p>
                        </div>
                        <div className="card" style={{ padding: '20px' }}>
                            <p style={{ margin: 0, color: '#6c757d' }}>Active Shifts (Pending)</p>
                            <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{pendingTimesheets}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                        <button onClick={handlePrevWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&lsaquo;</button>
                        <span style={{ fontWeight: 'bold' }}>Week of {format(currentWeekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM')}</span>
                        <button onClick={handleNextWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&rsaquo;</button>
                    </div>

                    <div className="card" style={{ padding: '20px' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '20px' }}>Weekly Timesheets</h4>

                        {loading ? <p>Loading...</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                                        <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Employee</th>
                                        <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Scheduled Hours</th>
                                        <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Actual Hours</th>
                                        <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Total Pay</th>
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
                                                <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>{calculateScheduledHoursForWeek(member.id)}</td>
                                                <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>{stats.actualHours.toFixed(1)}h</td>
                                                <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>${stats.totalPay.toFixed(2)}</td>
                                                <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>
                                                    <button onClick={() => { setSelectedMemberId(member.id); setActiveTab('details'); }} className="btn-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007bff', fontWeight: '500' }}>View Details</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'details' && (
                <div>
                    {!selectedMember ? (
                        <div style={{ padding: '50px', textAlign: 'center', color: '#6c757d' }}>Select a staff member from the overview</div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>{selectedMember.first_name} {selectedMember.last_name}</h3>
                                <p style={{ color: '#6c757d', margin: '5px 0' }}>{selectedMember.position} • ${selectedMember.hourly_rate}/hr</p>
                                <div style={{ fontSize: '0.9rem', marginTop: '10px', color: '#666' }}>
                                    Scheduled hours for this week: <strong>{calculateScheduledHoursForWeek(selectedMember.id)}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                <button onClick={handlePrevWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&lsaquo;</button>
                                <span style={{ fontWeight: 'bold' }}>Week of {format(currentWeekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM')}</span>
                                <button onClick={handleNextWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&rsaquo;</button>
                            </div>

                            {(() => {
                                const stats = getTimesheetStats(selectedMember);
                                const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
                                return (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                                            <div className="card" style={{ padding: '20px' }}>
                                                <small style={{ color: '#6c757d' }}>Total Hours</small>
                                                <h2 style={{ margin: '5px 0' }}>{stats.actualHours.toFixed(1)}h</h2>
                                            </div>
                                            <div className="card" style={{ padding: '20px' }}>
                                                <small style={{ color: '#6c757d' }}>Total Pay</small>
                                                <h2 style={{ margin: '5px 0' }}>${stats.totalPay.toFixed(2)}</h2>
                                            </div>
                                            <div className="card" style={{ padding: '20px' }}>
                                                <small style={{ color: '#6c757d' }}>Clock-In Entries</small>
                                                <h2 style={{ margin: '5px 0', color: '#007bff' }}>{stats.clockInEntries}</h2>
                                            </div>
                                            <div className="card" style={{ padding: '20px' }}>
                                                <small style={{ color: '#6c757d' }}>Manual Entries</small>
                                                <h2 style={{ margin: '5px 0', color: 'var(--orange)' }}>{stats.manualEntries}</h2>
                                            </div>
                                        </div>

                                        <h4 style={{ marginBottom: '15px' }}>Daily Breakdown</h4>
                                        {weekDays.map(day => {
                                            const dayEntries = stats.weeklySheets.filter(t => {
                                                const entryDate = parseTime(t.clock_in);
                                                return entryDate && isSameDay(entryDate, day);
                                            });
                                            return (
                                                <div key={day.toISOString()} className="card" style={{ padding: '20px', marginBottom: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ width: '100px' }}>
                                                            <strong>{format(day, 'EEE').toUpperCase()}</strong><br />
                                                            <small style={{ color: '#6c757d' }}>{format(day, 'dd MMM')}</small>
                                                        </div>
                                                        <div style={{ flex: 1, marginLeft: '30px' }}>
                                                            {dayEntries.length === 0 ? (
                                                                <div style={{ marginBottom: '10px' }}>
                                                                    <span style={{ color: '#ccc', fontStyle: 'italic', fontSize: '0.9rem' }}>No entry logged</span>
                                                                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', marginTop: '5px' }}>
                                                                        <span>Scheduled: <strong>{getScheduledHoursForDay(selectedMember.id, day)}</strong></span>
                                                                        <span>Actual: <strong>0h</strong></span>
                                                                        <span>Pay: <strong>$0.00</strong></span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                dayEntries.map(entry => {
                                                                    const parsedIn = parseTime(entry.clock_in);
                                                                    const parsedOut = parseTime(entry.clock_out);
                                                                    const mins = differenceInMinutes(parsedOut || new Date(), parsedIn);
                                                                    const hours = Math.max(0, mins) / 60;
                                                                    const entryType = getEntryType(entry);
                                                                    const isManual = entryType === 'manual';
                                                                    const clockInTime = formatTimeDisplay(parsedIn);
                                                                    const clockOutTime = entry.clock_out ? formatTimeDisplay(parsedOut) : 'Not clocked out';

                                                                    return (
                                                                        <div key={entry.id} style={{ marginBottom: '10px', position: 'relative' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                                                                <span className={`status-tag ${isManual ? 'status-inactive' : 'status-active'}`} style={{ fontSize: '0.75rem' }}>
                                                                                    {isManual ? 'Manual Entry' : 'Clock-In'}
                                                                                </span>
                                                                                <span style={{ fontSize: '0.9rem' }}>
                                                                                    {clockInTime} - {clockOutTime}
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => setSelectedEntry(entry)}
                                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '1.2rem' }}
                                                                                    title="View details"
                                                                                >👁</button>
                                                                                <button
                                                                                    onClick={() => setEditingEntry(entry)}
                                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '1.2rem' }}
                                                                                    title="Edit entry"
                                                                                >✏️</button>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem' }}>
                                                                                <span>Scheduled: <strong>{getScheduledHoursForDay(selectedMember.id, day)}</strong></span>
                                                                                <span>Actual: <strong>{hours.toFixed(1)}h</strong></span>
                                                                                <span>Pay: <strong>${(hours * (Number(selectedMember.hourly_rate) || 0)).toFixed(2)}</strong></span>
                                                                                {entry.notes && entry.notes !== 'Manual entry' && (
                                                                                    <span style={{ color: '#6c757d' }}>Notes: {entry.notes}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

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

            {/* ENTRY DETAILS MODAL */}
            <Modal isOpen={!!selectedEntry} onClose={() => setSelectedEntry(null)} title="Entry Details">
                {selectedEntry && (
                    <div style={{ padding: '10px 0' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <small style={{ display: 'block', color: '#6c757d', marginBottom: '4px' }}>Staff Member</small>
                            <strong style={{ fontSize: '1.1rem' }}>{selectedMember?.first_name} {selectedMember?.last_name}</strong>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <small style={{ display: 'block', color: '#6c757d', marginBottom: '4px' }}>Date</small>
                            <strong style={{ fontSize: '1.1rem' }}>
                                {formatDateDisplay(selectedEntry.clock_in)}
                            </strong>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <small style={{ display: 'block', color: '#6c757d', marginBottom: '4px' }}>Entry Type</small>
                            <span className={`status-tag ${getEntryType(selectedEntry) === 'manual' ? 'status-inactive' : 'status-active'}`}>
                                {getEntryType(selectedEntry) === 'manual' ? 'Manual Entry' : 'Clock-In'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '40px', marginBottom: '20px' }}>
                            <div>
                                <small style={{ display: 'block', color: '#6c757d', marginBottom: '4px' }}>Clock In Time</small>
                                <strong style={{ fontSize: '1.1rem' }}>
                                    {formatTimeDisplay(selectedEntry.clock_in)}
                                </strong>
                            </div>
                            <div>
                                <small style={{ display: 'block', color: '#6c757d', marginBottom: '4px' }}>Clock Out Time</small>
                                <strong style={{ fontSize: '1.1rem' }}>
                                    {selectedEntry.clock_out ? formatTimeDisplay(selectedEntry.clock_out) : 'Not clocked out'}
                                </strong>
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <small style={{ display: 'block', color: '#6c757d', marginBottom: '4px' }}>Hours Worked</small>
                            <strong style={{ fontSize: '1.1rem' }}>
                                {selectedEntry.clock_out ?
                                    `${(differenceInMinutes(
                                        parseTime(selectedEntry.clock_out),
                                        parseTime(selectedEntry.clock_in)
                                    ) / 60).toFixed(1)}h` : '0.0h'}
                            </strong>
                        </div>
                        {selectedEntry.notes && selectedEntry.notes !== 'Manual entry' && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                <small style={{ display: 'block', color: '#6c757d', marginBottom: '4px' }}>Notes</small>
                                <p style={{ margin: 0, padding: '10px', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.9rem' }}>{selectedEntry.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* EDIT ENTRY MODAL */}
            <Modal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Time Entry">
                {editingEntry && (
                    <EditTimeEntryForm
                        entry={editingEntry}
                        onClose={() => setEditingEntry(null)}
                        onSave={() => {
                            fetchTeamMembers();
                            setEditingEntry(null);
                        }}
                        teamMembers={teamMembers}
                    />
                )}
            </Modal>
        </div>
    );
};

export default Timesheets;
