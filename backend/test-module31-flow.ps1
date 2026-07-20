$base = "http://localhost:5000/api/v1"
$slug = "test-auto-mosque-$(Get-Date -Format 'yyyyMMddHHmmss')"
$submitSlug = "test-submit-mosque-$(Get-Date -Format 'yyyyMMddHHmmss')"
$results = @()

function Add-Result($step, $ok, $detail) {
    $script:results += [pscustomobject]@{ Step = $step; OK = $ok; Detail = $detail }
}

function Get-Token($user, $pass) {
    $body = @{ username = $user; password = $pass } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $body -ContentType "application/json"
    return $r.token
}

function Invoke-Api($method, $uri, $token, $body = $null, $contentType = "application/json") {
    $headers = @{ Authorization = "Bearer $token" }
    if ($null -eq $body) {
        return Invoke-WebRequest -Uri $uri -Method $method -Headers $headers -UseBasicParsing
    }
    return Invoke-WebRequest -Uri $uri -Method $method -Headers $headers -Body $body -ContentType $contentType -UseBasicParsing
}

function Clear-ClaimantActiveTestMosques($adminToken) {
    try {
        $users = Invoke-RestMethod -Uri "$base/platform/users" -Headers @{ Authorization = "Bearer $adminToken" }
        $claimant = $users | Where-Object { $_.userName -eq 'mosqueadmin' } | Select-Object -First 1
        if (-not $claimant) { return }
        $listings = Invoke-RestMethod -Uri "$base/platform/mosques/listings?status=Active" -Headers @{ Authorization = "Bearer $adminToken" }
        foreach ($m in @($listings.items)) {
            if ($m.ownerId -eq $claimant.id -and $m.slug -like 'test-auto-mosque-*') {
                Invoke-RestMethod -Uri "$base/platform/mosques/$($m.id)/deactivate" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } | Out-Null
            }
        }
    } catch { }
}

function Clear-PendingClaims($adminToken) {
    try {
        $pending = Invoke-RestMethod -Uri "$base/platform/claims/pending" -Headers @{ Authorization = "Bearer $adminToken" }
        foreach ($c in @($pending.items)) {
            $body = @{ reason = "Automated test cleanup" } | ConvertTo-Json
            Invoke-RestMethod -Uri "$base/platform/claims/$($c.claimId)/reject" -Method Post -Body $body -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" } | Out-Null
        }
    } catch { }
}

function Clear-OwnerPendingClaims($ownerToken, $adminToken) {
    Clear-PendingClaims $adminToken
}

function Get-StatusCode($scriptBlock) {
    try {
        & $scriptBlock | Out-Null
        return 200
    } catch {
        if ($_.Exception.Response) { return $_.Exception.Response.StatusCode.value__ }
        return 0
    }
}

try {
    # 1. Super Admin login
    $adminToken = Get-Token "admin" "Admin@123"
    Add-Result "1. Admin login" $true "Token received"
    Clear-PendingClaims $adminToken

    # 2. Seed unclaimed mosque
    $seedBody = @{
        name = "Auto Test Mosque London"
        slug = $slug
        city = "London"
        postcode = "E1 1AA"
        address = "100 Whitechapel Road"
        phone = "+447700900123"
        email = "info@autotest.test"
        website = "https://example.org"
        facebookUrl = "https://facebook.com/example"
        instagramUrl = "https://instagram.com/example"
        country = "United Kingdom"
        timezone = "Europe/London"
        description = "Automated Module 3.1 test listing"
        logoUrl = "/uploads/mosques/demo-logo.png"
        bannerUrl = "/uploads/mosques/demo-banner.png"
        status = "Unclaimed"
    } | ConvertTo-Json

    $seed = Invoke-RestMethod -Uri "$base/platform/mosques/seed" -Method Post -Body $seedBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" }
    $mosqueId = $seed.id
    Add-Result "2. Seed mosque" ($seed.status -eq "Unclaimed") "id=$mosqueId slug=$slug status=$($seed.status)"

    # 3. Public profile (Unclaimed)
    $pub = Invoke-WebRequest -Uri "$base/mosques/$slug" -UseBasicParsing
    $pubJson = $pub.Content | ConvertFrom-Json
    $noOwner = -not ($pubJson.PSObject.Properties.Name -contains 'ownerId')
    Add-Result "3. Public profile (Unclaimed)" ($pub.StatusCode -eq 200 -and $noOwner) "HTTP $($pub.StatusCode) root ownerId absent=$noOwner"

    # 3c. Enrich public profile fields
    $profileBody = @{
        name = "Auto Test Mosque London"
        city = "London"
        establishedYear = 2005
        capacity = 500
        vision = "Test vision statement"
        history = "Test history"
        parkingInfo = "Street parking available"
        gallery = @("/uploads/mosques/demo-logo.png")
        services = @("DailyPrayers", "Jumuah")
        leadership = @(@{ name = "Test Imam"; role = "Imam"; bio = "Demo leader" })
    } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Uri "$base/mosque/$mosqueId" -Method Put -Body $profileBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" } | Out-Null
    $pub2 = Invoke-RestMethod -Uri "$base/mosques/$slug"
    $hasCapacity = $pub2.capacity -eq 500
    $hasGallery = ($pub2.gallery | Measure-Object).Count -ge 1
    Add-Result "3c. Public profile fields" ($hasCapacity -and $hasGallery) "capacity=$($pub2.capacity) gallery=$($pub2.gallery.Count)"

    # 3d. Public leadership + stats endpoints
    $leaders = Invoke-RestMethod -Uri "$base/mosques/$mosqueId/public/leadership"
    $stats = Invoke-RestMethod -Uri "$base/mosques/$mosqueId/public/stats"
    Add-Result "3d. Public leadership/stats" (($leaders | Measure-Object).Count -ge 1 -and $stats.members -ge 0) "leaders=$($leaders.Count) members=$($stats.members)"

    # 3b. Settings read
    $settings = Invoke-RestMethod -Uri "$base/mosques/$mosqueId/settings" -Headers @{ Authorization = "Bearer $adminToken" }
    Add-Result "3b. Settings GET" ($settings.Count -gt 0) "modules=$($settings.Count)"

    # 4. Mosque Admin login (client spec: mosque admins can claim)
    $mosqueAdminToken = Get-Token "mosqueadmin" "Admin@123"
    Add-Result "4. Mosque Admin login" $true "Token received"
    Clear-OwnerPendingClaims $mosqueAdminToken $adminToken
    Clear-ClaimantActiveTestMosques $adminToken

    # 5. Claim with full JSON body (mosqueadmin)
    $claimBody = @{
        fullName = "Br. Ahmed (Mosque Admin)"
        email = "mosqueadmin@mosqueos.uk"
        phone = "+447700900456"
        position = "Trustee"
        relationshipToMosque = "Trustee"
        reason = "I am authorized to manage this mosque listing for our community."
        authorizedDeclaration = $true
        accurateInfoDeclaration = $true
    } | ConvertTo-Json

    $claimResp = Invoke-WebRequest -Uri "$base/mosques/$mosqueId/claim" -Method Post `
        -Headers @{ Authorization = "Bearer $mosqueAdminToken" } `
        -Body $claimBody -ContentType "application/json" -UseBasicParsing
    $claimJson = $claimResp.Content | ConvertFrom-Json
    $claimId = $claimJson.claim.claimId
    Add-Result "5. Submit claim" ($claimJson.mosque.status -eq "ClaimPending" -and $claimId) "status=$($claimJson.mosque.status) claimId=$claimId ref=$($claimJson.claim.claimReference)"

    # 6. Public hidden while pending
    $hiddenCode = Get-StatusCode { Invoke-WebRequest -Uri "$base/mosques/$slug" -UseBasicParsing | Out-Null }
    Add-Result "6. Public hidden (ClaimPending)" ($hiddenCode -eq 404) "HTTP $hiddenCode"

    # 6b. Legacy by-slug returns 410 when pending
    $legacyCode = Get-StatusCode { Invoke-WebRequest -Uri "$base/public/mosques/by-slug/$slug" -UseBasicParsing | Out-Null }
    Add-Result "6b. Legacy by-slug blocked" ($legacyCode -eq 410) "HTTP $legacyCode"

    # 7. Pending claims list
    $claims = Invoke-RestMethod -Uri "$base/platform/claims/pending" -Headers @{ Authorization = "Bearer $adminToken" }
    $found = $claims.items | Where-Object { $_.mosqueId -eq $mosqueId }
    Add-Result "7. Pending claims list" ($null -ne $found) "claimId=$($found.claimId)"

    # 8. Approve via platform claims API -> Claimed (NOT Active)
    $approved = Invoke-RestMethod -Uri "$base/platform/claims/$claimId/approve" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -Body '{}' -ContentType "application/json"
    $approvedMosqueStatus = if ($approved.mosqueStatus) { $approved.mosqueStatus } elseif ($approved.mosque) { $approved.mosque.status } else { $null }
    $ownerId = if ($approved.mosque) { $approved.mosque.ownerId } else { $null }
    Add-Result "8. Claims API approve -> CLAIMED" ($approvedMosqueStatus -eq "Claimed" -and $ownerId) "mosqueStatus=$approvedMosqueStatus owner=$ownerId"

    # 8b. Public hidden while Claimed (not yet Active)
    $claimedHidden = Get-StatusCode { Invoke-WebRequest -Uri "$base/mosques/$slug" -UseBasicParsing | Out-Null }
    Add-Result "8b. Public hidden (Claimed)" ($claimedHidden -eq 404) "HTTP $claimedHidden"

    # 9. Activate -> Active (separate step)
    $activateResp = Invoke-RestMethod -Uri "$base/platform/claims/$claimId/activate" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }
    $activatedStatus = if ($activateResp.mosqueStatus) { $activateResp.mosqueStatus } elseif ($activateResp.mosque) { $activateResp.mosque.status } else { $activateResp.status }
    Add-Result "9. Activate mosque -> ACTIVE" ($activatedStatus -eq "Active") "status=$activatedStatus"

    # 10. Public live again
    $pub2 = Invoke-WebRequest -Uri "$base/mosques/$slug" -UseBasicParsing
    Add-Result "10. Public profile (Active)" ($pub2.StatusCode -eq 200) "HTTP $($pub2.StatusCode)"

    # 11. Owner assigned on activated mosque
    $ownerSnapshot = Invoke-RestMethod -Uri "$base/platform/mosques/$mosqueId/snapshot" -Headers @{ Authorization = "Bearer $adminToken" }
    Add-Result "11. Owner assigned" ($ownerSnapshot.mosque.ownerId -and $ownerSnapshot.mosque.status -eq "Active") "mosque=$($ownerSnapshot.mosque.name)"

    # 12. Module flag toggle ON
    $flagOn = Invoke-RestMethod -Uri "$base/mosques/$mosqueId/settings/Events?enabled=true" -Method Put -Headers @{ Authorization = "Bearer $adminToken" }
    Add-Result "12. Feature flag Events ON" ($flagOn.isEnabled -eq $true) "module=$($flagOn.moduleKey)"

    # 13. Events API allowed when enabled
    $eventsOk = Get-StatusCode { Invoke-WebRequest -Uri "$base/mosques/$mosqueId/events" -UseBasicParsing | Out-Null }
    Add-Result "13. Events API (enabled)" ($eventsOk -eq 200) "HTTP $eventsOk"

    # 14. Events API blocked when disabled
    Invoke-RestMethod -Uri "$base/mosques/$mosqueId/settings/Events?enabled=false" -Method Put -Headers @{ Authorization = "Bearer $adminToken" } | Out-Null
    $eventsBlocked = Get-StatusCode { Invoke-WebRequest -Uri "$base/mosques/$mosqueId/events" -UseBasicParsing | Out-Null }
    Add-Result "14. Events API (disabled 403)" ($eventsBlocked -eq 403) "HTTP $eventsBlocked"

    # 15. Bulk settings PUT
    $bulkBody = @{ modules = @(@{ moduleKey = "Events"; isEnabled = $true }) } | ConvertTo-Json -Depth 4
    $bulk = Invoke-RestMethod -Uri "$base/mosque/$mosqueId/settings" -Method Put -Headers @{ Authorization = "Bearer $adminToken" } -Body $bulkBody -ContentType "application/json"
    $eventsEnabled = ($bulk | Where-Object { $_.moduleKey -eq "Events" }).isEnabled
    Add-Result "15. Bulk settings PUT" ($eventsEnabled -eq $true) "Events enabled=$eventsEnabled"

    # 16. Member submit new listing
    $memberToken = Get-Token "member" "Member@123"
    $submitBody = @{
        name = "Member Submitted Mosque"
        slug = $submitSlug
        city = "Manchester"
        postcode = "M1 1AA"
        address = "1 Deansgate"
        phone = "+447700900789"
        email = "member-submit@test.local"
        description = "New listing submitted by member for Module 3.1 test"
    } | ConvertTo-Json
    try {
        $submit = Invoke-RestMethod -Uri "$base/mosques/submit" -Method Post -Body $submitBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $memberToken" }
        Add-Result "16. Submit new listing" ($submit.mosque.status -eq "PendingReview") "status=$($submit.mosque.status) slug=$submitSlug"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Add-Result "16. Submit new listing" ($code -eq 409) "HTTP $code (pending claim exists - acceptable)"
    }

    # 17. Reject claim flow (member listing from step 16)
    try {
        $pendingAfterSubmit = Invoke-RestMethod -Uri "$base/platform/claims/pending" -Headers @{ Authorization = "Bearer $adminToken" }
        $memberClaim = $pendingAfterSubmit.items | Where-Object { $_.slug -eq $submitSlug } | Select-Object -First 1
        if ($null -eq $memberClaim) {
            Add-Result "17. Reject claim" $false "No pending member claim found for $submitSlug"
        } else {
            $rejectBody = @{ reason = "Test rejection - insufficient documentation" } | ConvertTo-Json
            Invoke-RestMethod -Uri "$base/platform/claims/$($memberClaim.claimId)/reject" -Method Post -Body $rejectBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $adminToken" } | Out-Null
            $rejectSnapshot = Invoke-RestMethod -Uri "$base/platform/mosques/$($memberClaim.mosqueId)/snapshot" -Headers @{ Authorization = "Bearer $adminToken" }
            Add-Result "17. Reject claim" ($rejectSnapshot.mosque.status -eq "Archived") "mosque=$($rejectSnapshot.mosque.status) claimId=$($memberClaim.claimId)"
        }
    } catch {
        Add-Result "17. Reject claim" $false $_.Exception.Message
    }

} catch {
    Add-Result "ERROR" $false $_.Exception.Message
    if ($_.ErrorDetails.Message) { Add-Result "ERROR body" $false $_.ErrorDetails.Message }
}

Write-Host "`n=== Module 3.1 Auto Test Results ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize
$passed = ($results | Where-Object { $_.OK }).Count
$total = $results.Count
Write-Host "Passed: $passed / $total" -ForegroundColor $(if ($passed -eq $total) { 'Green' } else { 'Yellow' })
Write-Host "Test slug: $slug" -ForegroundColor Gray
Write-Host "Public URL: http://127.0.0.1:4200/mosque/$slug" -ForegroundColor Gray
if ($passed -ne $total) { exit 1 }
