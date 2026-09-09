import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Printer, Eye, Download, Plus, Phone, Edit, X, Wallet } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';
import PrintablePayment from '../components/PrintablePayment';
import { printElement } from '../utils/printElement';
import './Suppliers.css';

const Suppliers = () => {
  const {
    suppliers, addSupplier, updateSupplier, purchases, settlements,
    settleSupplierDue, showToast,
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', company: '', phone: '', location: '', due: '', notes: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState({ id: '', name: '', company: '', phone: '', location: '', due: '', notes: '' });

  // Paying a supplier's balance. The receipt is held separately so it stays on
  // screen after the payment form closes.
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ date: '', amount: '', method: 'Cash', note: '' });
  const [isPaying, setIsPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const money = (value) => Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  /** A supplier's unpaid purchase vouchers, oldest first - the order the
   *  server settles them in. */
  const outstandingPurchases = (person) => {
    if (!person) return [];
    return (purchases || [])
      .filter(p => (
        (p.supplierId === person.id || (p.supplierName || '').toLowerCase() === (person.name || '').toLowerCase())
        && Number(p.dueAmount ?? p.due ?? 0) > 0
      ))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  /** Mirrors the server's oldest-first allocation so the form can show what
   *  the payment is about to clear before it is taken. */
  const previewAllocation = (person, amount) => {
    let rem = Number(amount) || 0;
    const rows = [];
    for (const pur of outstandingPurchases(person)) {
      if (rem <= 0) break;
      const due = Number(pur.dueAmount ?? pur.due ?? 0);
      const applied = Math.min(rem, due);
      rows.push({ id: pur.id, date: (pur.date || '').split('T')[0], total: Number(pur.total || 0), applied, remaining: due - applied });
      rem -= applied;
    }
    return { rows, unapplied: rem };
  };

  const supplierPayments = (person) => (settlements || [])
    .filter(x => x.type === 'Supplier' && (x.targetId === person?.id || x.partyName === person?.name))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const openPayModal = (person) => {
    setPayTarget(person);
    setPayForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      method: 'Cash',
      note: '',
    });
  };

  const handlePayDue = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payForm.amount);
    const currentDue = Number(payTarget?.due || 0);

    if (!(amount > 0)) {
      showToast('Enter an amount greater than zero.', 'error');
      return;
    }
    if (amount > currentDue) {
      showToast(`Payment cannot exceed the outstanding due of ${money(currentDue)}.`, 'error');
      return;
    }

    setIsPaying(true);
    const result = await settleSupplierDue(payTarget.id, amount, payForm.date, {
      paymentMethod: payForm.method,
      notes: payForm.note.trim(),
    });
    setIsPaying(false);

    if (!result.success) {
      showToast(`Payment was not recorded: ${result.error}`, 'error');
      return;
    }

    showToast(`Payment ${result.data?.id || ''} recorded for ${payTarget.name}.`, 'success');
    setReceipt({
      settlement: result.data,
      allocations: result.data?.allocations || [],
      party: payTarget,
    });
    setPayTarget(null);
  };

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
  const handleAddSupplier = async (e) => {
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
    const result = await addSupplier(supplierToSave);
    if (!result.success) {
      showToast(`Supplier was not saved: ${result.error}`, 'error');
      return;
    }

    showToast("Supplier added successfully!", "success");
    setNewSupplier({ name: '', company: '', phone: '', location: '', due: '', notes: '' });
    setShowAddModal(false);
  };

  const handleEditSupplierClick = (person) => {
    setEditingSupplier({ ...person });
    setShowEditModal(true);
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!editingSupplier.name) {
      showToast("Name is required", "error");
      return;
    }
    const updatedData = { ...editingSupplier };
    if (updatedData.due) updatedData.due = parseFloat(updatedData.due) || 0;
    else updatedData.due = 0;

    const result = await updateSupplier(editingSupplier.id, updatedData);
    if (!result.success) {
      showToast(`Supplier was not updated: ${result.error}`, 'error');
      return;
    }

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
                <th style={{ width: '48px', textAlign: 'center' }}>SL</th>
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
                <tr><td colSpan="8" className="text-center text-muted">No suppliers found.</td></tr>
              ) : (
                filteredList.map((person, index) => {
                  const pt = getSupplierTransactions(person.id);
                  const pTotalPurchased = pt.filter(t => t.type === 'Purchase').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                  const pTotalPaid = pt.filter(t => t.type === 'Payment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                  return (
                    <tr key={person.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
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
                          <button
                            type="button"
                            className="btn-icon"
                            title={person.due > 0 ? 'Pay due' : 'Nothing outstanding'}
                            disabled={!(person.due > 0)}
                            onClick={(e) => { e.stopPropagation(); openPayModal(person); }}
                          >
                            <Wallet size={16} color={person.due > 0 ? 'var(--success)' : undefined} />
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

      {/* Pay Supplier Due */}
      {payTarget && createPortal(
        <div className="sup-modal-overlay" onClick={() => setPayTarget(null)}>
          <div className="sup-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pay supplier due">
            <div className="sup-modal__head">
              <h2>Pay Due &middot; {payTarget.name}</h2>
              <button type="button" className="sup-iconbtn" onClick={() => setPayTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="sup-modal__body">
              <div className="sup-duebar">
                <div>
                  <span>Outstanding Due</span>
                  <strong>&#2547;{money(payTarget.due)}</strong>
                </div>
                <div>
                  <span>Unpaid Vouchers</span>
                  <strong>{outstandingPurchases(payTarget).length}</strong>
                </div>
              </div>

              <form id="pay-due-form" onSubmit={handlePayDue}>
                <div className="sup-grid">
                  <div className="sup-field">
                    <label htmlFor="pay-date">Date</label>
                    <input
                      id="pay-date"
                      type="date"
                      value={payForm.date}
                      onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="sup-field">
                    <label htmlFor="pay-amount">Amount <span className="sup-req">*</span></label>
                    <div className="sup-amountrow">
                      <input
                        id="pay-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={payForm.amount}
                        onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        className="sup-btn"
                        onClick={() => setPayForm({ ...payForm, amount: String(Number(payTarget.due || 0)) })}
                      >
                        Full
                      </button>
                    </div>
                  </div>

                  <div className="sup-field">
                    <label htmlFor="pay-method">Method</label>
                    <select
                      id="pay-method"
                      value={payForm.method}
                      onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    >
                      <option value="Cash">Cash</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div className="sup-field sup-col-full">
                    <label htmlFor="pay-note">Note</label>
                    <input
                      id="pay-note"
                      type="text"
                      placeholder="e.g. cheque no. 220144, paid by hand"
                      value={payForm.note}
                      onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                    />
                  </div>
                </div>
              </form>

              {/* What this payment will clear, in the order the server does it */}
              <h3 className="sup-subhead">This payment will settle</h3>
              {(() => {
                const preview = previewAllocation(payTarget, payForm.amount);
                if (!(Number(payForm.amount) > 0)) {
                  return <p className="sup-hint">Enter an amount to see which purchase vouchers it clears.</p>;
                }
                if (preview.rows.length === 0) {
                  return (
                    <p className="sup-hint">
                      No unpaid purchase vouchers on file &mdash; the payment will just reduce the
                      supplier&rsquo;s opening balance.
                    </p>
                  );
                }
                return (
                  <>
                    <div className="sup-tablewrap">
                      <table className="sup-table">
                        <thead>
                          <tr>
                            <th>Purchase No</th>
                            <th>Date</th>
                            <th className="is-num">Bill</th>
                            <th className="is-num">Applied</th>
                            <th className="is-num">Still Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map(r => (
                            <tr key={r.id}>
                              <td className="is-code">{r.id}</td>
                              <td>{r.date}</td>
                              <td className="is-num">&#2547;{money(r.total)}</td>
                              <td className="is-num is-strong">&#2547;{money(r.applied)}</td>
                              <td className="is-num">&#2547;{money(r.remaining)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.unapplied > 0 && (
                      <p className="sup-hint">
                        &#2547;{money(preview.unapplied)} of this payment goes against the opening
                        balance rather than a voucher.
                      </p>
                    )}
                  </>
                );
              })()}

              {supplierPayments(payTarget).length > 0 && (
                <>
                  <h3 className="sup-subhead">Earlier payments</h3>
                  <div className="sup-tablewrap">
                    <table className="sup-table">
                      <thead>
                        <tr>
                          <th>Receipt No</th>
                          <th>Date</th>
                          <th>Method</th>
                          <th className="is-num">Amount</th>
                          <th className="is-center">&nbsp;</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierPayments(payTarget).slice(0, 5).map(x => (
                          <tr key={x.id}>
                            <td className="is-code">{x.id}</td>
                            <td>{String(x.date).slice(0, 10)}</td>
                            <td>{x.paymentMethod || x.payment_method || 'Cash'}</td>
                            <td className="is-num is-strong">&#2547;{money(x.amount)}</td>
                            <td className="is-center">
                              <button
                                type="button"
                                className="sup-iconbtn"
                                title="Reprint receipt"
                                onClick={() => { setReceipt({ settlement: x, allocations: [], party: payTarget }); setPayTarget(null); }}
                              >
                                <Printer size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="sup-modal__foot">
              <span className="sup-foot-note">
                Due after payment:{' '}
                <strong>
                  &#2547;{money(Math.max(0, Number(payTarget.due || 0) - (parseFloat(payForm.amount) || 0)))}
                </strong>
              </span>
              <button type="button" className="sup-btn" onClick={() => setPayTarget(null)}>Cancel</button>
              <button type="submit" form="pay-due-form" className="sup-btn sup-btn--primary" disabled={isPaying}>
                <Wallet size={16} /> {isPaying ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Payment receipt */}
      {receipt && createPortal(
        <div className="sup-modal-overlay" onClick={() => setReceipt(null)}>
          <div className="sup-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Payment receipt">
            <div className="sup-modal__head">
              <h2>Payment Voucher &middot; {receipt.settlement?.id}</h2>
              <button type="button" className="sup-iconbtn" onClick={() => setReceipt(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="sup-modal__body sup-modal__body--paper">
              <div id="printable-supplier-payment">
                <PrintablePayment
                  settlement={receipt.settlement}
                  party={receipt.party}
                  allocations={receipt.allocations}
                />
              </div>
            </div>

            <div className="sup-modal__foot">
              <button type="button" className="sup-btn" onClick={() => setReceipt(null)}>Close</button>
              <button type="button" className="sup-btn sup-btn--primary" onClick={() => printElement('printable-supplier-payment')}>
                <Printer size={16} /> Print Voucher
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
