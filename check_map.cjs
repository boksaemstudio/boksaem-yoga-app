const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

async function check() {
    const rawSourceMap = fs.readFileSync('dist/assets/AdminDashboard-HgyhLSEA-v12.js.map', 'utf8');
    const consumer = await new SourceMapConsumer(rawSourceMap);
    const pos = consumer.originalPositionFor({
        line: 1,
        column: 414048
    });
    console.log(pos);
    consumer.destroy();
}
check();