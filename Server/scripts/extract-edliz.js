
const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const PDF_PATH = path.join(__dirname, '..', '..', 'EDLIZ 2025 final for circulation_260430_134145.pdf');

async function extractText() {
    const data = new Uint8Array(fs.readFileSync(PDF_PATH));
    const pdf = await pdfjsLib.getDocument(data).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    fs.writeFileSync(path.join(__dirname, '..', '..', 'edliz-text.txt'), fullText, 'utf8');
    console.log('✅ Text extraction complete!');
    console.log(`📄 Total pages: ${pdf.numPages}`);
    console.log(`📝 Saved to: ${path.join(__dirname, '..', '..', 'edliz-text.txt')}`);
}

extractText().catch(console.error);
