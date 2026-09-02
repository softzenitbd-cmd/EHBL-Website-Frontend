import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Printer, Download, Plus } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';

const StockRegister = () => {
  const { inventory, sales, purchases, returns, processPurchase } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ id: '', name: '', category: '', variant: '', unit: 'pcs', quantity: 1 });

  const handleIdChange = (val) => {
    const existing = inventory.find(i => i.id === val || i.name === val);
    if (existing) {
      setAddForm({
        id: existing.id,
        name: existing.name,
        category: existing.category || '',
        variant: existing.variant || '',
        unit: existing.unit || 'pcs',
        quantity: 1
      });
    } else {
      setAddForm(prev => ({ ...prev, id: val }));
    }
  };

  // Calculate stock in, stock out for each item
  const stockData = inventory.map(item => {
    let stockOut = 0;
    let stockIn = 0;

    // Calculate Stock Out from Sales
    sales.forEach(sale => {
      sale.items?.forEach(saleItem => {
        if (saleItem.id === item.id) {
          stockOut += saleItem.quantity;
        }
      });
    });

    // Calculate Stock In from Purchases
    purchases.forEach(purchase => {
      purchase.items?.forEach(purItem => {
        // Purchases might use name instead of id in earlier versions, match both
        if (purItem.id === item.id || purItem.name.toLowerCase() === item.name.toLowerCase()) {
          stockIn += purItem.quantity;
        }
      });
    });

    // Calculate from Returns
    returns.forEach(ret => {
      if (ret.productId === item.id) {
        if (ret.returnType === 'Customer') {
          stockIn += ret.quantity; // customer returns increase stock in
        } else {
          stockOut += ret.quantity; // supplier returns increase stock out
        }
      }
    });

    // Initial stock (or adjustments) = current stock + stockOut - stockIn
    // So total Stock In is effectively current stock + stockOut
    const totalStockIn = item.stock + stockOut; 

    return {
      ...item,
      stockIn: totalStockIn,
      stockOut: stockOut,
      balance: item.stock
    };
  });

  const filteredData = stockData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.includes(searchTerm) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePrint = () => {
    const printContents = document.getElementById('printable-stock-register').innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!addForm.id || !addForm.name || addForm.quantity <= 0) {
      alert("Item ID, Name, and valid Quantity are required");
      return;
    }

    const result = await processPurchase({
      supplierId: 'SYSTEM',
      supplierName: 'Direct Stock In',
      paymentType: 'Cash',
      items: [{ 
        productId: addForm.id, 
        name: addForm.name, 
        category: addForm.category || 'Uncategorized',
        variant: addForm.variant || '',
        unit: addForm.unit || 'pcs',
        quantity: addForm.quantity, 
        price: 0 
      }],
      total: 0,
      paidAmount: 0,
      date: new Date().toISOString(),
      id: 'STKIN_' + Date.now()
    });

    if (!result.success) {
      alert(`Stock was not added: ${result.error}`);
      return;
    }

    setShowAddModal(false);
    setAddForm({ id: '', name: '', category: '', variant: '', unit: 'pcs', quantity: 1 });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header">
        <div>
          <h1>Stock Register / Form</h1>
          <p className="text-muted">Detailed view of Stock In, Stock Out, and Balance.</p>
        </div>
        <div className="flex-align-gap">
          <button className="btn-primary flex-align-gap" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Add Stock In
          </button>
          <button className="btn-outline flex-align-gap" onClick={handlePrint}>
            <Printer size={18} /> Print Form
          </button>
          <button className="btn-outline flex-align-gap text-info" onClick={() => downloadAsPDF('printable-stock-register', 'Stock_Form.pdf')}>
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <div className="search-bar">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by name, ID or category..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', color: '#64748b', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700' }}>Item Code/ID</th>
                <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700' }}>Product Name</th>
                <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700' }}>Category</th>
                <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700' }}>Size</th>
                <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700' }}>Unit</th>
                <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Stock In</th>
                <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Stock Out</th>
                <th style={{ textTransform: 'uppercase', padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.variant || '-'}</td>
                  <td>{item.unit}</td>
                  <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 'bold' }}>{item.stockIn}</td>
                  <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>{item.stockOut}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.balance}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Version */}
      <div id="printable-stock-register" style={{ display: 'none' }}>
        <div style={{ padding: '2rem', background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' }}>
          <style>
            {`
              @media print {
                @page { size: A4; margin: 10mm; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
              }
            `}
          </style>
          
          <InvoiceHeader />
          <h3 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '20px' }}>Stock Form / Register</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Item Code/ID</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Product Name</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Category</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Size</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Unit</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Stock In</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Stock Out</th>
                <th style={{ border: '1px solid #000', padding: '6px' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{item.id}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{item.name}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{item.category}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{item.variant || '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{item.unit}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{item.stockIn}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{item.stockOut}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{item.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PrintFooter />
        </div>
      </div>

      {/* Quick Add Stock Drawer */}
      {showAddModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowAddModal(false)}>
          <div className="drawer-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Quick Add Stock In</h2>
              <button className="drawer-close-btn" onClick={() => setShowAddModal(false)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="add-stock-form" onSubmit={handleAddStock}>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1 uppercase font-bold text-xs">Item Code/ID *</label>
                    <input 
                      type="text" 
                      list="stock-items"
                      className="w-full" 
                      placeholder="Type or select ID"
                      value={addForm.id} 
                      onChange={e => handleIdChange(e.target.value)}
                      required 
                    />
                    <datalist id="stock-items">
                      {inventory.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1 uppercase font-bold text-xs">Product Name *</label>
                    <input 
                      type="text" 
                      className="w-full" 
                      value={addForm.name} 
                      onChange={e => setAddForm({...addForm, name: e.target.value})}
                      required 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1 uppercase font-bold text-xs">Category</label>
                      <input type="text" className="w-full" value={addForm.category} onChange={e => setAddForm({...addForm, category: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-muted text-sm block mb-1 uppercase font-bold text-xs">Size</label>
                      <input type="text" className="w-full" value={addForm.variant} onChange={e => setAddForm({...addForm, variant: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1 uppercase font-bold text-xs">Unit</label>
                      <input type="text" className="w-full" value={addForm.unit} onChange={e => setAddForm({...addForm, unit: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-muted text-sm block mb-1 uppercase font-bold text-xs">Stock In *</label>
                      <input 
                        type="number" 
                        className="w-full" 
                        min="1"
                        value={addForm.quantity} 
                        onChange={e => setAddForm({...addForm, quantity: parseInt(e.target.value) || 1})} 
                        required 
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" form="add-stock-form" className="btn-primary flex-align-gap"><Plus size={18} /> Save Stock</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default StockRegister;
