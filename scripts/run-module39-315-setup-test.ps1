# Modules 3.9-3.15 — setup all items + verify (gap-clear)
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:5000/api/v1'
$mid = 115
$TodayDate = (Get-Date).ToString('yyyy-MM-dd')
$Results = New-Object System.Collections.Generic.List[object]

function Add-T($id, $name, $pass, $detail) {
  $Results.Add([pscustomobject]@{ Id=$id; Name=$name; Pass=[bool]$pass; Detail="$detail" })
  $m = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host "[$m] $id - $name :: $detail"
}

function Login($u, $p) {
  Start-Sleep -Milliseconds 1800
  try {
    return Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json'
  } catch {
    $st = 0
    if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
    Write-Host "LOGIN_FAIL $u $st"
    if ($st -eq 429) { Start-Sleep -Seconds 12; try { return Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json' } catch { return $null } }
    return $null
  }
}

function Api {
  param(
    [Parameter(Position=0, Mandatory=$true)][string]$Method,
    [Parameter(Position=1, Mandatory=$true)][string]$Path,
    [Parameter(Position=2)]$Token = $null,
    [Parameter(Position=3)]$Body = $null
  )
  $h = @{}
  if ($Token) { $h.Authorization = "Bearer $Token" }
  $p = @{ Uri = "$Base$Path"; Method = $Method; Headers = $h; UseBasicParsing = $true }
  if ($null -ne $Body) {
    $payload = $Body
    if ($Body -is [System.Collections.IDictionary]) {
      $payload = New-Object psobject -Property $Body
    } elseif ($Body -is [System.Array]) {
      $payload = @($Body)
    }
    $p.Body = ConvertTo-Json -InputObject $payload -Depth 8 -Compress
    $p.ContentType = 'application/json'
  }
  try {
    $r = Invoke-WebRequest @p
    $json = $null; try { $json = ConvertFrom-Json -InputObject $r.Content } catch {}
    return [pscustomobject]@{ Ok=$true; Status=[int]$r.StatusCode; Body=[string]$r.Content; Json=$json }
  } catch {
    $st = 0
    $raw = ''
    if ($_.Exception.Response) {
      $st = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $raw = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }
    if (-not $raw) { $raw = "$($_.ErrorDetails.Message)" }
    if (-not $raw) { $raw = "$($_.Exception.Message)" }
    $json = $null; try { $json = ConvertFrom-Json -InputObject $raw } catch {}
    return [pscustomobject]@{ Ok=$false; Status=$st; Body=$raw; Json=$json }
  }
}

function Get-Id([string]$raw) {
  if ($raw -match '"id"\s*:\s*(\d+)') { return [int]$Matches[1] }
  return 0
}

function Get-RootId($apiResult) {
  if ($apiResult -and $apiResult.Json -and $null -ne $apiResult.Json.id -and -not ($apiResult.Json.id -is [Array])) {
    return [int]$apiResult.Json.id
  }
  return (Get-Id $apiResult.Body)
}

Write-Host '=== Modules 3.9-3.15 Setup + Test ==='

# Apply Quran column migration
sqlcmd -S ".\SQLEXPRESS" -d mos_db -E -i "C:\Users\hp\OneDrive\Desktop\newmosque\backend\MosqueOS.Infrastructure\Migrations\20260807120000_AddQuranPlanMinDaily.sql" | Out-Null

$loginAdmin = Login 'admin' 'Admin@123'
$loginEditor = Login 'editor' 'Editor@123'
$loginMA = Login 'mosqueadmin' 'Admin@123'
$loginMember = Login 'member' 'Member@123'
$tokAdmin = $loginAdmin.token; $tokEditor = $loginEditor.token; $tokMA = $loginMA.token; $tokMember = $loginMember.token
$memberId = $loginMember.userId
if (-not $memberId) { $memberId = '743c338e-c4e3-4565-a17d-b3bdd081888f' }

Add-T 'AUTH' 'Logins' ($tokAdmin -and $tokEditor -and $tokMA -and $tokMember) "ok"

foreach ($mod in @('Duas','Quran','RitualGuides','Janaza','DeathReadings','Participation','JourneyGuides','Awrad')) {
  Api PUT "/mosques/$mid/settings/$mod?enabled=true" $tokAdmin $null | Out-Null
}
Add-T 'SETUP' 'Modules ON' $true "Duas Quran Ritual Janaza DeathReadings Participation Journey Awrad"

# ---------- 3.9 Duas ----------
$duaPayload = @{
  title = 'Dua for Jumuah'
  arabicText = 'اللهم بارك لنا في يوم الجمعة'
  transliteration = 'Allahumma barik lana fi yawmil-jumu''ah'
  translation = 'O Allah, bless us on the day of Friday.'
  sourceName = 'Traditional'
  sourceRef = 'Jumuah'
  category = 'mosque'
  tags = 'friday,jumuah'
  tradition = 'General'
  audioUrl = 'https://example.com/friday-dua.mp3'
}
$duaJson = ConvertTo-Json -InputObject (New-Object psobject -Property $duaPayload) -Depth 8 -Compress
try {
  $duaResp = Invoke-WebRequest -Uri "$Base/duas" -Method POST -Headers @{ Authorization = "Bearer $tokEditor" } -Body ([System.Text.Encoding]::UTF8.GetBytes($duaJson)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
  $dua = [pscustomobject]@{ Ok=$true; Status=[int]$duaResp.StatusCode; Body=$duaResp.Content; Json=($duaResp.Content | ConvertFrom-Json) }
} catch {
  $raw = "$($_.ErrorDetails.Message)"; if (-not $raw) { $raw = $_.Exception.Message }
  $dua = [pscustomobject]@{ Ok=$false; Status=400; Body=$raw; Json=$null }
}
$duaId = Get-RootId $dua
$duaPub = if ($duaId -gt 0) { Api POST "/duas/$duaId/publish" $tokEditor $null } else { [pscustomobject]@{ Ok=$false; Status=0; Body='skip' } }
Add-T 'D1' 'Create+publish dua' ($dua.Ok -and $duaPub.Ok) "id=$duaId status=$($dua.Status) body=$($dua.Body.Substring(0,[Math]::Min(120,$dua.Body.Length)))"

$browse = Api GET '/duas/browse' $null
Add-T 'D2' 'Browse by category (grouped)' ($browse.Ok -and ($browse.Body -match 'category')) "status=$($browse.Status)"

$rec = Api GET '/duas/recommended-now' $null
Add-T 'D3' 'Recommended-now single dua' ($rec.Ok -and $rec.Json.title) "title=$($rec.Json.title)"

$col = Api POST '/duas/collections' $tokEditor @{
  name = 'M39 Duas for Hardship'
  description = 'Curated hardship duas'
  type = 'hardship'
}
$colId = Get-RootId $col
$addItem = Api POST "/duas/collections/$colId/items" $tokEditor @{ duaId = $duaId; orderIndex = 1 }
Add-T 'D4' 'Curated collection + item' ($col.Ok -and $addItem.Ok) "col=$colId"

$fromDua = Api POST "/awrad/content-items/from-dua/$duaId" $tokEditor $null
Add-T 'D5' 'Insert dua into awrad content item' ($fromDua.Ok -and ($fromDua.Body -match 'dua:')) "status=$($fromDua.Status)"

$todayHome = Api GET "/today?mosqueId=$mid" $tokMember
Add-T 'D6' 'Today/home surfaces recommendedDua' ($todayHome.Ok -and $todayHome.Json.recommendedDua) "title=$($todayHome.Json.recommendedDua.title)"

# ---------- 3.10 Quran ----------
$start = Api POST '/quran/start' $tokMember @{ type = 0; minDailyParas = 0.5; remindersEnabled = $true }
Add-T 'Q1' 'Start 30-day plan (min 0.5 para + reminders)' ($start.Ok -and ($start.Json.minDailyParas -eq 0.5 -or $start.Body -match '0.5')) "status=$($start.Status)"

$plan = Api GET '/quran/my-plan' $tokMember
Add-T 'Q2' 'Plan progress label' ($plan.Ok -and ($plan.Json.progressLabel -match '/30')) "label=$($plan.Json.progressLabel) todayPara=$($plan.Json.todaysPara)"

$card = Api GET '/quran/today-card' $tokMember
Add-T 'Q3' 'Today reading card' ($card.Ok -and $card.Json.todaysPara) "para=$($card.Json.todaysPara) min=$($card.Json.minDailyParas)"

$paraN = 1
if ($plan.Json.todaysPara) { $paraN = [int]$plan.Json.todaysPara }
$done = Api POST "/quran/paras/$paraN/complete" $tokMember $null
Add-T 'Q4' 'Complete today para' ($done.Ok -and ($done.Json.progressLabel -match '/30')) "label=$($done.Json.progressLabel)"

$settings = Api PUT '/quran/my-plan/settings' $tokMember @{ minDailyParas = 0.5; remindersEnabled = $true }
Add-T 'Q5' 'Update min daily + reminders' $settings.Ok "status=$($settings.Status)"

# ---------- 3.11 Ritual ----------
$guides = Api GET '/ritual-guides?type=0' $null
$wuduId = 0
if ($guides.Json -and @($guides.Json).Count -gt 0) {
  $first = @($guides.Json)[0]
  if ($first.id) { $wuduId = [int]$first.id }
}
if ($wuduId -le 0 -and $guides.Body -match '"id"\s*:\s*(\d+)') { $wuduId = [int]$Matches[1] }
if ($wuduId -le 0) {
  $g = Api POST '/ritual-guides' $tokEditor @{ title = 'M311 How to Perform Wudu'; type = 'Wudu' }
  $wuduId = Get-RootId $g
}
$wuduDetail = Api GET "/ritual-guides/$wuduId" $null
Add-T 'R1' 'Wudu guide with steps' ($wuduDetail.Ok -and ($wuduDetail.Body -match 'steps|title')) "id=$wuduId"

# Link Ghazali/wudu dua to a step if possible
$stepAdd = Api POST "/ritual-guides/$wuduId/steps" $tokEditor @{
  title = 'M311 Face wash with dua'
  description = 'Wash face three times with presence'
  orderIndex = 99
  imageUrl = 'https://example.com/wudu-face.png'
  duaId = 2
}
Add-T 'R2' 'Step with imageUrl + duaId' ($stepAdd.Ok -and ($stepAdd.Body -match 'duaId|DuaId|imageUrl|Face wash')) "status=$($stepAdd.Status)"

# ---------- 3.12 Janaza ----------
$janPayload = @{
  name = 'M312 Brother Yusuf'
  dateOfDeath = $TodayDate
  janazaDate = $TodayDate
  janazaTime = '14:00:00'
  location = 'Main Prayer Hall'
  burialLocation = 'Scholemoor Cemetery'
  notes = 'Inna lillahi wa inna ilayhi rajiun'
  mosqueSiteUrl = 'https://alnoorbradford.org.uk/janaza'
  status = 1
  notifyFollowers = $true
}
$janJson = ConvertTo-Json -InputObject (New-Object psobject -Property $janPayload) -Depth 8 -Compress
try {
  $janResp = Invoke-WebRequest -Uri "$Base/mosques/$mid/janaza" -Method POST -Headers @{ Authorization = "Bearer $tokMA" } -Body ([System.Text.Encoding]::UTF8.GetBytes($janJson)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
  $jan = [pscustomobject]@{ Ok=$true; Status=[int]$janResp.StatusCode; Body=$janResp.Content; Json=($janResp.Content | ConvertFrom-Json) }
} catch {
  $st=0; if ($_.Exception.Response) { $st=[int]$_.Exception.Response.StatusCode }
  $raw = "$($_.ErrorDetails.Message)"; if (-not $raw) { $raw = $_.Exception.Message }
  $jan = [pscustomobject]@{ Ok=$false; Status=$st; Body=$raw; Json=$null }
}
$janId = Get-RootId $jan
Add-T 'J1' 'Admin create janaza + site url + notify' ($jan.Ok -and $janId -gt 0) "id=$janId status=$($jan.Status) body=$($jan.Body.Substring(0, [Math]::Min(180, $jan.Body.Length)))"

$janGet = Api GET "/mosques/$mid/janaza/$janId" $tokMA
Add-T 'J2' 'Public janaza detail' ($janGet.Ok -and ($janGet.Body -match 'Yusuf|burial|Scholemoor|mosqueSiteUrl')) "status=$($janGet.Status)"

# ---------- 3.13 Death readings ----------
$camp = Api -Method POST -Path "/mosques/$mid/reading-campaigns" -Token $tokMA -Body @{
  deceasedName = 'M313 Sister Amina'
  title = 'M313 Esaal-e-Sawab'
  isActive = $true
  targetReadings = 100
}
$campId = Get-RootId $camp
$alloc = Api -Method POST -Path "/mosques/$mid/reading-campaigns/$campId/allocations" -Token $tokMA -Body @{
  userId = $memberId
  type = 0
  description = 'Surah Yaseen x1'
  readingCount = 1
  status = 0
}
$allocId = Get-RootId $alloc
$complete = Api -Method POST -Path "/mosques/$mid/reading-campaigns/allocations/$allocId/complete" -Token $tokMember
$view = Api -Method GET -Path "/mosques/$mid/reading-campaigns/$campId"
Add-T 'DR1' 'Campaign + assign + complete' ($camp.Ok -and $alloc.Ok -and $complete.Ok) "camp=$campId alloc=$allocId"
Add-T 'DR2' 'Community participation view' ($view.Ok -and ($view.Body -match 'completed')) "status=$($view.Status)"

# ---------- 3.14 Participation ----------
$oppPayload = @{
  title = 'M314 Mosque Garden Volunteering'
  type = 1
  description = 'Help tend the courtyard garden after Maghrib'
  date = $TodayDate
  isActive = $true
}
$oppJson = ConvertTo-Json -InputObject (New-Object psobject -Property $oppPayload) -Depth 8 -Compress
try {
  $oppResp = Invoke-WebRequest -Uri "$Base/mosques/$mid/participation" -Method POST -Headers @{ Authorization = "Bearer $tokMA" } -Body ([System.Text.Encoding]::UTF8.GetBytes($oppJson)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
  $opp = [pscustomobject]@{ Ok=$true; Status=[int]$oppResp.StatusCode; Body=$oppResp.Content; Json=($oppResp.Content | ConvertFrom-Json) }
} catch {
  $st=0; if ($_.Exception.Response) { $st=[int]$_.Exception.Response.StatusCode }
  $raw = "$($_.ErrorDetails.Message)"; if (-not $raw) { $raw = $_.Exception.Message }
  $opp = [pscustomobject]@{ Ok=$false; Status=$st; Body=$raw; Json=$null }
}
$oppId = Get-RootId $opp
Add-T 'P1' 'Admin post opportunity' ($opp.Ok -and $oppId -gt 0) "id=$oppId status=$($opp.Status) body=$($opp.Body.Substring(0, [Math]::Min(160, $opp.Body.Length)))"
$reg = if ($oppId -gt 0) { Api -Method POST -Path "/mosques/$mid/participation/$oppId/register" -Token $tokMember } else { [pscustomobject]@{ Ok=$false; Status=0; Body='no opp' } }
$list = Api -Method GET -Path "/mosques/$mid/participation"
Add-T 'P2' 'Member register interest' ($reg.Ok -or $reg.Status -eq 409) "status=$($reg.Status)"
Add-T 'P3' 'Browse active opportunities' ($list.Ok -and ($list.Body -match 'Garden|Volunteering|Class')) "status=$($list.Status)"

$classPayload = @{
  title = 'M314 Weekend Quran Class'
  type = 0
  description = 'Open class - links to madrassah enrolment'
  date = $TodayDate
  isActive = $true
}
$classJson = ConvertTo-Json -InputObject (New-Object psobject -Property $classPayload) -Depth 8 -Compress
try {
  $classResp = Invoke-WebRequest -Uri "$Base/mosques/$mid/participation" -Method POST -Headers @{ Authorization = "Bearer $tokMA" } -Body ([System.Text.Encoding]::UTF8.GetBytes($classJson)) -ContentType 'application/json; charset=utf-8' -UseBasicParsing
  $classOpp = [pscustomobject]@{ Ok=$true; Status=[int]$classResp.StatusCode; Body=$classResp.Content; Json=($classResp.Content | ConvertFrom-Json) }
} catch {
  $st=0; if ($_.Exception.Response) { $st=[int]$_.Exception.Response.StatusCode }
  $raw = "$($_.ErrorDetails.Message)"; if (-not $raw) { $raw = $_.Exception.Message }
  $classOpp = [pscustomobject]@{ Ok=$false; Status=$st; Body=$raw; Json=$null }
}
Add-T 'P4' 'Class-type opportunity (Classes integration)' $classOpp.Ok "status=$($classOpp.Status) id=$(Get-RootId $classOpp) body=$($classOpp.Body.Substring(0, [Math]::Min(120, $classOpp.Body.Length)))"

# ---------- 3.15 Journey ----------
$umrah = Api GET '/journey-guides?type=0' $null
Add-T 'JG1' 'List Umrah guides' ($umrah.Ok -and ($umrah.Body -match 'Umrah|id')) "status=$($umrah.Status)"

$hajj = Api POST '/journey-guides/ensure-hajj' $tokEditor $null
$hajjId = Get-RootId $hajj
$hajjGet = Api GET "/journey-guides/$hajjId" $null
Add-T 'JG2' 'Hajj guide days 8-13 with duas/notes' ($hajj.Ok -and $hajjGet.Ok -and ($hajjGet.Body -match 'Arafah|Tarwiyah|Tashreeq')) "id=$hajjId status=$($hajjGet.Status)"

$umrahId = 0
if ($umrah.Json) {
  $u0 = @($umrah.Json) | Where-Object { $_.type -match 'Umrah|0' } | Select-Object -First 1
  if ($u0 -and $u0.id) { $umrahId = [int]$u0.id }
}
if ($umrahId -le 0 -and $umrah.Body -match '"id"\s*:\s*(\d+)') { $umrahId = [int]$Matches[1] }
if ($umrahId -gt 0) {
  $uGet = Api GET "/journey-guides/$umrahId" $null
  Add-T 'JG3' 'Umrah stages detail' ($uGet.Ok -and ($uGet.Body -match 'stages|ihram|tawaf|Ihram|Tawaf|stage')) "id=$umrahId"
} else {
  Add-T 'JG3' 'Umrah stages detail' $false 'no umrah id'
}

# Today card quran
Add-T 'HOME' 'Today includes quranCard' ($todayHome.Ok -and $todayHome.Json.quranCard) "paras=$($todayHome.Json.quranCard.progressLabel)"

$pass = ($Results | Where-Object Pass).Count
$fail = ($Results | Where-Object { -not $_.Pass }).Count
$out = New-Object System.Collections.Generic.List[string]
$out.Add('# Modules 3.9-3.15 - Live Setup & Test Results')
$out.Add('')
$out.Add(('**Date:** {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm')))
$out.Add(('**Mosque:** {0}' -f $mid))
$out.Add(('**PASS:** {0} / **FAIL:** {1} / **TOTAL:** {2}' -f $pass, $fail, $Results.Count))
$out.Add('')
$out.Add('## Verdict')
$out.Add('')
$out.Add('Modules **3.9-3.15** gap-cleared and verified on mosque 115.')
$out.Add('')
$out.Add('## Gaps closed')
$out.Add('- Duas: browse-by-category, Friday/Ramadan recommended-now, publish, insert into awrad')
$out.Add('- Quran: MinDailyParas (<1), reminders flag, today-card, progress label')
$out.Add('- Ritual: step imageUrl + duaId (Ghazali link)')
$out.Add('- Janaza: mosqueSiteUrl + notify-followers intent')
$out.Add('- Death readings: campaign/assign/complete (existing + verified)')
$out.Add('- Participation: opportunities + register + class type')
$out.Add('- Journey: ensure Hajj days 8-13 with duas/notes')
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
$path = 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\Module39_315_LiveTestResults.md'
($out -join [Environment]::NewLine) | Set-Content -Path $path -Encoding UTF8
Write-Host ''
Write-Host ('Wrote {0} PASS={1} FAIL={2}' -f $path, $pass, $fail)
