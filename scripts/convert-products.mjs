import XLSX from 'xlsx';
import { writeFileSync } from 'fs';

// Argüman olarak dosya yolu ve brand_id alınabilir
const args = process.argv.slice(2);
const filePath = args[0] || '/Users/onurcelebi/Downloads/ikas-urunler (2).xlsx';
const brandIdArg = args[1] || 'guclumutfak';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// Filter: not deleted, active variant, visible on guclumutfak
const filtered = data.filter(row => {
  if (String(row['Silindi mi?']).toLowerCase() === 'true') return false;
  if (String(row['Varyant Aktiflik']).toLowerCase() === 'false') return false;
  return true;
});

console.log(`Total rows: ${data.length}`);
console.log(`After filtering (active, not deleted): ${filtered.length}`);

// Get unique categories
const categories = new Set();
filtered.forEach(row => {
  const cat = row['Kategoriler'] || '';
  if (cat) categories.add(cat.split('>')[0].trim());
});
console.log('\nCategories found:', [...categories].sort());

// Get unique brands
const brands = new Set();
filtered.forEach(row => {
  const brand = row['Marka'] || '';
  if (brand) brands.add(brand);
});
console.log('\nBrands found:', [...brands].sort());

// Strip HTML from description
function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

// Convert to our Product structure
const products = filtered.map((row, i) => {
  const name = (row['İsim'] || '').trim();
  const description = stripHtml(row['Açıklama'] || '');
  const price = parseFloat(row['Satış Fiyatı']) || 0;
  const imageRaw = row['Resim URL'] || '';
  // Take first image if multiple (separated by ; or ,)
  const image = imageRaw.split(/[;,]/)[0].trim();
  const slug = row['Slug'] || '';
  const siteUrl = brandIdArg === 'mutpro' ? 'https://www.mutpro.com' : 'https://www.guclumutfak.com';
  const productLink = slug ? `${siteUrl}/${slug}` : '';
  const categoryRaw = row['Kategoriler'] || '';
  const category = categoryRaw.split('>').map(s => s.trim()).filter(Boolean).join(' > ');
  const brand = row['Marka'] || '';
  const sku = row['SKU'] || '';

  return {
    id: row['Varyant ID'] || `prod-${Date.now()}-${i}`,
    brand_id: brandIdArg,
    name: name,
    description: description.substring(0, 200),
    price: price,
    cost: 0,
    image: image,
    product_link: productLink,
    category: category,
    currency: 'TRY',
    sku: sku,
    manufacturer: brand,
  };
});

console.log(`\nConverted products: ${products.length}`);
console.log('Sample product:', JSON.stringify(products[0], null, 2));

// Save to JSON
const outputPath = `/Users/onurcelebi/CascadeProjects/teklif-yonetim/public/products-${brandIdArg}.json`;
writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf-8');
console.log(`\nSaved to: ${outputPath}`);

// Also count by category
const catCount = {};
products.forEach(p => {
  const c = p.category || 'Kategorisiz';
  catCount[c] = (catCount[c] || 0) + 1;
});
console.log('\nProducts per category:');
Object.entries(catCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});
