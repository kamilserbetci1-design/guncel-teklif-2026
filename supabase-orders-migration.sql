-- Sipariş Takip Tablosu
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  proposal_id TEXT,
  proposal_no TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_city TEXT,
  customer_address TEXT,
  order_date TEXT NOT NULL,
  delivery_date TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'siparis_alindi',
  notes TEXT,
  assigned_to TEXT,
  total NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'TRY',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_all" ON orders FOR ALL USING (true) WITH CHECK (true);
