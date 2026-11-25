'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createSession, destroySession, UserRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export async function loginAction(rawInput: { email: string; password: string }) {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));

    if (!user || !user.passwordHash) {
      return { success: false, error: 'Email atau password salah.' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: 'Email atau password salah.' };
    }

    await createSession({
      userId: user.id,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
    });
  } catch (error) {
    return { success: false, error: 'Terjadi kesalahan saat proses login.' };
  }

  redirect('/');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}