import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { parse, differenceInMinutes } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Clock, AlertCircle, CheckCircle, X } from 'lucide-react';

const AssignStaffModal = ({
    isOpen,
    onClose,
    prepArea,
    day,
    teamMembers,
    staffWeeklySchedules,
    onAssign,
    preSelectedStaff
}) => {
    const [selectedStaffId, setSelectedStaffId] = useState(preSelectedStaff?.id || '');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [breakMinutes, setBreakMinutes] = useState(30);
    const [availabilityInfo, setAvailabilityInfo] = useState(null);
    const [totalHours, setTotalHours] = useState(0);

    const dayMap = {
        'MON': 'monday', 'TUE': 'tuesday', 'WED': 'wednesday',
        'THU': 'thursday', 'FRI': 'friday', 'SAT': 'saturday', 'SUN': 'sunday'
    };

    const breakOptions = [10, 20, 30, 40, 50, 60];

    // Check staff availability when staff is selected
    useEffect(() => {
        if (selectedStaffId) {
            checkStaffAvailability();
        } else {
            setAvailabilityInfo(null);
        }
    }, [selectedStaffId]);

    // Calculate hours when time or break changes
    useEffect(() => {
        calculateHours();
    }, [startTime, endTime, breakMinutes]);

    const checkStaffAvailability = () => {
        const staff = teamMembers.find(m => m.id === parseInt(selectedStaffId));
        if (!staff) {
            setAvailabilityInfo(null);
            return;
        }

        const dayKey = dayMap[day];
        const weeklySchedule = staffWeeklySchedules[staff.id];
        const scheduleToUse = weeklySchedule?.specific || weeklySchedule?.regular || staff.schedule;

        const daySchedule = scheduleToUse?.[dayKey];

        if (!daySchedule || !daySchedule.active) {
            setAvailabilityInfo({
                isAvailable: false,
                message: `${staff.first_name} ${staff.last_name} is not available on ${day}`,
                scheduleStart: null,
                scheduleEnd: null
            });
            return;
        }

        setAvailabilityInfo({
            isAvailable: true,
            message: `${staff.first_name} ${staff.last_name} is available on ${day} from ${daySchedule.start} to ${daySchedule.end}`,
            scheduleStart: daySchedule.start,
            scheduleEnd: daySchedule.end
        });

        // Auto-set times to staff's availability
        setStartTime(daySchedule.start);
        setEndTime(daySchedule.end);
    };

    const calculateHours = () => {
        if (!startTime || !endTime) {
            setTotalHours(0);
            return;
        }

        try {
            const start = parse(startTime, 'HH:mm', new Date());
            const end = parse(endTime, 'HH:mm', new Date());

            let totalMinutes = differenceInMinutes(end, start);

            // Handle overnight shifts
            if (totalMinutes < 0) {
                totalMinutes = differenceInMinutes(end, start) + (24 * 60);
            }

            // Subtract break time
            const workMinutes = totalMinutes - breakMinutes;
            const hours = Math.max(0, workMinutes / 60);

            setTotalHours(hours);
        } catch (error) {
            console.error('Error calculating hours:', error);
            setTotalHours(0);
        }
    };

    const validateAssignment = () => {
        if (!selectedStaffId) {
            toast.error('Please select a staff member');
            return false;
        }

        if (!availabilityInfo?.isAvailable) {
            toast.error('Selected staff member is not available on this day');
            return false;
        }

        if (!startTime || !endTime) {
            toast.error('Please set start and end times');
            return false;
        }

        if (totalHours <= 0) {
            toast.error('Total hours must be greater than 0');
            return false;
        }

        // Check if times are within staff availability
        if (availabilityInfo.scheduleStart && availabilityInfo.scheduleEnd) {
            const start = parse(startTime, 'HH:mm', new Date());
            const end = parse(endTime, 'HH:mm', new Date());
            const scheduleStart = parse(availabilityInfo.scheduleStart, 'HH:mm', new Date());
            const scheduleEnd = parse(availabilityInfo.scheduleEnd, 'HH:mm', new Date());

            if (start < scheduleStart || end > scheduleEnd) {
                toast.error(
                    `Times must be within staff availability window (${availabilityInfo.scheduleStart} - ${availabilityInfo.scheduleEnd})`,
                    { duration: 4000 }
                );
                return false;
            }
        }

        return true;
    };

    const handleAssign = () => {
        if (!validateAssignment()) return;

        onAssign({
            prepAreaId: prepArea.id,
            day: day,
            staffId: parseInt(selectedStaffId),
            startTime: startTime,
            endTime: endTime,
            breakMinutes: breakMinutes
        });

        onClose();
    };

    const getAvailableStaff = () => {
        const dayKey = dayMap[day];

        return teamMembers.filter(member => {
            const weeklySchedule = staffWeeklySchedules[member.id];
            const scheduleToUse = weeklySchedule?.specific || weeklySchedule?.regular || member.schedule;
            const daySchedule = scheduleToUse?.[dayKey];

            return daySchedule && daySchedule.active;
        });
    };

    const availableStaff = getAvailableStaff();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Assign Staff"
            modalClass="modal-md"
        >
            <style>{`
                .assign-modal-content {
                    padding: 24px;
                }

                .modal-subtitle {
                    color: #6b7280;
                    font-size: 0.875rem;
                    margin-bottom: 24px;
                }

                .form-section {
                    margin-bottom: 24px;
                }

                .form-label {
                    display: block;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                    font-size: 0.875rem;
                }

                .form-select,
                .form-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .form-select:focus,
                .form-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .availability-box {
                    padding: 16px;
                    border-radius: 8px;
                    margin-top: 12px;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }

                .availability-box.available {
                    background: #d1fae5;
                    border: 1px solid #a7f3d0;
                }

                .availability-box.not-available {
                    background: #fee2e2;
                    border: 1px solid #fecaca;
                }

                .availability-box.warning {
                    background: #fef3c7;
                    border: 1px solid #fde68a;
                }

                .availability-message {
                    flex: 1;
                }

                .availability-title {
                    font-weight: 600;
                    margin-bottom: 4px;
                    font-size: 0.875rem;
                }

                .availability-text {
                    font-size: 0.75rem;
                    line-height: 1.4;
                }

                .time-window {
                    display: inline-block;
                    background: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: 600;
                    margin-top: 4px;
                }

                .time-inputs {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    gap: 12px;
                    align-items: center;
                }

                .time-inputs .arrow {
                    color: #9ca3af;
                    font-weight: 600;
                }

                .break-options {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }

                .break-option {
                    padding: 10px;
                    border: 2px solid #e5e7eb;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    text-align: center;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .break-option:hover {
                    border-color: #93c5fd;
                    background: #eff6ff;
                }

                .break-option.selected {
                    border-color: #3b82f6;
                    background: #eff6ff;
                    color: #1d4ed8;
                    font-weight: 600;
                }

                .hours-summary {
                    background: #f0f9ff;
                    border: 2px solid #3b82f6;
                    border-radius: 8px;
                    padding: 16px;
                    text-align: center;
                }

                .hours-label {
                    font-size: 0.75rem;
                    color: #3b82f6;
                    margin-bottom: 4px;
                    font-weight: 500;
                }

                .hours-value {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #1d4ed8;
                }

                .hours-breakdown {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 8px;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    padding-top: 24px;
                    border-top: 1px solid #e5e7eb;
                }

                .btn {
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-cancel {
                    background: #f3f4f6;
                    color: #374151;
                }

                .btn-cancel:hover {
                    background: #e5e7eb;
                }

                .btn-assign {
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                    color: white;
                }

                .btn-assign:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .btn-assign:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: #6b7280;
                }

                .empty-state-icon {
                    width: 60px;
                    height: 60px;
                    background: #f3f4f6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                }
            `}</style>

            <div className="assign-modal-content">
                <div className="modal-subtitle">
                    {prepArea.name} • {day}
                </div>

                {availableStaff.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <AlertCircle size={30} color="#9ca3af" />
                        </div>
                        <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
                            No Available Staff
                        </p>
                        <p style={{ fontSize: '0.875rem' }}>
                            There are no staff members available on {day}.<br />
                            Please check staff schedules.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Staff Selection */}
                        <div className="form-section">
                            <label className="form-label">Select Staff</label>
                            <select
                                className="form-select"
                                value={selectedStaffId}
                                onChange={(e) => setSelectedStaffId(e.target.value)}
                            >
                                <option value="">Choose staff member...</option>
                                {availableStaff.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.first_name} {member.last_name} - {member.position || 'Staff'}
                                    </option>
                                ))}
                            </select>

                            {/* Availability Info */}
                            {availabilityInfo && (
                                <div className={`availability-box ${availabilityInfo.isAvailable ? 'available' : 'not-available'}`}>
                                    {availabilityInfo.isAvailable ? (
                                        <CheckCircle size={20} color="#059669" />
                                    ) : (
                                        <AlertCircle size={20} color="#dc2626" />
                                    )}
                                    <div className="availability-message">
                                        <div className="availability-title">
                                            {availabilityInfo.isAvailable ? 'Available' : 'Not Available'}
                                        </div>
                                        <div className="availability-text">
                                            {availabilityInfo.message}
                                        </div>
                                        {availabilityInfo.isAvailable && (
                                            <div className="time-window">
                                                {availabilityInfo.scheduleStart} - {availabilityInfo.scheduleEnd}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Time Selection */}
                        {availabilityInfo?.isAvailable && (
                            <>
                                <div className="form-section">
                                    <label className="form-label">
                                        <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                        Shift Times
                                    </label>
                                    <div className="time-inputs">
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                                                Start Time
                                            </label>
                                            <input
                                                type="time"
                                                className="form-input"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                            />
                                        </div>
                                        <div className="arrow">→</div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                                                End Time
                                            </label>
                                            <input
                                                type="time"
                                                className="form-input"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Break Time */}
                                <div className="form-section">
                                    <label className="form-label">Break Time: {breakMinutes} minutes</label>
                                    <div className="break-options">
                                        {breakOptions.map(minutes => (
                                            <button
                                                key={minutes}
                                                className={`break-option ${breakMinutes === minutes ? 'selected' : ''}`}
                                                onClick={() => setBreakMinutes(minutes)}
                                                type="button"
                                            >
                                                {minutes}m
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Hours Summary */}
                                <div className="hours-summary">
                                    <div className="hours-label">Total Hours</div>
                                    <div className="hours-value">{totalHours.toFixed(1)}h</div>
                                    <div className="hours-breakdown">
                                        {(() => {
                                            if (!startTime || !endTime) return 'Set start and end times';

                                            const start = parse(startTime, 'HH:mm', new Date());
                                            const end = parse(endTime, 'HH:mm', new Date());
                                            let totalMinutes = differenceInMinutes(end, start);

                                            if (totalMinutes < 0) {
                                                totalMinutes = differenceInMinutes(end, start) + (24 * 60);
                                            }

                                            const shiftHours = totalMinutes / 60;
                                            const breakHours = breakMinutes / 60;

                                            return `${shiftHours.toFixed(1)}h shift - ${breakHours.toFixed(1)}h break = ${totalHours.toFixed(1)}h work`;
                                        })()}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Actions */}
                <div className="modal-actions">
                    <button className="btn btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-assign"
                        onClick={handleAssign}
                        disabled={!availabilityInfo?.isAvailable || totalHours <= 0}
                    >
                        <CheckCircle size={18} />
                        Assign Staff
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AssignStaffModal;
