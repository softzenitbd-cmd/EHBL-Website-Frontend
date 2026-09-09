import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The money receipt for a settled due, laid out like the sales invoice.
 *
 * `settlement` carries the balances frozen at the moment the payment was taken,
 * so an old receipt reprinted today still shows what was owed then.
 * `allocations` is only known right after saving - the documents this payment
 * happened to clear - and is simply left out when reprinting later.
 */
const PrintablePayment = ({ settlement, party, allocations = [] }) => {
  if (!settlement) return null;

  const isSupplier = (settlement.type || settlement.settlement_type) === 'Supplier';
  const partyLabel = isSupplier ? 'Paid To (সরবরাহকারী)' : 'Received From (গ্রাহক)';
  const docLabel = isSupplier ? 'PAYMENT VOUCHER (পরিশোধ রসিদ)' : 'MONEY RECEIPT (প্রাপ্তি রসিদ)';
  const docsLabel = isSupplier ? 'Purchase' : 'Invoice';

  const dateStr = settlement.date
    ? new Date(settlement.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const amount = Number(settlement.amount || 0);
  const previousDue = Number(settlement.previousDue ?? settlement.previous_due ?? 0);
  const remainingDue = Number(settlement.remainingDue ?? settlement.remaining_due ?? Math.max(0, previousDue - amount));
  const isCleared = remainingDue <= 0;

  const partyName = settlement.partyName || party?.name || settlement.targetId || '-';

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

      {/* Title & status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.4rem' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#0f172a' }}>
          {docLabel}
        </span>
        <span style={{
          display: 'inline-block',
          padding: '3px 12px',
          borderRadius: '4px',
          fontSize: '0.78rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          border: isCleared ? '1px solid #16a34a' : '1px solid #ea580c',
          color: isCleared ? '#16a34a' : '#ea580c',
          backgroundColor: isCleared ? '#f0fdf4' : '#fff7ed',
        }}>
          {isCleared ? 'Cleared (সম্পূর্ণ পরিশোধিত)' : 'Balance Remains (বাকি আছে)'}
        </span>
      </div>

      {/* Party & voucher meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            {partyLabel}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>Name:</span>
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{partyName}</strong>

            {party?.phone && (
              <>
                <span style={{ color: '#64748b' }}>Phone:</span>
                <span style={{ fontWeight: '600' }}>{party.phone}</span>
              </>
            )}

            {(party?.location || party?.address) && (
              <>
                <span style={{ color: '#64748b' }}>Address:</span>
                <span>{party.location || party.address}</span>
              </>
            )}

            {(settlement.targetId || settlement.target_id) && (
              <>
                <span style={{ color: '#64748b' }}>Party ID:</span>
                <span>{settlement.targetId || settlement.target_id}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            Receipt Details (রসিদ বিবরণ)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>Receipt No:</span>
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{settlement.id || settlement.settlement_code}</strong>

            <span style={{ color: '#64748b' }}>Date:</span>
            <span>{dateStr}</span>

            <span style={{ color: '#64748b' }}>Method:</span>
            <span style={{ fontWeight: '600' }}>{settlement.paymentMethod || settlement.payment_method || 'Cash'}</span>
          </div>
        </div>
      </div>

      {/* What the money was applied to */}
      {allocations.length > 0 && (
        <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.75rem', borderCollapse: 'collapse', border: '1px solid #94a3b8' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #64748b' }}>
              <th style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center', width: '35px' }}>SL</th>
              <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left' }}>{docsLabel} Settled (যে চালানে জমা হয়েছে)</th>
              <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '90px' }}>Date</th>
              <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '95px' }}>Bill</th>
              <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '95px' }}>Applied</th>
              <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', width: '95px' }}>Still Due</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a, idx) => (
              <tr key={a.id || idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}><strong>{a.id}</strong></td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>{a.date}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>৳{money(a.total)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>৳{money(a.applied)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right' }}>৳{money(a.remaining)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid #64748b' }}>
              <td colSpan="4" style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>
                Applied to {allocations.length} {docsLabel.toLowerCase()}{allocations.length === 1 ? '' : 's'}:
              </td>
              <td style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right' }}>
                ৳{money(allocations.reduce((n, a) => n + Number(a.applied || 0), 0))}
              </td>
              <td style={{ border: '1px solid #94a3b8', padding: '6px 8px' }} />
            </tr>
          </tbody>
        </table>
      )}

      {/* Balance summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Balance (হিসাব)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Due Before (পূর্বের বকেয়া):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{money(previousDue)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', color: '#15803d', fontWeight: '600' }}>This Payment (এই পরিশোধ):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', color: '#15803d', fontWeight: '700' }}>&minus; ৳{money(amount)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #cbd5e1', backgroundColor: isCleared ? '#f0fdf4' : '#fef2f2' }}>
                <td style={{ padding: '6px 10px', fontWeight: '800', color: isCleared ? '#15803d' : '#b91c1c' }}>Due After (অবশিষ্ট বকেয়া):</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: isCleared ? '#15803d' : '#b91c1c', fontSize: '1rem' }}>৳{money(remainingDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Amount {isSupplier ? 'Paid' : 'Received'} (পরিমাণ)
          </div>
          <div style={{ padding: '0.9rem 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
              ৳{money(amount)}
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#64748b' }}>
              by {settlement.paymentMethod || settlement.payment_method || 'Cash'}
            </div>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      <div style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.82rem', marginBottom: settlement.notes ? '0.6rem' : '1.5rem' }}>
        <strong style={{ color: '#475569' }}>In Words (কথায়): </strong>
        <span style={{ fontWeight: '700', color: '#0f172a' }}>৳{money(amount)} Taka Only</span>
      </div>

      {settlement.notes && (
        <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          <strong style={{ color: '#475569' }}>Note (মন্তব্য): </strong>
          <span>{settlement.notes}</span>
        </div>
      )}

      {/* Signatures */}
      <div style={{ pageBreakInside: 'avoid', marginTop: '4.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '6px', fontWeight: '600' }}>
              {isSupplier ? "Receiver's Signature" : "Payer's Signature"}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
              {isSupplier ? 'গ্রহণকারীর স্বাক্ষর' : 'প্রদানকারীর স্বাক্ষর'}
            </div>
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

export default PrintablePayment;
