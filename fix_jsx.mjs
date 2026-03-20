import { readFileSync, writeFileSync } from 'fs';

const filePath = './App.tsx';
const content = readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Total lines before:', lines.length);
console.log('Line 3879 (0-indexed 3878):', lines[3878]?.substring(0, 60));
console.log('Line 3880 (0-indexed 3879):', lines[3879]?.substring(0, 60));
console.log('Line 3882 (0-indexed 3881):', lines[3881]?.substring(0, 80));
console.log('Line 4029 (0-indexed 4028):', lines[4028]?.substring(0, 60));

// Remove lines 3882 to 4029 (0-indexed: 3881 to 4028, inclusive)
// Keep lines 0-3880 (índices 0 to 3879) and 4029+ (índice 4029+)
const newLines = [...lines.slice(0, 3881), ...lines.slice(4029)];

console.log('Total lines after:', newLines.length);
writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Done! File saved.');
