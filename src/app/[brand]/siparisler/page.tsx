'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getBrand } from '@/lib/brands';
import { stripHtml } from '@/components/RichEditor';
import {
  Order, OrderItem, OrderStatus,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_ROW_COLORS,
} from '@/lib/types';
import {
  Plus, Search, Trash2, ChevronDown, ChevronUp, X, Package,
  Clock, AlertTriangle, CheckCircle, Truck, XCircle, Filter,
  ClipboardList, Calendar, FileText,
} from 'lucide-react';

const ALL_STATUSES: OrderStatus[] = [
  'siparis_alindi', 'hazirlaniyor', 'urunler_hazir', 'eksik_urun',
  'tamamlandi', 'teslimata_hazir', 'teslim_edildi', 'iptal',
];

const STATUS_ICONS: Record<OrderStatus, typeof Package> = {
  siparis_alindi: ClipboardList,
  hazirlaniyor: Clock,
  urunler_hazir: Package,
  eksik_urun: AlertTriangle,
  tamamlandi: CheckCircle,
  teslimata_hazir: Truck,
  teslim_edildi: CheckCircle,
  iptal: XCircle,
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function parseDate(s: string) {
  if (!s) return null;
  if (s.includes('.')) {
    const [d, m, y] = s.split('.');
    return new Date(+y, +m - 1, +d);
  }
  return new Date(s);
}

function isThisWeek(dateStr: string) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

function isToday(dateStr: string) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function OrdersPage() {
  const params = useParams();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);

  const { orders, addOrder, updateOrder, removeOrder, products, proposals, customers } = useAppStore();
  const brandOrders = orders.filter((o) => o.brand_id === brandId);
  const brandProducts = products;

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [missingFilter, setMissingFilter] = useState(false);
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');

  // New order form state
  const [formOrderNo, setFormOrderNo] = useState('');
  const [formProposalNo, setFormProposalNo] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerCity, setFormCustomerCity] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formOrderDate, setFormOrderDate] = useState(todayStr());
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formCurrency, setFormCurrency] = useState('TRY');
  const [formItems, setFormItems] = useState<OrderItem[]>([]);

  // Product search for adding items
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [proposalSearch, setProposalSearch] = useState('');
  const [showProposalDropdown, setShowProposalDropdown] = useState(false);

  // Filtered products for dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return brandProducts.slice(0, 20);
    const s = productSearch.toLocaleLowerCase('tr-TR');
    return brandProducts
      .filter((p) =>
        p.name?.toLocaleLowerCase('tr-TR').includes(s) ||
        (p.sku || '').toLocaleLowerCase('tr-TR').includes(s)
      )
      .slice(0, 20);
  }, [productSearch, brandProducts]);

  // Filtered customers
  const brandCustomers = customers.filter((c) => c.brand_id === brandId);
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return brandCustomers.slice(0, 10);
    const s = customerSearch.toLocaleLowerCase('tr-TR');
    return brandCustomers
      .filter((c) => c.name.toLocaleLowerCase('tr-TR').includes(s))
      .slice(0, 10);
  }, [customerSearch, brandCustomers]);

  // Filtered proposals for linking
  const brandProposals = proposals.filter((p) => p.brand_id === brandId);
  const filteredProposals = useMemo(() => {
    if (!proposalSearch.trim()) return brandProposals.slice(0, 10);
    const s = proposalSearch.toLocaleLowerCase('tr-TR');
    return brandProposals
      .filter((p) =>
        (p.proposal_no || '').toLocaleLowerCase('tr-TR').includes(s) ||
        stripHtml(p.customer_name || '').toLocaleLowerCase('tr-TR').includes(s) ||
        (p.project_name || '').toLocaleLowerCase('tr-TR').includes(s)
      )
      .slice(0, 10);
  }, [proposalSearch, brandProposals]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return brandOrders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (missingFilter && !o.items.some((i) => i.status === 'eksik_urun' || (i.missing_qty && i.missing_qty > 0))) return false;
      if (deliveryDateFilter && (o.delivery_date || '') !== deliveryDateFilter) return false;
      if (!search) return true;
      const s = search.toLocaleLowerCase('tr-TR');
      return (
        (o.order_no || '').toLocaleLowerCase('tr-TR').includes(s) ||
        stripHtml(o.customer_name || '').toLocaleLowerCase('tr-TR').includes(s) ||
        (o.proposal_no || '').toLocaleLowerCase('tr-TR').includes(s) ||
        (o.assigned_to || '').toLocaleLowerCase('tr-TR').includes(s)
      );
    });
  }, [brandOrders, search, statusFilter, missingFilter, deliveryDateFilter]);

  // Dashboard stats
  const stats = useMemo(() => {
    const total = brandOrders.length;
    const preparing = brandOrders.filter((o) => o.status === 'hazirlaniyor').length;
    const missing = brandOrders.filter((o) => o.status === 'eksik_urun' || o.items.some((i) => i.status === 'eksik_urun')).length;
    const delivered = brandOrders.filter((o) => o.status === 'teslim_edildi').length;
    const pending = brandOrders.filter((o) => !['teslim_edildi', 'iptal', 'tamamlandi'].includes(o.status)).length;
    const todayDelivery = brandOrders.filter((o) => o.delivery_date && isToday(o.delivery_date) && o.status !== 'teslim_edildi' && o.status !== 'iptal').length;
    const weekDelivery = brandOrders.filter((o) => o.delivery_date && isThisWeek(o.delivery_date) && o.status !== 'teslim_edildi' && o.status !== 'iptal').length;
    return { total, preparing, missing, delivered, pending, todayDelivery, weekDelivery };
  }, [brandOrders]);

  // Add product to form items
  const addProductToForm = (product: typeof brandProducts[0]) => {
    const newItem: OrderItem = {
      id: genId(),
      product_id: product.id,
      sku: product.sku || '',
      name: product.name,
      description: product.description || '',
      quantity: 1,
      unit: 'Adet',
      unit_price: product.price,
      total: product.price,
      status: 'siparis_alindi',
    };
    setFormItems((prev) => [...prev, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  // Add manual item
  const addManualItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: genId(),
        name: '',
        quantity: 1,
        unit: 'Adet',
        unit_price: 0,
        total: 0,
        status: 'siparis_alindi',
      },
    ]);
  };

  // Update form item
  const updateFormItem = (id: string, field: string, value: any) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = (updated.quantity || 0) * (updated.unit_price || 0);
        }
        return updated;
      })
    );
  };

  // Remove form item
  const removeFormItem = (id: string) => {
    setFormItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Select customer
  const selectCustomer = (c: typeof brandCustomers[0]) => {
    setFormCustomerName(c.name);
    setFormCustomerPhone(c.phone || '');
    setFormCustomerCity(c.city || '');
    setFormCustomerAddress(c.address || '');
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  // Select proposal to import
  const selectProposal = (p: typeof brandProposals[0]) => {
    setFormProposalNo(p.proposal_no);
    setFormCustomerName(stripHtml(p.customer_name));
    setFormCustomerPhone(p.customer_phone || '');
    setFormCustomerCity(p.customer_city || '');
    setFormCustomerAddress(p.customer_address || '');
    setFormCurrency(p.currency || 'TRY');
    // Import proposal items
    const importedItems: OrderItem[] = (p.items || [])
      .filter((i) => i.type !== 'section')
      .map((i) => ({
        id: genId(),
        product_id: i.id,
        sku: i.sku || '',
        name: i.name,
        description: i.description || '',
        quantity: i.quantity,
        unit: 'Adet',
        unit_price: i.price,
        total: i.quantity * i.price,
        status: 'siparis_alindi' as OrderStatus,
      }));
    setFormItems(importedItems);
    setProposalSearch('');
    setShowProposalDropdown(false);
  };

  // Generate order number
  const generateOrderNo = () => {
    const prefix = brandId === 'mutpro' ? 'MP' : brandId === 'guclumutfak' ? 'GM' : 'IN';
    const num = String(brandOrders.length + 1).padStart(4, '0');
    return `${prefix}-SIP-${num}`;
  };

  // Reset form
  const resetForm = () => {
    setFormOrderNo('');
    setFormProposalNo('');
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormCustomerCity('');
    setFormCustomerAddress('');
    setFormOrderDate(todayStr());
    setFormDeliveryDate('');
    setFormNotes('');
    setFormAssignedTo('');
    setFormCurrency('TRY');
    setFormItems([]);
    setShowForm(false);
    setEditingOrder(null);
  };

  // Submit new order
  const handleSubmit = async () => {
    if (!formCustomerName.trim()) return alert('Müşteri adı giriniz.');
    if (formItems.length === 0) return alert('En az bir ürün ekleyiniz.');

    const orderNo = formOrderNo || generateOrderNo();
    const total = formItems.reduce((sum, i) => sum + i.total, 0);

    const hasExik = formItems.some((i) => i.status === 'eksik_urun');
    const allReady = formItems.every((i) => i.status === 'urunler_hazir' || i.status === 'teslim_edildi');
    let autoStatus: OrderStatus = 'siparis_alindi';
    if (hasExik) autoStatus = 'eksik_urun';
    else if (allReady) autoStatus = 'urunler_hazir';

    const order: Order = {
      id: editingOrder || genId(),
      brand_id: brandId,
      order_no: orderNo,
      proposal_id: undefined,
      proposal_no: formProposalNo || undefined,
      customer_name: formCustomerName,
      customer_phone: formCustomerPhone || undefined,
      customer_city: formCustomerCity || undefined,
      customer_address: formCustomerAddress || undefined,
      order_date: formOrderDate,
      delivery_date: formDeliveryDate || undefined,
      items: formItems,
      status: autoStatus,
      notes: formNotes || undefined,
      assigned_to: formAssignedTo || undefined,
      total,
      currency: formCurrency,
    };

    if (editingOrder) {
      await updateOrder(editingOrder, order);
    } else {
      await addOrder(order);
    }
    resetForm();
  };

  // Edit existing order
  const startEdit = (o: Order) => {
    setEditingOrder(o.id);
    setFormOrderNo(o.order_no);
    setFormProposalNo(o.proposal_no || '');
    setFormCustomerName(stripHtml(o.customer_name));
    setFormCustomerPhone(o.customer_phone || '');
    setFormCustomerCity(o.customer_city || '');
    setFormCustomerAddress(o.customer_address || '');
    setFormOrderDate(o.order_date);
    setFormDeliveryDate(o.delivery_date || '');
    setFormNotes(o.notes || '');
    setFormAssignedTo(o.assigned_to || '');
    setFormCurrency(o.currency || 'TRY');
    setFormItems(o.items.map((i) => ({ ...i })));
    setShowForm(true);
  };

  // Quick status update
  const quickStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrder(orderId, { status: newStatus });
  };

  // Quick item status update
  const quickItemStatusUpdate = async (orderId: string, itemId: string, newStatus: OrderStatus) => {
    const order = brandOrders.find((o) => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map((i) =>
      i.id === itemId ? { ...i, status: newStatus } : i
    );
    const hasExik = updatedItems.some((i) => i.status === 'eksik_urun');
    const allReady = updatedItems.every((i) => ['urunler_hazir', 'teslim_edildi', 'tamamlandi'].includes(i.status));
    let autoStatus = order.status;
    if (hasExik) autoStatus = 'eksik_urun';
    else if (allReady) autoStatus = 'urunler_hazir';
    await updateOrder(orderId, { items: updatedItems, status: autoStatus });
  };

  // Format currency
  const fmt = (n: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  const currencySymbol = formCurrency === 'EUR' ? '€' : formCurrency === 'USD' ? '$' : '₺';

  const generateIrsaliye = (order: Order) => {
    const now = new Date();
    const todayFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const accent = brand.accentColor;

    const statusColors: Record<string, { bg: string; text: string; label: string }> = {
      siparis_alindi: { bg: '#f3e8ff', text: '#7c3aed', label: 'Sipariş Alındı' },
      hazirlaniyor: { bg: '#fef9c3', text: '#a16207', label: 'Hazırlanıyor' },
      urunler_hazir: { bg: '#dbeafe', text: '#1d4ed8', label: 'Ürünler Hazır' },
      eksik_urun: { bg: '#fee2e2', text: '#dc2626', label: 'Eksik Ürün' },
      tamamlandi: { bg: '#d1fae5', text: '#059669', label: 'Tamamlandı' },
      teslimata_hazir: { bg: '#cffafe', text: '#0891b2', label: 'Teslimata Hazır' },
      teslim_edildi: { bg: '#dcfce7', text: '#16a34a', label: 'Teslim Edildi' },
      iptal: { bg: '#f3f4f6', text: '#6b7280', label: 'İptal' },
    };

    const logoUrls: Record<string, string> = {
      guclumutfak: 'https://cdn.myikas.com/images/theme-images/4036443e-0fdf-43fc-9903-6a4ba22635d4/image_1080.webp',
      mutpro: '/logos/mutpro-mavi-logo.jpeg',
      inoks: '/logos/inoks-logo.png',
    };
    const logoUrl = logoUrls[brand.id] || brand.logo;

    const itemRows = order.items.map((item, i) => {
      const sc = statusColors[item.status] || statusColors.siparis_alindi;
      return `
      <tr style="${i % 2 === 1 ? 'background-color: #f9f9f9;' : ''}">
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-size: 13px;">
          <div style="font-weight: 600;">${item.name}</div>
          ${item.sku ? `<div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${item.sku}</div>` : ''}
          ${item.description ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${item.description}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; text-align: center; font-size: 13px; font-weight: 500;">${item.quantity} ${item.unit}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; text-align: center;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${sc.bg}; color: ${sc.text};">${sc.label}</span>
          ${item.status === 'eksik_urun' && item.missing_qty ? `<div style="font-size: 10px; color: #dc2626; margin-top: 3px;">${item.missing_qty} adet eksik</div>` : ''}
          ${item.status === 'eksik_urun' && item.missing_note ? `<div style="font-size: 10px; color: #6b7280; margin-top: 1px;">${item.missing_note}</div>` : ''}
        </td>
      </tr>`;
    }).join('');

    const blankRows = Math.max(0, 6 - order.items.length);
    const blankRowsHtml = Array(blankRows).fill(`
      <tr><td style="height: 40px; border-bottom: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;"></td><td style="border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;"></td><td style="border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;"></td></tr>
    `).join('');

    const overallSc = statusColors[order.status] || statusColors.siparis_alindi;

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Teslimat Belgesi - ${order.order_no}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" />
    <style>
      @page { size: portrait; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
      body { padding: 0; background: #fff; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .invoice-box { max-width: 800px; margin: auto; padding: 35px 40px; position: relative; min-height: 100vh; }
      .mono { font-family: 'JetBrains Mono', 'Consolas', monospace; }
      @media print {
        body { padding: 0; }
        .invoice-box { padding: 25px 30px; }
        .no-print { display: none !important; }
      }
    </style></head><body>

    <div class="no-print" style="text-align: center; padding: 15px;">
      <button onclick="window.print()" style="padding: 10px 30px; background: ${accent}; color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: Inter, sans-serif;">Yazdır / PDF İndir</button>
    </div>

    <div class="invoice-box">
      <!-- HEADER -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
        <tr>
          <td style="vertical-align: middle; width: 50%;">
            <img src="${logoUrl}" alt="${brand.fullName}" style="max-height: 60px; max-width: 220px; object-fit: contain;" crossorigin="anonymous" />
            <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-top: 6px; border-top: 2px solid #111; padding-top: 4px; display: inline-block; letter-spacing: 1.5px; text-transform: uppercase;">${brand.slogan}</div>
          </td>
          <td style="vertical-align: top; width: 50%; text-align: right;">
            <div style="font-size: 24px; font-weight: 800; color: ${accent}; letter-spacing: 0.5px;">TESLİMAT BELGESİ</div>
            <div style="font-size: 12px; color: #6b7280; line-height: 1.8; margin-top: 4px;">
              <strong style="color: #374151;">Belge No:</strong> <span class="mono">${order.order_no}</span><br>
              ${order.proposal_no ? `<strong style="color: #374151;">Teklif No:</strong> <span class="mono">${order.proposal_no}</span><br>` : ''}
            </div>
            <div style="display: inline-block; margin-top: 6px; padding: 4px 14px; border-radius: 14px; font-size: 12px; font-weight: 700; background: ${overallSc.bg}; color: ${overallSc.text};">${overallSc.label}</div>
          </td>
        </tr>
      </table>

      <!-- MÜŞTERİ + TARİH -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
        <tr>
          <td style="vertical-align: top; width: 55%; border: 1.5px solid ${accent}; padding: 16px; border-radius: 4px;">
            <div style="font-size: 10px; color: ${accent}; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px;">Sayın (Alıcı Bilgileri)</div>
            <div style="font-size: 14px; line-height: 1.7;">
              <strong style="font-size: 15px;">${stripHtml(order.customer_name)}</strong><br>
              ${order.customer_address ? `${order.customer_address}<br>` : ''}
              ${order.customer_city || ''}
            </div>
            ${order.customer_phone ? `<div style="margin-top: 10px; font-size: 12px; border-top: 1px dashed #e5e7eb; padding-top: 8px;"><strong>Tel:</strong> <span class="mono" style="font-size: 13px;">${order.customer_phone}</span></div>` : ''}
          </td>
          <td style="vertical-align: top; width: 40%; padding-left: 5%;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280; width: 50%;">Düzenleme Tarihi</td><td style="padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 500;" class="mono">${todayFormatted}</td></tr>
              <tr><td style="padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">Fiili Sevk Tarihi</td><td style="padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 500;" class="mono">${todayFormatted}</td></tr>
              <tr><td style="padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">Sevk Saati</td><td style="padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 500;" class="mono">${timeFormatted}</td></tr>
              <tr><td style="padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">Sipariş Tarihi</td><td style="padding: 9px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 500;" class="mono">${order.order_date}</td></tr>
              ${order.delivery_date ? `<tr><td style="padding: 9px 0; font-size: 13px; font-weight: 600; color: #6b7280;">Teslim Tarihi</td><td style="padding: 9px 0; font-size: 13px; text-align: right; font-weight: 500;" class="mono">${order.delivery_date}</td></tr>` : ''}
            </table>
          </td>
        </tr>
      </table>

      <!-- ÜRÜN TABLOSU -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr>
            <th style="background: ${accent}; color: #fff; font-weight: 700; text-align: left; padding: 11px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${accent}; width: 55%;">Ürün / Açıklama</th>
            <th style="background: ${accent}; color: #fff; font-weight: 700; text-align: center; padding: 11px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${accent}; width: 20%;">Miktar</th>
            <th style="background: ${accent}; color: #fff; font-weight: 700; text-align: center; padding: 11px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${accent}; width: 25%;">Durum</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${blankRowsHtml}
          <tr>
            <td colspan="2" style="text-align: right; font-weight: 700; padding: 14px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 13px;">TOPLAM</td>
            <td style="text-align: center; font-weight: 800; padding: 14px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 15px;">${order.items.length} Kalem</td>
          </tr>
        </tbody>
      </table>

      ${order.notes ? `<div style="margin-bottom: 24px; padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 12px; color: #6b7280;"><strong style="color: #374151;">Not:</strong> ${order.notes}</div>` : ''}

      <!-- İMZA ALANLARI -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
        <tr>
          <td style="width: 50%; border: 1px solid #e5e7eb; padding: 18px; text-align: center; height: 110px; vertical-align: top; font-size: 12px; font-weight: 700; color: #6b7280; background: #fafafa; letter-spacing: 1px; text-transform: uppercase;">
            Teslim Eden
            <div style="margin-top: 55px; border-top: 1px dashed #d1d5db; width: 60%; margin-left: auto; margin-right: auto; padding-top: 6px; font-size: 11px; font-weight: 500; color: #9ca3af;">İmza / Kaşe</div>
          </td>
          <td style="width: 50%; border: 1px solid #e5e7eb; padding: 18px; text-align: center; height: 110px; vertical-align: top; font-size: 12px; font-weight: 700; color: #6b7280; background: #fafafa; letter-spacing: 1px; text-transform: uppercase;">
            Teslim Alan
            <div style="margin-top: 55px; border-top: 1px dashed #d1d5db; width: 60%; margin-left: auto; margin-right: auto; padding-top: 6px; font-size: 11px; font-weight: 500; color: #9ca3af;">İmza / Kaşe</div>
          </td>
        </tr>
      </table>

      <!-- ALT BİLGİ -->
      <div style="position: absolute; bottom: 20px; left: 40px; right: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 10px; line-height: 1.6;">
        <div style="font-weight: 600; color: #6b7280;">${brand.fullName}</div>
        <div>${brand.address.join(' • ')} | ${brand.phone} | ${brand.email}</div>
        <div style="margin-top: 3px;">Bu belge dijital ortamda oluşturulmuştur.</div>
      </div>
    </div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sipariş Takip</h1>
          <p className="text-sm text-gray-500 mt-1">Siparişlerinizi takip edin ve yönetin</p>
        </div>
        <button
          onClick={() => {
            if (showForm) resetForm();
            else {
              setFormOrderNo(generateOrderNo());
              setShowForm(true);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition-colors ${brand.buttonColor} hover:opacity-90`}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'İptal' : 'Yeni Sipariş'}
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Toplam', value: stats.total, color: 'bg-gray-100 text-gray-700', icon: ClipboardList },
          { label: 'Bekleyen', value: stats.pending, color: 'bg-orange-100 text-orange-700', icon: Clock },
          { label: 'Hazırlanan', value: stats.preparing, color: 'bg-yellow-100 text-yellow-700', icon: Package },
          { label: 'Eksik Ürün', value: stats.missing, color: 'bg-red-100 text-red-700', icon: AlertTriangle },
          { label: 'Teslim Edilen', value: stats.delivered, color: 'bg-green-100 text-green-700', icon: CheckCircle },
          { label: 'Bugün Teslim', value: stats.todayDelivery, color: 'bg-blue-100 text-blue-700', icon: Calendar },
          { label: 'Bu Hafta', value: stats.weekDelivery, color: 'bg-purple-100 text-purple-700', icon: Truck },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* New Order Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingOrder ? 'Siparişi Düzenle' : 'Yeni Sipariş Oluştur'}
          </h2>

          {/* Tekliften Aktar */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="text-sm font-medium text-blue-700 mb-2 block">Tekliften Aktar (Opsiyonel)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Teklif no veya müşteri adı ile ara..."
                value={proposalSearch}
                onChange={(e) => { setProposalSearch(e.target.value); setShowProposalDropdown(true); }}
                onFocus={() => setShowProposalDropdown(true)}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              {showProposalDropdown && filteredProposals.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProposals.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectProposal(p)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium">{p.proposal_no}</span>
                      <span className="text-gray-500"> — {stripHtml(p.customer_name)}</span>
                      {p.project_name && <span className="text-gray-400"> ({p.project_name})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sipariş No</label>
              <input
                type="text"
                value={formOrderNo}
                onChange={(e) => setFormOrderNo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Teklif No</label>
              <input
                type="text"
                value={formProposalNo}
                onChange={(e) => setFormProposalNo(e.target.value)}
                placeholder="Opsiyonel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Para Birimi</label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              >
                <option value="TRY">₺ TRY</option>
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Müşteri Adı *</label>
              <input
                type="text"
                value={formCustomerName}
                onChange={(e) => {
                  setFormCustomerName(e.target.value);
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => { setCustomerSearch(formCustomerName); setShowCustomerDropdown(true); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && formCustomerName && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.city && <span className="text-gray-400"> — {c.city}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Telefon</label>
              <input type="text" value={formCustomerPhone} onChange={(e) => setFormCustomerPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Şehir</label>
              <input type="text" value={formCustomerCity} onChange={(e) => setFormCustomerCity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Adres</label>
              <input type="text" value={formCustomerAddress} onChange={(e) => setFormCustomerAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
          </div>

          {/* Dates & Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sipariş Tarihi</label>
              <input
                type="date"
                value={formOrderDate.split('.').reverse().join('-')}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-');
                  setFormOrderDate(`${d}.${m}.${y}`);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Teslim Tarihi</label>
              <input
                type="date"
                value={formDeliveryDate ? formDeliveryDate.split('.').reverse().join('-') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-');
                    setFormDeliveryDate(`${d}.${m}.${y}`);
                  } else {
                    setFormDeliveryDate('');
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sorumlu Kişi</label>
              <input type="text" value={formAssignedTo} onChange={(e) => setFormAssignedTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Ürünler *</label>
              <div className="flex gap-2">
                <button onClick={addManualItem} className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                  + Manuel Ekle
                </button>
              </div>
            </div>

            {/* Product search */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Ürün ara (ad veya kod)..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductToForm(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0 flex justify-between items-center"
                    >
                      <div>
                        {p.sku && <span className="text-gray-400 mr-2">[{p.sku}]</span>}
                        <span>{p.name}</span>
                      </div>
                      <span className="text-gray-500 font-medium">{fmt(p.price)} {currencySymbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items table */}
            {formItems.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Ürün</th>
                      <th className="text-center px-2 py-2 font-medium w-20">Adet</th>
                      <th className="text-center px-2 py-2 font-medium w-20">Birim</th>
                      <th className="text-right px-2 py-2 font-medium w-28">B. Fiyat</th>
                      <th className="text-right px-2 py-2 font-medium w-28">Toplam</th>
                      <th className="text-center px-2 py-2 font-medium w-36">Durum</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formItems.map((item) => (
                      <tr key={item.id} className={`border-t border-gray-100 ${ORDER_STATUS_ROW_COLORS[item.status]}`}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateFormItem(item.id, 'name', e.target.value)}
                            className="w-full border-0 bg-transparent text-sm focus:ring-0 outline-none"
                            placeholder="Ürün adı"
                          />
                          {item.sku && <div className="text-xs text-gray-400">{item.sku}</div>}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateFormItem(item.id, 'quantity', +e.target.value)}
                            className="w-full text-center border border-gray-200 rounded px-1 py-1 text-sm"
                            min={1}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={item.unit}
                            onChange={(e) => updateFormItem(item.id, 'unit', e.target.value)}
                            className="w-full border border-gray-200 rounded px-1 py-1 text-sm"
                          >
                            <option>Adet</option>
                            <option>Takım</option>
                            <option>Set</option>
                            <option>Paket</option>
                            <option>Kg</option>
                            <option>Mt</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateFormItem(item.id, 'unit_price', +e.target.value)}
                            className="w-full text-right border border-gray-200 rounded px-1 py-1 text-sm"
                            min={0}
                            step={0.01}
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium">{fmt(item.total)} {currencySymbol}</td>
                        <td className="px-2 py-2">
                          <select
                            value={item.status}
                            onChange={(e) => updateFormItem(item.id, 'status', e.target.value)}
                            className={`w-full rounded px-1 py-1 text-xs border-0 font-medium ${ORDER_STATUS_COLORS[item.status]}`}
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeFormItem(item.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={4} className="px-3 py-2 text-right font-semibold">Genel Toplam:</td>
                      <td className="px-2 py-2 text-right font-bold">
                        {fmt(formItems.reduce((s, i) => s + i.total, 0))} {currencySymbol}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Missing product fields (shown for items with eksik_urun status) */}
            {formItems.some((i) => i.status === 'eksik_urun') && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2">Eksik Ürün Detayları</h4>
                {formItems.filter((i) => i.status === 'eksik_urun').map((item) => (
                  <div key={item.id} className="flex flex-col md:flex-row gap-3 mb-2 last:mb-0">
                    <span className="text-sm font-medium text-red-600 min-w-[150px]">{item.name}</span>
                    <input
                      type="number"
                      placeholder="Eksik adet"
                      value={item.missing_qty || ''}
                      onChange={(e) => updateFormItem(item.id, 'missing_qty', +e.target.value)}
                      className="border border-red-300 rounded px-2 py-1 text-sm w-28"
                      min={0}
                    />
                    <input
                      type="text"
                      placeholder="Tedarik / tamamlanma notu"
                      value={item.missing_note || ''}
                      onChange={(e) => updateFormItem(item.id, 'missing_note', e.target.value)}
                      className="border border-red-300 rounded px-2 py-1 text-sm flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notlar</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"
              placeholder="Sipariş ile ilgili notlar..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              İptal
            </button>
            <button
              onClick={handleSubmit}
              className={`px-6 py-2 rounded-lg text-white font-medium text-sm ${brand.buttonColor} hover:opacity-90`}
            >
              {editingOrder ? 'Güncelle' : 'Siparişi Kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Sipariş no, müşteri, teklif no veya sorumlu ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Tüm Durumlar</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <input
            type="date"
            value={deliveryDateFilter ? deliveryDateFilter.split('.').reverse().join('-') : ''}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-');
                setDeliveryDateFilter(`${d}.${m}.${y}`);
              } else {
                setDeliveryDateFilter('');
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            title="Teslim tarihi filtresi"
          />
          <button
            onClick={() => setMissingFilter(!missingFilter)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
              missingFilter ? 'bg-red-100 border-red-300 text-red-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Eksik Ürün
          </button>
          {(search || statusFilter !== 'all' || missingFilter || deliveryDateFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setMissingFilter(false); setDeliveryDateFilter(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {brandOrders.length === 0
                ? 'Henüz sipariş kaydı bulunmuyor. "Yeni Sipariş" butonuyla ilk siparişinizi oluşturun.'
                : 'Filtrelere uygun sipariş bulunamadı.'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const StatusIcon = STATUS_ICONS[order.status];
            const readyCount = order.items.filter((i) => ['urunler_hazir', 'teslim_edildi', 'tamamlandi'].includes(i.status)).length;
            const missingCount = order.items.filter((i) => i.status === 'eksik_urun').length;
            const preparingCount = order.items.filter((i) => i.status === 'hazirlaniyor').length;
            const sym = order.currency === 'EUR' ? '€' : order.currency === 'USD' ? '$' : '₺';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all ${ORDER_STATUS_ROW_COLORS[order.status]}`}
              >
                {/* Order header row */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50/50"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    <span className="font-semibold text-sm">{order.order_no}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate block">{stripHtml(order.customer_name)}</span>
                  </div>
                  {order.proposal_no && (
                    <span className="text-xs text-gray-400 hidden md:block">Teklif: {order.proposal_no}</span>
                  )}
                  <div className="text-xs text-gray-500 hidden md:block">{order.order_date}</div>
                  {order.delivery_date && (
                    <div className={`text-xs hidden md:block ${
                      isToday(order.delivery_date) ? 'text-red-600 font-bold' : 'text-gray-500'
                    }`}>
                      Teslim: {order.delivery_date}
                    </div>
                  )}
                  {/* Item status summary */}
                  <div className="flex items-center gap-1 text-xs hidden lg:flex">
                    {readyCount > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{readyCount} hazır</span>}
                    {preparingCount > 0 && <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{preparingCount} hazırlanıyor</span>}
                    {missingCount > 0 && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{missingCount} eksik</span>}
                  </div>
                  <div className="text-sm font-bold text-gray-800 min-w-[100px] text-right">{fmt(order.total)} {sym}</div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${ORDER_STATUS_COLORS[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-200 px-4 py-4 space-y-4">
                    {/* Info row */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {order.customer_phone && <span>Tel: {order.customer_phone}</span>}
                      {order.customer_city && <span>Şehir: {order.customer_city}</span>}
                      {order.assigned_to && <span>Sorumlu: <b>{order.assigned_to}</b></span>}
                      {order.notes && <span>Not: {order.notes}</span>}
                    </div>

                    {/* Quick status change */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 self-center mr-1">Durumu değiştir:</span>
                      {ALL_STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={(e) => { e.stopPropagation(); quickStatusUpdate(order.id, s); }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            order.status === s
                              ? ORDER_STATUS_COLORS[s] + ' border-current font-semibold'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {ORDER_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>

                    {/* Items table */}
                    <div className="border border-gray-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Ürün</th>
                            <th className="text-center px-2 py-2 font-medium w-16">Adet</th>
                            <th className="text-center px-2 py-2 font-medium w-16">Birim</th>
                            <th className="text-right px-2 py-2 font-medium w-24">B.Fiyat</th>
                            <th className="text-right px-2 py-2 font-medium w-24">Toplam</th>
                            <th className="text-center px-2 py-2 font-medium w-40">Durum</th>
                            <th className="text-left px-2 py-2 font-medium">Eksik Bilgi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} className={`border-t border-gray-100 ${ORDER_STATUS_ROW_COLORS[item.status]}`}>
                              <td className="px-3 py-2">
                                <div className="font-medium">{item.name}</div>
                                {item.sku && <div className="text-xs text-gray-400">{item.sku}</div>}
                              </td>
                              <td className="px-2 py-2 text-center">{item.quantity}</td>
                              <td className="px-2 py-2 text-center">{item.unit}</td>
                              <td className="px-2 py-2 text-right">{fmt(item.unit_price)}</td>
                              <td className="px-2 py-2 text-right font-medium">{fmt(item.total)}</td>
                              <td className="px-2 py-2">
                                <select
                                  value={item.status}
                                  onChange={(e) => quickItemStatusUpdate(order.id, item.id, e.target.value as OrderStatus)}
                                  className={`w-full text-xs rounded-lg px-2 py-1 border-0 ${ORDER_STATUS_COLORS[item.status]}`}
                                >
                                  {ALL_STATUSES.map((s) => (
                                    <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-500">
                                {item.status === 'eksik_urun' && (
                                  <div>
                                    {item.missing_qty ? <span className="text-red-600 font-medium">{item.missing_qty} adet eksik</span> : null}
                                    {item.missing_note && <div className="text-gray-400">{item.missing_note}</div>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => generateIrsaliye(order)}
                        className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1.5 font-medium text-white ${brand.buttonColor} hover:opacity-90`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Teslimat Belgesi
                      </button>
                      <button
                        onClick={() => startEdit(order)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Bu siparişi silmek istediğinize emin misiniz?')) {
                            removeOrder(order.id);
                          }
                        }}
                        className="px-3 py-1.5 text-sm border border-red-300 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
