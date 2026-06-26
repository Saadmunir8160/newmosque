using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [Migration("20260619120000_AddMosqueCityIndex")]
    public partial class AddMosqueCityIndex : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Mosques_City",
                table: "Mosques",
                column: "City");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Mosques_City",
                table: "Mosques");
        }
    }
}
