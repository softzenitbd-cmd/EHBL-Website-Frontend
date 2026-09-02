import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCcw, Search, PackageMinus, PackagePlus, List, Plus, Printer, Eye, Download } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';
import './Returns.css';

const Returns = () => {
  const { inventory, processReturn, returns, showToast } = useStore();
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

  // New Return State
  const [returnType, setReturnType] = useState('Customer');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [referenceId, setReferenceId] = useState('');

  // History State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!product) {
      showToast('Please select a product', 'error');
      return;
    }
    
    processReturn({
      returnType,
      date: entryDate,
      productId: product,
      quantity,
      reason,
      referenceId
    });
    
    showToast(`${returnType} Return/Reject processed successfully! Stock has been adjusted.`, 'success');
    setProduct('');
    setQuantity(1);
    setReason('');
    setReferenceId('');
    setEntryDate(new Date().toISOString().split('T')[0]);
  };

  const filteredReturns = returns.filter(r => {
    if (!startDate && !endDate) return true;
    const rDate = r.date.split('T')[0];
    if (startDate && rDate < startDate) return false;
    if (endDate && rDate > endDate) return false;
    return true;
  });

  const getProductName = (id) => {
    const item = inventory.find(i => i.id === id);
    return item ? item.name : 'Unknown Product';
  };
  return (
    <div className="returns-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Returns & Rejects</h1>
          <p className="text-muted">Handle customer returns or supplier rejects to adjust inventory.</p>
        </div>
      </div>

      <div className="card glass mb-4" style={{ padding: '0.5rem' }}>
        <div className="return-type-selector" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <button className={`type-btn ${activeTab === 'New' ? 'active' : ''}`} onClick={() => setActiveTab('New')} style={{ padding: '0.5rem 1rem', flex: '1 1 auto', minWidth: '120px' }}>
            <Plus size={16} className="inline-block mr-2" /> Entry
          </button>
          <button className={`type-btn ${activeTab === 'History' ? 'active' : ''}`} onClick={() => setActiveTab('History')} style={{ padding: '0.5rem 1rem', flex: '1 1 auto', minWidth: '120px' }}>
            <List size={16} className="inline-block mr-2" /> Returns History
          </button>
        </div>
      </div>

      {activeTab === 'New' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="segmented-control" style={{ marginBottom: '2rem' }}>
            <button 
              type="button"
              className={returnType === 'Customer' ? 'active' : ''}
              onClick={() => setReturnType('Customer')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <PackagePlus size={16} /> Customer Return (Add to Stock)
            </button>
            <button 
              type="button"
              className={returnType === 'Supplier' ? 'active' : ''}
              onClick={() => setReturnType('Supplier')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <PackageMinus size={16} /> Supplier Reject (Remove Stock)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="return-form">
            <div className="form-group mb-4">
              <label>Date</label>
              <input 
                type="date" 
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="form-group mb-4">
              <label>{returnType === 'Customer' ? 'Sale Invoice ID (Optional)' : 'Purchase ID (Optional)'}</label>
              <input 
                type="text" 
                placeholder="e.g. INV-12345"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="form-group mb-4">
              <label>Product</label>
              <select value={product} onChange={(e) => setProduct(e.target.value)} required>
                <option value="">Select a product...</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>{item.name} (Stock: {item.stock})</option>
                ))}
              </select>
            </div>

            <div className="form-group mb-4">
              <label>Quantity</label>
              <input 
                type="number" 
                min="1" 
                value={quantity} 
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div className="form-group mb-4">
              <label>Reason</label>
              <textarea 
                rows="3" 
                placeholder="Explain reason for return/reject..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              ></textarea>
            </div>

            <button type="submit" className="btn-primary w-full flex-align-gap center-content">
              <RefreshCcw size={18} />
              Process {returnType}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'History' && (
        <div className="card glass animate-slide-up">
          <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
             <h3>Returns & Rejects History</h3>
             <div className="flex-align-gap">
               <label className="text-muted text-sm">Filter by Date:</label>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 bg-input border border-gray-700 rounded text-main" />
               <span className="text-muted">to</span>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 bg-input border border-gray-700 rounded text-main" />
               <button className="btn-primary flex-align-gap" onClick={() => {
                 const printContents = document.getElementById('printable-all-returns-details').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
               }}>
                  <Printer size={18} /> Print All Details
               </button>
               <button className="btn-outline flex-align-gap text-info" onClick={() => downloadAsPDF('printable-all-returns-details', 'Returns_History.pdf')}>
                  <Download size={18} /> Download PDF
               </button>
             </div>
          </div>
          <div className="table-responsive">
             <table className="data-table">
               <thead>
                 <tr>
                   <th>ID</th>
                   <th>Date</th>
                   <th>Ref ID</th>
                   <th>Type</th>
                   <th>Product</th>
                   <th>Qty</th>
                   <th>Reason</th>
                   <th style={{textAlign: 'center'}}>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredReturns.map(r => (
                   <tr key={r.id}>
                     <td>{r.id}</td>
                     <td>{r.date.split('T')[0]}</td>
                     <td>{r.referenceId || '-'}</td>
                     <td>
                        <span className={`badge ${r.returnType === 'Customer' ? 'bg-success text-success' : 'bg-danger text-danger'}`} style={{padding: '0.2rem 0.5rem', borderRadius: '4px', background: r.returnType === 'Customer' ? 'rgba(40,167,69,0.1)' : 'rgba(220,53,69,0.1)'}}>
                          {r.returnType} {r.returnType === 'Customer' ? 'Return' : 'Reject'}
                        </span>
                     </td>
                     <td>{getProductName(r.productId)}</td>
                     <td className="font-bold">{r.quantity}</td>
                     <td>{r.reason}</td>
                     <td style={{textAlign: 'center'}}>
                        <div className="flex-align-gap" style={{justifyContent:'center'}}>
                          <button className="btn-icon" title="View & Print" onClick={() => setSelectedInvoice(r)}>
                            <Eye size={16} />
                          </button>
</div>
                     </td>
                   </tr>
                 ))}
                 {filteredReturns.length === 0 && <tr><td colSpan="7" className="text-center text-muted">No returns found.</td></tr>}
               </tbody>
             </table>
          </div>
          
          <div style={{ display: 'none' }}>
            <div id="printable-all-returns-details" style={{ padding: '2rem', background: '#fff', color: '#000' }}>
            <InvoiceHeader />
              <h3 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '1rem' }}>Detailed Returns & Rejects History</h3>
              {(startDate || endDate) && <p style={{textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem'}}>Date Filter: {startDate || 'Any'} to {endDate || 'Any'}</p>}
              
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Date</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Return ID</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Ref ID</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Type</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Product</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>Qty</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Reason</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map(r => (
                     <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{new Date(r.date).toLocaleDateString()}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.id}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.referenceId || '-'}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.returnType}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{getProductName(r.productId)} (ID: {r.productId})</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center', verticalAlign: 'top'}}>{r.quantity}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.reason}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.notes || '-'}</td>
                     </tr>
                  ))}
                </tbody>
              </table>
              <PrintFooter />
            </div>
          </div>
        </div>
      )}

      {/* Single Return Drawer */}
      {selectedInvoice && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Return Receipt</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedInvoice(null)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-single-return" style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
                 <InvoiceHeader />
                 <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem', color: '#555' }}>
                   {selectedInvoice.returnType} {selectedInvoice.returnType === 'Customer' ? 'Return' : 'Reject'} Receipt<br/>
                   ID: {selectedInvoice.id}<br/>
                   Date: {new Date(selectedInvoice.date).toLocaleString()}
                 </p>
                 <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                 
                 <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '2' }}>
                   <p><strong>Product Name:</strong> {getProductName(selectedInvoice.productId)}</p>
                   {selectedInvoice.referenceId && (
                     <p><strong>{selectedInvoice.returnType === 'Customer' ? 'Sale Invoice ID' : 'Purchase ID'}:</strong> {selectedInvoice.referenceId}</p>
                   )}
                   <p><strong>Quantity:</strong> <span className="font-bold text-xl">{selectedInvoice.quantity}</span></p>
                   <p><strong>Reason:</strong> {selectedInvoice.reason}</p>
                   <p><strong>Effect:</strong> {selectedInvoice.returnType === 'Customer' ? 'Added to Stock (+)' : 'Removed from Stock (-)'}</p>
                 </div>
                 
                 <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                 <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666', marginTop: '1.5rem' }}>
                   Thank you!
                 </p>
                 <PrintFooter />
              </div>
            </div>

            <div className="drawer-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button className="btn-primary flex-align-gap" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => {
                 const printContents = document.getElementById('printable-single-return').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
              }}>
                <Printer size={20} /> Print Receipt
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-single-return', `Return_${selectedInvoice.id}.pdf`)}>
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

export default Returns;
