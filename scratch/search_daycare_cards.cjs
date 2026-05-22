const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Searching for DaycareEnrollmentCard in App.tsx...');
const matches = [];

lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('DaycareEnrollmentCard') || line.includes('setSelectedEnrollment')) {
        matches.push({ lineNum, line: line.trim() });
    }
});

matches.forEach(m => {
    console.log(`L${m.lineNum}: ${m.line}`);
});
