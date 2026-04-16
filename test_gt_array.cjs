const https = require('https');
const querystring = require('querystring');

function translate(texts, targetLang) {
  return new Promise((resolve, reject) => {
    const qs = querystring.stringify({
      client: 'gtx',
      sl: 'en',
      tl: targetLang,
      dt: 't',
      q: texts
    });
    const options = {
      hostname: 'translate.googleapis.com',
      path: '/translate_a/single?' + qs,
      method: 'GET',
      headers: {
         'User-Agent': 'Mozilla/5.0'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
   try {
       const res = await translate(["Hello", "World", "My name is John"], "es");
       console.log(JSON.stringify(res, null, 2));
   } catch(e) {
       console.error("Test failed", e);
   }
}

test();
