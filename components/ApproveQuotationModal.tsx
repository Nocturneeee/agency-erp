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
import { Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { approveQuotationAction, ApproveQuotationInput } from '@/actions/approve-quotation';

interface MilestoneSplitItem {
  title: string;
  percentage: number;
}

interface ApproveQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  quotationTitle: string;
  totalAmount: number;
  currentOrgId: string;
  onSuccess?: () => void;
}

export function ApproveQuotationModal({
  isOpen,
  onClose,
  quotationId,
  quotationTitle,
  totalAmount,
  currentOrgId,
  onSuccess,
}: ApproveQuotationModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [budgetHours, setBudgetHours] = useState<number>(40);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [deadline, setDeadline] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Default milestone splits: Termin 1 (50%) & Termin 2 (50%)
  const [milestoneSplits, setMilestoneSplits] = useState<MilestoneSplitItem[]>([
    { title: 'Termin 1 - Uang Muka (DP)', percentage: 50 },
    { title: 'Termin 2 - Pelunasan', percentage: 50 },
  ]);

  // Hitung total persentase secara real-time
  const totalPercentage = milestoneSplits.reduce(
    (acc, curr) => acc + (Number(curr.percentage) || 0),
    0
  );
  const isPercentageValid = totalPercentage === 100;

  // Handler tambah baris termin
  const handleAddMilestone = () => {
    const remaining = Math.max(0, 100 - totalPercentage);
    setMilestoneSplits([
      ...milestoneSplits,
      { title: `Termin ${milestoneSplits.length + 1}`, percentage: remaining },
    ]);
  };

  // Handler hapus baris termin
  const handleRemoveMilestone = (index: number) => {
    if (milestoneSplits.length <= 1) {
      setErrorMessage('Minimal harus ada 1 termin penagihan.');
      return;
    }
    setErrorMessage(null);
    const updated = milestoneSplits.filter((_, i) => i !== index);
    setMilestoneSplits(updated);
  };

  // Handler ubah field termin
  const handleMilestoneChange = (
    index: number,
    field: keyof MilestoneSplitItem,
    value: string | number
  ) => {
    const updated = [...milestoneSplits];
    if (field === 'percentage') {
      updated[index][field] = value === '' ? 0 : Number(value);
    } else {
      updated[index][field] = String(value);
    }
    setMilestoneSplits(updated);
  };

  // Handler Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPercentageValid) {
      setErrorMessage(`Total persentase termin harus tepat 100% (saat ini: ${totalPercentage}%)`);
      return;
    }

    const payload: ApproveQuotationInput = {
      quotationId,
      budgetHours: Number(budgetHours),
      startDate,
      deadline,
      milestoneSplits,
    };

    startTransition(async () => {
      const result = await approveQuotationAction(payload, currentOrgId);
      if (!result.success) {
        setErrorMessage(result.error || 'Gagal menyetujui quotation.');
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  // Format ke Rupiah helper untuk preview nilai nominal termin
  const formatRupiah = (percentage: number) => {
    const nominal = (totalAmount * percentage) / 100;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(nominal);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setujui Penawaran (Approve Quotation)</DialogTitle>
          <DialogDescription>
            Menyetujui penawaran &quot;{quotationTitle}&quot; akan otomatis membuat proyek baru
            dan menjadwalkan termin pembayaran.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Error Banner jika ada */}
          {errorMessage && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pengaturan Proyek */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetHours">Estimasi Jam Kerja</Label>
              <Input
                id="budgetHours"
                type="number"
                min={1}
                value={budgetHours}
                onChange={(e) => setBudgetHours(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Batas Waktu (Deadline)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Baris Termin Pembayaran (Milestone Splits) */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Termin Pembayaran (Milestone Splits)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Total Kontrak: {formatRupiah(100)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMilestone}
                className="gap-1 h-8"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Termin
              </Button>
            </div>

            <div className="space-y-2">
              {milestoneSplits.map((split, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/60"
                >
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder={`Nama Termin ${index + 1} (Cth: DP 50%)`}
                      value={split.title}
                      onChange={(e) =>
                        handleMilestoneChange(index, 'title', e.target.value)
                      }
                      required
                      className="h-8 text-sm bg-background"
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={split.percentage}
                        onChange={(e) =>
                          handleMilestoneChange(index, 'percentage', e.target.value)
                        }
                        required
                        className="h-8 text-sm pr-7 bg-background"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="w-28 text-right text-xs font-medium text-muted-foreground hidden sm:block">
                    {formatRupiah(split.percentage)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMilestone(index)}
                    disabled={milestoneSplits.length <= 1}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Indikator Real-time Total Persentase */}
            <div
              className={`flex items-center justify-between p-3 rounded-md text-sm font-medium ${
                isPercentageValid
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {isPercentageValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>
                  Total Persentase Termin:{' '}
                  <strong className="font-bold">{totalPercentage}%</strong>
                </span>
              </div>
              <span className="text-xs">
                {isPercentageValid
                  ? 'Sempurna (100%)'
                  : `Kurang ${100 - totalPercentage}% lagi`}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!isPercentageValid || isPending}
              className="min-w-[140px]"
            >
              {isPending ? 'Memproses...' : 'Setujui Penawaran'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
