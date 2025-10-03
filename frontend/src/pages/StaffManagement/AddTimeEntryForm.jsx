import React, { useState } from 'react';
import axios from 'axios';

const AddTimeEntryForm = ({ onClose, onSave, teamMembers }) => {
    const [formData, setFormData] = useState({
        employee_id: '',
        date: new Date().toISOString().split('T')[0], // Default to today
        clock_in: '',
        clock_out: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    // State to hold validation errors from the backend
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear the error for a field when the user starts typing in it
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({}); // Clear previous errors before submitting

        try {
            await axios.post('/api/timesheets', formData);
            alert('Time entry added successfully!');
            onSave(); // This will re-fetch the data on the main page
            onClose(); // This will close the modal
        } catch (err) {
            // Handle the 422 Validation Error from Laravel
            if (err.response && err.response.status === 422) {
                // The 'errors' object from Laravel contains validation messages for each field
                setErrors(err.response.data.errors);
            } else {
                // For any other type of error (e.g., 500 server error)
                alert('An unexpected error occurred. Please try again.');
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
                <label htmlFor="employee_id">Employee</label>
                <select
                    id="employee_id"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleChange}
                    required
                >
                    <option value="" disabled>Select an employee</option>
                    {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                        </option>
                    ))}
                </select>
                {/* Display the validation error message if it exists */}
                {errors.employee_id && <p className="error-text">{errors.employee_id[0]}</p>}
            </div>

            <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                />
                {errors.date && <p className="error-text">{errors.date[0]}</p>}
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                    <label htmlFor="clock_in">Clock In Time</label>
                    <input
                        type="time"
                        id="clock_in"
                        name="clock_in"
                        value={formData.clock_in}
                        onChange={handleChange}
                        required
                    />
                    {errors.clock_in && <p className="error-text">{errors.clock_in[0]}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="clock_out">Clock Out Time</label>
                    <input
                        type="time"
                        id="clock_out"
                        name="clock_out"
                        value={formData.clock_out}
                        onChange={handleChange}
                        required
                    />
                    {/* This will now display "The clock out time must be after the clock in time." */}
                    {errors.clock_out && <p className="error-text">{errors.clock_out[0]}</p>}
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                ></textarea>
                {errors.notes && <p className="error-text">{errors.notes[0]}</p>}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Entry'}
                </button>
            </div>
        </form>
    );
};

export default AddTimeEntryForm;
