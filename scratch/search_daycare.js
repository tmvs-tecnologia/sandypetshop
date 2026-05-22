const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Searching for daycare/creche in App.tsx...');
const matches = [];
const terms = ['daycare', 'creche', 'DaycareRegistration', 'matriculas_creche', 'daycare_enrollments'];

lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const lowerLine = line.toLowerCase();
    for (const term of terms) {
        if (lowerLine.includes(term.toLowerCase())) {
            matches.push({ lineNum, term, line: line.trim() });
            break;
        }
    }
});

console.log(`Found ${matches.length} matches:`);
matches.slice(0, 100).forEach(m => {
    console.log(`L${m.lineNum}: [${m.term}] ${m.line}`);
});
if (matches.length > 100) {
    console.log(`... and ${matches.length - 100} more matches.`);
}
