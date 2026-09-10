import React from 'react';
import useStore from '../store/useStore';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';
import ehblLogo from '../assets/ehbl.jpeg';

const PrintableInvoice = ({ sale, customers }) => {
  // Hooks first: the early return below must not change how many run.
  const staff = useStore((state) => state.staff) || [];
  const shopProfile = useStore((state) => state.shopProfile);

  if (!sale) return null;
  
  const dateStr = sale.date 
    ? new Date(sale.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const customerName = sale.customerName || sale.customerInfo?.name || 'Walk-in Customer';
  const customerPhone = sale.customer_phone || sale.customerInfo?.phone || '';
  const customerLocation = sale.customer_location || sale.customerInfo?.location || '';
  const customerId = sale.customerId || sale.customer_id || '';
  const invoiceNo = sale.invoice_number || sale.id || sale.invoiceId || '';
  
  // Find customer in store to get overall due
  const customer = customers?.find(c => c.name === customerName || c.id === customerId);

  // The sheet names the salesman with a mobile number, so the customer can ring
  // whoever served them. Resolve the staff record from whichever of id/name
  // the sale carries; "Admin" has no record and simply shows the name.
  const repId = sale.salesman?.id || sale.salesmanId || sale.salesman_id || '';
  const repName = sale.salesman?.name || sale.salesmanName || sale.salesman_name || 'Admin';
  const rep = staff.find(st => st.id === repId || st.staff_code === repId)
    || staff.find(st => (st.name || '').toLowerCase() === String(repName).toLowerCase());
  // "Admin" is the counter itself, so the shop's number stands in for a rep
  // who has no staff record or no phone on file.
  const shopPhone = shopProfile?.phone || '01744129480';
  const repPhone = sale.salesman?.phone || rep?.phone || shopPhone;
  
  const items = sale.items || sale.cartItems || [];
  const totalQty = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  
  const subtotal = Number(sale.subtotal || sale.total || 0);
  const total = Number(sale.total || 0);
  const paidAmount = Number(sale.paid_amount || (sale.paymentType === 'Cash' ? sale.total : 0));
  
  const currentDue = sale.due_amount !== undefined 
    ? Number(sale.due_amount) 
    : ((sale.paymentType === 'Cash') ? 0 : total);

  const overallDue = Number(customer?.due !== undefined ? customer.due : currentDue);
  const actualPreviousDue = Math.max(0, overallDue - currentDue);

  const isPaid = currentDue <= 0 || sale.paymentType === 'Cash';
  const isPartial = !isPaid && paidAmount > 0;

  return (
    <div className="printable-invoice-wrapper" style={{ position: 'relative', padding: '1.75rem 1.25rem 1.5rem 1.25rem', background: '#fff', color: '#0f172a', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", maxWidth: '680px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Watermark: the logo, faint, dead centre of the sheet, under everything. */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
        <img src={ehblLogo} alt="" style={{ width: '62%', maxWidth: '420px', opacity: 0.08, objectFit: 'contain' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
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

      {/* Standard Header with Logo */}
      <InvoiceHeader />

      {/* Invoice Title & Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.4rem' }}>
        <div>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#0f172a' }}>
            INVOICE / BILL (চালান ও বিল)
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
            border: isPaid ? '1px solid #16a34a' : isPartial ? '1px solid #0284c7' : '1px solid #ea580c',
            color: isPaid ? '#16a34a' : isPartial ? '#0284c7' : '#ea580c',
            backgroundColor: isPaid ? '#f0fdf4' : isPartial ? '#f0f9ff' : '#fff7ed'
          }}>
            Status: {isPaid ? 'PAID (পরিশোধিত)' : isPartial ? 'PARTIAL (আংশিক বাকি)' : 'DUE (বাকি)'}
          </span>
        </div>
      </div>

      {/* Customer Info & Invoice Meta Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        {/* Customer Box */}
        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            Bill To (গ্রাহকের তথ্য)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', rowGap: '3px' }}>
            {customerId && (
              <>
                <span style={{ color: '#64748b' }}>Customer ID:</span>
                <span style={{ fontWeight: '600' }}>{customerId}</span>
              </>
            )}

            <span style={{ color: '#64748b' }}>Customer:</span>
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{customerName}</strong>

            {customerPhone && (
              <>
                <span style={{ color: '#64748b' }}>Phone:</span>
                <span style={{ fontWeight: '600' }}>{customerPhone}</span>
              </>
            )}

            {customerLocation && (
              <>
                <span style={{ color: '#64748b' }}>Address:</span>
                <span>{customerLocation}</span>
              </>
            )}

          </div>
        </div>

        {/* Invoice Meta Box */}
        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            Invoice Details (চালান বিবরণ)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>Invoice No:</span>
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{invoiceNo}</strong>

            <span style={{ color: '#64748b' }}>Date:</span>
            <span>{dateStr}</span>

            <span style={{ color: '#64748b' }}>Sales Rep:</span>
            <span style={{ fontWeight: '600' }}>{repName}</span>

            <span style={{ color: '#64748b' }}>Rep Mobile:</span>
            <span style={{ fontWeight: '600' }}>{repPhone}</span>

            <span style={{ color: '#64748b' }}>Payment Mode:</span>
            <span style={{ fontWeight: '600' }}>{sale.paymentType === 'Cash' ? 'Cash (নগদ)' : 'Due (বাকি)'}</span>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.75rem', borderCollapse: 'collapse', border: '1px solid #94a3b8' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #64748b' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center', width: '35px' }}>SL</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left' }}>Item Description (পণ্যের বিবরণ)</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '85px' }}>Code</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '85px' }}>Unit Price</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '60px' }}>Qty</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', width: '105px' }}>Total (৳)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const itemPrice = Number(item.price || 0);
            const itemQty = Number(item.quantity || 1);
            const itemTotal = itemPrice * itemQty;
            const code = item.product_code || item.id || '-';

            return (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                  <strong>{item.name}</strong>
                  {item.isGift && <span style={{ marginLeft: '6px', color: '#16a34a', fontSize: '0.75rem' }}>(Gift)</span>}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontSize: '0.8rem', color: '#475569' }}>{code}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>৳{itemPrice.toLocaleString()}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 'bold' }}>{itemQty} {item.unit || 'pcs'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>৳{itemTotal.toLocaleString()}</td>
              </tr>
            );
          })}
          {/* Subtotal Row */}
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid #64748b' }}>
            <td colSpan="4" style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>
              Total Items: {items.length} &nbsp;|&nbsp; Total Quantity:
            </td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center' }}>
              {totalQty}
            </td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>
              ৳{subtotal.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Account Balance & Financial Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
        {/* Left: Customer Account Due Balance */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Customer Due Summary (বকেয়া হিসাব)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Previous Due (পূর্বের বকেয়া):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{actualPreviousDue.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Current Invoice Due (এই চালানে বাকি):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{currentDue.toLocaleString()}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #cbd5e1', backgroundColor: '#fef2f2' }}>
                <td style={{ padding: '6px 10px', fontWeight: '800', color: '#b91c1c' }}>Total Net Due (সর্বমোট বাকি):</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: '#b91c1c', fontSize: '1rem' }}>৳{overallDue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: Invoice Calculation */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Invoice Settlement (চালান বিবরণী)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Subtotal:</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{subtotal.toLocaleString()}</td>
              </tr>
              {Number(sale.invoiceDiscount || 0) > 0 && (
                <tr>
                  <td style={{ padding: '4px 10px', color: '#475569' }}>Discount:</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', color: '#16a34a' }}>-৳{Number(sale.invoiceDiscount).toLocaleString()}</td>
                </tr>
              )}
              <tr style={{ borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '4px 10px', fontWeight: '700' }}>Total Invoice Bill:</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '700', fontSize: '0.95rem' }}>৳{total.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', color: '#15803d', fontWeight: '600' }}>Paid Amount (পরিশোধ):</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', color: '#15803d', fontWeight: '700' }}>৳{paidAmount.toLocaleString()}</td>
              </tr>
              <tr style={{ borderTop: '1px dashed #cbd5e1', backgroundColor: '#fff7ed' }}>
                <td style={{ padding: '5px 10px', fontWeight: '700', color: '#c2410c' }}>Current Due (এই বিলে বাকি):</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: '800', color: '#c2410c', fontSize: '0.95rem' }}>৳{currentDue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in words banner */}
      <div style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        <strong style={{ color: '#475569' }}>In Words (কথায়): </strong>
        <span style={{ fontWeight: '700', color: '#0f172a' }}>৳{total.toLocaleString()} Taka Only</span>
      </div>

      {/* Signatures Section */}
      <div style={{ pageBreakInside: 'avoid', marginTop: '5.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '6px', fontWeight: '600' }}>
              Customer's Signature
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>গ্রাহকের স্বাক্ষর</div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '4px', fontWeight: '600' }}>
              Delivered By
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>সরবরাহকারীর স্বাক্ষর</div>
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

    </div>
  );
};

export default PrintableInvoice;
