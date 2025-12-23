// ---------- Firebase imports ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// ---------- Local imports ----------
import { initLanguage, setLanguage } from "./i18n.js";
import { info, error, warn } from "./logger.js";

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
const app = initializeApp(firebaseConfig);
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
function attachRealtimeListeners(){
  // detach first if any
  detachRealtimeListeners();

  // cars
  const carsCol = collection(db,'cars');
  unsubCars = onSnapshot(carsCol, snap => {
    carsCache = []; snap.forEach(d => carsCache.push({ id:d.id, ...d.data() }));
    renderCarsTable(); populateCarSelects(); updateDashboard();
  }, err => { console.error('cars snapshot error', err); });

  // entries
  const entriesCol = collection(db,'entries');
  unsubEntries = onSnapshot(entriesCol, snap => {
    entriesCache = []; snap.forEach(d => entriesCache.push({ id:d.id, ...d.data() }));
    renderEntriesTable(); updateDashboard();
  }, err => { console.error('entries snapshot error', err); });

  // users (firestore collection used for demo admin data)
  const usersCol = collection(db,'users');
  unsubUsers = onSnapshot(usersCol, snap => {
    usersCache = []; snap.forEach(d => usersCache.push({ id:d.id, ...d.data() }));
    renderUsers();
  }, err => { console.error('users snapshot error', err); });

  // load settings doc once
  (async function loadSettings(){
    try {
      const sRef = doc(db,'meta','settings');
      const sDoc = await getDoc(sRef);
      if(sDoc && sDoc.exists()){
        settingsCache = {...settingsCache, ...sDoc.data()};
      } else {
        await setDoc(sRef, settingsCache);
      }
      l('settingCurrency').value = settingsCache.currency || 'MRU';
      l('settingTheme').value = settingsCache.theme || 'light';
      applyTheme(settingsCache.theme || 'light');
      setupAutoBackup();
    } catch(err){
      console.error('load settings error', err);
    }
  })();
}

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

// ---------- Daily rent automation ----------
async function processDailyRent(){
  try{
    const today = new Date().toISOString().slice(0,10);
    const last = await getLastRentDate();
    if(last === today) { console.log('daily rent already processed'); return; }
    for(const car of carsCache){
      const rent = Number(car.dailyRent) || 0;
      if(rent > 0){
        const duplicate = entriesCache.some(e=> e.carId===car.id && e.date===today && e.category==='Daily Automated Rent');
        if(!duplicate){
          await addEntryToDB({ carId: car.id, date: today, type:'income', amount: rent, category:'Daily Automated Rent', note:`Daily automated rent - ${car.name}` });
        }
      }
    }
    await setLastRentDate(today);
    console.log('daily rent processed for', today);
  }catch(err){ console.error('processDailyRent error', err); }
}
let lastCheckedDate = new Date().toISOString().slice(0,10);
setInterval(async ()=>{ const nowDate = new Date().toISOString().slice(0,10); if(nowDate !== lastCheckedDate){ lastCheckedDate = nowDate; await processDailyRent(); } }, 60*1000);
setTimeout(()=>processDailyRent(), 1500);

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
l('settingLanguage').addEventListener('change', (e) => {
  setLanguage(e.target.value);
  info(`Language changed to: ${e.target.value}`);
  if(window.showToast) window.showToast(`Language changed to ${e.target.value}`, 'success');
});

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
l('btnLogin').addEventListener('click', ()=> l('modalLogin').style.display = 'flex');
l('btnCloseLogin').addEventListener('click', ()=> l('modalLogin').style.display = 'none');

l('btnDoLogin').addEventListener('click', async ()=>{
  const email = l('loginEmail').value.trim(), pass = l('loginPass').value.trim();
  if(!email || !pass) return window.showToast ? window.showToast('Please provide email and password', 'warning') : alert('Provide email and password');
  try{
    await signInWithEmailAndPassword(auth, email, pass);
    if(window.showToast) window.showToast('Login successful!', 'success');
  }catch(err){
    console.error('login error', err);
    const msg = 'Login failed: ' + (err.message || err.code);
    if(window.showToast) window.showToast(msg, 'error');
    else alert(msg);
  }
});

const handleSignOut = async ()=>{ try{ await signOut(auth); if(window.showToast) window.showToast('Signed out successfully', 'info'); else alert('Signed out'); }catch(err){ console.error('signout', err); if(window.showToast) window.showToast('Sign out failed', 'error'); else alert('Sign out failed'); } };
l('btnSignOut').addEventListener('click', handleSignOut);
// btnSignOutSidebar removed - using btnSignOut in topbar instead

onAuthStateChanged(auth, async (user)=>{
  if(user){
    console.log('User signed in:', user.email);
    info(`User authenticated: ${user.email}`);
    window.currentUser = { uid: user.uid, email: user.email };
    l('modalLogin').style.display = 'none';
    // Sign out button is always visible in topbar
    attachRealtimeListeners();
    showTab('dashboard');
    ensureDemoUsers();
    if(window.showToast) window.showToast(`Welcome, ${user.email}!`, 'success');
  } else {
    console.log('No user signed in');
    warn('No user authenticated');
    window.currentUser = null;
    // Sign out button is always visible in topbar
    detachRealtimeListeners();
    l('modalLogin').style.display = 'flex';
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


// ---------- Initial UI state ----------
function initialUI(){
  l('entryDate').value = new Date().toISOString().slice(0,10);
  showTab('dashboard');
}
initialUI();

// setupAutoBackup will be called after settings are loaded in attachRealtimeListeners
setTimeout(()=>{ processDailyRent(); }, 2000);
