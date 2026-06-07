import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isAfter, isBefore, parse } from 'date-fns';
import Modal from '../../components/Modal';
import { toast } from 'react-hot-toast';

const WorkScheduleModal = ({ staff, onClose }) => {
    const now = new Date();
    const [activeTab, setActiveTab] = useState('regular');
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(now, { weekStartsOn: 1 }));
    const [regularPattern, setRegularPattern] = useState({});
    const [weekSpecificSchedule, setWeekSpecificSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copyWeeksCount, setCopyWeeksCount] = useState(1);
    const [timeErrors, setTimeErrors] = useState({}); // Track time validation errors

    const daysKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const getDefaultSchedule = () => ({
        monday: { active: false, start: '09:00', end: '17:00' },
        tuesday: { active: false, start: '09:00', end: '17:00' },
        wednesday: { active: false, start: '09:00', end: '17:00' },
        thursday: { active: false, start: '09:00', end: '17:00' },
        friday: { active: false, start: '09:00', end: '17:00' },
        saturday: { active: false, start: '10:00', end: '16:00' },
        sunday: { active: false, start: '10:00', end: '16:00' },
    });

    // Time validation function
    const validateTimeRange = (startTime, endTime, day) => {
        if (!startTime || !endTime) return true; // Empty times are valid

        // Parse times to compare
        const start = parse(startTime, 'HH:mm', new Date());
        const end = parse(endTime, 'HH:mm', new Date());

        // Check if start time is before end time
        return start < end;
    };

    // Update time errors for a specific day
    const updateTimeError = (day, isValid) => {
        setTimeErrors(prev => {
            if (isValid) {
                const { [day]: removed, ...rest } = prev;
                return rest;
            } else {
                return { ...prev, [day]: 'Start time must be before end time' };
            }
        });
    };

    const fetchSchedule = async () => {
        if (!staff?.id) return;

        setLoading(true);
        try {
            const dateStr = format(currentWeekStart, 'yyyy-MM-dd');
            const res = await axios.get(`/api/teams/${staff.id}/schedule`, {
                params: { date: dateStr }
            });

            const regular = res.data.regular || getDefaultSchedule();
            const specific = res.data.specific || null;

            setRegularPattern(regular);
            setWeekSpecificSchedule(specific || regular);

            // Clear any existing errors when loading new schedule
            setTimeErrors({});
        } catch (error) {
            toast.error("Failed to load schedule.");
            setRegularPattern(getDefaultSchedule());
            setWeekSpecificSchedule(getDefaultSchedule());
            setTimeErrors({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, [staff?.id, currentWeekStart]);

    // Logic to determine week status
    const getWeekStatus = () => {
        const currentWk = startOfWeek(now, { weekStartsOn: 1 });
        const upcomingWk = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

        if (isSameDay(currentWeekStart, currentWk)) {
            return { label: 'Current Week', type: 'current' };
        } else if (isSameDay(currentWeekStart, upcomingWk)) {
            return { label: 'Upcoming Week', type: 'upcoming' };
        } else if (isAfter(currentWeekStart, upcomingWk)) {
            return { label: 'Future Week', type: 'future' };
        } else if (isBefore(currentWeekStart, currentWk)) {
            return { label: 'Past Week', type: 'past' };
        }
        return { label: '', type: 'other' };
    };

    const weekStatus = getWeekStatus();

    // Dynamic tab label logic based on the navigated week
    const getDynamicTabLabel = () => {
        switch (weekStatus.type) {
            case 'current': return 'This Week Only';
            case 'upcoming': return 'Next Week';
            case 'future': return 'Future Week';
            case 'past': return 'Past Week';
            default: return 'This Week Only';
        }
    };

    const handleToggle = (day, status) => {
        if (activeTab === 'regular') {
            const updatedPattern = {
                ...regularPattern,
                [day]: { ...regularPattern[day], active: status }
            };
            setRegularPattern(updatedPattern);

            // Validate time if day is being activated
            if (status) {
                const isValid = validateTimeRange(regularPattern[day].start, regularPattern[day].end, day);
                updateTimeError(day, isValid);
            } else {
                // Remove error if day is deactivated
                updateTimeError(day, true);
            }
        } else {
            const updatedSchedule = {
                ...weekSpecificSchedule,
                [day]: { ...weekSpecificSchedule[day], active: status }
            };
            setWeekSpecificSchedule(updatedSchedule);

            // Validate time if day is being activated
            if (status) {
                const isValid = validateTimeRange(weekSpecificSchedule[day].start, weekSpecificSchedule[day].end, day);
                updateTimeError(day, isValid);
            } else {
                // Remove error if day is deactivated
                updateTimeError(day, true);
            }
        }
    };

    const handleTimeChange = (day, field, value) => {
        let currentData, updatedData;

        if (activeTab === 'regular') {
            currentData = regularPattern[day];
            updatedData = {
                ...regularPattern,
                [day]: { ...currentData, [field]: value }
            };
            setRegularPattern(updatedData);
        } else {
            currentData = weekSpecificSchedule[day];
            updatedData = {
                ...weekSpecificSchedule,
                [day]: { ...currentData, [field]: value }
            };
            setWeekSpecificSchedule(updatedData);
        }

        // Validate the new time range
        const startTime = field === 'start' ? value : currentData.start;
        const endTime = field === 'end' ? value : currentData.end;
        const isValid = validateTimeRange(startTime, endTime, day);
        updateTimeError(day, isValid);
    };

    const handleSave = async () => {
        // Check for validation errors before saving
        const currentScheduleData = activeTab === 'regular' ? regularPattern : weekSpecificSchedule;
        const errors = {};

        // Validate all active days
        Object.keys(currentScheduleData).forEach(day => {
            if (currentScheduleData[day].active) {
                const isValid = validateTimeRange(
                    currentScheduleData[day].start,
                    currentScheduleData[day].end,
                    day
                );
                if (!isValid) {
                    errors[day] = 'Start time must be before end time';
                }
            }
        });

        if (Object.keys(errors).length > 0) {
            setTimeErrors(errors);
            toast.error("Please fix time validation errors before saving.");
            return;
        }

        const loadingToast = toast.loading('Saving schedule...');
        try {
            let payload;

            if (activeTab === 'regular') {
                // Save regular pattern
                payload = {
                    week_start_date: null,
                    data: regularPattern
                };
            } else {
                // Save week-specific schedule
                payload = {
                    week_start_date: format(currentWeekStart, 'yyyy-MM-dd'),
                    data: weekSpecificSchedule
                };
            }

            await axios.post(`/api/teams/${staff.id}/schedule`, payload);
            toast.success("Schedule saved!", { id: loadingToast });
            await fetchSchedule();
        } catch (error) {
            toast.error("Failed to save schedule.", { id: loadingToast });
        }
    };

    const handleCopyToFutureWeeks = async () => {
        // Check for validation errors before copying
        const errors = {};

        Object.keys(weekSpecificSchedule).forEach(day => {
            if (weekSpecificSchedule[day].active) {
                const isValid = validateTimeRange(
                    weekSpecificSchedule[day].start,
                    weekSpecificSchedule[day].end,
                    day
                );
                if (!isValid) {
                    errors[day] = 'Start time must be before end time';
                }
            }
        });

        if (Object.keys(errors).length > 0) {
            setTimeErrors(errors);
            toast.error("Please fix time validation errors before copying.");
            return;
        }

        const loadingToast = toast.loading(`Copying schedule to ${copyWeeksCount} week(s)...`);
        try {
            const promises = [];

            // Copy the current week's specific schedule to future weeks
            for (let i = 1; i <= copyWeeksCount; i++) {
                const targetWeekStart = addWeeks(currentWeekStart, i);
                const payload = {
                    week_start_date: format(targetWeekStart, 'yyyy-MM-dd'),
                    data: weekSpecificSchedule
                };
                promises.push(axios.post(`/api/teams/${staff.id}/schedule`, payload));
            }

            await Promise.all(promises);
            toast.success(`Schedule copied to ${copyWeeksCount} future week(s)!`, { id: loadingToast });
            setShowCopyModal(false);
            await fetchSchedule();
        } catch (error) {
            toast.error("Failed to copy schedule.", { id: loadingToast });
        }
    };

    if (!staff) return null;

    // Get the current schedule data based on active tab
    const currentScheduleData = activeTab === 'regular' ? regularPattern : weekSpecificSchedule;

    // Determine if Copy button should be visible
    const showCopyButton = activeTab !== 'regular' &&
        (weekStatus.type === 'current' ||
            weekStatus.type === 'upcoming' ||
            weekStatus.type === 'future');

    // Check if there are any validation errors to disable save button
    const hasErrors = Object.keys(timeErrors).length > 0;

    return (
        <>
            <Modal isOpen={true} onClose={onClose} title={`Work Schedule: ${staff.first_name}`} modalClass="modal-lg">
                <style>{`
                    .time-input-error {
                        border-color: #ef4444 !important;
                        background-color: #fef2f2 !important;
                    }
                    .time-input-error:focus {
                        border-color: #dc2626 !important;
                        box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1) !important;
                    }
                    .error-message {
                        color: #dc2626;
                        font-size: 0.75rem;
                        margin-top: 4px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    .error-message::before {
                        content: "⚠";
                        font-size: 0.875rem;
                    }
                    .btn-primary-solid:disabled {
                        background-color: #9ca3af !important;
                        border-color: #9ca3af !important;
                        cursor: not-allowed;
                        opacity: 0.6;
                    }
                    .error-summary {
                        background-color: #fef2f2;
                        border: 1px solid #fecaca;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 20px;
                        color: #991b1b;
                        font-size: 0.875rem;
                    }
                    .error-summary-title {
                        font-weight: 600;
                        margin-bottom: 4px;
                    }
                `}</style>

                <div className="schedule-app-container">
                    <p className="modal-subtitle">Manage weekly availability</p>

                    <div className="schedule-header-nav">
                        <button className="nav-arrow-btn" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>&larr;</button>
                        <div className="week-display-info">
                            <span className="date-range-text">
                                Week of {format(currentWeekStart, 'dd MMM')} – {format(addDays(currentWeekStart, 6), 'dd MMM')}
                            </span>
                            {weekStatus.label && (
                                <div className={`week-status-badge status-${weekStatus.type}`}>
                                    {weekStatus.type === 'current' ? '📌 ' : weekStatus.type === 'upcoming' ? '📅 ' : weekStatus.type === 'future' ? '🚀 ' : '🕐 '}
                                    {weekStatus.label.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <button className="nav-arrow-btn" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>&rarr;</button>

                        {weekStatus.type !== 'current' && (
                            <button
                                className="btn-jump-today"
                                onClick={() => setCurrentWeekStart(startOfWeek(now, { weekStartsOn: 1 }))}
                            >
                                Today
                            </button>
                        )}
                    </div>

                    <div className="tab-switcher">
                        <button
                            className={activeTab === 'this-week' ? 'active' : ''}
                            onClick={() => setActiveTab('this-week')}
                        >
                            {getDynamicTabLabel()}
                        </button>
                        <button
                            className={activeTab === 'regular' ? 'active' : ''}
                            onClick={() => setActiveTab('regular')}
                        >
                            Regular Pattern
                        </button>
                    </div>

                    <div className="instruction-box">
                        {activeTab === 'regular' ? (
                            <span><strong>Regular pattern:</strong> Set a default availability pattern that applies every week.</span>
                        ) : (
                            <span><strong>Specific Week:</strong> Changes made here only apply to this specific date range.</span>
                        )}
                    </div>

                    {/* Show error summary if there are validation errors */}
                    {hasErrors && (
                        <div className="error-summary">
                            <div className="error-summary-title">Time Validation Errors:</div>
                            <div>Please fix the following time range issues:</div>
                            <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                                {Object.entries(timeErrors).map(([day, error]) => (
                                    <li key={day} style={{ marginBottom: '4px' }}>
                                        {day.charAt(0).toUpperCase() + day.slice(1)}: {error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="rows-container">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                        ) : daysKeys.map((day, index) => {
                            const dayDate = addDays(currentWeekStart, index);
                            const isToday = isSameDay(dayDate, now);
                            const data = currentScheduleData[day];
                            const isActive = data?.active ?? false;
                            const hasError = timeErrors[day];

                            return (
                                <div key={day} className={`day-row ${isToday && weekStatus.type === 'current' ? 'is-today' : ''}`}>
                                    <div className="day-meta">
                                        <span className="day-name" style={{ textTransform: 'capitalize' }}>{day}</span>
                                        <div className="date-label">
                                            {activeTab === 'this-week' ? format(dayDate, 'dd MMM') : 'Every week'}
                                            {isToday && weekStatus.type === 'current' && <span className="today-chip">Today</span>}
                                        </div>
                                    </div>

                                    <div className="action-toggles">
                                        <div className="segmented-control">
                                            <button className={isActive ? 'selected-available' : ''} onClick={() => handleToggle(day, true)}>Available</button>
                                            <button className={!isActive ? 'selected-off' : ''} onClick={() => handleToggle(day, false)}>Day Off</button>
                                        </div>
                                    </div>

                                    <div className="time-config">
                                        {isActive ? (
                                            <div>
                                                <div className="time-pickers">
                                                    <input
                                                        type="time"
                                                        value={data?.start || '09:00'}
                                                        onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                                        className={hasError ? 'time-input-error' : ''}
                                                        style={hasError ? { borderColor: '#ef4444' } : {}}
                                                    />
                                                    <span>&rarr;</span>
                                                    <input
                                                        type="time"
                                                        value={data?.end || '17:00'}
                                                        onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                                        className={hasError ? 'time-input-error' : ''}
                                                        style={hasError ? { borderColor: '#ef4444' } : {}}
                                                    />
                                                </div>
                                                {hasError && (
                                                    <div className="error-message">
                                                        {timeErrors[day]}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="not-available-label">Not available</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="modal-actions-footer">
                        {/* Copy button shows for Current Week, Upcoming Week, and Future Weeks (NOT in Regular Pattern tab) */}
                        {showCopyButton && (
                            <button
                                className="btn-secondary-outline"
                                onClick={() => setShowCopyModal(true)}
                                disabled={hasErrors}
                            >
                                📑 Copy to Future Weeks
                            </button>
                        )}
                        <div className="right-buttons">
                            <button className="btn-ghost" onClick={onClose}>Cancel</button>
                            <button
                                className="btn-primary-solid"
                                onClick={handleSave}
                                disabled={hasErrors}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {showCopyModal && (
                <Modal isOpen={showCopyModal} onClose={() => setShowCopyModal(false)} title="Copy to Future Weeks" modalClass="modal-sm">
                    <div style={{ padding: '20px' }}>
                        <p style={{ marginBottom: '20px', color: '#6b7280' }}>Copy this week's schedule to the next:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            {[1, 2, 3, 4].map((weeks) => (
                                <label key={weeks} style={{ display: 'flex', alignItems: 'center', padding: '12px', border: copyWeeksCount === weeks ? '2px solid #3b82f6' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: copyWeeksCount === weeks ? '#eff6ff' : 'transparent' }}>
                                    <input type="radio" name="copyWeeks" value={weeks} checked={copyWeeksCount === weeks} onChange={(e) => setCopyWeeksCount(parseInt(e.target.value))} style={{ marginRight: '10px' }} />
                                    <span>Next {weeks} week{weeks > 1 ? 's' : ''}</span>
                                </label>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="btn-ghost" onClick={() => setShowCopyModal(false)}>Cancel</button>
                            <button
                                className="btn-primary-solid"
                                onClick={handleCopyToFutureWeeks}
                                disabled={hasErrors}
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default WorkScheduleModal;
