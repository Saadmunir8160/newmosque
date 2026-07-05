using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260626000000_AddNavigationRequiresActiveMosque")]
    public partial class AddNavigationRequiresActiveMosque : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('NavigationMenuItems', 'RequiresActiveMosque') IS NULL
BEGIN
    ALTER TABLE NavigationMenuItems ADD RequiresActiveMosque bit NOT NULL
        CONSTRAINT DF_NavigationMenuItems_RequiresActiveMosque DEFAULT 0;
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('NavigationMenuItems', 'RequiresActiveMosque') IS NOT NULL
BEGIN
    ALTER TABLE NavigationMenuItems DROP CONSTRAINT DF_NavigationMenuItems_RequiresActiveMosque;
    ALTER TABLE NavigationMenuItems DROP COLUMN RequiresActiveMosque;
END
");
        }
    }
}
