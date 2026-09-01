# Module 3.1 â€” Live Test Results

**Date:** 2026-08-07 09:22
**Slug:** `client-demo-mosque-20260807092215` (id=131)
**Public URL:** http://localhost:4200/mosque/client-demo-mosque-20260807092215
**PASS:** 12 Â· **FAIL:** 2 Â· **TOTAL:** 14

## Test data used

| Item | Value |
|------|-------|
| Super Admin | ``admin`` / ``Admin@123`` |
| Claim user | ``mosqueadmin`` / ``Admin@123`` |
| Seed name | Client Demo Mosque |
| Slug | `client-demo-mosque-20260807092215` |
| City | Bradford |
| Address | 12 High Street, BD1 1AA |
| Phone (seed) | 01274123456 |
| Phone (after edit) | 01274999999 |
| Email on seed | *(empty)* |
| Claim phone | 07123456789 |
| Claim role | Imam |

## Results

| Id | Test | Result | Detail |
|----|------|--------|--------|
| AUTH | Logins (admin + mosqueadmin) | **PASS** | admin=True ma=True |
| T1 | Seed Unclaimed (email empty) | **PASS** | id=131 status=Unclaimed slug=client-demo-mosque-20260807092215 http=200 |
| T2 | Public Unclaimed profile visible | **PASS** | status=200 mosqueStatus=Unclaimed |
| T3 | Submit ownership claim | **PASS** | status=200 {"success":true,"claimReference":"MC-2026-000007","status":"PENDING","message":"Claim submitted successfully."} |
| T4 | After claim: Unclaimed + claim PENDING (CTA off) | **PASS** | status=Unclaimed allowClaim=False http=200 |
| T5 | Approve claim -> Claimed | **PASS** | claimId=59 status=200 |
| T5b | Public still hidden while Claimed | **PASS** | status=404 |
| T6 | Activate mosque -> Active | **PASS** | status=200 |
| T7 | Public Active profile | **PASS** | status=200 mosqueStatus=Active |
| T8 | Module flags toggle (Announcements) | **PASS** | off=200 on=200 annEnabled=True |
| T9 | Edit phone reflects on public | **FAIL** | edit=200 phone=01274123456 |
| T10 | Registration submit (separate path) | **FAIL** | status=409  |
| T11 | Public directory search Bradford | **PASS** | status=200 |
| T12 | Discovery request mosque | **PASS** | status=200 {"message":"Thank you! Your request has been received. Our team will review it and add the mosque to |
