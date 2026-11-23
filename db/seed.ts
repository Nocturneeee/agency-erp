import 'dotenv/config';
import { db } from './index';
import { organizations, users, clients, quotations } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Memulai proses seeding database Agency ERP...');

  // 1. Ambil atau buat Organisasi / Agensi Contoh
  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Nusantara Creative Studio',
      slug: 'nusantara-creative',
    })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: { name: 'Nusantara Creative Studio' },
    })
    .returning();

  // 2. Buat / Perbarui Tim Internal dengan Password Terenkripsi ('password123')
  const defaultPassword = await bcrypt.hash('password123', 10);

  const teamMembers = [
    {
      organizationId: org.id,
      name: 'Raka Pratama',
      email: 'raka@nusantaracreative.id',
      passwordHash: defaultPassword,
      role: 'OWNER' as const,
      hourlyCostRate: '250000.00',
    },
    {
      organizationId: org.id,
      name: 'Sinta Wijaya',
      email: 'finance@nusantaracreative.id',
      passwordHash: defaultPassword,
      role: 'FINANCE' as const,
      hourlyCostRate: '150000.00',
    },
    {
      organizationId: org.id,
      name: 'Nadia Putri',
      email: 'nadia@nusantaracreative.id',
      passwordHash: defaultPassword,
      role: 'STAFF' as const,
      hourlyCostRate: '120000.00',
    },
  ];

  for (const member of teamMembers) {
    await db
      .insert(users)
      .values(member)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash: defaultPassword,
          role: member.role,
        },
      });
  }

  // 3 & 4. Buat Klien & Quotation Contoh hanya jika belum ada di database
  const [existingQuote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.quotationNumber, 'QTN-2026-001'));

  if (!existingQuote) {
    const [client] = await db
      .insert(clients)
      .values({
        organizationId: org.id,
        companyName: 'PT Maju Bersama Digital',
        contactPerson: 'Budi Santoso',
        email: 'finance@majubersama.co.id',
        npwp: '01.234.567.8-901.000',
        paymentTermsDays: 14,
      })
      .returning();

    await db.insert(quotations).values({
      organizationId: org.id,
      clientId: client.id,
      quotationNumber: 'QTN-2026-001',
      title: 'Redesign Website & Brand Identity',
      billingType: 'MILESTONE',
      totalAmount: '30000000.00',
      status: 'DRAFT',
    });
  }

  console.log('Seeding selesai! Semua akun demo menggunakan password: password123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Gagal melakukan seeding:', err);
  process.exit(1);
});