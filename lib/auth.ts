import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'fallback-dev-secret-key-minimal-32-chars'
);

const COOKIE_NAME = 'agency_erp_session';

export type UserRole = 'OWNER' | 'PM' | 'FINANCE' | 'STAFF';

export interface SessionPayload {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
}

// 1. Membuat cookie sesi terenkripsi saat berhasil login
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Sesi berlaku 7 hari
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

// 2. Membaca sesi user yang sedang aktif (return null jika belum login)
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// 3. Menghapus sesi saat logout
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// 4. Penjaga Halaman (Redirect otomatis ke /login jika belum masuk)
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

// 5. Penjaga RBAC untuk Server Actions (Lempar error jika role tidak sesuai)
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }
  if (!allowedRoles.includes(session.role)) {
    throw new Error(
      `Akses ditolak: Fitur ini hanya dapat diakses oleh ${allowedRoles.join(' / ')}.`
    );
  }
  return session;
}