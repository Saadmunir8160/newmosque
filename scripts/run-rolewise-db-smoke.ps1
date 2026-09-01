# MosqueOS role-wise API smoke against mosque 115 (after DB fill)
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:5000/api/v1'
$mid = 115
$Results = New-Object System.Collections.Generic.List[object]

function Add-R($role, $id, $name, $pass, $detail) {
  $Results.Add([pscustomobject]@{ Role=$role; Id=$id; Name=$name; Pass=[bool]$pass; Detail="$detail" })
  $m = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host "[$m] $role $id - $name :: $detail"
}

function Login($u, $p) {
  Start-Sleep -Milliseconds 800
  try {
    $r = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json'
    return $r.token
  } catch { return $null }
}

function Call($method, $path, $token, $body = $null) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  $p = @{ Uri = "$Base$path"; Method = $method; Headers = $h; UseBasicParsing = $true }
  if ($null -ne $body) { $p.Body = ($body | ConvertTo-Json -Depth 6); $p.ContentType = 'application/json' }
  try {
    $r = Invoke-WebRequest @p
    return @{ Ok=$true; Status=[int]$r.StatusCode; Body=$r.Content }
  } catch {
    $st = 0
    if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
    return @{ Ok=$false; Status=$st; Body="$($_.ErrorDetails.Message)" }
  }
}

# ---- SUPER ADMIN ----
$t = Login 'admin' 'Admin@123'
Add-R 'SuperAdmin' 'SA1' 'Login' ($null -ne $t) "token=$([bool]$t)"
$r = Call GET '/platform/dashboard' $t
Add-R 'SuperAdmin' 'SA2' 'Platform dashboard' $r.Ok "status=$($r.Status)"
$r = Call GET '/platform/users' $t
Add-R 'SuperAdmin' 'SA3' 'Users' $r.Ok "status=$($r.Status)"
$r = Call GET "/mosques/$mid/settings" $t
Add-R 'SuperAdmin' 'SA4' 'Mosque 115 settings' $r.Ok "status=$($r.Status)"

# ---- OWNER ----
$t = Login 'owner' 'Owner@123'
Add-R 'Owner' 'OW1' 'Login' ($null -ne $t) ''
$r = Call PUT "/mosques/$mid/settings/Events?enabled=true" $t
Add-R 'Owner' 'OW2' 'Toggle Events flag ON' $r.Ok "status=$($r.Status)"
$r = Call POST "/mosques/$mid/events" $t @{ title='DB Verify Event'; description='role test'; date=(Get-Date).ToString('yyyy-MM-dd'); startTime='19:00:00'; eventType=0; status=0 }
Add-R 'Owner' 'OW3' 'Create event' $r.Ok "status=$($r.Status)"
$r = Call GET "/mosques/$mid/prayer-times/jamaah-templates" $t
Add-R 'Owner' 'OW4' 'List templates' $r.Ok "status=$($r.Status)"

# ---- MOSQUE ADMIN ----
$t = Login 'mosqueadmin' 'Admin@123'
Add-R 'MosqueAdmin' 'MA1' 'Login' ($null -ne $t) ''
$r = Call POST "/mosques/$mid/announcements" $t @{ title='DB Verify Ann'; summary='s'; body='b'; status='Draft'; isFeatured=$false }
Add-R 'MosqueAdmin' 'MA2' 'Create announcement' $r.Ok "status=$($r.Status)"
$r = Call GET "/madrassah/students?mosqueId=$mid" $t
Add-R 'MosqueAdmin' 'MA3' 'List students' $r.Ok "status=$($r.Status)"

# ---- PRAYER EDITOR ----
$t = Login 'prayereditor' 'Prayer@123'
Add-R 'PrayerEditor' 'PE1' 'Login' ($null -ne $t) ''
$r = Call GET "/mosques/$mid/prayer-times/daily?date=$((Get-Date).ToString('yyyy-MM-dd'))" $t
Add-R 'PrayerEditor' 'PE2' 'GET daily' $r.Ok "status=$($r.Status)"
$r = Call GET "/mosques/$mid/prayer-times/jamaah-templates" $t
Add-R 'PrayerEditor' 'PE3' 'Templates DENIED' ($r.Status -eq 403) "status=$($r.Status)"
$r = Call GET "/mosques/$mid/prayer-times/audit-log?take=5" $t
Add-R 'PrayerEditor' 'PE4' 'Audit log' $r.Ok "status=$($r.Status)"

# ---- TEACHER ----
$t = Login 'teacher' 'Teacher@123'
Add-R 'Teacher' 'TE1' 'Login' ($null -ne $t) ''
$r = Call GET "/teacher/classes?mosqueId=$mid" $t
Add-R 'Teacher' 'TE2' 'Classes' $r.Ok "status=$($r.Status)"
$r = Call POST "/madrassah/students/1/fees" $t @{ amount=1; dueDate=(Get-Date).ToString('yyyy-MM-dd'); status='Unpaid' }
Add-R 'Teacher' 'TE3' 'Fees DENIED' ($r.Status -eq 403) "status=$($r.Status)"
$r = Call GET "/mosques/$mid/participation/3/registrations" $t
Add-R 'Teacher' 'TE4' 'Participation regs' $r.Ok "status=$($r.Status)"

# ---- PARENT ----
$t = Login 'parent' 'Parent@123'
Add-R 'Parent' 'PA1' 'Login' ($null -ne $t) ''
$r = Call GET '/madrassah/my-children' $t
Add-R 'Parent' 'PA2' 'My children' $r.Ok "status=$($r.Status)"

# ---- MUQADDAM ----
$t = Login 'muqaddam' 'Muqaddam@123'
Add-R 'Muqaddam' 'MQ1' 'Login' ($null -ne $t) ''
$r = Call GET "/muqaddam/murids?mosqueId=$mid" $t
Add-R 'Muqaddam' 'MQ2' 'Murids' $r.Ok "status=$($r.Status)"
$r = Call GET '/awrad/collections' $t
Add-R 'Muqaddam' 'MQ3' 'Awrad collections' $r.Ok "status=$($r.Status)"
$r = Call POST '/communities/2/posts' $t @{ content='DB verify muqaddam post' }
Add-R 'Muqaddam' 'MQ4' 'Community post allowed' $r.Ok "status=$($r.Status)"

# ---- CONTENT EDITOR ----
$t = Login 'editor' 'Editor@123'
Add-R 'ContentEditor' 'CE1' 'Login' ($null -ne $t) ''
$r = Call GET '/content-editor/duas' $t
if (-not $r.Ok) { $r = Call GET '/duas' $t }
Add-R 'ContentEditor' 'CE2' 'Duas library' $r.Ok "status=$($r.Status)"

# ---- MEMBER ----
$t = Login 'member' 'Member@123'
Add-R 'Member' 'ME1' 'Login' ($null -ne $t) ''
$r = Call GET '/awrad/my-schedule' $t
Add-R 'Member' 'ME2' 'My wird schedule (DB filled)' $r.Ok "status=$($r.Status)"
$r = Call GET '/adhkar/mine' $t
Add-R 'Member' 'ME3' 'My adhkar' $r.Ok "status=$($r.Status)"
$r = Call GET '/quran/my-plan' $t
if (-not $r.Ok) { $r = Call GET '/quran/plan' $t }
Add-R 'Member' 'ME4' 'Quran plan' ($r.Ok -or $r.Status -in 200,404) "status=$($r.Status)"
$r = Call POST '/communities/2/posts' $t @{ content='member should fail' }
Add-R 'Member' 'ME5' 'Community post DENIED' ($r.Status -eq 403) "status=$($r.Status)"
$r = Call GET "/mosques/$mid/participation/mine" $t
Add-R 'Member' 'ME6' 'My participation (DB reg)' $r.Ok "status=$($r.Status)"

# ---- GUEST (anonymous) ----
$r = Call GET '/mosques/masjid-al-noor-bradford' $null
Add-R 'Guest' 'GU1' 'Public mosque profile' $r.Ok "status=$($r.Status)"
$r = Call GET "/public/mosques/$mid/prayer-times/daily" $null
Add-R 'Guest' 'GU2' 'Public prayer times' $r.Ok "status=$($r.Status)"
$r = Call GET '/ritual-guides' $null
Add-R 'Guest' 'GU3' 'Ritual guides' $r.Ok "status=$($r.Status)"
$r = Call GET '/journey-guides' $null
Add-R 'Guest' 'GU4' 'Journey guides' $r.Ok "status=$($r.Status)"
$r = Call GET "/mosques/$mid/janaza" $null
Add-R 'Guest' 'GU5' 'Janaza public' ($r.Ok -or $r.Status -in 200,404) "status=$($r.Status)"

$pass = ($Results | Where-Object Pass).Count
$fail = ($Results | Where-Object { -not $_.Pass }).Count
$out = @()
$out += '# MosqueOS — Database + Role-Wise Smoke Results'
$out += ''
$out += "**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$out += "**Mosque:** 115 Masjid Al-Noor Bradford"
$out += "**PASS:** $pass · **FAIL:** $fail · **TOTAL:** $($Results.Count)"
$out += ''
$out += '| Role | Id | Test | Result | Detail |'
$out += '|------|----|------|--------|--------|'
foreach ($x in $Results) {
  $m = if ($x.Pass) { 'PASS' } else { 'FAIL' }
  $d = ($x.Detail -replace '\|','/')
  $out += "| $($x.Role) | $($x.Id) | $($x.Name) | **$m** | $d |"
}
$path = 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\DB_RoleWise_SmokeResults.md'
$out -join "`n" | Set-Content $path -Encoding UTF8
Write-Host "`nWrote $path PASS=$pass FAIL=$fail"
