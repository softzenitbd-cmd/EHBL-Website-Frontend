import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Plus, Save, X } from 'lucide-react';
import '../common.css';

const TransactionEntry = () => {
  const { addTransaction, showToast } = useStore();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    entityName: '',
    type: 'Debit',
    amount: '',
    reference: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.entityName || !formData.amount) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    addTransaction({
      ...formData,
      amount: Number(formData.amount)
    });
    
    showToast('Transaction saved successfully!', 'success');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      entityName: '',
      type: 'Debit',
      amount: '',
      reference: '',
      description: ''
    });
  };

  return (
    <div className="page-container">
      <div className="page-header glass">
        <div>
          <h1 className="page-title">Transaction Entry</h1>
          <p className="page-subtitle">Manual entry for accounts and expenses</p>
        </div>
      </div>

      <div className="card glass">
        <form onSubmit={handleSubmit}>
          <div className="responsive-grid-2" style={{ gap: '1.25rem' }}>
            <div>
              <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Date *</label>
              <input 
                type="date" 
                style={{ width: '100%' }}
                name="date"
                value={formData.date}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div>
              <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Party / Account Name (e.g. Rent, Karim) *</label>
              <input 
                type="text" 
                style={{ width: '100%' }}
                name="entityName"
                placeholder="Enter party or expense name"
                value={formData.entityName}
                onChange={handleChange}
                required 
              />
            </div>

            <div>
              <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Transaction Type</label>
              <select 
                style={{ width: '100%' }}
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="Debit">Debit (Expense / Payment Made)</option>
                <option value="Credit">Credit (Income / Received)</option>
              </select>
            </div>

            <div>
              <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Amount *</label>
              <input 
                type="number" 
                style={{ width: '100%' }}
                name="amount"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                min="0"
                required 
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Payment Mode / Reference</label>
              <input 
                type="text" 
                style={{ width: '100%' }}
                name="reference"
                placeholder="Cash, Bkash, Bank..."
                value={formData.reference}
                onChange={handleChange}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-muted text-sm" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Remarks / Details</label>
              <textarea 
                style={{ width: '100%' }}
                name="description"
                placeholder="Enter transaction details..."
                value={formData.description}
                onChange={handleChange}
                rows="3"
              ></textarea>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="button" className="btn-outline flex-align-gap" onClick={() => setFormData({ date: new Date().toISOString().split('T')[0], entityName: '', type: 'Debit', amount: '', reference: '', description: '' })}>
              <X size={18} /> Clear Form
            </button>
            <button type="submit" className="btn-primary flex-align-gap">
              <Save size={18} /> Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionEntry;
