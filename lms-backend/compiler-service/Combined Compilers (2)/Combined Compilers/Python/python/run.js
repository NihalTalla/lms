// python/run.js

const fs = require('fs');
const path = require('path');

const lexer = require('./lexer');
const Parser = require('./parser');
const irgen = require('./irgen');
const lowerIR = require('../ir/ir_lower');
const VM = require('../vm/vm');

// ---------- READ SOURCE ----------
const filePath = path.join(__dirname, '..', 'test', 'sample1.py');
const code = fs.readFileSync(filePath, 'utf8');

// ---------- PIPELINE ----------
const tokens = lexer(code);          // 1. Lex
const parser = new Parser(tokens);   // 2. Parse
const ast = parser.parse();          // 3. AST  ✅ ast is defined HERE

const ir = irgen(ast);               // 4. AST → IR
const bytecode = lowerIR(ir);        // 5. IR → Bytecode

// ---------- DEBUG ----------
console.log('--- BYTECODE ---');
console.log(bytecode);

// ---------- EXECUTE ----------
console.log('--- OUTPUT ---');
new VM(bytecode).run();
