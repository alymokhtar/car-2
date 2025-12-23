# سكريبت PowerShell لرفع المشروع على GitHub تلقائياً
# يتطلب: Git مثبت + معلومات GitHub

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName,
    
    [string]$Description = "Professional car rental management dashboard with Firebase integration"
)

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 رفع المشروع على GitHub" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# الانتقال إلى مجلد المشروع
$projectPath = "c:\Users\EL-Baron\OneDrive\ALNAQEL\programing\cars"
Set-Location $projectPath

# التحقق من وجود Git
try {
    $gitVersion = git --version 2>&1
    Write-Host "✅ Git موجود" -ForegroundColor Green
} catch {
    Write-Host "❌ Git غير مثبت. يرجى تثبيته من: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# تهيئة Git
if (-not (Test-Path .git)) {
    Write-Host "📦 تهيئة Git repository..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ فشل تهيئة Git" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Git repository موجود بالفعل" -ForegroundColor Green
}

# التحقق من إعداد Git
$userName = git config user.name
$userEmail = git config user.email

if (-not $userName -or -not $userEmail) {
    Write-Host "⚠️  Git غير مهيأ. يرجى إدخال معلوماتك:" -ForegroundColor Yellow
    $name = Read-Host "اسمك"
    $email = Read-Host "بريدك الإلكتروني"
    git config --global user.name $name
    git config --global user.email $email
    Write-Host "✅ تم إعداد Git" -ForegroundColor Green
}

# إضافة جميع الملفات
Write-Host "📝 إضافة الملفات..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل إضافة الملفات" -ForegroundColor Red
    exit 1
}

# عمل Commit
Write-Host "💾 عمل Commit..." -ForegroundColor Yellow
$commitMessage = "Initial commit: Car Rental PRO Dashboard"
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  لا توجد تغييرات جديدة للـ commit" -ForegroundColor Yellow
}

# إضافة remote (إزالة القديم إن وجد)
Write-Host "🔗 إعداد رابط GitHub..." -ForegroundColor Yellow
$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"

# التحقق من وجود remote
$existingRemote = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  يوجد remote موجود. هل تريد استبداله؟ (Y/N)" -ForegroundColor Yellow
    $replace = Read-Host
    if ($replace -eq "Y" -or $replace -eq "y") {
        git remote remove origin
        git remote add origin $remoteUrl
    }
} else {
    git remote add origin $remoteUrl
}

# تغيير اسم الفرع إلى main
Write-Host "🌿 تغيير اسم الفرع إلى main..." -ForegroundColor Yellow
git branch -M main 2>&1 | Out-Null

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ تم إعداد المستودع بنجاح!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "الخطوات التالية:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  أنشئ مستودع جديد على GitHub:" -ForegroundColor Cyan
Write-Host "   https://github.com/new" -ForegroundColor White
Write-Host ""
Write-Host "   - Repository name: $RepoName" -ForegroundColor White
Write-Host "   - Description: $Description" -ForegroundColor White
Write-Host "   - اختر Public أو Private" -ForegroundColor White
Write-Host "   - ❌ لا تضع علامة على 'Initialize with README'" -ForegroundColor Red
Write-Host ""
Write-Host "2️⃣  بعد إنشاء المستودع، قم بتشغيل:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "   (سيطلب منك اسم المستخدم وكلمة المرور أو Token)" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

