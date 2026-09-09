import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { Plus, Search, Printer, Trash2, FolderPlus, Layers, X, RotateCcw, Calendar, Edit, Check } from 'lucide-react';
import useStore from '../store/useStore';
import PrintableInventory from '../components/PrintableInventory';
import { confirmDialog } from '../utils/swal';
import { printElement } from '../utils/printElement';
import './Inventory.css';

// Suggestions the dropdowns fall back on for a fresh install. They are not
// database rows, so they cannot be renamed or deleted until the shop adds one
// to its own list - the manage dialogs offer exactly that rather than showing
// buttons that would fail.
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

const money = (value) => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const Inventory = () => {
  const {
    inventory, categories, units,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    addCategory, updateCategory, deleteCategory,
    addUnit, updateUnit, deleteUnit,
    showToast,
  } = useStore();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStock, setFilterStock] = useState('All');
  const [filterDate, setFilterDate] = useState('All Time');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('newest');

  // Modals & Drawers State
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [printQuantity, setPrintQuantity] = useState(21);
  const [editingProduct, setEditingProduct] = useState({
    id: '', name: '', category: 'Power Tools', unit: 'Pcs', variant: '', stock: 0, price: 0, purchasePrice: 0
  });

  // New Category / Unit Inputs
  const [newCatInput, setNewCatInput] = useState('');
  const [newUnitInput, setNewUnitInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Which catalogue row is being renamed, and the name being typed into it.
  const [editingCat, setEditingCat] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  const [newProduct, setNewProduct] = useState({
    id: '', name: '', category: 'Power Tools', unit: 'Pcs', variant: '', stock: 0, price: 0, purchasePrice: 0
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

  // Rows that came from the server: these are the ones that can be renamed or
  // deleted. Anything else on the list is one of the built-in suggestions.
  const savedCategories = (categories || []).filter(c => c && typeof c === 'object' && c.id);
  const savedUnits = (units || []).filter(u => u && typeof u === 'object' && u.id);

  const savedCatNames = savedCategories.map(c => c.name);
  const savedUnitNames = savedUnits.map(u => u.name);

  const builtInCategories = defaultCategories.filter(c => !savedCatNames.includes(c));
  const builtInUnits = defaultUnits.filter(u => !savedUnitNames.includes(u));

  // Merged lists drive the dropdowns and the category filter.
  const allCategories = Array.from(new Set([
    ...defaultCategories,
    ...(categories || []).map(c => typeof c === 'string' ? c : c.name).filter(Boolean)
  ]));

  const allUnits = Array.from(new Set([
    ...defaultUnits,
    ...(units || []).map(u => typeof u === 'string' ? u : u.name).filter(Boolean)
  ]));

  const countProductsIn = (categoryName) =>
    inventory.filter(i => (i.category || i.category_name || '').toLowerCase() === categoryName.toLowerCase()).length;

  const countProductsWithUnit = (unitName) =>
    inventory.filter(i => (i.unit || '').toLowerCase() === unitName.toLowerCase()).length;

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
    setNewProduct({ id: '', name: '', category: 'Power Tools', unit: 'Pcs', variant: '', stock: 0, price: 0, purchasePrice: 0 });
    setIsCustomCategory(false);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const result = await addCategory(newCatInput.trim());
    if (result?.success === false) {
      showToast(result.error, 'error');
      return;
    }
    setNewCatInput('');
  };

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!newUnitInput.trim()) return;
    const result = await addUnit(newUnitInput.trim());
    if (result?.success === false) {
      showToast(result.error, 'error');
      return;
    }
    setNewUnitInput('');
  };

  const adoptBuiltIn = async (kind, name) => {
    const result = kind === 'category' ? await addCategory(name) : await addUnit(name);
    showToast(
      result?.success === false
        ? result.error
        : `"${name}" added to your list. You can rename or delete it now.`,
      result?.success === false ? 'error' : 'success'
    );
  };

  const startRename = (kind, row) => {
    setRenameInput(row.name);
    if (kind === 'category') {
      setEditingCat(row.id);
      setEditingUnit(null);
    } else {
      setEditingUnit(row.id);
      setEditingCat(null);
    }
  };

  const cancelRename = () => {
    setEditingCat(null);
    setEditingUnit(null);
    setRenameInput('');
  };

  const saveRename = async (kind, row) => {
    const name = renameInput.trim();
    if (!name || name === row.name) {
      cancelRename();
      return;
    }
    const result = kind === 'category'
      ? await updateCategory(row.id, name)
      : await updateUnit(row.id, name);

    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }
    showToast(
      `Renamed to "${name}". Products using it were updated too.`,
      'success'
    );
    cancelRename();
  };

  const handleDeleteCatalogueRow = async (kind, row) => {
    const inUse = kind === 'category' ? countProductsIn(row.name) : countProductsWithUnit(row.name);
    const label = kind === 'category' ? 'Category' : 'Unit';

    if (inUse > 0) {
      showToast(
        `"${row.name}" is used by ${inUse} product${inUse === 1 ? '' : 's'}. Move them first.`,
        'error'
      );
      return;
    }

    const isConfirmed = await confirmDialog({
      title: `Delete ${label} "${row.name}"?`,
      text: 'This cannot be undone.',
      icon: 'warning',
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    });
    if (!isConfirmed) return;

    const result = kind === 'category' ? await deleteCategory(row.id) : await deleteUnit(row.id);
    showToast(
      result.success ? `${label} "${row.name}" deleted.` : result.error,
      result.success ? 'success' : 'error'
    );
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
    // 1. Text Search Filter (name, barcode, size, category)
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

  const stockState = (stock) => {
    const n = Number(stock || 0);
    if (n > 10) return 'in';
    if (n > 0) return 'low';
    return 'out';
  };

  /** One row of the manage-catalogue dialogs. */
  const CatalogueRow = ({ kind, row, count, editingId }) => {
    const isEditing = editingId === row.id;
    return (
      <li className="inv-cat-row">
        {isEditing ? (
          <form
            className="inv-cat-rename"
            onSubmit={(e) => { e.preventDefault(); saveRename(kind, row); }}
          >
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') cancelRename(); }}
            />
            <button type="submit" className="inv-iconbtn" title="Save name"><Check size={15} /></button>
            <button type="button" className="inv-iconbtn" title="Cancel" onClick={cancelRename}><X size={15} /></button>
          </form>
        ) : (
          <>
            <span className="inv-cat-name">{row.name}</span>
            <span className="inv-cat-count">
              {count} product{count === 1 ? '' : 's'}
            </span>
            <button type="button" className="inv-iconbtn" title="Rename" onClick={() => startRename(kind, row)}>
              <Edit size={15} />
            </button>
            <button
              type="button"
              className="inv-iconbtn inv-iconbtn--danger"
              title={count > 0 ? 'In use by products' : 'Delete'}
              disabled={count > 0}
              onClick={() => handleDeleteCatalogueRow(kind, row)}
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="inventory-page">
      <header className="inv-header">
        <div>
          <h1>Inventory</h1>
          <p>Manage stock, categories and units, and print barcodes or a stock report.</p>
        </div>
        <div className="inv-header__actions">
          <button type="button" className="inv-btn" onClick={() => printElement('printable-inventory-list')}>
            <Printer size={16} /> Print Stock Report
          </button>
          <button type="button" className="inv-btn inv-btn--primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="inv-panel inv-filters">
        <div className="inv-filtergrid">
          <div className="inv-field inv-f-search">
            <label htmlFor="inv-search">Search</label>
            <div className="inv-search">
              <Search size={15} />
              <input
                id="inv-search"
                type="text"
                placeholder="Product name, barcode, size or category"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="inv-field">
            <label htmlFor="inv-cat">Category</label>
            <select id="inv-cat" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="All">All categories ({inventory.length})</option>
              {allCategories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat} ({countProductsIn(cat)})</option>
              ))}
            </select>
          </div>

          <div className="inv-field">
            <label htmlFor="inv-stock">Stock level</label>
            <select id="inv-stock" value={filterStock} onChange={(e) => setFilterStock(e.target.value)}>
              <option value="All">All stock levels</option>
              <option value="InStock">In stock (more than 10)</option>
              <option value="LowStock">Low stock (1 - 10)</option>
              <option value="OutOfStock">Out of stock (0)</option>
            </select>
          </div>

          <div className="inv-field">
            <label htmlFor="inv-date">Date added</label>
            <select id="inv-date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
              <option value="All Time">All time</option>
              <option value="Today">Added today</option>
              <option value="Weekly">Last 7 days</option>
              <option value="Monthly">This month</option>
              <option value="Custom">Custom date range</option>
            </select>
          </div>

          <div className="inv-field">
            <label htmlFor="inv-sort">Sort by</label>
            <select id="inv-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest added first</option>
              <option value="oldest">Oldest added first</option>
              <option value="name_asc">Name (A - Z)</option>
              <option value="price_desc">Sale rate (high to low)</option>
              <option value="price_asc">Sale rate (low to high)</option>
              <option value="stock_desc">Stock (high to low)</option>
              <option value="stock_asc">Stock (low to high)</option>
            </select>
          </div>

          {filterDate === 'Custom' && (
            <>
              <div className="inv-field">
                <label htmlFor="inv-from">From</label>
                <input
                  id="inv-from"
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                />
              </div>
              <div className="inv-field">
                <label htmlFor="inv-to">To</label>
                <input
                  id="inv-to"
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                />
              </div>
            </>
          )}
        </div>

        <div className="inv-filterbar">
          <div className="inv-filterbar__left">
            <span className="inv-showing">
              Showing <strong>{sortedInventory.length}</strong> of <strong>{inventory.length}</strong> products
            </span>
            {hasActiveFilters && (
              <button type="button" className="inv-btn inv-btn--link" onClick={handleResetFilters}>
                <RotateCcw size={14} /> Reset filters
              </button>
            )}
          </div>

          <div className="inv-filterbar__right">
            <button type="button" className="inv-btn" onClick={() => setShowCatModal(true)}>
              <FolderPlus size={15} /> Categories ({allCategories.length})
            </button>
            <button type="button" className="inv-btn" onClick={() => setShowUnitModal(true)}>
              <Layers size={15} /> Units ({allUnits.length})
            </button>
          </div>
        </div>
      </section>

      {/* Product table */}
      <section className="inv-panel">
        <div className="inv-panel__head">
          <h2>Products</h2>
          <dl className="inv-figures">
            <div>
              <dt>Products</dt>
              <dd>{sortedInventory.length}</dd>
            </div>
            <div>
              <dt>Total Stock</dt>
              <dd>{totalItems}</dd>
            </div>
            <div>
              <dt>Stock Value</dt>
              <dd>&#2547;{money(totalValue)}</dd>
            </div>
          </dl>
        </div>

        <div className="inv-tablewrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th scope="col" className="is-center inv-sl">SL</th>
                <th scope="col">ID / Barcode</th>
                <th scope="col">Product Name</th>
                <th scope="col">Category</th>
                <th scope="col">Size</th>
                <th scope="col">Unit</th>
                <th scope="col" className="is-num">Stock</th>
                <th scope="col" className="is-num">Purchase Rate</th>
                <th scope="col" className="is-num">Sale Rate</th>
                <th scope="col">Date Added</th>
                <th scope="col" className="is-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInventory.map((item, index) => (
                <tr key={item.id}>
                  <td className="is-center inv-sl">{index + 1}</td>
                  <td className="is-code">{item.id}</td>
                  <td className="is-strong">{item.name}</td>
                  <td>
                    <span className="inv-tag">{item.category || item.category_name || 'Hardware'}</span>
                  </td>
                  <td>{item.variant || '-'}</td>
                  <td>{item.unit || 'Pcs'}</td>
                  <td className="is-num">
                    <span className={`inv-stock inv-stock--${stockState(item.stock)}`}>{item.stock}</span>
                  </td>
                  <td className="is-num">{money(item.purchasePrice)}</td>
                  <td className="is-num is-strong">{money(item.price)}</td>
                  <td className="inv-date">
                    <Calendar size={12} /> {formatProductDate(item.dateAdded || item.date_added)}
                  </td>
                  <td className="is-center">
                    <div className="inv-rowactions">
                      <button
                        type="button"
                        className="inv-iconbtn"
                        title="Edit product"
                        onClick={(e) => { e.stopPropagation(); handleEditProductClick(item); }}
                      >
                        <Edit size={15} />
                      </button>
                      <button type="button" className="inv-iconbtn" title="Print barcode" onClick={() => handlePrintBarcode(item)}>
                        <Printer size={15} />
                      </button>
                      <button
                        type="button"
                        className="inv-iconbtn inv-iconbtn--danger"
                        title="Delete product"
                        onClick={async () => {
                          const isConfirmed = await confirmDialog({
                            title: `Delete Product ${item.name}?`,
                            text: `Are you sure you want to delete ${item.name}? This cannot be undone.`,
                            icon: 'warning',
                            confirmButtonText: 'Yes, Delete',
                            confirmButtonColor: '#ef4444'
                          });
                          if (isConfirmed) {
                            deleteInventoryItem(item.id);
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedInventory.length === 0 && (
                <tr>
                  <td colSpan="11" className="inv-empty">
                    No products match the current search or filters.
                  </td>
                </tr>
              )}
            </tbody>
            {sortedInventory.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6}>Total of {sortedInventory.length} product{sortedInventory.length === 1 ? '' : 's'}</td>
                  <td className="is-num">{totalItems}</td>
                  <td colSpan={2} className="is-num">&#2547;{money(totalValue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Printable stock report (hidden on screen) */}
      <div style={{ display: 'none' }}>
        <div id="printable-inventory-list">
          <PrintableInventory
            items={sortedInventory}
            filters={{
              Search: searchTerm,
              Category: filterCategory,
              Stock: filterStock,
              Added: filterDate,
            }}
          />
        </div>
      </div>

      {/* Barcode Modal */}
      {showBarcodeModal && selectedProduct && createPortal(
        <div className="inv-modal-overlay" onClick={() => setShowBarcodeModal(false)}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Print barcodes">
            <div className="inv-modal__head">
              <h2>Print Barcodes &middot; {selectedProduct.name}</h2>
              <button type="button" className="inv-iconbtn" onClick={() => setShowBarcodeModal(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="inv-modal__body">
              <div className="inv-field" style={{ marginBottom: '1rem' }}>
                <label>Number of labels</label>
                <div className="inv-qtypick">
                  {[1, 6, 12, 21, 30].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      className={`inv-btn ${printQuantity === qty ? 'inv-btn--primary' : ''}`}
                      onClick={() => setPrintQuantity(qty)}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              <div id="printable-barcode" style={{ padding: '1rem', background: '#fff', color: '#000' }}>
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

            <div className="inv-modal__foot">
              <button type="button" className="inv-btn" onClick={() => setShowBarcodeModal(false)}>Close</button>
              <button type="button" className="inv-btn inv-btn--primary" onClick={() => printElement('printable-barcode')}>
                <Printer size={16} /> Print {printQuantity} Labels
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Product */}
      {showAddModal && createPortal(
        <div className="inv-modal-overlay" onClick={() => { setShowAddModal(false); navigate('/inventory'); }}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add product">
            <div className="inv-modal__head">
              <h2>Add Product</h2>
              <button type="button" className="inv-iconbtn" onClick={() => { setShowAddModal(false); navigate('/inventory'); }} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="inv-modal__body">
              <form id="add-product-form" onSubmit={handleAddProduct}>
                <div className="inv-formgrid">
                  <div className="inv-field inv-col-6">
                    <label htmlFor="add-id">Product ID / Barcode *</label>
                    <input
                      id="add-id"
                      type="text"
                      value={newProduct.id}
                      onChange={e => setNewProduct({ ...newProduct, id: e.target.value })}
                      required
                      placeholder="e.g. 10004 or scan a barcode"
                    />
                  </div>

                  <div className="inv-field inv-col-6">
                    <label htmlFor="add-name">Product Name *</label>
                    <input
                      id="add-name"
                      type="text"
                      value={newProduct.name}
                      onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                      required
                      placeholder="e.g. Bosch Impact Drill 13mm"
                    />
                  </div>

                  <div className="inv-field inv-col-6">
                    <div className="inv-labelrow">
                      <label htmlFor="add-cat">Category *</label>
                      <button type="button" className="inv-btn inv-btn--link" onClick={() => setIsCustomCategory(!isCustomCategory)}>
                        {isCustomCategory ? 'Choose from list' : 'Type a new one'}
                      </button>
                    </div>

                    {!isCustomCategory ? (
                      <select
                        id="add-cat"
                        value={newProduct.category}
                        onChange={e => {
                          if (e.target.value === '__NEW__') {
                            setIsCustomCategory(true);
                            setNewProduct({ ...newProduct, category: '' });
                          } else {
                            setNewProduct({ ...newProduct, category: e.target.value });
                          }
                        }}
                      >
                        {allCategories.map((catName, idx) => (
                          <option key={idx} value={catName}>{catName}</option>
                        ))}
                        <option value="__NEW__">+ Add custom category...</option>
                      </select>
                    ) : (
                      <input
                        id="add-cat"
                        type="text"
                        placeholder="e.g. Electrical Cables"
                        value={newProduct.category}
                        onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                        required
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="inv-field inv-col-3">
                    <label htmlFor="add-unit">Unit</label>
                    <select
                      id="add-unit"
                      value={newProduct.unit}
                      onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                    >
                      {allUnits.map((u, idx) => (
                        <option key={idx} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="inv-field inv-col-3">
                    <label htmlFor="add-size">Size (Optional)</label>
                    <input
                      id="add-size"
                      type="text"
                      value={newProduct.variant}
                      onChange={e => setNewProduct({ ...newProduct, variant: e.target.value })}
                      placeholder="e.g. 13mm, 4 inch, XL"
                    />
                  </div>

                  <div className="inv-field inv-col-4">
                    <label htmlFor="add-stock">Initial Stock</label>
                    <input
                      id="add-stock"
                      type="number"
                      min="0"
                      value={newProduct.stock}
                      onChange={e => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="inv-field inv-col-4">
                    <label htmlFor="add-purchase">Purchase Rate</label>
                    <input
                      id="add-purchase"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProduct.purchasePrice}
                      onChange={e => setNewProduct({ ...newProduct, purchasePrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="inv-field inv-col-4">
                    <label htmlFor="add-sale">Sale Rate</label>
                    <input
                      id="add-sale"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProduct.price}
                      onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="inv-modal__foot">
              <button type="button" className="inv-btn" onClick={() => { setShowAddModal(false); navigate('/inventory'); }}>Cancel</button>
              <button type="submit" form="add-product-form" className="inv-btn inv-btn--primary">
                <Plus size={16} /> Save Product
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Product */}
      {showEditModal && createPortal(
        <div className="inv-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Edit product">
            <div className="inv-modal__head">
              <h2>Edit Product &middot; {editingProduct.id}</h2>
              <button type="button" className="inv-iconbtn" onClick={() => setShowEditModal(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="inv-modal__body">
              <form id="edit-product-form" onSubmit={handleUpdateProduct}>
                <div className="inv-formgrid">
                  <div className="inv-field inv-col-6">
                    <label htmlFor="edit-id">Product ID / Barcode</label>
                    <input id="edit-id" type="text" value={editingProduct.id} disabled />
                    <span className="inv-hint">The code cannot be changed once the product exists.</span>
                  </div>

                  <div className="inv-field inv-col-6">
                    <label htmlFor="edit-name">Product Name *</label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editingProduct.name}
                      onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="inv-field inv-col-6">
                    <label htmlFor="edit-cat">Category</label>
                    <select
                      id="edit-cat"
                      value={editingProduct.category}
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    >
                      {allCategories.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="inv-field inv-col-3">
                    <label htmlFor="edit-unit">Unit</label>
                    <select
                      id="edit-unit"
                      value={editingProduct.unit}
                      onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    >
                      {allUnits.map((u, idx) => <option key={idx} value={u}>{u}</option>)}
                    </select>
                  </div>

                  <div className="inv-field inv-col-3">
                    <label htmlFor="edit-size">Size (Optional)</label>
                    <input
                      id="edit-size"
                      type="text"
                      value={editingProduct.variant}
                      onChange={e => setEditingProduct({ ...editingProduct, variant: e.target.value })}
                      placeholder="e.g. 13mm, 4 inch, XL"
                    />
                  </div>

                  <div className="inv-field inv-col-4">
                    <label htmlFor="edit-stock">Opening Stock</label>
                    <input
                      id="edit-stock"
                      type="number"
                      value={editingProduct.stock}
                      onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="inv-field inv-col-4">
                    <label htmlFor="edit-purchase">Purchase Rate</label>
                    <input
                      id="edit-purchase"
                      type="number"
                      step="0.01"
                      value={editingProduct.purchasePrice}
                      onChange={e => setEditingProduct({ ...editingProduct, purchasePrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="inv-field inv-col-4">
                    <label htmlFor="edit-sale">Sale Rate</label>
                    <input
                      id="edit-sale"
                      type="number"
                      step="0.01"
                      value={editingProduct.price}
                      onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="inv-modal__foot">
              <button type="button" className="inv-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" form="edit-product-form" className="inv-btn inv-btn--primary">
                <Edit size={16} /> Update Product
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Manage Categories */}
      {showCatModal && createPortal(
        <div className="inv-modal-overlay" onClick={() => { setShowCatModal(false); cancelRename(); }}>
          <div className="inv-modal inv-modal--narrow" onClick={e => e.stopPropagation()} role="dialog" aria-label="Manage categories">
            <div className="inv-modal__head">
              <h2>Manage Categories</h2>
              <button type="button" className="inv-iconbtn" onClick={() => { setShowCatModal(false); cancelRename(); }} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="inv-modal__body">
              <form onSubmit={handleCreateCategory} className="inv-addrow">
                <input
                  type="text"
                  placeholder="New category name, e.g. Electrical Cables"
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  required
                />
                <button type="submit" className="inv-btn inv-btn--primary"><Plus size={16} /> Add</button>
              </form>

              <h3 className="inv-subhead">Your categories ({savedCategories.length})</h3>
              {savedCategories.length === 0 ? (
                <p className="inv-hint">Nothing added yet. Categories you create appear here and can be renamed or deleted.</p>
              ) : (
                <ul className="inv-cat-list">
                  {savedCategories.map(row => (
                    <CatalogueRow
                      key={row.id}
                      kind="category"
                      row={row}
                      count={countProductsIn(row.name)}
                      editingId={editingCat}
                    />
                  ))}
                </ul>
              )}

              {builtInCategories.length > 0 && (
                <>
                  <h3 className="inv-subhead">Built-in suggestions ({builtInCategories.length})</h3>
                  <p className="inv-hint">
                    These ship with the app rather than living in the database. Add one to your list to
                    make it a real record you can rename or delete.
                  </p>
                  <ul className="inv-cat-list inv-cat-list--muted">
                    {builtInCategories.map((name, idx) => (
                      <li className="inv-cat-row" key={idx}>
                        <span className="inv-cat-name">{name}</span>
                        <span className="inv-cat-count">{countProductsIn(name)} products</span>
                        <button
                          type="button"
                          className="inv-btn inv-btn--link"
                          onClick={() => adoptBuiltIn('category', name)}
                        >
                          Add to my list
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="inv-modal__foot">
              <button type="button" className="inv-btn inv-btn--primary" onClick={() => { setShowCatModal(false); cancelRename(); }}>Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Manage Units */}
      {showUnitModal && createPortal(
        <div className="inv-modal-overlay" onClick={() => { setShowUnitModal(false); cancelRename(); }}>
          <div className="inv-modal inv-modal--narrow" onClick={e => e.stopPropagation()} role="dialog" aria-label="Manage units">
            <div className="inv-modal__head">
              <h2>Manage Units</h2>
              <button type="button" className="inv-iconbtn" onClick={() => { setShowUnitModal(false); cancelRename(); }} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="inv-modal__body">
              <form onSubmit={handleCreateUnit} className="inv-addrow">
                <input
                  type="text"
                  placeholder="New unit, e.g. Coil, Bundle, Drum"
                  value={newUnitInput}
                  onChange={e => setNewUnitInput(e.target.value)}
                  required
                />
                <button type="submit" className="inv-btn inv-btn--primary"><Plus size={16} /> Add</button>
              </form>

              <h3 className="inv-subhead">Your units ({savedUnits.length})</h3>
              {savedUnits.length === 0 ? (
                <p className="inv-hint">Nothing added yet. Units you create appear here and can be renamed or deleted.</p>
              ) : (
                <ul className="inv-cat-list">
                  {savedUnits.map(row => (
                    <CatalogueRow
                      key={row.id}
                      kind="unit"
                      row={row}
                      count={countProductsWithUnit(row.name)}
                      editingId={editingUnit}
                    />
                  ))}
                </ul>
              )}

              {builtInUnits.length > 0 && (
                <>
                  <h3 className="inv-subhead">Built-in suggestions ({builtInUnits.length})</h3>
                  <p className="inv-hint">
                    These ship with the app rather than living in the database. Add one to your list to
                    make it a real record you can rename or delete.
                  </p>
                  <ul className="inv-cat-list inv-cat-list--muted">
                    {builtInUnits.map((name, idx) => (
                      <li className="inv-cat-row" key={idx}>
                        <span className="inv-cat-name">{name}</span>
                        <span className="inv-cat-count">{countProductsWithUnit(name)} products</span>
                        <button
                          type="button"
                          className="inv-btn inv-btn--link"
                          onClick={() => adoptBuiltIn('unit', name)}
                        >
                          Add to my list
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="inv-modal__foot">
              <button type="button" className="inv-btn inv-btn--primary" onClick={() => { setShowUnitModal(false); cancelRename(); }}>Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Inventory;
