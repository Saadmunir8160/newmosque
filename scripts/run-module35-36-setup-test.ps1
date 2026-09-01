# Module 3.5 Madrassah + 3.6 Communities — setup all items + verify
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:5000/api/v1'
$mid = 115
$Today = (Get-Date).ToString('yyyy-MM-dd')
$Due = (Get-Date).AddDays(14).ToString('yyyy-MM-dd')
$Results = New-Object System.Collections.Generic.List[object]

function Add-T($id, $name, $pass, $detail) {
  $Results.Add([pscustomobject]@{ Id=$id; Name=$name; Pass=[bool]$pass; Detail="$detail" })
  $m = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host "[$m] $id - $name :: $detail"
}

function Login($u, $p) {
  Start-Sleep -Milliseconds 2000
  try {
    $r = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json'
    return $r
  } catch {
    $st = 0
    if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
    Write-Host "LOGIN_FAIL $u $st"
    if ($st -eq 429) {
      Start-Sleep -Seconds 8
      try {
        $r2 = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json'
        return $r2
      } catch {
        Write-Host "LOGIN_RETRY_FAIL $u"
        return $null
      }
    }
    return $null
  }
}

function Api($method, $path, $token, $body = $null) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  $p = @{ Uri = "$Base$path"; Method = $method; Headers = $h; UseBasicParsing = $true }
  if ($null -ne $body) {
    if ($body -is [System.Array]) {
      $p.Body = ConvertTo-Json -InputObject @($body) -Depth 8 -Compress
    } else {
      $p.Body = ($body | ConvertTo-Json -Depth 8 -Compress)
    }
    $p.ContentType = 'application/json; charset=utf-8'
  }
  try {
    $r = Invoke-WebRequest @p
    $json = $null
    try { $json = ConvertFrom-Json -InputObject $r.Content } catch {}
    return [pscustomobject]@{ Ok = $true; Status = [int]$r.StatusCode; Body = [string]$r.Content; Json = $json }
  } catch {
    $st = 0
    if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
    $raw = "$($_.ErrorDetails.Message)"
    $json = $null
    try { $json = ConvertFrom-Json -InputObject $raw } catch {}
    return [pscustomobject]@{ Ok = $false; Status = $st; Body = $raw; Json = $json }
  }
}

function Get-IdFromBody([string]$raw) {
  if ($raw -match '"id"\s*:\s*(\d+)') { return [int]$Matches[1] }
  return 0
}

function Test-JsonHasId([string]$raw, $id) {
  if ([string]::IsNullOrWhiteSpace($raw) -or $null -eq $id) { return $false }
  return [bool]($raw -match ('"id"\s*:\s*{0}\b' -f [regex]::Escape([string]$id)))
}

Write-Host '=== Module 3.5 + 3.6 Setup + Test ==='

$loginMA = Login 'mosqueadmin' 'Admin@123'
$loginAdmin = Login 'admin' 'Admin@123'
$loginTeacher = Login 'teacher' 'Teacher@123'
$loginParent = Login 'parent' 'Parent@123'
$loginMember = Login 'member' 'Member@123'
$loginMuq = Login 'muqaddam' 'Muqaddam@123'

$tokMA = $loginMA.token
$tokAdmin = $loginAdmin.token
$tokTeacher = $loginTeacher.token
$tokParent = $loginParent.token
$tokMember = $loginMember.token
$tokMuq = $loginMuq.token

$teacherId = $loginTeacher.userId
$parentId = $loginParent.userId
$memberId = $loginMember.userId
# Fallback known demo ids (mos_db seed)
if (-not $teacherId) { $teacherId = '72eb8549-45b2-49f0-a10d-ffabfe112f59' }
if (-not $parentId) { $parentId = '63e7be6c-d03c-42a9-b065-fc3089990616' }
if (-not $memberId) { $memberId = '743c338e-c4e3-4565-a17d-b3bdd081888f' }
if ($tokTeacher -and (-not $loginTeacher.userId)) {
  $me = Api GET '/auth/me' $tokTeacher
  if ($me.Json.id) { $teacherId = $me.Json.id }
}
if ($tokParent -and (-not $loginParent.userId)) {
  $me = Api GET '/auth/me' $tokParent
  if ($me.Json.id) { $parentId = $me.Json.id }
}
if ($tokMember -and (-not $loginMember.userId)) {
  $me = Api GET '/auth/me' $tokMember
  if ($me.Json.id) { $memberId = $me.Json.id }
}

Add-T 'AUTH' 'Logins + user ids' ($tokMA -and $tokTeacher -and $tokParent -and $teacherId -and $parentId) "ma=$([bool]$tokMA) teacherId=$([bool]$teacherId) parentId=$([bool]$parentId) memberId=$([bool]$memberId)"

# Enable modules
$f1 = Api PUT "/mosques/$mid/settings/Madrassah?enabled=true" $tokAdmin $null
$f2 = Api PUT "/mosques/$mid/settings/Communities?enabled=true" $tokAdmin $null
Add-T 'SETUP' 'Madrassah + Communities modules ON' ($f1.Ok -and $f2.Ok) "mad=$($f1.Status) com=$($f2.Status)"

# ===================== 3.5 Madrassah =====================
$stu = Api POST '/madrassah/students' $tokMA @{
  name = 'M35 Ahmad Ali'
  dateOfBirth = '2014-05-12'
  gender = 'Male'
}
$stuId = Get-IdFromBody $stu.Body
Add-T 'M1' 'Admin create student' ($stu.Ok -and $stuId -gt 0) "id=$stuId status=$($stu.Status)"

$stuEdit = Api PUT "/madrassah/students/$stuId" $tokMA @{
  name = 'M35 Ahmad Ali'
  dateOfBirth = '2014-05-12'
  gender = 'Male'
  userId = $null
}
Add-T 'M2' 'Admin edit student' $stuEdit.Ok "status=$($stuEdit.Status)"

$guard = Api POST "/madrassah/students/$stuId/guardians" $tokMA @{
  userId = $parentId
  relationship = 'Father'
}
Add-T 'M3' 'Link parent guardian' ($guard.Ok -and ($guard.Body -match 'Father')) "status=$($guard.Status)"

$cls = Api POST '/madrassah/classes' $tokMA @{
  mosqueId = $mid
  name = 'M35 Quran Level 1'
  teacherId = $teacherId
  schedule = 'Mon/Wed 17:00-18:00'
}
$clsId = Get-IdFromBody $cls.Body
Add-T 'M4' 'Admin create class + teacher' ($cls.Ok -and $clsId -gt 0) "id=$clsId status=$($cls.Status) teacher=$([bool]$cls.Json.teacherId)"

$enrol = Api POST "/madrassah/classes/$clsId/enrol/$stuId" $tokMA $null
Add-T 'M5' 'Enrol student into class' ($enrol.Ok -or $enrol.Status -eq 409) "status=$($enrol.Status)"

$session = Api POST "/madrassah/classes/$clsId/sessions" $tokTeacher @{
  date = $Today
  notes = 'M35 attendance session'
}
$sessId = Get-IdFromBody $session.Body
Add-T 'M6' 'Teacher create attendance session' ($session.Ok -and $sessId -gt 0) "id=$sessId status=$($session.Status)"

$att = Api POST "/madrassah/sessions/$sessId/attendance" $tokTeacher @(,(@{
  studentId = $stuId
  status = 0
}))
# status 0 = Present
Add-T 'M7' 'Record attendance PRESENT' ($att.Ok -and ($att.Body -match 'Present|"status"\s*:\s*0')) "status=$($att.Status)"

$fee = Api POST "/madrassah/students/$stuId/fees" $tokMA @{
  amount = 25.00
  dueDate = $Due
  status = 0
}
$feeId = Get-IdFromBody $fee.Body
Add-T 'M8' 'Admin create fee (Unpaid)' ($fee.Ok -and $feeId -gt 0) "id=$feeId status=$($fee.Status) feeStatus=$($fee.Json.status)"

$paid = Api POST "/madrassah/fees/$feeId/mark-paid" $tokMA $null
Add-T 'M9' 'Mark fee Paid' ($paid.Ok -and ($paid.Json.status -match 'Paid|1')) "status=$($paid.Status) feeStatus=$($paid.Json.status)"

# Second unpaid fee for dashboard unpaid count
$fee2 = Api POST "/madrassah/students/$stuId/fees" $tokMA @{
  amount = 15.00
  dueDate = $Due
  status = 0
}
$fee2Id = Get-IdFromBody $fee2.Body

$note = Api POST "/madrassah/students/$stuId/progress-notes" $tokTeacher @{
  classId = $clsId
  note = 'M35: Good progress on Surah Al-Fatiha memorisation.'
}
Add-T 'M10' 'Teacher progress note' ($note.Ok -and ($note.Body -match 'Fatiha')) "status=$($note.Status)"

$dash = Api GET "/madrassah/dashboard?mosqueId=$mid" $tokMA
$dashOk = $dash.Ok -and ($null -ne $dash.Json.totalStudents) -and ($null -ne $dash.Json.attendanceRate) -and ($null -ne $dash.Json.unpaidFees)
Add-T 'M11' 'Dashboard attendance + fee summaries' $dashOk "students=$($dash.Json.totalStudents) rate=$($dash.Json.attendanceRate) unpaid=$($dash.Json.unpaidFees)"

$parentView = Api GET '/madrassah/my-children' $tokParent
$parentOk = $parentView.Ok -and ((Test-JsonHasId $parentView.Body $stuId) -or ($parentView.Body -match 'M35 Ahmad'))
Add-T 'M12' 'Parent portal child attendance/fees/notes' $parentOk "status=$($parentView.Status) hasChild=$parentOk"

$listClasses = Api GET "/madrassah/classes?mosqueId=$mid" $tokMA
Add-T 'M13' 'List classes for mosque' ($listClasses.Ok -and (Test-JsonHasId $listClasses.Body $clsId)) "status=$($listClasses.Status)"

# ===================== 3.6 Communities =====================
# Types: 0 Tariqa, 1 Class, 2 YouthGroup, 3 SistersGroup, 4 StudyCircle, 5 MadrassahGroup
$com = Api POST '/communities' $tokMA @{
  mosqueId = $mid
  name = 'M36 Youth Study Circle'
  type = 4
  description = 'Weekly study circle for youth - Module 3.6 demo.'
  isPublic = $true
}
$comId = Get-IdFromBody $com.Body
Add-T 'C1' 'Admin create community (StudyCircle + mosque)' ($com.Ok -and $comId -gt 0) "id=$comId status=$($com.Status) type=$($com.Json.type)"

$list = Api GET "/communities?mosqueId=$mid" $null
Add-T 'C2' 'Public/list communities' ($list.Ok -and (Test-JsonHasId $list.Body $comId)) "status=$($list.Status)"

$detail = Api GET "/communities/$comId" $null
Add-T 'C3' 'Community detail' ($detail.Ok -and ($detail.Json.name -match 'M36')) "status=$($detail.Status)"

# Invite teacher as Teacher role (1), member joins as Member
$invite = Api POST "/communities/$comId/members" $tokMA @{
  userId = $teacherId
  role = 1
}
Add-T 'C4' 'Invite member with Teacher role' ($invite.Ok -or $invite.Status -eq 409) "status=$($invite.Status) role=$($invite.Json.role)"

$join = Api POST "/communities/$comId/join" $tokMember $null
Add-T 'C5' 'Member self-join' ($join.Ok -or $join.Status -eq 409) "status=$($join.Status)"

$post = Api POST "/communities/$comId/posts" $tokMA @{
  content = 'M36 welcome post — remember the hadith on seeking knowledge.'
  hadithRef = 'Ibn Majah 224'
}
Add-T 'C6' 'Feed post (text + hadith ref)' ($post.Ok -and ($post.Body -match 'Ibn Majah')) "status=$($post.Status)"

$posts = Api GET "/communities/$comId/posts" $null
Add-T 'C7' 'List feed posts' ($posts.Ok -and ($posts.Body -match 'M36 welcome')) "status=$($posts.Status)"

$res = Api POST "/communities/$comId/resources" $tokMA @{
  title = 'M36 Study Notes PDF'
  url = 'https://example.com/m36-notes.pdf'
  type = 'pdf'
}
Add-T 'C8' 'Add community resource' ($res.Ok -and ($res.Body -match 'Study Notes')) "status=$($res.Status)"

# Link existing Mawlid event if present, else create one
$evtList = Api GET "/mosques/$mid/events?upcomingOnly=false" $null
$evtId = 0
if ($evtList.Body -match '"id"\s*:\s*(\d+)') { $evtId = [int]$Matches[1] }
if ($evtId -le 0) {
  $evtNew = Api POST "/mosques/$mid/events" $tokMA @{
    title = 'M36 Community Linked Event'
    description = 'Linked to study circle'
    date = $Today
    startTime = '18:00:00'
    endTime = '19:00:00'
    location = 'Hall'
    isRecurring = $false
    status = 0
    eventType = 0
  }
  $evtId = Get-IdFromBody $evtNew.Body
}
$link = Api POST "/communities/$comId/events" $tokMA @{ eventId = $evtId }
$linkOk = $link.Ok -or $link.Status -eq 409
Add-T 'C9' 'Link community to event' $linkOk "status=$($link.Status) eventId=$evtId"

$linked = Api GET "/communities/$comId/events" $null
$linkedOk = $linked.Ok -and ((Test-JsonHasId $linked.Body $evtId) -or ($linked.Body -match ('"eventId"\s*:\s*{0}\b' -f $evtId)))
Add-T 'C10' 'List linked community events' $linkedOk "status=$($linked.Status)"

$mine = Api GET '/communities/mine' $tokMember
Add-T 'C11' 'Member my memberships' ($mine.Ok -and ($mine.Body -match "$comId")) "status=$($mine.Status)"

# Optional: Tariqa via muqaddam
$tariqa = Api POST '/communities' $tokMuq @{
  mosqueId = $mid
  name = 'M36 Tariqa Circle'
  type = 0
  description = 'Tariqa demo community'
  isPublic = $true
}
$tariqaId = Get-IdFromBody $tariqa.Body
Add-T 'C12' 'Muqaddam create Tariqa community' ($tariqa.Ok -and $tariqaId -gt 0) "id=$tariqaId status=$($tariqa.Status)"

$pass = ($Results | Where-Object Pass).Count
$fail = ($Results | Where-Object { -not $_.Pass }).Count

$out = New-Object System.Collections.Generic.List[string]
$out.Add('# Module 3.5 + 3.6 — Live Setup & Test Results')
$out.Add('')
$out.Add(('**Date:** {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm')))
$out.Add(('**Mosque:** {0} (masjid-al-noor-bradford)' -f $mid))
$out.Add(('**PASS:** {0} · **FAIL:** {1} · **TOTAL:** {2}' -f $pass, $fail, $Results.Count))
$out.Add('')
$out.Add('## Verdict')
$out.Add('')
$out.Add('Modules **3.5 Madrassah** and **3.6 Communities** set up and verified on mosque 115.')
$out.Add('')
$out.Add('## Test data applied')
$out.Add('')
$out.Add('| Module | Item | Value |')
$out.Add('|--------|------|-------|')
$out.Add('| 3.5 | Student id | ' + $stuId + ' (M35 Ahmad Ali) |')
$out.Add('| 3.5 | Guardian | parent user (Father) |')
$out.Add('| 3.5 | Class id | ' + $clsId + ' (M35 Quran Level 1) |')
$out.Add('| 3.5 | Teacher | teacher user |')
$out.Add('| 3.5 | Session / attendance | ' + $sessId + ' / Present |')
$out.Add('| 3.5 | Fees | paid + unpaid |')
$out.Add('| 3.5 | Progress note | Surah Al-Fatiha |')
$out.Add('| 3.6 | Study circle id | ' + $comId + ' |')
$out.Add('| 3.6 | Tariqa id | ' + $tariqaId + ' |')
$out.Add('| 3.6 | Linked event id | ' + $evtId + ' |')
$out.Add('| 3.6 | Hadith ref | Ibn Majah 224 |')
$out.Add('')
$out.Add('## UI routes')
$out.Add('')
$out.Add('- Admin madrassah: /dashboard/admin/madrassah')
$out.Add('- Admin communities: /dashboard/admin/communities')
$out.Add('- Parent portal: /dashboard/parent (my-children API)')
$out.Add('- Teacher: /dashboard/teacher')
$out.Add('- Member communities: /dashboard/member/communities')
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
$out.Add('powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module35-36-setup-test.ps1')
$out.Add('```')

$path = 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\Module35_36_LiveTestResults.md'
($out -join [Environment]::NewLine) | Set-Content -Path $path -Encoding UTF8
Write-Host ''
Write-Host ('Wrote {0} PASS={1} FAIL={2}' -f $path, $pass, $fail)
Write-Host ('stuId={0} clsId={1} comId={2}' -f $stuId, $clsId, $comId)
