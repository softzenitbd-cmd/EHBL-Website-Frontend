import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { RefreshCcw, PackageMinus, PackagePlus, List, Plus, Printer, Eye, Trash2, Users, X } from 'lucide-react';
import useStore from '../store/useStore';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';
import PrintableReturn from '../components/PrintableReturn';
import { confirmDialog } from '../utils/swal';
import { printElement } from '../utils/printElement';
import './Returns.css';

// 'Stock Out' is a third kind of record, not a supplier reject, so it needs its
// own wording rather than falling through to "Reject".
const RETURN_LABELS = {
  Customer: 'Customer Return',
  Supplier: 'Supplier Reject',
  'Stock Out': 'Manual Stock Out',
};
const returnLabel = (type) => RETURN_LABELS[type] || `${type} Reject`;

// Rates come back from the API as decimal strings, so every read goes through
// Number() before it is shown or added up.
const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const lineAmount = (r) => Number(r.rate || 0) * Number(r.quantity || 0);

const Returns = () => {
  const { inventory, processReturn, returns, showToast, deleteReturn, user, customers, suppliers } = useStore();
  const [activeTab, setActiveTab] = useState('New'); // 'New' or 'History'
  // The number of the document just saved. A toast fades, but the shop needs
  // to copy this onto the paper slip, so it stays on screen until the next one.
  const [lastSaved, setLastSaved] = useState(null);

  // The shop asks "what did this party return?", so the list can be broken into
  // one block per party instead of one long run of rows.
  const [groupByParty, setGroupByParty] = useState(false);

  const location = useLocation();

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
  // Unit price the goods come back at. Picking a product fills it in - the
  // selling price for a customer return, the cost price for a supplier reject -
  // and the shop can overwrite it when the settled figure differs.
  const [rate, setRate] = useState('');
  const [reason, setReason] = useState('');
  // The party the goods came back from, or went back to. Returns are looked up
  // by who they were with, not by the invoice number.
  const [partyName, setPartyName] = useState('');

  const partyOptions = (returnType === 'Customer' ? customers : suppliers) || [];

  const selectedProduct = inventory.find((i) => i.id === product);
  const defaultRateFor = (item, type) => {
    if (!item) return '';
    const value = type === 'Customer'
      ? item.price
      : (item.purchasePrice ?? item.cost_price ?? item.price);
    return value === undefined || value === null ? '' : String(Number(value));
  };

  const handleProductChange = (productId) => {
    setProduct(productId);
    setRate(defaultRateFor(inventory.find((i) => i.id === productId), returnType));
  };

  const handleReturnTypeChange = (type) => {
    setReturnType(type);
    // The two sides of the counter value the same goods differently, so the
    // suggested rate follows the switch.
    setRate(defaultRateFor(inventory.find((i) => i.id === product), type));
  };

  const formAmount = (Number(rate) || 0) * (Number(quantity) || 0);

  // History State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleDeleteReturn = async (record) => {
    const goesBack = record.returnType === 'Customer'
      ? `${record.quantity} will be taken back out of stock.`
      : `${record.quantity} will be put back into stock.`;

    const isConfirmed = await confirmDialog({
      title: `Delete ${record.returnType} Return ${record.id}?`,
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
          <div><strong>Product:</strong> ${record.productName || record.productId}</div>
          <div><strong>Quantity:</strong> ${record.quantity}</div>
          <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.85rem;">
            Reversing this record means ${goesBack}
          </div>
          <div style="margin-top: 0.35rem; color: #ef4444; font-weight: 600; font-size: 0.85rem;">
            This cannot be undone.
          </div>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    });
    if (!isConfirmed) return;

    const result = await deleteReturn(record.id);
    showToast(
      result.success ? `Return ${record.id} deleted and stock reversed.` : `Return was not deleted: ${result.error}`,
      result.success ? 'success' : 'error'
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) {
      showToast('Please select a product', 'error');
      return;
    }

    const result = await processReturn({
      returnType,
      date: entryDate,
      productId: product,
      quantity,
      rate,
      reason,
      partyName: partyName.trim()
    });

    if (!result.success) {
      showToast(`Return was not recorded: ${result.error}`, 'error');
      return;
    }

    // The number is what the shop writes on the paper slip, so it has to be
    // on screen the moment the return is saved, not only in the history list.
    const returnNo = result.data?.return_code || result.data?.id || '';
    showToast(
      returnNo
        ? `${returnType} Return saved. Number: ${returnNo}`
        : `${returnType} Return/Reject processed successfully! Stock has been adjusted.`,
      'success'
    );
    setLastSaved(returnNo ? { number: returnNo, type: returnType } : null);
    setProduct('');
    setQuantity(1);
    setRate('');
    setReason('');
    setPartyName('');
    setEntryDate(new Date().toISOString().split('T')[0]);
  };

  const filteredReturns = returns.filter(r => {
    if (!startDate && !endDate) return true;
    const rDate = r.date.split('T')[0];
    if (startDate && rDate < startDate) return false;
    if (endDate && rDate > endDate) return false;
    return true;
  });

  const partyGroups = useMemo(() => {
    const groups = new Map();
    filteredReturns.forEach((r) => {
      const party = String(r.partyName || r.referenceId || '').trim() || 'No party';
      if (!groups.has(party)) groups.set(party, []);
      groups.get(party).push(r);
    });
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredReturns]);

  const totalQty = filteredReturns.reduce((n, r) => n + Number(r.quantity || 0), 0);
  const totalValue = filteredReturns.reduce((n, r) => n + lineAmount(r), 0);

  const getProductName = (id) => {
    const item = inventory.find(i => i.id === id);
    return item ? item.name : 'Unknown Product';
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="returns-page">
      <header className="rt-header">
        <h1>Returns &amp; Rejects</h1>
        <p>Record goods coming back from a customer or going back to a supplier, and adjust stock accordingly.</p>
      </header>

      <nav className="rt-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'New'}
          className={`rt-tab ${activeTab === 'New' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('New')}
        >
          <Plus size={15} /> New Entry
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'History'}
          className={`rt-tab ${activeTab === 'History' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('History')}
        >
          <List size={15} /> History
          <span className="rt-tab__count">{returns.length}</span>
        </button>
      </nav>

      {activeTab === 'New' && (
        <section className="rt-panel rt-panel--form">
          <div className="rt-panel__head">
            <h2>New Return / Reject</h2>
          </div>

          <div className="rt-panel__body">
            {lastSaved && (
              <div className="rt-alert" role="status">
                <div>
                  <span className="rt-alert__label">Saved</span>
                  <span className="rt-alert__text">
                    {returnLabel(lastSaved.type)} recorded. Return No: <strong>{lastSaved.number}</strong>
                  </span>
                </div>
                <button type="button" className="rt-alert__close" onClick={() => setLastSaved(null)} aria-label="Dismiss">
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <fieldset className="rt-fieldset">
                <legend>Return Type</legend>
                <div className="rt-typeswitch">
                  <button
                    type="button"
                    className={`rt-type ${returnType === 'Customer' ? 'is-active' : ''}`}
                    onClick={() => handleReturnTypeChange('Customer')}
                    aria-pressed={returnType === 'Customer'}
                  >
                    <PackagePlus size={18} />
                    <span className="rt-type__title">Customer Return</span>
                    <span className="rt-type__note">Goods come back &mdash; stock increases</span>
                  </button>
                  <button
                    type="button"
                    className={`rt-type ${returnType === 'Supplier' ? 'is-active' : ''}`}
                    onClick={() => handleReturnTypeChange('Supplier')}
                    aria-pressed={returnType === 'Supplier'}
                  >
                    <PackageMinus size={18} />
                    <span className="rt-type__title">Supplier Reject</span>
                    <span className="rt-type__note">Goods go back &mdash; stock decreases</span>
                  </button>
                </div>
              </fieldset>

              <fieldset className="rt-fieldset">
                <legend>Details</legend>
                <div className="rt-grid">
                  <div className="rt-field rt-f-date">
                    <label htmlFor="rt-date">Date</label>
                    <input
                      id="rt-date"
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="rt-field rt-f-party">
                    <label htmlFor="rt-party">{returnType === 'Customer' ? 'Customer' : 'Supplier'}</label>
                    <input
                      id="rt-party"
                      type="text"
                      list="return-party-list"
                      placeholder={returnType === 'Customer' ? 'Search or type customer name' : 'Search or type supplier name'}
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      autoComplete="off"
                    />
                    <datalist id="return-party-list">
                      {partyOptions.map(p => (
                        <option key={p.id} value={p.name}>
                          {p.name}{p.phone ? ` (${p.phone})` : ''}
                        </option>
                      ))}
                    </datalist>
                    <span className="rt-hint">Optional. A name not on file is still kept on the record.</span>
                  </div>

                  <div className="rt-field rt-f-product">
                    <label htmlFor="rt-product">Product</label>
                    <select
                      id="rt-product"
                      value={product}
                      onChange={(e) => handleProductChange(e.target.value)}
                      required
                    >
                      <option value="">Select a product</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id}>{item.name} (Stock: {item.stock})</option>
                      ))}
                    </select>
                    {selectedProduct && (
                      <span className="rt-hint">
                        Code {selectedProduct.id} &middot; In stock {selectedProduct.stock} {selectedProduct.unit || 'pcs'}
                      </span>
                    )}
                  </div>

                  <div className="rt-field rt-f-qty">
                    <label htmlFor="rt-qty">Quantity</label>
                    <input
                      id="rt-qty"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>

                  <div className="rt-field rt-f-rate">
                    <label htmlFor="rt-rate">Rate (Price) per {selectedProduct?.unit || 'unit'}</label>
                    <input
                      id="rt-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      required
                    />
                    <span className="rt-hint">
                      {returnType === 'Customer'
                        ? 'Filled in from the selling price. Change it if credited at another rate.'
                        : 'Filled in from the purchase price. Change it if returned at another rate.'}
                    </span>
                  </div>

                  <div className="rt-field rt-f-total">
                    <span className="rt-total__label">Total Amount</span>
                    <output className="rt-total">&#2547;{money(formAmount)}</output>
                  </div>
                </div>
              </fieldset>

              <fieldset className="rt-fieldset">
                <legend>Reason</legend>
                <div className="rt-field">
                  <label htmlFor="rt-reason" className="sr-only-label">Reason</label>
                  <textarea
                    id="rt-reason"
                    rows="3"
                    placeholder="Why are these goods being returned? e.g. damaged on delivery, wrong item supplied"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                  <span className="rt-hint">Printed on the memo, so write what the party should see.</span>
                </div>
              </fieldset>

              <div className="rt-actions">
                <span className="rt-actions__note">
                  Saving adjusts stock immediately and cannot be edited afterwards.
                </span>
                <button type="submit" className="rt-btn rt-btn--primary">
                  <RefreshCcw size={16} />
                  Save {returnLabel(returnType)}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {activeTab === 'History' && (
        <section className="rt-panel">
          <div className="rt-panel__head">
            <h2>Returns &amp; Rejects History</h2>
            <div className="rt-panel__head-actions">
              <button
                type="button"
                className={`rt-btn ${groupByParty ? 'rt-btn--primary' : ''}`}
                onClick={() => setGroupByParty(v => !v)}
                aria-pressed={groupByParty}
                title="Break the list into one block per party"
              >
                <Users size={16} /> Party-wise
              </button>
              <button type="button" className="rt-btn" onClick={() => printElement('printable-all-returns-details')}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>

          <div className="rt-toolbar">
            <div className="rt-filter">
              <label htmlFor="rt-from">From</label>
              <input id="rt-from" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="rt-filter">
              <label htmlFor="rt-to">To</label>
              <input id="rt-to" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            {(startDate || endDate) && (
              <button type="button" className="rt-btn rt-btn--link" onClick={clearFilters}>Clear</button>
            )}

            <dl className="rt-figures">
              <div>
                <dt>Records</dt>
                <dd>{filteredReturns.length}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{totalQty}</dd>
              </div>
              <div>
                <dt>Value</dt>
                <dd>&#2547;{money(totalValue)}</dd>
              </div>
            </dl>
          </div>

          <div className="rt-tablewrap">
            <table className="rt-table">
              <thead>
                <tr>
                  <th scope="col" className="is-center rt-sl">SL</th>
                  <th scope="col">Return No</th>
                  <th scope="col">Date</th>
                  <th scope="col">Party</th>
                  <th scope="col">Type</th>
                  <th scope="col">Product</th>
                  <th scope="col" className="is-num">Qty</th>
                  <th scope="col" className="is-num">Rate</th>
                  <th scope="col" className="is-num">Amount</th>
                  <th scope="col">Reason</th>
                  <th scope="col" className="is-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => { let sl = 0; return (groupByParty
                  ? partyGroups.flatMap(([party, rows]) => [
                      <tr key={`grp-${party}`} className="rt-group">
                        <td colSpan={11}>
                          <strong>{party}</strong>
                          <span>
                            {rows.length} return{rows.length === 1 ? '' : 's'}
                            &nbsp;&middot;&nbsp; {rows.reduce((n, x) => n + Number(x.quantity || 0), 0)} pcs
                            &nbsp;&middot;&nbsp; &#2547;{money(rows.reduce((n, x) => n + lineAmount(x), 0))}
                          </span>
                        </td>
                      </tr>,
                      ...rows,
                    ])
                  : filteredReturns
                ).map(r => (
                  React.isValidElement(r) ? r : (
                  <tr key={r.id}>
                    <td className="is-center rt-sl">{++sl}</td>
                    <td className="is-code">{r.id}</td>
                    <td>{r.date.split('T')[0]}</td>
                    <td>{r.partyName || r.referenceId || '-'}</td>
                    <td>
                      <span className={`rt-badge ${r.returnType === 'Customer' ? 'rt-badge--in' : 'rt-badge--out'}`}>
                        {returnLabel(r.returnType)}
                      </span>
                    </td>
                    <td>{getProductName(r.productId)}</td>
                    <td className="is-num">{r.quantity}</td>
                    <td className="is-num">&#2547;{money(r.rate)}</td>
                    <td className="is-num is-strong">&#2547;{money(lineAmount(r))}</td>
                    <td className="rt-reason" title={r.reason}><span>{r.reason}</span></td>
                    <td className="is-center">
                      <div className="rt-rowactions">
                        <button type="button" className="rt-iconbtn" title="View & print memo" onClick={() => setSelectedInvoice(r)}>
                          <Eye size={16} />
                        </button>
                        {user?.role === 'Admin' && (
                          <button type="button" className="rt-iconbtn rt-iconbtn--danger" title="Delete return" onClick={() => handleDeleteReturn(r)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                )); })()}
                {filteredReturns.length === 0 && (
                  <tr>
                    <td colSpan="11" className="rt-empty">
                      No returns recorded{(startDate || endDate) ? ' in this date range' : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredReturns.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6}>Total of {filteredReturns.length} record{filteredReturns.length === 1 ? '' : 's'}</td>
                    <td className="is-num">{totalQty}</td>
                    <td />
                    <td className="is-num">&#2547;{money(totalValue)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div style={{ display: 'none' }}>
            <div id="printable-all-returns-details" style={{ padding: '2rem', background: '#fff', color: '#000' }}>
            <InvoiceHeader />
              <h3 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '1rem' }}>Detailed Returns &amp; Rejects History</h3>
              {(startDate || endDate) && <p style={{textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem'}}>Date Filter: {startDate || 'Any'} to {endDate || 'Any'}</p>}

              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Date</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Return ID</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Party</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Type</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Product</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>Qty</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>Rate</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>Amount</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Reason</th>
                    <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map(r => (
                     <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{new Date(r.date).toLocaleDateString()}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.id}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.partyName || r.referenceId || '-'}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.returnType}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{getProductName(r.productId)} (ID: {r.productId})</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center', verticalAlign: 'top'}}>{r.quantity}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', verticalAlign: 'top'}}>&#2547;{money(r.rate)}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold'}}>&#2547;{money(lineAmount(r))}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.reason}</td>
                       <td style={{border: '1px solid #ccc', padding: '0.4rem', verticalAlign: 'top'}}>{r.notes || '-'}</td>
                     </tr>
                  ))}
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <td colSpan={5} style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>
                      Total ({filteredReturns.length} record{filteredReturns.length === 1 ? '' : 's'}):
                    </td>
                    <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>
                      {totalQty}
                    </td>
                    <td style={{border: '1px solid #ccc', padding: '0.4rem'}}></td>
                    <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>
                      &#2547;{money(totalValue)}
                    </td>
                    <td colSpan={2} style={{border: '1px solid #ccc', padding: '0.4rem'}}></td>
                  </tr>
                </tbody>
              </table>
              <PrintFooter />
            </div>
          </div>
        </section>
      )}

      {/* Single Return Memo */}
      {selectedInvoice && createPortal(
        <div className="rt-modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="rt-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Return memo">
            <div className="rt-modal__head">
              <h2>Return Memo &middot; {selectedInvoice.id}</h2>
              <button type="button" className="rt-iconbtn" onClick={() => setSelectedInvoice(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="rt-modal__body">
              <div id="printable-single-return">
                <PrintableReturn
                  record={selectedInvoice}
                  product={inventory.find(i => i.id === selectedInvoice.productId)}
                />
              </div>
            </div>

            <div className="rt-modal__foot">
              <button type="button" className="rt-btn" onClick={() => setSelectedInvoice(null)}>Close</button>
              <button type="button" className="rt-btn rt-btn--primary" onClick={() => printElement('printable-single-return')}>
                <Printer size={16} /> Print Memo
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
