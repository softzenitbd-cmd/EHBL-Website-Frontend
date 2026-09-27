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

export const particularsFor = (row, isCustomer) => {
  if (row.type === 'charge') {
    return isCustomer
      ? { head: 'FROM SALES INCOME', detail: `SALE - BILL NO-${row.id}` }
      : { head: 'TO PURCHASE', detail: `PURCHASE - BILL NO-${row.id}` };
  }
  const method = methodOf(row.description);
  return isCustomer
    ? { head: `BY ${method.toUpperCase()}`, detail: 'PAYMENT RECEIVED' }
    : { head: `TO ${method.toUpperCase()}`, detail: 'PAYMENT MADE' };
};

export const buildLedgerBook = (statement, isCustomer, from = '', to = '') => {
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
    return { ...r, date: day(r.date), debit, credit, balance, particulars: particularsFor(r, isCustomer) };
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
  const [y, m, dd] = day(d).split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : '';
};

/** Indian-style grouping (2,43,501.49), as the ledger printouts use. */
export const lakh = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
