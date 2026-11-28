'use client';

import { useState } from 'react';
import { loginAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-[#090A0F] overflow-hidden">

      {/* Orbital background rings */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-4 -left-4 h-96 w-96 rounded-full bg-[#818CF8]/10 blur-3xl opacity-70 animate-[orbital_8s_linear]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-[#818CF8]/5 blur-2xl opacity-50"></div>
        <div className="absolute bottom-1/3 right-1/4 h-[200px] w-[200px] rounded-full bg-[#818CF8]/5 blur-xl opacity-40"></div>
        <div className="absolute top-1/3 left-1/3 -translate-x-1/3 -translate-y-1/3 h-[150px] w-[150px] rounded-full bg-white/[0.04] border border-white/[0.04]"></div>
      </div>

      <div className="relative w-full max-w-[420px]">
        
        {/* Floating icon box at top center of card */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-14 w-14 rounded-2xl bg-[#181B26] border border-white/[0.08] shadow-lg flex items-center justify-center mb-6">
          <svg className="w-6 h-6 text-[#818CF8]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        <Card
          className="relative w-full rounded-[28px] bg-[#11131B] border border-white/[0.08] p-7 sm:p-8 shadow-2xl"
        >

          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-white text-center">Telucode</h1>
            <p className="mt-1.5 text-sm text-slate-400 text-center">
              Masukkan kredensial akun Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Alert Error */}
            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mr-2" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="sr-only">
                Email Perusahaan
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="rounded-xl bg-[#0B0D13] border border-white/[0.08] pl-10 pr-3.5 py-2.5 w-full text-slate-100 placeholder:text-slate-500 focus-within:border-[#818CF8]/60 focus-within:ring-2 focus-within:ring-[#818CF8]/20 transition-colors"
                />
              </div>
            </div>

            {/* Password Input with eye toggle */}
            <div className="space-y-2">
              <Label htmlFor="password" className="sr-only">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  className="rounded-xl bg-[#0B0D13] border border-white/[0.08] pl-10 pr-14 py-2.5 w-full text-slate-100 placeholder:text-slate-500 focus-within:border-[#818CF8]/60 focus-within:ring-2 focus-within:ring-[#818CF8]/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 13l3 9 23-4-9-9-5 5z" />
                  </svg> : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 12s4-8 11-8 11 8-11 8-11-8-11-8L1 12zM14.31 8h1.53a2 2 0 0 1 1.82 1.39l1.83 5.73a2 2 0 0 1-.56 1.08L16.6 16H8a2 2 0 0 1-2-2V8.68l5.17-1.57a2 2 0 0 1 1.08-.56l5.73 1.83zM 8 12l-2-8 4-5.69 4 5.69 2 8-4 5.69-4-5.69zm7.08 9.98a1 1 0 0 1-.73.28l-1.69 5.55a1 1 0 0 1-1.07-.1l-1.69-5.55a1 1 0 0 1-.28-.73zM 9 12l2 8 8-5.69-8 5.69-2-8zM 3.5 9.5l1.5 4.85a.5.5 0 0 1-.33.92l-1.5 4.85a.5.5 0 1 1-.66-.96l1.5-4.85A1.5 1.5 0 0 1 3 11.5v-5A1.5 1.5 0 0 1 4.5 5h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-.33.92l-1.5 4.85a.5.5 0 0 1-.33-.1z" />
                  </svg> }
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#818CF8] hover:bg-[#6E7BF2] py-2.5 text-sm font-semibold text-[#090A0F] transition-all shadow-lg shadow-[#818CF8]/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C20.53 4.63 17 8.31 13.97 12.03L8 21Z" />
                  </svg>
                  Masuk ke Sistem
                </span>
              ) : (
                'Masuk ke Sistem'
              )}
            </Button>

          </form>
        </Card>

        {/* Akun Demo section below the card */}
        <div className="mt-6 border-dashed border-white/[0.08] pt-6 pb-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 text-center">
            AKUN DEMO (KLIK ISI CEPAT)
          </p>
          <div className="grid grid-cols-1 gap-2.5 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => fillDemo('raka@telucode.id')}
              className="rounded-xl bg-[#0B0D13] border border-white/[0.07] hover:border-[#818CF8]/40 hover:bg-[#161924] px-3.5 py-2.5 text-left transition-all"
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7h10l1 5-5 9L3 19H1c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h7l-1.06-4.47L12 7l8 4v10H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm-7 9c-1.66 0-3 1.34-3 3v1c0 .66.34 1 1 1h8c.66 0 1-.34 1-1v-1c0-1.66-1.34-3-3-3zm7.79-4.21l-1.89-1.89a1.13 1.13 0 0 0-1.59-.07L18.16 9.1a1.12 1.12 0 0 0 .07-1.59l1.89-1.89A8.988 8.988 0 0 1 21 11.5a8.988 8.988 0 0 1-2.18 6.77l-.28.28zM9 14.05c-.66 0-1.1.34-1.39.83L6 16l2.66 1.45c.29.16.62.27.95.27s.66-.11.95-.27L9 15.25c-.3-.49-.83-1.02-1.39-.83L3 12l6-3.45c.44-.25.88-.48 1.39-.83.33-.5.25-.93.08-1.33z" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-slate-100">Raka Pratama</span>
                  <span className="block text-xs text-slate-500">raka@telucode.id</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">OWNER</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('finance@telucode.id')}
              className="rounded-xl bg-[#0B0D13] border border-white/[0.07] hover:border-[#818CF8]/40 hover:bg-[#161924] px-3.5 py-2.5 text-left transition-all"
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <svg className="w-4 h-4 text-emerald-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7h10l1 5-5 9L3 19H1c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h7l-1.06-4.47L12 7l8 4v10H5c-1.1 0-2-.9-2-2h2.17l.56 2.38 1.43-3.09L12 3l-4 3.45L3 8.55l1.72-2.85a1.12 1.12 0 0 0-.26-1.05l-1.36.68-1.95-4.55a1.13 1.13 0 0 0-1.58-.08L3 12l5.42 2.85.02.15a1.12 1.12 0 0 0 .08.33l-1.36-.68L9 6.45 5.3 3.9a1.13 1.13 0 0 0-1.08.02L1 9l8 4v6.55l2.05-1.06a1.13 1.13 0 0 0 .18-1.97L9 14.05z" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-slate-100">Sinta Wijaya</span>
                  <span className="block text-xs text-slate-500">finance@telucode.id</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">FINANCE</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('nadia@telucode.id')}
              className="rounded-xl bg-[#0B0D13] border border-white/[0.07] hover:border-[#818CF8]/40 hover:bg-[#161924] px-3.5 py-2.5 text-left transition-all"
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <svg className="w-4 h-4 text-sky-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7h10l1 5-5 9L3 19H1c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h7l-1.06-4.47L12 7l8 4v10H5c-1.1 0-2-.9-2-2h2.17l.56 2.38 1.43-3.09L12 3l-4 3.45L3 8.55l1.72-2.85a1.12 1.12 0 0 0-.26-1.05l-1.36.68-1.95-4.55a1.13 1.13 0 0 0-1.58-.08L3 12l5.42 2.85.02.15a1.12 1.12 0 0 0 .08.33l-1.36-.68L9 6.45 5.3 3.9a1.13 1.13 0 0 0-1.08.02L1 9l8 4v6.55l2.05-1.06a1.13 1.13 0 0 0 .18-1.97L9 14.05z" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-slate-100">Nadia Putri</span>
                  <span className="block text-xs text-slate-500">nadia@telucode.id</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">STAFF</span>
              </div>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Password untuk semua akun demo: <span className="text-slate-300 font-medium">password123</span>
          </p>
        </div>

      </div>
    </div>
  );
}

