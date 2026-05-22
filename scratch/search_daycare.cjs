const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Searching for inserts/updates and form inputs in App.tsx...');
const matches = [];

lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const lowerLine = line.toLowerCase();
    
    // Look for daycare_enrollments insert/update, or daycare form state, or modal edits
    if (
        lowerLine.includes("daycare_enrollments") ||
        lowerLine.includes("gets_along_with_others") ||
        lowerLine.includes("has_sibling_discount") ||
        (lowerLine.includes("creche") && (lowerLine.includes("form") || lowerLine.includes("input") || lowerLine.includes("modal") || lowerLine.includes("edit")))
    ) {
        matches.push({ lineNum, line: line.trim() });
    }
});

console.log(`Found ${matches.length} matches:`);
matches.slice(0, 150).forEach(m => {
    console.log(`L${m.lineNum}: ${m.line}`);
});
if (matches.length > 150) {
    console.log(`... and ${matches.length - 150} more matches.`);
}
