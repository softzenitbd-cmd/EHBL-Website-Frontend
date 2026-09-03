import React, { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { Search, Package, Printer } from 'lucide-react';
import '../common.css';

const StockLedger = () => {
  const { inventory, sales, purchases, returns, srSettlements } = useStore();
  
  const [searchParams, setSearchParams] = useState({
    itemName: '',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const stockData = useMemo(() => {
    if (!hasSearched || !searchParams.itemName) return [];

    const searchName = searchParams.itemName.toLowerCase();
    const start = new Date(searchParams.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(searchParams.endDate);
    end.setHours(23, 59, 59, 999);

    let combined = [];

    // Match inventory item to get current stock (optional reference)
    // 1. Purchases (IN)
    (purchases || []).forEach(p => {
      p.items.forEach(item => {
        if (item.name && item.name.toLowerCase().includes(searchName)) {
          combined.push({
            date: p.date,
            reference: p.id,
            description: `Purchase from ${p.supplierName}`,
            inQty: item.quantity,
            outQty: 0
          });
        }
      });
    });

    // 2. Sales (OUT)
    (sales || []).forEach(s => {
      s.items.forEach(item => {
        if (item.name && item.name.toLowerCase().includes(searchName)) {
          combined.push({
            date: s.date,
            reference: s.id,
            description: `Sale to ${s.customerName}`,
            inQty: 0,
            outQty: item.quantity
          });
        }
      });
    });

    // 3. Returns
    (returns || []).forEach(r => {
      const invItem = inventory.find(i => String(i.id) === String(r.productId));
      if (invItem && invItem.name.toLowerCase().includes(searchName)) {
        if (r.returnType === 'Customer') {
          // Customer returned to us -> IN
          combined.push({
            date: r.date,
            reference: r.id,
            description: 'Customer Return',
            inQty: r.quantity,
            outQty: 0
          });
        } else {
          // We returned to supplier -> OUT
          combined.push({
            date: r.date,
            reference: r.id,
            description: 'Supplier Return',
            inQty: 0,
            outQty: r.quantity
          });
        }
      }
    });

    // 4. SR Settlements (Issued OUT, Returned IN)
    (srSettlements || []).forEach(sr => {
      // Out on date
      sr.items.forEach(item => {
        if (item.name && item.name.toLowerCase().includes(searchName)) {
          // Assuming it was issued on sr.date
          combined.push({
            date: sr.date,
            reference: sr.id,
            description: `Issued to SR: ${sr.salesmanName}`,
            inQty: 0,
            outQty: item.quantity
          });
        }
      });
      // In on return
      if (sr.returnItems) {
        sr.returnItems.forEach(item => {
           const srItem = sr.items.find(i => String(i.productId) === String(item.productId));
           if (srItem && srItem.name && srItem.name.toLowerCase().includes(searchName) && item.returnQty > 0) {
             combined.push({
                date: sr.date, // might be settlement date ideally
                reference: sr.id + '-RET',
                description: `Return from SR: ${sr.salesmanName}`,
                inQty: item.returnQty,
                outQty: 0
             });
           }
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

    // Running stock tracking (Note: this starts from 0 for the selected period, 
    // unless we calculate opening stock from the beginning of time up to startDate.
    // For simplicity, we just show flow + running balance from start of period).
    let runningBalance = 0;
    return combined.map(item => {
      runningBalance += (item.inQty - item.outQty);
      return { ...item, balance: runningBalance };
    });

  }, [hasSearched, searchParams, sales, purchases, returns, srSettlements, inventory]);

  return (
    <div className="page-container">
      <div className="page-header glass no-print">
        <div>
          <h1 className="page-title">Stock Ledger</h1>
          <p className="page-subtitle">Track IN/OUT history of any product</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Printer size={18} /> Print Stock
        </button>
      </div>

      <div className="card glass no-print" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
          <div>
            <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Item / Product Name</label>
            <input 
              type="text" 
              style={{ width: '100%' }}
              placeholder="e.g. Drill, Brush..."
              value={searchParams.itemName}
              onChange={(e) => setSearchParams({...searchParams, itemName: e.target.value})}
              required
            />
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
            <h2>Stock Ledger: {searchParams.itemName.toUpperCase()}</h2>
            <p>From: {searchParams.startDate} To: {searchParams.endDate}</p>
          </div>
          
          {stockData.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>IN (Qty)</th>
                    <th style={{ textAlign: 'center' }}>OUT (Qty)</th>
                    <th style={{ textAlign: 'center' }}>Period Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{new Date(row.date).toLocaleDateString()}</td>
                      <td>{row.reference}</td>
                      <td>{row.description}</td>
                      <td style={{ textAlign: 'center', color: row.inQty > 0 ? 'var(--success)' : 'inherit' }}>
                        {row.inQty > 0 ? row.inQty : '-'}
                      </td>
                      <td style={{ textAlign: 'center', color: row.outQty > 0 ? 'var(--danger)' : 'inherit' }}>
                        {row.outQty > 0 ? row.outQty : '-'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {row.balance}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Totals:</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--success)' }}>
                      {stockData.reduce((sum, r) => sum + r.inQty, 0)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--danger)' }}>
                      {stockData.reduce((sum, r) => sum + r.outQty, 0)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      Net: {stockData.reduce((sum, r) => sum + r.inQty, 0) - stockData.reduce((sum, r) => sum + r.outQty, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Package size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <h3>No Stock Movements Found</h3>
              <p>No IN/OUT records found for "{searchParams.itemName}" between the selected dates.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockLedger;
