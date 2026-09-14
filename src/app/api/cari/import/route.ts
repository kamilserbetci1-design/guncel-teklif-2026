import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, getAuthUser, unauthorized, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

// Eski cari-takip HTML sisteminin JSON yedeğini içe aktarır.
// Beklenen format: { customers: [{id, name, phone, taxInfo, address}], transactions: [{id, customerId, date, desc, type, amount, paymentMethod, installments}] }
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || !body.customers || !body.transactions) {
    return Response.json({ error: 'Geçersiz yedek dosyası: müşteriler veya işlemler bulunamadı.' }, { status: 400 });
  }

  const customers = Array.isArray(body.customers) ? body.customers : Object.values(body.customers);
  const transactions = Array.isArray(body.transactions) ? body.transactions : Object.values(body.transactions);

  const accountRows = customers
    .filter((c: any) => c && c.id && c.name)
    .map((c: any) => ({
      id: Number(c.id),
      name: String(c.name),
      phone: c.phone ? String(c.phone) : null,
      tax_info: c.taxInfo ? String(c.taxInfo) : null,
      address: c.address ? String(c.address) : null,
    }));

  const validAccountIds = new Set(accountRows.map((a: any) => a.id));

  const txRows = transactions
    .filter((t: any) => t && t.id && t.customerId && validAccountIds.has(Number(t.customerId)))
    .map((t: any) => {
      // Eski sistemdeki "0025" tarih hatalarını düzelt
      let date = String(t.date || '');
      if (date.startsWith('0025')) date = date.replace('0025', '2025');
      return {
        id: Number(t.id),
        account_id: Number(t.customerId),
        date,
        description: String(t.desc || ''),
        type: ['borc', 'satis', 'alacak', 'odeme_al'].includes(t.type) ? t.type : 'borc',
        amount: Number(t.amount) || 0,
        payment_method: t.paymentMethod ? String(t.paymentMethod) : null,
        installments: t.installments ? String(t.installments) : null,
      };
    });

  const db = cariDb();
  const accRes = await db.from('cari_accounts').upsert(accountRows);
  if (accRes.error) return Response.json({ error: 'Cari kartlar aktarılamadı: ' + accRes.error.message }, { status: 500 });

  // Büyük yedeklerde tek istekte sınırı aşmamak için 500'lük parçalarla yükle
  for (let i = 0; i < txRows.length; i += 500) {
    const chunk = txRows.slice(i, i + 500);
    const txRes = await db.from('cari_transactions').upsert(chunk);
    if (txRes.error) return Response.json({ error: 'Hareketler aktarılamadı: ' + txRes.error.message }, { status: 500 });
  }

  return Response.json({ ok: true, accounts: accountRows.length, transactions: txRows.length });
}
