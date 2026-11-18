'use server';

import { db } from '@/db';
import { quotations, projects, milestones } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================================================
// 1. VALIDASI INPUT (Mencegah data cacat masuk ke backend)
// ============================================================================

const approveQuotationSchema = z.object({
  quotationId: z.string().uuid(),
  budgetHours: z.number().int().min(1, 'Estimasi jam kerja minimal 1 jam'),
  startDate: z.string(), // Format: YYYY-MM-DD
  deadline: z.string(),
  // Skema termin pembayaran yang disepakati dengan klien
  milestoneSplits: z
    .array(
      z.object({
        title: z.string().min(1), // Misal: "Termin 1 - DP 50%"
        percentage: z.number().min(1).max(100),
      })
    )
    .min(1, 'Minimal harus ada 1 termin penagihan'),
});

export type ApproveQuotationInput = z.infer<typeof approveQuotationSchema>;

// ============================================================================
// 2. SERVER ACTION UTAMA
// ============================================================================

export async function approveQuotationAction(
  rawInput: ApproveQuotationInput,
  currentOrgId: string // Diambil dari session user yang sedang login
) {
  // Validasi format input dengan Zod
  const parsed = approveQuotationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { quotationId, budgetHours, startDate, deadline, milestoneSplits } = parsed.data;

  // Validasi aturan bisnis: Total persentase termin wajib 100%
  const totalPercentage = milestoneSplits.reduce((sum, item) => sum + item.percentage, 0);
  if (totalPercentage !== 100) {
    return {
      success: false,
      error: `Total persentase termin harus 100% (saat ini: ${totalPercentage}%)`,
    };
  }

  try {
    // ========================================================================
    // 3. DATABASE TRANSACTION (All-or-Nothing)
    // Semua query di dalam blok ini dianggap 1 kesatuan. Jika langkah ke-3 gagal,
    // langkah ke-1 dan ke-2 otomatis dibatalkan (Rollback).
    // ========================================================================
    const createdProject = await db.transaction(async (tx) => {
      // A. Ambil data Quotation & kunci berdasarkan organizationId (Multi-tenant)
      const [quote] = await tx
        .select()
        .from(quotations)
        .where(
          and(
            eq(quotations.id, quotationId),
            eq(quotations.organizationId, currentOrgId)
          )
        );

      if (!quote) {
        throw new Error('Quotation tidak ditemukan atau akses ditolak.');
      }

      // B. Idempotency Guard: Cegah Quotation di-approve 2 kali (misal akibat double-click)
      if (quote.status !== 'DRAFT') {
        throw new Error(`Quotation tidak bisa diproses karena berstatus ${quote.status}.`);
      }

      // C. Ubah status Quotation menjadi APPROVED
      await tx
        .update(quotations)
        .set({ status: 'APPROVED' })
        .where(eq(quotations.id, quote.id));

      // D. Buat Project baru secara otomatis dari data Quotation
      const [newProject] = await tx
        .insert(projects)
        .values({
          organizationId: currentOrgId,
          quotationId: quote.id,
          clientId: quote.clientId,
          name: quote.title,
          budgetHours,
          startDate,
          deadline,
          status: 'IN_PROGRESS',
        })
        .returning();

      // E. Hitung nominal rupiah tiap termin tanpa selisih pembulatan
      const totalContract = Number(quote.totalAmount);
      let allocatedAmount = 0;

      const milestoneRows = milestoneSplits.map((split, index) => {
        const isLastItem = index === milestoneSplits.length - 1;

        // Untuk termin terakhir, ambil sisa kontrak agar totalnya 100% presisi
        const amount = isLastItem
          ? Number((totalContract - allocatedAmount).toFixed(2))
          : Number(((totalContract * split.percentage) / 100).toFixed(2));

        allocatedAmount += amount;

        return {
          projectId: newProject.id,
          title: split.title,
          billableAmount: amount.toFixed(2), // Simpan kembali sebagai string untuk kolom NUMERIC
          isCompleted: false,
        };
      });

      // F. Simpan semua termin ke tabel milestones sekaligus
      await tx.insert(milestones).values(milestoneRows);

      return newProject;
    });

    // Segarkan cache halaman terkait di Next.js
    revalidatePath('/quotations');
    revalidatePath('/projects');

    return { success: true, projectId: createdProject.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan sistem.';
    return { success: false, error: message };
  }
}