import React from 'react';
import InvoiceHeader from './InvoiceHeader';
import { buildLedgerBook, fmtLedgerDate, lakh } from '../utils/ledgerBook';

const cell = {
  border: '1px solid #000000',
  padding: '4px 6px',
  verticalAlign: 'middle',
  color: '#000000',
  fontSize: '0.82rem',
};

const num = {
  ...cell,
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

/**
 * The party ledger rendered in the exact accounting "Ledger Book" format
 * shown in the reference photo.
 */
const PrintableStatement = ({
  statement,
  kind,
  from = '',
  to = '',
  printedBy = '',
  itemsMap = null,
  showProducts = true,
}) => {
  if (!statement?.entity) return null;

  const isCustomer = kind === 'Customer';
  const e = statement.entity;
  const book = buildLedgerBook(statement, isCustomer, from, to, itemsMap);

  const firstDate = book.rows[0]?.date;
  const lastDate = book.rows[book.rows.length - 1]?.date;
  const periodFrom = from || firstDate || '';
  const periodTo = to || lastDate || new Date().toISOString().slice(0, 10);

  const now = new Date();
  const dayPart = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const stamp = `${dayPart} ${timePart}`;

  const partyName = e.name ? (e.company ? `${e.name}, ${e.company}` : `${e.name},`) : '';
  const partyLocation = e.location || '';

  return (
    <div
      className="printable-invoice-wrapper printable-ledger-wrapper"
      style={{
        padding: '1.25rem 1rem',
        background: '#ffffff',
        color: '#000000',
        fontFamily: "Arial, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        maxWidth: '760px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            body {
              background: #ffffff !important;
            }
            .printable-invoice-wrapper,
            .printable-ledger-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
            }
            thead {
              display: table-header-group;
            }
            tr {
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      {/* Invoice header with EHBL Logo and Shop Address */}
      <InvoiceHeader compact={true} />

      {/* Sub-header: Party info, Period, Ledger Title, Timestamp, Opening balance */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          marginTop: '6px',
          marginBottom: '10px',
        }}
      >
        {/* Left column: Party details and period */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: '1rem',
                textTransform: 'uppercase',
                color: '#000000',
                letterSpacing: '0.2px',
                lineHeight: 1.25,
              }}
            >
              {partyName}
            </div>
            {partyLocation && (
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textTransform: 'uppercase',
                  color: '#000000',
                  marginTop: '2px',
                  lineHeight: 1.25,
                }}
              >
                {partyLocation}
              </div>
            )}
            {e.phone && (
              <div style={{ fontSize: '0.82rem', color: '#222222', marginTop: '1px', fontWeight: 600 }}>
                Phone: {e.phone}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: '10px',
              fontWeight: 800,
              fontSize: '0.92rem',
              color: '#000000',
              letterSpacing: '0.3px',
            }}
          >
            PERIOD&nbsp; {fmtLedgerDate(periodFrom) || '-'} &nbsp;TO&nbsp; {fmtLedgerDate(periodTo)}
          </div>
        </div>

        {/* Right column: Timestamp, title, opening balance */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            textAlign: 'right',
            flexShrink: 0,
            alignSelf: 'stretch',
          }}
        >
          {/* Timestamp and printed user */}
          <div style={{ fontSize: '0.78rem', color: '#000000', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {stamp}{printedBy ? ` | ${printedBy.toUpperCase()}` : ''}
          </div>

          {/* LEDGER BOOK title */}
          <div
            style={{
              fontWeight: 900,
              fontSize: '1.25rem',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#000000',
              margin: '8px 0',
            }}
          >
            LEDGER BOOK
          </div>

          {/* Opening balance aligned horizontally with period */}
          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#000000', whiteSpace: 'nowrap' }}>
            Opening Balance (Tk.):&nbsp; <span style={{ fontSize: '1.08rem', fontWeight: 800 }}>{lakh(book.opening)}</span>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.82rem',
          border: '1px solid #000000',
          marginTop: '6px',
        }}
      >
        <thead>
          <tr>
            <th style={{ ...cell, width: '75px', textAlign: 'center', fontWeight: 700 }}>Date</th>
            <th style={{ ...cell, width: '82px', textAlign: 'center', fontWeight: 700 }}>Doc. No</th>
            <th style={{ ...cell, textAlign: 'center', fontWeight: 700 }}>Particulars</th>
            <th style={{ ...cell, width: '95px', textAlign: 'center', fontWeight: 700 }}>Debit (Tk.)</th>
            <th style={{ ...cell, width: '95px', textAlign: 'center', fontWeight: 700 }}>Credit (Tk.)</th>
            <th style={{ ...cell, width: '105px', textAlign: 'center', fontWeight: 700 }}>Balance (Tk.)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...cell, textAlign: 'center', whiteSpace: 'nowrap' }}>{from ? fmtLedgerDate(from) : ''}</td>
            <td style={cell} />
            <td style={{ ...cell, fontWeight: 800 }}>OPENING BALANCE{from ? ' B/F' : ''}</td>
            <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>{isCustomer ? lakh(book.opening) : lakh(0)}</td>
            <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>{isCustomer ? lakh(0) : lakh(book.opening)}</td>
            <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>{lakh(book.opening)}</td>
          </tr>
          {book.rows.map((r, idx) => (
            <tr key={`${r.id}-${idx}`}>
              <td style={{ ...cell, textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                {fmtLedgerDate(r.date)}
              </td>
              <td style={{ ...cell, textAlign: 'center', fontWeight: 600, wordBreak: 'break-word', verticalAlign: 'top' }}>
                {r.docNo || r.id}
              </td>
              <td style={{ ...cell, textAlign: 'left', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 800, textTransform: 'uppercase', color: '#000000', fontSize: '0.8rem' }}>
                  {r.particularsText || `${r.particulars?.head || ''} ${r.particulars?.detail || ''}`.trim()}
                </div>
                {showProducts && r.items && r.items.length > 0 && (
                  <div
                    style={{
                      marginTop: '4px',
                      paddingTop: '3px',
                      borderTop: '1px dashed #777777',
                      fontSize: '0.74rem',
                      color: '#111111',
                      lineHeight: 1.35,
                    }}
                  >
                    {r.items.map((it, idx2) => (
                      <div
                        key={idx2}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: '8px',
                          margin: '2px 0',
                        }}
                      >
                        <span>
                          &bull; <strong>{it.name}</strong>{it.variant ? ` (${it.variant})` : ''} &mdash; {it.quantity} {it.unit || 'pcs'} &times; {lakh(it.price)}
                        </span>
                        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {lakh(it.total || (it.quantity * it.price))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td style={{ ...num, verticalAlign: 'top' }}>{lakh(r.debit)}</td>
              <td style={{ ...num, verticalAlign: 'top' }}>{lakh(r.credit)}</td>
              <td style={{ ...num, verticalAlign: 'top' }}>{lakh(r.balance)}</td>
            </tr>
          ))}
          {book.rows.length === 0 && (
            <tr>
              <td colSpan="6" style={{ ...cell, textAlign: 'center', padding: '1.5rem', color: '#555555' }}>
                No transactions in this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Periodic Totals */}
      <div style={{ width: '100%', marginTop: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#000000' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'right', fontWeight: 800, padding: '3px 8px' }}>
                Periodic Total :
              </td>
              <td style={{ width: '95px', textAlign: 'right', fontWeight: 800, padding: '3px 6px', borderTop: '1px solid #000000', whiteSpace: 'nowrap' }}>
                {lakh(book.periodDebit)}
              </td>
              <td style={{ width: '95px', textAlign: 'right', fontWeight: 800, padding: '3px 6px', borderTop: '1px solid #000000', whiteSpace: 'nowrap' }}>
                {lakh(book.periodCredit)}
              </td>
              <td style={{ width: '105px' }} />
            </tr>
            <tr>
              <td style={{ textAlign: 'right', fontWeight: 800, padding: '3px 8px' }}>
                Periodic Balance :
              </td>
              <td style={{ width: '95px', textAlign: 'right', fontWeight: 800, padding: '3px 6px', borderTop: '1px solid #000000', whiteSpace: 'nowrap' }}>
                {lakh(book.periodBalance)}
              </td>
              <td style={{ width: '95px' }} />
              <td style={{ width: '105px' }} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Closing Total Box with thick outer border and dividers */}
      <div style={{ width: '100%', marginTop: '14px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.95rem',
            color: '#000000',
            border: '2px solid #000000',
          }}
        >
          <tbody>
            <tr>
              <td style={{ textAlign: 'right', fontWeight: 800, padding: '6px 12px', letterSpacing: '0.3px' }}>
                Total :
              </td>
              <td
                style={{
                  width: '95px',
                  textAlign: 'right',
                  fontWeight: 800,
                  padding: '6px',
                  borderLeft: '2px solid #000000',
                  whiteSpace: 'nowrap',
                }}
              >
                {lakh(book.totalDebit)}
              </td>
              <td
                style={{
                  width: '95px',
                  textAlign: 'right',
                  fontWeight: 800,
                  padding: '6px',
                  borderLeft: '2px solid #000000',
                  whiteSpace: 'nowrap',
                }}
              >
                {lakh(book.totalCredit)}
              </td>
              <td
                style={{
                  width: '105px',
                  textAlign: 'right',
                  fontWeight: 800,
                  padding: '6px',
                  borderLeft: '2px solid #000000',
                  whiteSpace: 'nowrap',
                }}
              >
                {lakh(book.closing)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintableStatement;
