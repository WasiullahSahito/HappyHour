import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import './StaffRoster.css';
import { formatHours, calculateHours } from './rosterUtils';

const StaffRoster = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Get week from URL params or use current week
    const getInitialWeek = () => {
        const weekParam = searchParams.get('week');
        if (weekParam) return weekParam;
        return getCurrentWeekStart();
    };

    const [weekStart, setWeekStart] = useState(getInitialWeek());
    const [rosterData, setRosterData] = useState({
        roster_entries: [],
        prep_areas: [],
        staff_availability: [],
        target_hours: {},
        assigned_hours: {},
        resource_plan: null
    });
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignmentData, setAssignmentData] = useState({
        prep_area_id: null,
        day: null,
        team_id: null,
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 30
    });
    const [availabilityInfo, setAvailabilityInfo] = useState(null);
    const [error, setError] = useState(null);
    const [hasResourcePlan, setHasResourcePlan] = useState(true);

    // ----- NEW VALIDATION STATES -----
    const [timeError, setTimeError] = useState('');
    const [windowError, setWindowError] = useState('');

    const days = [
        { key: 'monday', label: 'MON' },
        { key: 'tuesday', label: 'TUE' },
        { key: 'wednesday', label: 'WED' },
        { key: 'thursday', label: 'THU' },
        { key: 'friday', label: 'FRI' },
        { key: 'saturday', label: 'SAT' },
        { key: 'sunday', label: 'SUN' }
    ];

    useEffect(() => {
        fetchRosterData();
        // Update URL when week changes
        setSearchParams({ week: weekStart });
    }, [weekStart]);

    useEffect(() => {
        if (assignmentData.team_id && assignmentData.day) {
            checkStaffAvailability();
        }
    }, [assignmentData.team_id, assignmentData.day, assignmentData.start_time, assignmentData.end_time]);

    // ----- NEW: VALIDATE SHIFT TIMES -----
    const validateShiftTimes = () => {
        if (!assignmentData.start_time || !assignmentData.end_time) {
            setTimeError('Start and end times are required');
            return false;
        }

        // 1. End time must be after start time
        if (assignmentData.start_time >= assignmentData.end_time) {
            setTimeError('End time must be after start time');
            return false;
        } else {
            setTimeError('');
        }

        // 2. If availability windows exist, shift must be fully inside one of them
        if (availabilityInfo?.available_windows?.length > 0) {
            const selectedStart = assignmentData.start_time;
            const selectedEnd = assignmentData.end_time;
            const isWithinWindow = availabilityInfo.available_windows.some(
                window => selectedStart >= window.start && selectedEnd <= window.end
            );
            if (!isWithinWindow) {
                setWindowError(
                    `Shift must be within one of the available time windows: ${availabilityInfo.available_windows
                        .map(w => `${w.start}-${w.end}`)
                        .join(', ')}`
                );
                return false;
            } else {
                setWindowError('');
            }
        } else {
            setWindowError('');
        }

        return true;
    };

    // Revalidate whenever times or availability info changes
    useEffect(() => {
        validateShiftTimes();
    }, [assignmentData.start_time, assignmentData.end_time, availabilityInfo]);

    // ----- CLEAR VALIDATION ERRORS -----
    const clearErrors = () => {
        setTimeError('');
        setWindowError('');
    };

    function getCurrentWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    function getDateForDay(dayKey) {
        const dayIndex = days.findIndex(d => d.key === dayKey);
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }

    async function fetchRosterData() {
        try {
            setLoading(true);
            const response = await axios.get('/api/roster', {
                params: { week_start: weekStart }
            });

            // Check if resource plan exists
            if (!response.data.resource_plan) {
                setHasResourcePlan(false);
                toast.error('⚠️ No resource plan found for this week');
            } else {
                setHasResourcePlan(true);
            }

            setRosterData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching roster:', err);

            // Check if it's a missing resource plan
            if (err.response?.status === 404 || err.response?.data?.message?.includes('resource plan')) {
                setHasResourcePlan(false);
                setError('No resource plan found for this week');
                toast.error('⚠️ No resource plan found. Please create one first.');
            } else {
                setError(err.response?.data?.error || 'Failed to load roster data');
                toast.error('Failed to load roster data');
            }
        } finally {
            setLoading(false);
        }
    }

    async function checkStaffAvailability() {
        if (!assignmentData.team_id || !assignmentData.day) return;

        try {
            const response = await axios.post('/api/roster/check-availability', {
                team_id: assignmentData.team_id,
                week_start: weekStart,
                day: assignmentData.day,
                start_time: assignmentData.start_time,
                end_time: assignmentData.end_time
            });
            setAvailabilityInfo(response.data);
        } catch (err) {
            console.error('Error checking availability:', err);
            toast.error('Failed to check staff availability');
        }
    }

    async function handleAssignStaff() {
        try {
            await axios.post('/api/roster/assign-shift', {
                week_start: weekStart,
                team_id: assignmentData.team_id,
                prep_area_id: assignmentData.prep_area_id,
                day: assignmentData.day,
                start_time: assignmentData.start_time,
                end_time: assignmentData.end_time,
                break_minutes: assignmentData.break_minutes
            });

            setShowAssignModal(false);
            await fetchRosterData();
            resetAssignmentData();
            toast.success('✅ Shift assigned successfully');
        } catch (err) {
            console.error('Error assigning staff:', err);
            const message = err.response?.data?.message || 'Failed to assign shift';
            const reason = err.response?.data?.reason;
            toast.error(reason ? `${message}: ${reason}` : message);
        }
    }

    async function handleRemoveShift(rosterId) {
        try {
            await axios.delete(`/api/roster/${rosterId}`);
            await fetchRosterData();
            toast.success('✅ Shift removed successfully');
        } catch (err) {
            console.error('Error removing shift:', err);
            toast.error('Failed to remove shift');
        }
    }

    function onDragEnd(result) {
        const { source, destination, draggableId } = result;
        if (!destination) return;

        const sourceParts = source.droppableId.split('-');
        const destParts = destination.droppableId.split('-');

        if (sourceParts[0] === 'staffSidebar') {
            const staffId = parseInt(draggableId);
            const prepAreaId = parseInt(destParts[1]);
            const day = destParts[2];
            openAssignModal(prepAreaId, day, staffId);
        }
    }

    function openAssignModal(prepAreaId, day, staffId = null) {
        if (!hasResourcePlan) {
            toast.error('Please create a resource plan for this week first');
            return;
        }

        // Clear previous validation errors
        clearErrors();

        let startTime = '09:00';
        let endTime = '17:00';

        if (staffId) {
            const staff = rosterData.staff_availability.find(s => s.id === staffId);
            if (staff && staff.week_schedule && staff.week_schedule[day]?.active) {
                startTime = staff.week_schedule[day].start;
                endTime = staff.week_schedule[day].end;
            }
        }

        setAssignmentData({
            prep_area_id: prepAreaId,
            day: day,
            team_id: staffId,
            start_time: startTime,
            end_time: endTime,
            break_minutes: 30
        });
        setAvailabilityInfo(null);
        setShowAssignModal(true);
    }

    function resetAssignmentData() {
        setAssignmentData({
            prep_area_id: null,
            day: null,
            team_id: null,
            start_time: '09:00',
            end_time: '17:00',
            break_minutes: 30
        });
        setAvailabilityInfo(null);
        clearErrors(); // Clear errors when resetting
    }

    function calculateTotalHours() {
        return calculateHours(assignmentData.start_time, assignmentData.end_time, assignmentData.break_minutes).toFixed(1);
    }

    function getShiftsForCell(prepAreaId, day) {
        return rosterData.roster_entries.filter(
            entry => entry.prep_area_id === prepAreaId && entry.day === day
        );
    }

    function getDailyTotal(day) {
        const total = rosterData.roster_entries
            .filter(entry => entry.day === day)
            .reduce((sum, entry) => sum + parseFloat(entry.total_hours || 0), 0);
        return total.toFixed(1);
    }

    function getDailyTarget(day) {
        if (!rosterData.target_hours[day]) return '0.0';
        const target = Object.values(rosterData.target_hours[day] || {})
            .reduce((sum, hours) => sum + parseFloat(hours || 0), 0);
        return target.toFixed(1);
    }

    function getWeeklyTotalForArea(prepAreaId) {
        const total = rosterData.roster_entries
            .filter(entry => entry.prep_area_id === prepAreaId)
            .reduce((sum, entry) => sum + parseFloat(entry.total_hours || 0), 0);
        return total.toFixed(1);
    }

    function getWeeklyTargetForArea(prepAreaId) {
        let total = 0;
        days.forEach(day => {
            total += parseFloat(rosterData.target_hours[day.key]?.[prepAreaId] || 0);
        });
        return total.toFixed(1);
    }

    function getGrandTotal() {
        const total = rosterData.roster_entries
            .reduce((sum, entry) => sum + parseFloat(entry.total_hours || 0), 0);
        return total.toFixed(1);
    }

    function getGrandTarget() {
        let total = 0;
        days.forEach(day => {
            total += parseFloat(getDailyTarget(day.key));
        });
        return total.toFixed(1);
    }

    function changeWeek(direction) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(currentDate.getDate() + (direction * 7));
        setWeekStart(currentDate.toISOString().split('T')[0]);
    }

    function handleCreateResourcePlan() {
        navigate(`/staff/resource-planner?week=${weekStart}`);
    }

    function exportToPDF() {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        doc.setFontSize(18);
        doc.text('Weekly Staff Roster', 14, 22);
        doc.setFontSize(11);
        const weekRange = getWeekRange(weekStart);
        doc.text(`Week of ${weekRange} • Main Location`, 14, 30);
        doc.setFontSize(10);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 38);

        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        const prepAreas = rosterData.prep_areas;
        const entries = rosterData.roster_entries;

        const tableRows = prepAreas.map(area => {
            const row = [area.name];
            dayKeys.forEach(day => {
                const shifts = entries.filter(e => e.prep_area_id === area.id && e.day === day);
                if (shifts.length === 0) {
                    row.push('—');
                } else {
                    const shiftTexts = shifts.map(shift => {
                        const staff = rosterData.staff_availability.find(s => s.id === shift.team_id);
                        const staffName = staff ? staff.name : 'Unknown';
                        return `${staffName}\n${shift.start_time} - ${shift.end_time}`;
                    });
                    row.push(shiftTexts.join('\n\n'));
                }
            });
            return row;
        });

        autoTable(doc, {
            startY: 45,
            head: [['Prep Area', ...dayLabels]],
            body: tableRows,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 4,
                overflow: 'linebreak',
                halign: 'left',
                valign: 'top'
            },
            headStyles: {
                fillColor: [66, 133, 244],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },
            columnStyles: {
                0: { cellWidth: 35, fontStyle: 'bold', fillColor: [250, 250, 250] }
            },
            margin: { left: 14, right: 14 }
        });

        // Footer note
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('This roster shows all staff assignments by prep area and day.', 14, finalY);
        doc.text('Each cell displays staff name and shift times (start - end).', 14, finalY + 4);

        doc.save(`Staff_Roster_Week_${weekStart}.pdf`);
        toast.success('📄 PDF exported successfully');
    }

    function getWeekRange(startDate) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const options = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;
    }

    if (loading) {
        return <div className="roster-loading">Loading roster data...</div>;
    }

    // Show resource plan required message
    if (!hasResourcePlan) {
        return (
            <div className="staff-roster-container">
                <div className="roster-header">
                    <div className="roster-title">
                        <h2>📋 Staff Roster</h2>
                        <p>Plan and assign staff shifts across prep areas</p>
                    </div>
                    <div className="week-selector">
                        <button onClick={() => changeWeek(-1)} className="week-nav-btn">←</button>
                        <span className="week-display">
                            Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeWeek(1)} className="week-nav-btn">→</button>
                    </div>
                </div>

                <div className="no-resource-plan-container">
                    <div className="no-resource-plan-card">
                        <div className="no-plan-icon">📊</div>
                        <h2>Resource Plan Required</h2>
                        <p>Before you can create a staff roster for this week, you need to build a resource plan.</p>
                        <p className="week-info">
                            Week of {getWeekRange(weekStart)}
                        </p>
                        <div className="no-plan-actions">
                            <button
                                className="btn-create-plan"
                                onClick={handleCreateResourcePlan}
                            >
                                📊 Create Resource Plan
                            </button>
                        </div>
                        <div className="no-plan-help">
                            <p><strong>What is a Resource Plan?</strong></p>
                            <ul>
                                <li>Set revenue forecasts for each day</li>
                                <li>Define labor cost targets</li>
                                <li>Calculate staffing hours needed</li>
                                <li>Distribute hours across prep areas</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="staff-roster-container">
                {/* Header */}
                <div className="roster-header">
                    <div className="roster-title">
                        <h2>📋 Staff Roster</h2>
                        <p>Plan and assign staff shifts across prep areas</p>
                    </div>
                    <div className="week-selector">
                        <button onClick={() => changeWeek(-1)} className="week-nav-btn">←</button>
                        <span className="week-display">
                            Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeWeek(1)} className="week-nav-btn">→</button>
                        <button onClick={exportToPDF} className="export-pdf-btn">
                            📄 Export PDF
                        </button>
                        <button onClick={handleCreateResourcePlan} className="edit-plan-btn">
                            ✏️ Edit Plan
                        </button>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Main Content Wrapper */}
                <div className="roster-main-content">
                    {/* Roster Grid */}
                    <div className="roster-grid-container">
                        <table className="roster-table">
                            <thead>
                                <tr>
                                    <th className="prep-area-header">Prep Area</th>
                                    {days.map(day => (
                                        <th key={day.key} className="day-header">
                                            <div className="day-header-content">
                                                <div className="day-label">{day.label}</div>
                                                <div className="day-date">{getDateForDay(day.key)}</div>
                                                <div className="day-target">
                                                    <span className="target-icon">🎯</span>
                                                    {getDailyTarget(day.key)}h target
                                                </div>
                                                <div className="day-assigned">
                                                    {getDailyTotal(day.key)}h assigned
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="weekly-total-header">Weekly Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rosterData.prep_areas.map(prepArea => (
                                    <tr key={prepArea.id} className="prep-area-row">
                                        <td className="prep-area-cell">
                                            <div className="prep-area-name">
                                                <span className="prep-area-icon">🍽️</span>
                                                {prepArea.name}
                                            </div>
                                        </td>
                                        {days.map(day => {
                                            const shifts = getShiftsForCell(prepArea.id, day.key);
                                            const targetHours = rosterData.target_hours[day.key]?.[prepArea.id] || 0;
                                            const assignedHours = rosterData.assigned_hours[day.key]?.[prepArea.id] || 0;
                                            const remainingHours = Math.max(0, targetHours - assignedHours).toFixed(1);
                                            const droppableId = `prepArea-${prepArea.id}-${day.key}`;

                                            return (
                                                <td key={day.key} className="shift-cell">
                                                    <Droppable droppableId={droppableId}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.droppableProps}
                                                                className={`shift-cell-content ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                                                            >
                                                                <button
                                                                    className="add-shift-btn"
                                                                    onClick={() => openAssignModal(prepArea.id, day.key)}
                                                                >
                                                                    + Add
                                                                </button>
                                                                <div className="shifts-container">
                                                                    {shifts.map((shift) => {
                                                                        const staffMember = rosterData.staff_availability.find(
                                                                            s => s.id === shift.team_id
                                                                        );
                                                                        return (
                                                                            <div key={shift.id} className="shift-card">
                                                                                <div className="shift-header">
                                                                                    <span className="staff-name">
                                                                                        {staffMember?.name || 'Unknown'}
                                                                                    </span>
                                                                                    <button
                                                                                        className="remove-shift-btn"
                                                                                        onClick={() => handleRemoveShift(shift.id)}
                                                                                        title="Remove shift"
                                                                                    >
                                                                                        ×
                                                                                    </button>
                                                                                </div>
                                                                                <div className="shift-time">
                                                                                    {shift.start_time} - {shift.end_time}
                                                                                </div>
                                                                                <div className="shift-hours">
                                                                                    {shift.total_hours}h
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {provided.placeholder}
                                                                </div>
                                                                <div className="cell-summary">
                                                                    <div className="target-info">
                                                                        {prepArea.name}: {assignedHours.toFixed(1)}h
                                                                        {targetHours > 0 && ` (${remainingHours}h left)`}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </td>
                                            );
                                        })}
                                        <td className="weekly-total-cell">
                                            <div className="weekly-total">
                                                {getWeeklyTotalForArea(prepArea.id)}h
                                            </div>
                                            <div className="weekly-target">
                                                Target: {getWeeklyTargetForArea(prepArea.id)}h
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {/* Target Hours Row */}
                                <tr className="target-hours-row">
                                    <td className="target-label">Target Hours</td>
                                    {days.map(day => (
                                        <td key={day.key} className="target-hours-cell">
                                            {rosterData.prep_areas.map(area => {
                                                const targetHours = rosterData.target_hours[day.key]?.[area.id] || 0;
                                                const assignedHours = rosterData.assigned_hours[day.key]?.[area.id] || 0;
                                                const remainingHours = Math.max(0, targetHours - assignedHours).toFixed(1);
                                                return (
                                                    <div key={area.id} className="target-item">
                                                        {area.name}: {targetHours.toFixed(1)}h
                                                        {targetHours > 0 && ` (${remainingHours}h left)`}
                                                    </div>
                                                );
                                            })}
                                        </td>
                                    ))}
                                    <td className="target-total"></td>
                                </tr>

                                {/* Daily Total Row */}
                                <tr className="daily-total-row">
                                    <td className="total-label">Daily Total</td>
                                    {days.map(day => {
                                        const assigned = getDailyTotal(day.key);
                                        const target = getDailyTarget(day.key);
                                        const remaining = (parseFloat(target) - parseFloat(assigned)).toFixed(1);
                                        return (
                                            <td key={day.key} className="daily-total-cell">
                                                <div className="total-hours">{assigned}h</div>
                                                <div className="total-info">
                                                    of {target}h<br />
                                                    +{remaining}h
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="grand-total-cell">
                                        <div className="grand-total">{getGrandTotal()}h</div>
                                        <div className="grand-target">of {getGrandTarget()}h</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Staff Sidebar */}
                    <div className="available-staff-sidebar">
                        <div className="sidebar-header">
                            <h3>👥 Available Staff</h3>
                            <p>Drag & drop to any slot</p>
                        </div>
                        <Droppable droppableId="staffSidebar" isDropDisabled={true}>
                            {(provided) => (
                                <div
                                    className="staff-list"
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {rosterData.staff_availability.map((staff, index) => (
                                        <Draggable
                                            key={staff.id}
                                            draggableId={staff.id.toString()}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`staff-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                                >
                                                    <div className="staff-info">
                                                        <div className="staff-name-pos">
                                                            <div className="staff-name">{staff.name}</div>
                                                            <div className="staff-position">{staff.position}</div>
                                                        </div>
                                                        <div className="staff-hours-left">{staff.hours_left}h left</div>
                                                    </div>
                                                    <div className="staff-schedule">
                                                        {staff.worked_hours}h / {staff.total_scheduled_hours}h
                                                    </div>
                                                    <div className="staff-utilization">
                                                        <div className="utilization-bar">
                                                            <div
                                                                className="utilization-fill"
                                                                style={{ width: `${staff.utilization_percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="utilization-text">{staff.utilization_percentage}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div> {/* End roster-main-content */}

                {/* Assignment Modal */}
                {showAssignModal && (
                    <div className="modal-overlay" onClick={() => { setShowAssignModal(false); clearErrors(); }}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Assign Staff</h3>
                                <div className="modal-subtitle">
                                    {rosterData.prep_areas.find(a => a.id === assignmentData.prep_area_id)?.name} • {assignmentData.day?.toUpperCase()}
                                </div>
                                <button className="modal-close" onClick={() => { setShowAssignModal(false); clearErrors(); }}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Select Staff</label>
                                    <select
                                        value={assignmentData.team_id || ''}
                                        onChange={e => {
                                            setAssignmentData({ ...assignmentData, team_id: parseInt(e.target.value) });
                                            clearErrors(); // Clear errors when staff changes
                                        }}
                                        className="form-select"
                                    >
                                        <option value="">Choose staff member...</option>
                                        {rosterData.staff_availability.map(staff => (
                                            <option key={staff.id} value={staff.id}>
                                                {staff.name} - {staff.position}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {availabilityInfo && (
                                    <div className={`availability-info ${availabilityInfo.available ? 'available' : 'not-available'}`}>
                                        {availabilityInfo.available ? (
                                            <div className="available-message">
                                                <span className="check-icon">✓</span>
                                                {rosterData.staff_availability.find(s => s.id === assignmentData.team_id)?.name} is available on {assignmentData.day?.toUpperCase()}
                                                {availabilityInfo.available_windows?.length > 0 && (
                                                    <div className="time-windows">
                                                        <strong>Available Time Windows on {assignmentData.day?.toUpperCase()}</strong>
                                                        {availabilityInfo.available_windows.map((window, idx) => (
                                                            <div key={idx} className="time-window">
                                                                {window.start} - {window.end}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="not-available-message">
                                                <span className="warning-icon">⚠️</span>
                                                <div>
                                                    <strong>Not Available</strong>
                                                    <p>{availabilityInfo.reason}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ----- NEW: VALIDATION ERROR MESSAGES ----- */}
                                {timeError && (
                                    <div className="validation-error" style={{ marginBottom: '16px' }}>
                                        ⚠️ {timeError}
                                    </div>
                                )}
                                {windowError && (
                                    <div className="validation-error" style={{ marginBottom: '16px' }}>
                                        ⚠️ {windowError}
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Time</label>
                                        <input
                                            type="time"
                                            value={assignmentData.start_time}
                                            onChange={e => setAssignmentData({ ...assignmentData, start_time: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>End Time</label>
                                        <input
                                            type="time"
                                            value={assignmentData.end_time}
                                            onChange={e => setAssignmentData({ ...assignmentData, end_time: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Break Time: {assignmentData.break_minutes} minutes</label>
                                    <div className="break-options">
                                        {[10, 20, 30, 40, 50, 60].map(mins => (
                                            <button
                                                key={mins}
                                                className={`break-btn ${assignmentData.break_minutes === mins ? 'active' : ''}`}
                                                onClick={() => setAssignmentData({ ...assignmentData, break_minutes: mins })}
                                            >
                                                {mins}m
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="total-hours-display">
                                    <strong>Total Hours:</strong> {calculateTotalHours()}h
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => { setShowAssignModal(false); clearErrors(); }}>
                                    Cancel
                                </button>
                                <button
                                    className="btn-assign"
                                    onClick={handleAssignStaff}
                                    disabled={
                                        !assignmentData.team_id ||
                                        !availabilityInfo?.available ||
                                        !!timeError ||
                                        !!windowError
                                    }
                                >
                                    Assign Staff
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DragDropContext>
    );
};

export default StaffRoster;
