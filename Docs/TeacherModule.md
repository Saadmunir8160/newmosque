# Teacher Module

Role: **Teacher** — manage assigned classes and students only.

**Demo login:** `teacher` / `Teacher@123`

## Sidebar

| Section | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/dashboard/teacher` | KPIs, quick links, recent activity |
| My Classes | `/dashboard/teacher/classes` | View assigned classes and enrolled students |
| Attendance | `/dashboard/teacher/attendance` | Present / Absent / Late |
| Student Progress | `/dashboard/teacher/progress` | Quran, memorization, exams, teacher notes |
| Assignments | `/dashboard/teacher/assignments` | Homework, resources, grading |
| Reports | `/dashboard/teacher/reports` | Class attendance summaries + CSV export |

## Permissions (RBAC)

**Can:**
- `teacher.classes.manage` — Own assigned classes
- `teacher.students.manage` — Students in own classes

**Cannot:**
- Manage mosque profile or settings
- Manage users or global roles
- Access other teachers' classes (enforced via `TeacherAccessHelper`)

## API Endpoints

Base: `api/v1/teacher`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Teacher-scoped stats and activity |
| GET | `/classes` | Assigned classes (`?search=`) |
| GET | `/classes/{id}` | Single class with enrolments |
| GET | `/classes/{id}/students` | Students in class |
| GET/POST | `/classes/{id}/sessions` | Attendance sessions |
| POST | `/sessions/{id}/attendance` | Record present/absent/late |
| GET/POST | `/students/{id}/progress` | Progress records + notes |
| GET/POST | `/classes/{id}/assignments` | Homework CRUD |
| PUT | `/assignments/{id}/grades/{studentId}` | Grade assignment |
| GET | `/reports` | Attendance report per class |

Legacy madrassah endpoints (`api/v1/madrassah`) remain for mosque admin.

## Database Tables

| Table | Purpose |
|-------|---------|
| `Students` | Student profiles |
| `MadrassahClasses` | Classes (`TeacherId` → teacher user) |
| `Enrolments` | Student ↔ class |
| `AttendanceSessions` | Daily/session attendance |
| `AttendanceRecords` | Per-student status (Present/Absent/Late) |
| `ProgressNotes` | Free-text teacher notes |
| `StudentProgressRecords` | Structured Quran/memorization/exam progress |
| `ClassAssignments` | Homework with resource links |
| `AssignmentGrades` | Per-student grades and feedback |

Migration: `20260617160000_AddTeacherModule.cs`  
Manual script: `backend/scripts/teacher-module.sql`

## Frontend Structure

```
frontend/src/app/
  core/config/teacher-nav.config.ts
  core/services/teacher.service.ts
  modules/teacher/
    teacher.routes.ts
    teacher-dashboard.component.ts
    teacher-classes.component.ts
    teacher-attendance.component.ts
    teacher-progress.component.ts
    teacher-assignments.component.ts
    teacher-reports.component.ts
```

Lazy-loaded via `teacher.routes.ts`. Shell uses `navIsTeacher()` for dedicated sidebar.

## Run

```powershell
cd backend/scripts; .\run-api.ps1
cd frontend; npm start
```

- App: http://localhost:4200
- Login as `teacher` / `Teacher@123` → `/dashboard/teacher`
