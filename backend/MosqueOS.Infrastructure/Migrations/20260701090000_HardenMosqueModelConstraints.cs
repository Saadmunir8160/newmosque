using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    public partial class HardenMosqueModelConstraints : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Mosques_Slug",
                table: "Mosques");

            migrationBuilder.AlterColumn<string>(
                name: "Timezone",
                table: "Mosques",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Europe/London",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "Mosques",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Mosques",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "City",
                table: "Mosques",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Country",
                table: "Mosques",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "United Kingdom",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Address",
                table: "Mosques",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Postcode",
                table: "Mosques",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Mosques",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Mosques",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Website",
                table: "Mosques",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LogoUrl",
                table: "Mosques",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "BannerUrl",
                table: "Mosques",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ModuleKey",
                table: "MosqueSettings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_Mosques_Slug",
                table: "Mosques",
                column: "Slug",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Mosques_Status_City",
                table: "Mosques",
                columns: new[] { "Status", "City" });

            migrationBuilder.DropIndex(
                name: "IX_Mosques_OwnerId",
                table: "Mosques");

            migrationBuilder.CreateIndex(
                name: "IX_Mosques_OwnerId",
                table: "Mosques",
                column: "OwnerId",
                filter: "[OwnerId] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Mosques_Status",
                table: "Mosques",
                sql: "[Status] BETWEEN 0 AND 7");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Mosques_Latitude",
                table: "Mosques",
                sql: "[Latitude] IS NULL OR ([Latitude] >= -90 AND [Latitude] <= 90)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Mosques_Longitude",
                table: "Mosques",
                sql: "[Longitude] IS NULL OR ([Longitude] >= -180 AND [Longitude] <= 180)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Mosques_EstablishedYear",
                table: "Mosques",
                sql: "[EstablishedYear] IS NULL OR ([EstablishedYear] >= 600 AND [EstablishedYear] <= 2100)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Mosques_Capacity",
                table: "Mosques",
                sql: "[Capacity] IS NULL OR [Capacity] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Mosques_Timezone_NotBlank",
                table: "Mosques",
                sql: "LEN(LTRIM(RTRIM([Timezone]))) > 0");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(name: "CK_Mosques_Status", table: "Mosques");
            migrationBuilder.DropCheckConstraint(name: "CK_Mosques_Latitude", table: "Mosques");
            migrationBuilder.DropCheckConstraint(name: "CK_Mosques_Longitude", table: "Mosques");
            migrationBuilder.DropCheckConstraint(name: "CK_Mosques_EstablishedYear", table: "Mosques");
            migrationBuilder.DropCheckConstraint(name: "CK_Mosques_Capacity", table: "Mosques");
            migrationBuilder.DropCheckConstraint(name: "CK_Mosques_Timezone_NotBlank", table: "Mosques");

            migrationBuilder.DropIndex(name: "IX_Mosques_Slug", table: "Mosques");
            migrationBuilder.DropIndex(name: "IX_Mosques_Status_City", table: "Mosques");
            migrationBuilder.DropIndex(name: "IX_Mosques_OwnerId", table: "Mosques");

            migrationBuilder.AlterColumn<string>(
                name: "Timezone",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64,
                oldDefaultValue: "Europe/London");

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "Mosques",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "City",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Country",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldDefaultValue: "United Kingdom");

            migrationBuilder.AlterColumn<string>(
                name: "Address",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(300)",
                oldMaxLength: 300);

            migrationBuilder.AlterColumn<string>(
                name: "Postcode",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Website",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(300)",
                oldMaxLength: 300,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LogoUrl",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "BannerUrl",
                table: "Mosques",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ModuleKey",
                table: "MosqueSettings",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.CreateIndex(
                name: "IX_Mosques_Slug",
                table: "Mosques",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Mosques_OwnerId",
                table: "Mosques",
                column: "OwnerId");
        }
    }
}
