# دليل رفع المشروع على GitHub

## الخطوة 1: تثبيت Git (إذا لم يكن مثبتاً)

### Windows:
1. قم بتحميل Git من: https://git-scm.com/download/win
2. قم بتثبيته مع جميع الإعدادات الافتراضية
3. أعد تشغيل PowerShell أو Terminal

### التحقق من التثبيت:
```bash
git --version
```

## الخطوة 2: إعداد Git (للمرة الأولى فقط)

```bash
git config --global user.name "اسمك"
git config --global user.email "بريدك@example.com"
```

## الخطوة 3: إنشاء مستودع جديد على GitHub

1. اذهب إلى https://github.com
2. سجل الدخول إلى حسابك
3. انقر على زر "+" في الزاوية العلوية اليمنى
4. اختر "New repository"
5. أدخل اسم المستودع (مثال: `car-rental-pro`)
6. اختر Public أو Private
7. **لا** تضع علامة على "Initialize this repository with a README"
8. انقر "Create repository"

## الخطوة 4: رفع المشروع

افتح PowerShell أو Terminal في مجلد المشروع وقم بتنفيذ الأوامر التالية:

```bash
# الانتقال إلى مجلد المشروع
cd "c:\Users\EL-Baron\OneDrive\ALNAQEL\programing\cars"

# تهيئة Git (إذا لم يكن موجوداً)
git init

# إضافة جميع الملفات
git add .

# عمل Commit أولي
git commit -m "Initial commit: Car Rental PRO Dashboard"

# إضافة رابط المستودع (استبدل YOUR_USERNAME و REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# رفع المشروع
git branch -M main
git push -u origin main
```

## الخطوة 5: تحديث المشروع لاحقاً

عند إجراء تغييرات، استخدم:

```bash
# إضافة التغييرات
git add .

# عمل Commit
git commit -m "وصف التغييرات"

# رفع التغييرات
git push
```

## ملاحظات مهمة:

### ⚠️ الأمان:
- **لا ترفع ملفات `.env`** - تحتوي على مفاتيح Firebase السرية
- **لا ترفع مجلد `node_modules/`** - سيتم تثبيته تلقائياً
- **لا ترفع مجلد `dist/`** - يتم إنشاؤه عند البناء

### ✅ الملفات المرفوعة:
- ✅ جميع ملفات `src/`
- ✅ `index.html`
- ✅ `package.json`
- ✅ `vite.config.js`
- ✅ `firebase.json`
- ✅ `firestore.rules`
- ✅ جميع ملفات التوثيق (`.md`)

### 🔐 إعدادات Firebase:
إذا كنت تريد مشاركة المشروع علناً، يجب:
1. إنشاء ملف `.env.example` يحتوي على:
```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
```

2. تحديث `src/app.js` لاستخدام متغيرات البيئة:
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ...
};
```

## استكشاف الأخطاء:

### خطأ: "git is not recognized"
- تأكد من تثبيت Git
- أعد تشغيل Terminal

### خطأ: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
```

### خطأ: "Authentication failed"
- استخدم Personal Access Token بدلاً من كلمة المرور
- أو استخدم GitHub Desktop

## استخدام GitHub Desktop (أسهل):

1. قم بتحميل GitHub Desktop من: https://desktop.github.com
2. سجل الدخول بحساب GitHub
3. File → Add Local Repository
4. اختر مجلد المشروع
5. Publish repository

---

**نصيحة:** بعد رفع المشروع، يمكنك إضافة:
- GitHub Actions للـ CI/CD (موجود في `.github/workflows/`)
- Issues و Projects لإدارة المهام
- Wiki للتوثيق الإضافي

