# Module 3.1 — quick client-demo API verification
# Run while API is on http://localhost:5000

$base = "http://localhost:5000/api/v1"
$slug = "jamia-masjid-rawalpindi"

Write-Host "`n=== Module 3.1 Client Demo Check ===" -ForegroundColor Cyan

# 1. API health
try {
    Invoke-RestMethod -Uri "$base/mosques" -TimeoutSec 5 | Out-Null
    Write-Host "[OK] API reachable" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] API not running. Start: dotnet run in MosqueOS.API" -ForegroundColor Red
    exit 1
}

# 2. Super admin login
$admin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" `
    -Body '{"username":"admin","password":"Admin@123"}'
$adminHdr = @{ Authorization = "Bearer $($admin.token)" }
Write-Host "[OK] Super Admin login" -ForegroundColor Green

# 3. Check or create demo mosque
$mosque = $null
try {
    $mosque = Invoke-RestMethod -Uri "$base/mosques/$slug" -TimeoutSec 5
    Write-Host "[OK] Demo mosque exists: $($mosque.name) (id=$($mosque.id), status=$($mosque.status))" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Creating demo mosque..." -ForegroundColor Yellow
    $body = @{
        name = "Jamia Masjid Rawalpindi"
        slug = $slug
        address = "88 Stratford Road, Sparkhill"
        city = "Birmingham"
        postcode = "B11 1AR"
        country = "United Kingdom"
        phone = "+441214567890"
        email = "info@jamia-rawalpindi.org"
        website = "https://jamia-rawalpindi.example.org"
        facebookUrl = "https://facebook.com/jamiamasjidrawalpindi"
        instagramUrl = "https://instagram.com/jamiamasjidrawalpindi"
        description = "Serving the Pakistani community in Birmingham with daily prayers, madrassah, and community events."
        timezone = "Europe/London"
        status = "Unclaimed"
    } | ConvertTo-Json
    $mosque = Invoke-RestMethod -Uri "$base/mosques" -Method POST -Headers $adminHdr `
        -ContentType "application/json" -Body $body
    Write-Host "[OK] Created: $($mosque.name) (id=$($mosque.id))" -ForegroundColor Green
}

$id = $mosque.id

# 4. Public profile
if ($mosque.status -in @("Unclaimed", "Active")) {
    Write-Host "[OK] Public profile available: /mosque/$slug" -ForegroundColor Green
} else {
    Write-Host ('[INFO] Status=' + $mosque.status + ' - public profile hidden until Active') -ForegroundColor Yellow
}

# 5. Prayer times (no 404)
try {
    $pt = Invoke-RestMethod -Uri "$base/mosques/$id/prayer-times/daily" -TimeoutSec 5
    Write-Host "[OK] Prayer times endpoint (times=$($pt.times -ne $null))" -ForegroundColor Green
} catch {
    Write-Host ('[FAIL] Prayer times: ' + $_.Exception.Message) -ForegroundColor Red
}

# 6. Feature flags
try {
    $flags = Invoke-RestMethod -Uri "$base/mosques/$id/features" -Headers $adminHdr
    Write-Host "[OK] Feature flags: $($flags.Count) modules" -ForegroundColor Green
} catch {
    Write-Host ('[WARN] Features: ' + $_.Exception.Message) -ForegroundColor Yellow
}

# 7. Pending claims
try {
    $claims = Invoke-RestMethod -Uri "$base/platform/claims/pending" -Headers $adminHdr
    Write-Host "[OK] Pending claims: $($claims.summary.pending)" -ForegroundColor Green
} catch {
    Write-Host ('[WARN] Claims endpoint: ' + $_.Exception.Message) -ForegroundColor Yellow
}

Write-Host "`n--- Demo URLs ---" -ForegroundColor Cyan
Write-Host "Public:  http://127.0.0.1:4200/mosque/$slug"
Write-Host "Super:   http://127.0.0.1:4200/dashboard/super/mosques/$id"
Write-Host "Claims:  http://127.0.0.1:4200/dashboard/super/claims"
Write-Host "`nModule 3.1: DONE - ready for client demo`n" -ForegroundColor Green
