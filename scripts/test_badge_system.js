const { computeProductBadge, BESTSELLER_JOIN, BADGE_SELECT_EXPRESSION } = require('../src/services/badge.service');
const assert = require('assert');

console.log('--- Testing Badge Calculation Logic ---');

const now = new Date();

// Test 1: Product added 2 months ago (NEW priority wins over orders and discount)
const p1 = {
  id: 1,
  created_at: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
  original_price: 1000,
  price: 500,
  discount: 50,
  is_best_seller_calculated: true,
};
assert.strictEqual(computeProductBadge(p1, new Set([1])), 'NEW', 'Test 1 Failed: Should be NEW');
console.log('✔ Test 1 Passed: Added 2 months ago -> NEW');

// Test 2: Product added 1 year ago, 150 orders (bestseller in category), 50% discount
const p2 = {
  id: 2,
  created_at: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString(),
  original_price: 1000,
  price: 500,
  discount: 50,
  is_best_seller_calculated: true,
};
assert.strictEqual(computeProductBadge(p2, new Set([2])), 'BESTSELLER', 'Test 2 Failed: Should be BESTSELLER');
console.log('✔ Test 2 Passed: Added 1 year ago + Bestseller -> BESTSELLER');

// Test 3: Product added 1 year ago, not bestseller, 40% discount
const p3 = {
  id: 3,
  created_at: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString(),
  original_price: 1000,
  price: 600,
  discount: 40,
};
assert.strictEqual(computeProductBadge(p3, new Set()), 'BEST DISCOUNT', 'Test 3 Failed: Should be BEST DISCOUNT');
console.log('✔ Test 3 Passed: Added 1 year ago + 40% discount -> BEST DISCOUNT');

// Test 4: Product added 1 year ago, not bestseller, 10% discount
const p4 = {
  id: 4,
  created_at: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString(),
  original_price: 1000,
  price: 900,
  discount: 10,
};
assert.strictEqual(computeProductBadge(p4, new Set()), null, 'Test 4 Failed: Should be null (NO BADGE)');
console.log('✔ Test 4 Passed: Added 1 year ago + 10% discount -> NO BADGE');

// Test 5: Exact 20% discount threshold (20% OFF -> No Best Discount, 21% OFF -> BEST DISCOUNT)
const p5_20 = {
  id: 5,
  created_at: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString(),
  original_price: 100,
  price: 80,
  discount: 20,
};
assert.strictEqual(computeProductBadge(p5_20, new Set()), null, 'Test 5 (20%) Failed: 20% should NOT get Best Discount');
console.log('✔ Test 5 (20% discount) Passed: 20% -> NO BADGE');

const p5_21 = {
  id: 6,
  created_at: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString(),
  original_price: 100,
  price: 79,
  discount: 21,
};
assert.strictEqual(computeProductBadge(p5_21, new Set()), 'BEST DISCOUNT', 'Test 5 (21%) Failed: 21% should get BEST DISCOUNT');
console.log('✔ Test 5 (21% discount) Passed: 21% -> BEST DISCOUNT');

console.log('\n--- Checking SQL Snippets ---');
assert(BESTSELLER_JOIN.includes('total_orders > 10'), 'BESTSELLER_JOIN must filter total_orders > 10');
assert(BESTSELLER_JOIN.includes("p.created_at < (NOW() - INTERVAL '6 months')"), 'BESTSELLER_JOIN must filter non-new products');
assert(BADGE_SELECT_EXPRESSION.includes("NOW() - INTERVAL '6 months'"), 'BADGE_SELECT_EXPRESSION must check 6 months for NEW');
assert(BADGE_SELECT_EXPRESSION.includes('BEST DISCOUNT'), 'BADGE_SELECT_EXPRESSION must return BEST DISCOUNT');
console.log('✔ SQL definitions verified');

console.log('\n🎉 ALL BADGE SYSTEM TESTS PASSED SUCCESSFULLY!');
