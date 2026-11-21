'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { receivePaymentAction, ReceivePaymentInput } from '@/actions/receive-payment';

interface ReceivePaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  netReceivable: number;
  currentOrgId: string;
}

export function ReceivePaymentModal({
  invoiceId,
  invoiceNumber,
  netReceivable,
  currentOrgId,
}: ReceivePaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('Transfer Bank BCA');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: ReceivePaymentInput = {
      invoiceId,
      paymentDate,
      paymentMethod,
    };

    startTransition(async () => {
      const result = await receivePaymentAction(payload, currentOrgId);
      if (!result.success) {
        setErrorMessage(result.error || 'Gagal menandai lunas.');
      } else {
        setIsOpen(false);
        window.location.reload();
      }
    });
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 h-8 text-xs font-medium shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Lunas
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Pelunasan Invoice {invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Tandai tagihan sebesar <strong className="font-semibold text-foreground">{formatRupiah(netReceivable)}</strong> sebagai lunas (PAID).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Tanggal Pembayaran <span className="text-destructive">*</span></Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Metode Pembayaran / Bank <span className="text-destructive">*</span></Label>
              <Input
                id="paymentMethod"
                placeholder="Cth: Transfer Bank BCA / Mandiri / Giro"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPending ? 'Memproses...' : 'Konfirmasi Lunas'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
