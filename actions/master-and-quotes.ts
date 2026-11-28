'use server';

import { db } from '@/db';
import { clients, users, quotations } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================================================
// 1. TAMBAH KLIEN BARU (MASTER DATA)
// ============================================================================

const createClientSchema = z.object({
  companyName: z.string().min(2, 'Nama perusahaan wajib diisi'),
  contactPerson: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  npwp: z.string().optional(),
  paymentTermsDays: z.number().int().min(0).default(14),
});

export async function createClientAction(
  rawInput: z.infer<typeof createClientSchema>,
  currentOrgId: string
) {
  const parsed = createClientSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await db.insert(clients).values({
      organizationId: currentOrgId,
      companyName: parsed.data.companyName,
      contactPerson: parsed.data.contactPerson || null,
      email: parsed.data.email || null,
      npwp: parsed.data.npwp || null,
      paymentTermsDays: parsed.data.paymentTermsDays,
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Gagal menyimpan data klien.' };
  }
}

// ============================================================================
// 2. TAMBAH ANGGOTA TIM / STAF (UNTUK TIMESHEET & HPP)
// ============================================================================

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama lengkap wajib diisi'),
  email: z.string().email('Email tidak valid'),
  role: z.enum(['OWNER', 'PM', 'FINANCE', 'STAFF']),
  hourlyCostRate: z.number().min(0, 'Rate per jam tidak boleh minus'),
});

export async function createUserAction(
  rawInput: z.infer<typeof createUserSchema>,
  currentOrgId: string
) {
  const parsed = createUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await db.insert(users).values({
      organizationId: currentOrgId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      hourlyCostRate: parsed.data.hourlyCostRate.toFixed(2),
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Gagal menambah tim (pastikan email belum terdaftar).' };
  }
}

// ============================================================================
// 3. BUAT QUOTATION / PENAWARAN HARGA BARU (STATUS: DRAFT)
// ============================================================================

const createQuotationSchema = z.object({
  clientId: z.string().uuid('Pilih klien terlebih dahulu'),
  title: z.string().min(3, 'Judul proyek wajib diisi'),
  billingType: z.enum(['MILESTONE', 'RETAINER']),
  totalAmount: z.number().min(1, 'Nilai kontrak harus lebih dari 0'),
});

export async function createQuotationAction(
  rawInput: z.infer<typeof createQuotationSchema>,
  currentOrgId: string
) {
  const parsed = createQuotationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    // Generate nomor penawaran otomatis, contoh: QTN-2026-4821
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const quotationNumber = `QTN-${year}-${randomSuffix}`;

    await db.insert(quotations).values({
      organizationId: currentOrgId,
      clientId: parsed.data.clientId,
      quotationNumber,
      title: parsed.data.title,
      billingType: parsed.data.billingType,
      totalAmount: parsed.data.totalAmount.toFixed(2),
      status: 'DRAFT',
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Gagal membuat penawaran harga.' };
  }
}

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;