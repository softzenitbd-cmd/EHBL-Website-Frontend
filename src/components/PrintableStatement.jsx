import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import PrintFooter from './PrintFooter';
import { buildLedgerBook, fmtLedgerDate, lakh } from '../utils/ledgerBook';

const cell = { border: '1px solid #475569', padding: '4px 6px', verticalAlign: 'middle' };
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' };

/**
 * The party ledger as a printed "Ledger Book": company header, party name and
 * address, the period and its opening balance, one line per entry with Debit /
 * Credit / Balance, then the periodic totals and the closing total line.
 */
const PrintableStatement = ({ statement, kind, from = '', to = '', printedBy = '' }) => {
  if (!statement?.entity) return null;

  const isCustomer = kind === 'Customer';
  const e = statement.entity;
  const book = buildLedgerBook(statement, isCustomer, from, to);

  const firstDate = book.rows[0]?.date;
  const lastDate = book.rows[book.rows.length - 1]?.date;
  const periodFrom = from || firstDate || '';
  const periodTo = to || lastDate || new Date().toISOString().slice(0, 10);

  const now = new Date();
  const stamp = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} `
    + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="printable-invoice-wrapper" style={{ padding: '1.25rem', background: '#fff', color: '#0f172a', fontFamily: "'Times New Roman', Georgia, serif", maxWidth: '760px', margin: '0 auto', boxSizing: 'border-box' }}>
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
            body { background: #fff !important; }
            .printable-invoice-wrapper { width: 100% !important; max-width: 760px !important; margin: 0 auto !important; padding: 0 !important; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        `}
      </style>

      <InvoiceHeader />

      <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#334155', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
        {stamp}{printedBy ? ` | ${printedBy}` : ''}
      </div>

      {/* Party & book title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.35, textTransform: 'uppercase' }}>
          {e.name}{e.company ? `, ${e.company}` : ''}
          {(e.location || e.phone) && (
            <div style={{ fontSize: '0.9rem' }}>
              {[e.location, e.phone].filter(Boolean).join(' - ')}
            </div>
          )}
          <div style={{ fontSize: '0.78rem', fontWeight: 400, color: '#475569', textTransform: 'none' }}>
            {isCustomer ? 'Customer' : 'Supplier'} ID: {e.id}
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap' }}>LEDGER BOOK</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0.5rem 0 0.4rem 0' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          PERIOD&nbsp; {fmtLedgerDate(periodFrom) || '-'} &nbsp;TO&nbsp; {fmtLedgerDate(periodTo)}
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          Opening Balance (Tk.):&nbsp; <span style={{ fontSize: '1.1rem' }}>{lakh(book.opening)}</span>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            <th style={{ ...cell, width: '78px', textAlign: 'center' }}>Date</th>
            <th style={{ ...cell, width: '80px', textAlign: 'center' }}>Doc. No</th>
            <th style={{ ...cell, textAlign: 'center' }}>Particulars</th>
            <th style={{ ...cell, width: '100px', textAlign: 'center' }}>Debit (Tk.)</th>
            <th style={{ ...cell, width: '100px', textAlign: 'center' }}>Credit (Tk.)</th>
            <th style={{ ...cell, width: '108px', textAlign: 'center' }}>Balance (Tk.)</th>
          </tr>
        </thead>
        <tbody>
          {book.rows.map((r, idx) => (
            <tr key={`${r.id}-${idx}`}>
              <td style={{ ...cell, textAlign: 'center' }}>{fmtLedgerDate(r.date)}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{r.id}</td>
              <td style={cell}>
                <strong>{r.particulars.head}</strong> {r.particulars.detail}
              </td>
              <td style={num}>{lakh(r.debit)}</td>
              <td style={num}>{lakh(r.credit)}</td>
              <td style={num}>{lakh(r.balance)}</td>
            </tr>
          ))}
          {book.rows.length === 0 && (
            <tr><td colSpan="6" style={{ ...cell, textAlign: 'center', padding: '1rem', color: '#475569' }}>No transactions in this period.</td></tr>
          )}
        </tbody>
      </table>

      {/* Period totals */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginTop: '1.25rem' }}>
        <tbody>
          <tr>
            <td style={{ textAlign: 'right', fontWeight: 700, padding: '3px 8px' }}>Periodic Total :</td>
            <td style={{ width: '108px', textAlign: 'right', fontWeight: 700, padding: '3px 6px', borderTop: '1px solid #0f172a' }}>{lakh(book.periodDebit)}</td>
            <td style={{ width: '108px', textAlign: 'right', fontWeight: 700, padding: '3px 6px', borderTop: '1px solid #0f172a' }}>{lakh(book.periodCredit)}</td>
            <td style={{ width: '116px' }} />
          </tr>
          <tr>
            <td style={{ textAlign: 'right', fontWeight: 700, padding: '3px 8px' }}>Periodic Balance :</td>
            <td style={{ textAlign: 'right', fontWeight: 700, padding: '3px 6px', borderTop: '1px solid #0f172a' }}>{lakh(book.periodBalance)}</td>
            <td /><td />
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', marginTop: '1.25rem', border: '2px solid #0f172a' }}>
        <tbody>
          <tr>
            <td style={{ textAlign: 'right', fontWeight: 700, padding: '6px 8px' }}>Total :</td>
            <td style={{ width: '108px', textAlign: 'right', fontWeight: 700, padding: '6px', borderLeft: '2px solid #0f172a' }}>{lakh(book.totalDebit)}</td>
            <td style={{ width: '108px', textAlign: 'right', fontWeight: 700, padding: '6px', borderLeft: '2px solid #0f172a' }}>{lakh(book.totalCredit)}</td>
            <td style={{ width: '116px', textAlign: 'right', fontWeight: 700, padding: '6px', borderLeft: '2px solid #0f172a' }}>{lakh(book.closing)}</td>
          </tr>
        </tbody>
      </table>

      <PrintFooter />
    </div>
  );
};

export default PrintableStatement;
