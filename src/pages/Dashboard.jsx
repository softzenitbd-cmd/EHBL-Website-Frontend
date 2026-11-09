import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, DollarSign, TrendingUp, TrendingDown, Truck, RefreshCcw, Users, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

// Shown while the real series loads, and if the server cannot be reached, so
// the chart never invents numbers the shop might act on.
const emptyWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => ({
  name, sales: 0, profit: 0,
}));

const Dashboard = () => {
  const navigate = useNavigate();

  const { user, sales = [], expenses = [], inventory = [], customers = [], suppliers = [], purchases = [], returns = [], fetchAllData } = useStore();

  const [chartTimeframe, setChartTimeframe] = useState('Weekly'); // 'Weekly' or 'Monthly'
  const [weeklyChartData, setWeeklyChartData] = useState(emptyWeek);
  const [monthlyChartData, setMonthlyChartData] = useState([]);

  // Server summary fetch
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(ENDPOINTS.REPORTS_SUMMARY)
      .then((res) => {
        if (!cancelled) {
          if (Array.isArray(res?.chartData) && res.chartData.length) {
            setWeeklyChartData(res.chartData);
          }
          if (Array.isArray(res?.monthlyChartData) && res.monthlyChartData.length) {
            setMonthlyChartData(res.monthlyChartData);
          }
        }
      })
      .catch(() => {
        // Keep fallback data; client calculations still run accurately.
      });
    return () => { cancelled = true; };
  }, []);

  const isAdmin = user?.role === 'Admin';

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate dynamic stats strictly for the current calendar month
  // (1st date of this month to the last date: 30th/31st/28th/29th)
  // Automatically restarts from 1 on the 1st of next month.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const monthName = now.toLocaleString('en-US', { month: 'short' });
  const fullMonthName = now.toLocaleString('en-US', { month: 'long' });

  const todayStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // 1st of the current month (০১ তারিখ)
  const monthStartStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-01`;
  
  // Last date of the current month (৩০ বা ৩১ তারিখ, লিপ ইয়ারে ২৯)
  const lastDayDate = new Date(currentYear, currentMonthIdx + 1, 0);
  const lastDayNum = lastDayDate.getDate();
  const monthEndStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    return String(dateStr).split('T')[0] === todayStr;
  };

  // Strictly between 1st date and last date of current month
  const isCurrentMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = String(dateStr).split('T')[0];
    return d >= monthStartStr && d <= monthEndStr;
  };

  // Helper for safe numeric conversion
  const num = (v) => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : 0;

  // Sales (strictly 1st to last date of this month, excluding cancelled)
  const dailySales = sales
    .filter(s => s.date && s.status !== 'Cancelled' && isToday(s.date))
    .reduce((acc, sale) => acc + num(sale.total), 0);

  const monthlySales = sales
    .filter(s => s.date && s.status !== 'Cancelled' && isCurrentMonth(s.date))
    .reduce((acc, sale) => acc + num(sale.total), 0);

  // Expenses (strictly 1st to last date of this month)
  const dailyExpenses = expenses
    .filter(e => e.date && isToday(e.date))
    .reduce((acc, exp) => acc + num(exp.amount), 0);

  const monthlyExpenses = expenses
    .filter(e => e.date && isCurrentMonth(e.date))
    .reduce((acc, exp) => acc + num(exp.amount), 0);

  // Profit: sale price - purchase price on what was sold. Each line earns
  // its total less qty x the product's purchase price; a customer return
  // takes back its own margin. Expenses are shown separately, not taken off.
  const costOf = new Map(inventory.map((p) => [String(p.id), num(p.purchasePrice ?? p.cost_price ?? p.costPrice)]));
  const profitWhere = (inPeriod) => {
    let profit = 0;
    sales.forEach((s) => {
      if (!s.date || s.status === 'Cancelled' || !inPeriod(s.date)) return;
      (s.items || []).forEach((it) => {
        const qty = num(it.quantity);
        const value = it.total_price !== undefined ? num(it.total_price) : num(it.price) * qty;
        profit += value - (costOf.get(String(it.currentCode || it.id)) || 0) * qty;
      });
    });
    returns.forEach((r) => {
      if (r.returnType !== 'Customer' || !r.date || !inPeriod(r.date)) return;
      profit -= (num(r.rate) - (costOf.get(String(r.productId)) || 0)) * num(r.quantity);
    });
    return profit;
  };

  const dailyProfit = profitWhere((d) => isToday(d));
  const monthlyProfit = profitWhere((d) => isCurrentMonth(d));

  // Client-side fallback for monthly chart data if API hasn't loaded yet
  const effectiveMonthlyChartData = React.useMemo(() => {
    if (monthlyChartData && monthlyChartData.length > 0) return monthlyChartData;
    const daysCount = now.getDate();
    const rows = [];
    for (let d = 1; d <= daysCount; d++) {
      const dayDateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySales = sales
        .filter(s => s.date && s.status !== 'Cancelled' && String(s.date).split('T')[0] === dayDateStr)
        .reduce((acc, sale) => acc + num(sale.total), 0);
      const dayProfit = profitWhere((dt) => String(dt).split('T')[0] === dayDateStr);
      rows.push({
        name: `${d} ${monthName}`,
        date: dayDateStr,
        sales: daySales,
        profit: dayProfit,
      });
    }
    return rows;
  }, [monthlyChartData, sales, inventory, returns, currentYear, currentMonthIdx, monthName]);

  const activeChartData = chartTimeframe === 'Weekly' ? weeklyChartData : effectiveMonthlyChartData;

  // Cash Balance Calculation
  const allTimeCashSales = sales.filter(s => s.paymentType === 'Cash').reduce((acc, sale) => acc + num(sale.total), 0);
  const allTimeCashPurchases = purchases.filter(p => p.paymentType === 'Cash').reduce((acc, p) => acc + num(p.total), 0);
  const allTimeExpenses = expenses.reduce((acc, exp) => acc + num(exp.amount), 0);

  const totalSales = sales.reduce((acc, sale) => acc + num(sale.total), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + num(exp.amount), 0);
  const netBalance = totalSales - totalExpenses;

  const totalInventoryValue = inventory.reduce((acc, item) => acc + (num(item.stock) * num(item.price)), 0);
  const totalCustomerDue = customers.reduce((acc, cust) => acc + num(cust.due), 0);
  const totalSupplierDue = suppliers.reduce((acc, sup) => acc + num(sup.due), 0);

  // --- ACTIVE BORDER DESIGN ---
  const stats = [
    { label: "Total Balance (Net)", value: `${netBalance.toLocaleString()}`, icon: DollarSign, color: netBalance >= 0 ? "var(--success)" : "var(--danger)", highlight: true },
    { label: "Today's Sales", value: `${dailySales.toLocaleString()}`, icon: ShoppingCart, color: "var(--primary)" },
    { label: `Monthly Sales (${monthName} 1-${lastDayNum})`, value: `${monthlySales.toLocaleString()}`, icon: ShoppingCart, color: "var(--primary)" },
    { label: "Today's Profit", value: `${dailyProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: TrendingUp, color: dailyProfit >= 0 ? "#10b981" : "var(--danger)" },
    { label: `Monthly Profit (${monthName} 1-${lastDayNum})`, value: `${monthlyProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: TrendingUp, color: monthlyProfit >= 0 ? "#10b981" : "var(--danger)" },
    { label: "Today's Expense", value: `${dailyExpenses.toLocaleString()}`, icon: TrendingDown, color: "var(--danger)" },
    { label: `Monthly Expense (${monthName} 1-${lastDayNum})`, value: `${monthlyExpenses.toLocaleString()}`, icon: DollarSign, color: "var(--warning)" },
    { label: "Inventory Value", value: `${totalInventoryValue.toLocaleString()}`, icon: Package, color: "var(--info)" },
    { label: "Customer Due (Receivable)", value: `${totalCustomerDue.toLocaleString()}`, icon: Users, color: "var(--warning)" },
    { label: "Supplier Due (Payable)", value: `${totalSupplierDue.toLocaleString()}`, icon: Users, color: "var(--danger)" }
  ];

  const allQuickActions = [
    { name: 'Point of Sale', path: '/pos', icon: ShoppingCart, color: 'var(--primary)' },
    { name: 'Inventory', path: '/inventory', icon: Package, color: 'var(--info)' },
    { name: 'Purchases', path: '/purchases', icon: Truck, color: 'var(--warning)' },
    { name: 'Returns', path: '/returns', icon: RefreshCcw, color: 'var(--danger)' },
    { name: 'Customers & Due', path: '/customers', icon: Users, color: 'var(--secondary)' },
    { name: 'Expenses', path: '/expenses', icon: DollarSign, color: 'var(--text-muted)' },
  ];

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Header & Clock Section */}
      <div className="dashboard-header-container">
        <div className="dashboard-header-title">
          <h1>Dashboard Overview</h1>
          <p className="text-muted">Welcome to EHBL System.</p>
        </div>

        <div className="dashboard-clock-card">
          <div className="clock-icon-wrapper">
            <Clock size={22} />
          </div>
          <div className="clock-text-wrapper">
            <span className="clock-time">
              {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="clock-date">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="dashboard-stats-grid">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className={`dashboard-stat-card ${stat.highlight ? 'highlighted' : ''}`}
            style={{ '--card-color': stat.color }}
          >
            <div className="stat-card-top">
              <span className="stat-card-label">{stat.label}</span>
              <div 
                className="stat-card-icon-pill" 
                style={{ backgroundColor: `${stat.color}18`, color: stat.color }}
              >
                <stat.icon size={18} />
              </div>
            </div>
            <p className="stat-card-value">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section-header">
        <h2 className="dashboard-section-title">Quick Actions</h2>
      </div>
      <div className="dashboard-quick-actions-grid">
        {allQuickActions.map((action, index) => (
          <div
            key={index}
            className="dashboard-quick-action-card"
            onClick={() => navigate(action.path)}
          >
            <div className="quick-action-left">
              <div className="quick-action-icon" style={{ color: action.color }}>
                <action.icon size={20} />
              </div>
              <span className="quick-action-name">{action.name}</span>
            </div>
            <ArrowRight size={18} className="quick-action-arrow" />
          </div>
        ))}
      </div>

      {/* Sales Analytics Chart */}
      <div className="dashboard-chart-card">
        <div className="dashboard-chart-header">
          <div className="chart-title-group">
            <h3>Sales Analytics</h3>
            <p className="text-muted">
              {chartTimeframe === 'Weekly'
                ? 'Revenue and Profit over the last 7 days'
                : `Revenue and Profit for ${fullMonthName} (1st - ${lastDayNum}th ${monthName})`}
            </p>
          </div>
          <div className="segmented-control">
            <button
              type="button"
              className={chartTimeframe === 'Weekly' ? 'active' : ''}
              onClick={() => setChartTimeframe('Weekly')}
            >
              Weekly (7 Days)
            </button>
            <button
              type="button"
              className={chartTimeframe === 'Monthly' ? 'active' : ''}
              onClick={() => setChartTimeframe('Monthly')}
            >
              Monthly ({monthName} 1-{lastDayNum})
            </button>
          </div>
        </div>
        <div className="chart-container-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  backdropFilter: 'blur(20px)', 
                  boxShadow: 'var(--shadow-lg)',
                  color: 'var(--text-main)'
                }}
                itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" dataKey="profit" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dues Section: Accounts Receivable & Accounts Payable */}
      <div className="dashboard-dues-grid">
        {/* Customer Dues (Accounts Receivable) */}
        <div className="dashboard-due-card">
          <div className="due-card-header">
            <h3 className="due-card-title text-warning">Accounts Receivable</h3>
            <span className="badge warning">Customer Due</span>
          </div>
          <p className="text-muted due-card-subtitle">Total money owed to you by customers.</p>
          <div className="dashboard-due-table-wrapper">
            <table className="dashboard-due-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'right' }}>Due Amount</th>
                </tr>
              </thead>
              <tbody>
                {customers.filter(c => c.due > 0).length > 0 ? (
                  customers.filter(c => c.due > 0).map(customer => (
                    <tr key={customer.id}>
                      <td style={{ fontWeight: '500' }}>{customer.name}</td>
                      <td>{customer.phone}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--warning)' }}>
                        {Number(customer.due).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem' }} className="text-muted">
                      No customer dues at the moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Dues (Accounts Payable) */}
        <div className="dashboard-due-card">
          <div className="due-card-header">
            <h3 className="due-card-title text-danger">Accounts Payable</h3>
            <span className="badge danger">Supplier Due</span>
          </div>
          <p className="text-muted due-card-subtitle">Total money you owe to suppliers.</p>
          <div className="dashboard-due-table-wrapper">
            <table className="dashboard-due-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'right' }}>Due Amount</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.filter(s => s.due > 0).length > 0 ? (
                  suppliers.filter(s => s.due > 0).map(supplier => (
                    <tr key={supplier.id}>
                      <td style={{ fontWeight: '500' }}>{supplier.name}</td>
                      <td>{supplier.phone}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>
                        {Number(supplier.due).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem' }} className="text-muted">
                      No supplier dues at the moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
