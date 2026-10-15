import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Wallet, X, CalendarDays } from 'lucide-react';
import useStore from '../store/useStore';
import './OrderProcess.css';

const money = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shiftDay = (iso, by) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + by);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const timeOf = (iso) => {
  const t = String(iso || '').slice(11, 16);
  return t || '';
};

/**
 * Order Process: one day's invoices at a glance - how much was billed, how
 * much came in, how much is still due - with one button to collect the
 * whole day's remaining due. Each invoice is paid in full on the server, so
 * the customer's due, their ledger and the invoice list all move with it.
 */
const OrderProcess = () => {
  const { sales = [], payDayInvoices, showToast } = useStore();
  const [day, setDay] = useState(today());
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // The invoice's own calendar day, as stored (the server keeps local time).
  const rows = sales
    .filter((s) => String(s.date || '').slice(0, 10) === day && s.status !== 'Cancelled')
    .map((s) => {
      const total = Number(s.total || 0);
      const paid = Number(s.paid_amount || 0);
      const due = s.due_amount !== undefined ? Number(s.due_amount) : Math.max(0, total - paid);
      return { ...s, total, paid, due };
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const totalBilled = rows.reduce((n, r) => n + r.total, 0);
  const totalPaid = rows.reduce((n, r) => n + r.paid, 0);
  const totalDue = rows.reduce((n, r) => n + r.due, 0);
  const dueRows = rows.filter((r) => r.due > 0);

  const isToday = day === today();
  const dayLabel = new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });

  const handlePay = async () => {
    setIsPaying(true);
    const result = await payDayInvoices(day, { paymentMethod: method, notes: note.trim() });
    setIsPaying(false);
    if (!result.success) {
      showToast(`Payment was not recorded: ${result.error}`, 'error');
      return;
    }
    const { count, total } = result.data || {};
    showToast(`Collected ৳${money(total)} on ${count} invoice${count === 1 ? '' : 's'}.`, 'success');
    setPayOpen(false);
    setNote('');
  };

  return (
    <div className="op-page">
      <header className="op-header">
        <div>
          <h1>Order Process</h1>
          <p>Every invoice of the day, what is still due on them, and one button to collect it.</p>
        </div>
      </header>

      {/* ------------------------------------------------------ day picker */}
      <section className="op-panel op-daybar">
        <button type="button" className="op-btn" onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day">
          <ChevronLeft size={16} />
        </button>
        <div className="op-field">
          <label htmlFor="op-day">Date</label>
          <input id="op-day" type="date" value={day} max={today()} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </div>
        <button type="button" className="op-btn" onClick={() => setDay(shiftDay(day, 1))} disabled={isToday} aria-label="Next day">
          <ChevronRight size={16} />
        </button>
        {!isToday && (
          <button type="button" className="op-btn" onClick={() => setDay(today())}>
            <CalendarDays size={15} /> Today
          </button>
        )}
        <span className="op-daylabel">{isToday ? 'Today · ' : ''}{dayLabel}</span>

        <button
          type="button"
          className="op-btn op-btn--primary op-paybtn"
          onClick={() => setPayOpen(true)}
          disabled={dueRows.length === 0}
          title={dueRows.length === 0 ? 'Nothing due on this day' : 'Collect every remaining due of this day'}
        >
          <Wallet size={16} /> Pay {dueRows.length > 0 ? `৳${money(totalDue)}` : ''}
        </button>
      </section>

      {/* -------------------------------------------------------- figures */}
      <div className="op-cards">
        <div className="op-card">
          <span>Invoices</span>
          <strong>{rows.length}</strong>
          <small>{dueRows.length} with due</small>
        </div>
        <div className="op-card">
          <span>Total Billed</span>
          <strong>&#2547;{money(totalBilled)}</strong>
        </div>
        <div className="op-card is-good">
          <span>Paid</span>
          <strong>&#2547;{money(totalPaid)}</strong>
        </div>
        <div className={`op-card ${totalDue > 0 ? 'is-bad' : 'is-good'}`}>
          <span>Due</span>
          <strong>&#2547;{money(totalDue)}</strong>
        </div>
      </div>

      {/* ---------------------------------------------------------- table */}
      <section className="op-panel">
        <div className="op-tablewrap">
          <table className="op-table">
            <thead>
              <tr>
                <th className="is-center op-sl">SL</th>
                <th>Invoice No</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Salesman</th>
                <th className="is-num">Items</th>
                <th className="is-num">Total</th>
                <th className="is-num">Paid</th>
                <th className="is-num">Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const status = r.due <= 0 ? 'paid' : r.paid > 0 ? 'partial' : 'due';
                return (
                  <tr key={r.id}>
                    <td className="is-center op-sl">{i + 1}</td>
                    <td className="is-code">{r.id}</td>
                    <td>{timeOf(r.date)}</td>
                    <td className="is-strong">{r.customerName || 'Walk-in Customer'}</td>
                    <td>{r.salesmanName || '-'}</td>
                    <td className="is-num">{(r.items || []).length}</td>
                    <td className="is-num is-strong">&#2547;{money(r.total)}</td>
                    <td className="is-num is-good">&#2547;{money(r.paid)}</td>
                    <td className={`is-num ${r.due > 0 ? 'is-bad' : ''}`}>&#2547;{money(r.due)}</td>
                    <td><span className={`op-badge op-badge--${status}`}>{status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Due'}</span></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan="10" className="op-empty">No invoices on {dayLabel}.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6}>Total of {rows.length} invoice{rows.length === 1 ? '' : 's'}</td>
                  <td className="is-num">&#2547;{money(totalBilled)}</td>
                  <td className="is-num">&#2547;{money(totalPaid)}</td>
                  <td className="is-num">&#2547;{money(totalDue)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ----------------------------------------------------- pay confirm */}
      {payOpen && createPortal(
        <div className="op-modal-overlay" onClick={() => !isPaying && setPayOpen(false)}>
          <div className="op-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Collect the day's due">
            <div className="op-modal__head">
              <h2>Collect all due &middot; {dayLabel}</h2>
              <button type="button" className="op-iconbtn" onClick={() => setPayOpen(false)} disabled={isPaying} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="op-modal__body">
              <div className="op-duebar">
                <div><span>Invoices with due</span><strong>{dueRows.length}</strong></div>
                <div><span>Amount to collect</span><strong>&#2547;{money(totalDue)}</strong></div>
              </div>

              <div className="op-tablewrap op-tablewrap--boxed">
                <table className="op-table op-table--compact">
                  <thead>
                    <tr><th>Invoice</th><th>Customer</th><th className="is-num">Due</th></tr>
                  </thead>
                  <tbody>
                    {dueRows.map((r) => (
                      <tr key={r.id}>
                        <td className="is-code">{r.id}</td>
                        <td>{r.customerName || 'Walk-in Customer'}</td>
                        <td className="is-num is-strong">&#2547;{money(r.due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="op-grid">
                <div className="op-field">
                  <label htmlFor="op-method">Method</label>
                  <select id="op-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="op-field op-field--grow">
                  <label htmlFor="op-note">Note</label>
                  <input id="op-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional, shown on each payment" />
                </div>
              </div>

              <p className="op-hint">
                Each invoice above is marked fully paid. The money comes off each customer&rsquo;s due and
                shows in their Account Ledger as a payment against that invoice. This cannot be undone from here.
              </p>
            </div>
            <div className="op-modal__foot">
              <button type="button" className="op-btn" onClick={() => setPayOpen(false)} disabled={isPaying}>Cancel</button>
              <button type="button" className="op-btn op-btn--primary" onClick={handlePay} disabled={isPaying}>
                <Wallet size={15} /> {isPaying ? 'Collecting…' : `Collect ৳${money(totalDue)}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OrderProcess;
