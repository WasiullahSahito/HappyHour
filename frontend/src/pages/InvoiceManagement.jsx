import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatsCard';
import Modal from '../components/Modal';
import axios from 'axios';

// --- THIS IS THE FULL, WORKING UPLOAD FORM COMPONENT ---
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
        // Append all form data fields to the FormData object
        for (const key in formData) {
            if (formData[key]) {
                data.append(key, formData[key]);
            }
        }

        try {
            await axios.post('/api/invoices', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert('Invoice Uploaded! It can now be processed with AI.');
            onInvoiceUploaded(); // This will refresh the invoice list
            onClose(); // This will close the modal
        } catch (err) {
            console.error('Failed to upload invoice:', err);
            const message = err.response?.data?.message || 'Failed to upload. Please check your input and try again.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="supplier_id">Supplier</label>
                <select id="supplier_id" name="supplier_id" value={formData.supplier_id} onChange={handleChange} required>
                    <option value="">Select a supplier</option>
                    {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.company_name}</option>
                    ))}
                </select>
            </div>
            <div className="input-group">
                <div className="form-group">
                    <label htmlFor="invoice_date">Invoice Date</label>
                    <input type="date" id="invoice_date" name="invoice_date" value={formData.invoice_date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="due_date">Due Date</label>
                    <input type="date" id="due_date" name="due_date" value={formData.due_date} onChange={handleChange} required />
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="invoice_file">Upload Invoice File</label>
                <input type="file" id="invoice_file" name="invoice_file" onChange={handleChange} required accept=".pdf,.jpg,.jpeg,.png" />
                <small>Supported formats: PDF, JPG, PNG</small>
            </div>
            {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Uploading...' : 'Upload'}
                </button>
            </div>
        </form>
    );
};


// --- Main InvoiceManagement Component ---
const InvoiceManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stats, setStats] = useState({
        processing_queue: 0,
        needs_review: 0,
        approved: 0,
        match_rate: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [invoicesResponse, suppliersResponse] = await Promise.all([
                axios.get('/api/invoices'),
                axios.get('/api/suppliers')
            ]);
            setInvoices(invoicesResponse.data.invoices);
            setStats(invoicesResponse.data.stats);
            setSuppliers(suppliersResponse.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load page data.');
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
                alert('Failed to delete invoice.');
            }
        }
    };

    const handleProcessWithAI = async (invoiceId) => {
        setProcessingId(invoiceId);
        try {
            await axios.post(`/api/invoices/${invoiceId}/process-ai`);
            alert('Invoice sent for AI processing. The list will update shortly.');
            fetchData();
        } catch (err) {
            alert('Failed to start AI processing. ' + (err.response?.data?.message || 'Please check the server.'));
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <>
            <header>
                <h1>Invoice Management</h1>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Upload Invoice</button>
            </header>
            <div className="grid-container">
                <StatCard title="Processing Queue" value={stats.processing_queue} />
                <StatCard title="Needs Review" value={stats.needs_review} />
                <StatCard title="Approved" value={stats.approved} />
                <StatCard
                    title="Match Rate"
                    value={invoices.length > 0 ? `${stats.match_rate}%` : 'N/A'}
                />
            </div>

            <div className="card table-container">
                {loading && <p style={{ textAlign: 'center', padding: '20px' }}>Loading invoices...</p>}
                {error && <p className="error-message">{error}</p>}
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
                                                {(invoice.status === 'uploaded' || invoice.status === 'needs review') && (
                                                    <button onClick={() => handleProcessWithAI(invoice.id)} className="btn-link" disabled={processingId === invoice.id}>
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
                <UploadInvoiceForm onClose={() => setIsModalOpen(false)} onInvoiceUploaded={fetchData} suppliers={suppliers} />
            </Modal>
        </>
    );
};

export default InvoiceManagement;
