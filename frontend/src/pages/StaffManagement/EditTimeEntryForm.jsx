import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const EditTimeEntryForm = ({ entry, onClose, onSave, teamMembers }) => {
    // Parse UTC stored time into local date and time for the form
    const parseLocalDateTime = (utcDateString) => {
        if (!utcDateString) return { date: '', time: '' };
        const date = new Date(utcDateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return {
            date: `${year}-${month}-${day}`,
            time: `${hours}:${minutes}`
        };
    };

    const clockInParsed = parseLocalDateTime(entry.clock_in);
    const clockOutParsed = parseLocalDateTime(entry.clock_out);

    const [formData, setFormData] = useState({
        date: clockInParsed.date,
        clock_in: clockInParsed.time,
        clock_out: clockOutParsed.time,
        notes: entry.notes || '',
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

        // Validate clock out after clock in
        if (formData.clock_in && formData.clock_out) {
            const [inH, inM] = formData.clock_in.split(':').map(Number);
            const [outH, outM] = formData.clock_out.split(':').map(Number);
            if (outH < inH || (outH === inH && outM <= inM)) {
                setErrors({ clock_out: ['Clock out must be after clock in'] });
                setLoading(false);
                return;
            }
        }

        const loadingToast = toast.loading('Updating time entry...');
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        try {
            await axios.put(`/api/timesheets/${entry.id}`, {
                date: formData.date,
                clock_in: formData.clock_in,
                clock_out: formData.clock_out,
                // ✅ FIX: Do NOT force 'Manual entry' – send null if blank
                notes: formData.notes.trim() || null,
            }, {
                headers: { 'Timezone': userTimezone }
            });
            toast.success('Time entry updated!', { id: loadingToast });
            onSave();   // refresh data
            onClose();  // close modal
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors);
                toast.error('Please correct the errors.', { id: loadingToast });
            } else {
                toast.error('Update failed.', { id: loadingToast });
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const employee = teamMembers.find(m => m.id === entry.team_id);

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
                <label>Employee</label>
                <input
                    type="text"
                    value={employee ? `${employee.first_name} ${employee.last_name}` : ''}
                    disabled
                    className="form-input"
                    style={{ background: '#f5f5f5' }}
                />
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
                    className={errors.date ? 'error' : ''}
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
                        className={errors.clock_in ? 'error' : ''}
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
                        className={errors.clock_out ? 'error' : ''}
                    />
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
                />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};

export default EditTimeEntryForm;
