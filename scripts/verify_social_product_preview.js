require('dotenv').config();
const { pool } = require('../src/config/database');
const controller = require('../src/controllers/socialShare.controller');

(async () => {
  const productResult = await pool.query(
    `SELECT slug FROM products WHERE is_active = TRUE ORDER BY id LIMIT 1`
  );
  if (!productResult.rows.length) throw new Error('No active product available for preview verification');
  const slug = productResult.rows[0].slug;
  const headers = {};
  let statusCode = 200;
  let contentType = '';
  let html = '';
  const res = {
    removeHeader(name) { delete headers[name]; return this; },
    set(values) { Object.assign(headers, values); return this; },
    status(value) { statusCode = value; return this; },
    type(value) { contentType = value; return this; },
    send(value) { html = String(value); return this; },
  };
  await controller.getSocialPreview({ params: { slug } }, res);

  const checks = {
    statusOk: statusCode === 200,
    htmlResponse: contentType === 'html',
    hasOgTitle: html.includes('property="og:title"'),
    hasOgImage: html.includes('property="og:image"'),
    hasOgDescription: html.includes('property="og:description"'),
    hasOgUrl: html.includes('property="og:url"'),
    hasTwitterCard: html.includes('name="twitter:card"'),
    hasPrice: html.includes('property="product:price:amount"'),
    hasProductSchema: html.includes('"@type":"Product"'),
    redirectsToProduct: html.includes(`/products/${slug}`),
    neverRedirectsToCommerceFlow: !/\/(checkout|cart|orders?|payments?)(?:[/"'])/i.test(html),
  };
  console.log(JSON.stringify({ slug, checks }, null, 2));
  if (Object.values(checks).some(value => !value)) process.exitCode = 1;
})()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
