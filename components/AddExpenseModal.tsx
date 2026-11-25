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
  DialogTrigger 
} from '@/components/ui/dialog';
import { Plus, Receipt, AlertCircle } from 'lucide-react';
import { addProjectExpenseAction } from '@/project-costs';

interface AddExpenseModalProps {
  projectId: string;
  currentOrgId: string;
}

export function AddExpenseModal({ projectId, currentOrgId }: AddExpenseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState<'FREELANCER' | 'ADS' | 'SOFTWARE' | 'OTHER'>('FREELANCER');
  const [amount, setAmount] = useState<number>(1500000);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await addProjectExpenseAction(
        {
          projectId,
          vendorName,
          category,
          amount: Number(amount),
          expenseDate,
          description,
        },
        currentOrgId
      );

      if (!result.success) {
        setErrorMessage(result.error || 'Gagal mencatat biaya vendor.');
      } else {
        setIsOpen(false);
        setVendorName('');
        setDescription('');
        setAmount(1500000);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button size="sm" variant="outline" className="gap-1.5 h-9" type="button">
          <Plus className="w-4 h.4" /> Catat Biaya Eksternal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> Catat Biaya Vendor &amp; Eksternal
          </DialogTitle>
          <DialogDescription>
            Catat pengeluaran langsung untuk proyek seperti freelancer, ads, atau software berlisensi.
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
            <Label htmlFor="vendorName">Nama Vendor / Freelancer</Label>
            <Input
              id="vendorName"
              placeholder="Cth: PT Media Kreatif / John (Illustrator)"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="FREELANCER">FREELANCER</option>
                <option value="ADS">ADS (Iklan)</option>
                <option value="SOFTWARE">SOFTWARE / LISENSI</option>
                <option value="OTHER">LAINNYA</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Nominal (Rp)</Label>
              <Input
                id="amount"
                type="number"
                min="1000"
                step="500"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenseDate">Tanggal Pengeluaran</Label>
            <Input
              id="expenseDate"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenseDesc">Catatan / Keterangan</Label>
            <Input
              id="expenseDesc"
              placeholder="Cth: Pembayaran DP ilustrasi aset karakter"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan Biaya'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
