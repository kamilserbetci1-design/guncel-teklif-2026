export const formatCurrency = (amount: number, symbol: string = '₺'): string => {
  if (isNaN(amount)) return `${symbol}0,00`;
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
  return symbols[currency] || '₺';
};

export type FxRates = { usd: number; eur: number; gbp: number };

export const normalizeCurrency = (currency?: string) => {
  const cur = (currency || 'TRY').toString().trim().toUpperCase();
  if (cur === 'TL' || cur === 'TRY₺') return 'TRY';
  if (cur === 'EURO' || cur === '€') return 'EUR';
  if (cur === '$') return 'USD';
  if (cur === '£') return 'GBP';
  return cur || 'TRY';
};

export const rateToTry = (currency: string | undefined, rates: FxRates) => {
  const cur = normalizeCurrency(currency);
  if (cur === 'EUR') return rates.eur || 0;
  if (cur === 'USD') return rates.usd || 0;
  if (cur === 'GBP') return rates.gbp || 0;
  return 1;
};

/** Katalog/döviz tutarını TL'ye çevirir (1 EUR/USD/GBP = rates.* TL). */
export const toTry = (amount: number, fromCurrency: string | undefined, rates: FxRates) => {
  const n = Number(amount) || 0;
  const rate = rateToTry(fromCurrency, rates);
  if (!rate) return n;
  return Math.round(n * rate * 100) / 100;
};

const medianRate = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** Kayıtlı teklifin o günkü kuru; yoksa satırlardaki exchange_rate. */
export const lockedRatesFromProposal = (
  p: {
    fx_eur?: number;
    fx_usd?: number;
    fx_gbp?: number;
    items?: { type?: string; input_currency?: string; exchange_rate?: number }[];
  },
  fallback: FxRates
): FxRates => {
  const fromItems = (cur: string) =>
    medianRate(
      (p.items || [])
        .filter((i) => i.type !== 'section' && normalizeCurrency(i.input_currency) === cur && Number(i.exchange_rate) > 1)
        .map((i) => Number(i.exchange_rate))
    );
  return {
    eur: Number(p.fx_eur) > 0 ? Number(p.fx_eur) : fromItems('EUR') || fallback.eur,
    usd: Number(p.fx_usd) > 0 ? Number(p.fx_usd) : fromItems('USD') || fallback.usd,
    gbp: Number(p.fx_gbp) > 0 ? Number(p.fx_gbp) : fromItems('GBP') || fallback.gbp,
  };
};

export const numberToText = (num: number, currency: string = 'TRY', lang: string = 'tr'): string => {
  if (isNaN(num) || num === 0) return '';
  const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const tens = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  const scales = ['', 'Bin', 'Milyon', 'Milyar'];

  const currNames: Record<string, string> = { TRY: 'Türk Lirası', USD: 'Amerikan Doları', EUR: 'Euro', GBP: 'İngiliz Sterlini' };
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const convertHundreds = (n: number): string => {
    let result = '';
    if (n >= 100) { result += (n >= 200 ? ones[Math.floor(n / 100)] : '') + 'Yüz'; n %= 100; }
    if (n >= 10) { result += tens[Math.floor(n / 10)]; n %= 10; }
    if (n > 0) result += ones[n];
    return result;
  };

  if (intPart === 0) return `Sıfır ${currNames[currency] || 'TL'}`;

  let text = '';
  let remaining = intPart;
  let scaleIndex = 0;
  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkText = (scaleIndex === 1 && chunk === 1) ? '' : convertHundreds(chunk);
      text = chunkText + scales[scaleIndex] + text;
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }

  text += ` ${currNames[currency] || 'TL'}`;
  if (decPart > 0) text += ` ${convertHundreds(decPart)} Kuruş`;
  return text;
};

export const generateProposalNo = (brandId: string): string => {
  const prefix = brandId === 'mutpro' ? 'MP' : brandId === 'inoks' ? 'IN' : brandId === 'markasiz' ? 'TK' : 'GM';
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${year}${month}-${rand}`;
};

export const getValidityDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toLocaleDateString('tr-TR');
};

export const getValidityText = (): string => {
  const today = new Date().toLocaleDateString('tr-TR');
  const expiry = getValidityDate();
  return `İşbu teklif ${today} tarihinde hazırlanmış olup, 3 gün (Sona Erme: ${expiry}) süreyle geçerlidir.`;
};

export const getTodayDate = (): string => {
  return new Date().toLocaleDateString('tr-TR');
};

export const fetchExchangeRates = async (): Promise<{ usd: number; eur: number; gbp: number }> => {
  try {
    // TCMB XML API - güncel döviz kurları
    const res = await fetch('/api/tcmb-kur');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return {
      usd: data.usd || 46.8,
      eur: data.eur || 53.5,
      gbp: data.gbp || 62.5,
    };
  } catch {
    // Fallback: alternatif API
    try {
      const res2 = await fetch('https://api.exchangerate-data.com/latest?base=USD');
      if (!res2.ok) throw new Error('Fallback API error');
      const data2 = await res2.json();
      const tryRate = data2.rates?.TRY || 46.8;
      const eurRate = data2.rates?.EUR || 0.92;
      return {
        usd: tryRate,
        eur: tryRate / eurRate,
        gbp: tryRate / (data2.rates?.GBP || 0.78),
      };
    } catch {
      return { usd: 46.8, eur: 53.5, gbp: 62.5 };
    }
  }
};
