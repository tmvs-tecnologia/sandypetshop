const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Context of DaycareEnrollmentDetailsModal:');
const start = 9150;
const end = 9240;

for (let i = start; i <= end; i++) {
    console.log(`L${i}: ${lines[i-1]}`);
}
