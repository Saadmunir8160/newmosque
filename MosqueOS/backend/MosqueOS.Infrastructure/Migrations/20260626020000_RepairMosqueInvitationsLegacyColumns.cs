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
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'MosqueInvitations', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('MosqueInvitations', 'Email') IS NOT NULL
       AND COL_LENGTH('MosqueInvitations', 'InviteEmail') IS NOT NULL
    BEGIN
        UPDATE MosqueInvitations
        SET InviteEmail = Email
        WHERE (InviteEmail IS NULL OR InviteEmail = N'')
          AND Email IS NOT NULL AND Email <> N'';
    END

    IF COL_LENGTH('MosqueInvitations', 'Email') IS NOT NULL
        ALTER TABLE MosqueInvitations DROP COLUMN Email;

    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MosqueInvitations_TokenHash' AND object_id = OBJECT_ID('MosqueInvitations'))
        DROP INDEX IX_MosqueInvitations_TokenHash ON MosqueInvitations;

    IF COL_LENGTH('MosqueInvitations', 'TokenHash') IS NOT NULL
        ALTER TABLE MosqueInvitations DROP COLUMN TokenHash;
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Legacy columns are not restored — they conflict with the current entity model.
        }
    }
}
