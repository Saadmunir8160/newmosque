# Module 3.3 Announcements + 3.4 Events — setup all items + verify
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:5000/api/v1'
$mid = 115
$Today = (Get-Date).ToString('yyyy-MM-dd')
$Tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
$NextFri = (Get-Date).AddDays(((5 - [int](Get-Date).DayOfWeek + 7) % 7)); if ($NextFri -eq (Get-Date).Date) { $NextFri = $NextFri.AddDays(7) }
$NextFriStr = $NextFri.ToString('yyyy-MM-dd')
$Results = New-Object System.Collections.Generic.List[object]

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
    try { $json = ConvertFrom-Json -InputObject $r.Content } catch {}
    # PSCustomObject does not enumerate on return (hashtables do)
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

function Test-JsonHasId([string]$raw, $id) {
  if ([string]::IsNullOrWhiteSpace($raw) -or $null -eq $id) { return $false }
  # Prefer body match — avoids PS 5.1 ConvertFrom-Json array quirks
  if ($raw -match ('"id"\s*:\s*{0}\b' -f [regex]::Escape([string]$id))) { return $true }
  return $false
}

function Get-JsonArrayCount([string]$raw) {
  if ([string]::IsNullOrWhiteSpace($raw)) { return 0 }
  try {
    $parsed = ConvertFrom-Json -InputObject $raw
    if ($parsed -is [System.Array]) { return $parsed.Length }
    if ($null -eq $parsed) { return 0 }
    return 1
  } catch { return 0 }
}

Write-Host '=== Module 3.3 + 3.4 Setup + Test ==='

$tokMA = Login 'mosqueadmin' 'Admin@123'
$tokAdmin = Login 'admin' 'Admin@123'
$tokOwner = Login 'owner' 'Owner@123'
Add-T 'AUTH' 'Logins' ($tokMA -and $tokAdmin) "ma=$([bool]$tokMA) admin=$([bool]$tokAdmin) owner=$([bool]$tokOwner)"

# Ensure modules ON
$f1 = Api PUT "/mosques/$mid/settings/Announcements?enabled=true" $tokAdmin $null
$f2 = Api PUT "/mosques/$mid/settings/Events?enabled=true" $tokAdmin $null
Add-T 'SETUP' 'Announcements + Events modules ON' ($f1.Ok -and $f2.Ok) "ann=$($f1.Status) evt=$($f2.Status)"

# ===================== 3.3 Announcements =====================
# Create DRAFT
$annCreate = Api POST "/mosques/$mid/announcements" $tokMA @{
  title = 'M33 Community Iftar Reminder'
  summary = 'Join us for community iftar this weekend.'
  body = 'Full details: doors open 30 minutes before Maghrib. Families welcome. Bring a dish if you can.'
  imageUrl = 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800'
  status = 0
  isFeatured = $false
}
$annId = 0
if ($annCreate.Body -match '"id"\s*:\s*(\d+)') { $annId = [int]$Matches[1] }
elseif ($annCreate.Json -and $annCreate.Json.id -and -not ($annCreate.Json.id -is [Array])) { $annId = [int]$annCreate.Json.id }
Add-T 'A1' 'Admin create announcement (DRAFT)' ($annCreate.Ok -and $annId -gt 0) "id=$annId status=$($annCreate.Status)"

# Edit
$annEdit = Api PUT "/mosques/$mid/announcements/$annId" $tokMA @{
  title = 'M33 Community Iftar Reminder'
  summary = 'Updated summary: join us for community iftar.'
  body = 'Full details: doors open 30 minutes before Maghrib. Families welcome.'
  imageUrl = 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800'
  isFeatured = $true
}
Add-T 'A2' 'Admin edit announcement + feature flag' $annEdit.Ok "status=$($annEdit.Status) featured=$($annEdit.Json.isFeatured)"

# Publish
$annPub = Api POST "/mosques/$mid/announcements/$annId/publish" $tokMA @{}
Add-T 'A3' 'Admin publish announcement' ($annPub.Ok -and ($annPub.Json.status -match 'Published|1')) "status=$($annPub.Status) annStatus=$($annPub.Json.status)"

# Public list
$pubList = Api GET "/mosques/$mid/announcements" $null
$pubHas = Test-JsonHasId $pubList.Body $annId
$pubCount = Get-JsonArrayCount $pubList.Body
Add-T 'A4' 'Public announcement list includes published' ($pubList.Ok -and $pubHas) "status=$($pubList.Status) found=$pubHas count=$pubCount"

# Public detail
$pubDetail = Api GET "/mosques/$mid/announcements/$annId" $null
$cardOk = $pubDetail.Ok -and $pubDetail.Json.title -and $pubDetail.Json.summary
Add-T 'A5' 'Public announcement detail (card fields)' $cardOk "status=$($pubDetail.Status) title=$($pubDetail.Json.title)"

# Featured on home ($HOME is reserved in PowerShell — do not use $home)
$homeResp = Api GET "/public/home?mosqueId=$mid" $null
$feat = $false
$homeAnnCount = 0
if ($homeResp.Ok -and $homeResp.Body) {
  $feat = Test-JsonHasId $homeResp.Body $annId
  if ($feat -and ($homeResp.Body -notmatch '"isFeatured"\s*:\s*true')) { $feat = $false }
  if ($homeResp.Json -and $homeResp.Json.announcements) {
    $homeAnnCount = @($homeResp.Json.announcements).Count
  }
}
Add-T 'A6' 'Featured/published on public home' ($homeResp.Ok -and $feat) "status=$($homeResp.Status) featuredFound=$feat homeAnn=$homeAnnCount"

# Unpublish
$annUn = Api POST "/mosques/$mid/announcements/$annId/unpublish" $tokMA @{}
$hidden = Api GET "/mosques/$mid/announcements/$annId" $null
$unpubOk = $annUn.Ok -and ((-not $hidden.Ok) -or $hidden.Status -eq 404)
Add-T 'A7' 'Admin unpublish (public detail hidden)' $unpubOk "unpub=$($annUn.Status) publicGet=$($hidden.Status)"

# Re-publish for demo leftover
Api POST "/mosques/$mid/announcements/$annId/publish" $tokMA @{} | Out-Null

# Create second draft then delete
$ann2 = Api POST "/mosques/$mid/announcements" $tokMA @{
  title = 'M33 Temp Draft To Delete'
  summary = 'temp'
  body = 'temp body'
  status = 0
  isFeatured = $false
}
$ann2Id = 0
if ($ann2.Body -match '"id"\s*:\s*(\d+)') { $ann2Id = [int]$Matches[1] }
elseif ($ann2.Json -and $ann2.Json.id -and -not ($ann2.Json.id -is [Array])) { $ann2Id = [int]$ann2.Json.id }
$del = if ($ann2Id -gt 0) { Api DELETE "/mosques/$mid/announcements/$ann2Id" $tokMA } else { [pscustomobject]@{ Ok=$false; Status=0 } }
Add-T 'A8' 'Admin delete announcement' ($del.Ok -or $del.Status -eq 204) "id=$ann2Id status=$($del.Status)"

# Admin all=true sees drafts
$adminAll = Api GET "/mosques/$mid/announcements?all=true" $tokMA
Add-T 'A9' 'Admin list all statuses' $adminAll.Ok "status=$($adminAll.Status) count=$(Get-JsonArrayCount $adminAll.Body)"

# ===================== 3.4 Events =====================
$wirdId = 2
$evtCreate = Api POST "/mosques/$mid/events" $tokMA @{
  title = 'M34 Mawlid Gathering'
  description = 'Evening Mawlid with qasidas and guided reading.'
  date = $NextFriStr
  startTime = '19:00:00'
  endTime = '21:00:00'
  location = 'Main Prayer Hall'
  speaker = 'Shaykh Yusuf'
  isRecurring = $true
  status = 0
  eventType = 1
  wirdCollectionId = $wirdId
}
$evtId = 0
if ($evtCreate.Body -match '"id"\s*:\s*(\d+)') { $evtId = [int]$Matches[1] }
elseif ($evtCreate.Json -and $evtCreate.Json.id -and -not ($evtCreate.Json.id -is [Array])) { $evtId = [int]$evtCreate.Json.id }
Add-T 'E1' 'Admin create event (Mawlid + recurring + wird)' ($evtCreate.Ok -and $evtId -gt 0) "id=$evtId status=$($evtCreate.Status) wird=$($evtCreate.Json.wirdCollectionId) recurring=$($evtCreate.Json.isRecurring)"

$evt2 = Api POST "/mosques/$mid/events" $tokOwner @{
  title = 'M34 General Talk'
  description = 'Open community talk.'
  date = $Tomorrow
  startTime = '18:30:00'
  endTime = '19:30:00'
  location = 'Community Room'
  speaker = 'Br. Hamid'
  isRecurring = $false
  status = 0
  eventType = 0
}
$evt2Id = 0
if ($evt2.Body -match '"id"\s*:\s*(\d+)') { $evt2Id = [int]$Matches[1] }
elseif ($evt2.Json -and $evt2.Json.id -and -not ($evt2.Json.id -is [Array])) { $evt2Id = [int]$evt2.Json.id }
Add-T 'E2' 'Owner create GENERAL event' ($evt2.Ok -and $evt2Id -gt 0) "id=$evt2Id status=$($evt2.Status)"

# Edit
$evtEdit = Api PUT "/mosques/$mid/events/$evtId" $tokMA @{
  title = 'M34 Mawlid Gathering (Updated)'
  description = 'Evening Mawlid with qasidas and guided reading sequence.'
  date = $NextFriStr
  startTime = '19:15:00'
  endTime = '21:00:00'
  location = 'Main Prayer Hall'
  speaker = 'Shaykh Yusuf'
  isRecurring = $true
  status = 0
  eventType = 1
  wirdCollectionId = $wirdId
}
Add-T 'E3' 'Admin edit event' ($evtEdit.Ok -and ($evtEdit.Json.startTime -match '19:15')) "status=$($evtEdit.Status) start=$($evtEdit.Json.startTime)"

# Public list
$evtList = Api GET "/mosques/$mid/events?upcomingOnly=true" $null
$evtFound = Test-JsonHasId $evtList.Body $evtId
$evtCount = Get-JsonArrayCount $evtList.Body
Add-T 'E4' 'Public event list' ($evtList.Ok -and $evtFound) "status=$($evtList.Status) found=$evtFound count=$evtCount"

# Public detail + wird link
$evtDetail = Api GET "/mosques/$mid/events/$evtId" $null
$linkOk = $evtDetail.Ok -and ("$($evtDetail.Json.wirdCollectionId)" -eq "$wirdId" -or $evtDetail.Json.wirdCollection)
Add-T 'E5' 'Public event detail + awrad link' $linkOk "status=$($evtDetail.Status) wirdId=$($evtDetail.Json.wirdCollectionId)"

# Home upcoming events
$home2 = Api GET "/public/home?mosqueId=$mid" $null
$homeEvt = $false
$homeEvtCount = 0
if ($home2.Ok -and $home2.Json -and $home2.Json.upcomingEvents) {
  $homeEvtCount = @($home2.Json.upcomingEvents).Count
  $homeEvt = $homeEvtCount -gt 0
}
Add-T 'E6' 'Home upcoming events section' ($home2.Ok -and $homeEvt) "status=$($home2.Status) count=$homeEvtCount"

# Delete temp general event
$evtDel = if ($evt2Id -gt 0) { Api DELETE "/mosques/$mid/events/$evt2Id" $tokMA } else { @{ Ok=$false; Status=0 } }
Add-T 'E7' 'Admin delete event' ($evtDel.Ok -or $evtDel.Status -eq 204) "id=$evt2Id status=$($evtDel.Status)"

# Recurring flag stored (not enforced) - already set true on Mawlid
Add-T 'E8' 'Recurring flag stored (v1 not enforced)' ($evtEdit.Json.isRecurring -eq $true) "isRecurring=$($evtEdit.Json.isRecurring)"

$pass = ($Results | Where-Object Pass).Count
$fail = ($Results | Where-Object { -not $_.Pass }).Count

$out = New-Object System.Collections.Generic.List[string]
$out.Add('# Module 3.3 + 3.4 — Live Setup & Test Results')
$out.Add('')
$out.Add(('**Date:** {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm')))
$out.Add(('**Mosque:** {0} (masjid-al-noor-bradford)' -f $mid))
$out.Add(('**PASS:** {0} · **FAIL:** {1} · **TOTAL:** {2}' -f $pass, $fail, $Results.Count))
$out.Add('')
$out.Add('## Test data applied')
$out.Add('')
$out.Add('| Module | Item | Value |')
$out.Add('|--------|------|-------|')
$out.Add('| 3.3 | Announcement id | ' + $annId + ' |')
$out.Add('| 3.3 | Title | M33 Community Iftar Reminder |')
$out.Add('| 3.3 | Status flow | Draft -> Published -> Unpublished -> Published |')
$out.Add('| 3.3 | Featured | true |')
$out.Add('| 3.3 | Image | unsplash mosque image URL |')
$out.Add('| 3.4 | Mawlid event id | ' + $evtId + ' |')
$out.Add('| 3.4 | Date | ' + $NextFriStr + ' 19:15-21:00 |')
$out.Add('| 3.4 | Type | Mawlid |')
$out.Add('| 3.4 | Recurring | true (stored) |')
$out.Add('| 3.4 | WirdCollectionId | ' + $wirdId + ' (Mawlid Night Reading) |')
$out.Add('| Auth | mosqueadmin / Admin@123 | create publish |')
$out.Add('')
$out.Add('## UI routes')
$out.Add('')
$out.Add('- Admin announcements: /dashboard/admin/announcements')
$out.Add('- Admin events: /dashboard/admin/events')
$out.Add('- Public list: /dashboard/announcements · /dashboard/events')
$out.Add('- Public mosque: /mosque/masjid-al-noor-bradford')
$out.Add('- Public home API: /api/v1/public/home?mosqueId=115')
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
$path = 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\Module33_34_LiveTestResults.md'
($out -join [Environment]::NewLine) | Set-Content -Path $path -Encoding UTF8
Write-Host ''
Write-Host ('Wrote {0} PASS={1} FAIL={2}' -f $path, $pass, $fail)
Write-Host ('annId={0} evtId={1}' -f $annId, $evtId)
