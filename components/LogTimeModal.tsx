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
import { Plus, Clock, AlertCircle } from 'lucide-react';
import { logTimeEntryAction } from '@/project-costs';

interface UserOption {
  id: string;
  name: string;
}

interface LogTimeModalProps {
  projectId: string;
  currentOrgId: string;
  users: UserOption[];
}

export function LogTimeModal({ projectId, currentOrgId, users }: LogTimeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [userId, setUserId] = useState(users[0]?.id || '');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState<number>(2);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await logTimeEntryAction(
        {
          projectId,
          userId,
          workDate,
          hours: Number(hours),
          description,
        },
        currentOrgId
      );

      if (!result.success) {
        setErrorMessage(result.error || 'Gagal mencatat jam kerja.');
      } else {
        setIsOpen(false);
        setDescription('');
        setHours(2);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button size="sm" className="gap-1.5 h-9 pointer-events-none" type="button" tabIndex={-1}>
          <Plus className="w-4 h-4" /> Catat Jam Kerja
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Log Jam Kerja Tim (Timesheet)
          </DialogTitle>
          <DialogDescription>
            Catat durasi kerja staf pada proyek ini untuk perhitungan HPP tenaga kerja.
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
            <Label htmlFor="userId">Pilih Staf</Label>
            <select
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workDate">Tanggal Kerja</Label>
              <Input
                id="workDate"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Jumlah Jam</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi Pekerjaan</Label>
            <Input
              id="description"
              placeholder="Cth: Slicing UI halaman dashboard & integrasi API"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Simpan Timesheet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
