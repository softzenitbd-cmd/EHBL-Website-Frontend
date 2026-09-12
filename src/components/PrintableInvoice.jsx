import React from 'react';
import useStore from '../store/useStore';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';
import ehblLogo from '../assets/ehbl.jpeg';
import { numberToWords } from '../utils/numberToWords';

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

  const itemCount = items.length;
  const isLarge = itemCount > 7;
  const isCompact = itemCount > 12;
  const isVeryCompact = itemCount > 16;

  const signatureMarginTop = isVeryCompact 
    ? '0.65rem' 
    : isCompact 
    ? '1.25rem' 
    : isLarge 
    ? '2rem' 
    : '4.25rem';

  return (
    <div className="printable-invoice-wrapper" style={{ position: 'relative', padding: isCompact ? '0.85rem 1rem' : '1.5rem 1.25rem', background: '#fff', color: '#0f172a', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", maxWidth: '680px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Watermark: the logo, faint, dead centre of the sheet.
          It sits ABOVE the content, not under it - the item table and the
          summary boxes have solid backgrounds that would hide anything behind
          them. `multiply` drops the logo's white ground so only the mark
          itself tints the paper, and the text underneath stays legible. */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <img src={ehblLogo} alt="" className="invoice-watermark" style={{ width: '78%', maxWidth: '520px', opacity: 0.12, objectFit: 'contain', mixBlendMode: 'multiply' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            body {
              background: #fff !important;
              color: #000000 !important;
            }
            .printable-invoice-wrapper {
              width: 100% !important;
              max-width: 680px !important;
              margin: 0 auto !important;
              padding: 0 !important;
              color: #000000 !important;
            }
            .invoice-watermark {
              opacity: 0.12 !important;
            }
          }
        `}
      </style>

      {/* Standard Header with Logo */}
      <InvoiceHeader compact={isLarge} />

      {/* Invoice Title & Status Bar */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: isCompact ? '0.3rem' : isLarge ? '0.5rem' : '0.85rem', paddingBottom: '0.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '25px', height: '1.5px', backgroundColor: '#000000' }}></div>
          <span style={{
            display: 'inline-block',
            padding: isCompact ? '1px 14px' : '2px 18px',
            fontSize: isCompact ? '0.95rem' : '1.15rem',
            fontWeight: '900',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            color: '#000000',
            border: '1.5px solid #000000',
            borderRadius: '20px',
            backgroundColor: '#ffffff'
          }}>
            BILL
          </span>
          <div style={{ width: '25px', height: '1.5px', backgroundColor: '#000000' }}></div>
        </div>
        <div style={{ position: 'absolute', right: 0 }}>
          <span style={{
            display: 'inline-block',
            padding: isCompact ? '2px 8px' : '3px 12px',
            borderRadius: '4px',
            fontSize: isCompact ? '0.72rem' : '0.78rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: isPaid ? '1.5px solid #16a34a' : isPartial ? '1.5px solid #0284c7' : '1.5px solid #000000',
            color: isPaid ? '#15803d' : isPartial ? '#0369a1' : '#000000',
            backgroundColor: isPaid ? '#f0fdf4' : isPartial ? '#f0f9ff' : '#f8fafc'
          }}>
            Status: {isPaid ? 'PAID (পরিশোধিত)' : isPartial ? 'PARTIAL (আংশিক বাকি)' : 'DUE (বাকি)'}
          </span>
        </div>
      </div>

      {/* Customer Info & Invoice Meta Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: isCompact ? '0.4rem' : isLarge ? '0.7rem' : '1.1rem', fontSize: isCompact ? '0.76rem' : '0.85rem' }}>
        {/* Customer Info */}
        <div>
          <div style={{ marginBottom: isCompact ? '2px' : '5px' }}>
            <span style={{ display: 'inline-block', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.84rem', textTransform: 'uppercase', color: '#000000', paddingBottom: '1px', borderBottom: '1px solid #000000' }}>
              Bill To (গ্রাহকের তথ্য)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '80px 1fr' : '88px 1fr', rowGap: isCompact ? '1px' : '3px', color: '#000000', paddingTop: '1px' }}>
            {customerId && (
              <>
                <span style={{ color: '#000000', fontWeight: '700' }}>Customer ID:</span>
                <span style={{ color: '#000000', fontWeight: '800' }}>{customerId}</span>
              </>
            )}

            <span style={{ color: '#000000', fontWeight: '700' }}>Customer:</span>
            <strong style={{ color: '#000000', fontSize: isCompact ? '0.82rem' : '0.92rem', fontWeight: '800' }}>{customerName}</strong>

            {customerLocation && (
              <>
                <span style={{ color: '#000000', fontWeight: '700' }}>Address:</span>
                <span style={{ color: '#000000', fontWeight: '600' }}>{customerLocation}</span>
              </>
            )}

            {customerPhone && (
              <>
                <span style={{ color: '#000000', fontWeight: '700' }}>Phone:</span>
                <span style={{ color: '#000000', fontWeight: '700' }}>{customerPhone}</span>
              </>
            )}
          </div>
        </div>

        {/* Invoice Meta */}
        <div>
          <div style={{ marginBottom: isCompact ? '2px' : '5px' }}>
            <span style={{ display: 'inline-block', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.84rem', textTransform: 'uppercase', color: '#000000', paddingBottom: '1px', borderBottom: '1px solid #000000' }}>
              Invoice Details (চালান বিবরণ)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '85px 1fr' : '95px 1fr', rowGap: isCompact ? '1px' : '3px', color: '#000000', paddingTop: '1px' }}>
            <span style={{ color: '#000000', fontWeight: '700' }}>Date:</span>
            <strong style={{ color: '#000000', fontWeight: '800' }}>{dateStr}</strong>

            <span style={{ color: '#000000', fontWeight: '700' }}>Invoice No:</span>
            <strong style={{ color: '#000000', fontSize: isCompact ? '0.82rem' : '0.92rem', fontWeight: '800' }}>{invoiceNo}</strong>

            <span style={{ color: '#000000', fontWeight: '700' }}>Sales Rep:</span>
            <span style={{ color: '#000000', fontWeight: '700' }}>{repName}</span>

            <span style={{ color: '#000000', fontWeight: '700' }}>Rep Mobile:</span>
            <span style={{ color: '#000000', fontWeight: '700' }}>{repPhone}</span>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <table style={{ width: '100%', fontSize: isCompact ? '0.74rem' : isLarge ? '0.78rem' : '0.85rem', marginBottom: isCompact ? '0.4rem' : isLarge ? '0.65rem' : '0.85rem', borderCollapse: 'collapse', border: '1px solid #000000', color: '#000000' }}>
        <thead>
          <tr style={{ backgroundColor: '#27272a', borderBottom: '1px solid #000000', color: '#ffffff' }}>
            <th style={{ border: '1px solid #3f3f46', padding: isCompact ? '3px 3px' : isLarge ? '5px 4px' : '8px 4px', textAlign: 'center', width: '32px', color: '#ffffff', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.95rem' }}>SL</th>
            <th style={{ border: '1px solid #3f3f46', padding: isCompact ? '3px 3px' : isLarge ? '5px 4px' : '8px 4px', textAlign: 'center', width: isCompact ? '68px' : '75px', color: '#ffffff', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.95rem' }}>Code</th>
            <th style={{ border: '1px solid #3f3f46', padding: isCompact ? '3px 6px' : isLarge ? '5px 6px' : '8px 8px', textAlign: 'left', color: '#ffffff', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.95rem' }}>Item Description (পণ্যের বিবরণ)</th>
            <th style={{ border: '1px solid #3f3f46', padding: isCompact ? '3px 3px' : isLarge ? '5px 4px' : '8px 4px', textAlign: 'center', width: isCompact ? '55px' : '65px', color: '#ffffff', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.95rem' }}>Size</th>
            <th style={{ border: '1px solid #3f3f46', padding: isCompact ? '3px 5px' : isLarge ? '5px 6px' : '8px 6px', textAlign: 'right', width: isCompact ? '80px' : '90px', color: '#ffffff', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.95rem' }}>Rate(Taka)</th>
            <th style={{ border: '1px solid #3f3f46', padding: isCompact ? '3px 3px' : isLarge ? '5px 4px' : '8px 4px', textAlign: 'center', width: isCompact ? '50px' : '55px', color: '#ffffff', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.95rem' }}>Qty</th>
            <th style={{ border: '1px solid #3f3f46', padding: isCompact ? '3px 6px' : isLarge ? '5px 6px' : '8px 8px', textAlign: 'right', width: isCompact ? '85px' : '95px', color: '#ffffff', fontWeight: '800', fontSize: isCompact ? '0.78rem' : '0.95rem' }}>Total (৳)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const itemPrice = Number(item.price || 0);
            const itemQty = Number(item.quantity || 1);
            const itemTotal = itemPrice * itemQty;
            const code = item.product_code || item.id || '-';
            const size = item.size || item.variant || '-';
            const cellPad = isVeryCompact ? '2px 3px' : isCompact ? '2.5px 4px' : isLarge ? '3.5px 4px' : '5px 4px';

            return (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff', color: '#000000' }}>
                <td style={{ border: '1px solid #000000', padding: cellPad, textAlign: 'center', color: '#000000', fontWeight: '600', fontSize: isCompact ? '0.72rem' : 'inherit' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000000', padding: cellPad, textAlign: 'center', fontSize: isCompact ? '0.7rem' : '0.82rem', color: '#000000', fontWeight: '700' }}>{code}</td>
                <td style={{ border: '1px solid #000000', padding: isCompact ? (isVeryCompact ? '2px 5px' : '2.5px 6px') : '5px 8px', color: '#000000', lineHeight: 1.25 }}>
                  <strong style={{ color: '#000000', fontWeight: '700', fontSize: isCompact ? '0.74rem' : 'inherit' }}>{item.name}</strong>
                  {item.isGift && <span style={{ marginLeft: '6px', color: '#16a34a', fontSize: '0.72rem', fontWeight: 'bold' }}>(Gift)</span>}
                </td>
                <td style={{ border: '1px solid #000000', padding: cellPad, textAlign: 'center', fontSize: isCompact ? '0.7rem' : '0.82rem', color: '#000000', fontWeight: '600' }}>{size}</td>
                <td style={{ border: '1px solid #000000', padding: isCompact ? '2.5px 4px' : '5px 6px', textAlign: 'right', color: '#000000', fontWeight: '600', fontSize: isCompact ? '0.73rem' : 'inherit' }}>৳{itemPrice.toLocaleString()}</td>
                <td style={{ border: '1px solid #000000', padding: cellPad, textAlign: 'center', color: '#000000', fontWeight: '800', fontSize: isCompact ? '0.73rem' : 'inherit' }}>{itemQty} {item.unit || 'pcs'}</td>
                <td style={{ border: '1px solid #000000', padding: isCompact ? '2.5px 5px' : '5px 8px', textAlign: 'right', color: '#000000', fontWeight: '800', fontSize: isCompact ? '0.75rem' : 'inherit' }}>৳{itemTotal.toLocaleString()}</td>
              </tr>
            );
          })}
          {/* Subtotal Row */}
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '1px solid #000000', color: '#000000' }}>
            <td colSpan="5" style={{ border: '1px solid #000000', padding: isCompact ? '3px 6px' : '6px 8px', textAlign: 'right', color: '#000000', fontWeight: '800', fontSize: isCompact ? '0.74rem' : 'inherit' }}>
              Total Items: {items.length} &nbsp;|&nbsp; Total Quantity:
            </td>
            <td style={{ border: '1px solid #000000', padding: isCompact ? '3px 3px' : '6px 4px', textAlign: 'center', color: '#000000', fontWeight: '900', fontSize: isCompact ? '0.76rem' : 'inherit' }}>
              {totalQty}
            </td>
            <td style={{ border: '1px solid #000000', padding: isCompact ? '3px 6px' : '6px 8px', textAlign: 'right', color: '#000000', fontWeight: '900', fontSize: isCompact ? '0.78rem' : 'inherit' }}>
              ৳{subtotal.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Account Balance & Financial Summary Grid (Clean borderless layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isCompact ? '1.5rem' : '3rem', marginBottom: isCompact ? '0.35rem' : isLarge ? '0.7rem' : '1.25rem', fontSize: isCompact ? '0.75rem' : '0.85rem' }}>
        {/* Left: Customer Account Due Balance */}
        <div style={{ maxWidth: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000000' }}>
            <tbody>
              <tr>
                <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', color: '#000000', fontWeight: '700' }}>Previous Due (পূর্বের বকেয়া):</td>
                <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', textAlign: 'right', fontWeight: '800', color: '#000000' }}>৳{actualPreviousDue.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', color: '#000000', fontWeight: '700' }}>Current Invoice Due (এই চালানে বাকি):</td>
                <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', textAlign: 'right', fontWeight: '800', color: '#000000' }}>৳{currentDue.toLocaleString()}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #000000' }}>
                <td style={{ padding: isCompact ? '2.5px 0' : '5px 0', fontWeight: '900', color: '#b91c1c' }}>Total Net Due (সর্বমোট বাকি):</td>
                <td style={{ padding: isCompact ? '2.5px 0' : '5px 0', textAlign: 'right', fontWeight: '900', color: '#b91c1c', fontSize: isCompact ? '0.85rem' : '1rem' }}>৳{overallDue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: Invoice Calculation */}
        <div style={{ marginLeft: 'auto', width: '100%', maxWidth: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000000' }}>
            <tbody>
              <tr>
                <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', color: '#000000', fontWeight: '700' }}>Subtotal:</td>
                <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', textAlign: 'right', fontWeight: '800', color: '#000000' }}>৳{subtotal.toLocaleString()}</td>
              </tr>
              {Number(sale.invoiceDiscount || 0) > 0 && (
                <tr>
                  <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', color: '#000000', fontWeight: '700' }}>Discount:</td>
                  <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>-৳{Number(sale.invoiceDiscount).toLocaleString()}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: isCompact ? '2px 0' : '5px 0', fontWeight: '800', color: '#000000' }}>Total Invoice Bill:</td>
                <td style={{ padding: isCompact ? '2px 0' : '5px 0', textAlign: 'right', fontWeight: '900', fontSize: isCompact ? '0.82rem' : '0.95rem', color: '#000000' }}>৳{total.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', color: '#15803d', fontWeight: '800' }}>Paid Amount (পরিশোধ):</td>
                <td style={{ padding: isCompact ? '1.5px 0' : '4px 0', textAlign: 'right', color: '#15803d', fontWeight: '900' }}>৳{paidAmount.toLocaleString()}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #000000' }}>
                <td style={{ padding: isCompact ? '2px 0' : '5px 0', fontWeight: '800', color: '#c2410c' }}>Current Due (এই বিলে বাকি):</td>
                <td style={{ padding: isCompact ? '2px 0' : '5px 0', textAlign: 'right', fontWeight: '900', color: '#c2410c', fontSize: isCompact ? '0.82rem' : '0.95rem' }}>৳{currentDue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in words */}
      <div style={{ border: 'none', borderTop: 'none', borderBottom: 'none', padding: isCompact ? '2px 0' : '4px 0', fontSize: isCompact ? '0.78rem' : '0.95rem', marginBottom: isCompact ? '0.4rem' : isLarge ? '0.8rem' : '1.25rem', color: '#000000', lineHeight: 1.3 }}>
        <strong style={{ color: '#000000', fontWeight: '900' }}>In Words (কথায়): </strong>
        <span style={{ fontWeight: '800', color: '#000000', letterSpacing: '0.2px' }}>{numberToWords(total)}</span>
      </div>

      {/* Signatures Section */}
      <div style={{ pageBreakInside: 'avoid', marginTop: signatureMarginTop }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isCompact ? '1rem' : '1.5rem', textAlign: 'center', fontSize: isCompact ? '0.76rem' : '0.82rem', color: '#000000' }}>
          <div>
            <div style={{ borderTop: '1.5px solid #000000', width: isCompact ? '110px' : '130px', margin: '0 auto', paddingTop: isCompact ? '4px' : '6px', fontWeight: '800', color: '#000000' }}>
              Customer's Signature
            </div>
            <div style={{ color: '#000000', fontSize: isCompact ? '0.7rem' : '0.78rem', fontWeight: '600', marginTop: '1px' }}>গ্রাহকের স্বাক্ষর</div>
          </div>
          <div>
            <div style={{ borderTop: '1.5px solid #000000', width: isCompact ? '110px' : '130px', margin: '0 auto', paddingTop: isCompact ? '4px' : '6px', fontWeight: '800', color: '#000000' }}>
              Delivered By
            </div>
            <div style={{ color: '#000000', fontSize: isCompact ? '0.7rem' : '0.78rem', fontWeight: '600', marginTop: '1px' }}>সরবরাহকারীর স্বাক্ষর</div>
          </div>
          <div>
            <div style={{ borderTop: '1.5px solid #000000', width: isCompact ? '110px' : '130px', margin: '0 auto', paddingTop: isCompact ? '4px' : '6px', fontWeight: '800', color: '#000000' }}>
              Authorized Signature
            </div>
            <div style={{ color: '#000000', fontSize: isCompact ? '0.7rem' : '0.78rem', fontWeight: '600', marginTop: '1px' }}>কর্তৃপক্ষের স্বাক্ষর</div>
          </div>
        </div>

        <PrintFooter compact={isLarge} />
      </div>
      </div>

    </div>
  );
};

export default PrintableInvoice;
