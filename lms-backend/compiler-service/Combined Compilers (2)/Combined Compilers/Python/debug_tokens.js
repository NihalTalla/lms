// Debug tokenizer for Python compiler
const fs = require('fs');
const path = require('path');

const lexer = require('./python/lexer');

const fileName = process.argv[2] || 'test_class.py';
const filePath = path.join(__dirname, fileName);
const code = fs.readFileSync(filePath, 'utf8');

console.log(`---------- Tokenizing ${fileName} ----------`);
const tokens = lexer(code);

tokens.forEach((token, index) => {
    console.log(`${index}: ${JSON.stringify(token)}`);
});