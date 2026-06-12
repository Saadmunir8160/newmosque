SSMS Setup — localhost\SQLEXPRESS
==================================

Your SSMS:  localhost\SQLEXPRESS  →  database mos_db

IMPORTANT — two different schemas
---------------------------------
  mos_db_tsql.sql tables:     janaza_announcements  (GUID ids)
  MosqueOS app tables:        JanazaAnnouncements   (int ids, EF Core)

The app does NOT write to janaza_announcements.
Posts from the app go to JanazaAnnouncements after setup below.

ONE-TIME SETUP (SSMS)
---------------------
1. Open SSMS → connect to localhost\SQLEXPRESS
2. Open file: setup-sqlexpress-for-app.sql
3. Execute (F5)
   - Your old script DB becomes mos_db_script (backup)
   - New empty mos_db is created for the app

4. Start API:
   cd MosqueOS\backend
   dotnet run --project MosqueOS.API --urls http://localhost:5000

5. Verify in SSMS:
   USE mos_db;
   SELECT name FROM sys.tables ORDER BY name;
   -- You should see JanazaAnnouncements, AspNetUsers, Mosques, etc.

6. Post janaza from app → then:
   SELECT * FROM JanazaAnnouncements ORDER BY Id DESC;

CONNECTION STRING (already set in appsettings.json)
---------------------------------------------------
  Server=.\\SQLEXPRESS;Database=mos_db;Trusted_Connection=True;...

If SQL Express instance name is different, change Server= in:
  MosqueOS.API/appsettings.json
  MosqueOS.API/appsettings.Development.json
