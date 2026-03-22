import fs from 'fs';
import https from 'https';

const inputFile = `C:\\Users\\henri\\.gemini\\antigravity\\brain\\a72a158d-a27e-452a-90f6-3dd97d7e7b96\\.system_generated\\steps\\45\\output.txt`;
const content = fs.readFileSync(inputFile, 'utf-8');

const regex = /https:\/\/[^\.]+\.supabase\.co\/storage\/v1\/object\/public\/([^\/]+)\/([^\"]+)/g;
let match;
const urls = [];

while ((match = regex.exec(content)) !== null) {
  urls.push(match[0]);
  if (urls.length >= 3) break;
}

console.log("Found URLs:", urls);

if (urls.length > 0) {
  console.log(`Attempting to download ${urls[0]}...`);
  https.get(urls[0], (res) => {
    console.log('Status Code:', res.statusCode);
    res.on('data', () => {}); // consume data
  }).on('error', (e) => {
    console.error('Error fetching:', e.message);
  });
}
