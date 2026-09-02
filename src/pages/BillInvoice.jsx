import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Search, Plus, Minus, Trash2, List, Printer, Eye, Download, FilePlus, FileEdit } from 'lucide-react';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintableInvoice from '../components/PrintableInvoice';
import PrintFooter from '../components/PrintFooter';
import './POS.css'; // Reusing POS styles for speed and consistency

const BillInvoice = () => {
  const { inventory, staff, user, customers, addCustomer, processSale, sales, showToast } = useStore();
  const [activeTab, setActiveTab] = useState('New'); // 'New', 'History', or 'Drafts'
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const action = searchParams.get('action');
    if (action === 'add') {
      setActiveTab('New');
    } else if (action === 'draft') {
      setActiveTab('Drafts');
    } else if (action === 'list' || !action) {
      setActiveTab('History');
    }
  }, [location.search]);

  // Invoice State
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', location: '' });
  const [paymentType, setPaymentType] = useState('Baki');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [selectedSalesman, setSelectedSalesman] = useState(user?.id || 'Admin');
  const [completedSale, setCompletedSale] = useState(null);
  
  // History State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Drafts State - Mocking drafts for now as it's not in the store natively
  const [drafts, setDrafts] = useState([]);

  const filteredSales = sales.filter(s => {
    if (!startDate && !endDate) return true;
    const sDate = s.date.split('T')[0];
    if (startDate && sDate < startDate) return false;
    if (endDate && sDate > endDate) return false;
    return true;
  });

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = inventory.find(p => 
      p.id === barcodeInput.trim() || 
      p.name.toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (product) {
      const existing = cart.find(c => c.id === product.id);
      if (existing) {
        setCart(cart.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      } else {
        setCart([...cart, { ...product, quantity: 1, itemDiscount: 0 }]);
      }
      setBarcodeInput('');
    } else {
      showToast('Product not found in inventory!', 'error');
    }
  };

  const updateCartItem = (id, updates) => {
    setCart(cart.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => {
    return acc + ((item.price - (item.itemDiscount || 0)) * item.quantity);
  }, 0);

  const total = Math.max(0, subtotal - invoiceDiscount);

  const handleSaveDraft = () => {
    if (cart.length === 0) {
      showToast('Cannot save empty invoice as draft.', 'error');
      return;
    }
    const draftId = 'DRF' + Date.now();
    const newDraft = {
      id: draftId,
      date: new Date().toISOString(),
      customerInfo,
      cartItems: cart,
      paymentType,
      invoiceDiscount,
      total,
      salesman: staff.find(s => s.id === selectedSalesman) || { id: 'Admin', name: 'Admin' }
    };
    setDrafts([...drafts, newDraft]);
    showToast('Invoice saved to Drafts!', 'success');
    setCart([]);
    setCustomerInfo({ name: '', phone: '', location: '' });
    setInvoiceDiscount(0);
    setActiveTab('Drafts');
  };

  const handleCheckout = () => {
    if (!customerInfo.name) {
      showToast('Customer Name is explicitly required for invoicing!', 'error');
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
    
    processSale(saleData);
    setCompletedSale({ ...saleData, subtotal, total, date: new Date().toISOString(), invoiceId: 'INV' + Date.now() });
    showToast("Invoice completed successfully!", "success");
    
    setCart([]);
    setCustomerInfo({ name: '', phone: '', location: '' });
    setInvoiceDiscount(0);
  };

  return (
    <div className="pos-page animate-fade-in">
      <div className="card" style={{ padding: '0.5rem', marginBottom: '1rem', maxWidth: '600px', margin: '0 auto 1rem auto' }}>
        <div className="segmented-control">
          <button 
            type="button"
            className={activeTab === 'New' ? 'active' : ''}
            onClick={() => setActiveTab('New')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Add
          </button>
          <button 
            type="button"
            className={activeTab === 'History' ? 'active' : ''}
            onClick={() => setActiveTab('History')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <List size={16} /> Invoice List
          </button>
          <button 
            type="button"
            className={activeTab === 'Drafts' ? 'active' : ''}
            onClick={() => setActiveTab('Drafts')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <FileEdit size={16} /> Draft Invoice
          </button>
        </div>
      </div>

      {activeTab === 'New' && (
      <div className="pos-container animate-fade-in">
        <div className="pos-left glass">
          <div className="pos-header">
            <h2>Create Bill / Invoice</h2>
            <form onSubmit={handleBarcodeSubmit} className="barcode-form">
              <Search size={18} className="text-muted" />
              <input 
                id="barcode-input"
                type="text" 
                placeholder="Scan Barcode or Enter Product ID/Name..." 
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="btn-primary">Add Product</button>
            </form>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="empty-cart text-muted">Invoice is empty. Search a product to begin.</div>
            ) : (
              cart.map(item => (
                <div className="cart-item glass" key={item.id}>
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <span className="text-muted">ID: {item.id} | {item.price} x {item.quantity}</span>
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
                    <div className="item-price" style={{ minWidth: '80px', textAlign: 'right', fontWeight: 'bold' }}>
                      {((item.price - (item.itemDiscount || 0)) * item.quantity).toLocaleString()}
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
          <h3>Billing Details</h3>
          
          <div className="checkout-section">
            <label>Customer Information <span className="text-danger">*</span></label>
            <input 
              type="text" 
              placeholder="Customer/Company Name" 
              value={customerInfo.name}
              onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
              className="mb-2"
            />
            <input 
              type="text" 
              placeholder="Phone Number" 
              value={customerInfo.phone}
              onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
              className="mb-2"
            />
            <input 
              type="text" 
              placeholder="Address" 
              value={customerInfo.location}
              onChange={e => setCustomerInfo({...customerInfo, location: e.target.value})}
            />
          </div>

          <div className="checkout-section">
            <label>Sales Executive</label>
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
            <label>Invoice Type / Payment</label>
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
              <span>{subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Discount</span>
              <input 
                type="number" 
                className="discount-input"
                value={invoiceDiscount}
                onChange={e => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="summary-row total-row">
              <span>Total Amount</span>
              <span className="text-primary text-xl">{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="checkout-actions" style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary checkout-btn" style={{ flex: 1, padding: '0.8rem 0.5rem', fontSize: '0.9rem' }} onClick={handleCheckout} disabled={cart.length === 0}>
              Generate Final Invoice
            </button>
            <button className="btn-outline checkout-btn" style={{ flex: 1, padding: '0.8rem 0.5rem', fontSize: '0.9rem' }} onClick={handleSaveDraft} disabled={cart.length === 0}>
              Save as Draft
            </button>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'History' && (
      <div className="card glass animate-slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <h2>Generated Invoices</h2>
          <div className="flex-align-gap">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="Start Date" />
            <span>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="End Date" />
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
                  <td>{(s.items || []).length} items</td>
                  <td className="text-primary font-bold">{s.total.toLocaleString()}</td>
                  <td style={{textAlign:'center'}}>
                    <div className="flex-align-gap" style={{justifyContent:'center'}}>
                      <button className="btn-icon" title="View & Print" onClick={() => setSelectedInvoice(s)}>
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No invoices found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'Drafts' && (
      <div className="card glass animate-slide-up">
        <div style={{ marginBottom: '1rem' }}>
          <h2>Draft Invoices</h2>
          <p className="text-muted">Incomplete invoices saved for later.</p>
        </div>
        <div className="table-responsive mt-4">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date Saved</th>
                <th>Draft ID</th>
                <th>Customer Name</th>
                <th>Total Value</th>
                <th style={{textAlign:'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map(d => (
                <tr key={d.id}>
                  <td>{new Date(d.date).toLocaleString()}</td>
                  <td>{d.id}</td>
                  <td>{d.customerInfo?.name || 'Unknown'}</td>
                  <td className="text-primary font-bold">{d.total.toLocaleString()}</td>
                  <td style={{textAlign:'center'}}>
                    <button className="btn-primary" style={{ padding: '0.2rem 1rem', fontSize: '0.85rem' }} onClick={() => {
                       setCart(d.cartItems);
                       setCustomerInfo(d.customerInfo);
                       setPaymentType(d.paymentType);
                       setInvoiceDiscount(d.invoiceDiscount);
                       setDrafts(drafts.filter(dr => dr.id !== d.id));
                       setActiveTab('New');
                    }}>
                      Resume Editing
                    </button>
                  </td>
                </tr>
              ))}
              {drafts.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No saved drafts.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Invoice Drawer */}
      {completedSale && createPortal(
        <div className="drawer-overlay" onClick={() => setCompletedSale(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Invoice View</h3>
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
                <Printer size={20} /> Print Invoice
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-invoice', `Invoice_${completedSale.invoiceId}.pdf`)}>
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedInvoice && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Invoice View</h3>
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
                <Printer size={20} /> Print Invoice
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default BillInvoice;
