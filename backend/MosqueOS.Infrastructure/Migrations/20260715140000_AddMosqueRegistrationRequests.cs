using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260715140000_AddMosqueRegistrationRequests")]
    public partial class AddMosqueRegistrationRequests : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'mosque_registration_requests', N'U') IS NULL
BEGIN
    CREATE TABLE mosque_registration_requests (
        Id int NOT NULL IDENTITY(1,1),
        Name nvarchar(200) NOT NULL,
        Address nvarchar(500) NOT NULL,
        City nvarchar(100) NOT NULL,
        Country nvarchar(100) NOT NULL,
        Phone nvarchar(50) NULL,
        Email nvarchar(200) NULL,
        Website nvarchar(300) NULL,
        Description nvarchar(max) NULL,
        Status int NOT NULL,
        SubmittedById nvarchar(450) NOT NULL,
        ApprovedAt datetime2 NULL,
        RejectionReason nvarchar(max) NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_mosque_reg_IsDeleted DEFAULT(0),
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL,
        CONSTRAINT PK_mosque_registration_requests PRIMARY KEY (Id),
        CONSTRAINT FK_mosque_registration_requests_AspNetUsers_SubmittedById
            FOREIGN KEY (SubmittedById) REFERENCES AspNetUsers(Id) ON DELETE NO ACTION
    );
    CREATE INDEX IX_mosque_registration_requests_SubmittedById ON mosque_registration_requests(SubmittedById);
    CREATE INDEX IX_mosque_registration_requests_Status ON mosque_registration_requests(Status);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'mosque_registration_requests', N'U') IS NOT NULL
    DROP TABLE mosque_registration_requests;
");
        }
    }
}
