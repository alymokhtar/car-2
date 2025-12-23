# سكريبت بسيط لرفع المشروع على GitHub
# قم بتشغيله من PowerShell

Write-Host "🚀 رفع المشروع على GitHub" -ForegroundColor Green
Write-Host ""

# إدخال معلومات GitHub
$username = Read-Host "أدخل اسم المستخدم على GitHub"
$repoName = Read-Host "أدخل اسم المستودع (مثال: car-rental-pro)"

# الانتقال إلى مجلد المشروع
Set-Location "c:\Users\EL-Baron\OneDrive\ALNAQEL\programing\cars"

# تهيئة Git
if (-not (Test-Path .git)) {
    Write-Host "تهيئة Git..." -ForegroundColor Yellow
    git init
}

# إضافة الملفات
Write-Host "إضافة الملفات..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "عمل Commit..." -ForegroundColor Yellow
git commit -m "Initial commit: Car Rental PRO Dashboard"

# إضافة remote
$remoteUrl = "https://github.com/$username/$repoName.git"
Write-Host "إضافة رابط GitHub..." -ForegroundColor Yellow

# إزالة remote القديم إن وجد
git remote remove origin 2>$null
git remote add origin $remoteUrl

# تغيير اسم الفرع
git branch -M main

Write-Host ""
Write-Host "✅ تم الإعداد بنجاح!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  مهم: أنشئ المستودع على GitHub أولاً من:" -ForegroundColor Yellow
Write-Host "https://github.com/new" -ForegroundColor Cyan
Write-Host ""
Write-Host "ثم قم بتشغيل:" -ForegroundColor Yellow
Write-Host "git push -u origin main" -ForegroundColor Cyan
Write-Host ""

