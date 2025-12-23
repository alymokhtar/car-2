# سكريبت PowerShell لرفع المشروع على GitHub
# استبدل YOUR_USERNAME و REPO_NAME قبل التشغيل

Write-Host "🚀 بدء رفع المشروع على GitHub..." -ForegroundColor Green

# التحقق من وجود Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git موجود: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git غير مثبت. يرجى تثبيته من: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# الانتقال إلى مجلد المشروع
$projectPath = "c:\Users\EL-Baron\OneDrive\ALNAQEL\programing\cars"
Set-Location $projectPath

# تهيئة Git
if (-not (Test-Path .git)) {
    Write-Host "📦 تهيئة Git repository..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "✅ Git repository موجود بالفعل" -ForegroundColor Green
}

# إضافة جميع الملفات
Write-Host "📝 إضافة الملفات..." -ForegroundColor Yellow
git add .

# عمل Commit
Write-Host "💾 عمل Commit..." -ForegroundColor Yellow
git commit -m "Initial commit: Car Rental PRO Dashboard with Firebase integration"

Write-Host ""
Write-Host "✅ تم إعداد المستودع محلياً بنجاح!" -ForegroundColor Green
Write-Host ""
Write-Host "الخطوات التالية:" -ForegroundColor Cyan
Write-Host "1. أنشئ مستودع جديد على GitHub: https://github.com/new" -ForegroundColor White
Write-Host "2. لا تضع علامة على 'Initialize with README'" -ForegroundColor White
Write-Host "3. انسخ رابط المستودع (مثال: https://github.com/YOUR_USERNAME/REPO_NAME.git)" -ForegroundColor White
Write-Host "4. قم بتشغيل الأوامر التالية:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""

