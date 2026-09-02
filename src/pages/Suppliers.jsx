import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Printer, Eye, Download, Plus, Phone, Edit, X } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';

const Suppliers = () => {
  const { suppliers, addSupplier, updateSupplier, purchases, settlements, showToast } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', company: '', phone: '', location: '', due: '', notes: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState({ id: '', name: '', company: '', phone: '', location: '', due: '', notes: '' });

  const getSupplierTransactions = (supplierId) => {
    if (!supplierId) return [];
    
    const supplierPurchases = (purchases || []).filter(p => p.supplierId === supplierId).map(p => ({
      id: p.id,
      date: p.date,
      type: 'Purchase',
      description: `Purchase (${p.paymentType})`,
      amount: p.total,
      isCredit: true
    }));

    const supplierSettlements = (settlements || []).filter(s => s.targetId === supplierId && s.type === 'Supplier').map(s => ({
      id: s.id,
      date: s.date,
      type: 'Payment',
      description: 'Payment to Supplier',
      amount: s.amount,
      isCredit: false
    }));

    return [...supplierPurchases, ...supplierSettlements].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const selectedPersonTransactions = selectedPerson ? getSupplierTransactions(selectedPerson.id) : [];
  const totalPurchased = selectedPersonTransactions.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalPaid = selectedPersonTransactions.filter(t => t.type === 'Payment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  

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


  const filteredList = suppliers.filter(
    (person) =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (person.phone && person.phone.includes(searchTerm))
  );
  const handleAddSupplier = (e) => {
    e.preventDefault();
    if (!newSupplier.name) {
      showToast("Name is required", "error");
      return;
    }
    const supplierToSave = { ...newSupplier };
    if (supplierToSave.due) {
      supplierToSave.due = parseFloat(supplierToSave.due) || 0;
    } else {
      supplierToSave.due = 0;
    }
    addSupplier(supplierToSave);
    showToast("Supplier added successfully!", "success");
    setNewSupplier({ name: '', company: '', phone: '', location: '', due: '', notes: '' });
    setShowAddModal(false);
  };

  const handleEditSupplierClick = (person) => {
    setEditingSupplier({ ...person });
    setShowEditModal(true);
  };

  const handleUpdateSupplier = (e) => {
    e.preventDefault();
    if (!editingSupplier.name) {
      showToast("Name is required", "error");
      return;
    }
    const updatedData = { ...editingSupplier };
    if (updatedData.due) updatedData.due = parseFloat(updatedData.due) || 0;
    else updatedData.due = 0;

    updateSupplier(editingSupplier.id, updatedData);
    showToast("Supplier updated successfully!", "success");
    setShowEditModal(false);
  };

  return (
    <div className="customers-page animate-fade-in" id="printable-suppliers-list">
      <div className="page-header">
        <div>
          <h1>Suppliers Management</h1>
          <p className="text-muted">Manage your suppliers, add new ones, and track dues.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search suppliers by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="toolbar-actions" style={{ marginLeft: 'auto' }}>
            <button className="btn-primary flex-align-gap" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Supplier
            </button>
            <button className="btn-outline flex-align-gap" onClick={() => window.print()}>
              <Printer size={16} /> Print List
            </button>
            <button className="btn-outline flex-align-gap text-info" onClick={() => downloadAsPDF('printable-suppliers-list', 'Suppliers_List.pdf')}>
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Total Purchase</th>
                <th>Total Paid</th>
                <th>Total Due (BDT)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No suppliers found.</td></tr>
              ) : (
                filteredList.map((person) => {
                  const pt = getSupplierTransactions(person.id);
                  const pTotalPurchased = pt.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                  const pTotalPaid = pt.filter(t => t.type === 'Payment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                  return (
                    <tr key={person.id}>
                      <td>{person.id}</td>
                      <td>{person.name}</td>
                      <td className="flex-align-gap"><Phone size={14} className="text-muted" /> {person.phone || 'N/A'}</td>
                      <td>{pTotalPurchased.toLocaleString()}</td>
                      <td>{pTotalPaid.toLocaleString()}</td>
                      <td><span className={person.due > 0 ? "text-danger font-bold" : "text-success font-bold"}>{person.due.toLocaleString()}</span></td>
                      <td>
                        <div className="action-buttons flex-align-gap" style={{flexWrap:'nowrap'}}>
                          <button type="button" className="btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); handleEditSupplierClick(person); }}>
                            <Edit size={16} color="var(--primary)" />
                          </button>
                          <button className="btn-icon" title="View & Print" onClick={() => setSelectedPerson(person)}>
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <PrintFooter />

      {/* Add Supplier Drawer */}
      {showAddModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowAddModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Add Supplier</h2>
              <button type="button" className="drawer-close-btn" onClick={() => setShowAddModal(false)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="add-supplier-form" onSubmit={handleAddSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Supplier Name *</label>
                  <input 
                    type="text" 
                    value={newSupplier.name} 
                    onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} 
                    placeholder="e.g. Rahim Traders" 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Company / Brand Name</label>
                  <input 
                    type="text" 
                    value={newSupplier.company} 
                    onChange={e => setNewSupplier({...newSupplier, company: e.target.value})} 
                    placeholder="e.g. Rahim Group of Industries" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={newSupplier.phone} 
                    onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} 
                    placeholder="e.g. 01712345678" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
                  <input 
                    type="email" 
                    value={newSupplier.email} 
                    onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} 
                    placeholder="e.g. rahim@example.com" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Location / Address</label>
                  <input 
                    type="text" 
                    value={newSupplier.location} 
                    onChange={e => setNewSupplier({...newSupplier, location: e.target.value})} 
                    placeholder="e.g. Dhaka" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Opening Balance (Due)</label>
                  <input 
                    type="number" 
                    value={newSupplier.due} 
                    onChange={e => setNewSupplier({...newSupplier, due: e.target.value})} 
                    placeholder="e.g. 5000" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Notes / Remarks</label>
                  <textarea 
                    value={newSupplier.notes} 
                    onChange={e => setNewSupplier({...newSupplier, notes: e.target.value})} 
                    placeholder="Any additional information..." 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    rows={2}
                  />
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" form="add-supplier-form" className="btn-primary">Add Supplier</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Supplier Drawer */}
      {showEditModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowEditModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Edit Supplier</h2>
              <button type="button" className="drawer-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="edit-supplier-form" onSubmit={handleUpdateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>ID (Cannot change)</label>
                  <input 
                    type="text" 
                    value={editingSupplier.id} 
                    disabled 
                    style={{ width: '100%', background: 'var(--bg-hover)' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Supplier Name *</label>
                  <input 
                    type="text" 
                    value={editingSupplier.name} 
                    onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})} 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Company / Brand Name</label>
                  <input 
                    type="text" 
                    value={editingSupplier.company || ''} 
                    onChange={e => setEditingSupplier({...editingSupplier, company: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={editingSupplier.phone} 
                    onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Location / Address</label>
                  <input 
                    type="text" 
                    value={editingSupplier.location || ''} 
                    onChange={e => setEditingSupplier({...editingSupplier, location: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Due Balance</label>
                  <input 
                    type="number" 
                    value={editingSupplier.due} 
                    onChange={e => setEditingSupplier({...editingSupplier, due: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Notes / Remarks</label>
                  <textarea 
                    value={editingSupplier.notes || ''} 
                    onChange={e => setEditingSupplier({...editingSupplier, notes: e.target.value})} 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
                    rows={2}
                  />
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" form="edit-supplier-form" className="btn-primary flex-align-gap">
                <Edit size={18} /> Update
              </button>
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
              <h3 style={{ margin: 0 }}>Supplier Statement</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedPerson(null)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-single-person" style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
                 <InvoiceHeader />
                 <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem', color: '#555' }}>
                   Supplier Statement<br/>
                   Date: {new Date().toLocaleDateString()}
                 </p>
                 <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                 
                 <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '2' }}>
                   <p><strong>Name:</strong> {selectedPerson.name}</p>
                   <p><strong>Phone:</strong> {selectedPerson.phone || 'N/A'}</p>
                   <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                   
                   <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
                     <div style={{ textAlign: 'center' }}>
                       <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Purchase (মাল কেনা)</p>
                       <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{totalPurchased.toLocaleString()}</p>
                     </div>
                     <div style={{ textAlign: 'center' }}>
                       <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Paid (জমা)</p>
                       <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>{totalPaid.toLocaleString()}</p>
                     </div>
                     <div style={{ textAlign: 'center' }}>
                       <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Current Due (বাকি)</p>
                       <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: selectedPerson.due > 0 ? '#ef4444' : '#10b981' }}>{selectedPerson.due.toLocaleString()}</p>
                     </div>
                   </div>
                   
                   {selectedPersonTransactions.length > 0 && (
                     <div style={{ marginTop: '1.5rem' }}>
                       <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Transaction History (লেনদেন)</h4>
                       <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                             <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                             <th style={{ padding: '0.5rem', textAlign: 'left' }}>Details</th>
                             <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                           </tr>
                         </thead>
                         <tbody>
                           {selectedPersonTransactions.map(t => (
                             <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                               <td style={{ padding: '0.5rem' }}>{new Date(t.date).toLocaleDateString()}</td>
                               <td style={{ padding: '0.5rem' }}>{t.description}</td>
                               <td style={{ padding: '0.5rem', textAlign: 'right', color: t.isCredit ? 'red' : 'green' }}>
                                  {t.isCredit ? '+' : '-'}{t.amount.toLocaleString()}
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   )}
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
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-single-person', `Supplier_${selectedPerson.name}.pdf`)}>
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

export default Suppliers;
