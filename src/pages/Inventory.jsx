import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { Plus, Search, Printer, Trash2, Download, FolderPlus, Layers, X, RotateCcw, Tag, Calendar, ArrowUpDown, Edit } from 'lucide-react';
import useStore from '../store/useStore';
import { downloadAsPDF } from '../utils/pdfGenerator';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintFooter from '../components/PrintFooter';
import './Inventory.css';

const defaultCategories = [
  'Power Tools',
  'Hand Tools',
  'Hardware',
  'Machine Tools',
  'Sanitary',
  'Locks & Security',
  'Building & Furniture',
  'Paints & Electrical',
  'Fasteners & Fittings',
  'Uncategorized'
];

const defaultUnits = [
  'Pcs', 'Box', 'Set', 'Dozen', 'Bag', 'Kg', 'Packet', 'Roll', 'Feet', 'Meter'
];

const Inventory = () => {
  const { inventory, categories, units, addInventoryItem, updateInventoryItem, deleteInventoryItem, addCategory, addUnit, showToast } = useStore();
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStock, setFilterStock] = useState('All');
  const [filterDate, setFilterDate] = useState('All Time');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'name_asc', 'price_desc', 'price_asc', 'stock_desc', 'stock_asc'

  // Modals & Drawers State
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [printQuantity, setPrintQuantity] = useState(21);
  const [editingProduct, setEditingProduct] = useState({
    id: '', name: '', category: 'Power Tools', unit: 'Pcs', variant: '', stock: 0, price: 0
  });

  // New Category / Unit Inputs
  const [newCatInput, setNewCatInput] = useState('');
  const [newUnitInput, setNewUnitInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [newProduct, setNewProduct] = useState({
    id: '', name: '', category: 'Power Tools', unit: 'Pcs', variant: '', stock: 0, price: 0
  });
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
    } else {
      setShowAddModal(false);
    }
  }, [location.search]);

  // Merge Store Categories & Units with Defaults
  const allCategories = Array.from(new Set([
    ...defaultCategories,
    ...(categories || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean)
  ]));

  const allUnits = Array.from(new Set([
    ...defaultUnits,
    ...(units || []).map(u => typeof u === 'string' ? u : u.name).filter(Boolean)
  ]));

  const handleEditProductClick = (product) => {
    setEditingProduct({ ...product });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct.id || !editingProduct.name) {
      showToast('Product ID and Name are required!', 'error');
      return;
    }
    await updateInventoryItem(editingProduct.id, editingProduct);
    showToast('Product updated successfully!', 'success');
    setShowEditModal(false);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.id || !newProduct.name) {
      showToast('Product ID and Name are required!', 'error');
      return;
    }
    
    await addInventoryItem(newProduct);
    showToast('Product added successfully!', 'success');
    setShowAddModal(false);
    navigate('/inventory');
    setNewProduct({ id: '', name: '', category: 'Power Tools', unit: 'Pcs', variant: '', stock: 0, price: 0 });
    setIsCustomCategory(false);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    await addCategory(newCatInput.trim());
    setNewCatInput('');
  };

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitInput.trim()) return;
    await addUnit(newUnitInput.trim());
    setNewUnitInput('');
  };

  const handlePrintBarcode = (product) => {
    setSelectedProduct(product);
    setShowBarcodeModal(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterCategory('All');
    setFilterStock('All');
    setFilterDate('All Time');
    setCustomDateRange({ start: '', end: '' });
    setSortBy('newest');
  };

  // Robust Multi-dimensional Filtering
  const filteredInventory = inventory.filter(item => {
    // 1. Text Search Filter (name, barcode, variant, category)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const codeMatch = String(item.id || item.product_code || '').toLowerCase().includes(q);
      const variantMatch = (item.variant || '').toLowerCase().includes(q);
      const categoryMatch = (item.category || item.category_name || '').toLowerCase().includes(q);
      if (!nameMatch && !codeMatch && !variantMatch && !categoryMatch) {
        return false;
      }
    }

    // 2. Category Filter
    if (filterCategory !== 'All') {
      const itemCat = (item.category || item.category_name || '').toLowerCase();
      if (itemCat !== filterCategory.toLowerCase()) {
        return false;
      }
    }

    // 3. Stock Status Filter
    const stockNum = Number(item.stock || 0);
    if (filterStock === 'InStock' && stockNum <= 10) return false;
    if (filterStock === 'LowStock' && (stockNum <= 0 || stockNum > 10)) return false;
    if (filterStock === 'OutOfStock' && stockNum > 0) return false;

    // 4. Date Filter
    if (filterDate !== 'All Time') {
      const rawDate = item.dateAdded || item.date_added || item.createdAt || item.created_at;
      if (!rawDate) return false;
      
      const itemDate = new Date(rawDate);
      const now = new Date();

      if (filterDate === 'Today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        if (itemDate < todayStart || itemDate > todayEnd) return false;
      } else if (filterDate === 'Weekly') {
        const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
        if (itemDate < sevenDaysAgo) return false;
      } else if (filterDate === 'Monthly') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        if (itemDate < monthStart) return false;
      } else if (filterDate === 'Custom') {
        if (customDateRange.start) {
          const startD = new Date(customDateRange.start + 'T00:00:00');
          if (itemDate < startD) return false;
        }
        if (customDateRange.end) {
          const endD = new Date(customDateRange.end + 'T23:59:59');
          if (itemDate > endD) return false;
        }
      }
    }

    return true;
  });

  // Sorting Logic
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const dateA = new Date(a.dateAdded || a.date_added || 0).getTime();
    const dateB = new Date(b.dateAdded || b.date_added || 0).getTime();

    if (sortBy === 'newest') return dateB - dateA;
    if (sortBy === 'oldest') return dateA - dateB;
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'price_desc') return Number(b.price || 0) - Number(a.price || 0);
    if (sortBy === 'price_asc') return Number(a.price || 0) - Number(b.price || 0);
    if (sortBy === 'stock_desc') return Number(b.stock || 0) - Number(a.stock || 0);
    if (sortBy === 'stock_asc') return Number(a.stock || 0) - Number(b.stock || 0);
    return 0;
  });

  const totalItems = sortedInventory.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const totalValue = sortedInventory.reduce((sum, item) => sum + (Number(item.stock || 0) * Number(item.price || 0)), 0);

  const hasActiveFilters = searchTerm || filterCategory !== 'All' || filterStock !== 'All' || filterDate !== 'All Time' || sortBy !== 'newest';

  const formatProductDate = (dateVal) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Today, ${timeStr}`;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${timeStr}`;
    } catch {
      return String(dateVal);
    }
  };

  const handlePrintInventoryList = () => {
    const printContents = document.getElementById('printable-inventory-list').innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = '<div id="print-wrapper">' + printContents + '</div>';
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); 
  };

  return (
    <div className="inventory-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p className="text-muted">Manage your stock, categories, units, and generate barcodes.</p>
        </div>
        <div className="flex-align-gap">
          <button className="btn-outline flex-align-gap" onClick={handlePrintInventoryList}>
            <Printer size={18} /> Print List
          </button>
          <button className="btn-outline flex-align-gap" onClick={() => downloadAsPDF('printable-inventory-list', 'Inventory_List.pdf')}>
            <Download size={18} /> Download PDF
          </button>
          <button className="btn-primary flex-align-gap" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Top Filter & Category Controls */}
      <div className="card glass mb-4" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          
          {/* Search Bar */}
          <div className="search-bar" style={{ minWidth: '240px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search product, barcode, variant..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full"
              style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '500' }}
            >
              <option value="All">📂 All Categories ({inventory.length})</option>
              {allCategories.map((cat, idx) => {
                const count = inventory.filter(i => (i.category || i.category_name || '').toLowerCase() === cat.toLowerCase()).length;
                return (
                  <option key={idx} value={cat}>{cat} ({count})</option>
                );
              })}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div>
            <select 
              value={filterStock} 
              onChange={(e) => setFilterStock(e.target.value)}
              className="w-full"
              style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '500' }}
            >
              <option value="All">📊 All Stock Levels</option>
              <option value="InStock">🟢 In Stock (&gt; 10)</option>
              <option value="LowStock">🟡 Low Stock (1 - 10)</option>
              <option value="OutOfStock">🔴 Out of Stock (0)</option>
            </select>
          </div>

          {/* Date Added Filter */}
          <div>
            <select 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full"
              style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '500' }}
            >
              <option value="All Time">🗓️ All Time</option>
              <option value="Today">📅 Added Today</option>
              <option value="Weekly">📅 Last 7 Days</option>
              <option value="Monthly">📅 This Month</option>
              <option value="Custom">📅 Custom Date Range</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full"
              style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '500' }}
            >
              <option value="newest">⚡ Newest Added First</option>
              <option value="oldest">⏳ Oldest Added First</option>
              <option value="name_asc">🔤 Name (A - Z)</option>
              <option value="price_desc">💰 Price (High → Low)</option>
              <option value="price_asc">💰 Price (Low → High)</option>
              <option value="stock_desc">📦 Stock (High → Low)</option>
              <option value="stock_asc">📦 Stock (Low → High)</option>
            </select>
          </div>

        </div>

        {/* Custom Date Range & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          <div>
            {filterDate === 'Custom' ? (
              <div className="flex-align-gap" style={{ flexWrap: 'wrap' }}>
                <span className="text-sm font-bold text-muted">From:</span>
                <input 
                  type="date" 
                  style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                />
                <span className="text-sm font-bold text-muted">To:</span>
                <input 
                  type="date" 
                  style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                />
                {(!customDateRange.start && !customDateRange.end) && (
                  <span className="text-xs text-muted font-italic">(Select dates to filter)</span>
                )}
              </div>
            ) : (
              <div className="text-muted text-sm">
                Showing <strong>{sortedInventory.length}</strong> of <strong>{inventory.length}</strong> total products
              </div>
            )}
          </div>

          <div className="flex-align-gap" style={{ flexWrap: 'wrap' }}>
            {hasActiveFilters && (
              <button 
                type="button" 
                className="btn-outline flex-align-gap" 
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={handleResetFilters}
              >
                <RotateCcw size={14} /> Reset Filters
              </button>
            )}

            <button 
              type="button" 
              className="btn-outline flex-align-gap" 
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              onClick={() => setShowCatModal(true)}
            >
              <FolderPlus size={15} /> Manage Categories ({allCategories.length})
            </button>
            <button 
              type="button" 
              className="btn-outline flex-align-gap" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              onClick={() => setShowUnitModal(true)}
            >
              <Layers size={15} /> Manage Units ({allUnits.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="card glass">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID/Barcode</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Variant</th>
                <th>Unit</th>
                <th>Stock</th>
                <th>Price (BDT)</th>
                <th>Date Added</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInventory.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{item.id}</td>
                  <td style={{ fontWeight: '500' }}>{item.name}</td>
                  <td>
                    <span className="badge primary" style={{ fontSize: '0.8rem' }}>
                      {item.category || item.category_name || 'Hardware'}
                    </span>
                  </td>
                  <td>{item.variant || '-'}</td>
                  <td>{item.unit || 'Pcs'}</td>
                  <td>
                    <span className={`badge ৳{Number(item.stock) > 10 ? 'success' : Number(item.stock) > 0 ? 'warning' : 'danger'}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>{Number(item.price || 0).toLocaleString()}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {formatProductDate(item.dateAdded || item.date_added)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex-align-gap" style={{ justifyContent: 'center' }}>
                      <button type="button" className="btn-icon" title="Edit Product" onClick={(e) => { e.stopPropagation(); handleEditProductClick(item); }}>
                        <Edit size={16} color="var(--primary)" />
                      </button>
                      <button className="btn-icon" title="Print Barcode" onClick={() => handlePrintBarcode(item)}>
                        <Printer size={16} />
                      </button>
                      <button className="btn-icon" title="Delete Product" onClick={() => {
                        if (confirm(`Are you sure you want to delete ${item.name}?`)) {
                          deleteInventoryItem(item.id);
                        }
                      }}>
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedInventory.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem' }} className="text-muted">
                    No products match your search or filter criteria. Click "Reset Filters" to see all.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Area (Hidden on screen) */}
      <div id="printable-inventory-list" className="printable-only" style={{ display: 'none' }}>
        <InvoiceHeader />
        <div style={{ margin: '1.5rem 0', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>CURRENT INVENTORY STOCK REPORT</h2>
          <p className="text-muted">Date Generated: {new Date().toLocaleDateString()}</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Barcode / ID</th>
              <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Product Name</th>
              <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Category</th>
              <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Variant</th>
              <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>Stock</th>
              <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>Unit</th>
              <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>Price (BDT)</th>
              <th style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left'}}>Date Added</th>
            </tr>
          </thead>
          <tbody>
            {sortedInventory.map((item, idx) => (
              <tr key={idx}>
                <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{item.id}</td>
                <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{item.name}</td>
                <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{item.category}</td>
                <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{item.variant || '-'}</td>
                <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold'}}>{item.stock}</td>
                <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'center'}}>{item.unit}</td>
                <td style={{border: '1px solid #ccc', padding: '0.4rem', textAlign: 'right'}}>{Number(item.price || 0).toLocaleString()}</td>
                <td style={{border: '1px solid #ccc', padding: '0.4rem'}}>{formatProductDate(item.dateAdded || item.date_added)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderTop: '2px solid #333' }}>
          <div><strong>Total Products:</strong> {sortedInventory.length}</div>
          <div><strong>Total Stock Quantity:</strong> {totalItems}</div>
          <div><strong>Total Inventory Value:</strong> {totalValue.toLocaleString()}</div>
        </div>
        <PrintFooter />
      </div>

      {/* Barcode Drawer */}
      {showBarcodeModal && selectedProduct && createPortal(
        <div className="drawer-overlay" onClick={() => setShowBarcodeModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Print Barcodes</h2>
              <button className="drawer-close-btn" onClick={() => setShowBarcodeModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                <label className="text-muted text-sm block mb-1">Number of Barcodes to Print (Grid Layout)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 6, 12, 21, 30].map(qty => (
                    <button 
                      key={qty} 
                      className={`btn-outline ${printQuantity === qty ? 'active' : ''}`}
                      onClick={() => setPrintQuantity(qty)}
                      style={{ flex: 1, padding: '0.4rem', background: printQuantity === qty ? 'var(--primary)' : 'transparent', color: printQuantity === qty ? '#fff' : 'inherit' }}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              <div id="printable-barcode" style={{ padding: '1rem', background: '#fff', color: '#000', borderRadius: '8px', border: '1px dashed #ccc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {Array.from({ length: printQuantity }).map((_, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '5px', border: '1px dotted #aaa' }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold' }}>EHBL TOOLS</div>
                      <div style={{ fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '140px' }}>{selectedProduct.name}</div>
                      <Barcode value={selectedProduct.id} width={1.2} height={35} fontSize={10} margin={2} />
                      <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Price: {selectedProduct.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="drawer-footer" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button className="btn-outline" onClick={() => setShowBarcodeModal(false)}>Close</button>
              <button className="btn-primary flex-align-gap" onClick={() => {
                const printContents = document.getElementById('printable-barcode').innerHTML;
                const originalContents = document.body.innerHTML;
                document.body.innerHTML = '<div style="padding: 20px;">' + printContents + '</div>';
                window.print();
                document.body.innerHTML = originalContents;
                window.location.reload();
              }}>
                <Printer size={18} /> Print {printQuantity} Labels
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Product Drawer */}
      {showAddModal && createPortal(
        <div className="drawer-overlay" onClick={() => { setShowAddModal(false); navigate('/inventory'); }}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Add Product</h2>
              <button className="drawer-close-btn" onClick={() => { setShowAddModal(false); navigate('/inventory'); }}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="add-product-form" onSubmit={handleAddProduct}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1">Product ID / Barcode *</label>
                    <input 
                      type="text" 
                      className="w-full" 
                      value={newProduct.id} 
                      onChange={e => setNewProduct({...newProduct, id: e.target.value})} 
                      required 
                      placeholder="e.g. 10004 or Barcode Scan" 
                    />
                  </div>

                  <div>
                    <label className="text-muted text-sm block mb-1">Product Name *</label>
                    <input 
                      type="text" 
                      className="w-full" 
                      value={newProduct.name} 
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                      required 
                      placeholder="e.g. Bosch Impact Drill 13mm" 
                    />
                  </div>

                  {/* Category Field with Quick Add */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label className="text-muted text-sm">Category *</label>
                      <button 
                        type="button" 
                        className="text-primary text-sm font-bold" 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setIsCustomCategory(!isCustomCategory)}
                      >
                        {isCustomCategory ? '← Choose from List' : '➕ Type Category'}
                      </button>
                    </div>

                    {!isCustomCategory ? (
                      <select 
                        className="w-full" 
                        value={newProduct.category} 
                        onChange={e => {
                          if (e.target.value === '__NEW__') {
                            setIsCustomCategory(true);
                            setNewProduct({...newProduct, category: ''});
                          } else {
                            setNewProduct({...newProduct, category: e.target.value});
                          }
                        }}
                      >
                        {allCategories.map((catName, idx) => (
                          <option key={idx} value={catName}>{catName}</option>
                        ))}
                        <option value="__NEW__">➕ + Add Custom Category...</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="w-full" 
                          placeholder="Type new category name (e.g. Electrical Cables)" 
                          value={newProduct.category} 
                          onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                          required
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1">Unit</label>
                      <select 
                        className="w-full" 
                        value={newProduct.unit} 
                        onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                      >
                        {allUnits.map((u, idx) => (
                          <option key={idx} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-muted text-sm block mb-1">Variant (Optional)</label>
                      <input 
                        type="text" 
                        className="w-full" 
                        value={newProduct.variant} 
                        onChange={e => setNewProduct({...newProduct, variant: e.target.value})} 
                        placeholder="e.g. 13mm, 4 inch, Steel" 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1">Initial Stock</label>
                      <input 
                        type="number" 
                        className="w-full" 
                        min="0" 
                        value={newProduct.stock} 
                        onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})} 
                      />
                    </div>

                    <div>
                      <label className="text-muted text-sm block mb-1">Price (BDT)</label>
                      <input 
                        type="number" 
                        className="w-full" 
                        min="0" 
                        value={newProduct.price} 
                        onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => { setShowAddModal(false); navigate('/inventory'); }}>Cancel</button>
              <button type="submit" form="add-product-form" className="btn-primary flex-align-gap"><Plus size={18} /> Save Product</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Product Drawer */}
      {showEditModal && createPortal(
        <div className="drawer-overlay" onClick={() => setShowEditModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Edit Product</h2>
              <button className="drawer-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="drawer-body">
              <form id="edit-product-form" onSubmit={handleUpdateProduct}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1">Product ID / Barcode * (Cannot Change)</label>
                    <input 
                      type="text" 
                      className="w-full" 
                      value={editingProduct.id} 
                      disabled 
                      style={{ background: 'var(--bg-hover)' }}
                    />
                  </div>

                  <div>
                    <label className="text-muted text-sm block mb-1">Product Name *</label>
                    <input 
                      type="text" 
                      className="w-full" 
                      value={editingProduct.name} 
                      onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} 
                      required 
                    />
                  </div>

                  <div>
                    <label className="text-muted text-sm block mb-1">Variant / Size / Model (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full" 
                      value={editingProduct.variant} 
                      onChange={e => setEditingProduct({...editingProduct, variant: e.target.value})} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1">Category</label>
                      <select 
                        className="w-full" 
                        value={editingProduct.category}
                        onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                      >
                        {allCategories.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-muted text-sm block mb-1">Unit</label>
                      <select 
                        className="w-full" 
                        value={editingProduct.unit}
                        onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})}
                      >
                        {allUnits.map((u, idx) => <option key={idx} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-muted text-sm block mb-1">Opening Stock</label>
                      <input 
                        type="number" 
                        className="w-full" 
                        value={editingProduct.stock} 
                        onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} 
                      />
                    </div>
                    <div>
                      <label className="text-muted text-sm block mb-1">Selling Price (৳)</label>
                      <input 
                        type="number" 
                        className="w-full" 
                        value={editingProduct.price} 
                        onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} 
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" form="edit-product-form" className="btn-primary flex-align-gap"><Edit size={18} /> Update Product</button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* Category Management Modal Portal */}
      {showCatModal && createPortal(
        <div className="drawer-overlay" style={{ zIndex: 10000 }} onClick={() => setShowCatModal(false)}>
          <div 
            style={{ 
              maxWidth: '520px', 
              width: '90%', 
              margin: 'auto', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '16px', 
              boxShadow: 'var(--shadow-xl)', 
              padding: '1.75rem',
              position: 'relative'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div className="flex-align-gap">
                <FolderPlus size={24} color="var(--primary)" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Manage Product Categories</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowCatModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                className="w-full" 
                placeholder="Category Name (e.g. Electric Cables)" 
                value={newCatInput} 
                onChange={e => setNewCatInput(e.target.value)} 
                required 
                autoFocus
              />
              <button type="submit" className="btn-primary flex-align-gap" style={{ whiteSpace: 'nowrap' }}>
                <Plus size={16} /> Add
              </button>
            </form>

            <label className="text-muted text-sm block mb-2 font-bold">Existing Categories ({allCategories.length}):</label>
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', background: 'var(--bg-hover)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {allCategories.map((cat, idx) => (
                  <span 
                    key={idx} 
                    className="badge primary" 
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Tag size={12} /> {cat}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={() => setShowCatModal(false)}>Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unit Management Modal Portal */}
      {showUnitModal && createPortal(
        <div className="drawer-overlay" style={{ zIndex: 10000 }} onClick={() => setShowUnitModal(false)}>
          <div 
            style={{ 
              maxWidth: '520px', 
              width: '90%', 
              margin: 'auto', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '16px', 
              boxShadow: 'var(--shadow-xl)', 
              padding: '1.75rem',
              position: 'relative'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div className="flex-align-gap">
                <Layers size={24} color="var(--warning)" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Manage Product Units</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowUnitModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                className="w-full" 
                placeholder="Unit (e.g. Coil, Bundle, Drum)" 
                value={newUnitInput} 
                onChange={e => setNewUnitInput(e.target.value)} 
                required 
                autoFocus
              />
              <button type="submit" className="btn-primary flex-align-gap" style={{ whiteSpace: 'nowrap' }}>
                <Plus size={16} /> Add
              </button>
            </form>

            <label className="text-muted text-sm block mb-2 font-bold">Existing Units ({allUnits.length}):</label>
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', background: 'var(--bg-hover)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {allUnits.map((u, idx) => (
                  <span 
                    key={idx} 
                    className="badge warning" 
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '20px' }}
                  >
                    📦 {u}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={() => setShowUnitModal(false)}>Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Inventory;
