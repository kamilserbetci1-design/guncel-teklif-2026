import { NextRequest, NextResponse } from 'next/server';
import {
  cariDb,
  isCariConfigured,
  hashPassword,
  verifyPassword,
  createSessionToken,
  getAuthUser,
  notConfigured,
  COOKIE_NAME,
  SESSION_HOURS,
  REMEMBER_DAYS,
} from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

const baseCookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

// "Beni Hatırla" işaretliyse çerez 30 gün, değilse 24 saat yaşar
const cookieMaxAge = (remember: boolean) =>
  remember ? REMEMBER_DAYS * 24 * 60 * 60 : SESSION_HOURS * 60 * 60;

// Oturum durumu: giriş yapılmış mı, ilk kurulum gerekli mi?
export async function GET(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const user = getAuthUser(req);
  const db = cariDb();
  const { count, error } = await db.from('cari_users').select('*', { count: 'exact', head: true });
  if (error) {
    return Response.json(
      { error: 'Veritabanına ulaşılamadı. Supabase tabloları kurulu mu? (' + error.message + ')' },
      { status: 500 }
    );
  }
  return Response.json({
    authenticated: !!user,
    username: user,
    setupRequired: (count ?? 0) === 0,
  });
}

// Giriş yap (kullanıcı yoksa ilk kurulum: ilk kullanıcıyı oluştur)
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const remember = body.remember === true;
  if (!username || !password) {
    return Response.json({ error: 'Kullanıcı adı ve şifre gerekli.' }, { status: 400 });
  }

  const db = cariDb();
  const { count } = await db.from('cari_users').select('*', { count: 'exact', head: true });

  // İlk kurulum: hiç kullanıcı yoksa, girilen bilgilerle ilk kullanıcıyı oluştur
  if ((count ?? 0) === 0) {
    if (password.length < 6) {
      return Response.json({ error: 'Şifre en az 6 karakter olmalı.' }, { status: 400 });
    }
    const { error } = await db
      .from('cari_users')
      .insert({ username, password_hash: hashPassword(password) });
    if (error) return Response.json({ error: 'Kullanıcı oluşturulamadı: ' + error.message }, { status: 500 });
    const res = NextResponse.json({ ok: true, username, firstSetup: true });
    res.cookies.set(COOKIE_NAME, createSessionToken(username, remember), { ...baseCookieOpts, maxAge: cookieMaxAge(remember) });
    return res;
  }

  const { data: userRow } = await db
    .from('cari_users')
    .select('username, password_hash')
    .eq('username', username)
    .maybeSingle();

  if (!userRow || !verifyPassword(password, userRow.password_hash)) {
    return Response.json({ error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, username });
  res.cookies.set(COOKIE_NAME, createSessionToken(username, remember), { ...baseCookieOpts, maxAge: cookieMaxAge(remember) });
  return res;
}

// Çıkış yap
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { ...baseCookieOpts, maxAge: 0 });
  return res;
}
