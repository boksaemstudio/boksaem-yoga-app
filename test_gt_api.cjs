const https = require('https');
const querystring = require('querystring');

function translate(text, targetLang) {
  return new Promise((resolve, reject) => {
    const qs = querystring.stringify({
      client: 'gtx',
      sl: 'en',
      tl: targetLang,
      dt: 't',
      q: text
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
          // JSON structure for single: [ [ ["Hola", "Hello", null, null, 1] ], ... ]
          let translatedText = '';
          if (json && json[0]) {
             for (const item of json[0]) {
                 if (item[0]) translatedText += item[0];
             }
          }
          resolve(translatedText);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
   try {
       const res = await translate("Hello, world! Welcome to the B2B Studio.", "ko");
       console.log("Translation Test Result:", res);
       
       const arrayTest = await translate("First sentence.\n\nSecond sentence.", "es");
       console.log("Newline handling:", arrayTest);
   } catch(e) {
       console.error("Test failed", e);
   }
}

test();
