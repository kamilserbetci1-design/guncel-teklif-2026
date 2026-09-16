export interface Product {
  id: string;
  brand_id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  image: string;
  product_link: string;
  category: string;
  currency: string;
  manufacturer?: string;
  sku?: string;
  /** catalog = kayıtlı liste; website = guclumutfak.com */
  origin?: 'catalog' | 'website';
  /** false = fiyat KDV hariç (siteden çekilince %20 düşülmüş) */
  vat_included?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  brand_id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  created_at?: string;
}

export interface ProposalItem {
  id: string;
  name: string;
  description: string;
  sku?: string;
  price: number;
  cost: number;
  quantity: number;
  image: string;
  product_link: string;
  item_discount: number;
  total: number;
  input_currency: string;
  exchange_rate: number;
  source_price?: number;
  source_cost?: number;
  hide_price: boolean;
  shipped: boolean;
  type?: 'section' | 'product';
  description_format?: 'none' | 'numbered' | 'bullet';
}

export const PAYMENT_TYPES = {
  kredi_karti: 'Kredi Kartı',
  kredi_karti_taksitli: 'Kredi Kartı Taksitli',
  nakit_havale: 'Nakit / Havale',
  cek: 'Çek',
} as const;

export type PaymentType = keyof typeof PAYMENT_TYPES;

export interface Proposal {
  id: string;
  brand_id: string;
  proposal_no: string;
  proposal_date: string;
  project_name: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  prepared_by: string;
  items: ProposalItem[];
  discount_value: number;
  discount_type?: 'amount' | 'percent';
  discount_percent?: number;
  currency: string;
  include_vat: boolean;
  conditions: string;
  global_hide_prices: boolean;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';
  total: number;
  paid_amount?: number;
  payment_type?: PaymentType | '';
  custom_header_name?: string;
  custom_header_logo?: string;
  fx_eur?: number;
  fx_usd?: number;
  fx_gbp?: number;
  pdf_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PackageTemplate {
  id: string;
  brand_id: string;
  name: string;
  items: PackageItem[];
  created_at?: string;
}

export interface PackageItem {
  id?: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  quantity: number;
  image: string;
  product_link: string;
  currency?: 'TRY' | 'EUR' | 'USD' | 'GBP';
}

// --- Order (Sipariş) Types ---

export type OrderStatus =
  | 'siparis_alindi'
  | 'hazirlaniyor'
  | 'urunler_hazir'
  | 'eksik_urun'
  | 'tamamlandi'
  | 'teslimata_hazir'
  | 'teslim_edildi'
  | 'iptal';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  siparis_alindi: 'Sipariş Alındı',
  hazirlaniyor: 'Hazırlanıyor',
  urunler_hazir: 'Ürünler Hazır',
  eksik_urun: 'Eksik Ürün Var',
  tamamlandi: 'Sipariş Tamamlandı',
  teslimata_hazir: 'Teslimata Hazır',
  teslim_edildi: 'Teslim Edildi',
  iptal: 'İptal Edildi',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  siparis_alindi: 'bg-purple-100 text-purple-700',
  hazirlaniyor: 'bg-yellow-100 text-yellow-700',
  urunler_hazir: 'bg-blue-100 text-blue-700',
  eksik_urun: 'bg-red-100 text-red-700',
  tamamlandi: 'bg-emerald-100 text-emerald-700',
  teslimata_hazir: 'bg-cyan-100 text-cyan-700',
  teslim_edildi: 'bg-green-100 text-green-700',
  iptal: 'bg-gray-100 text-gray-500',
};

export const ORDER_STATUS_ROW_COLORS: Record<OrderStatus, string> = {
  siparis_alindi: '',
  hazirlaniyor: 'bg-yellow-50',
  urunler_hazir: 'bg-blue-50',
  eksik_urun: 'bg-red-50',
  tamamlandi: 'bg-emerald-50',
  teslimata_hazir: 'bg-cyan-50',
  teslim_edildi: 'bg-green-50',
  iptal: 'bg-gray-50 opacity-60',
};

export interface OrderItem {
  id: string;
  product_id?: string;
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  status: OrderStatus;
  missing_qty?: number;
  missing_note?: string;
}

export interface Order {
  id: string;
  brand_id: string;
  order_no: string;
  proposal_id?: string;
  proposal_no?: string;
  customer_name: string;
  customer_phone?: string;
  customer_city?: string;
  customer_address?: string;
  order_date: string;
  delivery_date?: string;
  items: OrderItem[];
  status: OrderStatus;
  notes?: string;
  assigned_to?: string;
  total: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  viewed: 'Görüntülendi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

export const STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
