import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { differenceInMinutes } from 'date-fns';
import { toast } from 'react-hot-toast';

// --- Country Codes ---
const countryCodes = [
    { name: "Australia", dial_code: "+61", code: "AU" },
    { name: "United States", dial_code: "+1", code: "US" },
    { name: "United Kingdom", dial_code: "+44", code: "GB" },
    { name: "New Zealand", dial_code: "+64", code: "NZ" },
    { name: "Singapore", dial_code: "+65", code: "SG" },
    { name: "Canada", dial_code: "+1", code: "CA" },
    { name: "India", dial_code: "+91", code: "IN" },
    { name: "Germany", dial_code: "+49", code: "DE" },
    { name: "France", dial_code: "+33", code: "FR" },
    { name: "South Africa", dial_code: "+27", code: "ZA" },
    { name: "South Korea", dial_code: "+82", code: "KR" },
    { name: "Japan", dial_code: "+81", code: "JP" },
    { name: "Italy", dial_code: "+39", code: "IT" },
    { name: "Brazil", dial_code: "+55", code: "BR" },
    { name: "Mexico", dial_code: "+52", code: "MX" },
    { name: "Russia", dial_code: "+7", code: "RU" },
    { name: "United Arab Emirates", dial_code: "+971", code: "AE" },
    { name: "Turkey", dial_code: "+90", code: "TR" },
    { name: "Saudi Arabia", dial_code: "+966", code: "SA" },
    { name: "Qatar", dial_code: "+974", code: "QA" },
    { name: "Lebanon", dial_code: "+961", code: "LB" },
    { name: "Syria", dial_code: "+963", code: "SY" },
    { name: "Kuwait", dial_code: "+965", code: "KW" },
    { name: "Oman", dial_code: "+968", code: "OM" },
    { name: "Yemen", dial_code: "+967", code: "YE" },
    { name: "Iraq", dial_code: "+964", code: "IQ" },
    { name: "Bahrain", dial_code: "+973", code: "BH" },
    { name: "Pakistan", dial_code: "+92", code: "PK" },
].sort((a, b) => a.name.localeCompare(b.name));

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
    const steps = ['Personal', 'Employment', 'Schedule'];

    // Calculate minimum date for date of birth (16 years ago from today)
    const getMinDateOfBirth = () => {
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
        return minDate.toISOString().split('T')[0];
    };

    // Get today's date for start date validation
    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

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
        first_name: '', last_name: '', email: '', date_of_birth: '',
        phone_country_code: '+61', phone_number: '',
        emergency_contact_name: '', emergency_phone_country_code: '+61', emergency_contact_phone: '',

        tax_file_number: '', home_address: '',
        position: 'Manager', branch: 'Sydney CBD', department: 'Front of House', employment_type: 'Full-Time',
        hourly_rate: '', start_date: '', staff_code: '',
        schedule: initialSchedule,
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showStaffCode, setShowStaffCode] = useState(false);

    // Validation function for schedule times
    const validateScheduleTimes = (schedule) => {
        const errors = {};
        let hasError = false;

        Object.keys(schedule).forEach(day => {
            const daySchedule = schedule[day];

            if (daySchedule.active) {
                const start = daySchedule.start;
                const end = daySchedule.end;

                if (!start || !end) {
                    errors[day] = 'Start and end times are required';
                    hasError = true;
                } else if (start >= end) {
                    errors[day] = 'Start time must be before end time';
                    hasError = true;
                } else {
                    const startDate = new Date(`1970-01-01T${start}:00`);
                    const endDate = new Date(`1970-01-01T${end}:00`);
                    const diffInHours = (endDate - startDate) / (1000 * 60 * 60);

                    if (diffInHours < 1) {
                        errors[day] = 'Shift must be at least 1 hour';
                        hasError = true;
                    }
                }
            }
        });

        return { errors, hasError };
    };
    const handleCopyFormLink = () => {
        const url = `${window.location.origin}/staff/register`;
        navigator.clipboard.writeText(url)
            .then(() => toast.success('Form link copied!'))
            .catch(() => toast.error('Failed to copy link'));
    };

    useEffect(() => {
        // Check if there's form data in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const encodedFormData = urlParams.get('formData');

        if (encodedFormData && !initialData) {
            try {
                const decodedData = JSON.parse(atob(encodedFormData));
                setFormData(prev => ({
                    ...prev,
                    ...decodedData
                }));
                toast.success('Form data loaded from link!');
            } catch (error) {
                console.error('Error decoding form data:', error);
            }
        }

        if (initialData) {
            // Split phone numbers if they exist
            const splitPhone = (fullNumber) => {
                if (!fullNumber) return { code: '+61', num: '' };
                const match = countryCodes.find(c => fullNumber.startsWith(c.dial_code));
                return match
                    ? { code: match.dial_code, num: fullNumber.replace(match.dial_code, '').trim() }
                    : { code: '+61', num: fullNumber };
            };

            const phoneData = splitPhone(initialData.phone_number);
            const emergencyPhoneData = splitPhone(initialData.emergency_contact_phone);

            setFormData(prevData => ({
                ...prevData,
                ...initialData,
                phone_country_code: phoneData.code,
                phone_number: phoneData.num,
                emergency_phone_country_code: emergencyPhoneData.code,
                emergency_contact_phone: emergencyPhoneData.num,

                tax_file_number: initialData.tax_file_number || '',
                // Ensure employment fields have default values if they're missing
                position: initialData.position || 'Manager',
                branch: initialData.branch || 'Sydney CBD',
                department: initialData.department || 'Front of House',
                employment_type: initialData.employment_type || 'Full-Time',
                schedule: initialData.schedule || initialSchedule,
                date_of_birth: initialData.date_of_birth ? initialData.date_of_birth.split('T')[0] : '',
                start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
            }));
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Character limit for first_name and last_name (25 characters)
        if (name === 'first_name' || name === 'last_name') {
            // Prevent numbers and special characters in name fields
            const regex = /^[A-Za-z\s'-]*$/;
            if (regex.test(value) && value.length <= 100) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
        // Email validation
        else if (name === 'email') {
            setFormData(prev => ({ ...prev, [name]: value }));
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (value && !emailRegex.test(value)) {
                setErrors(prev => ({ ...prev, [name]: 'Please enter a valid email address' }));
            } else {
                setErrors(prev => ({ ...prev, [name]: null }));
            }
        }
        // Phone number validation - only allow digits
        else if (name === 'phone_number' || name === 'emergency_contact_phone') {
            const digitsOnly = value.replace(/\D/g, ''); // Remove non-digits
            if (digitsOnly.length <= 10) { // Maximum 10 digits
                setFormData(prev => ({ ...prev, [name]: digitsOnly }));
            }
        }
        // Tax File Number validation - only allow digits, max 9 digits
        else if (name === 'tax_file_number') {
            const digitsOnly = value.replace(/\D/g, ''); // Remove non-digits
            if (digitsOnly.length <= 9) { // Maximum 9 digits
                setFormData(prev => ({ ...prev, [name]: digitsOnly }));
                // Validate length
                if (digitsOnly.length > 0 && digitsOnly.length !== 9) {
                    setErrors(prev => ({ ...prev, [name]: 'Tax File Number must be exactly 9 digits' }));
                } else {
                    setErrors(prev => ({ ...prev, [name]: null }));
                }
            }
        }
        // Home address character limit
        else if (name === 'home_address') {
            if (value.length <= 100) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
        // Date of birth validation
        else if (name === 'date_of_birth') {
            const selectedDate = new Date(value);
            const today = new Date();
            const minDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());

            if (selectedDate > today) {
                setErrors(prev => ({ ...prev, [name]: 'Date of birth cannot be in the future' }));
                return;
            } else if (selectedDate > minDate) {
                setErrors(prev => ({ ...prev, [name]: 'You must be at least 16 years old' }));
                return;
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
        // Start date validation
        else if (name === 'start_date') {
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                setErrors(prev => ({ ...prev, [name]: 'Start date cannot be in the past' }));
                return;
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
        else if (name === 'hourly_rate') {
            // Allow only numbers and a single decimal point
            const regex = /^\d*\.?\d{0,2}$/;
            if (value === '' || regex.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }

        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleScheduleChange = (day, field, value) => {
        // Clear error for this day when changing times
        if (errors.schedule && errors.schedule[day]) {
            setErrors(prev => {
                const updatedScheduleErrors = { ...prev.schedule };
                delete updatedScheduleErrors[day];
                return { ...prev, schedule: updatedScheduleErrors };
            });
        }

        setFormData(prev => ({
            ...prev,
            schedule: { ...prev.schedule, [day]: { ...prev.schedule[day], [field]: value } }
        }));
    };

    const toggleDayActive = (day) => {
        const currentState = formData.schedule[day].active;

        // Clear error for this day when toggling
        if (errors.schedule && errors.schedule[day]) {
            setErrors(prev => {
                const updatedScheduleErrors = { ...prev.schedule };
                delete updatedScheduleErrors[day];
                return { ...prev, schedule: updatedScheduleErrors };
            });
        }

        handleScheduleChange(day, 'active', !currentState);
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

    const applyScheduleTemplate = (type) => {
        let newSchedule = JSON.parse(JSON.stringify(initialSchedule));
        if (type === 'full-time') {
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                newSchedule[day].active = true;
                newSchedule[day].start = '09:00';
                newSchedule[day].end = '17:00';
            });
        } else if (type === 'weekends') {
            ['saturday', 'sunday'].forEach(day => {
                newSchedule[day].active = true;
                newSchedule[day].start = '10:00';
                newSchedule[day].end = '16:00';
            });
        }
        setFormData(prev => ({ ...prev, schedule: newSchedule }));
        toast.success(`Applied template`);
    };

    const weeklySummary = useMemo(() => {
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

    const validateStep = (step) => {
        const newErrors = {};
        let isValid = true;

        if (step === 1) {
            if (!formData.first_name.trim()) newErrors.first_name = "Required";
            if (!formData.last_name.trim()) newErrors.last_name = "Required";
            if (!formData.email.trim()) newErrors.email = "Required";
            if (!formData.phone_number.trim()) newErrors.phone_number = "Required";
            // Validate phone number length
            if (formData.phone_number && (formData.phone_number.length < 9 || formData.phone_number.length > 10)) {
                newErrors.phone_number = "Phone number must be 9-10 digits";
            }
            // Validate emergency phone number length if provided
            if (formData.emergency_contact_phone && (formData.emergency_contact_phone.length < 9 || formData.emergency_contact_phone.length > 10)) {
                newErrors.emergency_contact_phone = "Emergency phone must be 9-10 digits";
            }
            if (!formData.staff_code.trim()) newErrors.staff_code = "Required";
        }

        if (step === 2) {
            if (!formData.position.trim()) newErrors.position = "Required";
            if (!formData.branch.trim()) newErrors.branch = "Required";
            if (!formData.department.trim()) newErrors.department = "Required";
            if (!formData.hourly_rate) newErrors.hourly_rate = "Required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(currentStep + 1);
        } else {
            toast.error('Please fill in all required fields');
        }
    };

    const handlePrevious = () => {
        setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Validate phone number length
        if (formData.phone_number.length < 9 || formData.phone_number.length > 10) {
            setErrors({ phone_number: 'Phone number must be 9-10 digits' });
            toast.error('Phone number must be 9-10 digits');
            setLoading(false);
            return;
        }

        // Validate emergency phone number length
        if (formData.emergency_contact_phone.length < 9 || formData.emergency_contact_phone.length > 10) {
            setErrors({ emergency_contact_phone: 'Emergency phone must be 9-10 digits' });
            toast.error('Emergency phone must be 9-10 digits');
            setLoading(false);
            return;
        }

        // VALIDATE SCHEDULE TIMES
        const { errors: scheduleTimeErrors, hasError: hasScheduleError } = validateScheduleTimes(formData.schedule);

        if (hasScheduleError) {
            setErrors(prev => ({
                ...prev,
                schedule: scheduleTimeErrors
            }));
            toast.error("Please fix schedule time errors.");
            setLoading(false);
            return;
        }

        const loadingToast = toast.loading(initialData ? 'Updating...' : 'Saving...');

        const fullPhoneNumber = formData.phone_country_code + formData.phone_number;
        const fullEmergencyPhone = formData.emergency_phone_country_code + formData.emergency_contact_phone;

        const payload = {
            ...formData,
            phone_number: fullPhoneNumber,
            emergency_contact_phone: fullEmergencyPhone,
        };

        try {
            if (initialData) {
                await axios.put(`/api/teams/${initialData.id}`, payload);
                toast.success('Team member updated!', { id: loadingToast });
            } else {
                await axios.post('/api/teams', payload);
                toast.success('Team member added!', { id: loadingToast });
            }
            onSave();
            onClose();
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
                toast.error('Please fix the errors', { id: loadingToast });
            } else {
                toast.error('Something went wrong.', { id: loadingToast });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="add-team-form">
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '15px',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <button
                    type="button"
                    className="btn btn-blue"
                    onClick={handleCopyFormLink}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        fontSize: '14px'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy Form Link
                </button>
            </div>

            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '10px', marginBottom: '15px' }}>
                <h3>{initialData ? 'Edit Team Member' : 'Add Team Member'}</h3>
                <p style={{ color: 'var(--dark-gray)', fontSize: '14px', margin: '5px 0 0 0' }}>
                    Step {currentStep} of {steps.length} - {steps[currentStep - 1]}
                </p>
            </div>

            <Stepper steps={steps} currentStep={currentStep} />

            <div className="modal-body">
                {currentStep === 1 && (
                    <div className="form-step active">
                        <h4>Personal Information</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>First Name * (Max 100 characters)</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className={errors.first_name ? 'error-input' : ''}
                                    maxLength="100"
                                />
                                <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                    {formData.first_name.length}/100 characters
                                </small>
                                {errors.first_name && <small className="error-text">{errors.first_name}</small>}
                            </div>
                            <div className="form-group">
                                <label>Last Name * (Max 100 characters)</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className={errors.last_name ? 'error-input' : ''}
                                    maxLength="100"
                                />
                                <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                    {formData.last_name.length}/100 characters
                                </small>
                                {errors.last_name && <small className="error-text">{errors.last_name}</small>}
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Email *</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={errors.email ? 'error-input' : ''} />
                                {errors.email && <small className="error-text">{errors.email}</small>}
                            </div>
                            <div className="form-group">
                                <label>Phone Number * (9-10 digits)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px' }}>
                                    <select name="phone_country_code" value={formData.phone_country_code} onChange={handleChange}>
                                        {countryCodes.map(c => <option key={c.code} value={c.dial_code}>{c.name} ({c.dial_code})</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        className={errors.phone_number ? 'error-input' : ''}
                                        placeholder="412345678"
                                        maxLength="10"
                                    />
                                </div>
                                {errors.phone_number && <small className="error-text">{errors.phone_number}</small>}
                                <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                    Enter 9-10 digits only (no spaces or special characters)
                                </small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Date of Birth (Must be 16 years or older)</label>
                            <input
                                type="date"
                                name="date_of_birth"
                                value={formData.date_of_birth}
                                onChange={handleChange}
                                max={getMinDateOfBirth()}
                            />
                            {errors.date_of_birth && <small className="error-text">{errors.date_of_birth}</small>}
                        </div>
                        <div className="form-group">
                            <label>Staff Code (Login) *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showStaffCode ? "text" : "password"}
                                    name="staff_code"
                                    value={formData.staff_code}
                                    onChange={handleChange}
                                    placeholder="4-digit code"
                                    autoComplete="new-password"
                                    className={errors.staff_code ? 'error-input' : ''}
                                    style={{ paddingRight: '40px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowStaffCode(!showStaffCode)}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: '#6b7280'
                                    }}
                                >
                                    {showStaffCode ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.staff_code && <small className="error-text">{errors.staff_code}</small>}
                        </div>
                        <div className="form-group">
                            <label>Tax File Number (9 digits)</label>
                            <input
                                type="text"
                                name="tax_file_number"
                                value={formData.tax_file_number}
                                onChange={handleChange}
                                placeholder="123456789"
                                maxLength="9"
                                className={errors.tax_file_number ? 'error-input' : ''}
                            />
                            {errors.tax_file_number && <small className="error-text">{errors.tax_file_number}</small>}
                            {formData.tax_file_number && !errors.tax_file_number && (
                                <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                    {formData.tax_file_number.length}/9 digits
                                </small>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Home Address (Max 100 characters)</label>
                            <textarea
                                name="home_address"
                                value={formData.home_address}
                                onChange={handleChange}
                                rows="2"
                                maxLength="100"
                            ></textarea>
                            <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                {formData.home_address.length}/100 characters
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Emergency Contact Name</label>
                            <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Emergency Contact Phone (9-10 digits)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px' }}>
                                <select name="emergency_phone_country_code" value={formData.emergency_phone_country_code} onChange={handleChange}>
                                    {countryCodes.map(c => <option key={c.code} value={c.dial_code}>{c.name} ({c.dial_code})</option>)}
                                </select>
                                <input
                                    type="text"
                                    name="emergency_contact_phone"
                                    value={formData.emergency_contact_phone}
                                    onChange={handleChange}
                                    placeholder="412345678"
                                    maxLength="10"
                                />
                            </div>
                            {errors.emergency_contact_phone && <small className="error-text">{errors.emergency_contact_phone}</small>}
                            <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                Enter 9-10 digits only (no spaces or special characters)
                            </small>
                        </div>

                    </div>
                )}

                {currentStep === 2 && (
                    <div className="form-step active">
                        <h4>Employment Details</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Position *</label>
                                <select name="position" value={formData.position || ''} onChange={handleChange} className={errors.position ? 'error-input' : ''}>
                                    <option value="">Select position</option>
                                    <option>Manager</option>
                                    <option>Barista</option>
                                    <option>Chef</option>
                                    <option>Waiter</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Branch *</label>
                                <select name="branch" value={formData.branch || ''} onChange={handleChange} className={errors.branch ? 'error-input' : ''}>
                                    <option value="">Select branch</option>
                                    <option>Sydney CBD</option>
                                    <option>Melbourne Central</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Department *</label>
                                <select name="department" value={formData.department || ''} onChange={handleChange} className={errors.department ? 'error-input' : ''}>
                                    <option value="">Select department</option>
                                    <option>Front of House</option>
                                    <option>Back of House</option>
                                    <option>Management</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Employment Type</label>
                                <select name="employment_type" value={formData.employment_type || 'Full-Time'} onChange={handleChange}>
                                    <option>Full-Time</option>
                                    <option>Part-Time</option>
                                    <option>Casual</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Hourly Rate (AUD) *</label>
                                <input type="number" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} step="0.01" className={errors.hourly_rate ? 'error-input' : ''} />
                                {errors.hourly_rate && <small className="error-text">{errors.hourly_rate}</small>}
                            </div>
                            <div className="form-group">
                                <label>Start Date (Today or future)</label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    min={getTodayDate()}
                                />
                                {errors.start_date && <small className="error-text">{errors.start_date}</small>}
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="form-step active">
                        <h4>Work Schedule</h4>
                        <div className="schedule-builder">
                            {Object.keys(formData.schedule).map(day => (
                                <div
                                    key={day}
                                    className={`schedule-row ${formData.schedule[day].active ? 'row-active' : ''} ${errors.schedule && errors.schedule[day] ? 'has-error' : ''}`}
                                    onClick={() => toggleDayActive(day)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <input type="checkbox" checked={formData.schedule[day].active} onChange={() => { }} style={{ pointerEvents: 'none' }} />
                                    <label style={{ cursor: 'pointer', minWidth: '80px' }}>{day.charAt(0).toUpperCase() + day.slice(1)}</label>
                                    <div className="time-inputs" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="time"
                                            value={formData.schedule[day].start}
                                            onChange={e => handleScheduleChange(day, 'start', e.target.value)}
                                            disabled={!formData.schedule[day].active}
                                            className={errors.schedule && errors.schedule[day] ? 'error-input' : ''}
                                        />
                                        <span style={{ margin: '0 10px' }}>to</span>
                                        <input
                                            type="time"
                                            value={formData.schedule[day].end}
                                            onChange={e => handleScheduleChange(day, 'end', e.target.value)}
                                            disabled={!formData.schedule[day].active}
                                            className={errors.schedule && errors.schedule[day] ? 'error-input' : ''}
                                        />
                                    </div>
                                    <span className="hours-display">({calculateHours(formData.schedule[day].start, formData.schedule[day].end).toFixed(1)}h)</span>
                                    {errors.schedule && errors.schedule[day] && (
                                        <div className="time-error-message">
                                            <small className="error-text">{errors.schedule[day]}</small>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="info-box green">
                            <h4>Schedule Summary</h4>
                            <p><span>Total weekly hours:</span> <strong>{weeklySummary.totalHours.toFixed(2)} hours</strong></p>
                            <p><span>Estimated weekly pay:</span> <strong>${weeklySummary.estimatedPay.toFixed(2)}</strong></p>
                        </div>

                        <div className="info-box yellow">
                            <h4>⚡️ Quick Schedule Templates</h4>
                            <div className="template-buttons">
                                <button type="button" onClick={() => applyScheduleTemplate('full-time')}>Full-time (M-F)</button>
                                <button type="button" onClick={() => applyScheduleTemplate('weekends')}>Part-time (Weekends)</button>
                            </div>
                        </div>
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
