import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, getAuthUser, unauthorized, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

const BUCKET = 'cari-belgeler';

// Belgeyi (görüntüleme/indirme) sunar — tarayıcı cookie ile yetkilenir
export async function GET(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  if (!getAuthUser(req)) return unauthorized();
  const path = new URL(req.url).searchParams.get('path') || '';
  if (!path) return Response.json({ error: 'Dosya yolu gerekli.' }, { status: 400 });

  const db = cariDb();
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) return Response.json({ error: 'Dosya bulunamadı.' }, { status: 404 });

  const buf = await data.arrayBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'private, max-age=60',
    },
  });
}
