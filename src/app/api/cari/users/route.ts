import { NextRequest } from 'next/server';
import {
  cariDb,
  isCariConfigured,
  hashPassword,
  verifyPassword,
  getAuthUser,
  unauthorized,
  notConfigured,
} from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

// Kullanıcı listesi
export async function GET(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  const { data, error } = await cariDb()
    .from('cari_users')
    .select('id, username, created_at')
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ users: data, me: user });
}

// Yeni kullanıcı oluştur
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || password.length < 6) {
    return Response.json({ error: 'Kullanıcı adı gerekli, şifre en az 6 karakter olmalı.' }, { status: 400 });
  }
  const { error } = await cariDb()
    .from('cari_users')
    .insert({ username, password_hash: hashPassword(password) });
  if (error) {
    const msg = error.code === '23505' ? 'Bu kullanıcı adı zaten mevcut.' : error.message;
    return Response.json({ error: msg }, { status: 400 });
  }
  return Response.json({ ok: true });
}

// Şifre değiştir (kendi şifresi — mevcut şifre doğrulaması ile)
export async function PUT(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (newPassword.length < 6) {
    return Response.json({ error: 'Yeni şifre en az 6 karakter olmalı.' }, { status: 400 });
  }
  const db = cariDb();
  const { data: row } = await db
    .from('cari_users')
    .select('password_hash')
    .eq('username', user)
    .maybeSingle();
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    return Response.json({ error: 'Mevcut şifreniz hatalı.' }, { status: 401 });
  }
  const { error } = await db
    .from('cari_users')
    .update({ password_hash: hashPassword(newPassword) })
    .eq('username', user);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// Kullanıcı sil (kendini silemez, son kullanıcı silinemez)
export async function DELETE(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  const username = String(new URL(req.url).searchParams.get('username') || '').toLowerCase();
  if (!username) return Response.json({ error: 'Kullanıcı adı gerekli.' }, { status: 400 });
  if (username === user) {
    return Response.json({ error: 'Kendi hesabınızı silemezsiniz.' }, { status: 400 });
  }
  const db = cariDb();
  const { count } = await db.from('cari_users').select('*', { count: 'exact', head: true });
  if ((count ?? 0) <= 1) {
    return Response.json({ error: 'Son kullanıcı silinemez.' }, { status: 400 });
  }
  const { error } = await db.from('cari_users').delete().eq('username', username);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
