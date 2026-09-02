import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Printer, Download, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';

// Every automated stock change writes one of these.
const MOVEMENT_TYPES = [
  { value: 'All', label: 'All Movements' },
  { value: 'SALE', label: 'Sale' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'CUSTOMER_RETURN', label: 'Customer Return' },
  { value: 'SUPPLIER_REJECT', label: 'Supplier Reject' },
  { value: 'SR_ISSUE', label: 'Issued to SR' },
  { value: 'SR_RETURN', label: 'Returned by SR' },
  { value: 'ADJUSTMENT', label: 'Adjustment / Reversal' },
];

const TYPE_LABELS = MOVEMENT_TYPES.reduce((acc, t) => ({ ...acc, [t.value]: t.label }), {});

// Movements that add stock read green, the ones that take it away read red.
const badgeClassFor = (type) => (
  ['PURCHASE', 'CUSTOMER_RETURN', 'SR_RETURN'].includes(type) ? 'bg-success' : 'bg-warning'
);

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const StockLogs = () => {
  const location = useLocation();

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [movementType, setMovementType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productCode, setProductCode] = useState('');

  // Supports deep links from the product list: /stock-logs?product=CODE
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setProductCode(params.get('product') || '');
  }, [location.search]);

  const buildParams = useCallback(() => {
    const params = {};
    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (movementType !== 'All') params.movement_type = movementType;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (productCode) params.product = productCode;
    return params;
  }, [searchTerm, movementType, startDate, endDate, productCode]);

  useEffect(() => {
    let cancelled = false;
    const params = buildParams();

    setLoading(true);
    setError('');

    Promise.all([
      apiClient.get(ENDPOINTS.STOCK_LOGS, { params }),
      apiClient.get(ENDPOINTS.STOCK_LOG_SUMMARY, { params }),
    ])
      .then(([logRows, summaryData]) => {
        if (cancelled) return;
        setLogs(Array.isArray(logRows) ? logRows : []);
        setSummary(summaryData || null);
      })
      .catch(() => {
        if (cancelled) return;
        setLogs([]);
        setSummary(null);
        setError('Could not load the stock movement log. Check that the server is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [buildParams]);

  const handleReset = () => {
    setSearchTerm('');
    setMovementType('All');
    setStartDate('');
    setEndDate('');
    setProductCode('');
  };

  const hasFilters = searchTerm || movementType !== 'All' || startDate || endDate || productCode;

  const handlePrint = () => {
    const printContents = document.getElementById('printable-stock-logs').innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const stats = [
    { label: 'Entries', value: summary?.totalEntries ?? 0, color: 'var(--info)' },
    { label: 'Stock In', value: summary?.totalIn ?? 0, color: 'var(--success)' },
    { label: 'Stock Out', value: summary?.totalOut ?? 0, color: 'var(--danger)' },
    {
      label: 'Net Change',
      value: summary?.netChange ?? 0,
      color: (summary?.netChange ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
    },
  ];

  return (
    <div className="stock-logs-page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Stock Movement Log</h1>
          <p className="text-muted">
            Every recorded stock change, with the document that caused it. Use this to trace where stock went.
          </p>
        </div>
        <div className="flex-align-gap">
          <button className="btn-secondary flex-align-gap" onClick={handlePrint}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-outline flex-align-gap text-info" onClick={() => downloadAsPDF('printable-stock-logs', 'Stock_Movement_Log.pdf')}>
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid responsive-grid-4 mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {stats.map((s) => (
          <div key={s.label} className="card glass" style={{ borderLeft: `3px solid ${s.color}` }}>
            <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: s.color, margin: '0.25rem 0 0 0' }}>
              {Number(s.value).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="card glass">
        <div className="flex-align-gap" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search product, reference or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>

          <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
            {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="From date" />
          <span className="text-muted">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="To date" />

          {hasFilters && (
            <button className="btn-outline flex-align-gap" onClick={handleReset}>
              <RotateCcw size={14} /> Reset
            </button>
          )}
        </div>

        {productCode && (
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Filtered to product <strong>{productCode}</strong>
          </p>
        )}

        {error && (
          <p className="text-danger" style={{ marginBottom: '1rem' }}>{error}</p>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Product</th>
                <th>Movement</th>
                <th>Reference</th>
                <th style={{ textAlign: 'right' }}>Change</th>
                <th style={{ textAlign: 'right' }}>Balance After</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center text-muted">Loading movements...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No stock movements found for these filters.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.product_name || 'Deleted product'}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>{log.product_code}</div>
                    </td>
                    <td>
                      <span className={`badge ${badgeClassFor(log.movement_type)}`}>
                        {TYPE_LABELS[log.movement_type] || log.movement_type}
                      </span>
                    </td>
                    <td className="text-muted">{log.reference_id || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: log.quantity_changed >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      <span className="flex-align-gap" style={{ justifyContent: 'flex-end' }}>
                        {log.quantity_changed >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        {Math.abs(log.quantity_changed)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{log.balance_after}</td>
                    <td className="text-muted" style={{ fontSize: '0.82rem' }}>{log.reason || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && summary && summary.totalEntries > logs.length && (
          <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.75rem' }}>
            Showing the {logs.length} most recent of {summary.totalEntries} matching movements. Narrow the filters to see older ones.
          </p>
        )}
      </div>

      {/* Print / PDF version */}
      <div style={{ display: 'none' }}>
        <div id="printable-stock-logs" style={{ padding: '2rem', background: '#fff', color: '#000' }}>
          <InvoiceHeader />
          <h3 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Stock Movement Log</h3>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {startDate || endDate ? `Period: ${startDate || 'Any'} to ${endDate || 'Any'}` : 'All dates'}
            {movementType !== 'All' ? ` | ${TYPE_LABELS[movementType]}` : ''}
            {productCode ? ` | Product: ${productCode}` : ''}
          </p>

          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Date</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Product</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Movement</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Reference</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>Change</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ border: '1px solid #ccc', padding: '0.35rem' }}>{formatDateTime(log.created_at)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.35rem' }}>{log.product_name} ({log.product_code})</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.35rem' }}>{TYPE_LABELS[log.movement_type] || log.movement_type}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.35rem' }}>{log.reference_id || '-'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>
                    {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>{log.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            <strong>Stock In:</strong> {summary?.totalIn ?? 0} &nbsp;|&nbsp;
            <strong>Stock Out:</strong> {summary?.totalOut ?? 0} &nbsp;|&nbsp;
            <strong>Net:</strong> {summary?.netChange ?? 0}
          </div>

          <PrintFooter />
        </div>
      </div>
    </div>
  );
};

export default StockLogs;
