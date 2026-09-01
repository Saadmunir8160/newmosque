# Module 3.2 — set all prayer items + verify (Test Pack PT-A..E)
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:5000/api/v1'
$Today = (Get-Date).ToString('yyyy-MM-dd')
$To7 = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
$Year = (Get-Date).Year
$Month = (Get-Date).Month
$Results = New-Object System.Collections.Generic.List[object]
$mid = 115

function Add-T($id, $name, $pass, $detail) {
  $Results.Add([pscustomobject]@{ Id=$id; Name=$name; Pass=[bool]$pass; Detail="$detail" })
  $m = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host "[$m] $id - $name :: $detail"
}

function Login($u, $p) {
  Start-Sleep -Milliseconds 700
  try {
    $r = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json'
    return $r.token
  } catch {
    Write-Host "LOGIN_FAIL $u $($_.Exception.Response.StatusCode.value__)"
    return $null
  }
}

function Api($method, $path, $token, $body = $null) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  $p = @{ Uri = "$Base$path"; Method = $method; Headers = $h; UseBasicParsing = $true }
  if ($null -ne $body) { $p.Body = ($body | ConvertTo-Json -Depth 8); $p.ContentType = 'application/json' }
  try {
    $r = Invoke-WebRequest @p
    $json = $null
    try { $json = $r.Content | ConvertFrom-Json } catch {}
    return @{ Ok=$true; Status=[int]$r.StatusCode; Body="$($r.Content)"; Json=$json }
  } catch {
    $st = 0
    if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
    $raw = "$($_.ErrorDetails.Message)"
    $json = $null
    try { $json = $raw | ConvertFrom-Json } catch {}
    return @{ Ok=$false; Status=$st; Body=$raw; Json=$json }
  }
}

Write-Host "=== Module 3.2 Setup + Test (mosque $mid) ==="

$tokPE = Login 'prayereditor' 'Prayer@123'
$tokMA = Login 'mosqueadmin' 'Admin@123'
$tokAdmin = Login 'admin' 'Admin@123'
$tokOwner = Login 'owner' 'Owner@123'
Add-T 'AUTH' 'Logins PE/MA/Admin/Owner' ($tokPE -and $tokMA -and $tokAdmin) "pe=$([bool]$tokPE) ma=$([bool]$tokMA) admin=$([bool]$tokAdmin) owner=$([bool]$tokOwner)"

# Ensure mosque Active + PrayerTimes ON (admin)
$flag = Api PUT "/mosques/$mid/settings/PrayerTimes?enabled=true" $tokAdmin $null
Add-T 'SETUP1' 'PrayerTimes module ON' $flag.Ok "status=$($flag.Status)"

# Resolve mosque slug for public checks
$mosq = Api GET "/mosques?adminList=true" $tokAdmin
$slug = 'masjid-al-noor-bradford'
if ($mosq.Json) {
  $list = if ($mosq.Json.items) { $mosq.Json.items } else { @($mosq.Json) }
  $m = $list | Where-Object { $_.id -eq $mid } | Select-Object -First 1
  if ($m) { $slug = $m.slug; Write-Host "Mosque: $($m.name) slug=$slug status=$($m.status) deleted=$($m.isDeleted)" }
}

# Undelete hint via activate if needed
$act = Api POST "/platform/mosques/$mid/activate" $tokAdmin @{}
Add-T 'SETUP2' 'Ensure mosque Active' ($act.Ok -or $act.Status -in 200,400) "status=$($act.Status)"

# ---- PT-A Daily publish ----
$dailyBody = @{
  date = $Today
  fajrStart = '05:30:00'; fajrJamaat = '05:45:00'
  dhuhrStart = '12:30:00'; dhuhrJamaat = '13:00:00'
  asrStart = '15:30:00'; asrJamaat = '16:00:00'
  maghribStart = '18:00:00'; maghribJamaat = '18:10:00'
  ishaStart = '19:30:00'; ishaJamaat = '20:00:00'
}
$daily = Api PUT "/mosques/$mid/prayer-times/daily?publish=true" $tokPE $dailyBody
Add-T 'PT-A' 'Editor save+publish daily' $daily.Ok "status=$($daily.Status)"

$pubDaily = Api GET "/public/mosques/$mid/prayer-times/daily?date=$Today" $null
$hasTimes = $pubDaily.Ok -and ($null -ne $pubDaily.Json.times -or $pubDaily.Json.fajrJamaat -or $pubDaily.Json.times.fajrJamaat)
Add-T 'PT-A2' 'Public daily timetable readable' $pubDaily.Ok "status=$($pubDaily.Status) hasTimes=$hasTimes"

# ---- PT-B Jumuah 2 slots ----
# Clear then create two slots (or upsert)
$existingJ = Api GET "/mosques/$mid/prayer-times/jumuah" $tokPE
if ($existingJ.Json) {
  $jlist = @($existingJ.Json)
  foreach ($j in $jlist) {
    if ($j.id) { Api DELETE "/mosques/$mid/prayer-times/jumuah/$($j.id)" $tokPE | Out-Null }
  }
}
$j1 = Api POST "/mosques/$mid/prayer-times/jumuah" $tokPE @{ slotNumber = 1; khutbahTime = '12:45:00'; jamaatTime = '13:15:00' }
$j2 = Api POST "/mosques/$mid/prayer-times/jumuah" $tokPE @{ slotNumber = 2; khutbahTime = '13:30:00'; jamaatTime = '14:00:00' }
$jGet = Api GET "/mosques/$mid/prayer-times/jumuah" $tokPE
$jCount = 0
if ($jGet.Json) { $jCount = @($jGet.Json).Count }
Add-T 'PT-B' 'Two Jumuah slots' ($j1.Ok -and $j2.Ok -and $jCount -ge 2) "create1=$($j1.Status) create2=$($j2.Status) count=$jCount"

# ---- PT-C Exception Maghrib 18:25 ----
$excList = Api GET "/mosques/$mid/prayer-times/exceptions?from=$Today&to=$Today" $tokPE
if ($excList.Json) {
  foreach ($ex in @($excList.Json)) {
    if ($ex.prayer -match 'Maghrib' -and $ex.id) {
      Api DELETE "/mosques/$mid/prayer-times/exceptions/$($ex.id)" $tokPE | Out-Null
    }
  }
}
$exc = Api POST "/mosques/$mid/prayer-times/exceptions" $tokPE @{
  date = $Today
  prayer = 'Maghrib'
  overrideValue = '18:25:00'
  reason = 'Module 3.2 exception test'
}
Add-T 'PT-C' 'Maghrib exception 18:25' $exc.Ok "status=$($exc.Status)"

$pubExc = Api GET "/public/mosques/$mid/prayer-times/daily?date=$Today" $null
$maghribOk = $false
if ($pubExc.Json) {
  $mj = $pubExc.Json.times.maghribJamaat
  if (-not $mj) { $mj = $pubExc.Json.maghribJamaat }
  $maghribOk = "$mj" -match '18:25'
  # also check exceptions array
  if (-not $maghribOk -and $pubExc.Json.exceptions) {
    $e = @($pubExc.Json.exceptions) | Where-Object { $_.prayer -match 'Maghrib' } | Select-Object -First 1
    if ($e) { $maghribOk = "$($e.overrideValue)" -match '18:25' }
  }
}
Add-T 'PT-C2' 'Public reflects Maghrib override' ($pubExc.Ok -and $maghribOk) "status=$($pubExc.Status) body=$($pubExc.Body.Substring(0,[Math]::Min(180,$pubExc.Body.Length)))"

# ---- PT-D Template (Admin) + generate ----
$tplList = Api GET "/mosques/$mid/prayer-times/jamaah-templates" $tokMA
$tid = 0
if ($tplList.Json) {
  $existing = @($tplList.Json) | Where-Object { $_.name -eq 'Winter Timetable' } | Select-Object -First 1
  if ($existing) { $tid = [int]$existing.id }
}
if ($tid -eq 0) {
  $tpl = Api POST "/mosques/$mid/prayer-times/jamaah-templates" $tokMA @{
    name = 'Winter Timetable'
    isActive = $true
    daysOfWeek = @(0,1,2,3,4,5,6)
    prayers = @(
      @{ prayerName='Fajr'; startTime='06:00:00'; jamaatTime='06:15:00'; sortOrder=1 }
      @{ prayerName='Dhuhr'; startTime='12:20:00'; jamaatTime='12:45:00'; sortOrder=2 }
      @{ prayerName='Asr'; startTime='15:00:00'; jamaatTime='15:20:00'; sortOrder=3 }
      @{ prayerName='Maghrib'; startTime='17:30:00'; jamaatTime='17:40:00'; sortOrder=4 }
      @{ prayerName='Isha'; startTime='19:00:00'; jamaatTime='19:20:00'; sortOrder=5 }
    )
  }
  if ($tpl.Json.template.id) { $tid = [int]$tpl.Json.template.id }
  elseif ($tpl.Json.id) { $tid = [int]$tpl.Json.id }
  Add-T 'PT-D1' 'Admin create Winter template' ($tpl.Ok -and $tid -gt 0) "tid=$tid status=$($tpl.Status)"
} else {
  Add-T 'PT-D1' 'Winter template exists' $true "tid=$tid"
}

# Editor denied templates
$deny = Api GET "/mosques/$mid/prayer-times/jamaah-templates" $tokPE
Add-T 'PT-D-RBAC' 'Editor DENIED templates (403)' ($deny.Status -eq 403) "status=$($deny.Status)"

$genFrom = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
$genTo = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
$gen = if ($tid -gt 0) {
  Api POST "/mosques/$mid/prayer-times/jamaah-templates/$tid/generate" $tokMA @{
    from = $genFrom; to = $genTo; overwritePublished = $false; publish = $true; preview = $false
  }
} else { @{ Ok=$false; Status=0; Body='no tid' } }
Add-T 'PT-D2' 'Generate daily rows from template' $gen.Ok "status=$($gen.Status) $($gen.Body.Substring(0,[Math]::Min(160,$gen.Body.Length)))"

# ---- Audit ----
$audit = Api GET "/mosques/$mid/prayer-times/audit-log?take=30" $tokPE
$auditCount = 0
if ($audit.Json) { $auditCount = @($audit.Json).Count }
Add-T 'PT-AUDIT' 'Audit log readable' ($audit.Ok -and $auditCount -gt 0) "status=$($audit.Status) entries=$auditCount"

# ---- Monthly ----
$monthly = Api GET "/mosques/$mid/prayer-times/monthly?year=$Year&month=$Month" $tokPE
$mCount = 0
if ($monthly.Json) { $mCount = @($monthly.Json).Count }
Add-T 'PT-E1' 'Monthly timetable view' ($monthly.Ok -and $mCount -gt 0) "status=$($monthly.Status) rows=$mCount"

$pubMonthly = Api GET "/public/mosques/$mid/prayer-times/monthly?year=$Year&month=$Month" $null
if (-not $pubMonthly.Ok) { $pubMonthly = Api GET "/mosques/$mid/prayer-times/monthly?year=$Year&month=$Month" $null }
Add-T 'PT-E2' 'Public/monthly accessible' $pubMonthly.Ok "status=$($pubMonthly.Status)"

# Public profile
$pubProf = Api GET "/mosques/$slug" $null
Add-T 'PT-E3' 'Public mosque profile (countdown host)' $pubProf.Ok "status=$($pubProf.Status) slug=$slug"

# Data model presence summary via counts
$summary = @{
  dailyOk = $daily.Ok
  jumuah = $jCount
  exception = $exc.Ok
  templateId = $tid
  audit = $auditCount
  monthly = $mCount
}

$pass = ($Results | Where-Object Pass).Count
$fail = ($Results | Where-Object { -not $_.Pass }).Count

$out = @()
$out += '# Module 3.2 — Live Setup & Test Results'
$out += ''
$out += "**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$out += "**Mosque:** $mid ($slug)"
$out += "**PASS:** $pass · **FAIL:** $fail · **TOTAL:** $($Results.Count)"
$out += ''
$out += '## Test data applied'
$out += ''
$out += '| Item | Value |'
$out += '|------|-------|'
$out += '| Editor | ``prayereditor`` / ``Prayer@123`` |'
$out += '| Admin (templates) | ``mosqueadmin`` / ``Admin@123`` |'
$out += "| Today | $Today |"
$out += '| Daily Fajr | 05:30 / 05:45 |'
$out += '| Daily Dhuhr | 12:30 / 13:00 |'
$out += '| Daily Asr | 15:30 / 16:00 |'
$out += '| Daily Maghrib | 18:00 / 18:10 (+ exception 18:25) |'
$out += '| Daily Isha | 19:30 / 20:00 |'
$out += '| Jumuah 1 | Khutbah 12:45 / Jamaat 13:15 |'
$out += '| Jumuah 2 | Khutbah 13:30 / Jamaat 14:00 |'
$out += '| Exception | Maghrib override 18:25 |'
$out += "| Template | Winter Timetable id=$tid |"
$out += "| Generate | $genFrom to $genTo publish |"
$out += ''
$out += '## UI routes'
$out += ''
$out += '- Daily: /dashboard/prayer-editor/daily'
$out += '- Monthly: /dashboard/prayer-editor/monthly'
$out += '- Jumuah: /dashboard/prayer-editor/jumuah'
$out += '- Exceptions: /dashboard/prayer-editor/exceptions'
$out += '- Audit: /dashboard/prayer-editor/audit'
$out += '- Templates (Admin): /dashboard/admin/prayer-times/templates'
$out += "- Public: /mosque/$slug"
$out += ''
$out += '## Results'
$out += ''
$out += '| Id | Test | Result | Detail |'
$out += '|----|------|--------|--------|'
foreach ($r in $Results) {
  $m = if ($r.Pass) { 'PASS' } else { 'FAIL' }
  $d = ([string]$r.Detail) -replace '[|]', '/' -replace '[\r\n]+', ' '
  $line = '| {0} | {1} | **{2}** | {3} |' -f $r.Id, $r.Name, $m, $d
  $out += $line
}
$path = 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\Module32_LiveTestResults.md'
($out -join [Environment]::NewLine) | Set-Content -Path $path -Encoding UTF8
Write-Host ''
Write-Host ('Wrote {0} PASS={1} FAIL={2}' -f $path, $pass, $fail)
Write-Host ($summary | ConvertTo-Json -Compress)
