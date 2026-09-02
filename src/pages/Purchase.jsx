import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Minus, Search, Trash2, Database, List, Printer, FilePlus, Eye, Download, FileText, X, Edit } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';
import './Purchase.css';

const Purchase = () => {
  const { suppliers, inventory, purchases, processPurchase, updatePurchase, showToast } = useStore();
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

  const [supplier, setSupplier] = useState('');
  const [paymentType, setPaymentType] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [items, setItems] = useState([]);
  
  // Quick Entry State
  const [tempProductId, setTempProductId] = useState('');
  const [tempUnit, setTempUnit] = useState('');
  const [tempQty, setTempQty] = useState(1);
  const [tempPrice, setTempPrice] = useState(0);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState({ id: '', supplierName: '', paymentType: 'Cash', total: 0, paidAmount: 0, dueAmount: 0 });

  const handleAddQuickItem = () => {
    if (!tempProductId || tempQty <= 0) return;
    
    const prod = inventory.find(p => p.name === tempProductId || p.id === tempProductId);
    const finalId = prod ? (prod.product_code || prod.id) : `CUSTOM_${Date.now()}`;
    const finalName = prod ? prod.name : tempProductId;
    
    const newItems = [...items.filter(i => i.productId)];
    const existingIndex = newItems.findIndex(i => i.productId === finalId);
    
    if (existingIndex >= 0) {
      newItems[existingIndex].quantity += Number(tempQty);
      newItems[existingIndex].price = Number(tempPrice); 
      if (tempUnit) newItems[existingIndex].unit = tempUnit;
    } else {
      newItems.push({ productId: finalId, name: finalName, unit: tempUnit, quantity: Number(tempQty), price: Number(tempPrice) });
    }
    
    setItems(newItems);
    setTempProductId('');
    setTempUnit('');
    setTempQty(1);
    setTempPrice(0);
  };

  const handleSavePurchase = async () => {
    let validItems = [...items.filter(i => i.productId && i.quantity > 0)];
    
    // Auto add from input row if user forgot to click + Add
    if (tempProductId && tempQty > 0) {
      const prod = inventory.find(p => p.name === tempProductId || p.id === tempProductId);
      const finalId = prod ? (prod.product_code || prod.id) : `CUSTOM_${Date.now()}`;
      const finalName = prod ? prod.name : tempProductId;
      validItems.push({
        productId: finalId,
        name: finalName,
        variant: tempVariant,
        quantity: Number(tempQty),
        price: Number(tempPrice)
      });
    }

    if (!supplier) {
      showToast('Please select or type a Supplier name.', 'error');
      return;
    }
    if (validItems.length === 0) {
      showToast('Please add at least one product with quantity.', 'error');
      return;
    }

    const total = validItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
    let finalPaidAmount = 0;
    if (paymentType === 'Cash') {
      finalPaidAmount = total;
    } else if (paymentType === 'Baki') {
      finalPaidAmount = 0;
    } else {
      finalPaidAmount = parseFloat(paidAmount) || 0;
    }

    if (paymentType === 'Partial' && finalPaidAmount <= 0) {
      showToast('Please enter a valid paid amount for partial payment.', 'error');
      return;
    }
    if (finalPaidAmount > total) {
      showToast('Paid amount cannot exceed total amount.', 'error');
      return;
    }

    const supplierObj = suppliers.find(s => s.name === supplier || s.id === supplier);
    const finalSupplierId = supplierObj ? (supplierObj.supplier_code || supplierObj.id) : `SUP_CUSTOM_${Date.now()}`;
    const finalSupplierName = supplierObj ? supplierObj.name : supplier;

    try {
      await processPurchase({
        supplierId: finalSupplierId,
        supplierName: finalSupplierName,
        paymentType,
        items: validItems,
        total,
        paidAmount: finalPaidAmount,
        date: new Date().toISOString(),
        id: 'PUR' + Date.now()
      });
      showToast('Purchase successfully recorded and stock updated!', 'success');
      setSupplier('');
      setPaidAmount('');
      setItems([]);
      setTempProductId('');
      setTempUnit('');
      setTempQty(1);
      setTempPrice(0);
      navigate('/purchases');
      setActiveTab('History');
    } catch (err) {
      showToast('Failed to record purchase: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleEditPurchaseClick = (purchase) => {
    setEditingPurchase({
      ...purchase,
      total: Number(purchase.total || 0),
      paidAmount: Number(purchase.paidAmount || purchase.paid || 0),
      dueAmount: Number(purchase.dueAmount || purchase.due || 0)
    });
    setShowEditModal(true);
  };

  const handleUpdatePurchase = (e) => {
    e.preventDefault();
    updatePurchase(editingPurchase.id, {
      ...editingPurchase,
      total: Number(editingPurchase.total || 0),
      paidAmount: Number(editingPurchase.paidAmount || 0),
      dueAmount: Number(editingPurchase.dueAmount || 0)
    });
    showToast('Purchase updated successfully!', 'success');
    setShowEditModal(false);
  };

  const filteredPurchases = purchases.filter(p => {
    if (!startDate && !endDate) return true;
    const pDate = (p.date || '').split('T')[0];
    if (startDate && pDate < startDate) return false;
    if (endDate && pDate > endDate) return false;
    return true;
  });

  const currentTotal = items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0) + 
    (items.length === 0 && tempProductId ? (Number(tempQty) * Number(tempPrice)) : 0);

  return (
    <div className="purchase-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Purchase & Supplier Management</h1>
          <p className="text-muted">Enter new purchases from suppliers (Cash or Baki).</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0.5rem', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
        <div className="segmented-control">
          <button 
            type="button"
            className={activeTab === 'New' ? 'active' : ''}
            onClick={() => { setActiveTab('New'); navigate('/purchases?action=add'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <FilePlus size={16} /> Entry
          </button>
          <button 
            type="button"
            className={activeTab === 'History' ? 'active' : ''}
            onClick={() => { setActiveTab('History'); navigate('/purchases'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <List size={16} /> Purchase History
          </button>
        </div>
      </div>

      {activeTab === 'New' && (
      <div className="quick-entry-container animate-slide-up">
        
        {/* TOP COMPACT HEADER */}
        <div className="qe-header">
          <div>
            <h2 className="text-xl font-bold mb-1">Purchase</h2>
            <p className="text-muted text-sm">Add items quickly via the input row below.</p>
          </div>
          <div className="flex-align-gap" style={{ flexWrap: 'wrap' }}>
            <div className="qe-field">
              <label>Date</label>
              <input type="date" value={new Date().toISOString().split('T')[0]} readOnly style={{ width: '140px', background: 'transparent' }} />
            </div>
            <div className="qe-field">
              <label>Supplier</label>
              <input 
                list="suppliers-list"
                placeholder="Search or Type Supplier..."
                value={supplier} 
                onChange={(e) => setSupplier(e.target.value)} 
                style={{ width: '200px' }}
              />
              <datalist id="suppliers-list">
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name} ({s.company || 'Supplier'})</option>)}
              </datalist>
            </div>
            <div className="qe-field">
              <label>Payment</label>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} style={{ width: '110px' }}>
                <option value="Cash">Cash</option>
                <option value="Baki">Baki (Due)</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
            {paymentType === 'Partial' && (
              <div className="qe-field">
                <label>Paid ()</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="Amount" 
                  value={paidAmount} 
                  onChange={(e) => setPaidAmount(e.target.value)} 
                  style={{ width: '110px' }} 
                />
              </div>
            )}
          </div>
        </div>

        {/* SINGLE INPUT ROW (Quick Entry) */}
        <div className="qe-input-row">
          <div className="qe-field" style={{ flex: '2' }}>
            <label>Product Name / Search</label>
            <input 
              list="inventory-products"
              placeholder="Search or Type Custom Product..."
              value={tempProductId}
              onChange={(e) => {
                const val = e.target.value;
                setTempProductId(val);
                const prod = inventory.find(p => p.name === val || p.id === val);
                if (prod) {
                  setTempPrice(prod.cost_price || prod.price || 0);
                  setTempUnit(prod.unit || '');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickItem();
                }
              }}
            />
            <datalist id="inventory-products">
              {inventory.map(p => <option key={p.id} value={p.name}>{p.name} (Stock: {p.stock})</option>)}
            </datalist>
          </div>
          <div className="qe-field" style={{ flex: '1.2' }}>
            <label>Unit</label>
            <input 
              type="text" 
              placeholder="e.g. Pcs, Kg" 
              value={tempUnit}
              onChange={(e) => setTempUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickItem();
                }
              }}
            />
          </div>
          <div className="qe-field" style={{ flex: '0.8' }}>
            <label>Quantity</label>
            <input 
              type="number" 
              min="1" 
              value={tempQty}
              onChange={(e) => setTempQty(parseFloat(e.target.value) || 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickItem();
                }
              }}
            />
          </div>
          <div className="qe-field" style={{ flex: '1' }}>
            <label>Unit Price ()</label>
            <input 
              type="number" 
              min="0" 
              value={tempPrice}
              onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddQuickItem();
                }
              }}
            />
          </div>
          <button 
            type="button"
            className="btn-primary" 
            style={{ height: '42px', padding: '0 1.5rem' }}
            onClick={handleAddQuickItem}
          >
            <Plus size={18} /> Add
          </button>
        </div>

        {/* PREVIEW GRID */}
        <div className="qe-table-container">
          <table className="qe-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Unit</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price ()</th>
                <th style={{ textAlign: 'right' }}>Total ()</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No items added yet. Use the row above to add products.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index}>
                    <td className="font-bold text-main">{item.name}</td>
                    <td>{item.unit || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{Number(item.price || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="text-primary">
                      {(Number(item.quantity || 0) * Number(item.price || 0)).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn-icon text-danger" 
                        onClick={() => {
                          setItems(items.filter((_, i) => i !== index));
                        }}
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FLOATING FOOTER */}
        <div className="qe-footer">
          <div className="text-muted">
            {items.length} products added
          </div>
          <div className="flex-align-gap" style={{ gap: '2rem' }}>
            <div className="text-right">
              <div className="text-muted text-sm uppercase font-bold">Total Amount</div>
              <div className="qe-total">{currentTotal.toLocaleString()}</div>
            </div>
            <button 
              type="button"
              className="btn-primary" 
              style={{ padding: '0.9rem 2rem', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)' }}
              onClick={handleSavePurchase}
              disabled={!supplier || (items.length === 0 && !tempProductId)}
            >
              <FilePlus size={20} className="mr-2 inline" />
              Save Purchase
            </button>
          </div>
        </div>

      </div>
      )}

      {activeTab === 'History' && (
      <div className="card glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <h2>Purchase History</h2>
          <div className="flex-align-gap" style={{ flexWrap: 'wrap' }}>
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
                 const printContents = document.getElementById('printable-all-purchases-details').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
            }}>
              <Printer size={16} /> Print All Details
            </button>
            <button className="btn-outline flex-align-gap text-info" onClick={() => downloadAsPDF('printable-all-purchases-details', 'Purchase_History.pdf')}>
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

        <div className="table-responsive mt-4">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Purchase ID</th>
                <th>Supplier</th>
                <th>Items Qty</th>
                <th>Payment Type</th>
                <th>Total Cost</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((purchase) => {
                const totalCost = Number(purchase.total || 0);
                const paidVal = Number(purchase.paidAmount || purchase.paid || 0);
                const dueVal = Number(purchase.dueAmount || purchase.due || Math.max(0, totalCost - paidVal));
                const itemsCount = (purchase.items || []).reduce((acc, it) => acc + Number(it.quantity || 1), 0);

                return (
                  <tr key={purchase.id}>
                    <td>{new Date(purchase.date).toLocaleDateString()}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{purchase.id}</td>
                    <td>{purchase.supplierName || 'N/A'}</td>
                    <td>{itemsCount} items</td>
                    <td>
                      <span className={`badge ${purchase.paymentType === 'Cash' ? 'success' : purchase.paymentType === 'Partial' ? 'warning' : 'danger'}`}>
                        {purchase.paymentType}
                      </span>
                    </td>
                    <td className="text-danger font-bold">{totalCost.toLocaleString()}</td>
                    <td className="text-success font-bold">{paidVal.toLocaleString()}</td>
                    <td className="text-warning font-bold">{dueVal.toLocaleString()}</td>
                    <td>
                      <div className="flex-align-gap" style={{ flexWrap: 'nowrap' }}>
                        <button 
                          type="button"
                          className="btn-icon" 
                          title="Edit Purchase"
                          onClick={(e) => { e.stopPropagation(); handleEditPurchaseClick(purchase); }}
                        >
                          <Edit size={16} color="var(--primary)" />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="View Receipt"
                          onClick={() => setSelectedInvoice(purchase)}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-4">No purchases found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Detailed Report of All Purchases */}
        <div id="printable-all-purchases-details" className="printable-only" style={{ display: 'none' }}>
          <div style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
            <InvoiceHeader />
            <h2 style={{ textAlign: 'center', margin: '1rem 0' }}>DETAILED PURCHASE REPORT</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Date</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Purchase ID</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Supplier</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Payment</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Item Name</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Variant</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>Qty</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>Price ()</th>
                  <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>Total ()</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <React.Fragment key={purchase.id}>
                    {(purchase.items || []).map((item, idx) => (
                      <tr key={`${purchase.id}-${idx}`}>
                        {idx === 0 && (
                           <>
                             <td rowSpan={purchase.items.length} style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{new Date(purchase.date).toLocaleDateString()}</td>
                             <td rowSpan={purchase.items.length} style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{purchase.id}</td>
                             <td rowSpan={purchase.items.length} style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{purchase.supplierName || 'N/A'}</td>
                             <td rowSpan={purchase.items.length} style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{purchase.paymentType}</td>
                           </>
                        )}
                        <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{item.name}</td>
                        <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{item.variant || '-'}</td>
                        <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>{item.quantity}</td>
                        <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>{Number(item.price || 0).toLocaleString()}</td>
                        <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>{(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8f9fa' }}>
                      <td colSpan="8" style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', fontWeight: 'bold'}}>Invoice {purchase.id} Total:</td>
                      <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', fontWeight: 'bold'}}>
                        {Number(purchase.total || 0).toLocaleString()}<br/>
                        <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>Paid: {Number(purchase.paidAmount || purchase.paid || 0).toLocaleString()}</span><br/>
                        <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>Due: {Number(purchase.dueAmount || purchase.due || (purchase.total - (purchase.paidAmount || 0))).toLocaleString()}</span>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
              Grand Total: {filteredPurchases.reduce((acc, p) => acc + Number(p.total || 0), 0).toLocaleString()}
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
              <h3 style={{ margin: 0 }}>Purchase Receipt</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedInvoice(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-single-invoice-pur" style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
                 <InvoiceHeader />
                 <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem', color: '#555' }}>
                   Purchase Receipt: {selectedInvoice.id}<br/>
                   Date: {new Date(selectedInvoice.date).toLocaleString()}
                 </p>
                 <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                 
                 <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem', color: '#333' }}>
                   {selectedInvoice.supplierName && <><strong>Supplier:</strong> {selectedInvoice.supplierName}<br/></>}
                   <strong>Payment:</strong> {selectedInvoice.paymentType}
                 </div>

                 <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '1.5rem', color: '#000', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #eee' }}>
                        <th style={{textAlign: 'left', paddingBottom: '0.5rem'}}>Item</th>
                        <th style={{textAlign: 'right', paddingBottom: '0.5rem'}}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedInvoice.items || []).map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.75rem 0' }}>
                            {item.name} {(item.unit || item.variant) && <span style={{ color: '#666', fontSize: '0.8rem' }}>({item.unit || item.variant})</span>} <br/> 
                            <small style={{ color: '#666' }}>{item.quantity} x {Number(item.price || 0).toLocaleString()}</small>
                          </td>
                          <td style={{textAlign: 'right', padding: '0.75rem 0'}}>
                            {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '1rem', color: '#000' }}>
                    <span>Total:</span>
                    <span>{Number(selectedInvoice.total || 0).toLocaleString()}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.2rem', color: '#000' }}>
                    <span>Paid:</span>
                    <span>{Number(selectedInvoice.paidAmount || selectedInvoice.paid || 0).toLocaleString()}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.2rem', color: '#000' }}>
                    <span>Due:</span>
                    <span>{Number(selectedInvoice.dueAmount || selectedInvoice.due || (selectedInvoice.total - (selectedInvoice.paidAmount || 0))).toLocaleString()}</span>
                 </div>
                 <PrintFooter />
              </div>
            </div>

            <div className="drawer-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button className="btn-primary flex-align-gap" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => {
                 const printContents = document.getElementById('printable-single-invoice-pur').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
              }}>
                <Printer size={20} /> Print Receipt
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-single-invoice-pur', `Purchase_${selectedInvoice.id}.pdf`)}>
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Purchase Drawer */}
      {showEditModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowEditModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Edit Purchase Details</h2>
              <button type="button" className="drawer-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="edit-purchase-form" onSubmit={handleUpdatePurchase}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1">Purchase ID (Cannot change)</label>
                    <input type="text" className="w-full" value={editingPurchase.id} disabled style={{ background: 'var(--bg-hover)' }} />
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Supplier Name</label>
                    <input 
                      type="text" 
                      className="w-full" 
                      value={editingPurchase.supplierName || ''} 
                      onChange={e => setEditingPurchase({ ...editingPurchase, supplierName: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Payment Type</label>
                    <select 
                      className="w-full" 
                      value={editingPurchase.paymentType} 
                      onChange={e => setEditingPurchase({ ...editingPurchase, paymentType: e.target.value })}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Baki">Baki (Due)</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1">Total Cost</label>
                      <input 
                        type="number" 
                        className="w-full" 
                        value={editingPurchase.total} 
                        onChange={e => setEditingPurchase({ ...editingPurchase, total: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="text-muted text-sm block mb-1">Paid Amount</label>
                      <input 
                        type="number" 
                        className="w-full" 
                        value={editingPurchase.paidAmount} 
                        onChange={e => setEditingPurchase({ ...editingPurchase, paidAmount: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Due Amount</label>
                    <input 
                      type="number" 
                      className="w-full" 
                      value={editingPurchase.dueAmount} 
                      onChange={e => setEditingPurchase({ ...editingPurchase, dueAmount: e.target.value })} 
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" form="edit-purchase-form" className="btn-primary flex-align-gap">
                <Edit size={18} /> Update Purchase
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Purchase;
