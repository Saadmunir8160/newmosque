using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    public partial class AddMosqueGeoFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Mosques",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Mosques",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MapLocation",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Latitude", table: "Mosques");
            migrationBuilder.DropColumn(name: "Longitude", table: "Mosques");
            migrationBuilder.DropColumn(name: "MapLocation", table: "Mosques");
        }
    }
}
