import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// 1. ENUMS (Pilihan Status yang Dikunci Agar Tidak Salah Ketik)
// ============================================================================

export const userRoleEnum = pgEnum('user_role', [
  'OWNER',
  'PM',       // Project Manager
  'FINANCE',
  'STAFF',    // Designer, Developer, Copywriter, dll
]);

export const billingTypeEnum = pgEnum('billing_type', [
  'MILESTONE', // Pembayaran bertahap / termin (DP, Pelunasan)
  'RETAINER',  // Langganan bulanan tetap
]);

export const docStatusEnum = pgEnum('doc_status', [
  'DRAFT',     // Masih konsep, belum berpengaruh ke laporan/keuangan
  'APPROVED',  // Disetujui
  'POSTED',    // Resmi terbit & terkunci (tidak boleh diedit sembarangan)
  'PAID',      // Lunas
  'CANCELLED', // Dibatalkan
]);

export const projectStatusEnum = pgEnum('project_status', [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
]);

export const expenseCategoryEnum = pgEnum('expense_category', [
  'FREELANCER', // Bayar vendor/freelancer luar
  'ADS',        // Biaya iklan klien (Meta/Google Ads)
  'SOFTWARE',   // Beli aset, font, plugin, server khusus proyek
  'OTHER',
]);

// ============================================================================
// 2. PONDASI MULTI-TENANT & TIM INTERNAL
// ============================================================================

// Tabel Perusahaan/Agensi (Memungkinkan 1 aplikasi dipakai banyak agensi)
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabel Karyawan / Tim Agensi
// Tabel Karyawan / Tim Agensi
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').default('').notNull(), // <-- TAMBAHKAN DI SINI
  role: userRoleEnum('role').default('STAFF').notNull(),
  // Rate biaya internal perusahaan per jam (untuk menghitung HPP proyek)
  hourlyCostRate: numeric('hourly_cost_rate', { precision: 15, scale: 2 })
    .default('0')
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 3. MASTER DATA KLIEN
// ============================================================================

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  email: varchar('email', { length: 255 }),
  npwp: varchar('npwp', { length: 50 }), // Penting untuk urusan PPh 23 & Faktur Pajak
  paymentTermsDays: integer('payment_terms_days').default(14).notNull(), // Misal: NET 14 hari
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 4. ALUR PENAWARAN & OPERASIONAL PROYEK
// ============================================================================

// Dokumen Penawaran Harga / Kontrak Awal
export const quotations = pgTable('quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  clientId: uuid('client_id')
    .references(() => clients.id)
    .notNull(),
  quotationNumber: varchar('quotation_number', { length: 50 }).notNull(), // Contoh: QTN-2026-001
  title: varchar('title', { length: 255 }).notNull(),
  billingType: billingTypeEnum('billing_type').default('MILESTONE').notNull(),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  status: docStatusEnum('status').default('DRAFT').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Proyek Aktif (Terbentuk otomatis saat Quotation berstatus APPROVED)
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  quotationId: uuid('quotation_id').references(() => quotations.id),
  clientId: uuid('client_id')
    .references(() => clients.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  budgetHours: integer('budget_hours').default(0).notNull(), // Batas maksimal jam kerja tim
  startDate: date('start_date'),
  deadline: date('deadline'),
  status: projectStatusEnum('status').default('PLANNING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 5. KEUANGAN & PENAGIHAN (INVOICING)
// ============================================================================

// Tagihan Resmi ke Klien
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  clientId: uuid('client_id')
    .references(() => clients.id)
    .notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(), // Contoh: INV-2026-001
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  ppnAmount: numeric('ppn_amount', { precision: 15, scale: 2 }).default('0').notNull(),
  pph23Amount: numeric('pph23_amount', { precision: 15, scale: 2 }).default('0').notNull(), // Potongan 2% jasa
  netReceivable: numeric('net_receivable', { precision: 15, scale: 2 }).notNull(), // Uang bersih yang diterima
  status: docStatusEnum('status').default('DRAFT').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tahapan Kerja & Termin Tagihan Proyek
export const milestones = pgTable('milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(), // Contoh: "Termin 1 - DP 50%"
  billableAmount: numeric('billable_amount', { precision: 15, scale: 2 }).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  // Jika sudah terisi ID invoice, artinya termin ini sudah ditagihkan (mencegah tagihan ganda)
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 6. PENCATATAN BIAYA PROYEK (PENGGANTI KARTU STOK GUDANG)
// ============================================================================

// Log Jam Kerja Tim (Menghitung HPP Tenaga Kerja)
export const timeEntries = pgTable('time_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  workDate: date('work_date').notNull(),
  hours: numeric('hours', { precision: 5, scale: 2 }).notNull(), // Contoh: 2.50 jam
  // Menyimpan rate saat itu (Snapshot) agar data lama tidak berubah jika gaji naik
  hourlyCostRateSnapshot: numeric('hourly_cost_rate_snapshot', {
    precision: 15,
    scale: 2,
  }).notNull(),
  description: text('description'),
  isApproved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Biaya Langsung ke Pihak Ketiga (Freelancer, Ads, Lisensi)
export const projectExpenses = pgTable('project_expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  vendorName: varchar('vendor_name', { length: 255 }).notNull(),
  category: expenseCategoryEnum('category').default('FREELANCER').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  description: text('description'),
  expenseDate: date('expense_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 7. BUKU BESAR AKUNTANSI OTOMATIS (IMMUTABLE LEDGER)
// ============================================================================

// Header Jurnal Akuntansi
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  entryDate: date('entry_date').notNull(),
  referenceType: varchar('reference_type', { length: 50 }).notNull(), // 'INVOICE' | 'PAYMENT' | 'EXPENSE'
  referenceId: uuid('reference_id').notNull(), // ID dari dokumen sumbernya
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Baris Debit & Kredit (Total Debit seluruh baris wajib sama dengan Total Kredit)
export const journalLines = pgTable('journal_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalEntryId: uuid('journal_entry_id')
    .references(() => journalEntries.id, { onDelete: 'cascade' })
    .notNull(),
  accountCode: varchar('account_code', { length: 20 }).notNull(), // Misal: '1101' (Kas), '1201' (Piutang)
  accountName: varchar('account_name', { length: 100 }).notNull(),
  debit: numeric('debit', { precision: 15, scale: 2 }).default('0').notNull(),
  credit: numeric('credit', { precision: 15, scale: 2 }).default('0').notNull(),
});

// ============================================================================
// 8. RELASI DRIZZLE (Memudahkan Query Join Tanpa Tulis SQL Manual)
// ============================================================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  quotation: one(quotations, { fields: [projects.quotationId], references: [quotations.id] }),
  milestones: many(milestones),
  timeEntries: many(timeEntries),
  expenses: many(projectExpenses),
  invoices: many(invoices),
}));

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  lines: many(journalLines),
}));

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalLines.journalEntryId],
    references: [journalEntries.id],
  }),
}));