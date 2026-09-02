import React, { useState } from 'react';
import { Search, DollarSign, Download, Plus } from 'lucide-react';
import useStore from '../store/useStore';

const StaffDueList = () => {
  const { staff, payStaffDue, showToast } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Only show staff that have dues
  const staffWithDues = (staff || []).filter(s => (s.due || 0) > 0);

  const filteredStaff = staffWithDues.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.role && s.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalDues = filteredStaff.reduce((acc, s) => acc + (s.due || 0), 0);

  const openPayModal = (s) => {
    setSelectedStaff(s);
    setPayAmount(s.due);
    setPayDate(new Date().toISOString().split('T')[0]);
    setShowPayModal(true);
  };

  const handlePayDue = () => {
    if (!selectedStaff || !payAmount || isNaN(payAmount) || parseFloat(payAmount) <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }
    payStaffDue(selectedStaff.id, parseFloat(payAmount), payDate);
    setShowPayModal(false);
    setSelectedStaff(null);
    setPayAmount('');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header">
        <div>
          <h1>Staff / SR Due Management</h1>
          <p className="text-muted">Manage unpaid balances from Salesmen and Staff.</p>
        </div>
        <div className="flex-align-gap">
          <div className="search-bar">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-outline flex-align-gap">
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-header">
            <h3 className="stat-title">Total Staff Due</h3>
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value text-danger">৳{totalDues.toLocaleString()}</div>
        </div>
      </div>

      <div className="card table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Staff Name</th>
              <th>Role</th>
              <th style={{ textAlign: 'right' }}>Due Amount (৳)</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map(s => (
              <tr key={s.id}>
                <td className="text-muted">{s.id}</td>
                <td className="font-bold">{s.name}</td>
                <td>{s.role}</td>
                <td style={{ textAlign: 'right' }} className="text-danger font-bold">
                  ৳{(s.due || 0).toLocaleString()}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openPayModal(s)}>
                    Receive Cash
                  </button>
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted" style={{ padding: '2rem' }}>
                  No staff members have pending dues.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPayModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Receive Due from {selectedStaff.name}</h3>
              <button className="btn-icon" onClick={() => setShowPayModal(false)}><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Total Due</label>
                <div className="text-xl font-bold text-danger mb-4">৳{selectedStaff.due.toLocaleString()}</div>
              </div>
              
              <div className="form-group">
                <label>Receive Date</label>
                <input type="date" className="w-full" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Amount Received (৳)</label>
                <input 
                  type="number" 
                  className="w-full" 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)}
                  max={selectedStaff.due}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handlePayDue}>Confirm Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDueList;
