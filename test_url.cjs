const https = require('https');

https.get('https://passflowai.web.app/instructor', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^\"]+\.js)"/);
    if (!match) {
        console.log("No index.js found in HTML!", data);
        return;
    }
    const jsPath = match[1];
    console.log("FOUND SCRIPT:", jsPath);
    
    https.get('https://passflowai.web.app' + jsPath, (res2) => {
        console.log("STATUS:", res2.statusCode);
        console.log("CONTENT-TYPE:", res2.headers['content-type']);
        let jsData = '';
        res2.on('data', chunk => jsData += chunk);
        res2.on('end', () => {
            console.log("OUTPUT PREVIEW:", jsData.substring(0, 100));
        });
    });
  });
});
