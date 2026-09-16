import { NextRequest, NextResponse } from 'next/server';

const parseRate = (match: RegExpMatchArray | null): number => {
  if (!match || !match[1]) return 0;
  return parseFloat(match[1].replace(',', '.'));
};

const ratesFromXml = (xml: string, dateLabel: string) => {
  const usdMatch = xml.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
  const usdSelling = xml.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);
  const eurMatch = xml.match(/<Currency[^>]*Kod="EUR"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
  const eurSelling = xml.match(/<Currency[^>]*Kod="EUR"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);
  const gbpMatch = xml.match(/<Currency[^>]*Kod="GBP"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
  const gbpSelling = xml.match(/<Currency[^>]*Kod="GBP"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);

  return {
    usd: parseRate(usdSelling) || parseRate(usdMatch) || 0,
    eur: parseRate(eurSelling) || parseRate(eurMatch) || 0,
    gbp: parseRate(gbpSelling) || parseRate(gbpMatch) || 0,
    usd_buying: parseRate(usdMatch) || 0,
    eur_buying: parseRate(eurMatch) || 0,
    gbp_buying: parseRate(gbpMatch) || 0,
    source: 'TCMB',
    date: dateLabel,
  };
};

const parseInputDate = (raw: string | null): Date | null => {
  if (!raw) return null;
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const tr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!tr) return null;
  let y = Number(tr[3]);
  if (y < 100) y += 2000;
  return new Date(y, Number(tr[2]) - 1, Number(tr[1]));
};

const tcmbHistoricUrl = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `https://www.tcmb.gov.tr/kurlar/${y}${m}/${day}${m}${y}.xml`;
};

const fallback = () =>
  NextResponse.json({
    usd: 46.8,
    eur: 53.5,
    gbp: 62.5,
    usd_buying: 46.7,
    eur_buying: 53.3,
    gbp_buying: 62.2,
    source: 'Fallback',
    date: new Date().toLocaleDateString('tr-TR'),
  });

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get('date');
  const start = parseInputDate(dateParam);

  try {
    if (!start) {
      const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
        next: { revalidate: 3600 },
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) throw new Error(`TCMB API error: ${res.status}`);
      const xml = await res.text();
      const rates = ratesFromXml(xml, new Date().toLocaleDateString('tr-TR'));
      if (!rates.eur) throw new Error('parse');
      return NextResponse.json(rates);
    }

    for (let i = 0; i < 10; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      const label = d.toLocaleDateString('tr-TR');
      const res = await fetch(tcmbHistoricUrl(d), {
        next: { revalidate: 86400 },
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const rates = ratesFromXml(xml, label);
      if (rates.eur > 0 && rates.usd > 0) return NextResponse.json(rates);
    }

    throw new Error('no historic rate');
  } catch {
    return fallback();
  }
}
