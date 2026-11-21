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
import { Building2, Plus, AlertCircle } from 'lucide-react';
import { createClientAction, CreateClientInput } from '@/actions/master-and-quotes';

interface CreateClientModalProps {
  currentOrgId: string;
}

export function CreateClientModal({ currentOrgId }: CreateClientModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [npwp, setNpwp] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(14);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: CreateClientInput = {
      companyName,
      contactPerson: contactPerson || undefined,
      email: email || undefined,
      npwp: npwp || undefined,
      paymentTermsDays: Number(paymentTermsDays),
    };

    startTransition(async () => {
      const result = await createClientAction(payload, currentOrgId);
      if (!result.success) {
        setErrorMessage(result.error || 'Gagal menyimpan klien.');
      } else {
        setIsOpen(false);
        setCompanyName('');
        setContactPerson('');
        setEmail('');
        setNpwp('');
        setPaymentTermsDays(14);
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
        <span>+ Klien Baru</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Tambah Klien Baru
            </DialogTitle>
            <DialogDescription>
              Daftarkan perusahaan klien baru ke dalam agensi Anda untuk pembuatan penawaran &amp; proyek.
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
              <Label htmlFor="companyName">Nama Perusahaan / Klien <span className="text-destructive">*</span></Label>
              <Input
                id="companyName"
                placeholder="Cth: PT Makmur Sejahtera"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Nama Kontak (PIC)</Label>
                <Input
                  id="contactPerson"
                  placeholder="Cth: Bpk. Andi"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Klien</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="kontak@makmur.co.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="npwp">NPWP Klien</Label>
                <Input
                  id="npwp"
                  placeholder="01.234.567.8-901.000"
                  value={npwp}
                  onChange={(e) => setNpwp(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTermsDays">Termin Pembayaran (Hari)</Label>
                <Input
                  id="paymentTermsDays"
                  type="number"
                  min={0}
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Menyimpan...' : 'Simpan Klien'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
