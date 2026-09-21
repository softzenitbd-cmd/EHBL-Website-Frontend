import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, Wallet, X, RefreshCcw, Users, Truck, FileText, Receipt, BookOpen } from 'lucide-react';
import useStore from '../store/useStore';
import PrintablePayment from '../components/PrintablePayment';
import PrintableStatement from '../components/PrintableStatement';
import { printElement } from '../utils/printElement';
import './AccountLedger.css';

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const day = (d) => String(d || '').slice(0, 10);
const today = () => new Date().toISOString().split('T')[0];

/**
 * One party, the whole relationship: details, running statement, every
 * invoice or purchase with what is still owed on it, every payment with its
 * receipt - and the counter to take the next payment without leaving.
 */
const AccountLedger = () => {
  const {
    customers, suppliers,
    fetchLedgerStatement, settleCustomerDue, settleSupplierDue, showToast,
  } = useStore();

  const location = useLocation();
  const navigate = useNavigate();

  // Which side of the counter, and who. Both live in the URL so a link to a
  // party's ledger can be shared or bookmarked.
  const params = new URLSearchParams(location.search);
  const [kind, setKind] = useState(params.get('type') === 'Supplier' ? 'Supplier' : 'Customer');
  const [partyId, setPartyId] = useState(params.get('id') || '');
  // One box does the finding: type any part of a name, phone or code and
  // matches drop down underneath; pick one and the ledger loads.
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const comboRef = useRef(null);

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('statement');

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ date: today(), amount: '', method: 'Cash', note: '' });
  const [isPaying, setIsPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const isCustomer = kind === 'Customer';
  const parties = (isCustomer ? customers : suppliers) || [];

  const q = query.trim().toLowerCase();
  const matches = (q
    ? parties.filter(p => [p.name, p.phone, p.id, p.company].some(v => String(v || '').toLowerCase().includes(q)))
    : parties)
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    .slice(0, 12);

  // Clicking anywhere else closes the list.
  useEffect(() => {
    const onDown = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const load = useCallback(async (type, id) => {
    if (!id) { setStatement(null); return; }
    setLoading(true);
    const result = await fetchLedgerStatement(type, id);
    setLoading(false);
    if (!result.success) {
      showToast(result.error, 'error');
      setStatement(null);
      return;
    }
    setStatement(result.data);
  }, [fetchLedgerStatement, showToast]);

  useEffect(() => {
    load(kind, partyId);
  }, [kind, partyId, load]);

  useEffect(() => {
    if (!partyId) return;
    const p = parties.find(x => x.id === partyId);
    if (p && !query) setQuery(p.name || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, parties.length]);

  const choose = (type, id) => {
    setKind(type);
    setPartyId(id);
    const next = new URLSearchParams();
    next.set('type', type);
    if (id) next.set('id', id);
    navigate({ search: next.toString() }, { replace: true });
  };

  const switchKind = (type) => {
    if (type === kind) return;
    setQuery('');
    setOpen(false);
    setStatement(null);
    choose(type, '');
  };

  const pick = (p) => {
    setQuery(p.name || '');
    setOpen(false);
    setActiveIdx(0);
    choose(kind, p.id);
  };

  const onComboKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(matches.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[activeIdx]) pick(matches[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const entity = statement?.entity;
  const currentDue = Number(statement?.currentDue || 0);
  const documents = statement?.documents || [];
  const payments = statement?.payments || [];
  const ledger = statement?.ledger || [];
  const party = parties.find(p => p.id === partyId) || null;

  /** Unpaid documents oldest first - the order the server settles them in. */
  const outstanding = documents
    .filter(d => Number(d.due) > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const previewAllocation = (amount) => {
    let rem = Number(amount) || 0;
    const rows = [];
    for (const d of outstanding) {
      if (rem <= 0) break;
      const due = Number(d.due);
      const applied = Math.min(rem, due);
      rows.push({ id: d.id, date: day(d.date), total: Number(d.total), applied, remaining: due - applied });
      rem -= applied;
    }
    return { rows, unapplied: rem };
  };

  const openPay = () => {
    setPayForm({ date: today(), amount: '', method: 'Cash', note: '' });
    setPayOpen(true);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payForm.amount);
    if (!(amount > 0)) {
      showToast('Enter an amount greater than zero.', 'error');
      return;
    }
    if (amount > currentDue) {
      showToast(`Amount cannot exceed the outstanding due of ${money(currentDue)}.`, 'error');
      return;
    }

    setIsPaying(true);
    const settle = isCustomer ? settleCustomerDue : settleSupplierDue;
    const result = await settle(partyId, amount, payForm.date, {
      paymentMethod: payForm.method,
      notes: payForm.note.trim(),
    });
    setIsPaying(false);

    if (!result.success) {
      showToast(`${isCustomer ? 'Receipt' : 'Payment'} was not recorded: ${result.error}`, 'error');
      return;
    }

    showToast(`${result.data?.id || 'Payment'} recorded for ${entity?.name}.`, 'success');
    setPayOpen(false);
    setReceipt({ settlement: result.data, allocations: result.data?.allocations || [], party: entity });
    load(kind, partyId);
  };

  const reprint = (row) => {
    setReceipt({
      settlement: { ...row, type: kind, targetId: entity?.id, partyName: entity?.name },
      allocations: [],
      party: entity,
    });
  };

  const totalBilled = Number(statement?.totalBilled || 0);
  const totalPaid = Number(statement?.totalPaid || 0);

  return (
    <div className="ledger-page">
      <header className="lg-header">
        <div>
          <h1>Party Ledger</h1>
          <p>Pick a customer or supplier to see everything on their account, and settle it from here.</p>
        </div>
      </header>

      {/* ------------------------------------------------------ picker */}
      <section className="lg-panel lg-picker">
        <div className="lg-kind" role="tablist">
          <button type="button" role="tab" aria-selected={isCustomer} className={`lg-kind__btn ${isCustomer ? 'is-active' : ''}`} onClick={() => switchKind('Customer')}>
            <Users size={15} /> Customer
          </button>
          <button type="button" role="tab" aria-selected={!isCustomer} className={`lg-kind__btn ${!isCustomer ? 'is-active' : ''}`} onClick={() => switchKind('Supplier')}>
            <Truck size={15} /> Supplier
          </button>
        </div>

        <div className="lg-field lg-field--grow lg-combo" ref={comboRef}>
          <label htmlFor="lg-party">{kind}</label>
          <div className="lg-combo__box">
            <input
              id="lg-party"
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls="lg-party-list"
              aria-autocomplete="list"
              placeholder={`Type a ${kind.toLowerCase()} name or phone...`}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
              onFocus={() => setOpen(true)}
              onKeyDown={onComboKey}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="lg-combo__clear"
                aria-label="Clear"
                onClick={() => { setQuery(''); setOpen(true); choose(kind, ''); }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {open && (
            <ul id="lg-party-list" className="lg-combo__list" role="listbox">
              {matches.length === 0 && (
                <li className="lg-combo__empty">No {kind.toLowerCase()} matches &ldquo;{query}&rdquo;</li>
              )}
              {matches.map((p, i) => (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={p.id === partyId}
                  className={`lg-combo__item ${i === activeIdx ? 'is-active' : ''} ${p.id === partyId ? 'is-selected' : ''}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                >
                  <div className="lg-combo__main">
                    <strong>{p.name}</strong>
                    <span>{[p.phone, p.company].filter(Boolean).join(' · ') || p.id}</span>
                  </div>
                  <div className="lg-combo__side">
                    <span className="lg-code">{p.id}</span>
                    {Number(p.due) > 0 && <span className="lg-combo__due">due &#2547;{money(p.due)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className="lg-btn" onClick={() => load(kind, partyId)} disabled={!partyId || loading} title="Reload">
          <RefreshCcw size={15} /> {loading ? 'Loading' : 'Refresh'}
        </button>
      </section>

      {!partyId && (
        <div className="lg-panel lg-blank">
          Choose a {kind.toLowerCase()} above. You will see their details, the running statement,
          every {isCustomer ? 'invoice' : 'purchase'} with what is still owed on it, and every payment.
        </div>
      )}

      {partyId && !statement && !loading && (
        <div className="lg-panel lg-blank">Nothing loaded for this {kind.toLowerCase()}.</div>
      )}

      {entity && (
        <>
          {/* --------------------------------------------- party card */}
          <section className="lg-panel lg-party">
            <div className="lg-party__who">
              <div className="lg-party__name">
                <h2>{entity.name}</h2>
                <span className="lg-code">{entity.id}</span>
              </div>
              <dl className="lg-party__meta">
                {entity.phone && (<div><dt>Phone</dt><dd>{entity.phone}</dd></div>)}
                {entity.company && (<div><dt>Company</dt><dd>{entity.company}</dd></div>)}
                {(entity.location || party?.location) && (<div><dt>Address</dt><dd>{entity.location || party?.location}</dd></div>)}
                {party?.notes && (<div><dt>Notes</dt><dd>{party.notes}</dd></div>)}
              </dl>
            </div>

            <dl className="lg-figures">
              <div>
                <dt>Total {isCustomer ? 'Billed' : 'Purchased'}</dt>
                <dd>&#2547;{money(totalBilled)}</dd>
              </div>
              <div>
                <dt>Total {isCustomer ? 'Received' : 'Paid'}</dt>
                <dd className="is-good">&#2547;{money(totalPaid)}</dd>
              </div>
              <div>
                <dt>Opening Due</dt>
                <dd>&#2547;{money(entity.openingDue)}</dd>
              </div>
              <div className="is-due">
                <dt>Current Due</dt>
                <dd className={currentDue > 0 ? 'is-bad' : 'is-good'}>&#2547;{money(currentDue)}</dd>
              </div>
            </dl>

            <div className="lg-party__actions">
              <button type="button" className="lg-btn lg-btn--primary" onClick={openPay} disabled={!(currentDue > 0)}>
                <Wallet size={15} /> {isCustomer ? 'Receive Payment' : 'Pay Supplier'}
              </button>
              <button type="button" className="lg-btn" onClick={() => printElement('printable-party-statement')}>
                <Printer size={15} /> Print Statement
              </button>
            </div>
          </section>

          {/* ---------------------------------------------------- tabs */}
          <nav className="lg-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={activeTab === 'statement'} className={`lg-tab ${activeTab === 'statement' ? 'is-active' : ''}`} onClick={() => setActiveTab('statement')}>
              <BookOpen size={14} /> Statement <span className="lg-tab__count">{ledger.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'documents'} className={`lg-tab ${activeTab === 'documents' ? 'is-active' : ''}`} onClick={() => setActiveTab('documents')}>
              <FileText size={14} /> {isCustomer ? 'Invoices' : 'Purchases'} <span className="lg-tab__count">{documents.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'payments'} className={`lg-tab ${activeTab === 'payments' ? 'is-active' : ''}`} onClick={() => setActiveTab('payments')}>
              <Receipt size={14} /> Payments <span className="lg-tab__count">{payments.length}</span>
            </button>
          </nav>

          {activeTab === 'statement' && (
            <section className="lg-panel">
              <div className="lg-tablewrap">
                <table className="lg-table">
                  <thead>
                    <tr>
                      <th className="is-center lg-sl">SL</th>
                      <th>Date</th>
                      <th>Ref</th>
                      <th>Description</th>
                      <th className="is-num">{isCustomer ? 'Sale' : 'Purchase'}</th>
                      <th className="is-num">{isCustomer ? 'Received' : 'Paid'}</th>
                      <th className="is-num">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="lg-opening">
                      <td />
                      <td colSpan={3}>Opening balance</td>
                      <td /><td />
                      <td className="is-num">&#2547;{money(entity.openingDue)}</td>
                    </tr>
                    {ledger.map((r, idx) => (
                      <tr key={`${r.id}-${idx}`}>
                        <td className="is-center lg-sl">{idx + 1}</td>
                        <td>{day(r.date)}</td>
                        <td className="is-code">{r.id}</td>
                        <td>{r.description}</td>
                        <td className="is-num">{r.type === 'charge' ? `৳${money(r.amount)}` : ''}</td>
                        <td className="is-num is-good">{r.type === 'payment' ? `৳${money(r.amount)}` : ''}</td>
                        <td className="is-num is-strong">&#2547;{money(r.balance)}</td>
                      </tr>
                    ))}
                    {ledger.length === 0 && (
                      <tr><td colSpan="7" className="lg-empty">No charges or payments on this account yet.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6}>Current due</td>
                      <td className={`is-num ${currentDue > 0 ? 'is-bad' : 'is-good'}`}>&#2547;{money(currentDue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'documents' && (
            <section className="lg-panel">
              <div className="lg-tablewrap">
                <table className="lg-table">
                  <thead>
                    <tr>
                      <th className="is-center lg-sl">SL</th>
                      <th>Date</th>
                      <th>{isCustomer ? 'Invoice No' : 'Purchase No'}</th>
                      <th className="is-num">Items</th>
                      <th>Payment</th>
                      <th className="is-num">Total</th>
                      <th className="is-num">Paid</th>
                      <th className="is-num">Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d, idx) => (
                      <tr key={d.id}>
                        <td className="is-center lg-sl">{idx + 1}</td>
                        <td>{day(d.date)}</td>
                        <td className="is-code">{d.id}</td>
                        <td className="is-num">{d.items}</td>
                        <td>{d.paymentType}</td>
                        <td className="is-num is-strong">&#2547;{money(d.total)}</td>
                        <td className="is-num is-good">&#2547;{money(d.paid)}</td>
                        <td className={`is-num ${Number(d.due) > 0 ? 'is-bad' : ''}`}>&#2547;{money(d.due)}</td>
                        <td><span className={`lg-badge lg-badge--${d.status.toLowerCase()}`}>{d.status}</span></td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr><td colSpan="9" className="lg-empty">No {isCustomer ? 'invoices' : 'purchases'} on file.</td></tr>
                    )}
                  </tbody>
                  {documents.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={5}>Total of {documents.length} {isCustomer ? 'invoice' : 'purchase'}{documents.length === 1 ? '' : 's'}</td>
                        <td className="is-num">&#2547;{money(documents.reduce((n, d) => n + Number(d.total), 0))}</td>
                        <td className="is-num">&#2547;{money(documents.reduce((n, d) => n + Number(d.paid), 0))}</td>
                        <td className="is-num">&#2547;{money(documents.reduce((n, d) => n + Number(d.due), 0))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section className="lg-panel">
              <div className="lg-tablewrap">
                <table className="lg-table">
                  <thead>
                    <tr>
                      <th className="is-center lg-sl">SL</th>
                      <th>Date</th>
                      <th>Receipt No</th>
                      <th>Method</th>
                      <th className="is-num">Amount</th>
                      <th className="is-num">Due Before</th>
                      <th className="is-num">Due After</th>
                      <th>Note</th>
                      <th className="is-center">&nbsp;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, idx) => (
                      <tr key={p.id}>
                        <td className="is-center lg-sl">{idx + 1}</td>
                        <td>{day(p.date)}</td>
                        <td className="is-code">{p.id}</td>
                        <td>{p.paymentMethod}</td>
                        <td className="is-num is-strong is-good">&#2547;{money(p.amount)}</td>
                        <td className="is-num">&#2547;{money(p.previousDue)}</td>
                        <td className="is-num">&#2547;{money(p.remainingDue)}</td>
                        <td className="lg-note" title={p.notes}>{p.notes || '-'}</td>
                        <td className="is-center">
                          <button type="button" className="lg-iconbtn" title="Print receipt" onClick={() => reprint(p)}>
                            <Printer size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan="9" className="lg-empty">No payments recorded yet.</td></tr>
                    )}
                  </tbody>
                  {payments.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={4}>Total of {payments.length} payment{payments.length === 1 ? '' : 's'}</td>
                        <td className="is-num">&#2547;{money(payments.reduce((n, p) => n + Number(p.amount), 0))}</td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          )}

          {/* Printable statement (hidden on screen) */}
          <div style={{ display: 'none' }}>
            <div id="printable-party-statement">
              <PrintableStatement statement={statement} kind={kind} />
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------- pay modal */}
      {payOpen && entity && createPortal(
        <div className="lg-modal-overlay" onClick={() => setPayOpen(false)}>
          <div className="lg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={isCustomer ? 'Receive payment' : 'Pay supplier'}>
            <div className="lg-modal__head">
              <h2>{isCustomer ? 'Receive Payment' : 'Pay Supplier'} &middot; {entity.name}</h2>
              <button type="button" className="lg-iconbtn" onClick={() => setPayOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="lg-modal__body">
              <div className="lg-duebar">
                <div><span>Outstanding Due</span><strong>&#2547;{money(currentDue)}</strong></div>
                <div><span>Unpaid {isCustomer ? 'Invoices' : 'Vouchers'}</span><strong>{outstanding.length}</strong></div>
              </div>

              <form id="lg-pay-form" onSubmit={handlePay}>
                <div className="lg-grid">
                  <div className="lg-field">
                    <label htmlFor="lg-pay-date">Date</label>
                    <input id="lg-pay-date" type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} required />
                  </div>
                  <div className="lg-field">
                    <label htmlFor="lg-pay-amount">Amount <span className="lg-req">*</span></label>
                    <div className="lg-amountrow">
                      <input
                        id="lg-pay-amount" type="number" min="0" step="0.01" placeholder="0.00"
                        value={payForm.amount}
                        onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                        required autoFocus
                      />
                      <button type="button" className="lg-btn" onClick={() => setPayForm({ ...payForm, amount: String(currentDue) })}>Full</button>
                    </div>
                  </div>
                  <div className="lg-field">
                    <label htmlFor="lg-pay-method">Method</label>
                    <select id="lg-pay-method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                      <option value="Cash">Cash</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="lg-field lg-col-full">
                    <label htmlFor="lg-pay-note">Note</label>
                    <input id="lg-pay-note" type="text" placeholder="e.g. cheque no., who handed it over" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
                  </div>
                </div>
              </form>

              <h3 className="lg-subhead">This {isCustomer ? 'receipt' : 'payment'} will settle</h3>
              {(() => {
                const preview = previewAllocation(payForm.amount);
                if (!(Number(payForm.amount) > 0)) {
                  return <p className="lg-hint">Enter an amount to see which {isCustomer ? 'invoices' : 'vouchers'} it clears, oldest first.</p>;
                }
                if (preview.rows.length === 0) {
                  return <p className="lg-hint">No unpaid {isCustomer ? 'invoices' : 'vouchers'} on file &mdash; it will reduce the opening balance only.</p>;
                }
                return (
                  <>
                    <div className="lg-tablewrap">
                      <table className="lg-table lg-table--compact">
                        <thead>
                          <tr>
                            <th>{isCustomer ? 'Invoice' : 'Purchase'}</th>
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
                      <p className="lg-hint">&#2547;{money(preview.unapplied)} goes against the opening balance rather than a document.</p>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="lg-modal__foot">
              <span className="lg-foot-note">
                Due after: <strong>&#2547;{money(Math.max(0, currentDue - (parseFloat(payForm.amount) || 0)))}</strong>
              </span>
              <button type="button" className="lg-btn" onClick={() => setPayOpen(false)}>Cancel</button>
              <button type="submit" form="lg-pay-form" className="lg-btn lg-btn--primary" disabled={isPaying}>
                <Wallet size={15} /> {isPaying ? 'Saving...' : (isCustomer ? 'Record Receipt' : 'Record Payment')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ---------------------------------------------- receipt modal */}
      {receipt && createPortal(
        <div className="lg-modal-overlay" onClick={() => setReceipt(null)}>
          <div className="lg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Receipt">
            <div className="lg-modal__head">
              <h2>{isCustomer ? 'Money Receipt' : 'Payment Voucher'} &middot; {receipt.settlement?.id}</h2>
              <button type="button" className="lg-iconbtn" onClick={() => setReceipt(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="lg-modal__body lg-modal__body--paper">
              <div id="printable-party-receipt">
                <PrintablePayment settlement={receipt.settlement} party={receipt.party} allocations={receipt.allocations} />
              </div>
            </div>
            <div className="lg-modal__foot">
              <button type="button" className="lg-btn" onClick={() => setReceipt(null)}>Close</button>
              <button type="button" className="lg-btn lg-btn--primary" onClick={() => printElement('printable-party-receipt')}>
                <Printer size={15} /> Print
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountLedger;
