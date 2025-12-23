// src/i18n.js - Simple localization module
const translations = {
  en: {
    appTitle: 'Car Rental PRO — Dashboard (Firebase + Auth)',
    pageTitle: 'Car Rental PRO — Admin Dashboard',
    welcome: 'Welcome',
    guest: 'Guest',
    dashboard: 'Dashboard',
    cars: 'Cars',
    entries: 'Entries',
    reports: 'Reports',
    backup: 'Backup',
    settings: 'Settings',
    users: 'Users',
    logout: 'Sign out',
    login: 'Login / Switch',
    totalRevenue: 'Total Revenue',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    monthlyChart: 'Monthly Chart',
    addCar: 'Add Car',
    carName: 'Car name / model (e.g. Toyota Corolla 2019)',
    plate: 'Plate (optional)',
    dailyRent: 'Daily rent',
    income: 'Income',
    expense: 'Expense',
    category: 'Category',
    amount: 'Amount',
    date: 'Date',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    revenue: 'Revenue',
    save: 'Save',
    cancel: 'Cancel',
    selectCar: 'Choose car',
    export: 'Export',
    import: 'Import',
    download: 'Download',
    upload: 'Upload',
    reset: 'Reset',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    language: 'Language',
  },
  ar: {
    appTitle: 'لوحة تحكم تأجير السيارات — نسخة احترافية',
    pageTitle: 'لوحة التحكم الإدارية لتأجير السيارات',
    welcome: 'أهلاً',
    guest: 'ضيف',
    dashboard: 'لوحة التحكم',
    cars: 'السيارات',
    entries: 'الإدخالات',
    reports: 'التقارير',
    backup: 'نسخة احتياطية',
    settings: 'الإعدادات',
    users: 'المستخدمون',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
    totalRevenue: 'إجمالي الإيرادات',
    totalExpenses: 'إجمالي النفقات',
    netProfit: 'صافي الربح',
    monthlyChart: 'الرسم البياني الشهري',
    addCar: 'إضافة سيارة',
    carName: 'اسم السيارة / الموديل',
    plate: 'لوحة التسجيل (اختياري)',
    dailyRent: 'الإيجار اليومي',
    income: 'إيراد',
    expense: 'نفقة',
    category: 'الفئة',
    amount: 'المبلغ',
    date: 'التاريخ',
    actions: 'الإجراءات',
    edit: 'تعديل',
    delete: 'حذف',
    revenue: 'الإيرادات',
    save: 'حفظ',
    cancel: 'إلغاء',
    selectCar: 'اختر سيارة',
    export: 'تصدير',
    import: 'استيراد',
    download: 'تحميل',
    upload: 'رفع',
    reset: 'إعادة تعيين',
    search: 'بحث',
    filter: 'تصفية',
    clear: 'مسح',
    language: 'اللغة',
  }
};

let currentLang = localStorage.getItem('app_lang') || 'en';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('app_lang', lang);
    applyLanguage(lang);
  }
}

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  return translations[currentLang]?.[key] || translations['en']?.[key] || key;
}

function applyLanguage(lang) {
  const isRTL = lang === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.body.style.direction = isRTL ? 'rtl' : 'ltr';
  document.body.style.textAlign = isRTL ? 'right' : 'left';
}

// Initialize on load
export function initLanguage() {
  applyLanguage(currentLang);
}
