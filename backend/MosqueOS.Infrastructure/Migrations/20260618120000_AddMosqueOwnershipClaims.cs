using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260618120000_AddMosqueOwnershipClaims")]
    public partial class AddMosqueOwnershipClaims : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MosqueOwnershipClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MosqueId = table.Column<int>(type: "int", nullable: false),
                    ClaimantId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    RejectionReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedById = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedById = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MosqueOwnershipClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MosqueOwnershipClaims_AspNetUsers_ClaimantId",
                        column: x => x.ClaimantId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MosqueOwnershipClaims_Mosques_MosqueId",
                        column: x => x.MosqueId,
                        principalTable: "Mosques",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MosqueOwnershipClaims_ClaimantId",
                table: "MosqueOwnershipClaims",
                column: "ClaimantId");

            migrationBuilder.CreateIndex(
                name: "IX_MosqueOwnershipClaims_MosqueId_Status",
                table: "MosqueOwnershipClaims",
                columns: new[] { "MosqueId", "Status" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "MosqueOwnershipClaims");
        }
    }
}
