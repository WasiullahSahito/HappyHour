import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal'; // Assuming Modal component is in `src/components/`
import axios from 'axios';
import { parse } from 'date-fns';

// ===================================================================================
//  HELPER COMPONENT 1: Form for Adding/Editing a Team Member
// ===================================================================================
const AddTeamMemberForm = ({ onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        position: '',
        branch: '',
        employment_type: 'Full-Time',
        hourly_rate: '',
        ...initialData,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            if (initialData && initialData.id) {
                // Editing an existing member
                await axios.put(`/api/teams/${initialData.id}`, formData);
                alert('Team member updated successfully!');
            } else {
                // Creating a new member
                await axios.post('/api/teams', formData);
                alert('Team member added successfully!');
            }
            onSave(); // Re-fetch data on the parent page
            onClose(); // Close the modal
        } catch (err) {
            if (err.response && err.response.status === 422) {
                setErrors(err.response.data.errors);
            } else {
                alert('An unexpected error occurred. Please try again.');
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                    <label htmlFor="first_name">First Name</label>
                    <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required />
                    {errors.first_name && <p className="error-text">{errors.first_name[0]}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="last_name">Last Name</label>
                    <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required />
                    {errors.last_name && <p className="error-text">{errors.last_name[0]}</p>}
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                {errors.email && <p className="error-text">{errors.email[0]}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="phone_number">Phone Number</label>
                <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} />
                {errors.phone_number && <p className="error-text">{errors.phone_number[0]}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="position">Position</label>
                <input type="text" name="position" value={formData.position} onChange={handleChange} required />
                {errors.position && <p className="error-text">{errors.position[0]}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="branch">Branch</label>
                <input type="text" name="branch" value={formData.branch} onChange={handleChange} />
                {errors.branch && <p className="error-text">{errors.branch[0]}</p>}
            </div>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                    <label htmlFor="employment_type">Employment Type</label>
                    <select name="employment_type" value={formData.employment_type} onChange={handleChange}>
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Casual">Casual</option>
                    </select>
                    {errors.employment_type && <p className="error-text">{errors.employment_type[0]}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="hourly_rate">Hourly Rate ($)</label>
                    <input type="number" name="hourly_rate" step="0.01" placeholder="e.g. 25.50" value={formData.hourly_rate} onChange={handleChange} required />
                    {errors.hourly_rate && <p className="error-text">{errors.hourly_rate[0]}</p>}
                </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save Changes' : 'Add Member')}
                </button>
            </div>
        </form>
    );
};


// ===================================================================================
//  HELPER COMPONENT 2: Modal for Viewing a Staff Member's Schedule
// ===================================================================================
const WorkScheduleModal = ({ staff, onClose }) => {
    if (!staff) return null;

    const calculateDayHours = (dayDetails) => {
        if (dayDetails && dayDetails.active && dayDetails.start && dayDetails.end) {
            try {
                const start = parse(dayDetails.start, 'HH:mm', new Date());
                const end = parse(dayDetails.end, 'HH:mm', new Date());
                const diffMs = end.getTime() - start.getTime();
                return diffMs > 0 ? (diffMs / (1000 * 60 * 60)) : 0;
            } catch (e) { return 0; }
        }
        return 0;
    };

    const weeklyHours = staff.schedule ? Object.values(staff.schedule).reduce((total, day) => total + calculateDayHours(day), 0) : 0;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const scheduleKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
        <Modal isOpen={true} onClose={onClose} title={`${staff.first_name}'s Schedule`}>
            <div className="schedule-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
                {scheduleKeys.map((key, index) => {
                    const daySchedule = staff.schedule?.[key];
                    return (
                        <div className="schedule-day-box" key={key} style={{ textAlign: 'center', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                            <strong>{days[index]}</strong>
                            {daySchedule && daySchedule.active ? (
                                <>
                                    <span>{daySchedule.start} - {daySchedule.end}</span>
                                    <small>{calculateDayHours(daySchedule).toFixed(1)}h</small>
                                </>
                            ) : (
                                <span>Off</span>
                            )}
                        </div>
                    );
                })}
            </div>
            <h4 style={{ textAlign: 'right', marginTop: '20px' }}>Total Scheduled: {weeklyHours.toFixed(1)}h</h4>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
        </Modal>
    );
};


// ===================================================================================
//  MAIN COMPONENT: Staff Directory Page
// ===================================================================================
const StaffDirectory = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const fetchTeamMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/teams');
            setTeamMembers(response.data);
        } catch (err) {
            setError('Failed to load team members.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const handleViewSchedule = (staffMember) => { setSelectedStaff(staffMember); setIsScheduleModalOpen(true); };
    const handleEditDetails = (staffMember) => { setSelectedStaff(staffMember); setIsEditModalOpen(true); };
    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            try {
                await axios.delete(`/api/teams/${id}`);
                alert(`${name} has been deleted.`);
                fetchTeamMembers();
            } catch (err) {
                alert(`Failed to delete ${name}.`);
                console.error(err);
            }
        }
    };

    // Calculate the average hourly rate for staff members who have a rate assigned.
    const paidMembers = teamMembers.filter(member => Number(member.hourly_rate) > 0);
    const totalRateSum = paidMembers.reduce((sum, member) => sum + Number(member.hourly_rate), 0);
    const averageHourlyRate = paidMembers.length > 0 ? totalRateSum / paidMembers.length : 0;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Staff Management</h3>
                <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>+ Add Team Member</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#6c757d' }}>Total Staff</p>
                    <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{teamMembers.length}</p>
                </div>

                {/* --- STAT CARD UPDATED HERE --- */}
                <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#6c757d' }}>Average Hourly Rate</p>
                    <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                        ${averageHourlyRate.toFixed(2)}/hr
                    </p>
                </div>

                <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#6c757d' }}>Active Staff</p>
                    <p style={{ margin: '5px 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{teamMembers.length}</p>
                </div>
            </div>

            <div className="card" style={{ padding: '20px', borderRadius: '8px' }}>
                {loading ? <p>Loading team members...</p> : error ? <p className="error-message">{error}</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Staff Member</th>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Position & Branch</th>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Hourly Rate</th>
                                <th style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.map(member => (
                                <tr key={member.id}>
                                    <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>
                                        <strong>{member.first_name} {member.last_name}</strong><br />
                                        <small style={{ color: '#6c757d' }}>{member.email}</small>
                                    </td>
                                    <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>
                                        <strong>{member.position}</strong><br />
                                        <small style={{ color: '#6c757d' }}>{member.branch}</small>
                                    </td>
                                    <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>
                                        <strong>${Number(member.hourly_rate || 0).toFixed(2)}/hr</strong><br />
                                        <small style={{ color: '#6c757d' }}>{member.employment_type}</small>
                                    </td>
                                    <td style={{ padding: '16px 8px', borderTop: '1px solid #dee2e6' }}>
                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <a onClick={() => navigate(`/staff/time-clock/${member.id}`)} style={{ color: '#0d6efd', cursor: 'pointer', textDecoration: 'none' }}>Manage Timesheets</a>
                                            <a onClick={() => handleEditDetails(member)} style={{ color: '#0d6efd', cursor: 'pointer', textDecoration: 'none' }}>Edit Details</a>
                                            <a onClick={() => handleViewSchedule(member)} style={{ color: '#0d6efd', cursor: 'pointer', textDecoration: 'none' }}>View Schedule</a>
                                            <button onClick={() => handleDelete(member.id, `${member.first_name} ${member.last_name}`)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isAddModalOpen && <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Team Member"><AddTeamMemberForm onClose={() => setIsAddModalOpen(false)} onSave={fetchTeamMembers} /></Modal>}
            {isEditModalOpen && <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Team Member"><AddTeamMemberForm onClose={() => setIsEditModalOpen(false)} onSave={fetchTeamMembers} initialData={selectedStaff} /></Modal>}
            {isScheduleModalOpen && <WorkScheduleModal staff={selectedStaff} onClose={() => setIsScheduleModalOpen(false)} />}
        </div>
    );
};

export default StaffDirectory;
