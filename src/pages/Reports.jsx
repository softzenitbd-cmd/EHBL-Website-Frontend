import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, PieChart, TrendingUp, DollarSign, Users, Package, Calendar, Printer, Database, ShoppingCart, Download, Eye, Plus, X, Gift } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';

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

  const TABS = [
    { id: 'Sales', label: 'Sales', icon: BarChart },
    { id: 'Purchases', label: 'Purchases', icon: ShoppingCart },
    { id: 'Stock', label: 'Stock', icon: Package },
    { id: 'ProfitLoss', label: 'Profit & Loss', icon: TrendingUp },
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
    <div className="reports-page animate-fade-in" id="reports-page-container">
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="text-muted">Comprehensive business intelligence and reporting.</p>
        </div>
        <div className="flex-align-gap">
          <label className="text-muted text-sm">Timeframe:</label>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="p-2 bg-input border border-gray-700 rounded text-main">
            <option value="Daily">Daily (Today)</option>
            <option value="Weekly">Weekly (Last 7 Days)</option>
            <option value="Monthly">Monthly (Current Month)</option>
            <option value="Custom">Custom Range</option>
          </select>
          {dateFilter === 'Custom' && (
            <div className="flex-align-gap">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 bg-input border border-gray-700 rounded text-main" />
              <span className="text-muted">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 bg-input border border-gray-700 rounded text-main" />
            </div>
          )}
          {sales.length === 0 && (
            <button className="btn-secondary flex-align-gap" onClick={() => { if (fetchAllData) fetchAllData(); else if (loadDummyData) loadDummyData(); }}>
              <Database size={18} /> Sync Live Data
            </button>
          )}
          <button className="btn-primary flex-align-gap" onClick={() => window.print()}>
            <Printer size={18} /> Print Report
          </button>
          <button className="btn-outline flex-align-gap text-info" onClick={() => downloadAsPDF('reports-page-container', `Reports_${dateFilter}.pdf`)}>
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div className="card glass mb-4" style={{ padding: '0.5rem' }}>
        <div className="return-type-selector" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          {TABS.map(tab => (
            <button key={tab.id} className={`type-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)} style={{ padding: '0.5rem 1rem', flex: '1 1 auto', minWidth: '120px' }}>
              <tab.icon size={16} className="inline-block mr-2" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

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
              <button className="btn-primary flex-align-gap" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => {
                 const printContents = document.getElementById('printable-single-invoice').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
              }}>
                <Printer size={20} /> Print Document
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-single-invoice', `Invoice_${selectedInvoice.id}.pdf`)}>
                <Download size={20} /> Download PDF
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
