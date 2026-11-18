'use server';

import { db } from '@/db';
import { timeEntries, projectExpenses, users, projects } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================================================
// 1. TIMESHEET SERVER ACTION
// ============================================================================

const logTimeSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  workDate: z.string(), // YYYY-MM-DD
  hours: z.number().positive('Jumlah jam harus lebih dari 0'),
  description: z.string().min(1, 'Deskripsi pekerjaan wajib diisi'),
});

export type LogTimeInput = z.infer<typeof logTimeSchema>;

export async function logTimeEntryAction(rawInput: LogTimeInput, currentOrgId: string) {
  const parsed = logTimeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { projectId, userId, workDate, hours, description } = parsed.data;

  try {
    // Ambil data user untuk mendapatkan rate biaya saat ini (snapshot)
    const [userRecord] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.organizationId, currentOrgId)));

    if (!userRecord) {
      return { success: false, error: 'Data staf tidak ditemukan.' };
    }

    // Ambil rate cost per jam dari user
    const hourlyRate = userRecord.hourlyCostRate;

    await db.insert(timeEntries).values({
      organizationId: currentOrgId,
      projectId,
      userId,
      workDate,
      hours: hours.toFixed(2),
      hourlyCostRateSnapshot: hourlyRate,
      description,
      isApproved: true, // Otomatis disetujui untuk operasional harian
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mencatat jam kerja.';
    return { success: false, error: message };
  }
}

// ============================================================================
// 2. PROJECT EXPENSE SERVER ACTION
// ============================================================================

const expenseSchema = z.object({
  projectId: z.string().uuid(),
  vendorName: z.string().min(1, 'Nama vendor wajib diisi'),
  category: z.enum(['FREELANCER', 'ADS', 'SOFTWARE', 'OTHER']),
  amount: z.number().positive('Nominal biaya harus lebih dari 0'),
  expenseDate: z.string(), // YYYY-MM-DD
  description: z.string().optional(),
});

export type ProjectExpenseInput = z.infer<typeof expenseSchema>;

export async function addProjectExpenseAction(rawInput: ProjectExpenseInput, currentOrgId: string) {
  const parsed = expenseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { projectId, vendorName, category, amount, expenseDate, description } = parsed.data;

  try {
    await db.insert(projectExpenses).values({
      organizationId: currentOrgId,
      projectId,
      vendorName,
      category,
      amount: amount.toFixed(2),
      expenseDate,
      description: description || null,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mencatat biaya eksternal.';
    return { success: false, error: message };
  }
}
