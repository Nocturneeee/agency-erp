'use client';

import React, { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { createMilestoneInvoiceAction, CreateInvoiceInput } from '@/actions/create-milestone-invoice';

interface IssueInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: string;
  milestoneTitle: string;
  billableAmount: number;
  currentOrgId: string;
  onSuccess?: () => void;
}

export function IssueInvoiceModal({
  isOpen,
  onClose,
  milestoneId,
  milestoneTitle,
  billableAmount,
  currentOrgId,
  onSuccess,
}: IssueInvoiceModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);
  const [applyPpn, setApplyPpn] = useState<boolean>(true);
  const [applyPph23, setApplyPph23] = useState<boolean>(true);

  // Kalkulasi preview pajak
  const subtotal = billableAmount;
  const ppn = applyPpn ? subtotal * 0.11 : 0;
  const pph23 = applyPph23 ? subtotal * 0.02 : 0;
  const netReceivable = subtotal + ppn - pph23;

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: CreateInvoiceInput = {
      milestoneId,
      issueDate,
      dueDate,
      applyPpn,
      applyPph23,
    };

    startTransition(async () => {
      const result = await createMilestoneInvoiceAction(payload, currentOrgId);
      if (!result.success) {
        setErrorMessage(result.error || 'Gagal menerbitkan invoice.');
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Terbitkan Invoice Termin</DialogTitle>
          <DialogDescription>
            Buat tagihan resmi untuk termin &quot;{milestoneTitle}&quot;. Jurnal akuntansi
            akan langsung dicatat secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-3">
          {errorMessage && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Tanggal Terbit</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Jatuh Tempo (Due Date)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium text-foreground">Pengaturan Pajak</h4>
            <div className="space-y-3 bg-muted/40 p-3 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="applyPpn"
                  checked={applyPpn}
                  onCheckedChange={(checked) => setApplyPpn(checked === true)}
                />
                <Label htmlFor="applyPpn" className="text-sm font-normal cursor-pointer">
                  Kenakan PPN 11% (Menambah Utang PPN Keluaran)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="applyPph23"
                  checked={applyPph23}
                  onCheckedChange={(checked) => setApplyPph23(checked === true)}
                />
                <Label htmlFor="applyPph23" className="text-sm font-normal cursor-pointer">
                  Potong PPh 23 2% (Jasa Konsultasi / Profesional)
                </Label>
              </div>
            </div>
          </div>

          {/* Rincian Kalkulasi */}
          <div className="bg-muted/60 p-3.5 rounded-lg space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Nilai Termin (Subtotal):</span>
              <span className="font-medium text-foreground">{formatRupiah(subtotal)}</span>
            </div>
            {applyPpn && (
              <div className="flex justify-between text-muted-foreground">
                <span>PPN (11%):</span>
                <span className="font-medium text-foreground">+ {formatRupiah(ppn)}</span>
              </div>
            )}
            {applyPph23 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Potongan PPh 23 (2%):</span>
                <span className="font-medium text-foreground">- {formatRupiah(pph23)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold text-foreground text-base">
              <span>Piutang Bersih (Net Receivable):</span>
              <span className="text-primary">{formatRupiah(netReceivable)}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menerbitkan...' : 'Terbitkan & Posting Jurnal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
