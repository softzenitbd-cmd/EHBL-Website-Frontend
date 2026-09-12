import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The stock report, laid out like the sales invoice so every sheet the shop
 * hands out or files away reads the same way.
 */
const PrintableInventory = ({ items = [], filters = {} }) => {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const totalStock = items.reduce((n, i) => n + Number(i.stock || 0), 0);
  const totalCost = items.reduce((n, i) => n + Number(i.stock || 0) * Number(i.purchasePrice || 0), 0);
  const totalSale = items.reduce((n, i) => n + Number(i.stock || 0) * Number(i.price || 0), 0);

  const activeFilters = Object.entries(filters).filter(([, v]) => v && v !== 'All' && v !== 'All Time');

  return (
    <div className="printable-invoice-wrapper" style={{ padding: '1.75rem 1.25rem 1.5rem 1.25rem', background: '#fff', color: '#0f172a', fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif", maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box' }}>
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
              max-width: 900px !important;
              margin: 0 auto !important;
              padding: 0 !important;
              color: #0f172a !important;
            }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        `}
      </style>

      <InvoiceHeader />

      {/* Title & date bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.4rem' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#0f172a' }}>
          STOCK REPORT (মজুদ তালিকা)
        </span>
        <span style={{
          display: 'inline-block',
          padding: '3px 12px',
          borderRadius: '4px',
          fontSize: '0.78rem',
          fontWeight: '700',
          border: '1px solid #0284c7',
          color: '#0284c7',
          backgroundColor: '#f0f9ff',
        }}>
          As on {dateStr}
        </span>
      </div>

      {/* Report meta & totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <div style={{ padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '2px' }}>
            Report Details (বিবরণ)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: '3px' }}>
            <span style={{ color: '#64748b' }}>Generated:</span>
            <span>{dateStr}</span>

            <span style={{ color: '#64748b' }}>Products Listed:</span>
            <strong>{items.length}</strong>

            {activeFilters.length > 0 && (
              <>
                <span style={{ color: '#64748b' }}>Filters:</span>
                <span>{activeFilters.map(([k, v]) => `${k}: ${v}`).join(', ')}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', color: '#334155', borderBottom: '1px solid #cbd5e1' }}>
            Stock Valuation (মজুদ মূল্য)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>Total Quantity:</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>{totalStock}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', color: '#475569' }}>At Purchase Rate:</td>
                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: '600' }}>৳{money(totalCost)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '6px 10px', fontWeight: '800' }}>At Sale Rate:</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', fontSize: '1rem' }}>৳{money(totalSale)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Product table */}
      <table style={{ width: '100%', fontSize: '0.8rem', marginBottom: '0.75rem', borderCollapse: 'collapse', border: '1px solid #94a3b8' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #64748b' }}>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'center', width: '32px' }}>SL</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'left' }}>Item Description (পণ্যের বিবরণ)</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'left', width: '80px' }}>Company</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '78px' }}>Code</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'left', width: '90px' }}>Category</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '58px' }}>Size</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center', width: '62px' }}>Stock</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '78px' }}>Purchase Rate</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right', width: '78px' }}>Sale Rate</th>
            <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right', width: '92px' }}>Stock Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const stock = Number(item.stock || 0);
            const sale = Number(item.price || 0);
            return (
              <tr key={item.id || idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px' }}><strong>{item.name}</strong></td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>{item.company || item.company_name || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center', color: '#475569' }}>{item.id}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px' }}>{item.category || item.category_name || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>{item.variant || '-'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                  {stock} {item.unit || 'Pcs'}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>৳{money(item.purchasePrice)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>৳{money(sale)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>৳{money(stock * sale)}</td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan="10" style={{ border: '1px solid #cbd5e1', padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                No products match the current filters.
              </td>
            </tr>
          )}
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid #64748b' }}>
            <td colSpan="6" style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>
              Total Products: {items.length} &nbsp;|&nbsp; Total Quantity:
            </td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'center' }}>{totalStock}</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px', textAlign: 'right' }}>৳{money(totalCost)}</td>
            <td style={{ border: '1px solid #94a3b8', padding: '6px 6px' }} />
            <td style={{ border: '1px solid #94a3b8', padding: '6px 8px', textAlign: 'right' }}>৳{money(totalSale)}</td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ pageBreakInside: 'avoid', marginTop: '4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '6px', fontWeight: '600' }}>
              Counted By
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>গণনাকারীর স্বাক্ষর</div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', margin: '0 10px', paddingTop: '4px', fontWeight: '600' }}>
              Store Keeper
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>স্টোর কিপারের স্বাক্ষর</div>
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

export default PrintableInventory;
