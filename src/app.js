// ---------- Firebase imports ----------
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, updateDoc, deleteDoc, query, where
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

// ---------- Attach / detach realtime listeners AFTER auth ----------
function attachRealtimeListeners() {
  // detach first if any
  detachRealtimeListeners();  // ✅ إصلاح: حذف الـ } الزائدة هنا

  // cars
  const carsCol = collection(db, 'cars');
  unsubCars = onSnapshot(carsCol, snap => {
    carsCache = [];
    snap.forEach(d => carsCache.push({ id: d.id, ...d.data() }));
    renderCarsTable();
    populateCarSelects();
    updateDashboard();
    console.log('Cars loaded:', carsCache.length); // للتتبع
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
    console.log('Entries loaded:', entriesCache.length); // للتتبع
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
    console.log('Users loaded:', usersCache.length); // للتتبع
  }, err => {
    console.error('users snapshot error', err);
    showToast('Failed to load users: ' + err.message, 'error');
  });
}  // ✅ إغلاق الدالة هنا بشكل صحيح

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

// Note: we DO NOT store plaintext passwords in Firestore. Demo user entries will NOT include password field.
async function addUserToDB(obj){ try{ const safeObj = { name: obj.name, email: obj.email, role: obj.role }; await addDoc(collection(db,'users'), safeObj); }catch(err){ console.error(err); alert('Add user failed'); } }
async function deleteUserFromDB(id){ try{ await deleteDoc(doc(db,'users',id)); }catch(err){ console.error(err); alert('Delete user failed'); } }

// ---------- Daily rent meta doc helpers ----------
const dailyMetaRef = doc(db,'meta','daily_rent');
async function getLastRentDate(){ try{ const d = await getDoc(dailyMetaRef); if(d.exists()) return d.data().lastDate || null; return null; }catch(err){ console.error(err); return null; } }
async function setLastRentDate(dateStr){ try{ await setDoc(dailyMetaRef, { lastDate: dateStr }); }catch(err){ console.error(err); } }

// ---------- UI rendering (same functions as earlier) ----------
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

// ---------- Daily rent automation (IMPROVED) ----------
async function processDailyRent() {
  try {
    console.log('بدء معالجة الإيراد اليومي...');
    
    // 1. استخدام التوقيت المحلي لموريتانيا (UTC+0)
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Nouakchott' });
    console.log('تاريخ اليوم (توقيت موريتانيا):', today);
    
    // 2. التحقق من آخر تاريخ معالجة
    const last = await getLastRentDate();
    console.log('آخر تاريخ معالجة:', last);
    
    if (last === today) {
      console.log('تمت معالجة الإيراد اليومي مسبقاً');
      return;
    }
    
    // 3. تأكد من وجود سيارات في الذاكرة المؤقتة
    if (carsCache.length === 0) {
      console.log('جاري تحميل السيارات من قاعدة البيانات...');
      const carsSnapshot = await getDocs(collection(db, 'cars'));
      carsCache = [];
      carsSnapshot.forEach(d => carsCache.push({ id: d.id, ...d.data() }));
    }
    
    // 4. احصل على مدخلات اليوم من قاعدة البيانات (ليس فقط الكاش)
    const todayEntriesQuery = query(
      collection(db, 'entries'),
      where('date', '==', today),
      where('category', '==', 'Daily Automated Rent')
    );
    
    const todayEntriesSnapshot = await getDocs(todayEntriesQuery);
    const processedCarIds = new Set();
    todayEntriesSnapshot.forEach(doc => {
      processedCarIds.add(doc.data().carId);
    });
    
    console.log('السيارات التي تمت معالجتها اليوم:', processedCarIds);
    
    // 5. معالجة كل سيارة
    let addedEntries = 0;
    let totalAmount = 0;
    
    for (const car of carsCache) {
      const rent = Number(car.dailyRent) || 0;
      
      if (rent > 0 && !processedCarIds.has(car.id)) {
        // تأكد من أن السيارة موجودة في قاعدة البيانات
        const carRef = doc(db, 'cars', car.id);
        const carDoc = await getDoc(carRef);
        
        if (carDoc.exists()) {
          await addEntryToDB({
            carId: car.id,
            date: today,
            type: 'income',
            amount: rent,
            category: 'Daily Automated Rent',
            note: `إيراد يومي تلقائي - ${car.name}`,
            autoGenerated: true,
            timestamp: new Date().toISOString()
          });
          
          addedEntries++;
          totalAmount += rent;
          console.log(`✓ أضيف إيراد يومي لسيارة: ${car.name} - ${rent} ${settingsCache.currency}`);
        }
      }
    }
    
    // 6. تحديث تاريخ آخر معالجة فقط إذا تمت إضافة مدخلات
    if (addedEntries > 0) {
      await setLastRentDate(today);
      console.log(`✅ تمت معالجة الإيراد اليومي: ${addedEntries} مدخلاً - المجموع: ${totalAmount}`);
      
      // تحديث الذاكرة المؤقتة والواجهة
      await refreshEntriesCache();
      
      if (window.showToast) {
        window.showToast(`تم إضافة ${addedEntries} إيراد يومي تلقائي - المجموع: ${fmtMoney(totalAmount)}`, 'success');
      }
      
      // تسجيل العملية في السجل
      await logDailyRentAction(today, addedEntries, totalAmount);
    } else {
      console.log('⚠️ لا توجد إيرادات يومية جديدة لإضافتها');
      
      // تحديث تاريخ آخر معالجة حتى لو لم تتم إضافة مدخلات (لتجنب التكرار)
      await setLastRentDate(today);
    }
    
  } catch (err) {
    console.error('❌ خطأ في معالجة الإيراد اليومي:', err);
    if (window.showToast) {
      window.showToast('فشل إضافة الإيراد اليومي: ' + err.message, 'error');
    }
  }
}
// ---------- Daily rent helper functions ----------

// دالة لتحديث ذاكرة المدخلات
async function refreshEntriesCache() {
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

// دالة لتسجيل عمليات الإيراد اليومي
async function logDailyRentAction(date, count, total) {
  try {
    const logRef = collection(db, 'daily_rent_logs');
    await addDoc(logRef, {
      date: date,
      processedAt: new Date().toISOString(),
      entriesAdded: count,
      totalAmount: total,
      currency: settingsCache.currency,
      success: true
    });
  } catch (err) {
    console.error('خطأ في تسجيل الإجراء:', err);
  }
}
// ---------- Daily rent scheduler (IMPROVED) ----------
let dailyRentInterval = null;
let lastCheckDate = null;

function setupDailyRentScheduler() {
  console.log('جاري إعداد جدولة الإيراد اليومي...');
  
  // إيقاف أي جدولة سابقة
  if (dailyRentInterval) {
    clearInterval(dailyRentInterval);
  }
  
  // 1. تحقق عند تحميل التطبيق
  setTimeout(() => {
    console.log('التحقق الأولي للإيراد اليومي...');
    processDailyRent();
  }, 5000); // بعد 5 ثواني من التحميل
  
  // 2. تحقق كل ساعة
  dailyRentInterval = setInterval(() => {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Nouakchott' });
    
    // تحقق إذا تغير اليوم
    if (lastCheckDate !== currentDate) {
      console.log('تغير اليوم، جاري معالجة الإيراد اليومي...');
      lastCheckDate = currentDate;
      processDailyRent();
    }
  }, 60 * 60 * 1000); // كل ساعة
  
  // 3. تحقق عند عودة المستخدم للتطبيق
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('المستخدم عاد للتطبيق، التحقق من الإيراد اليومي...');
      setTimeout(() => processDailyRent(), 2000);
    }
  });
  
  // 4. تحقق عند فتح نافذة جديدة
  window.addEventListener('focus', () => {
    console.log('النافذة حصلت على التركيز، التحقق من الإيراد اليومي...');
    setTimeout(() => processDailyRent(), 1000);
  });
  
  // 5. تحقق عند منتصف الليل (00:01)
  checkMidnightDaily();
}

// دالة للتحقق في منتصف الليل
function checkMidnightDaily() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // إذا كان الوقت حوالي منتصف الليل
  if (hours === 0 && minutes <= 5) {
    console.log('منتصف الليل - معالجة الإيراد اليومي...');
    processDailyRent();
  }
  
  // جدولة التحقق القادم
  const nextCheck = new Date(now);
  nextCheck.setHours(0, 1, 0, 0); // 00:01
  if (nextCheck < now) {
    nextCheck.setDate(nextCheck.getDate() + 1);
  }
  
  const timeUntilMidnight = nextCheck - now;
  setTimeout(() => {
    processDailyRent();
    checkMidnightDaily(); // استمرارية
  }, timeUntilMidnight);
}

// إيقاف الجدولة عند تسجيل الخروج
function stopDailyRentScheduler() {
  if (dailyRentInterval) {
    clearInterval(dailyRentInterval);
    dailyRentInterval = null;
    console.log('تم إيقاف جدولة الإيراد اليومي');
  }
}
// ---------- Manual Daily Rent Control ----------
function setupDailyRentUI() {
  // أضف زر التحكم اليدوي في Dashboard
  const dashboardTab = document.getElementById('tab-dashboard');
  if (dashboardTab && !document.getElementById('dailyRentControl')) {
    const controlHTML = `
      <div class="card" id="dailyRentControl" style="margin-top: 20px;">
        <h3 style="margin:0 0 12px 0;"><i class="fas fa-calculator"></i> التحكم في الإيراد اليومي</h3>
        <div class="muted">إدارة النظام التلقائي للإيراد اليومي</div>
        
        <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="btnRunDailyRent" class="btn" style="background: var(--success);">
            <i class="fas fa-play"></i> تشغيل الآن
          </button>
          <button id="btnCheckStatus" class="btn ghost">
            <i class="fas fa-info-circle"></i> التحقق من الحالة
          </button>
          <button id="btnTestDailyRent" class="btn ghost">
            <i class="fas fa-vial"></i> اختبار بتاريخ
          </button>
        </div>
        
        <div id="dailyRentStatus" style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; display: none;">
          <div id="statusContent"></div>
        </div>
      </div>
    `;
    
    dashboardTab.insertAdjacentHTML('beforeend', controlHTML);
    
    // إضافة event listeners
    l('btnRunDailyRent').addEventListener('click', async () => {
      if (confirm('هل تريد تشغيل نظام الإيراد اليومي الآن؟')) {
        await processDailyRent();
      }
    });
    
    l('btnCheckStatus').addEventListener('click', async () => {
      await checkDailyRentStatus();
    });
    
    l('btnTestDailyRent').addEventListener('click', async () => {
      await testDailyRentWithDate();
    });
  }
}

// التحقق من حالة الإيراد اليومي
async function checkDailyRentStatus() {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nouakchott' });
    const lastDate = await getLastRentDate();
    
    const statusDiv = l('dailyRentStatus');
    const contentDiv = l('statusContent');
    
    let statusHTML = `
      <h4>حالة نظام الإيراد اليومي</h4>
      <p><strong>تاريخ اليوم:</strong> ${today}</p>
      <p><strong>آخر معالجة:</strong> ${lastDate || 'لم تتم مطلقاً'}</p>
      <p><strong>الحالة:</strong> ${lastDate === today ? '✅ تمت المعالجة اليوم' : '⚠️ تحتاج المعالجة'}</p>
      <p><strong>عدد السيارات:</strong> ${carsCache.length}</p>
      <p><strong>السيارات بالإيجار اليومي:</strong> ${carsCache.filter(c => c.dailyRent > 0).length}</p>
    `;
    
    // تحقق من مدخلات اليوم
    const todayEntriesQuery = query(
      collection(db, 'entries'),
      where('date', '==', today),
      where('category', '==', 'Daily Automated Rent')
    );
    
    const snapshot = await getDocs(todayEntriesQuery);
    const todayEntries = [];
    snapshot.forEach(doc => todayEntries.push(doc.data()));
    
    statusHTML += `<p><strong>إيرادات اليوم:</strong> ${todayEntries.length}</p>`;
    
    if (todayEntries.length > 0) {
      statusHTML += `<ul style="margin-top: 8px;">`;
      todayEntries.forEach(entry => {
        const car = carsCache.find(c => c.id === entry.carId);
        statusHTML += `<li>${car ? car.name : 'سيارة غير معروفة'}: ${fmtMoney(entry.amount)}</li>`;
      });
      statusHTML += `</ul>`;
    }
    
    contentDiv.innerHTML = statusHTML;
    statusDiv.style.display = 'block';
    
  } catch (err) {
    console.error('خطأ في التحقق من الحالة:', err);
    showToast('فشل التحقق من حالة النظام', 'error');
  }
}

// اختبار النظام بتاريخ معين
async function testDailyRentWithDate() {
  const testDate = prompt('أدخل تاريخ للاختبار (YYYY-MM-DD):', new Date().toLocaleDateString('en-CA'));
  
  if (testDate) {
    if (confirm(`هل تريد تشغيل النظام على تاريخ ${testDate}؟\n(هذا لأغراض الاختبار فقط)`)) {
      // حفظ التاريخ الأصلي
      const originalDate = await getLastRentDate();
      
      // وضع تاريخ وهمي قديم
      await setDoc(doc(db, 'meta', 'daily_rent'), { lastDate: '2000-01-01' }, { merge: true });
      
      // تشغيل النظام
      await processDailyRent();
      
      // استعادة التاريخ الأصلي
      if (originalDate) {
        await setDoc(doc(db, 'meta', 'daily_rent'), { lastDate: originalDate }, { merge: true });
      }
      
      showToast('تم إجراء الاختبار بنجاح', 'success');
    }
  }
}

// ---------- Mobile Menu Toggle ----------
function toggleMobileMenu(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');
  if(sidebar && overlay){
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    // Prevent body scroll when menu is open
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
    // Close mobile menu after selecting a tab
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
  if(!name) return window.showToast ? window.showToast('Please enter car name', 'warning') : alert('Please enter car name');
  try {
    await addCarToDB({ name, plate, dailyRent, price });
    info(`Car added: ${name} with daily rent ${dailyRent} and price ${price}`);
    if(window.showToast) window.showToast(`Car "${name}" added successfully!`, 'success');
    l('carName').value=''; l('carPlate').value=''; l('carDailyRent').value=''; l('carPrice').value='';
  } catch(err) {
    if(window.showToast) window.showToast('Failed to add car: ' + (err.message || err), 'error');
  }
});

// car table actions
l('carsTable').querySelector('tbody').addEventListener('click', async (ev)=>{
  const btn = ev.target.closest('button'); if(!btn) return;
  const act = btn.dataset.act; const id = btn.dataset.id;
  if(act === 'del'){ if(!confirm('Delete car and its entries?')) return; await deleteCarFromDB(id); if(window.showToast) window.showToast('Car deleted successfully', 'success');
  } else if(act === 'edit'){ const car = carsCache.find(c=>c.id===id); const newName = prompt('Car name', car.name); const newRent = prompt('Daily rent', car.dailyRent); const newPrice = prompt('Car price', car.price||''); let updated=false; if(newName!==null && newName!==car.name){ await updateCarInDB(id,{name:newName}); updated=true;} if(newRent!==null && parseFloat(newRent)!==car.dailyRent){ await updateCarInDB(id,{dailyRent: parseFloat(newRent)||0}); updated=true;} if(newPrice!==null && parseFloat(newPrice)!==Number(car.price||0)){ await updateCarInDB(id,{price: parseFloat(newPrice)||0}); updated=true;} if(updated) { if(window.showToast) window.showToast('Car updated successfully', 'success'); else alert('Updated'); } }
});

// add entry
l('btnAddEntry').addEventListener('click', async ()=>{
  const carId = l('entryCar').value;
  const date = l('entryDate').value || new Date().toISOString().slice(0,10);
  const type = l('entryType').value;
  const amount = parseFloat(l('entryAmount').value);
  const category = l('entryCategory').value.trim();
  if(!carId || carId === 'all') return window.showToast ? window.showToast('Please choose a car', 'warning') : alert('Please choose a car');
  if(isNaN(amount) || amount <= 0) return window.showToast ? window.showToast('Please enter a valid amount', 'warning') : alert('Please enter a valid amount');
  try {
    await addEntryToDB({ carId, date, type, amount, category: category || 'N/A', note: '' });
    if(window.showToast) window.showToast(`${type === 'income' ? 'Income' : 'Expense'} entry added successfully!`, 'success');
    l('entryAmount').value=''; l('entryCategory').value='';
  } catch(err) {
    if(window.showToast) window.showToast('Failed to add entry: ' + (err.message || err), 'error');
  }
});

// entries table actions
l('entriesTable').querySelector('tbody').addEventListener('click', async (ev)=>{
  const btn = ev.target.closest('button'); if(!btn) return;
  const act = btn.dataset.act; const id = btn.dataset.id;
  if(act==='del-entry'){ if(!confirm('Delete this entry?')) return; await deleteEntryFromDB(id); if(window.showToast) window.showToast('Entry deleted successfully', 'success');
  } else if(act==='edit-entry'){ const e = entriesCache.find(x=>x.id===id); const newAmt = prompt('Amount', e.amount); const newCat = prompt('Category', e.category); if(newAmt !== null){ await updateEntryInDB(id,{ amount: parseFloat(newAmt) || e.amount, category: newCat || e.category }); if(window.showToast) window.showToast('Entry updated successfully', 'success'); } }
});

// filters & reports & export handlers (CSV fallback)
l('btnApplyFilter').addEventListener('click', ()=> renderEntriesTable());
l('btnClearFilter').addEventListener('click', ()=> { l('filterCar').value='all'; l('filterFrom').value=''; l('filterTo').value=''; renderEntriesTable(); });
l('btnGenerate').addEventListener('click', ()=> { renderReportSummary(); if(window.showToast) window.showToast('Report generated successfully', 'success'); });
l('btnExportCSVReport').addEventListener('click', ()=> {
  const carId = l('reportCar').value; const from = l('reportFrom').value; const to = l('reportTo').value;
  let rows = entriesCache.slice(); if(carId && carId!=='all') rows = rows.filter(r=>r.carId===carId); if(from) rows = rows.filter(r=>r.date>=from); if(to) rows = rows.filter(r=>r.date<=to);
  let csv = 'date,car,type,category,amount\n'; rows.forEach(r=> csv += `${r.date},${(carsCache.find(c=>c.id===r.carId)||{}).name || ''},${r.type},${(r.category||'')},${r.amount}\n`);
  downloadFile('report.csv','text/csv;charset=utf-8;',csv);
  if(window.showToast) window.showToast('CSV exported successfully', 'success');
});
l('btnExportXLS').addEventListener('click', ()=> l('btnExportCSVReport').click());
async function ensurePdfLibs(){
  // Libraries are already loaded in HTML, just check if they're available
  if(typeof window.html2canvas === 'undefined'){
    console.warn('html2canvas not loaded');
    throw new Error('html2canvas library not available');
  }
  if(typeof window.jspdf === 'undefined'){
    console.warn('jspdf not loaded');
    throw new Error('jspdf library not available');
  }
}

l('btnExportPDF').addEventListener('click', async ()=>{
  try{
    await ensurePdfLibs();
    const clone = l('reportSummary').cloneNode(true);
    clone.style.background = '#ffffff'; clone.style.padding='18px'; clone.style.color='#000'; clone.style.width = '800px'; clone.style.boxSizing='border-box'; clone.style.border='1px solid #e6eef6';
    document.body.appendChild(clone);
    const canvas = await window.html2canvas(clone, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','mm','a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('report.pdf');
    document.body.removeChild(clone);
    if(window.showToast) window.showToast('PDF exported successfully', 'success');
  }catch(err){ console.error('PDF export error', err); if(window.showToast) window.showToast('PDF export failed: ' + (err.message || err), 'error'); else alert('PDF export failed'); }
});

// Backup / restore simplified
const handleBackupDownload = async () => { 
  const backup = { cars: carsCache, entries: entriesCache, users: usersCache, settings: settingsCache, ts: Date.now() }; 
  downloadFile('car_rental_backup.json','application/json;charset=utf-8;', JSON.stringify(backup,null,2)); 
  if(window.showToast) window.showToast('Backup downloaded successfully', 'success'); 
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
      if(window.showToast) window.showToast('Backup restored successfully', 'success');
      else alert('Backup data imported (appended).');
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
    if(window.showToast) window.showToast(`Language changed to ${e.target.value}`, 'success');
  });
}

l('settingCurrency').addEventListener('change', async ()=>{
  settingsCache.currency = l('settingCurrency').value.trim() || 'MRU';
  await setDoc(doc(db,'meta','settings'), settingsCache, { merge:true });
  updateDashboard();
  if(window.showToast) window.showToast(`Currency changed to ${settingsCache.currency}`, 'success');
});
l('settingTheme').addEventListener('change', (e)=>{ settingsCache.theme = e.target.value; setDoc(doc(db,'meta','settings'), settingsCache, { merge:true }).catch(()=>{}); applyTheme(settingsCache.theme); if(window.showToast) window.showToast(`Theme changed to ${settingsCache.theme}`, 'success'); });
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
  if(!name||!email) return window.showToast ? window.showToast('Please fill name and email', 'warning') : alert('Please fill name and email');
  if(usersCache.some(u=>u.email===email)) return window.showToast ? window.showToast('Email already in use', 'error') : alert('Email already in use');
  try {
    await addUserToDB({ name, email, role });
    l('newUserName').value=''; l('newUserEmail').value='';
    if(window.showToast) window.showToast(`User "${name}" added successfully`, 'success');
    else alert('User added to Firestore (password not stored; create account via Firebase Auth).');
  } catch(err) {
    if(window.showToast) window.showToast('Failed to add user: ' + (err.message || err), 'error');
  }
});

l('usersTable').querySelector('tbody').addEventListener('click', async (ev)=> {
  const btn = ev.target.closest('button'); if(!btn) return;
  const act = btn.dataset.act; const id = btn.dataset.id;
  if(act==='del-user'){ if(!confirm('Delete this user?')) return; await deleteUserFromDB(id); if(window.showToast) window.showToast('User deleted successfully', 'success'); }
  if(act==='impersonate'){ const u = usersCache.find(x=>x.id===id); if(u){ window.currentUser = u; localStorage.setItem('cr_current_user', JSON.stringify(u)); showTab('dashboard'); if(window.showToast) window.showToast(`Impersonated: ${u.name}`, 'info'); else alert(`Impersonated: ${u.name}`); } }
});

// ---------- Authentication (Firebase Auth) ----------
l('btnDoLogin').addEventListener('click', async ()=>{
  const email = l('loginEmail').value.trim(),
        pass  = l('loginPass').value.trim();

  if(!email || !pass)
    return window.showToast
      ? window.showToast('Please provide email and password', 'warning')
      : alert('Provide email and password');

  try{
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    // 👇 السطر الحاسم
    await migrateCarsToCurrentUser(user);

    if(window.showToast)
      window.showToast('Login successful!', 'success');

  }catch(err){
    console.error('login error', err);
    const msg = 'Login failed: ' + (err.message || err.code);
    if(window.showToast) window.showToast(msg, 'error');
    else alert(msg);
  }
});

// btnSignOutSidebar removed - using btnSignOut in topbar instead

// ---------- Authentication with Daily Rent Setup ----------
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
      
      // تحديث الواجهة
      l('uiUser').innerText = window.currentUser.email;
      l('modalLogin').style.display = 'none';
      
      // إرفاق مستمعي البيانات
      attachRealtimeListeners();
      
      // إعداد نظام الإيراد اليومي
      setupDailyRentScheduler();
      setupDailyRentUI(); // إضافة واجهة التحكم
      
      // عرض التبويب الرئيسي
      showTab('dashboard');
      
      // إنشاء مستخدمين تجريبيين إذا لزم الأمر
      ensureDemoUsers();
      
      // رسالة ترحيب
      showToast(`مرحباً ${window.currentUser.name}!`, 'success');
    } else {
      console.log('لم يتم تسجيل دخول');
      // إخفاء الواجهة وإظهار تسجيل الدخول
      l('modalLogin').style.display = 'flex';
      detachRealtimeListeners();
      // لا يوجد تبويب login، لذا نترك الواجهة كما هي
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

// ---------- Auto-backup (simple meta doc) ----------
// ---------- Login/Logout Button Events ----------

// زر تسجيل الدخول في الشريط الجانبي
l('btnLogin').addEventListener('click', () => {
  l('modalLogin').style.display = 'flex';
  console.log('Login button clicked - opening modal');
});

// زر إغلاق نافذة التسجيل
l('btnCloseLogin').addEventListener('click', () => {
  l('modalLogin').style.display = 'none';
  console.log('Close login button clicked');
});

// زر تسجيل الخروج في الشريط الجانبي
l('btnSignOut').addEventListener('click', async () => {
  try {
    console.log('Sign out button clicked');
    await signOut(auth);
    if(window.showToast) {
      window.showToast('تم تسجيل الخروج بنجاح', 'success');
    }
    detachRealtimeListeners();
    showTab('dashboard');
  } catch (err) {
    console.error('Sign out error:', err);
    if(window.showToast) {
      window.showToast('فشل تسجيل الخروج: ' + (err.message || err), 'error');
    }
  }
});

// زر تسجيل الخروج في الهيدر (إذا كان موجوداً)
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

// setupAutoBackup will be called after settings are loaded in attachRealtimeListeners
setTimeout(()=>{ processDailyRent(); }, 2000);
// في نهاية ملف app.js، أضف:

// تسجيل Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker مسجل بنجاح:', registration.scope);
      })
      .catch((error) => {
        console.error('فشل تسجيل Service Worker:', error);
      });
  });
}

// ---------- PWA Installation ----------
function setupPWA() {
  console.log('إعداد PWA...');
  
  // تسجيل Service Worker
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
  
  // التحقق من وضع التطبيق المثبت
  function checkDisplayMode() {
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      console.log('التطبيق يعمل في وضع PWA');
      document.documentElement.setAttribute('data-pwa', 'true');
    }
  }
  
  checkDisplayMode();
  
  // إضافة زر التثبيت
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
  
  // حدث قبل التثبيت
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // إظهار زر التثبيت بعد 5 ثواني
    setTimeout(() => {
      installButton.style.display = 'block';
    }, 5000);
    
    installButton.onclick = () => {
      installButton.style.display = 'none';
      deferredPrompt.prompt();
      
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ قبل المستخدم تثبيت التطبيق');
          if (window.showToast) {
            window.showToast('تم تثبيت التطبيق بنجاح!', 'success');
          }
        } else {
          console.log('❌ رفض المستخدم تثبيت التطبيق');
        }
        deferredPrompt = null;
      });
    };
  });
  
  // التحقق إذا كان التطبيق مثبت
  window.addEventListener('appinstalled', () => {
    console.log('التطبيق مثبت بنجاح');
    installButton.style.display = 'none';
  });
}

// تشغيل إعداد PWA
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => setupPWA(), 2000);
});