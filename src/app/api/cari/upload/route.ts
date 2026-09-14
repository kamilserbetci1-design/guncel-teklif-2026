import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, getAuthUser, unauthorized, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

const BUCKET = 'cari-belgeler';
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Belge yükle: dosyayı storage'a koyar, işlemin attachments listesine ekler
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: 'Geçersiz istek.' }, { status: 400 });
  const file = form.get('file') as File | null;
  const transactionId = Number(form.get('transactionId'));
  if (!file || !transactionId) return Response.json({ error: 'Dosya ve işlem gerekli.' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: 'Sadece PDF, JPG veya PNG yükleyebilirsiniz.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'Dosya en fazla 8 MB olabilir.' }, { status: 400 });

  const db = cariDb();
  const safeName = (file.name || 'belge').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${transactionId}/${Date.now()}_${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (up.error) return Response.json({ error: 'Yükleme hatası: ' + up.error.message }, { status: 500 });

  const attachment = { path, name: file.name || safeName, type: file.type };
  const { data: row, error: readErr } = await db.from('cari_transactions').select('attachments').eq('id', transactionId).maybeSingle();
  if (readErr) return Response.json({ error: readErr.message }, { status: 500 });
  const list = Array.isArray(row?.attachments) ? row!.attachments : [];
  const newList = [...list, attachment];
  const { error: updErr } = await db.from('cari_transactions').update({ attachments: newList }).eq('id', transactionId);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  return Response.json({ ok: true, attachment, attachments: newList });
}

// Belge sil: storage'dan ve attachments listesinden kaldırır
export async function DELETE(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();
  const url = new URL(req.url);
  const transactionId = Number(url.searchParams.get('transactionId'));
  const path = url.searchParams.get('path') || '';
  if (!transactionId || !path) return Response.json({ error: 'İşlem ve dosya yolu gerekli.' }, { status: 400 });

  const db = cariDb();
  await db.storage.from(BUCKET).remove([path]);
  const { data: row } = await db.from('cari_transactions').select('attachments').eq('id', transactionId).maybeSingle();
  const list = Array.isArray(row?.attachments) ? row!.attachments : [];
  const newList = list.filter((a: { path: string }) => a.path !== path);
  const { error } = await db.from('cari_transactions').update({ attachments: newList }).eq('id', transactionId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, attachments: newList });
}
