using Microsoft.EntityFrameworkCore;
using Api.models;
namespace Api.Infrastructuer
{
    public class DoorMeenDbContext:DbContext
    {

        public DoorMeenDbContext(DbContextOptions<DoorMeenDbContext> options) : base(options) { }

        public DbSet<QueueItem> Queues { get; set; }
        public DbSet <QueueCustomer> QueueCustomers { get; set; }
        protected override void OnModelCreating(ModelBuilder b)
        {
            b.Entity<QueueItem>(e =>
            {
                e.ToTable("Queues");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasMaxLength(26);
                e.Property(x => x.Name).HasMaxLength(120);
                e.Property(x => x.HashedPassword).HasMaxLength(200);
                e.HasIndex(x => x.CreatedAt);


            });
            b.Entity<QueueCustomer>(e =>
            {
                e.ToTable("queue_customers");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasMaxLength(36);
                e.Property(x => x.QueueId).IsRequired();
                e.Property(x => x.Name).HasMaxLength(120).IsRequired();
                e.Property(x => x.Phone).HasMaxLength(32);
                e.Property(x => x.State).HasMaxLength(20);
                e.Property(x=>x.Email).HasMaxLength(120);
                e.Property(x=>x.EmailVerificationTokenHash).HasMaxLength(200);
                e.Property(x=>x.EmailVerificationTokenExpiry).HasColumnType("timestamp with time zone");
                e.Property(x=>x.IsEmailVerified).HasColumnType("boolean");
                e.Property(x => x.CreatedAt)
                 .HasColumnType("timestamp with time zone")
                 .HasDefaultValueSql("now() at time zone 'utc'");

                e.HasOne(x => x.Queue)
                 .WithMany(q => q.Customers)
                 .HasForeignKey(x => x.QueueId)
                 .OnDelete(DeleteBehavior.Cascade);

                e.HasIndex(x => new { x.QueueId, x.State, x.CreatedAt }); // fast FIFO “next”
                

            });
        }

    }
}
