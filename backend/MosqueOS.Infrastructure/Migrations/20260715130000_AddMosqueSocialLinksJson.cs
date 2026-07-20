using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260715130000_AddMosqueSocialLinksJson")]
    public partial class AddMosqueSocialLinksJson : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Mosques', 'SocialLinksJson') IS NULL
    ALTER TABLE Mosques ADD SocialLinksJson nvarchar(max) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Mosques', 'SocialLinksJson') IS NOT NULL
    ALTER TABLE Mosques DROP COLUMN SocialLinksJson;
");
        }
    }
}
