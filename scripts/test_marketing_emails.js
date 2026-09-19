const service = require('../src/services/marketingEmails.service');

async function runVerification() {
  console.log('🧪 Starting Marketing Emails verification...');

  const sample = [
    { name: 'Rahul Sharma', email: '  Rahul@GMAIL.COM  ', contact: '9876543210', address: 'Lucknow', country: 'India' },
    { name: 'Rahul Sharma Duplicate', email: 'rahul@gmail.com', contact: '9876543210', address: 'Lucknow', country: 'India' },
    { name: 'Priya Patel', email: 'priya.patel@example.com', contact: '9898989898', address: 'Ahmedabad', country: 'India' },
    { name: 'Invalid Email', email: 'notanemail', contact: '12345', address: 'Test', country: 'India' }
  ];

  console.log('\n1. Testing Excel Import Batch Ingestion & Deduplication:');
  const importRes = await service.importMarketingEmailRecords(sample);
  console.log('Import Metrics:', JSON.stringify(importRes, null, 2));

  console.log('\n2. Testing Re-Import of Same Dataset (Should detect duplicates):');
  const reImportRes = await service.importMarketingEmailRecords(sample);
  console.log('Re-Import Metrics:', JSON.stringify(reImportRes, null, 2));

  console.log('\n3. Testing Paginated Listing (page: 1, limit: 25):');
  const listRes = await service.getMarketingEmails({ page: 1, limit: 25 });
  console.log('Paginated List:', {
    total: listRes.total,
    page: listRes.page,
    limit: listRes.limit,
    totalPages: listRes.totalPages,
    rowsCount: listRes.emails.length,
    sampleRow: listRes.emails[0] ? { name: listRes.emails[0].name, email: listRes.emails[0].email, status: listRes.emails[0].status } : null
  });

  console.log('\n✅ All tests executed successfully!');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('❌ Verification error:', err);
  process.exit(1);
});
