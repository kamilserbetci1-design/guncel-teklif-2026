'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { fetchExchangeRates } from '@/lib/helpers';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Product } from '@/lib/types';
import { mergeRegisteredWithWebsite } from '@/lib/guclu-mutfak-catalog';

const BRAND_FILES: Record<string, string> = {
  guclumutfak: '/products-guclumutfak.json',
  mutpro: '/products-mutpro.json',
  inoks: '/products-inoks.json',
};

const PACKAGE_FILES: Record<string, string> = {
  guclumutfak: '/packages-guclumutfak.json',
  mutpro: '/packages-mutpro.json',
  inoks: '/packages-inoks.json',
  markasiz: '/packages-markasiz.json',
};

const productKey = (p: { id?: string; sku?: string; name?: string }) => {
  const sku = (p.sku || '').trim().toLowerCase();
  const name = (p.name || '').trim().toLowerCase();
  return sku ? `sku:${sku}` : `name:${name}|id:${String(p.id || '')}`;
};

export default function ProductLoader() {
  const { setProducts, setRates, fetchCustomers, fetchProposals, fetchOrders } = useAppStore();
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const productsLoaded = useRef(false);
  const restLoaded = useRef(false);

  useEffect(() => {
    if (productsLoaded.current) return;
    productsLoaded.current = true;

    const loadProducts = async () => {
      useAppStore.setState({ catalogLoading: true });
      const jsonProducts: Product[] = [];
      const results = await Promise.all(
        Object.entries(BRAND_FILES).map(async ([brandId, file]) => {
          try {
            const res = await fetch(file);
            if (!res.ok) return [] as Product[];
            const data = await res.json();
            if (!Array.isArray(data)) return [] as Product[];
            console.log(`✅ ${data.length} ${brandId} ürünü JSON'dan yüklendi.`);
            return data as Product[];
          } catch (err) {
            console.warn(`${brandId} ürünleri yüklenemedi:`, err);
            return [] as Product[];
          }
        })
      );
      jsonProducts.push(...results.flat());

      const uniqueByKey = new Map<string, Product>();
      for (const p of jsonProducts) {
        const key = productKey(p);
        if (!uniqueByKey.has(key)) {
          uniqueByKey.set(key, { ...p, id: String(p.id), origin: p.origin || 'catalog' });
        }
      }

      const currentProducts = useAppStore.getState().products || [];
      for (const p of currentProducts) {
        const key = productKey(p);
        if (!uniqueByKey.has(key)) {
          uniqueByKey.set(key, { ...p, id: String(p.id) });
        }
      }

      const merged = Array.from(uniqueByKey.values());
      setProducts(merged);
      useAppStore.setState({ catalogLoading: false });
      console.log(`✅ Ortak katalog hazır: ${merged.length} ürün`);

      if (isSupabaseConfigured()) {
        let dbList: Product[] = [];
        let page = 0;
        const PAGE_SIZE = 1000;
        while (true) {
          const { data, error } = await supabase.from('products').select('*').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
          if (error) { console.error('Supabase products fetch error:', error); break; }
          if (!data || data.length === 0) break;
          dbList = dbList.concat(data as Product[]);
          if (data.length < PAGE_SIZE) break;
          page++;
        }

        if (dbList.length > 0) {
          const combined = new Map<string, Product>();
          for (const p of [...merged, ...dbList]) {
            const key = productKey(p);
            if (!combined.has(key)) combined.set(key, { ...p, id: String(p.id), origin: p.origin || 'catalog' });
          }
          setProducts(Array.from(combined.values()));
        }
      }

      const loadWebsiteCatalog = async () => {
        useAppStore.setState({ websiteCatalog: { loading: true, fetched: 0, total: 0 } });
        try {
          let page = 1;
          let hasMore = true;
          while (hasMore) {
            const res = await fetch(`/api/guclu-mutfak/products?page=${page}&pageSize=12`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              console.warn('guclumutfak.com ürünleri alınamadı:', data.error || res.status);
              break;
            }
            const batch = Array.isArray(data.products) ? (data.products as Product[]) : [];
            const current = useAppStore.getState().products || [];
            setProducts(mergeRegisteredWithWebsite(current, batch));
            const total = Number(data.total) || 0;
            const fetched = Number(data.fetched) || page * 12;
            useAppStore.setState({ websiteCatalog: { loading: true, fetched, total } });
            hasMore = Boolean(data.hasMore);
            page += 1;
            if (page > 400) break;
          }
        } catch (err) {
          console.warn('guclumutfak.com ürün çekimi durdu:', err);
        } finally {
          const wc = useAppStore.getState().websiteCatalog;
          useAppStore.setState({ websiteCatalog: { ...wc, loading: false } });
          console.log('✅ guclumutfak.com site kataloğu birleştirildi');
        }
      };

      loadWebsiteCatalog();
    };

    loadProducts();
  }, [setProducts]);

  useEffect(() => {
    if (!hasHydrated || restLoaded.current) return;
    restLoaded.current = true;

    const loadRates = async () => {
      try {
        const rates = await fetchExchangeRates();
        setRates(rates);
        console.log(`✅ Döviz kurları yüklendi: €1 = ₺${rates.eur}`);
      } catch (err) {
        console.warn('Döviz kurları yüklenemedi:', err);
      }
    };

    const loadPackages = async () => {
      const jsonPackages: any[] = [];
      const seenIds = new Set<string>();
      for (const [brandId, file] of Object.entries(PACKAGE_FILES)) {
        try {
          const res = await fetch(file);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data)) {
            const unique = data.filter((p: any) => {
              const id = String(p.id);
              if (seenIds.has(id)) return false;
              seenIds.add(id);
              return true;
            }).map((p: any) => ({ ...p, id: String(p.id) }));
            jsonPackages.push(...unique);
            console.log(`✅ ${unique.length} ${brandId} paketi JSON'dan okundu.`);
          }
        } catch (err) {
          console.warn(`${brandId} paketleri yüklenemedi:`, err);
        }
      }

      const state = useAppStore.getState();
      const deleted = new Set((state.deletedPackageIds || []).map(String));
      const currentById = new Map(
        (state.packages || []).map((p) => [String(p.id), { ...p, id: String(p.id) }])
      );

      const collapsedByName = new Map<string, (typeof state.packages)[number]>();
      Array.from(currentById.values()).forEach((p) => {
        const nameKey = (p.name || '').trim().toLowerCase();
        const prev = collapsedByName.get(nameKey);
        if (!prev) {
          collapsedByName.set(nameKey, p);
          return;
        }
        const keepNew = (p.items?.length || 0) >= (prev.items?.length || 0);
        if (keepNew) {
          deleted.add(String(prev.id));
          collapsedByName.set(nameKey, p);
        } else {
          deleted.add(String(p.id));
        }
      });
      currentById.clear();
      Array.from(collapsedByName.values()).forEach((p) => currentById.set(String(p.id), p));

      const seenNames = new Set(collapsedByName.keys());

      for (const jp of jsonPackages) {
        const id = String(jp.id);
        if (deleted.has(id) || currentById.has(id)) continue;
        const nameKey = (jp.name || '').trim().toLowerCase();
        if (seenNames.has(nameKey)) continue;
        seenNames.add(nameKey);
        currentById.set(id, { id, brand_id: jp.brand_id, name: jp.name, items: jp.items || [] });
      }

      if (isSupabaseConfigured()) {
        const { data: dbPackages, error } = await supabase.from('packages').select('*');
        if (error) {
          console.error('Supabase packages fetch error:', error);
        } else {
          for (const row of (dbPackages || []) as any[]) {
            const id = String(row.id);
            if (deleted.has(id) || currentById.has(id)) continue;
            const nameKey = (row.name || '').trim().toLowerCase();
            if (seenNames.has(nameKey)) continue;
            seenNames.add(nameKey);
            currentById.set(id, { id, brand_id: row.brand_id, name: row.name, items: row.items || [] });
          }
        }
      }

      const merged = Array.from(currentById.values());
      useAppStore.setState({
        packages: merged,
        deletedPackageIds: Array.from(deleted),
      });
      console.log(`✅ Paketler birleştirildi: ${merged.length} paket`);
    };

    loadRates();
    loadPackages();
    if (isSupabaseConfigured()) {
      fetchCustomers();
      fetchProposals();
      fetchOrders();
    }
  }, [hasHydrated, setRates, fetchCustomers, fetchProposals, fetchOrders]);

  return null;
}
