import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TCMB günlük döviz kurları XML
    const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
      next: { revalidate: 3600 }, // 1 saat cache
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!res.ok) throw new Error(`TCMB API error: ${res.status}`);

    const xml = await res.text();

    // USD döviz alış kuru
    const usdMatch = xml.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const usdSelling = xml.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);

    // EUR döviz alış kuru
    const eurMatch = xml.match(/<Currency[^>]*Kod="EUR"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const eurSelling = xml.match(/<Currency[^>]*Kod="EUR"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);

    // GBP döviz alış kuru
    const gbpMatch = xml.match(/<Currency[^>]*Kod="GBP"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const gbpSelling = xml.match(/<Currency[^>]*Kod="GBP"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);

    const parseRate = (match: RegExpMatchArray | null): number => {
      if (!match || !match[1]) return 0;
      return parseFloat(match[1].replace(',', '.'));
    };

    const rates = {
      usd: parseRate(usdSelling) || parseRate(usdMatch) || 46.8,
      eur: parseRate(eurSelling) || parseRate(eurMatch) || 53.5,
      gbp: parseRate(gbpSelling) || parseRate(gbpMatch) || 62.5,
      usd_buying: parseRate(usdMatch) || 46.7,
      eur_buying: parseRate(eurMatch) || 53.3,
      gbp_buying: parseRate(gbpMatch) || 62.2,
      source: 'TCMB',
      date: new Date().toLocaleDateString('tr-TR'),
    };

    return NextResponse.json(rates);
  } catch (error) {
    // Fallback değerler (TCMB'ye ulaşılamazsa)
    return NextResponse.json({
      usd: 46.8,
      eur: 53.5,
      gbp: 62.5,
      usd_buying: 46.7,
      eur_buying: 53.3,
      gbp_buying: 62.2,
      source: 'Fallback',
      date: new Date().toLocaleDateString('tr-TR'),
    });
  }
}
