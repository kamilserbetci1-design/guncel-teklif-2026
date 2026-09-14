'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  StokProduct, StokLocation, StokPack, LOCATION_LABELS, PACK_LABELS,
  storeTotal, warehouseTotal, grandTotal, numberFmt,
  CURRENCIES, CURRENCY_SYMBOLS, SALE_MARKUP_PRESETS, moneyFmt, costToTRY, netFromList, norm,
} from '@/lib/stok-types';
import {
  Package, Store, Warehouse, Plus, Search, Pencil, Trash2, X, FileDown, Upload,
  ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Loader2, ShieldCheck, Boxes,
  Tag, Layers, AlertTriangle, Printer, PackageSearch, Copy,
} from 'lucide-react';

// Teklif kataloğundan hafif ürün kaydı (otomatik doldurma için)
type CatalogItem = { name: string; sku: string; manufacturer: string; category: string };

const MUTPRO_LOGO = '/logos/mutpro-mavi-logo.jpeg';
const NAVY = '#040023';
const ORANGE = '#f97316';
const LOW_STOCK = 1; // bu değer ve altı "düşük stok"

export default function StokPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brand as string;

  useEffect(() => {
    if (brandId !== 'mutpro') router.replace(`/${brandId}/dashboard`);
  }, [brandId, router]);

  const [products, setProducts] = useState<StokProduct[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/stok/products', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setConfigError(data.error || 'Sunucu hatası'); return; }
      setConfigError(null);
      setProducts((data.products || []).map((p: any) => ({
        ...p,
        store_boxed: Number(p.store_boxed) || 0,
        store_unboxed: Number(p.store_unboxed) || 0,
        warehouse_boxed: Number(p.warehouse_boxed) || 0,
        warehouse_unboxed: Number(p.warehouse_unboxed) || 0,
        cost: Number(p.cost) || 0,
        cost_currency: p.cost_currency || 'TRY',
        cost_list: Number(p.cost_list) || 0,
        cost_discount: Number(p.cost_discount) || 0,
        sale_price: Number(p.sale_price) || 0,
        sale_manual: p.sale_manual === true,
      })));
      setBrands(data.brands || []);
      setCategories(data.categories || []);
    } catch {
      setConfigError('Sunucuya ulaşılamadı.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (brandId === 'mutpro') load(); }, [brandId, load]);

  // Döviz kurları — her açılışta doğrudan TCMB'den güncel çek (kayıtlı bayat değere güvenme)
  const storeRates = useAppStore((s) => s.rates);
  const setStoreRates = useAppStore((s) => s.setRates);
  const [liveRates, setLiveRates] = useState<{ usd: number; eur: number; gbp: number } | null>(null);
  const [rateDate, setRateDate] = useState('');
  useEffect(() => {
    fetch('/api/tcmb-kur', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.usd) {
          const r = { usd: d.usd, eur: d.eur, gbp: d.gbp };
          setLiveRates(r);
          setStoreRates(r); // store'daki bayat değeri de güncelle
          if (d.date) setRateDate(`${d.source || 'TCMB'} · ${d.date}`);
        }
      })
      .catch(() => {});
  }, [setStoreRates]);
  const rates = liveRates || storeRates;

  // Teklif kataloğu (Ürün Yönetimi'ndeki ürünler) — yeni ürün eklerken otomatik doldurma
  const catalogProducts = useAppStore((s) => s.products);
  const catalog: CatalogItem[] = useMemo(
    () => catalogProducts
      .filter((p) => p.brand_id === 'mutpro')
      .map((p) => ({
        name: p.name,
        sku: p.sku || '',
        manufacturer: p.manufacturer || '',
        category: (p.category || '').split('>')[0].trim(),
      })),
    [catalogProducts]
  );

  // Filtreler
  const [search, setSearch] = useState('');
  const [fBrand, setFBrand] = useState('');
  const [fCat, setFCat] = useState('');
  const [fPack, setFPack] = useState<'' | StokPack>('');
  const [fPrice, setFPrice] = useState<'' | 'priced' | 'unpriced'>(''); // fiyat girilmiş / girilmemiş
  const [locFilter, setLocFilter] = useState<'' | StokLocation>(''); // kart tıklamasıyla mağaza/depo filtresi

  // Modallar
  const [productModal, setProductModal] = useState<{ open: boolean; edit?: StokProduct }>({ open: false });
  const [moveModal, setMoveModal] = useState<{ open: boolean; product?: StokProduct }>({ open: false });
  const [listsModal, setListsModal] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);

  const brandOptions = useMemo(() => {
    const s = new Set<string>(brands);
    products.forEach((p) => p.brand && s.add(p.brand));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [brands, products]);

  const catOptions = useMemo(() => {
    const s = new Set<string>(categories);
    products.forEach((p) => p.category && s.add(p.category));
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [categories, products]);

  const filtered = useMemo(() => {
    const words = norm(search).split(' ').filter(Boolean); // çok kelimeli, Türkçe-duyarsız arama
    return products.filter((p) => {
      if (locFilter === 'store' && storeTotal(p) === 0) return false;
      if (locFilter === 'warehouse' && warehouseTotal(p) === 0) return false;
      if (fBrand && norm(p.brand) !== norm(fBrand)) return false;
      if (fCat && norm(p.category) !== norm(fCat)) return false;
      // Paket filtresi seçili depoya göre sayar (mağaza/depo/hepsi)
      const boxed = locFilter === 'store' ? p.store_boxed : locFilter === 'warehouse' ? p.warehouse_boxed : p.store_boxed + p.warehouse_boxed;
      const unboxed = locFilter === 'store' ? p.store_unboxed : locFilter === 'warehouse' ? p.warehouse_unboxed : p.store_unboxed + p.warehouse_unboxed;
      if (fPack === 'boxed' && boxed === 0) return false;
      if (fPack === 'unboxed' && unboxed === 0) return false;
      const hasPrice = p.cost > 0 || p.sale_price > 0;
      if (fPrice === 'priced' && !hasPrice) return false;
      if (fPrice === 'unpriced' && hasPrice) return false;
      if (words.length) {
        const hay = norm(`${p.code} ${p.name} ${p.brand} ${p.category} ${p.color}`);
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [products, search, fBrand, fCat, fPack, fPrice, locFilter]);

  const totals = useMemo(() => {
    let store = 0, warehouse = 0, boxed = 0, unboxed = 0;
    products.forEach((p) => {
      store += storeTotal(p); warehouse += warehouseTotal(p);
      boxed += p.store_boxed + p.warehouse_boxed;
      unboxed += p.store_unboxed + p.warehouse_unboxed;
    });
    return { kinds: products.length, store, warehouse, boxed, unboxed, total: store + warehouse };
  }, [products]);

  // Stok maliyeti — aktif filtreye göre (mağaza/depo/filtreli), TL bazında
  const filteredCostValue = useMemo(() =>
    filtered.reduce((sum, p) => {
      const qty = locFilter === 'store' ? storeTotal(p) : locFilter === 'warehouse' ? warehouseTotal(p) : grandTotal(p);
      return sum + costToTRY(p.cost, p.cost_currency, rates) * qty;
    }, 0),
    [filtered, locFilter, rates.usd, rates.eur]
  );

  const costLabel = locFilter === 'store' ? 'Mağaza Stok Maliyeti'
    : locFilter === 'warehouse' ? 'Alt Depo Stok Maliyeti'
    : (fBrand || fCat || fPack || fPrice || search) ? 'Filtreli Stok Maliyeti'
    : 'Toplam Stok Maliyeti';

  const saveProduct = async (rec: Partial<StokProduct>) => {
    const res = await fetch('/api/stok/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Kaydedilemedi.'); return; }
    await load();
    setProductModal({ open: false });
    showToast(rec.id ? 'Ürün güncellendi.' : 'Ürün eklendi.');
  };

  const deleteProduct = async (p: StokProduct) => {
    if (!confirm(`"${p.name}" ürünü silinsin mi?`)) return;
    const res = await fetch(`/api/stok/products?id=${p.id}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Silinemedi.'); return; }
    await load();
    showToast('Ürün silindi.');
  };

  const duplicateProduct = async (p: StokProduct) => {
    const copy = {
      id: Date.now(),
      code: p.code, name: `${p.name} (Kopya)`, brand: p.brand, category: p.category, color: p.color,
      store_boxed: p.store_boxed, store_unboxed: p.store_unboxed,
      warehouse_boxed: p.warehouse_boxed, warehouse_unboxed: p.warehouse_unboxed,
      cost_list: p.cost_list, cost_discount: p.cost_discount, cost: p.cost,
      cost_currency: p.cost_currency, sale_price: p.sale_price, sale_manual: p.sale_manual,
    };
    const res = await fetch('/api/stok/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(copy),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Çoğaltılamadı.'); return; }
    await load();
    showToast('Ürün çoğaltıldı.');
  };

  const doMovement = async (payload: any) => {
    const res = await fetch('/api/stok/movement', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'İşlem başarısız.'); return false; }
    await load();
    showToast('Stok güncellendi.');
    return true;
  };

  const backup = () => {
    const exportProducts = products.map((p) => ({
      code: p.code, name: p.name, brand: p.brand, category: p.category, color: p.color,
      stockStoreBoxed: p.store_boxed, stockStoreUnboxed: p.store_unboxed,
      stockWarehouseBoxed: p.warehouse_boxed, stockWarehouseUnboxed: p.warehouse_unboxed, id: p.id,
    }));
    const blob = new Blob([JSON.stringify({ products: exportProducts, brands: brandOptions, categories: catOptions, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mutpro_stok_yedek_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Yedek indirildi.');
  };

  const restore = async (file: File) => {
    if (!confirm('Yedekteki ürünler sisteme aktarılacak (aynı ürünler güncellenir). Devam edilsin mi?')) return;
    showToast('Yedek aktarılıyor...');
    try {
      const json = JSON.parse(await file.text());
      const res = await fetch('/api/stok/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Aktarım başarısız.'); return; }
      await load();
      showToast(`Aktarıldı: ${data.products} ürün, ${data.brands} marka, ${data.categories} kategori.`);
    } catch (e: any) {
      showToast('Dosya okunamadı: ' + (e?.message || ''));
    }
  };

  const addList = async (type: 'brand' | 'category', name: string) => {
    const res = await fetch('/api/stok/lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, name }),
    });
    if (!res.ok) { const d = await res.json(); showToast(d.error || 'Eklenemedi.'); return; }
    await load();
  };
  const delList = async (type: 'brand' | 'category', name: string) => {
    const res = await fetch(`/api/stok/lists?type=${type}&name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Silinemedi.'); return; }
    await load();
  };

  if (brandId !== 'mutpro') return null;

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Stok yükleniyor...</div>;
  }
  if (configError) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4"><ShieldCheck className="w-7 h-7 text-amber-600" /></div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Stok Kurulumu Gerekli</h2>
        <p className="text-sm text-gray-500 mb-4">{configError}</p>
        <p className="text-xs text-gray-500 mb-4">Supabase’de <code className="bg-gray-100 px-1 rounded">supabase-stok-migration.sql</code> dosyasını çalıştırın.</p>
        <button onClick={load} className="px-5 py-2.5 rounded-lg text-white text-sm font-bold" style={{ background: NAVY }}>Tekrar Dene</button>
      </div>
    );
  }

  return (
    <div className="-m-4 lg:-m-6">
      {/* Üst araç çubuğu */}
      <div className="sticky top-[57px] z-20 bg-white/90 backdrop-blur border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <img src={MUTPRO_LOGO} alt="MutPro" className="h-8 w-auto object-contain" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">Stok Yönetimi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ToolBtn onClick={() => setListsModal(true)} icon={<Tag className="w-4 h-4" />} label="Marka/Kategori" />
          <ToolBtn onClick={() => window.print()} icon={<Printer className="w-4 h-4" />} label="Yazdır" />
          <ToolBtn onClick={backup} icon={<FileDown className="w-4 h-4" />} label="Yedekle" tone="blue" />
          <ToolBtn onClick={() => restoreRef.current?.click()} icon={<Upload className="w-4 h-4" />} label="Yükle" tone="purple" />
          <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
          <button onClick={() => setProductModal({ open: true })} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg" style={{ background: ORANGE }}>
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Yeni Ürün</span>
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-5">
        {/* Özet kartlar — sayfa kaydırılırken üstte yapışık kalır */}
        <div className="sticky top-[112px] z-10 bg-gray-50 py-2 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={<Boxes className="w-5 h-5" />} label="Toplam Çeşit" value={numberFmt.format(totals.kinds)} tone="navy"
            onClick={locFilter ? () => setLocFilter('') : undefined} />
          <StatCard icon={<Store className="w-5 h-5" />} label="Mağaza Stok" value={numberFmt.format(totals.store)} tone="blue"
            onClick={() => setLocFilter((v) => (v === 'store' ? '' : 'store'))} active={locFilter === 'store'} />
          <StatCard icon={<Warehouse className="w-5 h-5" />} label="Alt Depo Stok" value={numberFmt.format(totals.warehouse)} tone="purple"
            onClick={() => setLocFilter((v) => (v === 'warehouse' ? '' : 'warehouse'))} active={locFilter === 'warehouse'} />
          <StatCard icon={<Package className="w-5 h-5" />} label="Toplam Adet" value={numberFmt.format(totals.total)} tone="orange" />
          <StatCard icon={<Layers className="w-5 h-5" />} label="Kutulu / Kutusuz" value={`${numberFmt.format(totals.boxed)} / ${numberFmt.format(totals.unboxed)}`} tone="green" small />
        </div>

        {/* Toplam stok maliyeti — sağda, ürün satırındaki küçük fiyat formatında (girdi/çıktı oldukça güncellenir) */}
        <div className="flex justify-end -mt-2">
          <span className="inline-flex items-baseline gap-1.5 text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            {costLabel}:
            <b className="font-mono text-sm text-gray-800">{moneyFmt.format(filteredCostValue)} ₺</b>
          </span>
        </div>

        {/* Filtreler + tablo */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kod, ad, marka ara..."
                className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg w-full outline-none focus:border-orange-500" />
            </div>
            <select value={fBrand} onChange={(e) => setFBrand(e.target.value)} className="text-xs border border-gray-200 rounded-lg py-2 px-3 font-medium text-gray-700 outline-none focus:border-orange-500">
              <option value="">Tüm Markalar</option>
              {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="text-xs border border-gray-200 rounded-lg py-2 px-3 font-medium text-gray-700 outline-none focus:border-orange-500">
              <option value="">Tüm Kategoriler</option>
              {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={fPack} onChange={(e) => setFPack(e.target.value as any)} className="text-xs border border-gray-200 rounded-lg py-2 px-3 font-medium text-gray-700 outline-none focus:border-orange-500">
              <option value="">Tüm Paketler</option>
              <option value="boxed">Kutulu olanlar</option>
              <option value="unboxed">Kutusuz olanlar</option>
            </select>
            <select value={fPrice} onChange={(e) => setFPrice(e.target.value as any)} className="text-xs border border-gray-200 rounded-lg py-2 px-3 font-medium text-gray-700 outline-none focus:border-orange-500">
              <option value="">Tüm Fiyatlar</option>
              <option value="priced">Fiyatı girilenler</option>
              <option value="unpriced">Fiyatı olmayanlar</option>
            </select>
          </div>

          {/* Aktif filtre çipleri */}
          {(locFilter || fBrand || fCat || fPack || fPrice || search) && (
            <div className="px-3 pb-3 -mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Filtreler:</span>
              {locFilter && <Chip label={locFilter === 'store' ? '🏬 Mağaza' : '📦 Alt Depo'} onClear={() => setLocFilter('')} />}
              {fBrand && <Chip label={fBrand} onClear={() => setFBrand('')} />}
              {fCat && <Chip label={fCat} onClear={() => setFCat('')} />}
              {fPack && <Chip label={fPack === 'boxed' ? 'Kutulu' : 'Kutusuz'} onClear={() => setFPack('')} />}
              {fPrice && <Chip label={fPrice === 'priced' ? 'Fiyatı girilenler' : 'Fiyatı olmayanlar'} onClear={() => setFPrice('')} />}
              {search && <Chip label={`"${search}"`} onClear={() => setSearch('')} />}
              <button onClick={() => { setLocFilter(''); setFBrand(''); setFCat(''); setFPack(''); setFPrice(''); setSearch(''); }}
                className="text-[10px] font-bold text-rose-600 hover:underline ml-1">Tümünü temizle</button>
            </div>
          )}

          <div className="overflow-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-extrabold tracking-widest">
                <tr>
                  <th className="p-3">Ürün</th>
                  <th className="p-3 hidden md:table-cell">Marka / Kategori</th>
                  <th className="p-3 text-center bg-blue-50/50 text-blue-600 border-l border-blue-100" colSpan={2}>🏬 Mağaza</th>
                  <th className="p-3 text-center bg-purple-50/50 text-purple-600 border-l border-purple-100" colSpan={2}>📦 Alt Depo</th>
                  <th className="p-3 text-right border-l border-gray-200">Toplam</th>
                  <th className="p-3 text-center w-20">İşlem</th>
                </tr>
                <tr className="text-[9px]">
                  <th className="px-3 pb-2"></th>
                  <th className="px-3 pb-2 hidden md:table-cell"></th>
                  <th className="px-3 pb-2 text-center font-semibold bg-blue-50/30 text-blue-500 border-l border-blue-100">Kutulu</th>
                  <th className="px-3 pb-2 text-center font-semibold bg-blue-50/30 text-blue-500">Kutusuz</th>
                  <th className="px-3 pb-2 text-center font-semibold bg-purple-50/30 text-purple-500 border-l border-purple-100">Kutulu</th>
                  <th className="px-3 pb-2 text-center font-semibold bg-purple-50/30 text-purple-500">Kutusuz</th>
                  <th className="px-3 pb-2 border-l border-gray-200"></th>
                  <th className="px-3 pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-12 text-center text-gray-400">Sonuç bulunamadı. Yeni ürün ekleyin veya yedek yükleyin.</td></tr>
                )}
                {filtered.map((p) => {
                  const total = grandTotal(p);
                  const low = total <= LOW_STOCK;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {low && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <div>
                            <div className="font-semibold text-gray-800 leading-tight">{p.name}</div>
                            <div className="text-[10px] text-gray-400">{p.code}{p.color ? ` • ${p.color}` : ''}</div>
                            <div className="text-[10px] text-gray-400 md:hidden">{p.brand} {p.category ? `• ${p.category}` : ''}</div>
                            {(p.sale_price > 0 || p.cost > 0) && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                                {p.sale_price > 0 && (
                                  <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Satış: {moneyFmt.format(costToTRY(p.sale_price, p.cost_currency, rates))} ₺
                                  </span>
                                )}
                                {p.cost > 0 && (
                                  <span className="text-gray-400">
                                    Maliyet: {moneyFmt.format(costToTRY(p.cost, p.cost_currency, rates))} ₺
                                  </span>
                                )}
                                {p.cost_currency !== 'TRY' && (
                                  <span className="text-gray-300 text-[9px]">({CURRENCY_SYMBOLS[p.cost_currency]} bazlı)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="text-gray-700 font-medium">{p.brand || '-'}</div>
                        <div className="text-[10px] text-gray-400">{p.category || ''}</div>
                      </td>
                      <Cell v={p.store_boxed} tone="store" first />
                      <Cell v={p.store_unboxed} tone="store" />
                      <Cell v={p.warehouse_boxed} tone="warehouse" first />
                      <Cell v={p.warehouse_unboxed} tone="warehouse" />
                      <td className={`p-3 text-right font-mono font-bold border-l border-gray-200 ${low ? 'text-amber-600' : 'text-gray-800'}`}>{numberFmt.format(total)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setMoveModal({ open: true, product: p })} className="text-white p-1.5 rounded" style={{ background: NAVY }} title="Stok Hareketi"><ArrowRightLeft className="w-3.5 h-3.5" /></button>
                          <button onClick={() => duplicateProduct(p)} className="text-emerald-500 hover:bg-emerald-500 hover:text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Aynı ürünü çoğalt"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setProductModal({ open: true, edit: p })} className="text-blue-500 hover:bg-blue-500 hover:text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Düzenle"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteProduct(p)} className="text-gray-400 hover:bg-rose-500 hover:text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 p-3 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between px-4">
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-500" /> Sarı = düşük stok ({LOW_STOCK} ve altı)</span>
            <span className="bg-gray-200 px-2 py-0.5 rounded-full">{filtered.length} / {products.length} ürün</span>
          </div>
        </div>
      </div>

      {productModal.open && (
        <ProductModal edit={productModal.edit} brandOptions={brandOptions} catOptions={catOptions} catalog={catalog} rates={rates} rateDate={rateDate} onAddList={addList} onClose={() => setProductModal({ open: false })} onSave={saveProduct} />
      )}
      {moveModal.open && moveModal.product && (
        <MovementModal product={moveModal.product} onClose={() => setMoveModal({ open: false })} onSubmit={doMovement} />
      )}
      {listsModal && (
        <ListsModal brands={brandOptions} categories={catOptions} onAdd={addList} onDelete={delList} onClose={() => setListsModal(false)} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 border-l-4 border-emerald-500 text-sm font-medium">{toast}</div>
      )}
    </div>
  );
}

function Cell({ v, tone, first }: { v: number; tone: 'store' | 'warehouse'; first?: boolean }) {
  const bg = tone === 'store' ? 'bg-blue-50/30' : 'bg-purple-50/30';
  const border = first ? (tone === 'store' ? 'border-l border-blue-100' : 'border-l border-purple-100') : '';
  return <td className={`p-3 text-center font-mono ${bg} ${border} ${v > 0 ? 'text-gray-800 font-semibold' : 'text-gray-300'}`}>{v > 0 ? numberFmt.format(v) : '·'}</td>;
}

function ToolBtn({ onClick, icon, label, tone }: { onClick: () => void; icon: React.ReactNode; label: string; tone?: 'blue' | 'purple' }) {
  const tones: Record<string, string> = {
    blue: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
    purple: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
  };
  const cls = tone ? tones[tone] : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50';
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium border rounded-lg transition-colors ${cls}`}>
      {icon}<span className="hidden md:inline">{label}</span>
    </button>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-medium px-2 py-1 rounded-full">
      {label}
      <button onClick={onClear} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
    </span>
  );
}

function StatCard({ icon, label, value, tone, small, onClick, active }: { icon: React.ReactNode; label: string; value: string; tone: string; small?: boolean; onClick?: () => void; active?: boolean }) {
  const tones: Record<string, string> = {
    navy: 'from-slate-700 to-slate-900', blue: 'from-blue-500 to-blue-700',
    purple: 'from-purple-500 to-purple-700', orange: 'from-orange-500 to-amber-600',
    green: 'from-emerald-500 to-teal-700',
  };
  const cls = `bg-gradient-to-br ${tones[tone]} text-white p-4 rounded-2xl shadow relative overflow-hidden text-left w-full ${onClick ? 'cursor-pointer transition hover:brightness-110 active:scale-[0.98]' : ''} ${active ? 'ring-4 ring-offset-2 ring-offset-gray-50 ring-gray-800' : ''}`;
  const inner = (
    <>
      <div className="absolute right-0 top-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6" />
      {active && <span className="absolute top-2 right-2 bg-white/25 text-[9px] font-bold px-1.5 py-0.5 rounded">● Filtrede</span>}
      <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-wider">{icon}<span className="leading-tight">{label}</span></div>
      <div className={`font-extrabold mt-2 ${small ? 'text-lg' : 'text-2xl'}`}>{value}</div>
    </>
  );
  return onClick ? <button type="button" onClick={onClick} className={cls}>{inner}</button> : <div className={cls}>{inner}</div>;
}

/* ============================ ÜRÜN MODALI ============================ */
function ProductModal({ edit, brandOptions, catOptions, catalog, rates, rateDate, onAddList, onClose, onSave }: {
  edit?: StokProduct;
  brandOptions: string[]; catOptions: string[]; catalog: CatalogItem[];
  rates: { usd: number; eur: number; gbp: number }; rateDate?: string;
  onAddList: (type: 'brand' | 'category', name: string) => void;
  onClose: () => void;
  onSave: (rec: Partial<StokProduct>) => void;
}) {
  const [f, setF] = useState({
    code: edit?.code || '', name: edit?.name || '', brand: edit?.brand || '', category: edit?.category || '', color: edit?.color || '',
    store_boxed: edit?.store_boxed ?? 0, store_unboxed: edit?.store_unboxed ?? 0,
    warehouse_boxed: edit?.warehouse_boxed ?? 0, warehouse_unboxed: edit?.warehouse_unboxed ?? 0,
    cost_currency: edit?.cost_currency || 'TRY',
    cost_list: edit?.cost_list ?? 0, cost_discount: edit?.cost_discount ?? 0,
    sale_price: edit?.sale_price ?? 0, sale_manual: edit?.sale_manual ?? false,
  });
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));

  const netCost = netFromList(f.cost_list, f.cost_discount);       // net maliyet (para biriminde)
  const costTRY = costToTRY(netCost, f.cost_currency, rates);      // net maliyet (₺)
  const salePriceTRY = costToTRY(f.sale_price, f.cost_currency, rates); // satış (₺ karşılığı)

  // Kâr oranı (%) — düzenlemede kayıtlı satış/maliyetten geri hesaplanır, yoksa varsayılan 25
  const [markup, setMarkup] = useState<number>(() => {
    if (edit && !edit.sale_manual && edit.cost > 0 && edit.sale_price > 0) {
      const m = Math.round((edit.sale_price / edit.cost - 1) * 100);
      if (m > 0 && m < 1000) return m;
    }
    return 25;
  });

  // Satış fiyatı otomatik: net maliyet + kâr oranı — maliyetle AYNI para biriminde, elle düzenlenmediyse
  useEffect(() => {
    if (!f.sale_manual) {
      setF((s) => ({ ...s, sale_price: Math.round(netCost * (1 + markup / 100) * 100) / 100 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.cost_list, f.cost_discount, f.sale_manual, markup]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    onSave({ id: edit?.id, ...f, cost: netCost });
  };

  return (
    <ModalShell title={edit ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'} icon={<Package className="w-4 h-4" />} onClose={onClose} xl>
      <form onSubmit={submit} className="space-y-4">
        {!edit && catalog.length > 0 && (
          <CatalogPicker
            catalog={catalog}
            onPick={(c) => setF((s) => ({ ...s, code: c.code, name: c.name, brand: c.brand, category: c.category }))}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <L label="Ürün Kodu"><input value={f.code} onChange={(e) => set('code', e.target.value)} className="in" placeholder="HS-213" /></L>
          <L label="Renk"><input value={f.color} onChange={(e) => set('color', e.target.value)} className="in" placeholder="Siyah" /></L>
        </div>
        <L label="Ürün Adı *"><input value={f.name} onChange={(e) => set('name', e.target.value)} required autoFocus className="in" placeholder="Ürün adı" /></L>
        <div className="grid grid-cols-2 gap-3">
          <L label="Marka"><ComboAdd value={f.brand} onChange={(v) => set('brand', v)} options={brandOptions} onCreate={(n) => onAddList('brand', n)} placeholder="Seç, yaz veya + ekle" /></L>
          <L label="Kategori"><ComboAdd value={f.category} onChange={(v) => set('category', v)} options={catOptions} onCreate={(n) => onAddList('category', n)} placeholder="Seç, yaz veya + ekle" /></L>
        </div>
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-2 text-center text-[10px] font-bold uppercase tracking-wider">
            <div className="bg-blue-50 text-blue-700 py-2 flex items-center justify-center gap-1"><Store className="w-3.5 h-3.5" /> Mağaza</div>
            <div className="bg-purple-50 text-purple-700 py-2 flex items-center justify-center gap-1"><Warehouse className="w-3.5 h-3.5" /> Alt Depo</div>
          </div>
          <div className="grid grid-cols-4 gap-2 p-3">
            <NumF label="Kutulu" v={f.store_boxed} on={(v) => set('store_boxed', v)} />
            <NumF label="Kutusuz" v={f.store_unboxed} on={(v) => set('store_unboxed', v)} />
            <NumF label="Kutulu" v={f.warehouse_boxed} on={(v) => set('warehouse_boxed', v)} />
            <NumF label="Kutusuz" v={f.warehouse_unboxed} on={(v) => set('warehouse_unboxed', v)} />
          </div>
        </div>

        {/* Fiyatlandırma */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {/* Para birimi başlık */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fiyatlandırma</span>
              {rateDate && <span className="text-[9px] text-emerald-600 font-medium">Kur: {rateDate}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-medium">Para Birimi</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {CURRENCIES.map((c) => (
                  <button type="button" key={c} onClick={() => set('cost_currency', c)}
                    className={`px-2.5 py-1 text-xs font-bold transition-colors ${f.cost_currency === c ? 'text-white' : 'text-gray-500 bg-white hover:bg-gray-50'}`}
                    style={f.cost_currency === c ? { background: NAVY } : {}}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* MALİYET: liste + iskonto */}
            <div>
              <label className="block text-gray-500 text-[10px] font-bold mb-1.5 uppercase tracking-wider">Maliyet — Liste Fiyatı & İskonto</label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input type="number" min="0" step="0.01" value={f.cost_list}
                    onChange={(e) => set('cost_list', Math.max(0, Number(e.target.value) || 0))}
                    className="in font-mono pr-7" placeholder="Liste fiyatı" />
                  <span className="absolute right-2.5 top-2 text-gray-400 text-xs">{CURRENCY_SYMBOLS[f.cost_currency]}</span>
                </div>
                <div className="relative w-24">
                  <input type="number" min="0" max="100" step="0.5" value={f.cost_discount}
                    onChange={(e) => set('cost_discount', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    className="in font-mono pr-6" placeholder="İskonto" />
                  <span className="absolute right-2.5 top-2 text-gray-400 text-xs">%</span>
                </div>
              </div>
              <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-xs">
                <span className="text-gray-400">Net maliyet: </span>
                <b className="font-mono text-gray-800">{moneyFmt.format(netCost)} {CURRENCY_SYMBOLS[f.cost_currency]}</b>
                {f.cost_currency !== 'TRY' && (
                  <span className="text-gray-500 block mt-0.5">
                    ≈ <b className="font-mono text-gray-700">{moneyFmt.format(costTRY)} ₺</b>
                    <span className="text-gray-400"> · 1 {f.cost_currency} = {moneyFmt.format(f.cost_currency === 'USD' ? rates.usd : rates.eur)} ₺</span>
                  </span>
                )}
              </div>
            </div>

            {/* SATIŞ fiyatı — kâr oranı seçilebilir, maliyetle aynı para biriminde */}
            <div>
              <label className="text-gray-500 text-[10px] font-bold mb-1.5 uppercase tracking-wider block">
                Satış Fiyatı ({CURRENCY_SYMBOLS[f.cost_currency]} {f.cost_currency})
              </label>
              {/* Kâr oranı butonları + manuel */}
              <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                <span className="text-[10px] text-gray-400 font-bold mr-0.5">Kâr:</span>
                {SALE_MARKUP_PRESETS.map((m) => {
                  const on = !f.sale_manual && markup === m;
                  return (
                    <button type="button" key={m}
                      onClick={() => { setMarkup(m); set('sale_manual', false); }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ${on ? 'text-white border-transparent' : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'}`}
                      style={on ? { background: NAVY } : {}}>%{m}</button>
                  );
                })}
                <div className="relative w-14 ml-0.5">
                  <input type="number" min="0" value={markup}
                    onChange={(e) => { setMarkup(Math.max(0, Number(e.target.value) || 0)); set('sale_manual', false); }}
                    className="in py-1 pl-2 pr-5 text-[11px] font-mono" />
                  <span className="absolute right-2 top-1.5 text-gray-400 text-[10px]">%</span>
                </div>
              </div>
              <div className="relative">
                <input type="number" min="0" step="0.01" value={f.sale_price}
                  onChange={(e) => setF((s) => ({ ...s, sale_price: Math.max(0, Number(e.target.value) || 0), sale_manual: true }))}
                  className="in font-mono font-bold text-lg text-gray-800 pr-7" placeholder="0" />
                <span className="absolute right-2.5 top-3 text-gray-400 text-sm">{CURRENCY_SYMBOLS[f.cost_currency]}</span>
              </div>
              <div className="mt-2 text-[10px] text-gray-400 flex items-start justify-between gap-2">
                <span>
                  {f.cost_currency !== 'TRY' && (
                    <span className="text-gray-500 block">≈ <b className="font-mono text-gray-700">{moneyFmt.format(salePriceTRY)} ₺</b></span>
                  )}
                  {f.sale_manual ? 'Elle girildi.' : `Net maliyet + %${markup} otomatik.`}
                </span>
                {f.sale_manual && (
                  <button type="button" onClick={() => set('sale_manual', false)} className="text-[10px] font-bold text-orange-600 hover:underline shrink-0">↺ Otomatiğe dön</button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200">İptal</button>
          <button type="submit" className="px-5 py-2.5 text-white rounded-lg text-sm font-bold" style={{ background: NAVY }}>Kaydet</button>
        </div>
      </form>
      <ModalStyles />
    </ModalShell>
  );
}

function NumF({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[9px] text-gray-400 font-bold text-center mb-1">{label}</label>
      <input type="number" min="0" value={v} onChange={(e) => on(Math.max(0, parseInt(e.target.value) || 0))} className="in text-center font-mono font-bold" />
    </div>
  );
}

// Teklif kataloğundan ürün seçip formu otomatik doldurur
function CatalogPicker({ catalog, onPick }: {
  catalog: CatalogItem[];
  onPick: (c: { code: string; name: string; brand: string; category: string }) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const term = norm(q);
    if (term.length < 2) return [];
    return catalog
      .filter((c) => norm(`${c.name} ${c.sku} ${c.manufacturer}`).includes(term))
      .slice(0, 8);
  }, [q, catalog]);

  return (
    <div className="relative bg-orange-50/60 border border-orange-100 rounded-xl p-3">
      <label className="block text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <PackageSearch className="w-3.5 h-3.5" /> Hazır kataloğdan seç (isteğe bağlı)
      </label>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Teklif ürünlerinde ara: ad, kod veya marka..."
          className="in"
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>
      {open && norm(q).length >= 2 && (
        <div className="absolute z-20 left-3 right-3 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-auto">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400">Eşleşen ürün yok.</div>
          ) : results.map((c, i) => (
            <button
              type="button" key={i}
              onClick={() => {
                onPick({ code: c.sku.split(',')[0].trim(), name: c.name, brand: c.manufacturer, category: c.category });
                setQ(''); setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-50 last:border-0"
            >
              <div className="text-sm font-medium text-gray-800 leading-tight">{c.name}</div>
              <div className="text-[10px] text-gray-400">{[c.sku, c.manufacturer, c.category].filter(Boolean).join(' • ')}</div>
            </button>
          ))}
        </div>
      )}
      <p className="text-[10px] text-orange-600/70 mt-1.5">Seçince kod, ad, marka ve kategori otomatik dolar; stok adetlerini sen girersin.</p>
    </div>
  );
}

// Marka/Kategori için: mevcuttan seç veya anında yeni ekle
function ComboAdd({ value, onChange, options, onCreate, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onCreate: (name: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const term = norm(value);
  const filtered = useMemo(() => options.filter((o) => norm(o).includes(term)).slice(0, 30), [options, term]);
  const exact = options.some((o) => norm(o) === term);
  const canCreate = term.length > 0 && !exact;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="in"
      />
      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-auto">
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { const n = value.trim(); onChange(n); onCreate(n); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-1.5 border-b border-gray-100"
            >
              <Plus className="w-3.5 h-3.5" /> “{value.trim()}” ekle
            </button>
          )}
          {filtered.map((o) => (
            <button
              type="button" key={o}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(o); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ STOK HAREKET MODALI ============================ */
function MovementModal({ product, onClose, onSubmit }: {
  product: StokProduct;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<'in' | 'out' | 'transfer'>('in');
  const [location, setLocation] = useState<StokLocation>('warehouse');
  const [pack, setPack] = useState<StokPack>('boxed');
  const [fromLocation, setFromLocation] = useState<StokLocation>('warehouse');
  const [fromPack, setFromPack] = useState<StokPack>('boxed');
  const [toLocation, setToLocation] = useState<StokLocation>('store');
  const [toPack, setToPack] = useState<StokPack>('boxed');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);

  const current = (loc: StokLocation, pk: StokPack) => product[`${loc}_${pk}` as keyof StokProduct] as number;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseInt(qty) || 0;
    if (q <= 0) return;
    setBusy(true);
    const payload = tab === 'transfer'
      ? { productId: product.id, action: 'transfer', fromLocation, fromPack, toLocation, toPack, qty: q }
      : { productId: product.id, action: tab, location, pack, qty: q };
    const ok = await onSubmit(payload);
    setBusy(false);
    if (ok) onClose();
  };

  const tabs = [
    { k: 'in' as const, label: 'Giriş', icon: <ArrowDownToLine className="w-4 h-4" />, color: 'text-emerald-600 border-emerald-500' },
    { k: 'out' as const, label: 'Çıkış', icon: <ArrowUpFromLine className="w-4 h-4" />, color: 'text-rose-600 border-rose-500' },
    { k: 'transfer' as const, label: 'Transfer', icon: <ArrowRightLeft className="w-4 h-4" />, color: 'text-blue-600 border-blue-500' },
  ];

  return (
    <ModalShell title="Stok Hareketi" icon={<ArrowRightLeft className="w-4 h-4" />} onClose={onClose}>
      <div className="mb-4">
        <p className="font-bold text-gray-800 leading-tight">{product.name}</p>
        <p className="text-xs text-gray-400">{product.code}</p>
      </div>

      {/* Mevcut durum mini tablo */}
      <div className="grid grid-cols-4 gap-1.5 mb-4 text-center">
        {(['store', 'warehouse'] as StokLocation[]).flatMap((loc) =>
          (['boxed', 'unboxed'] as StokPack[]).map((pk) => (
            <div key={`${loc}_${pk}`} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
              <div className="text-[8px] text-gray-400 font-bold uppercase leading-tight">{LOCATION_LABELS[loc]}<br />{PACK_LABELS[pk]}</div>
              <div className="font-mono font-bold text-gray-800 text-sm mt-0.5">{current(loc, pk)}</div>
            </div>
          ))
        )}
      </div>

      <div className="flex border-b border-gray-100 mb-4">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${tab === t.k ? t.color : 'text-gray-400 border-transparent'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {tab === 'transfer' ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Kaynak (nereden)</p>
              <div className="grid grid-cols-2 gap-2">
                <LocSelect value={fromLocation} onChange={setFromLocation} />
                <PackSelect value={fromPack} onChange={setFromPack} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Mevcut: <b className="font-mono">{current(fromLocation, fromPack)}</b></p>
            </div>
            <div className="flex justify-center"><ArrowDownToLine className="w-5 h-5 text-blue-400" /></div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-[10px] font-bold text-blue-500 uppercase mb-2">Hedef (nereye)</p>
              <div className="grid grid-cols-2 gap-2">
                <LocSelect value={toLocation} onChange={setToLocation} />
                <PackSelect value={toPack} onChange={setToPack} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <L label="Yer"><LocSelect value={location} onChange={setLocation} /></L>
            <L label="Paket Türü"><PackSelect value={pack} onChange={setPack} /></L>
          </div>
        )}
        <L label="Miktar">
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required autoFocus className="in text-xl font-bold font-mono text-center" />
        </L>
        <button type="submit" disabled={busy} className="w-full text-white font-bold py-3 rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: tab === 'in' ? '#059669' : tab === 'out' ? '#e11d48' : NAVY }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : tabs.find((t) => t.k === tab)?.icon}
          {tab === 'in' ? 'Stok Girişi Yap' : tab === 'out' ? 'Stok Çıkışı Yap' : 'Transferi Uygula'}
        </button>
      </form>
      <ModalStyles />
    </ModalShell>
  );
}

function LocSelect({ value, onChange }: { value: StokLocation; onChange: (v: StokLocation) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as StokLocation)} className="in">
      <option value="store">🏬 Mağaza</option>
      <option value="warehouse">📦 Alt Depo</option>
    </select>
  );
}
function PackSelect({ value, onChange }: { value: StokPack; onChange: (v: StokPack) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as StokPack)} className="in">
      <option value="boxed">Kutulu</option>
      <option value="unboxed">Kutusuz</option>
    </select>
  );
}

/* ============================ MARKA/KATEGORİ MODALI ============================ */
function ListsModal({ brands, categories, onAdd, onDelete, onClose }: {
  brands: string[]; categories: string[];
  onAdd: (type: 'brand' | 'category', name: string) => void;
  onDelete: (type: 'brand' | 'category', name: string) => void;
  onClose: () => void;
}) {
  const [nb, setNb] = useState(''); const [nc, setNc] = useState('');
  return (
    <ModalShell title="Marka & Kategori" icon={<Tag className="w-4 h-4" />} onClose={onClose} wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <ListCol title="Markalar" items={brands} value={nb} setValue={setNb}
          onAdd={() => { if (nb.trim()) { onAdd('brand', nb.trim()); setNb(''); } }}
          onDelete={(n) => onDelete('brand', n)} />
        <ListCol title="Kategoriler" items={categories} value={nc} setValue={setNc}
          onAdd={() => { if (nc.trim()) { onAdd('category', nc.trim()); setNc(''); } }}
          onDelete={(n) => onDelete('category', n)} />
      </div>
      <ModalStyles />
    </ModalShell>
  );
}

function ListCol({ title, items, value, setValue, onAdd, onDelete }: {
  title: string; items: string[]; value: string; setValue: (v: string) => void; onAdd: () => void; onDelete: (n: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title} ({items.length})</p>
      <div className="flex gap-2 mb-3">
        <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }} className="in" placeholder="Yeni ekle..." />
        <button onClick={onAdd} className="text-white px-3 rounded-lg shrink-0" style={{ background: ORANGE }}><Plus className="w-4 h-4" /></button>
      </div>
      <div className="space-y-1.5 max-h-60 overflow-auto pr-1">
        {items.length === 0 && <p className="text-xs text-gray-400 py-2">Henüz kayıt yok.</p>}
        {items.map((n) => (
          <div key={n} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
            <span className="text-sm text-gray-700">{n}</span>
            <button onClick={() => onDelete(n)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ ORTAK ============================ */
function ModalShell({ title, icon, onClose, children, wide, xl }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean; xl?: boolean }) {
  const maxW = xl ? 'max-w-2xl' : wide ? 'max-w-lg' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white w-full ${maxW} rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
            <span className="text-white p-1.5 rounded-lg text-sm" style={{ background: NAVY }}>{icon}</span>{title}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-500 text-[10px] font-bold mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function ModalStyles() {
  return (
    <style jsx global>{`
      .in { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem 0.65rem; font-size: 0.875rem; color: #374151; outline: none; background: #fff; }
      .in:focus { border-color: ${ORANGE}; box-shadow: 0 0 0 2px rgba(249,115,22,0.15); }
    `}</style>
  );
}
