export interface BrandConfig {
  id: string;
  name: string;
  fullName: string;
  logo: string;
  primaryColor: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  headerBg: string;
  headerText: string;
  buttonColor: string;
  sidebarBg: string;
  accentColor: string;
  address: string[];
  phone: string;
  email: string;
  website: string;
  qrUrl: string;
  slogan: string;
  brandLogos: string[];
  tableHeaderBg: string;
  tableHeaderText: string;
  tableStripeBg: string;
  tableBorderColor: string;
  tableHeaderBgHex: string;
  tableHeaderTextHex: string;
  tableStripeBgHex: string;
  tableBorderHex: string;
  proposalHeaderBg: string;
  proposalHeaderText: string;
  logoDark?: string;
  buttonColorHex: string;
}

export const BRANDS: Record<string, BrandConfig> = {
  mutpro: {
    id: 'mutpro',
    name: 'MutPro',
    fullName: 'MUTPRO',
    logo: '/logos/mutpro-mavi-logo.jpeg',
    primaryColor: 'bg-[#040023]',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    headerBg: 'bg-[#040023]',
    headerText: 'text-white',
    buttonColor: 'bg-orange-500',
    sidebarBg: 'bg-[#040023]',
    accentColor: '#040023',
    address: [
      'Balaç Mahallesi Recep Tayyip Erdoğan Bulvarı',
      'No:114 Atakum / Samsun',
    ],
    phone: '0546 936 18 55',
    email: 'info@mutpro.com',
    website: 'www.mutpro.com',
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.mutpro.com',
    slogan: 'ENDÜSTRİYEL MUTFAK EKİPMANLARI',
    brandLogos: [
      'https://cdn.myikas.com/images/theme-images/26271bf0-fcb3-4b10-8abe-87affe2ed498/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/0e8222c5-dea8-4180-9342-dfbabfa80b22/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/a721039c-9294-403e-9c3f-25026304e94f/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/6da27e99-7e84-4be2-a830-9f576f8f4e9f/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/1d401c28-9501-43a5-9475-284740535f17/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/e65fb6d3-b8d8-401a-80a4-ad3066b3b4e1/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/852f29ee-7440-4e38-b7f6-c294a36b64ef/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/a6ffce67-b12c-4ec9-8b8f-9e0bebf058e2/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/88f23b17-b59f-4c12-9dce-cdfbe6649c05/image_360.webp',
      'https://cdn.myikas.com/images/theme-images/eecc35c8-3a94-4059-9cda-1253a2143066/image_360.webp',
    ],
    tableHeaderBg: 'bg-orange-500',
    tableHeaderText: 'text-[#040023]',
    tableStripeBg: 'bg-orange-50',
    tableBorderColor: 'border-orange-200',
    tableHeaderBgHex: '#f97316',
    tableHeaderTextHex: '#ffffff',
    tableStripeBgHex: '#ffffff',
    tableBorderHex: '#fed7aa',
    proposalHeaderBg: '#040023',
    proposalHeaderText: '#ffffff',
    logoDark: 'https://cdn.myikas.com/images/theme-images/28f96c57-de53-42dc-96e5-988cf858f78b/image_540.webp',
    buttonColorHex: '#f97316',
  },
  guclumutfak: {
    id: 'guclumutfak',
    name: 'Güçlü Mutfak',
    fullName: 'GÜÇLÜ MUTFAK',
    logo: '/logos/guclumutfak-logo.png',
    primaryColor: 'bg-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    buttonColor: 'bg-red-600',
    sidebarBg: 'bg-red-600',
    accentColor: '#dc2626',
    address: [
      'Maltepe Mah. Davutpaşa Cad. Tim 1 İş Merkezi.',
      'No:6/24 Zeytinburnu/İstanbul',
    ],
    phone: '0536 592 63 44',
    email: 'info@guclumutfak.com',
    website: 'www.guclumutfak.com',
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.guclumutfak.com',
    slogan: 'Endüstriyel Mutfak Ekipmanları',
    brandLogos: [],
    tableHeaderBg: 'bg-red-600',
    tableHeaderText: 'text-white',
    tableStripeBg: 'bg-red-50',
    tableBorderColor: 'border-red-200',
    tableHeaderBgHex: '#dc2626',
    tableHeaderTextHex: '#ffffff',
    tableStripeBgHex: '#fef2f2',
    tableBorderHex: '#fecaca',
    proposalHeaderBg: '#ffffff',
    proposalHeaderText: '#111827',
    buttonColorHex: '#dc2626',
  },
  inoks: {
    id: 'inoks',
    name: 'İnoks',
    fullName: 'İNOKS ENDÜSTRİYEL MUTFAK',
    logo: '/logos/inoks-logo.png',
    primaryColor: 'bg-red-700',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-700',
    headerText: 'text-white',
    buttonColor: 'bg-red-700',
    sidebarBg: 'bg-red-700',
    accentColor: '#b91c1c',
    address: [
      'Bahçeşehir 1. Kısım, Doğa Parkı Cad M Blok',
      '13-15MD Başakşehir/İstanbul',
    ],
    phone: '0532 219 21 60',
    email: 'info@inoksendustriyel.com',
    website: 'www.inoksendustriyel.com',
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.inoksendustriyel.com',
    slogan: 'Endüstriyel Mutfak Ekipmanları',
    brandLogos: [],
    tableHeaderBg: 'bg-red-700',
    tableHeaderText: 'text-white',
    tableStripeBg: 'bg-red-50',
    tableBorderColor: 'border-red-200',
    tableHeaderBgHex: '#b91c1c',
    tableHeaderTextHex: '#ffffff',
    tableStripeBgHex: '#fef2f2',
    tableBorderHex: '#fecaca',
    proposalHeaderBg: '#b91c1c',
    proposalHeaderText: '#ffffff',
    buttonColorHex: '#b91c1c',
  },
  markasiz: {
    id: 'markasiz',
    name: 'Markasız',
    fullName: 'MARKASIZ',
    logo: '',
    primaryColor: 'bg-slate-800',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    headerBg: 'bg-slate-800',
    headerText: 'text-white',
    buttonColor: 'bg-slate-800',
    sidebarBg: 'bg-slate-800',
    accentColor: '#1e293b',
    address: [],
    phone: '',
    email: '',
    website: '',
    qrUrl: '',
    slogan: 'Adres ve logo olmadan teklif',
    brandLogos: [],
    tableHeaderBg: 'bg-slate-800',
    tableHeaderText: 'text-white',
    tableStripeBg: 'bg-slate-50',
    tableBorderColor: 'border-slate-200',
    tableHeaderBgHex: '#1e293b',
    tableHeaderTextHex: '#ffffff',
    tableStripeBgHex: '#f8fafc',
    tableBorderHex: '#e2e8f0',
    proposalHeaderBg: '#ffffff',
    proposalHeaderText: '#111827',
    buttonColorHex: '#1e293b',
  },
};

export const VALID_BRAND_IDS = ['mutpro', 'guclumutfak', 'inoks', 'markasiz'] as const;

export const getBrand = (brandId: string): BrandConfig => {
  return BRANDS[brandId] || BRANDS.mutpro;
};
