-- ============================================
-- STOK YÖNETİM SİSTEMİ TABLOLARI (Sadece MutPro)
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.
-- ============================================

-- Ürünler + 4 stok kovası (Mağaza/Alt Depo × Kutulu/Kutusuz)
CREATE TABLE IF NOT EXISTS stok_products (
  id BIGINT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  color TEXT,
  store_boxed INT NOT NULL DEFAULT 0,        -- Mağaza Kutulu
  store_unboxed INT NOT NULL DEFAULT 0,      -- Mağaza Kutusuz
  warehouse_boxed INT NOT NULL DEFAULT 0,    -- Alt Depo Kutulu
  warehouse_unboxed INT NOT NULL DEFAULT 0,  -- Alt Depo Kutusuz
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stok_products_brand ON stok_products(brand);
CREATE INDEX IF NOT EXISTS idx_stok_products_category ON stok_products(category);

-- Marka ve kategori listeleri (açılır menüler için)
CREATE TABLE IF NOT EXISTS stok_lists (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('brand', 'category')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (type, name)
);

-- GÜVENLİK: RLS aktif, policy yok — herkese açık anon anahtar erişemez.
-- Erişim sadece sunucu tarafındaki service_role anahtarı üzerinden (API) olur.
ALTER TABLE stok_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stok_lists ENABLE ROW LEVEL SECURITY;
