import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

/**
 * Pull a readable message out of an axios error from DRF.
 * DRF returns {detail}, {error}, {non_field_errors: [...]} or {field: [...]}.
 */
const extractError = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  const candidate =
    data.error ||
    data.detail ||
    data.non_field_errors?.[0] ||
    (typeof data === 'string' ? data : Object.values(data)[0]);
  if (Array.isArray(candidate)) return String(candidate[0]);
  return typeof candidate === 'string' ? candidate : fallback;
};

const asArray = (settled) =>
  settled.status === 'fulfilled' && Array.isArray(settled.value) ? settled.value : null;

const useStore = create(
  persist(
    (set, get) => ({
      // ---------------------------------------------------------------
      // Auth & UI
      // ---------------------------------------------------------------
      user: null,
      token: null,
      theme: 'light',
      activeThemeClass: 'theme-forest',
      isLoading: false,
      lastError: null,
      transactions: [],
      addTransaction: (transaction) => set((state) => ({
        transactions: [{ id: 'TRX' + Date.now(), date: new Date().toISOString(), ...transaction }, ...(state.transactions || [])]
      })),
      toast: { show: false, message: '', type: 'success' },

      showToast: (message, type = 'success') => {
        set({ toast: { show: true, message, type } });
        setTimeout(() => {
          set((state) => {
            if (state.toast.message === message) {
              return { toast: { ...state.toast, show: false } };
            }
            return state;
          });
        }, 3000);
      },
      hideToast: () => set((state) => ({ toast: { ...state.toast, show: false } })),

      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setThemeClass: (className) => set({ activeThemeClass: className }),
      clearError: () => set({ lastError: null }),

      login: async (credentials) => {
        try {
          const res = await apiClient.post(ENDPOINTS.LOGIN, {
            username: credentials.username,
            password: credentials.password,
            role: credentials.role || 'Admin',
          });

          const token = res.access || res.token;
          if (token) localStorage.setItem('ehbl_token', token);

          const userData = {
            id: res.user?.id || null,
            username: res.user?.username || credentials.username,
            name: res.user?.first_name || res.user?.username || credentials.username,
            role: res.user?.role || 'Salesman',
            email: res.user?.email || '',
          };

          set({ user: userData, token, lastError: null });
          await get().fetchAllData();
          return { success: true, user: userData };
        } catch (err) {
          const message = extractError(err, 'Invalid username or password.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      logout: () => {
        localStorage.removeItem('ehbl_token');
        localStorage.removeItem('token');
        set({ user: null, token: null, cart: [], lastError: null });
      },

      // ---------------------------------------------------------------
      // Server-backed collections. These start empty and are filled by
      // fetchAllData; nothing here is seeded with demo rows.
      // ---------------------------------------------------------------
      inventory: [],
      categories: [],
      units: [],
      expenseCategories: [],
      shopProfile: null, // letterhead shown on printed invoices
      customers: [],
      suppliers: [],
      sales: [],
      drafts: [],
      purchases: [],
      returns: [],
      settlements: [],
      srSettlements: [],
      expenses: [],
      staff: [],
      attendance: [],
      leaves: [],
      payrolls: [],
      smsHistory: [],

      fetchAllData: async () => {
        if (!get().token && !localStorage.getItem('ehbl_token')) return;

        set({ isLoading: true });
        try {
          const results = await Promise.allSettled([
            apiClient.get(ENDPOINTS.PRODUCTS),
            apiClient.get(ENDPOINTS.CATEGORIES),
            apiClient.get(ENDPOINTS.UNITS),
            apiClient.get(ENDPOINTS.CUSTOMERS),
            apiClient.get(ENDPOINTS.SUPPLIERS),
            apiClient.get(ENDPOINTS.SALES),
            apiClient.get(ENDPOINTS.DRAFTS),
            apiClient.get(ENDPOINTS.PURCHASES),
            apiClient.get(ENDPOINTS.RETURNS),
            apiClient.get(ENDPOINTS.SETTLEMENTS),
            apiClient.get(ENDPOINTS.SR_SETTLEMENTS),
            apiClient.get(ENDPOINTS.EXPENSES),
            apiClient.get(ENDPOINTS.EXPENSE_CATEGORIES),
            apiClient.get(ENDPOINTS.STAFF),
            apiClient.get(ENDPOINTS.ATTENDANCE),
            apiClient.get(ENDPOINTS.LEAVES),
            apiClient.get(ENDPOINTS.PAYROLLS),
            apiClient.get(ENDPOINTS.SMS_HISTORY),
          ]);

          const keys = [
            'inventory', 'categories', 'units', 'customers', 'suppliers',
            'sales', 'drafts', 'purchases', 'returns', 'settlements',
            'srSettlements', 'expenses', 'expenseCategories', 'staff',
            'attendance', 'leaves', 'payrolls', 'smsHistory',
          ];

          const updates = {};
          results.forEach((result, i) => {
            const value = asArray(result);
            if (value) updates[keys[i]] = value;
          });

          const failed = results.filter((r) => r.status === 'rejected').length;
          set({
            ...updates,
            isLoading: false,
            lastError: failed === results.length ? 'Cannot reach the server. Showing last loaded data.' : null,
          });

          get().fetchShopProfile();
        } catch (err) {
          set({ isLoading: false, lastError: extractError(err, 'Failed to load data from the server.') });
        }
      },

      // Reports.jsx still calls this as a refresh fallback.
      loadDummyData: () => get().fetchAllData(),

      // ---------------------------------------------------------------
      // POS cart (client-side only until checkout)
      // ---------------------------------------------------------------
      cart: [],
      addToCart: (product) => set((state) => {
        const existing = state.cart.find((item) => item.id === product.id);
        if (existing) {
          return {
            cart: state.cart.map((item) =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ),
          };
        }
        return { cart: [...state.cart, { ...product, quantity: 1, isGift: false, itemDiscount: 0 }] };
      }),
      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter((item) => item.id !== productId),
      })),
      updateCartItem: (productId, updates) => set((state) => ({
        cart: state.cart.map((item) => (item.id === productId ? { ...item, ...updates } : item)),
      })),
      clearCart: () => set({ cart: [] }),

      // ---------------------------------------------------------------
      // Catalogue
      // ---------------------------------------------------------------
      addCategory: async (categoryName) => {
        try {
          const res = await apiClient.post(ENDPOINTS.CATEGORIES, { name: categoryName });
          set((state) => ({
            categories: [...state.categories.filter((c) => (c.name || c) !== categoryName), res],
            lastError: null,
          }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to create category.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      addUnit: async (unitName) => {
        try {
          const res = await apiClient.post(ENDPOINTS.UNITS, { name: unitName });
          set((state) => ({
            units: [...state.units.filter((u) => (u.name || u) !== unitName), res],
            lastError: null,
          }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to create unit.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      addInventoryItem: async (item) => {
        try {
          const res = await apiClient.post(ENDPOINTS.PRODUCTS, item);
          set((state) => ({
            inventory: [res, ...state.inventory.filter((i) => i.id !== res.id)],
            lastError: null,
          }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save product.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      updateInventoryItem: async (id, updates) => {
        try {
          const res = await apiClient.patch(ENDPOINTS.PRODUCT_DETAILS(id), updates);
          set((state) => ({
            inventory: state.inventory.map((item) => (item.id === id ? { ...item, ...res } : item)),
            lastError: null,
          }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to update product.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      deleteInventoryItem: async (id) => {
        try {
          await apiClient.delete(ENDPOINTS.PRODUCT_DETAILS(id));
          set((state) => ({
            inventory: state.inventory.filter((item) => item.id !== id),
            lastError: null,
          }));
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to delete product.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      updateProduct: (id, updates) => get().updateInventoryItem(id, updates),
      deleteProduct: (id) => get().deleteInventoryItem(id),

      // ---------------------------------------------------------------
      // Contacts
      // ---------------------------------------------------------------
      addCustomer: async (customerData) => {
        try {
          const res = await apiClient.post(ENDPOINTS.CUSTOMERS, customerData);
          set((state) => ({ customers: [res, ...state.customers], lastError: null }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save customer.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      updateCustomer: async (customerId, updates) => {
        try {
          const res = await apiClient.patch(ENDPOINTS.CUSTOMER_DETAILS(customerId), updates);
          set((state) => ({
            customers: state.customers.map((c) => (c.id === customerId ? { ...c, ...res } : c)),
            lastError: null,
          }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to update customer.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      addSupplier: async (supplierData) => {
        try {
          const res = await apiClient.post(ENDPOINTS.SUPPLIERS, supplierData);
          set((state) => ({ suppliers: [res, ...state.suppliers], lastError: null }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save supplier.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      updateSupplier: async (supplierId, updates) => {
        try {
          const res = await apiClient.patch(ENDPOINTS.SUPPLIER_DETAILS(supplierId), updates);
          set((state) => ({
            suppliers: state.suppliers.map((s) => (s.id === supplierId ? { ...s, ...res } : s)),
            lastError: null,
          }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to update supplier.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // ---------------------------------------------------------------
      // Dues. The server is the source of truth for balances, so every
      // settlement re-syncs rather than adjusting the number locally.
      // ---------------------------------------------------------------
      settleCustomerDue: async (customerId, amount, dateStr) => {
        try {
          await apiClient.post(ENDPOINTS.SETTLE_DUE, {
            targetId: customerId,
            type: 'Customer',
            amount: parseFloat(amount),
            date: dateStr || undefined,
          });
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to record the payment.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      settleSupplierDue: async (supplierId, amount, dateStr) => {
        try {
          await apiClient.post(ENDPOINTS.SETTLE_DUE, {
            targetId: supplierId,
            type: 'Supplier',
            amount: parseFloat(amount),
            date: dateStr || undefined,
          });
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to record the payment.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      payStaffDue: async (staffId, amount, dateStr) => {
        try {
          await apiClient.post(ENDPOINTS.SETTLE_DUE, {
            targetId: staffId,
            type: 'Staff',
            amount: parseFloat(amount),
            date: dateStr || undefined,
          });
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to record the payment.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // Kept for compatibility with older call sites.
      payCustomerDue: (customerId, amount) => get().settleCustomerDue(customerId, amount),
      paySupplierDue: (supplierId, amount) => get().settleSupplierDue(supplierId, amount),

      /**
       * Running-balance statement for one customer or supplier.
       * The server owns this because it sees every invoice, not just the ones
       * currently loaded into the store, and it starts from the opening balance.
       */
      fetchLedgerStatement: async (entityType, entityId) => {
        try {
          const res = await apiClient.get(ENDPOINTS.LEDGER_STATEMENT(entityType, entityId));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Could not load the statement.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // ---------------------------------------------------------------
      // Transactions
      // ---------------------------------------------------------------
      processSale: async (salePayload) => {
        try {
          const res = await apiClient.post(ENDPOINTS.SALES, salePayload);
          set({ cart: [], lastError: null });
          await get().fetchAllData();
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save the sale.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      processPurchase: async (purchasePayload) => {
        try {
          const res = await apiClient.post(ENDPOINTS.PURCHASES, purchasePayload);
          await get().fetchAllData();
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save the purchase.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      updatePurchase: async (id, updates) => {
        try {
          const res = await apiClient.patch(ENDPOINTS.PURCHASE_DETAILS(id), updates);
          await get().fetchAllData();
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to update the purchase.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      processReturn: async ({ returnType, productId, quantity, reason, referenceId, date }) => {
        try {
          const res = await apiClient.post(ENDPOINTS.RETURNS, {
            returnType,
            productId,
            quantity: parseInt(quantity, 10) || 1,
            reason,
            referenceId: referenceId || '',
            date: date || undefined,
          });
          await get().fetchAllData();
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to record the return.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      /**
       * Deleting a saved document. The server reverses the stock movement and
       * the customer/supplier/staff balance the document created, so we always
       * re-sync afterwards rather than patching state locally.
       * Admin-only server side.
       */
      deleteSale: async (invoiceId) => {
        try {
          await apiClient.delete(ENDPOINTS.SALE_DETAILS(invoiceId));
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to delete the invoice.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      deletePurchase: async (purchaseId) => {
        try {
          await apiClient.delete(ENDPOINTS.PURCHASE_DETAILS(purchaseId));
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to delete the purchase.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      deleteReturn: async (returnId) => {
        try {
          await apiClient.delete(ENDPOINTS.RETURN_DETAILS(returnId));
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to delete the return.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      deleteSRSettlement: async (settlementId) => {
        try {
          await apiClient.delete(ENDPOINTS.SR_SETTLEMENT_DETAILS(settlementId));
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to delete the SR settlement.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // ---------------------------------------------------------------
      // Draft invoices
      // ---------------------------------------------------------------
      saveDraft: async (draftData) => {
        try {
          const res = await apiClient.post(ENDPOINTS.DRAFTS, draftData);
          set((state) => ({ drafts: [res, ...state.drafts], lastError: null }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save the draft.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      deleteDraft: async (draftId) => {
        try {
          await apiClient.delete(ENDPOINTS.DRAFT_DETAILS(draftId));
          set((state) => ({ drafts: state.drafts.filter((d) => d.id !== draftId), lastError: null }));
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to delete the draft.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // ---------------------------------------------------------------
      // SR daily settlements (consignment to salesmen)
      // ---------------------------------------------------------------
      issueProductsToSR: async (settlementData) => {
        try {
          const res = await apiClient.post(ENDPOINTS.SR_SETTLEMENTS, {
            salesmanId: settlementData.salesmanId,
            date: settlementData.date,
            items: (settlementData.items || []).map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          });
          await get().fetchAllData();
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to issue stock to the SR.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      settleSRAccount: async (id, cashReceived, returnItems = []) => {
        try {
          const res = await apiClient.post(ENDPOINTS.SR_SETTLE(id), {
            cashReceived: parseFloat(cashReceived) || 0,
            returnItems: returnItems.map((item) => ({
              productId: item.productId,
              returnQty: parseInt(item.returnQty, 10) || 0,
            })),
          });
          await get().fetchAllData();
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to settle the SR account.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // Optimistic local tweak used by the settle dialog before it submits.
      updateSRSettlement: (id, updates) => set((state) => ({
        srSettlements: (state.srSettlements || []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
      })),

      updateSRIssuedItems: (id, updatedReturnItems) => set((state) => {
        const settlement = (state.srSettlements || []).find((s) => s.id === id);
        if (!settlement) return state;
        return {
          srSettlements: state.srSettlements.map((s) => {
            if (s.id === id) {
              const newItems = (s.items || []).map((item) => {
                const updated = updatedReturnItems.find((r) => String(r.productId) === String(item.productId));
                return updated ? { ...item, quantity: updated.issuedQty } : item;
              });
              return { ...s, items: newItems };
            }
            return s;
          }),
        };
      }),

      settleBulkSR: async (settlementIds) => {
        for (const id of settlementIds) {
          const settlement = (get().srSettlements || []).find((s) => s.id === id);
          if (settlement && settlement.status !== 'Settled') {
            await get().settleSRAccount(id, settlement.totalSalesValue || settlement.totalIssuedValue || 0, []);
          }
        }
      },

      unsettleBulkSR: (settlementIds) => set((state) => ({
        srSettlements: (state.srSettlements || []).map((s) =>
          settlementIds.includes(s.id) ? { ...s, status: 'Pending', cashReceived: 0 } : s
        ),
      })),

      // ---------------------------------------------------------------
      // Shop profile (invoice letterhead)
      // ---------------------------------------------------------------
      fetchShopProfile: async () => {
        try {
          const res = await apiClient.get(ENDPOINTS.SHOP_PROFILE);
          set({ shopProfile: res });
          return { success: true, data: res };
        } catch (err) {
          // Not fatal: the print components fall back to their built-in text.
          return { success: false, error: extractError(err, 'Could not load the shop profile.') };
        }
      },

      updateShopProfile: async (profileData) => {
        try {
          const res = await apiClient.put(ENDPOINTS.SHOP_PROFILE, profileData);
          set({ shopProfile: res, lastError: null });
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save the shop profile.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // ---------------------------------------------------------------
      // Expenses
      // ---------------------------------------------------------------
      addExpenseCategory: async (name) => {
        try {
          const res = await apiClient.post(ENDPOINTS.EXPENSE_CATEGORIES, { name });
          set((state) => ({
            expenseCategories: [...state.expenseCategories.filter((c) => c.name !== name), res],
            lastError: null,
          }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to create the expense category.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      addExpense: async (expense) => {
        try {
          const res = await apiClient.post(ENDPOINTS.EXPENSES, expense);
          set((state) => ({ expenses: [res, ...state.expenses], lastError: null }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save the expense.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // ---------------------------------------------------------------
      // HR & payroll
      // ---------------------------------------------------------------
      addStaff: async (staffData) => {
        try {
          const res = await apiClient.post(ENDPOINTS.STAFF, staffData);
          set((state) => ({ staff: [res, ...state.staff], lastError: null }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to save the employee.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      updateStaff: async (staffId, updates) => {
        try {
          const res = await apiClient.patch(ENDPOINTS.STAFF_DETAILS(staffId), updates);
          set((state) => ({
            staff: state.staff.map((s) => (s.id === staffId ? { ...s, ...res } : s)),
            lastError: null,
          }));
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to update the employee.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      markAttendance: async (staffId, date, status) => {
        try {
          await apiClient.post(ENDPOINTS.MARK_ATTENDANCE, { staffId, date, status });
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to mark attendance.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      addLeaveRequest: async (leaveData) => {
        try {
          const res = await apiClient.post(ENDPOINTS.LEAVES, leaveData);
          await get().fetchAllData();
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to submit the leave request.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      updateLeaveStatus: async (leaveId, status) => {
        try {
          await apiClient.post(`/hr/leaves/${leaveId}/status/`, { status });
          await get().fetchAllData();
          return { success: true };
        } catch (err) {
          const message = extractError(err, 'Failed to update the leave request.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      generatePayslip: async (payrollData) => {
        try {
          const res = await apiClient.post(ENDPOINTS.GENERATE_PAYSLIP, payrollData);
          await get().fetchAllData();
          return { success: true, data: res };
        } catch (err) {
          const message = extractError(err, 'Failed to generate the payslip.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },

      // ---------------------------------------------------------------
      // SMS
      // ---------------------------------------------------------------
      addSmsToHistory: async (smsData) => {
        try {
          const res = await apiClient.post(ENDPOINTS.SMS_SEND, {
            message: smsData.message,
            customerIds: smsData.receivers?.map((r) => r.id) || smsData.selectedCustomers || [],
            numbers: smsData.numbers || [],
          });
          await get().fetchAllData();
          return { success: true, data: res, delivered: res?.delivered === true, status: res?.status };
        } catch (err) {
          const message = extractError(err, 'Failed to send the SMS.');
          set({ lastError: message });
          return { success: false, error: message };
        }
      },
    }),
    {
      name: 'retail-shop-storage',
      // Only session and UI preferences survive a reload. Business data always
      // comes from the server, so a stale browser can never masquerade as books.
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        theme: state.theme,
        activeThemeClass: state.activeThemeClass,
        cart: state.cart,
        transactions: state.transactions,
      }),
    }
  )
);

export default useStore;
