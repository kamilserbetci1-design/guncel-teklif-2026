import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, getAuthUser, unauthorized, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['borc', 'satis', 'alacak', 'odeme_al'];

// Hareket ekle / güncelle
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const record = {
    id: Number(body.id) || Date.now(),
    account_id: Number(body.account_id),
    date: String(body.date || ''),
    description: String(body.description || '').trim(),
    type: String(body.type || ''),
    amount: Number(body.amount),
    payment_method: body.payment_method ? String(body.payment_method) : null,
    installments: body.installments ? String(body.installments) : null,
  };
  if (!record.account_id || !record.date || !VALID_TYPES.includes(record.type) || !(record.amount > 0)) {
    return Response.json({ error: 'Eksik veya hatalı işlem bilgisi.' }, { status: 400 });
  }
  const { error } = await cariDb().from('cari_transactions').upsert(record);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: record.id });
}

// Hareket sil
export async function DELETE(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return Response.json({ error: 'ID gerekli.' }, { status: 400 });
  const { error } = await cariDb().from('cari_transactions').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
