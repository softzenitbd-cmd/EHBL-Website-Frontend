import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';

const PrintableInvoice = ({ sale, customers }) => {
  if (!sale) return null;
  
  const dateStr = sale.date ? new Date(sale.date).toISOString().split('T')[0] : '';
  const customerName = sale.customerName || sale.customerInfo?.name || 'Walk-in Customer';
  
  // Find customer in store to get their due
  const customer = customers?.find(c => c.name === customerName || c.id === sale.customerId);
  
  const items = sale.items || sale.cartItems || [];
  const totalQty = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  
  const currentDue = sale.paymentType === 'Baki' ? Number(sale.total || 0) : 0;
  const overallDue = Number(customer?.due || currentDue);
  const actualPreviousDue = Math.max(0, overallDue - currentDue);

  return (
    <div style={{ padding: '1.5rem', background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      <style>
        {`
          @media print {
            @page {
              size: B5;
              margin: 10mm;
            }
          }
        `}
      </style>
      <InvoiceHeader />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
        {/* Left Column */}
        <div style={{ width: '52%', paddingRight: '10px' }}>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '5px', marginTop: '20px' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>Code:</strong> 
            <span style={{ flex: 1 }}></span>
          </div>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>Buyer's Name:</strong> 
            <span style={{ flex: 1 }}>{customerName}</span>
          </div>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>Address:</strong> 
            <span style={{ flex: 1 }}>{sale.customerInfo?.location || customer?.location || ''}</span>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>Mobile:</strong> 
            <span style={{ flex: 1 }}>{sale.customerInfo?.phone || customer?.phone || ''}</span>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ width: '46%', paddingLeft: '5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '2px', marginLeft: '-20px' }}>BILL</div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>Date:</strong> 
            <span style={{ flex: 1 }}>{dateStr}</span>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>Challan No:</strong> 
            <span style={{ flex: 1 }}>{sale.id || sale.invoiceId}</span>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>Seller Reff:</strong> 
            <span style={{ flex: 1 }}>{sale.salesman?.name || sale.salesmanName || ''}</span>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <strong style={{ whiteSpace: 'nowrap' }}>Mobile:</strong> 
            <span style={{ flex: 1 }}></span>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', fontSize: '0.9rem', marginBottom: '10px', color: '#000', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '40px' }}>SL</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Item Name</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '60px' }}>Size</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px' }}>Quantity</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '60px' }}>Unit</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '80px' }}>Rate</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '100px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const itemPrice = item.isGift ? 0 : (item.price - (item.itemDiscount || 0));
            const itemTotal = itemPrice * item.quantity;
            return (
              <tr key={idx}>
                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{item.name} {item.isGift && '(Gift)'}</td>
                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>0</td>
                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{item.unit || 'pcs'}</td>
                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{itemPrice.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{itemTotal}</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan="2" style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>Totals:-</td>
            <td style={{ border: '1px solid #000', padding: '4px' }}></td>
            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{totalQty}</td>
            <td style={{ border: '1px solid #000', padding: '4px' }}></td>
            <td style={{ border: '1px solid #000', padding: '4px' }}></td>
            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{sale.subtotal}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '15px' }}>
        <div style={{ width: '48%', display: 'flex', justifyContent: 'center' }}>
          <table style={{ width: '80%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 10px', textAlign: 'right' }}>Current Due:</td>
                <td style={{ padding: '2px 0', width: '80px', textAlign: 'left' }}>{currentDue}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 10px', textAlign: 'right' }}>Previous Due:</td>
                <td style={{ padding: '2px 0', width: '80px', textAlign: 'left' }}>{actualPreviousDue}</td>
              </tr>
              <tr>
                <td colSpan="2"><div style={{ borderBottom: '1px solid #000', margin: '2px 0' }}></div></td>
              </tr>
              <tr>
                <td style={{ padding: '2px 10px', textAlign: 'right' }}>Over all Due:</td>
                <td style={{ padding: '2px 0', width: '80px', textAlign: 'left' }}>{overallDue}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style={{ width: '46%', display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ width: '90%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '1px 10px', textAlign: 'right' }}>Total</td>
                <td style={{ padding: '1px 0', width: '80px', textAlign: 'right' }}>{sale.subtotal}</td>
              </tr>
              <tr>
                <td style={{ padding: '1px 10px', textAlign: 'right' }}>Total Discount</td>
                <td style={{ padding: '1px 0', width: '80px', textAlign: 'right' }}>{sale.invoiceDiscount || 0}</td>
              </tr>
              <tr>
                <td style={{ padding: '1px 10px', textAlign: 'right' }}>Carrying/Loading</td>
                <td style={{ padding: '1px 0', width: '80px', textAlign: 'right' }}>0</td>
              </tr>
              <tr>
                <td style={{ padding: '1px 10px', textAlign: 'right' }}>Net Sales</td>
                <td style={{ padding: '1px 0', width: '80px', textAlign: 'right' }}>{sale.total}</td>
              </tr>
              <tr>
                <td style={{ padding: '1px 10px', textAlign: 'right' }}>Paid</td>
                <td style={{ padding: '1px 0', width: '80px', textAlign: 'right' }}>{sale.paymentType === 'Cash' ? sale.total : 0}</td>
              </tr>
              <tr>
                <td style={{ padding: '1px 10px', textAlign: 'right' }}>Due</td>
                <td style={{ padding: '1px 0', width: '80px', textAlign: 'right' }}>{currentDue}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', textAlign: 'right' }}>Total Tk:</td>
                <td style={{ padding: '4px 0', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {sale.total} Taka Only
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ pageBreakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
          <div style={{ borderTop: '1px solid #000', width: '25%', textAlign: 'center' }}>Customer signature</div>
          <div style={{ borderTop: '1px solid #000', width: '25%', textAlign: 'center' }}>Delivery By</div>
          <div style={{ borderTop: '1px solid #000', width: '25%', textAlign: 'center' }}>Store Incharge</div>
        </div>

        <PrintFooter />
      </div>

    </div>
  );
};

export default PrintableInvoice;
