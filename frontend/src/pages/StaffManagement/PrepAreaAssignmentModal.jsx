import React, { useState } from 'react';
import { X, Clock, User, Calendar, Target, Check, AlertCircle } from 'lucide-react';
import { format, parse, addHours, differenceInHours } from 'date-fns';

const PrepAreaAssignmentModal = ({ isOpen, onClose, prepArea, weekStart, teamMembers, onAssign, prepAreaStats }) => {
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [selectedDay, setSelectedDay] = useState('monday');
    const [loading, setLoading] = useState(false);

    const days = [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' }
    ];

    const handleAssign = async () => {
        if (!selectedStaff) {
            alert('Please select a staff member');
            return;
        }

        setLoading(true);
        try {
            await onAssign(selectedStaff.id, {
                day: selectedDay.toUpperCase(),
                startTime,
                endTime,
                duration: calculateDuration()
            });
            onClose();
        } catch (error) {
            console.error('Assignment failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateDuration = () => {
        const start = parse(startTime, 'HH:mm', new Date());
        const end = parse(endTime, 'HH:mm', new Date());
        let duration = differenceInHours(end, start);

        if (duration < 0) {
            duration += 24;
        }

        return duration;
    };

    if (!isOpen) return null;

    const targetHours = prepAreaStats.daily_targets?.[selectedDay] || 0;
    const assignedHours = prepAreaStats.assigned_hours?.[selectedDay] || 0;
    const remainingHours = prepAreaStats.remaining_hours?.[selectedDay] || targetHours;
    const duration = calculateDuration();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Target size={24} />
                        <h3 style={{ margin: 0 }}>Assign to {prepArea.name}</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    <div style={{
                        background: '#f8fafc',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Target Hours</div>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                                    {targetHours.toFixed(1)}h
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Assigned</div>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                                    {assignedHours.toFixed(1)}h
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Remaining</div>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: remainingHours > 0 ? '#ef4444' : '#10b981' }}>
                                    {remainingHours.toFixed(1)}h
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${targetHours > 0 ? (assignedHours / targetHours) * 100 : 0}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                            }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Select Day</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {days.map(day => (
                                <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => setSelectedDay(day.key)}
                                    style={{
                                        padding: '8px 12px',
                                        border: `1px solid ${selectedDay === day.key ? '#3b82f6' : '#d1d5db'}`,
                                        background: selectedDay === day.key ? '#eff6ff' : 'white',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Select Staff Member</label>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            {teamMembers.map(staff => (
                                <div
                                    key={staff.id}
                                    onClick={() => setSelectedStaff(staff)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        background: selectedStaff?.id === staff.id ? '#eff6ff' : 'white',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}
                                >
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        marginRight: '12px'
                                    }}>
                                        {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                            {staff.first_name} {staff.last_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            {staff.position}
                                        </div>
                                    </div>
                                    {selectedStaff?.id === staff.id && (
                                        <Check size={20} color="#10b981" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Shift Time</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                            <span>to</span>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                            <div style={{
                                padding: '8px 12px',
                                background: '#f1f5f9',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 600,
                                minWidth: '60px'
                            }}>
                                {duration}h
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: remainingHours - duration < 0 ? '#fef2f2' : '#f0f9ff',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        border: `1px solid ${remainingHours - duration < 0 ? '#fecaca' : '#bae6fd'}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                            {remainingHours - duration < 0 ? <AlertCircle size={16} color="#dc2626" /> : <Check size={16} color="#059669" />}
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: remainingHours - duration < 0 ? '#dc2626' : '#059669'
                            }}>
                                Assignment Summary
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', color: remainingHours - duration < 0 ? '#991b1b' : '#065f46' }}>
                            {selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}` : 'Staff member'} will work for {duration} hours on {selectedDay}.
                            {remainingHours - duration < 0 ? (
                                <div style={{ marginTop: '5px' }}>
                                    <strong>Warning:</strong> This assignment exceeds remaining target hours by {(duration - remainingHours).toFixed(1)} hours.
                                </div>
                            ) : (
                                <div style={{ marginTop: '5px' }}>
                                    Remaining hours after assignment: {(remainingHours - duration).toFixed(1)}h
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: '20px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#475569'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedStaff || loading || (remainingHours - duration < 0)}
                        style={{
                            padding: '10px 20px',
                            background: !selectedStaff || loading || (remainingHours - duration < 0) ? '#93c5fd' : '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: !selectedStaff || loading || (remainingHours - duration < 0) ? 'not-allowed' : 'pointer',
                            color: 'white',
                            fontWeight: 600
                        }}
                    >
                        {loading ? 'Assigning...' : 'Assign Staff'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrepAreaAssignmentModal;
