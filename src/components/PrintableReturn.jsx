import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';

// 'Stock Out' is a third kind of record, not a supplier reject, so it keeps its
// own wording here too.
const RETURN_LABELS = {
  Customer: 'Customer Return',
  Supplier: 'Supplier Reject',
  'Stock Out': 'Manual Stock Out',
};

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The return slip, laid out like the sales invoice so a party holding both sees
 * the same document. Supports single item or multiple items in one return memo.
 */
const PrintableReturn = ({ record, product, items }) => {
  if (!record) return null;

  const type = record.returnType || record.return_type || 'Customer';
  const label = RETURN_LABELS[type] || `${type} Reject`;
  const isCustomer = type === 'Customer';

  const dateStr = record.date
    ? new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const rawItems = Array.isArray(record.items) && record.items.length > 0
    ? record.items
    : (Array.isArray(items) && items.length > 0 ? items : [record]);

  const itemsList = rawItems.map((item, idx) => {
    const itemProd = item.product || (item.productId === product?.id ? product : null);
    const pName = item.productName || itemProd?.name || (item.productId ? `Product ${item.productId}` : 'Unknown Product');
    const pCode = item.productId || itemProd?.id || '-';
    const pUnit = item.unit || itemProd?.unit || 'pcs';
    const q = Number(item.quantity || 0);
    const r = Number(item.rate || 0);
    return {
      sl: idx + 1,
      id: item.id || record.id,
      name: pName,
      code: pCode,
      unit: pUnit,
      qty: q,
      rate: r,
      amount: r * q,
    };
  });

  const totalQty = itemsList.reduce((sum, it) => sum + it.qty, 0);
  const totalAmount = itemsList.reduce((sum, it) => sum + it.amount, 0);

  const partyLabel = isCustomer ? 'Returned By (গ্রাহক)' : 'Returned To (সরবরাহকারী)';
  const partyName = record.partyName || record.party_name || (isCustomer ? 'Walk-in Customer' : '-');
  const referenceLabel = isCustomer ? 'Sale Invoice No' : 'Purchase No';

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

      {/* Title & stock effect bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.4rem' }}>
        <div>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#0f172a' }}>
            {isCustomer ? 'RETURN MEMO (ফেরত চালান)' : 'REJECT MEMO (ফেরত চালান)'}
          </span>
        </div>
        <div>
          <span style={{
            display: 'inline-block',
            padding: '3px 12px',
            borderRadius: '4px',
            fontSize: '0.78rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: isCustomer ? '1px solid #16a34a' : '1px solid #ea580c',
            color: isCustomer ? '#16a34a' : '#ea580c',
            backgroundColor: isCustomer ? '#f0fdf4' : '#fff7ed',
          }}>
            {isCustomer ? 'Stock In (+)' : 'Stock Out (-)'}
          </span>
        </div>
      </div>

      {/* Party & record meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            {partyLabel}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>{isCustomer ? 'Customer:' : 'Supplier:'}</span>
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{partyName}</strong>

            {record.partyId ? (
              <>
                <span style={{ color: '#64748b' }}>{isCustomer ? 'Customer ID:' : 'Supplier ID:'}</span>
                <span>{record.partyId}</span>
              </>
            ) : null}

            {record.referenceId ? (
              <>
                <span style={{ color: '#64748b' }}>{referenceLabel}:</span>
                <span>{record.referenceId}</span>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            Memo Details (বিবরণ)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>Return No:</span>
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{record.id}</strong>

            <span style={{ color: '#64748b' }}>Date:</span>
            <span>{dateStr}</span>

            <span style={{ color: '#64748b' }}>Type:</span>
            <span style={{ fontWeight: '600' }}>{label}</span>
          </div>
        </div>
      </div>

      {/* Item table */}
      <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.75rem', borderCollapse: 'collapse', border: '1px solid #94a3b8' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #64748b' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center', width: '35px' }}>SL</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left' }}>Item Description (পণ্যের বিবরণ)</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '85px' }}>Code</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '85px' }}>Rate</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '60px' }}>Qty</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', width: '105px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {itemsList.map((item) => (
            <tr key={item.sl}>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px', textAlign: 'center' }}>{item.sl}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}><strong>{item.name}</strong></td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>{item.code}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>{money(item.rate)}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 'bold' }}>{item.qty} {item.unit}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{money(item.amount)}</td>
            </tr>
          ))}
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid #64748b' }}>
            <td colSpan="4" style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>
              Total Quantity:
            </td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center' }}>{totalQty}</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>{money(totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      {/* Reason & value summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Reason (কারণ)
          </div>
          <div style={{ padding: '8px 10px', minHeight: '58px', lineHeight: 1.5 }}>
            {record.reason || '-'}
            {record.notes ? (
              <div style={{ marginTop: '6px', color: '#475569', fontSize: '0.8rem' }}>
                <strong>Notes:</strong> {record.notes}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Return Settlement (হিসাব)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Total Items (মোট পণ্য):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>{itemsList.length}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Total Quantity (পরিমাণ):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>{totalQty}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Stock Effect:</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600', color: isCustomer ? '#15803d' : '#c2410c' }}>
                  {isCustomer ? `+${totalQty}` : `-${totalQty}`}
                </td>
              </tr>
              <tr style={{ borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '6px 10px', fontWeight: '800' }}>Total Return Value:</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', fontSize: '1rem' }}>{money(totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in words banner */}
      <div style={{ padding: '4px 0', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        <strong style={{ color: '#475569' }}>In Words : </strong>
        <span style={{ fontWeight: '700', color: '#0f172a' }}>{money(totalAmount)} Taka Only</span>
      </div>

      {/* Signatures */}
      <div style={{ pageBreakInside: 'avoid', marginTop: '5.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '6px', fontWeight: '600' }}>
              {isCustomer ? "Customer's Signature" : "Supplier's Signature"}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
              {isCustomer ? 'গ্রাহকের স্বাক্ষর' : 'সরবরাহকারীর স্বাক্ষর'}
            </div>
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

export default PrintableReturn;
