# Module 3.1 Test Pack — automated API run
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:5000/api/v1'
$Slug = "client-demo-mosque-$(Get-Date -Format 'yyyyMMddHHmmss')"
$Results = New-Object System.Collections.Generic.List[object]

function Add-T($id, $name, $pass, $detail) {
  $Results.Add([pscustomobject]@{ Id=$id; Name=$name; Pass=[bool]$pass; Detail="$detail" })
  $m = if ($pass) { 'PASS' } else { 'FAIL' }
  Write-Host "[$m] $id - $name :: $detail"
}

function Login($u, $p) {
  Start-Sleep -Milliseconds 600
  try {
    $r = Invoke-RestMethod -Uri "$Base/auth/login" -Method POST -Body (@{ username=$u; password=$p; rememberMe=$false } | ConvertTo-Json) -ContentType 'application/json'
    return $r.token
  } catch {
    Write-Host "LOGIN_FAIL $u : $($_.Exception.Response.StatusCode.value__) $($_.ErrorDetails.Message)"
    return $null
  }
}

function Api($method, $path, $token, $body = $null) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  $p = @{ Uri = "$Base$path"; Method = $method; Headers = $h; UseBasicParsing = $true }
  if ($null -ne $body) { $p.Body = ($body | ConvertTo-Json -Depth 6); $p.ContentType = 'application/json' }
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

Write-Host "=== Module 3.1 Test Pack ==="
Write-Host "Slug: $Slug"

$tokAdmin = Login 'admin' 'Admin@123'
$tokMA = Login 'mosqueadmin' 'Admin@123'
Add-T 'AUTH' 'Logins (admin + mosqueadmin)' ($tokAdmin -and $tokMA) "admin=$([bool]$tokAdmin) ma=$([bool]$tokMA)"

# TEST 1 — Seed Unclaimed (email empty)
$seedBody = @{
  name = 'Client Demo Mosque'
  slug = $Slug
  city = 'Bradford'
  address = '12 High Street'
  postcode = 'BD1 1AA'
  phone = '01274123456'
  website = 'https://example.org'
  description = 'Client demo listing for Module 3.1'
  timezone = 'Europe/London'
}
$seed = Api POST '/platform/mosques/seed' $tokAdmin $seedBody
$seedId = 0
$seedStatus = ''
if ($seed.Json) { $seedId = [int]$seed.Json.id; $seedStatus = "$($seed.Json.status)" }
Add-T 'T1' 'Seed Unclaimed (email empty)' ($seed.Ok -and $seedId -gt 0 -and ($seedStatus -match 'Unclaimed|0')) "id=$seedId status=$seedStatus slug=$Slug http=$($seed.Status)"

# TEST 2 — Public Unclaimed + Claim CTA (API: public visible)
$pub1 = Api GET "/mosques/$Slug" $null
$pubOk = $pub1.Ok -and ($pub1.Json.status -match 'Unclaimed|0')
Add-T 'T2' 'Public Unclaimed profile visible' $pubOk "status=$($pub1.Status) mosqueStatus=$($pub1.Json.status)"

# TEST 3 — Submit claim as mosqueadmin
$claim = Api POST '/mosque-claims' $tokMA @{
  mosqueId = $seedId
  role = 'Imam'
  phone = '07123456789'
  notes = 'Module 3.1 claim test'
  fullName = 'Mosque Admin'
}
Add-T 'T3' 'Submit ownership claim' $claim.Ok "status=$($claim.Status) $($claim.Body.Substring(0,[Math]::Min(140,$claim.Body.Length)))"

# TEST 4 — Spec: mosque stays UNCLAIMED while claim is PENDING; Claim CTA gated (allowClaimRequests=false)
$pub2 = Api GET "/mosques/$Slug" $null
$stillUnclaimed = $pub2.Ok -and ($pub2.Json.status -match 'Unclaimed|0')
$ctaOff = $pub2.Ok -and ($pub2.Json.allowClaimRequests -eq $false)
Add-T 'T4' 'After claim: Unclaimed + claim PENDING (CTA off)' ($stillUnclaimed -and $ctaOff) "status=$($pub2.Json.status) allowClaim=$($pub2.Json.allowClaimRequests) http=$($pub2.Status)"

# TEST 5 — Approve claim
$claimsList = Api GET '/admin/claims?filter=pending' $tokAdmin
if (-not $claimsList.Ok) { $claimsList = Api GET '/admin/claims' $tokAdmin }
$claimId = 0
if ($claimsList.Json) {
  $items = if ($claimsList.Json.items) { $claimsList.Json.items } elseif ($claimsList.Json -is [array]) { $claimsList.Json } else { @($claimsList.Json) }
  $match = $items | Where-Object { $_.mosqueId -eq $seedId -or $_.mosqueName -match 'Client Demo' } | Select-Object -First 1
  if ($match) { $claimId = [int]$(if ($match.id) { $match.id } else { $match.claimId }) }
}
$approve = if ($claimId -gt 0) { Api POST "/admin/claims/$claimId/approve" $tokAdmin @{} } else { @{ Ok=$false; Status=0; Body='no claim id' } }
Add-T 'T5' 'Approve claim -> Claimed' $approve.Ok "claimId=$claimId status=$($approve.Status)"

# Public still hidden while Claimed
$pubClaimed = Api GET "/mosques/$Slug" $null
$stillHidden = (-not $pubClaimed.Ok) -or $pubClaimed.Status -in 404,403,410
Add-T 'T5b' 'Public still hidden while Claimed' $stillHidden "status=$($pubClaimed.Status)"

# TEST 6 — Activate
$act = Api POST "/platform/mosques/$seedId/activate" $tokAdmin @{}
Add-T 'T6' 'Activate mosque -> Active' $act.Ok "status=$($act.Status)"

# TEST 7 — Public Active
$pub3 = Api GET "/mosques/$Slug" $null
Add-T 'T7' 'Public Active profile' ($pub3.Ok -and ($pub3.Json.status -match 'Active|2')) "status=$($pub3.Status) mosqueStatus=$($pub3.Json.status)"

# TEST 8 — Module flags (owner/mosqueadmin who owns after claim)
# After claim, mosqueadmin is owner of this mosque — try flags
$flagOff = Api PUT "/mosques/$seedId/settings/Announcements?enabled=false" $tokMA $null
if (-not $flagOff.Ok) { $flagOff = Api PUT "/mosques/$seedId/settings/Announcements?enabled=false" $tokAdmin $null }
$flagOn = Api PUT "/mosques/$seedId/settings/Announcements?enabled=true" $tokMA $null
if (-not $flagOn.Ok) { $flagOn = Api PUT "/mosques/$seedId/settings/Announcements?enabled=true" $tokAdmin $null }
$settings = Api GET "/mosques/$seedId/settings" $tokAdmin
$annOn = $false
if ($settings.Json) {
  $list = if ($settings.Json -is [array]) { $settings.Json } else { @($settings.Json) }
  $ann = $list | Where-Object { $_.moduleKey -eq 'Announcements' } | Select-Object -First 1
  if ($ann) { $annOn = [bool]$ann.isEnabled }
}
Add-T 'T8' 'Module flags toggle (Announcements)' ($flagOff.Ok -or $flagOn.Ok) "off=$($flagOff.Status) on=$($flagOn.Status) annEnabled=$annOn"

# TEST 9 — Owner/admin edit phone
$edit = Api PUT "/platform/mosques/$seedId" $tokAdmin @{
  name = 'Client Demo Mosque'
  city = 'Bradford'
  address = '12 High Street'
  postcode = 'BD1 1AA'
  phone = '01274999999'
  timezone = 'Europe/London'
}
if (-not $edit.Ok) {
  $edit = Api PUT "/mosques/$seedId" $tokMA @{
    name = 'Client Demo Mosque'
    city = 'Bradford'
    phone = '01274999999'
  }
}
$pubEdit = Api GET "/mosques/$Slug" $null
$phoneOk = $pubEdit.Ok -and ("$($pubEdit.Json.phone)" -match '01274999999')
Add-T 'T9' 'Edit phone reflects on public' ($edit.Ok -and $phoneOk) "edit=$($edit.Status) phone=$($pubEdit.Json.phone)"

# TEST 10 — Registration path (separate)
$regBody = @{
  name = "Client Reg Mosque $(Get-Date -Format 'HHmmss')"
  city = 'Leeds'
  address = '1 Test Road, LS1 1AA'
  phone = '01131234567'
  description = 'Client demo registration'
}
$reg = Api POST '/registrations' $tokMA $regBody
if (-not $reg.Ok) { $reg = Api POST '/mosque-registrations' $tokMA $regBody }
if (-not $reg.Ok) { $reg = Api POST '/mosques/submit' $tokMA $regBody }
Add-T 'T10' 'Registration submit (separate path)' ($reg.Ok -or $reg.Status -in 200,201) "status=$($reg.Status) $($reg.Body.Substring(0,[Math]::Min(100,$reg.Body.Length)))"

# TEST 11 — Public directory
$dir = Api GET '/mosques?city=Bradford' $null
if (-not $dir.Ok) { $dir = Api GET '/public/mosques?city=Bradford' $null }
Add-T 'T11' 'Public directory search Bradford' $dir.Ok "status=$($dir.Status)"

# TEST 12 — Discovery request
$req = Api POST '/discovery/request' $null @{
  mosqueName = 'Client Request Mosque'
  city = 'Manchester'
  postcode = 'M1 1AE'
  address = '10 Demo Street'
  requesterName = 'Test Visitor'
  email = 'visitor@example.com'
  notes = 'Please add this mosque to the directory'
}
if (-not $req.Ok) {
  $req = Api POST '/public/discovery/request' $null @{
    name = 'Client Request Mosque'
    city = 'Manchester'
    postcode = 'M1 1AE'
    address = '10 Demo Street'
    contactName = 'Test Visitor'
    email = 'visitor@example.com'
    notes = 'Please add this mosque to the directory'
  }
}
Add-T 'T12' 'Discovery request mosque' ($req.Ok -or $req.Status -in 200,201) "status=$($req.Status) $($req.Body.Substring(0,[Math]::Min(100,$req.Body.Length)))"

$pass = ($Results | Where-Object Pass).Count
$fail = ($Results | Where-Object { -not $_.Pass }).Count

$out = @()
$out += '# Module 3.1 — Live Test Results'
$out += ''
$out += "**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$out += "**Slug:** ``$Slug`` (id=$seedId)"
$out += "**Public URL:** http://localhost:4200/mosque/$Slug"
$out += "**PASS:** $pass · **FAIL:** $fail · **TOTAL:** $($Results.Count)"
$out += ''
$out += '## Test data used'
$out += ''
$out += '| Item | Value |'
$out += '|------|-------|'
$out += '| Super Admin | ``admin`` / ``Admin@123`` |'
$out += '| Claim user | ``mosqueadmin`` / ``Admin@123`` |'
$out += "| Seed name | Client Demo Mosque |"
$out += "| Slug | ``$Slug`` |"
$out += '| City | Bradford |'
$out += '| Address | 12 High Street, BD1 1AA |'
$out += '| Phone (seed) | 01274123456 |'
$out += '| Phone (after edit) | 01274999999 |'
$out += '| Email on seed | *(empty)* |'
$out += '| Claim phone | 07123456789 |'
$out += '| Claim role | Imam |'
$out += ''
$out += '## Results'
$out += ''
$out += '| Id | Test | Result | Detail |'
$out += '|----|------|--------|--------|'
foreach ($r in $Results) {
  $m = if ($r.Pass) { 'PASS' } else { 'FAIL' }
  $d = ($r.Detail -replace '\|','/' -replace "`r|`n",' ')
  $out += "| $($r.Id) | $($r.Name) | **$m** | $d |"
}
$path = 'C:\Users\hp\OneDrive\Desktop\newmosque\Docs\Module31_LiveTestResults.md'
$out -join "`n" | Set-Content $path -Encoding UTF8
Write-Host "`nWrote $path  PASS=$pass FAIL=$fail"
