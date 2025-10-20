import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import StatCard from '../../components/StatsCard';
import { format, parseISO } from 'date-fns';

const StaffDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStaffDetails = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/api/teams/${id}`);
                setStaff(response.data);
            } catch (err) {
                setError('Failed to load staff member details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStaffDetails();
    }, [id]);

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete ${staff.first_name} ${staff.last_name}?`)) {
            try {
                await axios.delete(`/api/teams/${id}`);
                alert('Staff member deleted successfully.');
                navigate('/staff');
            } catch (err) {
                alert('Failed to delete staff member.');
                console.error(err);
            }
        }
    };

    if (loading) return <p>Loading staff details...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!staff) return <p>No staff member data found.</p>;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const scheduleKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
        <>
            <header>
                <div>
                    <Link to="/staff" className="btn-link" style={{ marginBottom: '10px', display: 'block' }}>&larr; Back to Staff Directory</Link>
                    <h1>{staff.first_name} {staff.last_name}</h1>
                </div>
                <div>
                    <button onClick={handleDelete} className="btn btn-danger">Delete Member</button>
                </div>
            </header>

            <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <StatCard title="Position" value={staff.position} />
                <StatCard title="Branch" value={staff.branch} />
                <StatCard title="Hourly Rate" value={`$${Number(staff.hourly_rate || 0).toFixed(2)}`} />
                <StatCard title="Status" value={staff.status} type={staff.status === 'active' ? 'decrease' : 'increase'} />
            </div>

            <div className="card">
                <h3>Personal Information</h3>
                <div className="metrics-grid">
                    <p><span>Full Name:</span> <strong>{staff.first_name} {staff.last_name}</strong></p>
                    <p><span>Email:</span> <strong>{staff.email}</strong></p>
                    <p><span>Phone Number:</span> <strong>{staff.phone_number || 'N/A'}</strong></p>
                    <p><span>Date of Birth:</span> <strong>{staff.date_of_birth ? format(parseISO(staff.date_of_birth), 'dd MMMM yyyy') : 'N/A'}</strong></p>
                    <p><span>Address:</span> <strong>{staff.home_address || 'N/A'}</strong></p>
                </div>
            </div>

            <div className="card">
                <h3>Employment Details</h3>
                <div className="metrics-grid">
                    <p><span>Department:</span> <strong>{staff.department}</strong></p>
                    <p><span>Employment Type:</span> <strong>{staff.employment_type}</strong></p>
                    <p><span>Start Date:</span> <strong>{staff.start_date ? format(parseISO(staff.start_date), 'dd MMMM yyyy') : 'N/A'}</strong></p>
                    <p><span>Staff Code:</span> <strong>{staff.staff_code}</strong></p>
                    <p><span>Tax File Number:</span> <strong>{staff.tax_file_number || 'N/A'}</strong></p>
                </div>
            </div>

            <div className="card">
                <h3>Work Schedule</h3>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Status</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scheduleKeys.map((key, index) => {
                                const daySchedule = staff.schedule?.[key];
                                return (
                                    <tr key={key}>
                                        <td>{days[index]}</td>
                                        <td>{daySchedule && daySchedule.active ? 'Working' : 'Off'}</td>
                                        <td>{daySchedule && daySchedule.active ? `${daySchedule.start} - ${daySchedule.end}` : '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default StaffDetail;
