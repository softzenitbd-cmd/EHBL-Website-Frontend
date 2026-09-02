import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, CheckCircle, Edit, Printer, Download, Trash2, Calendar } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';

const SRSettlement = () => {
  const { staff, inventory, srSettlements, issueProductsToSR, settleSRAccount, deleteSRSettlement } = useStore();

  const handleDeleteSettlement = async (settlement) => {
    const stillOut = settlement.items.reduce(
      (acc, i) => acc + (i.quantity - (i.returnQty || 0)), 0
    );
    const due = Number(settlement.dueAmount || 0);

    const confirmed = confirm(
      `Delete SR account ${settlement.id}?\n\n` +
      `Salesman: ${settlement.salesmanName}\n` +
      `Status: ${settlement.status}\n\n` +
      (stillOut > 0 ? `${stillOut} item(s) still with the SR will go back into stock.\n` : '') +
      (due > 0 ? `${due.toLocaleString()} will be removed from the SR's due.\n` : '') +
      `\nThis cannot be undone.`
    );
    if (!confirmed) return;

    const result = await deleteSRSettlement(settlement.id);
    if (!result.success) alert(`Settlement was not deleted: ${result.error}`);
  };
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  
  // Issue Modal State
  const [selectedSR, setSelectedSR] = useState('');
  const [issueItems, setIssueItems] = useState([]);
  const [tempProductId, setTempProductId] = useState('');
  const [tempQty, setTempQty] = useState(1);

  // Settle Modal State
  const [activeSettlement, setActiveSettlement] = useState(null);
  const [cashReceived, setCashReceived] = useState(0);
  const [returnItems, setReturnItems] = useState([]); // Array of { productId, returnQty }

  // Filter settlements by date
  const settlementsForDate = (srSettlements || []).filter(s => s.date === selectedDate);

  const handleIssueAddProduct = () => {
    if (!tempProductId) {
      alert("Please select a product first.");
      return;
    }
    if (tempQty <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }
    const prod = inventory.find(p => String(p.id) === String(tempProductId));
    if (!prod) {
      alert("Product not found in inventory.");
      return;
    }
    
    if (prod.stock < tempQty) {
      alert(`Not enough stock! Available: ${prod.stock}`);
      return;
    }

    const existing = issueItems.findIndex(i => String(i.productId) === String(prod.id));
    const newItems = [...issueItems];
    if (existing >= 0) {
      newItems[existing].quantity += tempQty;
    } else {
      newItems.push({ 
        productId: prod.id, 
        name: prod.name, 
        price: prod.price || 0, 
        quantity: tempQty 
      });
    }
    setIssueItems(newItems);
    setTempProductId('');
    setTempQty(1);
  };

  const handleSaveIssue = async () => {
    if (!selectedSR) {
      alert("Please select a Salesman / SR from the dropdown.");
      return;
    }
    if (issueItems.length === 0) {
      alert("Please add at least one product before confirming.");
      return;
    }
    const srData = (staff || []).find(s => String(s.id) === String(selectedSR));
    if (!srData) {
      alert("SR not found.");
      return;
    }
    
    const totalValue = issueItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    const result = await issueProductsToSR({
      date: selectedDate,
      salesmanId: srData.id,
      salesmanName: srData.name,
      items: issueItems,
      totalIssuedValue: totalValue,
      totalSalesValue: totalValue,
      cashReceived: 0
    });

    if (!result.success) {
      alert(`Stock was not issued: ${result.error}`);
      return;
    }

    alert("Stock successfully issued to " + srData.name);
    setShowIssueModal(false);
    setSelectedSR('');
    setIssueItems([]);
  };

  const openSettleModal = (settlement) => {
    setActiveSettlement(settlement);
    setCashReceived(settlement.cashReceived || settlement.totalSalesValue || 0);
    
    // Initialize return items if not present
    setReturnItems(settlement.items.map(item => ({
      productId: item.productId,
      name: item.name,
      issuedQty: item.quantity,
      returnQty: 0,
      price: item.price
    })));
    setShowSettleModal(true);
  };

  const handleReturnQtyChange = (productId, qty) => {
    const updated = returnItems.map(item => {
      if (item.productId === productId) {
        return { ...item, returnQty: parseInt(qty) || 0 };
      }
      return item;
    });
    setReturnItems(updated);

    // Recalculate total sales value based on returns
    const newTotalSales = updated.reduce((acc, item) => {
      const soldQty = item.issuedQty - item.returnQty;
      return acc + (soldQty * item.price);
    }, 0);
    
    // Auto-update cash received if not settled yet
    if (activeSettlement && activeSettlement.status === 'Pending') {
      setCashReceived(newTotalSales);
    }
  };

  const handleSaveSettlement = async () => {
    if (!activeSettlement) return;

    // Only send back items that were actually returned.
    const actualReturns = returnItems.filter(r => r.returnQty > 0);

    // The server recomputes sales value, shortfall and stock, then we re-sync.
    const result = await settleSRAccount(
      activeSettlement.id,
      parseFloat(cashReceived) || 0,
      actualReturns
    );

    if (!result.success) {
      alert(`Settlement failed: ${result.error}`);
      return;
    }

    const due = Number(result.data?.dueAmount || 0);
    alert(
      due > 0
        ? `Settled. ${activeSettlement.salesmanName} owes ${due.toLocaleString()} which has been added to their due.`
        : 'Settled. Nothing outstanding.'
    );

    setShowSettleModal(false);
    setActiveSettlement(null);
  };

  const handlePrint = () => {
    const printContents = document.getElementById('printable-sr-list').innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header">
        <div>
          <h1>SR Daily Account / Settlement</h1>
          <p className="text-muted">Manage daily product issuance and cash collection for Salesmen.</p>
        </div>
        <div className="flex-align-gap">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full"
            style={{ width: 'auto' }}
          />
          <button className="btn-primary flex-align-gap" onClick={() => setShowIssueModal(true)}>
            <Plus size={18} /> Issue Stock to SR
          </button>
          <button className="btn-outline flex-align-gap" onClick={handlePrint}>
            <Printer size={18} /> Print Daily Sheet
          </button>
        </div>
      </div>

      <div className="card table-responsive">
        <table className="data-table">
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', color: '#64748b', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700' }}>Salesman / SR</th>
              <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Total Items Issued</th>
              <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Issued Value (৳)</th>
              <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Final Sales (৳)</th>
              <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Cash Received (৳)</th>
              <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Due (৳)</th>
              <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Status</th>
              <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {settlementsForDate.map(settlement => (
              <tr key={settlement.id}>
                <td className="font-bold">{settlement.salesmanName}</td>
                <td style={{ textAlign: 'center' }}>{settlement.items.reduce((acc, i) => acc + i.quantity, 0)} Pcs</td>
                <td style={{ textAlign: 'right' }}>৳{settlement.totalIssuedValue.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }} className="text-info font-bold">৳{settlement.totalSalesValue.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }} className="text-success font-bold">৳{(settlement.cashReceived || 0).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }} className="text-danger font-bold">৳{Math.max(0, settlement.totalSalesValue - (settlement.cashReceived || 0)).toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${settlement.status === 'Settled' ? 'bg-success' : 'bg-warning'}`}>
                    {settlement.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div className="flex-align-gap" style={{ justifyContent: 'center' }}>
                    <button
                      className="btn-outline flex-align-gap"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => openSettleModal(settlement)}
                    >
                      {settlement.status === 'Pending' ? (
                        <><CheckCircle size={14} /> Settle / Edit</>
                      ) : (
                        <><Edit size={14} /> View / Edit</>
                      )}
                    </button>
                    <button className="btn-icon" title="Delete Settlement" onClick={() => handleDeleteSettlement(settlement)}>
                      <Trash2 size={16} color="var(--danger)" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {settlementsForDate.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted" style={{ padding: '2rem' }}>
                  No SR accounts created for this date yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hidden Print Section */}
      <div id="printable-sr-list" style={{ display: 'none' }}>
        <div style={{ padding: '2rem', background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' }}>
          <InvoiceHeader />
          <h3 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '20px' }}>Daily SR Settlement Sheet</h3>
          <p style={{ textAlign: 'center', marginBottom: '1rem' }}>Date: {new Date(selectedDate).toLocaleDateString()}</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Salesman / SR</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>Items Issued</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Sales Amount</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Cash Paid</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Due</th>
                <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {settlementsForDate.map(settlement => (
                <tr key={settlement.id}>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{settlement.salesmanName}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{settlement.items.reduce((acc, i) => acc + i.quantity, 0)} Pcs</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{settlement.totalSalesValue}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{settlement.cashReceived}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{Math.max(0, settlement.totalSalesValue - (settlement.cashReceived || 0))}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PrintFooter />
        </div>
      </div>

      {/* Modal: Issue Stock */}
      {showIssueModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowIssueModal(false)}>
          <div className="drawer-container" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Issue Stock to SR</h2>
              <button className="drawer-close-btn" onClick={() => setShowIssueModal(false)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="drawer-body">
              <div style={{ marginBottom: '1rem' }}>
                <label className="text-muted text-sm block mb-1 font-bold">Select Salesman/SR *</label>
                <select className="w-full" value={selectedSR} onChange={e => setSelectedSR(e.target.value)}>
                  <option value="">-- Choose SR --</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'end' }}>
                <div>
                  <label className="text-muted text-sm block mb-1">Product</label>
                  <select className="w-full" value={tempProductId} onChange={e => setTempProductId(e.target.value)}>
                    <option value="">-- Select Product --</option>
                    {inventory.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-muted text-sm block mb-1">Qty</label>
                  <input type="number" className="w-full" min="1" value={tempQty} onChange={e => setTempQty(parseInt(e.target.value) || 1)} />
                </div>
                <button className="btn-primary" onClick={handleIssueAddProduct} style={{ height: '42px', padding: '0 1rem' }}>
                  <Plus size={16} /> Add
                </button>
              </div>

              <table className="data-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {issueItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>৳{item.price}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>৳{item.price * item.quantity}</td>
                      <td>
                        <button className="btn-icon text-danger" onClick={() => setIssueItems(issueItems.filter((_, i) => i !== idx))}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {issueItems.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No products added.</td></tr>}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', marginTop: '1rem', fontWeight: 'bold' }}>
                Total Value: ৳{issueItems.reduce((acc, item) => acc + (item.quantity * item.price), 0)}
              </div>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowIssueModal(false)}>Cancel</button>
              <button type="button" className="btn-primary flex-align-gap" onClick={handleSaveIssue}>
                <CheckCircle size={18} /> Confirm Issue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Settle & Edit Single Single */}
      {showSettleModal && activeSettlement && createPortal(
        <div className="drawer-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="drawer-container" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Settle Account: {activeSettlement.salesmanName}</h2>
              <button className="drawer-close-btn" onClick={() => setShowSettleModal(false)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="drawer-body">
              <p className="text-muted text-sm mb-3">Adjust returned products if any. Unreturned products are counted as sold.</p>
              
              <table className="data-table" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th>Product</th>
                    <th style={{ textAlign: 'center' }}>Issued</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Returned (Unsold)</th>
                    <th style={{ textAlign: 'center' }}>Sold</th>
                    <th style={{ textAlign: 'right' }}>Sales (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map(item => {
                    const soldQty = item.issuedQty - item.returnQty;
                    return (
                      <tr key={item.productId}>
                        <td className="font-bold">{item.name}</td>
                        <td style={{ textAlign: 'center' }}>{item.issuedQty}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="number" 
                            min="0" 
                            max={item.issuedQty}
                            value={item.returnQty} 
                            onChange={(e) => handleReturnQtyChange(item.productId, e.target.value)}
                            style={{ width: '60px', padding: '0.2rem', textAlign: 'center' }}
                            disabled={activeSettlement.status === 'Settled'}
                          />
                        </td>
                        <td style={{ textAlign: 'center', color: soldQty > 0 ? '#16a34a' : 'inherit' }}>{soldQty}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>৳{soldQty * item.price}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted text-sm uppercase">Total Sales</div>
                  <div className="text-xl font-bold text-info">
                    ৳{returnItems.reduce((acc, item) => acc + ((item.issuedQty - item.returnQty) * item.price), 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted text-sm uppercase">Cash Received</div>
                  <input 
                    type="number" 
                    value={cashReceived} 
                    onChange={e => setCashReceived(parseFloat(e.target.value) || 0)} 
                    style={{ width: '120px', fontSize: '1.2rem', textAlign: 'right', fontWeight: 'bold' }}
                    disabled={activeSettlement.status === 'Settled'}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted text-sm uppercase">Due Amount</div>
                  <div className={`text-xl font-bold ${returnItems.reduce((acc, item) => acc + ((item.issuedQty - item.returnQty) * item.price), 0) - cashReceived > 0 ? 'text-danger' : 'text-success'}`}>
                    ৳{(returnItems.reduce((acc, item) => acc + ((item.issuedQty - item.returnQty) * item.price), 0) - cashReceived).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowSettleModal(false)}>Cancel</button>
              <button type="button" className="btn-primary flex-align-gap" onClick={handleSaveSettlement}>
                <CheckCircle size={18} /> Mark as Paid / Settled
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default SRSettlement;
