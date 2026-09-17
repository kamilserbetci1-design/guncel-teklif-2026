import { NextRequest, NextResponse } from 'next/server';
import { CAFEMARKT_UA } from '@/lib/cafemarkt-catalog';

export const dynamic = 'force-dynamic';

const ALLOWED = /^https:\/\/witcdn\.cafemarkt\.com\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i;

export async function GET(req: NextRequest) {
  const u = (new URL(req.url).searchParams.get('u') || '').trim();
  if (!ALLOWED.test(u)) {
    return NextResponse.json({ error: 'Geçersiz görsel' }, { status: 400 });
  }

  try {
    const res = await fetch(u, {
      headers: {
        'user-agent': CAFEMARKT_UA,
        accept: 'image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5',
        referer: 'https://www.cafemarkt.com/',
      },
      cache: 'force-cache',
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Görsel alınamadı' }, { status: 502 });
    }
    const buf = await res.arrayBuffer();
    const type = res.headers.get('content-type') || 'image/jpeg';
    return new NextResponse(buf, {
      headers: {
        'Content-Type': type.startsWith('image/') ? type : 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Görsel alınamadı' }, { status: 502 });
  }
}
