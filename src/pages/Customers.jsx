import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Phone, Printer, Eye, Download, Plus, Edit, X } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';

const Customers = () => {
  const { customers, suppliers, settleCustomerDue, settleSupplierDue, updateCustomer, updateSupplier, sales, purchases, settlements, showToast } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Customer'); // Customer or Supplier
  const [smsModal, setSmsModal] = useState({ show: false, target: null, message: '' });
  const [settleModal, setSettleModal] = useState({ show: false, target: null, amount: '', date: '' });
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Add Customer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', location: '', due: '', notes: '' });
  const { addCustomer } = useStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState({ id: '', name: '', phone: '', location: '', due: '', notes: '' });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
    } else {
      setShowAddModal(false);
    }
  }, [location.search]);


  // Compute Ledger for selected person
  let personLedger = [];
  if (selectedPerson) {
    const personSettlements = (settlements || []).filter(s => s.targetId === selectedPerson.id).map(s => ({
      id: s.id,
      date: s.date,
      description: 'Payment / Settlement',
      amount: s.amount,
      type: 'payment' // decreases due
    }));

    if (activeTab === 'Customer') {
      const personSales = (sales || []).filter(s => s.customerId === selectedPerson.id && s.paymentType === 'Baki').map(s => ({
        id: s.id,
        date: s.date,
        description: `Baki Sale (${s.items.length} items)`,
        amount: s.total,
        type: 'charge' // increases due
      }));
      personLedger = [...personSales, ...personSettlements];
    } else {
      const personPurchases = (purchases || []).filter(p => p.supplierId === selectedPerson.id && p.paymentType === 'Baki').map(p => ({
        id: p.id,
        date: p.date,
        description: `Baki Purchase (${p.items.length} items)`,
        amount: p.total,
        type: 'charge' // increases due
      }));
      personLedger = [...personPurchases, ...personSettlements];
    }

    // Sort ascending by date
    personLedger.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate running balance
    let balance = 0;
    personLedger = personLedger.map(tx => {
      if (tx.type === 'charge') balance += tx.amount;
      else if (tx.type === 'payment') balance -= tx.amount;
      return { ...tx, balance };
    });
  }

  const currentList = activeTab === 'Customer' ? customers : suppliers;

  const filteredList = currentList.filter(
    (person) =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.phone.includes(searchTerm)
  );
  const handleSendSMS = (e) => {
    e.preventDefault();
    showToast(`SMS sent to ${smsModal.target.name}!`, 'success');
    setSmsModal({ show: false, target: null, message: '' });
  };

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newCustomer.name) {
      showToast("Name is required", "error");
      return;
    }
    const customerToSave = { ...newCustomer };
    if (customerToSave.due) {
      customerToSave.due = parseFloat(customerToSave.due) || 0;
    } else {
      customerToSave.due = 0;
    }
    addCustomer(customerToSave);
    showToast("Added successfully!", "success");
    setNewCustomer({ name: '', phone: '', location: '', due: '', notes: '' });
    setShowAddModal(false);
  };

  const handleEditClick = (person) => {
    setEditingPerson({ ...person });
    setShowEditModal(true);
  };

  const handleUpdatePerson = (e) => {
    e.preventDefault();
    if (!editingPerson.name) {
      showToast("Name is required", "error");
      return;
    }
    const updatedData = { ...editingPerson };
    if (updatedData.due) updatedData.due = parseFloat(updatedData.due) || 0;
    else updatedData.due = 0;

    if (activeTab === 'Customer') {
      updateCustomer(editingPerson.id, updatedData);
    } else {
      updateSupplier(editingPerson.id, updatedData);
    }
    showToast("Updated successfully!", "success");
    setShowEditModal(false);
  };


  const handleSettle = (e) => {
    e.preventDefault();
    const amount = parseFloat(settleModal.amount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount to settle.', 'error');
      return;
    }

    if (activeTab === 'Customer') {
      settleCustomerDue(settleModal.target.id, amount, settleModal.date);
      showToast(`Successfully settled ৳${amount} for Customer: ${settleModal.target.name}`, 'success');
    } else {
      settleSupplierDue(settleModal.target.id, amount, settleModal.date);
      showToast(`Successfully settled ৳${amount} for Supplier: ${settleModal.target.name}`, 'success');
    }

    setSettleModal({ show: false, target: null, amount: '', date: '' });
  };

  return (
    <div className="customers-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Customers & Due Management</h1>
          <p className="text-muted">Manage Baki (Due) for both customers and suppliers. Send SMS reminders.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="segmented-control" style={{ maxWidth: '400px' }}>
            <button 
              className={activeTab === 'Customer' ? 'active' : ''}
              onClick={() => setActiveTab('Customer')}
            >
              Customers Due
            </button>
            <button 
              className={activeTab === 'Supplier' ? 'active' : ''}
              onClick={() => setActiveTab('Supplier')}
            >
              Suppliers Due
            </button>
          </div>
          <div className="search-bar">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()}s...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-primary flex-align-gap" onClick={() => setShowAddModal(true)} style={{marginLeft: 'auto'}}>
            <Plus size={16} /> Customer
          </button>
          <button className="btn-outline flex-align-gap" onClick={() => {
            const printContents = document.getElementById('printable-customers-list').innerHTML;
            const originalContents = document.body.innerHTML;
            document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload(); 
          }} style={{marginLeft: 'auto'}}>
            <Printer size={16} /> Print List
          </button>
          <button className="btn-outline flex-align-gap text-info" onClick={() => downloadAsPDF('printable-customers-list', 'Customers_List.pdf')}>
            <Download size={16} /> Download PDF
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Total Due (BDT)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">No records found.</td></tr>
              ) : (
                filteredList.map((person) => (
                  <tr key={person.id}>
                    <td>{person.id}</td>
                    <td>{person.name}</td>
                    <td className="flex-align-gap"><Phone size={14} className="text-muted" /> {person.phone}</td>
                    <td><span className="text-danger font-bold">{person.due}</span></td>
                    <td>
                      <div className="action-buttons flex-align-gap" style={{flexWrap:'nowrap'}}>
                        <button type="button" className="btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); handleEditClick(person); }}>
                          <Edit size={16} color="var(--primary)" />
                        </button>
                        <button className="btn-icon" title="View & Print" onClick={() => setSelectedPerson(person)}>
                          <Eye size={16} />
                        </button>
<button className="btn-outline" style={{padding:'0.2rem 0.5rem', fontSize:'0.8rem'}} onClick={() => setSettleModal({ show: true, target: person, amount: person.due, date: new Date().toISOString().split('T')[0] })}>Settle</button>
                        {activeTab === 'Customer' && (
                          <button 
                            className="btn-primary flex-align-gap" style={{padding:'0.2rem 0.5rem', fontSize:'0.8rem'}}
                            onClick={() => setSmsModal({ show: true, target: person, message: `Dear ${person.name}, your due amount is ${person.due}. Please settle your account.` })}
                          >
                            <MessageSquare size={14} /> SMS
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Printable List (Excel Style) */}
      <div id="printable-customers-list" style={{ display: 'none' }}>
        <div style={{ padding: '2rem', background: '#fff', color: '#000' }}>
          <InvoiceHeader />
          <p style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '1.5rem', color: '#333' }}>
            {activeTab === 'Customer' ? 'Customers' : 'Suppliers'} Due List
          </p>
          
          <table style={{ width: '100%', fontSize: '0.85rem', color: '#000', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left'}}>ID</th>
                <th style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left'}}>Name</th>
                <th style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left'}}>Phone</th>
                <th style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right'}}>Total Due (BDT)</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length > 0 ? filteredList.map((person) => (
                <tr key={person.id}>
                  <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{person.id}</td>
                  <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{person.name}</td>
                  <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{person.phone}</td>
                  <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>{person.due.toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{border: '1px solid #ccc', padding: '1rem', textAlign: 'center'}}>No records found.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                <td colSpan="3" style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right'}}>Total Due:</td>
                <td style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right', color: 'red'}}>
                  {filteredList.reduce((sum, item) => sum + Number(item.due || 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
          <PrintFooter />
        </div>
      </div>

      {/* Settle Due Drawer */}
      {settleModal.show && createPortal(
        <div className="drawer-overlay" onClick={() => setSettleModal({ show: false, target: null, amount: '', date: '' })}>
          <div className="drawer-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Settle Due</h2>
              <button className="drawer-close-btn" onClick={() => setSettleModal({ show: false, target: null, amount: '', date: '' })}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="drawer-body">
              <form id="settle-form" onSubmit={handleSettle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1">Target</label>
                    <p className="font-bold">{settleModal.target?.name} ({settleModal.target?.id})</p>
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Current Due (BDT)</label>
                    <p className="font-bold text-danger text-lg">{settleModal.target?.due}</p>
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Settlement Amount (BDT)</label>
                    <input 
                      type="number" 
                      className="w-full" 
                      value={settleModal.amount} 
                      onChange={e => setSettleModal({...settleModal, amount: e.target.value})} 
                      required 
                      min="1"
                      max={settleModal.target?.due}
                      step="any"
                    />
                    <small className="text-muted">Enter the amount they are paying to clear the due.</small>
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Date</label>
                    <input 
                      type="date" 
                      className="w-full" 
                      value={settleModal.date} 
                      onChange={e => setSettleModal({...settleModal, date: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setSettleModal({ show: false, target: null, amount: '', date: '' })}>Cancel</button>
              <button type="submit" form="settle-form" className="btn-primary">Confirm Settlement</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SMS Drawer */}
      {smsModal.show && createPortal(
        <div className="drawer-overlay" onClick={() => setSmsModal({ show: false, target: null, message: '' })}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Send SMS</h2>
              <button type="button" className="drawer-close-btn" onClick={() => setSmsModal({ show: false, target: null, message: '' })}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="drawer-body">
              <p className="mb-4 text-muted">To: {smsModal.target?.name} ({smsModal.target?.phone})</p>
              <form id="sms-form" onSubmit={handleSendSMS}>
                <textarea
                  className="w-full"
                  rows="4"
                  value={smsModal.message}
                  onChange={(e) => setSmsModal({ ...smsModal, message: e.target.value })}
                  required
                />
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setSmsModal({ show: false, target: null, message: '' })}>Cancel</button>
              <button type="submit" form="sms-form" className="btn-primary flex-align-gap"><MessageSquare size={16} /> Send</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Print Single Person Drawer */}
      {selectedPerson && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedPerson(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Due Statement</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedPerson(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-single-person" style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
                 <InvoiceHeader />
                 <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem', color: '#555' }}>
                   Due Statement<br/>
                   Date: {new Date().toLocaleDateString()}
                 </p>
                 <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                 
                 <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                   <p><strong>Name:</strong> {selectedPerson.name}</p>
                   <p><strong>Phone:</strong> {selectedPerson.phone}</p>
                   <p><strong>Type:</strong> {activeTab}</p>
                 </div>

                 <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>Transaction Ledger</h4>
                 <table style={{ width: '100%', fontSize: '0.8rem', color: '#000', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                   <thead>
                     <tr style={{ background: '#f8f9fa' }}>
                       <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left' }}>Date</th>
                       <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left' }}>Description</th>
                       <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right' }}>Charge (Baki)</th>
                       <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right' }}>Payment (Settle)</th>
                       <th style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right' }}>Balance</th>
                     </tr>
                   </thead>
                   <tbody>
                     {personLedger.length > 0 ? (
                       personLedger.map((tx) => (
                         <tr key={tx.id}>
                           <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{new Date(tx.date).toLocaleDateString()}</td>
                           <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{tx.description}</td>
                           <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', color: tx.type === 'charge' ? 'red' : 'inherit' }}>
                             {tx.type === 'charge' ? `৳${tx.amount.toLocaleString()}` : '-'}
                           </td>
                           <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', color: tx.type === 'payment' ? 'green' : 'inherit' }}>
                             {tx.type === 'payment' ? `৳${tx.amount.toLocaleString()}` : '-'}
                           </td>
                           <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>
                             {Math.max(0, tx.balance).toLocaleString()}
                           </td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan="5" style={{ border: '1px solid #ccc', padding: '1rem', textAlign: 'center', color: '#666' }}>No transactions found.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>

                 <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                   <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'red' }}><strong>Current Due:</strong> {selectedPerson.due.toLocaleString()}</p>
                 </div>
                 <PrintFooter />
              </div>
            </div>

            <div className="drawer-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button className="btn-primary flex-align-gap" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => {
                 const printContents = document.getElementById('printable-single-person').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
              }}>
                <Printer size={20} /> Print Document
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-single-person', `Customer_${selectedPerson.name}.pdf`)}>
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Customer Drawer */}
      {/* Add Customer Drawer */}
      {showAddModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowAddModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Add Customer</h2>
              <button type="button" className="drawer-close-btn" onClick={() => setShowAddModal(false)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="add-customer-form" onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Customer Name *</label>
                  <input 
                    type="text" 
                    value={newCustomer.name} 
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} 
                    placeholder="e.g. Karim Rahman" 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={newCustomer.phone} 
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} 
                    placeholder="e.g. 01712345678" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Location / Address</label>
                  <input 
                    type="text" 
                    value={newCustomer.location} 
                    onChange={e => setNewCustomer({...newCustomer, location: e.target.value})} 
                    placeholder="e.g. Dhaka" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Opening Balance (Due)</label>
                  <input 
                    type="number" 
                    value={newCustomer.due} 
                    onChange={e => setNewCustomer({...newCustomer, due: e.target.value})} 
                    placeholder="e.g. 5000" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Notes / Remarks</label>
                  <textarea 
                    value={newCustomer.notes} 
                    onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})} 
                    placeholder="Any additional information..." 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
                    rows={2}
                  />
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" form="add-customer-form" className="btn-primary">Add Customer</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Person Drawer */}
      {showEditModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowEditModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Edit {activeTab}</h2>
              <button type="button" className="drawer-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="edit-person-form" onSubmit={handleUpdatePerson} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>ID (Cannot change)</label>
                  <input 
                    type="text" 
                    value={editingPerson.id} 
                    disabled 
                    style={{ width: '100%', background: 'var(--bg-hover)' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Name *</label>
                  <input 
                    type="text" 
                    value={editingPerson.name} 
                    onChange={e => setEditingPerson({...editingPerson, name: e.target.value})} 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={editingPerson.phone} 
                    onChange={e => setEditingPerson({...editingPerson, phone: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Location / Address</label>
                  <input 
                    type="text" 
                    value={editingPerson.location || ''} 
                    onChange={e => setEditingPerson({...editingPerson, location: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Due Balance</label>
                  <input 
                    type="number" 
                    value={editingPerson.due} 
                    onChange={e => setEditingPerson({...editingPerson, due: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Notes / Remarks</label>
                  <textarea 
                    value={editingPerson.notes || ''} 
                    onChange={e => setEditingPerson({...editingPerson, notes: e.target.value})} 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
                    rows={2}
                  />
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" form="edit-person-form" className="btn-primary flex-align-gap">
                <Edit size={18} /> Update
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Customers;
