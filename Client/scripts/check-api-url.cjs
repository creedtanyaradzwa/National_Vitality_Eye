const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../dist/assets/index-BOAjkjTe.js');
const s = fs.readFileSync(file, 'utf8');
console.log('onrender:', s.includes('national-vitality-eye.onrender.com'));
console.log('localhost:5000:', s.includes('localhost:5000'));
