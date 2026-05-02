using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api.Migrations
{
    /// <inheritdoc />
    public partial class PremiumFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeSpan>(
                name: "DailyResetTime",
                table: "Queues",
                type: "interval",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsNextNotificationSent",
                table: "queue_customers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DailyResetTime",
                table: "Queues");

            migrationBuilder.DropColumn(
                name: "IsNextNotificationSent",
                table: "queue_customers");
        }
    }
}
