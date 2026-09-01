# Modules 3.9-3.15 - Live Setup & Test Results

**Date:** 2026-08-07 08:35
**Mosque:** 115
**PASS:** 27 / **FAIL:** 0 / **TOTAL:** 27

## Verdict

Modules **3.9-3.15** gap-cleared and verified on mosque 115.

## Gaps closed
- Duas: browse-by-category, Friday/Ramadan recommended-now, publish, insert into awrad
- Quran: MinDailyParas (<1), reminders flag, today-card, progress label
- Ritual: step imageUrl + duaId (Ghazali link)
- Janaza: mosqueSiteUrl + notify-followers intent
- Death readings: campaign/assign/complete (existing + verified)
- Participation: opportunities + register + class type
- Journey: ensure Hajj days 8-13 with duas/notes

## Results

| Id | Test | Result | Detail |
|----|------|--------|--------|
| AUTH | Logins | **PASS** | ok |
| SETUP | Modules ON | **PASS** | Duas Quran Ritual Janaza DeathReadings Participation Journey Awrad |
| D1 | Create+publish dua | **PASS** | id=20 |
| D2 | Browse by category (grouped) | **PASS** | status=200 |
| D3 | Recommended-now single dua | **PASS** | title=M39 Friday Mosque Dua |
| D4 | Curated collection + item | **PASS** | col=11 |
| D5 | Insert dua into awrad content item | **PASS** | status=200 |
| D6 | Today/home surfaces recommendedDua | **PASS** | title=M39 Friday Mosque Dua |
| Q1 | Start 30-day plan (min 0.5 para + reminders) | **PASS** | status=200 |
| Q2 | Plan progress label | **PASS** | label=1/30 todayPara=1 |
| Q3 | Today reading card | **PASS** | para=1 min=0.50 |
| Q4 | Complete today para | **PASS** | label=1/30 |
| Q5 | Update min daily + reminders | **PASS** | status=200 |
| R1 | Wudu guide with steps | **PASS** | id=8 |
| R2 | Step with imageUrl + duaId | **PASS** | status=200 |
| J1 | Admin create janaza + site url + notify | **PASS** | id=12 |
| J2 | Public janaza detail | **PASS** | status=200 |
| DR1 | Campaign + assign + complete | **PASS** | camp=11 alloc=24 |
| DR2 | Community participation view | **PASS** | status=200 |
| P1 | Admin post opportunity | **PASS** | id=7 |
| P2 | Member register interest | **PASS** | status=200 |
| P3 | Browse active opportunities | **PASS** | status=200 |
| P4 | Class-type opportunity (Classes integration) | **PASS** | status=200 id=8 |
| JG1 | List Umrah guides | **PASS** | status=200 |
| JG2 | Hajj guide days 8-13 with duas/notes | **PASS** | id=3 |
| JG3 | Umrah stages detail | **PASS** | id=1 |
| HOME | Today includes quranCard | **PASS** | paras=1/30 |
