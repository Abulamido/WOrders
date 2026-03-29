const https = require('https');

const data = JSON.stringify({
  update_id: 10003,
  callback_query: {
    id: "cb1",
    from: { id: 123456789 },
    message: { chat: { id: 123456789 }, message_id: 100 },
    data: "menu:5ab0af91-031f-4411-b240-d90bdf3bee42:"
  }
});

const options = {
  hostname: 'w-orders.vercel.app',
  port: 443,
  path: '/api/webhooks/telegram?secret=9b6398fff5c0ff652915c09e4ae99ae55fa408c3247d4996d73501a89c6c65f24',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response body:', body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
