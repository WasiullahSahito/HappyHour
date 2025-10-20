import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const RegisterStaff = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        // Personal
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        date_of_birth: '',
        home_address: '',
        tax_file_number: '', // <-- Field added to state
        emergency_contact_name: '',
        emergency_contact_phone: '',
        // Employment
        position: '',
        branch: '',
        department: '',
        employment_type: 'Full-Time',
        start_date: '',
        // Security
        staff_code: '',
        staff_code_confirmation: '',
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

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
        setSuccessMessage('');

        if (formData.staff_code !== formData.staff_code_confirmation) {
            setErrors({ staff_code_confirmation: ['The staff codes do not match.'] });
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('/api/staff/register', formData);
            setSuccessMessage(response.data.message);
        } catch (err) {
            if (err.response && err.response.status === 422) {
                setErrors(err.response.data.errors);
            } else {
                setErrors({ form: [err.response?.data?.message || 'An unexpected error occurred.'] });
            }
        } finally {
            setLoading(false);
        }
    };

    if (successMessage) {
        return (
            <div className="time-clock-page-centered">
                <div className="time-clock-login-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
                    <div style={{ padding: '20px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px' }}>
                        <h3>Registration Submitted!</h3>
                        <p>{successMessage}</p>
                        <button onClick={() => navigate('/staff/time-clock')} className="btn-block" style={{ marginTop: '15px' }}>
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="time-clock-page-centered">
            <div className="time-clock-login-card" style={{ maxWidth: '700px', textAlign: 'left' }}>
                <h2 style={{ textAlign: 'center' }}>Staff Registration</h2>
                <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2rem' }}>
                    Complete the form to create your account. A manager will set your pay rate and activate your account later.
                </p>

                <form onSubmit={handleSubmit}>
                    <h4>Personal Information</h4>
                    <div className="form-grid"><div className="form-group"><label>First Name *</label><input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required />{errors.first_name && <small className="error-text">{errors.first_name[0]}</small>}</div><div className="form-group"><label>Last Name *</label><input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required />{errors.last_name && <small className="error-text">{errors.last_name[0]}</small>}</div></div>
                    <div className="form-group"><label>Email Address *</label><input type="email" name="email" value={formData.email} onChange={handleChange} required />{errors.email && <small className="error-text">{errors.email[0]}</small>}</div>
                    <div className="form-grid"><div className="form-group"><label>Phone Number *</label><input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} required />{errors.phone_number && <small className="error-text">{errors.phone_number[0]}</small>}</div><div className="form-group"><label>Date of Birth *</label><input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required />{errors.date_of_birth && <small className="error-text">{errors.date_of_birth[0]}</small>}</div></div>

                    {/* --- FIELD ADDED HERE --- */}
                    <div className="form-group">
                        <label>Tax File Number (TFN)</label>
                        <input type="text" name="tax_file_number" value={formData.tax_file_number} onChange={handleChange} />
                        {errors.tax_file_number && <small className="error-text">{errors.tax_file_number[0]}</small>}
                    </div>

                    <div className="form-group"><label>Home Address *</label><textarea name="home_address" value={formData.home_address} onChange={handleChange} rows="2" required></textarea>{errors.home_address && <small className="error-text">{errors.home_address[0]}</small>}</div>
                    <div className="form-grid"><div className="form-group"><label>Emergency Contact Name *</label><input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} required />{errors.emergency_contact_name && <small className="error-text">{errors.emergency_contact_name[0]}</small>}</div><div className="form-group"><label>Emergency Contact Phone *</label><input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} required />{errors.emergency_contact_phone && <small className="error-text">{errors.emergency_contact_phone[0]}</small>}</div></div>

                    <hr style={{ margin: '30px 0' }} />
                    <h4>Employment Details</h4>
                    <div className="form-grid"><div className="form-group"><label>Position *</label><select name="position" value={formData.position} onChange={handleChange} required><option value="">Select position</option><option>Manager</option><option>Barista</option><option>Chef</option></select>{errors.position && <small className="error-text">{errors.position[0]}</small>}</div><div className="form-group"><label>Branch *</label><select name="branch" value={formData.branch} onChange={handleChange} required><option value="">Select branch</option><option>Sydney CBD</option><option>Melbourne Central</option></select>{errors.branch && <small className="error-text">{errors.branch[0]}</small>}</div></div>
                    <div className="form-grid"><div className="form-group"><label>Department *</label><select name="department" value={formData.department} onChange={handleChange} required><option value="">Select department</option><option>Front of House</option><option>Back of House</option></select>{errors.department && <small className="error-text">{errors.department[0]}</small>}</div><div className="form-group"><label>Employment Type</label><select name="employment_type" value={formData.employment_type} onChange={handleChange} required><option>Full-Time</option><option>Part-Time</option><option>Casual</option></select>{errors.employment_type && <small className="error-text">{errors.employment_type[0]}</small>}</div></div>
                    <div className="form-group"><label>Anticipated Start Date *</label><input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required />{errors.start_date && <small className="error-text">{errors.start_date[0]}</small>}</div>

                    <hr style={{ margin: '30px 0' }} />
                    <h4>Create Login Code</h4>
                    <div className="form-grid">
                        <div className="form-group"><label>Staff Code (4+ characters) *</label><input type="password" name="staff_code" value={formData.staff_code} onChange={handleChange} required autoComplete="new-password" />{errors.staff_code && <small className="error-text">{errors.staff_code[0]}</small>}</div>
                        <div className="form-group"><label>Confirm Staff Code *</label><input type="password" name="staff_code_confirmation" value={formData.staff_code_confirmation} onChange={handleChange} required autoComplete="new-password" />{errors.staff_code_confirmation && <small className="error-text">{errors.staff_code_confirmation[0]}</small>}</div>
                    </div>

                    {errors.form && <p className="error-message">{errors.form[0]}</p>}
                    <button type="submit" className="btn-block" disabled={loading} style={{ marginTop: '20px' }}>
                        {loading ? 'Submitting...' : 'Complete Registration'}
                    </button>
                </form>
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <Link to="/staff/time-clock" className="btn-link">Already have an account? Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterStaff;
