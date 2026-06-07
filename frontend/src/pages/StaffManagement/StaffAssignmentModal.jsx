import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Target, Check, Search } from 'lucide-react';
import { format, parse, differenceInHours } from 'date-fns';

const StaffAssignmentModal = ({ isOpen, onClose, teamMembers, prepAreas, currentWeekStart, onAssignStaff }) => {
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [selectedPrepArea, setSelectedPrepArea] = useState(null);
    const [selectedDay, setSelectedDay] = useState('monday');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const days = [
        { key: 'monday', label: 'Mon' },
        { key: 'tuesday', label: 'Tue' },
        { key: 'wednesday', label: 'Wed' },
        { key: 'thursday', label: 'Thu' },
        { key: 'friday', label: 'Fri' },
        { key: 'saturday', label: 'Sat' },
        { key: 'sunday', label: 'Sun' }
    ];

    const filteredTeamMembers = teamMembers.filter(member => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return member.first_name.toLowerCase().includes(searchLower) ||
            member.last_name.toLowerCase().includes(searchLower) ||
            member.position.toLowerCase().includes(searchLower);
    });

    const calculateDuration = () => {
        const start = parse(startTime, 'HH:mm', new Date());
        const end = parse(endTime, 'HH:mm', new Date());
        let duration = differenceInHours(end, start);

        if (duration < 0) {
            duration += 24;
        }

        return duration;
    };

    const handleAssign = async () => {
        if (!selectedStaff || !selectedPrepArea) {
            alert('Please select both staff member and prep area');
            return;
        }

        setLoading(true);
        try {
            await onAssignStaff(selectedStaff.id, selectedPrepArea.id, selectedDay.toUpperCase(), {
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

    if (!isOpen) return null;

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
                maxWidth: '600px',
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
                        <User size={24} />
                        <h3 style={{ margin: 0 }}>Assign Staff Member</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {/* Search Bar */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Search staff members..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 10px 40px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Staff Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '10px' }}>Select Staff Member</h4>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '10px',
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}>
                            {filteredTeamMembers.map(member => (
                                <div
                                    key={member.id}
                                    onClick={() => setSelectedStaff(member)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px',
                                        border: `1px solid ${selectedStaff?.id === member.id ? '#3b82f6' : '#e2e8f0'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background: selectedStaff?.id === member.id ? '#eff6ff' : 'white',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
                                        fontSize: '16px',
                                        marginRight: '12px'
                                    }}>
                                        {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                            {member.first_name} {member.last_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            {member.position}
                                        </div>
                                    </div>
                                    {selectedStaff?.id === member.id && (
                                        <Check size={20} color="#10b981" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Prep Area Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '10px' }}>Select Prep Area</h4>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '10px'
                        }}>
                            {prepAreas.map(area => (
                                <div
                                    key={area.id}
                                    onClick={() => setSelectedPrepArea(area)}
                                    style={{
                                        padding: '12px',
                                        border: `1px solid ${selectedPrepArea?.id === area.id ? '#3b82f6' : '#e2e8f0'}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background: selectedPrepArea?.id === area.id ? '#eff6ff' : 'white',
                                        textAlign: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        margin: '0 auto 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#f1f5f9',
                                        borderRadius: '8px'
                                    }}>
                                        {area.name.includes('Kitchen') ? <Target size={20} /> :
                                            area.name.includes('Bar') ? <Target size={20} /> :
                                                area.name.includes('Front') ? <Target size={20} /> :
                                                    <Target size={20} />}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{area.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Day and Time Selection */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '20px',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <h4 style={{ marginBottom: '10px' }}>Select Day</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

                        <div>
                            <h4 style={{ marginBottom: '10px' }}>Shift Time</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                </div>
                                <div style={{
                                    padding: '8px 12px',
                                    background: '#f1f5f9',
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    fontWeight: 600
                                }}>
                                    Duration: {duration} hours
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    {selectedStaff && selectedPrepArea && (
                        <div style={{
                            background: '#f0f9ff',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #bae6fd'
                        }}>
                            <h4 style={{ marginBottom: '10px', color: '#0369a1' }}>Assignment Summary</h4>
                            <div style={{ fontSize: '14px', color: '#0c4a6e' }}>
                                <div><strong>Staff:</strong> {selectedStaff.first_name} {selectedStaff.last_name}</div>
                                <div><strong>Prep Area:</strong> {selectedPrepArea.name}</div>
                                <div><strong>Day:</strong> {days.find(d => d.key === selectedDay)?.label}</div>
                                <div><strong>Time:</strong> {startTime} - {endTime} ({duration} hours)</div>
                            </div>
                        </div>
                    )}
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
                        disabled={!selectedStaff || !selectedPrepArea || loading}
                        style={{
                            padding: '10px 20px',
                            background: !selectedStaff || !selectedPrepArea || loading ? '#93c5fd' : '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: !selectedStaff || !selectedPrepArea || loading ? 'not-allowed' : 'pointer',
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

export default StaffAssignmentModal;
