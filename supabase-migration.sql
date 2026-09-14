-- ============================================================
-- Teklif Yönetim — Supabase Tabloları
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın.
-- ============================================================

-- 1) PRODUCTS tablosu
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  image TEXT DEFAULT '',
  product_link TEXT DEFAULT '',
  category TEXT DEFAULT '',
  currency TEXT DEFAULT 'TRY',
  manufacturer TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) CUSTOMERS tablosu
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) PACKAGES tablosu
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) PROPOSALS tablosu (zaten varsa atla)
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  proposal_no TEXT DEFAULT '',
  proposal_date TEXT DEFAULT '',
  project_name TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_city TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  prepared_by TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb,
  discount_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'TRY',
  include_vat BOOLEAN DEFAULT true,
  conditions TEXT DEFAULT '',
  global_hide_prices BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  total NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5) RLS (Row Level Security) — Herkese açık erişim (anon key)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Anon key ile herkes okuyup yazabilsin
CREATE POLICY IF NOT EXISTS "products_all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "customers_all" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "packages_all" ON packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "proposals_all" ON proposals FOR ALL USING (true) WITH CHECK (true);

-- 6) SHIPPING_LABELS tablosu (Kargo Etiketleri)
CREATE TABLE IF NOT EXISTS shipping_labels (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  recipient_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  product TEXT DEFAULT '',
  quantity TEXT DEFAULT '1',
  desi TEXT DEFAULT '',
  note TEXT DEFAULT '',
  tracking TEXT DEFAULT '',
  payment TEXT DEFAULT 'ALICI ÖDEMELİ',
  ambar TEXT DEFAULT '',
  label_date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE shipping_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "shipping_labels_all" ON shipping_labels FOR ALL USING (true) WITH CHECK (true);

-- 7) İndeksler (performans)
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_customers_brand ON customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_packages_brand ON packages(brand_id);
CREATE INDEX IF NOT EXISTS idx_proposals_brand ON proposals(brand_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_brand ON shipping_labels(brand_id);
