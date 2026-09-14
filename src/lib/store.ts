'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { Product, Customer, Proposal, PackageTemplate, ProposalItem, Order } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

// ---------- IndexedDB storage (localStorage 5 MB limitini kaldırır) ----------
const DB_NAME = 'teklif-yonetim-db';
const STORE_NAME = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      // Tek seferlik localStorage → IndexedDB göçü
      const local = localStorage.getItem(name);
      if (local) {
        try {
          const db = await getDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(local, name);
          await new Promise<void>((r) => { tx.oncomplete = () => r(); });
          localStorage.removeItem(name);
        } catch { /* göç başarısız, local veriyle devam */ }
        return local;
      }
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(name);
      return new Promise((resolve) => {
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => resolve(null);
      });
    } catch { return null; }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, name);
      await new Promise<void>((r) => { tx.oncomplete = () => r(); tx.onerror = () => r(); });
    } catch (err) { console.error('IndexedDB setItem error:', err); }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(name);
      await new Promise<void>((r) => { tx.oncomplete = () => r(); tx.onerror = () => r(); });
    } catch (err) { console.error('IndexedDB removeItem error:', err); }
  },
};
// ---------- end IndexedDB storage ----------

interface AppState {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  currentBrand: string;
  setCurrentBrand: (brand: string) => void;

  // Products (synced with Supabase)
  products: Product[];
  catalogLoading: boolean;
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  fetchProducts: () => Promise<void>;

  // Customers (synced with Supabase)
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  fetchCustomers: () => Promise<void>;

  // Proposals (synced with Supabase)
  proposals: Proposal[];
  setProposals: (proposals: Proposal[]) => void;
  addProposal: (proposal: Proposal) => Promise<void>;
  updateProposal: (id: string, data: Partial<Proposal>) => Promise<void>;
  removeProposal: (id: string) => Promise<void>;
  fetchProposals: () => Promise<void>;

  // Packages (synced with Supabase)
  packages: PackageTemplate[];
  setPackages: (packages: PackageTemplate[]) => void;
  addPackage: (pkg: PackageTemplate) => Promise<void>;
  updatePackage: (id: string, data: Partial<PackageTemplate>) => Promise<void>;
  removePackage: (id: string) => Promise<void>;
  fetchPackages: () => Promise<void>;
  deletedPackageIds: string[];

  // Orders (synced with Supabase)
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
  fetchOrders: () => Promise<void>;


  // Fetch all data from Supabase at once
  fetchAllData: () => Promise<void>;

  // Current proposal being edited
  currentItems: ProposalItem[];
  setCurrentItems: (items: ProposalItem[]) => void;
  addCurrentItem: (item: ProposalItem) => void;
  removeCurrentItem: (id: string) => void;
  updateCurrentItem: (id: string, data: Partial<ProposalItem>) => void;

  // Exchange rates
  rates: { usd: number; eur: number; gbp: number };
  setRates: (rates: { usd: number; eur: number; gbp: number }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      currentBrand: '',
      setCurrentBrand: (brand) => set({ currentBrand: brand }),

      products: [],
      catalogLoading: true,
      setProducts: (products) => set({ products }),
      addProduct: async (product) => {
        set((s) => ({ products: [...s.products, product] }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('products').upsert(product); if (error) console.error('Supabase addProduct error:', error); } catch (e: unknown) { console.error('Supabase addProduct network error:', e); } })();
        }
      },
      updateProduct: async (id, data) => {
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('products').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id); if (error) console.error('Supabase updateProduct error:', error); } catch (e: unknown) { console.error('Supabase updateProduct network error:', e); } })();
        }
      },
      removeProduct: async (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('products').delete().eq('id', id); if (error) console.error('Supabase removeProduct error:', error); } catch (e: unknown) { console.error('Supabase removeProduct network error:', e); } })();
        }
      },
      fetchProducts: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          // Tüm ürünleri çek (1000 limit aşımı için pagination)
          let allProducts: Product[] = [];
          let page = 0;
          const PAGE_SIZE = 1000;
          while (true) {
            const { data, error } = await supabase.from('products').select('*').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
            if (error) { console.error('Supabase fetchProducts error:', error); break; }
            if (!data || data.length === 0) break;
            allProducts = allProducts.concat(data as Product[]);
            if (data.length < PAGE_SIZE) break;
            page++;
          }
          if (allProducts.length > 0) {
            set({ products: allProducts });
          }
        } catch (e) { console.error('Supabase fetchProducts network error:', e); }
      },

      customers: [],
      setCustomers: (customers) => set({ customers }),
      addCustomer: async (customer) => {
        set((s) => ({ customers: [...s.customers, customer] }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('customers').upsert(customer); if (error) console.error('Supabase addCustomer error:', error); } catch (e: unknown) { console.error('Supabase addCustomer network error:', e); } })();
        }
      },
      updateCustomer: async (id, data) => {
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...data } : c)) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('customers').update(data).eq('id', id); if (error) console.error('Supabase updateCustomer error:', error); } catch (e: unknown) { console.error('Supabase updateCustomer network error:', e); } })();
        }
      },
      removeCustomer: async (id) => {
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('customers').delete().eq('id', id); if (error) console.error('Supabase removeCustomer error:', error); } catch (e: unknown) { console.error('Supabase removeCustomer network error:', e); } })();
        }
      },
      fetchCustomers: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
          if (error) { console.error('Supabase fetchCustomers error:', error); return; }
          if (data && data.length > 0) {
            // Supabase = tek kaynak (source of truth)
            set({ customers: data as Customer[] });
          } else {
            // Supabase boşsa local müşterileri koru ve Supabase'e yaz
            const localCustomers = get().customers;
            if (localCustomers.length > 0) {
              console.log(`📤 ${localCustomers.length} local müşteri Supabase'e aktarılıyor...`);
              supabase.from('customers').upsert(localCustomers).then(({ error: uErr }) => {
                if (uErr) console.error('Supabase müşteri aktarım hatası:', uErr);
                else console.log('✅ Müşteriler Supabase\'e aktarıldı.');
              });
            }
          }
        } catch (e) { console.error('Supabase fetchCustomers network error:', e); }
      },

      proposals: [],
      setProposals: (proposals) => set({ proposals }),

      addProposal: async (proposal) => {
        set((s) => ({ proposals: [proposal, ...s.proposals] }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('proposals').upsert({
              id: proposal.id, brand_id: proposal.brand_id, proposal_no: proposal.proposal_no,
              proposal_date: proposal.proposal_date, project_name: proposal.project_name,
              customer_name: proposal.customer_name, customer_phone: proposal.customer_phone,
              customer_city: proposal.customer_city, customer_address: proposal.customer_address,
              prepared_by: proposal.prepared_by, items: proposal.items,
              discount_value: proposal.discount_value, currency: proposal.currency,
              include_vat: proposal.include_vat, conditions: proposal.conditions,
              global_hide_prices: proposal.global_hide_prices, status: proposal.status, total: proposal.total,
              paid_amount: proposal.paid_amount || 0, payment_type: proposal.payment_type || '',
              discount_type: proposal.discount_type, discount_percent: proposal.discount_percent,
              custom_header_name: proposal.custom_header_name || '',
              custom_header_logo: proposal.custom_header_logo || '',
            });
            if (error) console.error('Supabase addProposal error:', error);
          } catch (e: unknown) { console.error('Supabase addProposal network error:', e); }
        }
      },

      updateProposal: async (id, data) => {
        set((s) => ({
          proposals: s.proposals.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('proposals').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
            if (error) console.error('Supabase updateProposal error:', error);
          } catch (e: unknown) { console.error('Supabase updateProposal network error:', e); }
        }
      },

      removeProposal: async (id) => {
        set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) }));
        // Supabase arka planda senkronize
        if (isSupabaseConfigured()) {
          (async () => { try { const { error } = await supabase.from('proposals').delete().eq('id', id); if (error) console.error('Supabase removeProposal error:', error); } catch (e: unknown) { console.error('Supabase removeProposal network error:', e); } })();
        }
      },

      fetchProposals: async () => {
        if (!isSupabaseConfigured()) return;
        try {
        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase fetchProposals error:', error);
          return;
        }
        if (data) {
          const supabaseProposals: Proposal[] = data.map((row: any) => ({
            id: row.id,
            brand_id: row.brand_id,
            proposal_no: row.proposal_no || '',
            proposal_date: row.proposal_date || '',
            project_name: row.project_name || '',
            customer_name: row.customer_name || '',
            customer_phone: row.customer_phone || '',
            customer_city: row.customer_city || '',
            customer_address: row.customer_address || '',
            prepared_by: row.prepared_by || '',
            items: row.items || [],
            discount_value: row.discount_value || 0,
            discount_type: row.discount_type || undefined,
            discount_percent: row.discount_percent || undefined,
            paid_amount: row.paid_amount || 0,
            payment_type: row.payment_type || '',
            currency: row.currency || 'TRY',
            include_vat: row.include_vat ?? true,
            conditions: row.conditions || '',
            global_hide_prices: row.global_hide_prices || false,
            status: row.status || 'draft',
            total: row.total || 0,
            custom_header_name: row.custom_header_name || '',
            custom_header_logo: row.custom_header_logo || '',
          }));
          // Supabase = tek kaynak (source of truth)
          set({ proposals: supabaseProposals });
        }
        } catch (e) { console.error('Supabase fetchProposals network error:', e); }
      },

      packages: [],
      deletedPackageIds: [],
      setPackages: (packages) => set({ packages: packages.map((p) => ({ ...p, id: String(p.id) })) }),
      addPackage: async (pkg) => {
        const id = String(pkg.id);
        const normalized = { ...pkg, id };
        set((s) => ({
          packages: s.packages.some((p) => String(p.id) === id)
            ? s.packages.map((p) => (String(p.id) === id ? normalized : p))
            : [...s.packages, normalized],
          deletedPackageIds: (s.deletedPackageIds || []).filter((d) => d !== id),
        }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('packages').upsert({ id, brand_id: pkg.brand_id, name: pkg.name, items: pkg.items });
            if (error) console.error('Supabase addPackage error:', error);
          } catch (e: unknown) { console.error('Supabase addPackage network error:', e); }
        }
      },
      updatePackage: async (id, data) => {
        const nid = String(id);
        set((s) => ({
          packages: s.packages.map((p) => (String(p.id) === nid ? { ...p, ...data, id: nid } : p)),
        }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('packages').upsert({
              id: nid,
              ...(data.brand_id ? { brand_id: data.brand_id } : {}),
              ...(data.name != null ? { name: data.name } : {}),
              ...(data.items ? { items: data.items } : {}),
            });
            if (error) console.error('Supabase updatePackage error:', error);
          } catch (e: unknown) { console.error('Supabase updatePackage network error:', e); }
        }
      },
      removePackage: async (id) => {
        const nid = String(id);
        set((s) => ({
          packages: s.packages.filter((p) => String(p.id) !== nid),
          deletedPackageIds: Array.from(new Set([...(s.deletedPackageIds || []), nid])),
        }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('packages').delete().eq('id', nid);
            if (error) console.error('Supabase removePackage error:', error);
          } catch (e: unknown) { console.error('Supabase removePackage network error:', e); }
        }
      },
      fetchPackages: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data, error } = await supabase.from('packages').select('*').order('created_at', { ascending: false });
          if (error) { console.error('Supabase fetchPackages error:', error); return; }
          if (data) {
            const deleted = new Set((get().deletedPackageIds || []).map(String));
            const current = get().packages || [];
            const currentById = new Map(current.map((p) => [String(p.id), p]));
            data.forEach((row: any) => {
              const id = String(row.id);
              if (deleted.has(id)) return;
              if (!currentById.has(id)) {
                currentById.set(id, { id, brand_id: row.brand_id, name: row.name, items: row.items || [] });
              }
            });
            set({ packages: Array.from(currentById.values()) });
          }
        } catch (e) { console.error('Supabase fetchPackages network error:', e); }
      },

      orders: [],
      setOrders: (orders) => set({ orders }),
      addOrder: async (order) => {
        set((s) => ({ orders: [order, ...s.orders] }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('orders').upsert(order);
            if (error) console.error('Supabase addOrder error:', error);
          } catch (e: unknown) { console.error('Supabase addOrder network error:', e); }
        }
      },
      updateOrder: async (id, data) => {
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...data } : o)) }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('orders').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
            if (error) console.error('Supabase updateOrder error:', error);
          } catch (e: unknown) { console.error('Supabase updateOrder network error:', e); }
        }
      },
      removeOrder: async (id) => {
        set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('orders').delete().eq('id', id);
            if (error) console.error('Supabase removeOrder error:', error);
          } catch (e: unknown) { console.error('Supabase removeOrder network error:', e); }
        }
      },
      fetchOrders: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
          if (error) { console.error('Supabase fetchOrders error:', error); return; }
          if (data) {
            set({ orders: data as Order[] });
          }
        } catch (e) { console.error('Supabase fetchOrders network error:', e); }
      },

      fetchAllData: async () => {
        if (!isSupabaseConfigured()) return;
        const store = get() as AppState;
        await Promise.all([store.fetchProducts(), store.fetchCustomers(), store.fetchProposals(), store.fetchPackages(), store.fetchOrders()]);
      },

      currentItems: [],
      setCurrentItems: (items) => set({ currentItems: items }),
      addCurrentItem: (item) => set((s) => ({ currentItems: [...s.currentItems, item] })),
      removeCurrentItem: (id) => set((s) => ({ currentItems: s.currentItems.filter((i) => i.id !== id) })),
      updateCurrentItem: (id, data) =>
        set((s) => ({
          currentItems: s.currentItems.map((i) => (i.id === id ? { ...i, ...data } : i)),
        })),

      rates: { usd: 46.8, eur: 53.5, gbp: 62.5 },
      setRates: (rates) => set({ rates }),
    }),
    {
      name: 'teklif-yonetim-store',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        currentBrand: state.currentBrand,
        customers: state.customers,
        proposals: state.proposals,
        packages: state.packages,
        deletedPackageIds: state.deletedPackageIds,
        orders: state.orders,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
