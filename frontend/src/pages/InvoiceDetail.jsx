import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import StatCard from '../components/StatsCard';

const InvoiceDetail = () => {
    const { id } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    const fetchInvoiceDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/api/invoices/${id}`);
            console.log('Invoice data loaded:', response.data);
            setInvoice(response.data);
        } catch (err) {
            setError('Failed to load invoice details.');
            console.error('Error loading invoice:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoiceDetails();
    }, [id]);

    const handleProcessWithAI = async () => {
        setProcessing(true);
        setError(null);
        try {
            const response = await axios.post(`/api/invoices/${id}/process-ai`);
            alert(response.data.message || 'Invoice processed successfully!');
            // Wait a bit then refresh to ensure data is updated on the backend
            setTimeout(() => {
                fetchInvoiceDetails();
            }, 1000);
        } catch (err) {
            console.error('AI Processing Error:', err);
            if (err.response?.status === 409) {
                alert('Invoice is already being processed or has been processed. Refreshing data...');
                fetchInvoiceDetails();
            } else {
                const errorMsg = err.response?.data?.message || 'Failed to process invoice with AI.';
                setError(errorMsg);
                alert('Error: ' + errorMsg);
            }
        } finally {
            setProcessing(false);
        }
    };

    const calculateDynamicTotals = (orders) => {
        if (!orders || !Array.isArray(orders) || orders.length === 0) return null;
        let subtotal = 0;
        let gst = 0;
        orders.forEach(item => {
            const itemTotal = parseFloat(item.total) || 0;
            const itemGST = parseFloat(item.gst || item.GST || 0);
            subtotal += itemTotal;
            gst += itemGST;
        });
        return { subtotal, gst, grandTotal: subtotal + gst };
    };

    const getItemGST = (item) => parseFloat(item.gst || item.GST || 0);
    const getExtractedGST = (extractedData) => extractedData?.totals?.gst || extractedData?.totals?.GST || 0;
    const shouldShowProcessButton = () => invoice && (invoice.status === 'uploaded' || invoice.status === 'needs review');

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading invoice details...</div>;
    if (error) return <div className="error-message" style={{ padding: '20px' }}>{error}</div>;
    if (!invoice) return <div style={{ padding: '20px' }}>No invoice data found.</div>;

    const extractedData = invoice.ai_extraction_data;
    const hasOrders = extractedData?.orders?.length > 0;
    const dynamicTotals = hasOrders ? calculateDynamicTotals(extractedData.orders) : null;

    return (
        <>
            <header>
                <div>
                    <Link to="/invoices" className="btn-link" style={{ marginBottom: '10px', display: 'block' }}>&larr; Back to Invoices</Link>
                    <h1>Invoice #{invoice.invoice_number}</h1>
                    <p>{invoice.supplier?.company_name}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span className={`status-tag status-${(invoice.status || '').replace(' ', '-')}`}>{invoice.status}</span>
                    {shouldShowProcessButton() && (
                        <button onClick={handleProcessWithAI} className="btn btn-primary" disabled={processing}>
                            {processing ? 'Processing with AI...' : 'Process with AI'}
                        </button>
                    )}
                    {invoice.status === 'processing' && (
                        <div style={{ color: '#e67e22', fontSize: '0.9em' }}>⏳ AI processing in progress...</div>
                    )}
                </div>
            </header>

            <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <StatCard title="Invoice Date" value={new Date(invoice.invoice_date).toLocaleDateString()} />
                <StatCard title="Due Date" value={new Date(invoice.due_date).toLocaleDateString()} />
                <StatCard title="Total Items" value={hasOrders ? extractedData.orders.length : 0} />
                <StatCard title="Final Total" value={`$${Number(invoice.total || 0).toFixed(2)}`} />
            </div>

            <div className="card">
                <h3>Scanned Invoice Items</h3>
                {invoice.status === 'processing' ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <h4>⏳ AI Processing in Progress...</h4>
                    </div>
                ) : hasOrders ? (
                    <>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Item Description</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>GST</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {extractedData.orders.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.code || 'N/A'}</td>
                                            <td>{item.description || 'N/A'}</td>
                                            <td>{item.qty || 1}</td>
                                            <td>${Number(item.price || 0).toFixed(2)}</td>
                                            <td>${getItemGST(item).toFixed(2)}</td>
                                            <td>${Number(item.total || 0).toFixed(2)}</td>
                                            <td>
                                                {item.is_new_system ? (
                                                    <span style={{ color: 'var(--primary-blue)', fontSize: '0.85em' }}>✨ New</span>
                                                ) : (
                                                    <span style={{ color: 'var(--primary-green)', fontSize: '0.85em' }}>✓ Matched</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <h4>Order Summary</h4>
                            <div className="breakdown-list">
                                <p><span>Subtotal:</span><span>${Number(dynamicTotals?.subtotal || extractedData.totals?.ex_tax || 0).toFixed(2)}</span></p>
                                <p><span>GST:</span><span>${Number(dynamicTotals?.gst || getExtractedGST(extractedData) || 0).toFixed(2)}</span></p>
                                <p><strong><span>Grand Total:</span><span>${Number(dynamicTotals?.grandTotal || extractedData.totals?.grand_total || invoice.total || 0).toFixed(2)}</span></strong></p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <h4>📄 Invoice Not Processed</h4>
                        <p>Click "Process with AI" to extract items.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default InvoiceDetail;
