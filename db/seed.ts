import 'dotenv/config';
import { db } from './index';
import { organizations, users, clients, quotations } from './schema';

async function seed() {
  console.log('Memulai proses seeding database Agency ERP...');

  // 1. Buat Organisasi / Agensi Contoh
  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Nusantara Creative Studio',
      slug: 'nusantara-creative',
    })
    .returning();

  // 2. Buat Tim Internal (Owner & Staff dengan rate biaya per jam)
  await db.insert(users).values([
    {
      organizationId: org.id,
      name: 'Raka Pratama',
      email: 'raka@nusantaracreative.id',
      role: 'OWNER',
      hourlyCostRate: '250000.00',
    },
    {
      organizationId: org.id,
      name: 'Nadia Putri',
      email: 'nadia@nusantaracreative.id',
      role: 'STAFF',
      hourlyCostRate: '120000.00',
    },
  ]);

  // 3. Buat Master Data Klien
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

  // 4. Buat 1 Quotation DRAFT Siap Uji Coba
  const [quote] = await db
    .insert(quotations)
    .values({
      organizationId: org.id,
      clientId: client.id,
      quotationNumber: 'QTN-2026-001',
      title: 'Redesign Website & Brand Identity',
      billingType: 'MILESTONE',
      totalAmount: '30000000.00', // Rp 30.000.000
      status: 'DRAFT',
    })
    .returning();

  console.log('Seeding selesai!');
  console.log({
    organizationId: org.id,
    sampleQuotationId: quote.id,
  });

  process.exit(0);
}

seed().catch((err) => {
  console.error('Gagal melakukan seeding:', err);
  process.exit(1);
});