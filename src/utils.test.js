// src/utils.test.js - Simple utility test examples
export function fmtMoney(amount, currency = 'MRU') {
  const n = Number(amount) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ' + currency;
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Tests
const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ Test failed: ${message}`);
    return false;
  }
  console.log(`✅ Test passed: ${message}`);
  return true;
};

export function runTests() {
  console.log('\n=== Running Utility Tests ===\n');
  
  // Test fmtMoney
  assert(
    fmtMoney(1000, 'MRU') === '1,000 MRU',
    'fmtMoney formats 1000 as "1,000 MRU"'
  );
  
  assert(
    fmtMoney(1500.5, 'USD') === '1,500.5 USD',
    'fmtMoney handles decimals correctly'
  );
  
  // Test escapeHtml
  assert(
    escapeHtml('<script>alert("xss")</script>') === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    'escapeHtml prevents XSS attacks'
  );
  
  assert(
    escapeHtml('normal text') === 'normal text',
    'escapeHtml leaves normal text unchanged'
  );
  
  console.log('\n=== Tests Complete ===\n');
}
