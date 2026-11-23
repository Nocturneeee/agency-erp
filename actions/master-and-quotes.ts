'use server';

import { db } from '@/db';
import { clients, users, quotations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth';

// ============================================================================
// 1. CREATE CLIENT ACTION
// ============================================================================
const createClientSchema = z.object({
  companyName: z.string().min(1, 'Nama perusahaan wajib diisi'),
  contactPerson: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  npwp: z.string().optional(),
  paymentTermsDays: z.number().int().min(0).default(14),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export async function createClientAction(rawInput: CreateClientInput, currentOrgId: string) {
  await requireRole(['OWNER', 'PM', 'FINANCE']);
  const parsed = createClientSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { companyName, contactPerson, email, npwp, paymentTermsDays } = parsed.data;

  try {
    const [newClient] = await db
      .insert(clients)
      .values({
        organizationId: currentOrgId,
        companyName,
        contactPerson: contactPerson || null,
        email: email || null,
        npwp: npwp || null,
        paymentTermsDays,
      })
      .returning();

    revalidatePath('/');
    return { success: true, clientId: newClient.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat klien baru.';
    return { success: false, error: message };
  }
}

// ============================================================================
// 2. CREATE USER ACTION
// ============================================================================
const createUserSchema = z.object({
  name: z.string().min(1, 'Nama staf/tim wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['OWNER', 'PM', 'FINANCE', 'STAFF']),
  hourlyCostRate: z.number().min(0, 'Biaya per jam minimal 0'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function createUserAction(rawInput: CreateUserInput, currentOrgId: string) {
  await requireRole(['OWNER', 'PM']);
  const parsed = createUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, email, role, hourlyCostRate } = parsed.data;

  try {
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    const [newUser] = await db
      .insert(users)
      .values({
        organizationId: currentOrgId,
        name,
        email,
        passwordHash: defaultPasswordHash,
        role,
        hourlyCostRate: hourlyCostRate.toFixed(2),
      })
      .returning();

    revalidatePath('/');
    return { success: true, userId: newUser.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat pengguna/staf baru.';
    return { success: false, error: message };
  }
}

// ============================================================================
// 3. CREATE QUOTATION ACTION
// ============================================================================
const createQuotationSchema = z.object({
  clientId: z.string().uuid('Klien harus dipilih'),
  title: z.string().min(1, 'Judul proyek/penawaran wajib diisi'),
  billingType: z.enum(['MILESTONE', 'RETAINER']),
  totalAmount: z.number().positive('Total nominal kontrak harus lebih besar dari 0'),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export async function createQuotationAction(rawInput: CreateQuotationInput, currentOrgId: string) {
  await requireRole(['OWNER', 'PM']);
  const parsed = createQuotationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { clientId, title, billingType, totalAmount } = parsed.data;

  try {
    // Generate quotation number unik, misal QTN-2026-00X
    const existingQuotes = await db
      .select({ number: quotations.quotationNumber })
      .from(quotations)
      .where(eq(quotations.organizationId, currentOrgId))
      .orderBy(desc(quotations.createdAt))
      .limit(1);

    let nextNumberSeq = 1;
    if (existingQuotes.length > 0) {
      const lastNumStr = existingQuotes[0].number; // Cth: "QTN-2026-001"
      const parts = lastNumStr.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNumberSeq = lastSeq + 1;
      }
    }

    const year = new Date().getFullYear();
    const quotationNumber = `QTN-${year}-${String(nextNumberSeq).padStart(3, '0')}`;

    const [newQuotation] = await db
      .insert(quotations)
      .values({
        organizationId: currentOrgId,
        clientId,
        quotationNumber,
        title,
        billingType,
        totalAmount: totalAmount.toFixed(2),
        status: 'DRAFT',
      })
      .returning();

    revalidatePath('/');
    return { success: true, quotationId: newQuotation.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat quotation baru.';
    return { success: false, error: message };
  }
}
