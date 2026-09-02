import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X, PieChart, DollarSign, Printer, Eye, Download } from 'lucide-react';

import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';

const EXPENSE_CATEGORIES = ['Shop Rent', 'Electricity Bill', 'Transport', 'Staff Cost', 'Others'];

const Expenses = () => {
  const { expenses, addExpense } = useStore();
  const [showModal, setShowModal] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'add') {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [location.search]);

  const [newExpense, setNewExpense] = useState({ date: todayStr, category: EXPENSE_CATEGORIES[0], amount: '', description: '' });
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [showReport, setShowReport] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  const totalDailyExpense = expenses.filter(e => e.date === todayStr).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const handleAddExpense = (e) => {
    e.preventDefault();
    addExpense({
      ...newExpense,
      amount: parseFloat(newExpense.amount)
    });
    setShowModal(false);
    setNewExpense({ date: todayStr, category: EXPENSE_CATEGORIES[0], amount: '', description: '' });
  };

  // Monthly Report Calculations
  const monthlyExpenses = expenses.filter(e => e.date && e.date.startsWith(reportMonth));
  const totalMonthlyExpense = monthlyExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const categoryTotals = EXPENSE_CATEGORIES.map(cat => ({
    category: cat,
    amount: monthlyExpenses.filter(e => e.category === cat).reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  })).filter(c => c.amount > 0);

  // Add dynamically added categories like 'Staff Cost' if they exist in data but not in EXPENSE_CATEGORIES constant
  const otherCategories = [...new Set(monthlyExpenses.map(e => e.category))].filter(cat => !EXPENSE_CATEGORIES.includes(cat));
  otherCategories.forEach(cat => {
    categoryTotals.push({
      category: cat,
      amount: monthlyExpenses.filter(e => e.category === cat).reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    });
  });

  return (
    <div className="expenses-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Expense Management</h1>
          <p className="text-muted">Track daily and monthly shop expenses.</p>
        </div>
        <button className="btn-primary flex-align-gap" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <div className="grid responsive-grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card flex-align-gap" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="flex-align-gap w-full" style={{ justifyContent: 'space-between', width: '100%' }}>
             <h3 className="text-muted text-sm">Today's Expense</h3>
             <DollarSign className="text-danger" size={20} />
          </div>
          <p className="text-xl font-bold mt-2 text-danger" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{totalDailyExpense.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="grid">
        <div className="card">
          <div className="card-toolbar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3>Recent Expenses</h3>
            <div className="flex-align-gap">
              <button className="btn-outline flex-align-gap" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowReport(true)}>
                <PieChart size={16} /> Monthly Report
              </button>
              <button className="btn-primary flex-align-gap" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => {
                const printContents = document.getElementById('printable-expenses-list').innerHTML;
                const originalContents = document.body.innerHTML;
                document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                window.print();
                document.body.innerHTML = originalContents;
                window.location.reload(); 
              }}>
                <Printer size={16} /> Print List
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => downloadAsPDF('printable-expenses-list', 'Expenses_List.pdf')}>
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount (BDT)</th>
                  <th style={{textAlign:'center'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 50).map(exp => ( // show only recent 50
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td>{exp.category}</td>
                    <td>{exp.description}</td>
                    <td className="text-danger font-bold">{exp.amount.toLocaleString()}</td>
                    <td style={{textAlign:'center'}}>
                      <div className="flex-align-gap" style={{justifyContent:'center'}}>
                        <button className="btn-icon" title="View & Print" onClick={() => setSelectedExpense(exp)}>
                          <Eye size={16} />
                        </button>
</div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan="5" className="text-center text-muted">No expenses recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hidden Printable Expenses List (Excel Style) */}
      <div id="printable-expenses-list" style={{ display: 'none' }}>
        <div style={{ padding: '2rem', background: '#fff', color: '#000' }}>
          <InvoiceHeader />
          <p style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '1.5rem', color: '#333' }}>
            Expense List
          </p>
          
          <table style={{ width: '100%', fontSize: '0.85rem', color: '#000', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left'}}>Date</th>
                <th style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left'}}>Category</th>
                <th style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'left'}}>Description</th>
                <th style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right'}}>Amount (BDT)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? expenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{exp.date}</td>
                  <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{exp.category}</td>
                  <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{exp.description}</td>
                  <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>{exp.amount.toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{border: '1px solid #ccc', padding: '1rem', textAlign: 'center'}}>No expenses recorded.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                <td colSpan="3" style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right'}}>Total Expense:</td>
                <td style={{border: '1px solid #ccc', padding: '0.5rem', textAlign: 'right', color: 'red'}}>
                  {expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
          <PrintFooter />
        </div>
      </div>

      {/* Add Expense Drawer */}
      {showModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Add Expense</h2>
              <button className="drawer-close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="add-expense-form" onSubmit={handleAddExpense}>
                <div className="form-group mb-4 mt-4">
                  <label>Date</label>
                  <input 
                    type="date"
                    className="w-full"
                    required
                    value={newExpense.date}
                    onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Category</label>
                  <select 
                    className="w-full"
                    value={newExpense.category} 
                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group mb-4">
                  <label>Amount (BDT)</label>
                  <input 
                    type="number" 
                    className="w-full"
                    required 
                    min="1"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Description</label>
                  <input 
                    type="text" 
                    className="w-full"
                    required
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" form="add-expense-form" className="btn-primary">Save Expense</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Monthly Report Drawer */}
      {showReport && createPortal(
        <div className="drawer-overlay" onClick={() => setShowReport(false)}>
          <div className="drawer-container" style={{ maxWidth: '600px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Monthly Expense Report</h2>
              <button className="drawer-close-btn text-danger" onClick={() => setShowReport(false)}><X size={24}/></button>
            </div>
            
            <div className="drawer-body">
              <div className="form-group mb-4">
                <label>Select Month</label>
                <input 
                  type="month" 
                  className="w-full p-2 bg-input border border-gray-700 rounded text-main"
                  value={reportMonth}
                  onChange={e => setReportMonth(e.target.value)}
                />
              </div>

              <div id="printable-monthly-expense">
                <div className="card bg-input" style={{ marginBottom: '1.5rem' }}>
                  <h3 className="text-muted text-sm text-center">Total Monthly Expense ({reportMonth})</h3>
                  <p className="text-2xl font-bold mt-2 text-danger text-center">{totalMonthlyExpense.toLocaleString()}</p>
                </div>

                <h4>Breakdown by Category</h4>
                <div className="table-responsive mt-4">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="text-right">Total Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryTotals.length === 0 ? (
                        <tr><td colSpan="2" className="text-center text-muted">No expenses found for this month.</td></tr>
                      ) : (
                        categoryTotals.map((cat, idx) => (
                          <tr key={idx}>
                            <td>{cat.category}</td>
                            <td className="text-right font-bold text-danger">{cat.amount.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <PrintFooter />
              </div>
            </div>
            
            <div className="drawer-footer" style={{ gap: '1rem' }}>
              <button className="btn-primary flex-align-gap w-full center-content" onClick={() => {
                 const printContents = document.getElementById('printable-monthly-expense').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = `<div style="padding:2rem;color:#000;"><h2>Expense Report: ${reportMonth}</h2>৳{printContents}</div>`;
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
              }}>
                <Printer size={18} /> Print Report
              </button>
              <button className="btn-outline flex-align-gap text-info w-full center-content" onClick={() => downloadAsPDF('printable-monthly-expense', `Monthly_Expenses_${reportMonth}.pdf`)}>
                <Download size={18} /> Download PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Single Expense Drawer */}
      {selectedExpense && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedExpense(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Expense Voucher</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedExpense(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-single-expense" style={{ padding: '1.5rem', background: '#fff', color: '#000' }}>
                 <InvoiceHeader />
                 <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem', color: '#555' }}>
                   Expense Voucher<br/>
                   ID: {selectedExpense.id}<br/>
                   Date: {selectedExpense.date}
                 </p>
                 <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                 
                 <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '2' }}>
                   <p><strong>Category:</strong> {selectedExpense.category}</p>
                   <p><strong>Description:</strong> {selectedExpense.description}</p>
                   <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                   <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '1rem', color: 'red' }}><strong>Amount:</strong> {selectedExpense.amount.toLocaleString()}</p>
                 </div>
                 <PrintFooter />
              </div>
            </div>

            <div className="drawer-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button className="btn-primary flex-align-gap" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => {
                 const printContents = document.getElementById('printable-single-expense').innerHTML;
                 const originalContents = document.body.innerHTML;
                 document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
                 window.print();
                 document.body.innerHTML = originalContents;
                 window.location.reload(); 
              }}>
                <Printer size={20} /> Print Document
              </button>
              <button className="btn-outline flex-align-gap text-info" style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', borderRadius: '99px' }} onClick={() => downloadAsPDF('printable-single-expense', `Expense_Voucher_${selectedExpense.id}.pdf`)}>
                <Download size={20} /> Download PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Expenses;
