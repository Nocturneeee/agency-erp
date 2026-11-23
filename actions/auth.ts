'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createSession, destroySession, getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return { error: 'Email atau password salah.' };
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return { error: 'Email atau password salah.' };
  }

  await createSession({
    userId: user.id,
    organizationId: user.organizationId,
    email: user.email,
    name: user.name,
    role: user.role as 'OWNER' | 'PM' | 'FINANCE' | 'STAFF',
  });

  redirect('/');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
