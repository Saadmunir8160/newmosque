using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMosqueClaimRequestFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentUrl",
                table: "MosqueOwnershipClaims",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FullName",
                table: "MosqueOwnershipClaims",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "MosqueOwnershipClaims",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Position",
                table: "MosqueOwnershipClaims",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "DocumentUrl", table: "MosqueOwnershipClaims");
            migrationBuilder.DropColumn(name: "FullName", table: "MosqueOwnershipClaims");
            migrationBuilder.DropColumn(name: "Phone", table: "MosqueOwnershipClaims");
            migrationBuilder.DropColumn(name: "Position", table: "MosqueOwnershipClaims");
        }
    }
}
