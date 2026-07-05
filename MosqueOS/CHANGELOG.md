# Changelog

All notable changes to this project are documented in this file.

## 2026-06-16

### Added
- Enterprise-grade Super Admin dashboard sections (health score, action center, analytics snapshots, queue/security/content/audit insights).
- Extended mosque listings management for Super Admin with rich filters, duplicate detection hints, bulk actions, and dedicated detail/edit screens.
- New mosque metadata fields in backend domain and database migration support (`MapLocation`, `Latitude`, `Longitude`).
- Utility support for mosque status mapping in frontend.

### Changed
- Platform dashboard API payload expanded for new KPI, chart, notification, and system monitoring data.
- Super mosques UI redesigned to support advanced moderation and management workflows.
- Login UI redesigned to premium glassmorphism theme with Islamic visual language and improved error/input states.
- Signup/Register page aligned to the same premium login-style theme for visual consistency.

### Notes
- Authentication flow/logic remains unchanged; only UI/UX styling was updated for login and signup.
- Changes pushed to both `main` and `Development` branches in repository history.
