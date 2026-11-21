'use server';

import { db } from '@/db';
import {
  invoices,
  journalEntries,
  journalLines,
} from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const receivePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentDate: z.string(), // YYYY-MM-DD
  paymentMethod: z.string().min(1, 'Metode pembayaran wajib diisi'),
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
    await db.transaction(async (tx) => {
      // 1. Ambil data Invoice berdasarkan ID & organizationId
      const [inv] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, currentOrgId)
          )
        );

      if (!inv) {
        throw new Error('Invoice tidak ditemukan atau akses ditolak.');
      }

      // 2. Guard: Pastikan invoice berstatus POSTED
      if (inv.status !== 'POSTED') {
        throw new Error(`Invoice tidak dapat ditandai lunas karena berstatus ${inv.status}.`);
      }

      // 3. Ubah status Invoice menjadi PAID
      await tx
        .update(invoices)
        .set({ status: 'PAID' })
        .where(eq(invoices.id, inv.id));

      // 4. Catat Jurnal Akuntansi Pelunasan Piutang
      // Debet: Kas/Bank (1101), Kredit: Piutang Usaha (1201)
      const netReceivable = Number(inv.netReceivable);

      const [journalHeader] = await tx
        .insert(journalEntries)
        .values({
          organizationId: currentOrgId,
          entryDate: paymentDate,
          referenceType: 'PAYMENT',
          referenceId: inv.id,
          description: `Pelunasan Tagihan ${inv.invoiceNumber} via ${paymentMethod}`,
        })
        .returning();

      await tx.insert(journalLines).values([
        {
          journalEntryId: journalHeader.id,
          accountCode: '1101',
          accountName: 'Kas & Bank',
          debit: netReceivable.toFixed(2),
          credit: '0.00',
        },
        {
          journalEntryId: journalHeader.id,
          accountCode: '1201',
          accountName: 'Piutang Usaha',
          debit: '0.00',
          credit: netReceivable.toFixed(2),
        },
      ]);
    });

    revalidatePath('/projects');
    revalidatePath('/invoices');
    revalidatePath('/accounting/journals');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mencatat pelunasan invoice.';
    return { success: false, error: message };
  }
}
