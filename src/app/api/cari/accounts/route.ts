import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, getAuthUser, unauthorized, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

// Tüm cari kartlar + tüm hareketler (tek istekte)
export async function GET(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();
  const db = cariDb();
  const [accounts, transactions] = await Promise.all([
    db.from('cari_accounts').select('*').order('name'),
    db.from('cari_transactions').select('*').order('date'),
  ]);
  if (accounts.error) return Response.json({ error: accounts.error.message }, { status: 500 });
  if (transactions.error) return Response.json({ error: transactions.error.message }, { status: 500 });
  return Response.json({ accounts: accounts.data, transactions: transactions.data });
}

// Cari kart ekle / güncelle
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const record = {
    id: Number(body.id) || Date.now(),
    name: String(body.name || '').trim(),
    phone: String(body.phone || '').trim() || null,
    tax_info: String(body.tax_info || '').trim() || null,
    address: String(body.address || '').trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (!record.name) return Response.json({ error: 'Ünvan gerekli.' }, { status: 400 });
  const { error } = await cariDb().from('cari_accounts').upsert(record);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: record.id });
}

// Cari kart sil (hareketleri de CASCADE ile silinir)
export async function DELETE(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return Response.json({ error: 'ID gerekli.' }, { status: 400 });
  const { error } = await cariDb().from('cari_accounts').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
