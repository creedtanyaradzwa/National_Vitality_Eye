
const fs = require('fs');
const path = require('path');

// Read the full extracted text
const edlizText = fs.readFileSync(path.join(__dirname, '..', '..', 'edliz-with-pages.txt'), 'utf8');

// Extract Chapter 3 specifically
const chapter3Match = edlizText.match(/=== PAGE \d+ ===\s*EDLIZ\s*\d+\s*PAEDIATRIC CONDITIONS([\s\S]*?)(?=== PAGE \d+ ===\s*EDLIZ\s*\d+\s*IMMUNIZATION)/i);

if (chapter3Match) {
    console.log('✅ Found Chapter 3!');
    const chapter3Text = chapter3Match[1];

    // Now extract disease entries from Chapter 3
    const diseases = [];

    // For now, let's extract all the sections that look like conditions
    // Let's find all condition titles
    const conditionTitles = chapter3Text.match(/[A-Z][A-Z\s&]+(?=\s{2,}|\n)/g) || [];
    console.log('Potential condition titles:', conditionTitles.slice(0, 50));

    // Let's also save the chapter text for manual inspection
    fs.writeFileSync(path.join(__dirname, '..', '..', 'chapter3-full.txt'), chapter3Text, 'utf8');
    console.log('📄 Saved full Chapter 3 to chapter3-full.txt');
} else {
    console.error('❌ Could not find Chapter 3');
}
