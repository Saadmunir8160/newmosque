using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260617200000_AddContentEditorModule")]
    public partial class AddContentEditorModule : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Status", table: "WirdCollections",
                type: "int", nullable: false, defaultValue: 3);
            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt", table: "WirdCollections",
                type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "PublishedById", table: "WirdCollections",
                type: "nvarchar(450)", nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status", table: "ContentItems",
                type: "int", nullable: false, defaultValue: 3);
            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt", table: "ContentItems",
                type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "PublishedById", table: "ContentItems",
                type: "nvarchar(450)", nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status", table: "Duas",
                type: "int", nullable: false, defaultValue: 3);
            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt", table: "Duas",
                type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "PublishedById", table: "Duas",
                type: "nvarchar(450)", nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status", table: "AdhkarItems",
                type: "int", nullable: false, defaultValue: 3);
            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt", table: "AdhkarItems",
                type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "PublishedById", table: "AdhkarItems",
                type: "nvarchar(450)", nullable: true);

            migrationBuilder.CreateTable(
                name: "ContentArticles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ItemType = table.Column<int>(type: "int", nullable: false),
                    ResourceUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PublishedById = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    AuthorId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedById = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table => table.PrimaryKey("PK_ContentArticles", x => x.Id));

            migrationBuilder.CreateTable(
                name: "MediaAssets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MediaType = table.Column<int>(type: "int", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedById = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedById = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table => table.PrimaryKey("PK_MediaAssets", x => x.Id));

            migrationBuilder.CreateTable(
                name: "ContentWorkflowLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntityType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: false),
                    FromStatus = table.Column<int>(type: "int", nullable: false),
                    ToStatus = table.Column<int>(type: "int", nullable: false),
                    ActorId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Comment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedById = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table => table.PrimaryKey("PK_ContentWorkflowLogs", x => x.Id));
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ContentWorkflowLogs");
            migrationBuilder.DropTable(name: "MediaAssets");
            migrationBuilder.DropTable(name: "ContentArticles");
            migrationBuilder.DropColumn(name: "Status", table: "AdhkarItems");
            migrationBuilder.DropColumn(name: "PublishedAt", table: "AdhkarItems");
            migrationBuilder.DropColumn(name: "PublishedById", table: "AdhkarItems");
            migrationBuilder.DropColumn(name: "Status", table: "Duas");
            migrationBuilder.DropColumn(name: "PublishedAt", table: "Duas");
            migrationBuilder.DropColumn(name: "PublishedById", table: "Duas");
            migrationBuilder.DropColumn(name: "Status", table: "ContentItems");
            migrationBuilder.DropColumn(name: "PublishedAt", table: "ContentItems");
            migrationBuilder.DropColumn(name: "PublishedById", table: "ContentItems");
            migrationBuilder.DropColumn(name: "Status", table: "WirdCollections");
            migrationBuilder.DropColumn(name: "PublishedAt", table: "WirdCollections");
            migrationBuilder.DropColumn(name: "PublishedById", table: "WirdCollections");
        }
    }
}
