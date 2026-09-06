// Define all API endpoints here to avoid hardcoding strings across the app

export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login/',
  REGISTER: '/auth/register/',
  PROFILE: '/auth/profile/',
  USERS: '/auth/users/',
  
  // Customers & Suppliers
  CUSTOMERS: '/contacts/customers/',
  CUSTOMER_DETAILS: (id) => `/contacts/customers/${id}/`,
  SUPPLIERS: '/contacts/suppliers/',
  SUPPLIER_DETAILS: (id) => `/contacts/suppliers/${id}/`,

  // Products / Inventory
  PRODUCTS: '/inventory/products/',
  PRODUCT_DETAILS: (id) => `/inventory/products/${id}/`,
  CATEGORIES: '/inventory/categories/',
  UNITS: '/inventory/units/',
  STOCK_LOGS: '/inventory/stock-logs/',
  STOCK_LOG_SUMMARY: '/inventory/stock-logs/summary/',
  BARCODE_SEARCH: '/inventory/products/barcode-search/',

  // Sales / POS
  SALES: '/sales/invoices/',
  SALE_DETAILS: (id) => `/sales/invoices/${id}/`,
  DRAFTS: '/sales/drafts/',
  DRAFT_DETAILS: (id) => `/sales/drafts/${id}/`,
  
  // Purchases
  PURCHASES: '/purchases/',
  PURCHASE_DETAILS: (id) => `/purchases/${id}/`,

  // Returns & Rejections
  RETURNS: '/returns/',
  RETURN_DETAILS: (id) => `/returns/${id}/`,

  // Ledger & Dues
  SETTLE_DUE: '/ledger/settle-due/',
  TRANSACTIONS: '/ledger/transactions/',
  TRANSACTION_DETAILS: (id) => `/ledger/transactions/${id}/`,
  LEDGER_STATEMENT: (type, id) => `/ledger/statement/${type}/${id}/`,
  SETTLEMENTS: '/ledger/settlements/',

  // Expenses
  EXPENSES: '/expenses/',
  EXPENSE_CATEGORIES: '/expenses/categories/',
  EXPENSE_MONTHLY_REPORT: '/expenses/monthly-report/',

  // SR Daily Settlements (consignment to salesmen)
  SR_SETTLEMENTS: '/sr/settlements/',
  SR_SETTLEMENT_DETAILS: (id) => `/sr/settlements/${id}/`,
  SR_SETTLE: (id) => `/sr/settlements/${id}/settle/`,
  SR_UNSETTLE: (id) => `/sr/settlements/${id}/unsettle/`,
  SR_ISSUED_ITEMS: (id) => `/sr/settlements/${id}/issued-items/`,

  // HR & Payroll
  STAFF: '/hr/staff/',
  STAFF_DETAILS: (id) => `/hr/staff/${id}/`,
  ATTENDANCE: '/hr/attendance/',
  MARK_ATTENDANCE: '/hr/attendance/mark/',
  LEAVES: '/hr/leaves/',
  PAYROLLS: '/hr/payrolls/',
  GENERATE_PAYSLIP: '/hr/payrolls/generate/',

  // SMS Gateway
  SMS_SEND: '/sms/send/',
  SMS_HISTORY: '/sms/history/',

  // Reports & Dashboard
  REPORTS_SUMMARY: '/reports/summary/',
  REPORTS_DETAILS: '/reports/details/',

  // Core & Settings
  SHOP_PROFILE: '/core/shop-profile/',
  USER_SETTINGS: '/core/user-settings/',
};

