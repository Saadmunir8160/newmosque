-- Module 3.10: configurable min daily para + reminders on QuranPlans
IF COL_LENGTH('dbo.QuranPlans', 'MinDailyParas') IS NULL
BEGIN
    ALTER TABLE dbo.QuranPlans ADD MinDailyParas decimal(5,2) NOT NULL CONSTRAINT DF_QuranPlans_MinDailyParas DEFAULT (1);
END
GO
IF COL_LENGTH('dbo.QuranPlans', 'RemindersEnabled') IS NULL
BEGIN
    ALTER TABLE dbo.QuranPlans ADD RemindersEnabled bit NOT NULL CONSTRAINT DF_QuranPlans_RemindersEnabled DEFAULT (0);
END
GO
