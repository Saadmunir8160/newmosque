using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemovePendingVerificationStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Mosques SET Status = 0 WHERE Status = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
