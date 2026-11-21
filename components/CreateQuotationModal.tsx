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
import { FileText, Plus, AlertCircle } from 'lucide-react';
import { createQuotationAction, CreateQuotationInput } from '@/actions/master-and-quotes';

interface ClientItem {
  id: string;
  companyName: string;
}

interface CreateQuotationModalProps {
  currentOrgId: string;
  clientsList: ClientItem[];
}

export function CreateQuotationModal({ currentOrgId, clientsList }: CreateQuotationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [clientId, setClientId] = useState<string>(clientsList[0]?.id || '');
  const [title, setTitle] = useState('');
  const [billingType, setBillingType] = useState<'MILESTONE' | 'RETAINER'>('MILESTONE');
  const [totalAmount, setTotalAmount] = useState<number>(25000000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientId) {
      setErrorMessage('Pilih klien terlebih dahulu.');
      return;
    }

    const payload: CreateQuotationInput = {
      clientId,
      title,
      billingType,
      totalAmount: Number(totalAmount),
    };

    startTransition(async () => {
      const result = await createQuotationAction(payload, currentOrgId);
      if (!result.success) {
        setErrorMessage(result.error || 'Gagal membuat quotation.');
      } else {
        setIsOpen(false);
        setTitle('');
        setTotalAmount(25000000);
        window.location.reload();
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 shadow-sm bg-primary hover:bg-primary/90"
      >
        <Plus className="w-4 h-4" />
        <span>+ Buat Quotation</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Buat Penawaran Harga Baru
            </DialogTitle>
            <DialogDescription>
              Buat dokumen penawaran baru untuk klien dengan tipe penagihan milestone atau retainer.
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
              <Label htmlFor="clientId">Pilih Klien <span className="text-destructive">*</span></Label>
              <select
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>-- Pilih Klien --</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteTitle">Judul Proyek / Penawaran <span className="text-destructive">*</span></Label>
              <Input
                id="quoteTitle"
                placeholder="Cth: Pengembangan Mobile App iOS & Android"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingType">Tipe Penagihan (Billing Type)</Label>
                <select
                  id="billingType"
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as any)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="MILESTONE">MILESTONE (Termin)</option>
                  <option value="RETAINER">RETAINER (Bulanan)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Nominal Kontrak (Rp)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  min={1000}
                  step={100000}
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending || clientsList.length === 0}>
                {isPending ? 'Menyimpan...' : 'Simpan Quotation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
