import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The purchase voucher, laid out like the sales invoice so every document the
 * shop files reads the same way.
 */
const PrintablePurchase = ({ purchase, supplier }) => {
  if (!purchase) return null;

  const dateStr = purchase.date
    ? new Date(purchase.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const items = purchase.items || [];
  const totalQty = items.reduce((n, i) => n + Number(i.quantity || 0), 0);

  const total = Number(purchase.total || 0);
  const paid = Number(purchase.paidAmount ?? purchase.paid ?? 0);
  const due = Number(purchase.dueAmount ?? purchase.due ?? Math.max(0, total - paid));

  const isPaid = due <= 0;
  const isPartial = !isPaid && paid > 0;

  // The supplier's overall payable, when the record is on file, so the sheet
  // shows what is still owed beyond this one voucher.
  const overallDue = Number(supplier?.due !== undefined ? supplier.due : due);
  const previousDue = Math.max(0, overallDue - due);

  return (
    <div className="printable-invoice-wrapper" style={{ padding: '1.75rem 1.25rem 1.5rem 1.25rem', background: '#fff', color: '#0f172a', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", maxWidth: '680px', margin: '0 auto', boxSizing: 'border-box' }}>
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            body {
              background: #fff !important;
              color: #0f172a !important;
            }
            .printable-invoice-wrapper {
              width: 100% !important;
              max-width: 680px !important;
              margin: 0 auto !important;
              padding: 0 !important;
              color: #0f172a !important;
            }
          }
        `}
      </style>

      <InvoiceHeader />

      {/* Title & status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.4rem' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#0f172a' }}>
          PURCHASE VOUCHER (ক্রয় চালান)
        </span>
        <span style={{
          display: 'inline-block',
          padding: '3px 12px',
          borderRadius: '4px',
          fontSize: '0.78rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          border: isPaid ? '1px solid #16a34a' : isPartial ? '1px solid #0284c7' : '1px solid #ea580c',
          color: isPaid ? '#16a34a' : isPartial ? '#0284c7' : '#ea580c',
          backgroundColor: isPaid ? '#f0fdf4' : isPartial ? '#f0f9ff' : '#fff7ed',
        }}>
          {isPaid ? 'PAID (পরিশোধিত)' : isPartial ? 'PARTIAL (আংশিক বাকি)' : 'DUE (বাকি)'}
        </span>
      </div>

      {/* Supplier & voucher meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            Purchased From (সরবরাহকারী)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>Supplier:</span>
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{purchase.supplierName || '-'}</strong>

            {supplier?.phone && (
              <>
                <span style={{ color: '#64748b' }}>Phone:</span>
                <span style={{ fontWeight: '600' }}>{supplier.phone}</span>
              </>
            )}

            {(supplier?.address || supplier?.location) && (
              <>
                <span style={{ color: '#64748b' }}>Address:</span>
                <span>{supplier.address || supplier.location}</span>
              </>
            )}

            {purchase.supplierId && (
              <>
                <span style={{ color: '#64748b' }}>Supplier ID:</span>
                <span>{purchase.supplierId}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            Voucher Details (চালান বিবরণ)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>Purchase No:</span>
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{purchase.id}</strong>

            <span style={{ color: '#64748b' }}>Date:</span>
            <span>{dateStr}</span>

            <span style={{ color: '#64748b' }}>Payment Mode:</span>
            <span style={{ fontWeight: '600' }}>
              {purchase.paymentType === 'Cash' ? 'Cash (নগদ)' : purchase.paymentType === 'Partial' ? 'Partial (আংশিক)' : 'Due (বাকি)'}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.75rem', borderCollapse: 'collapse', border: '1px solid #94a3b8' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #64748b' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center', width: '35px' }}>SL</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left' }}>Item Description (পণ্যের বিবরণ)</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '65px' }}>Unit</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '55px' }}>Qty</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '85px' }}>Rate</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', width: '105px' }}>Total (৳)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const qty = Number(item.quantity || 0);
            const rate = Number(item.price || 0);
            return (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                  <strong>{item.name}</strong>
                  {item.variant && <span style={{ marginLeft: '6px', color: '#64748b', fontSize: '0.78rem' }}>({item.variant})</span>}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>{item.unit || 'Pcs'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 'bold' }}>{qty}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>৳{money(rate)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>৳{money(rate * qty)}</td>
              </tr>
            );
          })}
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid #64748b' }}>
            <td colSpan="3" style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>
              Total Items: {items.length} &nbsp;|&nbsp; Total Quantity:
            </td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center' }}>{totalQty}</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px' }} />
            <td style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>৳{money(total)}</td>
          </tr>
        </tbody>
      </table>

      {/* Supplier balance & voucher settlement */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Supplier Due Summary (বকেয়া হিসাব)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Previous Due (পূর্বের বকেয়া):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{money(previousDue)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>This Voucher Due (এই চালানে বাকি):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{money(due)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #cbd5e1', backgroundColor: '#fef2f2' }}>
                <td style={{ padding: '6px 10px', fontWeight: '800', color: '#b91c1c' }}>Total Payable (সর্বমোট বাকি):</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: '#b91c1c', fontSize: '1rem' }}>৳{money(overallDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Voucher Settlement (চালান বিবরণী)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
            <tbody>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '4px 10px', fontWeight: '700' }}>Total Purchase Bill:</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '700', fontSize: '0.95rem' }}>৳{money(total)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', color: '#15803d', fontWeight: '600' }}>Paid Amount (পরিশোধ):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', color: '#15803d', fontWeight: '700' }}>৳{money(paid)}</td>
              </tr>
              <tr style={{ borderTop: '1px dashed #cbd5e1', backgroundColor: '#fff7ed' }}>
                <td style={{ padding: '5px 10px', fontWeight: '700', color: '#c2410c' }}>Due (এই চালানে বাকি):</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: '800', color: '#c2410c', fontSize: '0.95rem' }}>৳{money(due)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in words */}
      <div style={{ padding: '4px 0', fontSize: '0.82rem', marginBottom: purchase.notes ? '0.6rem' : '1.5rem' }}>
        <strong style={{ color: '#475569' }}>In Words (কথায়): </strong>
        <span style={{ fontWeight: '700', color: '#0f172a' }}>৳{money(total)} Taka Only</span>
      </div>

      {purchase.notes && (
        <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          <strong style={{ color: '#475569' }}>Note (মন্তব্য): </strong>
          <span>{purchase.notes}</span>
        </div>
      )}

      {/* Signatures */}
      <div style={{ pageBreakInside: 'avoid', marginTop: '4.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '6px', fontWeight: '600' }}>
              Supplier's Signature
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>সরবরাহকারীর স্বাক্ষর</div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '4px', fontWeight: '600' }}>
              Received By
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>গ্রহণকারীর স্বাক্ষর</div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '4px', fontWeight: '600' }}>
              Authorized Signature
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>কর্তৃপক্ষের স্বাক্ষর</div>
          </div>
        </div>

        <PrintFooter />
      </div>
    </div>
  );
};

export default PrintablePurchase;
