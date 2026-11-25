'use client';

import { useState } from 'react';
import { loginAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, AlertCircle, Building2 } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    try {
      const res = await loginAction(formData);
      if (res && res.error) {
        setError(res.error);
        setIsLoading(false);
      }
    } catch (err: any) {
      // Next.js redirect throws a NEXT_REDIRECT error which is normal
      if (err?.message?.includes('NEXT_REDIRECT')) {
        return;
      }
      setError('Terjadi kesalahan saat masuk. Silakan coba lagi.');
      setIsLoading(false);
    }
  }

  function fillDemo(email: string) {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passInput = document.getElementById('password') as HTMLInputElement;
    if (emailInput && passInput) {
      emailInput.value = email;
      passInput.value = 'password123';
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agency ERP & P&L</h1>
          <p className="text-sm text-slate-500">Masuk untuk mengelola operasional dan keuangan agensi</p>
        </div>

        <Card className="border-slate-200/80 shadow-xl shadow-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">Login Karyawan</CardTitle>
            <CardDescription>Masukkan kredensial akun agensi Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Perusahaan</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nama@telucode.id"
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-medium" disabled={isLoading}>
                {isLoading ? 'Memproses...' : 'Masuk ke Sistem'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col border-t bg-slate-50/50 p-4 rounded-b-xl">
            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">
                Akun Demo (Klik untuk isi cepat)
              </p>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemo('raka@telucode.id')}
                  className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
                >
                  <div>
                    <span className="font-medium text-slate-800">Raka Pratama</span>
                    <span className="text-slate-500 block">raka@telucode.id</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">OWNER</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemo('finance@telucode.id')}
                  className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
                >
                  <div>
                    <span className="font-medium text-slate-800">Sinta Wijaya</span>
                    <span className="text-slate-500 block">finance@telucode.id</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">FINANCE</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemo('nadia@telucode.id')}
                  className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
                >
                  <div>
                    <span className="font-medium text-slate-800">Nadia Putri</span>
                    <span className="text-slate-500 block">nadia@telucode.id</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-100 text-sky-800">STAFF</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                Password untuk semua akun demo: <span className="font-mono font-medium text-slate-700">password123</span>
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
