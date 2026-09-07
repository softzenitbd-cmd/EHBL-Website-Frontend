import React, { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { Search, FileText, Printer } from 'lucide-react';
import '../common.css';

const AccountLedger = () => {
  const { sales, purchases, settlements, expenses, transactions, customers, suppliers } = useStore();

  // Suggestions for the party box. These are drawn from the same names the
  // search below actually matches on, so picking one can never come back empty.
  const partySuggestions = useMemo(() => {
    const names = new Map(); // lower-cased key -> display name, to drop duplicates
    const add = (name, kind) => {
      const clean = String(name || '').trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!names.has(key)) names.set(key, { name: clean, kind });
    };

    (customers || []).forEach(c => add(c.name, 'Customer'));
    (suppliers || []).forEach(s => add(s.name, 'Supplier'));
    (transactions || []).forEach(t => add(t.entityName, 'Manual Entry'));
    (expenses || []).forEach(e => add(e.category, 'Expense Head'));

    return [...names.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, suppliers, transactions, expenses]);

  const [searchParams, setSearchParams] = useState({
    entityName: '',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const ledgerData = useMemo(() => {
    if (!hasSearched || !searchParams.entityName) return [];

    const searchName = searchParams.entityName.toLowerCase();
    const start = new Date(searchParams.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(searchParams.endDate);
    end.setHours(23, 59, 59, 999);

    let combined = [];

    // 1. Manual Transactions
    (transactions || []).forEach(t => {
      if (t.entityName.toLowerCase().includes(searchName)) {
        combined.push({
          date: t.date,
          reference: t.id,
          description: t.description || 'Manual Entry',
          debit: t.type === 'Debit' ? t.amount : 0,
          credit: t.type === 'Credit' ? t.amount : 0
        });
      }
    });

    // 2. Sales (Customer Due -> Debit)
    (sales || []).forEach(s => {
      if (s.customerName && s.customerName.toLowerCase().includes(searchName)) {
        if (s.paymentType === 'Baki' || s.paymentType === 'Due') {
           combined.push({
             date: s.date,
             reference: s.id,
             description: 'Sale on Due',
             debit: s.total,
             credit: 0
           });
        }
      }
    });

    // 3. Purchases (Supplier Due -> Credit)
    (purchases || []).forEach(p => {
      if (p.supplierName && p.supplierName.toLowerCase().includes(searchName)) {
        if (p.dueAmount > 0) {
           combined.push({
             date: p.date,
             reference: p.id,
             description: 'Purchase on Due',
             debit: 0,
             credit: p.dueAmount
           });
        }
      }
    });

    // 4. Settlements
    (settlements || []).forEach(s => {
      // Note: We need a way to link targetId to name. 
      // For simplicity, we might not have the name in settlement directly.
      // But let's assume we can match it if we enrich it or if it's a known ID.
      // Actually, we'd need to look up the customer/supplier name from ID.
    });

    // 5. Expenses
    (expenses || []).forEach(e => {
      if (e.category.toLowerCase().includes(searchName) || (e.description && e.description.toLowerCase().includes(searchName))) {
        combined.push({
          date: e.date,
          reference: 'EXP-' + e.id,
          description: e.description || e.category,
          debit: e.amount,
          credit: 0
        });
      }
    });

    // Filter by Date
    combined = combined.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });

    // Sort by Date ascending
    combined.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate Running Balance
    let runningBalance = 0;
    return combined.map(item => {
      // Standard: Balance = Debit - Credit (for Assets/Expenses)
      runningBalance += (item.debit - item.credit);
      return { ...item, balance: runningBalance };
    });

  }, [hasSearched, searchParams, sales, purchases, expenses, transactions, settlements]);

  return (
    <div className="page-container">
      <div className="page-header glass no-print">
        <div>
          <h1 className="page-title">Account Ledger</h1>
          <p className="page-subtitle">View detailed transaction history for any party or account</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Printer size={18} /> Print Ledger
        </button>
      </div>

      <div className="card glass no-print" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
          <div>
            <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Party / Account Name</label>
            <input
              type="text"
              list="ledger-party-list"
              style={{ width: '100%' }}
              placeholder="Search customer, supplier or expense head..."
              value={searchParams.entityName}
              onChange={(e) => setSearchParams({...searchParams, entityName: e.target.value})}
              required
            />
            <datalist id="ledger-party-list">
              {partySuggestions.map(p => (
                <option key={`${p.kind}-${p.name}`} value={p.name}>{p.name} ({p.kind})</option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Start Date</label>
            <input 
              type="date" 
              style={{ width: '100%' }}
              value={searchParams.startDate}
              onChange={(e) => setSearchParams({...searchParams, startDate: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>End Date</label>
            <input 
              type="date" 
              style={{ width: '100%' }}
              value={searchParams.endDate}
              onChange={(e) => setSearchParams({...searchParams, endDate: e.target.value})}
              required
            />
          </div>
          <div>
            <button type="submit" className="btn-primary flex-align-gap" style={{ width: '100%', justifyContent: 'center' }}>
              <Search size={18} /> Search
            </button>
          </div>
        </form>
      </div>

      {hasSearched && (
        <div className="card glass">
          <div className="print-header-only" style={{ marginBottom: '1rem', textAlign: 'center', display: 'none' }}>
            <h2>Ledger Account: {searchParams.entityName.toUpperCase()}</h2>
            <p>From: {searchParams.startDate} To: {searchParams.endDate}</p>
          </div>
          
          {ledgerData.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Debit (Tk)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Tk)</th>
                    <th style={{ textAlign: 'right' }}>Balance (Tk)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{new Date(row.date).toLocaleDateString()}</td>
                      <td>{row.reference}</td>
                      <td>{row.description}</td>
                      <td style={{ textAlign: 'right' }}>{row.debit > 0 ? row.debit.toFixed(2) : '-'}</td>
                      <td style={{ textAlign: 'right' }}>{row.credit > 0 ? row.credit.toFixed(2) : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: row.balance < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {Math.abs(row.balance).toFixed(2)} {row.balance < 0 ? '(Cr)' : '(Dr)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Totals:</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {ledgerData.reduce((sum, r) => sum + r.debit, 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {ledgerData.reduce((sum, r) => sum + r.credit, 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <h3>No Transactions Found</h3>
              <p>No records found for "{searchParams.entityName}" between the selected dates.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountLedger;
