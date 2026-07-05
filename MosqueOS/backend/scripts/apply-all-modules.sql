-- Apply all module schema updates to mos_db (idempotent)
-- Run: sqlcmd -S .\SQLEXPRESS -d mos_db -E -i apply-all-modules.sql

:r teacher-module.sql
GO
:r muqaddam-module.sql
GO
:r prayer-editor-module.sql
GO
:r content-editor-module.sql
GO
:r ritual-guide-workflow.sql
GO
:r janaza-module.sql
GO
:r death-readings-monitor.sql
GO
:r platform-settings.sql
GO
:r member-event-registrations.sql
GO

PRINT 'All module scripts applied.';
