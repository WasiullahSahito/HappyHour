// File: PrepAreas.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus,
    Edit2,
    Trash2,
    X,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Archive,
    Search,
    Filter,
    MoreVertical
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const PrepAreas = () => {
    // State
    const [activeAreas, setActiveAreas] = useState([]);
    const [inactiveAreas, setInactiveAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [editingArea, setEditingArea] = useState(null);
    const [areaToDelete, setAreaToDelete] = useState(null);
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch prep areas on component mount
    useEffect(() => {
        fetchPrepAreas();
    }, []);

    // Fetch prep areas from API
    const fetchPrepAreas = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/prep-areas');
            setActiveAreas(response.data.active_areas || []);
            setInactiveAreas(response.data.inactive_areas || []);
        } catch (error) {
            console.error('Failed to fetch prep areas:', error);
            toast.error('Failed to load prep areas');
        } finally {
            setLoading(false);
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: ''
        });
        setEditingArea(null);
    };

    // Open add modal
    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    // Open edit modal
    const openEditModal = (area) => {
        setEditingArea(area);
        setFormData({
            name: area.name,
            description: area.description || ''
        });
        setShowEditModal(true);
    };

    // Open delete modal
    const openDeleteModal = (area) => {
        setAreaToDelete(area);
        setShowDeleteModal(true);
    };

    // Add new prep area
    const handleAddArea = async (e) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            await axios.post('/api/prep-areas', formData);
            toast.success('Prep area created successfully');
            setShowAddModal(false);
            resetForm();
            fetchPrepAreas();
        } catch (error) {
            console.error('Failed to create prep area:', error);
            if (error.response?.status === 422) {
                toast.error(error.response.data.errors?.name?.[0] || 'Validation error');
            } else {
                toast.error('Failed to create prep area');
            }
        } finally {
            setActionLoading(false);
        }
    };

    // Update prep area
    const handleUpdateArea = async (e) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            await axios.put(`/api/prep-areas/${editingArea.id}`, formData);
            toast.success('Prep area updated successfully');
            setShowEditModal(false);
            resetForm();
            fetchPrepAreas();
        } catch (error) {
            console.error('Failed to update prep area:', error);
            if (error.response?.status === 422) {
                toast.error(error.response.data.errors?.name?.[0] || 'Validation error');
            } else {
                toast.error('Failed to update prep area');
            }
        } finally {
            setActionLoading(false);
        }
    };

    // Deactivate prep area (move to inactive)
    const handleDeactivate = async (area) => {
        if (!window.confirm(`Are you sure you want to deactivate "${area.name}"?`)) {
            return;
        }

        try {
            await axios.post(`/api/prep-areas/${area.id}/deactivate`);
            toast.success('Prep area deactivated successfully');
            fetchPrepAreas();
        } catch (error) {
            console.error('Failed to deactivate area:', error);
            toast.error('Failed to deactivate prep area');
        }
    };

    // Reactivate prep area (move to active)
    const handleReactivate = async (area) => {
        try {
            await axios.post(`/api/prep-areas/${area.id}/reactivate`);
            toast.success('Prep area reactivated successfully');
            fetchPrepAreas();
        } catch (error) {
            console.error('Failed to reactivate area:', error);
            toast.error('Failed to reactivate prep area');
        }
    };

    // Permanently delete prep area
    const handleDeleteArea = async () => {
        if (!areaToDelete) return;

        setActionLoading(true);
        try {
            await axios.delete(`/api/prep-areas/${areaToDelete.id}`);
            toast.success('Prep area deleted permanently');
            setShowDeleteModal(false);
            setAreaToDelete(null);
            fetchPrepAreas();
        } catch (error) {
            console.error('Failed to delete area:', error);
            toast.error('Failed to delete prep area');
        } finally {
            setActionLoading(false);
        }
    };

    // Filter areas based on search term
    const filteredActiveAreas = activeAreas.filter(area =>
        area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (area.description && area.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredInactiveAreas = inactiveAreas.filter(area =>
        area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (area.description && area.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Toggle selection for batch operations
    const toggleAreaSelection = (areaId, isActive) => {
        const key = `${isActive ? 'active' : 'inactive'}_${areaId}`;
        if (selectedAreas.includes(key)) {
            setSelectedAreas(selectedAreas.filter(id => id !== key));
        } else {
            setSelectedAreas([...selectedAreas, key]);
        }
    };

    // Bulk deactivate selected areas
    const handleBulkDeactivate = async () => {
        const activeSelected = selectedAreas
            .filter(id => id.startsWith('active_'))
            .map(id => id.replace('active_', ''));

        if (activeSelected.length === 0) {
            toast.error('No active areas selected');
            return;
        }

        if (!window.confirm(`Are you sure you want to deactivate ${activeSelected.length} area(s)?`)) {
            return;
        }

        try {
            await Promise.all(activeSelected.map(id =>
                axios.post(`/api/prep-areas/${id}/deactivate`)
            ));
            toast.success(`${activeSelected.length} area(s) deactivated successfully`);
            setSelectedAreas([]);
            fetchPrepAreas();
        } catch (error) {
            console.error('Failed to bulk deactivate:', error);
            toast.error('Failed to deactivate some areas');
        }
    };

    // Bulk reactivate selected areas
    const handleBulkReactivate = async () => {
        const inactiveSelected = selectedAreas
            .filter(id => id.startsWith('inactive_'))
            .map(id => id.replace('inactive_', ''));

        if (inactiveSelected.length === 0) {
            toast.error('No inactive areas selected');
            return;
        }

        try {
            await Promise.all(inactiveSelected.map(id =>
                axios.post(`/api/prep-areas/${id}/reactivate`)
            ));
            toast.success(`${inactiveSelected.length} area(s) reactivated successfully`);
            setSelectedAreas([]);
            fetchPrepAreas();
        } catch (error) {
            console.error('Failed to bulk reactivate:', error);
            toast.error('Failed to reactivate some areas');
        }
    };

    // Bulk delete selected areas
    const handleBulkDelete = async () => {
        const inactiveSelected = selectedAreas
            .filter(id => id.startsWith('inactive_'))
            .map(id => id.replace('inactive_', ''));

        if (inactiveSelected.length === 0) {
            toast.error('No inactive areas selected');
            return;
        }

        if (!window.confirm(`Permanently delete ${inactiveSelected.length} area(s)? This action cannot be undone.`)) {
            return;
        }

        try {
            await Promise.all(inactiveSelected.map(id =>
                axios.delete(`/api/prep-areas/${id}`)
            ));
            toast.success(`${inactiveSelected.length} area(s) deleted successfully`);
            setSelectedAreas([]);
            fetchPrepAreas();
        } catch (error) {
            console.error('Failed to bulk delete:', error);
            toast.error('Failed to delete some areas');
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="prep-areas-container">
            <style>{`
        /* Container */
        .prep-areas-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        /* Header */
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 32px 40px;
          border-radius: 16px;
          margin-bottom: 32px;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
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

        .header .lead {
          font-size: 1.125rem;
          opacity: 0.9;
          margin-bottom: 24px;
        }

        /* Controls */
        .controls-bar {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          margin-bottom: 32px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
        }

        .search-box {
          flex: 1;
          min-width: 300px;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn-success:hover {
          background: #059669;
        }

        /* Stats Cards */
        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .stat-icon.active {
          background: #d1fae5;
          color: #059669;
        }

        .stat-icon.inactive {
          background: #fee2e2;
          color: #dc2626;
        }

        .stat-content h3 {
          font-size: 2rem;
          font-weight: 800;
          margin: 0;
        }

        .stat-content p {
          color: #6b7280;
          margin: 4px 0 0 0;
          font-size: 14px;
        }

        /* Area Cards */
        .areas-section {
          margin-bottom: 48px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .section-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-badge {
          background: #e5e7eb;
          color: #374151;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .section-badge.active {
          background: #d1fae5;
          color: #059669;
        }

        .section-badge.inactive {
          background: #fee2e2;
          color: #dc2626;
        }

        .batch-actions {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }

        .areas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .area-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
          position: relative;
          border: 1px solid transparent;
        }

        .area-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .area-card.active {
          border-left: 6px solid #10b981;
        }

        .area-card.inactive {
          border-left: 6px solid #ef4444;
          background: #fef2f2;
        }

        .area-card-header {
          padding: 20px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .area-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .area-checkbox.checked {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }

        .area-title {
          flex: 1;
          margin: 0;
        }

        .area-title h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #111827;
        }

        .area-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 4px;
        }

        .area-status.active {
          background: #d1fae5;
          color: #059669;
        }

        .area-status.inactive {
          background: #fee2e2;
          color: #dc2626;
        }

        .area-menu-btn {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 6px;
          color: #6b7280;
        }

        .area-menu-btn:hover {
          background: #f3f4f6;
        }

        .area-card-body {
          padding: 0 20px 20px 20px;
        }

        .area-description {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 16px 0;
          min-height: 42px;
        }

        .area-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #9ca3af;
          font-size: 13px;
          margin-top: 16px;
        }

        .area-date {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .area-actions {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }

        /* Modals */
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
          max-width: 500px;
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
        }

        .modal-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 8px;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }

        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .form-control:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-control.textarea {
          min-height: 100px;
          resize: vertical;
        }

        .required {
          color: #ef4444;
        }

        .modal-footer {
          padding: 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 48px;
          color: #d1d5db;
          margin-bottom: 16px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .prep-areas-container {
            padding: 16px;
          }

          .header {
            padding: 24px;
          }

          .header h1 {
            font-size: 2rem;
          }

          .controls-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: 100%;
          }

          .areas-grid {
            grid-template-columns: 1fr;
          }

          .area-card-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .area-checkbox {
            align-self: flex-start;
          }

          .area-menu-btn {
            position: absolute;
            top: 20px;
            right: 20px;
          }

          .modal {
            margin: 0;
            border-radius: 0;
            max-height: 100vh;
            max-width: 100%;
          }
        }

        /* Delete Modal */
        .delete-modal-content {
          text-align: center;
          padding: 40px 24px;
        }

        .delete-icon {
          width: 80px;
          height: 80px;
          background: #fee2e2;
          color: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 32px;
        }

        .delete-modal-content h3 {
          font-size: 1.5rem;
          margin: 0 0 12px 0;
          color: #111827;
        }

        .delete-modal-content p {
          color: #6b7280;
          margin: 0 0 24px 0;
          line-height: 1.6;
        }

        .delete-area-name {
          font-weight: 700;
          color: #111827;
          background: #f3f4f6;
          padding: 8px 16px;
          border-radius: 8px;
          margin: 16px 0;
          display: inline-block;
        }
      `}</style>

            {/* Header */}
            <div className="header">
                <h1>
                    <span className="icon">🏪</span>
                    Prep Areas
                </h1>
                <p className="lead">Manage your restaurant's operational areas</p>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={18} />
                    Add New Prep Area
                </button>
            </div>

            {/* Stats */}
            <div className="stats-container">
                <div className="stat-card">
                    <div className="stat-icon active">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>{activeAreas.length}</h3>
                        <p>Active Areas</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon inactive">
                        <AlertCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>{inactiveAreas.length}</h3>
                        <p>Inactive Areas</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <RefreshCw size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>{activeAreas.length + inactiveAreas.length}</h3>
                        <p>Total Areas</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search prep areas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn btn-secondary" onClick={fetchPrepAreas}>
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading prep areas...</p>
                </div>
            ) : (
                <>
                    {/* Active Areas Section */}
                    <div className="areas-section">
                        <div className="section-header">
                            <h2>
                                <CheckCircle size={20} />
                                Active Areas
                                <span className="section-badge active">{filteredActiveAreas.length}</span>
                            </h2>
                            {filteredActiveAreas.length > 0 && selectedAreas.length > 0 && (
                                <div className="batch-actions">
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleBulkDeactivate}
                                    >
                                        <Archive size={16} />
                                        Deactivate Selected
                                    </button>
                                </div>
                            )}
                        </div>

                        {filteredActiveAreas.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <h3>No active prep areas</h3>
                                <p>Click "Add New Prep Area" to create your first area</p>
                            </div>
                        ) : (
                            <div className="areas-grid">
                                {filteredActiveAreas.map((area) => (
                                    <div key={area.id} className="area-card active">
                                        <div className="area-card-header">
                                            <div
                                                className={`area-checkbox ${selectedAreas.includes(`active_${area.id}`) ? 'checked' : ''}`}
                                                onClick={() => toggleAreaSelection(area.id, true)}
                                            >
                                                {selectedAreas.includes(`active_${area.id}`) && '✓'}
                                            </div>
                                            <div className="area-title">
                                                <h3>{area.name}</h3>
                                                <span className="area-status active">
                                                    <CheckCircle size={12} />
                                                    Active
                                                </span>
                                            </div>
                                            <button
                                                className="area-menu-btn"
                                                onClick={() => {
                                                    // Handle context menu or dropdown
                                                }}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                        <div className="area-card-body">
                                            <p className="area-description">
                                                {area.description || 'No description provided'}
                                            </p>
                                            <div className="area-meta">
                                                <div className="area-date">
                                                    <span>Created {formatDate(area.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="area-actions">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => openEditModal(area)}
                                                style={{ flex: 1 }}
                                            >
                                                <Edit2 size={16} />
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleDeactivate(area)}
                                                style={{ flex: 1 }}
                                            >
                                                <X size={16} />
                                                Deactivate
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Inactive Areas Section */}
                    {filteredInactiveAreas.length > 0 && (
                        <div className="areas-section">
                            <div className="section-header">
                                <h2>
                                    <AlertCircle size={20} />
                                    Inactive Areas
                                    <span className="section-badge inactive">{filteredInactiveAreas.length}</span>
                                </h2>
                                {filteredInactiveAreas.length > 0 && selectedAreas.length > 0 && (
                                    <div className="batch-actions">
                                        <button
                                            className="btn btn-success"
                                            onClick={handleBulkReactivate}
                                            style={{ marginRight: '8px' }}
                                        >
                                            <RefreshCw size={16} />
                                            Reactivate Selected
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            onClick={handleBulkDelete}
                                        >
                                            <Trash2 size={16} />
                                            Delete Selected
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="areas-grid">
                                {filteredInactiveAreas.map((area) => (
                                    <div key={area.id} className="area-card inactive">
                                        <div className="area-card-header">
                                            <div
                                                className={`area-checkbox ${selectedAreas.includes(`inactive_${area.id}`) ? 'checked' : ''}`}
                                                onClick={() => toggleAreaSelection(area.id, false)}
                                            >
                                                {selectedAreas.includes(`inactive_${area.id}`) && '✓'}
                                            </div>
                                            <div className="area-title">
                                                <h3>{area.name}</h3>
                                                <span className="area-status inactive">
                                                    <X size={12} />
                                                    Inactive
                                                </span>
                                            </div>
                                            <button
                                                className="area-menu-btn"
                                                onClick={() => {
                                                    // Handle context menu or dropdown
                                                }}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                        <div className="area-card-body">
                                            <p className="area-description">
                                                {area.description || 'No description provided'}
                                            </p>
                                            <div className="area-meta">
                                                <div className="area-date">
                                                    <span>Deactivated {formatDate(area.deleted_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="area-actions">
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleReactivate(area)}
                                                style={{ flex: 1 }}
                                            >
                                                <RefreshCw size={16} />
                                                Reactivate
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => openDeleteModal(area)}
                                                style={{ flex: 1 }}
                                            >
                                                <Trash2 size={16} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Prep Area</h2>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddArea}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label htmlFor="name">
                                        Area Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="e.g., Kitchen, Front House, Bar Area"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        className="form-control textarea"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Optional description for this prep area..."
                                        rows="4"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddModal(false)}
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={actionLoading || !formData.name.trim()}
                                >
                                    {actionLoading ? (
                                        <>
                                            <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px' }}></div>
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Area'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingArea && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Prep Area</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateArea}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label htmlFor="edit-name">
                                        Area Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="edit-name"
                                        name="name"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="edit-description">Description</label>
                                    <textarea
                                        id="edit-description"
                                        name="description"
                                        className="form-control textarea"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="4"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowEditModal(false)}
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={actionLoading || !formData.name.trim()}
                                >
                                    {actionLoading ? (
                                        <>
                                            <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px' }}></div>
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Area'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && areaToDelete && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Delete Prep Area</h2>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="delete-modal-content">
                            <div className="delete-icon">
                                <Trash2 size={32} />
                            </div>
                            <h3>Are you sure?</h3>
                            <p>
                                This action will permanently delete the prep area and cannot be undone.
                                All associated data will be lost.
                            </p>
                            <div className="delete-area-name">{areaToDelete.name}</div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleDeleteArea}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <>
                                            <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px' }}></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete Permanently'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrepAreas;
