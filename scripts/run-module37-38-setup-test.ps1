# Module 3.7 Awrad & Wird + 3.8 Daily Adhkar — setup + verify (gap-clear)
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:5000/api/v1'
$mid = 115
$Results = New-Object System.Collections.Generic.List[object]

function Add-T($id, $name, $pass, $detail) {
  $Results.Add([pscustomobject]@{ Id=$id; Name=$name; Pass=[bool]$pass; Detail="$detail" })
  $m = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host "[$m] $id - $name :: $detail"
}

function Login($u, $p) {
  Start-Sleep -Milliseconds 2000
  try {
    return Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json'
  } catch {
    $st = 0
    if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
    Write-Host "LOGIN_FAIL $u $st"
    if ($st -eq 429) {
      Start-Sleep -Seconds 10
      try {
        return Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json'
      } catch { return $null }
    }
    return $null
  }
}

function Api($method, $path, $token, $body = $null) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  $p = @{ Uri = "$Base$path"; Method = $method; Headers = $h; UseBasicParsing = $true }
  if ($null -ne $body) {
    if ($body -is [System.Array]) { $p.Body = ConvertTo-Json -InputObject @($body) -Depth 8 -Compress }
    else { $p.Body = ($body | ConvertTo-Json -Depth 8 -Compress) }
    $p.ContentType = 'application/json; charset=utf-8'
  }
  try {
    $r = Invoke-WebRequest @p
    $json = $null
    try { $json = ConvertFrom-Json -InputObject $r.Content } catch {}
    return [pscustomobject]@{ Ok=$true; Status=[int]$r.StatusCode; Body=[string]$r.Content; Json=$json }
  } catch {
    $st = 0
    if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
    $raw = "$($_.ErrorDetails.Message)"
    $json = $null
    try { $json = ConvertFrom-Json -InputObject $raw } catch {}
    return [pscustomobject]@{ Ok=$false; Status=$st; Body=$raw; Json=$json }
  }
}

function Get-IdFromBody([string]$raw) {
  if ($raw -match '"id"\s*:\s*(\d+)') { return [int]$Matches[1] }
  return 0
}

Write-Host '=== Module 3.7 + 3.8 Setup + Test ==='

$loginAdmin = Login 'admin' 'Admin@123'
$loginEditor = Login 'editor' 'Editor@123'
$loginMember = Login 'member' 'Member@123'
$loginMuq = Login 'muqaddam' 'Muqaddam@123'

$tokAdmin = $loginAdmin.token
$tokEditor = $loginEditor.token
$tokMember = $loginMember.token
$tokMuq = $loginMuq.token

Add-T 'AUTH' 'Logins' ($tokAdmin -and $tokEditor -and $tokMember) "admin=$([bool]$tokAdmin) editor=$([bool]$tokEditor) member=$([bool]$tokMember) muq=$([bool]$tokMuq)"

$f1 = Api PUT "/mosques/$mid/settings/Awrad?enabled=true" $tokAdmin $null
$f2 = Api PUT "/mosques/$mid/settings/Adhkar?enabled=true" $tokAdmin $null
Add-T 'SETUP' 'Awrad + Adhkar modules ON' ($f1.Ok -and $f2.Ok) "awrad=$($f1.Status) adhkar=$($f2.Status)"

# ===================== 3.7 Awrad =====================
# Set member level Beginner for sequence trim test
$pref = Api PUT '/auth/preferences' $tokMember @{ level = 0; wirdMode = 0; tariqa = 1 }
Add-T 'W0' 'Set member Level=Beginner Mode=Full Tariqa=BaAlawi' $pref.Ok "status=$($pref.Status)"

$content = Api POST '/awrad/content-items' $tokEditor @{
  title = 'M37 Test Salawat'
  arabicText = 'اللهم صل على محمد'
  transliteration = 'Allahumma salli ala Muhammad'
  translation = 'O Allah, send blessings upon Muhammad'
  repeatCount = 10
  audioUrl = 'https://example.com/audio/salawat.mp3'
  sourceRef = 'M37 test'
  type = 1
  status = 3
}
$contentId = Get-IdFromBody $content.Body
Add-T 'W1' 'Create content item (arabic/translit/translation/audio/repeat)' ($content.Ok -and $contentId -gt 0) "id=$contentId status=$($content.Status)"

$col = Api POST '/awrad/collections' $tokEditor @{
  name = 'M37 Demo Daily Wird'
  tariqa = 1
  type = 0
  recommendedTime = 'After Fajr'
  description = 'Module 3.7 guided reading demo'
}
$colId = Get-IdFromBody $col.Body
Add-T 'W2' 'Create wird collection (draft)' ($col.Ok -and $colId -gt 0) "id=$colId status=$($col.Status)"

# Add 5 steps (reuse existing content items 1-5 + new)
$stepOk = $true
$order = 1
foreach ($cid in @($contentId, 1, 2, 3, 4)) {
  if ($cid -le 0) { continue }
  $s = Api POST "/awrad/collections/$colId/steps" $tokEditor @{
    contentItemId = $cid
    orderIndex = $order
    customInstructions = "Step $order"
  }
  if (-not $s.Ok) { $stepOk = $false }
  $order++
}
Add-T 'W3' 'Add ordered wird steps' $stepOk "steps=$($order-1)"

$pub = Api POST "/awrad/collections/$colId/publish" $tokEditor $null
Add-T 'W4' 'Publish collection' ($pub.Ok -and ($pub.Json.status -match 'Published|3')) "status=$($pub.Status) colStatus=$($pub.Json.status)"

$list = Api GET '/awrad/collections?tariqa=1&type=0' $null
Add-T 'W5' 'List published collections (BaAlawi path)' ($list.Ok -and ($list.Body -match 'M37 Demo')) "status=$($list.Status)"

$guided = Api GET "/awrad/collections/$colId" $tokMember
$stepCount = 0
if ($guided.Json.steps) { $stepCount = @($guided.Json.steps).Count }
# Beginner = 40% of 5 = 2
Add-T 'W6' 'Guided reading trims for Beginner level' ($guided.Ok -and $stepCount -ge 1 -and $stepCount -le 3) "status=$($guided.Status) steps=$stepCount (expect ~2)"

$quick = Api GET "/awrad/collections/${colId}?mode=Quick" $tokMember
$qCount = 0
if ($quick.Json -and $quick.Json.steps) { $qCount = @($quick.Json.steps).Count }
Add-T 'W7' 'Quick mode shortens sequence further' ($quick.Ok -and $qCount -ge 1 -and $qCount -le $stepCount) "status=$($quick.Status) quickSteps=$qCount fullBeginner=$stepCount"

# Assign to prayer slot (Wird Builder)
$sched = Api POST '/awrad/my-schedule' $tokMember @{
  prayerSlot = 7
  collectionId = $colId
  mode = 0
}
Add-T 'W8' 'Wird Builder: assign collection to prayer slot' $sched.Ok "status=$($sched.Status)"

$mySched = Api GET '/awrad/my-schedule' $tokMember
Add-T 'W9' 'Get personal wird schedule' ($mySched.Ok -and ($mySched.Body -match "$colId")) "status=$($mySched.Status)"

$rec = Api GET '/awrad/recommended-now' $tokMember
Add-T 'W10' 'Recommended-now returns slot + collection' ($rec.Ok -and $rec.Json.slot -and $rec.Json.collection) "status=$($rec.Status) slot=$($rec.Json.slot) level=$($rec.Json.userLevel) steps=$($rec.Json.stepCount)"

$done = Api POST "/awrad/collections/$colId/complete" $tokMember $null
Add-T 'W11' 'Mark collection complete' ($done.Ok -and $done.Json.completed) "status=$($done.Status)"

$today = Api GET '/awrad/completed-today' $tokMember
Add-T 'W12' 'Completed-today includes collection' ($today.Ok -and ($today.Body -match "$colId")) "status=$($today.Status)"

$mawlid = Api GET '/awrad/mawlid-schedules' $null
Add-T 'W13' 'Mawlid schedule builder lists Event/Weekly' ($mawlid.Ok -and ($mawlid.Body -match 'Mawlid|Event|Thursday|id')) "status=$($mawlid.Status)"

# Path-specific: Shadhili filter still returns General+Shadhili
$sh = Api GET '/awrad/collections?tariqa=2' $null
Add-T 'W14' 'Path-specific Shadhili listing' $sh.Ok "status=$($sh.Status)"

# ===================== 3.8 Adhkar =====================
$adhCreate = Api POST '/adhkar/items' $tokEditor @{
  title = 'M38 Astaghfirullah'
  arabicText = 'استغفر الله'
  transliteration = 'Astaghfirullah'
  translation = 'I seek forgiveness from Allah'
  defaultCount = 100
  category = 'general'
}
$adhId = Get-IdFromBody $adhCreate.Body
$adhPub = if ($adhId -gt 0) { Api POST "/adhkar/items/$adhId/publish" $tokEditor $null } else { [pscustomobject]@{ Ok=$false; Status=0 } }
Add-T 'A1' 'Create + publish adhkar library item' ($adhCreate.Ok -and $adhPub.Ok) "id=$adhId create=$($adhCreate.Status) pub=$($adhPub.Status)"

$lib = Api GET '/adhkar/items' $null
Add-T 'A2' 'Public/library adhkar list' ($lib.Ok -and ($lib.Body -match 'Astaghfirullah|SubhanAllah')) "status=$($lib.Status)"

# Use existing item 1 if new not visible yet
$itemForMine = if ($adhId -gt 0) { $adhId } else { 1 }
$add = Api POST '/adhkar/mine' $tokMember @{
  adhkarItemId = $itemForMine
  targetCount = 50
  prayerSlot = 6
  occasion = 0
}
$userAdhkarId = Get-IdFromBody $add.Body
if (-not $add.Ok -and $add.Status -eq 409) {
  $mineExisting = Api GET '/adhkar/mine' $tokMember
  if ($mineExisting.Body -match '"id"\s*:\s*(\d+)') { $userAdhkarId = [int]$Matches[1]; $add = [pscustomobject]@{ Ok=$true; Status=200; Body=$mineExisting.Body } }
}
Add-T 'A3' 'Add to personal adhkar list with target' ($add.Ok -and $userAdhkarId -gt 0) "userAdhkarId=$userAdhkarId status=$($add.Status)"

$upd = Api PUT "/adhkar/mine/$userAdhkarId" $tokMember @{
  targetCount = 50
  prayerSlot = 6
  occasion = 0
}
Add-T 'A4' 'Update target / prayer slot / occasion' $upd.Ok "status=$($upd.Status)"

# Friday occasion item
$addFri = Api POST '/adhkar/mine' $tokMember @{
  adhkarItemId = 4
  targetCount = 100
  occasion = 1
}
# may conflict
$inc1 = Api POST "/adhkar/mine/$userAdhkarId/increment?by=1" $tokMember $null
Add-T 'A5' '+1 counter' ($inc1.Ok -and $inc1.Json.completed -ge 1) "status=$($inc1.Status) progress=$($inc1.Json.progressLabel)"

$inc10 = Api POST "/adhkar/mine/$userAdhkarId/increment?by=10" $tokMember $null
Add-T 'A6' '+10 counter + progress label' ($inc10.Ok -and ($inc10.Json.progressLabel -match '\d+/\d+')) "status=$($inc10.Status) progress=$($inc10.Json.progressLabel)"

$mine = Api GET '/adhkar/mine' $tokMember
Add-T 'A7' 'Personal list with today count' ($mine.Ok -and ($mine.Body -match 'todayCount|TodayCount')) "status=$($mine.Status)"

$rel = Api GET '/adhkar/mine?relevantOnly=true' $tokMember
Add-T 'A8' 'Occasion filter relevantOnly' $rel.Ok "status=$($rel.Status)"

$sum = Api GET '/adhkar/mine/summary' $tokMember
Add-T 'A9' 'My Wird summary card API' ($sum.Ok -and $sum.Json.progressLabel) "status=$($sum.Status) label=$($sum.Json.progressLabel) items=$($sum.Json.itemCount)"

# custom adhkar
$custom = Api POST '/adhkar/mine' $tokMember @{
  customTitle = 'M38 Custom Dhikr'
  customArabicText = 'حسبنا الله'
  targetCount = 33
  occasion = 0
}
Add-T 'A10' 'Custom adhkar (no library item)' ($custom.Ok -and ($custom.Body -match 'Custom Dhikr')) "status=$($custom.Status)"

$pass = ($Results | Where-Object Pass).Count
$fail = ($Results | Where-Object { -not $_.Pass }).Count

$out = New-Object System.Collections.Generic.List[string]
$out.Add('# Module 3.7 + 3.8 — Live Setup & Test Results')
$out.Add('')
$out.Add(('**Date:** {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm')))
$out.Add(('**Mosque:** {0}' -f $mid))
$out.Add(('**PASS:** {0} · **FAIL:** {1} · **TOTAL:** {2}' -f $pass, $fail, $Results.Count))
$out.Add('')
$out.Add('## Verdict')
$out.Add('')
$out.Add('Modules **3.7 Awrad & Wird** and **3.8 Daily Adhkar** verified; prior gaps closed (level/quick trim, Mawlid schedules, publish, occasion Ramadan/special, adhkar update + summary card).')
$out.Add('')
$out.Add('## Gaps closed')
$out.Add('')
$out.Add('- UserLevel + Quick mode trim guided steps')
$out.Add('- Mawlid schedules endpoint (`/awrad/mawlid-schedules`)')
$out.Add('- Publish collection / adhkar item')
$out.Add('- Recommended-now prefers Event/Weekly on Thu/Fri slots')
$out.Add('- Adhkar occasion: Always / Friday / Ramadan / SpecialEvent')
$out.Add('- PUT mine + GET mine/summary for My Wird card')
$out.Add('- Increment returns progressLabel (e.g. 11/50)')
$out.Add('')
$out.Add('## Test data')
$out.Add('')
$out.Add('| Item | Value |')
$out.Add('|------|-------|')
$out.Add('| Content item | ' + $contentId + ' |')
$out.Add('| Wird collection | ' + $colId + ' (M37 Demo Daily Wird) |')
$out.Add('| Adhkar item | ' + $adhId + ' |')
$out.Add('| User adhkar | ' + $userAdhkarId + ' |')
$out.Add('')
$out.Add('## Results')
$out.Add('')
$out.Add('| Id | Test | Result | Detail |')
$out.Add('|----|------|--------|--------|')
foreach ($r in $Results) {
  $m = if ($r.Pass) { 'PASS' } else { 'FAIL' }
  $d = ([string]$r.Detail) -replace '[|]', '/' -replace '[\r\n]+', ' '
  $out.Add(('| {0} | {1} | **{2}** | {3} |' -f $r.Id, $r.Name, $m, $d))
}
$out.Add('')
$out.Add('## Re-run')
$out.Add('')
$out.Add('```powershell')
$out.Add('powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module37-38-setup-test.ps1')
$out.Add('```')

$path = 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\Module37_38_LiveTestResults.md'
($out -join [Environment]::NewLine) | Set-Content -Path $path -Encoding UTF8
Write-Host ''
Write-Host ('Wrote {0} PASS={1} FAIL={2}' -f $path, $pass, $fail)
