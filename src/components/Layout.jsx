import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  LogOut,
  Settings,
  DollarSign,
  Truck,
  RefreshCcw,
  Sun,
  Moon,
  MoreVertical,
  MessageSquare,
  Wifi,
  WifiOff,
  Plus,
  Minus,
  ChevronsRight,
  FileSpreadsheet,
  Menu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import InvoiceHeader from './InvoiceHeader';
import logoImg from '../assets/ehbl.jpeg';
import './Layout.css';

const NavItem = ({ item, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const location = useLocation();
  
  const isActive = item.path 
    ? (location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/'))
    : (item.subItems && item.subItems.some(sub => location.pathname === sub.path.split('?')[0]));

  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  if (item.subItems) {
    return (
      <div className={`nav-item-container ${isOpen ? 'expanded' : ''}`}>
        <div 
          className={`nav-item ${isActive ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {item.icon}
            <span>{item.name}</span>
          </div>
          <span className="expand-icon" style={{ display: 'flex', alignItems: 'center' }}>
            {isOpen ? <Minus size={16} /> : <Plus size={16} />}
          </span>
        </div>
        {isOpen && (
          <div className="submenu">
            {item.subItems.map(subItem => {
              const basePath = subItem.path.split('?')[0];
              const isSubActive = location.pathname === basePath && location.search === (subItem.search || '');
              return (
                <NavLink 
                  key={subItem.name + subItem.path}
                  to={subItem.path}
                  className={`submenu-item ${isSubActive ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="submenu-icon">»</span>
                  {subItem.name}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink 
      to={item.path} 
      className={({ isActive: linkActive }) => `nav-item ${linkActive ? 'active' : ''}`}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      {item.icon}
      <span>{item.name}</span>
    </NavLink>
  );
};

const Layout = () => {
  const { user, logout, theme, toggleTheme, fetchAllData } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
    const handleOnline = () => {
      setIsOnline(true);
      fetchAllData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { 
      name: 'Sales & Billing', 
      icon: <ShoppingCart size={20} />,
      subItems: [
        { path: '/pos?action=add', search: '?action=add', name: 'POS (Sale)' },
        { path: '/pos', search: '', name: 'POS Sales List' },
        { path: '/returns?action=add', search: '?action=add', name: 'Return' },
        { path: '/returns', search: '', name: 'Return List' },
        { path: '/sr-settlements', search: '', name: 'Order Process' },
      ]
    },
    { 
      name: 'Inventory', 
      icon: <Package size={20} />,
      subItems: [
        { path: '/inventory?action=add', search: '?action=add', name: 'Add Product' },
        { path: '/inventory', search: '', name: 'Product List' },
        { path: '/purchases?action=add', search: '?action=add', name: 'Purchase' },
        { path: '/purchases', search: '', name: 'Purchase List' },
        { path: '/stock', search: '', name: 'Stock Form' },
      ]
    },
    { 
      name: 'Accounts & Due', 
      icon: <DollarSign size={20} />,
      subItems: [
        { path: '/customers?action=add', search: '?action=add', name: 'Add Customer' },
        { path: '/customers', search: '', name: 'Customer Due List' },
        { path: '/suppliers?action=add', search: '?action=add', name: 'Add Supplier' },
        { path: '/suppliers', search: '', name: 'Supplier Due List' },
        { path: '/staff-dues', search: '', name: 'Staff/SR Due List' },
        { path: '/expenses?action=add', search: '?action=add', name: 'Add Expense' },
        { path: '/expenses', search: '', name: 'Expense List' },
      ]
    }
  ];

  // Admin only menu items
  if (user?.role === 'Admin') {
    menuItems.push(
      { 
        name: 'HR & Payroll', 
        icon: <Users size={20} />,
        subItems: [
          { path: '/hr?action=add', search: '?action=add', name: 'Add Employee' },
          { path: '/hr', search: '', name: 'Employee List' },
          { path: '/hr?action=attendance', search: '?action=attendance', name: 'Attendance' },
          { path: '/hr?action=leave', search: '?action=leave', name: 'Leave Requests' },
          { path: '/hr?action=payroll', search: '?action=payroll', name: 'Payroll & Bonus' },
        ]
      },
      { 
        name: 'SMS System', 
        icon: <MessageSquare size={20} />,
        subItems: [
          { path: '/sms?action=add', search: '?action=add', name: 'Send SMS' },
          { path: '/sms', search: '', name: 'SMS History' },
        ]
      },
      { path: '/reports', name: 'Reports', icon: <FileText size={20} /> },
      { path: '/settings', name: 'Settings', icon: <Settings size={20} /> }
    );
  }

  return (
    <div className="app-container">
      <aside className={`sidebar glass ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logoImg} alt="EHBL Logo" className="sidebar-logo" style={{ height: '45px', width: '45px', borderRadius: '8px', objectFit: 'contain', background: 'white' }} />
            <div className="sidebar-brand-text">
              <h2>EHBL</h2>
              <span className="role-badge">{user?.role}</span>
            </div>
          </div>
          <button 
            className="desktop-menu-toggle btn-icon" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <Menu size={20} />
          </button>
          <button 
            className="mobile-menu-toggle btn-icon" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <MoreVertical size={24} />
          </button>
        </div>
        <nav className={`sidebar-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {menuItems.map((item) => (
            <NavItem 
              key={item.name} 
              item={item} 
              isMobileMenuOpen={isMobileMenuOpen} 
              setIsMobileMenuOpen={setIsMobileMenuOpen} 
            />
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <span>{user?.name}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar glass">
          <div className="topbar-search">
            {/* Search or breadcrumbs can go here */}
          </div>
          <div className="topbar-actions flex-align-gap">
            <div className={`flex-align-gap px-3 py-1 rounded`} style={{ backgroundColor: isOnline ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)', color: isOnline ? 'var(--success)' : 'var(--warning)', border: `1px solid ${isOnline ? 'var(--success)' : 'var(--warning)'}`, fontSize: '0.85rem' }}>
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              {isOnline ? 'Synced' : 'Offline (Saved Locally)'}
            </div>
            <button className="btn-icon" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {/* Notifications, POS quick link, etc. */}
          </div>
        </header>
        <div className="content-area">
          <div className="print-only-header">
            <InvoiceHeader />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
