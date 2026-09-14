// Stok Yönetimi — istemci tarafı tipler
export interface StokProduct {
  id: number;
  code: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  store_boxed: number;      // Mağaza Kutulu
  store_unboxed: number;    // Mağaza Kutusuz
  warehouse_boxed: number;  // Alt Depo Kutulu
  warehouse_unboxed: number;// Alt Depo Kutusuz
  cost: number;             // net maliyet (girildiği para biriminde) = liste × (1 - iskonto/100)
  cost_currency: string;    // 'TRY' | 'USD' | 'EUR'
  cost_list: number;        // liste fiyatı (girildiği para biriminde)
  cost_discount: number;    // iskonto yüzdesi
  sale_price: number;       // satış fiyatı (₺)
  sale_manual: boolean;     // satış elle mi girildi
}

export const CURRENCIES = ['TRY', 'USD', 'EUR'] as const;
export const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
export const SALE_MARKUP = 1.25; // maliyet + %25

export const moneyFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Maliyeti ₺'ye çevirir (rates: 1 birim = kaç ₺)
export const costToTRY = (cost: number, currency: string, rates: { usd: number; eur: number }) => {
  const rate = currency === 'USD' ? rates.usd : currency === 'EUR' ? rates.eur : 1;
  return (Number(cost) || 0) * rate;
};

// Liste fiyatı + iskonto'dan net tutar
export const netFromList = (list: number, discountPct: number) =>
  Math.max(0, (Number(list) || 0) * (1 - Math.min(100, Math.max(0, Number(discountPct) || 0)) / 100));

// Stok kovaları — yer + paket türü
export type StokLocation = 'store' | 'warehouse';
export type StokPack = 'boxed' | 'unboxed';

export const LOCATION_LABELS: Record<StokLocation, string> = {
  store: 'Mağaza',
  warehouse: 'Alt Depo',
};

export const PACK_LABELS: Record<StokPack, string> = {
  boxed: 'Kutulu',
  unboxed: 'Kutusuz',
};

// Kova alan adını üretir: store+boxed -> 'store_boxed'
export const bucketField = (loc: StokLocation, pack: StokPack) =>
  `${loc}_${pack}` as keyof Pick<StokProduct, 'store_boxed' | 'store_unboxed' | 'warehouse_boxed' | 'warehouse_unboxed'>;

export const storeTotal = (p: StokProduct) => p.store_boxed + p.store_unboxed;
export const warehouseTotal = (p: StokProduct) => p.warehouse_boxed + p.warehouse_unboxed;
export const grandTotal = (p: StokProduct) => storeTotal(p) + warehouseTotal(p);

export const numberFmt = new Intl.NumberFormat('tr-TR');

// Türkçe-duyarsız normalize: İ/ı/ş/ğ/ç/ö/ü ve aksanları sadeleştirir, boşlukları toplar
export const norm = (s: string) =>
  (s || '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();

export const SALE_MARKUP_PRESETS = [25, 30, 35];
