export const IPC = {
  SETUP_STATUS: 'setup:status',
  SETUP_COMPLETE: 'setup:complete',

  AUTH_LOGIN: 'auth:login',
  AUTH_PIN: 'auth:pin',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_SESSION: 'auth:session',
  AUTH_USERS: 'auth:users',

  DASHBOARD_STATS: 'dashboard:stats',

  NOTIFICATIONS_LIST: 'notifications:list',
  NOTIFICATIONS_DISMISS: 'notifications:dismiss',
  NOTIFICATIONS_DISMISS_ALL: 'notifications:dismiss-all',
  NOTIFICATIONS_NATIVE: 'notifications:native',

  CUSTOMERS_LIST: 'customers:list',
  CUSTOMERS_GET: 'customers:get',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_SEARCH: 'customers:search',

  VEHICLES_LIST: 'vehicles:list',
  VEHICLES_GET: 'vehicles:get',
  VEHICLES_CREATE: 'vehicles:create',
  VEHICLES_UPDATE: 'vehicles:update',
  VEHICLES_DELETE: 'vehicles:delete',
  VEHICLES_BY_CUSTOMER: 'vehicles:byCustomer',

  JOBCARDS_LIST: 'jobcards:list',
  JOBCARDS_GET: 'jobcards:get',
  JOBCARDS_CREATE: 'jobcards:create',
  JOBCARDS_UPDATE: 'jobcards:update',
  JOBCARDS_STATUS: 'jobcards:status',
  JOBCARDS_DELETE: 'jobcards:delete',
  JOBCARDS_IMAGE: 'jobcards:image',

  INVENTORY_LIST: 'inventory:list',
  INVENTORY_GET: 'inventory:get',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_ADJUST: 'inventory:adjust',
  INVENTORY_LOW: 'inventory:low',
  INVENTORY_ALERTS: 'inventory:alerts',
  INVENTORY_RESTOCK: 'inventory:restock',

  SUPPLIERS_LIST: 'suppliers:list',
  SUPPLIERS_CREATE: 'suppliers:create',

  INVOICES_LIST: 'invoices:list',
  INVOICES_GET: 'invoices:get',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_PAYMENT: 'invoices:payment',

  STAFF_LIST: 'staff:list',
  STAFF_CREATE: 'staff:create',
  STAFF_UPDATE: 'staff:update',
  STAFF_ATTENDANCE: 'staff:attendance',

  REPORTS_DAILY: 'reports:daily',
  REPORTS_MONTHLY: 'reports:monthly',
  REPORTS_PENDING: 'reports:pending',
  REPORTS_INVENTORY: 'reports:inventory',
  REPORTS_TOP: 'reports:top',

  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  PDF_JOB_CARD: 'pdf:jobcard',
  PDF_INVOICE: 'pdf:invoice',
  PDF_REPORT_LINES: 'pdf:report-lines',

  PRINT: 'print:document',
  PRINT_THERMAL: 'print:thermal',

  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',

  DIALOG_OPEN: 'dialog:open',
  DIALOG_SAVE: 'dialog:save',
} as const;
