import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { differenceInMinutes } from 'date-fns';

const Stepper = ({ steps, currentStep }) => (
    <div className="stepper-pills">
        {steps.map((step, index) => (
            <div key={index} className={`step-item ${index + 1 <= currentStep ? 'active' : ''}`}>
                <span>{step}</span>
            </div>
        ))}
    </div>
);

const AddTeamMemberForm = ({ onClose, onSave, initialData = null }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const steps = ['Personal', 'Employment', 'Schedule', 'Permissions', 'KPIs'];

    const initialSchedule = {
        monday: { active: false, start: '09:00', end: '17:00' },
        tuesday: { active: false, start: '09:00', end: '17:00' },
        wednesday: { active: false, start: '09:00', end: '17:00' },
        thursday: { active: false, start: '09:00', end: '17:00' },
        friday: { active: false, start: '09:00', end: '17:00' },
        saturday: { active: false, start: '10:00', end: '16:00' },
        sunday: { active: false, start: '10:00', end: '16:00' },
    };

    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', phone_number: '', date_of_birth: '',
        tax_file_number: '', home_address: '', emergency_contact_name: '',
        emergency_contact_phone: '',
        position: '', branch: '', department: '', employment_type: 'Full-Time',
        hourly_rate: '', start_date: '', staff_code: '',
        schedule: initialSchedule, // Always start with a valid schedule object
    });

    // --- DEFINITIVE FIX: Use useEffect to safely merge initialData ---
    // This runs when the component mounts or when `initialData` changes.
    useEffect(() => {
        if (initialData) {
            setFormData(prevData => ({
                ...prevData,
                ...initialData,
                // This is the key: ensure schedule is an object. If initialData.schedule is null, use the default.
                schedule: initialData.schedule || initialSchedule,
                // Also, ensure date fields are formatted correctly for the input type="date"
                date_of_birth: initialData.date_of_birth ? initialData.date_of_birth.split('T')[0] : '',
                start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
            }));
        }
    }, [initialData]);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleScheduleChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            schedule: { ...prev.schedule, [day]: { ...prev.schedule[day], [field]: value } }
        }));
    };

    const calculateHours = (start, end) => {
        if (!start || !end) return 0;
        try {
            const startTime = new Date(`1970-01-01T${start}:00`);
            const endTime = new Date(`1970-01-01T${end}:00`);
            const diff = differenceInMinutes(endTime, startTime);
            return diff > 0 ? diff / 60 : 0;
        } catch (e) { return 0; }
    };

    const weeklySummary = useMemo(() => {
        // This line will no longer crash because `formData.schedule` is guaranteed to be an object
        const totalHours = Object.values(formData.schedule).reduce((acc, day) => {
            if (day.active) {
                const hours = calculateHours(day.start, day.end);
                return acc + (hours > 0 ? hours : 0);
            }
            return acc;
        }, 0);
        const estimatedPay = totalHours * (parseFloat(formData.hourly_rate) || 0);
        return { totalHours, estimatedPay };
    }, [formData.schedule, formData.hourly_rate]);

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
    const handlePrevious = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    const applyScheduleTemplate = () => { }; // Placeholder for template logic

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setErrors({});
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
            onSave();
            onClose();
        } catch (err) {
            if (err.response && err.response.status === 422) {
                setErrors(err.response.data.errors);
                alert('Please review the form for errors.');
            } else {
                alert('An unexpected error occurred. Please check the server logs.');
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="add-member-form">
            <div className="add-member-header">
                <h3>{initialData ? 'Edit Team Member' : 'Add New Team Member'}</h3>
                <span>Step {currentStep} of 5 - {steps[currentStep - 1]}</span>
            </div>
            <div className="send-form-banner">
                <p>Send as Link Instead? Package this form and send it to the applicant.</p>
                <button type="button" className="btn btn-secondary">📧 Send Form Link</button>
            </div>

            <Stepper steps={steps} currentStep={currentStep} />

            <div className="form-body">
                {currentStep === 1 && (
                    <div className="form-step active">
                        <h4>Personal Information</h4>
                        <div className="form-grid"><div className="form-group"><label>First Name *</label><input type="text" name="first_name" value={formData.first_name} onChange={handleChange} /></div><div className="form-group"><label>Last Name *</label><input type="text" name="last_name" value={formData.last_name} onChange={handleChange} /></div></div>
                        <div className="form-group"><label>Email Address *</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
                        <div className="form-grid"><div className="form-group"><label>Phone Number *</label><input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} /></div><div className="form-group"><label>Date of Birth</label><input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} /></div></div>
                        <div className="form-group"><label>Tax File Number (TFN)</label><input type="text" name="tax_file_number" value={formData.tax_file_number} onChange={handleChange} /></div>
                        <div className="form-group"><label>Home Address</label><textarea name="home_address" value={formData.home_address} onChange={handleChange} rows="2"></textarea></div>
                        <div className='form-group'><label>Staff Code *</label><input type="password" name="staff_code" value={formData.staff_code} onChange={handleChange} placeholder="Unique code for staff login" autoComplete="new-password" />{errors.staff_code && <span className="error-message">{errors.staff_code[0]}</span>}</div>
                        <div className="form-grid"><div className="form-group"><label>Emergency Contact</label><input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} /></div><div className="form-group"><label>Emergency Phone</label><input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} /></div></div>
                    </div>
                )}
                {currentStep === 2 && (
                    <div className="form-step active">
                        <h4>Employment Details</h4>
                        <div className="form-grid"><div className="form-group"><label>Position *</label><select name="position" value={formData.position} onChange={handleChange}><option value="">Select position</option><option>Manager</option><option>Barista</option></select></div><div className="form-group"><label>Branch *</label><select name="branch" value={formData.branch} onChange={handleChange}><option value="">Select branch</option><option>Sydney CBD</option></select></div></div>
                        <div className="form-grid"><div className="form-group"><label>Department *</label><select name="department" value={formData.department} onChange={handleChange}><option value="">Select department</option><option>Front of House</option></select></div><div className="form-group"><label>Employment Type</label><select name="employment_type" value={formData.employment_type} onChange={handleChange}><option>Full-Time</option><option>Part-Time</option></select></div></div>
                        <div className="form-grid"><div className="form-group"><label>Hourly Rate (AUD) *</label><input type="number" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} step="0.01" /></div><div className="form-group"><label>Start Date</label><input type="date" name="start_date" value={formData.start_date} onChange={handleChange} /></div></div>
                        <div className="info-box blue">Position Impact Analysis</div>
                    </div>
                )}
                {currentStep === 3 && (
                    <div className="form-step active">
                        <h4>Work Schedule</h4>
                        <p className="form-description">Set the regular weekly schedule for this team member</p>
                        <div className="schedule-builder">{Object.keys(formData.schedule).map(day => (<div key={day} className="schedule-row"><input type="checkbox" checked={formData.schedule[day].active} onChange={e => handleScheduleChange(day, 'active', e.target.checked)} /><label>{day}</label><input type="time" value={formData.schedule[day].start} onChange={e => handleScheduleChange(day, 'start', e.target.value)} disabled={!formData.schedule[day].active} /><span>to</span><input type="time" value={formData.schedule[day].end} onChange={e => handleScheduleChange(day, 'end', e.target.value)} disabled={!formData.schedule[day].active} /><span className="hours-display">({calculateHours(formData.schedule[day].start, formData.schedule[day].end).toFixed(1)}h)</span></div>))}</div>
                        <div className="info-box green"><h4>Schedule Summary</h4><p><span>Total weekly hours:</span> <strong>{weeklySummary.totalHours.toFixed(2)} hours</strong></p><p><span>Estimated weekly pay:</span> <strong>${weeklySummary.estimatedPay.toFixed(2)}</strong></p></div>
                        <div className="info-box yellow"><h4>⚡️ Quick Schedule Templates</h4><div className="template-buttons"><button type="button" onClick={() => applyScheduleTemplate('full-time')}>Full-time (M-F)</button><button type="button" onClick={() => applyScheduleTemplate('weekends')}>Part-time (Weekends)</button></div></div>
                    </div>
                )}
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {currentStep > 1 && <button type="button" className="btn btn-secondary" onClick={handlePrevious}>← Previous</button>}
                    {currentStep < 3 && <button type="button" className="btn btn-primary" onClick={handleNext}>Next →</button>}
                    {currentStep === 3 && <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Member'}</button>}
                </div>
            </div>
        </form>
    );
};

export default AddTeamMemberForm;
