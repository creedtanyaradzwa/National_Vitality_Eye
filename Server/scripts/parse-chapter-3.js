
const fs = require('fs');
const path = require('path');

// Read the text file
const textPath = path.join(__dirname, '..', '..', 'edliz-text.txt');
let rawText = fs.readFileSync(textPath, 'utf8');

// Clean up the text a bit
const text = rawText.replace(/\s+/g, ' ').trim();

// Find Chapter 3 section (Paediatric Conditions)
const chapter3Regex = /3\.\s+PAEDIATRIC\s+CONDITIONS\s+(.*?)(?=\s+4\.\s+IMMUNISATION)/i;
const chapter3Match = text.match(chapter3Regex);

if (!chapter3Match) {
    console.error('Could not find Chapter 3 in text!');
    process.exit(1);
}

const chapter3Text = chapter3Match[1].trim();
console.log('✅ Found Chapter 3 (Paediatric Conditions)!');
console.log('\nLength of chapter:', chapter3Text.length, 'characters');

// Save chapter 3 to a separate file for easier analysis
fs.writeFileSync(
    path.join(__dirname, '..', '..', 'chapter-3-paediatrics.txt'),
    chapter3Text,
    'utf8'
);
console.log('\n📄 Saved chapter to chapter-3-paediatrics.txt!');

// Let's search for possible condition titles in chapter 3
console.log('\n🔍 Looking for potential condition titles in chapter...');
const conditionPattern = /[A-Z][A-Z\s\d]+(?=\s+[a-z])/g; // All caps followed by lowercase
const potentialTitles = [];
let match;
while ((match = conditionPattern.exec(chapter3Text)) !== null) {
    if (match[0].length > 5 && !['THE', 'AND', 'FOR', 'WITH', 'OR', 'BUT'].includes(match[0].trim())) {
        potentialTitles.push(match[0]);
    }
}

console.log('\nFound possible condition titles:', [...new Set(potentialTitles.slice(0, 50))]);
