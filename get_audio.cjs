const https = require('https');
const fs = require('fs');

const text = "연속 출석입니다.";
const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ko&client=tw-ob`;

https.get(url, (res) => {
  const file = fs.createWriteStream("src/assets/audio/duplicate_success.mp3");
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("Audio downloaded!");
  });
}).on("error", (err) => {
  console.log("Error: ", err.message);
});
