using Api.Infrastructuer;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api.Migrations
{
    [DbContext(typeof(DoorMeenDbContext))]
    [Migration("20261102120000_AddQueuePushNotifications")]
    public partial class AddQueuePushNotifications : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(name: "PushToken", table: "queue_customers", type: "character varying(256)", maxLength: 256, nullable: true);
            migrationBuilder.AddColumn<int>(name: "NotifyWhenRemaining", table: "queue_customers", type: "integer", nullable: true);
            migrationBuilder.AddColumn<bool>(name: "IsThresholdPushSent", table: "queue_customers", type: "boolean", nullable: false, defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "PushToken", table: "queue_customers");
            migrationBuilder.DropColumn(name: "NotifyWhenRemaining", table: "queue_customers");
            migrationBuilder.DropColumn(name: "IsThresholdPushSent", table: "queue_customers");
        }
    }
}
