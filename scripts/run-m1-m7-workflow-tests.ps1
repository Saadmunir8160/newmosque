# MosqueOS M1-M7 workflow tests (follows Docs/ModuleMilestones_RoleWise.md + Module31_Module32_TestPack.md)
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:5000/api/v1'
$Results = New-Object System.Collections.Generic.List[object]
$Slug = "wf-test-mosque-$(Get-Date -Format 'yyyyMMddHHmmss')"
$Today = (Get-Date).ToString('yyyy-MM-dd')
$To7 = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')

function Add-Result($m, $id, $name, $pass, $detail) {
  $Results.Add([pscustomobject]@{ Milestone=$m; Id=$id; Name=$name; Pass=$pass; Detail=$detail })
  $mark = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host "[$mark] $m $id - $name :: $detail"
}

function Short($s, $n=120) {
  if ([string]::IsNullOrEmpty($s)) { return '' }
  return $s.Substring(0, [Math]::Min($n, $s.Length))
}

function Login($user, $pass) {
  $body = @{ username = $user; password = $pass; rememberMe = $false } | ConvertTo-Json
  try {
    $r = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body $body -ContentType 'application/json'
    return $r.token
  } catch {
    return $null
  }
}

function Api($method, $path, $token, $bodyObj = $null, $expectStatus = $null) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $params = @{ Uri = "$Base$path"; Method = $method; Headers = $headers }
  if ($null -ne $bodyObj) {
    $params['Body'] = ($bodyObj | ConvertTo-Json -Depth 8)
    $params['ContentType'] = 'application/json'
  }
  try {
    $resp = Invoke-WebRequest @params -UseBasicParsing
    return @{ Ok = $true; Status = [int]$resp.StatusCode; Body = "$(if ($resp.Content) {$resp.Content} else {''})"; Json = $(try { $resp.Content | ConvertFrom-Json } catch { $null }) }
  } catch {
    $status = 0
    $raw = "$($_.ErrorDetails.Message)"
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    return @{ Ok = $false; Status = $status; Body = $raw; Json = $(try { $raw | ConvertFrom-Json } catch { $null }) }
  }
}

# ---------- Logins ----------
$tokAdmin = Login 'admin' 'Admin@123'
$tokOwner = Login 'owner' 'Owner@123'
$tokMosqueAdmin = Login 'mosqueadmin' 'Admin@123'
$tokPE = Login 'prayereditor' 'Prayer@123'
$tokTeacher = Login 'teacher' 'Teacher@123'
$tokParent = Login 'parent' 'Parent@123'
$tokMuqaddam = Login 'muqaddam' 'Muqaddam@123'
$tokContent = Login 'editor' 'Editor@123'
$tokMember = Login 'member' 'Member@123'

Add-Result 'SETUP' 'AUTH' 'Login all demo roles' ($tokAdmin -and $tokOwner -and $tokMosqueAdmin -and $tokPE -and $tokTeacher -and $tokParent -and $tokMuqaddam -and $tokMember) "admin=$([bool]$tokAdmin); owner=$([bool]$tokOwner); ma=$([bool]$tokMosqueAdmin); pe=$([bool]$tokPE); teacher=$([bool]$tokTeacher); parent=$([bool]$tokParent); muq=$([bool]$tokMuqaddam); content=$([bool]$tokContent); member=$([bool]$tokMember)"

# Resolve demo mosque id (Masjid Al-Noor / first Active)
$mosques = Api GET '/mosques?adminList=true' $tokAdmin
$demoMosque = $null
if ($mosques.Json) {
  $list = if ($mosques.Json.items) { $mosques.Json.items } elseif ($mosques.Json -is [array]) { $mosques.Json } else { @() }
  $demoMosque = $list | Where-Object { $_.slug -match 'al-noor|bradford' -or $_.name -match 'Al-Noor' } | Select-Object -First 1
  if (-not $demoMosque) { $demoMosque = $list | Where-Object { $_.status -eq 'Active' -or $_.status -eq 2 } | Select-Object -First 1 }
  if (-not $demoMosque -and $list.Count) { $demoMosque = $list[0] }
}
$mid = if ($demoMosque) { [int]$demoMosque.id } else { 0 }
Add-Result 'SETUP' 'MOSQUE' 'Resolve Active demo mosque' ($mid -gt 0) "id=$mid name=$($demoMosque.name) slug=$($demoMosque.slug) status=$($demoMosque.status)"

# ===================== M1 Super Admin =====================
$dash = Api GET '/platform/dashboard' $tokAdmin
Add-Result 'M1' 'M1-1' 'Platform dashboard loads' ($dash.Ok -and $dash.Status -eq 200) "status=$($dash.Status)"

$users = Api GET '/platform/users' $tokAdmin
Add-Result 'M1' 'M1-2' 'Users list (User Management)' ($users.Ok) "status=$($users.Status)"

$features = Api GET "/mosques/$mid/settings" $tokAdmin
Add-Result 'M1' 'M1-3' 'Feature/module flags readable' ($features.Ok) "status=$($features.Status)"

# Seed Unclaimed (TEST 1) — email empty
$seedBody = @{
  name = 'WF Test Mosque'
  slug = $Slug
  city = 'Bradford'
  address = '12 High Street'
  postcode = 'BD1 1AA'
  phone = '01274123456'
  website = 'https://example.org'
  description = 'M1-M7 workflow test listing Module 3.1'
  timezone = 'Europe/London'
}
$seed = Api POST '/platform/mosques/seed' $tokAdmin $seedBody
$seedId = 0
$seedStatus = ''
if ($seed.Json) { $seedId = [int]$seed.Json.id; $seedStatus = "$($seed.Json.status)" }
Add-Result 'M1' 'M1-4' 'Seed Unclaimed mosque (email empty)' ($seed.Ok -and $seedId -gt 0 -and ($seedStatus -match 'Unclaimed|0')) "id=$seedId status=$seedStatus slug=$Slug http=$($seed.Status) body=$($seed.Body.Substring(0,[Math]::Min(120,$seed.Body.Length)))"

# Public profile Unclaimed (TEST 2)
$pub1 = Api GET "/mosques/$Slug" $null
Add-Result 'M1' 'M1-5' 'Public Unclaimed profile visible' ($pub1.Ok) "status=$($pub1.Status)"

# Claim (TEST 3) — mosqueadmin
$claim = Api POST '/mosque-claims' $tokMosqueAdmin @{
  mosqueId = $seedId
  role = 'Imam'
  phone = '07123456789'
  notes = 'Module 3.1 claim test M1 workflow'
  fullName = 'Mosque Admin'
}
Add-Result 'M1' 'M1-6' 'Submit ownership claim' ($claim.Ok -or $claim.Status -eq 200 -or $claim.Status -eq 201) "status=$($claim.Status) body=$($claim.Body.Substring(0,[Math]::Min(160,$claim.Body.Length)))"

# Public hidden ClaimPending (TEST 4)
$pub2 = Api GET "/mosques/$Slug" $null
$pubHiddenPass = (-not $pub2.Ok) -or $pub2.Status -in 404,403,410
Add-Result 'M1' 'M1-7' 'Public hidden after claim (ClaimPending)' $pubHiddenPass "status=$($pub2.Status)"

# Approve claim (TEST 5)
$claimsList = Api GET '/admin/claims?filter=pending' $tokAdmin
if (-not $claimsList.Ok) { $claimsList = Api GET '/admin/claims' $tokAdmin }
$claimId = 0
if ($claimsList.Json) {
  $items = if ($claimsList.Json.items) { $claimsList.Json.items } elseif ($claimsList.Json -is [array]) { $claimsList.Json } else { @($claimsList.Json) }
  $match = $items | Where-Object { $_.mosqueId -eq $seedId -or $_.mosqueName -match 'WF Test' } | Select-Object -First 1
  if ($match) { $claimId = [int]$(if ($match.id) { $match.id } else { $match.claimId }) }
}
$approve = if ($claimId -gt 0) { Api POST "/admin/claims/$claimId/approve" $tokAdmin @{} } else { @{ Ok=$false; Status=0; Body='no claim id' } }
Add-Result 'M1' 'M1-8' 'Approve claim -> Claimed' ($approve.Ok) "claimId=$claimId status=$($approve.Status) $($approve.Body.Substring(0,[Math]::Min(100,$approve.Body.Length)))"

# Activate (TEST 6)
$act = Api POST "/platform/mosques/$seedId/activate" $tokAdmin @{}
Add-Result 'M1' 'M1-9' 'Activate mosque -> Active' ($act.Ok) "status=$($act.Status)"

# Public Active (TEST 7)
$pub3 = Api GET "/mosques/$Slug" $null
Add-Result 'M1' 'M1-10' 'Public Active profile' ($pub3.Ok -and ($pub3.Json.status -match 'Active|2')) "status=$($pub3.Status) mosqueStatus=$($pub3.Json.status)"

# ===================== M2 Owner / Admin ops =====================
$flagTry = Api PUT "/mosques/$mid/settings/Events?enabled=true" $tokOwner $null
Add-Result 'M2' 'M2-1' 'Owner can update module flags' ($flagTry.Ok) "putSettings=$($flagTry.Status) detail=$($flagTry.Body.Substring(0,[Math]::Min(100,$flagTry.Body.Length)))"

$annCreate = Api POST "/mosques/$mid/announcements" $tokMosqueAdmin @{
  title = 'WF Announcement'
  summary = 'M2 workflow'
  body = 'Announcement body for M2 test'
  status = 'Draft'
  isFeatured = $false
}
Add-Result 'M2' 'M2-2' 'Mosque Admin create announcement' ($annCreate.Ok) "status=$($annCreate.Status)"

$evtCreate = Api POST "/mosques/$mid/events" $tokOwner @{
  title = 'WF Event'
  description = 'M2 event'
  date = $Today
  time = '19:00:00'
  eventType = 'General'
  status = 'Draft'
}
Add-Result 'M2' 'M2-3' 'Owner create event' ($evtCreate.Ok) "status=$($evtCreate.Status) $($evtCreate.Body.Substring(0,[Math]::Min(120,$evtCreate.Body.Length)))"

$tplAdmin = Api GET "/mosques/$mid/prayer-times/jamaah-templates" $tokMosqueAdmin
Add-Result 'M2' 'M2-4' 'Admin can list jamaah templates' ($tplAdmin.Ok) "status=$($tplAdmin.Status)"

$tplOwner = Api GET "/mosques/$mid/prayer-times/jamaah-templates" $tokOwner
Add-Result 'M2' 'M2-5' 'Owner can list jamaah templates' ($tplOwner.Ok) "status=$($tplOwner.Status)"

# ===================== M3 Prayer Editor =====================
$dailyGet = Api GET "/mosques/$mid/prayer-times/daily?date=$Today" $tokPE
Add-Result 'M3' 'M3-1' 'Editor GET daily' ($dailyGet.Ok -or $dailyGet.Status -eq 200 -or $dailyGet.Status -eq 404) "status=$($dailyGet.Status)"

$dailyPut = Api PUT "/mosques/$mid/prayer-times/daily?publish=true" $tokPE @{
  date = $Today
  fajrStart = '05:30:00'
  fajrJamaat = '05:45:00'
  dhuhrStart = '12:30:00'
  dhuhrJamaat = '13:00:00'
  asrStart = '15:30:00'
  asrJamaat = '16:00:00'
  maghribStart = '18:00:00'
  maghribJamaat = '18:10:00'
  ishaStart = '19:30:00'
  ishaJamaat = '20:00:00'
}
Add-Result 'M3' 'M3-2' 'Editor save daily times (PT-A)' ($dailyPut.Ok) "status=$($dailyPut.Status) $($dailyPut.Body.Substring(0,[Math]::Min(140,$dailyPut.Body.Length)))"

$pubDaily = Api GET "/public/mosques/$mid/prayer-times/daily?date=$Today" $null
Add-Result 'M3' 'M3-3' 'Public daily timetable readable' ($pubDaily.Ok -or $pubDaily.Status -eq 200) "status=$($pubDaily.Status)"

$jumuah = Api POST "/mosques/$mid/prayer-times/jumuah" $tokPE @{
  slotNumber = 1
  khutbahTime = '12:45:00'
  jamaatTime = '13:15:00'
}
Add-Result 'M3' 'M3-4' 'Editor create Jumuah slot (PT-B)' ($jumuah.Ok) "status=$($jumuah.Status) $($jumuah.Body.Substring(0,[Math]::Min(120,$jumuah.Body.Length)))"

$exc = Api POST "/mosques/$mid/prayer-times/exceptions" $tokPE @{
  date = $Today
  prayer = 'Maghrib'
  overrideValue = '18:25:00'
  reason = 'Module 3.2 exception test'
}
Add-Result 'M3' 'M3-5' 'Editor create exception (PT-C)' ($exc.Ok) "status=$($exc.Status) $($exc.Body.Substring(0,[Math]::Min(120,$exc.Body.Length)))"

$tplPE = Api GET "/mosques/$mid/prayer-times/jamaah-templates" $tokPE
Add-Result 'M3' 'M3-6' 'Editor DENIED templates list (403)' ($tplPE.Status -eq 403) "status=$($tplPE.Status) (expect 403)"

$tplCreatePE = Api POST "/mosques/$mid/prayer-times/jamaah-templates" $tokPE @{
  name = 'Winter Timetable PE'
  isActive = $true
  daysOfWeek = @(0,1,2,3,4,5,6)
  prayers = @(
    @{ prayerName='Fajr'; startTime='06:00:00'; jamaatTime='06:15:00'; sortOrder=1 }
  )
}
Add-Result 'M3' 'M3-7' 'Editor DENIED template create (403)' ($tplCreatePE.Status -eq 403) "status=$($tplCreatePE.Status)"

$tplCreateAdmin = Api POST "/mosques/$mid/prayer-times/jamaah-templates" $tokMosqueAdmin @{
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
$tid = 0
if ($tplCreateAdmin.Json) {
  $tid = [int]$(if ($tplCreateAdmin.Json.template.id) { $tplCreateAdmin.Json.template.id } elseif ($tplCreateAdmin.Json.id) { $tplCreateAdmin.Json.id } else { 0 })
}
Add-Result 'M3' 'M3-8' 'Admin create jamaah template (PT-D)' ($tplCreateAdmin.Ok -and $tid -gt 0) "tid=$tid status=$($tplCreateAdmin.Status) $($tplCreateAdmin.Body.Substring(0,[Math]::Min(140,$tplCreateAdmin.Body.Length)))"

$gen = if ($tid -gt 0) {
  Api POST "/mosques/$mid/prayer-times/jamaah-templates/$tid/generate" $tokMosqueAdmin @{
    from = $Today; to = $To7; overwritePublished = $false; publish = $true; preview = $false
  }
} else { @{ Ok=$false; Status=0; Body='no template' } }
Add-Result 'M3' 'M3-9' 'Admin generate from template (PT-D)' ($gen.Ok) "status=$($gen.Status) $($gen.Body.Substring(0,[Math]::Min(140,$gen.Body.Length)))"

$audit = Api GET "/mosques/$mid/prayer-times/audit?take=20" $tokPE
Add-Result 'M3' 'M3-10' 'Editor can read audit log' ($audit.Ok) "status=$($audit.Status)"

# ===================== M4 Teacher + Parent =====================
$classes = Api GET "/teacher/classes?mosqueId=$mid" $tokTeacher
if (-not $classes.Ok) { $classes = Api GET "/madrassah/classes?mosqueId=$mid" $tokTeacher }
Add-Result 'M4' 'M4-1' 'Teacher list classes' ($classes.Ok) "status=$($classes.Status)"

$students = Api GET "/madrassah/students?mosqueId=$mid" $tokMosqueAdmin
$sid = 1
if ($students.Json) {
  $slist = if ($students.Json -is [array]) { $students.Json } else { @($students.Json) }
  if ($slist.Count -gt 0) { $sid = [int]$slist[0].id }
}

$feeTeacher = Api POST "/madrassah/students/$sid/fees" $tokTeacher @{
  amount = 10; dueDate = $Today; status = 'Unpaid'
}
Add-Result 'M4' 'M4-2' 'Teacher DENIED fee create (403)' ($feeTeacher.Status -eq 403) "status=$($feeTeacher.Status)"

$feeAdmin = Api POST "/madrassah/students/$sid/fees" $tokMosqueAdmin @{
  amount = 25; dueDate = $Today; status = 'Unpaid'
}
Add-Result 'M4' 'M4-3' 'Admin can create fee' ($feeAdmin.Ok -or $feeAdmin.Status -in 200,201) "status=$($feeAdmin.Status) $($feeAdmin.Body.Substring(0,[Math]::Min(100,$feeAdmin.Body.Length)))"

$part = Api GET "/mosques/$mid/participation" $tokTeacher
$oid = 0
if ($part.Json) {
  $plist = if ($part.Json -is [array]) { $part.Json } else { @($part.Json) }
  if ($plist.Count -gt 0) { $oid = [int]$plist[0].id }
}
if ($oid -eq 0) {
  Api PUT "/mosques/$mid/settings/Participation?enabled=true" $tokAdmin $null | Out-Null
  $createPart = Api POST "/mosques/$mid/participation" $tokMosqueAdmin @{
    title = 'WF Volunteer'; type = 'Volunteering'; description = 'M4 test'; isActive = $true; date = $Today
  }
  if ($createPart.Json.id) { $oid = [int]$createPart.Json.id }
}
$regsT = if ($oid -gt 0) { Api GET "/mosques/$mid/participation/$oid/registrations" $tokTeacher } else { @{ Ok=$false; Status=0; Body='no opp' } }
Add-Result 'M4' 'M4-4' 'Teacher can read participation registrations' ($regsT.Ok) "oid=$oid status=$($regsT.Status)"

$children = Api GET '/madrassah/my-children' $tokParent
Add-Result 'M4' 'M4-5' 'Parent my-children portal' ($children.Ok) "status=$($children.Status) $($children.Body.Substring(0,[Math]::Min(100,$children.Body.Length)))"

# ===================== M5 Muqaddam + Content =====================
$awradMuq = Api GET '/awrad/collections' $tokMuqaddam
if (-not $awradMuq.Ok) { $awradMuq = Api GET '/content-editor/awrad/collections' $tokMuqaddam }
Add-Result 'M5' 'M5-1' 'Muqaddam can access awrad collections' ($awradMuq.Ok) "status=$($awradMuq.Status)"

$awradCreate = Api POST '/awrad/collections' $tokMuqaddam @{
  name = 'WF Wird Collection'
  tariqa = 'General'
  type = 'Daily'
  recommendedTime = 'AfterFajr'
}
if (-not $awradCreate.Ok) {
  $awradCreate = Api POST '/content-editor/awrad/collections' $tokMuqaddam @{
    name = 'WF Wird Collection'; tariqa = 'General'; type = 'Daily'
  }
}
Add-Result 'M5' 'M5-2' 'Muqaddam can create awrad collection' ($awradCreate.Ok) "status=$($awradCreate.Status) $($awradCreate.Body.Substring(0,[Math]::Min(120,$awradCreate.Body.Length)))"

$murids = Api GET "/muqaddam/murids?mosqueId=$mid" $tokMuqaddam
Add-Result 'M5' 'M5-3' 'Muqaddam murid list' ($murids.Ok) "status=$($murids.Status)"

if ($tokContent) {
  $duas = Api GET '/content-editor/duas' $tokContent
  if (-not $duas.Ok) { $duas = Api GET '/duas' $tokContent }
  Add-Result 'M5' 'M5-4' 'Content Editor duas library' ($duas.Ok) "status=$($duas.Status)"
} else {
  Add-Result 'M5' 'M5-4' 'Content Editor login' $false 'contenteditor user login failed — check seeder username'
}

# ===================== M6 Member + Guest + community posts =====================
$wird = Api GET '/awrad/my-schedule' $tokMember
Add-Result 'M6' 'M6-1' 'Member my wird schedule' ($wird.Ok -or $wird.Status -eq 200 -or $wird.Status -eq 404) "status=$($wird.Status)"

$adhkar = Api GET '/adhkar/mine' $tokMember
Add-Result 'M6' 'M6-2' 'Member my adhkar' ($adhkar.Ok -or $adhkar.Status -eq 200) "status=$($adhkar.Status)"

$quran = Api GET '/quran/my-plan' $tokMember
if (-not $quran.Ok) { $quran = Api GET '/quran/plan' $tokMember }
Add-Result 'M6' 'M6-3' 'Member quran plan' ($quran.Ok -or $quran.Status -in 200,404) "status=$($quran.Status)"

$comms = Api GET "/communities?mosqueId=$mid" $null
$cid = 0
if ($comms.Json) {
  $clist = if ($comms.Json -is [array]) { $comms.Json } else { @($comms.Json) }
  if ($clist.Count -gt 0) { $cid = [int]$clist[0].id }
}
Add-Result 'M6' 'M6-4' 'Guest can list public communities' ($comms.Ok) "status=$($comms.Status) cid=$cid"

$postMember = if ($cid -gt 0) {
  Api POST "/communities/$cid/posts" $tokMember @{ content = 'Member should not post' }
} else { @{ Ok=$false; Status=0; Body='no community' } }
Add-Result 'M6' 'M6-5' 'Member DENIED community post (403)' ($postMember.Status -eq 403) "status=$($postMember.Status)"

$postMuq = if ($cid -gt 0) {
  Api POST "/communities/$cid/posts" $tokMuqaddam @{ content = 'Muqaddam feed post WF' }
} else { @{ Ok=$false; Status=0; Body='no community' } }
Add-Result 'M6' 'M6-6' 'Muqaddam can create community post' ($postMuq.Ok) "status=$($postMuq.Status)"

$janaza = Api GET "/mosques/$mid/janaza" $null
Add-Result 'M6' 'M6-7' 'Guest public janaza list' ($janaza.Ok -or $janaza.Status -in 200,404) "status=$($janaza.Status)"

$ritual = Api GET '/ritual-guides' $null
Add-Result 'M6' 'M6-8' 'Guest ritual guides' ($ritual.Ok) "status=$($ritual.Status)"

$journey = Api GET '/journey-guides' $null
Add-Result 'M6' 'M6-9' 'Guest journey guides (Umrah/Hajj)' ($journey.Ok) "status=$($journey.Status)"

# ===================== M7 Hardening checks =====================
# Feature flag gate: disable Participation and call API
$partOff = Api PUT "/mosques/$mid/settings/Participation?enabled=false" $tokAdmin $null
$partAfter = Api GET "/mosques/$mid/participation" $tokMember
$gated = ($partAfter.Status -in 403,404) -or (-not $partAfter.Ok)
Add-Result 'M7' 'M7-1' 'Module flag OFF gates Participation API' $gated "disableStatus=$($partOff.Status) getStatus=$($partAfter.Status) (expect forbid when OFF)"

# restore Participation
Api PUT "/mosques/$mid/settings/Participation?enabled=true" $tokAdmin $null | Out-Null

$checklistHint = $true
Add-Result 'M7' 'M7-2' 'ClientDeliveryChecklist exists (doc)' (Test-Path 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\ClientDeliveryChecklist.md') 'Docs/ClientDeliveryChecklist.md'
Add-Result 'M7' 'M7-3' 'Feature-flag gated MENUS (frontend)' $false 'NOT AUTOMATED - manual UI check still TODO per milestone doc'

# ---------- Write report ----------
$passN = ($Results | Where-Object Pass).Count
$failN = ($Results | Where-Object { -not $_.Pass }).Count
$out = @()
$out += '# MosqueOS — M1-M7 Workflow Test Results'
$out += ''
$out += "**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm') (Europe/London context)"
$out += "**API:** http://localhost:5000"
$out += "**Frontend:** http://localhost:4200"
$out += "**Sources:** ``Docs/ModuleMilestones_RoleWise.md``, ``Docs/Module31_Module32_TestPack.md``"
$out += "**Seed slug:** ``$Slug`` (id=$seedId)"
$out += "**Demo mosque id:** $mid"
$out += ''
$out += "## Summary"
$out += ''
$out += "| Result | Count |"
$out += "|--------|-------|"
$out += "| PASS | $passN |"
$out += "| FAIL | $failN |"
$out += "| TOTAL | $($Results.Count) |"
$out += ''
$out += "## Results by milestone"
$out += ''
$out += '| Milestone | Id | Test | Result | Detail |'
$out += '|-----------|----|------|--------|--------|'
foreach ($r in $Results) {
  $mark = if ($r.Pass) { 'PASS' } else { 'FAIL' }
  $detail = ($r.Detail -replace '\|','/' -replace "`r|`n",' ')
  $out += "| $($r.Milestone) | $($r.Id) | $($r.Name) | **$mark** | $detail |"
}
$out += ''
$out += '## Workflow map (document to test)'
$out += ''
$out += '| Doc step | Test ids |'
$out += '|----------|----------|'
$out += '| 3.1 Seed -> Claim -> Approve -> Activate -> Public | M1-4 ... M1-10 |'
$out += '| 3.2 PT-A/B/C + Admin templates PT-D | M3-2 ... M3-9 |'
$out += '| Editor cannot manage templates | M3-6, M3-7 |'
$out += '| Teacher fees denied / Admin fees / Parent portal | M4-2 ... M4-5 |'
$out += '| Muqaddam awrad + community post lock | M5-*, M6-5, M6-6 |'
$out += '| Guest public browse | M6-4, M6-7 ... M6-9 |'
$out += '| Feature flag API gate | M7-1 |'
$out += '| Feature-flag gated menus (UI) | M7-3 FAIL (manual) |'
$out += ''
$out += '## Failed items - next actions'
$out += ''
foreach ($r in ($Results | Where-Object { -not $_.Pass })) {
  $out += "- **$($r.Id) $($r.Name):** $($r.Detail)"
}
$out += ''
$out += '---'
$out += '*Generated by scripts/run-m1-m7-workflow-tests.ps1*'

$path = 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\ModuleMilestones_M1M7_TestResults.md'
$out -join "`n" | Set-Content -Path $path -Encoding UTF8
Write-Host "`nWrote $path  PASS=$passN FAIL=$failN"

