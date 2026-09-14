import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

const FIELDS = ['store_boxed', 'store_unboxed', 'warehouse_boxed', 'warehouse_unboxed'] as const;
type Field = (typeof FIELDS)[number];

const fieldOf = (location: string, pack: string): Field | null => {
  const loc = location === 'store' || location === 'warehouse' ? location : null;
  const pk = pack === 'boxed' || pack === 'unboxed' ? pack : null;
  if (!loc || !pk) return null;
  return `${loc}_${pk}` as Field;
};

// Stok hareketi: giriş (+), çıkış (-), transfer (kovadan kovaya)
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const body = await req.json().catch(() => ({}));
  const productId = Number(body.productId);
  const action = String(body.action || '');
  const qty = Math.trunc(Number(body.qty) || 0);

  if (!productId) return Response.json({ error: 'Ürün seçilmedi.' }, { status: 400 });
  if (!(qty > 0)) return Response.json({ error: 'Miktar 0’dan büyük olmalı.' }, { status: 400 });

  const db = cariDb();
  const { data: p, error: readErr } = await db.from('stok_products').select('*').eq('id', productId).maybeSingle();
  if (readErr) return Response.json({ error: readErr.message }, { status: 500 });
  if (!p) return Response.json({ error: 'Ürün bulunamadı.' }, { status: 404 });

  const patch: Partial<Record<Field, number>> = {};

  if (action === 'in' || action === 'out') {
    const f = fieldOf(body.location, body.pack);
    if (!f) return Response.json({ error: 'Geçersiz yer/paket.' }, { status: 400 });
    const current = Number(p[f]) || 0;
    if (action === 'out' && qty > current) {
      return Response.json({ error: `Yetersiz stok. Mevcut: ${current}` }, { status: 400 });
    }
    patch[f] = action === 'in' ? current + qty : current - qty;
  } else if (action === 'transfer') {
    const from = fieldOf(body.fromLocation, body.fromPack);
    const to = fieldOf(body.toLocation, body.toPack);
    if (!from || !to) return Response.json({ error: 'Geçersiz kaynak/hedef.' }, { status: 400 });
    if (from === to) return Response.json({ error: 'Kaynak ve hedef aynı olamaz.' }, { status: 400 });
    const fromCur = Number(p[from]) || 0;
    if (qty > fromCur) return Response.json({ error: `Yetersiz stok. Kaynakta: ${fromCur}` }, { status: 400 });
    patch[from] = fromCur - qty;
    patch[to] = (Number(p[to]) || 0) + qty;
  } else {
    return Response.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  }

  const { error } = await db
    .from('stok_products')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
