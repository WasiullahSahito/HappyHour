// --- START OF FILE pages/InvoiceManagement.jsx ---

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatsCard';
import Modal from '../components/Modal';
import axios from 'axios'; // Assuming pre-configured axios client

// --- UPDATED UploadInvoiceForm ---
// The form's text is simplified to reflect that it only uploads the file now.
const UploadInvoiceForm = ({ onClose, onInvoiceUploaded, suppliers }) => {
    const [formData, setFormData] = useState({
        supplier_id: '',
        invoice_date: '',
        due_date: '',
        invoice_file: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: files ? files[0] : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        for (const key in formData) {
            data.append(key, formData[key]);
        }

        try {
            await axios.post('/api/invoices', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert('Invoice Uploaded! You can now process it with AI from the list.');
            onInvoiceUploaded();
            onClose();
        } catch (err) {
            console.error('Failed to upload invoice:', err);
            const message = err.response?.data?.message || 'Failed to upload invoice. Please check your input.';
            setError(message);
            alert('Error: ' + message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: 'auto' }}>
            <div className="form-group">
                <label htmlFor="supplier_id">Supplier</label>
                <select id="supplier_id" name="supplier_id" value={formData.supplier_id} onChange={handleChange} required>
                    <option value="">Select supplier</option>
                    {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.company_name}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="invoice_date">Invoice Date</label>
                <input type="date" id="invoice_date" name="invoice_date" value={formData.invoice_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="due_date">Due Date</label>
                <input type="date" id="due_date" name="due_date" value={formData.due_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="invoice_file">Upload Invoice File</label>
                <input type="file" id="invoice_file" name="invoice_file" onChange={handleChange} required />
                <small style={{ color: 'var(--dark-gray)' }}>Supported formats: PDF, JPG, PNG</small>
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Uploading...' : 'Upload Invoice'}</button>
            </div>
            {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}
        </form>
    );
};


const InvoiceManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null); // To track which invoice is being processed by AI

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [invoicesResponse, suppliersResponse] = await Promise.all([
                axios.get('/api/invoices'),
                axios.get('/api/suppliers')
            ]);
            setInvoices(invoicesResponse.data);
            setSuppliers(suppliersResponse.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load page data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id, number) => {
        if (window.confirm(`Are you sure you want to delete invoice "${number}"?`)) {
            try {
                await axios.delete(`/api/invoices/${id}`);
                alert(`Invoice "${number}" deleted successfully.`);
                fetchData();
            } catch (err) {
                console.error('Delete error:', err);
                alert('Failed to delete invoice.');
            }
        }
    };

    // --- NEW: FUNCTION TO HANDLE AI PROCESSING ---
    const handleProcessWithAI = async (invoiceId) => {
        setProcessingId(invoiceId); // Set loading state for this specific invoice
        try {
            // This endpoint calls the new method on your Laravel controller
            await axios.post(`/api/invoices/${invoiceId}/process-ai`);
            alert('Invoice sent for AI processing. The list will update shortly.');
            fetchData(); // Refresh the list to show the new "processing" status
        } catch (err) {
            console.error('AI Processing Error:', err);
            alert('Failed to start AI processing. ' + (err.response?.data?.message || 'Please check the server.'));
        } finally {
            setProcessingId(null); // Clear loading state regardless of outcome
        }
    };

    const processingQueue = invoices.filter(inv => inv.status === 'processing').length;
    const needsReview = invoices.filter(inv => inv.status === 'needs review').length;
    const processed = invoices.filter(inv => inv.status === 'processed').length;
    const matchRate = '94%';

    return (
        <>
            <header>
                <h1>Invoice Management</h1>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Upload Invoice</button>
            </header>
            <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <StatCard title="Processing Queue" value={processingQueue} />
                <StatCard title="Needs Review" value={needsReview} />
                <StatCard title="Approved" value={processed} />
                <StatCard title="Match Rate" value={matchRate} />
            </div>

            <div className="card table-container">
                {loading && <p style={{ padding: '20px' }}>Loading invoices...</p>}
                {error && <p className="error-message" style={{ color: 'red', padding: '20px' }}>{error}</p>}
                {!loading && !error && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Supplier</th>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No invoices found.</td></tr>
                            ) : (
                                invoices.map(invoice => (
                                    <tr key={invoice.id}>
                                        <td>{invoice.invoice_number || `INV-${invoice.id}`}</td>
                                        <td>{suppliers.find(s => s.id === invoice.supplier_id)?.company_name || 'N/A'}</td>
                                        <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                                        <td>${Number(invoice.total || 0).toFixed(2)}</td>
                                        <td><span className={`status-tag status-${(invoice.status || 'uploaded').replace(' ', '-')}`}>{invoice.status}</span></td>
                                        <td>
                                            <div className="actions-cell">
                                                {/* --- NEW: CONDITIONAL AI PROCESSING BUTTON --- */}
                                                {(invoice.status === 'uploaded' || invoice.status === 'needs review') && (
                                                    <button
                                                        onClick={() => handleProcessWithAI(invoice.id)}
                                                        className="btn-link"
                                                        disabled={processingId === invoice.id}
                                                        style={{ color: '#4f46e5' }}
                                                    >
                                                        {processingId === invoice.id ? 'Processing...' : 'Process with AI'}
                                                    </button>
                                                )}
                                                <Link to={`/invoices/${invoice.id}`} className="btn-link">View Details</Link>
                                                <button onClick={() => handleDelete(invoice.id, invoice.invoice_number || `INV-${invoice.id}`)} className="btn-delete">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload New Invoice">
                <UploadInvoiceForm
                    onClose={() => setIsModalOpen(false)}
                    onInvoiceUploaded={fetchData}
                    suppliers={suppliers}
                />
            </Modal>
        </>
    );
};

export default InvoiceManagement;
