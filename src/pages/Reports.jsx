import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, PieChart, TrendingUp, DollarSign, Users, Package, Calendar, Printer, Database, ShoppingCart, Eye, Plus, X, Gift, PackageSearch } from 'lucide-react';
import useStore from '../store/useStore';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';
import { printElement } from '../utils/printElement';
import './Reports.css';
import './ProductProfit.css';

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const Reports = () => {
  const [activeTab, setActiveTab] = useState('Sales');
  const [dateFilter, setDateFilter] = useState('Daily'); // Daily, Weekly, Monthly, Custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceType, setInvoiceType] = useState(''); // 'Sale' or 'Purchase'
  const { sales = [], inventory = [], purchases = [], expenses = [], customers = [], suppliers = [], staff = [], payrolls = [], returns = [], attendance = [], leaves = [], fetchAllData, loadDummyData } = useStore();

  React.useEffect(() => {
    if (fetchAllData) fetchAllData();
  }, []);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = today.toISOString().substring(0, 7);
  
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  // Helper to check if a date string falls within the selected filter
  const isWithinFilter = (dateStr) => {
    if (!dateStr) return false;
    const itemDateStr = dateStr.split('T')[0];
    
    if (dateFilter === 'Daily') {
      return itemDateStr === todayStr;
    } else if (dateFilter === 'Weekly') {
      const itemDate = new Date(itemDateStr);
      return itemDate >= lastWeek && itemDate <= today;
    } else if (dateFilter === 'Monthly') {
      return itemDateStr.startsWith(currentMonthStr);
    } else if (dateFilter === 'Custom') {
      if (!startDate && !endDate) return true;
      if (startDate && itemDateStr < startDate) return false;
      if (endDate && itemDateStr > endDate) return false;
      return true;
    }
    return true;
  };

  // 1. Sales Report Data
  const filteredSales = sales.filter(s => isWithinFilter(s.date));
  const totalSalesAmount = filteredSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  const totalInvoices = filteredSales.length;

  // 1.5 Purchase Report Data
  const filteredPurchases = purchases.filter(p => isWithinFilter(p.date));
  const totalPurchasesCost = filteredPurchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const totalPurchaseInvoices = filteredPurchases.length;

  // 2. Stock Report Data
  const stockData = inventory.map(item => {
    const stockInPurchases = purchases.reduce((acc, p) => {
      const pItem = p.items.find(i => i.name.toLowerCase() === item.name.toLowerCase());
      return acc + (pItem ? pItem.quantity : 0);
    }, 0);
    const stockInReturns = returns.filter(r => r.returnType === 'Customer' && r.productId === item.id).reduce((acc, r) => acc + r.quantity, 0);
    const totalIn = stockInPurchases + stockInReturns;

    const stockOutSales = sales.reduce((acc, s) => {
      const sItem = s.items.find(i => i.id === item.id);
      return acc + (sItem ? sItem.quantity : 0);
    }, 0);
    const stockOutReturns = returns.filter(r => r.returnType === 'Supplier' && r.productId === item.id).reduce((acc, r) => acc + r.quantity, 0);
    const totalOut = stockOutSales + stockOutReturns;

    return { ...item, totalIn, totalOut };
  });

  // 3. Profit & Loss Data
  const filteredExpenses = expenses.filter(e => isWithinFilter(e.date));
  const totalExpenseCost = filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalCost = totalPurchasesCost + totalExpenseCost;
  const netProfit = totalSalesAmount - totalCost;

    // Prepare Profit & Loss Detailed Ledger
  let currentBalance = 0;
  const profitLossDetails = [
    ...filteredSales.map(s => ({
      id: s.id || ('S_' + Math.random()),
      date: s.date,
      type: 'Sale (Revenue)',
      amount: parseFloat(s.total || s.grand_total || 0) || 0,
      isRevenue: true
    })),
    ...filteredPurchases.map(p => ({
      id: p.id || ('P_' + Math.random()),
      date: p.date,
      type: 'Purchase (Cost)',
      amount: parseFloat(p.total || p.total_amount || 0) || 0,
      isRevenue: false
    })),
    ...filteredExpenses.map(e => ({
      id: e.id || ('EXP_' + Math.random()),
      date: e.date,
      type: `Expense (${e.category || 'General'})`,
      amount: parseFloat(e.amount || 0) || 0,
      isRevenue: false
    }))
  ].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0)).map(item => {
    const numAmt = parseFloat(item.amount) || 0;
    if (item.isRevenue) {
      currentBalance += numAmt;
    } else {
      currentBalance -= numAmt;
    }
    return { 
      ...item, 
      amount: numAmt, 
      balance: Math.round(currentBalance * 100) / 100 
    };
  });

  // 4. Due Report Data
  const dueCustomers = customers.filter(c => c.due > 0);
  const dueSuppliers = suppliers.filter(s => s.due > 0);
  const totalCustomerDue = dueCustomers.reduce((acc, c) => acc + Number(c.due || 0), 0);
  const totalSupplierDue = dueSuppliers.reduce((acc, s) => acc + Number(s.due || 0), 0);

  // 5. Salesman-wise Report
  const salesmanData = {};
  filteredSales.forEach(s => {
    const sm = s.salesmanName || 'Unknown';
    if (!salesmanData[sm]) salesmanData[sm] = { count: 0, total: 0, sales: [] };
    salesmanData[sm].count += 1;
    salesmanData[sm].total += s.total;
    salesmanData[sm].sales.push(s);
  });

  // 6. Expense Report Data
  const expenseByCategory = {};
  filteredExpenses.forEach(e => {
    const cat = e.category || 'General';
    if (!expenseByCategory[cat]) expenseByCategory[cat] = 0;
    expenseByCategory[cat] += Number(e.amount || 0);
  });

  // 7. HR & Payroll Report Data
  const filteredPayrolls = payrolls.filter(p => isWithinFilter(p.paymentDate || p.month));
  const totalSalaryPaid = filteredPayrolls.reduce((acc, p) => acc + Number(p.netPay || 0), 0);
  const totalBonusPaid = filteredPayrolls.reduce((acc, p) => acc + Number(p.bonus || 0), 0);

  // ---------------------------------------------------------------------
  // Product-wise profit report
  //
  // Payment and due are recorded per invoice, never per line, so a product's
  // share of them is allocated pro rata by what that line was worth against
  // the whole invoice. Everything else here is read straight off the records.
  // ---------------------------------------------------------------------
  const [profitProductId, setProfitProductId] = useState('');
  const profitProduct = inventory.find((i) => i.id === profitProductId);

  // Not memoised: filteredSales is rebuilt on every render, so a useMemo here
  // would recompute anyway while pretending not to. The work is a few passes
  // over arrays already in memory.
  const productReport = (() => {
    if (!profitProduct) return null;

    const pid = profitProduct.id;
    const pname = String(profitProduct.name || '').toLowerCase();
    const matchesLine = (it) =>
      it.id === pid || String(it.name || '').toLowerCase() === pname;

    // --- one row per invoice line of this product, inside the date filter ---
    const rows = [];
    filteredSales.forEach((sale) => {
      const items = sale.items || [];
      // The invoice's own line total, used to work out this product's share of
      // whatever was paid against it.
      const invoiceLineTotal = items.reduce(
        (n, it) => n + Number(it.total_price ?? Number(it.price || 0) * Number(it.quantity || 0)),
        0
      );

      items.filter(matchesLine).forEach((it) => {
        const qty = Number(it.quantity || 0);
        const value = Number(it.total_price ?? Number(it.price || 0) * qty);
        const share = invoiceLineTotal > 0 ? value / invoiceLineTotal : 0;
        const paid = Number(sale.paid_amount || 0) * share;
        const due = Number(sale.due_amount || 0) * share;

        rows.push({
          invoiceId: sale.id,
          date: String(sale.date || '').split('T')[0],
          customerName: sale.customerName || sale.customer_name || 'Walk-in Customer',
          customerId: sale.customerId || '',
          phone: sale.customer_phone || sale.customerInfo?.phone || '',
          qty,
          rate: Number(it.price || 0),
          value,
          paid,
          due,
          isGift: !!it.isGift,
        });
      });
    });

    // --- customer returns of this product take sales back off ---
    const returnRows = returns
      .filter((r) => r.productId === pid && r.returnType === 'Customer' && isWithinFilter(r.date))
      .map((r) => ({
        id: r.id,
        date: String(r.date || '').split('T')[0],
        party: r.partyName || '-',
        qty: Number(r.quantity || 0),
        value: Number(r.rate || 0) * Number(r.quantity || 0),
      }));

    const soldQty = rows.reduce((n, r) => n + r.qty, 0);
    const salesValue = rows.reduce((n, r) => n + r.value, 0);
    const received = rows.reduce((n, r) => n + r.paid, 0);
    const due = rows.reduce((n, r) => n + r.due, 0);

    const returnedQty = returnRows.reduce((n, r) => n + r.qty, 0);
    const returnedValue = returnRows.reduce((n, r) => n + r.value, 0);

    const netQty = soldQty - returnedQty;
    const netRevenue = salesValue - returnedValue;

    // --- cost basis: what this product has actually been bought at ---
    // Averaged over every purchase line on file rather than the period's, since
    // goods sold this month were often bought last month. Falls back to the
    // product's own purchase rate when it has never been purchased through the
    // system (an opening-stock item).
    let purchasedQty = 0;
    let purchasedValue = 0;
    purchases.forEach((p) => {
      (p.items || []).forEach((it) => {
        if (String(it.name || '').toLowerCase() !== pname) return;
        const q = Number(it.quantity || 0);
        purchasedQty += q;
        purchasedValue += q * Number(it.price || 0);
      });
    });

    const avgCost = purchasedQty > 0
      ? purchasedValue / purchasedQty
      : Number(profitProduct.purchasePrice || profitProduct.cost_price || 0);
    const costBasis = purchasedQty > 0 ? 'Weighted average of purchases' : 'Product purchase rate';

    const totalCost = avgCost * netQty;
    const profit = netRevenue - totalCost;
    const margin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

    // --- one block per customer ---
    const byCustomer = new Map();
    rows.forEach((r) => {
      const key = r.customerName;
      if (!byCustomer.has(key)) {
        byCustomer.set(key, {
          name: key, phone: r.phone, invoices: new Set(),
          qty: 0, value: 0, paid: 0, due: 0,
        });
      }
      const c = byCustomer.get(key);
      c.invoices.add(r.invoiceId);
      c.qty += r.qty;
      c.value += r.value;
      c.paid += r.paid;
      c.due += r.due;
      if (!c.phone && r.phone) c.phone = r.phone;
    });

    const customerRows = [...byCustomer.values()]
      .map((c) => ({ ...c, invoiceCount: c.invoices.size }))
      .sort((a, b) => b.value - a.value);

    return {
      rows: rows.sort((a, b) => new Date(b.date) - new Date(a.date)),
      returnRows,
      customerRows,
      soldQty, salesValue, received, due,
      returnedQty, returnedValue,
      netQty, netRevenue,
      avgCost, costBasis, totalCost, profit, margin,
      invoiceCount: new Set(rows.map((r) => r.invoiceId)).size,
    };
  })();

  const TABS = [
    { id: 'Sales', label: 'Sales', icon: BarChart },
    { id: 'Purchases', label: 'Purchases', icon: ShoppingCart },
    { id: 'Stock', label: 'Stock', icon: Package },
    { id: 'ProfitLoss', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'ProductProfit', label: 'Product Profit', icon: PackageSearch },
    { id: 'Due', label: 'Due Report', icon: DollarSign },
    { id: 'Salesman', label: 'Salesman', icon: Users },
    { id: 'Expense', label: 'Expense', icon: PieChart },
    { id: 'HR', label: 'HR & Payroll', icon: Calendar },
    { id: 'Gifts', label: 'Gifts Given', icon: Gift },
  ];

  // 8. Gifts Data
  const giftItems = [];
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      if (item.isGift) {
        giftItems.push({
          date: sale.date,
          invoiceId: sale.id,
          customerName: sale.customerInfo?.name,
          customerPhone: sale.customerInfo?.phone,
          itemName: item.name,
          quantity: item.quantity,
          value: (item.price - (item.itemDiscount || 0)) * item.quantity
        });
      }
    });
  });
  const totalGiftValue = giftItems.reduce((acc, g) => acc + Number(g.value || 0), 0);

  return (
    <div className="reports-page" id="reports-page-container">
      <header className="rp-header rp-screen-only">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Sales, stock, dues and profit across whichever period you pick.</p>
        </div>

        <div className="rp-toolbar">
          <div className="rp-filter">
            <label htmlFor="rp-timeframe">Timeframe</label>
            <select id="rp-timeframe" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              <option value="Daily">Today</option>
              <option value="Weekly">Last 7 days</option>
              <option value="Monthly">This month</option>
              <option value="Custom">Custom range</option>
            </select>
          </div>

          {dateFilter === 'Custom' && (
            <>
              <div className="rp-filter">
                <label htmlFor="rp-from">From</label>
                <input id="rp-from" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="rp-filter">
                <label htmlFor="rp-to">To</label>
                <input id="rp-to" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          {sales.length === 0 && (
            <button type="button" className="rp-btn" onClick={() => { if (fetchAllData) fetchAllData(); else if (loadDummyData) loadDummyData(); }}>
              <Database size={16} /> Sync Live Data
            </button>
          )}
          <button type="button" className="rp-btn rp-btn--primary" onClick={() => window.print()}>
            <Printer size={16} /> Print Report
          </button>
        </div>
      </header>

      <nav className="rp-tabs rp-screen-only" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`rp-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </nav>

      {/* 1. Sales Report */}
      {activeTab === 'Sales' && (
        <div className="card glass">
          <h3>Sales Report ({dateFilter})</h3>
          <div className="grid responsive-grid-2 mt-4 mb-4">
             <div className="card bg-input text-center">
               <h4 className="text-muted">Total Revenue</h4>
               <p className="text-2xl text-primary font-bold">{totalSalesAmount.toLocaleString()}</p>
             </div>
             <div className="card bg-input text-center">
               <h4 className="text-muted">Invoices Generated</h4>
               <p className="text-2xl font-bold">{totalInvoices}</p>
             </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Invoice ID</th><th>Date</th><th>Customer</th><th>Items</th><th>Total Amount</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
              <tbody>
                {filteredSales.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td><td>{s.date.split('T')[0]}</td><td>{s.customerName}</td><td>{s.items.length}</td><td className="text-primary font-bold">{s.total.toLocaleString()}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => { setSelectedInvoice(s); setInvoiceType('Sale'); }}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No sales found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1.5 Purchase Report */}
      {activeTab === 'Purchases' && (
        <div className="card glass">
          <h3>Purchases Report ({dateFilter})</h3>
          <div className="grid responsive-grid-2 mt-4 mb-4">
             <div className="card bg-input text-center">
               <h4 className="text-muted">Total Purchase Cost</h4>
               <p className="text-2xl text-danger font-bold">{totalPurchasesCost.toLocaleString()}</p>
             </div>
             <div className="card bg-input text-center">
               <h4 className="text-muted">Invoices Generated</h4>
               <p className="text-2xl font-bold">{totalPurchaseInvoices}</p>
             </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Invoice ID</th><th>Date</th><th>Supplier</th><th>Items Qty</th><th>Total Amount</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
              <tbody>
                {filteredPurchases.map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td><td>{p.date.split('T')[0]}</td><td>{p.supplierName}</td><td>{p.items.reduce((acc, i) => acc + i.quantity, 0)}</td><td className="text-danger font-bold">{p.total.toLocaleString()}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => { setSelectedInvoice(p); setInvoiceType('Purchase'); }}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No purchases found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Stock Report */}
      {activeTab === 'Stock' && (
        <div className="card glass">
          <h3>Stock Report (Current Balance & History)</h3>
          <p className="text-muted text-sm mb-4">Stock In/Out is calculated from all-time Purchases, Sales, and Returns.</p>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Item Name</th><th>Category</th><th>All Time IN</th><th>All Time OUT</th><th>Current Stock</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
              <tbody>
                {stockData.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td className="text-success">+{item.totalIn}</td>
                    <td className="text-danger">-{item.totalOut}</td>
                    <td className="font-bold">{item.stock} {item.unit}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => { setSelectedInvoice(item); setInvoiceType('Stock'); }}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Profit & Loss Report */}
      {activeTab === 'ProfitLoss' && (
        <div className="card glass">
          <h3>Profit & Loss Report ({dateFilter})</h3>
          <div className="grid responsive-grid-3 mt-4 mb-4">
             <div className="card bg-input text-center">
               <h4 className="text-muted">Total Revenue</h4>
               <p className="text-2xl text-primary font-bold">{totalSalesAmount.toLocaleString()}</p>
             </div>
             <div className="card bg-input text-center">
               <h4 className="text-muted">Total Cost (Purchases + Expense)</h4>
               <p className="text-2xl text-danger font-bold">{totalCost.toLocaleString()}</p>
             </div>
             <div className="card bg-input text-center" style={{ border: `1px solid ${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
               <h4 className="text-muted">Net Profit</h4>
               <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{netProfit.toLocaleString()}</p>
             </div>
          </div>
          
          <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>Detailed Breakdown</h4>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Type</th>
                  <th style={{ textAlign: 'right' }}>Revenue (In)</th>
                  <th style={{ textAlign: 'right' }}>Cost (Out)</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {profitLossDetails.length > 0 ? (
                  profitLossDetails.map((item, idx) => (
                    <tr key={item.id + '_' + idx}>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: '500' }}>{item.type}</td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: item.isRevenue ? 'bold' : 'normal' }}>
                        {item.isRevenue ? `+৳${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: !item.isRevenue ? 'bold' : 'normal' }}>
                        {!item.isRevenue ? `-৳${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: item.balance >= 0 ? '#10b981' : '#ef4444' }}>
                        {item.balance >= 0 
                          ? `৳${Number(item.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                          : `-৳${Number(Math.abs(item.balance)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-muted" style={{ padding: '1.5rem' }}>No transactions found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Due Report */}
      {activeTab === 'Due' && (
        <div className="grid responsive-grid-2" style={{ gap: '1.5rem' }}>
          <div className="card glass">
            <h3 className="text-success mb-2">To Receive (Customer Due)</h3>
            <p className="text-2xl font-bold mb-4">{totalCustomerDue.toLocaleString()}</p>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Customer Name</th><th>Phone</th><th>Due Amount</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
                <tbody>
                  {dueCustomers.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.phone}</td><td className="text-warning font-bold">{c.due.toLocaleString()}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => { setSelectedInvoice(c); setInvoiceType('Customer Due'); }}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>)}
                  {dueCustomers.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No customer dues.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card glass">
            <h3 className="text-danger mb-2">To Pay (Supplier Due)</h3>
            <p className="text-2xl font-bold mb-4">{totalSupplierDue.toLocaleString()}</p>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Supplier Name</th><th>Phone</th><th>Due Amount</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
                <tbody>
                  {dueSuppliers.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.phone}</td><td className="text-danger font-bold">{s.due.toLocaleString()}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => { setSelectedInvoice(s); setInvoiceType('Supplier Due'); }}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>)}
                  {dueSuppliers.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No supplier dues.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Salesman-wise Report */}
      {activeTab === 'Salesman' && (
        <div className="card glass">
          <h3>Salesman-wise Report ({dateFilter})</h3>
          <div className="table-responsive mt-4">
            <table className="data-table">
              <thead><tr><th>Salesman Name</th><th>Invoices Handled</th><th>Total Sales Amount</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
              <tbody>
                {Object.keys(salesmanData).map(sm => (
                  <tr key={sm}>
                    <td>{sm}</td>
                    <td>{salesmanData[sm].count}</td>
                    <td className="text-primary font-bold">{salesmanData[sm].total.toLocaleString()}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => { setSelectedInvoice({ name: sm, ...salesmanData[sm] }); setInvoiceType('Salesman'); }}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>
                ))}
                {Object.keys(salesmanData).length === 0 && <tr><td colSpan="4" className="text-center text-muted">No sales data found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Expense Report */}
      {activeTab === 'Expense' && (
        <div className="card glass">
          <h3>Expense Report ({dateFilter})</h3>
          <p className="text-2xl text-danger font-bold mb-4 mt-2">Total: {totalExpenseCost.toLocaleString()}</p>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Category</th><th>Total Amount</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
              <tbody>
                {Object.keys(expenseByCategory).map(cat => (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td className="text-danger font-bold">{expenseByCategory[cat].toLocaleString()}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => { setSelectedInvoice({ category: cat, amount: expenseByCategory[cat] }); setInvoiceType('Expense'); }}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>
                ))}
                {Object.keys(expenseByCategory).length === 0 && <tr><td colSpan="3" className="text-center text-muted">No expenses found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. HR & Payroll Report */}
      {activeTab === 'HR' && (
        <div className="card glass">
          <h3>HR & Payroll Report ({dateFilter})</h3>
          <div className="grid responsive-grid-2 mt-4 mb-4">
             <div className="card bg-input text-center">
               <h4 className="text-muted">Total Salary Paid</h4>
               <p className="text-2xl text-warning font-bold">{totalSalaryPaid.toLocaleString()}</p>
             </div>
             <div className="card bg-input text-center">
               <h4 className="text-muted">Total Bonus Paid</h4>
               <p className="text-2xl text-success font-bold">{totalBonusPaid.toLocaleString()}</p>
             </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Staff ID</th><th>Month</th><th>Net Pay</th><th>Bonus</th><th>Payment Date</th><th style={{textAlign:'center'}}>Actions</th></tr></thead>
              <tbody>
                {filteredPayrolls.map(p => (
                  <tr key={p.id}>
                    <td>{p.staffName}</td>
                    <td>{p.month}</td>
                    <td className="font-bold">{p.netPay.toLocaleString()}</td>
                    <td>{p.bonus.toLocaleString()}</td>
                    <td>{p.paymentDate.split('T')[0]}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => { setSelectedInvoice(p); setInvoiceType('Payroll'); }}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>
                ))}
                {filteredPayrolls.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No payroll data found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. Gifts Report */}
      {activeTab === 'ProductProfit' && (
        <div className="pp-report">
          <div className="pp-panel">
            <div className="pp-panel__head">
              <h2>Product-wise Profit Report</h2>
              {productReport && (
                <button type="button" className="pp-btn pp-btn--primary" onClick={() => printElement('printable-product-profit')}>
                  <Printer size={16} /> Print
                </button>
              )}
            </div>

            <div className="pp-picker">
              <div className="pp-field">
                <label htmlFor="pp-product">Product</label>
                <select id="pp-product" value={profitProductId} onChange={(e) => setProfitProductId(e.target.value)}>
                  <option value="">Select a product...</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.variant ? ` (${item.variant})` : ''} &mdash; {item.id}
                    </option>
                  ))}
                </select>
              </div>
              {profitProduct && (
                <dl className="pp-meta">
                  <div><dt>Code</dt><dd>{profitProduct.id}</dd></div>
                  <div><dt>Category</dt><dd>{profitProduct.category || profitProduct.category_name || '-'}</dd></div>
                  <div><dt>In Stock</dt><dd>{profitProduct.stock} {profitProduct.unit || 'Pcs'}</dd></div>
                  <div><dt>Sale Rate</dt><dd>&#2547;{money(profitProduct.price)}</dd></div>
                </dl>
              )}
            </div>
          </div>

          {!profitProduct && (
            <div className="pp-panel pp-blank">
              Choose a product above to see what it sold, what was collected against it, and what it earned.
            </div>
          )}

          {productReport && (
            <>
              <div className="pp-cards">
                <div className="pp-card">
                  <span>Quantity Sold</span>
                  <strong>{productReport.soldQty}</strong>
                  <small>{productReport.invoiceCount} invoice{productReport.invoiceCount === 1 ? '' : 's'}</small>
                </div>
                <div className="pp-card">
                  <span>Total Sell</span>
                  <strong>&#2547;{money(productReport.salesValue)}</strong>
                  <small>before returns</small>
                </div>
                <div className="pp-card is-good">
                  <span>Payment Received</span>
                  <strong>&#2547;{money(productReport.received)}</strong>
                  <small>allocated share</small>
                </div>
                <div className="pp-card is-bad">
                  <span>Due</span>
                  <strong>&#2547;{money(productReport.due)}</strong>
                  <small>allocated share</small>
                </div>
                <div className={`pp-card ${productReport.profit >= 0 ? 'is-good' : 'is-bad'}`}>
                  <span>Gross Profit</span>
                  <strong>&#2547;{money(productReport.profit)}</strong>
                  <small>{productReport.margin.toFixed(1)}% margin</small>
                </div>
              </div>

              <div className="pp-panel">
                <div className="pp-panel__head"><h2>How the profit is worked out</h2></div>
                <table className="pp-table pp-calc">
                  <tbody>
                    <tr>
                      <td>Sales value ({productReport.soldQty} sold)</td>
                      <td className="is-num">&#2547;{money(productReport.salesValue)}</td>
                    </tr>
                    <tr>
                      <td>Less customer returns ({productReport.returnedQty} returned)</td>
                      <td className="is-num">&minus; &#2547;{money(productReport.returnedValue)}</td>
                    </tr>
                    <tr className="is-subtotal">
                      <td>Net revenue ({productReport.netQty} net)</td>
                      <td className="is-num">&#2547;{money(productReport.netRevenue)}</td>
                    </tr>
                    <tr>
                      <td>
                        Cost of goods sold &mdash; {productReport.netQty} &times; &#2547;{money(productReport.avgCost)}
                        <small className="pp-basis">{productReport.costBasis}</small>
                      </td>
                      <td className="is-num">&minus; &#2547;{money(productReport.totalCost)}</td>
                    </tr>
                    <tr className="is-total">
                      <td>Gross profit</td>
                      <td className="is-num">&#2547;{money(productReport.profit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pp-panel">
                <div className="pp-panel__head"><h2>Customers</h2></div>
                <div className="pp-tablewrap">
                  <table className="pp-table">
                    <thead>
                      <tr>
                        <th className="is-center pp-sl">SL</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th className="is-num">Invoices</th>
                        <th className="is-num">Qty</th>
                        <th className="is-num">Sell</th>
                        <th className="is-num">Received</th>
                        <th className="is-num">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productReport.customerRows.map((c, idx) => (
                        <tr key={c.name}>
                          <td className="is-center pp-sl">{idx + 1}</td>
                          <td className="is-strong">{c.name}</td>
                          <td>{c.phone || '-'}</td>
                          <td className="is-num">{c.invoiceCount}</td>
                          <td className="is-num">{c.qty}</td>
                          <td className="is-num">&#2547;{money(c.value)}</td>
                          <td className="is-num">&#2547;{money(c.paid)}</td>
                          <td className="is-num is-strong">&#2547;{money(c.due)}</td>
                        </tr>
                      ))}
                      {productReport.customerRows.length === 0 && (
                        <tr><td colSpan="8" className="pp-empty">This product was not sold in the selected period.</td></tr>
                      )}
                    </tbody>
                    {productReport.customerRows.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={4}>Total</td>
                          <td className="is-num">{productReport.soldQty}</td>
                          <td className="is-num">&#2547;{money(productReport.salesValue)}</td>
                          <td className="is-num">&#2547;{money(productReport.received)}</td>
                          <td className="is-num">&#2547;{money(productReport.due)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div className="pp-panel">
                <div className="pp-panel__head"><h2>Invoice lines</h2></div>
                <div className="pp-tablewrap">
                  <table className="pp-table">
                    <thead>
                      <tr>
                        <th className="is-center pp-sl">SL</th>
                        <th>Date</th>
                        <th>Invoice No</th>
                        <th>Customer</th>
                        <th className="is-num">Qty</th>
                        <th className="is-num">Rate</th>
                        <th className="is-num">Sell</th>
                        <th className="is-num">Received</th>
                        <th className="is-num">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productReport.rows.map((r, idx) => (
                        <tr key={`${r.invoiceId}-${idx}`}>
                          <td className="is-center pp-sl">{idx + 1}</td>
                          <td>{r.date}</td>
                          <td className="is-code">{r.invoiceId}</td>
                          <td>{r.customerName}{r.isGift && <span className="pp-gift">Gift</span>}</td>
                          <td className="is-num">{r.qty}</td>
                          <td className="is-num">&#2547;{money(r.rate)}</td>
                          <td className="is-num is-strong">&#2547;{money(r.value)}</td>
                          <td className="is-num">&#2547;{money(r.paid)}</td>
                          <td className="is-num">&#2547;{money(r.due)}</td>
                        </tr>
                      ))}
                      {productReport.rows.length === 0 && (
                        <tr><td colSpan="9" className="pp-empty">No sales of this product in the selected period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {productReport.returnRows.length > 0 && (
                <div className="pp-panel">
                  <div className="pp-panel__head"><h2>Customer returns</h2></div>
                  <div className="pp-tablewrap">
                    <table className="pp-table">
                      <thead>
                        <tr>
                          <th className="is-center pp-sl">SL</th>
                          <th>Date</th>
                          <th>Return No</th>
                          <th>Party</th>
                          <th className="is-num">Qty</th>
                          <th className="is-num">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productReport.returnRows.map((r, idx) => (
                          <tr key={r.id}>
                            <td className="is-center pp-sl">{idx + 1}</td>
                            <td>{r.date}</td>
                            <td className="is-code">{r.id}</td>
                            <td>{r.party}</td>
                            <td className="is-num">{r.qty}</td>
                            <td className="is-num is-strong">&#2547;{money(r.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="pp-note">
                Payment and due are recorded against the whole invoice, never a single line. The figures
                above are this product&rsquo;s share of each invoice, split by what its line was worth
                against that invoice&rsquo;s total.
              </p>

              {/* Printable version */}
              <div style={{ display: 'none' }}>
                <div id="printable-product-profit" style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
                  <InvoiceHeader />
                  <h3 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Product-wise Profit Report</h3>
                  <p style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {profitProduct.name}{profitProduct.variant ? ` (${profitProduct.variant})` : ''} &middot; Code {profitProduct.id}
                    <br />
                    Period: {dateFilter}{dateFilter === 'Custom' ? ` (${startDate || 'Any'} to ${endDate || 'Any'})` : ''}
                  </p>

                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Quantity Sold</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>{productReport.soldQty}</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Total Sell</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>&#2547;{money(productReport.salesValue)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Payment Received</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>&#2547;{money(productReport.received)}</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Due</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>&#2547;{money(productReport.due)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Returned ({productReport.returnedQty})</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>&#2547;{money(productReport.returnedValue)}</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Net Revenue</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>&#2547;{money(productReport.netRevenue)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Cost ({productReport.netQty} &times; &#2547;{money(productReport.avgCost)})</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right' }}>&#2547;{money(productReport.totalCost)}</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>Gross Profit</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right', fontWeight: 'bold' }}>
                          &#2547;{money(productReport.profit)} ({productReport.margin.toFixed(1)}%)
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 style={{ fontSize: '0.95rem', margin: '1rem 0 0.4rem 0' }}>Customers</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'center' }}>SL</th>
                        <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>Customer</th>
                        <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'left' }}>Phone</th>
                        <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'center' }}>Qty</th>
                        <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>Sell</th>
                        <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>Received</th>
                        <th style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productReport.customerRows.map((c, idx) => (
                        <tr key={c.name}>
                          <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #ccc', padding: '0.35rem' }}>{c.name}</td>
                          <td style={{ border: '1px solid #ccc', padding: '0.35rem' }}>{c.phone || '-'}</td>
                          <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'center' }}>{c.qty}</td>
                          <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>&#2547;{money(c.value)}</td>
                          <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>&#2547;{money(c.paid)}</td>
                          <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>&#2547;{money(c.due)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                        <td colSpan="3" style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>Total</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'center' }}>{productReport.soldQty}</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>&#2547;{money(productReport.salesValue)}</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>&#2547;{money(productReport.received)}</td>
                        <td style={{ border: '1px solid #ccc', padding: '0.35rem', textAlign: 'right' }}>&#2547;{money(productReport.due)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#475569' }}>
                    Payment and due are recorded against the whole invoice. The figures above are this
                    product&rsquo;s share, split by what its line was worth against each invoice total.
                  </p>
                  <PrintFooter />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'Gifts' && (
        <div className="card glass">
          <h3>Gifts Report ({dateFilter})</h3>
          <div className="grid responsive-grid-2 mt-4 mb-4">
             <div className="card bg-input text-center">
               <h4 className="text-muted">Total Gifts Given</h4>
               <p className="text-2xl font-bold">{giftItems.reduce((sum, item) => sum + item.quantity, 0)} Items</p>
             </div>
             <div className="card bg-input text-center">
               <h4 className="text-muted">Total Gift Value</h4>
               <p className="text-2xl text-primary font-bold">{totalGiftValue.toLocaleString()}</p>
             </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {giftItems.length > 0 ? giftItems.map((g, idx) => (
                  <tr key={idx}>
                    <td>{new Date(g.date).toLocaleDateString()}</td>
                    <td>{g.invoiceId}</td>
                    <td>
                      {g.customerName || 'N/A'}
                      {g.customerPhone && <><br/><small className="text-muted">{g.customerPhone}</small></>}
                    </td>
                    <td>{g.itemName}</td>
                    <td>{g.quantity}</td>
                    <td>{g.value.toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="text-center text-muted">No gifts found in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Drawer for Print */}
      {selectedInvoice && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Document Print</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedInvoice(null)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-single-invoice" style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
                 <InvoiceHeader />
                 <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem', color: '#555' }}>
                   {invoiceType} Document<br/>
                   {selectedInvoice.date && `Date: ${new Date(selectedInvoice.date).toLocaleString()}`}
                   {selectedInvoice.paymentDate && `Date: ${selectedInvoice.paymentDate.split('T')[0]}`}
                 </p>
                 <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                 
                 {(invoiceType === 'Sale' || invoiceType === 'Purchase') && (
                   <>
                     <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem', color: '#333' }}>
                       {selectedInvoice.customerName && <><strong>Customer:</strong> {selectedInvoice.customerName}<br/></>}
                       {selectedInvoice.supplierName && <><strong>Supplier:</strong> {selectedInvoice.supplierName}<br/></>}
                       <strong>Payment:</strong> {selectedInvoice.paymentType}
                     </div>
                     <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '1.5rem', color: '#000', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #eee' }}><th style={{textAlign: 'left', paddingBottom: '0.5rem'}}>Item</th><th style={{textAlign: 'right', paddingBottom: '0.5rem'}}>Total</th></tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '0.75rem 0' }}>{item.name} <br/> <small style={{ color: '#666' }}>{item.quantity} x {item.price}</small></td>
                              <td style={{textAlign: 'right', padding: '0.75rem 0'}}>{item.price * item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '1rem', color: '#000' }}>
                        <span>Total {invoiceType}:</span><span>{selectedInvoice.total}</span>
                     </div>
                   </>
                 )}

                 {invoiceType === 'Payroll' && (
                   <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '2' }}>
                     <p><strong>Staff Name:</strong> {selectedInvoice.staffName}</p>
                     <p><strong>Month:</strong> {selectedInvoice.month}</p>
                     <p><strong>Net Salary:</strong> {selectedInvoice.netPay.toLocaleString()}</p>
                     <p><strong>Bonus:</strong> {selectedInvoice.bonus.toLocaleString()}</p>
                     <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                     <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '1rem', color: '#000' }}><strong>Total Paid:</strong> {(selectedInvoice.netPay + selectedInvoice.bonus).toLocaleString()}</p>
                   </div>
                 )}

                 {(invoiceType === 'Customer Due' || invoiceType === 'Supplier Due') && (
                   <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '2' }}>
                     <p><strong>Name:</strong> {selectedInvoice.name}</p>
                     <p><strong>Phone:</strong> {selectedInvoice.phone}</p>
                     <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                     <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '1rem', color: 'red' }}><strong>Total Due:</strong> {selectedInvoice.due.toLocaleString()}</p>
                   </div>
                 )}

                 {invoiceType === 'Stock' && (
                   <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '2' }}>
                     <p><strong>Item Name:</strong> {selectedInvoice.name}</p>
                     <p><strong>Category:</strong> {selectedInvoice.category}</p>
                     <p><strong>Total In:</strong> <span style={{color:'green'}}>+{selectedInvoice.totalIn}</span></p>
                     <p><strong>Total Out:</strong> <span style={{color:'red'}}>-{selectedInvoice.totalOut}</span></p>
                     <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                     <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '1rem', color: '#000' }}><strong>Current Stock:</strong> {selectedInvoice.stock} {selectedInvoice.unit}</p>
                   </div>
                 )}

                 {invoiceType === 'Salesman' && (
                   <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '2' }}>
                     <p><strong>Salesman:</strong> {selectedInvoice.name}</p>
                     <p><strong>Invoices Handled:</strong> {selectedInvoice.count}</p>
                     <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                     
                     <h4 style={{marginBottom: '0.5rem', fontWeight: 'bold'}}>Detailed Sales List:</h4>
                     <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '1.5rem', color: '#000', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fa' }}>
                             <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Date</th>
                             <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Invoice ID</th>
                             <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Customer</th>
                             <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                           {selectedInvoice.sales && selectedInvoice.sales.map((sale, idx) => (
                             <tr key={idx}>
                                <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{new Date(sale.date).toLocaleDateString()}</td>
                                <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{sale.id}</td>
                                <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{sale.customerInfo?.name || sale.customerName || 'N/A'}</td>
                                <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>{sale.total.toLocaleString()}</td>
                             </tr>
                           ))}
                        </tbody>
                     </table>

                     <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '1rem', color: '#000' }}>
                        Grand Total Sales: {selectedInvoice.total.toLocaleString()}
                     </div>
                   </div>
                 )}

                 {invoiceType === 'Expense' && (
                   <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '2' }}>
                     <p><strong>Category:</strong> {selectedInvoice.category}</p>
                     <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                     <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '1rem', color: 'red' }}><strong>Total Expense:</strong> {selectedInvoice.amount.toLocaleString()}</p>
                   </div>
                 )}
                 <PrintFooter />
              </div>
            </div>

            <div className="drawer-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button
                type="button"
                className="btn-primary flex-align-gap"
                style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }}
                onClick={() => printElement('printable-single-invoice')}
              >
                <Printer size={20} /> Print Document
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <PrintFooter />
    </div>
  );
};

export default Reports;
