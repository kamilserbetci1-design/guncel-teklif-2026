'use client';

import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getBrand } from '@/lib/brands';
import { Search, Plus, Trash2, Edit2, X, Save, Package, FileSpreadsheet, ChevronLeft, ChevronRight, Filter, Tag } from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import type { Product } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ensureWebsiteNetPrice } from '@/lib/guclu-mutfak-catalog';
import { cafeMarktProxiedImage } from '@/lib/cafemarkt-catalog';
import { scoreSearchText, productSearchHay } from '@/lib/product-search';

const ITEMS_PER_PAGE = 50;

export default function UrunlerPage() {
  const params = useParams();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const { products, addProduct, updateProduct, removeProduct, setProducts, catalogLoading, websiteCatalog } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', cost: '', image: '', product_link: '', category: '', currency: 'TRY' });

  const allBrandProducts = products;

  // Extract unique categories (top-level)
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allBrandProducts.forEach((p) => {
      const cat = (p.category || '').split('>')[0].trim();
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [allBrandProducts]);

  // Extract unique manufacturers
  const manufacturers = useMemo(() => {
    const mfrs = new Set<string>();
    allBrandProducts.forEach((p) => {
      const mfr = p.manufacturer;
      if (mfr) mfrs.add(mfr);
    });
    return Array.from(mfrs).sort();
  }, [allBrandProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return allBrandProducts.filter((p) => {
      if (search) {
        if (scoreSearchText(productSearchHay(p), search) <= 0) return false;
      }
      if (selectedCategory) {
        const topCat = (p.category || '').split('>')[0].trim();
        if (topCat !== selectedCategory) return false;
      }
      if (selectedManufacturer) {
        if (p.manufacturer !== selectedManufacturer) return false;
      }
      return true;
    });
  }, [allBrandProducts, search, selectedCategory, selectedManufacturer]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedManufacturer('');
    setPage(1);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Ürün adı giriniz.');
    if (editingId) {
      await updateProduct(editingId, { ...form, price: parseFloat(form.price) || 0, cost: parseFloat(form.cost) || 0 });
      setEditingId(null);
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        brand_id: brandId,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
        image: form.image,
        product_link: form.product_link,
        category: form.category,
        currency: form.currency,
      };
      await addProduct(newProduct);
    }
    setForm({ name: '', description: '', price: '', cost: '', image: '', product_link: '', category: '', currency: 'TRY' });
    setShowForm(false);
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, price: p.price.toString(), cost: p.cost.toString(), image: p.image, product_link: p.product_link, category: p.category, currency: p.currency });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) removeProduct(id);
  };

  // Satırlardan ürün listesi oluştur (CSV veya XLSX rows)
  const processRows = (rows: any[], isIkasFormat: boolean, eurRate: number) => {
    const parsed: Product[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      let name = '';
      let description = '';
      let priceRaw = 0;
      let costRaw = 0;
      let image = '';
      let productLink = '';
      let category = '';
      let sku = '';
      let manufacturer = '';
      let sourceCurrency = 'TRY';

      if (isIkasFormat) {
        // ikas Excel formatı
        name = (row['İsim'] || row['isim'] || '').toString().trim();
        description = (row['Açıklama'] || '').toString().trim();
        const salePrice = parseFloat(row['Satış Fiyatı'] || row['Satış Fiyatı'] || '0') || 0;
        const discPrice = parseFloat(row['İndirimli Fiyatı'] || row['İndirimli Fiyat'] || '0') || 0;
        priceRaw = discPrice > 0 ? discPrice : salePrice;
        costRaw = parseFloat(row['Alış Fiyatı'] || '0') || 0;
        image = (row['Resim URL'] || '').toString().trim().split(';')[0].trim();
        const slug = (row['Slug'] || '').toString().trim();
        productLink = slug ? `https://www.mutpro.com/${slug}` : '';
        const catRaw = (row['Kategoriler'] || '').toString().trim();
        if (catRaw) {
          const parts = catRaw.split(';')[0].split('>');
          category = parts.length >= 2 ? parts[1].trim() : parts[0].trim();
        }
        sku = (row['SKU'] || '').toString().trim();
        manufacturer = (row['Marka'] || '').toString().trim();
        const deleted = (row['Silindi mi?'] || '').toString().trim().toUpperCase();
        if (deleted === 'TRUE') continue;
        sourceCurrency = 'EUR';
      } else {
        // Genel CSV/XLSX formatı
        name = (row['Ürün Adı'] || row['name'] || row['Name'] || row['İsim'] || row['urun_adi'] || '').toString().trim();
        description = (row['Açıklama'] || row['description'] || row['Description'] || '').toString().trim();
        priceRaw = parseFloat(row['Fiyat'] || row['price'] || row['Price'] || row['Satış Fiyatı'] || '0') || 0;
        costRaw = parseFloat(row['Maliyet'] || row['cost'] || row['Cost'] || row['Alış Fiyatı'] || '0') || 0;
        image = (row['Görsel'] || row['image'] || row['Image'] || row['Görsel URL'] || row['Resim URL'] || '').toString().trim();
        productLink = (row['Link'] || row['url'] || row['URL'] || row['Ürün Linki'] || '').toString().trim();
        category = (row['Kategori'] || row['category'] || row['Category'] || row['Kategoriler'] || '').toString().trim();
        sku = (row['SKU'] || row['sku'] || row['Ürün Kodu'] || '').toString().trim();
        manufacturer = (row['Marka'] || row['manufacturer'] || row['Üretici'] || row['Brand'] || '').toString().trim();
        sourceCurrency = (row['Para Birimi'] || row['currency'] || 'TRY').toString().trim().toUpperCase();
      }

      if (!name) continue;

      // Varyant birleştirme: aynı isimli ürünlerin SKU'larını birleştir
      const nameKey = name.toLowerCase();
      if (seen.has(nameKey)) {
        // SKU ekle
        if (sku) {
          const existing = parsed.find(p => p.name.toLowerCase() === nameKey);
          if (existing && existing.sku && !existing.sku.includes(sku)) {
            existing.sku = existing.sku + ', ' + sku;
          } else if (existing && !existing.sku) {
            existing.sku = sku;
          }
        }
        continue;
      }
      seen.add(nameKey);

      parsed.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
        brand_id: brandId,
        name,
        description,
        price: priceRaw,
        cost: costRaw,
        image,
        product_link: productLink,
        category,
        currency: sourceCurrency || 'TRY',
        sku,
        manufacturer,
      });
    }
    return parsed;
  };

  // Upsert mantığı: mevcut ürünleri güncelle, yenileri ekle
  const upsertProducts = (newRows: Product[]) => {
    if (newRows.length === 0) {
      alert('Dosyada uygun ürün verisi bulunamadı. Sütun başlıklarını kontrol edin.');
      return;
    }

    const existingBrandProducts = products;
    const otherBrandProducts: Product[] = [];
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    const updatedBrandProducts = [...existingBrandProducts];

    for (const newProduct of newRows) {
      const existingIdx = updatedBrandProducts.findIndex(
        p => p.name.toLowerCase().trim() === newProduct.name.toLowerCase().trim()
      );

      if (existingIdx >= 0) {
        const existing = updatedBrandProducts[existingIdx];
        const priceChanged = existing.price !== newProduct.price;
        const costChanged = existing.cost !== newProduct.cost;
        const skuChanged = newProduct.sku && existing.sku !== newProduct.sku;
        const mfrChanged = newProduct.manufacturer && existing.manufacturer !== newProduct.manufacturer;

        if (priceChanged || costChanged || skuChanged || mfrChanged) {
          updatedBrandProducts[existingIdx] = {
            ...existing,
            price: newProduct.price,
            cost: newProduct.cost,
            image: newProduct.image || existing.image,
            product_link: newProduct.product_link || existing.product_link,
            category: newProduct.category || existing.category,
            sku: newProduct.sku || existing.sku,
            manufacturer: newProduct.manufacturer || existing.manufacturer,
          };
          updated++;
        } else {
          unchanged++;
        }
      } else {
        updatedBrandProducts.push(newProduct);
        added++;
      }
    }

    const msg = `${newRows.length} ürün okundu:\n• ${added} yeni ürün eklenecek\n• ${updated} ürün güncellenecek\n• ${unchanged} ürün değişmedi (atlanacak)\n\nDevam edilsin mi?`;

    if (confirm(msg)) {
      setProducts([...otherBrandProducts, ...updatedBrandProducts]);
      // Supabase'e de yaz
      if (isSupabaseConfigured()) {
        supabase.from('products').upsert(updatedBrandProducts).then(({ error }: any) => {
          if (error) console.error('Supabase upsert products error:', error);
        });
      }
      alert(`Tamamlandı! ${added} eklendi, ${updated} güncellendi.`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    // Güncel EUR kurunu al
    let eurRate = 41;
    try {
      const res = await fetch('/api/tcmb-kur');
      const data = await res.json();
      if (data.eur) eurRate = data.eur;
    } catch {}

    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        // ikas formatı tespiti: "İsim" ve "Satış Fiyatı" sütunları varsa
        const headers = Object.keys(rows[0] || {});
        const isIkas = headers.some(h => h === 'İsim' || h === 'isim') && headers.some(h => h.includes('Satış Fiyatı'));

        const parsed = processRows(rows, isIkas, eurRate);
        if (isIkas) {
          alert(`ikas formatı algılandı!\nEUR/TRY kuru: ${eurRate}\n${parsed.length} benzersiz ürün bulundu.`);
        }
        upsertProducts(parsed);
      } catch (err) {
        console.error('XLSX error:', err);
        alert('Excel dosyası okunurken hata oluştu.');
      }
    } else if (ext === 'csv' || ext === 'txt') {
      try {
        const Papa = (await import('papaparse')).default;
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const headers = Object.keys((results.data[0] as any) || {});
            const isIkas = headers.some(h => h === 'İsim' || h === 'isim') && headers.some(h => h.includes('Satış Fiyatı'));
            const parsed = processRows(results.data as any[], isIkas, eurRate);
            upsertProducts(parsed);
          },
          error: () => alert('CSV dosyası okunurken hata oluştu.'),
        });
      } catch {
        alert('CSV işleme hatası.');
      }
    } else {
      alert('Desteklenen formatlar: .xlsx, .xls, .csv');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürün Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {catalogLoading && allBrandProducts.length === 0
              ? 'Katalog yükleniyor...'
              : <>{brand.fullName} — <strong>{allBrandProducts.length.toLocaleString('tr-TR')}</strong> toplam ürün</>}
            {filteredProducts.length !== allBrandProducts.length && (
              <span className="text-blue-600"> • {filteredProducts.length.toLocaleString('tr-TR')} sonuç</span>
            )}
            {websiteCatalog.loading && (
              <span className="text-sky-600">
                {' '}• Site: {websiteCatalog.fetched.toLocaleString('tr-TR')}
                {websiteCatalog.total ? ` / ${websiteCatalog.total.toLocaleString('tr-TR')}` : ''} çekiliyor
              </span>
            )}
            {!websiteCatalog.loading && websiteCatalog.fetched > 0 && (
              <span className="text-sky-700"> • guclumutfak.com ürünleri mavi satırda</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv,.txt" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Excel / CSV Yükle
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', price: '', cost: '', image: '', product_link: '', category: '', currency: 'TRY' }); }}
            className={`${brand.buttonColor} text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2`}>
            <Plus className="w-4 h-4" /> Yeni Ürün
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Ürün adı, SKU veya marka ara..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="p-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[180px]"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {manufacturers.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-gray-400" />
            <select
              value={selectedManufacturer}
              onChange={(e) => { setSelectedManufacturer(e.target.value); setPage(1); }}
              className="p-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[150px]"
            >
              <option value="">Tüm Markalar</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {(search || selectedCategory || selectedManufacturer) && (
          <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 transition">
            ✕ Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg">{editingId ? 'Ürün Düzenle' : 'Yeni Ürün'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Ürün Adı *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Ürün adı" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Açıklama</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Açıklama" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-red-600 mb-1">Fiyat</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Maliyet</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Para Birimi</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm">
                    <option value="TRY">TL (₺)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Görsel URL</label>
                <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Ürün Linki</label>
                <input type="text" value={form.product_link} onChange={(e) => setForm({ ...form, product_link: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Kategori</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Kategori" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">İptal</button>
                <button onClick={handleSave} className={`px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90 ${brand.buttonColor} flex items-center gap-2`}>
                  <Save className="w-4 h-4" /> Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">
            {catalogLoading && allBrandProducts.length === 0
              ? 'Katalog yükleniyor...'
              : allBrandProducts.length === 0 ? 'Henüz ürün eklenmemiş' : 'Aramanıza uygun ürün bulunamadı'}
          </p>
          <p className="text-sm mt-1">
            {catalogLoading && allBrandProducts.length === 0
              ? 'Ürün listesi hazırlanıyor'
              : allBrandProducts.length === 0 ? 'CSV yükleyerek veya manuel ekleyerek başlayın' : 'Filtreleri değiştirmeyi deneyin'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                  <th className="py-3 px-3 w-14">Görsel</th>
                  <th className="py-3 px-3">Ürün Adı</th>
                  <th className="py-3 px-3 hidden lg:table-cell">Marka</th>
                  <th className="py-3 px-3 hidden md:table-cell">Kategori</th>
                  <th className="py-3 px-3 text-right w-24">Fiyat</th>
                  <th className="py-3 px-3 text-center w-20">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((p) => (
                  <tr
                    key={p.id}
                    className={
                      p.origin === 'cafemarkt'
                        ? 'border-b border-amber-100 bg-amber-50 hover:bg-amber-100/80 transition'
                        : p.origin === 'website'
                        ? 'border-b border-sky-100 bg-sky-50 hover:bg-sky-100/80 transition'
                        : 'border-b border-gray-100 hover:bg-gray-50 transition'
                    }
                  >
                    <td className="py-2 px-3">
                      <div className="w-10 h-10 rounded border bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {p.image ? (
                          <img src={cafeMarktProxiedImage(p.image)} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <Package className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className={`font-semibold line-clamp-1 ${p.origin === 'cafemarkt' ? 'text-amber-800' : p.origin === 'website' ? 'text-sky-800' : 'text-gray-900'}`}>{p.name}</div>
                      {p.origin === 'website' && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                          İnternet sitesi · guclumutfak.com
                        </span>
                      )}
                      {p.origin === 'cafemarkt' && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          İnternet sitesi · cafemarkt.com
                        </span>
                      )}
                      {p.description && <div className="text-xs text-gray-400 line-clamp-1 max-w-md">{p.description}</div>}
                      {p.sku && <div className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</div>}
                    </td>
                    <td className="py-2 px-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{p.manufacturer || '-'}</span>
                    </td>
                    <td className="py-2 px-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500 line-clamp-1">{p.category || '-'}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900 whitespace-nowrap">₺{ensureWebsiteNetPrice(p).price.toLocaleString('tr-TR')}</td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex justify-center gap-0.5">
                        <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <div className="text-xs text-gray-500">
                Sayfa <strong>{safePage}</strong> / {totalPages} — {filteredProducts.length.toLocaleString('tr-TR')} ürün
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (safePage <= 4) {
                    pageNum = i + 1;
                  } else if (safePage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = safePage - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                        pageNum === safePage
                          ? `${brand.buttonColor} text-white`
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
