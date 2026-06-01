const http = require('https');

const req = http.request(
    'https://jtnqrswupbjqobasrrjm.supabase.co/functions/v1/coach-chat',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Provide no auth header to see if API GW rejects it with 401
        }
    },
    (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
    }
);
req.write(JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }));
req.end();
