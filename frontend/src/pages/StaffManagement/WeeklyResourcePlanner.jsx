// File: WeeklyResourcePlanner.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom'; // 🆕 added
import {
    Calendar,
    Calculator,
    Users,
    DollarSign,
    Clock,
    Target,
    TrendingUp,
    Save,
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    Edit2,
    BarChart3,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameWeek, parseISO } from 'date-fns'; // parseISO added

const WeeklyResourcePlanner = () => {
    const navigate = useNavigate();                           // 🆕
    const [searchParams, setSearchParams] = useSearchParams(); // 🆕

    // ------------------------------------------------------------
    // 🆕 Determine initial week from URL param, otherwise use current week
    // ------------------------------------------------------------
    const getInitialWeek = () => {
        const weekParam = searchParams.get('week');
        if (weekParam) {
            try {
                const parsedDate = parseISO(weekParam);
                if (!isNaN(parsedDate)) {
                    return startOfWeek(parsedDate, { weekStartsOn: 1 });
                }
            } catch (e) {
                // fall through to default
            }
        }
        return startOfWeek(new Date(), { weekStartsOn: 1 });
    };

    // State
    const [currentWeekStart, setCurrentWeekStart] = useState(getInitialWeek());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prepAreas, setPrepAreas] = useState([]);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDayDetails, setSelectedDayDetails] = useState(null);

    // Current plan state
    const [currentPlan, setCurrentPlan] = useState({
        id: null,
        week_start: format(currentWeekStart, 'yyyy-MM-dd'),
        labor_target_percentage: 30,
        hourly_rate: 28.5,
        revenue_forecast: {
            monday: 2500,
            tuesday: 2800,
            wednesday: 3200,
            thursday: 3500,
            friday: 5200,
            saturday: 6800,
            sunday: 4200
        },
        prep_area_distribution: {},
        calculated_hours: {},
        weekly_totals: {
            weekly_revenue: 0,
            weekly_labor_budget: 0,
            weekly_total_hours: 0
        }
    });

    // ------------------------------------------------------------
    // 🆕 Keep URL in sync when week changes
    // ------------------------------------------------------------
    useEffect(() => {
        setSearchParams({ week: format(currentWeekStart, 'yyyy-MM-dd') });
    }, [currentWeekStart, setSearchParams]);

    // Fetch plan for current week
    const fetchPlanForWeek = useCallback(async (weekStart) => {
        setLoading(true);
        try {
            const weekStartStr = format(weekStart, 'yyyy-MM-dd');
            const response = await axios.get('/api/resource-plans', {
                params: { week_start: weekStartStr }
            });

            const { plan, prep_areas } = response.data;

            setCurrentPlan({
                id: plan.id,
                week_start: plan.week_start,
                labor_target_percentage: parseFloat(plan.labor_target_percentage),
                hourly_rate: parseFloat(plan.hourly_rate),
                revenue_forecast: plan.revenue_forecast || {
                    monday: 2500,
                    tuesday: 2800,
                    wednesday: 3200,
                    thursday: 3500,
                    friday: 5200,
                    saturday: 6800,
                    sunday: 4200
                },
                prep_area_distribution: plan.prep_area_distribution || {},
                calculated_hours: plan.calculated_hours || {},
                weekly_totals: plan.weekly_totals || {
                    weekly_revenue: 0,
                    weekly_labor_budget: 0,
                    weekly_total_hours: 0
                }
            });

            setPrepAreas(prep_areas || []);

            // Initialize distribution if empty
            if (prep_areas?.length > 0 && (!plan.prep_area_distribution || Object.keys(plan.prep_area_distribution).length === 0)) {
                const distribution = {};
                const percentage = Math.floor(100 / prep_areas.length);
                prep_areas.forEach((area, index) => {
                    distribution[area.id] = index === prep_areas.length - 1
                        ? 100 - (percentage * (prep_areas.length - 1))
                        : percentage;
                });

                setCurrentPlan(prev => ({
                    ...prev,
                    prep_area_distribution: distribution
                }));
            }
        } catch (error) {
            console.error('Failed to fetch plan:', error);
            if (error.response?.status === 404) {
                // Plan will be created by the backend
                console.log('No plan found, backend will create default');
            } else {
                toast.error('Failed to load resource plan');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch plan when week changes
    useEffect(() => {
        fetchPlanForWeek(currentWeekStart);
    }, [currentWeekStart, fetchPlanForWeek]);

    // Calculate derived values
    const calculateDerivedValues = useCallback(() => {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // Calculate weekly revenue
        let weeklyRevenue = 0;
        days.forEach(day => {
            weeklyRevenue += currentPlan.revenue_forecast[day] || 0;
        });

        // Calculate weekly labor budget
        const weeklyLaborBudget = weeklyRevenue * (currentPlan.labor_target_percentage / 100);

        // Calculate weekly total hours
        const weeklyTotalHours = currentPlan.hourly_rate > 0 ? weeklyLaborBudget / currentPlan.hourly_rate : 0;

        // Calculate daily totals
        const dailyTotals = {};
        days.forEach(day => {
            const revenue = currentPlan.revenue_forecast[day] || 0;
            const laborBudget = revenue * (currentPlan.labor_target_percentage / 100);
            const totalHours = currentPlan.hourly_rate > 0 ? laborBudget / currentPlan.hourly_rate : 0;

            dailyTotals[day] = {
                revenue,
                laborBudget,
                totalHours
            };
        });

        // Calculate prep area hours
        const prepAreaHours = {};
        if (prepAreas.length > 0 && Object.keys(currentPlan.prep_area_distribution).length > 0) {
            prepAreas.forEach(area => {
                const percentage = currentPlan.prep_area_distribution[area.id] || 0;
                if (percentage <= 0) return;

                const areaHours = {
                    daily: {},
                    weekly_total: 0
                };

                days.forEach(day => {
                    const dayHours = dailyTotals[day].totalHours;
                    const hours = dayHours * (percentage / 100);
                    areaHours.daily[day] = Math.round(hours * 10) / 10;
                    areaHours.weekly_total += hours;
                });

                areaHours.weekly_total = Math.round(areaHours.weekly_total * 10) / 10;
                prepAreaHours[area.id] = areaHours;
            });
        }

        return {
            weeklyRevenue: Math.round(weeklyRevenue * 100) / 100,
            weeklyLaborBudget: Math.round(weeklyLaborBudget * 100) / 100,
            weeklyTotalHours: Math.round(weeklyTotalHours * 10) / 10,
            dailyTotals,
            prepAreaHours
        };
    }, [currentPlan, prepAreas]);

    const derivedValues = calculateDerivedValues();

    // Handle revenue input change
    const handleRevenueChange = (day, value) => {
        const numValue = parseFloat(value) || 0;
        setCurrentPlan(prev => ({
            ...prev,
            revenue_forecast: {
                ...prev.revenue_forecast,
                [day]: numValue
            }
        }));
    };

    // Handle prep area distribution change
    const handleDistributionChange = (areaId, value) => {
        const numValue = parseFloat(value) || 0;

        const newDistribution = {
            ...currentPlan.prep_area_distribution,
            [areaId]: numValue
        };

        setCurrentPlan(prev => ({
            ...prev,
            prep_area_distribution: newDistribution
        }));
    };

    // Handle labor target change
    const handleLaborTargetChange = (value) => {
        const numValue = parseFloat(value) || 30;
        if (numValue < 0 || numValue > 100) {
            toast.error('Labor target must be between 0% and 100%');
            return;
        }

        setCurrentPlan(prev => ({
            ...prev,
            labor_target_percentage: numValue
        }));
    };

    // Handle hourly rate change
    const handleHourlyRateChange = (value) => {
        const numValue = parseFloat(value) || 28.5;
        if (numValue < 0) {
            toast.error('Hourly rate must be positive');
            return;
        }

        setCurrentPlan(prev => ({
            ...prev,
            hourly_rate: numValue
        }));
    };

    // Navigate to previous week
    const goToPreviousWeek = () => {
        setCurrentWeekStart(prev => subDays(prev, 7));
    };

    // Navigate to next week
    const goToNextWeek = () => {
        setCurrentWeekStart(prev => addDays(prev, 7));
    };

    // Go to current week
    const goToCurrentWeek = () => {
        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    };

    // Save plan
    const savePlan = async () => {
        setSaving(true);
        try {
            // Validate distribution totals 100%
            const distributionTotal = Object.values(currentPlan.prep_area_distribution)
                .reduce((sum, val) => sum + parseFloat(val), 0);

            if (Math.abs(distributionTotal - 100) > 0.1) {
                toast.error('Prep area distribution must total 100%');
                setSaving(false);
                return;
            }

            const payload = {
                week_start: format(currentWeekStart, 'yyyy-MM-dd'),
                labor_target_percentage: currentPlan.labor_target_percentage,
                hourly_rate: currentPlan.hourly_rate,
                revenue_forecast: currentPlan.revenue_forecast,
                prep_area_distribution: currentPlan.prep_area_distribution
            };

            const response = await axios.post('/api/resource-plans', payload);

            toast.success(response.data.message);
            setCurrentPlan(prev => ({
                ...prev,
                id: response.data.id,
                calculated_hours: response.data.plan.calculated_hours || {},
                weekly_totals: response.data.plan.weekly_totals || {
                    weekly_revenue: 0,
                    weekly_labor_budget: 0,
                    weekly_total_hours: 0
                }
            }));
        } catch (error) {
            console.error('Failed to save plan:', error);
            if (error.response?.status === 422) {
                toast.error(error.response.data.message || 'Validation error');
            } else {
                toast.error('Failed to save resource plan');
            }
        } finally {
            setSaving(false);
        }
    };

    // Show day details modal
    const showDayDetails = (day) => {
        const dayCalculations = derivedValues.dailyTotals[day];
        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day);
        const date = addDays(currentWeekStart, dayIndex);

        const dayDetails = {
            date: format(date, 'EEEE, MMMM d, yyyy'),
            revenue: dayCalculations.revenue,
            laborBudget: dayCalculations.laborBudget,
            totalHours: dayCalculations.totalHours,
            prepAreas: prepAreas.map(area => ({
                name: area.name,
                percentage: currentPlan.prep_area_distribution[area.id] || 0,
                hours: derivedValues.prepAreaHours[area.id]?.daily[day] || 0
            }))
        };

        setSelectedDayDetails(dayDetails);
        setShowDetailsModal(true);
    };

    // Calculate distribution total
    const getDistributionTotal = () => {
        return Object.values(currentPlan.prep_area_distribution)
            .reduce((sum, val) => sum + val, 0)
            .toFixed(1);
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Format hours
    const formatHours = (hours) => {
        return `${hours.toFixed(1)}h`;
    };

    // 🆕 Navigate to Staff Roster with the current week
    const goToStaffRoster = () => {
        navigate(`/staff/roster?week=${format(currentWeekStart, 'yyyy-MM-dd')}`);
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #f3f4f6',
                    borderTop: '3px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                }}></div>
                <p>Loading resource plan...</p>
            </div>
        );
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const distributionTotal = getDistributionTotal();

    return (
        <div className="resource-planner-container">
            {/* CSS styles remain the same as your original */}
            <style>{`
      /* ============================================================================
   WEEKLY RESOURCE PLANNER - COMPLETE STYLESHEET
   ============================================================================ */

/* --- Container --- */
.resource-planner-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* --- Header --- */
.header {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 32px 40px;
  border-radius: 16px;
  margin-bottom: 32px;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header h1 .icon {
  background: rgba(255, 255, 255, 0.2);
  padding: 12px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.header .subtitle {
  font-size: 1.125rem;
  opacity: 0.9;
  margin-bottom: 24px;
}

/* --- Week Navigation --- */
.week-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 32px;
}

.week-display {
  display: flex;
  align-items: center;
  gap: 16px;
}

.week-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
}

.week-dates {
  color: #6b7280;
  font-size: 1rem;
}

.week-actions {
  display: flex;
  gap: 12px;
}

/* --- Cards --- */
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 32px;
  overflow: hidden;
}

.card-header {
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #111827;
}

.card-body {
  padding: 24px;
}

/* --- Labor Target Section --- */
.labor-target-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.target-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.target-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.target-option {
  padding: 12px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.target-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.target-option:hover:not(.active) {
  border-color: #93c5fd;
}

.target-label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.target-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #111827;
}

.target-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 4px;
}

.hourly-rate-input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.hourly-rate-input label {
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.hourly-rate-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  text-align: center;
}

.hourly-rate-input input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ============================================================================
   DAILY REVENUE FORECAST - HORIZONTAL SCROLL
   ============================================================================ */

.revenue-forecast-wrapper {
  position: relative;
  overflow: hidden;
}

.revenue-table-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  margin: 0 -24px;
  padding: 0 24px 16px 24px;
  position: relative;
}

/* Scroll gradient hint */
.revenue-table-scroll::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 16px;
  width: 60px;
  background: linear-gradient(to left, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  pointer-events: none;
  z-index: 1;
}

/* Custom scrollbar */
.revenue-table-scroll::-webkit-scrollbar {
  height: 8px;
}

.revenue-table-scroll::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.revenue-table-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.revenue-table-scroll::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Revenue Table */
.revenue-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px; /* Force horizontal scroll on smaller screens */
}

.revenue-table th {
  padding: 16px;
  text-align: center;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  color: #374151;
  font-weight: 600;
  white-space: nowrap;
  min-width: 160px;
}

.revenue-table td {
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
  min-width: 160px;
}

.day-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.day-label {
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
}

.day-date {
  font-weight: 600;
  color: #111827;
  font-size: 0.9rem;
}

.revenue-input {
  width: 120px;
  padding: 12px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  margin: 0 auto;
  display: block;
  transition: all 0.2s;
}

.revenue-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.day-totals {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  gap: 8px;
}

.total-label {
  color: #6b7280;
  white-space: nowrap;
}

.total-value {
  font-weight: 600;
  color: #111827;
}

.total-value.labor-budget {
  color: #3b82f6;
}

.total-value.total-hours {
  color: #10b981;
}

.details-btn {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 8px;
  text-decoration: underline;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.details-btn:hover {
  background: #eff6ff;
}

/* --- Prep Area Distribution --- */
.prep-areas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.prep-area-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.prep-area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prep-area-name {
  font-weight: 600;
  color: #111827;
}

.prep-area-percentage {
  font-weight: 700;
  color: #3b82f6;
  font-size: 1.125rem;
}

.percentage-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  text-align: center;
}

.percentage-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.distribution-total {
  text-align: center;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 2px solid #3b82f6;
  margin-top: 16px;
}

.distribution-total .total-label {
  font-size: 0.875rem;
  color: #3b82f6;
  margin-bottom: 4px;
  font-weight: 600;
}

.distribution-total .total-value {
  font-size: 2rem;
  font-weight: 800;
  color: #1d4ed8;
}

.total-warning {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-weight: 600;
}

.total-ok {
  color: #059669;
  font-size: 0.875rem;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-weight: 600;
}

/* --- Hours Table --- */
.hours-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -24px;
  padding: 0 24px 16px 24px;
}

.hours-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

.hours-table th {
  padding: 16px;
  text-align: center;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  color: #374151;
  font-weight: 600;
  white-space: nowrap;
  min-width: 100px;
}

.hours-table td {
  padding: 12px 8px;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
}

.prep-area-row:hover {
  background: #f9fafb;
}

.prep-area-header-cell {
  text-align: left;
  font-weight: 600;
  color: #111827;
  padding-left: 16px;
  min-width: 180px;
}

.hours-cell {
  font-weight: 600;
  color: #1d4ed8;
}

.total-row {
  background: #eff6ff;
  font-weight: 700;
}

.total-row td {
  border-top: 2px solid #3b82f6;
  border-bottom: 2px solid #3b82f6;
  color: #1d4ed8;
}

/* --- Weekly Summary --- */
.weekly-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 32px;
}

.summary-card {
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
}

.summary-icon {
  width: 48px;
  height: 48px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 24px;
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 2rem;
  font-weight: 800;
  color: #111827;
  margin-bottom: 4px;
}

.summary-subvalue {
  font-size: 1rem;
  color: #3b82f6;
  font-weight: 600;
}

/* --- Actions Bar --- */
.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-top: 32px;
}

.info-text {
  font-size: 0.875rem;
  color: #6b7280;
  max-width: 400px;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  gap: 16px;
}

/* --- Buttons --- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-success {
  background: #10b981;
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
}

.btn-success:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-outline {
  background: white;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.btn-outline:hover {
  background: #eff6ff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* --- Loading --- */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* --- Modal --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-close {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  color: #6b7280;
  font-size: 24px;
  line-height: 1;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-body {
  padding: 24px;
}

.day-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.detail-card {
  padding: 20px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  text-align: center;
}

.detail-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #111827;
}

.prep-areas-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prep-area-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.prep-area-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.prep-area-item-name {
  font-weight: 600;
  color: #111827;
}

.prep-area-item-stats {
  display: flex;
  gap: 24px;
  align-items: center;
}

.prep-area-item .prep-area-percentage {
  color: #3b82f6;
  font-weight: 600;
  font-size: 0.9rem;
}

.prep-area-hours {
  color: #1d4ed8;
  font-weight: 700;
  font-size: 1rem;
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */

/* Large Devices (Desktop) - 1200px to 1399px */
@media (max-width: 1399px) and (min-width: 1200px) {
  .labor-target-grid {
    gap: 24px;
  }

  .revenue-table {
    min-width: 1100px;
  }
}

/* Medium-Large Devices (Tablets Landscape) - 992px to 1199px */
@media (max-width: 1199px) and (min-width: 992px) {
  .labor-target-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .weekly-summary {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .revenue-table {
    min-width: 1000px;
  }

  .hours-table {
    min-width: 900px;
  }
}

/* Medium Devices (Tablets Portrait) - 768px to 991px */
@media (max-width: 991px) and (min-width: 768px) {
  .resource-planner-container {
    padding: 20px;
  }

  .header {
    padding: 24px 28px;
  }

  .header h1 {
    font-size: 2rem;
  }

  .week-navigation {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .week-display {
    justify-content: center;
  }

  .week-actions {
    justify-content: center;
  }

  .labor-target-grid {
    grid-template-columns: 1fr;
  }

  .revenue-table {
    min-width: 900px;
  }

  .revenue-table th,
  .revenue-table td {
    min-width: 140px;
    padding: 12px;
  }

  .prep-areas-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .weekly-summary {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .actions-bar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: center;
  }
}

/* Small Devices (Mobile Landscape) - 600px to 767px */
@media (max-width: 767px) and (min-width: 600px) {
  .resource-planner-container {
    padding: 16px;
  }

  .header {
    padding: 20px 24px;
  }

  .header h1 {
    font-size: 1.75rem;
  }

  .header .subtitle {
    font-size: 1rem;
  }

  .card-header {
    padding: 20px;
  }

  .card-header h2 {
    font-size: 1.25rem;
  }

  .card-body {
    padding: 20px;
  }

  .week-navigation {
    flex-direction: column;
    gap: 12px;
  }

  .revenue-table {
    min-width: 800px;
  }

  .revenue-table th,
  .revenue-table td {
    min-width: 120px;
    padding: 10px 8px;
  }

  .revenue-input {
    width: 100px;
    font-size: 0.9rem;
  }

  .prep-areas-grid {
    grid-template-columns: 1fr;
  }

  .day-details-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}

/* Extra Small Devices (Mobile Portrait) - Below 600px */
@media (max-width: 599px) {
  .resource-planner-container {
    padding: 12px;
  }

  .header {
    padding: 16px 20px;
    border-radius: 12px;
  }

  .header h1 {
    font-size: 1.5rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header h1 .icon {
    padding: 8px;
    font-size: 20px;
  }

  .header .subtitle {
    font-size: 0.9rem;
  }

  .week-navigation {
    padding: 12px 16px;
    gap: 12px;
  }

  .week-title {
    font-size: 1rem;
  }

  .week-dates {
    font-size: 0.85rem;
  }

  .week-actions {
    flex-wrap: wrap;
  }

  .card {
    border-radius: 8px;
  }

  .card-header {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .card-header h2 {
    font-size: 1.1rem;
  }

  .card-body {
    padding: 16px;
  }

  /* Revenue Table on Mobile */
  .revenue-table-scroll {
    margin: 0 -16px;
    padding: 0 16px 12px 16px;
  }

  .revenue-table {
    min-width: 700px;
  }

  .revenue-table th,
  .revenue-table td {
    min-width: 110px;
    padding: 8px 6px;
  }

  .day-label {
    font-size: 0.75rem;
  }

  .day-date {
    font-size: 0.8rem;
  }

  .revenue-input {
    width: 90px;
    padding: 8px 6px;
    font-size: 0.85rem;
  }

  .day-totals {
    gap: 6px;
    margin-top: 8px;
  }

  .total-item {
    font-size: 0.75rem;
  }

  .details-btn {
    font-size: 0.75rem;
    margin-top: 6px;
  }

  /* Labor Target */
  .labor-target-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .target-options {
    flex-direction: column;
  }

  .target-option {
    width: 100%;
    min-width: auto;
  }

  .hourly-rate-input {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 16px;
  }

  .hourly-rate-input input {
    font-size: 1rem;
  }

  /* Prep Areas */
  .prep-areas-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .prep-area-input {
    padding: 12px;
  }

  /* Hours Table */
  .hours-table-scroll {
    margin: 0 -16px;
    padding: 0 16px 12px 16px;
  }

  .hours-table {
    min-width: 700px;
  }

  .hours-table th,
  .hours-table td {
    padding: 10px 6px;
    min-width: 90px;
    font-size: 0.85rem;
  }

  .prep-area-header-cell {
    min-width: 140px;
    padding-left: 12px;
  }

  /* Weekly Summary */
  .weekly-summary {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 20px;
  }

  .summary-card {
    padding: 16px;
  }

  .summary-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
    margin-bottom: 12px;
  }

  .summary-value {
    font-size: 1.5rem;
  }

  .summary-subvalue {
    font-size: 0.9rem;
  }

  /* Actions */
  .actions-bar {
    padding: 16px;
    flex-direction: column;
    gap: 12px;
  }

  .info-text {
    max-width: 100%;
    text-align: center;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
  }

  .btn {
    width: 100%;
    justify-content: center;
    padding: 10px 20px;
  }

  /* Modal */
  .modal {
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
    max-width: 100%;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-header h2 {
    font-size: 1.25rem;
  }

  .modal-body {
    padding: 16px;
  }

  .day-details-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }

  .detail-card {
    padding: 16px;
  }

  .detail-value {
    font-size: 1.25rem;
  }

  .prep-area-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .prep-area-item-stats {
    width: 100%;
    justify-content: space-between;
  }
}

/* Touch-friendly improvements */
@media (max-width: 991px) {
  .revenue-input,
  .percentage-input,
  .hourly-rate-input input {
    min-height: 44px; /* iOS recommended touch target */
  }

  .btn {
    min-height: 44px;
  }

  .target-option {
    min-height: 60px;
  }
}

/* Landscape orientation adjustments for mobile */
@media (max-width: 767px) and (orientation: landscape) {
  .header {
    padding: 16px 20px;
  }

  .header h1 {
    font-size: 1.5rem;
  }

  .modal {
    max-height: 95vh;
  }
}
      `}</style>

            {/* Header */}
            <div className="header">
                <h1>
                    <span className="icon">
                        <Calculator size={28} />
                    </span>
                    Weekly Resource Planner
                </h1>
                <p className="subtitle">
                    Forecast revenue and calculate optimal staffing hours • Week of {format(currentWeekStart, 'dd MMM')} – {format(addDays(currentWeekStart, 6), 'dd MMM')}
                </p>
            </div>

            {/* Week Navigation */}
            <div className="week-navigation">
                <div className="week-display">
                    <button className="btn btn-outline" onClick={goToPreviousWeek}>
                        <ChevronLeft size={20} />
                        Previous Week
                    </button>

                    <div>
                        <div className="week-title">
                            Week of {format(currentWeekStart, 'dd MMM')} – {format(addDays(currentWeekStart, 6), 'dd MMM')}
                        </div>
                        <div className="week-dates">
                            {format(currentWeekStart, 'yyyy')}
                        </div>
                    </div>

                    <button className="btn btn-outline" onClick={goToNextWeek}>
                        Next Week
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="week-actions">
                    {!isSameWeek(currentWeekStart, new Date(), { weekStartsOn: 1 }) && (
                        <button className="btn btn-secondary" onClick={goToCurrentWeek}>
                            This Week
                        </button>
                    )}
                </div>
            </div>

            {/* Labor Cost Target Card */}
            <div className="card">
                <div className="card-header">
                    <h2>
                        <Target size={24} />
                        Labor Cost Target
                    </h2>
                </div>
                <div className="card-body">
                    <div className="labor-target-grid">
                        <div className="target-section">
                            <h3>Target Labor % of Revenue</h3>
                            <div className="target-options">
                                {[15, 20, 25, 30, 35, 40, 45].map(percentage => (
                                    <button
                                        key={percentage}
                                        className={`target-option ${currentPlan.labor_target_percentage === percentage ? 'active' : ''}`}
                                        onClick={() => handleLaborTargetChange(percentage)}
                                    >
                                        <div className="target-label">
                                            {percentage === 15 ? 'Tight' :
                                                percentage === 30 ? 'Standard' :
                                                    percentage === 45 ? 'Generous' : ''}
                                        </div>
                                        <div className="target-value">{percentage}%</div>
                                        {percentage === 15 && <div className="target-description">(15%)</div>}
                                        {percentage === 45 && <div className="target-description">(45%)</div>}
                                    </button>
                                ))}
                            </div>
                            <div className="hourly-rate-input">
                                <label htmlFor="labor-target">Custom Target (%):</label>
                                <input
                                    type="number"
                                    id="labor-target"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={currentPlan.labor_target_percentage}
                                    onChange={(e) => handleLaborTargetChange(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="target-section">
                            <h3>Average Hourly Rate</h3>
                            <div className="hourly-rate-input">
                                <label htmlFor="hourly-rate">Blended hourly rate (including super, loadings):</label>
                                <input
                                    type="number"
                                    id="hourly-rate"
                                    min="0"
                                    step="0.1"
                                    value={currentPlan.hourly_rate}
                                    onChange={(e) => handleHourlyRateChange(e.target.value)}
                                />
                            </div>
                            <div className="target-description">
                                <AlertCircle size={16} />
                                Include base wage + super (11%) + casual loadings (25%) if applicable
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Revenue Forecast Card */}
            <div className="card">
                <div className="card-header">
                    <h2>
                        <TrendingUp size={24} />
                        Daily Revenue Forecast
                    </h2>
                    <div className="target-description">
                        Enter expected revenue for each day of the week
                    </div>
                </div>
                <div className="card-body">
                    {/* 🆕 ADD THIS WRAPPER DIV FOR HORIZONTAL SCROLL */}
                    <div className="revenue-table-scroll">
                        <table className="revenue-table">
                            <thead>
                                <tr>
                                    {days.map((day, index) => (
                                        <th key={day}>
                                            <div className="day-header">
                                                <div className="day-label">{dayLabels[index]}</div>
                                                <div className="day-date">
                                                    {format(addDays(currentWeekStart, index), 'd MMM')}
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {days.map(day => (
                                        <td key={day}>
                                            <input
                                                type="number"
                                                className="revenue-input"
                                                value={currentPlan.revenue_forecast[day]}
                                                onChange={(e) => handleRevenueChange(day, e.target.value)}
                                                min="0"
                                                step="100"
                                            />
                                            <div className="day-totals">
                                                <div className="total-item">
                                                    <span className="total-label">Labor Budget:</span>
                                                    <span className="total-value labor-budget">
                                                        {formatCurrency(derivedValues.dailyTotals[day].laborBudget)}
                                                    </span>
                                                </div>
                                                <div className="total-item">
                                                    <span className="total-label">Total Hours:</span>
                                                    <span className="total-value total-hours">
                                                        {formatHours(derivedValues.dailyTotals[day].totalHours)}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                className="details-btn"
                                                onClick={() => showDayDetails(day)}
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {/* END OF WRAPPER */}
                </div>
            </div>

            {/* Prep Area Distribution Card */}
            <div className="card">
                <div className="card-header">
                    <h2>
                        <Users size={24} />
                        Prep Area Distribution
                    </h2>
                    <div className="target-description">
                        How to split hours across different areas (must total 100%)
                    </div>
                </div>
                <div className="card-body">
                    <div className="prep-areas-grid">
                        {prepAreas.map(area => (
                            <div key={area.id} className="prep-area-input">
                                <div className="prep-area-header">
                                    <div className="prep-area-name">{area.name}</div>
                                    <div className="prep-area-percentage">
                                        {(currentPlan.prep_area_distribution[area.id] || 0).toFixed(1)}%
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={currentPlan.prep_area_distribution[area.id] || 0}
                                    onChange={(e) => handleDistributionChange(area.id, e.target.value)}
                                    className="percentage-input"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={currentPlan.prep_area_distribution[area.id] || 0}
                                    onChange={(e) => handleDistributionChange(area.id, e.target.value)}
                                    className="percentage-input"
                                    style={{ marginTop: '8px' }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="distribution-total">
                        <div className="total-label">Total Distribution</div>
                        <div className="total-value">{distributionTotal}%</div>
                        {parseFloat(distributionTotal) === 100 ? (
                            <div className="total-ok">
                                <CheckCircle size={16} />
                                Distribution is 100% - Ready to calculate
                            </div>
                        ) : (
                            <div className="total-warning">
                                <AlertCircle size={16} />
                                Distribution must total 100% (currently {distributionTotal}%)
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Calculated Hours by Prep Area Card */}
            <div className="card">
                <div className="card-header">
                    <h2>
                        <BarChart3 size={24} />
                        Calculated Hours by Prep Area
                    </h2>
                    <div className="target-description">
                        This is your staffing target when creating rosters
                    </div>
                </div>
                <div className="card-body">
                    {/* 🆕 ADD THIS WRAPPER DIV FOR HORIZONTAL SCROLL */}
                    <div className="hours-table-scroll">
                        <table className="hours-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Prep Area</th>
                                    {days.map((day, index) => (
                                        <th key={day}>
                                            <div className="day-header">
                                                <div className="day-label">{dayLabels[index]}</div>
                                                <div className="day-date">
                                                    {format(addDays(currentWeekStart, index), 'd MMM')}
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th>Weekly Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prepAreas.map(area => (
                                    <tr key={area.id} className="prep-area-row">
                                        <td className="prep-area-header-cell">{area.name}</td>
                                        {days.map(day => (
                                            <td key={day} className="hours-cell">
                                                {formatHours(derivedValues.prepAreaHours[area.id]?.daily[day] || 0)}
                                            </td>
                                        ))}
                                        <td className="hours-cell">
                                            {formatHours(derivedValues.prepAreaHours[area.id]?.weekly_total || 0)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="total-row">
                                    <td className="prep-area-header-cell">Daily Total</td>
                                    {days.map(day => (
                                        <td key={day} className="hours-cell">
                                            {formatHours(derivedValues.dailyTotals[day].totalHours)}
                                        </td>
                                    ))}
                                    <td className="hours-cell">
                                        {formatHours(derivedValues.weeklyTotalHours)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {/* END OF WRAPPER */}
                </div>
            </div>

            {/* Weekly Summary */}
            <div className="weekly-summary">
                <div className="summary-card">
                    <div className="summary-icon">
                        <DollarSign size={24} />
                    </div>
                    <div className="summary-label">Weekly Revenue</div>
                    <div className="summary-value">
                        {formatCurrency(derivedValues.weeklyRevenue)}
                    </div>
                    <div className="summary-subvalue">Forecasted sales</div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <Target size={24} />
                    </div>
                    <div className="summary-label">Labor Budget</div>
                    <div className="summary-value">
                        {formatCurrency(derivedValues.weeklyLaborBudget)}
                    </div>
                    <div className="summary-subvalue">
                        {currentPlan.labor_target_percentage}% of revenue
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <Clock size={24} />
                    </div>
                    <div className="summary-label">Total Hours</div>
                    <div className="summary-value">
                        {formatHours(derivedValues.weeklyTotalHours)}
                    </div>
                    <div className="summary-subvalue">To roster this week</div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="actions-bar">
                <div className="info-text">
                    Ready to create your roster? Use these calculated hours as targets when assigning staff
                </div>

                <div className="action-buttons">
                    <button
                        className="btn btn-secondary"
                        onClick={savePlan}
                        disabled={saving || Math.abs(parseFloat(distributionTotal) - 100) > 0.1}
                    >
                        {saving ? (
                            <>
                                <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save Plan
                            </>
                        )}
                    </button>

                    {/* 🆕 Redirect to Staff Roster with week param */}
                    <button
                        className="btn btn-primary"
                        onClick={goToStaffRoster}
                        disabled={Math.abs(parseFloat(distributionTotal) - 100) > 0.1}
                    >
                        <Users size={18} />
                        Create Roster →
                    </button>
                </div>
            </div>

            {/* Day Details Modal */}
            {showDetailsModal && selectedDayDetails && (
                <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                <Calendar size={24} />
                                {selectedDayDetails.date} Details
                            </h2>
                            <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="day-details-grid">
                                <div className="detail-card">
                                    <div className="detail-label">Daily Revenue</div>
                                    <div className="detail-value">
                                        {formatCurrency(selectedDayDetails.revenue)}
                                    </div>
                                </div>
                                <div className="detail-card">
                                    <div className="detail-label">Labor Budget</div>
                                    <div className="detail-value">
                                        {formatCurrency(selectedDayDetails.laborBudget)}
                                    </div>
                                </div>
                                <div className="detail-card">
                                    <div className="detail-label">Total Hours</div>
                                    <div className="detail-value">
                                        {formatHours(selectedDayDetails.totalHours)}
                                    </div>
                                </div>
                                <div className="detail-card">
                                    <div className="detail-label">Labor Target</div>
                                    <div className="detail-value">
                                        {currentPlan.labor_target_percentage}%
                                    </div>
                                </div>
                            </div>

                            <h3 style={{ marginBottom: '16px' }}>Prep Area Breakdown</h3>
                            <div className="prep-areas-list">
                                {selectedDayDetails.prepAreas.map((area, index) => (
                                    <div key={index} className="prep-area-item">
                                        <div className="prep-area-item-name">{area.name}</div>
                                        <div className="prep-area-item-stats">
                                            <div className="prep-area-percentage">
                                                {area.percentage.toFixed(1)}%
                                            </div>
                                            <div className="prep-area-hours">
                                                {formatHours(area.hours)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeklyResourcePlanner;
