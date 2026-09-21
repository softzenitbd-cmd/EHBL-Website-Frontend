import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtDate = (d) => (d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '-');

/**
 * A party's account statement, laid out like the sales invoice: who it is,
 * where the balance stands, then every charge and payment with a running
 * balance. `statement` is the response of the ledger statement endpoint.
 */
const PrintableStatement = ({ statement, kind }) => {
  if (!statement?.entity) return null;

  const isCustomer = kind === 'Customer';
  const e = statement.entity;
  const rows = statement.ledger || [];
  const totalCharges = rows.filter(r => r.type === 'charge').reduce((n, r) => n + Number(r.amount || 0), 0);
  const totalPayments = rows.filter(r => r.type === 'payment').reduce((n, r) => n + Number(r.amount || 0), 0);
  const currentDue = Number(statement.currentDue || 0);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="printable-invoice-wrapper" style={{ padding: '1.75rem 1.25rem 1.5rem 1.25rem', background: '#fff', color: '#0f172a', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", maxWidth: '720px', margin: '0 auto', boxSizing: 'border-box' }}>
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 8mm 10mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
            body { background: #fff !important; color: #0f172a !important; }
            .printable-invoice-wrapper { width: 100% !important; max-width: 720px !important; margin: 0 auto !important; padding: 0 !important; color: #0f172a !important; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        `}
      </style>

      <InvoiceHeader />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.4rem' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {isCustomer ? 'CUSTOMER STATEMENT (গ্রাহক হিসাব)' : 'SUPPLIER STATEMENT (সরবরাহকারী হিসাব)'}
        </span>
        <span style={{
          display: 'inline-block', padding: '3px 12px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: '0.5px',
          border: currentDue > 0 ? '1px solid #ea580c' : '1px solid #16a34a',
          color: currentDue > 0 ? '#ea580c' : '#16a34a',
          backgroundColor: currentDue > 0 ? '#fff7ed' : '#f0fdf4',
        }}>
          {currentDue > 0 ? (isCustomer ? 'DUE (বাকি)' : 'PAYABLE (দেনা)') : 'CLEARED (পরিশোধিত)'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            {isCustomer ? 'Customer (গ্রাহকের তথ্য)' : 'Supplier (সরবরাহকারীর তথ্য)'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>ID:</span>
            <span style={{ fontWeight: '600' }}>{e.id}</span>
            <span style={{ color: '#64748b' }}>Name:</span>
            <strong style={{ fontSize: '0.92rem' }}>{e.name}</strong>
            {e.phone && (<><span style={{ color: '#64748b' }}>Phone:</span><span style={{ fontWeight: '600' }}>{e.phone}</span></>)}
            {e.company && (<><span style={{ color: '#64748b' }}>Company:</span><span>{e.company}</span></>)}
            {e.location && (<><span style={{ color: '#64748b' }}>Address:</span><span>{e.location}</span></>)}
          </div>
        </div>

        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Balance as on {today}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
            <tbody>
              <tr><td style={{ padding: '4px 10px', color: '#475569' }}>Opening Due:</td><td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{money(e.openingDue)}</td></tr>
              <tr><td style={{ padding: '4px 10px', color: '#475569' }}>Total Charges:</td><td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{money(totalCharges)}</td></tr>
              <tr><td style={{ padding: '4px 10px', color: '#15803d', fontWeight: '600' }}>Total {isCustomer ? 'Received' : 'Paid'}:</td><td style={{ padding: '4px 10px', textAlign: 'right', color: '#15803d', fontWeight: '700' }}>৳{money(totalPayments)}</td></tr>
              <tr style={{ borderTop: '1px solid #cbd5e1', backgroundColor: currentDue > 0 ? '#fef2f2' : '#f0fdf4' }}>
                <td style={{ padding: '6px 10px', fontWeight: '800', color: currentDue > 0 ? '#b91c1c' : '#15803d' }}>Current Due:</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', fontSize: '1rem', color: currentDue > 0 ? '#b91c1c' : '#15803d' }}>৳{money(currentDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <table style={{ width: '100%', fontSize: '0.82rem', marginBottom: '0.75rem', borderCollapse: 'collapse', border: '1px solid #94a3b8' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #64748b' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center', width: '32px' }}>SL</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'left', width: '84px' }}>Date</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'left', width: '84px' }}>Ref</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left' }}>Description (বিবরণ)</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '86px' }}>{isCustomer ? 'Sale' : 'Purchase'}</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '86px' }}>{isCustomer ? 'Received' : 'Paid'}</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', width: '92px' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <td style={{ border: '1px solid #cbd5e1', padding: '4px' }} />
            <td colSpan="3" style={{ border: '1px solid #cbd5e1', padding: '4px 8px', fontStyle: 'italic', color: '#475569' }}>Opening balance</td>
            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }} />
            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }} />
            <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: '600' }}>৳{money(e.openingDue)}</td>
          </tr>
          {rows.map((r, idx) => (
            <tr key={`${r.id}-${idx}`} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#fff' }}>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>{fmtDate(r.date)}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', color: '#475569' }}>{r.id}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}>{r.description}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>{r.type === 'charge' ? `৳${money(r.amount)}` : ''}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', color: '#15803d' }}>{r.type === 'payment' ? `৳${money(r.amount)}` : ''}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: '600' }}>৳{money(r.balance)}</td>
            </tr>
          ))}
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid #64748b' }}>
            <td colSpan="4" style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>Total</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right' }}>৳{money(totalCharges)}</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', color: '#15803d' }}>৳{money(totalPayments)}</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', color: currentDue > 0 ? '#b91c1c' : '#15803d' }}>৳{money(currentDue)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        <strong style={{ color: '#475569' }}>Current Due In Words (কথায়): </strong>
        <span style={{ fontWeight: '700' }}>৳{money(currentDue)} Taka Only</span>
      </div>

      <div style={{ pageBreakInside: 'avoid', marginTop: '4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '6px', fontWeight: '600' }}>
              {isCustomer ? "Customer's Signature" : "Supplier's Signature"}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{isCustomer ? 'গ্রাহকের স্বাক্ষর' : 'সরবরাহকারীর স্বাক্ষর'}</div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '4px', fontWeight: '600' }}>Authorized Signature</div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>কর্তৃপক্ষের স্বাক্ষর</div>
          </div>
        </div>
        <PrintFooter />
      </div>
    </div>
  );
};

export default PrintableStatement;
