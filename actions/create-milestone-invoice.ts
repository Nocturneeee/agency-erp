'use server';

import { db } from '@/db';
import {
  milestones,
  projects,
  invoices,
  journalEntries,
  journalLines,
} from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  milestoneId: z.string().uuid(),
  issueDate: z.string(), // YYYY-MM-DD
  dueDate: z.string(),   // YYYY-MM-DD
  applyPpn: z.boolean().default(true),    // PPN 11%
  applyPph23: z.boolean().default(true),  // Potongan PPh 23 2%
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export async function createMilestoneInvoiceAction(
  rawInput: CreateInvoiceInput,
  currentOrgId: string
) {
  const parsed = createInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { milestoneId, issueDate, dueDate, applyPpn, applyPph23 } = parsed.data;

  try {
    const createdInvoice = await db.transaction(async (tx) => {
      // 1. Ambil data Milestone beserta relasi Project-nya
      const [record] = await tx
        .select({
          milestone: milestones,
          project: projects,
        })
        .from(milestones)
        .innerJoin(projects, eq(milestones.projectId, projects.id))
        .where(
          and(
            eq(milestones.id, milestoneId),
            eq(projects.organizationId, currentOrgId)
          )
        );

      if (!record) {
        throw new Error('Termin tidak ditemukan atau akses ditolak.');
      }

      const { milestone, project } = record;

      // 2. Guard Anti-Tagihan Ganda
      if (milestone.invoiceId) {
        throw new Error('Termin ini sudah pernah dibuatkan invoice.');
      }

      // 3. Kalkulasi Pajak & Piutang Bersih secara Presisi
      const subtotal = Number(milestone.billableAmount);
      const ppnAmount = applyPpn ? Number((subtotal * 0.11).toFixed(2)) : 0;
      const pph23Amount = applyPph23 ? Number((subtotal * 0.02).toFixed(2)) : 0;
      const netReceivable = Number((subtotal + ppnAmount - pph23Amount).toFixed(2));

      // Generate nomor invoice unik sederhana
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      // 4. Simpan Dokumen Invoice dengan status langsung POSTED
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          organizationId: currentOrgId,
          projectId: project.id,
          clientId: project.clientId,
          invoiceNumber,
          issueDate,
          dueDate,
          subtotal: subtotal.toFixed(2),
          ppnAmount: ppnAmount.toFixed(2),
          pph23Amount: pph23Amount.toFixed(2),
          netReceivable: netReceivable.toFixed(2),
          status: 'POSTED',
        })
        .returning();

      // 5. Kunci Milestone agar tidak bisa ditagihkan lagi
      await tx
        .update(milestones)
        .set({
          invoiceId: newInvoice.id,
          isCompleted: true,
        })
        .where(eq(milestones.id, milestone.id));

      // 6. POSTING ENGINE: Catat Jurnal Akuntansi Otomatis
      const [journalHeader] = await tx
        .insert(journalEntries)
        .values({
          organizationId: currentOrgId,
          entryDate: issueDate,
          referenceType: 'INVOICE',
          referenceId: newInvoice.id,
          description: `Tagihan ${invoiceNumber} - ${project.name} (${milestone.title})`,
        })
        .returning();

      const linesToInsert: Array<{
        journalEntryId: string;
        accountCode: string;
        accountName: string;
        debit: string;
        credit: string;
      }> = [
        {
          journalEntryId: journalHeader.id,
          accountCode: '1201',
          accountName: 'Piutang Usaha',
          debit: netReceivable.toFixed(2),
          credit: '0.00',
        },
        {
          journalEntryId: journalHeader.id,
          accountCode: '4101',
          accountName: 'Pendapatan Jasa',
          debit: '0.00',
          credit: subtotal.toFixed(2),
        },
      ];

      if (pph23Amount > 0) {
        linesToInsert.push({
          journalEntryId: journalHeader.id,
          accountCode: '1401',
          accountName: 'PPh 23 Dibayar di Muka',
          debit: pph23Amount.toFixed(2),
          credit: '0.00',
        });
      }

      if (ppnAmount > 0) {
        linesToInsert.push({
          journalEntryId: journalHeader.id,
          accountCode: '2201',
          accountName: 'Utang PPN Keluaran',
          debit: '0.00',
          credit: ppnAmount.toFixed(2),
        });
      }

      // 7. Validasi Akhir ERP: Pastikan Total Debit === Total Kredit sebelum commit
      const totalDebit = linesToInsert.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredit = linesToInsert.reduce((sum, l) => sum + Number(l.credit), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error('Jurnal tidak seimbang (Unbalanced). Transaksi dibatalkan.');
      }

      await tx.insert(journalLines).values(linesToInsert);

      return newInvoice;
    });

    revalidatePath('/projects');
    revalidatePath('/invoices');
    revalidatePath('/accounting/journals');

    return { success: true, invoice: createdInvoice };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menerbitkan invoice.';
    return { success: false, error: message };
  }
}