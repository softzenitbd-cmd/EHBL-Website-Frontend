import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Search, Plus, Minus, Trash2, Gift, Database, List, Printer, Eye, Users, FileEdit, X, Lock, CreditCard, CheckCircle } from 'lucide-react';
import InvoiceHeader from '../components/InvoiceHeader';
import PrintableInvoice from '../components/PrintableInvoice';
import PrintFooter from '../components/PrintFooter';
import { confirmDialog } from '../utils/swal';
import { printElement } from '../utils/printElement';
import './POS.css';

const POS = () => {
  const {
    cart,
    inventory,
    staff,
    user,
    customers,
    fetchAllData,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    loadDummyData,
    processSale,
    updateSale,
    lockSale,
    paySaleInvoice,
    sales,
    showToast,
    deleteSale
  } = useStore();

  const [activeTab, setActiveTab] = useState('New'); // 'New' or 'History'

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetchAllData) {
      fetchAllData();
    }
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'add') {
      setActiveTab('New');
    } else {
      setActiveTab('History');
    }
  }, [location.search]);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchContainerRef = useRef(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products by Name, Barcode/Product Code, Category, Variant
  const searchResults = useMemo(() => {
    const term = barcodeInput.trim().toLowerCase();
    if (!term) return [];
    return inventory.filter(p => {
      const name = String(p.name || '').toLowerCase();
      const code = String(p.product_code || p.id || '').toLowerCase();
      const category = String(p.category || p.category_name || '').toLowerCase();
      const variant = String(p.variant || '').toLowerCase();
      return name.includes(term) || code.includes(term) || category.includes(term) || variant.includes(term);
    }).slice(0, 10);
  }, [inventory, barcodeInput]);

  const handleSelectProduct = (product) => {
    addToCart({ ...product, isGift: false, itemDiscount: 0 });
    showToast(`Added "${product.name}" to invoice`, 'success');
    setBarcodeInput('');
    setShowSearchDropdown(false);
    document.getElementById('barcode-input')?.focus();
  };

  const handleSearchKeyDown = (e) => {
    if (!showSearchDropdown || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const term = barcodeInput.trim();
    if (!term) return;

    // Check if an item is selected via keyboard in dropdown
    if (searchResults.length > 0 && activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
      handleSelectProduct(searchResults[activeSearchIndex]);
      return;
    }

    // Direct exact or partial search
    const product = inventory.find(p =>
      String(p.id || '').toLowerCase() === term.toLowerCase() ||
      String(p.product_code || '').toLowerCase() === term.toLowerCase() ||
      String(p.name || '').toLowerCase() === term.toLowerCase()
    ) || searchResults[0];

    if (product) {
      handleSelectProduct(product);
    } else {
      showToast('Product not found!', 'error');
    }
  };

  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', location: '' });
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState(null);
  const customerContainerRef = useRef(null);

  // Close customer dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerContainerRef.current && !customerContainerRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers by Name, Phone, Location, Customer Code
  const filteredCustomers = useMemo(() => {
    const term = customerSearchTerm.trim().toLowerCase();
    const list = customers || [];
    if (!term) return list.slice(0, 10);
    return list.filter(c => {
      const name = String(c.name || '').toLowerCase();
      const phone = String(c.phone || '').toLowerCase();
      const location = String(c.location || '').toLowerCase();
      const code = String(c.customer_code || c.id || '').toLowerCase();
      return name.includes(term) || phone.includes(term) || location.includes(term) || code.includes(term);
    }).slice(0, 15);
  }, [customers, customerSearchTerm]);

  const handleSelectCustomer = (c) => {
    setSelectedCustomerObj(c);
    setCustomerSearchTerm(c.name);
    setCustomerInfo({
      name: c.name,
      phone: c.phone || '',
      location: c.location || '',
      customerId: c.id || c.customer_code,
      due: c.due
    });
    setShowCustomerDropdown(false);
  };

  const handleCustomerSearchInputChange = (value) => {
    setCustomerSearchTerm(value);
    setShowCustomerDropdown(true);
    setCustomerInfo(prev => ({
      ...prev,
      name: value
    }));
    if (selectedCustomerObj && selectedCustomerObj.name.toLowerCase() !== value.trim().toLowerCase()) {
      setSelectedCustomerObj(null);
    }
  };

  const [groupByParty, setGroupByParty] = useState(false);

  // Payment is strictly Due (Baki)
  const paymentType = 'Baki';
  // The salesman is whoever is logged in - not a choice. A staff login is
  // matched to its Staff record through the username the account was created
  // with; anything else (the admin account) is recorded as "Admin" under the
  // user's own name and phone.
  const currentSalesman = (() => {
    const uname = String(user?.username || '').toLowerCase();
    const linked = uname ? staff.find(st => String(st.username || '').toLowerCase() === uname) : null;
    if (linked) {
      return { id: linked.id, name: linked.name, phone: linked.phone || user?.phone || '' };
    }
    const display = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
      || user?.username || 'Admin';
    return { id: 'Admin', name: display, phone: user?.phone || '' };
  })();
  const [completedSale, setCompletedSale] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Invoice State
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // History State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState({
    show: false,
    invoice: null,
    amount: '',
    method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const filteredSales = sales.filter(s => {
    if (!startDate && !endDate) return true;
    const sDate = s.date.split('T')[0];
    if (startDate && sDate < startDate) return false;
    if (endDate && sDate > endDate) return false;
    return true;
  });

  const partyGroups = useMemo(() => {
    const groups = new Map();
    filteredSales.forEach((row) => {
      const party = String(row.customerName || '').trim() || 'Walk-in';
      if (!groups.has(party)) groups.set(party, []);
      groups.get(party).push(row);
    });
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredSales]);

  // Automatically focus barcode input on mount
  useEffect(() => {
    document.getElementById('barcode-input')?.focus();
  }, []);

  const toggleGift = (item) => {
    updateCartItem(item.id, { isGift: !item.isGift });
  };

  // No discount calculation on invoice
  // Qty and rate are typed straight into the cart now and may be blank for a
  // moment mid-edit, so both are read through Number() here.
  const subtotal = cart.reduce((acc, item) => {
    const effectivePrice = item.isGift ? 0 : (Number(item.price) || 0);
    return acc + (effectivePrice * (Number(item.quantity) || 0));
  }, 0);

  const total = subtotal;

  const handleDeleteSale = async (sale) => {
    const isConfirmed = await confirmDialog({
      title: `Delete Invoice ${sale.id}?`,
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
          <div><strong>Customer:</strong> ${sale.customerName || 'N/A'}</div>
          <div><strong>Total:</strong> ৳${Number(sale.total || 0).toLocaleString()}</div>
          <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.85rem;">
            The sold items will return to stock${Number(sale.due_amount || 0) > 0 ? ` and ৳${Number(sale.due_amount).toLocaleString()} will be removed from customer due.` : '.'}
          </div>
          <div style="margin-top: 0.35rem; color: #ef4444; font-weight: 600; font-size: 0.85rem;">
            This action cannot be undone.
          </div>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444'
    });
    if (!isConfirmed) return;

    const result = await deleteSale(sale.id);
    showToast(
      result.success ? `Invoice ${sale.id} deleted and stock reversed.` : `Invoice was not deleted: ${result.error}`,
      result.success ? 'success' : 'error'
    );
  };

  const handleCheckout = async () => {
    if (!customerInfo.name) {
      showToast('Customer Name is explicitly required for all invoices!', 'error');
      return;
    }

    const salesmanObj = currentSalesman;
    const saleData = {
      // The typed-in rate is what the line sells at; a blank box that was
      // never blurred still has to leave as a number.
      cartItems: cart.map(item => ({
        ...item,
        price: Number(item.price) || 0,
        quantity: Math.max(1, Number(item.quantity) || 1),
        itemDiscount: 0
      })),
      paymentType: 'Baki', // Strictly Due
      customerInfo,
      invoiceDiscount: 0,  // No discount
      salesman: salesmanObj
    };

    setIsSaving(true);
    const result = await processSale(saleData);
    setIsSaving(false);

    if (!result.success) {
      showToast(`Invoice was not saved: ${result.error}`, 'error');
      return;
    }

    setCompletedSale(result.data);
    const invoiceNo = result.data?.invoice_number || result.data?.id || '';
    showToast(
      invoiceNo ? `Invoice saved: ${invoiceNo}` : 'Invoice completed successfully!',
      'success'
    );

    clearCart();
    setCustomerInfo({ name: '', phone: '', location: '' });
    setCustomerSearchTerm('');
    setSelectedCustomerObj(null);
  };

  // -------------------------------------------------------------
  // Invoice Edit Handlers
  // -------------------------------------------------------------
  const handleStartEdit = (invoice) => {
    if (invoice.status === 'Locked' || invoice.isLocked) {
      showToast('This invoice is permanently locked and cannot be edited.', 'error');
      return;
    }
    setEditingInvoice({
      ...invoice,
      customerName: invoice.customerName || invoice.customerInfo?.name || '',
      customerPhone: invoice.customer_phone || invoice.customerInfo?.phone || '',
      customerLocation: invoice.customer_location || invoice.customerInfo?.location || '',
    });
    setEditItems((invoice.items || []).map(item => ({
      item_id: item.id,
      product_code: item.product_code || item.id,
      name: item.name,
      unit: item.unit || 'pcs',
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      total_price: Number(item.price || 0) * Number(item.quantity || 1)
    })));
  };

  const updateEditItemQty = (idx, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    setEditItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          quantity: qty,
          total_price: qty * item.price
        };
      }
      return item;
    }));
  };

  const removeEditItem = (idx) => {
    if (editItems.length <= 1) {
      showToast('An invoice must contain at least one product.', 'error');
      return;
    }
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const editSubtotal = editItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const editTotal = editSubtotal;

  const handleSaveEditedInvoice = async (e) => {
    if (e) e.preventDefault();
    if (!editingInvoice) return;
    if (editItems.length === 0) {
      showToast('Invoice must have at least one product.', 'error');
      return;
    }

    setIsUpdating(true);
    const updates = {
      items: editItems.map(it => ({
        item_id: it.item_id,
        product_code: it.product_code,
        name: it.name,
        unit: it.unit,
        price: it.price,
        quantity: it.quantity,
      })),
      customerName: editingInvoice.customerName,
      customer_phone: editingInvoice.customerPhone,
      customer_location: editingInvoice.customerLocation,
      paymentType: 'Baki',
      invoiceDiscount: 0
    };

    const targetId = editingInvoice.invoice_number || editingInvoice.id;
    const result = await updateSale(targetId, updates);
    setIsUpdating(false);

    if (!result.success) {
      showToast(`Invoice was not updated: ${result.error}`, 'error');
      return;
    }

    showToast(`Invoice ${targetId} updated successfully!`, 'success');
    setEditingInvoice(null);
    setEditItems([]);
  };

  const handleLockInvoice = async () => {
    if (!editingInvoice) return;
    if (editItems.length === 0) {
      showToast('Invoice must have at least one product.', 'error');
      return;
    }

    const targetId = editingInvoice.invoice_number || editingInvoice.id;
    const isConfirmed = await confirmDialog({
      title: 'Permanently Lock Invoice?',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <p>Are you sure you want to permanently lock invoice <strong>${targetId}</strong>?</p>
          <div style="margin-top: 0.75rem; padding: 0.75rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #b91c1c; font-size: 0.85rem; font-weight: 600;">
            ⚠️ Once locked, this invoice can NEVER be edited again!
          </div>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: 'Yes, Lock Permanently',
      confirmButtonColor: '#dc2626'
    });
    if (!isConfirmed) return;

    setIsUpdating(true);
    const updates = {
      items: editItems.map(it => ({
        item_id: it.item_id,
        product_code: it.product_code,
        name: it.name,
        unit: it.unit,
        price: it.price,
        quantity: it.quantity,
      })),
      customerName: editingInvoice.customerName,
      customer_phone: editingInvoice.customerPhone,
      customer_location: editingInvoice.customerLocation,
      paymentType: 'Baki',
      invoiceDiscount: 0,
      status: 'Locked'
    };

    const result = await updateSale(targetId, updates);
    setIsUpdating(false);

    if (!result.success) {
      showToast(`Failed to lock invoice: ${result.error}`, 'error');
      return;
    }

    showToast(`Invoice ${targetId} has been permanently locked!`, 'success');
    setEditingInvoice(null);
    setEditItems([]);
  };

  const handleOpenPayment = (invoice) => {
    const invTotal = Number(invoice.total || 0);
    const invDue = invoice.due_amount !== undefined
      ? Number(invoice.due_amount)
      : (invoice.paymentType === 'Cash' ? 0 : invTotal);

    setPaymentModal({
      show: true,
      invoice,
      amount: String(invDue > 0 ? invDue : ''),
      method: 'Cash',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleSubmitPayment = async (e) => {
    if (e) e.preventDefault();
    if (!paymentModal.invoice) return;

    const amount = parseFloat(paymentModal.amount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }

    const inv = paymentModal.invoice;
    const invTotal = Number(inv.total || 0);
    const currentDue = inv.due_amount !== undefined
      ? Number(inv.due_amount)
      : (inv.paymentType === 'Cash' ? 0 : invTotal);

    if (amount > currentDue) {
      showToast(`Amount (৳${amount.toLocaleString()}) cannot exceed remaining invoice due (৳${currentDue.toLocaleString()}).`, 'error');
      return;
    }

    const targetId = inv.invoice_number || inv.id;
    const isConfirmed = await confirmDialog({
      title: `Collect Payment for ${targetId}?`,
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <div><strong>Customer:</strong> ${inv.customerName || 'N/A'}</div>
          <div><strong>Current Due:</strong> ৳${currentDue.toLocaleString()}</div>
          <div style="margin-top: 0.5rem; padding: 0.5rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; color: #15803d; font-weight: bold;">
            Collecting: ৳${amount.toLocaleString()} (${paymentModal.method})
          </div>
          <div style="margin-top: 0.5rem; color: #64748b; font-size: 0.85rem;">
            Remaining after this payment: ৳${Math.max(0, currentDue - amount).toLocaleString()}
          </div>
        </div>
      `,
      icon: 'question',
      confirmButtonText: 'Yes, Confirm Payment',
      confirmButtonColor: '#10b981'
    });
    if (!isConfirmed) return;

    setIsProcessingPayment(true);
    const result = await paySaleInvoice(targetId, {
      amount,
      payment_method: paymentModal.method,
      date: paymentModal.date,
      notes: paymentModal.notes
    });
    setIsProcessingPayment(false);

    if (!result.success) {
      showToast(`Payment failed: ${result.error}`, 'error');
      return;
    }

    showToast(`Successfully collected ৳${amount.toLocaleString()} for Invoice ${targetId}!`, 'success');
    setPaymentModal({ show: false, invoice: null, amount: '', method: 'Cash', date: '', notes: '' });
  };

  return (
    <div className="pos-page">
      <header className="pos-pagehead">
        <h1>Invoice</h1>
        <p>Ring up a sale, collect against an invoice, or reprint one.</p>
      </header>

      <nav className="pos-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'New'}
          className={`pos-tab ${activeTab === 'New' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('New')}
        >
          <Plus size={15} /> New Invoice
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'History'}
          className={`pos-tab ${activeTab === 'History' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('History')}
        >
          <List size={15} /> Invoice List
          <span className="pos-tab__count">{sales.length}</span>
        </button>
      </nav>

      {/* NEW INVOICE TAB */}
      {activeTab === 'New' && (
      <div className="pos-container">
        <div className="pos-left">
          <div className="pos-header">
            <h2>Items</h2>
            <div className="pos-search-wrapper" ref={searchContainerRef}>
              <form onSubmit={handleBarcodeSubmit} className="barcode-form">
                <Search size={18} className="text-muted" />
                <input
                  id="barcode-input"
                  type="text"
                  placeholder="Type to search product by name, barcode, code..."
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setShowSearchDropdown(true);
                    setActiveSearchIndex(0);
                  }}
                  onFocus={() => {
                    if (barcodeInput.trim()) setShowSearchDropdown(true);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  autoComplete="off"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    className="btn-icon text-muted"
                    style={{ padding: '0.2rem' }}
                    onClick={() => {
                      setBarcodeInput('');
                      setShowSearchDropdown(false);
                      document.getElementById('barcode-input')?.focus();
                    }}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
                <button type="submit" className="btn-primary">Add</button>
              </form>

              {/* Live Search Results Dropdown */}
              {showSearchDropdown && barcodeInput.trim() && (
                <div className="search-dropdown-menu">
                  {searchResults.length === 0 ? (
                    <div className="search-no-results">
                      No products found matching "<strong>{barcodeInput}</strong>"
                    </div>
                  ) : (
                    searchResults.map((product, idx) => (
                      <div
                        key={product.id || idx}
                        className={`search-dropdown-item ${activeSearchIndex === idx ? 'selected' : ''}`}
                        onMouseEnter={() => setActiveSearchIndex(idx)}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="search-item-left">
                          <div className="search-item-name">{product.name}</div>
                          <div className="search-item-meta">
                            <span className="search-badge code-badge">Code: {product.product_code || product.id}</span>
                            {product.category && <span className="search-badge">{product.category}</span>}
                            {product.variant && <span className="search-badge">{product.variant}</span>}
                          </div>
                        </div>
                        <div className="search-item-right">
                          <div className="search-item-price">৳{Number(product.price || 0).toLocaleString()}</div>
                          <div className={`search-item-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                            {product.stock > 0 ? `${product.stock} ${product.unit || 'pcs'} in stock` : 'Out of stock'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Add Section */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            {inventory.length === 0 ? (
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={loadDummyData}>
                <Database size={16} /> Load Dummy Inventory
              </button>
            ) : (
              inventory.slice(0, 5).map(item => (
                <button
                  key={item.id}
                  className="btn-icon"
                  style={{
                    border: '1px solid var(--border-color)',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-input)'
                  }}
                  onClick={() => addToCart({ ...item, isGift: false, itemDiscount: 0 })}
                >
                  {item.name} (Buy: {item.purchasePrice || 0} | Sell: {item.price})
                </button>
              ))
            )}
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="empty-cart text-muted">Cart is empty. Scan or select an item to begin.</div>
            ) : (
              <>
                <div className="cart-head">
                  <span>Item</span>
                  <span className="is-center">Qty</span>
                  <span className="is-right">Rate</span>
                  <span className="is-right">Total</span>
                  <span />
                </div>
                {cart.map(item => {
                  const qty = Number(item.quantity) || 0;
                  const rate = Number(item.price) || 0;
                  return (
                    <div className={`cart-item ${item.isGift ? 'is-gift' : ''}`} key={item.id}>
                      <div className="item-info">
                        <h4>{item.name}</h4>
                        <span className="item-meta">
                          Code {item.id}
                          {item.variant ? ` · ${item.variant}` : ''}
                          {' · '}Buy ৳{Number(item.purchasePrice || 0).toLocaleString()}
                          {item.isGift ? ' · Gift' : ''}
                        </span>
                      </div>

                      {/* Quantity: typed straight in, or nudged with the buttons. */}
                      <div className="qty-control">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateCartItem(item.id, { quantity: Math.max(1, qty - 1) })}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          className="qty-input"
                          value={item.quantity}
                          onChange={(e) => {
                            // Let the box go empty while retyping; it is put back
                            // to a real quantity on blur.
                            const v = e.target.value;
                            updateCartItem(item.id, { quantity: v === '' ? '' : Math.max(1, parseInt(v, 10) || 1) });
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '' || !(parseInt(e.target.value, 10) > 0)) {
                              updateCartItem(item.id, { quantity: 1 });
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateCartItem(item.id, { quantity: qty + 1 })}
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Rate: the unit price this line is being sold at, so a
                          negotiated price can be typed in without touching the
                          product's list price. */}
                      <div className="rate-control">
                        <span className="rate-prefix">৳</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="rate-input"
                          value={item.price}
                          disabled={item.isGift}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateCartItem(item.id, { price: v === '' ? '' : Math.max(0, parseFloat(v) || 0) });
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') updateCartItem(item.id, { price: 0 });
                          }}
                          onFocus={(e) => e.target.select()}
                          title="Unit price for this invoice"
                        />
                      </div>

                      <div className="item-price">
                        ৳{item.isGift ? '0' : (rate * qty).toLocaleString()}
                      </div>

                      <div className="item-btns">
                        <button
                          type="button"
                          className={`line-btn ${item.isGift ? 'is-on' : ''}`}
                          title={item.isGift ? 'Gift: not charged' : 'Mark as gift'}
                          onClick={() => toggleGift(item)}
                        >
                          <Gift size={15} />
                        </button>
                        <button
                          type="button"
                          className="line-btn line-btn--danger"
                          title="Remove"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Checkout Details Side */}
        <div className="pos-right">
          <h3>Invoice Details</h3>

          <div className="checkout-section">
            <label>Customer Details <span className="text-danger">*</span></label>
            <div className="pos-customer-wrapper" ref={customerContainerRef}>
              <div className="customer-search-input-box mb-2">
                <input
                  type="text"
                  placeholder="Search customer by name, phone, code..."
                  value={customerSearchTerm}
                  onChange={e => handleCustomerSearchInputChange(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  autoComplete="off"
                />
                {customerSearchTerm && (
                  <button
                    type="button"
                    className="customer-search-clear-btn"
                    onClick={() => {
                      setCustomerSearchTerm('');
                      setSelectedCustomerObj(null);
                      setCustomerInfo({ name: '', phone: '', location: '' });
                    }}
                    title="Clear customer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Live Customer Dropdown */}
              {showCustomerDropdown && (
                <div className="customer-dropdown-menu">
                  {filteredCustomers.length === 0 ? (
                    <div className="search-no-results" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      No customer found matching "<strong>{customerSearchTerm}</strong>"
                      <div className="text-xs text-muted mt-1">You can type phone & address below to create a new customer.</div>
                    </div>
                  ) : (
                    filteredCustomers.map(c => (
                      <div
                        key={c.id || c.customer_code}
                        className="customer-dropdown-item"
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <div className="customer-item-left">
                          <div className="customer-item-name">{c.name}</div>
                          <div className="customer-item-meta">
                            {c.phone && <span>📞 {c.phone}</span>}
                            {c.location && <span>📍 {c.location}</span>}
                            {(c.customer_code || c.id) && <span className="search-badge">ID: {c.customer_code || c.id}</span>}
                          </div>
                        </div>
                        <div className="customer-item-right">
                          <span className={`customer-due-badge ${Number(c.due || 0) > 0 ? 'bg-danger text-white' : 'bg-success text-white'}`}>
                            Due: ৳{Number(c.due || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected customer card with previous due info */}
            {selectedCustomerObj && (
              <div className="customer-selected-card">
                <div>
                  <span className="text-muted text-xs block">Existing Customer:</span>
                  <strong>{selectedCustomerObj.name}</strong> {selectedCustomerObj.phone ? `(${selectedCustomerObj.phone})` : ''}
                </div>
                <div className="text-right">
                  <span className="text-muted text-xs block">Previous Due:</span>
                  <span className="text-danger font-bold">৳{Number(selectedCustomerObj.due || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Phone Number"
              value={customerInfo.phone}
              onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
              className="mb-2"
            />
            <input
              type="text"
              placeholder="Location/Address"
              value={customerInfo.location}
              onChange={e => setCustomerInfo({...customerInfo, location: e.target.value})}
            />
          </div>

          <div className="checkout-section">
            <label>Salesman</label>
            <div className="pos-salesman" title="Set from the account you are logged in with">
              <strong>{currentSalesman.name}</strong>
              <span>{currentSalesman.phone || (currentSalesman.id === 'Admin' ? 'Admin account' : currentSalesman.id)}</span>
            </div>
          </div>

          {/* Payment Type is strictly Due */}
          <div className="checkout-section">
            <label>Payment Type</label>
            <div style={{ padding: '0.65rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '600' }}>Payment Mode</span>
              <span className="badge bg-warning" style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>Due (Baki)</span>
            </div>
          </div>

          {/* Summary Section - Discount removed */}
          <div className="checkout-section summary-section">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row total-row">
              <span>Total Payable (Due)</span>
              <span className="text-primary text-xl font-bold">৳{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="checkout-actions">
            <button className="btn-primary checkout-btn" onClick={handleCheckout} disabled={cart.length === 0 || isSaving}>
              {isSaving ? 'Processing...' : 'Complete Invoice'}
            </button>
          </div>
        </div>

        {/* Invoice Receipt Drawer */}
        {completedSale && createPortal(
          <div className="drawer-overlay" onClick={() => setCompletedSale(null)}>
            <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <h3 style={{ margin: 0 }}>Invoice Receipt</h3>
                <button className="drawer-close-btn" onClick={() => setCompletedSale(null)}>
                  <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>

              <div className="drawer-body" style={{ padding: '0' }}>
                <div id="printable-invoice">
                  <PrintableInvoice sale={completedSale} customers={customers} />
                </div>
              </div>

              <div className="drawer-footer" style={{ justifyContent: 'center' }}>
                <button
                  className="btn-primary flex-align-gap"
                  style={{ padding: '0.75rem 2.5rem', fontSize: '0.95rem', borderRadius: '99px' }}
                  onClick={() => printElement('printable-invoice')}
                >
                  <Printer size={20} /> Print Invoice
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
      )}

      {/* INVOICE LIST TAB */}
      {activeTab === 'History' && (
      <div className="card pos-history">
        <div className="pos-history__head">
          <h2>Invoice List</h2>
          <div className="pos-history__tools">
            <div className="pos-filter">
              <label htmlFor="pos-from">From</label>
              <input id="pos-from" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="pos-filter">
              <label htmlFor="pos-to">To</label>
              <input id="pos-to" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <button
              type="button"
              className={groupByParty ? 'btn-primary flex-align-gap' : 'btn-outline flex-align-gap'}
              onClick={() => setGroupByParty(v => !v)}
              title="Break the list into one block per customer"
            >
              <Users size={16} /> {groupByParty ? 'Party-wise: On' : 'Party-wise'}
            </button>
            <button
              className="btn-primary flex-align-gap"
              onClick={() => printElement('printable-all-sales-details')}
            >
              <Printer size={16} /> Print invoice list
            </button>
          </div>
        </div>

        <div className="table-responsive mt-4">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th style={{textAlign:'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(groupByParty
                ? partyGroups.flatMap(([party, rows]) => [
                    <tr key={`grp-${party}`} style={{ background: 'var(--bg-muted, rgba(127,127,127,0.10))' }}>
                      <td colSpan={7} style={{ fontWeight: 700, padding: '0.5rem 0.75rem' }}>
                        {party}
                        <span className="text-muted" style={{ fontWeight: 400, marginLeft: '0.75rem' }}>
                          {rows.length} invoice{rows.length === 1 ? '' : 's'} &middot; Total{' '}
                          ৳{rows.reduce((n, x) => n + Number(x.total || 0), 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>,
                    ...rows,
                  ])
                : filteredSales
              ).map(s => (
                React.isValidElement(s) ? s : (() => {
                  const invTotal = Number(s.total || 0);
                  const invPaid = Number(s.paid_amount || 0);
                  const invDue = s.due_amount !== undefined ? Number(s.due_amount) : (s.paymentType === 'Cash' ? 0 : invTotal);
                  const isPaid = invDue <= 0 || s.paymentType === 'Cash';
                  const isPartial = !isPaid && invPaid > 0;

                  return (
                    <tr key={s.id}>
                      <td>{s.date.split('T')[0]}</td>
                      <td><strong>{s.id}</strong></td>
                      <td>{s.customerName || 'N/A'}</td>
                      <td>{s.items.length} items</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {isPaid ? (
                            <span className="badge bg-success">Paid</span>
                          ) : isPartial ? (
                            <span className="badge bg-info" title={`Paid: ৳${invPaid.toLocaleString()} | Due: ৳${invDue.toLocaleString()}`}>
                              Partial (Due: ৳{invDue.toLocaleString()})
                            </span>
                          ) : (
                            <span className="badge bg-warning">
                              Due (৳{invDue.toLocaleString()})
                            </span>
                          )}
                          {(s.status === 'Locked' || s.isLocked) && (
                            <span className="badge bg-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}>
                              <Lock size={10} /> Locked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-primary font-bold">
                        <div>৳{invTotal.toLocaleString()}</div>
                        {invDue > 0 && invPaid > 0 && (
                          <div className="text-muted text-xs" style={{ fontWeight: 'normal' }}>
                            Due: <span className="text-danger">৳{invDue.toLocaleString()}</span>
                          </div>
                        )}
                      </td>
                      <td style={{textAlign:'center'}}>
                        <div className="flex-align-gap" style={{justifyContent:'center'}}>
                          {/* Pay Due Button for any invoice with remaining due */}
                          {invDue > 0 && (
                            <button
                              className="btn-icon text-success"
                              title="Collect Payment / Pay Due"
                              onClick={() => handleOpenPayment(s)}
                              style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                            >
                              <CreditCard size={16} />
                            </button>
                          )}
                          <button className="btn-icon" title="View & Print" onClick={() => setSelectedInvoice(s)}>
                            <Eye size={16} />
                          </button>
                          {(s.status === 'Locked' || s.isLocked) ? (
                            <button
                              className="btn-icon text-muted"
                              title="This invoice is permanently locked and cannot be edited"
                              disabled
                              style={{ opacity: 0.35, cursor: 'not-allowed' }}
                            >
                              <Lock size={16} />
                            </button>
                          ) : (
                            <button className="btn-icon text-primary" title="Edit Invoice" onClick={() => handleStartEdit(s)}>
                              <FileEdit size={16} />
                            </button>
                          )}
                          {user?.role === 'Admin' && (
                            <button className="btn-icon text-danger" title="Delete Invoice" onClick={() => handleDeleteSale(s)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })()
              ))}
              {filteredSales.length === 0 && <tr><td colSpan="7" className="text-center text-muted">No invoices found for this date range.</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'none' }}>
          <div id="printable-all-sales-details" style={{ background: '#fff', color: '#000' }}>
            <div style={{ padding: '1.5rem 1.5rem 2.5rem 1.5rem', maxWidth: '720px', margin: '0 auto', boxSizing: 'border-box' }}>
              <InvoiceHeader />
              <h3 style={{ textAlign: 'center', fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.5rem', color: '#0f172a', textTransform: 'uppercase' }}>Detailed Invoice List</h3>
              {(startDate || endDate) && <p style={{textAlign: 'center', marginBottom: '1rem', fontSize: '0.85rem', color: '#475569'}}>Date Filter: {startDate || 'Any'} to {endDate || 'Any'}</p>}

              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', border: '1px solid #94a3b8' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #64748b' }}>
                    <th style={{border: '1px solid #94a3b8', padding: '6px 5px', textAlign: 'left'}}>Date</th>
                    <th style={{border: '1px solid #94a3b8', padding: '6px 5px', textAlign: 'left'}}>Invoice</th>
                    <th style={{border: '1px solid #94a3b8', padding: '6px 5px', textAlign: 'left'}}>Customer</th>
                    <th style={{border: '1px solid #94a3b8', padding: '6px 5px', textAlign: 'left'}}>Payment</th>
                    <th style={{border: '1px solid #94a3b8', padding: '6px 5px', textAlign: 'left'}}>Item</th>
                    <th style={{border: '1px solid #94a3b8', padding: '6px 5px', textAlign: 'center'}}>Qty</th>
                    <th style={{border: '1px solid #94a3b8', padding: '6px 5px', textAlign: 'right'}}>Price</th>
                    <th style={{border: '1px solid #94a3b8', padding: '6px 5px', textAlign: 'right'}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <React.Fragment key={sale.id}>
                      {sale.items.map((item, idx) => (
                        <tr key={`${sale.id}-${idx}`}>
                          {idx === 0 && (
                             <>
                               <td rowSpan={sale.items.length} style={{border: '1px solid #cbd5e1', padding: '5px', verticalAlign: 'top'}}>{new Date(sale.date).toLocaleDateString()}</td>
                               <td rowSpan={sale.items.length} style={{border: '1px solid #cbd5e1', padding: '5px', verticalAlign: 'top', fontWeight: 'bold'}}>{sale.id}</td>
                               <td rowSpan={sale.items.length} style={{border: '1px solid #cbd5e1', padding: '5px', verticalAlign: 'top'}}>{sale.customerName || 'N/A'}</td>
                               <td rowSpan={sale.items.length} style={{border: '1px solid #cbd5e1', padding: '5px', verticalAlign: 'top'}}>{sale.paymentType === 'Cash' ? 'Cash' : 'Due'}</td>
                             </>
                          )}
                          <td style={{border: '1px solid #cbd5e1', padding: '5px'}}>{item.name}</td>
                          <td style={{border: '1px solid #cbd5e1', padding: '5px', textAlign: 'center'}}>{item.quantity}</td>
                          <td style={{border: '1px solid #cbd5e1', padding: '5px', textAlign: 'right'}}>৳{Number(item.price || 0).toLocaleString()}</td>
                          <td style={{border: '1px solid #cbd5e1', padding: '5px', textAlign: 'right', fontWeight: '600'}}>৳{Number((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                        <td colSpan="7" style={{border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right'}}>Invoice {sale.id} Total:</td>
                        <td style={{border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right', color: '#0f172a'}}>৳{Number(sale.total || 0).toLocaleString()}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <div style={{ textAlign: 'right', marginTop: '1.5rem', fontSize: '1.1rem', fontWeight: '800', padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                Grand Total: ৳{filteredSales.reduce((acc, s) => acc + Number(s.total || 0), 0).toLocaleString()}
              </div>
              <PrintFooter />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* EDIT INVOICE DRAWER */}
      {editingInvoice && createPortal(
        <div className="drawer-overlay" onClick={() => setEditingInvoice(null)}>
          <div className="drawer-container" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileEdit size={20} color="var(--primary)" /> Edit Invoice: {editingInvoice.id || editingInvoice.invoice_number}
                </h3>
                <span className="text-muted text-sm">
                  Customer: <strong>{editingInvoice.customerName || 'N/A'}</strong> &middot; Date: {editingInvoice.date?.split('T')[0]}
                </span>
              </div>
              <button className="drawer-close-btn" onClick={() => setEditingInvoice(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body" style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label className="text-muted text-sm block mb-1">Customer Name</label>
                  <input
                    type="text"
                    className="w-full"
                    value={editingInvoice.customerName}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-muted text-sm block mb-1">Customer Phone</label>
                  <input
                    type="text"
                    className="w-full"
                    value={editingInvoice.customerPhone || ''}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, customerPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-muted text-sm block mb-1">Payment Mode</label>
                  <div style={{ padding: '0.55rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                    <span className="badge bg-warning" style={{ fontSize: '0.85rem' }}>Only Due (Baki)</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Products in Invoice (Edit Quantity)</h4>
                <span className="text-muted text-xs">Stock & Customer Due will adjust automatically</span>
              </div>

              <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'right', width: '100px' }}>Unit Price</th>
                      <th style={{ textAlign: 'center', width: '160px' }}>Quantity</th>
                      <th style={{ textAlign: 'right', width: '110px' }}>Total</th>
                      <th style={{ textAlign: 'center', width: '60px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{item.name}</strong>
                          <div className="text-muted text-xs">Code: {item.product_code}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>৳{item.price.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-input)', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ padding: '0.2rem', width: '24px', height: '24px' }}
                              onClick={() => updateEditItemQty(idx, item.quantity - 1)}
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateEditItemQty(idx, e.target.value)}
                              style={{ width: '55px', textAlign: 'center', padding: '0.15rem 0.25rem', border: 'none', background: 'transparent', fontWeight: 'bold', fontSize: '0.95rem' }}
                            />
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ padding: '0.2rem', width: '24px', height: '24px' }}
                              onClick={() => updateEditItemQty(idx, item.quantity + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          ৳{(item.quantity * item.price).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-icon text-danger"
                            title="Remove product"
                            onClick={() => removeEditItem(idx)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-muted, rgba(127,127,127,0.08))', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="text-muted text-sm">Payment Status:</span>
                  <div className="font-bold text-warning">Only Due (Baki)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-muted text-sm">Updated Total Payable:</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    ৳{editTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-outline text-danger flex-align-gap"
                onClick={handleLockInvoice}
                disabled={isUpdating}
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontWeight: 600 }}
                title="Permanently lock invoice so it can never be edited again"
              >
                <Lock size={16} /> Permanently Lock Invoice
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-outline" onClick={() => setEditingInvoice(null)} disabled={isUpdating}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary flex-align-gap"
                  onClick={handleSaveEditedInvoice}
                  disabled={isUpdating || editItems.length === 0}
                >
                  <FileEdit size={16} /> {isUpdating ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HISTORY SINGLE INVOICE PRINT DRAWER */}
      {selectedInvoice && createPortal(
        <div className="drawer-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Invoice Receipt</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedInvoice(null)}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <div className="drawer-body" style={{ padding: '0' }}>
              <div id="printable-single-invoice-pos">
                <PrintableInvoice sale={selectedInvoice} customers={customers} />
              </div>
            </div>

            <div className="drawer-footer" style={{ justifyContent: 'center' }}>
              <button
                className="btn-primary flex-align-gap"
                style={{ padding: '0.75rem 2.5rem', fontSize: '0.95rem', borderRadius: '99px' }}
                onClick={() => printElement('printable-single-invoice-pos')}
              >
                <Printer size={20} /> Print Invoice
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* COLLECT INVOICE PAYMENT DRAWER */}
      {paymentModal.show && paymentModal.invoice && createPortal(
        <div className="drawer-overlay" onClick={() => setPaymentModal({ show: false, invoice: null, amount: '', method: 'Cash', date: '', notes: '' })}>
          <div className="drawer-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={20} color="var(--success, #10b981)" /> Collect Invoice Payment
                </h3>
                <span className="text-muted text-sm">
                  Invoice: <strong>{paymentModal.invoice.id || paymentModal.invoice.invoice_number}</strong>
                </span>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setPaymentModal({ show: false, invoice: null, amount: '', method: 'Cash', date: '', notes: '' })}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="drawer-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Summary Card */}
                <div style={{ padding: '1rem', background: 'var(--bg-muted, rgba(127,127,127,0.07))', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className="text-muted text-sm">Customer:</span>
                    <strong>{paymentModal.invoice.customerName || 'N/A'}</strong>
                  </div>
                  {paymentModal.invoice.customer_phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span className="text-muted text-sm">Phone:</span>
                      <span>{paymentModal.invoice.customer_phone}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className="text-muted text-sm">Invoice Total:</span>
                    <span>৳{Number(paymentModal.invoice.total || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className="text-muted text-sm">Already Paid:</span>
                    <span className="text-success">৳{Number(paymentModal.invoice.paid_amount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', fontWeight: 'bold' }}>
                    <span>Remaining Due:</span>
                    <span className="text-danger" style={{ fontSize: '1.15rem' }}>
                      ৳{Number(
                        paymentModal.invoice.due_amount !== undefined
                          ? paymentModal.invoice.due_amount
                          : (paymentModal.invoice.paymentType === 'Cash' ? 0 : paymentModal.invoice.total)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Amount to Collect */}
                <div>
                  <label className="text-muted text-sm block mb-1">Payment Amount (BDT) *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      className="w-full font-bold"
                      style={{ fontSize: '1.1rem', color: '#10b981' }}
                      placeholder="Enter amount"
                      value={paymentModal.amount}
                      onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="btn-outline text-sm"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const remaining = paymentModal.invoice.due_amount !== undefined
                          ? paymentModal.invoice.due_amount
                          : (paymentModal.invoice.paymentType === 'Cash' ? 0 : paymentModal.invoice.total);
                        setPaymentModal({ ...paymentModal, amount: String(remaining) });
                      }}
                    >
                      Full Due
                    </button>
                  </div>
                </div>

                {/* Payment Method & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="text-muted text-sm block mb-1">Payment Method</label>
                    <select
                      className="w-full"
                      value={paymentModal.method}
                      onChange={(e) => setPaymentModal({ ...paymentModal, method: e.target.value })}
                    >
                      <option value="Cash">Cash (নগদ)</option>
                      <option value="bKash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ অ্যাপ)</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-muted text-sm block mb-1">Payment Date</label>
                    <input
                      type="date"
                      className="w-full"
                      value={paymentModal.date}
                      onChange={(e) => setPaymentModal({ ...paymentModal, date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-muted text-sm block mb-1">Notes / Transaction Ref (Optional)</label>
                  <input
                    type="text"
                    className="w-full"
                    placeholder="e.g. TrxID / Received by"
                    value={paymentModal.notes}
                    onChange={(e) => setPaymentModal({ ...paymentModal, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="drawer-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setPaymentModal({ show: false, invoice: null, amount: '', method: 'Cash', date: '', notes: '' })}
                  disabled={isProcessingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-align-gap"
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                  disabled={isProcessingPayment || !paymentModal.amount || parseFloat(paymentModal.amount) <= 0}
                >
                  <CheckCircle size={16} /> {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default POS;
