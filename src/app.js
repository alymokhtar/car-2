// ---------- Firebase imports ----------
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// ---------- Local imports ----------
import { initLanguage, setLanguage } from "./i18n.js";
import { info } from "./logger.js";

// ---------- Your Firebase config ----------
const firebaseConfig = {
  apiKey: "AIzaSyAHzWZ2RyIkkY5IvOefLONXe0Gjk5BFozM",
  authDomain: "cars-9b2bd.firebaseapp.com",
  projectId: "cars-9b2bd",
  storageBucket: "cars-9b2bd.firebasestorage.app",
  messagingSenderId: "934983307820",
  appId: "1:934983307820:web:03496c1f3818e25ab2f789"
};

// ---------- Init app, auth, db ----------
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize localization
initLanguage();
info('App initialized with language support');

// ---------- Local caches ----------
let carsCache = [], entriesCache = [], usersCache = [], settingsCache = { currency: 'MRU', autoBackupIntervalMinutes: 60, theme: 'light' };
const ENTRIES_READ_LIMIT = 500;

// ---------- Unsubscribe holders ----------
let unsubCars = null, unsubEntries = null, unsubUsers = null;

// ---------- Current Language ----------
let currentLang = localStorage.getItem('cr_lang') || 'ar';

function getLang() {
  return currentLang;
}

function setAppLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('cr_lang', lang);
  // Trigger UI update
  if (typeof window.setLanguage === 'function') {
    window.setLanguage(lang);
  }
}

// ---------- i18n Helper for JS strings ----------
const i18nStrings = {
  ar: {
    addCarSuccess: 'تمت إضافة السيارة بنجاح',
    deleteCarConfirm: 'حذف السيارة ومعاملاتها؟',
    deleteCarSuccess: 'تم حذف السيارة بنجاح',
    editCarPromptName: 'اسم السيارة',
    editCarPromptRent: 'الإيجار اليومي',
    editCarPromptPrice: 'سعر السيارة',
    updateCarSuccess: 'تم تحديث السيارة بنجاح',
    validAmount: 'يرجى إدخال مبلغ صحيح',
    noCarsAvailable: 'لا توجد سيارات متاحة',
    addEntrySuccess: 'تمت إضافة المعاملة بنجاح',
    addEntryFail: 'فشل إضافة المعاملة',
    chooseCar: 'يرجى اختيار سيارة',
    deleteEntryConfirm: 'حذف هذه المعاملة؟',
    deleteEntrySuccess: 'تم حذف المعاملة بنجاح',
    editEntryPromptAmount: 'المبلغ',
    editEntryPromptCategory: 'الفئة',
    updateEntrySuccess: 'تم تحديث المعاملة بنجاح',
    generateReportSuccess: 'تم إنشاء التقرير بنجاح',
    exportCSVSuccess: 'تم تصدير CSV بنجاح',
    exportPDFSuccess: 'تم تصدير تقرير PDF بنجاح',
    noDataExport: 'لا توجد بيانات للتصدير',
    loadPDFError: 'فشل تحميل مكتبات PDF',
    createPDFError: 'فشل إنشاء PDF',
    exportPDFError: 'فشل تصدير PDF',
    backupDownloadSuccess: 'تم تحميل النسخة الاحتياطية',
    restoreConfirm: 'استعادة النسخة الاحتياطية؟ سيتم إدراج البيانات في Firestore. استمرار؟',
    invalidBackup: 'ملف نسخ احتياطي غير صالح',
    restoreSuccess: 'تمت استعادة النسخة الاحتياطية بنجاح',
    resetConfirm: 'إعادة تعيين التطبيق؟ لن يتم حذف مستندات Firestore تلقائياً. استمرار؟',
    resetInstruction: 'لإعادة التعيين الكامل، احذف المجموعات من Firebase Console -> Firestore (cars, entries, users, meta).',
    fillNameEmail: 'يرجى ملء الاسم والبريد الإلكتروني',
    emailInUse: 'البريد الإلكتروني مستخدم بالفعل',
    addUserSuccess: 'تمت إضافة المستخدم بنجاح',
    addUserFail: 'فشل إضافة المستخدم',
    deleteUserConfirm: 'حذف هذا المستخدم؟',
    deleteUserSuccess: 'تم حذف المستخدم بنجاح',
    impersonate: 'تم الانتقال إلى',
    loginPrompt: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
    loginSuccess: 'تم تسجيل الدخول بنجاح!',
    loginFail: 'فشل تسجيل الدخول',
    logoutSuccess: 'تم تسجيل الخروج بنجاح',
    logoutFail: 'فشل تسجيل الخروج',
    welcome: 'مرحباً',
    systemAdmin: 'مدير النظام',
    guest: 'زائر',
    notLoggedIn: 'غير مسجل',
    dailyIncomeRunConfirm: 'تشغيل نظام الإيراد اليومي لليوم الحالي؟',
    dailyIncomeProcessed: 'تمت المعالجة بنجاح!',
    dailyIncomeCatchUpConfirm: 'تعويض الإيرادات اليومية للأيام الفائتة؟',
    dailyIncomeCatchUpSuccess: 'تم تعويض',
    days: 'يوم',
    entries: 'إضافة',
    currencyChanged: 'تم تغيير العملة إلى',
    themeChanged: 'تم تغيير المظهر',
    languageChanged: 'تم تغيير اللغة إلى',
    carNameRequired: 'يرجى إدخال اسم السيارة',
    income: 'إيراد',
    expense: 'مصروف',
    allTypes: 'الجميع',
    incomeReport: 'تقرير إيرادات',
    expenseReport: 'تقرير مصروفات',
    reportType: 'نوع التقرير',
    statCarsValueRoi: 'قيمة السيارات / العائد',
    barChart: 'الإيرادات والمصروفات',
    pieChart: 'توزيع الإيرادات والمصروفات',
    monthlyTotals: 'إجماليات شهرية',
    roi: 'عائد',
    allCars: 'جميع السيارات',
    entriesCount: 'معاملة',
    revenue: 'إيرادات',
    expenses: 'مصروفات',
    jan: 'يناير', feb: 'فبراير', mar: 'مارس', apr: 'أبريل',
    may: 'مايو', jun: 'يونيو', jul: 'يوليو', aug: 'أغسطس',
    sep: 'سبتمبر', oct: 'أكتوبر', nov: 'نوفمبر', dec: 'ديسمبر'
  },
  en: {
    addCarSuccess: 'Car added successfully',
    deleteCarConfirm: 'Delete car and its entries?',
    deleteCarSuccess: 'Car deleted successfully',
    editCarPromptName: 'Car name',
    editCarPromptRent: 'Daily rent',
    editCarPromptPrice: 'Car price',
    updateCarSuccess: 'Car updated successfully',
    validAmount: 'Please enter a valid amount',
    noCarsAvailable: 'No cars available',
    addEntrySuccess: 'Entry added successfully',
    addEntryFail: 'Failed to add entry',
    chooseCar: 'Please choose a car',
    deleteEntryConfirm: 'Delete this entry?',
    deleteEntrySuccess: 'Entry deleted successfully',
    editEntryPromptAmount: 'Amount',
    editEntryPromptCategory: 'Category',
    updateEntrySuccess: 'Entry updated successfully',
    generateReportSuccess: 'Report generated successfully',
    exportCSVSuccess: 'CSV exported successfully',
    exportPDFSuccess: 'PDF report exported successfully',
    noDataExport: 'No data to export',
    loadPDFError: 'Failed to load PDF libraries',
    createPDFError: 'Failed to create PDF',
    exportPDFError: 'Failed to export PDF',
    backupDownloadSuccess: 'Backup downloaded successfully',
    restoreConfirm: 'Restore backup? This will INSERT data into Firestore. Continue?',
    invalidBackup: 'Invalid backup file',
    restoreSuccess: 'Backup restored successfully',
    resetConfirm: 'Reset app? This will NOT auto-delete Firestore documents. Continue?',
    resetInstruction: 'To fully reset, delete collections from Firebase Console -> Firestore (cars, entries, users, meta).',
    fillNameEmail: 'Please fill name and email',
    emailInUse: 'Email already in use',
    addUserSuccess: 'User added successfully',
    addUserFail: 'Failed to add user',
    deleteUserConfirm: 'Delete this user?',
    deleteUserSuccess: 'User deleted successfully',
    impersonate: 'Impersonated',
    loginPrompt: 'Please provide email and password',
    loginSuccess: 'Login successful!',
    loginFail: 'Login failed',
    logoutSuccess: 'Signed out successfully',
    logoutFail: 'Sign out failed',
    welcome: 'Welcome',
    systemAdmin: 'System Admin',
    guest: 'Guest',
    notLoggedIn: 'Not logged in',
    dailyIncomeRunConfirm: 'Run daily income system for today?',
    dailyIncomeProcessed: 'Processed successfully!',
    dailyIncomeCatchUpConfirm: 'Catch up on missed daily income for previous days?',
    dailyIncomeCatchUpSuccess: 'Caught up',
    days: 'days',
    entries: 'entries',
    currencyChanged: 'Currency changed to',
    themeChanged: 'Theme changed',
    languageChanged: 'Language changed to',
    carNameRequired: 'Please enter car name',
    income: 'Income',
    expense: 'Expense',
    allTypes: 'All types',
    incomeReport: 'Income report',
    expenseReport: 'Expense report',
    reportType: 'Report Type',
    statCarsValueRoi: 'Cars Value / ROI',
    barChart: 'Revenue & Expenses',
    pieChart: 'Financial Split',
    monthlyTotals: 'Monthly totals',
    roi: 'ROI',
    allCars: 'All cars',
    entriesCount: 'entries',
    revenue: 'Revenue',
    expenses: 'Expenses',
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
    may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug',
    sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec'
  }
};

function t(key) {
  return i18nStrings[currentLang]?.[key] || i18nStrings['en']?.[key] || key;
}

// ---------- Helpers ----------
function l(id){ return document.getElementById(id); }

function fmtMoney(amount){ 
  const cur = settingsCache.currency || 'MRU'; 
  const n = Number(amount) || 0; 
  return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}) + ' ' + cur; 
}

function fmtCompactNumber(amount){
  const n = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(n);
}

function fmtCompactMoney(amount){
  return `${fmtCompactNumber(amount)} ${settingsCache.currency || 'MRU'}`;
}

function getDefaultEntriesFromDate(){
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

function getBoundedEntriesFromDate(from = '', to = ''){
  if(from) return from;
  if(to) {
    const d = new Date(to);
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  }
  return getDefaultEntriesFromDate();
}

function buildEntriesDateQuery(from = getDefaultEntriesFromDate(), to = '', maxRows = ENTRIES_READ_LIMIT){
  const constraints = [];
  if(from) constraints.push(where('date', '>=', from));
  if(to) constraints.push(where('date', '<=', to));
  constraints.push(orderBy('date', 'desc'), limit(maxRows));
  return query(collection(db, 'entries'), ...constraints);
}

async function loadEntriesForDateRange(from = getDefaultEntriesFromDate(), to = ''){
  const snapshot = await getDocs(buildEntriesDateQuery(from, to));
  entriesCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderEntriesTable();
  updateDashboard();
  return entriesCache;
}

function filterRowsByType(rows, type){
  if(type && type !== 'all') return rows.filter(r => r.type === type);
  return rows;
}

function getReportRows(){
  const carId = l('reportCar')?.value || 'all';
  const type = l('reportType')?.value || 'all';
  const from = l('reportFrom')?.value || '';
  const to = l('reportTo')?.value || '';

  let rows = entriesCache.slice();
  if(carId && carId !== 'all') rows = rows.filter(r => r.carId === carId);
  rows = filterRowsByType(rows, type);
  if(from) rows = rows.filter(r => r.date >= from);
  if(to) rows = rows.filter(r => r.date <= to);

  rows.sort((a, b) => new Date(a.date) - new Date(b.date));

  const uniqueRows = [];
  const seenIds = new Set();
  rows.forEach(row => {
    if (!seenIds.has(row.id)) {
      seenIds.add(row.id);
      uniqueRows.push(row);
    }
  });
  return uniqueRows;
}

function escapeHtml(str){ 
  if(typeof str !== 'string') return str; 
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); 
}

function downloadFile(filename, contentType, content){ 
  const a=document.createElement('a'); 
  const blob=new Blob([content],{type:contentType}); 
  a.href=URL.createObjectURL(blob); 
  a.download=filename; 
  document.body.appendChild(a); 
  a.click(); 
  document.body.removeChild(a); 
}

function showToast(message, type = 'info', title = '') {
  if (typeof window.showToast === 'function' && window.showToast !== showToast) {
    window.showToast(message, type, title);
    return;
  }

  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const titles = {
    success: t('welcome') || 'Success',
    error: t('loginFail') || 'Error',
    warning: 'Warning',
    info: 'Info'
  };

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${icons[type] || icons.info}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title || titles[type] || 'Notification'}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutLeft 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ---------- Theme Management ----------
function initTheme() {
  const savedTheme = localStorage.getItem('cr_theme') || settingsCache.theme || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const html = document.documentElement;
  const btnIcon = document.querySelector('#btnThemeToggle i');

  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }

  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
    if (btnIcon) btnIcon.className = 'fas fa-sun';
  } else {
    html.removeAttribute('data-theme');
    if (btnIcon) btnIcon.className = 'fas fa-moon';
  }

  settingsCache.theme = theme;
  localStorage.setItem('cr_theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled', 'success');
}

// ---------- PDF Export Functions ----------
async function loadPDFLibraries() {
  return new Promise((resolve, reject) => {
    if (typeof pdfMake === 'undefined') {
      const script1 = document.createElement('script');
      script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.71/pdfmake.min.js';
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.71/vfs_fonts.js';
        script2.onload = () => resolve();
        script2.onerror = reject;
        document.head.appendChild(script2);
      };
      script1.onerror = reject;
      document.head.appendChild(script1);
    } else if (typeof pdfMake.vfs === 'undefined') {
      const script2 = document.createElement('script');
      script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.71/vfs_fonts.js';
      script2.onload = () => resolve();
      script2.onerror = reject;
      document.head.appendChild(script2);
    } else {
      resolve();
    }
  });
}

async function exportToPDF() {
  try {
    const carId = l('reportCar').value;
    const from = l('reportFrom').value;
    const to = l('reportTo').value;
    await loadEntriesForDateRange(getBoundedEntriesFromDate(from, to), to);
    let rows = getReportRows();

    if (rows.length === 0) {
      showToast(t('noDataExport'), 'warning');
      return;
    }

    const income = rows.filter(r=>r.type==='income').reduce((s,r)=>s+Number(r.amount),0);
    const expense = rows.filter(r=>r.type==='expense').reduce((s,r)=>s+Number(r.amount),0);
    const net = income - expense;

    let totalCarsPrice = 0;
    if (carId && carId !== 'all') {
      const selectedCar = carsCache.find(c => c.id === carId);
      totalCarsPrice = selectedCar ? Number(selectedCar.price || 0) : 0;
    } else {
      totalCarsPrice = carsCache.reduce((sum, car) => sum + Number(car.price || 0), 0);
    }

    let roiPercentage = 0;
    if (totalCarsPrice > 0 && net > 0) {
      roiPercentage = (net / totalCarsPrice) * 100;
    }

    showToast('Creating PDF report...', 'info');

    if (typeof pdfMake === 'undefined' || typeof pdfMake.vfs === 'undefined') {
      try {
        await loadPDFLibraries();
      } catch (err) {
        showToast(t('loadPDFError'), 'error');
        return;
      }
    }

    const isAr = currentLang === 'ar';
    const tableBody = rows.map(row => {
      const car = carsCache.find(c => c.id === row.carId);
      const typeText = row.type === 'income' ? t('income') : t('expense');
      const typeColor = row.type === 'income' ? '#10b981' : '#ef4444';

      return [
        { text: row.date, fontSize: 9 },
        { text: car ? car.name : '-', fontSize: 9 },
        { text: typeText, fontSize: 9, color: typeColor },
        { text: row.category || '-', fontSize: 9 },
        { text: fmtMoney(row.amount), fontSize: 9, bold: true }
      ];
    });

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 12
      },
      content: [
        {
          text: isAr ? 'تقرير Ward Cars' : 'Ward Cars Report',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          columns: [
            {
              text: `${isAr ? 'الفترة' : 'Period'}: ${from || (isAr ? 'البداية' : 'Start')} - ${to || (isAr ? 'النهاية' : 'End')}`,
              fontSize: 10,
              color: '#64748b'
            },
            {
              text: `${isAr ? 'تاريخ التقرير' : 'Report Date'}: ${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}`,
              fontSize: 10,
              color: '#64748b',
              alignment: 'left'
            }
          ],
          margin: [0, 0, 0, 20]
        },
        {
          text: isAr ? 'الإحصائيات' : 'Statistics',
          style: 'subheader',
          margin: [0, 0, 0, 10]
        },
        {
          columns: [
            {
              stack: [
                { text: isAr ? 'إجمالي الإيرادات:' : 'Total Income:', fontSize: 11, color: '#0e7490' },
                { text: fmtMoney(income), fontSize: 16, bold: true, color: '#0369a1', margin: [0, 2, 0, 10] },
                { text: isAr ? 'إجمالي المصروفات:' : 'Total Expenses:', fontSize: 11, color: '#b91c1c' },
                { text: fmtMoney(expense), fontSize: 16, bold: true, color: '#dc2626', margin: [0, 2, 0, 10] },
              ],
              width: '50%'
            },
            {
              stack: [
                { text: isAr ? 'صافي الربح:' : 'Net Profit:', fontSize: 11, color: '#047857' },
                { text: fmtMoney(net), fontSize: 16, bold: true, color: '#059669', margin: [0, 2, 0, 10] },
                { text: isAr ? 'قيمة السيارات:' : 'Cars Value:', fontSize: 11, color: '#7c3aed' },
                { text: fmtMoney(totalCarsPrice), fontSize: 16, bold: true, color: '#7c3aed', margin: [0, 2, 0, 5] },
                { text: `${isAr ? 'العائد' : 'ROI'}: ${roiPercentage.toFixed(2)}%`, fontSize: 12, color: roiPercentage > 0 ? '#10b981' : '#ef4444', bold: true },
              ],
              width: '50%'
            }
          ],
          margin: [0, 0, 0, 25]
        },
        {
          text: `${isAr ? 'تفاصيل المعاملات' : 'Transaction Details'} (${rows.length} ${isAr ? 'معاملة' : 'transactions'})`,
          style: 'subheader',
          margin: [0, 0, 0, 10]
        },
        {
          table: {
            headerRows: 1,
            widths: ['15%', '25%', '15%', '20%', '25%'],
            body: [
              [
                { text: isAr ? 'التاريخ' : 'Date', style: 'tableHeader', bold: true, fontSize: 11 },
                { text: isAr ? 'السيارة' : 'Car', style: 'tableHeader', bold: true, fontSize: 11 },
                { text: isAr ? 'النوع' : 'Type', style: 'tableHeader', bold: true, fontSize: 11 },
                { text: isAr ? 'الفئة' : 'Category', style: 'tableHeader', bold: true, fontSize: 11 },
                { text: isAr ? 'المبلغ' : 'Amount', style: 'tableHeader', bold: true, fontSize: 11 }
              ],
              ...tableBody
            ]
          },
          layout: {
            fillColor: function(rowIndex) {
              return (rowIndex % 2 === 0) ? '#f8fafc' : null;
            },
            hLineWidth: function(i, node) {
              return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
            },
            vLineWidth: function() { return 0.5; },
            hLineColor: function() { return '#e2e8f0'; },
            vLineColor: function() { return '#e2e8f0'; },
            paddingLeft: function() { return 8; },
            paddingRight: function() { return 8; },
            paddingTop: function() { return 6; },
            paddingBottom: function() { return 6; }
          }
        },
        {
          text: [
            { text: `${isAr ? 'تم إنشاؤه تلقائياً بواسطة نظام' : 'Generated automatically by'} "Aly Mokhtar" ${isAr ? 'إدارة' : 'Management'} System\n`, fontSize: 9, color: '#94a3b8' },
            { text: `© ${new Date().getFullYear()} Car Rental System - ${isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved'}`, fontSize: 9, color: '#94a3b8' }
          ],
          alignment: 'center',
          margin: [0, 30, 0, 0]
        }
      ],
      styles: {
        header: { fontSize: 24, bold: true, color: '#2c3e50' },
        subheader: { fontSize: 16, bold: true, color: '#475569' },
        tableHeader: { bold: true, fontSize: 11, color: '#475569', fillColor: '#f1f5f9' }
      }
    };

    try {
      pdfMake.createPdf(docDefinition).download(`car_rental_report_${new Date().toISOString().slice(0,10)}.pdf`);
      showToast(t('exportPDFSuccess'), 'success');
    } catch (pdfError) {
      showToast(t('createPDFError'), 'error');
    }
  } catch (error) {
    showToast(t('exportPDFError') + ': ' + error.message, 'error');
  }
}

// ---------- Daily Income System ----------
class DailyIncomeProcessor {
  constructor() {
    this.isProcessing = false;
    this.lastProcessedDate = null;
    this.maxCatchUpDays = 365;
  }

  async init() {
    await this.loadLastProcessedDate();
  }

  async loadLastProcessedDate() {
    try {
      const metaRef = doc(db, 'meta', 'daily_income');
      const metaDoc = await getDoc(metaRef);
      if (metaDoc.exists()) {
        this.lastProcessedDate = metaDoc.data().lastDate || null;
      } else {
        await setDoc(metaRef, { lastDate: null, updatedAt: serverTimestamp() });
      }
    } catch (err) {
      console.error('Error loading last processed date:', err);
    }
  }

  async saveProcessingState(date) {
    try {
      const metaRef = doc(db, 'meta', 'daily_income');
      await setDoc(metaRef, { lastDate: date, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Error saving processing state:', err);
    }
  }

  async processDailyIncomeWithCatchUp() {
    if (this.isProcessing) return { success: false, reason: 'already_processing' };
    try {
      this.isProcessing = true;
      const today = this.getMauritaniaDate();
      let startDate = this.lastProcessedDate || today;
      const startDateObj = new Date(startDate);
      const todayDateObj = new Date(today);
      const daysDiff = Math.floor((todayDateObj - startDateObj) / (1000 * 3600 * 24));
      if (daysDiff <= 0) return { success: true, reason: 'no_days_to_process', entriesAdded: 0 };

      const daysToProcess = Math.min(daysDiff, this.maxCatchUpDays);
      const datesToProcess = [];
      for (let i = 1; i <= daysToProcess; i++) {
        const dateObj = new Date(startDateObj);
        dateObj.setDate(dateObj.getDate() + i);
        datesToProcess.push(dateObj.toISOString().split('T')[0]);
      }

      const carsSnapshot = await getDocs(collection(db, 'cars'));
      const cars = [];
      carsSnapshot.forEach(d => cars.push({ id: d.id, ...d.data() }));
      const carsWithRent = cars.filter(car => Number(car.dailyRent) > 0);
      if (carsWithRent.length === 0) {
        await this.saveProcessingState(today);
        this.lastProcessedDate = today;
        return { success: true, reason: 'no_cars_with_rent', entriesAdded: 0 };
      }

      let totalEntriesAdded = 0, totalAmount = 0;
      for (const date of datesToProcess) {
        const result = await this.processDay(date, carsWithRent);
        totalEntriesAdded += result.count;
        totalAmount += result.amount;
        await this.saveProcessingState(date);
        this.lastProcessedDate = date;
      }
      await this.saveProcessingState(today);
      this.lastProcessedDate = today;
      await this.refreshEntriesCache();

      if (totalEntriesAdded > 0) {
        showToast(`${t('dailyIncomeCatchUpSuccess')} ${datesToProcess.length} ${t('days')}, ${totalEntriesAdded} ${t('entries')}`, 'success');
        await this.logCatchUpProcessing(datesToProcess, totalEntriesAdded, totalAmount);
      } else {
        showToast('All days checked, no new income to add', 'info');
      }
      return { success: true, reason: 'processed', daysProcessed: datesToProcess.length, entriesAdded: totalEntriesAdded, totalAmount };
    } catch (err) {
      console.error('Error in daily income catch-up:', err);
      showToast('Failed to add daily income: ' + err.message, 'error');
      return { success: false, reason: 'error', error: err };
    } finally {
      this.isProcessing = false;
    }
  }

  async processDay(date, carsWithRent) {
    try {
      const existingEntries = await this.getEntriesForDate(date);
      const existingCarIds = new Set(existingEntries.map(e => e.carId));
      const carsToProcess = carsWithRent.filter(car => !existingCarIds.has(car.id));
      if (carsToProcess.length === 0) return { count: 0, amount: 0 };

      let entriesAdded = 0, dayTotalAmount = 0;
      for (const car of carsToProcess) {
        try {
          await this.addDailyIncomeForCar(car, date);
          entriesAdded++;
          dayTotalAmount += Number(car.dailyRent);
        } catch (err) { console.error(`Error processing car ${car.name} for ${date}:`, err); }
      }
      return { count: entriesAdded, amount: dayTotalAmount };
    } catch (err) { throw err; }
  }

  async addDailyIncomeForCar(car, date) {
    const entriesQuery = query(collection(db, 'entries'), where('carId', '==', car.id), where('date', '==', date), where('category', '==', 'Daily Rent'));
    const querySnapshot = await getDocs(entriesQuery);
    if (!querySnapshot.empty) throw new Error('Entry already exists for this car on this date');
    const entryData = {
      carId: car.id, date, type: 'income', amount: Number(car.dailyRent) || 0, category: 'Daily Rent',
      note: `Daily automated income - ${car.name}`, autoGenerated: true, timestamp: new Date().toISOString(),
      processedAt: new Date().toISOString(), catchUpEntry: true
    };
    await addDoc(collection(db, 'entries'), entryData);
  }

  async getEntriesForDate(date) {
    const entriesQuery = query(collection(db, 'entries'), where('date', '==', date), where('category', '==', 'Daily Rent'));
    const snapshot = await getDocs(entriesQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async refreshEntriesCache() {
    await loadEntriesForDateRange();
  }

  async logCatchUpProcessing(dates, count, total) {
    try {
      await addDoc(collection(db, 'daily_income_logs'), {
        datesProcessed: dates, processedAt: new Date().toISOString(),
        entriesAdded: count, totalAmount: total, currency: settingsCache.currency,
        type: 'catch_up', success: true
      });
    } catch (err) { console.error('Error logging catch-up:', err); }
  }

  getMauritaniaDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nouakchott' });
  }

  async getProcessingStatus() {
    const today = this.getMauritaniaDate();
    const todayEntries = await this.getEntriesForDate(today);
    let missedDays = 0;
    if (this.lastProcessedDate) {
      const lastDateObj = new Date(this.lastProcessedDate);
      const todayDateObj = new Date(today);
      missedDays = Math.max(0, Math.floor((todayDateObj - lastDateObj) / (1000 * 3600 * 24)) - 1);
    }
    return {
      today, lastProcessedDate: this.lastProcessedDate, isTodayProcessed: this.lastProcessedDate === today,
      missedDays, carsCount: carsCache.length, carsWithDailyRent: carsCache.filter(c => Number(c.dailyRent) > 0).length,
      todayEntriesCount: todayEntries.length, maxCatchUpDays: this.maxCatchUpDays
    };
  }

  async processCurrentDay() {
    if (this.isProcessing) return { success: false, reason: 'already_processing' };
    try {
      this.isProcessing = true;
      const today = this.getMauritaniaDate();
      if (this.lastProcessedDate === today) return { success: true, reason: 'already_processed_today', entriesAdded: 0 };
      const carsSnapshot = await getDocs(collection(db, 'cars'));
      const cars = [];
      carsSnapshot.forEach(d => cars.push({ id: d.id, ...d.data() }));
      const carsWithRent = cars.filter(car => Number(car.dailyRent) > 0);
      if (carsWithRent.length === 0) {
        await this.saveProcessingState(today);
        this.lastProcessedDate = today;
        return { success: true, reason: 'no_cars_with_rent', entriesAdded: 0 };
      }
      const result = await this.processDay(today, carsWithRent);
      await this.saveProcessingState(today);
      this.lastProcessedDate = today;
      await this.refreshEntriesCache();
      if (result.count > 0) showToast(`${t('dailyIncomeProcessed')} ${result.count} ${t('entries')}`, 'success');
      return { success: true, reason: 'processed', entriesAdded: result.count, totalAmount: result.amount };
    } catch (err) {
      console.error('Error processing current day:', err);
      return { success: false, reason: 'error', error: err };
    } finally { this.isProcessing = false; }
  }
}

const dailyIncomeProcessor = new DailyIncomeProcessor();

let dailyIncomeInterval = null;
function setupDailyIncomeScheduler() {
  if (dailyIncomeInterval) clearInterval(dailyIncomeInterval);
  dailyIncomeProcessor.init().then(async () => {
    setTimeout(async () => {
      await dailyIncomeProcessor.processDailyIncomeWithCatchUp();
      setTimeout(async () => { await dailyIncomeProcessor.processCurrentDay(); }, 1000);
    }, 3000);
  });
  dailyIncomeInterval = setInterval(async () => { await dailyIncomeProcessor.processCurrentDay(); }, 30 * 60 * 1000);
  scheduleMidnightCheck();
}

function scheduleMidnightCheck() {
  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 5, 0, 0);
  const timeUntilMidnight = nextMidnight - now;
  setTimeout(async () => {
    await dailyIncomeProcessor.processCurrentDay();
    scheduleMidnightCheck();
  }, timeUntilMidnight);
  console.log(`Next check scheduled at: ${new Date(Date.now() + timeUntilMidnight).toLocaleString()}`);
}

function stopDailyIncomeScheduler() {
  if (dailyIncomeInterval) { clearInterval(dailyIncomeInterval); dailyIncomeInterval = null; }
}

function setupDailyIncomeUI() {
  const btnRun = l('btnRunDailyIncome');
  const btnCatch = l('btnRunCatchUp');
  const btnStatus = l('btnCheckDailyStatus');

  if (btnRun) {
    btnRun.addEventListener('click', async () => {
      if (confirm(t('dailyIncomeRunConfirm'))) {
        const result = await dailyIncomeProcessor.processCurrentDay();
        if (result.success) showToast(`${t('dailyIncomeProcessed')} ${result.entriesAdded || 0} ${t('entries')}`, 'success');
      }
    });
  }

  if (btnCatch) {
    btnCatch.addEventListener('click', async () => {
      if (confirm(t('dailyIncomeCatchUpConfirm'))) {
        const result = await dailyIncomeProcessor.processDailyIncomeWithCatchUp();
        if (result.success) showToast(`${t('dailyIncomeCatchUpSuccess')} ${result.daysProcessed || 0} ${t('days')}, ${result.entriesAdded || 0} ${t('entries')}`, 'success');
      }
    });
  }

  if (btnStatus) {
    btnStatus.addEventListener('click', async () => await checkDailyIncomeStatus());
  }
}

async function checkDailyIncomeStatus() {
  try {
    const status = await dailyIncomeProcessor.getProcessingStatus();
    const isAr = currentLang === 'ar';
    l('dailyIncomeStatus').style.display = 'block';
    l('statusContent').innerHTML = `
      <h4 style="margin: 0 0 12px; font-weight: 700;">${isAr ? 'حالة نظام الإيراد اليومي' : 'Daily Income System Status'}</h4>
      <div class="status-grid">
        <div class="status-item">
          <div class="status-label">${isAr ? 'تاريخ اليوم' : 'Today\'s Date'}</div>
          <div class="status-value" style="color: var(--primary);">${status.today}</div>
        </div>
        <div class="status-item">
          <div class="status-label">${isAr ? 'آخر معالجة' : 'Last Processed'}</div>
          <div class="status-value">${status.lastProcessedDate || (isAr ? 'لم تتم' : 'Not processed')}</div>
        </div>
        <div class="status-item">
          <div class="status-label">${isAr ? 'الأيام الفائتة' : 'Missed Days'}</div>
          <div class="status-value" style="color: ${status.missedDays > 0 ? 'var(--warning)' : 'var(--success)'};">${status.missedDays} ${t('days')}</div>
        </div>
        <div class="status-item">
          <div class="status-label">${isAr ? 'حالة اليوم' : 'Today Status'}</div>
          <div class="status-value" style="color: ${status.isTodayProcessed ? 'var(--success)' : 'var(--warning)'};">${status.isTodayProcessed ? (isAr ? '✅ تمت' : '✅ Done') : (isAr ? '⏳ بحاجة للمعالجة' : '⏳ Needs processing')}</div>
        </div>
        <div class="status-item">
          <div class="status-label">${isAr ? 'إجمالي السيارات' : 'Total Cars'}</div>
          <div class="status-value">${status.carsCount}</div>
        </div>
        <div class="status-item">
          <div class="status-label">${isAr ? 'سيارات بإيجار' : 'Cars with Rent'}</div>
          <div class="status-value">${status.carsWithDailyRent}</div>
        </div>
        <div class="status-item">
          <div class="status-label">${isAr ? 'إيرادات اليوم' : 'Today Entries'}</div>
          <div class="status-value">${status.todayEntriesCount}</div>
        </div>
      </div>
      <div style="margin-top: 16px; padding: 12px; background: var(--bg); border-radius: 8px;">
        <h5 style="margin: 0 0 8px;">${isAr ? 'معلومات التعويض:' : 'Catch-up Info:'}</h5>
        <ul style="margin: 0; padding-${isAr ? 'right' : 'left'}: 20px; font-size: 13px; color: var(--text-secondary);">
          <li>${isAr ? 'الحد الأقصى للتعويض' : 'Max catch-up'}: ${status.maxCatchUpDays} ${t('days')}</li>
          <li>${isAr ? 'التعويض التلقائي عند فتح التطبيق' : 'Automatic catch-up when app opens'}</li>
          <li>${isAr ? 'التعويض اليدوي عبر زر "تعويض الأيام"' : 'Manual catch-up using "Catch Up Days" button'}</li>
        </ul>
      </div>
    `;
  } catch (err) { 
    console.error('Error checking status:', err); 
    showToast('Failed to check system status', 'error'); 
  }
}

function setupExportPDFButton() {
  const btnPDF = l('btnExportPDF');
  if (btnPDF) {
    btnPDF.addEventListener('click', exportToPDF);
  }
}

// ---------- Attach / detach realtime listeners ----------
function attachRealtimeListeners() {
  detachRealtimeListeners();
  unsubCars = onSnapshot(collection(db, 'cars'), snap => {
    carsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCarsTable();
    populateCarSelects();
    updateDashboard();
  }, err => { 
    console.error('cars snapshot error', err); 
    showToast('Failed to load cars: ' + err.message, 'error'); 
  });

  unsubEntries = onSnapshot(buildEntriesDateQuery(), snap => {
    entriesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderEntriesTable();
    updateDashboard();
  }, err => { 
    console.error('entries snapshot error', err); 
    showToast('Failed to load entries: ' + err.message, 'error'); 
  });

  unsubUsers = onSnapshot(collection(db, 'users'), snap => {
    usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderUsers();
  }, err => { 
    console.error('users snapshot error', err); 
    showToast('Failed to load users: ' + err.message, 'error'); 
  });
}

function detachRealtimeListeners() {
  if (typeof unsubCars === 'function') { try { unsubCars(); } catch(e){} unsubCars = null; }
  if (typeof unsubEntries === 'function') { try { unsubEntries(); } catch(e){} unsubEntries = null; }
  if (typeof unsubUsers === 'function') { try { unsubUsers(); } catch(e){} unsubUsers = null; }
  carsCache = []; entriesCache = []; usersCache = [];
  renderCarsTable(); renderEntriesTable(); renderUsers(); updateDashboard();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) detachRealtimeListeners();
  else if (auth.currentUser) attachRealtimeListeners();
});

(async function loadSettings(){
  try {
    const sRef = doc(db,'meta','settings');
    const sDoc = await getDoc(sRef);
    if (sDoc.exists()) settingsCache = { ...settingsCache, ...sDoc.data() };
    else await setDoc(sRef, settingsCache);

    const currencyEl = l('settingCurrency'); 
    if (currencyEl) currencyEl.value = settingsCache.currency || 'MRU';

    const themeEl = l('settingTheme'); 
    if (themeEl) themeEl.value = settingsCache.theme || 'light';

    applyTheme(settingsCache.theme || 'light');
  } catch (err) { 
    console.error('load settings error', err); 
  }
})();

// ---------- Firestore CRUD ----------
async function addCarToDB(obj){ 
  try{ 
    await addDoc(collection(db,'cars'), obj); 
  } catch(err){ 
    console.error('addCar error', err); 
    showToast(t('addCarSuccess') + ': ' + (err.message||err), 'error'); 
  } 
}

async function deleteCarFromDB(id){ 
  try{ 
    await deleteDoc(doc(db,'cars',id)); 
  } catch(err){ 
    console.error(err); 
    showToast('Failed to delete car', 'error'); 
  } 
}

async function updateCarInDB(id,payload){ 
  try{ 
    await updateDoc(doc(db,'cars',id), payload); 
  } catch(err){ 
    console.error(err); 
  } 
}

async function addEntryToDB(obj){ 
  try{ 
    await addDoc(collection(db,'entries'), obj); 
  } catch(err){ 
    console.error('addEntry error', err); 
    showToast(t('addEntryFail') + ': ' + (err.message||err), 'error'); 
  } 
}

async function deleteEntryFromDB(id){ 
  try{ 
    await deleteDoc(doc(db,'entries',id)); 
  } catch(err){ 
    console.error(err); 
    showToast('Failed to delete entry', 'error'); 
  } 
}

async function updateEntryInDB(id,payload){ 
  try{ 
    await updateDoc(doc(db,'entries',id), payload); 
  } catch(err){ 
    console.error(err); 
  } 
}

async function addUserToDB(obj){ 
  try{ 
    const safeObj = { name: obj.name, email: obj.email, role: obj.role }; 
    await addDoc(collection(db,'users'), safeObj); 
  } catch(err){ 
    console.error(err); 
    showToast(t('addUserFail'), 'error'); 
  } 
}

async function deleteUserFromDB(id){ 
  try{ 
    await deleteDoc(doc(db,'users',id)); 
  } catch(err){ 
    console.error(err); 
    showToast('Failed to delete user', 'error'); 
  } 
}

const dailyMetaRef = doc(db,'meta','daily_income');
async function getLastRentDate(){ 
  try{ 
    const d = await getDoc(dailyMetaRef); 
    if(d.exists()) return d.data().lastDate || null; 
    return null; 
  } catch(err){ 
    console.error(err); 
    return null; 
  } 
}

async function setLastRentDate(dateStr){ 
  try{ 
    await setDoc(dailyMetaRef, { lastDate: dateStr }, { merge: true }); 
  } catch(err){ 
    console.error(err); 
  } 
}

// ---------- UI rendering ----------
function renderCarsTable(){
  const tbody = l('carsTable').querySelector('tbody'); 
  const emptyState = document.getElementById('carsEmptyState');
  tbody.innerHTML = '';

  if(carsCache.length === 0){
    if(emptyState) emptyState.style.display = 'block';
    if(l('carsTable')) l('carsTable').style.display = 'none';
  } else {
    if(emptyState) emptyState.style.display = 'none';
    if(l('carsTable')) l('carsTable').style.display = 'table';

    carsCache.forEach(c => {
      const count = entriesCache.filter(e=>e.carId===c.id).length;
      const tr = document.createElement('tr');
      const price = Number(c.price) || 0;
      let roiText = '—', roiClass = '';
      if(price > 0){ 
        const roi = (Number(c.dailyRent||0) * 365) / price * 100; 
        const r = Number(roi.toFixed(1)); 
        roiText = r + '%'; 
        if(r >= 20) roiClass = 'roi-high';
        else if(r >= 10) roiClass = 'roi-medium';
        else roiClass = 'roi-low';
      }
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td class="ltr">${escapeHtml(c.plate||'')}</td>
        <td class="ltr" style="font-weight:700; color: var(--success);">${fmtMoney(c.dailyRent||0)}</td>
        <td class="ltr" style="font-weight:700;">${price ? fmtMoney(price) : '—'}</td>
        <td class="ltr ${roiClass}">${roiText}</td>
        <td><span class="badge-count">${count}</span></td>
        <td>
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn ghost sm" data-act="edit" data-id="${c.id}"><i class="fas fa-edit"></i></button>
            <button class="btn danger sm" data-act="del" data-id="${c.id}"><i class="fas fa-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }
}

function populateCarSelects(){
  const selects = ['entryCar','filterCar','reportCar'];
  selects.forEach(id=>{
    const el = l(id); 
    if(!el) return;
    const currentVal = el.value || 'all';
    el.innerHTML = `<option value="all">${t('allCars')}</option>`;
    carsCache.forEach(c => el.insertAdjacentHTML('beforeend', `<option value="${c.id}">${escapeHtml(c.name)}</option>`));
    el.value = currentVal;
  });
}

function renderEntriesTable(){
  populateCarSelects();
  const tbody = l('entriesTable').querySelector('tbody'); 
  const emptyState = document.getElementById('entriesEmptyState');
  const countBadge = document.getElementById('entriesCount');
  tbody.innerHTML = '';

  let rows = entriesCache.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  const carFilter = l('filterCar').value;
  const typeFilter = l('filterType')?.value || 'all';
  const to = l('filterTo').value;
  const from = getBoundedEntriesFromDate(l('filterFrom').value, to);

  if(carFilter && carFilter!=='all') rows = rows.filter(r=> r.carId===carFilter);
  rows = filterRowsByType(rows, typeFilter);
  if(from) rows = rows.filter(r=> r.date >= from);
  if(to) rows = rows.filter(r=> r.date <= to);

  if(countBadge) countBadge.textContent = `${rows.length} ${t('entriesCount')}`;

  if(rows.length === 0){
    if(emptyState) emptyState.style.display = 'block';
    if(l('entriesTable')) l('entriesTable').style.display = 'none';
  } else {
    if(emptyState) emptyState.style.display = 'none';
    if(l('entriesTable')) l('entriesTable').style.display = 'table';

    rows.forEach(e=>{
      const car = carsCache.find(c=>c.id===e.carId);
      const typeTag = e.type==='income' 
        ? `<span class="tag income"><i class="fas fa-arrow-up"></i> ${t('income')}</span>` 
        : `<span class="tag expense"><i class="fas fa-arrow-down"></i> ${t('expense')}</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="ltr">${e.date}</td>
        <td>${escapeHtml(car?car.name:'-')}</td>
        <td>${typeTag}</td>
        <td>${escapeHtml(e.category||'')}</td>
        <td class="ltr" style="font-weight:800; color: ${e.type==='income' ? 'var(--success)' : 'var(--danger)'};">${fmtMoney(e.amount)}</td>
        <td>
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn ghost sm" data-act="edit-entry" data-id="${e.id}"><i class="fas fa-edit"></i></button>
            <button class="btn danger sm" data-act="del-entry" data-id="${e.id}"><i class="fas fa-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }
}

function renderReportSummary(){
  const carId = l('reportCar').value;
  let rows = getReportRows();

  const income = rows.filter(r=>r.type==='income').reduce((s,r)=>s+Number(r.amount),0);
  const expense = rows.filter(r=>r.type==='expense').reduce((s,r)=>s+Number(r.amount),0);
  const net = income - expense;

  let totalCarsPrice = 0;
  if (carId && carId !== 'all') {
    const selectedCar = carsCache.find(c => c.id === carId);
    totalCarsPrice = selectedCar ? Number(selectedCar.price || 0) : 0;
  } else {
    totalCarsPrice = carsCache.reduce((sum, car) => sum + Number(car.price || 0), 0);
  }

  let roiPercentage = 0;
  if (totalCarsPrice > 0 && net > 0) roiPercentage = (net / totalCarsPrice) * 100;

  const out = l('reportSummary');
  const isAr = currentLang === 'ar';

  let html = `
    <div style="padding: 8px;">
      <h2 style="text-align: center; margin-bottom: 24px; font-weight: 800; color: var(--text-primary);">${isAr ? 'معاينة التقرير' : 'Report Preview'}</h2>
      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card" style="padding: 20px;">
          <div class="stat-label">${t('income')}</div>
          <div class="stat-value" style="color: var(--success); font-size: 24px;">${fmtMoney(income)}</div>
        </div>
        <div class="stat-card" style="padding: 20px;">
          <div class="stat-label">${t('expense')}</div>
          <div class="stat-value" style="color: var(--danger); font-size: 24px;">${fmtMoney(expense)}</div>
        </div>
        <div class="stat-card" style="padding: 20px;">
          <div class="stat-label">${t('statNet')}</div>
          <div class="stat-value" style="color: var(--info); font-size: 24px;">${fmtMoney(net)}</div>
        </div>
        <div class="stat-card" style="padding: 20px;">
          <div class="stat-label">${isAr ? 'قيمة السيارات / العائد' : 'Cars Value / ROI'}</div>
          <div class="stat-value" style="color: var(--secondary); font-size: 24px;">${fmtMoney(totalCarsPrice)}</div>
          <div style="font-size: 14px; color: ${roiPercentage > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700; margin-top: 4px;">${roiPercentage.toFixed(2)}% ${isAr ? 'عائد' : 'ROI'}</div>
        </div>
      </div>
      <div>
        <h3 style="margin-bottom: 16px; font-weight: 700;">${isAr ? 'معاينة البيانات' : 'Data Preview'} (${rows.length} ${t('entriesCount')})</h3>
      </div>
    </div>`;

  if (rows.length > 0) {
    html += `<div class="table-container"><table class="data-table" style="width:100%; border-collapse: collapse;"><thead><tr><th>${t('thDate')}</th><th>${t('thCar')}</th><th>${t('thType')}</th><th>${t('thCategory')}</th><th>${t('thAmount')}</th></tr></thead><tbody>`;
    rows.slice(0, 40).forEach(r => {
      const carName = escapeHtml((carsCache.find(c=>c.id===r.carId)||{}).name||'-');
      const typeColor = r.type === 'income' ? 'var(--success)' : 'var(--danger)';
      const typeText = r.type === 'income' ? t('income') : t('expense');
      html += `<tr><td class="ltr">${r.date}</td><td>${carName}</td><td><span style="color:${typeColor}; font-weight: 700;">${typeText}</span></td><td>${escapeHtml(r.category || '-')}</td><td class="ltr" style="font-weight: 700; color: ${typeColor};">${fmtMoney(r.amount)}</td></tr>`;
    });
    if (rows.length > 40) html += `<tr><td colspan="5" style="text-align: center; padding: 12px; color: var(--text-muted);">... ${isAr ? 'و' : 'and'} ${rows.length - 40} ${isAr ? 'معاملة أخرى (ستظهر في PDF)' : 'more transactions (will be shown in PDF)'}</td></tr>`;
    html += `</tbody></table></div>`;
  } else {
    html += `<div class="empty-state" style="padding: 40px;"><i class="fas fa-inbox" style="font-size: 48px;"></i><h4>${isAr ? 'لا توجد بيانات في الفترة المحددة' : 'No data in selected period'}</h4></div>`;
  }

  html += `<div style="margin-top: 24px; padding: 16px; background: var(--bg); border-radius: var(--radius-md); border: 1px solid var(--border);"><p style="margin: 0; color: var(--text-secondary); font-size: 14px;"><strong>${isAr ? 'ملاحظة:' : 'Note:'}</strong> ${isAr ? 'هذه معاينة مبسطة. جميع البيانات (' + rows.length + ' معاملة) ستُصدَّر في ملف PDF.' : 'This is a simplified preview. All data (' + rows.length + ' transactions) will be exported in PDF.'}</p></div></div>`;
  out.innerHTML = html;
}

function renderUsers(){
  const tbody = l('usersTable').querySelector('tbody'); 
  const emptyState = document.getElementById('usersEmptyState');
  tbody.innerHTML = '';

  if(usersCache.length === 0){
    if(emptyState) emptyState.style.display = 'block';
    if(l('usersTable')) l('usersTable').style.display = 'none';
  } else {
    if(emptyState) emptyState.style.display = 'none';
    if(l('usersTable')) l('usersTable').style.display = 'table';

    usersCache.forEach(u=>{
      const roleClass = u.role === 'admin' ? 'admin' : u.role === 'manager' ? 'manager' : 'user';
      const roleText = u.role === 'admin' ? t('admin') : u.role === 'manager' ? t('manager') : t('user');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td class="ltr">${escapeHtml(u.email)}</td>
        <td><span class="tag ${roleClass}">${roleText}</span></td>
        <td>
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn ghost sm" data-act="impersonate" data-id="${u.id}"><i class="fas fa-user-secret"></i></button>
            <button class="btn danger sm" data-act="del-user" data-id="${u.id}"><i class="fas fa-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }
}

function updateDashboard(){
  const rev = entriesCache.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0);
  const exp = entriesCache.filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount),0);
  const carsValue = carsCache.reduce((s,c)=>s+Number(c.price || 0),0);
  const net = rev - exp;
  const roi = carsValue > 0 && net > 0 ? (net / carsValue) * 100 : 0;

  l('statRevenue').innerText = fmtMoney(rev);
  l('statExpenses').innerText = fmtMoney(exp);
  l('statNet').innerText = fmtMoney(net);
  l('statCars').innerText = fmtMoney(carsValue);
  const statCarsRoi = l('statCarsRoi');
  if(statCarsRoi) statCarsRoi.innerText = `${roi.toFixed(2)}% ${t('roi')}`;

  updateMonthlyChart();
}

let monthlyChart = null;
let barsChart = null;
let pieChart = null;
function updateMonthlyChart(){
  if(typeof Chart === 'undefined'){ 
    console.warn('Chart.js not loaded'); 
    return; 
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const isAr = currentLang === 'ar';

  const now = new Date();
  const months = [], revData = [], expData = [];

  // Use English month names (Gregorian calendar) always
  for(let i=11;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    // Always use English locale for month names to ensure Gregorian calendar
    const monthName = d.toLocaleString('en-US', {month: 'short'});
    const yearStr = d.getFullYear();
    months.push(`${monthName} ${yearStr}`);
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const entries = entriesCache.filter(en=> en.date.startsWith(key));
    revData.push(entries.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0));
    expData.push(entries.filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount),0));
  }

  const ctx = document.getElementById('chartMonthly')?.getContext('2d');
  if(!ctx) return;

  if(monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(ctx, { 
    type: 'line', 
    data: { 
      labels: months, 
      datasets: [
        {
          label: t('revenue'), 
          data: revData, 
          tension: 0.4, 
          borderColor: '#10b981', 
          backgroundColor: 'rgba(16,185,129,0.1)', 
          fill: true,
          borderWidth: 3,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: t('expenses'), 
          data: expData, 
          tension: 0.4, 
          borderColor: '#ef4444', 
          backgroundColor: 'rgba(239,68,68,0.1)', 
          fill: true,
          borderWidth: 3,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    }, 
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: {
              family: isAr ? 'Cairo' : 'Inter',
              size: 12
            },
            color: textColor
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#fff',
          titleColor: isDark ? '#fff' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#475569',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: { family: isAr ? 'Cairo' : 'Inter', size: 13 },
          bodyFont: { family: isAr ? 'Cairo' : 'Inter', size: 12 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { family: isAr ? 'Cairo' : 'Inter', size: 11 }
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: isAr ? 'Cairo' : 'Inter', size: 11 },
            callback: function(value) {
              return fmtCompactMoney(value);
            }
          }
        }
      }
    } 
  });

  updateExtraDashboardCharts(months, revData, expData, { isDark, gridColor, textColor, isAr });
}

function updateExtraDashboardCharts(months, revData, expData, chartTheme){
  const { isDark, gridColor, textColor, isAr } = chartTheme;
  const barsCtx = document.getElementById('chartBars')?.getContext('2d');
  const pieCtx = document.getElementById('chartPie')?.getContext('2d');
  const fontFamily = isAr ? 'Cairo' : 'Inter';

  if(barsCtx){
    if(barsChart) barsChart.destroy();
    barsChart = new Chart(barsCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: t('revenue'), data: revData, backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 8 },
          { label: t('expenses'), data: expData, backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 8 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: textColor, font: { family: fontFamily, size: 12 } } },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#475569',
            callbacks: { label: context => `${context.dataset.label}: ${fmtMoney(context.parsed.y)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { family: fontFamily, size: 10 }, maxRotation: 45 } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: fontFamily, size: 11 }, callback: value => fmtCompactMoney(value) } }
        }
      }
    });
  }

  if(pieCtx){
    const totalRevenue = revData.reduce((s, v) => s + Number(v), 0);
    const totalExpenses = expData.reduce((s, v) => s + Number(v), 0);
    if(pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: [t('revenue'), t('expenses')],
        datasets: [{
          data: [totalRevenue, totalExpenses],
          backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.85)'],
          borderColor: isDark ? '#0f172a' : '#ffffff',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { family: fontFamily, size: 12 }, padding: 16 } },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#475569',
            callbacks: { label: context => `${context.label}: ${fmtCompactMoney(context.parsed)}` }
          }
        }
      }
    });
  }
}

// Make updateMonthlyChart globally accessible for language changes
window.updateMonthlyChart = updateMonthlyChart;

// ---------- Mobile Menu Toggle ----------
function toggleMobileMenu(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');
  if(sidebar && overlay){
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('mobile-open') ? 'hidden' : '';
  }
}

function closeMobileMenu(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');
  if(sidebar && overlay){
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

const btnMenuToggle = document.getElementById('btnMenuToggle');
if(btnMenuToggle) btnMenuToggle.addEventListener('click', toggleMobileMenu);

const mobileOverlay = document.getElementById('mobileOverlay');
if(mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);

// ---------- Tab Navigation ----------
const tabTitles = {
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  cars: { ar: 'السيارات', en: 'Cars' },
  entries: { ar: 'المعاملات', en: 'Entries' },
  reports: { ar: 'التقارير', en: 'Reports' },
  users: { ar: 'المستخدمين', en: 'Users' },
  backup: { ar: 'النسخ الاحتياطي', en: 'Backup' },
  settings: { ar: 'الإعدادات', en: 'Settings' }
};

document.querySelectorAll('#nav button').forEach(btn=>{
  btn.addEventListener('click', ()=>{ 
    document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active')); 
    btn.classList.add('active'); 
    showTab(btn.dataset.tab);
    closeMobileMenu();
  });
});

function showTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.style.display='none');
  const el = document.getElementById('tab-'+id); 
  if(el) {
    el.style.display='block';
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'fadeIn 0.4s ease';
  }

  const pageTitle = l('pageTitle');
  if (pageTitle && tabTitles[id]) {
    pageTitle.textContent = tabTitles[id][currentLang] || tabTitles[id]['en'];
  }
}

// ---------- Add Entry ----------
l('btnAddEntry').addEventListener('click', async ()=>{
  const carId = l('entryCar').value;
  const date = l('entryDate').value || new Date().toISOString().slice(0,10);
  const type = l('entryType').value;
  const amount = parseFloat(l('entryAmount').value);
  const category = l('entryCategory').value.trim();

  if(isNaN(amount) || amount <= 0) return showToast(t('validAmount'), 'warning');

  if (carId === 'all') {
    if (carsCache.length === 0) {
      return showToast(t('noCarsAvailable'), 'warning');
    }
    let successCount = 0;
    let failCount = 0;
    for (const car of carsCache) {
      try {
        await addEntryToDB({ carId: car.id, date, type, amount, category: category || 'N/A', note: '' });
        successCount++;
      } catch(err) {
        console.error(`Failed to add entry for car ${car.name}:`, err);
        failCount++;
      }
    }
    if (successCount > 0) {
      showToast(`${type === 'income' ? t('income') : t('expense')} ${t('addEntrySuccess')} ${successCount} ${t('entriesCount')}`, 'success');
    } else {
      showToast(t('addEntryFail'), 'error');
    }
    l('entryAmount').value=''; 
    l('entryCategory').value='';
    return;
  }

  if(!carId) return showToast(t('chooseCar'), 'warning');
  try {
    await addEntryToDB({ carId, date, type, amount, category: category || 'N/A', note: '' });
    showToast(`${type === 'income' ? t('income') : t('expense')} ${t('addEntrySuccess')}!`, 'success');
    l('entryAmount').value=''; 
    l('entryCategory').value='';
  } catch(err) {
    showToast(t('addEntryFail') + ': ' + (err.message || err), 'error');
  }
});

// Car table actions
l('carsTable').querySelector('tbody').addEventListener('click', async (ev)=>{
  const btn = ev.target.closest('button'); 
  if(!btn) return;
  const act = btn.dataset.act; 
  const id = btn.dataset.id;

  if(act === 'del'){ 
    if(!confirm(t('deleteCarConfirm'))) return; 
    await deleteCarFromDB(id); 
    showToast(t('deleteCarSuccess'), 'success');
  } else if(act === 'edit'){ 
    const car = carsCache.find(c=>c.id===id); 
    const newName = prompt(t('editCarPromptName'), car.name); 
    const newRent = prompt(t('editCarPromptRent'), car.dailyRent); 
    const newPrice = prompt(t('editCarPromptPrice'), car.price||''); 
    let updated=false; 
    if(newName!==null && newName!==car.name){ 
      await updateCarInDB(id,{name:newName}); 
      updated=true;
    } 
    if(newRent!==null && parseFloat(newRent)!==car.dailyRent){ 
      await updateCarInDB(id,{dailyRent: parseFloat(newRent)||0}); 
      updated=true;
    } 
    if(newPrice!==null && parseFloat(newPrice)!==Number(car.price||0)){ 
      await updateCarInDB(id,{price: parseFloat(newPrice)||0}); 
      updated=true;
    } 
    if(updated) { 
      showToast(t('updateCarSuccess'), 'success'); 
    } 
  }
});

// Entries table actions
l('entriesTable').querySelector('tbody').addEventListener('click', async (ev)=>{
  const btn = ev.target.closest('button'); 
  if(!btn) return;
  const act = btn.dataset.act; 
  const id = btn.dataset.id;

  if(act==='del-entry'){ 
    if(!confirm(t('deleteEntryConfirm'))) return; 
    await deleteEntryFromDB(id); 
    showToast(t('deleteEntrySuccess'), 'success');
  } else if(act==='edit-entry'){ 
    const e = entriesCache.find(x=>x.id===id); 
    const newAmt = prompt(t('editEntryPromptAmount'), e.amount); 
    const newCat = prompt(t('editEntryPromptCategory'), e.category); 
    if(newAmt !== null){ 
      await updateEntryInDB(id,{ amount: parseFloat(newAmt) || e.amount, category: newCat || e.category }); 
      showToast(t('updateEntrySuccess'), 'success'); 
    } 
  }
});

// Filters, reports, exports
l('btnApplyFilter').addEventListener('click', async ()=> {
  try {
    await loadEntriesForDateRange(getBoundedEntriesFromDate(l('filterFrom').value, l('filterTo').value), l('filterTo').value);
  } catch (err) {
    console.error('Failed to load filtered entries', err);
    showToast('Failed to load entries: ' + (err.message || err), 'error');
  }
});
l('btnClearFilter').addEventListener('click', async ()=> { 
  l('filterCar').value='all'; 
  if(l('filterType')) l('filterType').value='all';
  l('filterFrom').value=''; 
  l('filterTo').value=''; 
  await loadEntriesForDateRange();
});

l('btnGenerate').addEventListener('click', async ()=> { 
  try {
    await loadEntriesForDateRange(getBoundedEntriesFromDate(l('reportFrom').value, l('reportTo').value), l('reportTo').value);
    renderReportSummary(); 
    showToast(t('generateReportSuccess'), 'success'); 
  } catch (err) {
    console.error('Failed to load report entries', err);
    showToast('Failed to load report entries: ' + (err.message || err), 'error');
  }
});

l('btnExportCSVReport').addEventListener('click', async ()=> {
  try {
    await loadEntriesForDateRange(getBoundedEntriesFromDate(l('reportFrom').value, l('reportTo').value), l('reportTo').value);
  } catch (err) {
    console.error('Failed to load report entries', err);
    showToast('Failed to load report entries: ' + (err.message || err), 'error');
    return;
  }
  let rows = getReportRows();

  const isAr = currentLang === 'ar';
  let csv = isAr ? 'التاريخ,السيارة,النوع,الفئة,المبلغ\n' : 'Date,Car,Type,Category,Amount\n'; 
  rows.forEach(r=> {
    const carName = (carsCache.find(c=>c.id===r.carId)||{}).name || '';
    const typeText = r.type==='income' ? t('income') : t('expense');
    csv += `${r.date},${carName},${typeText},${(r.category||'')},${r.amount}\n`;
  });

  downloadFile('report.csv','text/csv;charset=utf-8;', csv);
  showToast(t('exportCSVSuccess'), 'success');
});

l('btnExportXLS').addEventListener('click', ()=> l('btnExportCSVReport').click());

// Backup / restore
const handleBackupDownload = async () => { 
  const entriesSnapshot = await getDocs(collection(db,'entries'));
  const allEntries = entriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const backup = { cars: carsCache, entries: allEntries, users: usersCache, settings: settingsCache, ts: Date.now() }; 
  downloadFile('car_rental_backup.json','application/json;charset=utf-8;', JSON.stringify(backup,null,2)); 
  showToast(t('backupDownloadSuccess'), 'success'); 
};

const handleBackupUpload = () => {
  const inp = document.createElement('input'); 
  inp.type='file'; 
  inp.accept='.json';
  inp.onchange = async () => {
    const file = inp.files[0]; 
    if(!file) return; 
    const txt = await file.text();
    try {
      const obj = JSON.parse(txt); 
      if(!obj.cars || !obj.entries) return alert(t('invalidBackup'));
      if(!confirm(t('restoreConfirm'))) return;

      for(const c of obj.cars){ 
        await addDoc(collection(db,'cars'), { name:c.name, plate:c.plate||'', dailyRent:c.dailyRent||0, price:c.price||0 }); 
      }
      for(const e of obj.entries){ 
        await addDoc(collection(db,'entries'), { carId:e.carId, date:e.date, type:e.type, amount:e.amount, category:e.category||'', note:e.note||'' }); 
      }
      showToast(t('restoreSuccess'), 'success');
    } catch(err){ 
      alert(t('invalidBackup')); 
    }
  }; 
  inp.click();
};

l('btnDownload').addEventListener('click', handleBackupDownload);
l('btnUpload').addEventListener('click', handleBackupUpload);

l('btnClearAll').addEventListener('click', async ()=> { 
  if(!confirm(t('resetConfirm'))) return; 
  alert(t('resetInstruction')); 
});

// Settings handlers
const settingLanguage = l("settingLanguage");
if (settingLanguage) {
  settingLanguage.addEventListener("change", (e) => { 
    const lang = e.target.value;
    setAppLanguage(lang);
    if (typeof window.setLanguage === 'function') {
      window.setLanguage(lang);
    }
    showToast(`${t('languageChanged')} ${lang === 'ar' ? 'العربية' : 'English'}`, 'success'); 
  });
}

l('settingCurrency').addEventListener('change', async ()=>{ 
  settingsCache.currency = l('settingCurrency').value.trim() || 'MRU'; 
  await setDoc(doc(db,'meta','settings'), settingsCache, { merge:true }); 
  updateDashboard(); 
  showToast(`${t('currencyChanged')} ${settingsCache.currency}`, 'success'); 
});

l('settingTheme').addEventListener('change', (e)=>{ 
  settingsCache.theme = e.target.value; 
  setDoc(doc(db,'meta','settings'), settingsCache, { merge:true }).catch(()=>{}); 
  applyTheme(settingsCache.theme); 
  showToast(t('themeChanged'), 'success'); 
});

// Theme toggle button
const btnThemeToggle = l('btnThemeToggle');
if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', toggleTheme);
}

async function migrateCarsToCurrentUser(user) {
  try {
    const snap = await getDocs(collection(db, "cars"));
    let updated = 0;
    for (const d of snap.docs) {
      if (!d.data().userId) {
        await updateDoc(doc(db, "cars", d.id), { userId: user.uid });
        updated++;
      }
    }
    console.log(`Cars migration done. Updated: ${updated}`);
  } catch (err) { 
    console.error("Cars migration failed", err); 
  }
}

// Add Car
l('btnAddCar').addEventListener('click', async () => {
  const name = l('carName').value.trim();
  const plate = l('carPlate').value.trim();
  const dailyRent = parseFloat(l('carDailyRent').value) || 0;
  const price = parseFloat(l('carPrice').value) || 0;

  if (!name) return showToast(t('carNameRequired'), 'warning');

  try {
    await addCarToDB({ name, plate, dailyRent, price });
    showToast(`${name} ${t('addCarSuccess')}`, 'success');
    l('carName').value = '';
    l('carPlate').value = '';
    l('carDailyRent').value = '';
    l('carPrice').value = '';
  } catch (err) {
    showToast('Failed to add car', 'error');
  }
});

// Users
l('btnAddUser').addEventListener('click', async () => {
  const name=l('newUserName').value.trim(), email=l('newUserEmail').value.trim(), role=l('newUserRole').value;
  if(!name||!email) return showToast(t('fillNameEmail'), 'warning');
  if(usersCache.some(u=>u.email===email)) return showToast(t('emailInUse'), 'error');
  try {
    await addUserToDB({ name, email, role });
    l('newUserName').value=''; 
    l('newUserEmail').value='';
    showToast(`${t('addUserSuccess')}: ${name}`, 'success');
  } catch(err) { 
    showToast(t('addUserFail') + ': ' + (err.message || err), 'error'); 
  }
});

l('usersTable').querySelector('tbody').addEventListener('click', async (ev)=> {
  const btn = ev.target.closest('button'); 
  if(!btn) return;
  const act = btn.dataset.act; 
  const id = btn.dataset.id;

  if(act==='del-user'){ 
    if(!confirm(t('deleteUserConfirm'))) return; 
    await deleteUserFromDB(id); 
    showToast(t('deleteUserSuccess'), 'success'); 
  }
  if(act==='impersonate'){ 
    const u = usersCache.find(x=>x.id===id); 
    if(u){ 
      window.currentUser = u; 
      localStorage.setItem('cr_current_user', JSON.stringify(u)); 
      showTab('dashboard'); 
      showToast(`${t('impersonate')}: ${u.name}`, 'info'); 
    } 
  }
});

// Authentication
l('btnDoLogin').addEventListener('click', async ()=>{
  const email = l('loginEmail').value.trim(), pass = l('loginPass').value.trim();
  if(!email || !pass) return showToast(t('loginPrompt'), 'warning');
  try{
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await migrateCarsToCurrentUser(cred.user);
    showToast(t('loginSuccess'), 'success');
  }catch(err){ 
    console.error('login error', err); 
    showToast(t('loginFail') + ': ' + (err.message || err.code), 'error'); 
  }
});

onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      window.currentUser = { uid: user.uid, email: user.email, name: user.displayName || user.email.split('@')[0] };

      l('uiUser').innerText = window.currentUser.name || window.currentUser.email;
      l('uiRole').innerText = t('systemAdmin');
      l('userAvatar').innerHTML = '<i class="fas fa-user-shield"></i>';

      l('modalLogin').classList.remove('active');
      l('btnLogin').style.display = 'none';
      l('btnSignOut').style.display = 'flex';

      attachRealtimeListeners();
      setupDailyIncomeScheduler();
      setupDailyIncomeUI();
      showTab('dashboard');
      ensureDemoUsers();
      showToast(`${t('welcome')} ${window.currentUser.name}!`, 'success');
    } else {
      l('uiUser').innerText = t('guest');
      l('uiRole').innerText = t('notLoggedIn');
      l('userAvatar').innerHTML = '<i class="fas fa-user"></i>';

      l('modalLogin').classList.add('active');
      l('btnLogin').style.display = 'flex';
      l('btnSignOut').style.display = 'none';

      detachRealtimeListeners();
      stopDailyIncomeScheduler();
    }
  } catch (error) { 
    console.error('Auth state change error:', error); 
    showToast('Auth error: ' + error.message, 'error'); 
  }
});

async function ensureDemoUsers(){
  try{
    const snap = await getDocs(collection(db,'users'));
    if(snap.empty){
      await addDoc(collection(db,'users'), { name: currentLang === 'ar' ? 'المدير' : 'Admin', email:'admin@demo', role:'admin' });
      await addDoc(collection(db,'users'), { name: currentLang === 'ar' ? 'المشرف' : 'Manager', email:'manager@demo', role:'manager' });
      await addDoc(collection(db,'users'), { name: currentLang === 'ar' ? 'المستخدم' : 'User', email:'user@demo', role:'user' });
    }
  }catch(err){ 
    console.error('ensureDemoUsers', err); 
  }
}

l('btnLogin').addEventListener('click', () => { 
  l('modalLogin').classList.add('active'); 
});

l('btnCloseLogin').addEventListener('click', () => { 
  l('modalLogin').classList.remove('active'); 
});

l('btnSignOut').addEventListener('click', async () => {
  try { 
    await signOut(auth); 
    showToast(t('logoutSuccess'), 'success'); 
    detachRealtimeListeners(); 
    showTab('dashboard'); 
  } catch (err) { 
    console.error('Sign out error:', err); 
    showToast(t('logoutFail') + ': ' + (err.message || err), 'error'); 
  } 
});

function initialUI(){
  l('entryDate').value = new Date().toISOString().slice(0,10);
  l('carPlate').value = new Date().toISOString().slice(0,10);
  showTab('dashboard');
  setupExportPDFButton();
  initTheme();

  // Set language select value
  const langSelect = l('settingLanguage');
  if (langSelect) {
    langSelect.value = currentLang;
  }
}

initialUI();

// PWA Installation
function setupPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { 
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err)); 
    });
  }

  let deferredPrompt;
  const installButton = document.createElement('button');
  installButton.id = 'installPWAButton';
  installButton.innerHTML = '<i class="fas fa-download"></i> Install App';
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 10000;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 25px;
    font-weight: 600;
    font-family: 'Cairo', sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: none;
    cursor: pointer;
    font-size: 14px;
    gap: 8px;
    align-items: center;
  `;
  document.body.appendChild(installButton);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); 
    deferredPrompt = e;
    setTimeout(() => installButton.style.display = 'flex', 5000);
    installButton.onclick = () => {
      installButton.style.display = 'none';
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => { 
        if (choiceResult.outcome === 'accepted') { 
          showToast('App installed successfully!', 'success'); 
        } 
        deferredPrompt = null; 
      });
    };
  });

  window.addEventListener('appinstalled', () => { 
    installButton.style.display = 'none'; 
  });
}

document.addEventListener('DOMContentLoaded', () => setTimeout(() => setupPWA(), 2000));
