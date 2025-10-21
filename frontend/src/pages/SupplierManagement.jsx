import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatsCard';
import Modal from '../components/Modal';
import Stepper from '../components/Stepper';
import axios from 'axios';

// ===================================================================================
//  HELPER COMPONENT: The Multi-Step Form for Adding a Supplier
//  (Now included directly in this file)
// ===================================================================================
const AddSupplierForm = ({ onClose, onSupplierAdded }) => {
    const [step, setStep] = useState(1);
    const steps = ['ABN Lookup', 'Basic Info', 'Address', 'Business Details'];

    const [formData, setFormData] = useState({
        abn: '',
        company_name: '',
        primary_contact_person: '',
        email_address: '',
        phone_number: '',
        street_address: '',
        city: '',
        state: '',
        postcode: '',
        entity_type: '',
        entity_status: '',
        product_categories: [],
    });

    const [lookupResult, setLookupResult] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLookup = async () => {
        setLookupLoading(true);
        setLookupError('');
        setLookupResult(null);
        try {
            const response = await axios.post('/api/suppliers/abn-lookup', { abn: formData.abn });
            setLookupResult(response.data);
        } catch (err) {
            setLookupError(err.response?.data?.message || 'An unexpected error occurred.');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleReviewAndContinue = () => {
        if (!lookupResult) return;
        const { address_components } = lookupResult;
        setFormData(prev => ({
            ...prev,
            abn: formData.abn,
            company_name: lookupResult.business_name,
            entity_type: lookupResult.entity_type,
            entity_status: lookupResult.status,
            street_address: address_components.street_address || '',
            city: address_components.city || '',
            state: address_components.state || '',
            postcode: address_components.postcode || '',
        }));
        setStep(2);
    };

    const handleQuickAdd = async () => {
        if (!lookupResult) return;
        const { address_components } = lookupResult;
        const newSupplierData = {
            abn: formData.abn,
            company_name: lookupResult.business_name,
            entity_type: lookupResult.entity_type,
            entity_status: lookupResult.status,
            street_address: address_components.street_address,
            city: address_components.city,
            state: address_components.state,
            postcode: address_components.postcode,
            primary_contact_person: 'To be confirmed',
            email_address: `orders@${lookupResult.business_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            phone_number: 'N/A',
            product_categories: [],
        };
        try {
            await axios.post('/api/suppliers', newSupplierData);
            alert('Supplier quickly added!');
            onSupplierAdded();
            onClose();
        } catch (err) {
            alert('Error during quick add: ' + (err.response?.data?.message || 'A supplier with this name may already exist.'));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/suppliers', formData);
            alert('Supplier successfully added!');
            onSupplierAdded();
            onClose();
        } catch (err) {
            alert('Error adding supplier: ' + (err.response?.data?.message || 'Please check your input. A supplier with this name may already exist.'));
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stepper steps={steps} currentStep={step} />

            <div className={`form-step ${step === 1 ? 'active' : ''}`}>
                <h4>Business Lookup</h4>
                <p>Enter the ABN to automatically retrieve business details</p>
                <div className="form-group">
                    <label htmlFor="abn">Australian Business Number (ABN) *</label>
                    <input type="text" id="abn" name="abn" value={formData.abn} onChange={handleChange} placeholder="e.g. 36103573806" />
                </div>
                <button type="button" className="btn btn-blue" onClick={handleLookup} disabled={lookupLoading}>
                    {lookupLoading ? 'Looking up...' : 'Lookup'}
                </button>

                {lookupError && !lookupResult && (
                    <div className="lookup-result error" style={{ marginTop: '20px' }}>
                        <h4>Business Not Found</h4>
                        <p>{lookupError}</p>
                        <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>Continue Manually</button>
                    </div>
                )}
                {lookupResult && (
                    <div className="lookup-result success" style={{ marginTop: '20px' }}>
                        <h4>Business Found!</h4>
                        <p><strong>Business Name:</strong> {lookupResult.business_name}</p>
                        <p><strong>Entity Type:</strong> {lookupResult.entity_type}</p>
                        <p><strong>Status:</strong> {lookupResult.status}</p>
                        <p><strong>Address:</strong> {lookupResult.formatted_address}</p>
                        <div className="quick-add-options">
                            <p>Add this supplier with the fetched details, or continue to review and add additional information.</p>
                            <div className="modal-footer" style={{ justifyContent: 'flex-start', borderTop: 'none', padding: '15px 0 0 0' }}>
                                <button type="button" className="btn btn-primary" onClick={handleQuickAdd}>Quick Add Supplier</button>
                                <button type="button" className="btn btn-secondary" onClick={handleReviewAndContinue}>Review & Edit Details</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {step > 1 && (
                <>
                    <div className={`form-step ${step === 2 ? 'active' : ''}`}>
                        <h4>Basic Information</h4>
                        <div className="form-group"><label>Company Name *</label><input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Primary Contact Person *</label><input type="text" name="primary_contact_person" value={formData.primary_contact_person} onChange={handleChange} placeholder="Full name" required /></div>
                        <div className="form-group"><label>Email Address *</label><input type="email" name="email_address" value={formData.email_address} onChange={handleChange} placeholder="orders@company.com" required /></div>
                        <div className="form-group"><label>Phone Number *</label><input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="+61 2 1234 5678" required /></div>
                    </div>
                    <div className={`form-step ${step === 3 ? 'active' : ''}`}>
                        <h4>Address Information</h4>
                        <div className="form-group"><label>Street Address</label><input type="text" name="street_address" value={formData.street_address} onChange={handleChange} /></div>
                        <div className="input-group">
                            <div className="form-group"><label>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} /></div>
                            <div className="form-group"><label>State</label><select name="state" value={formData.state} onChange={handleChange}><option value="">Select State</option><option value="NSW">NSW</option><option value="VIC">VIC</option><option value="QLD">QLD</option><option value="SA">SA</option><option value="WA">WA</option><option value="TAS">TAS</option><option value="NT">NT</option><option value="ACT">ACT</option></select></div>
                        </div>
                        <div className="form-group"><label>Postcode</label><input type="text" name="postcode" value={formData.postcode} onChange={handleChange} /></div>
                        <div className="info-box" style={{ backgroundColor: '#eef2f7' }}>💡 Address information is optional but helps with delivery coordination.</div>
                    </div>
                    <div className={`form-step ${step === 4 ? 'active' : ''}`}>
                        <h4>Business Details</h4>
                        <div className="form-group"><label>ABN</label><input type="text" value={formData.abn} disabled /></div>
                        <div className="input-group">
                            <div className="form-group"><label>Entity Type</label><input type="text" value={formData.entity_type} disabled /></div>
                            <div className="form-group"><label>Entity Status</label><input type="text" value={formData.entity_status} disabled /></div>
                        </div>
                    </div>
                </>
            )}

            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                {step > 1 && <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Previous</button>}
                {step > 1 && step < steps.length && <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button>}
                {step === steps.length && <button type="submit" className="btn btn-primary">Add Supplier</button>}
            </div>
        </form>
    );
};


// ===================================================================================
//  MAIN COMPONENT: The Supplier Management Page
// ===================================================================================
const SupplierManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSuppliers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/suppliers');
            setSuppliers(response.data);
        } catch (err) {
            console.error(err);
            setError('Failed to load suppliers.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete the supplier "${name}"?`)) {
            try {
                await axios.delete(`/api/suppliers/${id}`);
                alert(`Supplier "${name}" deleted successfully.`);
                fetchSuppliers();
            } catch (err) {
                alert('Failed to delete supplier.');
            }
        }
    };

    const totalMonthlySpend = suppliers.reduce((sum, supplier) => {
        return sum + parseFloat(supplier.invoices_sum_total || 0);
    }, 0);

    return (
        <>
            <header>
                <h1>Supplier Management</h1>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Supplier</button>
            </header>

            <div className="grid-container">
                <StatCard title="Total Suppliers" value={suppliers.length} />
                <StatCard title="Total Monthly Spend" value={`$${totalMonthlySpend.toFixed(2)}`} />
                <StatCard title="Active Suppliers" value={suppliers.length} />
            </div>

            <div className="card table-container">
                {loading && <p style={{ textAlign: 'center', padding: '20px' }}>Loading suppliers...</p>}
                {error && <p className="error-message">{error}</p>}
                {!loading && !error && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Supplier</th>
                                <th>Location</th>
                                <th>Contact</th>
                                <th>Monthly Spend</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(supplier => (
                                <tr key={supplier.id}>
                                    <td><strong>{supplier.company_name}</strong></td>
                                    <td>{`${supplier.city || ''}${supplier.state ? `, ${supplier.state}` : ''}`}</td>
                                    <td>{supplier.primary_contact_person}<br /><small>{supplier.email_address}</small></td>
                                    <td>${Number(supplier.invoices_sum_total || 0).toFixed(2)}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <Link to={`/suppliers/${supplier.id}`} className="btn-link">View Details</Link>
                                            <button onClick={() => handleDelete(supplier.id, supplier.company_name)} className="btn-delete">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Supplier">
                <AddSupplierForm onClose={() => setIsModalOpen(false)} onSupplierAdded={fetchSuppliers} />
            </Modal>
        </>
    );
};

export default SupplierManagement;
