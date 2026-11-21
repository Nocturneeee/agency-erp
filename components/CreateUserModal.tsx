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
import { Users, Plus, AlertCircle } from 'lucide-react';
import { createUserAction, CreateUserInput } from '@/actions/master-and-quotes';

interface CreateUserModalProps {
  currentOrgId: string;
}

export function CreateUserModal({ currentOrgId }: CreateUserModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'PM' | 'FINANCE' | 'STAFF'>('STAFF');
  const [hourlyCostRate, setHourlyCostRate] = useState<number>(150000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: CreateUserInput = {
      name,
      email,
      role,
      hourlyCostRate: Number(hourlyCostRate),
    };

    startTransition(async () => {
      const result = await createUserAction(payload, currentOrgId);
      if (!result.success) {
        setErrorMessage(result.error || 'Gagal menambahkan staf.');
      } else {
        setIsOpen(false);
        setName('');
        setEmail('');
        setRole('STAFF');
        setHourlyCostRate(150000);
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
        <span>+ Tim / Staf</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Tambah Tim / Staf Baru
            </DialogTitle>
            <DialogDescription>
              Daftarkan anggota tim internal agensi beserta peran dan biaya per jam (HPP).
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
              <Label htmlFor="userName">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input
                id="userName"
                placeholder="Cth: Sinta Dewi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEmail">Email Perusahaan <span className="text-destructive">*</span></Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="sinta@agensi.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userRole">Role / Peran</Label>
                <select
                  id="userRole"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="OWNER">OWNER</option>
                  <option value="PM">PM (Project Manager)</option>
                  <option value="FINANCE">FINANCE</option>
                  <option value="STAFF">STAFF (Dev/Designer)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyCostRate">Biaya Per Jam (Rp)</Label>
                <Input
                  id="hourlyCostRate"
                  type="number"
                  min={0}
                  step={1000}
                  value={hourlyCostRate}
                  onChange={(e) => setHourlyCostRate(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Menyimpan...' : 'Simpan Staf'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
