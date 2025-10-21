import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatsCard';
import Modal from '../components/Modal';
import axios from 'axios';

// Assuming UploadInvoiceForm is defined elsewhere or in this file
const UploadInvoiceForm = ({ onClose, onInvoiceUploaded, suppliers }) => {
    // ... form logic
    return (
        <form>
            {/* Form fields go here */}
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary">Upload</button>
            </div>
        </form>
    );
};

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

    // --- FAULTY LOGIC REMOVED ---
    // const processingQueue = invoices.filter(inv => inv.status === 'processing').length;
    // const needsReview = invoices.filter(inv => inv.status === 'needs review').length;
    // const processed = invoices.filter(inv => inv.status === 'processed').length;
    // const matchRate = '94%';
    // This is no longer needed because the backend provides this data in the `stats` object.

    return (
        <>
            <header>
                <h1>Invoice Management</h1>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Upload Invoice</button>
            </header>
            <div className="grid-container">
                {/* --- CORRECTED: Use the stats object from state --- */}
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
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No invoices found.</td></tr>
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
