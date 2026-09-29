/**
 * Turns a party statement into a "ledger book" for a period, the way the
 * shop's accounting printouts read: an opening balance carried in from before
 * the period, each entry with Debit / Credit and a running balance, the
 * period's totals, and a closing total line.
 *
 * Customer (receivable): a sale is a Debit, money received is a Credit, and
 * the balance is what the customer owes.
 * Supplier (payable): a purchase is a Credit, money paid is a Debit, and the
 * balance is what the shop owes the supplier.
 */

const day = (d) => String(d || '').slice(0, 10);

/** Payment method out of a description like "Payment received (bKash)". */
const methodOf = (text) => {
  const m = /\(([^)]+)\)\s*$/.exec(String(text || ''));
  return m ? m[1] : 'Cash';
};

export const docNoFor = (row) => {
  if (!row?.id) return '';
  const idStr = String(row.id).trim();
  if (row.type === 'charge') {
    if (/^AJV/i.test(idStr)) return idStr;
    const clean = idStr.replace(/^INV-?/i, '');
    return clean ? `AJV ${clean}` : idStr;
  }
  if (row.type === 'payment') {
    if (/^MRV/i.test(idStr)) return idStr;
    const clean = idStr.replace(/^(STL|REC)-?/i, '');
    return clean ? `MRV ${clean}` : idStr;
  }
  return idStr;
};

export const particularsFor = (row, isCustomer) => {
  if (row.type === 'charge') {
    const billNo = row.invoice_number || row.id || '';
    const cleanBill = String(billNo).replace(/^INV-?/i, '');
    return isCustomer
      ? { head: 'FROM SALES INCOME', detail: `SALE- BILL NO-${cleanBill}` }
      : { head: 'TO PURCHASE', detail: `PURCHASE- BILL NO-${cleanBill}` };
  }
  if (row.type === 'return') {
    return { head: 'TO Sales Return', detail: 'SALE RETURN' };
  }
  const method = methodOf(row.description);
  const methodUpper = method.toUpperCase();
  const acct = methodUpper.includes('A/C') || methodUpper.includes('BANK')
    ? methodUpper
    : `${methodUpper} A/C`;

  const notePart = row.notes ? ` - ${row.notes}` : '';

  return isCustomer
    ? { head: `TO ${acct}${notePart}`, detail: '' }
    : { head: `BY ${acct}${notePart}`, detail: '' };
};

export const buildLedgerBook = (statement, isCustomer, from = '', to = '', itemsMap = null) => {
  const entries = statement?.ledger || [];
  const openingDue = Number(statement?.entity?.openingDue || 0);

  // Everything dated before the period rolls into the opening balance.
  let opening = openingDue;
  const inPeriod = [];
  for (const r of entries) {
    const d = day(r.date);
    const amt = Number(r.amount || 0);
    if (from && d < from) {
      opening += r.type === 'charge' ? amt : -amt;
      continue;
    }
    if (to && d > to) continue;
    inPeriod.push(r);
  }

  let balance = opening;
  const rows = inPeriod.map((r) => {
    const amt = Number(r.amount || 0);
    const raises = r.type === 'charge';
    balance += raises ? amt : -amt;
    // Customer: charges in Debit. Supplier: charges in Credit.
    const debit = isCustomer ? (raises ? amt : 0) : (raises ? 0 : amt);
    const credit = isCustomer ? (raises ? 0 : amt) : (raises ? amt : 0);
    const docNo = docNoFor(r);
    const particulars = particularsFor(r, isCustomer);
    const particularsText = [particulars.head, particulars.detail].filter(Boolean).join(' ');

    let items = Array.isArray(r.items) && r.items.length > 0 ? r.items : null;
    if (!items && itemsMap && r.type === 'charge') {
      const rawId = String(r.id || '').trim().toLowerCase();
      items = itemsMap.get(rawId)
        || itemsMap.get(rawId.replace(/^(inv|ajv|pur|mrv|doc)-?/i, ''))
        || itemsMap.get(`inv-${rawId}`)
        || itemsMap.get(`inv${rawId}`)
        || null;
    }

    return {
      ...r,
      date: day(r.date),
      docNo,
      debit,
      credit,
      balance,
      particulars,
      particularsText,
      items: items || [],
    };
  });

  const periodDebit = rows.reduce((n, r) => n + r.debit, 0);
  const periodCredit = rows.reduce((n, r) => n + r.credit, 0);

  // The opening balance sits on the side that raises the balance.
  const totalDebit = isCustomer ? opening + periodDebit : periodDebit;
  const totalCredit = isCustomer ? periodCredit : opening + periodCredit;

  return {
    opening,
    rows,
    periodDebit,
    periodCredit,
    periodBalance: isCustomer ? periodDebit - periodCredit : periodCredit - periodDebit,
    totalDebit,
    totalCredit,
    closing: balance,
  };
};

export const fmtLedgerDate = (d) => {
  if (!d) return '';
  const [y, m, dd] = day(d).split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : '';
};

/** Indian-style grouping (2,43,501.49), as the ledger printouts use. */
export const lakh = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
