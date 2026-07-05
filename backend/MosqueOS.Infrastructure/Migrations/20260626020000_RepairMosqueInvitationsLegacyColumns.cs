using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260626020000_RepairMosqueInvitationsLegacyColumns")]
    public partial class RepairMosqueInvitationsLegacyColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Uses dynamic SQL: column names are resolved at runtime, not batch-parse time,
            // since 'Email'/'TokenHash' never exist on a fresh database and SQL Server would
            // otherwise reject the batch even inside an IF guard.
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'MosqueInvitations', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('MosqueInvitations', 'Email') IS NOT NULL
       AND COL_LENGTH('MosqueInvitations', 'InviteEmail') IS NOT NULL
    BEGIN
        EXEC(N'UPDATE MosqueInvitations SET InviteEmail = Email WHERE (InviteEmail IS NULL OR InviteEmail = N'''') AND Email IS NOT NULL AND Email <> N'''';');
    END

    IF COL_LENGTH('MosqueInvitations', 'Email') IS NOT NULL
        EXEC('ALTER TABLE MosqueInvitations DROP COLUMN Email;');

    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MosqueInvitations_TokenHash' AND object_id = OBJECT_ID('MosqueInvitations'))
        EXEC('DROP INDEX IX_MosqueInvitations_TokenHash ON MosqueInvitations;');

    IF COL_LENGTH('MosqueInvitations', 'TokenHash') IS NOT NULL
        EXEC('ALTER TABLE MosqueInvitations DROP COLUMN TokenHash;');
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Legacy columns are not restored — they conflict with the current entity model.
        }
    }
}
