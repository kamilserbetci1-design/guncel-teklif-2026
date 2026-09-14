import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

// Marka veya kategori ekle
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const body = await req.json().catch(() => ({}));
  const type = body.type === 'brand' || body.type === 'category' ? body.type : null;
  const name = String(body.name || '').trim();
  if (!type || !name) return Response.json({ error: 'Tür ve ad gerekli.' }, { status: 400 });
  const { error } = await cariDb().from('stok_lists').upsert({ type, name }, { onConflict: 'type,name' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// Marka veya kategori sil
export async function DELETE(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const name = url.searchParams.get('name');
  if (!type || !name) return Response.json({ error: 'Tür ve ad gerekli.' }, { status: 400 });
  const { error } = await cariDb().from('stok_lists').delete().eq('type', type).eq('name', name);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
