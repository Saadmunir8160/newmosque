MOS Database — SQL Express (localhost\SQLEXPRESS)
=================================================

ACTIVE DATABASE FOR THE APP
  Server:   localhost\SQLEXPRESS  (or .\SQLEXPRESS)
  Database: mos_db

Connection string (appsettings.json):
  Server=.\\SQLEXPRESS;Database=mos_db;Trusted_Connection=True;...

TABLES TO CHECK IN SSMS
  JanazaAnnouncements   ← app janaza posts go here
  Announcements
  AspNetUsers
  Mosques
  Events
  (52+ tables total)

NOT USED BY THE APP
  mos_db_script database — old SQL script schema (janaza_announcements, etc.)

VERIFY DATA
  USE mos_db;
  SELECT * FROM JanazaAnnouncements ORDER BY Id DESC;
  SELECT UserName FROM AspNetUsers;

START API (creates tables + seed on first run)
  cd MosqueOS\backend\scripts
  .\run-api.ps1

  Or manually:
  cd MosqueOS\backend\MosqueOS.API
  dotnet run --urls http://localhost:5000

BUILD (auto-stops running API on Windows to avoid MSB3027 file-lock errors)
  cd MosqueOS\backend\MosqueOS.API
  dotnet build

STOP API manually
  cd MosqueOS\backend\scripts
  .\stop-api.ps1
