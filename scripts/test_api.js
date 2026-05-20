(async () => {
  const handler = require('../api/index');
  const http = require('http');

  const req = new http.IncomingMessage();
  req.url = '/';
  req.method = 'GET';
  req.headers = { host: 'localhost' };

  const res = new http.ServerResponse(req);
  const chunks = [];
  res.write = (chunk) => { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))); };
  res.end = (chunk) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    const body = Buffer.concat(chunks).toString('utf8');
    console.log('RESPONSE BODY:', body);
    console.log('STATUS CODE:', res.statusCode);
  };

  try {
    await handler(req, res);
  } catch (err) {
    console.error('HANDLER THROW:', err);
  }
})();
