import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, DollarSign, TrendingUp, TrendingDown, Truck, RefreshCcw, Users, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { name: 'Mon', sales: 12000, profit: 4000 },
  { name: 'Tue', sales: 19000, profit: 6000 },
  { name: 'Wed', sales: 15000, profit: 5500 },
  { name: 'Thu', sales: 22000, profit: 7800 },
  { name: 'Fri', sales: 28000, profit: 9000 },
  { name: 'Sat', sales: 35000, profit: 12000 },
  { name: 'Sun', sales: 24500, profit: 8200 },
];

const Dashboard = () => {
  const navigate = useNavigate();

  const { user, sales = [], expenses = [], inventory = [], customers = [], suppliers = [], purchases = [], fetchAllData } = useStore();

  useEffect(() => {
    if (fetchAllData) fetchAllData();
  }, []);
  const isAdmin = user?.role === 'Admin';

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate dynamic stats
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Helper for safe numeric conversion
  const num = (v) => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : 0;

  // Sales
  const dailySales = sales.filter(s => s.date && s.date.startsWith(todayStr)).reduce((acc, sale) => acc + num(sale.total), 0);
  const monthlySales = sales.filter(s => s.date && s.date.startsWith(currentMonthStr)).reduce((acc, sale) => acc + num(sale.total), 0);

  // Expenses
  const dailyExpenses = expenses.filter(e => e.date && e.date.startsWith(todayStr)).reduce((acc, exp) => acc + num(exp.amount), 0);
  const monthlyExpenses = expenses.filter(e => e.date && e.date.startsWith(currentMonthStr)).reduce((acc, exp) => acc + num(exp.amount), 0);

  // Profit/Loss
  const dailyProfit = dailySales - dailyExpenses;
  const monthlyProfit = monthlySales - monthlyExpenses;

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

  // --- GRADIENT DESIGN (Commented out for now as requested) ---
  /*
  const stats = [
    { label: "Total Balance (Net)", value: `৳${netBalance.toLocaleString()}`, icon: DollarSign, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)' },
    { label: "Today's Sales", value: `৳${dailySales.toLocaleString()}`, icon: ShoppingCart, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', shadow: '0 10px 20px -5px rgba(139, 92, 246, 0.4)' },
    { label: "Today's Expense", value: `৳${dailyExpenses.toLocaleString()}`, icon: TrendingDown, gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', shadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' },
    { label: "Today's Net Profit", value: `৳${dailyProfit.toLocaleString()}`, icon: TrendingUp, gradient: dailyProfit >= 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', shadow: dailyProfit >= 0 ? '0 10px 20px -5px rgba(16, 185, 129, 0.4)' : '0 10px 20px -5px rgba(239, 68, 68, 0.4)' },
    { label: "Monthly Profit", value: `৳${monthlyProfit.toLocaleString()}`, icon: TrendingUp, gradient: monthlyProfit >= 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', shadow: monthlyProfit >= 0 ? '0 10px 20px -5px rgba(16, 185, 129, 0.4)' : '0 10px 20px -5px rgba(239, 68, 68, 0.4)' },
    { label: "Monthly Expense", value: `৳${monthlyExpenses.toLocaleString()}`, icon: DollarSign, gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', shadow: '0 10px 20px -5px rgba(245, 158, 11, 0.4)' },
    { label: "Inventory Value", value: `৳${totalInventoryValue.toLocaleString()}`, icon: Package, gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', shadow: '0 10px 20px -5px rgba(59, 130, 246, 0.4)' },
    { label: "Customer Due (Receivable)", value: `৳${totalCustomerDue.toLocaleString()}`, icon: Users, gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', shadow: '0 10px 20px -5px rgba(245, 158, 11, 0.4)' },
    { label: "Supplier Due (Payable)", value: `৳${totalSupplierDue.toLocaleString()}`, icon: Users, gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', shadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }
  ];
  */

  // --- ACTIVE BORDER DESIGN ---
  const stats = [
    { label: "Total Balance (Net)", value: `৳${netBalance.toLocaleString()}`, icon: DollarSign, color: netBalance >= 0 ? "var(--success)" : "var(--danger)", highlight: true },
    { label: "Today's Sales", value: `৳${dailySales.toLocaleString()}`, icon: ShoppingCart, color: "var(--primary)" },
    { label: "Today's Expense", value: `৳${dailyExpenses.toLocaleString()}`, icon: TrendingDown, color: "var(--danger)" },
    { label: "Today's Net Profit", value: `৳${dailyProfit.toLocaleString()}`, icon: TrendingUp, color: dailyProfit >= 0 ? "#10b981" : "var(--danger)" },
    { label: "Monthly Profit", value: `৳${monthlyProfit.toLocaleString()}`, icon: TrendingUp, color: monthlyProfit >= 0 ? "#10b981" : "var(--danger)" },
    { label: "Monthly Expense", value: `৳${monthlyExpenses.toLocaleString()}`, icon: DollarSign, color: "var(--warning)" },
    { label: "Inventory Value", value: `৳${totalInventoryValue.toLocaleString()}`, icon: Package, color: "var(--info)" },
    { label: "Customer Due (Receivable)", value: `৳${totalCustomerDue.toLocaleString()}`, icon: Users, color: "var(--warning)" },
    { label: "Supplier Due (Payable)", value: `৳${totalSupplierDue.toLocaleString()}`, icon: Users, color: "var(--danger)" }
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p className="text-muted">Welcome to EHBL System.</p>
        </div>

        <div className="card glass animate-fade-in" style={{
          padding: '0.8rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          minWidth: 'fit-content'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Clock size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              fontFamily: '"Orbitron", monospace, sans-serif',
              lineHeight: '1.2',
              background: 'linear-gradient(to right, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '1px'
            }}>
              {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-muted" style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* --- GRADIENT LAYOUT (Commented out) --- */}
      {/* 
      <div className="grid responsive-grid-3" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card-hover" style={{ 
            position: 'relative',
            overflow: 'hidden',
            background: stat.gradient,
            boxShadow: stat.shadow,
            border: 'none',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <stat.icon size={120} style={{ 
              position: 'absolute', 
              right: '-15px', 
              bottom: '-15px', 
              opacity: 0.15, 
              transform: 'rotate(-15deg)',
              pointerEvents: 'none'
            }} />
            
            <div className="flex-align-gap" style={{ justifyContent: 'space-between', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
               <h3 style={{ fontSize: '1rem', fontWeight: '600', opacity: 0.9, letterSpacing: '0.5px' }}>{stat.label}</h3>
               <div style={{ padding: '8px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(5px)' }}>
                 <stat.icon color="white" size={24} />
               </div>
            </div>
            <p style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, position: 'relative', zIndex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      */}

      {/* --- ACTIVE BORDER LAYOUT --- */}
      <div className="grid responsive-grid" style={{ marginBottom: '2rem' }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="card flex-align-gap stat-card-hover" style={{ 
            flexDirection: 'column', 
            alignItems: 'flex-start',
            border: stat.highlight ? `2px solid ${stat.color}` : 'none',
            borderLeft: !stat.highlight ? `4px solid ${stat.color}` : `4px solid ${stat.color}`,
            background: stat.highlight ? '#f0fdf4' : 'rgba(255, 255, 255, 0.85)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div className="flex-align-gap w-full" style={{ justifyContent: 'space-between', width: '100%' }}>
               <h3 className="text-sm font-bold" style={{ color: stat.highlight ? '#000' : '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</h3>
               <div style={{ padding: '8px', borderRadius: '50%', background: `${stat.color}15` }}>
                 <stat.icon style={{ color: stat.color }} size={22} />
               </div>
            </div>
            <p className="font-bold mt-2" style={{ fontSize: '1.75rem', marginTop: '0.8rem', color: stat.highlight ? stat.color : '#1e293b' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Quick Actions</h2>
      <div className="grid responsive-grid-3" style={{ marginBottom: '2rem' }}>
        {allQuickActions.map((action, index) => (
          <div
            key={index}
            className="card flex-align-gap quick-action-card"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem'
            }}
            onClick={() => navigate(action.path)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className="flex-align-gap">
              <div style={{
                padding: '0.75rem',
                borderRadius: '0.75rem',
                backgroundColor: 'var(--bg-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: action.color
              }}>
                <action.icon size={24} />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', marginLeft: '0.75rem' }}>{action.name}</span>
            </div>
            <ArrowRight size={20} className="text-muted" style={{ opacity: 0.5 }} />
          </div>
        ))}
      </div>

      <div className="grid responsive-grid-2" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="flex-align-gap" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Sales Analytics</h3>
              <p className="text-muted text-sm mt-1">Revenue and Profit over the last 7 days</p>
            </div>
            <div className="segmented-control">
              <button className="active">Weekly</button>
              <button>Monthly</button>
            </div>
          </div>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow-lg)' }}
                  itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid responsive-grid-2" style={{ gap: '1.5rem' }}>

        {/* Customer Dues (Accounts Receivable) */}
        <div className="card">
          <div className="flex-align-gap" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--warning)' }}>Accounts Receivable</h3>
            <span className="badge warning">Customer Due</span>
          </div>
          <p className="text-muted text-sm mb-3">Total money owed to you by customers.</p>
          <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.9rem' }}>
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
                        {customer.due.toLocaleString()}
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
        <div className="card">
          <div className="flex-align-gap" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--danger)' }}>Accounts Payable</h3>
            <span className="badge danger">Supplier Due</span>
          </div>
          <p className="text-muted text-sm mb-3">Total money you owe to suppliers.</p>
          <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.9rem' }}>
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
                        {supplier.due.toLocaleString()}
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
