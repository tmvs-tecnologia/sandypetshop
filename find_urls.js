import fs from 'fs';

const inputFile = `C:\\Users\\henri\\.gemini\\antigravity\\brain\\a72a158d-a27e-452a-90f6-3dd97d7e7b96\\.system_generated\\steps\\45\\output.txt`;
const content = fs.readFileSync(inputFile, 'utf-8');

const regex = /https:\/\/[^\.]+\.supabase\.co\/storage\/v1\/object\/public\/([^\/]+)\//g;
let match;
const buckets = new Set();

while ((match = regex.exec(content)) !== null) {
  buckets.add(match[1]);
}

console.log("Found buckets:", Array.from(buckets));
