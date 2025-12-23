# دليل سريع لرفع المشروع على GitHub

## الطريقة السريعة (باستخدام GitHub Desktop)

### 1. تثبيت GitHub Desktop
- قم بتحميل من: https://desktop.github.com
- قم بتثبيته وسجل الدخول

### 2. رفع المشروع
1. افتح GitHub Desktop
2. File → Add Local Repository
3. اختر مجلد: `c:\Users\EL-Baron\OneDrive\ALNAQEL\programing\cars`
4. إذا لم يكن هناك مستودع Git، انقر "Create a repository"
5. أدخل اسم المستودع ووصف
6. انقر "Publish repository"
7. اختر Public أو Private
8. انقر "Publish repository"

**انتهى!** 🎉

---

## الطريقة التقليدية (باستخدام Terminal)

### المتطلبات:
- Git مثبت على النظام
- حساب GitHub

### الخطوات:

```bash
# 1. الانتقال إلى مجلد المشروع
cd "c:\Users\EL-Baron\OneDrive\ALNAQEL\programing\cars"

# 2. تهيئة Git
git init

# 3. إضافة جميع الملفات
git add .

# 4. عمل Commit
git commit -m "Initial commit: Car Rental PRO Dashboard"

# 5. إنشاء مستودع على GitHub أولاً، ثم:
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 6. رفع المشروع
git branch -M main
git push -u origin main
```

---

## ملاحظات مهمة:

✅ **سيتم رفع:**
- جميع ملفات الكود (`src/`, `index.html`)
- ملفات الإعدادات (`package.json`, `vite.config.js`)
- ملفات التوثيق (`.md`)

❌ **لن يتم رفع:**
- `node_modules/` (سيتم تثبيته تلقائياً)
- `dist/` (يتم إنشاؤه عند البناء)
- `.env` (يحتوي على مفاتيح Firebase السرية)
- `.firebase/` (ملفات Firebase المحلية)

---

## بعد الرفع:

1. ✅ تحقق من أن جميع الملفات موجودة
2. ✅ أضف وصف للمستودع
3. ✅ أضف Topics (مثل: `firebase`, `car-rental`, `dashboard`)
4. ✅ فعّل GitHub Pages إذا أردت (Settings → Pages)

---

**للمزيد من التفاصيل، راجع `GITHUB_SETUP.md`**

