import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import Login from './pages/Login';
import Layout from './components/Layout';
import Inventory from './pages/Inventory';
import StockRegister from './pages/StockRegister';
import StockLogs from './pages/StockLogs';
import SRSettlement from './pages/SRSettlement';
import Purchase from './pages/Purchase';
import Returns from './pages/Returns';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import StaffDueList from './pages/StaffDueList';
import Expenses from './pages/Expenses';
import HR from './pages/HR';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import SMS from './pages/SMS';
import BillInvoice from './pages/BillInvoice';

// Placeholder Pages (will be extracted to separate files in later phases)

// Protected Route Wrapper
const ProtectedRoute = ({ children, requiredRole }) => {
  const user = useStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const theme = useStore((state) => state.theme);
  const activeThemeClass = useStore((state) => state.activeThemeClass);

  useEffect(() => {
    // Clear previous theme classes
    const themeClasses = ['theme-default', 'theme-ocean', 'theme-sunset', 'theme-forest', 'theme-berry', 'theme-midnight', 'theme-aurora', 'theme-rose', 'theme-lavender', 'theme-cyberpunk'];
    document.body.classList.remove(...themeClasses);
    
    // Apply new theme class
    if (activeThemeClass) {
      document.body.classList.add(activeThemeClass);
    }
    
    // Apply light/dark mode
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme, activeThemeClass]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes with Layout */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="stock" element={<StockRegister />} />
          <Route path="stock-logs" element={<StockLogs />} />
          <Route path="purchases" element={<Purchase />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/staff-dues" element={<StaffDueList />} />
          <Route path="/sms" element={<SMS />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/invoice" element={<BillInvoice />} />
          
          {/* Admin Only Routes */}
          <Route path="hr" element={<ProtectedRoute requiredRole="Admin"><HR /></ProtectedRoute>} />
          <Route path="sr-settlements" element={<ProtectedRoute requiredRole="Admin"><SRSettlement /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute requiredRole="Admin"><Reports /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requiredRole="Admin"><Settings /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
