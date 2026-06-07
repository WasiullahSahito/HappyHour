// rosterUtils.js - Helper utilities for Staff Roster

/**
 * Format time from 24hr to 12hr format
 */
export const formatTime12Hour = (time24) => {
    if (!time24) return '';

    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Get week start date (Monday) from any date
 */
export const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
};

/**
 * Get week end date (Sunday) from week start
 */
export const getWeekEnd = (weekStart) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 6);
    return date.toISOString().split('T')[0];
};

/**
 * Calculate hours between two times
 */
export const calculateHours = (startTime, endTime, breakMinutes = 30) => {
    if (!startTime || !endTime) return 0;

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);

    if (end <= start) return 0;

    const diffMs = end - start;
    const diffMins = diffMs / 60000;
    const netMins = diffMins - breakMinutes;

    return Math.max(0, netMins / 60);
};

/**
 * Format hours to display string (e.g., "7.5h")
 */
export const formatHours = (hours) => {
    if (!hours && hours !== 0) return '0h';
    return `${parseFloat(hours).toFixed(1)}h`;
};

/**
 * Get color based on utilization percentage
 */
export const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return '#f44336'; // Red - over-utilized
    if (percentage >= 70) return '#4caf50'; // Green - good
    if (percentage >= 50) return '#ff9800'; // Orange - moderate
    return '#9e9e9e'; // Gray - under-utilized
};

/**
 * Get progress bar color for target vs assigned
 */
export const getProgressColor = (assigned, target) => {
    if (assigned === 0) return '#e0e0e0';

    const percentage = (assigned / target) * 100;

    if (percentage > 110) return '#f44336'; // Red - over-assigned
    if (percentage >= 90) return '#4caf50'; // Green - on target
    if (percentage >= 70) return '#ff9800'; // Orange - needs attention
    return '#2196f3'; // Blue - under-assigned
};

/**
 * Validate time format (HH:MM)
 */
export const isValidTime = (time) => {
    if (!time) return false;
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
};

/**
 * Check if a shift overlaps with another
 */
export const shiftsOverlap = (shift1, shift2) => {
    const start1 = new Date(`2000-01-01T${shift1.start_time}`);
    const end1 = new Date(`2000-01-01T${shift1.end_time}`);
    const start2 = new Date(`2000-01-01T${shift2.start_time}`);
    const end2 = new Date(`2000-01-01T${shift2.end_time}`);

    return start1 < end2 && start2 < end1;
};

/**
 * Get all dates in a week
 */
export const getWeekDates = (weekStart) => {
    const dates = [];
    const start = new Date(weekStart);

    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
};

/**
 * Get day name from date
 */
export const getDayName = (date) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const d = new Date(date);
    return days[d.getDay()];
};

/**
 * Calculate labor cost for a shift
 */
export const calculateLaborCost = (hours, hourlyRate) => {
    return hours * hourlyRate;
};

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

/**
 * Group shifts by staff member
 */
export const groupShiftsByStaff = (shifts) => {
    return shifts.reduce((acc, shift) => {
        if (!acc[shift.team_id]) {
            acc[shift.team_id] = [];
        }
        acc[shift.team_id].push(shift);
        return acc;
    }, {});
};

/**
 * Group shifts by day
 */
export const groupShiftsByDay = (shifts) => {
    return shifts.reduce((acc, shift) => {
        if (!acc[shift.day]) {
            acc[shift.day] = [];
        }
        acc[shift.day].push(shift);
        return acc;
    }, {});
};

/**
 * Calculate total labor cost for a roster
 */
export const calculateTotalLaborCost = (shifts, staffData) => {
    return shifts.reduce((total, shift) => {
        const staff = staffData.find(s => s.id === shift.team_id);
        if (staff) {
            return total + calculateLaborCost(shift.total_hours, staff.hourly_rate);
        }
        return total;
    }, 0);
};

/**
 * Check if date is in the past
 */
export const isDatePast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
};

/**
 * Check if date is today
 */
export const isToday = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
};

/**
 * Get week number in year
 */
export const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

/**
 * Export roster to CSV
 */
export const exportToCSV = (shifts, staffData, prepAreas) => {
    const headers = ['Date', 'Day', 'Staff Name', 'Position', 'Prep Area', 'Start Time', 'End Time', 'Break (min)', 'Total Hours'];

    const rows = shifts.map(shift => {
        const staff = staffData.find(s => s.id === shift.team_id);
        const prepArea = prepAreas.find(p => p.id === shift.prep_area_id);

        return [
            shift.week_start,
            shift.day,
            staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown',
            staff?.position || '',
            prepArea?.name || '',
            shift.start_time,
            shift.end_time,
            shift.break_minutes,
            shift.total_hours
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Generate time options for select dropdown
 */
export const generateTimeOptions = (startHour = 0, endHour = 23, interval = 30) => {
    const times = [];

    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            const hourStr = hour.toString().padStart(2, '0');
            const minuteStr = minute.toString().padStart(2, '0');
            times.push(`${hourStr}:${minuteStr}`);
        }
    }

    return times;
};

/**
 * Validate shift data
 */
export const validateShift = (shift) => {
    const errors = [];

    if (!shift.team_id) {
        errors.push('Staff member is required');
    }

    if (!shift.prep_area_id) {
        errors.push('Prep area is required');
    }

    if (!shift.day) {
        errors.push('Day is required');
    }

    if (!isValidTime(shift.start_time)) {
        errors.push('Valid start time is required');
    }

    if (!isValidTime(shift.end_time)) {
        errors.push('Valid end time is required');
    }

    if (shift.start_time && shift.end_time) {
        const start = new Date(`2000-01-01T${shift.start_time}`);
        const end = new Date(`2000-01-01T${shift.end_time}`);

        if (end <= start) {
            errors.push('End time must be after start time');
        }
    }

    if (shift.break_minutes < 0) {
        errors.push('Break minutes cannot be negative');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Calculate average shift length
 */
export const calculateAverageShiftLength = (shifts) => {
    if (shifts.length === 0) return 0;

    const totalHours = shifts.reduce((sum, shift) => sum + parseFloat(shift.total_hours), 0);
    return totalHours / shifts.length;
};

/**
 * Get most common shift times
 */
export const getMostCommonShiftTimes = (shifts) => {
    const timeFrequency = {};

    shifts.forEach(shift => {
        const key = `${shift.start_time}-${shift.end_time}`;
        timeFrequency[key] = (timeFrequency[key] || 0) + 1;
    });

    const sorted = Object.entries(timeFrequency)
        .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) return null;

    const [times, count] = sorted[0];
    const [start_time, end_time] = times.split('-');

    return { start_time, end_time, count };
};

export default {
    formatTime12Hour,
    formatDate,
    getWeekStart,
    getWeekEnd,
    calculateHours,
    formatHours,
    getUtilizationColor,
    getProgressColor,
    isValidTime,
    shiftsOverlap,
    getWeekDates,
    getDayName,
    calculateLaborCost,
    formatCurrency,
    groupShiftsByStaff,
    groupShiftsByDay,
    calculateTotalLaborCost,
    isDatePast,
    isToday,
    getWeekNumber,
    exportToCSV,
    downloadCSV,
    generateTimeOptions,
    validateShift,
    calculateAverageShiftLength,
    getMostCommonShiftTimes
};
