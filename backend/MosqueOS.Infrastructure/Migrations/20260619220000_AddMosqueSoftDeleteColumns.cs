using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260619220000_AddMosqueSoftDeleteColumns")]
    public partial class AddMosqueSoftDeleteColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Mosques', 'IsDeleted') IS NULL
    ALTER TABLE Mosques ADD IsDeleted bit NOT NULL CONSTRAINT DF_Mosques_IsDeleted DEFAULT 0;
IF COL_LENGTH('Mosques', 'DeletedAt') IS NULL
    ALTER TABLE Mosques ADD DeletedAt datetime2 NULL;
IF COL_LENGTH('Mosques', 'DeletedById') IS NULL
    ALTER TABLE Mosques ADD DeletedById nvarchar(450) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Mosques', 'DeletedById') IS NOT NULL
    ALTER TABLE Mosques DROP COLUMN DeletedById;
IF COL_LENGTH('Mosques', 'DeletedAt') IS NOT NULL
    ALTER TABLE Mosques DROP COLUMN DeletedAt;
IF COL_LENGTH('Mosques', 'IsDeleted') IS NOT NULL
    ALTER TABLE Mosques DROP CONSTRAINT DF_Mosques_IsDeleted;
IF COL_LENGTH('Mosques', 'IsDeleted') IS NOT NULL
    ALTER TABLE Mosques DROP COLUMN IsDeleted;
");
        }
    }
}
