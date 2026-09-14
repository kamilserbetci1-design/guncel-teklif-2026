// Cari Takip — sunucu tarafı auth yardımcıları (SADECE API route'larında kullanılır)
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const COOKIE_NAME = 'cari_session';
export const SESSION_HOURS = 24; // "Beni Hatırla" işaretsiz: 24 saat
export const REMEMBER_DAYS = 30; // "Beni Hatırla" işaretli: 30 gün

export const isCariConfigured = () => supabaseUrl.length > 0 && serviceKey.length > 0;

// Service role client — RLS'i aşar, sadece sunucuda çalışır
export const cariDb = () =>
  createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const sessionSecret = () =>
  process.env.CARI_SESSION_SECRET || serviceKey || 'cari-fallback-secret';

// --- Şifre hashleme (scrypt) ---
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// --- Oturum token'ı (HMAC imzalı) ---
export function createSessionToken(username: string, remember = false): string {
  const ms = remember ? REMEMBER_DAYS * 24 * 60 * 60 * 1000 : SESSION_HOURS * 60 * 60 * 1000;
  const expires = Date.now() + ms;
  const payload = Buffer.from(JSON.stringify({ u: username, e: expires })).toString('base64url');
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.u !== 'string' || typeof data.e !== 'number') return null;
    if (Date.now() > data.e) return null;
    return data.u;
  } catch {
    return null;
  }
}

// İstekten giriş yapmış kullanıcıyı çıkarır (yoksa null)
export function getAuthUser(req: NextRequest): string | null {
  return verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
}

export const unauthorized = () =>
  Response.json({ error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' }, { status: 401 });

export const notConfigured = () =>
  Response.json(
    { error: 'Sunucu yapılandırması eksik: SUPABASE_SERVICE_ROLE_KEY tanımlı değil.' },
    { status: 503 }
  );
