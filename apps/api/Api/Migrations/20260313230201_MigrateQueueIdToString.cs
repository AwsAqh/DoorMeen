using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Api.Migrations
{
    /// <inheritdoc />
    public partial class MigrateQueueIdToString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop related foreign keys and primary keys
            migrationBuilder.Sql("ALTER TABLE \"queue_customers\" DROP CONSTRAINT IF EXISTS \"FK_queue_customers_Queues_QueueId\";");
            migrationBuilder.Sql("ALTER TABLE \"Queues\" DROP CONSTRAINT IF EXISTS \"PK_Queues\" CASCADE;");
            
            // For Postgres, an identity sequence restricts type changes; drop the default/identity
            migrationBuilder.Sql("ALTER TABLE \"Queues\" ALTER COLUMN \"Id\" DROP IDENTITY IF EXISTS;");
            
            // Perform explicit type casting using 'USING'
            migrationBuilder.Sql("ALTER TABLE \"Queues\" ALTER COLUMN \"Id\" TYPE character varying(26) USING \"Id\"::character varying(26);");
            migrationBuilder.Sql("ALTER TABLE \"queue_customers\" ALTER COLUMN \"QueueId\" TYPE character varying(26) USING \"QueueId\"::character varying(26);");
            
            // Re-create the primary key and foreign key constraint
            migrationBuilder.Sql("ALTER TABLE \"Queues\" ADD CONSTRAINT \"PK_Queues\" PRIMARY KEY (\"Id\");");
            migrationBuilder.Sql("ALTER TABLE \"queue_customers\" ADD CONSTRAINT \"FK_queue_customers_Queues_QueueId\" FOREIGN KEY (\"QueueId\") REFERENCES \"Queues\" (\"Id\") ON DELETE CASCADE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "Queues",
                type: "integer",
                maxLength: 26,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(26)",
                oldMaxLength: 26)
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<int>(
                name: "QueueId",
                table: "queue_customers",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(26)");
        }
    }
}
