const assert = require('assert');

// Simulate the deduplication algorithm
function partitionHomepageProducts(allProducts, limit = 5) {
  const DisplayedProductIds = new Set();

  // 1. Featured Products
  const featuredCandidates = [...allProducts].sort((a, b) => {
    if (Boolean(a.is_featured) !== Boolean(b.is_featured)) return a.is_featured ? -1 : 1;
    return (b.review_count || 0) - (a.review_count || 0);
  });
  const featured = [];
  for (const p of featuredCandidates) {
    if (p && p.stock !== 0 && !DisplayedProductIds.has(p.id)) {
      featured.push(p);
      DisplayedProductIds.add(p.id);
      if (featured.length >= limit) break;
    }
  }

  // 2. Trending Products (Exclude DisplayedProductIds)
  const trendingCandidates = [...allProducts].sort((a, b) => {
    if (Boolean(a.is_best_seller) !== Boolean(b.is_best_seller)) return a.is_best_seller ? -1 : 1;
    return (b.review_count || 0) - (a.review_count || 0);
  });
  const trending = [];
  for (const p of trendingCandidates) {
    if (p && p.stock !== 0 && !DisplayedProductIds.has(p.id)) {
      trending.push(p);
      DisplayedProductIds.add(p.id);
      if (trending.length >= limit) break;
    }
  }

  // 3. Limited Time Deals (Exclude DisplayedProductIds)
  const dealsCandidates = [...allProducts].sort((a, b) => {
    const discA = a.discount || (a.original_price && a.original_price > a.price ? Math.round(((a.original_price - a.price) / a.original_price) * 100) : 0);
    const discB = b.discount || (b.original_price && b.original_price > b.price ? Math.round(((b.original_price - b.price) / b.original_price) * 100) : 0);
    return discB - discA;
  });
  const deals = [];
  for (const p of dealsCandidates) {
    if (p && p.stock !== 0 && !DisplayedProductIds.has(p.id)) {
      deals.push(p);
      DisplayedProductIds.add(p.id);
      if (deals.length >= limit) break;
    }
  }

  // Auto-backfill if duplicate filtering reduced any section below limit
  const remaining = allProducts.filter(p => p && p.stock !== 0 && !DisplayedProductIds.has(p.id));
  let remIdx = 0;
  while (featured.length < limit && remIdx < remaining.length) {
    const p = remaining[remIdx++];
    featured.push(p);
    DisplayedProductIds.add(p.id);
  }
  while (trending.length < limit && remIdx < remaining.length) {
    const p = remaining[remIdx++];
    trending.push(p);
    DisplayedProductIds.add(p.id);
  }
  while (deals.length < limit && remIdx < remaining.length) {
    const p = remaining[remIdx++];
    deals.push(p);
    DisplayedProductIds.add(p.id);
  }

  return { featured, trending, deals, DisplayedProductIds };
}

console.log('--- Testing Homepage Deduplication Algorithm ---');

// Create 20 mock products with various overlapping features
const mockCatalog = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  is_featured: i < 8, // Products 1-8 are featured
  is_best_seller: i >= 2 && i <= 10, // Products 3-11 are best sellers (overlap with featured!)
  discount: i % 2 === 0 ? 30 : 5, // Even products have 30% discount (overlap with featured & best sellers!)
  original_price: 1000,
  price: i % 2 === 0 ? 700 : 950,
  review_count: 100 - i,
  stock: i === 4 ? 0 : 50 // Product 5 is out of stock
}));

const result = partitionHomepageProducts(mockCatalog, 5);

console.log('Featured IDs:', result.featured.map(p => p.id));
console.log('Trending IDs:', result.trending.map(p => p.id));
console.log('Deals IDs:', result.deals.map(p => p.id));

assert.strictEqual(result.featured.length, 5, 'Featured section must have 5 products');
assert.strictEqual(result.trending.length, 5, 'Trending section must have 5 products');
assert.strictEqual(result.deals.length, 5, 'Deals section must have 5 products');

// Verify zero intersection
const featSet = new Set(result.featured.map(p => p.id));
const trendSet = new Set(result.trending.map(p => p.id));
const dealSet = new Set(result.deals.map(p => p.id));

for (const id of trendSet) {
  assert(!featSet.has(id), `Product ${id} is in both Featured and Trending!`);
}
for (const id of dealSet) {
  assert(!featSet.has(id), `Product ${id} is in both Featured and Deals!`);
  assert(!trendSet.has(id), `Product ${id} is in both Trending and Deals!`);
}

// Check out of stock product 5 was not included
assert(!featSet.has(5), 'Out of stock product 5 must not be included');
assert(!trendSet.has(5), 'Out of stock product 5 must not be included');
assert(!dealSet.has(5), 'Out of stock product 5 must not be included');

console.log('✔ All 15 products are completely unique across all 3 sections!');
console.log('✔ Out-of-stock products correctly filtered!');
console.log('🎉 HOMEPAGE DEDUPLICATION TEST PASSED!');
