// ---------- Firebase imports ----------
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, updateDoc, deleteDoc, query, where, serverTimestamp, runTransaction
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

// ---------- Unsubscribe holders (for controlled listeners) ----------
let unsubCars = null, unsubEntries = null, unsubUsers = null;

// ---------- Helpers ----------
function l(id){ return document.getElementById(id); }
function fmtMoney(amount){ const cur = settingsCache.currency || 'MRU'; const n = Number(amount) || 0; return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}) + ' ' + cur; }
function escapeHtml(str){ if(typeof str !== 'string') return str; return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function downloadFile(filename, contentType, content){ const a=document.createElement('a'); const blob=new Blob([content],{type:contentType}); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function showToast(message, type = 'info') {
  // إذا كان showToast غير معرف، ننشئ واحداً بسيطاً
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
    return;
  }
  
  // إنشاء toast بسيط
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  if (type === 'success') toast.style.background = '#10b981';
  else if (type === 'error') toast.style.background = '#ef4444';
  else if (type === 'warning') toast.style.background = '#f59e0b';
  else toast.style.background = '#3b82f6';
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// ---------- Daily Income System (NEW IMPROVED VERSION) ----------
class DailyIncomeProcessor {
  constructor() {
    this.isProcessing = false;
    this.lastProcessedDate = null;
    this.processedCarsToday = new Set();
  }

  async init() {
    await this.loadLastProcessedDate();
  }

  async loadLastProcessedDate() {
    try {
      const metaRef = doc(db, 'meta', 'daily_income');
      const metaDoc = await getDoc(metaRef);
      
      if (metaDoc.exists()) {
        const data = metaDoc.data();
        this.lastProcessedDate = data.lastDate || null;
        this.processedCarsToday = new Set(data.processedCars || []);
      } else {
        await setDoc(metaRef, {
          lastDate: null,
          processedCars: [],
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('خطأ في تحميل تاريخ المعالجة:', err);
    }
  }

  async saveProcessingState(date, processedCarIds) {
    try {
      const metaRef = doc(db, 'meta', 'daily_income');
      await setDoc(metaRef, {
        lastDate: date,
        processedCars: Array.from(processedCarIds),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('خطأ في حفظ حالة المعالجة:', err);
    }
  }

  async processDailyIncome() {
    // منع التكرار والمزامنة
    if (this.isProcessing) {
      console.log('جاري المعالجة بالفعل، تم تجاهل الاستدعاء');
      return { success: false, reason: 'already_processing' };
    }

    try {
      this.isProcessing = true;
      console.log('🚀 بدء معالجة الإيراد اليومي...');

      // الحصول على تاريخ اليوم بتوقيت موريتانيا
      const today = this.getMauritaniaDate();
      console.log('📅 تاريخ اليوم (توقيت موريتانيا):', today);

      // التحقق إذا تمت معالجة اليوم بالفعل
      if (this.lastProcessedDate === today) {
        console.log('✅ تمت معالجة اليوم بالفعل');
        return { success: true, reason: 'already_processed_today', entriesAdded: 0 };
      }

      // تحميل السيارات من قاعدة البيانات مباشرة
      const carsSnapshot = await getDocs(collection(db, 'cars'));
      const cars = [];
      carsSnapshot.forEach(d => cars.push({ id: d.id, ...d.data() }));

      if (cars.length === 0) {
        console.log('⚠️ لا توجد سيارات للمعالجة');
        return { success: true, reason: 'no_cars', entriesAdded: 0 };
      }

      // الحصول على الإدخالات الموجودة لليوم
      const existingEntries = await this.getTodayEntries(today);
      const processedCarIds = new Set();
      existingEntries.forEach(entry => processedCarIds.add(entry.carId));

      // تصفية السيارات التي لم تتم معالجتها اليوم ولها إيراد يومي
      const carsToProcess = cars.filter(car => 
        !processedCarIds.has(car.id) && 
        Number(car.dailyRent) > 0
      );

      if (carsToProcess.length === 0) {
        console.log('⚠️ لا توجد سيارات جديدة تحتاج إلى إيراد يومي');
        // مع ذلك، نحفظ أن اليوم تمت معالجته
        await this.saveProcessingState(today, processedCarIds);
        this.lastProcessedDate = today;
        return { success: true, reason: 'no_new_cars', entriesAdded: 0 };
      }

      console.log(`🎯 عدد السيارات التي ستتم معالجتها: ${carsToProcess.length}`);

      // معالجة كل سيارة
      let addedEntries = 0;
      let totalAmount = 0;
      const newProcessedCars = new Set([...processedCarIds]);

      for (const car of carsToProcess) {
        try {
          const result = await this.addDailyIncomeForCar(car, today);
          if (result.success) {
            addedEntries++;
            totalAmount += Number(car.dailyRent);
            newProcessedCars.add(car.id);
            console.log(`✅ أضيف إيراد يومي لسيارة: ${car.name} - ${car.dailyRent} ${settingsCache.currency}`);
          }
        } catch (err) {
          console.error(`❌ خطأ في معالجة السيارة ${car.name}:`, err);
          // نستمر في معالجة السيارات الأخرى
        }
      }

      // حفظ حالة المعالجة
      await this.saveProcessingState(today, newProcessedCars);
      this.lastProcessedDate = today;
      this.processedCarsToday = newProcessedCars;

      // تحديث الكاش وعرض النتائج
      if (addedEntries > 0) {
        console.log(`🎉 تمت معالجة الإيراد اليومي: ${addedEntries} مدخلاً - المجموع: ${totalAmount}`);
        
        // تحديث ذاكرة المدخلات
        await this.refreshEntriesCache();
        
        // عرض إشعار للمستخدم
        showToast(
          `تم إضافة ${addedEntries} إيراد يومي تلقائي - المجموع: ${fmtMoney(totalAmount)}`, 
          'success'
        );

        // تسجيل العملية
        await this.logDailyProcessing(today, addedEntries, totalAmount);
        
        return { 
          success: true, 
          reason: 'processed', 
          entriesAdded: addedEntries, 
          totalAmount: totalAmount 
        };
      }

      return { success: true, reason: 'no_entries_added', entriesAdded: 0 };

    } catch (err) {
      console.error('❌ خطأ عام في معالجة الإيراد اليومي:', err);
      showToast('فشل إضافة الإيراد اليومي: ' + err.message, 'error');
      return { success: false, reason: 'error', error: err };
    } finally {
      this.isProcessing = false;
    }
  }

  async addDailyIncomeForCar(car, date) {
    try {
      // التحقق من عدم وجود إدخال مسبق
      const entriesQuery = query(
        collection(db, 'entries'),
        where('carId', '==', car.id),
        where('date', '==', date),
        where('category', '==', 'Daily Automated Rent')
      );
      
      const querySnapshot = await getDocs(entriesQuery);
      if (!querySnapshot.empty) {
        throw new Error('Entry already exists for this car today');
      }

      // إنشاء الإدخال
      const entryData = {
        carId: car.id,
        date: date,
        type: 'income',
        amount: Number(car.dailyRent) || 0,
        category: 'Daily Automated Rent',
        note: `إيراد يومي تلقائي - ${car.name}`,
        autoGenerated: true,
        timestamp: new Date().toISOString(),
        processedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'entries'), entryData);
      return { success: true };
    } catch (err) {
      throw err;
    }
  }

  async getTodayEntries(date) {
    try {
      const entriesQuery = query(
        collection(db, 'entries'),
        where('date', '==', date),
        where('category', '==', 'Daily Automated Rent')
      );
      
      const snapshot = await getDocs(entriesQuery);
      const entries = [];
      snapshot.forEach(doc => {
        entries.push({ id: doc.id, ...doc.data() });
      });
      return entries;
    } catch (err) {
      console.error('خطأ في جلب إدخالات اليوم:', err);
      return [];
    }
  }

  async refreshEntriesCache() {
    try {
      const entriesSnapshot = await getDocs(collection(db, 'entries'));
      entriesCache = [];
      entriesSnapshot.forEach(d => {
        entriesCache.push({ id: d.id, ...d.data() });
      });
      renderEntriesTable();
      updateDashboard();
    } catch (err) {
      console.error('خطأ في تحديث ذاكرة المدخلات:', err);
    }
  }

  async logDailyProcessing(date, count, total) {
    try {
      const logRef = collection(db, 'daily_income_logs');
      await addDoc(logRef, {
        date: date,
        processedAt: new Date().toISOString(),
        entriesAdded: count,
        totalAmount: total,
        currency: settingsCache.currency,
        success: true
      });
    } catch (err) {
      console.error('خطأ في تسجيل العملية:', err);
    }
  }

  getMauritaniaDate() {
    const now = new Date();
    // توقيت موريتانيا (UTC+0)
    return now.toLocaleDateString('en-CA', { timeZone: 'Africa/Nouakchott' });
  }

  async getProcessingStatus() {
    const today = this.getMauritaniaDate();
    const existingEntries = await this.getTodayEntries(today);
    
    return {
      today: today,
      lastProcessedDate: this.lastProcessedDate,
      isTodayProcessed: this.lastProcessedDate === today,
      carsCount: carsCache.length,
      carsWithDailyRent: carsCache.filter(c => Number(c.dailyRent) > 0).length,
      todayEntriesCount: existingEntries.length,
      processedCarsToday: existingEntries.map(e => e.carId)
    };
  }
}

// إنشاء نسخة من المعالج
const dailyIncomeProcessor = new DailyIncomeProcessor();

// ---------- Daily Income Scheduler ----------
let dailyIncomeInterval = null;

function setupDailyIncomeScheduler() {
  console.log('🕒 جاري إعداد جدولة الإيراد اليومي...');
  
  // إيقاف أي جدولة سابقة
  if (dailyIncomeInterval) {
    clearInterval(dailyIncomeInterval);
  }

  // 1. تهيئة المعالج
  dailyIncomeProcessor.init().then(() => {
    console.log('✅ تم تهيئة معالج الإيراد اليومي');
    
    // 2. التحقق الأولي بعد 3 ثوان
    setTimeout(async () => {
      console.log('🔍 التحقق الأولي للإيراد اليومي...');
      await dailyIncomeProcessor.processDailyIncome();
    }, 3000);
  });

  // 3. التحقق كل 30 دقيقة
  dailyIncomeInterval = setInterval(async () => {
    console.log('⏰ تحقق دوري كل 30 دقيقة...');
    await dailyIncomeProcessor.processDailyIncome();
  }, 30 * 60 * 1000);

  // 4. التحقق عند منتصف الليل (00:05)
  scheduleMidnightCheck();
}

function scheduleMidnightCheck() {
  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 5, 0, 0); // 00:05 من اليوم التالي
  
  const timeUntilMidnight = nextMidnight - now;
  
  setTimeout(async () => {
    console.log('🌙 منتصف الليل - معالجة الإيراد اليومي...');
    await dailyIncomeProcessor.processDailyIncome();
    
    // جدولة التحقق التالي
    scheduleMidnightCheck();
  }, timeUntilMidnight);
  
  console.log(`⏳ تم جدولة التحقق القادم في: ${new Date(Date.now() + timeUntilMidnight).toLocaleString()}`);
}

function stopDailyIncomeScheduler() {
  if (dailyIncomeInterval) {
    clearInterval(dailyIncomeInterval);
    dailyIncomeInterval = null;
    console.log('🛑 تم إوقف جدولة الإيراد اليومي');
  }
}

// ---------- Daily Income UI Controls ----------
function setupDailyIncomeUI() {
  const dashboardTab = document.getElementById('tab-dashboard');
  if (dashboardTab && !document.getElementById('dailyIncomeControl')) {
    const controlHTML = `
      <div class="card" id="dailyIncomeControl" style="margin-top: 20px;">
        <h3 style="margin:0 0 12px 0;"><i class="fas fa-calculator"></i> نظام الإيراد اليومي التلقائي</h3>
        <div class="muted">يضيف الإيراد اليومي لكل سيارة تلقائياً مرة واحدة في اليوم</div>
        
        <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="btnRunDailyIncome" class="btn" style="background: var(--success);">
            <i class="fas fa-play"></i> تشغيل الآن
          </button>
          <button id="btnCheckDailyStatus" class="btn ghost">
            <i class="fas fa-info-circle"></i> عرض الحالة
          </button>
        </div>
        
        <div id="dailyIncomeStatus" style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; display: none;">
          <div id="statusContent"></div>
        </div>
      </div>
    `;
    
    dashboardTab.insertAdjacentHTML('beforeend', controlHTML);
    
    // إضافة event listeners
    l('btnRunDailyIncome').addEventListener('click', async () => {
      if (confirm('هل تريد تشغيل نظام الإيراد اليومي الآن؟')) {
        const result = await dailyIncomeProcessor.processDailyIncome();
        if (result.success) {
          showToast(`تمت المعالجة بنجاح! ${result.entriesAdded || 0} إدخالاً`, 'success');
        }
      }
    });
    
    l('btnCheckDailyStatus').addEventListener('click', async () => {
      await checkDailyIncomeStatus();
    });
  }
}

async function checkDailyIncomeStatus() {
  try {
    const status = await dailyIncomeProcessor.getProcessingStatus();
    const statusDiv = l('dailyIncomeStatus');
    const contentDiv = l('statusContent');
    
    let statusHTML = `
      <h4><i class="fas fa-chart-line"></i> حالة نظام الإيراد اليومي</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px;">
        <div class="card">
          <div class="muted">تاريخ اليوم</div>
          <div style="font-weight:800;font-size:16px">${status.today}</div>
        </div>
        <div class="card">
          <div class="muted">آخر معالجة</div>
          <div style="font-weight:800;font-size:16px">${status.lastProcessedDate || 'لم تتم'}</div>
        </div>
        <div class="card">
          <div class="muted">حالة اليوم</div>
          <div style="font-weight:800;font-size:16px;color:${status.isTodayProcessed ? 'var(--success)' : 'var(--warning)'}">
            ${status.isTodayProcessed ? '✅ تمت المعالجة' : '⏳ تحتاج المعالجة'}
          </div>
        </div>
      </div>
      
      <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
        <div class="card">
          <div class="muted">عدد السيارات</div>
          <div style="font-weight:800;font-size:20px">${status.carsCount}</div>
        </div>
        <div class="card">
          <div class="muted">سيارات بالإيجار</div>
          <div style="font-weight:800;font-size:20px">${status.carsWithDailyRent}</div>
        </div>
        <div class="card">
          <div class="muted">إيرادات اليوم</div>
          <div style="font-weight:800;font-size:20px">${status.todayEntriesCount}</div>
        </div>
      </div>
    `;
    
    if (status.todayEntriesCount > 0) {
      statusHTML += `
        <div style="margin-top: 16px;">
          <h5>السيارات المعالجة اليوم:</h5>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
      `;
      
      status.processedCarsToday.forEach(carId => {
        const car = carsCache.find(c => c.id === carId);
        if (car) {
          statusHTML += `<span class="tag in">${car.name}</span>`;
        }
      });
      
      statusHTML += `</div></div>`;
    }
    
    contentDiv.innerHTML = statusHTML;
    statusDiv.style.display = 'block';
    
  } catch (err) {
    console.error('خطأ في التحقق من الحالة:', err);
    showToast('فشل التحقق من حالة النظام', 'error');
  }
}

// ---------- Attach / detach realtime listeners AFTER auth ----------
function attachRealtimeListeners() {
  // detach first if any
  detachRealtimeListeners();

  // cars
  const carsCol = collection(db, 'cars');
  unsubCars = onSnapshot(carsCol, snap => {
    carsCache = [];
    snap.forEach(d => carsCache.push({ id: d.id, ...d.data() }));
    renderCarsTable();
    populateCarSelects();
    updateDashboard();
    console.log('Cars loaded:', carsCache.length);
  }, err => {
    console.error('cars snapshot error', err);
    showToast('Failed to load cars: ' + err.message, 'error');
  });

  // entries
  const entriesCol = collection(db, 'entries');
  unsubEntries = onSnapshot(entriesCol, snap => {
    entriesCache = [];
    snap.forEach(d => entriesCache.push({ id: d.id, ...d.data() }));
    renderEntriesTable();
    updateDashboard();
    console.log('Entries loaded:', entriesCache.length);
  }, err => {
    console.error('entries snapshot error', err);
    showToast('Failed to load entries: ' + err.message, 'error');
  });

  // users
  const usersCol = collection(db, 'users');
  unsubUsers = onSnapshot(usersCol, snap => {
    usersCache = [];
    snap.forEach(d => usersCache.push({ id: d.id, ...d.data() }));
    renderUsers();
    console.log('Users loaded:', usersCache.length);
  }, err => {
    console.error('users snapshot error', err);
    showToast('Failed to load users: ' + err.message, 'error');
  });
}

// ---------- Visibility change for performance ----------
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    detachRealtimeListeners();
    console.log('Listeners paused due to visibility change');
  } else {
    if (auth.currentUser) {
      attachRealtimeListeners();
      console.log('Listeners resumed due to visibility change');
    }
  }
});

// load settings doc once
(async function loadSettings(){
  try {
    const sRef = doc(db,'meta','settings');
    const sDoc = await getDoc(sRef);

    if (sDoc && sDoc.exists()) {
      settingsCache = { ...settingsCache, ...sDoc.data() };
    } else {
      await setDoc(sRef, settingsCache);
    }

    const currencyEl = l('settingCurrency');
    if (currencyEl) {
      currencyEl.value = settingsCache.currency || 'MRU';
    }

    const themeEl = l('settingTheme');
    if (themeEl) {
      themeEl.value = settingsCache.theme || 'light';
    }

    applyTheme(settingsCache.theme || 'light');

  } catch (err) {
    console.error('load settings error', err);
  }
})();

function detachRealtimeListeners(){
  if(typeof unsubCars === 'function'){ try{ unsubCars(); }catch(err){ console.error('unsubCars error',err); } unsubCars = null; }
  if(typeof unsubEntries === 'function'){ try{ unsubEntries(); }catch(err){ console.error('unsubEntries error',err); } unsubEntries = null; }
  if(typeof unsubUsers === 'function'){ try{ unsubUsers(); }catch(err){ console.error('unsubUsers error',err); } unsubUsers = null; }
  carsCache = []; entriesCache = []; usersCache = [];
  renderCarsTable(); renderEntriesTable(); renderUsers(); updateDashboard();
}

// ---------- Firestore CRUD ----------
async function addCarToDB(obj){ try{ await addDoc(collection(db,'cars'), obj); }catch(err){ console.error('addCar error', err); alert('Add car failed: '+(err.message||err)); } }
async function deleteCarFromDB(id){ try{ await deleteDoc(doc(db,'cars',id)); }catch(err){ console.error(err); alert('Delete car failed'); } }
async function updateCarInDB(id,payload){ try{ await updateDoc(doc(db,'cars',id), payload); }catch(err){ console.error(err); } }

async function addEntryToDB(obj){ try{ await addDoc(collection(db,'entries'), obj); }catch(err){ console.error('addEntry error', err); alert('Add entry failed: '+(err.message||err)); } }
async function deleteEntryFromDB(id){ try{ await deleteDoc(doc(db,'entries',id)); }catch(err){ console.error(err); alert('Delete entry failed'); } }
async function updateEntryInDB(id,payload){ try{ await updateDoc(doc(db,'entries',id), payload); }catch(err){ console.error(err); } }

async function addUserToDB(obj){ try{ const safeObj = { name: obj.name, email: obj.email, role: obj.role }; await addDoc(collection(db,'users'), safeObj); }catch(err){ console.error(err); alert('Add user failed'); } }
async function deleteUserFromDB(id){ try{ await deleteDoc(doc(db,'users',id)); }catch(err){ console.error(err); alert('Delete user failed'); } }

// ---------- Daily rent meta doc helpers ----------
const dailyMetaRef = doc(db,'meta','daily_income');
async function getLastRentDate(){ try{ const d = await getDoc(dailyMetaRef); if(d.exists()) return d.data().lastDate || null; return null; }catch(err){ console.error(err); return null; } }
async function setLastRentDate(dateStr){ try{ await setDoc(dailyMetaRef, { lastDate: dateStr }, { merge: true }); }catch(err){ console.error(err); } }

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
      let roiText = '—';
      let roiClass = '';
      if(price > 0){ 
        const roi = (Number(c.dailyRent||0) * 365) / price * 100; 
        const r = Number(roi.toFixed(1)); 
        roiText = r + '%'; 
        if(r >= 20) roiClass = 'roi-high';
        else if(r >= 10) roiClass = 'roi-medium';
        else roiClass = 'roi-low';
      }
      tr.innerHTML = `
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.plate||'')}</td>
        <td class="ltr" style="font-weight:700">${fmtMoney(c.dailyRent||0)}</td>
        <td class="ltr" style="font-weight:700">${price ? fmtMoney(price) : '—'}</td>
        <td class="ltr ${roiClass}">${roiText}</td>
        <td class="muted">${count} entries</td>
        <td style="text-align:left">
          <button class="btn ghost" data-act="edit" data-id="${c.id}"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn" data-act="del" data-id="${c.id}" style="background:#fee2e2;color:var(--danger)"><i class="fas fa-trash"></i> Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }
}

function populateCarSelects(){
  const selects = ['entryCar','filterCar','reportCar'];
  selects.forEach(id=>{
    const el = l(id); if(!el) return;
    const currentVal = el.value || 'all';
    el.innerHTML = '<option value="all">All cars</option>';
    carsCache.forEach(c => el.insertAdjacentHTML('beforeend', `<option value="${c.id}">${escapeHtml(c.name)}</option>`));
    el.value = currentVal;
  });
}

function renderEntriesTable(){
  populateCarSelects();
  const tbody = l('entriesTable').querySelector('tbody'); 
  const emptyState = document.getElementById('entriesEmptyState');
  tbody.innerHTML = '';
  
  let rows = entriesCache.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  const carFilter = l('filterCar').value;
  const from = l('filterFrom').value;
  const to = l('filterTo').value;
  if(carFilter && carFilter!=='all') rows = rows.filter(r=> r.carId===carFilter);
  if(from) rows = rows.filter(r=> r.date >= from);
  if(to) rows = rows.filter(r=> r.date <= to);

  if(rows.length === 0){
    if(emptyState) emptyState.style.display = 'block';
    if(l('entriesTable')) l('entriesTable').style.display = 'none';
  } else {
    if(emptyState) emptyState.style.display = 'none';
    if(l('entriesTable')) l('entriesTable').style.display = 'table';
    
    rows.forEach(e=>{
      const car = carsCache.find(c=>c.id===e.carId);
      const typeTag = e.type==='income' ? '<span class="tag in"><i class="fas fa-arrow-up"></i> Income</span>' : '<span class="tag out"><i class="fas fa-arrow-down"></i> Expense</span>';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="ltr">${e.date}</td>
        <td>${escapeHtml(car?car.name:'-')}</td>
        <td>${typeTag}</td>
        <td>${escapeHtml(e.category||'')}</td>
        <td class="ltr" style="font-weight:800">${fmtMoney(e.amount)}</td>
        <td style="text-align:left">
          <button class="btn ghost" data-act="edit-entry" data-id="${e.id}"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn" data-act="del-entry" data-id="${e.id}" style="background:#fee2e2;color:var(--danger)"><i class="fas fa-trash"></i> Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }
}

function renderReportSummary(){
  const carId = l('reportCar').value;
  const from = l('reportFrom').value;
  const to = l('reportTo').value;
  let rows = entriesCache.slice();
  if(carId && carId!=='all') rows = rows.filter(r=>r.carId===carId);
  if(from) rows = rows.filter(r=>r.date>=from);
  if(to) rows = rows.filter(r=>r.date<=to);
  const income = rows.filter(r=>r.type==='income').reduce((s,r)=>s+Number(r.amount),0);
  const expense = rows.filter(r=>r.type==='expense').reduce((s,r)=>s+Number(r.amount),0);
  const net = income - expense;
  const out = l('reportSummary');
  out.innerHTML = `<div style="display:flex;gap:16px; flex-wrap: wrap;">
    <div class="card" style="flex:1; min-width: 150px;"><div class="muted">Revenue</div><div style="font-weight:800;font-size:20px">${fmtMoney(income)}</div></div>
    <div class="card" style="flex:1; min-width: 150px;"><div class="muted">Expenses</div><div style="font-weight:800;font-size:20px">${fmtMoney(expense)}</div></div>
    <div class="card" style="flex:1; min-width: 150px;"><div class="muted">Net</div><div style="font-weight:800;font-size:20px">${fmtMoney(net)}</div></div>
    </div>
    <div style="margin-top:12px">
      <table style="width:100%"><thead><tr><th>Date</th><th>Car</th><th>Type</th><th>Category</th><th>Amount</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td class="ltr">${r.date}</td><td>${escapeHtml((carsCache.find(c=>c.id===r.carId)||{}).name||'-')}</td><td>${r.type === 'income' ? 'Income' : 'Expense'}</td><td>${escapeHtml(r.category)}</td><td class="ltr" style="font-weight:700">${fmtMoney(r.amount)}</td></tr>`).join('')}</tbody></table>
    </div>`;
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
      const tr = document.createElement('tr');
      const roleClass = u.role === 'admin' ? 'admin' : u.role === 'manager' ? 'manager' : 'user';
      tr.innerHTML = `
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="role-badge ${roleClass}">${escapeHtml(u.role)}</span></td>
        <td style="text-align:left">
          <button class="btn ghost" data-act="impersonate" data-id="${u.id}"><i class="fas fa-user-secret"></i> Impersonate</button>
          <button class="btn" data-act="del-user" data-id="${u.id}" style="background:#fee2e2;color:var(--danger)"><i class="fas fa-trash"></i> Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }
}

function updateDashboard(){
  const rev = entriesCache.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0);
  const exp = entriesCache.filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount),0);
  l('statRevenue').innerText = fmtMoney(rev);
  l('statExpenses').innerText = fmtMoney(exp);
  l('statNet').innerText = fmtMoney(rev-exp);
  updateMonthlyChart();
}

// Chart
let monthlyChart = null;
function updateMonthlyChart(){
  if(typeof Chart === 'undefined'){
    console.warn('Chart.js not loaded');
    return;
  }
  const now = new Date();
  const months = [], revData = [], expData = [];
  for(let i=11;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d.toLocaleString('default',{month:'short',year:'numeric'}));
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const entries = entriesCache.filter(en=> en.date.startsWith(key));
    const rev = entries.filter(e=>e.type==='income').reduce((s,e)=>s+Number(e.amount),0);
    const exp = entries.filter(e=>e.type==='expense').reduce((s,e)=>s+Number(e.amount),0);
    revData.push(rev); expData.push(exp);
  }
  const chartEl = document.getElementById('chartMonthly');
  if(!chartEl) return;
  const ctx = chartEl.getContext('2d');
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type:'line',
    data:{ labels: months, datasets:[
      {label:'Revenue', data:revData, tension:0.3, borderColor:'#06b6d4', backgroundColor:'rgba(6,182,212,0.06)', fill:true},
      {label:'Expenses', data:expData, tension:0.3, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.06)', fill:true}
    ]},
    options:{responsive:true,plugins:{legend:{position:'top'}}}
  });
}

// ---------- Mobile Menu Toggle ----------
function toggleMobileMenu(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');
  if(sidebar && overlay){
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    if(sidebar.classList.contains('mobile-open')){
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
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

// Mobile menu button
const btnMenuToggle = document.getElementById('btnMenuToggle');
if(btnMenuToggle){
  btnMenuToggle.addEventListener('click', toggleMobileMenu);
}

// Close menu when clicking overlay
const mobileOverlay = document.getElementById('mobileOverlay');
if(mobileOverlay){
  mobileOverlay.addEventListener('click', closeMobileMenu);
}

// ---------- UI behavior & events ----------
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
  const el = document.getElementById('tab-'+id); if(el) el.style.display='block';
  l('uiUser').innerText = (window.currentUser && window.currentUser.email) ? `${window.currentUser.email}` : 'Guest';
}

// Add car
l('btnAddCar').addEventListener('click', async ()=>{
  const name = l('carName').value.trim(); const plate = l('carPlate').value.trim(); const dailyRent = parseFloat(l('carDailyRent').value) || 0; const price = parseFloat(l('carPrice').value) || 0;
  if(!name) return showToast('Please enter car name', 'warning');
  try {
    await addCarToDB({ name, plate, dailyRent, price });
    info(`Car added: ${name} with daily rent ${dailyRent} and price ${price}`);
    showToast(`Car "${name}" added successfully!`, 'success');
    l('carName').value=''; l('carPlate').value=''; l('carDailyRent').value=''; l('carPrice').value='';
  } catch(err) {
    showToast('Failed to add car: ' + (err.message || err), 'error');
  }
});

// car table actions
l('carsTable').querySelector('tbody').addEventListener('click', async (ev)=>{
  const btn = ev.target.closest('button'); if(!btn) return;
  const act = btn.dataset.act; const id = btn.dataset.id;
  if(act === 'del'){ if(!confirm('Delete car and its entries?')) return; await deleteCarFromDB(id); showToast('Car deleted successfully', 'success');
  } else if(act === 'edit'){ const car = carsCache.find(c=>c.id===id); const newName = prompt('Car name', car.name); const newRent = prompt('Daily rent', car.dailyRent); const newPrice = prompt('Car price', car.price||''); let updated=false; if(newName!==null && newName!==car.name){ await updateCarInDB(id,{name:newName}); updated=true;} if(newRent!==null && parseFloat(newRent)!==car.dailyRent){ await updateCarInDB(id,{dailyRent: parseFloat(newRent)||0}); updated=true;} if(newPrice!==null && parseFloat(newPrice)!==Number(car.price||0)){ await updateCarInDB(id,{price: parseFloat(newPrice)||0}); updated=true;} if(updated) { showToast('Car updated successfully', 'success'); } }
});

// add entry
l('btnAddEntry').addEventListener('click', async ()=>{
  const carId = l('entryCar').value;
  const date = l('entryDate').value || new Date().toISOString().slice(0,10);
  const type = l('entryType').value;
  const amount = parseFloat(l('entryAmount').value);
  const category = l('entryCategory').value.trim();
  if(!carId || carId === 'all') return showToast('Please choose a car', 'warning');
  if(isNaN(amount) || amount <= 0) return showToast('Please enter a valid amount', 'warning');
  try {
    await addEntryToDB({ carId, date, type, amount, category: category || 'N/A', note: '' });
    showToast(`${type === 'income' ? 'Income' : 'Expense'} entry added successfully!`, 'success');
    l('entryAmount').value=''; l('entryCategory').value='';
  } catch(err) {
    showToast('Failed to add entry: ' + (err.message || err), 'error');
  }
});

// entries table actions
l('entriesTable').querySelector('tbody').addEventListener('click', async (ev)=>{
  const btn = ev.target.closest('button'); if(!btn) return;
  const act = btn.dataset.act; const id = btn.dataset.id;
  if(act==='del-entry'){ if(!confirm('Delete this entry?')) return; await deleteEntryFromDB(id); showToast('Entry deleted successfully', 'success');
  } else if(act==='edit-entry'){ const e = entriesCache.find(x=>x.id===id); const newAmt = prompt('Amount', e.amount); const newCat = prompt('Category', e.category); if(newAmt !== null){ await updateEntryInDB(id,{ amount: parseFloat(newAmt) || e.amount, category: newCat || e.category }); showToast('Entry updated successfully', 'success'); } }
});

// filters & reports & export handlers
l('btnApplyFilter').addEventListener('click', ()=> renderEntriesTable());
l('btnClearFilter').addEventListener('click', ()=> { l('filterCar').value='all'; l('filterFrom').value=''; l('filterTo').value=''; renderEntriesTable(); });
l('btnGenerate').addEventListener('click', ()=> { renderReportSummary(); showToast('Report generated successfully', 'success'); });
l('btnExportCSVReport').addEventListener('click', ()=> {
  const carId = l('reportCar').value; const from = l('reportFrom').value; const to = l('reportTo').value;
  let rows = entriesCache.slice(); if(carId && carId!=='all') rows = rows.filter(r=>r.carId===carId); if(from) rows = rows.filter(r=>r.date>=from); if(to) rows = rows.filter(r=>r.date<=to);
  let csv = 'date,car,type,category,amount\n'; rows.forEach(r=> csv += `${r.date},${(carsCache.find(c=>c.id===r.carId)||{}).name || ''},${r.type},${(r.category||'')},${r.amount}\n`);
  downloadFile('report.csv','text/csv;charset=utf-8;',csv);
  showToast('CSV exported successfully', 'success');
});
l('btnExportXLS').addEventListener('click', ()=> l('btnExportCSVReport').click());

// Backup / restore
const handleBackupDownload = async () => { 
  const backup = { cars: carsCache, entries: entriesCache, users: usersCache, settings: settingsCache, ts: Date.now() }; 
  downloadFile('car_rental_backup.json','application/json;charset=utf-8;', JSON.stringify(backup,null,2)); 
  showToast('Backup downloaded successfully', 'success'); 
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
      if(!obj.cars || !obj.entries) return alert('Invalid backup file');
      if(!confirm('Restore backup? This will INSERT backup data into Firestore (will not auto-delete existing docs). Continue?')) return;
      for(const c of obj.cars){ await addDoc(collection(db,'cars'), { name:c.name, plate:c.plate||'', dailyRent:c.dailyRent||0, price:c.price||0 }); }
      for(const e of obj.entries){ await addDoc(collection(db,'entries'), { carId:e.carId, date:e.date, type:e.type, amount:e.amount, category:e.category||'', note:e.note||'' }); }
      showToast('Backup restored successfully', 'success');
    } catch(err){ alert('Invalid file'); }
  }; 
  inp.click();
};

// Backup buttons in backup tab
l('btnDownload').addEventListener('click', handleBackupDownload);
l('btnUpload').addEventListener('click', handleBackupUpload);

// Backup buttons in topbar
const btnDownloadBackup = document.getElementById('btnDownloadBackup');
const btnImportBackup = document.getElementById('btnImportBackup');
if(btnDownloadBackup) btnDownloadBackup.addEventListener('click', handleBackupDownload);
if(btnImportBackup) btnImportBackup.addEventListener('click', handleBackupUpload);

l('btnClearAll').addEventListener('click', async ()=> {
  if(!confirm('Reset app to default demo state? This will NOT automatically delete Firestore documents. Proceed?')) return;
  alert('To fully reset, please delete collections from Firebase console -> Firestore (cars, entries, users, meta).');
});

// settings handlers
const settingLanguage = l("settingLanguage");
if (settingLanguage) {
  settingLanguage.addEventListener("change", (e) => {
    setLanguage(e.target.value);
    info(`Language changed to: ${e.target.value}`);
    showToast(`Language changed to ${e.target.value}`, 'success');
  });
}

l('settingCurrency').addEventListener('change', async ()=>{
  settingsCache.currency = l('settingCurrency').value.trim() || 'MRU';
  await setDoc(doc(db,'meta','settings'), settingsCache, { merge:true });
  updateDashboard();
  showToast(`Currency changed to ${settingsCache.currency}`, 'success');
});
l('settingTheme').addEventListener('change', (e)=>{ settingsCache.theme = e.target.value; setDoc(doc(db,'meta','settings'), settingsCache, { merge:true }).catch(()=>{}); applyTheme(settingsCache.theme); showToast(`Theme changed to ${settingsCache.theme}`, 'success'); });
function applyTheme(theme){
  const root=document.documentElement.style;
  if(theme==='dark'){
    document.body.classList.add('dark');
    document.body.style.background='#071024';
    document.body.style.color='#fff';
    root.setProperty('--card','#1e293b');
    root.setProperty('--muted','#94a3b8');
    root.setProperty('--text','#e6eef6');
  } else {
    document.body.classList.remove('dark');
    document.body.style.background='var(--bg)';
    document.body.style.color='var(--text)';
    root.setProperty('--card','#ffffff');
    root.setProperty('--muted','#6b7280');
    root.setProperty('--text','#0b1220');
  }
}
async function migrateCarsToCurrentUser(user) {
  try {
    const snap = await getDocs(collection(db, "cars"));
    let updated = 0;
    for (const d of snap.docs) {
      const data = d.data();
      if (!data.userId) {
        await updateDoc(doc(db, "cars", d.id), {
          userId: user.uid
        });
        updated++;
      }
    }
    console.log(`Cars migration done. Updated: ${updated}`);
  } catch (err) {
    console.error("Cars migration failed", err);
  }
}

// users (firestore)
l('btnAddUser').addEventListener('click', async () => {
  const name=l('newUserName').value.trim(), email=l('newUserEmail').value.trim(), role=l('newUserRole').value;
  if(!name||!email) return showToast('Please fill name and email', 'warning');
  if(usersCache.some(u=>u.email===email)) return showToast('Email already in use', 'error');
  try {
    await addUserToDB({ name, email, role });
    l('newUserName').value=''; l('newUserEmail').value='';
    showToast(`User "${name}" added successfully`, 'success');
  } catch(err) {
    showToast('Failed to add user: ' + (err.message || err), 'error');
  }
});

l('usersTable').querySelector('tbody').addEventListener('click', async (ev)=> {
  const btn = ev.target.closest('button'); if(!btn) return;
  const act = btn.dataset.act; const id = btn.dataset.id;
  if(act==='del-user'){ if(!confirm('Delete this user?')) return; await deleteUserFromDB(id); showToast('User deleted successfully', 'success'); }
  if(act==='impersonate'){ const u = usersCache.find(x=>x.id===id); if(u){ window.currentUser = u; localStorage.setItem('cr_current_user', JSON.stringify(u)); showTab('dashboard'); showToast(`Impersonated: ${u.name}`, 'info'); } }
});

// ---------- Authentication (Firebase Auth) ----------
l('btnDoLogin').addEventListener('click', async ()=>{
  const email = l('loginEmail').value.trim(),
        pass  = l('loginPass').value.trim();

  if(!email || !pass)
    return showToast('Please provide email and password', 'warning');

  try{
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const user = cred.user;
    await migrateCarsToCurrentUser(user);
    showToast('Login successful!', 'success');
  }catch(err){
    console.error('login error', err);
    const msg = 'Login failed: ' + (err.message || err.code);
    showToast(msg, 'error');
  }
});

// ---------- Authentication with Daily Income Setup ----------
onAuthStateChanged(auth, async (user) => {
  try {
    console.log('تغير حالة المصادقة:', user ? user.email : 'لا يوجد مستخدم');
    
    if (user) {
      console.log('تم تسجيل دخول:', user.email);
      
      window.currentUser = { 
        uid: user.uid, 
        email: user.email,
        name: user.displayName || user.email.split('@')[0]
      };
      
      l('uiUser').innerText = window.currentUser.email;
      l('modalLogin').style.display = 'none';
      
      attachRealtimeListeners();
      
      setupDailyIncomeScheduler();
      setupDailyIncomeUI();
      
      showTab('dashboard');
      ensureDemoUsers();
      
      showToast(`welcome ${window.currentUser.name}!`, 'success');
    } else {
      console.log('لم يتم تسجيل دخول');
      l('modalLogin').style.display = 'flex';
      detachRealtimeListeners();
      stopDailyIncomeScheduler();
    }
  } catch (error) {
    console.error('خطأ في معالجة حالة المصادقة:', error);
    showToast('حدث خطأ في المصادقة: ' + error.message, 'error');
  }
});

// ---------- Ensure demo Firestore users collection ----------
async function ensureDemoUsers(){
  try{
    const snap = await getDocs(collection(db,'users'));
    if(snap.empty){
      await addDoc(collection(db,'users'), { name:'Administrator', email:'admin@demo', role:'admin' });
      await addDoc(collection(db,'users'), { name:'Manager', email:'manager@demo', role:'manager' });
      await addDoc(collection(db,'users'), { name:'Staff', email:'user@demo', role:'user' });
    }
  }catch(err){ console.error('ensureDemoUsers', err); }
}

// ---------- Login/Logout Button Events ----------
l('btnLogin').addEventListener('click', () => {
  l('modalLogin').style.display = 'flex';
  console.log('Login button clicked - opening modal');
});

l('btnCloseLogin').addEventListener('click', () => {
  l('modalLogin').style.display = 'none';
  console.log('Close login button clicked');
});

l('btnSignOut').addEventListener('click', async () => {
  try {
    console.log('Sign out button clicked');
    await signOut(auth);
    showToast('تم تسجيل الخروج بنجاح', 'success');
    detachRealtimeListeners();
    showTab('dashboard');
  } catch (err) {
    console.error('Sign out error:', err);
    showToast('فشل تسجيل الخروج: ' + (err.message || err), 'error');
  }
});

// زر تسجيل الخروج في الهيدر
const topbarSignOut = document.getElementById('btnSignOutTopbar');
if (topbarSignOut) {
  topbarSignOut.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Topbar sign out error:', err);
    }
  });
}

// ---------- Initial UI state ----------
function initialUI(){
  l('entryDate').value = new Date().toISOString().slice(0,10);
  showTab('dashboard');
}
initialUI();

// ---------- PWA Installation ----------
function setupPWA() {
  console.log('إعداد PWA...');
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker مسجل بنجاح:', registration.scope);
        })
        .catch((error) => {
          console.error('❌ فشل تسجيل Service Worker:', error);
        });
    });
  }
  
  let deferredPrompt;
  const installButton = document.createElement('button');
  installButton.id = 'installPWAButton';
  installButton.innerHTML = '<i class="fas fa-download"></i> تثبيت التطبيق';
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 10000;
    background: linear-gradient(135deg, var(--accent), #6d28d9);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 25px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: none;
    cursor: pointer;
  `;
  
  document.body.appendChild(installButton);
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    setTimeout(() => {
      installButton.style.display = 'block';
    }, 5000);
    
    installButton.onclick = () => {
      installButton.style.display = 'none';
      deferredPrompt.prompt();
      
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ قبل المستخدم تثبيت التطبيق');
          showToast('تم تثبيت التطبيق بنجاح!', 'success');
        } else {
          console.log('❌ رفض المستخدم تثبيت التطبيق');
        }
        deferredPrompt = null;
      });
    };
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('التطبيق مثبت بنجاح');
    installButton.style.display = 'none';
  });
}

// تشغيل إعداد PWA
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => setupPWA(), 2000);
});