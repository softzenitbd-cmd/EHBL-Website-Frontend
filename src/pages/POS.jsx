import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Search, Plus, Minus, Trash2, Gift, Database, List, Printer, Eye, Download, FilePlus } from 'lucide-react';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintableInvoice from '../components/PrintableInvoice';
import PrintFooter from '../components/PrintFooter';
import './POS.css';

const POS = () => {
  const { cart, inventory, staff, user, customers, addToCart, removeFromCart, updateCartItem, clearCart, loadDummyData, processSale, sales, showToast, deleteSale } = useStore();
  const [activeTab, setActiveTab] = useState('New'); // 'New' or 'History'
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'add') {
      setActiveTab('New');
    } else {
      setActiveTab('History');
    }
  }, [location.search]);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', location: '' });
  // Suggestions for the customer box. The shop mostly serves regulars, so
  // typing a letter or two should bring the name up; anyone not on file can
  // still be typed in full, which is how a walk-in gets billed.
  const customerOptions = useMemo(() => {
    const seen = new Map(); // lower-cased name -> customer, to drop duplicates
    (customers || []).forEach((c) => {
      const name = String(c.name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, { id: c.id, name, phone: c.phone || '', location: c.location || '' });
    });
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  // Remembers whose details were filled in automatically, so they can be taken
  // back out again if the name is changed to someone else. Anything the shop
  // typed by hand is left alone.
  const [autoFilledFor, setAutoFilledFor] = useState(null);

  // Picking a name off the list fills in what the shop already knows about
  // them, so a regular does not have to have their phone retyped every visit.
  const handleCustomerNameChange = (name) => {
    const match = customerOptions.find(
      (c) => c.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (match) {
      setCustomerInfo({ name: match.name, phone: match.phone, location: match.location });
      setAutoFilledFor(match.name);
      return;
    }

    // Typing over a name that was picked from the list means a different
    // person, so the previous one's phone and address must not stay behind and
    // end up on their bill.
    setCustomerInfo((prev) => (
      autoFilledFor
        ? { name, phone: '', location: '' }
        : { ...prev, name }
    ));
    setAutoFilledFor(null);
  };

  const [paymentType, setPaymentType] = useState('Cash');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [selectedSalesman, setSelectedSalesman] = useState(user?.id || 'Admin');
  const [completedSale, setCompletedSale] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const filteredSales = sales.filter(s => {
    if (!startDate && !endDate) return true;
    const sDate = s.date.split('T')[0];
    if (startDate && sDate < startDate) return false;
    if (endDate && sDate > endDate) return false;
    return true;
  });

  // Automatically focus barcode input on mount
  useEffect(() => {
    document.getElementById('barcode-input')?.focus();
  }, []);

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    // Search by ID or exact Name match (case-insensitive)
    const product = inventory.find(p => 
      p.id === barcodeInput.trim() || 
      p.name.toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (product) {
      addToCart({ ...product, isGift: false, itemDiscount: 0 });
      setBarcodeInput('');
    } else {
      showToast('Product not found!', 'error');
    }
  };

  const toggleGift = (item) => {
    updateCartItem(item.id, { isGift: !item.isGift });
  };

  const subtotal = cart.reduce((acc, item) => {
    const effectivePrice = item.isGift ? 0 : (item.price - (item.itemDiscount || 0));
    return acc + (effectivePrice * item.quantity);
  }, 0);

  const total = Math.max(0, subtotal - invoiceDiscount);

  const handleDeleteSale = async (sale) => {
    const confirmed = confirm(
      `Delete invoice ${sale.id}?\n\n` +
      `Customer: ${sale.customerName || 'N/A'}\n` +
      `Total: ${Number(sale.total || 0).toLocaleString()}\n\n` +
      `The sold items will go back into stock` +
      (Number(sale.due_amount || 0) > 0
        ? ` and ${Number(sale.due_amount).toLocaleString()} will be removed from the customer's due.`
        : '.') +
      `\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    const result = await deleteSale(sale.id);
    showToast(
      result.success ? `Invoice ${sale.id} deleted and stock reversed.` : `Invoice was not deleted: ${result.error}`,
      result.success ? 'success' : 'error'
    );
  };

  const handleCheckout = async () => {
    if (!customerInfo.name) {
      showToast('Customer Name is explicitly required for all sales!', 'error');
      return;
    }

    const salesmanObj = staff.find(s => s.id === selectedSalesman) || { id: 'Admin', name: 'Admin' };
    const saleData = {
      cartItems: cart,
      paymentType,
      customerInfo,
      invoiceDiscount,
      salesman: salesmanObj
    };

    setIsSaving(true);
    const result = await processSale(saleData);
    setIsSaving(false);

    if (!result.success) {
      showToast(`Sale was not saved: ${result.error}`, 'error');
      return;
    }

    // Show the invoice the server actually stored, so the receipt carries the
    // real invoice number rather than a locally generated one.
    setCompletedSale(result.data);
    showToast('Sale completed successfully!', 'success');

    clearCart();
    setCustomerInfo({ name: '', phone: '', location: '' });
    setInvoiceDiscount(0);
  };

  return (
    <div className="pos-page animate-fade-in">
      <div className="card" style={{ padding: '0.5rem', marginBottom: '1rem', maxWidth: '400px', margin: '0 auto 1rem auto' }}>
        <div className="segmented-control">
          <button 
            type="button"
            className={activeTab === 'New' ? 'active' : ''}
            onClick={() => setActiveTab('New')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Point of Sale
          </button>
          <button 
            type="button"
            className={activeTab === 'History' ? 'active' : ''}
            onClick={() => setActiveTab('History')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <List size={16} /> Sales History
          </button>
        </div>
      </div>

      {activeTab === 'New' && (
      <div className="pos-container animate-fade-in">
        <div className="pos-left glass">
          <div className="pos-header">
            <h2>Point of Sale</h2>
          <form onSubmit={handleBarcodeSubmit} className="barcode-form">
            <Search size={18} className="text-muted" />
            <input 
              id="barcode-input"
              type="text" 
              placeholder="Scan Barcode or Enter ID..." 
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        </div>

        {/* Quick Add Section */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          {inventory.length === 0 ? (
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={loadDummyData}>
              <Database size={16} /> Load Dummy Inventory
            </button>
          ) : (
            inventory.slice(0, 5).map(item => (
              <button 
                key={item.id} 
                className="btn-icon" 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--bg-input)'
                }}
                onClick={() => addToCart({ ...item, isGift: false, itemDiscount: 0 })}
              >
                {item.name} (Buy: {item.purchasePrice || 0} | Sell: {item.price})
              </button>
            ))
          )}
        </div>

        <div className="cart-list">
          {cart.length === 0 ? (
            <div className="empty-cart text-muted">Cart is empty. Scan an item to begin.</div>
          ) : (
            cart.map(item => (
              <div className="cart-item glass" key={item.id}>
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <span className="text-muted">ID: {item.id} | Buy: {item.purchasePrice || 0} | Sell: {item.price} x {item.quantity}</span>
                </div>
                <div className="item-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="quantity-control" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-input)', padding: '0.25rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                    <button 
                      className="btn-icon" 
                      style={{ padding: '0.2rem' }}
                      onClick={() => updateCartItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '0.9rem', fontWeight: '600' }}>{item.quantity}</span>
                    <button 
                      className="btn-icon" 
                      style={{ padding: '0.2rem' }}
                      onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="item-discount" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span className="text-muted" style={{fontSize: '0.8rem'}}>Disc:</span>
                    <input 
                      type="number" 
                      min="0"
                      style={{ width: '60px', padding: '0.2rem', fontSize: '0.85rem' }}
                      value={item.itemDiscount || ''}
                      onChange={(e) => updateCartItem(item.id, { itemDiscount: parseFloat(e.target.value) || 0 })}
                      disabled={item.isGift}
                      placeholder="0"
                    />
                  </div>
                  <button 
                    className={`btn-icon ${item.isGift ? '' : 'text-muted'}`} 
                    style={item.isGift ? { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary)', borderRadius: '50%', padding: '0.4rem' } : { padding: '0.4rem' }}
                    title="Mark as Gift" 
                    onClick={() => toggleGift(item)}
                  >
                    <Gift size={18} strokeWidth={item.isGift ? 2.5 : 1.5} />
                  </button>
                  <div className="item-price" style={{ minWidth: '80px', textAlign: 'right', fontWeight: 'bold' }}>
                    {item.isGift ? 0 : ((item.price - (item.itemDiscount || 0)) * item.quantity)}
                  </div>
                  <button className="btn-icon text-danger" onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pos-right glass">
        <h3>Checkout Details</h3>
        
        <div className="checkout-section">
          <label>Customer Details <span className="text-danger">*</span></label>
          <input 
            type="text" 
            list="pos-customer-list"
            placeholder="Search or type customer name..." 
            value={customerInfo.name}
            onChange={e => handleCustomerNameChange(e.target.value)}
            className="mb-2"
          />
          <datalist id="pos-customer-list">
            {customerOptions.map(c => (
              <option key={c.id} value={c.name}>
                {c.name}{c.phone ? ` (${c.phone})` : ''}
              </option>
            ))}
          </datalist>
          <input 
            type="text" 
            placeholder="Phone Number" 
            value={customerInfo.phone}
            onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
            className="mb-2"
          />
          <input 
            type="text" 
            placeholder="Location/Address" 
            value={customerInfo.location}
            onChange={e => setCustomerInfo({...customerInfo, location: e.target.value})}
          />
        </div>

        <div className="checkout-section">
          <label>Salesman</label>
          <select 
            className="w-full mb-2" 
            value={selectedSalesman} 
            onChange={e => setSelectedSalesman(e.target.value)}
          >
            {user?.role === 'Admin' && <option value="Admin">Admin</option>}
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="checkout-section">
          <label>Payment Type</label>
            <div className="segmented-control">
              <button 
                type="button"
                className={paymentType === 'Cash' ? 'active' : ''}
                onClick={() => setPaymentType('Cash')}
              >
                Cash
              </button>
              <button 
                type="button"
                className={paymentType === 'Baki' ? 'active' : ''}
                onClick={() => setPaymentType('Baki')}
              >
                Baki (Due)
              </button>
            </div>
        </div>

        <div className="checkout-section summary-section">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{subtotal}</span>
          </div>
          <div className="summary-row">
            <span>Invoice Discount</span>
            <input 
              type="number" 
              className="discount-input"
              value={invoiceDiscount}
              onChange={e => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>
          <div className="summary-row total-row">
            <span>Total Payable</span>
            <span className="text-primary text-xl">{total}</span>
          </div>
        </div>

        <div className="checkout-actions">
          <button className="btn-primary checkout-btn" onClick={handleCheckout} disabled={cart.length === 0 || isSaving}>
            Complete Sale
          </button>
        </div>
      </div>

      {/* Invoice Drawer */}
      {completedSale && createPortal(
        <div className="drawer-overlay" onClick={() => setCompletedSale(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Sale Receipt</h3>
              <button className="drawer-close-btn" onClick={() => setCompletedSale(null)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-invoice">
                <PrintableInvoice sale={completedSale} customers={customers} />
              </div>
            </div>

            <div className="drawer-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button className="btn-primary flex-align-gap" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => {
                 const printContents = document.getElementById('printable-invoice').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
              }}>
                <Printer size={20} /> Print Receipt
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-invoice', `Receipt_${completedSale.id}.pdf`)}>
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
      )}

      {activeTab === 'History' && (
      <div className="card glass animate-slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <h2>Sales History</h2>
          <div className="flex-align-gap">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              title="Start Date"
            />
            <span>to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              title="End Date"
            />
            <button className="btn-primary flex-align-gap" onClick={() => {
                 const printContents = document.getElementById('printable-all-sales-details').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
            }}>
              <Printer size={16} /> Print All Details
            </button>
            <button className="btn-outline flex-align-gap text-info" onClick={() => downloadAsPDF('printable-all-sales-details', 'Sales_History.pdf')}>
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
        <div className="table-responsive mt-4">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th style={{textAlign:'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(s => (
                <tr key={s.id}>
                  <td>{s.date.split('T')[0]}</td>
                  <td>{s.id}</td>
                  <td>{s.customerName || 'N/A'}</td>
                  <td>{s.items.length} items</td>
                  <td><span className={`badge ${s.paymentType === 'Cash' ? 'bg-success' : 'bg-warning'}`}>{s.paymentType}</span></td>
                  <td className="text-primary font-bold">{s.total.toLocaleString()}</td>
                  <td style={{textAlign:'center'}}>
                    <div className="flex-align-gap" style={{justifyContent:'center'}}>
                      <button className="btn-icon" title="View & Print" onClick={() => setSelectedInvoice(s)}>
                        <Eye size={16} />
                      </button>
                      {user?.role === 'Admin' && (
                        <button className="btn-icon" title="Delete Invoice" onClick={() => handleDeleteSale(s)}>
                          <Trash2 size={16} color="var(--danger)" />
                        </button>
                      )}
</div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && <tr><td colSpan="7" className="text-center text-muted">No sales history found for this date range.</td></tr>}
            </tbody>
          </table>
        </div>
        
        <div style={{ display: 'none' }}>
          <div id="printable-all-sales-details" style={{ padding: '2rem', background: '#fff', color: '#000' }}>
            <InvoiceHeader />
            <h3 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '1rem' }}>Detailed Sales History</h3>
            {(startDate || endDate) && <p style={{textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem'}}>Date Filter: {startDate || 'Any'} to {endDate || 'Any'}</p>}
            
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Date</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Invoice</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Customer</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Payment</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Item</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>Qty</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>Price</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <React.Fragment key={sale.id}>
                    {sale.items.map((item, idx) => (
                      <tr key={`${sale.id}-${idx}`}>
                        {idx === 0 && (
                           <>
                             <td rowSpan={sale.items.length} style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{new Date(sale.date).toLocaleDateString()}</td>
                             <td rowSpan={sale.items.length} style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{sale.id}</td>
                             <td rowSpan={sale.items.length} style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{sale.customerName || 'N/A'}</td>
                             <td rowSpan={sale.items.length} style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{sale.paymentType}</td>
                           </>
                        )}
                        <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{item.name}</td>
                        <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>{item.quantity}</td>
                        <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>{item.price}</td>
                        <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>{item.price * item.quantity}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8f9fa' }}>
                      <td colSpan="7" style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', fontWeight: 'bold'}}>Invoice {sale.id} Total:</td>
                      <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', fontWeight: 'bold'}}>{sale.total}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
              Grand Total: {filteredSales.reduce((acc, s) => acc + Number(s.total || 0), 0)}
            </div>
            <PrintFooter />
          </div>
        </div>
      </div>
      )}

      {/* History Print Drawer */}
      {selectedInvoice && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Sale Receipt</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedInvoice(null)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-single-invoice-pos">
                <PrintableInvoice sale={selectedInvoice} customers={customers} />
              </div>
            </div>

            <div className="drawer-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button className="btn-primary flex-align-gap" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => {
                 const printContents = document.getElementById('printable-single-invoice-pos').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
              }}>
                <Printer size={20} /> Print Receipt
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-single-invoice-pos', `Receipt_${selectedInvoice.id}.pdf`)}>
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default POS;
