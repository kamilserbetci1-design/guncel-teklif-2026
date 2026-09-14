-- ============================================
-- STOK: Fiyatlandırma sütunları (maliyet + satış)
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.
-- Birden fazla kez çalıştırmak güvenlidir (IF NOT EXISTS).
-- ============================================

ALTER TABLE stok_products
  ADD COLUMN IF NOT EXISTS cost NUMERIC NOT NULL DEFAULT 0,             -- net maliyet (para biriminde)
  ADD COLUMN IF NOT EXISTS cost_currency TEXT NOT NULL DEFAULT 'TRY',  -- 'TRY' | 'USD' | 'EUR'
  ADD COLUMN IF NOT EXISTS cost_list NUMERIC NOT NULL DEFAULT 0,       -- liste fiyatı (para biriminde)
  ADD COLUMN IF NOT EXISTS cost_discount NUMERIC NOT NULL DEFAULT 0,   -- iskonto yüzdesi
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC NOT NULL DEFAULT 0,      -- satış fiyatı (₺)
  ADD COLUMN IF NOT EXISTS sale_manual BOOLEAN NOT NULL DEFAULT false; -- satış elle mi girildi
