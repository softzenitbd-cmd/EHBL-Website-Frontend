import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, List, Printer, FilePlus, Eye, X, Edit, Users } from 'lucide-react';
import useStore from '../store/useStore';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';
import PrintablePurchase from '../components/PrintablePurchase';
import { confirmDialog } from '../utils/swal';
import { printElement } from '../utils/printElement';
import './Purchase.css';

// Fallbacks for a fresh install; the real list comes from the units API and is
// merged on top of these.
const FALLBACK_UNITS = ['Pcs', 'Box', 'Set', 'Dozen', 'Bag', 'Kg', 'Packet', 'Roll', 'Feet', 'Meter'];

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const today = () => new Date().toISOString().split('T')[0];

const Purchase = () => {
  const {
    suppliers, inventory, purchases, units,
    processPurchase, updatePurchase, showToast, deletePurchase, user,
  } = useStore();

  const [activeTab, setActiveTab] = useState('New'); // 'New' or 'History'
  // The number of the document just saved. A toast fades, but the shop needs
  // to copy this onto the paper slip, so it stays on screen until the next one.
  const [lastSaved, setLastSaved] = useState(null);

  // One block per supplier, so "what did we buy from this party?" is one look.
  const [groupByParty, setGroupByParty] = useState(false);

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
  const [entryDate, setEntryDate] = useState(today());
  const [paymentType, setPaymentType] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([]);

  // Quick Entry State
  const [tempProductId, setTempProductId] = useState('');
  const [tempUnit, setTempUnit] = useState('Pcs');
  const [tempQty, setTempQty] = useState(1);
  const [tempPrice, setTempPrice] = useState(0);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState({
    id: '', supplierName: '', paymentType: 'Cash', total: 0, paidAmount: 0, dueAmount: 0, notes: '', date: '',
  });

  // The unit list is whatever the units API returned, on top of the fallbacks,
  // plus anything the products already use - so nothing on file is unpickable.
  const unitOptions = useMemo(() => Array.from(new Set([
    ...FALLBACK_UNITS,
    ...(units || []).map(u => (typeof u === 'string' ? u : u?.name)).filter(Boolean),
    ...inventory.map(p => p.unit).filter(Boolean),
  ])), [units, inventory]);

  const handleDeletePurchase = async (purchase, dueVal) => {
    const isConfirmed = await confirmDialog({
      title: `Delete Purchase ${purchase.id}?`,
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
          <div><strong>Supplier:</strong> ${purchase.supplierName || 'N/A'}</div>
          <div><strong>Total:</strong> ৳${Number(purchase.total || 0).toLocaleString()}</div>
          <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.85rem;">
            The received items will be deducted back out of stock${dueVal > 0 ? ` and ৳${dueVal.toLocaleString()} will be removed from supplier's due.` : '.'}
          </div>
          <div style="margin-top: 0.35rem; color: #ef4444; font-weight: 600; font-size: 0.85rem;">
            This cannot be undone. If any goods were already sold, deletion will be rejected.
          </div>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    });
    if (!isConfirmed) return;

    const result = await deletePurchase(purchase.id);
    showToast(
      result.success ? `Purchase ${purchase.id} deleted and stock reversed.` : `Purchase was not deleted: ${result.error}`,
      result.success ? 'success' : 'error'
    );
  };

  /** Turn whatever is in the quick-entry row into a line item. */
  const buildLineFromRow = () => {
    const prod = inventory.find(p => p.name === tempProductId || p.id === tempProductId);
    return {
      productId: prod ? (prod.product_code || prod.id) : `CUSTOM_${Date.now()}`,
      name: prod ? prod.name : tempProductId,
      unit: tempUnit || 'Pcs',
      quantity: Number(tempQty),
      price: Number(tempPrice),
    };
  };

  const handleAddQuickItem = () => {
    if (!tempProductId || tempQty <= 0) return;

    const line = buildLineFromRow();
    const newItems = [...items.filter(i => i.productId)];
    const existingIndex = newItems.findIndex(i => i.productId === line.productId);

    if (existingIndex >= 0) {
      newItems[existingIndex].quantity += line.quantity;
      newItems[existingIndex].price = line.price;
      if (line.unit) newItems[existingIndex].unit = line.unit;
    } else {
      newItems.push(line);
    }

    setItems(newItems);
    setTempProductId('');
    setTempUnit('Pcs');
    setTempQty(1);
    setTempPrice(0);
  };

  const handleSavePurchase = async () => {
    const validItems = [...items.filter(i => i.productId && i.quantity > 0)];

    // Auto add from the input row if the user forgot to click + Add
    if (tempProductId && tempQty > 0) {
      validItems.push(buildLineFromRow());
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

    // No id is sent: the server issues the running number (PUR-0001), and a
    // client-made one would override it with something nobody can read.
    const created = await processPurchase({
      supplierId: finalSupplierId,
      supplierName: finalSupplierName,
      paymentType,
      items: validItems,
      total,
      paidAmount: finalPaidAmount,
      notes: note.trim(),
      date: entryDate || today(),
    });

    if (created?.success === false) {
      showToast(`Purchase was not saved: ${created.error}`, 'error');
      return;
    }

    const purchaseNo = created?.data?.purchase_number || created?.data?.id || '';
    showToast(
      purchaseNo
        ? `Purchase saved. Number: ${purchaseNo}`
        : 'Purchase successfully recorded and stock updated!',
      'success'
    );
    setLastSaved(purchaseNo ? { number: purchaseNo } : null);
    setSupplier('');
    setPaidAmount('');
    setNote('');
    setItems([]);
    setTempProductId('');
    setTempUnit('Pcs');
    setTempQty(1);
    setTempPrice(0);
    setEntryDate(today());
    navigate('/purchases');
    setActiveTab('History');
  };

  const handleEditPurchaseClick = (purchase) => {
    setEditingPurchase({
      ...purchase,
      total: Number(purchase.total || 0),
      paidAmount: Number(purchase.paidAmount || purchase.paid || 0),
      dueAmount: Number(purchase.dueAmount || purchase.due || 0),
      notes: purchase.notes || '',
      date: (purchase.date || '').split('T')[0],
    });
    setShowEditModal(true);
  };

  const handleUpdatePurchase = async (e) => {
    e.preventDefault();
    const result = await updatePurchase(editingPurchase.id, {
      ...editingPurchase,
      total: Number(editingPurchase.total || 0),
      paidAmount: Number(editingPurchase.paidAmount || 0),
      dueAmount: Number(editingPurchase.dueAmount || 0)
    });

    if (!result.success) {
      showToast(`Purchase was not updated: ${result.error}`, 'error');
      return;
    }

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

  const partyGroups = useMemo(() => {
    const groups = new Map();
    filteredPurchases.forEach((row) => {
      const party = String(row.supplierName || '').trim() || 'No supplier';
      if (!groups.has(party)) groups.set(party, []);
      groups.get(party).push(row);
    });
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredPurchases]);

  const currentTotal = items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0) +
    (items.length === 0 && tempProductId ? (Number(tempQty) * Number(tempPrice)) : 0);

  // What the summary rail shows before the voucher is saved. It follows the
  // same rule the server applies, so the figures on screen are the figures
  // that get written.
  const previewPaid = paymentType === 'Cash'
    ? currentTotal
    : paymentType === 'Baki'
      ? 0
      : (parseFloat(paidAmount) || 0);
  const previewDue = Math.max(0, currentTotal - previewPaid);
  const totalQtyAdded = items.reduce((n, i) => n + Number(i.quantity || 0), 0);

  // Everything standing between the shop and a saved voucher, so the rail can
  // say what is missing instead of just greying the button out.
  const blockers = [];
  if (!supplier.trim()) blockers.push('Choose a supplier');
  if (items.length === 0 && !tempProductId) blockers.push('Add at least one item');
  if (paymentType === 'Partial' && !(parseFloat(paidAmount) > 0)) blockers.push('Enter the paid amount');
  if (previewPaid > currentTotal) blockers.push('Paid cannot exceed the total');

  const historyTotals = filteredPurchases.reduce((acc, p) => {
    const total = Number(p.total || 0);
    const paid = Number(p.paidAmount || p.paid || 0);
    return {
      total: acc.total + total,
      paid: acc.paid + paid,
      due: acc.due + Number(p.dueAmount ?? p.due ?? Math.max(0, total - paid)),
    };
  }, { total: 0, paid: 0, due: 0 });

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="purchase-page">
      <header className="pur-header">
        <h1>Purchase</h1>
        <p>Record goods received from a supplier and keep stock and payables in step.</p>
      </header>

      <nav className="pur-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'New'}
          className={`pur-tab ${activeTab === 'New' ? 'is-active' : ''}`}
          onClick={() => { setActiveTab('New'); navigate('/purchases?action=add'); }}
        >
          <FilePlus size={15} /> New Entry
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'History'}
          className={`pur-tab ${activeTab === 'History' ? 'is-active' : ''}`}
          onClick={() => { setActiveTab('History'); navigate('/purchases'); }}
        >
          <List size={15} /> History
          <span className="pur-tab__count">{purchases.length}</span>
        </button>
      </nav>

      {activeTab === 'New' && (
        <div className="pur-layout">
          <div className="pur-main">
            {lastSaved && (
              <div className="pur-alert" role="status">
                <div>
                  <span className="pur-alert__label">Saved</span>
                  <span>Purchase No: <strong>{lastSaved.number}</strong></span>
                </div>
                <button type="button" className="pur-alert__close" onClick={() => setLastSaved(null)} aria-label="Dismiss">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* ---------------------------------------------- 1. voucher */}
            <section className="pur-section">
              <div className="pur-section__head">
                <span className="pur-step">1</span>
                <div>
                  <h2>Voucher</h2>
                  <p>Who the goods came from, and how they are being paid for.</p>
                </div>
              </div>

              <div className="pur-section__body">
                <div className="pur-grid pur-grid--voucher">
                  <div className="pur-field pur-f-date">
                    <label htmlFor="pur-date">Date</label>
                    <input
                      id="pur-date"
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pur-field pur-f-supplier">
                    <label htmlFor="pur-supplier">Supplier <span className="pur-req">*</span></label>
                    <input
                      id="pur-supplier"
                      list="suppliers-list"
                      placeholder="Search or type supplier name"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      autoComplete="off"
                    />
                    <datalist id="suppliers-list">
                      {suppliers.map(s => <option key={s.id} value={s.name}>{s.name} ({s.company || 'Supplier'})</option>)}
                    </datalist>
                    <span className="pur-hint">A name not on file is added as a new supplier.</span>
                  </div>

                  <div className="pur-field pur-f-payment">
                    <label htmlFor="pur-payment">Payment</label>
                    <select id="pur-payment" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                      <option value="Cash">Cash &mdash; paid in full</option>
                      <option value="Baki">Baki &mdash; all on due</option>
                      <option value="Partial">Partial &mdash; part paid</option>
                    </select>
                  </div>

                  {paymentType === 'Partial' && (
                    <div className="pur-field pur-f-paid">
                      <label htmlFor="pur-paid">Paid Amount <span className="pur-req">*</span></label>
                      <input
                        id="pur-paid"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                      />
                      <span className="pur-hint">The rest goes on the supplier&rsquo;s due.</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ------------------------------------------------ 2. items */}
            <section className="pur-section">
              <div className="pur-section__head">
                <span className="pur-step">2</span>
                <div>
                  <h2>Items</h2>
                  <p>Add each product received. Press Enter on any box to add the line.</p>
                </div>
                {items.length > 0 && (
                  <span className="pur-section__badge">{items.length} line{items.length === 1 ? '' : 's'}</span>
                )}
              </div>

              <div className="pur-section__body">
                <div className="pur-entryrow">
                  <div className="pur-grid pur-grid--items">
                    <div className="pur-field pur-f-product">
                      <label htmlFor="pur-product">Product Name</label>
                      <input
                        id="pur-product"
                        list="inventory-products"
                        placeholder="Search or type a new product"
                        value={tempProductId}
                        autoComplete="off"
                        onChange={(e) => {
                          const val = e.target.value;
                          setTempProductId(val);
                          const prod = inventory.find(p => p.name === val || p.id === val);
                          if (prod) {
                            setTempPrice(prod.purchasePrice || prod.cost_price || prod.price || 0);
                            setTempUnit(prod.unit || 'Pcs');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddQuickItem(); }
                        }}
                      />
                      <datalist id="inventory-products">
                        {inventory.map(p => <option key={p.id} value={p.name}>{p.name} (Stock: {p.stock})</option>)}
                      </datalist>
                    </div>

                    <div className="pur-field pur-f-unit">
                      <label htmlFor="pur-unit">Unit</label>
                      <select id="pur-unit" value={tempUnit} onChange={(e) => setTempUnit(e.target.value)}>
                        {unitOptions.map((u, idx) => <option key={idx} value={u}>{u}</option>)}
                      </select>
                    </div>

                    <div className="pur-field pur-f-qty">
                      <label htmlFor="pur-qty">Quantity</label>
                      <input
                        id="pur-qty"
                        type="number"
                        min="1"
                        value={tempQty}
                        onChange={(e) => setTempQty(parseFloat(e.target.value) || 1)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddQuickItem(); }
                        }}
                      />
                    </div>

                    <div className="pur-field pur-f-rate">
                      <label htmlFor="pur-rate">Rate</label>
                      <input
                        id="pur-rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddQuickItem(); }
                        }}
                      />
                    </div>

                    <div className="pur-field pur-f-linetotal">
                      <label>Line Total</label>
                      <output className="pur-linetotal">
                        &#2547;{money((Number(tempQty) || 0) * (Number(tempPrice) || 0))}
                      </output>
                    </div>

                    <div className="pur-field pur-f-add">
                      <button
                        type="button"
                        className="pur-btn pur-btn--primary"
                        onClick={handleAddQuickItem}
                        disabled={!tempProductId}
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pur-tablewrap">
                  <table className="pur-table">
                    <thead>
                      <tr>
                        <th scope="col" className="is-center">#</th>
                        <th scope="col">Product Name</th>
                        <th scope="col">Unit</th>
                        <th scope="col" className="is-num">Qty</th>
                        <th scope="col" className="is-num">Rate</th>
                        <th scope="col" className="is-num">Total</th>
                        <th scope="col" className="is-center">&nbsp;</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="pur-empty">
                            <strong>No items yet</strong>
                            <span>Use the row above to add the first product.</span>
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => (
                          <tr key={index}>
                            <td className="is-center pur-sl">{index + 1}</td>
                            <td className="is-strong">{item.name}</td>
                            <td>{item.unit || 'Pcs'}</td>
                            <td className="is-num">{item.quantity}</td>
                            <td className="is-num">{money(item.price)}</td>
                            <td className="is-num is-strong">{money(Number(item.quantity || 0) * Number(item.price || 0))}</td>
                            <td className="is-center">
                              <button
                                type="button"
                                className="pur-iconbtn pur-iconbtn--danger"
                                onClick={() => setItems(items.filter((_, i) => i !== index))}
                                title="Remove item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={3}>{items.length} item{items.length === 1 ? '' : 's'}</td>
                          <td className="is-num">{totalQtyAdded}</td>
                          <td />
                          <td className="is-num">&#2547;{money(currentTotal)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------- 3. note */}
            <section className="pur-section">
              <div className="pur-section__head">
                <span className="pur-step">3</span>
                <div>
                  <h2>Note <span className="pur-optional">optional</span></h2>
                  <p>Printed on the voucher, so write what the supplier should see.</p>
                </div>
              </div>

              <div className="pur-section__body">
                <div className="pur-field">
                  <textarea
                    id="pur-note"
                    rows="2"
                    placeholder="e.g. challan no. 4471, delivered by van, second half pending"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* ------------------------------------------------ summary rail */}
          <aside className="pur-side">
            <div className="pur-summary">
              <div className="pur-summary__head">Summary</div>

              <dl className="pur-summary__list">
                <div>
                  <dt>Supplier</dt>
                  <dd className={supplier ? '' : 'is-empty'}>{supplier || 'Not chosen'}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{entryDate || '-'}</dd>
                </div>
                <div>
                  <dt>Items</dt>
                  <dd>{items.length} line{items.length === 1 ? '' : 's'} &middot; {totalQtyAdded} qty</dd>
                </div>
              </dl>

              <div className="pur-summary__money">
                <div className="pur-summary__row">
                  <span>Total</span>
                  <strong>&#2547;{money(currentTotal)}</strong>
                </div>
                <div className="pur-summary__row is-paid">
                  <span>Paid</span>
                  <strong>&#2547;{money(previewPaid)}</strong>
                </div>
                <div className="pur-summary__row is-due">
                  <span>Due</span>
                  <strong>&#2547;{money(previewDue)}</strong>
                </div>
              </div>

              {blockers.length > 0 && (
                <ul className="pur-blockers">
                  {blockers.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}

              <button
                type="button"
                className="pur-btn pur-btn--primary pur-btn--block"
                onClick={handleSavePurchase}
                disabled={blockers.length > 0}
              >
                <FilePlus size={16} /> Save Purchase
              </button>

              <p className="pur-summary__note">
                Saving adds the items to stock and puts any due on the supplier&rsquo;s account.
              </p>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'History' && (
        <section className="pur-panel">
          <div className="pur-panel__head">
            <h2>Purchase History</h2>
            <div className="pur-panel__head-actions">
              <button
                type="button"
                className={`pur-btn ${groupByParty ? 'pur-btn--primary' : ''}`}
                onClick={() => setGroupByParty(v => !v)}
                aria-pressed={groupByParty}
                title="Break the list into one block per supplier"
              >
                <Users size={16} /> Party-wise
              </button>
              <button type="button" className="pur-btn" onClick={() => printElement('printable-all-purchases-details')}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>

          <div className="pur-toolbar">
            <div className="pur-filter">
              <label htmlFor="pur-from">From</label>
              <input id="pur-from" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="pur-filter">
              <label htmlFor="pur-to">To</label>
              <input id="pur-to" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {(startDate || endDate) && (
              <button type="button" className="pur-btn pur-btn--link" onClick={clearFilters}>Clear</button>
            )}

            <dl className="pur-figures">
              <div>
                <dt>Purchases</dt>
                <dd>{filteredPurchases.length}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>&#2547;{money(historyTotals.total)}</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>&#2547;{money(historyTotals.paid)}</dd>
              </div>
              <div>
                <dt>Due</dt>
                <dd>&#2547;{money(historyTotals.due)}</dd>
              </div>
            </dl>
          </div>

          <div className="pur-tablewrap">
            <table className="pur-table">
              <thead>
                <tr>
                  <th scope="col" className="is-center pur-sl">SL</th>
                  <th scope="col">Date</th>
                  <th scope="col">Purchase No</th>
                  <th scope="col">Supplier</th>
                  <th scope="col" className="is-num">Items</th>
                  <th scope="col">Payment</th>
                  <th scope="col" className="is-num">Total</th>
                  <th scope="col" className="is-num">Paid</th>
                  <th scope="col" className="is-num">Due</th>
                  <th scope="col" className="is-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => { let sl = 0; return (groupByParty
                  ? partyGroups.flatMap(([party, rows]) => [
                      <tr key={`grp-${party}`} className="pur-group">
                        <td colSpan={10}>
                          <strong>{party}</strong>
                          <span>
                            {rows.length} purchase{rows.length === 1 ? '' : 's'}
                            &nbsp;&middot;&nbsp; Total &#2547;{money(rows.reduce((n, x) => n + Number(x.total || 0), 0))}
                            &nbsp;&middot;&nbsp; Due &#2547;{money(rows.reduce((n, x) => n + Number(x.dueAmount || x.due || 0), 0))}
                          </span>
                        </td>
                      </tr>,
                      ...rows,
                    ])
                  : filteredPurchases
                ).map((purchase) => {
                  if (React.isValidElement(purchase)) return purchase;
                  const totalCost = Number(purchase.total || 0);
                  const paidVal = Number(purchase.paidAmount || purchase.paid || 0);
                  const dueVal = Number(purchase.dueAmount ?? purchase.due ?? Math.max(0, totalCost - paidVal));
                  const itemsCount = (purchase.items || []).reduce((acc, it) => acc + Number(it.quantity || 1), 0);
                  const badge = purchase.paymentType === 'Cash' ? 'paid'
                    : purchase.paymentType === 'Partial' ? 'partial' : 'due';

                  return (
                    <tr key={purchase.id}>
                      <td className="is-center pur-sl">{++sl}</td>
                      <td>{(purchase.date || '').split('T')[0]}</td>
                      <td className="is-code">{purchase.id}</td>
                      <td>{purchase.supplierName || 'N/A'}</td>
                      <td className="is-num">{itemsCount}</td>
                      <td><span className={`pur-badge pur-badge--${badge}`}>{purchase.paymentType}</span></td>
                      <td className="is-num is-strong">&#2547;{money(totalCost)}</td>
                      <td className="is-num">&#2547;{money(paidVal)}</td>
                      <td className="is-num">&#2547;{money(dueVal)}</td>
                      <td className="is-center">
                        <div className="pur-rowactions">
                          <button
                            type="button"
                            className="pur-iconbtn"
                            title="Edit purchase"
                            onClick={(e) => { e.stopPropagation(); handleEditPurchaseClick(purchase); }}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            type="button"
                            className="pur-iconbtn"
                            title="View & print voucher"
                            onClick={() => setSelectedInvoice(purchase)}
                          >
                            <Eye size={15} />
                          </button>
                          {user?.role === 'Admin' && (
                            <button
                              type="button"
                              className="pur-iconbtn pur-iconbtn--danger"
                              title="Delete purchase"
                              onClick={(e) => { e.stopPropagation(); handleDeletePurchase(purchase, dueVal); }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }); })()}
                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan="10" className="pur-empty">
                      No purchases recorded{(startDate || endDate) ? ' in this date range' : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredPurchases.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6}>Total of {filteredPurchases.length} purchase{filteredPurchases.length === 1 ? '' : 's'}</td>
                    <td className="is-num">&#2547;{money(historyTotals.total)}</td>
                    <td className="is-num">&#2547;{money(historyTotals.paid)}</td>
                    <td className="is-num">&#2547;{money(historyTotals.due)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Printable detailed report of all purchases */}
          <div style={{ display: 'none' }}>
            <div id="printable-all-purchases-details" style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
              <InvoiceHeader />
              <h3 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '1rem' }}>Detailed Purchase Report</h3>
              {(startDate || endDate) && (
                <p style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  Date Filter: {startDate || 'Any'} to {endDate || 'Any'}
                </p>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #ccc' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Date</th>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Purchase No</th>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Supplier</th>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Payment</th>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Item</th>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center' }}>Unit</th>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center' }}>Qty</th>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>Rate</th>
                    <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((purchase) => {
                    const lines = purchase.items || [];
                    return (
                      <React.Fragment key={purchase.id}>
                        {lines.map((item, idx) => (
                          <tr key={`${purchase.id}-${idx}`}>
                            {idx === 0 && (
                              <>
                                <td rowSpan={lines.length} style={{ border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top' }}>{(purchase.date || '').split('T')[0]}</td>
                                <td rowSpan={lines.length} style={{ border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top' }}>{purchase.id}</td>
                                <td rowSpan={lines.length} style={{ border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top' }}>{purchase.supplierName || 'N/A'}</td>
                                <td rowSpan={lines.length} style={{ border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top' }}>{purchase.paymentType}</td>
                              </>
                            )}
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{item.name}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center' }}>{item.unit || 'Pcs'}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>&#2547;{money(item.price)}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>&#2547;{money(Number(item.price || 0) * Number(item.quantity || 0))}</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan="8" style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>
                            {purchase.id} Total &nbsp;|&nbsp; Paid &#2547;{money(purchase.paidAmount || purchase.paid || 0)} &nbsp;|&nbsp; Due &#2547;{money(purchase.dueAmount ?? purchase.due ?? 0)}
                            {purchase.notes ? ` | Note: ${purchase.notes}` : ''}
                          </td>
                          <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>
                            &#2547;{money(purchase.total)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <td colSpan="8" style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right' }}>
                      Grand Total ({filteredPurchases.length} purchase{filteredPurchases.length === 1 ? '' : 's'}) &nbsp;|&nbsp;
                      Paid &#2547;{money(historyTotals.paid)} &nbsp;|&nbsp; Due &#2547;{money(historyTotals.due)}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right' }}>
                      &#2547;{money(historyTotals.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <PrintFooter />
            </div>
          </div>
        </section>
      )}

      {/* Single purchase voucher */}
      {selectedInvoice && createPortal(
        <div className="pur-modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="pur-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Purchase voucher">
            <div className="pur-modal__head">
              <h2>Purchase Voucher &middot; {selectedInvoice.id}</h2>
              <button type="button" className="pur-iconbtn" onClick={() => setSelectedInvoice(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="pur-modal__body">
              <div id="printable-single-invoice-pur">
                <PrintablePurchase
                  purchase={selectedInvoice}
                  supplier={suppliers.find(s => s.name === selectedInvoice.supplierName)}
                />
              </div>
            </div>

            <div className="pur-modal__foot">
              <button type="button" className="pur-btn" onClick={() => setSelectedInvoice(null)}>Close</button>
              <button type="button" className="pur-btn pur-btn--primary" onClick={() => printElement('printable-single-invoice-pur')}>
                <Printer size={16} /> Print Voucher
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit purchase */}
      {showEditModal && createPortal(
        <div className="pur-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="pur-modal pur-modal--narrow" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Edit purchase">
            <div className="pur-modal__head">
              <h2>Edit Purchase &middot; {editingPurchase.id}</h2>
              <button type="button" className="pur-iconbtn" onClick={() => setShowEditModal(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="pur-modal__body">
              <form id="edit-purchase-form" onSubmit={handleUpdatePurchase}>
                <div className="pur-grid">
                  <div className="pur-field pur-col-6">
                    <label htmlFor="edit-pur-date">Date</label>
                    <input
                      id="edit-pur-date"
                      type="date"
                      value={editingPurchase.date || ''}
                      onChange={e => setEditingPurchase({ ...editingPurchase, date: e.target.value })}
                    />
                  </div>

                  <div className="pur-field pur-col-6">
                    <label htmlFor="edit-pur-supplier">Supplier Name</label>
                    <input
                      id="edit-pur-supplier"
                      type="text"
                      value={editingPurchase.supplierName || ''}
                      onChange={e => setEditingPurchase({ ...editingPurchase, supplierName: e.target.value })}
                    />
                  </div>

                  <div className="pur-field pur-col-4">
                    <label htmlFor="edit-pur-payment">Payment Type</label>
                    <select
                      id="edit-pur-payment"
                      value={editingPurchase.paymentType}
                      onChange={e => setEditingPurchase({ ...editingPurchase, paymentType: e.target.value })}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Baki">Baki (Due)</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>

                  <div className="pur-field pur-col-4">
                    <label htmlFor="edit-pur-total">Total Cost</label>
                    <input
                      id="edit-pur-total"
                      type="number"
                      step="0.01"
                      value={editingPurchase.total}
                      onChange={e => setEditingPurchase({ ...editingPurchase, total: e.target.value })}
                    />
                  </div>

                  <div className="pur-field pur-col-4">
                    <label htmlFor="edit-pur-paid">Paid Amount</label>
                    <input
                      id="edit-pur-paid"
                      type="number"
                      step="0.01"
                      value={editingPurchase.paidAmount}
                      onChange={e => setEditingPurchase({ ...editingPurchase, paidAmount: e.target.value })}
                    />
                  </div>

                  <div className="pur-field pur-col-12">
                    <label htmlFor="edit-pur-note">Note</label>
                    <textarea
                      id="edit-pur-note"
                      rows="2"
                      value={editingPurchase.notes || ''}
                      onChange={e => setEditingPurchase({ ...editingPurchase, notes: e.target.value })}
                    />
                  </div>
                </div>
                <p className="pur-hint" style={{ marginTop: '0.75rem' }}>
                  Line items and stock are not changed here. The due is recalculated from the payment
                  type and moved onto the supplier this voucher now sits against.
                </p>
              </form>
            </div>

            <div className="pur-modal__foot">
              <button type="button" className="pur-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" form="edit-purchase-form" className="pur-btn pur-btn--primary">
                <Edit size={16} /> Update Purchase
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
