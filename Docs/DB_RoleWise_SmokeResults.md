# MosqueOS — Database + Role-Wise Smoke Results

**Date:** 2026-08-05  
**Mosque:** 115 Masjid Al-Noor Bradford (restored from soft-delete)  
**PASS:** 38 · **FAIL:** 0 · **TOTAL:** 38

> After restoring `Mosques.IsDeleted=0` for id 115, OW2 (Owner flag toggle) and GU1 (public profile) also passed.

| Role | Id | Test | Result | Detail |
|------|----|------|--------|--------|
| SuperAdmin | SA1 | Login | **PASS** | token=True |
| SuperAdmin | SA2 | Platform dashboard | **PASS** | status=200 |
| SuperAdmin | SA3 | Users | **PASS** | status=200 |
| SuperAdmin | SA4 | Mosque 115 settings | **PASS** | status=200 |
| Owner | OW1 | Login | **PASS** | |
| Owner | OW2 | Toggle Events flag ON | **PASS** | status=200 (after undelete) |
| Owner | OW3 | Create event | **PASS** | status=201 |
| Owner | OW4 | List templates | **PASS** | status=200 |
| MosqueAdmin | MA1 | Login | **PASS** | |
| MosqueAdmin | MA2 | Create announcement | **PASS** | status=201 |
| MosqueAdmin | MA3 | List students | **PASS** | status=200 |
| PrayerEditor | PE1 | Login | **PASS** | |
| PrayerEditor | PE2 | GET daily | **PASS** | status=200 |
| PrayerEditor | PE3 | Templates DENIED | **PASS** | status=403 |
| PrayerEditor | PE4 | Audit log | **PASS** | status=200 |
| Teacher | TE1 | Login | **PASS** | |
| Teacher | TE2 | Classes | **PASS** | status=200 |
| Teacher | TE3 | Fees DENIED | **PASS** | status=403 |
| Teacher | TE4 | Participation regs | **PASS** | status=200 |
| Parent | PA1 | Login | **PASS** | |
| Parent | PA2 | My children | **PASS** | status=200 |
| Muqaddam | MQ1 | Login | **PASS** | |
| Muqaddam | MQ2 | Murids | **PASS** | status=200 |
| Muqaddam | MQ3 | Awrad collections | **PASS** | status=200 |
| Muqaddam | MQ4 | Community post allowed | **PASS** | status=200 |
| ContentEditor | CE1 | Login | **PASS** | |
| ContentEditor | CE2 | Duas library | **PASS** | status=200 |
| Member | ME1 | Login | **PASS** | |
| Member | ME2 | My wird schedule (DB filled) | **PASS** | status=200 |
| Member | ME3 | My adhkar | **PASS** | status=200 |
| Member | ME4 | Quran plan | **PASS** | status=200 |
| Member | ME5 | Community post DENIED | **PASS** | status=403 |
| Member | ME6 | My participation (DB reg) | **PASS** | status=200 |
| Guest | GU1 | Public mosque profile | **PASS** | status=200 (after undelete) |
| Guest | GU2 | Public prayer times | **PASS** | status=200 |
| Guest | GU3 | Ritual guides | **PASS** | status=200 |
| Guest | GU4 | Journey guides | **PASS** | status=200 |
| Guest | GU5 | Janaza public | **PASS** | status=200 |

See also: [DB_RoleWise_Verification_And_Workflow.md](./DB_RoleWise_Verification_And_Workflow.md)
