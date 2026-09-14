-- ============================================
-- TEKLİF: Hazır açıklama/not kütüphanesi
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.
-- ============================================

CREATE TABLE IF NOT EXISTS teklif_snippets (
  id BIGINT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teklif_snippets ENABLE ROW LEVEL SECURITY;
-- Uygulama anon anahtarla eriştiği için açık politika (diğer tablolarla aynı yapı)
DROP POLICY IF EXISTS "teklif_snippets_all" ON teklif_snippets;
CREATE POLICY "teklif_snippets_all" ON teklif_snippets FOR ALL USING (true) WITH CHECK (true);
