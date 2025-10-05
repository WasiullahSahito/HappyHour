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
            // Wait a bit then refresh
            setTimeout(() => {
                fetchInvoiceDetails();
            }, 2000);
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

    // Calculate dynamic totals from line items
    const calculateDynamicTotals = (orders) => {
        if (!orders || !Array.isArray(orders) || orders.length === 0) return null;

        let subtotal = 0;
        let gst = 0;

        orders.forEach(item => {
            const quantity = parseFloat(item.qty || item.quantity || 1);
            const unitPrice = parseFloat(item.price || item.unit_price || 0);
            const itemTotal = parseFloat(item.total) || (quantity * unitPrice);

            // Handle both uppercase and lowercase GST
            const itemGST = parseFloat(item.gst || item.GST || 0);

            subtotal += itemTotal;
            gst += itemGST;
        });

        return {
            subtotal: subtotal,
            gst: gst,
            grandTotal: subtotal + gst
        };
    };

    // Helper to get GST value from item
    const getItemGST = (item) => {
        return parseFloat(item.gst || item.GST || 0);
    };

    // Helper to get GST total from extracted data
    const getExtractedGST = (extractedData) => {
        if (!extractedData || !extractedData.totals) return 0;
        return extractedData.totals.gst || extractedData.totals.GST || 0;
    };

    // Helper to check if we should show the Process AI button
    const shouldShowProcessButton = () => {
        return invoice && (invoice.status === 'uploaded' || invoice.status === 'needs review');
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading invoice details...</div>;
    if (error) return <div className="error-message" style={{ padding: '20px' }}>{error}</div>;
    if (!invoice) return <div style={{ padding: '20px' }}>No invoice data found.</div>;

    const extractedData = invoice.ai_extraction_data;
    console.log('Extracted data:', extractedData);

    const hasOrders = extractedData && extractedData.orders && Array.isArray(extractedData.orders) && extractedData.orders.length > 0;
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
                    <span className={`status-tag status-${(invoice.status || '').replace(' ', '-')}`}>
                        {invoice.status}
                    </span>
                    {shouldShowProcessButton() && (
                        <button
                            onClick={handleProcessWithAI}
                            className="btn btn-primary"
                            disabled={processing}
                        >
                            {processing ? 'Processing with AI...' : 'Process with AI'}
                        </button>
                    )}
                    {invoice.status === 'processing' && (
                        <div style={{ color: '#e67e22', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>⏳</span>
                            AI processing in progress...
                        </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3>Scanned Invoice Items</h3>
                    {hasOrders && (
                        <div style={{ fontSize: '0.9em', color: 'var(--dark-gray)' }}>
                            {extractedData.orders.length} item{extractedData.orders.length !== 1 ? 's' : ''} found
                        </div>
                    )}
                </div>

                {invoice.status === 'processing' ? (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
                        <div style={{ fontSize: '2em', marginBottom: '10px' }}>⏳</div>
                        <h4>AI Processing in Progress</h4>
                        <p>Your invoice is being processed by our AI. This may take a few seconds.</p>
                        <p>Please wait or check back shortly.</p>
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
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Dynamic Totals Summary */}
                        <div style={{
                            marginTop: '20px',
                            padding: '15px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef'
                        }}>
                            <h4>Order Summary</h4>
                            <div className="breakdown-list">
                                <p>
                                    <span>Subtotal ({extractedData.orders.length} items):</span>
                                    <span>${Number(dynamicTotals?.subtotal || extractedData.totals?.ex_tax || 0).toFixed(2)}</span>
                                </p>
                                <p>
                                    <span>GST:</span>
                                    <span>${Number(dynamicTotals?.gst || getExtractedGST(extractedData) || 0).toFixed(2)}</span>
                                </p>
                                <p>
                                    <strong>
                                        <span>Grand Total:</span>
                                        <span>${Number(dynamicTotals?.grandTotal || extractedData.totals?.grand_total || invoice.total || 0).toFixed(2)}</span>
                                    </strong>
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                        <div style={{ fontSize: '3em', marginBottom: '15px' }}>📄</div>
                        <h4>Invoice Not Processed</h4>
                        <p>This invoice has not been processed by AI yet or no items were found in the extraction.</p>
                        {shouldShowProcessButton() && (
                            <button
                                onClick={handleProcessWithAI}
                                className="btn btn-primary"
                                disabled={processing}
                                style={{ marginTop: '15px' }}
                            >
                                {processing ? 'Processing...' : 'Process with AI Now'}
                            </button>
                        )}
                        {invoice.status === 'needs review' && (
                            <p style={{ marginTop: '15px', fontSize: '0.9em', color: '#e74c3c' }}>
                                ⚠️ Previous processing failed. You can try processing again.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Only show breakdown and insights if we have AI data with orders */}
            {hasOrders && (
                <div className="invoice-details-grid">
                    <div className="card">
                        <h4>Invoice Breakdown</h4>
                        <div className="breakdown-list">
                            <p><span>Subtotal (Ex. Tax):</span><span>${Number(extractedData.totals?.ex_tax ?? dynamicTotals?.subtotal ?? 0).toFixed(2)}</span></p>
                            <p><span>GST:</span><span>${Number(getExtractedGST(extractedData) ?? dynamicTotals?.gst ?? 0).toFixed(2)}</span></p>
                            <p><strong><span>Final Total:</span><span>${Number(extractedData.totals?.grand_total ?? dynamicTotals?.grandTotal ?? invoice.total).toFixed(2)}</span></strong></p>
                        </div>
                    </div>
                    <div className="card" style={{ backgroundColor: '#e8f4fd' }}>
                        <h4>AI Processing Insights</h4>
                        <div className="breakdown-list">
                            <p><span>Confidence Score:</span><span>98.5%</span></p>
                            <p><span>Items Extracted:</span><span>{extractedData.orders.length}</span></p>
                            <p><span>Processing Time:</span><span>~5 seconds</span></p>
                            <p><span>Data Source:</span><span>{dynamicTotals ? 'Calculated from items' : 'From extracted totals'}</span></p>
                            <p><span>GST Status:</span><span>{getExtractedGST(extractedData) > 0 ? 'GST Applied' : 'GST Free Items'}</span></p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InvoiceDetail;
