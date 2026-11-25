'use server';

import { db } from '@/db';
import { invoices, journalEntries, journalLines } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const receivePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentDate: z.string(), // Format: YYYY-MM-DD
  paymentMethod: z.string().min(1, 'Metode/rekening tujuan wajib diisi'), // Misal: "Transfer BCA"
});

export type ReceivePaymentInput = z.infer<typeof receivePaymentSchema>;

export async function receivePaymentAction(
  rawInput: ReceivePaymentInput,
  currentOrgId: string
) {
  const parsed = receivePaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { invoiceId, paymentDate, paymentMethod } = parsed.data;

  try {
    const updatedInvoice = await db.transaction(async (tx) => {
      // 1. Ambil data Invoice & kunci isolasi Multi-Tenant
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, currentOrgId)
          )
        );

      if (!invoice) {
        throw new Error('Invoice tidak ditemukan atau akses ditolak.');
      }

      // 2. Idempotency Guard: Hanya invoice berstatus POSTED yang bisa dilunasi
      if (invoice.status === 'PAID') {
        throw new Error('Invoice ini sudah berstatus LUNAS (PAID).');
      }
      if (invoice.status !== 'POSTED') {
        throw new Error(`Invoice berstatus ${invoice.status} tidak dapat diproses.`);
      }

      // 3. Ubah status Invoice menjadi PAID
      const [paidInv] = await tx
        .update(invoices)
        .set({ status: 'PAID' })
        .where(eq(invoices.id, invoice.id))
        .returning();

      // 4. POSTING ENGINE: Catat Jurnal Kas Masuk & Pelunasan Piutang
      const [journalHeader] = await tx
        .insert(journalEntries)
        .values({
          organizationId: currentOrgId,
          entryDate: paymentDate,
          referenceType: 'PAYMENT',
          referenceId: invoice.id,
          description: `Pelunasan ${invoice.invoiceNumber} via ${paymentMethod}`,
        })
        .returning();

      const amount = Number(invoice.netReceivable).toFixed(2);

      await tx.insert(journalLines).values([
        {
          journalEntryId: journalHeader.id,
          accountCode: '1101',
          accountName: 'Kas / Bank Operasional',
          debit: amount,
          credit: '0.00',
        },
        {
          journalEntryId: journalHeader.id,
          accountCode: '1201',
          accountName: 'Piutang Usaha',
          debit: '0.00',
          credit: amount,
        },
      ]);

      return paidInv;
    });

    revalidatePath(`/projects/${updatedInvoice.projectId}`);
    revalidatePath('/accounting/journals');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mencatat pelunasan.';
    return { success: false, error: message };
  }
}