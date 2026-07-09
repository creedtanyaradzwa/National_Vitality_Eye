
const fs = require('fs');
const path = require('path');

// Read the text file
const textPath = path.join(__dirname, '..', '..', 'edliz-text.txt');
let text = fs.readFileSync(textPath, 'utf8');

// Clean up whitespace
text = text.replace(/\s+/g, ' ').trim();

console.log('Text loaded successfully!');
console.log('Length:', text.length, 'characters');
console.log('\nFirst 500 characters preview:', text.substring(0, 500));

// Find all the chapters from table of contents
const tocMatch = text.match(/TABLE\s+OF\s+CONTENTS\s+.*?MAJOR\s+HIGHLIGHTS/i);
if (tocMatch) {
    console.log('\n\nFound Table of Contents!');
}

// For now, let's write a small test to check what patterns we can use
console.log('\n\nSearching for chapter numbers...');

const chapters = text.match(/\d+\.\s+[A-Z\s]+/g);
if (chapters) {
    console.log('\nFound possible chapters:', chapters.slice(0, 20));
}

// Let's also search for "Case Definition" or similar terms
const caseDefs = text.match(/case\s+definition/i);
if (caseDefs) {
    console.log('\nFound "Case Definition" mentions!');
}

// For initial testing, let's save a small sample of the structured text
fs.writeFileSync(
    path.join(__dirname, '..', '..', 'edliz-sample.json'),
    JSON.stringify({ 
        preview: text.substring(0, 10000),
        chapterPatterns: chapters
    }, null, 2),
    'utf8'
);

console.log('\n\nSaved sample JSON to edliz-sample.json');
