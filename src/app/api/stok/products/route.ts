import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

// Tüm ürünler + marka/kategori listeleri
export async function GET() {
  if (!isCariConfigured()) return notConfigured();
  const db = cariDb();
  const [products, lists] = await Promise.all([
    db.from('stok_products').select('*').order('name'),
    db.from('stok_lists').select('type, name').order('name'),
  ]);
  if (products.error) {
    return Response.json(
      { error: 'Veritabanına ulaşılamadı. Stok tabloları kurulu mu? (' + products.error.message + ')' },
      { status: 500 }
    );
  }
  const brands = (lists.data || []).filter((l) => l.type === 'brand').map((l) => l.name);
  const categories = (lists.data || []).filter((l) => l.type === 'category').map((l) => l.name);
  return Response.json({ products: products.data, brands, categories });
}

// Ürün ekle / güncelle (stok değerleri de düzenlenebilir)
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const body = await req.json().catch(() => ({}));
  const record = {
    id: Number(body.id) || Date.now(),
    code: String(body.code || '').trim(),
    name: String(body.name || '').trim(),
    brand: String(body.brand || '').trim(),
    category: String(body.category || '').trim(),
    color: String(body.color || '').trim(),
    store_boxed: Math.max(0, Math.trunc(Number(body.store_boxed) || 0)),
    store_unboxed: Math.max(0, Math.trunc(Number(body.store_unboxed) || 0)),
    warehouse_boxed: Math.max(0, Math.trunc(Number(body.warehouse_boxed) || 0)),
    warehouse_unboxed: Math.max(0, Math.trunc(Number(body.warehouse_unboxed) || 0)),
    cost_list: Math.max(0, Number(body.cost_list) || 0),
    cost_discount: Math.min(100, Math.max(0, Number(body.cost_discount) || 0)),
    cost: 0, // aşağıda liste×iskonto'dan hesaplanır
    cost_currency: ['TRY', 'USD', 'EUR'].includes(body.cost_currency) ? body.cost_currency : 'TRY',
    sale_price: Math.max(0, Number(body.sale_price) || 0),
    sale_manual: body.sale_manual === true,
    updated_at: new Date().toISOString(),
  };
  // Net maliyet: liste girildiyse liste×(1-iskonto), yoksa doğrudan gelen cost
  record.cost = record.cost_list > 0
    ? record.cost_list * (1 - record.cost_discount / 100)
    : Math.max(0, Number(body.cost) || 0);
  if (!record.name) return Response.json({ error: 'Ürün adı gerekli.' }, { status: 400 });
  const { error } = await cariDb().from('stok_products').upsert(record);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: record.id });
}

// Ürün sil
export async function DELETE(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return Response.json({ error: 'ID gerekli.' }, { status: 400 });
  const { error } = await cariDb().from('stok_products').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
