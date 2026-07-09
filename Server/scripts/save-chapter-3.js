
const fs = require('fs');
const path = require('path');

const edlizText = fs.readFileSync(
  path.join(__dirname, '../../edliz-with-pages.txt'),
  'utf8'
);

// Chapter 3 starts at Page 43, ends before Chapter 4 (Immunisation)
const page43Match = edlizText.indexOf('=== PAGE 43 ===');
const page93Match = edlizText.indexOf('=== PAGE 93 ===');

if (page43Match !== -1 && page93Match !== -1) {
  const chapter3Text = edlizText.slice(page43Match, page93Match);

  fs.writeFileSync(
    path.join(__dirname, '../../chapter3-full.txt'),
    chapter3Text,
    'utf8'
  );
  console.log('✅ Successfully saved Chapter 3 to chapter3-full.txt!');
} else {
  console.error('❌ Could not find Chapter 3 boundaries');
}
