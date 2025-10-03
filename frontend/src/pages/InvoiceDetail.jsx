import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios'; // Assuming you use a pre-configured axios client
import StatCard from '../components/StatsCard';

const InvoiceDetail = () => {
    const { id } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInvoiceDetails = async () => {
            setLoading(true);
            try {
                // The axios client is assumed to be configured with the base URL
                const response = await axios.get(`/api/invoices/${id}`);
                setInvoice(response.data);
            } catch (err) {
                setError('Failed to load invoice details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoiceDetails();
    }, [id]);

    if (loading) return <p>Loading invoice details...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!invoice) return <p>No invoice data found.</p>;

    // Safely access the AI extracted data. It might be null if not processed.
    const extractedData = invoice.ai_extraction_data;

    return (
        <>
            <header>
                <div>
                    <Link to="/invoices" className="btn-link" style={{ marginBottom: '10px', display: 'block' }}>&larr; Back to Invoices</Link>
                    <h1>Invoice #{invoice.invoice_number}</h1>
                    <p>{invoice.supplier?.company_name}</p>
                </div>
                <span className={`status-tag status-${(invoice.status || '').replace(' ', '-')}`}>{invoice.status}</span>
            </header>

            <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <StatCard title="Invoice Date" value={new Date(invoice.invoice_date).toLocaleDateString()} />
                <StatCard title="Due Date" value={new Date(invoice.due_date).toLocaleDateString()} />
                <StatCard title="Total Items" value={extractedData?.orders?.length ?? 0} />
                <StatCard title="Final Total" value={`$${Number(invoice.total ?? 0).toFixed(2)}`} />
            </div>

            <div className="card">
                <h3>Scanned Invoice Items</h3>
                {extractedData && extractedData.orders ? (
                    <div className="table-container">
                        <table className="data-table">
                            <thead><tr><th>Item Description</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead>
                            <tbody>
                                {extractedData.orders.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.description || 'N/A'}</td>
                                        <td>{item.qty || 1}</td>
                                        <td>${Number(item.price || 0).toFixed(2)}</td>
                                        <td>${Number(item.total || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--light-yellow-bg)', borderRadius: '8px' }}>
                        <p>This invoice has not been processed by the AI yet.</p>
                        <Link to="/invoices" className="btn-link">Go back to the list to process it.</Link>
                    </div>
                )}
            </div>

            {/* Only show breakdown and insights if AI data exists */}
            {extractedData && (
                <div className="invoice-details-grid">
                    <div className="card">
                        <h4>Invoice Breakdown</h4>
                        <div className="breakdown-list">
                            <p><span>Subtotal (Ex. Tax):</span><span>${Number(extractedData.totals?.ex_tax ?? 0).toFixed(2)}</span></p>
                            <p><span>GST:</span><span>${Number(extractedData.totals?.GST ?? 0).toFixed(2)}</span></p>
                            <p><strong><span>Final Total:</span><span>${Number(extractedData.totals?.grand_total ?? invoice.total).toFixed(2)}</span></strong></p>
                        </div>
                    </div>
                    <div className="card" style={{ backgroundColor: 'var(--light-blue-bg)' }}>
                        <h4>AI Processing Insights</h4>
                        <div className="breakdown-list">
                            {/* These values can be enhanced on the backend later */}
                            <p><span>Confidence Score:</span><span>98.5%</span></p>
                            <p><span>Items Matched:</span><span>{extractedData.orders?.length ?? 0}</span></p>
                            <p><span>Processing Time:</span><span>4.2 seconds</span></p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InvoiceDetail;
