import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Send, MessageSquare, Users, Search, List } from 'lucide-react';

const SMS = () => {
  const { customers, user, smsHistory, addSmsToHistory, showToast } = useStore();
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Send');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'add') {
      setActiveTab('Send');
    } else if (location.search === '' || searchParams.get('action') === 'list') {
      setActiveTab('History'); 
    }
  }, [location.search]);


  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  // Only Admin can send SMS based on the requirement
  if (user?.role !== 'Admin') {
    return (
      <div className="card text-center" style={{ marginTop: '2rem' }}>
        <h2 className="text-danger">Access Denied</h2>
        <p className="text-muted">Only Admins can access the SMS system.</p>
      </div>
    );
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelect = (id) => {
    if (selectedCustomers.includes(id)) {
      setSelectedCustomers(selectedCustomers.filter(cId => cId !== id));
    } else {
      setSelectedCustomers([...selectedCustomers, id]);
    }
  };

  const handleSendSMS = (e) => {
    e.preventDefault();
    if (selectedCustomers.length === 0) {
      showToast('Please select at least one customer.', 'error');
      return;
    }
    if (!message.trim()) {
      showToast('Message cannot be empty.', 'error');
      return;
    }

    // Mock sending SMS
    setStatus('Sending SMS to ' + selectedCustomers.length + ' customers...');
    
    setTimeout(() => {
      setStatus('');
      
      const sentCustomersInfo = filteredCustomers.filter(c => selectedCustomers.includes(c.id)).map(c => ({ id: c.id, name: c.name, phone: c.phone }));
      addSmsToHistory({
        message,
        receiversCount: selectedCustomers.length,
        receivers: sentCustomersInfo
      });
      
      showToast(`SMS sent successfully to ${selectedCustomers.length} customers!`, 'success');
      setMessage('');
      setSelectedCustomers([]);
    }, 1500);
  };

  return (
    <div className="sms-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Customer SMS System</h1>
          <p className="text-muted">Send promotional or due reminder SMS to customers.</p>
        </div>
      </div>

      <div className="card glass mb-4">
        <div className="card-toolbar" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div className="return-type-selector">
            <button className={`type-btn ${activeTab === 'Send' ? 'active' : ''}`} onClick={() => setActiveTab('Send')}>
              <Send size={18} className="inline-block mr-2" /> Send SMS
            </button>
            <button className={`type-btn ${activeTab === 'History' ? 'active' : ''}`} onClick={() => setActiveTab('History')}>
              <List size={18} className="inline-block mr-2" /> SMS History
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'Send' ? (
        <div className="grid responsive-grid-2">
          <div className="card">
          <div className="card-toolbar" style={{ marginBottom: '1rem' }}>
            <h3><Users size={18} className="inline mr-2" /> Select Customers</h3>
            <label className="flex-align-gap" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                onChange={handleSelectAll}
              />
              Select All
            </label>
          </div>
          
          <div style={{ marginBottom: '1rem', position: 'relative' }}>
             <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted, #9ca3af)' }} />
             <input 
               type="text"
               placeholder="Search customers by name or phone..."
               className="w-full"
               style={{ paddingLeft: '35px' }}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>

          <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan="4" className="text-center text-muted">No customers found.</td></tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedCustomers.includes(c.id)}
                          onChange={() => handleSelect(c.id)}
                        />
                      </td>
                      <td>{c.name}</td>
                      <td>{c.phone || 'N/A'}</td>
                      <td className={c.due > 0 ? 'text-danger font-bold' : 'text-success'}>{c.due}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3><MessageSquare size={18} className="inline mr-2" /> Compose Message</h3>
          <form onSubmit={handleSendSMS} style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label>Message Content</label>
              <textarea 
                className="w-full"
                rows="6"
                placeholder="Type your SMS message here..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ resize: 'vertical' }}
              ></textarea>
              <p className="text-sm text-muted mt-2 text-right">
                Characters: {message.length} ({(message.length / 160).toFixed(1)} SMS)
              </p>
            </div>

            {status && (
              <div className="mt-4 p-3 rounded" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', textAlign: 'center', fontWeight: 'bold' }}>
                {status}
              </div>
            )}

            <div className="mt-4 text-right">
              <button 
                type="submit" 
                className="btn-primary flex-align-gap" 
                style={{ marginLeft: 'auto' }}
                disabled={!!status}
              >
                <Send size={18} /> Send SMS ({selectedCustomers.length} selected)
              </button>
            </div>
          </form>
        </div>
      </div>
      ) : (
        <div className="card">
          <h3><List size={18} className="inline mr-2" /> Sent SMS History</h3>
          <div className="table-responsive mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Message Content</th>
                  <th>Total Receivers</th>
                </tr>
              </thead>
              <tbody>
                {smsHistory && smsHistory.length > 0 ? (
                  smsHistory.map((history) => (
                    <tr key={history.id}>
                      <td>{new Date(history.date).toLocaleString()}</td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>{history.message}</td>
                      <td><span className="badge bg-success text-white px-2 py-1 rounded">{history.receiversCount}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-muted">No SMS history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMS;
