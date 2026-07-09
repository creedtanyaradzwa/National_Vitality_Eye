
const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const PDF_PATH = path.join(__dirname, '..', '..', 'EDLIZ 2025 final for circulation_260430_134145.pdf');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'edliz-pages');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

async function extractTextPerPage() {
    const data = new Uint8Array(fs.readFileSync(PDF_PATH));
    const pdf = await pdfjsLib.getDocument(data).promise;

    const allPagesText = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i}/${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Extract lines, keeping some structure
        const lines = [];
        let currentLine = '';
        for (const item of content.items) {
            if (item.transform && item.transform[5]) {
                // Different Y position, new line
                if (currentLine) {
                    lines.push(currentLine.trim());
                }
                currentLine = item.str;
            } else {
                currentLine += ' ' + item.str;
            }
        }
        if (currentLine) lines.push(currentLine.trim());
        
        const pageText = lines.join('\n');
        allPagesText.push(pageText);
        
        // Save individual page file
        const pageFile = path.join(OUTPUT_DIR, `page-${i.toString().padStart(3, '0')}.txt`);
        fs.writeFileSync(pageFile, pageText, 'utf8');
    }

    // Also save all pages combined with page markers
    const fullTextWithPages = allPagesText.map((t, idx) => `=== PAGE ${idx+1} ===\n${t}`).join('\n\n');
    fs.writeFileSync(path.join(__dirname, '..', '..', 'edliz-with-pages.txt'), fullTextWithPages, 'utf8');

    console.log(`✅ Done! Extracted ${allPagesText.length} pages!`);
}

extractTextPerPage().catch(console.error);
