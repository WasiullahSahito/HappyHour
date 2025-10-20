import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import AddTeamMemberForm from './AddTeamMemberForm'; // The form we just fixed
import axios from 'axios';
import { parse, differenceInMinutes } from 'date-fns';

// This can be a simplified version or the full one from previous turns
const WorkScheduleModal = ({ staff, onClose }) => {
    if (!staff) return null;
    return (
        <Modal isOpen={true} onClose={onClose} title={`Work Schedule: ${staff.first_name}`}>
            <p>Schedule details will be displayed here.</p>
        </Modal>
    );
};

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
        setLoading(true); setError(null);
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

    const handleViewSchedule = (staffMember) => {
        setSelectedStaff(staffMember);
        setIsScheduleModalOpen(true);
    };

    const handleEditDetails = (staffMember) => {
        setSelectedStaff(staffMember);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            try {
                await axios.delete(`/api/teams/${id}`);
                alert(`${name} has been deleted.`);
                fetchTeamMembers();
            } catch (err) {
                alert(`Failed to delete ${name}.`);
            }
        }
    };

    const handleStatusToggle = async (member) => {
        const newStatus = member.status === 'active' ? 'inactive' : 'active';
        try {
            await axios.put(`/api/teams/${member.id}/status`, { status: newStatus });
            setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: newStatus } : m));
        } catch (err) {
            alert('Failed to update status.');
        }
    };

    const activeStaffCount = teamMembers.filter(member => member.status === 'active').length;
    const averageHourlyRate = teamMembers.length > 0 ? (teamMembers.reduce((sum, member) => sum + Number(member.hourly_rate), 0) / teamMembers.length) : 0;

    return (
        <div>
            <header>
                <h1>Staff Management</h1>
                <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>+ Add Team Member</button>
            </header>

            <div className="grid-container">
                <div className="card stat-card"><div className="stat-card-title">Total Staff</div><div className="stat-card-value">{teamMembers.length}</div></div>
                <div className="card stat-card"><div className="stat-card-title">Active Staff</div><div className="stat-card-value">{activeStaffCount}</div></div>
                <div className="card stat-card"><div className="stat-card-title">Average Hourly Rate</div><div className="stat-card-value">${averageHourlyRate.toFixed(2)}</div></div>
            </div>

            <div className="card table-container">
                {loading ? <p>Loading...</p> : error ? <p className="error-message">{error}</p> : (
                    <table className="data-table">
                        <thead>
                            <tr><th>Staff Member</th><th>Position & Branch</th><th>Hourly Rate</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {teamMembers.map(member => (
                                <tr key={member.id}>
                                    <td><strong>{member.first_name} {member.last_name}</strong><br /><small>{member.email}</small></td>
                                    <td><strong>{member.position}</strong><br /><small>{member.branch}</small></td>
                                    <td><strong>${Number(member.hourly_rate || 0).toFixed(2)}/hr</strong><br /><small>{member.employment_type}</small></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <label className="switch">
                                                <input type="checkbox" checked={member.status === 'active'} onChange={() => handleStatusToggle(member)} />
                                                <span className="slider round"></span>
                                            </label>
                                            <span style={{ textTransform: 'capitalize' }}>{member.status}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <Link to={`/staff/${member.id}`} className="btn-link">View Detail</Link>
                                            <a onClick={() => handleViewSchedule(member)} className="btn-link">Schedule</a>
                                            <a onClick={() => handleEditDetails(member)} className="btn-link">Edit</a>
                                            <button onClick={() => handleDelete(member.id, `${member.first_name} ${member.last_name}`)} className="btn-delete">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} modalClass="modal-lg modal-no-header">
                <AddTeamMemberForm onClose={() => setIsAddModalOpen(false)} onSave={fetchTeamMembers} />
            </Modal>

            {isEditModalOpen && (
                <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} modalClass="modal-lg modal-no-header">
                    <AddTeamMemberForm onClose={() => setIsEditModalOpen(false)} onSave={fetchTeamMembers} initialData={selectedStaff} />
                </Modal>
            )}

            {isScheduleModalOpen && <WorkScheduleModal staff={selectedStaff} onClose={() => setIsScheduleModalOpen(false)} />}
        </div>
    );
};

export default StaffDirectory;
